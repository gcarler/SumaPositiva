"""La puerta preliminar impide promover un corte con filas estructuralmente rojas."""

import csv
import hashlib
import json
import shutil
from pathlib import Path

import pytest

from scripts.validar_banco_staging_polis import validar


def _preparar(tmp_path):
    banco = Path(__file__).resolve().parents[2] / "data/banco_fuentes_oficiales"
    for nombre in ("inventario_pipeline_2026.json", "indicadores_consolidados_cartagena_2026.csv"):
        shutil.copy2(banco / nombre, tmp_path / nombre)
    return tmp_path


def test_corte_actual_queda_ambar_y_no_publicable(tmp_path):
    banco = _preparar(tmp_path)
    resultado = validar(banco)
    assert resultado["evaluacion"]["filas_tipadas"] == 2340
    assert resultado["evaluacion"]["estado"] == "ambar"
    assert resultado["estado_publicacion"] == "no_publicable"
    assert json.loads((banco / "evaluacion_estructural_2026.json").read_text()) == resultado


def test_valor_negativo_bloquea_promocion_antes_de_escribir_resultado(tmp_path):
    banco = _preparar(tmp_path)
    consolidado = banco / "indicadores_consolidados_cartagena_2026.csv"
    with consolidado.open(encoding="utf-8", newline="") as archivo:
        filas = list(csv.DictReader(archivo))
        campos = list(filas[0])
    clave = filas[0]["fuente_clave"]
    filas[0]["valor"] = "-1"
    with consolidado.open("w", encoding="utf-8", newline="") as archivo:
        writer = csv.DictWriter(archivo, fieldnames=campos)
        writer.writeheader()
        writer.writerows(filas)
    inventario_ruta = banco / "inventario_pipeline_2026.json"
    inventario = json.loads(inventario_ruta.read_text())
    inventario["corte_consolidado_sha256"] = hashlib.sha256(consolidado.read_bytes()).hexdigest()
    lineas = [
        json.dumps({k: v for k, v in fila.items() if k != "fecha_extraccion"}, ensure_ascii=False, sort_keys=True)
        for fila in filas
        if fila["fuente_clave"] == clave
    ]
    version = hashlib.sha256("\n".join(sorted(lineas)).encode()).hexdigest()
    ficha = next(f for f in inventario["fuentes"] if f["fuente_clave"] == clave)
    ficha["sha256_contenido"] = version
    ficha["version_id"] = version[:16]
    inventario_ruta.write_text(json.dumps(inventario))
    with pytest.raises(ValueError, match="Lote rojo"):
        validar(banco)
    assert not (banco / "evaluacion_estructural_2026.json").exists()
