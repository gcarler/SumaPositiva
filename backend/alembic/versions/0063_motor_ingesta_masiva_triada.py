"""Persistencia de lotes binarios de Planes de Acción y registros Triada.

Revision ID: 0063_motor_ingesta_masiva_triada
Revises: 0062_motor_plan_accion_dnp
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0063_motor_ingesta_masiva_triada"
down_revision: str | Sequence[str] | None = "0062_motor_plan_accion_dnp"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lotes_ingesta_planes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("codigo_lote", sa.String(40), nullable=False),
        sa.Column("origen", sa.String(30), nullable=False),
        sa.Column("total_archivos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archivos_exitosos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("archivos_con_error", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_hojas_procesadas", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_registros_normalizados", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "resumen_motores",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_lotes_ingesta_planes"),
        sa.UniqueConstraint("codigo_lote", name="lotes_ingesta_planes_codigo_lote_key"),
        schema="seguimiento",
    )
    op.create_table(
        "archivos_plan_ingeridos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("lote_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre_archivo", sa.String(300), nullable=False),
        sa.Column("formato_extension", sa.String(10), nullable=False),
        sa.Column("hash_sha256", sa.String(64), nullable=False),
        sa.Column("perfil_detectado", sa.String(48), nullable=False),
        sa.Column("confianza_deteccion", sa.Numeric(5, 4), nullable=False),
        sa.Column("vigencia", sa.Integer(), nullable=True),
        sa.Column("corte_periodo", sa.String(20), nullable=False),
        sa.Column("entidad_normalizada", sa.String(180), nullable=True),
        sa.Column(
            "hojas_analizadas",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "mapeo_columnas",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("filas_extraidas", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "metadatos",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["lote_id"],
            ["seguimiento.lotes_ingesta_planes.id"],
            ondelete="CASCADE",
            name="fk_tri_file_batch",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_archivos_plan_ingeridos"),
        schema="seguimiento",
    )
    op.create_index(
        "idx_archivos_plan_hash", "archivos_plan_ingeridos", ["hash_sha256"], schema="seguimiento"
    )
    op.create_index(
        "idx_archivos_plan_entidad",
        "archivos_plan_ingeridos",
        ["entidad_normalizada"],
        schema="seguimiento",
    )
    op.create_table(
        "registros_triada_normalizados",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("public.generar_uuid_v7()"),
            nullable=False,
        ),
        sa.Column("archivo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lote_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("motor_destino", sa.String(30), nullable=False),
        sa.Column("vigencia", sa.Integer(), nullable=True),
        sa.Column("corte_periodo", sa.String(20), nullable=False),
        sa.Column("entidad_normalizada", sa.String(180), nullable=True),
        sa.Column("linea_estrategica", sa.Text(), nullable=True),
        sa.Column("codigo_meta_pdd", sa.Text(), nullable=True),
        sa.Column("codigo_bpim", sa.String(100), nullable=True),
        sa.Column("indicador", sa.Text(), nullable=True),
        sa.Column("descripcion_actividad", sa.Text(), nullable=True),
        sa.Column("verbo_fuerte_dnp", sa.Boolean(), nullable=True),
        sa.Column("verbo_detectado", sa.String(50), nullable=True),
        sa.Column("meta_programada_anual", sa.Numeric(18, 4), nullable=True),
        sa.Column("meta_ejecutada_anual", sa.Numeric(18, 4), nullable=True),
        sa.Column("avance_t1", sa.Numeric(8, 3), nullable=True),
        sa.Column("avance_t2", sa.Numeric(8, 3), nullable=True),
        sa.Column("avance_t3", sa.Numeric(8, 3), nullable=True),
        sa.Column("avance_t4", sa.Numeric(8, 3), nullable=True),
        sa.Column("avance_fisico_pct", sa.Numeric(8, 3), nullable=True),
        sa.Column("avance_estrategico_pct", sa.Numeric(8, 3), nullable=True),
        sa.Column("apropiacion_definitiva_cop", sa.Numeric(20, 2), nullable=True),
        sa.Column("cdp_cop", sa.Numeric(20, 2), nullable=True),
        sa.Column("compromisos_rp_cop", sa.Numeric(20, 2), nullable=True),
        sa.Column("obligaciones_cop", sa.Numeric(20, 2), nullable=True),
        sa.Column("pagos_tesoreria_cop", sa.Numeric(20, 2), nullable=True),
        sa.Column("hoja_origen", sa.String(120), nullable=True),
        sa.Column("fila_origen_num", sa.Integer(), nullable=True),
        sa.Column(
            "datos_origen",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["archivo_id"],
            ["seguimiento.archivos_plan_ingeridos.id"],
            ondelete="CASCADE",
            name="fk_tri_record_file",
        ),
        sa.ForeignKeyConstraint(
            ["lote_id"],
            ["seguimiento.lotes_ingesta_planes.id"],
            ondelete="CASCADE",
            name="fk_tri_record_batch",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_registros_triada_normalizados"),
        schema="seguimiento",
    )
    for nombre, campo in (
        ("idx_registros_triada_motor", "motor_destino"),
        ("idx_registros_triada_vigencia", "vigencia"),
        ("idx_registros_triada_entidad", "entidad_normalizada"),
        ("idx_registros_triada_meta", "codigo_meta_pdd"),
        ("idx_registros_triada_bpim", "codigo_bpim"),
    ):
        op.create_index(nombre, "registros_triada_normalizados", [campo], schema="seguimiento")


def downgrade() -> None:
    for nombre in (
        "idx_registros_triada_bpim",
        "idx_registros_triada_meta",
        "idx_registros_triada_entidad",
        "idx_registros_triada_vigencia",
        "idx_registros_triada_motor",
    ):
        op.drop_index(nombre, table_name="registros_triada_normalizados", schema="seguimiento")
    op.drop_table("registros_triada_normalizados", schema="seguimiento")
    op.drop_index(
        "idx_archivos_plan_entidad", table_name="archivos_plan_ingeridos", schema="seguimiento"
    )
    op.drop_index(
        "idx_archivos_plan_hash", table_name="archivos_plan_ingeridos", schema="seguimiento"
    )
    op.drop_table("archivos_plan_ingeridos", schema="seguimiento")
    op.drop_table("lotes_ingesta_planes", schema="seguimiento")
