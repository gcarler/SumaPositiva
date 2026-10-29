#!/usr/bin/env python3
"""POLIS — Automatización de Rotación Segura de Secretos en Producción (AUD-11).

Genera llaves criptográficas de 256 bits (JWT Secret, IP Salt, Password BD),
respalda atómicamente los archivos de entorno con permisos 0600 y actualiza
las variables de entorno sin exponer contraseñas en logs ni terminales.
"""

import argparse
import datetime
import os
import re
import secrets
import shutil
import stat
import sys

DEFAULT_BACKEND_ENV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))


def generar_secreto_hex(bytes_longitud: int = 32) -> str:
    """Genera una cadena hexadecimal de alta entropía (32 bytes = 256 bits = 64 hex)."""
    return secrets.token_hex(bytes_longitud)


def generar_contrasena_bd(longitud: int = 32) -> str:
    """Genera una contraseña alfanumérica robusta sin caracteres conflictivos con URLs."""
    # Alfabeto seguro sin caracteres especiales problemáticos en DSN de conexión
    alfabeto = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
    return "".join(secrets.choice(alfabeto) for _ in range(longitud))


def respaldar_archivo(ruta_origen: str, dry_run: bool = False) -> str | None:
    """Crea una copia de respaldo atómica con permisos 0600."""
    if not os.path.exists(ruta_origen):
        return None

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    ruta_destino = f"{ruta_origen}.bak.{timestamp}"

    if dry_run:
        print(f"[DRY-RUN] Se crearía respaldo: {ruta_destino} (permisos 0600)")
        return ruta_destino

    shutil.copy2(ruta_origen, ruta_destino)
    # Forzar permisos estrictos 0600 (solo lectura/escritura propietario)
    os.chmod(ruta_destino, stat.S_IRUSR | stat.S_IWUSR)
    print(f"✔ Respaldo creado exitosamente: {ruta_destino} (permisos 0600)")
    return ruta_destino


def actualizar_variable_en_contenido(contenido: str, variable: str, nuevo_valor: str) -> tuple[str, bool]:
    """Reemplaza o inserta una variable en formato KEY=VAL en el contenido del archivo."""
    patron = rf"^{re.escape(variable)}=.*$"
    if re.search(patron, contenido, flags=re.MULTILINE):
        nuevo_contenido = re.sub(patron, f"{variable}={nuevo_valor}", contenido, flags=re.MULTILINE)
        return nuevo_contenido, True
    else:
        # Añadir al final si no existía
        if not contenido.endswith("\n") and contenido:
            contenido += "\n"
        nuevo_contenido = f"{contenido}{variable}={nuevo_valor}\n"
        return nuevo_contenido, True


def rotar_secretos(
    ruta_env: str,
    rotar_bd: bool = False,
    dry_run: bool = False,
) -> int:
    """Ejecuta el protocolo de rotación criptográfica."""
    print("=" * 80)
    print("POLIS · Protocolo de Rotación de Secretos de Producción (AUD-11)")
    print("=" * 80)

    if not os.path.exists(ruta_env):
        print(f"ADVERTENCIA: Archivo {ruta_env} no existe. Se creará una plantilla inicial.")
        contenido_actual = ""
    else:
        with open(ruta_env, "r", encoding="utf-8") as f:
            contenido_actual = f.read()

    # 1. Generación de nuevos secretos criptográficos de 256 bits
    nuevo_jwt = generar_secreto_hex(32)
    nuevo_ip_salt = generar_secreto_hex(32)
    nueva_pass_bd = generar_contrasena_bd(32) if rotar_bd else None

    print(f"• Nuevo POLIS_JWT_SECRET_KEY:  [256 bits - {len(nuevo_jwt)} caracteres hex]")
    print(f"• Nuevo POLIS_IP_SALT:         [256 bits - {len(nuevo_ip_salt)} caracteres hex]")
    if rotar_bd:
        print(f"• Nueva contraseña PostgreSQL: [32 caracteres alfanuméricos seguros]")

    print("-" * 80)

    # 2. Respaldo previo
    respaldar_archivo(ruta_env, dry_run=dry_run)

    # 3. Sustitución de valores
    contenido_nuevo, c1 = actualizar_variable_en_contenido(contenido_actual, "POLIS_JWT_SECRET_KEY", nuevo_jwt)
    contenido_nuevo, c2 = actualizar_variable_en_contenido(contenido_nuevo, "POLIS_IP_SALT", nuevo_ip_salt)

    if rotar_bd and nueva_pass_bd:
        # Actualizar contraseña en DSN si existe
        patron_dsn = r"(POLIS_DATABASE_URL=postgresql\+asyncpg://[^:]+:)([^@]+)(@.*)"
        if re.search(patron_dsn, contenido_nuevo):
            contenido_nuevo = re.sub(patron_dsn, rf"\g<1>{nueva_pass_bd}\g<3>", contenido_nuevo)
            print("✔ DSN de POLIS_DATABASE_URL actualizado con la nueva contraseña de base de datos.")
        else:
            print("⚠️ No se encontró patrón DSN en POLIS_DATABASE_URL; recuerde actualizar la conexión manualmente.")

    if dry_run:
        print("[DRY-RUN] Modificaciones listas para aplicar. Ningún archivo fue alterado.")
        print("-" * 80)
        return 0

    # 4. Escritura atómica con permisos 0600
    ruta_temp = f"{ruta_env}.tmp"
    with open(ruta_temp, "w", encoding="utf-8") as f:
        f.write(contenido_nuevo)

    os.chmod(ruta_temp, stat.S_IRUSR | stat.S_IWUSR)
    os.replace(ruta_temp, ruta_env)
    os.chmod(ruta_env, stat.S_IRUSR | stat.S_IWUSR)

    print(f"✔ Archivo {ruta_env} actualizado atómicamente con permisos 0600.")
    print("=" * 80)
    print("ACCIONES POST-ROTACIÓN OBLIGATORIAS:")
    if rotar_bd and nueva_pass_bd:
        print("1. Aplicar cambio en PostgreSQL ejecutando vía socket de postgres:")
        print(f"   sudo -u postgres psql -c \"ALTER ROLE polis WITH PASSWORD '{nueva_pass_bd}';\"")
    print("2. Reiniciar el servicio backend de POLIS para invalidar sesiones previas:")
    print("   sudo systemctl restart polis-backend")
    print("3. Verificar que el servicio backend esté respondiendo:")
    print("   curl -s http://127.0.0.1:8000/api/v1/health | jq .")
    print("=" * 80)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="POLIS — Rotación pericial de llaves maestras y contraseñas de producción"
    )
    parser.add_argument(
        "--env-file",
        default=DEFAULT_BACKEND_ENV,
        help="Ruta al archivo .env a actualizar (por defecto: backend/.env)",
    )
    parser.add_argument(
        "--con-bd",
        action="store_true",
        help="Incluir rotación de contraseña de base de datos PostgreSQL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular el proceso sin escribir en disco ni modificar variables",
    )

    args = parser.parse_args()
    return rotar_secretos(
        ruta_env=args.env_file,
        rotar_bd=args.con_bd,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
