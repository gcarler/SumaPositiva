"""Tablas de DMU nivel 3 del DEA 4 niveles al lineage Alembic con modelos.

Revision ID: 0082_tablas_dea_dmu_nivel3
Revises: 0081_proteger_correspondencias
Create Date: 2026-10-22

Contexto:
Las tres tablas del padrón DMU nivel 3 del DEA 4 niveles
(`seguimiento.pdd_dmu_ieo_oficiales`, `seguimiento.pdd_dmu_ese_centros_salud`,
`seguimiento.pdd_fuentes_financiacion_dmu`) se materializaron perezosamente
fuera del lineage Alembic desde
`scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py` (deuda documentada
en bridge/09 §6 y plan_remediacion). El motor `pdt_dea_4niveles_cartagena.py`
y las puertas del orquestador leen el dictamen del DEA desde ellas: deben
ser versionadas, no creadas a mano.

En `bd_csh` las tablas ya existen CON DATOS (patrón de tabla operacional): el
upgrade es un DDL idempotente `IF NOT EXISTS` y el downgrade NO las borra
(para no destruir datos reales); su retiro futuro requiere decisión
explícita del equipo EDD/EAF. La unificación modelo↔esquema se comprueba
con `alembic check`.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0082_tablas_dea_dmu_nivel3"
down_revision: str | Sequence[str] | None = "0081_proteger_correspondencias"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.pdd_dmu_ieo_oficiales (
            dmu_codigo VARCHAR(32) PRIMARY KEY,
            nombre_ieo VARCHAR(220) NOT NULL,
            localidad_codigo VARCHAR(32) NOT NULL,
            ucg_codigo VARCHAR(32) NOT NULL,
            presupuesto_total_cop DOUBLE PRECISION NOT NULL,
            recursos_sgr_pae_cop DOUBLE PRECISION NOT NULL,
            planta_docente DOUBLE PRECISION NOT NULL,
            numero_aulas DOUBLE PRECISION NOT NULL,
            cupos_matricula_simat DOUBLE PRECISION NOT NULL,
            estudiantes_beneficiados_pae DOUBLE PRECISION NOT NULL,
            docentes_capacitados DOUBLE PRECISION NOT NULL,
            puntaje_saber11 DOUBLE PRECISION NOT NULL,
            categoria_saber11 VARCHAR(16) NOT NULL,
            reduccion_desercion_pp DOUBLE PRECISION NOT NULL,
            cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.pdd_dmu_ese_centros_salud (
            dmu_codigo VARCHAR(32) PRIMARY KEY,
            nombre_centro_salud VARCHAR(220) NOT NULL,
            tipo_establecimiento VARCHAR(64) NOT NULL,
            localidad_codigo VARCHAR(32) NOT NULL,
            ucg_codigo VARCHAR(32) NOT NULL,
            presupuesto_ese_cop DOUBLE PRECISION NOT NULL,
            inversion_pts_cop DOUBLE PRECISION NOT NULL,
            personal_medico_asistencial DOUBLE PRECISION NOT NULL,
            consultorios_camas DOUBLE PRECISION NOT NULL,
            personas_vulnerables_capacitadas DOUBLE PRECISION NOT NULL,
            valoraciones_discapacidad DOUBLE PRECISION NOT NULL,
            cobertura_vacunacion_pct DOUBLE PRECISION NOT NULL,
            atencion_preferencial_eapb_pct DOUBLE PRECISION NOT NULL,
            cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS seguimiento.pdd_fuentes_financiacion_dmu (
            dmu_codigo VARCHAR(64) PRIMARY KEY,
            nombre_dmu VARCHAR(220) NOT NULL,
            nivel_dmu VARCHAR(64) NOT NULL,
            sgr_regalias_cop DOUBLE PRECISION NOT NULL,
            credito_publico_cop DOUBLE PRECISION NOT NULL,
            sgp_transferencias_cop DOUBLE PRECISION NOT NULL,
            icld_recursos_propios_cop DOUBLE PRECISION NOT NULL,
            cofinanciacion_nacion_cop DOUBLE PRECISION NOT NULL,
            total_fuentes_cop DOUBLE PRECISION NOT NULL
        )
        """
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.pdd_dmu_ieo_oficiales IS 'DMU IEO oficiales del DEA 4 niveles (padrón censal).'"
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.pdd_dmu_ese_centros_salud IS "
        "'DMU centros de salud de la ESE del DEA 4 niveles (padrón censal).'"
    )
    op.execute(
        "COMMENT ON TABLE seguimiento.pdd_fuentes_financiacion_dmu IS "
        "'DMU con desagregación de fuentes de financiación (DEA 4 niveles).'"
    )


def downgrade() -> None:
    # No se borran: en bd_csh llevan datos reales del padrón DMU materializado
    # por el script operacional antes de entrar al lineage. Su retiro requiere
    # decisión explícita del equipo EDD/EAF (mirar bridge/09 §6).
    pass
