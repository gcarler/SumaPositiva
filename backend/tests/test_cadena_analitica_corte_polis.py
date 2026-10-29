"""Una cadena 7D debe pertenecer a un solo corte y reproducirse desde su serie."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path

import pytest

from app.modules.compromisos.cadena_analitica_corte_polis import (
    escribir_recibo_cadena,
    verificar_cadena_analitica,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.expedientes_serie_7d_polis import materializar_expedientes
from app.modules.compromisos.paneles_series_7d_polis import materializar_paneles


def _escribir_json(ruta: Path, valor: dict) -> str:
    contenido = (json.dumps(valor, ensure_ascii=False, sort_keys=True) + "\n").encode()
    ruta.write_bytes(contenido)
    return hashlib.sha256(contenido).hexdigest()


def _cadena(tmp_path: Path):
    fila = {
        "observacion_sha256": "b" * 64,
        "fuente_clave": "fuente_prueba",
        "version_fuente_sha256": "a" * 64,
        "indicador": "hechos",
        "subtipo": None,
        "dimension": "PERS",
        "estado_clasificacion": "exacta",
        "anio": 2024,
        "tipo_fecha": "anio_hecho",
        "territorio_id": "13001",
        "ambito_original": "municipio_13001",
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
        "fuente_url": "https://example.org/fuente",
    }
    contenido = (json.dumps(fila, sort_keys=True) + "\n").encode()
    serie_sha = hashlib.sha256(contenido).hexdigest()
    serie = tmp_path / f"{serie_sha}.jsonl"
    serie.write_bytes(contenido)
    _escribir_json(
        serie.with_suffix(".manifest.json"),
        {
            "esquema": "polis.series_7d.v1",
            "salida_sha256": serie_sha,
            "filas": 1,
            "denominador_sha256": "d" * 64,
            "estado_publicacion": "no_publicable",
        },
    )
    panel_ref = materializar_paneles(serie, tmp_path / "paneles")
    paneles = tmp_path / "paneles" / f"{panel_ref['sha256']}.json"
    exp_ref = materializar_expedientes(serie, paneles, tmp_path / "expedientes")
    expedientes = tmp_path / "expedientes" / f"{exp_ref['salida_sha256']}.jsonl"
    return serie, paneles, expedientes


def _contexto(tmp_path: Path, archivos: list[Path], *, rutas_relativas: bool = False) -> tuple[ContextoCorte, Path]:
    inventario = tmp_path / "inventario.json"
    inventario_sha = _escribir_json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "fuentes": [{"fuente_clave": "fuente_prueba", "sha256_contenido": "a" * 64}],
            "archivos": [
                {
                    "ruta": str(ruta.relative_to(tmp_path) if rutas_relativas else ruta),
                    "sha256": hashlib.sha256(ruta.read_bytes()).hexdigest(),
                }
                for ruta in archivos
            ],
        },
    )
    run_id = uuid.uuid4()
    manifiesto = tmp_path / f"{run_id}.json"
    corte_sha = _escribir_json(
        manifiesto,
        {
            "run_id": str(run_id),
            "inventario_sha256": inventario_sha,
            "evaluacion_sha256": "e" * 64,
            "consolidado_sha256": "f" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": len(archivos),
            "versiones": [{"fuente_clave": "fuente_prueba", "version_id": "a", "sha256_contenido": "a" * 64}],
        },
    )
    return ContextoCorte(run_id, manifiesto, corte_sha), inventario


def test_cadena_reproduce_derivados_y_escribe_recibo_idempotente(tmp_path):
    serie, paneles, expedientes = _cadena(tmp_path)
    archivos = [
        serie,
        serie.with_suffix(".manifest.json"),
        paneles,
        expedientes,
        expedientes.with_suffix(".manifest.json"),
    ]
    corte, inventario = _contexto(tmp_path, archivos)
    resultado = verificar_cadena_analitica(corte, inventario, serie, paneles, expedientes)
    assert resultado.filas_serie == 1
    assert resultado.paneles == 1
    assert resultado.expedientes == 1
    assert resultado.estado_publicacion == "no_publicable"
    recibo = escribir_recibo_cadena(resultado, tmp_path / "recibos")
    assert escribir_recibo_cadena(resultado, tmp_path / "recibos") == recibo
    assert json.loads(recibo.read_text())["run_id"] == str(corte.run_id)


def test_cadena_rechaza_panel_inventariado_pero_no_reproducible(tmp_path):
    serie, paneles, expedientes = _cadena(tmp_path)
    falso = json.loads(paneles.read_text())
    falso["regla_incertidumbre"] = "metodo_no_aplicado"
    contenido = (json.dumps(falso, ensure_ascii=False, sort_keys=True) + "\n").encode()
    panel_alterado = tmp_path / f"{hashlib.sha256(contenido).hexdigest()}.json"
    panel_alterado.write_bytes(contenido)
    archivos = [
        serie,
        serie.with_suffix(".manifest.json"),
        panel_alterado,
        expedientes,
        expedientes.with_suffix(".manifest.json"),
    ]
    corte, inventario = _contexto(tmp_path, archivos)
    with pytest.raises(ValueError, match="paneles no se reproducen"):
        verificar_cadena_analitica(corte, inventario, serie, panel_alterado, expedientes)


def test_cadena_rechaza_expediente_ajeno_al_inventario(tmp_path):
    serie, paneles, expedientes = _cadena(tmp_path)
    archivos = [serie, serie.with_suffix(".manifest.json"), paneles, expedientes]
    corte, inventario = _contexto(tmp_path, archivos)
    with pytest.raises(ValueError, match="Artefacto ausente"):
        verificar_cadena_analitica(corte, inventario, serie, paneles, expedientes)


def test_cadena_resuelve_rutas_relativas_desde_raiz_y_no_desde_cwd(tmp_path, monkeypatch):
    from app.modules.compromisos import cadena_analitica_corte_polis as cadena

    serie, paneles, expedientes = _cadena(tmp_path)
    archivos = [
        serie,
        serie.with_suffix(".manifest.json"),
        paneles,
        expedientes,
        expedientes.with_suffix(".manifest.json"),
    ]
    corte, inventario = _contexto(tmp_path, archivos, rutas_relativas=True)
    otro_directorio = tmp_path / "otro_directorio"
    otro_directorio.mkdir()
    monkeypatch.setattr(cadena, "RAIZ", tmp_path)
    monkeypatch.chdir(otro_directorio)
    assert verificar_cadena_analitica(corte, inventario, serie, paneles, expedientes).expedientes == 1
