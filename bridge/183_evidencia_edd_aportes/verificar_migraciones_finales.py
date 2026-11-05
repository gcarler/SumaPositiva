"""Migraciones EDD en la base nueva propia, sin proveedores ni datos externos."""

import asyncio
import json
import os
import uuid
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

EVIDENCE = Path(__file__).resolve().parent
ROOT = EVIDENCE.parents[1]
DATABASE = json.loads((EVIDENCE / "base_migraciones_global.json").read_text())["database"]
URL = os.environ["POLIS_TEST_MIGRATIONS_DATABASE_URL"]
os.environ["POLIS_DATABASE_URL"] = URL
assert (
    make_url(URL).database
    == make_url(os.environ["POLIS_DATABASE_URL"]).database
    == DATABASE
)
assert DATABASE.startswith("polis_test_edd_aportes_20261026_")
CONFIG = Config(str(ROOT / "backend/alembic.ini"))
RESULT = {
    "database": DATABASE,
    "revision": "0084_aportes_colas_y_apoyos",
    "escenarios": [],
}


def record(nombre, **valores):
    RESULT["escenarios"].append({"escenario": nombre, **valores})
    (EVIDENCE / "migraciones_finales_resultado.json").write_text(
        json.dumps(RESULT, indent=2, default=str) + "\n"
    )


async def sql(consulta, parametros=None, *, filas=False):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as conn:
            resultado = await conn.execute(text(consulta), parametros or {})
            return (
                [dict(f) for f in resultado.mappings().all()]
                if filas
                else (resultado.scalar() if resultado.returns_rows else None)
            )
    finally:
        await engine.dispose()


def run(consulta, parametros=None, *, filas=False):
    return asyncio.run(sql(consulta, parametros, filas=filas))


def version():
    return run("SELECT version_num FROM alembic_version")


def digest():
    # Captura completa de las tablas afectadas, incluyendo errores/leases/contadores.
    return run("""SELECT jsonb_build_object(
        'revision',(SELECT jsonb_agg(to_jsonb(t)) FROM alembic_version t),
        'propuestas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.propuestas_ciudadanas t),
        'apoyos',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.apoyos_propuestas t),
        'notificaciones',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.notificaciones_transaccionales t),
        'inbox',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM participacion_ciudadana.whatsapp_inbox t),
        'journal',(SELECT jsonb_agg(to_jsonb(t) ORDER BY propuesta_id) FROM participacion_ciudadana.migracion_apoyos_0084 t),
        'auditoria',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM auditoria.registros_auditoria t),
        'columnas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY table_name,column_name) FROM information_schema.columns t WHERE table_schema='participacion_ciudadana')
    )""")


# Instalación vacía, metadata/check, downgrade base y reconstrucción antes de datos incompatibles.
command.upgrade(CONFIG, "head")
assert version() == "0084_aportes_colas_y_apoyos"
command.check(CONFIG)
checks = run(
    """SELECT conname,pg_get_constraintdef(oid) AS definicion,convalidated FROM pg_constraint
WHERE conrelid IN ('participacion_ciudadana.apoyos_propuestas'::regclass,
'participacion_ciudadana.notificaciones_transaccionales'::regclass,
'participacion_ciudadana.whatsapp_inbox'::regclass) AND contype='c' ORDER BY conname""",
    filas=True,
)
assert any(f["conname"] == "chk_tipo_sujeto" and f["convalidated"] for f in checks)
record("upgrade_vacio_y_metadata", checks=checks)
command.downgrade(CONFIG, "base")
assert (
    run(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('public','pg_catalog','information_schema','topology') AND table_schema NOT LIKE 'pg_%'"
    )
    == 0
)
record("downgrade_base_vacio", tablas_aplicacion=0)
command.upgrade(CONFIG, "head")
command.upgrade(CONFIG, "head")
command.check(CONFIG)
record("reconstruccion_repetida", revision=version())


async def seed_identidad():
    from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
    from app.modules.identidad.service import IdentidadService

    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as session:
            service = IdentidadService(session)
            correo = "migracion-" + uuid.uuid4().hex + "@example.org"
            cuenta = await service.registrar_usuario(
                UsuarioCreacion(
                    correo=correo,
                    contrasena="MigracionLocal2026*",
                    nombres="Migración",
                    apellidos="Sintética",
                )
            )
            for _ in range(2):
                await service.autenticar_usuario(
                    LoginPeticion(correo=correo, contrasena="MigracionLocal2026*")
                )
            ids = list(
                (
                    await session.execute(
                        text(
                            "SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:id ORDER BY creada_en"
                        ),
                        {"id": cuenta.id},
                    )
                ).scalars()
            )
            assert len(ids) == 2
            return cuenta.id, ids
    finally:
        await engine.dispose()


