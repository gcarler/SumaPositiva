"""Las divergencias oficiales permanecen visibles sin producir casos únicos falsos."""

import json

import pytest

from scripts.contrastar_fuentes_polis import RAIZ, contrastar, guardar_contraste
from scripts.normalizar_observaciones_polis import _sha_adaptador


def _corte():
    inventario = json.loads((RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json").read_text())
    origen = RAIZ / "data/capas_analiticas/observaciones"
    adaptador_sha = _sha_adaptador()
    manifiestos = []
    for ruta in origen.glob("*.manifest.json"):
        manifiesto = json.loads(ruta.read_text())
        if (
            manifiesto["entrada_sha256"] == inventario["corte_consolidado_sha256"]
            and manifiesto["adaptador_sha256"] == adaptador_sha
        ):
            manifiestos.append(manifiesto)
    assert len(manifiestos) == 1
    return RAIZ / manifiestos[0]["ruta"]


def test_contraste_homicidios_2024_separa_unidades_y_muestra_diferencias():
    resultado = contrastar(_corte())
    assert resultado["estado_publicacion"] == "no_publicable"
    assert len(resultado["paneles"]) == 45
    panel = next(p for p in resultado["paneles"] if p["tema"] == "homicidio" and p["anio"] == 2024)
    series = {s["serie"]: s for s in panel["series"]}
    assert series["policia_intencional"]["valor"] == "378.0"
    assert series["policia_feminicidio"]["valor"] == "3.0"
    assert series["medicina_homicidios"]["valor"] == "411.0"
    assert series["archivo_recibido_homicidio"]["valor"] == "381"
    assert series["fiscalia_busqueda_homicidio"]["unidad_observacion"] == "proceso"
    assert panel["total_interinstitucional"] is None
    diferencias = {d["serie_b"]: d for d in panel["diferencias_numericas"]}
    assert diferencias["medicina_homicidios"]["diferencia_a_menos_b"] == "-33.0"
    assert diferencias["archivo_recibido_homicidio"]["diferencia_a_menos_b"] == "-3.0"
    assert all(d["comparabilidad"] == "no_acreditada" for d in panel["diferencias_numericas"])


def test_ausencia_no_es_cero_y_2026_es_parcial():
    resultado = contrastar(_corte())
    panel = next(p for p in resultado["paneles"] if p["tema"] == "homicidio" and p["anio"] == 2026)
    assert "medicina_homicidios" in panel["series_sin_dato"]
    assert all(s["provisional"] for s in panel["series"])


def test_corte_corrupto_es_rechazado(tmp_path):
    ruta = tmp_path / ("a" * 64 + ".jsonl")
    ruta.write_text(json.dumps({"serie": "falsa"}) + "\n")
    with pytest.raises(ValueError, match="SHA"):
        contrastar(ruta)


def test_contraste_versionado_es_idempotente(tmp_path):
    referencia = guardar_contraste(_corte(), tmp_path)
    assert referencia["paneles"] == 45
    assert referencia["estado_publicacion"] == "no_publicable"
    assert guardar_contraste(_corte(), tmp_path) == referencia
