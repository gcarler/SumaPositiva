"""El registro geográfico preserva selección, hashes y cuarentenas."""

import hashlib
import importlib.util
from pathlib import Path


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "scripts/catalogar_cartografia_polis.py"
    spec = importlib.util.spec_from_file_location("catalogar_cartografia_polis_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_registro_capas_conserva_17_corregimientos_y_cuarentena():
    modulo = _modulo()
    registro = modulo.generar()
    assert len(registro["capas"]) == 21
    seleccionadas = [capa for capa in registro["capas"] if capa["activa_analisis"]]
    assert len(seleccionadas) == 1
    assert seleccionadas[0]["registros"] == 17
    assert seleccionadas[0]["sha256"] == registro["seleccion_corregimientos"]["sha256"]
    barrios = next(capa for capa in registro["capas"] if capa["archivo"].endswith("cartagena_barrios.geojson"))
    localidades = next(capa for capa in registro["capas"] if capa["archivo"].endswith("cartagena_localidades.geojson"))
    assert barrios["geometrias_invalidas"] == 3
    assert localidades["geometrias_invalidas"] == 1
    assert barrios["estado_calidad"] == localidades["estado_calidad"] == "cuarentena_geometrica"


def test_hashes_geograficos_reproducibles():
    modulo = _modulo()
    registro = modulo.generar()
    for capa in registro["capas"]:
        ruta = modulo.RAIZ / capa["archivo"]
        assert hashlib.sha256(ruta.read_bytes()).hexdigest() == capa["sha256"]