usuario_id, sesiones_ids = asyncio.run(seed_identidad())
command.downgrade(CONFIG, "0083_conciliador_gold_set")
linea = run("""INSERT INTO motor_politicas.lineas_estrategicas (fase_id,dimension_id,codigo,titulo,descripcion)
SELECT f.id,d.id,'EDD-MIGRACION-0084','Línea de migraciones','Solo datos sintéticos'
FROM motor_politicas.fases_politica f CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
ORDER BY f.codigo,d.codigo LIMIT 1 RETURNING id""")
propuesta_id, propuesta_retiro = uuid.uuid4(), uuid.uuid4()
for propuesta in (propuesta_id, propuesta_retiro):
    run(
        """INSERT INTO participacion_ciudadana.propuestas_ciudadanas(id,linea_id,titulo,descripcion,estado,metadatos)
    VALUES(:id,:linea,'Legado0084','Contenido legado conservado','en_revision',CAST(:metadatos AS jsonb))""",
        {
            "id": propuesta,
            "linea": linea,
            "metadatos": json.dumps(
                {
                    "correo_contacto": "legado@example.org",
                    "anidado": {"telefono": "573001234567"},
                }
            ),
        },
    )
originales = {}
for propuesta in (propuesta_id, propuesta_retiro):
    filas_ids = []
    for sujeto, tipo in [
        (sesiones_ids[0], "usuario"),
        (sesiones_ids[1], "usuario"),
        (usuario_id, "usuario"),
        (uuid.uuid4(), "sesion_anonima"),
    ]:
        apoyo_id = uuid.uuid4()
        filas_ids.append(apoyo_id)
        run(
            "INSERT INTO participacion_ciudadana.apoyos_propuestas(id,propuesta_id,sujeto_id,tipo_sujeto) VALUES(:id,:p,:s,:t)",
            {"id": apoyo_id, "p": propuesta, "s": sujeto, "t": tipo},
        )
    originales[propuesta] = filas_ids
    run(
        "UPDATE participacion_ciudadana.propuestas_ciudadanas SET apoyos_contador=99 WHERE id=:p",
        {"p": propuesta},
    )
notificacion_id = uuid.uuid4()
run(
    """INSERT INTO participacion_ciudadana.notificaciones_transaccionales
(id,codigo_radicado,destinatario_correo,tipo_evento,asunto,cuerpo_html,estado_envio,enviado_en)
SELECT :n,codigo_radicado,'legado@example.org','radicacion','Legado','<p>Constancia conservada</p>','simulado','2026-01-02T03:04:05Z' FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:p""",
    {"n": notificacion_id, "p": propuesta_id},
)
run(
    """INSERT INTO auditoria.registros_auditoria(tabla_afectada,registro_id,accion,causal,justificacion_motivada)
VALUES('participacion_ciudadana.propuestas_ciudadanas',:p,'DEVOLUCION_MOTIVADA','tecnica','Razón legada inmutable conservada en revisión')""",
    {"p": propuesta_id},
)

# Un apoyo huérfano NO se convierte en persona ni se descarta para conseguir el upgrade.
huerfano = uuid.uuid4()
run(
    "INSERT INTO participacion_ciudadana.apoyos_propuestas(id,propuesta_id,sujeto_id,tipo_sujeto) VALUES(:id,:p,:s,'usuario')",
    {"id": huerfano, "p": propuesta_id, "s": uuid.uuid4()},
)
try:
    command.upgrade(CONFIG, "head")
    raise AssertionError("Upgrade debía detenerse ante correspondencia no demostrada")
except RuntimeError as error:
    assert "correspondencia" in str(error)
assert version() == "0083_conciliador_gold_set"
assert (
    run(
        "SELECT count(*) FROM information_schema.columns WHERE table_schema='participacion_ciudadana' AND column_name='correo_contacto'"
    )
    == 0
)
assert (
    run(
        "SELECT count(*) FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id",
        {"id": huerfano},
    )
    == 1
)
record(
    "upgrade_ambiguo_rechazado_atomicamente", revision=version(), apoyo_conservado=True
)
# Conciliación solo del fixture sintético identificado como tal, no datos de aplicación reales.
run(
    "DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id",
    {"id": huerfano},
)
command.upgrade(CONFIG, "head")
command.check(CONFIG)
journal = run(
    "SELECT propuesta_id,contador_antes,contador_despues,jsonb_array_length(filas_antes) AS filas_antes,jsonb_array_length(filas_despues) AS filas_despues FROM participacion_ciudadana.migracion_apoyos_0084 ORDER BY propuesta_id",
    filas=True,
)
assert len(journal) == 2 and all(
    f["contador_antes"] == 99
    and f["contador_despues"] == 2
    and f["filas_antes"] == 4
    and f["filas_despues"] == 2
    for f in journal
)
assert (
    run(
        "SELECT count(*) FROM participacion_ciudadana.apoyos_propuestas WHERE sujeto_id=:u AND tipo_sujeto='usuario'",
        {"u": usuario_id},
    )
    == 2
)
assert (
    run(
        "SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE correo_contacto='legado@example.org' AND metadatos->>'correo_contacto'='legado@example.org' AND estado='en_revision'"
    )
    == 2
)
assert run(
    "SELECT enviado_en IS NULL AND simulado_en='2026-01-02T03:04:05Z'::timestamptz FROM participacion_ciudadana.notificaciones_transaccionales WHERE id=:id",
    {"id": notificacion_id},
)
record(
    "legados_conservados_y_consolidados",
    journal=journal,
    notificacion_conservada=True,
    fecha_simulada_separada=True,
)

