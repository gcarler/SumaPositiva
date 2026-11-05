"""Pruebas de regresión del validador de catálogo (H297-07)."""

from __future__ import annotations

import csv
import importlib.util
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "validar_catalogo_indicadores.py"
CATALOGO_BASE = (
    Path(__file__).resolve().parents[2] / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"
)


def _cargar_modulo() -> Any:
    spec = importlib.util.spec_from_file_location("validar_catalogo", SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(modulo)
    return modulo


def _escribir(tmp_path: Path, filas: list[dict[str, str]], campos: list[str]) -> Path:
    ruta = tmp_path / "catalogo.csv"
    with ruta.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=campos)
        writer.writeheader()
        writer.writerows(filas)
    return ruta


def _catalogo_modificado(tmp_path: Path, codigo: str, cambios: dict[str, str]) -> Path:
    with CATALOGO_BASE.open(encoding="utf-8", newline="") as fh:
        filas = list(csv.DictReader(fh))
        campos = list(filas[0].keys())
    fila = next(r for r in filas if r["codigo"] == codigo)
    fila.update(cambios)
    return _escribir(tmp_path, filas, campos)


def test_validador_rechaza_prefijo_y_dimension_incompatibles(tmp_path, monkeypatch):
    modulo = _cargar_modulo()
    ruta = _catalogo_modificado(tmp_path, "PERS_001", {"dimension": "AMB"})
    monkeypatch.setattr(modulo, "CATALOGO", ruta)
    assert modulo.main() == 1


def test_validador_rechaza_tier_a_sin_referencia_real(tmp_path, monkeypatch):
    modulo = _cargar_modulo()
    ruta = _catalogo_modificado(
        tmp_path,
        "PERS_002",
        {
            "numerador": "Sin referencia al banco",
            "denominador": "Sin referencia al banco",
            "formula": "Sin referencia al banco",
        },
    )
    monkeypatch.setattr(modulo, "CATALOGO", ruta)
    assert modulo.main() == 1


def test_validador_rechaza_url_con_query_diferente(tmp_path, monkeypatch):
    modulo = _cargar_modulo()
    url = "https://www.datos.gov.co/d/vtub-3de2?edicion=inexistente"
    ruta = _catalogo_modificado(tmp_path, "PERS_002", {"url_fuente": url})
    monkeypatch.setattr(modulo, "CATALOGO", ruta)
    assert modulo.main() == 1
