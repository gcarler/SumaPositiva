import asyncio

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.core.config import Settings
from app.core.database import Base
from app.modules.actores import models as actores_models  # noqa: F401
from app.modules.alternativas import models as alternativas_models  # noqa: F401
from app.modules.aportes import models as aportes_models  # noqa: F401
from app.modules.auditoria import models as auditoria_models  # noqa: F401
from app.modules.compromisos import models as compromisos_models  # noqa: F401
from app.modules.comunicaciones import models as comunicaciones_models  # noqa: F401
from app.modules.evidencia import models as evidencia_models  # noqa: F401
from app.modules.formularios import models as formularios_models  # noqa: F401
from app.modules.fuentes import models as fuentes_models  # noqa: F401
from app.modules.geodatos import models as geodatos_models  # noqa: F401
from app.modules.identidad import models as identidad_models  # noqa: F401
from app.modules.indicadores import models as indicadores_models  # noqa: F401
from app.modules.instrumentos import models as instrumentos_models  # noqa: F401
from app.modules.mesas import models as mesas_models  # noqa: F401
from app.modules.noticias import models as noticias_models  # noqa: F401
from app.modules.notificaciones import models as notificaciones_models  # noqa: F401
from app.modules.participacion import models as participacion_models  # noqa: F401
from app.modules.politicas import models as politicas_models  # noqa: F401
from app.modules.presupuesto import models as presupuesto_models  # noqa: F401
from app.modules.sesion import models as sesion_models  # noqa: F401
from app.modules.testimonios import models as testimonios_models  # noqa: F401

target_metadata = Base.metadata

ALLOWED_SCHEMAS = {
    "public",
    "motor_politicas",
    "geodatos",
    "participacion_ciudadana",
    "autenticacion",
    "auditoria",
    "mesas_trabajo",
    "motor_instrumentos",
    "presupuesto",
    "indicadores",
    "comunicacion",
    "seguimiento",
}


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    if type_ == "schema":
        return name in ALLOWED_SCHEMAS
    if type_ == "table":
        if reflected and name == "spatial_ref_sys":
            return False
        schema = getattr(obj, "schema", None)
        if schema and schema not in ALLOWED_SCHEMAS:
            return False
    return True


def run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        include_object=include_object,
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    engine = create_async_engine(Settings().async_database_url, poolclass=pool.NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=Settings().async_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(run_online())
