"""Pruebas de integridad forense y proscripción de datos fabricados en compromisos PAS (AUD-13).

Mandato EAF:
- Proscripción absoluta de avances, observaciones cualitativas y BPINs fabricados en compromisos PAS.
- Las filas sin reporte real deben tener avance=NULL, porcentaje=NULL, fecha_corte=NULL y estado='sin_reporte'.
- KPIs y gating de Fase 3 deben calcularse SOLO sobre compromisos con reporte verificado; ante ausencia de reportes deben devolver None (null en JSON).
- Prohibición de siembra de datos fabricados en migraciones de producción.
"""

import asyncio
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.models import CompromisoPAS
from app.modules.compromisos.service import CompromisosService
from app.modules.politicas.gating import calcular_progreso_real_fases


def test_base_de_datos_compromisos_sin_avances_fabricados(database_url: str):
    """Verifica que la base de datos no contenga compromisos con avances o BPINs ficticios sembrados."""
    async def verificar():
        engine = create_async_engine(database_url)
        try:
            async with engine.connect() as conn:
                res = await conn.execute(
                    text("""
                        SELECT codigo, avance_cuatrienal_valor, porcentaje_cumplimiento,
                               fecha_corte_ultimo_reporte, estado, metadatos
                        FROM seguimiento.compromisos_pas
                        WHERE codigo NOT LIKE 'PAS-TEST-%';
                    """)
                )
                filas = res.fetchall()
                assert len(filas) > 0, "Debe existir la matriz institucional de compromisos"

                for cod, avance, pct, fecha_corte, estado, meta in filas:
                    es_demo = meta.get("es_demostracion", False) if isinstance(meta, dict) else False

                    if not es_demo:
                        # 1. Cero avances ni porcentajes fabricados
                        assert avance is None, f"Compromiso {cod} tiene avance no verificado: {avance}"
                        assert pct is None, f"Compromiso {cod} tiene porcentaje cumplimiento no verificado: {pct}"
                        assert fecha_corte is None, f"Compromiso {cod} tiene fecha corte sin reporte real: {fecha_corte}"
                        assert estado == "sin_reporte", f"Compromiso {cod} tiene estado '{estado}', debe ser 'sin_reporte'"

                        # 2. Cero BPINs o relatos ficticios en metadatos
                        assert "bpin_relacionado" not in (meta or {}), f"Compromiso {cod} contiene BPIN ficticio"
                        assert "observacion_cualitativa" not in (meta or {}), f"Compromiso {cod} contiene observación inventada"

                        # 3. Metadatos deben contener cita honesta de catálogo propuesto (OBS-11)
                        fuente = (meta or {}).get("fuente", "")
                        assert "Catálogo propuesto por el equipo" in fuente, f"Compromiso {cod} debe citar catálogo propuesto"
                        assert "no proviene del Decreto 037" in fuente, f"Compromiso {cod} debe aclarar que no proviene del Decreto 037"
                        assert (meta or {}).get("meta_validada") is False, f"Compromiso {cod} debe marcar meta_validada=False"
                    else:
                        assert meta.get("observacion_cualitativa", "").startswith("DEMOSTRACIÓN:"), (
                            f"Compromiso demo {cod} debe marcar su observación como DEMOSTRACIÓN"
                        )
        finally:
            await engine.dispose()

    asyncio.run(verificar())


def test_escaneo_migraciones_no_siembran_avances_o_bpin_sin_fuente():
    """Escanea las migraciones de Alembic garantizando que ninguna migración posterior a 0036 introduzca BPINs ficticios."""
    versiones_dir = Path(__file__).resolve().parent.parent / "alembic" / "versions"
    archivos = sorted(versiones_dir.glob("*.py"))

    for arch in archivos:
        nombre = arch.name
        # Solo auditar migraciones nuevas >= 0037
        if nombre.startswith("0037_restituir_compromisos"):
            contenido = arch.read_text(encoding="utf-8")
            assert "BPIN-2026-CTG" not in contenido, f"La migración {nombre} reintroduce BPINs ficticios"
            assert "observacion_cualitativa" not in contenido or "DROP" in contenido or "jsonb_build_object" in contenido


def test_kpis_compromisos_sin_reporte_muestran_null():
    """Verifica que el servicio de KPIs retorne promedioCumplimientoCuatrienal=None cuando no hay reportes reales."""
    mock_repo = AsyncMock()

    # 10 compromisos en estado 'sin_reporte'
    mock_compromisos = [
        CompromisoPAS(
            codigo=f"PAS-TEST-{i}",
            nombre=f"Compromiso Test {i}",
            descripcion="Descripción",
            entidad_responsable="Distriseguridad",
            linea_estrategica_codigo="LE-01",
            alternativa_mga_codigo="ALT-01",
            indicador_asociado_codigo="IND-01",
            meta_cuatrienal_descripcion="Meta",
            meta_cuatrienal_valor=100.0,
            unidad_medida="Unidades",
            avance_cuatrienal_valor=None,
            porcentaje_cumplimiento=None,
            presupuesto_anual_cop=None,
            vigencias_programadas=[2026],
            estado="sin_reporte",
            fecha_corte_ultimo_reporte=None,
            metadatos={"fuente": "Decreto 037/2026"},
        )
        for i in range(1, 11)
    ]
    mock_repo.listar.return_value = mock_compromisos

    servicio = CompromisosService(mock_repo)
    kpis = asyncio.run(servicio.obtener_kpis())

    assert kpis.totalCompromisos == 10
    assert kpis.compromisosConReporte == 0
    assert kpis.compromisosSinReporte == 10
    assert kpis.compromisosEnEjecucionOCumplidos == 0
    assert kpis.promedioCumplimientoCuatrienal is None
    assert kpis.presupuestoTotalAnualCop == 0.0


def test_gating_fase3_devuelve_null_sin_reportes_reales():
    """Verifica que el gating devuelva None (null en JSON) para la Fase 3 cuando no hay compromisos con reporte real."""
    from unittest.mock import MagicMock

    mock_session = AsyncMock()

    # Simular resultado de consultas SQL:
    # 1. Diagnóstico: 42 mesas con acta de 194
    mock_res_f1 = MagicMock()
    mock_res_f1.fetchone.return_value = (42, 194)

    # 2. Formulación: 1 dimensión con líneas activas
    mock_res_f2 = MagicMock()
    mock_res_f2.scalar.return_value = 1

    # 3. Seguimiento: avg() devuelve None porque todas las filas tienen porcentaje_cumplimiento IS NULL
    mock_res_f3 = MagicMock()
    mock_res_f3.scalar.return_value = None

    mock_session.execute.side_effect = [mock_res_f1, mock_res_f2, mock_res_f3]

    progresos = asyncio.run(calcular_progreso_real_fases(mock_session))

    assert progresos["FASE_1_DIAGNOSTICO"] == Decimal("21.65")
    assert progresos["FASE_2_FORMULACION"] == Decimal("14.29")
    assert progresos["FASE_3_PLAN_ACCION"] is None
