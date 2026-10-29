"""Los vínculos meta→programa son candidatos revisables, nunca acreditaciones automáticas."""

from __future__ import annotations

import json

import pytest

from app.modules.compromisos.candidatos_programa_meta_polis import (
    clasificar_vinculos_programa,
    escribir_corpus_programa_meta,
)


def _programa(id: str, codigo: str, nombre: str):
    return {"id": id, "codigo_plan": "PDD_2013_2015", "nivel": "PROGRAMA", "codigo": codigo, "nombre": nombre}


def _meta(id: str, codigo: str | None, nombre: str | None, linea_id: str | None = None):
    return {
        "id": id,
        "codigo_plan": "PDD_2013_2015",
        "codigo": f"M-{id}",
        "nombre": f"Meta {id}",
        "programa_codigo": codigo,
        "programa_nombre": nombre,
        "linea_id": linea_id,
    }


def test_clasificacion_distingue_codigo_nombre_ambiguedad_y_enlace_existente():
    programas = [
        _programa("p1", "7.1.1", "Salud Pública"),
        _programa("p2", "7.2.1", "Prevención"),
        _programa("p3", "7.2.1", "Convivencia"),
    ]
    metas = [
        _meta("m1", "7.1.1", "Salud Publica"),
        _meta("m2", "7.1.1", None),
        _meta("m3", "7.1.1", "Otro programa"),
        _meta("m4", "7.2.1", "Convivencia"),
        _meta("m5", "7.2.1", None),
        _meta("m6", "9.9.9", "Ausente"),
        _meta("m7", None, None),
        _meta("m8", "7.1.1", "Salud Pública", linea_id="otra-linea"),
        _meta("m9", "7.1.1", "Salud Pública", linea_id="p1"),
        {**_meta("m10", "7.1.1", "Salud Pública", linea_id="subprograma"), "programa_ancestro_id": "p1"},
    ]
    resultado = {item["meta_id"]: item for item in clasificar_vinculos_programa(metas, programas)}
    assert resultado["m1"]["estado"] == "CANDIDATO_CODIGO_NOMBRE"
    assert resultado["m1"]["programa_id_candidato"] == "p1"
    assert resultado["m2"]["estado"] == "CANDIDATO_SOLO_CODIGO"
    assert resultado["m3"]["estado"] == "NOMBRE_DISCREPANTE"
    assert resultado["m3"]["programa_id_candidato"] is None
    assert resultado["m4"]["programa_id_candidato"] == "p3"
    assert resultado["m5"]["estado"] == "AMBIGUO_CODIGO_O_NOMBRE"
    assert resultado["m6"]["estado"] == "SIN_PROGRAMA_CON_ESE_CODIGO"
    assert resultado["m7"]["estado"] == "SIN_CODIGO_PROGRAMA"
    assert resultado["m8"]["estado"] == "ENLACE_EXISTENTE_DIFERENTE"
    assert resultado["m9"]["estado"] == "ENLACE_EXISTENTE_COINCIDE"
    assert resultado["m10"]["estado"] == "ENLACE_EXISTENTE_COINCIDE"
    assert resultado["m10"]["programa_ancestro_actual"] == "p1"
    assert all(item["estado_acreditacion"] == "PENDIENTE_REVISION_DOCUMENTAL" for item in resultado.values())


def test_corpus_versiona_snapshot_y_rechaza_identidad_duplicada(tmp_path):
    metas = [_meta("m1", "7.1.1", "Salud Pública")]
    programas = [_programa("p1", "7.1.1", "Salud Pública")]
    primero = escribir_corpus_programa_meta(metas, programas, tmp_path)
    assert escribir_corpus_programa_meta(metas, programas, tmp_path) == primero
    assert primero["conteos_estado"] == {"CANDIDATO_CODIGO_NOMBRE": 1}
    assert json.load(open(primero["ruta_manifiesto"]))["estado_publicacion"] == "no_publicable"
    with pytest.raises(ValueError, match="Meta duplicada"):
        escribir_corpus_programa_meta(metas * 2, programas, tmp_path)
