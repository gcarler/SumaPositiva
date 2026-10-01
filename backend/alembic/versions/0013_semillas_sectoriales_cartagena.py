"""Semillas Sectoriales Criticas de Cartagena

Revision ID: 0013_semillas_sectoriales_cartagena
Revises: 0012_motor_instrumentos
Create Date: 2026-10-01 08:08:00.000000
"""

from alembic import op

revision = "0013_semillas_sectoriales"
down_revision = "0012_motor_instrumentos"
branch_labels = None
depends_on = None

INSTRUCCIONES_UPGRADE = [
    """
    DO $$
    DECLARE
        v_mesa_loc1 UUID;
        v_mesa_loc2 UUID;
        
        -- Instrumentos IDs
        v_inst_escnna_prob UUID := public.generar_uuid_v7();
        v_inst_escnna_obj UUID := public.generar_uuid_v7();
        
        v_inst_cienaga_prob UUID := public.generar_uuid_v7();
        v_inst_cienaga_obj UUID := public.generar_uuid_v7();
        
        v_inst_conviv_prob UUID := public.generar_uuid_v7();
        v_inst_conviv_obj UUID := public.generar_uuid_v7();

        -- Nodos temporales para jerarquías
        v_n_central UUID;
        v_n_c1 UUID;
        v_n_c2 UUID;
        v_n_e1 UUID;
        v_n_e2 UUID;

        v_no_central UUID;
        v_no_m1 UUID;
        v_no_m2 UUID;
        v_no_f1 UUID;
        v_no_f2 UUID;
    BEGIN
        -- Obtener mesas
        SELECT id INTO v_mesa_loc1 FROM mesas_trabajo.mesas WHERE codigo_oficial = 'MT-L01-01' LIMIT 1;
        SELECT id INTO v_mesa_loc2 FROM mesas_trabajo.mesas WHERE codigo_oficial = 'MT-L02-01' LIMIT 1;

        -- ====================================================================
        -- 1. PLANTILLA: PREVENCIÓN ESCNNA CENTRO HISTÓRICO
        -- ====================================================================
        IF NOT EXISTS (SELECT 1 FROM motor_instrumentos.instrumentos WHERE nombre LIKE 'Prevención de ESCNNA%') THEN
            -- Árbol de Problemas ESCNNA
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, metadatos
            ) VALUES (
                v_inst_escnna_prob, v_mesa_loc1, 'ARBOL_PROBLEMAS',
                'Prevención de ESCNNA en el Centro Histórico y Zona Turística',
                'Diagnóstico analítico participativo sobre factores de riesgo, vulnerabilidad y explotación sexual comercial de NNA en Cartagena (Ley 679/01, Ley 1098/06, CONPES 4040).',
                'CONVERTIDO',
                '{"sector": "PROTECCION_NNA", "localidad": "Localidad 1", "plantilla_oficial": true}'::jsonb
            );

            -- Nodos Problemas ESCNNA
            v_n_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_central, v_inst_escnna_prob, 'PROBLEMA_CENTRAL', 'CENTRAL', 0, 0,
                    'Persistencia de redes de Explotación Sexual Comercial de Niños, Niñas y Adolescentes (ESCNNA) en el Centro Histórico y zonas insulares de Cartagena');

            v_n_c1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c1, v_inst_escnna_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 1,
                    'Insuficiencia de inspección, vigilancia y control en hostales, bares y plataformas turísticas');

            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (public.generar_uuid_v7(), v_inst_escnna_prob, v_n_c1, 'CAUSA_INDIRECTA', 'CAUSA', 2, 1,
                    'Déficit de articulación interinstitucional entre Policía de Turismo, Migración Colombia y Comisarías de Familia');

            v_n_c2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c2, v_inst_escnna_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 2,
                    'Condiciones de vulnerabilidad extrema, pobreza y deserción escolar en barrios periféricos expulsores');

            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (public.generar_uuid_v7(), v_inst_escnna_prob, v_n_c2, 'CAUSA_INDIRECTA', 'CAUSA', 2, 1,
                    'Ausencia de programas barriales de cuidado integral y permanencia educativa en sectores vulnerables');

            v_n_e1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e1, v_inst_escnna_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 1,
                    'Vulneración sistemática de derechos fundamentales y secuelas psicofísicas graves en la niñez cartagenera');

            v_n_e2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e2, v_inst_escnna_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 2,
                    'Deterioro de la seguridad ciudadana y estigmatización internacional del destino turístico distrital');

            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (public.generar_uuid_v7(), v_inst_escnna_prob, v_n_e2, 'EFECTO_INDIRECTO', 'EFECTO', 2, 1,
                    'Fractura del tejido social y perpetuación de ciclos intergeneracionales de exclusión');

            -- Árbol de Objetivos ESCNNA (MGA DNP)
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, instrumento_origen_id, metadatos
            ) VALUES (
                v_inst_escnna_obj, v_mesa_loc1, 'ARBOL_OBJETIVOS',
                'Árbol de Objetivos: Prevención y Erradicación de ESCNNA en Cartagena',
                'Plan de objetivos para la protección integral, rutas seguras y cero tolerancia a la ESCNNA en Cartagena.',
                'VALIDADO', v_inst_escnna_prob,
                '{"sector": "PROTECCION_NNA", "localidad": "Localidad 1", "plantilla_oficial": true}'::jsonb
            );

            v_no_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_central, v_inst_escnna_obj, 'OBJETIVO_CENTRAL', 'CENTRAL', 0, 0,
                    'Erradicar las redes de Explotación Sexual Comercial de NNA y consolidar entornos protectores en el Centro Histórico y zonas insulares', v_n_central);

            v_no_m1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m1, v_inst_escnna_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 1,
                    'Fortalecer los operativos de inspección, vigilancia y control con tecnología en prestadores turísticos', v_n_c1);

            v_no_m2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m2, v_inst_escnna_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 2,
                    'Implementar rutas de inclusión socioeconómica, becas y permanencia escolar en barrios de origen', v_n_c2);

            v_no_f1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f1, v_inst_escnna_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 1,
                    'Garantizar el pleno desarrollo psicofísico y restitución inmediata de derechos de la infancia', v_n_e1);

            v_no_f2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f2, v_inst_escnna_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 2,
                    'Posicionar a Cartagena como destino de turismo ético, familiar, cultural y seguro', v_n_e2);
        END IF;

        -- ====================================================================
        -- 2. PLANTILLA: SANEAMIENTO CIÉNAGA DE LA VIRGEN
        -- ====================================================================
        IF NOT EXISTS (SELECT 1 FROM motor_instrumentos.instrumentos WHERE nombre LIKE 'Recuperación Ecológica y Saneamiento Integral de la Ciénaga%') THEN
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, metadatos
            ) VALUES (
                v_inst_cienaga_prob, v_mesa_loc2, 'ARBOL_PROBLEMAS',
                'Recuperación Ecológica y Saneamiento Integral de la Ciénaga de la Virgen',
                'Diagnóstico sobre contaminación hídrica, rellenos ilegales de manglar y adaptación al cambio climático en la Ciénaga de la Virgen (POMCA, Ley 1931/18, Ley 99/93).',
                'CONVERTIDO',
                '{"sector": "AMBIENTAL_HIDRICO", "localidad": "Localidad 2", "plantilla_oficial": true}'::jsonb
            );

            v_n_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_central, v_inst_cienaga_prob, 'PROBLEMA_CENTRAL', 'CENTRAL', 0, 0,
                    'Grave degradación ambiental, pérdida de biodiversidad y contaminación hídrica crítica en la Ciénaga de la Virgen y caños perimetrales');

            v_n_c1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c1, v_inst_cienaga_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 1,
                    'Vertimiento continuo de aguas residuales domésticas e industriales sin tratamiento previo a la cuenca');

            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (public.generar_uuid_v7(), v_inst_cienaga_prob, v_n_c1, 'CAUSA_INDIRECTA', 'CAUSA', 2, 1,
                    'Déficit histórico en la cobertura de alcantarillado sanitario en asentamientos ribereños de la Vía Perimetral');

            v_n_c2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c2, v_inst_cienaga_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 2,
                    'Proliferación de rellenos ilegales de mangle y disposición inadecuada de escombros en la ronda hídrica');

            v_n_e1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e1, v_inst_cienaga_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 1,
                    'Muerte masiva de peces y colapso económico de comunidades de pescadores artesanales tradicionales');

            v_n_e2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e2, v_inst_cienaga_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 2,
                    'Incremento de enfermedades diarreicas y respiratorias en niños y adultos mayores de sectores ribereños');

            -- Árbol de Objetivos Ciénaga
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, instrumento_origen_id, metadatos
            ) VALUES (
                v_inst_cienaga_obj, v_mesa_loc2, 'ARBOL_OBJETIVOS',
                'Árbol de Objetivos: Saneamiento y Restauración de la Ciénaga de la Virgen',
                'Plan de objetivos para saneamiento ambiental y recuperación del cuerpo de agua en la Localidad 2.',
                'VALIDADO', v_inst_cienaga_prob,
                '{"sector": "AMBIENTAL_HIDRICO", "localidad": "Localidad 2", "plantilla_oficial": true}'::jsonb
            );

            v_no_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_central, v_inst_cienaga_obj, 'OBJETIVO_CENTRAL', 'CENTRAL', 0, 0,
                    'Recuperar integralmente el equilibrio ecológico, calidad del agua y biodiversidad de la Ciénaga de la Virgen', v_n_central);

            v_no_m1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m1, v_inst_cienaga_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 1,
                    'Construir y optimizar sistemas de alcantarillado y tratamiento de aguas servidas en la margen oriental', v_n_c1);

            v_no_m2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m2, v_inst_cienaga_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 2,
                    'Reforestar el cinturón de manglar y erradicar los puntos críticos de vertimiento de escombros', v_n_c2);

            v_no_f1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f1, v_inst_cienaga_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 1,
                    'Reactivar la pesca artesanal sostenible y la soberanía alimentaria de las familias cenagueras', v_n_e1);

            v_no_f2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f2, v_inst_cienaga_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 2,
                    'Reducir los brotes epidemiológicos y elevar la calidad de vida en los barrios surorientales', v_n_e2);
        END IF;

        -- ====================================================================
        -- 3. PLANTILLA: CONVIVENCIA Y SEGURIDAD HUMANA LOCALIDAD 2
        -- ====================================================================
        IF NOT EXISTS (SELECT 1 FROM motor_instrumentos.instrumentos WHERE nombre LIKE 'Convivencia Comunitaria y Desarme Social%') THEN
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, metadatos
            ) VALUES (
                v_inst_conviv_prob, v_mesa_loc2, 'ARBOL_PROBLEMAS',
                'Convivencia Comunitaria y Desarme Social en la Localidad 2',
                'Diagnóstico participativo sobre líneas invisibles, violencia juvenil y resolución dialógica de conflictos en Olaya Herrera, Pozón y Nelson Mandela.',
                'CONVERTIDO',
                '{"sector": "SEGURIDAD_HUMANA", "localidad": "Localidad 2", "plantilla_oficial": true}'::jsonb
            );

            v_n_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_central, v_inst_conviv_prob, 'PROBLEMA_CENTRAL', 'CENTRAL', 0, 0,
                    'Altos índices de violencia interpersonal, homicidios juveniles y confrontación territorial en barrios de la Localidad 2');

            v_n_c1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c1, v_inst_conviv_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 1,
                    'Existencia de fronteras invisibles y pugnas entre pandillas por control microterritorial');

            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (public.generar_uuid_v7(), v_inst_conviv_prob, v_n_c1, 'CAUSA_INDIRECTA', 'CAUSA', 2, 1,
                    'Escasas oportunidades laborales, ausencia de centros juveniles y falta de capacitación técnica para jóvenes');

            v_n_c2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_c2, v_inst_conviv_prob, v_n_central, 'CAUSA_DIRECTA', 'CAUSA', 1, 2,
                    'Deterioro de la infraestructura comunitaria, polideportivos y alumbrado público en puntos críticos');

            v_n_e1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e1, v_inst_conviv_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 1,
                    'Confinamiento barrial y temor generalizado de la comunidad para transitar en horarios nocturnos');

            v_n_e2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido)
            VALUES (v_n_e2, v_inst_conviv_prob, v_n_central, 'EFECTO_DIRECTO', 'EFECTO', 1, 2,
                    'Alta deserción escolar por intimidaciones en trayectos a colegios distritales');

            -- Árbol de Objetivos Convivencia
            INSERT INTO motor_instrumentos.instrumentos (
                id, mesa_id, tipo_instrumento, nombre, descripcion, estado, instrumento_origen_id, metadatos
            ) VALUES (
                v_inst_conviv_obj, v_mesa_loc2, 'ARBOL_OBJETIVOS',
                'Árbol de Objetivos: Convivencia y Seguridad Humana en la Localidad 2',
                'Plan de objetivos para la resolución dialógica de conflictos, desarme y oportunidades juveniles en la Localidad 2.',
                'VALIDADO', v_inst_conviv_prob,
                '{"sector": "SEGURIDAD_HUMANA", "localidad": "Localidad 2", "plantilla_oficial": true}'::jsonb
            );

            v_no_central := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_central, v_inst_conviv_obj, 'OBJETIVO_CENTRAL', 'CENTRAL', 0, 0,
                    'Consolidar la convivencia pacífica, reducir a cero los homicidios de jóvenes y desmontar las fronteras invisibles', v_n_central);

            v_no_m1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m1, v_inst_conviv_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 1,
                    'Desarrollar programas de mediación comunitaria, formación en oficios y empleabilidad de choque para jóvenes en riesgo', v_n_c1);

            v_no_m2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_m2, v_inst_conviv_obj, v_no_central, 'MEDIO_DIRECTO', 'MEDIO', 1, 2,
                    'Modernizar el alumbrado público con tecnología LED y revitalizar los polideportivos barriales', v_n_c2);

            v_no_f1 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f1, v_inst_conviv_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 1,
                    'Recuperar la libre movilidad ciudadana y la tranquilidad comunitaria 24/7 en los barrios', v_n_e1);

            v_no_f2 := public.generar_uuid_v7();
            INSERT INTO motor_instrumentos.nodos_instrumento (id, instrumento_id, nodo_padre_id, tipo_nodo, tipo_relacion, nivel, orden, contenido, nodo_origen_id)
            VALUES (v_no_f2, v_inst_conviv_obj, v_no_central, 'FIN_DIRECTO', 'FIN', 1, 2,
                    'Garantizar trayectorias educativas completas y fortalecer la confianza en la convivencia ciudadana', v_n_e2);
        END IF;
    END $$;
    """,
]

INSTRUCCIONES_DOWNGRADE = [
    """
    DELETE FROM motor_instrumentos.instrumentos 
    WHERE nombre IN (
        'Prevención de ESCNNA en el Centro Histórico y Zona Turística',
        'Árbol de Objetivos: Prevención y Erradicación de ESCNNA en Cartagena',
        'Recuperación Ecológica y Saneamiento Integral de la Ciénaga de la Virgen',
        'Árbol de Objetivos: Saneamiento y Restauración de la Ciénaga de la Virgen',
        'Convivencia Comunitaria y Desarme Social en la Localidad 2',
        'Árbol de Objetivos: Convivencia y Seguridad Humana en la Localidad 2'
    );
    """,
]


def upgrade() -> None:
    for instruccion in INSTRUCCIONES_UPGRADE:
        op.execute(instruccion)


def downgrade() -> None:
    for instruccion in INSTRUCCIONES_DOWNGRADE:
        op.execute(instruccion)
