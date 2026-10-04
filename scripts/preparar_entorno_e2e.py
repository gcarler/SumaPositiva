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
import secrets
import sys
import asyncpg
import bcrypt

from pathlib import Path

DB_HOST = os.environ.get("POLIS_DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("POLIS_DB_PORT", "5432"))
DB_USER = os.environ.get("POLIS_DB_USER", "polis")

DB_PASS = os.environ.get("POLIS_DB_PASS") or os.environ.get("PGPASSWORD")
if not DB_PASS:
    env_file = Path(__file__).resolve().parents[1] / "backend" / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("POLIS_DATABASE_URL="):
                try:
                    from urllib.parse import urlparse
                    raw_url = line.split("=", 1)[1].strip()
                    # normalizar esquema para urlparse
                    parsed = urlparse(raw_url.replace("+asyncpg", ""))
                    if parsed.password:
                        DB_PASS = parsed.password
                        break
                except Exception:
                    pass

if not DB_PASS:
    raise RuntimeError("Se requiere POLIS_DB_PASS o PGPASSWORD configurada para preparar el entorno E2E.")

TARGET_DB = os.environ.get("POLIS_E2E_DB_NAME", "polis_test_e2e")
TEMPLATE_DB = os.environ.get("POLIS_TEMPLATE_DB_NAME", "polis_test")


async def preparar_bd_y_usuarios():
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
            raise RuntimeError("Roles requeridos no encontrados en la base de datos clonada.")

        # Generar credenciales dinámicas no versionadas
        pass_autoridad = f"Auto_{secrets.token_hex(6)}*!"
        pass_auditor = f"Audi_{secrets.token_hex(6)}*!"

        hash_autoridad = bcrypt.hashpw(pass_autoridad.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        hash_auditor = bcrypt.hashpw(pass_auditor.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        correo_autoridad = "test_e2e_autoridad@cartagena.gov.co"
        correo_auditor = "test_e2e_auditor@cartagena.gov.co"

        # Insertar / actualizar usuario autoridad_distrital
        await conn.execute("""
            INSERT INTO autenticacion.usuarios (
                correo, hash_contrasena, rol_id, nivel_identidad,
                nombres, apellidos, activo, correo_verificado_en
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (lower(correo)) DO UPDATE 
            SET hash_contrasena = EXCLUDED.hash_contrasena,
                rol_id = EXCLUDED.rol_id,
                activo = true;
        """, correo_autoridad, hash_autoridad, role_map["autoridad_distrital"], "verificada", "Autoridad", "E2E", True)

        # Insertar / actualizar usuario auditor_forense
        await conn.execute("""
            INSERT INTO autenticacion.usuarios (
                correo, hash_contrasena, rol_id, nivel_identidad,
                nombres, apellidos, activo, correo_verificado_en
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (lower(correo)) DO UPDATE 
            SET hash_contrasena = EXCLUDED.hash_contrasena,
                rol_id = EXCLUDED.rol_id,
                activo = true;
        """, correo_auditor, hash_auditor, role_map["auditor_forense"], "verificada", "Auditor", "E2E", True)

        # Normalizar códigos de líneas existentes para respetar patrón DNP (^LE-[0-9]{2,}$)
        await conn.execute("""
            UPDATE motor_politicas.lineas_estrategicas
            SET codigo = 'LE-01'
            WHERE codigo !~ '^LE-[0-9]{2,}$';
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
        }

        # Imprimir JSON a stdout para consumo del runner E2E
        print(json.dumps(resultado))
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(preparar_bd_y_usuarios())
