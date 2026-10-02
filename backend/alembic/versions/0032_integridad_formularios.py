"""Restringir estados y estructuras JSON sin reescribir información existente."""

from alembic import op

revision = "0032_integridad_formularios"
down_revision = "0031_reporte_inseguridad"
branch_labels = None
depends_on = None

REGLAS = (
    ("formularios_consulta", "estado_valido", "estado IN ('BORRADOR', 'PUBLICADO', 'CERRADO')"),
    ("formularios_consulta", "preguntas_array", "jsonb_typeof(esquema_preguntas) = 'array'"),
    (
        "formularios_consulta",
        "documento_objeto",
        "documento_constructor IS NULL OR jsonb_typeof(documento_constructor) = 'object'",
    ),
    ("respuestas_formulario", "datos_objeto", "jsonb_typeof(datos_respuesta) = 'object'"),
    ("respuestas_formulario", "enfoque_objeto", "jsonb_typeof(datos_enfoque) = 'object'"),
    ("respuestas_formulario", "evidencias_array", "jsonb_typeof(evidencias) = 'array'"),
)


def upgrade():
    for tabla, nombre, condicion in REGLAS:
        op.create_check_constraint(
            op.f(f"ck_{tabla}_{nombre}"), tabla, condicion, schema="participacion_ciudadana"
        )


def downgrade():
    for tabla, nombre, _ in reversed(REGLAS):
        op.drop_constraint(
            op.f(f"ck_{tabla}_{nombre}"), tabla, schema="participacion_ciudadana", type_="check"
        )
