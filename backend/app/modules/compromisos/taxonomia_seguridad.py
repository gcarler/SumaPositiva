"""Taxonomy helpers for Drive source paths and the eight human security dimensions."""

from __future__ import annotations

import re
import unicodedata
from pathlib import PurePosixPath
from typing import Any

DIMENSIONES = (
    "1. Seguridad Personal",
    "2. Seguridad Comunitaria",
    "3. Seguridad Económica",
    "4. Seguridad Alimentaria",
    "5. Seguridad Sanitaria",
    "6. Seguridad Ambiental",
    "7. Seguridad Política",
    "8. Crisis",
)
PERIODOS = ("ANTES_2020", "2020_2023", "2024_2027")


def _normalizar(texto: str) -> str:
    return " ".join(
        unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower().split()
    )


def inferir_taxonomia(ruta: str, nombre: str = "") -> dict[str, Any]:
    """Infer dimension/period from a catalog or archive path without losing the path."""
    partes = [p for p in PurePosixPath(ruta.replace("\\", "/")).parts if p not in {".", ""}]
    carpetas = partes[:-1]
    normalizadas = [_normalizar(p) for p in carpetas]
    texto = _normalizar(" ".join((*carpetas, nombre)))
    vigencias_ruta = [
        int(match.group())
        for parte in carpetas
        if (match := re.fullmatch(r"20(?:1[6-9]|2[0-7])", parte.strip()))
    ]
    vigencias_nombre = [
        int(match) for match in re.findall(r"(?<!\d)20(?:1[6-9]|2[0-7])(?!\d)", nombre)
    ]
    vigencia = (vigencias_ruta or vigencias_nombre or [None])[-1]
    dimensiones = []
    for dimension in DIMENSIONES:
        if _normalizar(dimension) in normalizadas:
            dimensiones.append(dimension)
    periodo = None
    if any("antes de 2020" in p for p in normalizadas):
        periodo = "ANTES_2020"
    elif any("2020 2023" in p for p in normalizadas):
        periodo = "2020_2023"
    elif any("2024 2027" in p for p in normalizadas):
        periodo = "2024_2027"
    if periodo is None:
        anios = [int(y) for y in re.findall(r"(?<!\d)(20\d{2})(?!\d)", texto)]
        anio = next((y for y in anios if 2016 <= y <= 2027), None)
        if anio is not None:
            periodo = "ANTES_2020" if anio < 2020 else "2020_2023" if anio <= 2023 else "2024_2027"
    return {
        "dimensiones_seguridad_humana": dimensiones,
        "periodo_gobierno": periodo,
        "vigencia_drive": vigencia,
        "rutas_drive": [ruta] if ruta else [],
    }


def enriquecer_entrada_catalogo(entrada: dict[str, Any]) -> dict[str, Any]:
    metadatos = inferir_taxonomia(entrada.get("path", ""), entrada.get("name", ""))
    return {
        **entrada,
        **metadatos,
        "drive_file_ids": [entrada["id"]]
        if entrada.get("id") and not entrada.get("is_folder")
        else [],
    }
