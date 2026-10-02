"""Impedir que borrar la cabecera elimine respuestas ciudadanas en cascada."""

from alembic import op

revision = "0033_conservar_respuestas"
down_revision = "0032_integridad_formularios"
branch_labels = None
depends_on = None
ESQUEMA = "participacion_ciudadana"
ANTERIOR = "respuestas_formulario_formulario_id_fkey"
NUEVA = "fk_respuestas_formulario_formulario_id_formularios_consulta"


def upgrade():
    op.drop_constraint(op.f(ANTERIOR), "respuestas_formulario", schema=ESQUEMA, type_="foreignkey")
    op.create_foreign_key(
        op.f(NUEVA),
        "respuestas_formulario",
        "formularios_consulta",
        ["formulario_id"],
        ["id"],
        source_schema=ESQUEMA,
        referent_schema=ESQUEMA,
        ondelete="RESTRICT",
    )


def downgrade():
    op.drop_constraint(op.f(NUEVA), "respuestas_formulario", schema=ESQUEMA, type_="foreignkey")
    op.create_foreign_key(
        op.f(ANTERIOR),
        "respuestas_formulario",
        "formularios_consulta",
        ["formulario_id"],
        ["id"],
        source_schema=ESQUEMA,
        referent_schema=ESQUEMA,
        ondelete="CASCADE",
    )
