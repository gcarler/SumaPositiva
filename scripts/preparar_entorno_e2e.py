#!/usr/bin/env python3
"""
Prepara el entorno aislado de base de datos para pruebas E2E (AUD-09).
- Clona la estructura de 'polis_test' hacia 'polis_test_e2e'.
- Genera contraseñas dinámicas y no versionadas en tiempo de ejecución.
- Siembra usuarios de prueba (autoridad_distrital y auditor_forense).
- Devuelve las credenciales en formato JSON a stdout.
"""

import asyncio
import json
import os
import re
import secrets

import asyncpg
import bcrypt

DB_HOST = os.environ.get("POLIS_DB_HOST", "")
DB_PORT = int(os.environ.get("POLIS_DB_PORT", "0"))
DB_USER = os.environ.get("POLIS_DB_USER", "")

DB_PASS = os.environ.get("POLIS_DB_PASS") or os.environ.get("PGPASSWORD")

TARGET_DB = os.environ.get("POLIS_E2E_DB_NAME", "")
TEMPLATE_DB = os.environ.get("POLIS_TEMPLATE_DB_NAME", "")


def validar_destinos_e2e(host, puerto, usuario, destino, plantilla, password):
    """Rechaza destinos ajenos al laboratorio antes de abrir una conexión."""
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("E2E requiere un host local")
    if not 1024 <= puerto <= 65535 or puerto == 5432:
        raise ValueError("E2E requiere un puerto PostgreSQL de laboratorio")
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", usuario):
        raise ValueError("Rol E2E inválido")
    for nombre in (destino, plantilla):
        if not re.fullmatch(r"polis_test[a-z0-9_]*", nombre) or len(nombre) > 63:
            raise ValueError("Origen y destino deben ser bases exclusivas polis_test*")
    if destino == plantilla:
        raise ValueError("La plantilla debe ser distinta del destino")
    if not password:
        raise ValueError("Se requieren credenciales explícitas de laboratorio")