# El retiro de un voto consolidado no resucita sus sesiones al downgrade.
run(
    "DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p AND tipo_sujeto='usuario'",
    {"p": propuesta_retiro},
)
# Un apoyo anónimo NUEVO conserva su UUID sin equivalencias de persona.
apoyo_nuevo, anonimo_nuevo = uuid.uuid4(), uuid.uuid4()
run(
    "INSERT INTO participacion_ciudadana.apoyos_propuestas(id,propuesta_id,sujeto_id,tipo_sujeto) VALUES(:id,:p,:s,'sesion_anonima')",
    {"id": apoyo_nuevo, "p": propuesta_retiro, "s": anonimo_nuevo},
)
command.downgrade(CONFIG, "0083_conciliador_gold_set")
for propuesta in (propuesta_id, propuesta_retiro):
    ids = {
        fila["id"]
        for fila in run(
            "SELECT id FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p",
            {"p": propuesta},
            filas=True,
        )
    }
    esperados = (
        set(originales[propuesta])
        if propuesta == propuesta_id
        else {originales[propuesta][-1], apoyo_nuevo}
    )
    assert ids == esperados
assert (
    run(
        "SELECT count(*) FROM auditoria.registros_auditoria WHERE accion='MIGRACION_APOYOS_0084'"
    )
    == 2
)
assert (
    run(
        "SELECT count(*) FROM auditoria.registros_auditoria WHERE tabla_afectada='participacion_ciudadana.propuestas_ciudadanas' AND accion='DEVOLUCION_MOTIVADA'"
    )
    == 1
)
assert (
    run(
        "SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE metadatos ? 'migracion_apoyos_0084'"
    )
    == 0
)
assert run(
    "SELECT error_detalle LIKE '%0084_simulado_en=%' AND enviado_en IS NULL FROM participacion_ciudadana.notificaciones_transaccionales WHERE id=:id",
    {"id": notificacion_id},
)
record(
    "downgrade_compatible_preserva_retiro_y_nuevo_anonimo",
    filas_originales_restauradas=4,
    filas_tras_retiro_y_nuevo=2,
    journal_privado_en_auditoria=True,
    historial_publico_antiguo_excluye_journal=True,
)
command.upgrade(CONFIG, "head")
command.check(CONFIG)


# Rechazo íntegro al intentar bajar con nuevas capacidades sin contrato previo.
def rechazar_downgrade(nombre, esperado):
    antes = digest()
    try:
        command.downgrade(CONFIG, "0083_conciliador_gold_set")
        raise AssertionError("Downgrade incompatible no debió confirmarse")
    except RuntimeError as error:
        assert esperado in str(error), str(error)
    assert digest() == antes and version() == "0084_aportes_colas_y_apoyos"
    record(nombre, rollback_integro=True, revision=version())


run(
    "UPDATE participacion_ciudadana.propuestas_ciudadanas SET correo_contacto='solo-privado@example.org' WHERE id=:p",
    {"p": propuesta_id},
)
rechazar_downgrade("contacto_solo_privado_bloquea_downgrade", "contactos solo privados")
# Fixture reversible: devolver solo el valor conocido del legado para probar la siguiente guarda.
run(
    "UPDATE participacion_ciudadana.propuestas_ciudadanas SET correo_contacto=metadatos->>'correo_contacto' WHERE id=:p",
    {"p": propuesta_id},
)
apoyo_cuenta_nuevo = uuid.uuid4()
run(
    "INSERT INTO participacion_ciudadana.apoyos_propuestas(id,propuesta_id,sujeto_id,tipo_sujeto) VALUES(:id,:p,:u,'usuario')",
    {"id": apoyo_cuenta_nuevo, "p": propuesta_retiro, "u": usuario_id},
)
rechazar_downgrade(
    "nuevo_apoyo_cuenta_sin_origen_bloquea_downgrade", "apoyo de cuenta nuevo"
)
run(
    "DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id",
    {"id": apoyo_cuenta_nuevo},
)
run(
    "INSERT INTO participacion_ciudadana.whatsapp_inbox(cuenta_proveedor,mensaje_externo_id,contenido_hash,payload) VALUES('fixture0084','fixture-inbox',repeat('a',64),'{}'::jsonb)"
)
rechazar_downgrade("inbox_durable_bloquea_downgrade", "recepciones WhatsApp")
command.check(CONFIG)
record(
    "snapshot_migracion_final",
    revision=version(),
    limite="Downgrade compatible probado; incompatibles preservan0084 y no son downgrade aprobado",
)
print(json.dumps(RESULT, indent=2, default=str))
