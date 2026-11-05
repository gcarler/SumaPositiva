"""Lector en caché del catálogo municipal de indicadores POLIS.

El archivo es la única fuente legible. El lector no calcula valores: expone
filas de catalogo.csv con validación explícita de columnas obligatorias.
"""

from __future__ import annotations

import csv
import hashlib
from copy import deepcopy
from io import StringIO
from pathlib import Path
from threading import Lock

RAIZ_REPO = Path(__file__).resolve().parents[4]
ARCHIVO_CATALOGO = RAIZ_REPO / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"

CAMPOS_OBLIGATORIOS = (
    "codigo",
    "nombre",
    "dimension",
    "definicion",
    "formula",
    "numerador",
    "denominador",
    "unidad",
    "tipo_territorio_fuente",
    "periodicidad",
    "tipo_periodo",
    "fuente",
    "url_fuente",
    "custodio",
    "licencia",
    "anio_base",
    "interpretacion",
    "riesgo_metodologico",
    "tier",
    "estado",
)

_cache: dict[str, tuple[list[dict[str, str]], str]] = {}
_cache_lock = Lock()


class CatalogoIndicadoresInvalido(ValueError):
    """El archivo existe pero su estructura metodológica es inválida."""


def leer_catalogo_indicadores() -> tuple[list[dict[str, str]], str]:
    """Devuelve filas del catálogo y SHA-256 del archivo, con caché por SHA-256."""

    try:
        contenido = ARCHIVO_CATALOGO.read_bytes()
    except OSError as error:
        raise CatalogoIndicadoresInvalido("No se puede leer el catálogo") from error
    sha256 = hashlib.sha256(contenido).hexdigest()
    with _cache_lock:
        if sha256 in _cache:
            return deepcopy(_cache[sha256])

    try:
        lector = csv.DictReader(StringIO(contenido.decode("utf-8-sig")), strict=True)
        cabecera = lector.fieldnames or []
        faltantes = [campo for campo in CAMPOS_OBLIGATORIOS if campo not in cabecera]
        if faltantes or len(cabecera) != len(set(cabecera)):
            raise CatalogoIndicadoresInvalido("Columnas incompletas o duplicadas")
        filas = list(lector)
    except (UnicodeError, csv.Error) as error:
        raise CatalogoIndicadoresInvalido("Formato ilegible del catálogo") from error

    if not filas or any(
        None in fila
        or any(not isinstance(valor, str) for valor in fila.values())
        or any(not isinstance(fila.get(campo), str) or not fila[campo].strip() for campo in CAMPOS_OBLIGATORIOS)
        or fila["estado"] != "no_publicable"
        for fila in filas
    ):
        raise CatalogoIndicadoresInvalido("Filas incompletas o estado de publicación inválido")

    resultado = (filas, sha256)
    with _cache_lock:
        _cache.clear()
        _cache[sha256] = resultado
        return deepcopy(resultado)
