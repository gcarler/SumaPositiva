"""Sesiones revocables, acciones por correo, límites y administración de identidades."""

import json

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0021_identidad_completa"
down_revision = "0020_formularios_y_consultas"
branch_labels = None
depends_on = None

PERMISOS_ADMIN = ["usuarios:leer", "usuarios:gestionar", "roles:gestionar", "identidad:auditar"]


def upgrade():
    op.add_column(
        "usuarios",
        sa.Column("correo_verificado_en", sa.DateTime(timezone=True)),
        schema="autenticacion",
    )
    # No modificar ni fusionar cuentas existentes. Detectar colisiones antes de crear el índice.
    op.execute("""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM autenticacion.usuarios GROUP BY lower(correo) HAVING count(*) > 1)
        THEN RAISE EXCEPTION 'Existen correos duplicados sin distinguir mayúsculas; revisar cuentas antes de migrar';
        END IF;
    END $$""")
    op.create_index(
        "uq_usuarios_correo_normalizado",
        "usuarios",
        [sa.text("lower(correo)")],
        unique=True,
        schema="autenticacion",
    )
    op.create_table(
        "sesiones_usuario",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("creada_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revocada_en", sa.DateTime(timezone=True)),
        schema="autenticacion",
    )
    op.create_index("idx_sesiones_usuario_usuario", "sesiones_usuario", ["usuario_id"], schema="autenticacion")
    op.create_table(
        "tokens_accion",
        sa.Column("hash_token", sa.String(64), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("autenticacion.usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("proposito", sa.String(20), nullable=False),
        sa.Column("nonce", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entregas", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("enviado_en", sa.DateTime(timezone=True)),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True)),
        schema="autenticacion",
    )
    op.create_index("idx_tokens_accion_usuario", "tokens_accion", ["usuario_id"], schema="autenticacion")
    op.create_table(
        "eventos_identidad",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("public.generar_uuid_v7()"),
        ),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("objetivo_id", postgresql.UUID(as_uuid=True)),
        sa.Column("accion", sa.String(60), nullable=False),
        sa.Column("detalle", postgresql.JSONB, nullable=False),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("clock_timestamp()"),
        ),
        schema="autenticacion",
    )
    # Append-only a nivel SQL para el rol de aplicación; el propietario de la base conserva
    # capacidad administrativa. La entrega no pretende resistencia frente al superusuario.
    op.execute("""CREATE FUNCTION autenticacion.proteger_eventos_identidad() RETURNS trigger
        LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
        BEGIN RAISE EXCEPTION 'Los eventos de identidad son append-only'; END $$""")
    op.execute("""CREATE TRIGGER trg_eventos_identidad_append_only
        BEFORE UPDATE OR DELETE ON autenticacion.eventos_identidad
        FOR EACH ROW EXECUTE FUNCTION autenticacion.proteger_eventos_identidad()""")
    op.create_table(
        "limites_acceso",
        sa.Column("clave", sa.String(64), primary_key=True),
        sa.Column("intentos", sa.Integer, nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        schema="autenticacion",
    )
    op.execute(
        sa.text("""INSERT INTO autenticacion.roles(codigo, nombre, permisos)
        VALUES ('administrador_identidades', 'Administrador de identidades', CAST(:permisos AS jsonb))
        ON CONFLICT (codigo) DO NOTHING""").bindparams(permisos=json.dumps(PERMISOS_ADMIN))
    )
    op.execute("""UPDATE autenticacion.roles SET permisos = permisos || '["usuarios:leer","identidad:auditar"]'::jsonb
        WHERE codigo = 'auditor_forense'""")


def downgrade():
    # Evitar borrar el rol asignado a cuentas vigentes por un downgrade accidental.
    op.execute("""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM autenticacion.usuarios u JOIN autenticacion.roles r ON r.id=u.rol_id
                   WHERE r.codigo='administrador_identidades')
        THEN RAISE EXCEPTION 'Reasignar administradores de identidad antes de downgrade'; END IF;
    END $$""")
    op.execute("DELETE FROM autenticacion.roles WHERE codigo='administrador_identidades'")
    op.execute("""UPDATE autenticacion.roles SET permisos = permisos - 'usuarios:leer' - 'identidad:auditar'
        WHERE codigo='auditor_forense'""")
    op.drop_table("limites_acceso", schema="autenticacion")
    op.drop_table("eventos_identidad", schema="autenticacion")
    op.execute("DROP FUNCTION autenticacion.proteger_eventos_identidad()")
    op.drop_table("tokens_accion", schema="autenticacion")
    op.drop_table("sesiones_usuario", schema="autenticacion")
    op.drop_index("uq_usuarios_correo_normalizado", table_name="usuarios", schema="autenticacion")
    op.drop_column("usuarios", "correo_verificado_en", schema="autenticacion")
