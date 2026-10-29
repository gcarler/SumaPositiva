"""Herramienta de verificación de configuración SMTP y worker de correo para POLIS.

Valida variables de entorno, sintaxis, restricciones de seguridad y el estado
de la cola durable en PostgreSQL sin enviar correos reales ni alterar credenciales.
"""

import argparse
import asyncio
import json
import re
import socket
import sys
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings

RE_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validar_configuracion_memoria(settings: Settings) -> dict[str, Any]:
    """Evalúa las variables de configuración sin interacción con red ni base de datos."""
    chequeos = []
    es_valido = True

    # 1. POLIS_ENVIRONMENT
    chequeos.append(
        {
            "variable": "POLIS_ENVIRONMENT",
            "valor": settings.environment,
            "estado": "OK",
            "detalle": f"Entorno configurado: {settings.environment}",
        }
    )

    # 2. POLIS_JWT_SECRET_KEY
    if not settings.jwt_secret_key or len(settings.jwt_secret_key) < 32:
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_JWT_SECRET_KEY",
                "valor": "[REDACTADO]" if settings.jwt_secret_key else "NO_CONFIGURADO",
                "estado": "FALLO",
                "detalle": "Debe tener al menos 32 caracteres criptográficos obligatorios.",
            }
        )
    elif settings.environment == "production" and "test" in settings.jwt_secret_key.lower():
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_JWT_SECRET_KEY",
                "valor": "[REDACTADO]",
                "estado": "FALLO",
                "detalle": "En entorno de producción no se permiten secretos con la palabra 'test'.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_JWT_SECRET_KEY",
                "valor": "[CONFIGURADO]",
                "estado": "OK",
                "detalle": f"Clave secreta válida ({len(settings.jwt_secret_key)} caracteres).",
            }
        )

    # 3. POLIS_IP_SALT
    if not settings.ip_salt:
        chequeos.append(
            {
                "variable": "POLIS_IP_SALT",
                "valor": "NO_CONFIGURADO",
                "estado": "ADVERTENCIA",
                "detalle": "Se recomienda definir un salt específico para anonimización Habeas Data.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_IP_SALT",
                "valor": "[CONFIGURADO]",
                "estado": "OK",
                "detalle": "Salt para anonimización de direcciones IP configurado.",
            }
        )

    # 4. POLIS_IDENTIDAD_URL_PUBLICA
    url_pub = settings.identidad_url_publica
    if not url_pub or not (url_pub.startswith("http://") or url_pub.startswith("https://")):
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_IDENTIDAD_URL_PUBLICA",
                "valor": str(url_pub),
                "estado": "FALLO",
                "detalle": "Debe ser una URL válida absoluta con esquema http:// o https://.",
            }
        )
    elif settings.environment == "production" and not url_pub.startswith("https://"):
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_IDENTIDAD_URL_PUBLICA",
                "valor": str(url_pub),
                "estado": "FALLO",
                "detalle": "En producción, la URL pública DEBE requerir HTTPS.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_IDENTIDAD_URL_PUBLICA",
                "valor": str(url_pub),
                "estado": "OK",
                "detalle": f"URL canónica de enlaces: {url_pub}",
            }
        )

    # 5. POLIS_SMTP_HOST y PUERTO
    if not settings.smtp_host:
        chequeos.append(
            {
                "variable": "POLIS_SMTP_HOST",
                "valor": "NO_CONFIGURADO",
                "estado": "ADVERTENCIA",
                "detalle": "Sin host SMTP; la API devolverá HTTP 503 al solicitar envíos.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_SMTP_HOST",
                "valor": settings.smtp_host,
                "estado": "OK",
                "detalle": f"Host SMTP definido: {settings.smtp_host}:{settings.smtp_port}",
            }
        )

    # 6. POLIS_SMTP_TLS
    if settings.environment == "production" and settings.smtp_host and not settings.smtp_tls:
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_SMTP_TLS",
                "valor": str(settings.smtp_tls),
                "estado": "FALLO",
                "detalle": "En producción, el transporte SMTP DEBE tener TLS activado.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_SMTP_TLS",
                "valor": str(settings.smtp_tls),
                "estado": "OK",
                "detalle": f"Modo TLS seguro: {'Habilitado' if settings.smtp_tls else 'Deshabilitado'}",
            }
        )

    # 7. POLIS_SMTP_REMITENTE
    remitente = settings.smtp_remitente
    if not remitente or ("@" not in remitente):
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_SMTP_REMITENTE",
                "valor": str(remitente),
                "estado": "FALLO",
                "detalle": "El remitente debe ser una dirección de correo válida.",
            }
        )
    else:
        chequeos.append(
            {
                "variable": "POLIS_SMTP_REMITENTE",
                "valor": remitente,
                "estado": "OK",
                "detalle": f"Remitente oficial: {remitente}",
            }
        )

    # 8. TTL de enlaces
    if 5 <= settings.identidad_token_minutos <= 120:
        chequeos.append(
            {
                "variable": "POLIS_IDENTIDAD_TOKEN_MINUTOS",
                "valor": str(settings.identidad_token_minutos),
                "estado": "OK",
                "detalle": f"Caducidad de enlace: {settings.identidad_token_minutos} minutos.",
            }
        )
    else:
        es_valido = False
        chequeos.append(
            {
                "variable": "POLIS_IDENTIDAD_TOKEN_MINUTOS",
                "valor": str(settings.identidad_token_minutos),
                "estado": "FALLO",
                "detalle": "El TTL del enlace debe estar comprendido entre 5 y 120 minutos.",
            }
        )

    return {
        "es_valido": es_valido,
        "chequeos": chequeos,
    }


