"""Frecuencia y alertas de fuente sin atribuir publicaciones inexistentes."""

import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "scripts" / "planificar_actualizaciones_fuentes_polis.py"
    spec = importlib.util.spec_from_file_location("planificar_actualizaciones_fuentes_polis_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_43_fuentes_tienen_responsable_modo_y_estado():
    plan = _modulo().generar(datetime(2026, 10, 22, tzinfo=UTC))
    assert len(plan["fuentes"]) == 43
    assert all(fuente["responsable_rol"] and fuente["modo"] and fuente["estado_revision"] for fuente in plan["fuentes"])
    drive = [fuente for fuente in plan["fuentes"] if fuente["fuente_clave"].startswith("drive_")]
    assert drive and all(fuente["modo"] == "manual_al_recibir_version" for fuente in drive)
    assert all(fuente["estado_revision"] == "espera_entrega_manual" for fuente in drive)
    ipc = plan["fuentes_transversales"]
    assert len(ipc) == 1
    assert ipc[0]["fuente_clave"] == "dane_ipc_nacional_serie_empalmada"
    assert ipc[0]["estado_revision"] == "revision_en_plazo"
    assert ipc[0]["licencia"] == "por_verificar"
    assert ipc[0]["alerta"] is True


def test_solicitudes_pendientes_no_se_declaran_enviadas():
    ruta = Path(__file__).resolve().parents[2] / "data/banco_fuentes_oficiales/solicitudes_datos_pendientes_2026.json"
    solicitudes = json.loads(ruta.read_text())
    assert solicitudes["estado_global"] == "preparadas_no_enviadas"
    assert len(solicitudes["solicitudes"]) >= 10
    assert all(
        item["custodio"]
        and item["variables"]
        and item["nivel_territorial_requerido"]
        and item["canal_esperado"]
        and item["estado"] == "por_solicitar"
        for item in solicitudes["solicitudes"]
    )
