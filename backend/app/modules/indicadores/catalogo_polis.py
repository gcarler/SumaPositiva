"""Lector de solo lectura del catálogo municipal de indicadores POLIS.

Este módulo no calcula valores ni modifica datos: expone el contrato
metodológico validado en `data/capas_analiticas/catalogo_indicadores/catalogo.csv`.
"""

from __future__ import annotations

import csv
import hashlib
from io import StringIO
from pathlib import Path

RAIZ_REPO = Path(__file__).resolve().parents[4]
ARCHIVO_CATALOGO = RAIZ_REPO / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"


def leer_catalogo_indicadores() -> tuple[list[dict[str, str]], str]:
    """Devuelve las filas del catálogo y el SHA-256 del archivo fuente."""
    contenido = ARCHIVO_CATALOGO.read_bytes()
    sha256 = hashlib.sha256(contenido).hexdigest()
    lector = csv.DictReader(StringIO(contenido.decode("utf-8")))
    return list(lector), sha256
