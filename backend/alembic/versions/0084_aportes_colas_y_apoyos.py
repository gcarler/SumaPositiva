"""Outbox/inbox durables, contacto privado y principal estable para apoyos.

Revision ID: 0084_aportes_colas_y_apoyos
Revises: 0083_conciliador_gold_set
"""

import json
from collections import defaultdict
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "0084_aportes_colas_y_apoyos"
down_revision = "0083_conciliador_gold_set"
branch_labels = None
depends_on = None
SCHEMA = "participacion_ciudadana"


def _snapshot(fila):
    return {
        "id": str(fila["id"]),
        "sujeto_id": str(fila["sujeto_id"]),
        "tipo_sujeto": fila["tipo_sujeto"],
        "creado_en": fila["creado_en"].isoformat(),
    }


def _consolidar():
    conn = op.get_bind()
    conn.execute(sa.text(f"LOCK TABLE {SCHEMA}.apoyos_propuestas, {SCHEMA}.propuestas_ciudadanas IN EXCLUSIVE MODE"))
    sesiones = dict(conn.execute(sa.text("SELECT id, usuario_id FROM autenticacion.sesiones_usuario")).all())
    usuarios = set(conn.execute(sa.text("SELECT id FROM autenticacion.usuarios")).scalars())
    propuestas = conn.execute(sa.text(f"SELECT id, apoyos_contador FROM {SCHEMA}.propuestas_ciudadanas")).all()
    filas = conn.execute(sa.text(f"SELECT * FROM {SCHEMA}.apoyos_propuestas ORDER BY creado_en, id")).mappings().all()
    por_propuesta = defaultdict(list)
    grupos = defaultdict(list)
    for fila in filas:
        por_propuesta[fila["propuesta_id"]].append(_snapshot(fila))
        destino = fila["sujeto_id"]
        if fila["tipo_sujeto"] == "usuario":
            equivalencias = set()
            if destino in usuarios:
                equivalencias.add(destino)
            if destino in sesiones:
                equivalencias.add(sesiones[destino])
            if len(equivalencias) != 1:
                raise RuntimeError(
                    "0084: apoyo registrado sin correspondencia única demostrable; requiere conciliación"
                )
            destino = equivalencias.pop()
        grupos[(fila["propuesta_id"], destino)].append(fila)
    # Comprobar TODAS las equivalencias antes de modificar cualquier apoyo.
    for grupo in grupos.values():
        if len({f["tipo_sujeto"] for f in grupo}) != 1:
            raise RuntimeError("0084: colisión entre cuenta y sesión anónima; no se infieren equivalencias")
    for (_, destino), grupo in grupos.items():
        if grupo[0]["tipo_sujeto"] == "sesion_anonima":
            continue
        superviviente, *duplicados = grupo
        for duplicado in duplicados:
            conn.execute(sa.text(f"DELETE FROM {SCHEMA}.apoyos_propuestas WHERE id=:id"), {"id": duplicado["id"]})
        conn.execute(
            sa.text(
                f"UPDATE {SCHEMA}.apoyos_propuestas SET sujeto_id=:destino, trazabilidad=CAST(:origen AS jsonb) WHERE id=:id"
            ),
            {
                "destino": destino,
                "id": superviviente["id"],
                "origen": json.dumps([_snapshot(f) for f in grupo]),
            },
        )
    conn.execute(
        sa.text(
            f"UPDATE {SCHEMA}.propuestas_ciudadanas p SET apoyos_contador=(SELECT count(*) FROM {SCHEMA}.apoyos_propuestas a WHERE a.propuesta_id=p.id)"
        )
    )
    for propuesta_id, contador in propuestas:
        despues = (
            conn.execute(
                sa.text(f"SELECT * FROM {SCHEMA}.apoyos_propuestas WHERE propuesta_id=:p ORDER BY creado_en,id"),
                {"p": propuesta_id},
            )
            .mappings()
            .all()
        )
        conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.migracion_apoyos_0084 (propuesta_id,filas_antes,filas_despues,contador_antes,contador_despues) VALUES (:p,CAST(:antes AS jsonb),CAST(:despues AS jsonb),:ca,:cd)"
            ),
            {
                "p": propuesta_id,
                "antes": json.dumps(por_propuesta[propuesta_id]),
                "despues": json.dumps([_snapshot(f) for f in despues]),
                "ca": contador,
                "cd": len(despues),
            },
        )


