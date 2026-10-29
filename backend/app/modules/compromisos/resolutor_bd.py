"""Resolutor de la base de datos del corpus analítico (`bd_csh`) con guardia.

Los motores determinísticos del módulo (normalizador canónico, SISPT/DNP,
diagnóstico 8 planes, revisión por meta, informe SPD, conciliador, DEA) leen
el corpus analítico de la base canónica `bd_csh`. Regla de aislamiento
(`docs/transacciones.md` y hallazgo HALL-03 del plan de remediación):

- Con `POLIS_TEST_DATABASE_URL` definida, esa URL es la única válida y DEBE
  apuntar a una base exclusiva `polis_test*`.
- Sin `POLIS_TEST_DATABASE_URL` se usa la URL de configuración del servidor,
  JAMÁS redirigiendo una base polis_test* hacia `bd_csh` (aquí la guardia falla
  con `RuntimeError` en lugar de re-encaminar silenciosamente: el redirect
  silencioso fue la grieta que permitió escrituras de prueba en producción,
  caso LE-APORTE-8ff57e).
"""

from __future__ import annotations

import os

from sqlalchemy.engine import make_url

from app.core.config import Settings


def resolver_url_bd_csh() -> str:
    url_pruebas = os.environ.get("POLIS_TEST_DATABASE_URL")
    if url_pruebas:
        base = make_url(url_pruebas).database or ""
        if not base.startswith("polis_test"):
            raise RuntimeError(
                f"POLIS_TEST_DATABASE_URL debe apuntar a una base exclusiva polis_test*: se recibió base '{base}'."
            )
        return url_pruebas
    raw_url = Settings().async_database_url
    base = make_url(raw_url).database or ""
    if base.startswith("polis_test"):
        raise RuntimeError(
            "Los motores del corpus analítico resolvieron una base polis_test* sin "
            "POLIS_TEST_DATABASE_URL; no se redirige a bd_csh. Define POLIS_TEST_DATABASE_URL "
            "explícitamente en el entorno de pruebas."
        )
    return raw_url
