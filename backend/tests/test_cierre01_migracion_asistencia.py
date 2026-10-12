"""Pruebas de certificación pericial para CIERRE-01: Migración 0023 e integridad de Escenarios Especiales."""

import uuid
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

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
    """Certifica que 0023_asistencia_multicanal encadene tras 0022 sin bifurcaciones."""
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

    # 3. Cabeza única sin divergencias
    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "0057_comentario_pas"


def test_migracion_0023_no_modifica_permisos_auditor_forense():
    """Verifica que el código de migración 0023 no contenga mutaciones sobre permisos de auditor_forense."""
    with open("backend/alembic/versions/0023_asistencia_multicanal.py", "r", encoding="utf-8") as f:
        contenido = f.read()

    # Ni upgrade ni downgrade deben alterar roles o permisos de auditor_forense
    assert "auditor_forense" not in contenido
    assert "quitar" not in contenido


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
