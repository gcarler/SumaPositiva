"""Fan-out LangGraph de integridad por fuente antes de aceptar un banco staged."""

from __future__ import annotations

import csv
import hashlib
import json
import operator
from collections import Counter
from pathlib import Path
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

MAX_CONCURRENCIA_FUENTES = 3


class EstadoValidacionFuentes(TypedDict, total=False):
    consolidado_path: str
    fuentes: list[dict[str, Any]]
    fuente: dict[str, Any]
    resultados: Annotated[list[dict[str, Any]], operator.add]
    resumen: dict[str, Any]


def _validar_fuente(state: EstadoValidacionFuentes) -> dict[str, Any]:
    fuente = state["fuente"]
    clave = fuente["fuente_clave"]
    ruta = Path(state["consolidado_path"])
    try:
        with ruta.open(encoding="utf-8", newline="") as archivo:
            filas = [fila for fila in csv.DictReader(archivo) if fila["fuente_clave"] == clave]
        contenido = [
            json.dumps(
                {campo: valor for campo, valor in fila.items() if campo != "fecha_extraccion"},
                ensure_ascii=False,
                sort_keys=True,
            )
            for fila in filas
        ]
        sha = hashlib.sha256("\n".join(sorted(contenido)).encode()).hexdigest()
        problemas = []
        if len(filas) != fuente["filas"]:
            problemas.append("conteo_discrepante")
        if sha != fuente["sha256_contenido"]:
            problemas.append("version_discrepante")
        if fuente["version_id"] != fuente["sha256_contenido"][:16]:
            problemas.append("id_version_discrepante")
        estado = "cuarentena" if problemas else "sin_insumo" if not filas else "validado_estructural"
    except (OSError, KeyError, TypeError, ValueError) as exc:
        problemas = [f"lectura_o_contrato_invalido:{type(exc).__name__}"]
        estado = "cuarentena"
        filas = []
    return {
        "resultados": [
            {
                "fuente_clave": clave,
                "estado": estado,
                "filas": len(filas),
                "problemas": problemas,
            }
        ]
    }


def _despachar(state: EstadoValidacionFuentes) -> list[Send]:
    return [
        Send("validar_fuente", {"fuente": fuente, "consolidado_path": state["consolidado_path"]})
        for fuente in state["fuentes"]
    ]


def _unir(state: EstadoValidacionFuentes) -> dict[str, Any]:
    resultados = sorted(state["resultados"], key=lambda item: item["fuente_clave"])
    conteos = Counter(item["estado"] for item in resultados)
    return {
        "resumen": {
            "fuentes_esperadas": len(state["fuentes"]),
            "fuentes_evaluadas": len(resultados),
            "estados": dict(sorted(conteos.items())),
            "resultados": resultados,
        }
    }


def _grafo():
    graph = StateGraph(EstadoValidacionFuentes)
    graph.add_node("validar_fuente", _validar_fuente)
    graph.add_node("unir", _unir)
    graph.add_conditional_edges(START, _despachar, ["validar_fuente"])
    graph.add_edge("validar_fuente", "unir")
    graph.add_edge("unir", END)
    return graph.compile()


async def validar_fuentes_en_grafo(
    consolidado: Path, fuentes: list[dict], max_concurrencia: int = MAX_CONCURRENCIA_FUENTES
) -> dict:
    """Valida cada versión sin poner filas en el estado ni aprobar publicación."""
    if not fuentes or max_concurrencia < 1:
        raise ValueError("Se requiere al menos una fuente y concurrencia positiva")
    claves = [fuente["fuente_clave"] for fuente in fuentes]
    if len(claves) != len(set(claves)):
        raise ValueError("Fuentes duplicadas en el inventario")
    resultado = await _grafo().ainvoke(
        {"consolidado_path": str(consolidado), "fuentes": fuentes, "resultados": []},
        config={"max_concurrency": max_concurrencia},
    )
    resumen = resultado["resumen"]
    if resumen["fuentes_evaluadas"] != len(fuentes):
        raise ValueError("El join no evaluó todas las fuentes")
    return resumen
