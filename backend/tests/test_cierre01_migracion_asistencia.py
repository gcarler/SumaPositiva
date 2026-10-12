"""Pruebas de certificación pericial para CIERRE-01: Migración 0023 e integridad de Escenarios Especiales."""

import uuid
from datetime import date

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from app.core.database import Base
from app.modules.participacion.models import EscenarioEspecial

pytestmark = pytest.mark.anyio


def test_modelo_escenario_especial_registrado_en_metadata():
    """Verifica que EscenarioEspecial esté formalmente registrado en Base.metadata sin drift."""
    tabla_nombre = "participacion_ciudadana.escenarios_especiales"
    assert tabla_nombre in Base.metadata.tables, f"La tabla {tabla_nombre} debe estar en Base.metadata"

    tabla = Base.metadata.tables[tabla_nombre]
    columnas_esperadas = {
        "id",
        "codigo_unico",
        "nombre",
        "tipo_escenario",
        "territorio_id",
        "fecha",
        "lugar",
        "entidad_convocante",
        "total_asistentes",
        "desglose_poblacional",
        "sintesis_acuerdos",
        "url_evidencia",
        "estado",
        "creado_en",
        "actualizado_en",
    }
    columnas_reales = set(tabla.columns.keys())
    assert columnas_esperadas.issubset(columnas_reales)

    # Validar índices requeridos
    indices = {idx.name for idx in tabla.indexes}
    assert "idx_escenarios_tipo" in indices
    assert "idx_escenarios_fecha" in indices
    assert "idx_escenarios_territorio" in indices


def test_lineaje_alembic_0023_linear_y_cabeza_unica():
    """Certifica que 0023_asistencia_multicanal encadene tras 0022 sin bifurcaciones y bajo cabeza única."""
    alembic_cfg = Config("backend/alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)

    # 1. Obtener la revisión 0023
    rev_0023 = script.get_revision("0023_asistencia_multicanal")
    assert rev_0023 is not None
    assert rev_0023.down_revision == "0022_merge_identidad_actas"

    # 2. Verificar que 0024 encadene a 0023
    rev_0024 = script.get_revision("0024_testimonios_memoria")
    assert rev_0024 is not None
    assert rev_0024.down_revision == "0023_asistencia_multicanal"

    # 3. Cabeza única sin fijar nombre arbitrario de revisión futura
    heads = script.get_heads()
    assert len(heads) == 1, f"Debe existir exactamente una sola cabeza en Alembic, encontradas: {heads}"

    # 4. Verificar que 0023 pertenezca a la cadena histórica activa
    revs = [r.revision for r in script.walk_revisions(base="base", head=heads[0])]
    assert "0023_asistencia_multicanal" in revs


def test_migracion_0023_no_modifica_permisos_auditor_forense(database_url, monkeypatch):
    """Verifica que el ciclo upgrade/downgrade de 0023 en base aislada preserve intactos los permisos de auditor_forense."""
    monkeypatch.setenv("POLIS_DATABASE_URL", database_url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))

    async def obtener_permisos_auditor():
        engine = create_async_engine(database_url, hide_parameters=True)
        try:
            async with engine.connect() as conn:
                res = await conn.execute(
                    text("SELECT permisos FROM autenticacion.roles WHERE codigo = 'auditor_forense'")
                )
                row = res.fetchone()
                return list(row[0]) if row and row[0] is not None else []
        finally:
            await engine.dispose()

    try:
        # 1. Llevar base al estado inmediatamente previo (0022)
        command.downgrade(config, "0022_merge_identidad_actas")
        permisos_0022 = asyncio.run(obtener_permisos_auditor())
        assert len(permisos_0022) > 0, "El rol auditor_forense debe contar con permisos en revisión 0022"

        # 2. Aplicar 0023 y certificar que no muta los permisos del rol
        command.upgrade(config, "0023_asistencia_multicanal")
        permisos_0023 = asyncio.run(obtener_permisos_auditor())
        assert permisos_0023 == permisos_0022, "Upgrade de 0023 no debe alterar permisos de auditor_forense"

        # 3. Aplicar downgrade de 0023 hacia 0022 y verificar ausencia de mutación espuria
        command.downgrade(config, "0022_merge_identidad_actas")
        permisos_tras_downgrade = asyncio.run(obtener_permisos_auditor())
        assert permisos_tras_downgrade == permisos_0022, "Downgrade de 0023 no debe alterar permisos de auditor_forense"

        # 4. Validar que la tabla escenarios_especiales fue efectivamente eliminada en downgrade
        async def tabla_escenarios_existe():
            engine = create_async_engine(database_url, hide_parameters=True)
            try:
                async with engine.connect() as conn:
                    res = await conn.execute(
                        text("SELECT to_regclass('participacion_ciudadana.escenarios_especiales')")
                    )
                    return res.scalar() is not None
            finally:
                await engine.dispose()

        assert not asyncio.run(tabla_escenarios_existe()), "La tabla escenarios_especiales debe removerse en downgrade"

    finally:
        # Restaurar la base al head para no alterar el estado de pruebas subsecuentes
        command.upgrade(config, "head")


async def test_escenario_especial_persistencia_orm(database_url: str):
    """Verifica la persistencia ORM, lectura y consistencia del modelo EscenarioEspecial."""
    engine = create_async_engine(database_url, hide_parameters=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    codigo_test = f"ESC-PERIT-ORM-{uuid.uuid4().hex[:8]}"

    async with session_factory() as session:
        escenario = EscenarioEspecial(
            codigo_unico=codigo_test,
            nombre="Encuentro Comunitario de Seguridad Insular Tierrabomba",
            tipo_escenario="CONSULTA_PREVIA",
            fecha=date(2026, 10, 12),
            lugar="Salón Comunal Punta Arena",
            entidad_convocante="Secretaría del Interior y Convivencia",
            total_asistentes=110,
            desglose_poblacional={"afrodescendientes": 105, "mujeres": 62, "jovenes": 38},
            sintesis_acuerdos="Acuerdos de salvaguarda étnico-territorial y convivencia pacífica.",
            estado="REALIZADO",
        )
        session.add(escenario)
        await session.commit()
        escenario_id = escenario.id
        assert escenario_id is not None

    async with session_factory() as session:
        stmt = select(EscenarioEspecial).where(EscenarioEspecial.id == escenario_id)
        res = await session.execute(stmt)
        leido = res.scalar_one_or_none()

        assert leido is not None
        assert leido.codigo_unico == codigo_test
        assert leido.total_asistentes == 110
        assert leido.desglose_poblacional["afrodescendientes"] == 105
        assert leido.creado_en is not None

        # Limpieza de registro de prueba
        await session.delete(leido)
        await session.commit()

    await engine.dispose()