def upgrade():
    if op.get_bind().scalar(
        sa.text(
            f"SELECT count(*) FROM {SCHEMA}.propuestas_ciudadanas WHERE metadatos ? 'correo_contacto' AND metadatos->'correo_contacto' <> 'null'::jsonb AND (jsonb_typeof(metadatos->'correo_contacto') <> 'string' OR length(metadatos->>'correo_contacto') > 255)"
        )
    ):
        raise RuntimeError(
            "0084: contacto legado no admisible; requiere conciliación sin convertir ni truncar destinos"
        )
    op.add_column(
        "propuestas_ciudadanas",
        sa.Column(
            "correo_contacto",
            sa.String(255),
            comment="Destino privado para constancias; excluido de la proyección pública",
        ),
        schema=SCHEMA,
    )
    op.execute(
        f"UPDATE {SCHEMA}.propuestas_ciudadanas SET correo_contacto=metadatos->>'correo_contacto' WHERE jsonb_typeof(metadatos->'correo_contacto')='string'"
    )
    op.add_column(
        "apoyos_propuestas",
        sa.Column(
            "trazabilidad",
            pg.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
            comment="Filas originales conservadas al consolidar apoyos de una cuenta",
        ),
        schema=SCHEMA,
    )
    op.create_table(
        "migracion_apoyos_0084",
        sa.Column("propuesta_id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("filas_antes", pg.JSONB(), nullable=False),
        sa.Column("filas_despues", pg.JSONB(), nullable=False),
        sa.Column("contador_antes", sa.Integer(), nullable=False),
        sa.Column("contador_despues", sa.Integer(), nullable=False),
        sa.Column(
            "capturado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("clock_timestamp()")
        ),
        schema=SCHEMA,
        comment="Antes y después de la consolidación de apoyos registrados en revisión0084",
    )
    _consolidar()
    op.drop_constraint(op.f("chk_notificaciones_estado_envio"), "notificaciones_transaccionales", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_notificaciones_estado_envio"),
        "notificaciones_transaccionales",
        "estado_envio IN ('pendiente', 'procesando', 'enviado', 'simulado', 'fallido')",
        schema=SCHEMA,
    )
    for columna in (
        sa.Column("intentos", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("proximo_intento_en", sa.DateTime(timezone=True)),
        sa.Column("reclamo_token", pg.UUID(as_uuid=True)),
        sa.Column("reclamo_vence_en", sa.DateTime(timezone=True)),
        sa.Column("simulado_en", sa.DateTime(timezone=True)),
    ):
        op.add_column("notificaciones_transaccionales", columna, schema=SCHEMA)
    op.execute(
        f"UPDATE {SCHEMA}.notificaciones_transaccionales SET simulado_en=enviado_en,enviado_en=NULL WHERE estado_envio='simulado'"
    )
    op.create_index(
        "idx_notif_cola", "notificaciones_transaccionales", ["estado_envio", "proximo_intento_en"], schema=SCHEMA
    )
    op.create_table(
        "whatsapp_inbox",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True, server_default=sa.text("public.generar_uuid_v7()")),
        sa.Column("cuenta_proveedor", sa.String(300), nullable=False),
        sa.Column("mensaje_externo_id", sa.String(300), nullable=False),
        sa.Column("contenido_hash", sa.CHAR(64), nullable=False),
        sa.Column("payload", pg.JSONB(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default=sa.text("'pendiente'")),
        sa.Column("intentos", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_codigo", sa.String(100)),
        sa.Column(
            "propuesta_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey(f"{SCHEMA}.propuestas_ciudadanas.id", ondelete="RESTRICT"),
        ),
        sa.Column("resultado", pg.JSONB()),
        sa.Column("reclamo_token", pg.UUID(as_uuid=True)),
        sa.Column("reclamo_vence_en", sa.DateTime(timezone=True)),
        sa.Column("proximo_intento_en", sa.DateTime(timezone=True)),
        sa.Column(
            "recibido_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("clock_timestamp()")
        ),
        sa.Column("procesado_en", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("cuenta_proveedor", "mensaje_externo_id", name="uq_whatsapp_inbox_mensaje"),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'procesando', 'procesado', 'rechazado', 'error')",
            name=op.f("chk_whatsapp_inbox_estado"),
        ),
        schema=SCHEMA,
        comment="Recepción privada durable y resultado por mensaje WhatsApp",
    )
    op.create_index("idx_whatsapp_inbox_cola", "whatsapp_inbox", ["estado", "proximo_intento_en"], schema=SCHEMA)


def downgrade():
    conn = op.get_bind()
    conn.execute(
        sa.text(
            f"LOCK TABLE {SCHEMA}.propuestas_ciudadanas, {SCHEMA}.apoyos_propuestas, {SCHEMA}.notificaciones_transaccionales, {SCHEMA}.whatsapp_inbox, {SCHEMA}.migracion_apoyos_0084 IN ACCESS EXCLUSIVE MODE"
        )
    )
    # No exponer contactos nuevos al binario antiguo ni perder recepciones durables.
    # Todas las condiciones se comprueban ANTES de cualquier mutación de datos/DDL.
    if conn.scalar(
        sa.text(
            f"SELECT count(*) FROM {SCHEMA}.propuestas_ciudadanas WHERE correo_contacto IS NOT NULL AND correo_contacto IS DISTINCT FROM metadatos->>'correo_contacto'"
        )
    ):
        raise RuntimeError(
            "0084: downgrade bloqueado por contactos solo privados; se conserva íntegro el esquema vigente"
        )
    if conn.scalar(sa.text(f"SELECT count(*) FROM {SCHEMA}.whatsapp_inbox")):
        raise RuntimeError(
            "0084: downgrade bloqueado por recepciones WhatsApp durables sin contrato en el esquema anterior"
        )
    if conn.scalar(
        sa.text(
            f"SELECT count(*) FROM {SCHEMA}.apoyos_propuestas a WHERE tipo_sujeto='usuario' AND trazabilidad='[]'::jsonb AND NOT EXISTS (SELECT 1 FROM autenticacion.sesiones_usuario s WHERE s.id=a.sujeto_id)"
        )
    ):
        raise RuntimeError("0084: downgrade bloqueado por apoyo de cuenta nuevo sin origen de sesión demostrable")
    # Nunca restaurar votos retirados: solo expandir los supervivientes que aún existen.
    filas = (
        conn.execute(sa.text(f"SELECT * FROM {SCHEMA}.apoyos_propuestas WHERE trazabilidad <> '[]'::jsonb"))
        .mappings()
        .all()
    )
    for fila in filas:
        conn.execute(sa.text(f"DELETE FROM {SCHEMA}.apoyos_propuestas WHERE id=:id"), {"id": fila["id"]})
        for original in fila["trazabilidad"]:
            conn.execute(
                sa.text(
                    f"INSERT INTO {SCHEMA}.apoyos_propuestas (id,propuesta_id,sujeto_id,tipo_sujeto,creado_en) VALUES (CAST(:id AS uuid),:p,CAST(:sujeto_id AS uuid),:tipo_sujeto,CAST(:creado_en AS timestamptz))"
                ),
                {**original, "creado_en": datetime.fromisoformat(original["creado_en"]), "p": fila["propuesta_id"]},
            )
    op.execute(
        f"UPDATE {SCHEMA}.propuestas_ciudadanas p SET apoyos_contador=(SELECT count(*) FROM {SCHEMA}.apoyos_propuestas a WHERE a.propuesta_id=p.id)"
    )
    # El journal se archiva en auditoría institucional append-only. El historial
    # público antiguo filtra DEVOLUCION_MOTIVADA y no publica esta acción.
    op.execute(
        f"INSERT INTO auditoria.registros_auditoria (tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos) SELECT '{SCHEMA}.apoyos_propuestas',propuesta_id,'MIGRACION_APOYOS_0084','tecnica','Conservación privada del journal0084 durante downgrade compatible',to_jsonb(m) FROM {SCHEMA}.migracion_apoyos_0084 m"
    )
    op.drop_table("whatsapp_inbox", schema=SCHEMA)
    op.drop_index("idx_notif_cola", "notificaciones_transaccionales", schema=SCHEMA)
    op.execute(
        f"UPDATE {SCHEMA}.notificaciones_transaccionales SET estado_envio='fallido',error_detalle=concat_ws(';',error_detalle,'0084_downgrade_entrega_pendiente') WHERE estado_envio IN ('pendiente','procesando')"
    )
    op.execute(
        f"UPDATE {SCHEMA}.notificaciones_transaccionales SET error_detalle=concat_ws(';',error_detalle,'0084_simulado_en=' || simulado_en::text) WHERE estado_envio='simulado' AND simulado_en IS NOT NULL"
    )
    op.drop_constraint(op.f("chk_notificaciones_estado_envio"), "notificaciones_transaccionales", schema=SCHEMA)
    op.create_check_constraint(
        op.f("chk_notificaciones_estado_envio"),
        "notificaciones_transaccionales",
        "estado_envio IN ('enviado', 'simulado', 'fallido')",
        schema=SCHEMA,
    )
    for columna in ("intentos", "proximo_intento_en", "reclamo_token", "reclamo_vence_en", "simulado_en"):
        op.drop_column("notificaciones_transaccionales", columna, schema=SCHEMA)
    op.drop_table("migracion_apoyos_0084", schema=SCHEMA)
    op.drop_column("apoyos_propuestas", "trazabilidad", schema=SCHEMA)
    op.drop_column("propuestas_ciudadanas", "correo_contacto", schema=SCHEMA)
