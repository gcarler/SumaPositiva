"""Corte canónico versionado e idempotente, sin promover datos parciales."""

import hashlib
import json

import pytest

from scripts.normalizar_observaciones_polis import materializar


def test_materializa_2340_filas_con_version_y_sin_publicacion(tmp_path):
    primera = materializar(tmp_path)
    segunda = materializar(tmp_path)
    assert primera == segunda
    assert primera["filas"] == 2340
    assert primera["estado_publicacion"] == "no_publicable"
    assert primera["calidad_estructural"]["estado"] == "ambar"
    archivo = tmp_path / f"{primera['salida_sha256']}.jsonl"
    assert hashlib.sha256(archivo.read_bytes()).hexdigest() == primera["salida_sha256"]
    assert json.loads((tmp_path / f"{primera['salida_sha256']}.manifest.json").read_text()) == primera
    filas = [json.loads(linea) for linea in archivo.read_text().splitlines()]
    assert len(filas) == 2340
    assert all(fila["estado_publicacion"] == "no_publicable" for fila in filas)
    assert all(len(fila["version_sha256"]) == 64 for fila in filas)
    assert all(fila["adaptador_sha256"] == primera["adaptador_sha256"] for fila in filas)
    assert any(fila["clasificacion_7d"]["estado"] == "sin_clasificar" for fila in filas)


def test_artefacto_existente_alterado_detiene_repeticion(tmp_path):
    resultado = materializar(tmp_path)
    archivo = tmp_path / f"{resultado['salida_sha256']}.jsonl"
    archivo.write_text("alterado")
    with pytest.raises(ValueError, match="alterado"):
        materializar(tmp_path)
