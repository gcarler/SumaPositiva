"""Muestra estratificada e inmutable para auditar vínculos PDD/PDL–PA–BPIM."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from collections.abc import Iterable
from pathlib import Path
from typing import Any

TIPOS = frozenset(
    {
        "EXACTO_CODIGO_META",
        "EXACTO_BPIM_PROYECTO",
        "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS",
        "VINCULO_SECTORIAL_INFERIDO",
        "SIN_VINCULO_HUERFANO",
    }
)
DECISIONES_REVISION = TIPOS | {"SIN_EVIDENCIA_DOCUMENTAL"}
REVIEW_FIELDS = ("vinculo_id", "corpus_sha256", "revisor_id", "decision", "justificacion", "evidencia")
ADJUDICATION_FIELDS = ("vinculo_id", "corpus_sha256", "adjudicador_id", "decision", "justificacion", "evidencia")
CAMPOS = (
    "vinculo_id",
    "codigo_plan",
    "meta_id",
    "codigo_meta",
    "actividad_pa_id",
    "registro_triada_id",
    "codigo_bpim",
    "tipo_vinculo",
    "score_confianza",
    "fuente_meta",
    "fila_fuente_meta",
    "hoja_origen_triada",
    "fila_origen_triada",
    "documento_evidencia",
    "pagina_evidencia",
    "fila_sha256",
    "snapshot_sha256",
)


def _normalizar(row: dict[str, Any]) -> dict[str, Any]:
    evidencia = row.get("evidencia_cruce") or {}
    if not isinstance(evidencia, dict):
        raise ValueError("evidencia_cruce debe ser un objeto")
    result = {
        "vinculo_id": str(row["id"]),
        "codigo_plan": str(row["codigo_plan"]),
        "meta_id": str(row["meta_id"]),
        "codigo_meta": str(row.get("codigo_meta") or ""),
        "actividad_pa_id": str(row.get("actividad_pa_id") or ""),
        "registro_triada_id": str(row.get("registro_triada_id") or ""),
        "codigo_bpim": str(row.get("codigo_bpim") or ""),
        "tipo_vinculo": str(row["tipo_vinculo"]),
        "score_confianza": str(row["score_confianza"]) if row.get("score_confianza") is not None else "",
        "fuente_meta": str(evidencia.get("fuente_meta") or ""),
        "fila_fuente_meta": str(evidencia.get("fila_fuente_meta") or ""),
        "hoja_origen_triada": str(evidencia.get("hoja_origen_triada") or ""),
        "fila_origen_triada": str(evidencia.get("fila_origen_triada") or ""),
        "documento_evidencia": str(evidencia.get("documento_evidencia") or ""),
        "pagina_evidencia": str(evidencia.get("pagina_evidencia") or ""),
    }
    if result["tipo_vinculo"] not in TIPOS or not result["vinculo_id"]:
        raise ValueError("Vínculo sin identidad o tipo canónico")
    return result


def preparar_corpus(
    rows: Iterable[dict[str, Any]], *, por_estrato: int = 10
) -> tuple[list[dict[str, str]], dict[str, Any]]:
    """Muestra hasta N por plan/tipo; conserva todos los vínculos exactos escasos."""
    if por_estrato < 1:
        raise ValueError("por_estrato debe ser positivo")
    normalizadas = [_normalizar(row) for row in rows]
    ids = [row["vinculo_id"] for row in normalizadas]
    if len(ids) != len(set(ids)):
        raise ValueError("Vínculos duplicados en la instantánea")
    for row in normalizadas:
        payload = json.dumps(row, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
        row["fila_sha256"] = hashlib.sha256(payload).hexdigest()
    snapshot = hashlib.sha256("\n".join(sorted(row["fila_sha256"] for row in normalizadas)).encode()).hexdigest()
    estratos: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in normalizadas:
        row["snapshot_sha256"] = snapshot
        estratos[row["codigo_plan"], row["tipo_vinculo"]].append(row)
    muestra: list[dict[str, str]] = []
    for key in sorted(estratos):
        candidatas = sorted(estratos[key], key=lambda row: row["fila_sha256"])
        limite = len(candidatas) if key[1].startswith("EXACTO_") else por_estrato
        muestra.extend(candidatas[:limite])
    muestra.sort(key=lambda row: (row["codigo_plan"], row["tipo_vinculo"], row["vinculo_id"]))
    conteos = Counter(row["tipo_vinculo"] for row in normalizadas)
    resumen = {
        "esquema": "polis.corpus_revision_vinculos.v1",
        "snapshot_sha256": snapshot,
        "total_vinculos": len(normalizadas),
        "muestra": len(muestra),
        "planes": sorted({row["codigo_plan"] for row in normalizadas}),
        "conteos_por_tipo": dict(sorted(conteos.items())),
        "estratos": len(estratos),
        "sin_documento_y_pagina_en_muestra": sum(
            not (row["documento_evidencia"] and row["pagina_evidencia"]) for row in muestra
        ),
        "criterio_muestra": f"SHA-256 ascendente, hasta {por_estrato} por plan/tipo; exactos completos",
    }
    return muestra, resumen


def escribir_corpus(rows: Iterable[dict[str, Any]], destino: Path, *, por_estrato: int = 10) -> dict[str, Any]:
    """Escribe corpus y manifiesto una sola vez; no modifica una muestra ya abierta."""
    muestra, resumen = preparar_corpus(rows, por_estrato=por_estrato)
    destino.mkdir(parents=True, exist_ok=True)
    corpus = destino / "corpus_vinculos.csv"
    manifiesto = destino / "manifiesto.json"
    if corpus.exists() or manifiesto.exists():
        raise FileExistsError("El corpus ya existe; una nueva instantánea requiere otro directorio")
    with corpus.open("x", encoding="utf-8", newline="") as salida:
        escritor = csv.DictWriter(salida, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(muestra)
    resumen["corpus_sha256"] = hashlib.sha256(corpus.read_bytes()).hexdigest()
    manifiesto.write_text(json.dumps(resumen, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return resumen


def _leer_corpus(destino: Path) -> tuple[dict[str, dict[str, str]], str]:
    corpus = destino / "corpus_vinculos.csv"
    manifiesto = json.loads((destino / "manifiesto.json").read_text(encoding="utf-8"))
    sha = hashlib.sha256(corpus.read_bytes()).hexdigest()
    if manifiesto.get("corpus_sha256") != sha or manifiesto.get("esquema") != "polis.corpus_revision_vinculos.v1":
        raise ValueError("Corpus o manifiesto alterado")
    with corpus.open(encoding="utf-8", newline="") as entrada:
        lector = csv.DictReader(entrada)
        if lector.fieldnames != list(CAMPOS):
            raise ValueError("Columnas del corpus alteradas")
        filas = list(lector)
    ids = [fila["vinculo_id"] for fila in filas]
    if len(filas) != manifiesto["muestra"] or len(ids) != len(set(ids)):
        raise ValueError("Cobertura o identidad del corpus alterada")
    if any(fila["snapshot_sha256"] != manifiesto["snapshot_sha256"] for fila in filas):
        raise ValueError("Instantánea de vínculos incompatible")
    return {fila["vinculo_id"]: fila for fila in filas}, sha


def crear_plantillas_revision(destino: Path) -> dict[str, Path]:
    """Separa a dos revisores y a un tercero sin precargar el tipo sugerido."""
    corpus, sha = _leer_corpus(destino)
    if any((destino / f"{nombre}.csv").exists() for nombre in ("revisor_1", "revisor_2", "adjudicacion")):
        raise FileExistsError("Ya existe al menos una revisión; no se sobrescribe")
    resultado: dict[str, Path] = {}
    for nombre, campos in (
        ("revisor_1", REVIEW_FIELDS),
        ("revisor_2", REVIEW_FIELDS),
        ("adjudicacion", ADJUDICATION_FIELDS),
    ):
        ruta = destino / f"{nombre}.csv"
        with ruta.open("x", encoding="utf-8", newline="") as salida:
            escritor = csv.DictWriter(salida, fieldnames=campos)
            escritor.writeheader()
            for vinculo_id in sorted(corpus):
                escritor.writerow({"vinculo_id": vinculo_id, "corpus_sha256": sha})
        resultado[nombre] = ruta
    return resultado


def _leer_revision(
    ruta: Path, corpus: dict[str, dict[str, str]], sha: str, *, adjudicacion: bool = False
) -> tuple[dict[str, dict[str, str]], str | None]:
    campos = ADJUDICATION_FIELDS if adjudicacion else REVIEW_FIELDS
    actor = "adjudicador_id" if adjudicacion else "revisor_id"
    with ruta.open(encoding="utf-8", newline="") as entrada:
        lector = csv.DictReader(entrada)
        if lector.fieldnames != list(campos):
            raise ValueError(f"Columnas de revisión incompatibles: {ruta.name}")
        filas = list(lector)
    if any(None in fila or any(valor is None for valor in fila.values()) for fila in filas):
        raise ValueError(f"Fila con columnas sobrantes o faltantes: {ruta.name}")
    decisiones: dict[str, dict[str, str]] = {}
    actores: set[str] = set()
    vistos: set[str] = set()
    for fila in filas:
        identificador = fila["vinculo_id"]
        if identificador not in corpus or identificador in vistos or fila["corpus_sha256"] != sha:
            raise ValueError(f"Vínculo duplicado/desconocido o SHA distinto: {ruta.name}")
        vistos.add(identificador)
        valores = [fila.get(campo) for campo in (actor, "decision", "justificacion", "evidencia")]
        if any(valores):
            if not all(valor and valor.strip() for valor in valores):
                raise ValueError(f"Decisión parcial: {ruta.name}:{identificador}")
            if fila["decision"] not in DECISIONES_REVISION:
                raise ValueError(f"Decisión ajena a la taxonomía: {ruta.name}:{identificador}")
            actores.add(fila[actor].strip())
            decisiones[identificador] = fila
    if vistos != set(corpus) or len(actores) > 1:
        raise ValueError(f"Cobertura o identidad de revisor inconsistente: {ruta.name}")
    return decisiones, next(iter(actores), None)


def evaluar_revisiones_vinculos(destino: Path) -> dict[str, Any]:
    """Retiene precisión hasta dos revisiones completas y adjudicación de desacuerdos."""
    corpus, sha = _leer_corpus(destino)
    primera, actor_1 = _leer_revision(destino / "revisor_1.csv", corpus, sha)
    segunda, actor_2 = _leer_revision(destino / "revisor_2.csv", corpus, sha)
    tercera, adjudicador = _leer_revision(destino / "adjudicacion.csv", corpus, sha, adjudicacion=True)
    if actor_1 and actor_2 and actor_1 == actor_2:
        raise ValueError("Las revisiones deben pertenecer a personas distintas")
    desacuerdos = {
        key for key in primera.keys() & segunda.keys() if primera[key]["decision"] != segunda[key]["decision"]
    }
    if tercera.keys() - desacuerdos or (adjudicador and adjudicador in {actor_1, actor_2}):
        raise ValueError("Adjudicación fuera de desacuerdo o por un revisor previo")
    resumen: dict[str, Any] = {
        "corpus_sha256": sha,
        "vinculos": len(corpus),
        "revisor_1_completados": len(primera),
        "revisor_2_completados": len(segunda),
        "desacuerdos": len(desacuerdos),
        "adjudicados": len(tercera),
        "estado": "pendiente_revisiones",
        "acuerdo": None,
        "precision_por_tipo": None,
    }
    if len(primera) != len(corpus) or len(segunda) != len(corpus):
        return resumen
    if tercera.keys() != desacuerdos:
        resumen["estado"] = "pendiente_adjudicacion"
        return resumen
    referencia = {key: tercera[key]["decision"] if key in tercera else primera[key]["decision"] for key in corpus}
    aciertos = Counter()
    predichos = Counter()
    for key, row in corpus.items():
        tipo = row["tipo_vinculo"]
        predichos[tipo] += 1
        aciertos[tipo] += referencia[key] == tipo
    resumen.update(
        estado="listo_para_revision_experta",
        acuerdo=(len(corpus) - len(desacuerdos)) / len(corpus),
        precision_por_tipo={
            tipo: {
                "muestra": predichos[tipo],
                "correctos": aciertos[tipo],
                "precision": aciertos[tipo] / predichos[tipo],
            }
            for tipo in sorted(predichos)
        },
    )
    return resumen
