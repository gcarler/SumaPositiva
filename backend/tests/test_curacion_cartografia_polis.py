"""Las reparaciones geográficas son derivadas y conservan evidencia de topología."""

import hashlib
import json
from pathlib import Path

import geopandas as gpd

RAIZ = Path(__file__).resolve().parents[2]
FUENTES = RAIZ / "data/cartografia_fuentes"


def test_seis_reparaciones_conservan_original_y_sha():
    registro = json.loads((FUENTES / "registro_correccion_geometrica_2026.json").read_text())
    assert len(registro["reparaciones"]) == 6
    for reparacion in registro["reparaciones"]:
        original = RAIZ / reparacion["origen"]
        derivado = RAIZ / reparacion["derivado"]
        assert hashlib.sha256(original.read_bytes()).hexdigest() == reparacion["sha256_origen"]
        assert hashlib.sha256(derivado.read_bytes()).hexdigest() == reparacion["sha256_derivado"]
        assert reparacion["invalidas_originales"] > 0
        assert reparacion["invalidas_derivadas"] == 0
        assert bool(gpd.read_file(derivado).geometry.is_valid.all())


def test_topologia_no_promueve_capas_con_solapes_o_fuera_de_limite():
    auditoria = json.loads((FUENTES / "auditoria_topologia_2026.json").read_text())
    capas = {capa["capa"]: capa for capa in auditoria["capas"]}
    assert set(capas) == {"barrios", "localidades", "ucg", "corregimientos_17"}
    assert capas["corregimientos_17"]["registros"] == 17
    assert capas["ucg"]["registros"] == 15
    assert capas["barrios"]["parejas_solapadas_mas_1m2"] > 0
    assert all(capa["estado"] == "requiere_revision_topologica" for capa in capas.values())
