"""Persistencia editorial para noticias institucionales.

Revision ID: 0037_noticias_institucionales
Revises: 0036_restituir_mediciones
Create Date: 2026-10-04
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0037_noticias_institucionales"
down_revision = "0036_restituir_mediciones"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS comunicacion")
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = permisos || '["contenido:leer"]'::jsonb
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades', 'auditor_forense')
          AND NOT permisos ? 'contenido:leer'
        """
    )
    op.create_table(
        "noticias",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=250), nullable=False),
        sa.Column("titulo", sa.String(length=250), nullable=False),
        sa.Column("resumen", sa.Text(), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("imagen_portada", sa.Text(), nullable=True),
        sa.Column(
            "galeria",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("video_url", sa.String(length=1000), nullable=True),
        sa.Column("categoria", sa.String(length=40), nullable=False),
        sa.Column("autor", sa.String(length=200), nullable=False),
        sa.Column(
            "publicada_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("destacada", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("orden_prioridad", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("estado", sa.String(length=20), server_default="borrador", nullable=False),
        sa.Column(
            "etiquetas",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("estado IN ('publicada', 'borrador', 'archivada')", name="ck_noticias_estado_valido"),
        sa.CheckConstraint(
            "categoria IN ('avance_politica', 'mesa_realizada', 'acuerdo_distrital', 'convocatoria', 'informe', 'logro')",
            name="ck_noticias_categoria_valida",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_noticias"),
        sa.UniqueConstraint("slug", name="uq_noticias_slug"),
        schema="comunicacion",
    )
    op.create_index(
        "idx_noticias_publicacion",
        "noticias",
        ["estado", "destacada", "orden_prioridad", "publicada_en"],
        schema="comunicacion",
    )


def downgrade() -> None:
    op.drop_index("idx_noticias_publicacion", table_name="noticias", schema="comunicacion")
    op.drop_table("noticias", schema="comunicacion")
    op.execute("DROP SCHEMA IF EXISTS comunicacion")
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = permisos - 'contenido:leer'
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades', 'auditor_forense')
        """
    )
