"""La lectura por corte exige versiones de fuente idénticas al manifiesto."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path

import pytest

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.lector_serie_corte_polis import verificar_serie_del_corte


def _escribir_json(ruta: Path, valor: dict) -> str:
    contenido = (json.dumps(valor, sort_keys=True) + "\n").encode()
    ruta.write_bytes(contenido)
    return hashlib.sha256(contenido).hexdigest()


def test_serie_falla_cerrada_si_una_version_no_corresponde_al_corte(tmp_path: Path):
    fuente_sha = "a" * 64
    fila = {
        "observacion_sha256": "b" * 64,
        "fuente_clave": "fuente_prueba",
        "version_fuente_sha256": fuente_sha,
        "indicador": "hechos",
        "subtipo": None,
        "dimension": "PERS",
        "estado_clasificacion": "exacta",
        "anio": 2024,
        "tipo_fecha": "hecho",
        "territorio_id": "13001",
        "ambito_original": "municipio",
        "valor_original": "2",
        "unidad_original": "casos",
        "unidad_observacion": "hecho",
        "numerador": "2",
        "denominador": None,
        "tasa_por_100000": None,
        "metodo": "observacion_agregada_sin_suma_entre_fuentes",
        "grupo_comparabilidad": "c" * 20,
        "estado_comparabilidad": "misma_fuente_unidad_y_base",
        "advertencias": [],
        "provisional": False,
        "fuente_url": None,
    }
    contenido = (json.dumps(fila, sort_keys=True) + "\n").encode()
    serie_sha = hashlib.sha256(contenido).hexdigest()
    serie = tmp_path / f"{serie_sha}.jsonl"
    serie.write_bytes(contenido)
    _escribir_json(
        serie.with_suffix(".manifest.json"),
        {"esquema": "polis.series_7d.v1", "salida_sha256": serie_sha, "filas": 1},
    )
    inventario = tmp_path / "inventario.json"
    inventario_sha = _escribir_json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "fuentes": [{"fuente_clave": "fuente_prueba", "sha256_contenido": fuente_sha}],
            "archivos": [{"ruta": f"data/{serie.name}", "sha256": serie_sha}],
        },
    )
    run_id = uuid.uuid4()
    manifiesto = tmp_path / "corte.json"
    corte_sha = _escribir_json(
        manifiesto,
        {
            "run_id": str(run_id),
            "inventario_sha256": inventario_sha,
            "evaluacion_sha256": "d" * 64,
            "consolidado_sha256": "e" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": 1,
            "versiones": [{"fuente_clave": "fuente_prueba", "version_id": "prueba", "sha256_contenido": fuente_sha}],
        },
    )
    contexto = ContextoCorte(run_id, manifiesto, corte_sha)
    resultado = verificar_serie_del_corte(contexto, inventario, serie)
    assert resultado.filas == 1
    assert resultado.fuentes == {"fuente_prueba": 1}
    assert resultado.estado_publicacion == "no_publicable"

    fila["version_fuente_sha256"] = "f" * 64
    contenido = (json.dumps(fila, sort_keys=True) + "\n").encode()
    serie_sha_alterada = hashlib.sha256(contenido).hexdigest()
    serie_alterada = tmp_path / f"{serie_sha_alterada}.jsonl"
    serie_alterada.write_bytes(contenido)
    _escribir_json(
        serie_alterada.with_suffix(".manifest.json"),
        {"esquema": "polis.series_7d.v1", "salida_sha256": serie_sha_alterada, "filas": 1},
    )
    inventario_sha = _escribir_json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "fuentes": [{"fuente_clave": "fuente_prueba", "sha256_contenido": fuente_sha}],
            "archivos": [{"ruta": f"data/{serie_alterada.name}", "sha256": serie_sha_alterada}],
        },
    )
    corte_sha = _escribir_json(
        manifiesto,
        {
            "run_id": str(run_id),
            "inventario_sha256": inventario_sha,
            "evaluacion_sha256": "d" * 64,
            "consolidado_sha256": "e" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": 1,
            "versiones": [{"fuente_clave": "fuente_prueba", "version_id": "prueba", "sha256_contenido": fuente_sha}],
        },
    )
    with pytest.raises(ValueError, match="Versión de fuente ajena al corte"):
        verificar_serie_del_corte(ContextoCorte(run_id, manifiesto, corte_sha), inventario, serie_alterada)
