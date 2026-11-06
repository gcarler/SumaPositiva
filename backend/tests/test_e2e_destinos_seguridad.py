"""Las guardas del preparador E2E abortan antes de conectar o reconstruir una base."""

from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path

import pytest


@pytest.fixture
def preparador():
    ruta = Path(__file__).resolve().parents[2] / "scripts/preparar_entorno_e2e.py"
    spec = importlib.util.spec_from_file_location("preparador_e2e_aislamiento", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_configuracion_local_explicita_es_valida(preparador):
    preparador.validar_destinos_e2e(
        "127.0.0.1", 5433, "polis_pruebas", "polis_test_destino", "polis_test_plantilla", "fixture"
    )


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("DB_HOST", "servidor-remoto"),
        ("DB_PORT", 5432),
        ("DB_PORT", 0),
        ("DB_USER", "rol; SQL"),
        ("TARGET_DB", "bd_csh"),
        ("TEMPLATE_DB", "bd_csh"),
        ("TARGET_DB", "polis_test_x; DROP DATABASE polis"),
        ("TARGET_DB", ""),
        ("TEMPLATE_DB", ""),
        ("DB_PASS", None),
    ],
)
def test_destino_inseguro_aborta_antes_de_conectar(preparador, monkeypatch, campo, valor):
    for nombre, dato in {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": 5433,
        "DB_USER": "polis_pruebas",
        "TARGET_DB": "polis_test_destino",
        "TEMPLATE_DB": "polis_test_plantilla",
        "DB_PASS": "fixture",
    }.items():
        monkeypatch.setattr(preparador, nombre, dato)
    monkeypatch.setattr(preparador, campo, valor)
    conexiones = []

    async def conexion_prohibida(*args, **kwargs):
        conexiones.append(True)
        raise AssertionError("La guarda debe abortar antes de conectar")

    monkeypatch.setattr(preparador.asyncpg, "connect", conexion_prohibida)
    with pytest.raises(ValueError):
        asyncio.run(preparador.preparar_bd_y_usuarios())
    assert not conexiones


def test_no_permite_reconstruir_su_propia_plantilla(preparador):
    with pytest.raises(ValueError, match="distinta"):
        preparador.validar_destinos_e2e("localhost", 5433, "polis", "polis_test_misma", "polis_test_misma", "fixture")
