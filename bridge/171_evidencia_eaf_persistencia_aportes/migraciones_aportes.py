"""Roundtrip de migraciones y conservación de aportes anteriores a 0056."""

import asyncio
import json
import os
import uuid
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent
DATABASE = json.loads((EVIDENCE / "base.json").read_text())["database"]
URL = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(URL).database == make_url(os.environ["POLIS_DATABASE_URL"]).database == DATABASE
config = Config(str(ROOT / "backend/alembic.ini"))
ids = {"proposal": uuid.uuid4(), "subject": uuid.uuid4(), "audit": uuid.uuid4()}
result = {"database": DATABASE, "ids": ids, "heads": ScriptDirectory.from_config(config).get_heads(), "steps": []}
assert len(result["heads"]) == 1


async def execute(operation):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as connection:
            assert await connection.scalar(text("SELECT current_database()")) == DATABASE
            return await operation(connection)
    finally:
        await engine.dispose()


async def demote_test_admins(connection):
    await connection.execute(text("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='ciudadano') WHERE rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='administrador_identidades')"))


async def seed_previous(connection):
    line = await connection.scalar(text("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1"))
    if line is None:
        line = await connection.scalar(text("INSERT INTO motor_politicas.lineas_estrategicas (fase_id, dimension_id, codigo, titulo, descripcion) SELECT f.id,d.id,'EAF-MIGRACION-171','Línea EAF','Sintética' FROM motor_politicas.fases_politica f CROSS JOIN motor_politicas.dimensiones_seguridad_humana d LIMIT 1 RETURNING id"))
    await connection.execute(text("INSERT INTO participacion_ciudadana.propuestas_ciudadanas (id,linea_id,titulo,descripcion,estado,metadatos) VALUES (:proposal,:line,'EAF aporte previo 0056','Datos sintéticos conservados','rechazado',CAST(:metadata AS jsonb))"), {**ids, "line": line, "metadata": json.dumps({"eaf": 171})})
    await connection.execute(text("INSERT INTO participacion_ciudadana.apoyos_propuestas (propuesta_id,sujeto_id,tipo_sujeto) VALUES (:proposal,:subject,'sesion_anonima')"), ids)
    await connection.execute(text("INSERT INTO auditoria.registros_auditoria (id,tabla_afectada,registro_id,accion,causal,justificacion_motivada) VALUES (:audit,'participacion_ciudadana.propuestas_ciudadanas',:proposal,'DEVOLUCION_MOTIVADA','tecnica','Razón histórica sintética suficientemente motivada')"), ids)
    return dict((await connection.execute(text("SELECT id,linea_id,titulo,descripcion,estado,metadatos,apoyos_contador FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:proposal"), ids)).mappings().one())


async def check_after(connection):
    row = dict((await connection.execute(text("SELECT id,linea_id,titulo,descripcion,estado,metadatos,apoyos_contador,codigo_radicado FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:proposal"), ids)).mappings().one())
    rad = row.pop("codigo_radicado")
    assert row == result["before"]
    assert rad.startswith("POL-2026-")
    assert await connection.scalar(text("SELECT count(*) FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:proposal AND sujeto_id=:subject"), ids) == 1
    assert await connection.scalar(text("SELECT count(*) FROM auditoria.registros_auditoria WHERE id=:audit AND registro_id=:proposal"), ids) == 1
    return {"conserved": row, "assigned_code": rad, "support_count": 1, "audit_count": 1, "observer_pid": await connection.scalar(text("SELECT pg_backend_pid()"))}


async def after_base(connection):
    tables = list((await connection.execute(text("SELECT schemaname||'.'||tablename FROM pg_tables WHERE schemaname IN ('participacion_ciudadana','auditoria','mesas_trabajo','motor_politicas','autenticacion','seguimiento') ORDER BY 1"))).scalars())
    assert tables == []
    return {"application_tables": tables, "extensions_retained": list((await connection.execute(text("SELECT extname FROM pg_extension ORDER BY extname"))).scalars())}


print("downgrade 0055 (solo base EAF nueva)", flush=True)
asyncio.run(execute(demote_test_admins))
command.downgrade(config, "0055_ingesta_indicadores_reales")
result["steps"].append("downgrade 0055")
result["before"] = asyncio.run(execute(seed_previous))
command.upgrade(config, "head")
result["after"] = asyncio.run(execute(check_after))
result["steps"].append("upgrade head: aportes/apoyos/auditoría anteriores conservados")
command.check(config)
result["steps"].append("alembic check después de upgrade con datos")
command.downgrade(config, "base")
result["after_base"] = asyncio.run(execute(after_base))
result["steps"].append("downgrade base: tablas aplicación vacías, extensiones preinstaladas retenidas")
command.upgrade(config, "head")
command.upgrade(config, "head")
command.check(config)
result["steps"].append("reconstrucción upgrade head; upgrade head idempotente; alembic check")
(EVIDENCE / "migraciones_aportes_resultado.json").write_text(json.dumps(result, indent=2, default=str) + "\n")
print(json.dumps(result, default=str), flush=True)