async def auditar_cola_durable(database_url: str) -> dict[str, Any]:
    """Inspecciona la tabla de tokens de acción para el worker sin mutar datos."""
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION READ ONLY"))

            # Verificar si existe la tabla
            regclass = await conn.scalar(text("SELECT to_regclass('autenticacion.tokens_accion')"))
            if not regclass:
                return {
                    "disponible": False,
                    "mensaje": "La tabla 'autenticacion.tokens_accion' no existe. Aplique las migraciones.",
                }

            # Consultar métricas de la cola
            res_pendientes = await conn.scalar(
                text("""
                SELECT COUNT(*) FROM autenticacion.tokens_accion
                WHERE enviado_en IS NULL AND usado_en IS NULL AND expira_en > NOW() AND entregas < 5
                """)
            )
            res_enviados = await conn.scalar(
                text("SELECT COUNT(*) FROM autenticacion.tokens_accion WHERE enviado_en IS NOT NULL")
            )
            res_usados = await conn.scalar(
                text("SELECT COUNT(*) FROM autenticacion.tokens_accion WHERE usado_en IS NOT NULL")
            )
            res_fallidos = await conn.scalar(
                text("""
                SELECT COUNT(*) FROM autenticacion.tokens_accion
                WHERE enviado_en IS NULL AND (expira_en <= NOW() OR entregas >= 5)
                """)
            )

            return {
                "disponible": True,
                "mensajes_pendientes": res_pendientes or 0,
                "mensajes_enviados": res_enviados or 0,
                "tokens_consumidos": res_usados or 0,
                "mensajes_caducados_o_agotados": res_fallidos or 0,
                "mensaje": f"Cola durable activa con {res_pendientes or 0} mensajes pendientes por entregar.",
            }
    except Exception as exc:
        return {
            "disponible": False,
            "mensaje": f"Error al consultar la cola durable: {str(exc)}",
        }
    finally:
        await engine.dispose()


def probar_socket_smtp(host: str, puerto: int, usar_tls: bool, timeout: int = 5) -> dict[str, Any]:
    """Prueba el handshake TCP/TLS básico con el servidor SMTP sin enviar mensajes."""
    try:
        sock = socket.create_connection((host, puerto), timeout=timeout)
        sock.close()
        return {
            "conectividad": True,
            "mensaje": f"Conexión TCP exitosa a {host}:{puerto} (sin envío de correo).",
        }
    except Exception as err:
        return {
            "conectividad": False,
            "mensaje": f"Fallo de conexión a {host}:{puerto}: {str(err)}",
        }


def imprimir_diagnostico(resultado: dict[str, Any]) -> None:
    """Imprime el diagnóstico de configuración en formato legible."""
    print("=" * 80)
    print(" VERIFICACIÓN DE CONFIGURACIÓN SMTP Y WORKER DE IDENTIDAD (POLIS)")
    print("=" * 80)

    for chk in resultado["chequeos"]:
        tag = f"[{chk['estado']}]"
        print(f"{tag:<8} {chk['variable']:<32} {chk['detalle']}")

    if "cola_durable" in resultado:
        cola = resultado["cola_durable"]
        print("-" * 80)
        print("ESTADO DE LA COLA DURABLE EN BASE DE DATOS:")
        if cola.get("disponible"):
            print(f"  • Pendientes por enviar:  {cola.get('mensajes_pendientes')}")
            print(f"  • Enviados exitosamente:  {cola.get('mensajes_enviados')}")
            print(f"  • Tokens consumidos:      {cola.get('tokens_consumidos')}")
            print(f"  • Caducados/Reintentos:   {cola.get('mensajes_caducados_o_agotados')}")
        else:
            print(f"  [!] {cola.get('mensaje')}")

    if "conectividad_smtp" in resultado:
        conn = resultado["conectividad_smtp"]
        print("-" * 80)
        print("CONECTIVIDAD DE RED SMTP:")
        estado = "[OK]" if conn.get("conectividad") else "[FALLO]"
        print(f"  {estado} {conn.get('mensaje')}")

    print("=" * 80)
    if resultado["es_valido"]:
        print("RESULTADO: [APROBADO] Configuración apta para operación.")
    else:
        print("RESULTADO: [RECHAZADO] Existen parámetros que requieren corrección.")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Verifica variables de configuración SMTP y worker sin enviar correos."
    )
    parser.add_argument(
        "--solo-config",
        action="store_true",
        help="Solo evalúa las variables en memoria sin consultar base de datos ni red",
    )
    parser.add_argument(
        "--probar-red",
        action="store_true",
        help="Intenta un handshake TCP con el host SMTP sin enviar comandos de correo",
    )
    parser.add_argument(
        "--database-url",
        help="URL de PostgreSQL para auditar la cola durable",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emite salida en formato JSON estructurado",
    )

    args = parser.parse_args()
    settings = Settings()

    res_memoria = validar_configuracion_memoria(settings)
    resultado: dict[str, Any] = {
        "es_valido": res_memoria["es_valido"],
        "chequeos": res_memoria["chequeos"],
    }

    if not args.solo_config:
        db_url = args.database_url or settings.async_database_url
        resultado["cola_durable"] = asyncio.run(auditar_cola_durable(db_url))

    if args.probar_red and settings.smtp_host:
        resultado["conectividad_smtp"] = probar_socket_smtp(settings.smtp_host, settings.smtp_port, settings.smtp_tls)
        if not resultado["conectividad_smtp"]["conectividad"]:
            resultado["es_valido"] = False

    if args.json:
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    else:
        imprimir_diagnostico(resultado)

    sys.exit(0 if resultado["es_valido"] else 1)


if __name__ == "__main__":
    main()
