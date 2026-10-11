"""POLIS — Integración Defensiva y Resiliente de Sentry / GlitchTip.
Garantiza filtrado estricto de PII, secretos, tokens y tolerancia total ante ausencia de dependencias.
"""

import logging
from typing import Any

from app.core.config import Settings

logger = logging.getLogger("polis.sentry")

_SENSITIVE_HEADERS = {"authorization", "cookie", "set-cookie", "x-api-key"}
_SENSITIVE_FIELDS = {
    "password",
    "contrasena",
    "token",
    "jwt",
    "secret",
    "cedula",
    "documento",
    "telefono",
    "correo",
}


def _sanitizar_diccionario(d: dict[str, Any]) -> dict[str, Any]:
    resultado = {}
    for k, v in d.items():
        if any(sensible in k.lower() for sensible in _SENSITIVE_FIELDS):
            resultado[k] = "[REDACTED]"
        elif isinstance(v, dict):
            resultado[k] = _sanitizar_diccionario(v)
        else:
            resultado[k] = v
    return resultado


def _filtrar_pii(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any] | None:
    # 1. Sanitizar encabezados HTTP
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if isinstance(headers, dict):
            for k in list(headers.keys()):
                if k.lower() in _SENSITIVE_HEADERS:
                    headers[k] = "[REDACTED]"

    # 2. Sanitizar datos de usuario
    if "user" in event and isinstance(event["user"], dict):
        event["user"] = {
            "id": event["user"].get("id", "anonimo"),
            "ip_address": "[FILTERED_HABEAS_DATA]",
        }

    # 3. Sanitizar breadcrumbs
    if "breadcrumbs" in event and isinstance(event["breadcrumbs"], list):
        for bc in event["breadcrumbs"]:
            if isinstance(bc, dict) and "data" in bc and isinstance(bc["data"], dict):
                bc["data"] = _sanitizar_diccionario(bc["data"])

    return event


def init_sentry(settings: Settings) -> bool:
    if not settings.sentry_dsn:
        logger.info("Observabilidad Sentry/GlitchTip: desactivado (POLIS_SENTRY_DSN no configurado)")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
            before_send=_filtrar_pii,
            integrations=[FastApiIntegration()],
        )
        logger.info("Observabilidad Sentry/GlitchTip inicializada exitosamente")
        return True
    except ImportError:
        logger.info(
            "POLIS_SENTRY_DSN configurado pero sentry_sdk no está instalado; telemetría externa en espera"
        )
        return False
    except Exception as e:
        logger.warning("Fallo al inicializar sentry_sdk: %s", e)
        return False
