"""Módulo de Comunicaciones y Cronograma de Trabajo (Fase de Diagnóstico).

Revision ID: 0051_modulo_tareas_comunicacion
Revises: 0050_lineas_alim_salud_pol
Create Date: 2026-10-06 04:50:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0051_modulo_tareas_comunicacion"
down_revision: str | None = "0050_lineas_alim_salud_pol"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TAREAS_SEEDED = [
    (
        "TC-01",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Sala de Redacción / Secretaría del Interior",
        "Alineación técnica y guiones de entrevistas de diagnóstico",
        "Definición de guiones de diagnóstico: '¿Cuál es el mayor dolor de convivencia en tu barrio?' y '¿Qué le falta a tu comunidad para que los jóvenes crezcan seguros?'. Formatos de consentimiento informado.",
        "Guion oficial de entrevistas, kit de consentimientos informados (Ley 1581) y manual de encuadre fotográfico.",
        "2026-10-06",
        "2026-10-06",
        "en_progreso",
        "Equipo de Comunicaciones y Secretaría del Interior",
        1,
    ),
    (
        "TC-02",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Localidad 1: San Francisco, Canapote y Torices",
        "Jornada de Campo 1: Entorno Urbano y Convivencia",
        "Entrevistas a tenderos, lideresas y jóvenes sobre líneas imaginarias, iluminación pública y caños.",
        "15 fotografías en alta resolución + 3 cápsulas de video (30-45s) con testimonios barriales.",
        "2026-10-07",
        "2026-10-07",
        "pendiente",
        "Equipo Audiovisual y Relator de Campo",
        2,
    ),
    (
        "TC-03",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Localidad 2: Olaya Herrera y El Pozón",
        "Jornada de Campo 2: Seguridad Económica y Social",
        "Entrevistas a madres comunitarias sobre violencia intrafamiliar, cobro de gota a gota y comedores comunitarios.",
        "20 fotografías documentales + 3 testimonios en video + archivo de audio masterizado para cuña radial.",
        "2026-10-08",
        "2026-10-08",
        "pendiente",
        "Equipo Audiovisual y Reportería Social",
        3,
    ),
    (
        "TC-04",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Localidad 3: Nelson Mandela y Membrillal",
        "Jornada de Campo 3: Inclusión y Entornos de Riesgo",
        "Diálogo con líderes de JAC, transportadores informales y recicladores sobre transporte nocturno y pandillas.",
        "15 fotografías de contexto barrial + 3 videos con líderes comunitarios reconocidos.",
        "2026-10-09",
        "2026-10-09",
        "pendiente",
        "Equipo Audiovisual y Enlace Comunal",
        4,
    ),
    (
        "TC-05",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Zona Rural e Insular: Pasacaballos y La Boquilla",
        "Jornada de Campo 4: Enfoque Étnico y Pescadores",
        "Entrevistas a pescadores artesanales y consejos comunitarios sobre la Ciénaga, microtráfico y subsistencia.",
        "20 fotografías de paisaje social y pesca + 2 cápsulas de video con líderes afrodescendientes.",
        "2026-10-10",
        "2026-10-10",
        "pendiente",
        "Equipo Audiovisual y Enlace Étnico",
        5,
    ),
    (
        "TC-06",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Producción Central / Sala de Edición",
        "Curaduría, Selección y Post-producción Audiovisual",
        "Selección de las mejores 50 fotografías del banco distrital; edición de 11 cápsulas de video con subtítulos accesibles e identidad POLIS.",
        "Banco curado de 50 fotografías clasificadas + paquete de videos listo para redes y pauta oficial.",
        "2026-10-11",
        "2026-10-11",
        "pendiente",
        "Editor de Video y Diseñador Gráfico",
        6,
    ),
    (
        "TC-07",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Redes Sociales y Canales Distritales",
        "Lanzamiento de Campaña de Expectativa ('Cartagena habla')",
        "Difusión de las primeras 3 cápsulas teaser ('Cartagena habla') e infografía pedagógica: '¿Qué es el Diagnóstico y por qué tu voz decide?'.",
        "1 carrusel informativo + 2 reels + distribución por listas de difusión de WhatsApp de ediles y JAC.",
        "2026-10-12",
        "2026-10-12",
        "pendiente",
        "Community Manager y Estratega Digital",
        7,
    ),
    (
        "TC-08",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Prensa y Emisoras Locales",
        "Rueda de Medios y Pedagogía de la Plataforma POLIS",
        "Lanzamiento del tutorial en video: 'Cómo registrar problemas en la plataforma POLIS'. Envío de boletín oficial a El Universal, Caracol y RCN.",
        "1 boletín de prensa oficial + tutorial interactivo en video y PDF liviano para WhatsApp.",
        "2026-10-13",
        "2026-10-13",
        "pendiente",
        "Jefe de Prensa y Enlace de Medios",
        8,
    ),
    (
        "TC-09",
        "Etapa 1: Pre-Producción y Banco de Evidencias",
        "Territorio Sede de la Primera Mesa",
        "Activación Territorial de Última Milla (Perifoneo y Volanteo)",
        "Perifoneo en calles aledañas al punto de encuentro; entrega de volantes en tiendas y colegios; recordatorio masivo por WhatsApp.",
        "Registro fotográfico y audiovisual del volanteo y perifoneo preventivo.",
        "2026-10-14",
        "2026-10-14",
        "pendiente",
        "Equipo Territorial de Convocatoria",
        9,
    ),
    (
        "TC-10",
        "Etapa 2: Gran Hito Inaugural",
        "Colegio Mayor / Centro Comunitario Sede Mesa 1",
        "Gran Mesa Inaugural de Diagnóstico con Comunidades",
        "Cobertura en tiempo real, registro audiovisual de plenaria, moderación de submesas, papelógrafo de problemas y firma del acta viva.",
        "Boletín urgente (3pm), galería de 30 fotos (4pm), reel resumen de 60s (6pm) y acta viva de apertura.",
        "2026-10-15",
        "2026-10-15",
        "pendiente",
        "Equipo Completo de Comunicaciones y Facilitación",
        10,
    ),
    (
        "TC-11",
        "Etapa 3: Despliegue Territorial y Temático",
        "Localidad 1: Histórica y Caribe Norte",
        "Ciclo de Mesas Territoriales Localidad 1 (Centro y Norte)",
        "Cobertura de mesas en Centro, Manga, Canapote, Lemaitre y San Francisco. Diagnóstico sobre ESCNNA, microtráfico y convivencia.",
        "2 boletines semanales + galería web + 1 video resumen ('El mapa del dolor: Localidad 1').",
        "2026-10-16",
        "2026-10-23",
        "pendiente",
        "Reportero Asignado Localidad 1",
        11,
    ),
    (
        "TC-12",
        "Etapa 3: Despliegue Territorial y Temático",
        "Localidad 2: De la Virgen y Turística",
        "Ciclo de Mesas Territoriales Localidad 2 (Virgen y Turística)",
        "Mesas en Fredonia, Nuevo Paraíso, La María, Boston y El Pozón. Inundaciones pluviales, pandillismo y desnutrición infantil.",
        "2 boletines de prensa + perifoneo previo + carrusel de cifras ciudadanas.",
        "2026-10-24",
        "2026-10-31",
        "pendiente",
        "Reportero Asignado Localidad 2",
        12,
    ),
    (
        "TC-13",
        "Etapa 3: Despliegue Territorial y Temático",
        "Localidad 3: Industrial y de la Bahía",
        "Ciclo de Mesas Territoriales Localidad 3 (Bahía e Industrial)",
        "Mesas en Nelson Mandela, Socorro, Campanos y Blas de Lezo. Contaminación, desempleo juvenil y seguridad en el transporte.",
        "2 boletines de prensa + 3 cápsulas testimoniales + archivo de papelógrafos.",
        "2026-11-01",
        "2026-11-07",
        "pendiente",
        "Reportero Asignado Localidad 3",
        13,
    ),
    (
        "TC-14",
        "Etapa 3: Despliegue Territorial y Temático",
        "Zona Rural e Insular de Cartagena",
        "Ciclo de Mesas en Zona Rural, Étnica e Insular",
        "Mesas en Barú, Tierrabomba, Islas del Rosario, Pasacaballos y Bayunca. Agua potable, transporte marítimo y titulación colectiva.",
        "Crónica fotográfica con enfoque étnico + 3 videos con autoridades ancestrales afro e insulares.",
        "2026-11-08",
        "2026-11-15",
        "pendiente",
        "Equipo Especial Zona Insular y Étnica",
        14,
    ),
    (
        "TC-15",
        "Etapa 3: Despliegue Territorial y Temático",
        "Mesas Poblacionales Focalizadas y Plataforma POLIS",
        "Mesas Poblacionales y Cierre de Participación Digital",
        "Juventudes (17N), Género/LGBTIQ+ (19N), Niñez (21N), Gremios (24N), Víctimas (26N). Cierre del buzón digital en POLIS el 30N.",
        "5 coberturas temáticas + campaña digital intensiva de cierre de buzón en POLIS.",
        "2026-11-16",
        "2026-11-30",
        "pendiente",
        "Equipo de Comunicaciones y Moderación Digital",
        15,
    ),
    (
        "TC-16",
        "Etapa 4: Sistematización y Devolución",
        "Equipo de Analítica y Comunicaciones",
        "Sistematización de Datos Comunicables y Devolución Preliminar",
        "Consolidación de cifras de POLIS y submesas. Lanzamiento de la campaña 'Ustedes lo dijeron, así diagnosticamos la ciudad' en 7 dimensiones.",
        "Infografía de síntesis 'Radiografía de Cartagena' + 7 carruseles temáticos en redes sociales.",
        "2026-12-01",
        "2026-12-08",
        "pendiente",
        "Estratega de Contenidos y Diseñador Gráfico",
        16,
    ),
    (
        "TC-17",
        "Etapa 4: Sistematización y Devolución",
        "Producción Editorial y Medios de Comunicación",
        "Edición de Cartilla Resumen y Convocatoria a Medios",
        "Diagramación de la cartilla pedagógica ilustrada de 16 páginas en lenguaje sencillo. Envío de kit de prensa para el evento de radicación.",
        "PDF interactivo (alta/baja resolución), artes para imprenta, kit de prensa y video balance de 3 minutos.",
        "2026-12-09",
        "2026-12-14",
        "pendiente",
        "Equipo Editorial y Prensa Distrital",
        17,
    ),
    (
        "TC-18",
        "Etapa 4: Sistematización y Devolución",
        "Alcaldía Mayor / Concejo Distrital / Canales Oficiales",
        "Presentación Oficial y Cierre de la Fase de Diagnóstico",
        "Acto protocolario de entrega del documento de Diagnóstico Integral 2026 ante el Alcalde Mayor, Concejo Distrital y ciudadanía.",
        "Transmisión institucional accesible en vivo (LSC/subtítulos), boletín de prensa final y video memoria histórica.",
        "2026-12-15",
        "2026-12-15",
        "pendiente",
        "Dirección de Comunicaciones de la Alcaldía Mayor",
        18,
    ),
]


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS comunicacion.tareas_comunicacion (
            id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
            codigo VARCHAR(50) NOT NULL,
            etapa VARCHAR(100) NOT NULL,
            territorio VARCHAR(150) NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            descripcion TEXT NOT NULL DEFAULT '',
            entregables TEXT NOT NULL DEFAULT '',
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
            responsable VARCHAR(150) NOT NULL DEFAULT 'Equipo de Comunicaciones',
            orden INTEGER NOT NULL DEFAULT 0,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_tareas_comunicacion_codigo UNIQUE (codigo),
            CONSTRAINT chk_tareas_comunicacion_estado CHECK (
                estado IN ('pendiente', 'en_progreso', 'completada', 'reprogramada')
            )
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tareas_comunicacion_etapa
            ON comunicacion.tareas_comunicacion (etapa);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tareas_comunicacion_estado
            ON comunicacion.tareas_comunicacion (estado);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tareas_comunicacion_fechas
            ON comunicacion.tareas_comunicacion (fecha_inicio, fecha_fin);
        """
    )

    # Insertar tareas iniciales de forma idempotente
    for t in TAREAS_SEEDED:
        (
            codigo,
            etapa,
            territorio,
            titulo,
            descripcion,
            entregables,
            fecha_ini,
            fecha_fin,
            estado,
            responsable,
            orden,
        ) = t
        op.execute(
            sa.text(
                """
                INSERT INTO comunicacion.tareas_comunicacion (
                    codigo, etapa, territorio, titulo, descripcion, entregables,
                    fecha_inicio, fecha_fin, estado, responsable, orden
                ) VALUES (
                    :codigo, :etapa, :territorio, :titulo, :descripcion, :entregables,
                    CAST(:fecha_ini AS DATE), CAST(:fecha_fin AS DATE), :estado, :responsable, :orden
                ) ON CONFLICT (codigo) DO NOTHING;
                """
            ).bindparams(
                codigo=codigo,
                etapa=etapa,
                territorio=territorio,
                titulo=titulo,
                descripcion=descripcion,
                entregables=entregables,
                fecha_ini=fecha_ini,
                fecha_fin=fecha_fin,
                estado=estado,
                responsable=responsable,
                orden=orden,
            )
        )

    # Conceder permisos en autenticacion.roles
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(permisos || '["comunicaciones:leer", "comunicaciones:gestionar"]'::jsonb) AS elem
        )
        WHERE codigo IN ('autoridad_distrital', 'administrador_identidades');
        """
    )
    op.execute(
        """
        UPDATE autenticacion.roles
        SET permisos = (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(permisos || '["comunicaciones:leer"]'::jsonb) AS elem
        )
        WHERE codigo IN ('auditor_forense', 'facilitador_mesa');
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS comunicacion.tareas_comunicacion CASCADE;")
