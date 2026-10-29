"""La jerarquía declarada conserva duplicados, vacíos y zonas en disputa."""

import hashlib
import importlib.util
import json
from pathlib import Path


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "scripts/registrar_territorios_polis.py"
    spec = importlib.util.spec_from_file_location("registrar_territorios_polis_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_registro_versionado_253_unidades_sin_imputar_46_barrios():
    registro = _modulo().generar()
    assert registro["conteos"] == {"distrito": 1, "localidad": 3, "ucg": 15, "corregimiento": 17, "barrio": 217}
    assert registro["barrios_sin_ucg_declarada"] == 46
    assert registro["codigos_origen_repetidos"]["localidad"] == {"00": 3}
    assert registro["codigos_origen_repetidos"]["barrio"] == {"1300100000000": 217}
    territorios = registro["territorios"]
    ids = {r["territorio_id"] for r in territorios}
    assert len(ids) == 253
    assert all(r["parent_id"] in ids for r in territorios if r["parent_id"])
    assert sum(r["limite_en_disputa"] for r in territorios) == 2
    assert all(r["relacion_parental"] != "validado_espacialmente" for r in territorios)


def test_registro_publicado_conserva_hashes_de_las_capas():
    modulo = _modulo()
    publicado = json.loads(modulo.SALIDA.read_text())
    assert publicado == modulo.generar()
    for fuente in publicado["fuentes"].values():
        assert hashlib.sha256((modulo.RAIZ / fuente["ruta"]).read_bytes()).hexdigest() == fuente["sha256"]
