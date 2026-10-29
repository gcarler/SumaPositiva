"""Catálogo versionado de fuentes, contratos, artefactos y lotes.

Revision ID: 0075_catalogo_fuentes
Revises: 0074_idempotencia_thread
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0075_catalogo_fuentes"
down_revision: str | Sequence[str] | None = "0074_idempotencia_thread"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "fuentes_datos",
        sa.Column("clave", sa.String(120), primary_key=True),
        sa.Column("custodios", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("dataset_ids", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("licencia", sa.String(120), nullable=False, server_default="por_verificar"),
        sa.Column("estado_promocion", sa.String(32), nullable=False, server_default="pendiente_validacion"),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "estado_promocion IN ('pendiente_validacion', 'aprobada', 'bloqueada')", name="ck_fuentes_datos_estado"
        ),
        schema="seguimiento",
    )
    op.create_table(
        "fuentes_versiones",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "fuente_clave",
            sa.String(120),
            sa.ForeignKey("seguimiento.fuentes_datos.clave", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("filas", sa.Integer, nullable=False),
        sa.Column("ultima_extraccion_en", sa.DateTime(timezone=True)),
        sa.Column("metadatos", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("fuente_clave", "sha256", name="uq_fuentes_versiones_clave_sha"),
        schema="seguimiento",
    )
    op.create_index(
        "ix_fuentes_versiones_fuente", "fuentes_versiones", ["fuente_clave", "creado_en"], schema="seguimiento"
    )
    op.create_table(
        "artefactos_fuente",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("ruta", sa.String(1024), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("bytes", sa.BigInteger, nullable=False),
        sa.Column("formato", sa.String(40), nullable=False),
        sa.Column("rol", sa.String(40), nullable=False),
        sa.Column("fuente_clave", sa.String(120), sa.ForeignKey("seguimiento.fuentes_datos.clave")),
        sa.Column("version_id", sa.BigInteger, sa.ForeignKey("seguimiento.fuentes_versiones.id")),
        sa.Column("licencia", sa.String(120), nullable=False, server_default="por_verificar"),
        sa.Column("estado_calidad", sa.String(32), nullable=False, server_default="pendiente_asignacion"),
        sa.Column("registrado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ruta", "sha256", name="uq_artefactos_fuente_ruta_sha"),
        sa.CheckConstraint(
            "estado_calidad IN ('sin_evaluacion', 'pendiente_asignacion', 'cuarentena', 'validado')",
            name="ck_artefactos_fuente_estado",
        ),
        schema="seguimiento",
    )
    op.create_index("ix_artefactos_fuente_sha", "artefactos_fuente", ["sha256"], schema="seguimiento")
    op.create_table(
        "contratos_fuente",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "fuente_clave",
            sa.String(120),
            sa.ForeignKey("seguimiento.fuentes_datos.clave", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("esquema", JSONB, nullable=False),
        sa.Column("activo", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("registrado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("fuente_clave", "version", name="uq_contratos_fuente_clave_version"),
        schema="seguimiento",
    )
    op.create_table(
        "lotes_fuente",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "version_id",
            sa.BigInteger,
            sa.ForeignKey("seguimiento.fuentes_versiones.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("corrida_id", sa.BigInteger, sa.ForeignKey("seguimiento.corridas_pipeline.id")),
        sa.Column("estado", sa.String(16), nullable=False, server_default="capturado"),
        sa.Column("manifiesto_sha256", sa.String(64), nullable=False),
        sa.Column("resultado_calidad", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "estado IN ('capturado', 'verde', 'ambar', 'rojo', 'cuarentena')", name="ck_lotes_fuente_estado"
        ),
        schema="seguimiento",
    )
    op.create_index("ix_lotes_fuente_version_estado", "lotes_fuente", ["version_id", "estado"], schema="seguimiento")


def downgrade() -> None:
    op.drop_index("ix_lotes_fuente_version_estado", table_name="lotes_fuente", schema="seguimiento")
    op.drop_table("lotes_fuente", schema="seguimiento")
    op.drop_table("contratos_fuente", schema="seguimiento")
    op.drop_index("ix_artefactos_fuente_sha", table_name="artefactos_fuente", schema="seguimiento")
    op.drop_table("artefactos_fuente", schema="seguimiento")
    op.drop_index("ix_fuentes_versiones_fuente", table_name="fuentes_versiones", schema="seguimiento")
    op.drop_table("fuentes_versiones", schema="seguimiento")
    op.drop_table("fuentes_datos", schema="seguimiento")
