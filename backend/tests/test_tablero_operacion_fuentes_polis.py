"""Contrato del tablero: un solo corte, trazabilidad y alertas sin promoción implícita."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.modules.compromisos.tablero_operacion_fuentes_polis import materializar_tablero


def _archivo(ruta: Path, datos: dict) -> Path:
    ruta.write_text(json.dumps(datos), encoding="utf-8")
    return ruta


def _insumos(tmp_path: Path) -> tuple[Path, Path, Path]:
    sha = "a" * 64
    fuente = {
        "fuente_clave": "medicina_homicidios",
        "version_id": "b" * 16,
        "sha256_contenido": "b" * 64,
        "filas": 2,
        "custodios": ["Medicina Legal"],
        "indicadores": ["homicidio"],
        "anios": ["2024", "2025"],
        "ultima_extraccion_utc": "2026-10-22T00:00:00+00:00",
        "licencia": "por_verificar",
        "estado_promocion": "pendiente_validacion",
    }
    inventario = _archivo(
        tmp_path / "inventario.json",
        {
            "esquema": "polis.inventario_fuentes.v1",
            "generado_utc": "2026-10-22T01:00:00+00:00",
            "corte_consolidado_sha256": sha,
            "fuentes_clave": 1,
            "artefactos": 3,
            "fuentes": [fuente],
        },
    )
    evaluacion = _archivo(
        tmp_path / "evaluacion.json",
        {
            "esquema": "polis.evaluacion_estructural.v1",
            "consolidado_sha256": sha,
            "evaluacion": {"estado": "ambar", "filas_tipadas": 2, "problemas": {"licencia": 1}},
            "validacion_fuentes": {
                "fuentes_evaluadas": 1,
                "resultados": [
                    {
                        "fuente_clave": "medicina_homicidios",
                        "filas": 2,
                        "estado": "validado_estructural",
                        "problemas": [],
                    }
                ],
            },
        },
    )
    plan = _archivo(
        tmp_path / "plan.json",
        {
            "esquema": "polis.plan_actualizacion.v1",
            "inventario_sha256_consolidado": sha,
            "fuentes": [
                {
                    "fuente_clave": "medicina_homicidios",
                    "version_id": "b" * 16,
                    "estado_revision": "espera_entrega_manual",
                    "proxima_revision_utc": None,
                    "modo": "manual",
                    "responsable_rol": "custodio",
                }
            ],
        },
    )
    return inventario, evaluacion, plan


def test_tablero_alerta_frescura_licencia_y_promocion_sin_inventar_aprobacion(tmp_path: Path) -> None:
    inventario, evaluacion, plan = _insumos(tmp_path)
    destino = tmp_path / "salidas"
    primero = materializar_tablero(inventario, evaluacion, plan, destino)
    segundo = materializar_tablero(inventario, evaluacion, plan, destino)
    assert primero == segundo
    resultado = json.loads((destino / f"{primero['sha256']}.json").read_text())
    assert resultado["estado_publicacion"] == "no_publicable"
    assert resultado["resumen"]["fuentes_con_alerta"] == 1
    assert resultado["fuentes"][0]["alertas"] == [
        "frescura:espera_entrega_manual",
        "licencia_por_verificar",
        "promocion:pendiente_validacion",
    ]


def test_tablero_rechaza_cortes_y_versiones_mezcladas(tmp_path: Path) -> None:
    inventario, evaluacion, plan = _insumos(tmp_path)
    datos = json.loads(plan.read_text())
    datos["inventario_sha256_consolidado"] = "c" * 64
    _archivo(plan, datos)
    with pytest.raises(ValueError, match="cortes distintos"):
        materializar_tablero(inventario, evaluacion, plan, tmp_path / "salidas")
    datos["inventario_sha256_consolidado"] = "a" * 64
    datos["fuentes"][0]["version_id"] = "z" * 16
    _archivo(plan, datos)
    with pytest.raises(ValueError, match="versión"):
        materializar_tablero(inventario, evaluacion, plan, tmp_path / "salidas")


def test_tablero_muestra_ipc_transversal_sin_sumarlo_a_indicadores(tmp_path: Path) -> None:
    inventario, evaluacion, plan = _insumos(tmp_path)
    datos = json.loads(plan.read_text())
    datos["fuentes_transversales"] = [
        {
            "fuente_clave": "dane_ipc_nacional_serie_empalmada",
            "estado_revision": "revision_en_plazo",
            "licencia": "por_verificar",
            "alerta": True,
        }
    ]
    _archivo(plan, datos)
    salida = materializar_tablero(inventario, evaluacion, plan, tmp_path / "salidas")
    tablero = json.loads((tmp_path / "salidas" / f"{salida['sha256']}.json").read_text())
    assert tablero["resumen"]["fuentes"] == 1
    assert tablero["resumen"]["fuentes_transversales"] == 1
    assert tablero["resumen"]["fuentes_transversales_con_alerta"] == 1
    assert tablero["fuentes_transversales"][0]["fuente_clave"] == "dane_ipc_nacional_serie_empalmada"
