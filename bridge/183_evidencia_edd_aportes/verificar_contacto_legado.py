"""Regresiones finales0084: destino legado exacto o rechazo sin mutaciones.

Opera únicamente sobre la segunda base propia reservada al ensayo destructivo.
"""

import asyncio
import hashlib
import json
import os
import uuid
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from alembic import command
from alembic.config import Config

EVIDENCE = Path(__file__).resolve().parent
DATABASE = json.loads((EVIDENCE / "base_migraciones_global.json").read_text())[
    "database"
]
URL = os.environ["POLIS_TEST_MIGRATIONS_DATABASE_URL"]
assert make_url(URL).database == DATABASE and DATABASE in json.loads(
    os.environ["POLIS_EDD_DATABASES"]
)
assert DATABASE != make_url(os.environ["POLIS_TEST_DATABASE_URL"]).database
assert DATABASE.startswith("polis_test_edd_aportes_20261026_migraciones_")
os.environ["POLIS_DATABASE_URL"] = URL
CONFIG = Config(str(EVIDENCE.parents[1] / "backend/alembic.ini"))
RESULT = []


async def sql(consulta, datos=None):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as conn:
            resultado = await conn.execute(text(consulta), datos or {})
            return resultado.scalar() if resultado.returns_rows else None
    finally:
        await engine.dispose()


def run(consulta, datos=None):
    return asyncio.run(sql(consulta, datos))


def snapshot():
    datos = run("""SELECT jsonb_build_object(
    'version',(SELECT jsonb_agg(to_jsonb(t)) FROM alembic_version t),
    'aportes',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.propuestas_ciudadanas t),
    'apoyos',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.apoyos_propuestas t),
    'notifs',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.notificaciones_transaccionales t),
    'auditoria',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM auditoria.registros_auditoria t),
    'columnas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY table_name,column_name) FROM information_schema.columns t WHERE table_schema='participacion_ciudadana'))""")
    return hashlib.sha256(
        json.dumps(datos, sort_keys=True, default=str).encode()
    ).hexdigest()


command.upgrade(CONFIG, "head")
command.downgrade(CONFIG, "0083_conciliador_gold_set")
linea = run("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1")
if linea is None:
    linea = run("""INSERT INTO motor_politicas.lineas_estrategicas(fase_id,dimension_id,codigo,titulo,descripcion)
    SELECT f.id,d.id,'EDD-CONTACTO-0084','Contacto legado de pruebas','Solo datos sintéticos'
    FROM motor_politicas.fases_politica f CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
    ORDER BY f.codigo,d.codigo LIMIT 1 RETURNING id""")


def insertar(meta):
    aporte_id = uuid.uuid4()
    run(
        """INSERT INTO participacion_ciudadana.propuestas_ciudadanas(id,linea_id,titulo,descripcion,metadatos)
    VALUES(:id,:linea,'Contacto legado sintético','Validación sin convertir ni truncar destino',CAST(:meta AS jsonb))""",
        {"id": aporte_id, "linea": linea, "meta": json.dumps(meta)},
    )
    return aporte_id


for nombre, valor in [
    ("largo_256", "a" * 256),
    ("objeto", {"destino": "privado@example.org"}),
    ("numero", 573001234567),
    ("booleano", True),
    ("lista", ["privado@example.org"]),
]:
    aporte_id = insertar({"correo_contacto": valor, "marca": nombre})
    antes = snapshot()
    try:
        command.upgrade(CONFIG, "head")
        raise AssertionError("Se admitió un destino legado que debía bloquearse")
    except RuntimeError as error:
        assert "contacto legado no admisible" in str(error)
    despues = snapshot()
    assert despues == antes
    assert run("SELECT version_num FROM alembic_version") == "0083_conciliador_gold_set"
    assert (
        run(
            "SELECT count(*) FROM information_schema.columns WHERE table_schema='participacion_ciudadana' AND column_name='correo_contacto'"
        )
        == 0
    )
    assert run(
        "SELECT metadatos FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id",
        {"id": aporte_id},
    ) == {"correo_contacto": valor, "marca": nombre}
    RESULT.append(
        {
            "caso": nombre,
            "upgrade_rechazado": True,
            "snapshot_antes_sha256": antes,
            "snapshot_despues_sha256": despues,
            "revision_conservada": "0083_conciliador_gold_set",
        }
    )
    # Retirar exclusivamente la fila de fixture sintética de este escenario ya comprobado.
    run(
        "DELETE FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id",
        {"id": aporte_id},
    )

exacto = " Contacto.Exacto+prueba@Example.org "
valido = insertar({"correo_contacto": exacto, "marca": "copia_exacta"})
nulo = insertar({"correo_contacto": None, "marca": "nulo_conservado"})
ausente = insertar({"marca": "sin_destino"})
command.upgrade(CONFIG, "head")
assert (
    run(
        "SELECT correo_contacto FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id",
        {"id": valido},
    )
    == exacto
)
assert run(
    "SELECT metadatos FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id",
    {"id": valido},
) == {"correo_contacto": exacto, "marca": "copia_exacta"}
for aporte_id in (nulo, ausente):
    assert (
        run(
            "SELECT correo_contacto FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id",
            {"id": aporte_id},
        )
        is None
    )
command.check(CONFIG)
RESULT.append(
    {
        "caso": "valido_nulo_y_ausente",
        "copia_exacta": True,
        "json_conservado": True,
        "sin_conversion_ni_truncacion": True,
        "revision": "0084_aportes_colas_y_apoyos",
    }
)
(EVIDENCE / "contacto_legado_resultado.json").write_text(
    json.dumps({"database": DATABASE, "resultados": RESULT}, indent=2) + "\n"
)
print(json.dumps(RESULT, indent=2))
