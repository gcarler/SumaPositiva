"""Puerta estructural del banco staged antes de sustituir la versión activa."""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from app.modules.compromisos.contratos_observacion_polis import evaluar_lote
from app.modules.compromisos.grafo_validacion_fuentes_polis import validar_fuentes_en_grafo

NOMBRE_CONSOLIDADO = "indicadores_consolidados_cartagena_2026.csv"
NOMBRE_INVENTARIO = "inventario_pipeline_2026.json"
NOMBRE_RESULTADO = "evaluacion_estructural_2026.json"


def validar(banco: Path) -> dict:
    inventario = json.loads((banco / NOMBRE_INVENTARIO).read_text(encoding="utf-8"))
    consolidado = banco / NOMBRE_CONSOLIDADO
    sha = hashlib.sha256(consolidado.read_bytes()).hexdigest()
    if sha != inventario["corte_consolidado_sha256"]:
        raise ValueError("El consolidado de staging cambió después de inventariarse")
    with consolidado.open(encoding="utf-8", newline="") as archivo:
        filas = list(csv.DictReader(archivo))
    versiones = {fuente["fuente_clave"]: fuente["sha256_contenido"] for fuente in inventario["fuentes"]}
    conteos = Counter(fila["fuente_clave"] for fila in filas)
    if conteos != Counter({fuente["fuente_clave"]: fuente["filas"] for fuente in inventario["fuentes"]}):
        raise ValueError("Las filas por fuente no coinciden con el inventario")
    validacion_fuentes = asyncio.run(validar_fuentes_en_grafo(consolidado, inventario["fuentes"]))
    cuarentena = [item["fuente_clave"] for item in validacion_fuentes["resultados"] if item["estado"] == "cuarentena"]
    if cuarentena:
        raise ValueError(f"Versiones de fuente inconsistentes: {', '.join(cuarentena)}")
    calidad = evaluar_lote(filas, versiones)
    sin_insumo = validacion_fuentes["estados"].get("sin_insumo", 0)
    if sin_insumo:
        calidad["problemas"]["fuente_sin_insumo"] = sin_insumo
        calidad["estado"] = "ambar"
    if calidad["estado"] == "rojo":
        raise ValueError(f"Lote rojo: {calidad['problemas']}")
    resultado = {
        "esquema": "polis.evaluacion_estructural.v1",
        "consolidado_sha256": sha,
        "evaluacion": calidad,
        "validacion_fuentes": validacion_fuentes,
        "estado_publicacion": "no_publicable",
        "regla": "Ámbar permite conservar una captura; no aprueba fuente, licencia ni publicación.",
    }
    (banco / NOMBRE_RESULTADO).write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return resultado


def main() -> None:
    parser = argparse.ArgumentParser(description="Valida banco staged antes de promoción local")
    parser.add_argument("banco", type=Path)
    args = parser.parse_args()
    print(json.dumps(validar(args.banco), ensure_ascii=False))


if __name__ == "__main__":
    main()