async def preparar_bd_y_usuarios():
    validar_destinos_e2e(DB_HOST, DB_PORT, DB_USER, TARGET_DB, TEMPLATE_DB, DB_PASS)
    # 1. Conexión de administración a postgres para recrear BD aislada
    admin_conn = await asyncpg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database="postgres",
    )
    try:
        # Terminar conexiones previas a la base objetivo si existieran
        await admin_conn.execute(f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{TARGET_DB}' AND pid <> pg_backend_pid();
        """)
        await admin_conn.execute(f"DROP DATABASE IF EXISTS {TARGET_DB};")
        await admin_conn.execute(
            f"CREATE DATABASE {TARGET_DB} WITH TEMPLATE {TEMPLATE_DB} OWNER {DB_USER};"
        )
    finally:
        await admin_conn.close()

    # 2. Conexión a la base aislada recién clonada
    conn = await asyncpg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=TARGET_DB,
    )
    try:
        # Obtener IDs de los roles
        roles = await conn.fetch("SELECT id, codigo FROM autenticacion.roles")
        role_map = {r["codigo"]: r["id"] for r in roles}

        if "autoridad_distrital" not in role_map or "auditor_forense" not in role_map:
            raise RuntimeError(
                "Roles requeridos no encontrados en la base de datos clonada."
            )

        # Generar credenciales dinámicas no versionadas
        pass_autoridad = f"Auto_{secrets.token_hex(6)}*!"
        pass_auditor = f"Audi_{secrets.token_hex(6)}*!"
        pass_admin = f"Admin_{secrets.token_hex(6)}*!"

        hash_autoridad = bcrypt.hashpw(
            pass_autoridad.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        hash_auditor = bcrypt.hashpw(
            pass_auditor.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        hash_admin = bcrypt.hashpw(pass_admin.encode("utf-8"), bcrypt.gensalt()).decode(
            "utf-8"
        )

        correo_autoridad = "test_e2e_autoridad@cartagena.gov.co"
        correo_auditor = "test_e2e_auditor@cartagena.gov.co"
        correo_admin = "test_e2e_admin@cartagena.gov.co"

        # Insertar / actualizar usuario autoridad_distrital
        await conn.execute(
            """
            INSERT INTO autenticacion.usuarios (
                correo, hash_contrasena, rol_id, nivel_identidad,
                nombres, apellidos, activo, correo_verificado_en
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (lower(correo)) DO UPDATE 
            SET hash_contrasena = EXCLUDED.hash_contrasena,
                rol_id = EXCLUDED.rol_id,
                activo = true;
        """,
            correo_autoridad,
            hash_autoridad,
            role_map["autoridad_distrital"],
            "verificada",
            "Autoridad",
            "E2E",
            True,
        )

        # Insertar / actualizar usuario auditor_forense
        await conn.execute(
            """
            INSERT INTO autenticacion.usuarios (
                correo, hash_contrasena, rol_id, nivel_identidad,
                nombres, apellidos, activo, correo_verificado_en
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (lower(correo)) DO UPDATE 
            SET hash_contrasena = EXCLUDED.hash_contrasena,
                rol_id = EXCLUDED.rol_id,
                activo = true;
        """,
            correo_auditor,
            hash_auditor,
            role_map["auditor_forense"],
            "verificada",
            "Auditor",
            "E2E",
            True,
        )

        # Insertar / actualizar usuario administrador_identidades
        if "administrador_identidades" in role_map:
            await conn.execute(
                """
                INSERT INTO autenticacion.usuarios (
                    correo, hash_contrasena, rol_id, nivel_identidad,
                    nombres, apellidos, activo, correo_verificado_en
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (lower(correo)) DO UPDATE 
                SET hash_contrasena = EXCLUDED.hash_contrasena,
                    rol_id = EXCLUDED.rol_id,
                    activo = true;
            """,
                correo_admin,
                hash_admin,
                role_map["administrador_identidades"],
                "verificada",
                "Administrador",
                "E2E",
                True,
            )

        # Normalizar códigos de líneas existentes para respetar patrón DNP (^LE-[0-9]{2,}$)
        await conn.execute("""
            UPDATE motor_politicas.lineas_estrategicas
            SET codigo = 'LE-01'
            WHERE codigo !~ '^LE-[0-9]{2,}$';
        """)

        # Asegurar que la línea canónica de modo barrio (01a0f61b-6252-73d5-b035-7671ed9cf089) exista para participación ciudadana
        fase_id = await conn.fetchval(
            "SELECT id FROM motor_politicas.fases_politica LIMIT 1;"
        )
        dim_id = await conn.fetchval(
            "SELECT id FROM motor_politicas.dimensiones_seguridad_humana LIMIT 1;"
        )
        if fase_id:
            await conn.execute(
                """
                INSERT INTO motor_politicas.lineas_estrategicas (
                    id, fase_id, dimension_id, codigo, titulo, descripcion,
                    costo_estimado, fuentes_financiacion, entidad_lider, orden, activa, metadatos,
                    creado_en, actualizado_en
                ) VALUES (
                    '01a0f61b-6252-73d5-b035-7671ed9cf089'::uuid,
                    $1, $2, 'LE-99', 'Línea Canónica Modo Barrio E2E', 'Línea estratégica canónica para participación ciudadana territorial en modo barrio.',
                    1000000, ARRAY['FONSET'], 'Secretaría del Interior', 99, true, '{}'::jsonb,
                    NOW(), NOW()
                ) ON CONFLICT (id) DO NOTHING;
            """,
                fase_id,
                dim_id,
            )

        # Asegurar al menos una mesa canónica para flujos E2E
        mesas_count = await conn.fetchval("SELECT count(*) FROM mesas_trabajo.mesas;")
        if mesas_count == 0:
            linea_id = await conn.fetchval("""
                SELECT id FROM motor_politicas.lineas_estrategicas
                WHERE codigo = 'LE-01'
                LIMIT 1;
            """)
            if not linea_id:
                linea_id = await conn.fetchval(
                    "SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1;"
                )
            await conn.execute(
                """
                INSERT INTO mesas_trabajo.mesas (
                    id, mesa_padre_id, ruta_jerarquica, tipo_mesa,
                    codigo_oficial, shortcode_ciudadano, nombre, slug,
                    lugar_nombre, fecha, horario, aforo_maximo,
                    total_asistentes, estado, modalidad, linea_id,
                    metadatos, creado_en, actualizado_en
                ) VALUES (
                    '01a0f5fe-0001-7000-8000-000000000001'::uuid,
                    NULL,
                    'csh.mt.canonica'::ltree,
                    'TERRITORIAL',
                    'MT-CAN-01',
                    'MTCAN01',
                    'Mesa Territorial Canónica E2E',
                    'mesa-territorial-canonica-e2e',
                    'Centro Cultural Cartagena',
                    '2026-10-15',
                    '08:00 - 12:00',
                    50,
                    25,
                    'PROGRAMADA',
                    'PRESENCIAL',
                    $1,
                    '{"acuerdos": "Acuerdos iniciales de plenaria ciudadana para seguridad y convivencia."}'::jsonb,
                    NOW(),
                    NOW()
                ) ON CONFLICT (codigo_oficial) DO NOTHING;
            """,
                linea_id,
            )

        # Asegurar al menos una propuesta de prueba publicada para flujo de devolución motivada C-150
        propuestas_count = await conn.fetchval(
            "SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas WHERE estado = 'publicado';"
        )
        if propuestas_count == 0:
            linea_id = await conn.fetchval("""
                SELECT id FROM motor_politicas.lineas_estrategicas
                WHERE codigo = 'LE-01'
                LIMIT 1;
            """)
            if not linea_id:
                linea_id = await conn.fetchval(
                    "SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1;"
                )
            dimension_id = await conn.fetchval(
                "SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'personal' LIMIT 1;"
            )
            await conn.execute(
                """
                INSERT INTO participacion_ciudadana.propuestas_ciudadanas (
                    id, linea_id, dimension_id, tipo_aporte, titulo,
                    descripcion, autor_nombre, es_anonimo, metadata_enfoque,
                    archivos_adjuntos, apoyos_contador, estado, activo,
                    metadatos, creado_en, actualizado_en
                ) VALUES (
                    '01a0f5fe-0002-7000-8000-000000000001'::uuid,
                    $1,
                    $2,
                    'propuesta',
                    'Aporte Ciudadano para Devolución Motivada E2E',
                    'Propuesta comunitaria para fortalecimiento del alumbrado y vigilancia en corredores escolares.',
                    'Líder Comunitario E2E',
                    false,
                    '{}'::jsonb,
                    '[]'::jsonb,
                    0,
                    'publicado',
                    true,
                    '{"publicado": true}'::jsonb,
                    NOW(),
                    NOW()
                ) ON CONFLICT (id) DO NOTHING;
            """,
                linea_id,
                dimension_id,
            )

        # Fixtures sintéticos propios: una plantilla vacía no hereda datos de
        # operación. Los recorridos deben poder probar persistencia igualmente.
        await conn.execute("""
            INSERT INTO seguimiento.compromisos_pas
                (codigo, nombre, descripcion, entidad_responsable, linea_estrategica_codigo,
                 alternativa_mga_codigo, indicador_asociado_codigo, meta_cuatrienal_descripcion,
                 meta_cuatrienal_valor, unidad_medida, avance_cuatrienal_valor, porcentaje_cumplimiento,
                 metadatos)
            VALUES ('PAS-E2E-303', 'Compromiso sintético E2E', 'Fixture exclusivo del laboratorio',
                    'Entidad ficticia E2E', 'LE-99', 'ALT-E2E-303', 'IND-E2E-303',
                    'Meta de prueba: 100 unidades', 100, 'unidades', 0, 0, '{"fixture_e2e":true}')
            ON CONFLICT (codigo) DO NOTHING
        """)
        await conn.execute("""
            INSERT INTO indicadores.fichas_tecnicas_indicadores
                (codigo, nombre, tipo_indicador, definicion, metodo_calculo, unidad_medida,
                 periodicidad, linea_base_valor, linea_base_anio, meta_cuatrienio,
                 fuente_datos, responsable_reporte, metadatos)
            VALUES ('IND-E2E-303', 'Indicador sintético E2E', 'producto',
                    'Fixture exclusivo del laboratorio', 'Conteo de unidades sintéticas', 'unidades',
                    'anual', 0, 2026, 10000, 'Fuente sintética E2E', 'Entidad ficticia E2E',
                    '{"fixture_e2e":true}')
            ON CONFLICT (codigo) DO NOTHING
        """)
        await conn.execute("""
            INSERT INTO geodatos.territorios (codigo, nombre, tipo_territorio, metadatos)
            VALUES ('E2E-303-TER', 'Territorio sintético E2E', 'distrito', '{"fixture_e2e":true}')
            ON CONFLICT (codigo) DO NOTHING
        """)
        await conn.execute("""
            INSERT INTO geodatos.indicadores_territorio
                (territorio_id, dimension_id, codigo_indicador, nombre_indicador,
                 valor, unidad_medida, nivel_riesgo, anio_corte, fuente_datos, metadatos)
            SELECT t.id, d.id, 'E2E-303-OBS', 'Observación sintética E2E',
                   1, 'unidad sintética', 'sin_evaluar', 2026, 'Fuente sintética E2E',
                   '{"fixture_e2e":true,"estado_validacion":"fixture_sintetico_aislado"}'
            FROM geodatos.territorios t
            CROSS JOIN motor_politicas.dimensiones_seguridad_humana d
            WHERE t.codigo='E2E-303-TER' AND d.codigo='personal'
            ON CONFLICT (territorio_id, codigo_indicador, anio_corte) DO NOTHING
        """)

        resultado = {
            "autoridad": {
                "correo": correo_autoridad,
                "contrasena": pass_autoridad,
                "rol": "autoridad_distrital",
            },
            "auditor": {
                "correo": correo_auditor,
                "contrasena": pass_auditor,
                "rol": "auditor_forense",
            },
            "admin": {
                "correo": correo_admin,
                "contrasena": pass_admin,
                "rol": "administrador_identidades",
            },
        }

        # Imprimir JSON a stdout para consumo del runner E2E
        print(json.dumps(resultado))
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(preparar_bd_y_usuarios())
