"""Expand the rural and insular council census to the 15 official corregimientos.

Revision ID: 0066_quince_mesas_corregimientos
Revises: 0065_catalogo_planes_desarrollo
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0066_quince_mesas_corregimientos"
down_revision: str | Sequence[str] | None = "0065_catalogo_planes_desarrollo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Upsert on the canonical business key so the migration can also repair a
    # partially seeded installation without creating duplicate council tables.
    op.get_bind().exec_driver_sql(
        """
        INSERT INTO mesas_trabajo.mesas (
            id, codigo_oficial, shortcode_ciudadano, ruta_jerarquica, slug,
            nombre, tipo_mesa, territorio_id, lugar_nombre, modalidad, fecha,
            horario, estado, aforo_maximo, dimension_id, metadatos
        ) VALUES
        (
            '01a0f5fe-86e3-7312-9001-000000000012', 'MR-ISL-12', 'MR112',
            'csh.mr.baru'::ltree, 'mesa-corregimiento-baru', 'Mesa Insular Barú (Pueblo)',
            'RURAL_INSULAR', (SELECT id FROM geodatos.territorios WHERE codigo = 'INS-BARU' LIMIT 1),
            'Institución Educativa Luis Felipe Cabrera de Barú', 'HIBRIDA_DIGITAL',
            DATE '2026-10-24', '8:30 am - 11:30 am', 'PROGRAMADA', 65,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'ambiental' LIMIT 1),
            '{"coordenadas":{"latitud":10.1456,"longitud":-75.6761},"enfoque_poblacional":"ETNICO"}'::jsonb
        ),
        (
            '01a0f5fe-86e3-7313-9001-000000000013', 'MR-ISL-13', 'MR113',
            'csh.mr.ararca'::ltree, 'mesa-corregimiento-ararca', 'Mesa Insular Ararca (Barú)',
            'RURAL_INSULAR', (SELECT id FROM geodatos.territorios WHERE codigo = 'INS-BARU' LIMIT 1),
            'Institución Educativa de Ararca', 'HIBRIDA_DIGITAL', DATE '2026-10-24',
            '1:30 pm - 4:30 pm', 'PROGRAMADA', 55,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1),
            '{"coordenadas":{"latitud":10.273,"longitud":-75.524},"enfoque_poblacional":"ETNICO"}'::jsonb
        ),
        (
            '01a0f5fe-86e3-7314-9001-000000000014', 'MR-ISL-14', 'MR114',
            'csh.mr.canodeloro'::ltree, 'mesa-cano-del-oro', 'Mesa Insular Caño del Oro',
            'RURAL_INSULAR', (SELECT id FROM geodatos.territorios WHERE codigo = 'INS-TIERRABOMBA' LIMIT 1),
            'Institución Educativa Caño del Oro', 'HIBRIDA_DIGITAL', DATE '2026-10-25',
            '8:30 am - 11:30 am', 'PROGRAMADA', 55,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'salud' LIMIT 1),
            '{"coordenadas":{"latitud":10.342,"longitud":-75.541},"enfoque_poblacional":"ETNICO"}'::jsonb
        ),
        (
            '01a0f5fe-86e3-7315-9001-000000000015', 'MR-RUR-15', 'MR115',
            'csh.mr.pontezuela'::ltree, 'mesa-pontezuela', 'Mesa Rural Pontezuela',
            'RURAL_INSULAR', (SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2' LIMIT 1),
            'Institución Educativa de Pontezuela', 'HIBRIDA_DIGITAL', DATE '2026-10-25',
            '1:30 pm - 4:30 pm', 'PROGRAMADA', 60,
            (SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'alimentaria' LIMIT 1),
            '{"coordenadas":{"latitud":10.525,"longitud":-75.402},"enfoque_poblacional":"ETNICO"}'::jsonb
        )
        ON CONFLICT (codigo_oficial) DO UPDATE SET
            id = EXCLUDED.id,
            shortcode_ciudadano = EXCLUDED.shortcode_ciudadano,
            ruta_jerarquica = EXCLUDED.ruta_jerarquica,
            slug = EXCLUDED.slug,
            nombre = EXCLUDED.nombre,
            tipo_mesa = EXCLUDED.tipo_mesa,
            territorio_id = EXCLUDED.territorio_id,
            lugar_nombre = EXCLUDED.lugar_nombre,
            modalidad = EXCLUDED.modalidad,
            fecha = EXCLUDED.fecha,
            horario = EXCLUDED.horario,
            estado = EXCLUDED.estado,
            aforo_maximo = EXCLUDED.aforo_maximo,
            dimension_id = EXCLUDED.dimension_id,
            metadatos = EXCLUDED.metadatos,
            actualizado_en = clock_timestamp()
        """
    )

    op.get_bind().exec_driver_sql("DELETE FROM mesas_trabajo.agendas WHERE id = 'mr-007b'")
    op.get_bind().exec_driver_sql(
        """
        UPDATE mesas_trabajo.agendas SET
            mesa_id = '01a0f5fe-86e3-7312-9001-000000000012',
            nombre = 'Mesa Insular — Barú', territorio = 'Corregimiento de Barú',
            lugar = 'Institución Educativa Luis Felipe Cabrera de Barú',
            fecha = DATE '2026-10-24', hora_inicio = '08:30', hora_fin = '11:30',
            dimensiones_onu = '["Seguridad Ambiental", "Seguridad Económica", "Seguridad Comunitaria", "Seguridad Alimentaria"]'::jsonb,
            responsable = 'Consejo Comunitario de Barú',
            observaciones = 'Mesa con protocolo diferencial étnico — Comunidad afrodescendiente. Requiere Consulta Previa conforme Convenio 169 OIT y Sentencia SU-123/18. Énfasis en sostenibilidad costera y gobernanza de playas.',
            actualizado_en = clock_timestamp()
        WHERE id = 'mr-012'
        """
    )
    op.get_bind().exec_driver_sql(
        """
        INSERT INTO mesas_trabajo.agendas (
            id, tipo, nombre, territorio, lugar, fecha, hora_inicio, hora_fin,
            estado, dimensiones_onu, responsable, observaciones, mesa_id
        ) VALUES
        (
            'mr-013', 'rural_insular', 'Mesa Insular — Ararca', 'Corregimiento de Ararca',
            'Institución Educativa de Ararca', DATE '2026-10-24', '13:30', '16:30', 'programada',
            '["Seguridad Comunitaria", "Seguridad Ambiental", "Seguridad Económica"]'::jsonb,
            'Consejo Comunitario de Ararca',
            'Comunidad afrodescendiente de la península de Barú — énfasis en transición ambiental, manglares, saneamiento básico y empleo juvenil local.',
            '01a0f5fe-86e3-7313-9001-000000000013'
        ),
        (
            'mr-014', 'rural_insular', 'Mesa Insular — Caño del Oro', 'Corregimiento Caño del Oro',
            'Institución Educativa Caño del Oro', DATE '2026-10-25', '08:30', '11:30', 'programada',
            '["Seguridad de la Salud", "Seguridad Ambiental", "Seguridad Comunitaria"]'::jsonb,
            'Consejo Comunitario de Caño del Oro',
            'Requiere transporte marítimo desde el Hospital de Bocagrande / Muelle de La Bodeguita — énfasis en patrimonio hospitalario insular, defensa costera y agua potable.',
            '01a0f5fe-86e3-7314-9001-000000000014'
        ),
        (
            'mr-015', 'rural_insular', 'Mesa Rural — Pontezuela', 'Corregimiento de Pontezuela',
            'Institución Educativa de Pontezuela', DATE '2026-10-25', '13:30', '16:30', 'programada',
            '["Seguridad Alimentaria", "Seguridad Comunitaria", "Seguridad Personal"]'::jsonb,
            'Consejo Comunitario y JAC de Pontezuela',
            'Corregimiento de la Zona Norte (Localidad 2) — énfasis en defensa del territorio ancestral frente a la expansión inmobiliaria, alcantarillado y juventud.',
            '01a0f5fe-86e3-7315-9001-000000000015'
        )
        ON CONFLICT (id) DO UPDATE SET
            tipo = EXCLUDED.tipo, nombre = EXCLUDED.nombre, territorio = EXCLUDED.territorio,
            lugar = EXCLUDED.lugar, fecha = EXCLUDED.fecha, hora_inicio = EXCLUDED.hora_inicio,
            hora_fin = EXCLUDED.hora_fin, estado = EXCLUDED.estado,
            dimensiones_onu = EXCLUDED.dimensiones_onu, responsable = EXCLUDED.responsable,
            observaciones = EXCLUDED.observaciones, mesa_id = EXCLUDED.mesa_id,
            actualizado_en = clock_timestamp()
        """
    )

    # Once the canonical locality mesa is present, fail the migration rather
    # than recording an incomplete census as successful.
    op.get_bind().exec_driver_sql(
        """
        DO $$
        DECLARE mesa_count integer;
        DECLARE agenda_count integer;
        DECLARE linked_count integer;
        DECLARE distinct_linked_count integer;
        BEGIN
            IF EXISTS (SELECT 1 FROM mesas_trabajo.mesas WHERE codigo_oficial = 'MT-L01-01') THEN
                SELECT count(*) INTO mesa_count FROM mesas_trabajo.mesas;
                SELECT count(*) INTO agenda_count FROM mesas_trabajo.agendas;
                SELECT count(mesa_id), count(DISTINCT mesa_id)
                    INTO linked_count, distinct_linked_count FROM mesas_trabajo.agendas;
                IF mesa_count <> 37 OR agenda_count <> 38 OR linked_count <> 37
                    OR distinct_linked_count <> 37
                    OR (SELECT count(*) FROM mesas_trabajo.agendas WHERE id = 'pc-001' AND mesa_id IS NULL) <> 1 THEN
                    RAISE EXCEPTION 'Censo MESAS-12 inválido: mesas %, agendas %, vinculadas %, distintas %',
                        mesa_count, agenda_count, linked_count, distinct_linked_count;
                END IF;
                IF (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'TERRITORIAL') <> 3
                    OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'RURAL_INSULAR') <> 15
                    OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'POBLACIONAL') <> 8
                    OR (SELECT count(*) FROM mesas_trabajo.mesas WHERE tipo_mesa = 'SECTORIAL') <> 11 THEN
                    RAISE EXCEPTION 'Distribución de tipos de mesa no coincide con el censo 3/15/8/11';
                END IF;
            END IF;
        END $$
        """
    )


def downgrade() -> None:
    op.get_bind().exec_driver_sql("DELETE FROM mesas_trabajo.agendas WHERE id IN ('mr-013', 'mr-014', 'mr-015')")
    op.get_bind().exec_driver_sql(
        """
        UPDATE mesas_trabajo.agendas SET
            mesa_id = '01a0f5fe-86e2-7ebb-90f1-7268653ea79d',
            nombre = 'Mesa Rural e Insular — Barú', territorio = 'Corregimiento de Barú',
            lugar = 'Institución Educativa de Barú', fecha = DATE '2026-10-24',
            hora_inicio = '09:00', hora_fin = '12:00',
            dimensiones_onu = '["Seguridad Ambiental", "Seguridad Económica", "Seguridad Comunitaria"]'::jsonb,
            responsable = NULL,
            observaciones = 'Comunidad étnica afrodescendiente — énfasis en sostenibilidad costera y consulta comunitaria',
            actualizado_en = clock_timestamp()
        WHERE id = 'mr-012'
        """
    )
    op.get_bind().exec_driver_sql(
        """
        INSERT INTO mesas_trabajo.agendas (
            id, mesa_id, tipo, nombre, territorio, lugar, fecha, hora_inicio, hora_fin,
            estado, dimensiones_onu, responsable, observaciones
        ) VALUES (
            'mr-007b', '01a0f5fe-86e2-7ebb-90f1-7268653ea79d', 'rural_insular',
            'Mesa Insular — Barú y Comunidades del Archipiélago', 'Isla de Barú',
            'Institución Educativa de Barú', DATE '2026-10-22', '07:30', '10:00', 'programada',
            '["Seguridad Alimentaria", "Seguridad Ambiental", "Seguridad Comunitaria"]'::jsonb,
            'Consejo Comunitario de Barú',
            'Mesa con protocolo diferencial étnico — Comunidad afrodescendiente. Requiere Consulta Previa conforme Convenio 169 OIT y Sentencia SU-123/18. Coordinar con Consejo Comunitario con anterioridad mínima de 30 días.'
        ) ON CONFLICT (id) DO NOTHING
        """
    )
    op.get_bind().exec_driver_sql(
        """
        DELETE FROM mesas_trabajo.mesas
        WHERE id IN (
            '01a0f5fe-86e3-7312-9001-000000000012',
            '01a0f5fe-86e3-7313-9001-000000000013',
            '01a0f5fe-86e3-7314-9001-000000000014',
            '01a0f5fe-86e3-7315-9001-000000000015'
        )
        """
    )
