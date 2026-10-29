"""Vinculación explícita de agendas territoriales con mesas canónicas (H-05 / EDIT-13).

Revision ID: 0045_agendas_mesa_id
Revises: 0044_lineas_estrategicas
Create Date: 2026-10-05 04:30:00.000000

Contexto:
En cumplimiento del dictamen EAF para H-05 (EDIT-13, Opción 1), se unifican las fuentes
mesas_trabajo.mesas y mesas_trabajo.agendas agregando la columna mesa_id a agendas con FK
a mesas. Se aplica vinculación determinista por tabla explícita validando exactamente
35 agendas vinculadas a 33 mesas canónicas distintas (relación 1:N en Barú / MR-ISL-07)
y dejando pc-001 (Plenaria de Cierre institucional) en mesa_id = NULL.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0045_agendas_mesa_id"
down_revision: str | None = "0044_lineas_estrategicas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Agregar columna mesa_id nullable con FK a mesas_trabajo.mesas
    op.add_column(
        "agendas",
        sa.Column("mesa_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="mesas_trabajo",
    )
    op.create_foreign_key(
        "fk_agendas_mesa_id",
        "agendas",
        "mesas",
        ["mesa_id"],
        ["id"],
        source_schema="mesas_trabajo",
        referent_schema="mesas_trabajo",
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_agendas_mesa_id",
        "agendas",
        ["mesa_id"],
        schema="mesas_trabajo",
    )

    # 2. Vinculación estricta por tabla explícita y validación forense con RAISE EXCEPTION
    op.execute("""
        DO $$
        DECLARE
            v_mesas_existentes integer;
            v_filas_afectadas integer;
            v_total_agendas integer;
            v_total_mesas_con_agenda integer;
            v_mapeo RECORD;
        BEGIN
            SELECT count(*) INTO v_mesas_existentes
            FROM mesas_trabajo.mesas
            WHERE codigo_oficial = 'MT-L01-01';

            IF v_mesas_existentes = 0 THEN
                RAISE NOTICE 'Mesas canónicas no encontradas; omitiendo vinculación de datos en base de pruebas.';
                RETURN;
            END IF;

            CREATE TEMP TABLE tmp_mapeo_agendas (
                agenda_id VARCHAR(50) PRIMARY KEY,
                codigo_oficial VARCHAR(100) NOT NULL
            ) ON COMMIT DROP;

            INSERT INTO tmp_mapeo_agendas (agenda_id, codigo_oficial) VALUES
                ('mt-001', 'MT-L01-01'),
                ('mt-002', 'MT-L02-01'),
                ('mt-003', 'MT-L03-01'),
                ('mp-001', 'MP-POB-01'),
                ('mp-002', 'MP-POB-02'),
                ('mp-003', 'MP-POB-03'),
                ('mp-004', 'MP-POB-04'),
                ('mp-005', 'MP-POB-05'),
                ('mp-006', 'MP-POB-06'),
                ('mp-007', 'MP-POB-07'),
                ('mp-008', 'MP-ETN-08'),
                ('ms-001', 'MS-SEC-01'),
                ('ms-002', 'MS-SEC-02'),
                ('ms-003', 'MS-SEC-03'),
                ('ms-004', 'MS-SEC-04'),
                ('ms-005', 'MS-SEC-05'),
                ('ms-006', 'MS-SEC-06'),
                ('ms-007', 'MS-SEC-07'),
                ('ms-008', 'MS-SEC-08'),
                ('ms-009', 'MS-SEC-09'),
                ('ms-010', 'MS-SEC-10'),
                ('ms-011', 'MS-SEC-11'),
                ('mr-001', 'MR-RUR-01'),
                ('mr-002', 'MR-RUR-02'),
                ('mr-003', 'MR-RUR-03'),
                ('mr-004', 'MR-RUR-04'),
                ('mr-005', 'MR-RUR-05'),
                ('mr-006', 'MR-RUR-06'),
                ('mr-007', 'MR-ISL-07'),
                ('mr-007b', 'MR-ISL-07'),
                ('mr-008', 'MR-ISL-08'),
                ('mr-009', 'MR-ISL-09'),
                ('mr-010', 'MR-ISL-10'),
                ('mr-011', 'MR-ISL-11'),
                ('mr-012', 'MR-ISL-07');

            FOR v_mapeo IN SELECT agenda_id, codigo_oficial FROM tmp_mapeo_agendas LOOP
                UPDATE mesas_trabajo.agendas a
                SET mesa_id = m.id
                FROM mesas_trabajo.mesas m
                WHERE a.id = v_mapeo.agenda_id
                  AND m.codigo_oficial = v_mapeo.codigo_oficial;

                GET DIAGNOSTICS v_filas_afectadas = ROW_COUNT;
                IF v_filas_afectadas <> 1 THEN
                    RAISE EXCEPTION 'Fallo al vincular agenda % con mesa %: se actualizaron % filas (esperada: 1)',
                        v_mapeo.agenda_id, v_mapeo.codigo_oficial, v_filas_afectadas;
                END IF;
            END LOOP;

            -- pc-001 debe permanecer explícitamente en NULL (Plenaria Distrital)
            UPDATE mesas_trabajo.agendas
            SET mesa_id = NULL
            WHERE id = 'pc-001';

            GET DIAGNOSTICS v_filas_afectadas = ROW_COUNT;
            IF v_filas_afectadas <> 1 THEN
                RAISE EXCEPTION 'Fallo al verificar agenda plenaria pc-001: filas afectadas % (esperada: 1)', v_filas_afectadas;
            END IF;

            -- Validar exactamente 35 agendas vinculadas
            SELECT count(*) INTO v_total_agendas
            FROM mesas_trabajo.agendas
            WHERE mesa_id IS NOT NULL;

            IF v_total_agendas <> 35 THEN
                RAISE EXCEPTION 'Conteo total de agendas vinculadas inválido: % (esperadas: 35)', v_total_agendas;
            END IF;

            -- Validar exactamente 33 mesas canónicas cubiertas
            SELECT count(DISTINCT mesa_id) INTO v_total_mesas_con_agenda
            FROM mesas_trabajo.agendas
            WHERE mesa_id IS NOT NULL;

            IF v_total_mesas_con_agenda <> 33 THEN
                RAISE EXCEPTION 'Conteo de mesas canónicas cubiertas inválido: % (esperadas: 33)', v_total_mesas_con_agenda;
            END IF;

            RAISE NOTICE 'VINCULACIÓN EXITOSA: 35 agendas vinculadas a 33 mesas canónicas; pc-001 en NULL.';
        END $$;
    """)


def downgrade() -> None:
    op.drop_index("idx_agendas_mesa_id", table_name="agendas", schema="mesas_trabajo")
    op.drop_constraint("fk_agendas_mesa_id", "agendas", schema="mesas_trabajo", type_="foreignkey")
    op.drop_column("agendas", "mesa_id", schema="mesas_trabajo")
