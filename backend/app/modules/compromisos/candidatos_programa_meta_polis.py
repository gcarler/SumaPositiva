"""Propone vínculos meta→programa por código y nombre sin acreditarlos ni escribir SQL."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.modules.compromisos.series_7d_polis import _escribir_inmutable

ESTADO_PENDIENTE = "PENDIENTE_REVISION_DOCUMENTAL"


def _normalizar(valor: Any) -> str:
    ascii_texto = unicodedata.normalize("NFKD", str(valor or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", ascii_texto).strip()


def _jsonl(filas: list[dict[str, Any]]) -> bytes:
    return (
        "\n".join(json.dumps(fila, ensure_ascii=False, sort_keys=True, default=str) for fila in filas) + "\n"
    ).encode()


def clasificar_vinculos_programa(metas: list[dict[str, Any]], programas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Solo un código único o un código+nombre únicos genera candidato revisable."""
    indice: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for programa in programas:
        if programa["nivel"] == "PROGRAMA" and _normalizar(programa.get("codigo")):
            indice[(programa["codigo_plan"], _normalizar(programa["codigo"]))].append(programa)
    resultado = []
    for meta in metas:
        codigo = _normalizar(meta.get("programa_codigo"))
        nombre = _normalizar(meta.get("programa_nombre"))
        iniciales = indice.get((meta["codigo_plan"], codigo), []) if codigo else []
        candidatos = iniciales
        if len(iniciales) > 1 and nombre:
            candidatos = [programa for programa in iniciales if _normalizar(programa["nombre"]) == nombre]
        unico = candidatos[0] if len(candidatos) == 1 else None
        programa_actual = meta.get("programa_ancestro_id") or meta.get("linea_id")
        if not codigo:
            estado = "SIN_CODIGO_PROGRAMA"
        elif not iniciales:
            estado = "SIN_PROGRAMA_CON_ESE_CODIGO"
        elif len(iniciales) == 1 and nombre and _normalizar(iniciales[0]["nombre"]) != nombre:
            estado = "NOMBRE_DISCREPANTE"
            unico = None
        elif unico is None:
            estado = "AMBIGUO_CODIGO_O_NOMBRE"
        elif programa_actual and str(programa_actual) != str(unico["id"]):
            estado = "ENLACE_EXISTENTE_DIFERENTE"
        elif meta.get("linea_id"):
            estado = "ENLACE_EXISTENTE_COINCIDE"
        elif nombre:
            estado = "CANDIDATO_CODIGO_NOMBRE"
        else:
            estado = "CANDIDATO_SOLO_CODIGO"
        resultado.append(
            {
                "meta_id": str(meta["id"]),
                "codigo_plan": meta["codigo_plan"],
                "meta_nombre": meta["nombre"],
                "meta_codigo": meta.get("codigo"),
                "meta_fuente": meta.get("fuente"),
                "meta_pagina": meta.get("pagina_origen"),
                "linea_id_actual": str(meta["linea_id"]) if meta.get("linea_id") else None,
                "programa_ancestro_actual": meta.get("programa_ancestro_id"),
                "programa_codigo_declarado": meta.get("programa_codigo"),
                "programa_nombre_declarado": meta.get("programa_nombre"),
                "estado": estado,
                "programa_id_candidato": str(unico["id"]) if unico else None,
                "candidatos_por_codigo": len(iniciales),
                "candidatos_tras_nombre": len(candidatos),
                "programas_posibles": [
                    {
                        "id": str(programa["id"]),
                        "codigo": programa.get("codigo"),
                        "nombre": programa["nombre"],
                        "fuente": programa.get("fuente"),
                        "pagina": programa.get("pagina_origen"),
                    }
                    for programa in iniciales
                ],
                "estado_acreditacion": ESTADO_PENDIENTE,
            }
        )
    return resultado


def escribir_corpus_programa_meta(
    metas: list[dict[str, Any]], programas: list[dict[str, Any]], destino: Path, *, base_origen: str = "no_declarada"
) -> dict[str, Any]:
    """Versiona las dos instantáneas y el dictamen de candidaturas sin modificar relaciones."""
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", base_origen):
        raise ValueError("La base de origen debe ser un nombre, nunca una conexión ni credencial")
    if len({str(meta["id"]) for meta in metas}) != len(metas):
        raise ValueError("Meta duplicada en la instantánea SQL")
    if len({str(programa["id"]) for programa in programas}) != len(programas):
        raise ValueError("Programa duplicado en la instantánea SQL")
    metas = sorted(metas, key=lambda meta: str(meta["id"]))
    programas = sorted(programas, key=lambda programa: str(programa["id"]))
    candidatos = clasificar_vinculos_programa(metas, programas)
    destino.mkdir(parents=True, exist_ok=True)
    referencias = {}
    for nombre, filas in (("metas", metas), ("programas", programas), ("candidatos", candidatos)):
        contenido = _jsonl(filas)
        sha = hashlib.sha256(contenido).hexdigest()
        ruta = destino / f"{nombre}_{sha}.jsonl"
        _escribir_inmutable(ruta, contenido)
        referencias[nombre] = {"ruta": str(ruta), "sha256": sha, "filas": len(filas)}
    conteos = dict(sorted(Counter(item["estado"] for item in candidatos).items()))
    por_plan = {
        plan: dict(sorted(Counter(item["estado"] for item in candidatos if item["codigo_plan"] == plan).items()))
        for plan in sorted({item["codigo_plan"] for item in candidatos})
    }
    manifiesto = {
        "esquema": "polis.candidatos_programa_meta.v2",
        "base_origen": base_origen,
        "referencias": referencias,
        "conteos_estado": conteos,
        "conteos_por_plan": por_plan,
        "estado_publicacion": "no_publicable",
        "regla": "Candidatura sin acreditar: exige documento, página y revisión antes de persistir.",
    }
    contenido = (json.dumps(manifiesto, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    ruta = destino / f"manifiesto_{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return {**manifiesto, "ruta_manifiesto": str(ruta), "sha256_manifiesto": sha}
