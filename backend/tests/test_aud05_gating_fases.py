"""Pruebas de integridad para AUD-05: Gobernanza de Fases DNP, Gating y Recálculo Dinámico.

Verifica:
1. Recálculo empírico de progreso_porcentaje sin cifras fijas ni datos inventados.
2. Gating estricto: cuando una fase está en 'preparatoria', usuarios no administradores
   son rechazados con HTTP 403 Forbidden ante cualquier intento de escritura.
3. Administradores distritales pueden escribir en etapa preparatoria para formulación.
"""

import asyncio
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.politicas.gating import (
    calcular_progreso_real_fases,
    verificar_escritura_fase,
)


def test_verificar_escritura_permite_admin_sin_consultar_bd():
    """Admin distrital siempre puede escribir, incluso en fase preparatoria."""
    import uuid

    sujeto_admin = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=["alternativas:gestionar"],
        es_anonimo=False,
    )
    mock_session = AsyncMock()

    # No debe arrojar excepción ni requiere consultar la BD
    asyncio.run(verificar_escritura_fase("FASE_2_FORMULACION", sujeto_admin, mock_session))
    mock_session.scalar.assert_not_called()


def test_verificar_escritura_bloquea_no_admin_cuando_fase_preparatoria():
    """No-admin recibe 403 Forbidden si la fase está en 'preparatoria'."""
    import uuid

    sujeto_no_admin = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="facilitador_mesa",
        nivel_identidad="declarada",
        permisos=["alternativas:gestionar"],
        es_anonimo=False,
    )
    mock_session = AsyncMock()
    mock_session.scalar.return_value = "preparatoria"

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(verificar_escritura_fase("FASE_2_FORMULACION", sujeto_no_admin, mock_session))

    assert exc_info.value.status_code == 403
    assert "preparatoria" in exc_info.value.detail
    assert "Fase 2 (Formulación)" in exc_info.value.detail


def test_verificar_escritura_permite_no_admin_cuando_fase_activa():
    """No-admin con permisos del módulo puede escribir si la fase está 'activa'."""
    import uuid

    sujeto_no_admin = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        sesion_id=uuid.uuid4(),
        rol="facilitador_mesa",
        nivel_identidad="declarada",
        permisos=["alternativas:gestionar"],
        es_anonimo=False,
    )
    mock_session = AsyncMock()
    mock_session.scalar.return_value = "activa"

    # No debe arrojar excepción
    asyncio.run(verificar_escritura_fase("FASE_2_FORMULACION", sujeto_no_admin, mock_session))


def test_calcular_progreso_real_fases_unitario():
    """Valida la fórmula de recálculo empírico con datos simulados de agregación."""
    mock_session = AsyncMock()

    # Simular:
    # 1. Mesas: 42 concertadas de 194 programadas (21.65%)
    mock_res_mesas = MagicMock()
    mock_res_mesas.fetchone.return_value = (42, 194)

    # 2. Líneas: 1 dimensión cubierta de 7 canónicas (14.29%)
    mock_res_lineas = MagicMock()
    mock_res_lineas.scalar.return_value = 1

    # 3. PAS: promedio 61.40%
    mock_res_pas = MagicMock()
    mock_res_pas.scalar.return_value = Decimal("61.40")

    mock_session.execute.side_effect = [mock_res_mesas, mock_res_lineas, mock_res_pas]

    progresos = asyncio.run(calcular_progreso_real_fases(mock_session))

    assert progresos["FASE_1_DIAGNOSTICO"] == Decimal("21.65")
    assert progresos["FASE_2_FORMULACION"] == Decimal("14.29")
    assert progresos["FASE_3_PLAN_ACCION"] == Decimal("61.40")


def test_recalculo_dinamico_progreso_fases_integracion(database_url: str):
    """Verifica que el progreso_porcentaje de las fases se calcule a partir de datos reales en BD."""
    if not database_url:
        pytest.skip("database_url no configurada")

    async def _test():
        engine = create_async_engine(database_url, hide_parameters=True)
        try:
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            async with sessions() as session:
                progresos = await calcular_progreso_real_fases(session)

                assert "FASE_1_DIAGNOSTICO" in progresos
                assert "FASE_2_FORMULACION" in progresos
                assert "FASE_3_PLAN_ACCION" in progresos

                assert isinstance(progresos["FASE_1_DIAGNOSTICO"], Decimal)
                assert isinstance(progresos["FASE_2_FORMULACION"], Decimal)
                assert isinstance(progresos["FASE_3_PLAN_ACCION"], Decimal)
        finally:
            await engine.dispose()

    asyncio.run(_test())

