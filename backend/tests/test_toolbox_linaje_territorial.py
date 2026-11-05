"""El generador comprueba sus fuentes locales antes de publicar conteos territoriales."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


@pytest.fixture
def generador():
    ruta = Path(__file__).resolve().parents[2] / "scripts/generar_toolbox_completa_pdf.py"
    spec = importlib.util.spec_from_file_location("toolbox_linaje_pruebas", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_linaje_real_coteja_geometrias_y_programacion_sin_escribir(generador):
    linaje = generador.cargar_linaje_territorial()
    assert [capa["cantidad_objetos"] for capa in linaje["capas"]] == [3, 15, 217]
    assert linaje["programacion_mesas"]["cantidad_codigos"] == 35


@pytest.mark.parametrize("alteracion", ["sha_capa", "conteo_capa", "sha_mesas", "codigos_mesas", "conteo_mesas"])
def test_linaje_alterado_se_rechaza_sin_generar_documentos(generador, tmp_path, monkeypatch, alteracion):
    linaje = json.loads(generador.ARCHIVO_LINAJE.read_text())
    if alteracion == "sha_capa":
        linaje["capas"][0]["sha256"] = "0" * 64
    elif alteracion == "conteo_capa":
        linaje["capas"][0]["cantidad_objetos"] += 1
    elif alteracion == "sha_mesas":
        linaje["programacion_mesas"]["sha256"] = "0" * 64
    elif alteracion == "codigos_mesas":
        linaje["programacion_mesas"]["codigos"][0] = "NO_ES_UN_CODIGO_REAL"
    else:
        linaje["programacion_mesas"]["cantidad_codigos"] += 1
    archivo = tmp_path / "linaje.json"
    archivo.write_text(json.dumps(linaje))
    monkeypatch.setattr(generador, "ARCHIVO_LINAJE", archivo)
    with pytest.raises(ValueError):
        generador.cargar_linaje_territorial()
    assert sorted(p.name for p in tmp_path.iterdir()) == ["linaje.json"]
