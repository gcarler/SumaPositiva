"""Valida un corpus 7D con dos revisiones independientes y adjudicación trazable."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

from app.modules.compromisos.taxonomia_7d_polis import DIMENSIONES, VERSION

DECISIONES = frozenset(DIMENSIONES) | {
    "respuesta_publica",
    "total_multidimensional",
    "no_medible_con_esta_fuente",
    "sin_clasificar",
}
REVIEW_FIELDS = ("grupo_id", "corpus_sha256", "revisor_id", "decision", "justificacion", "evidencia")
ADJUDICATION_FIELDS = ("grupo_id", "corpus_sha256", "adjudicador_id", "decision", "justificacion", "evidencia")


def _filas_csv(path: Path, campos: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as archivo:
        lector = csv.DictReader(archivo)
        if lector.fieldnames != list(campos):
            raise ValueError(f"Columnas incompatibles: {path.name}")
        filas = list(lector)
    if any(None in fila or any(valor is None for valor in fila.values()) for fila in filas):
        raise ValueError(f"Columnas extra en {path.name}")
    return filas


def cargar_corpus(corpus: Path, inventario: Path) -> tuple[dict[str, dict[str, str]], str]:
    """Comprueba identidad de grupos, corte, versiones y ausencia de anotaciones embebidas."""
    inventario_datos = json.loads(inventario.read_text(encoding="utf-8"))
    versiones = {fuente["fuente_clave"]: fuente["sha256_contenido"] for fuente in inventario_datos["fuentes"]}
    corte_sha = inventario_datos["corte_consolidado_sha256"]
    corpus_sha = hashlib.sha256(corpus.read_bytes()).hexdigest()
    with corpus.open(encoding="utf-8", newline="") as archivo:
        filas = list(csv.DictReader(archivo))
    if not filas:
        raise ValueError("Corpus vacío")
    grupos: dict[str, dict[str, str]] = {}
    for fila in filas:
        clave = (
            fila["fuente_clave"],
            fila["indicador"],
            fila["subtipo"],
            fila["unidad_original"],
            fila["ambito_original"],
        )
        grupo_id = hashlib.sha256(json.dumps(clave, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()[
            :20
        ]
        if fila["grupo_id"] != grupo_id or grupo_id in grupos:
            raise ValueError("Grupo duplicado o identificador alterado")
        if fila["taxonomia_version"] != VERSION or fila["consolidado_sha256"] != corte_sha:
            raise ValueError("Corpus y corte/taxonomía incompatibles")
        if versiones.get(fila["fuente_clave"]) != fila["fuente_version_sha256"]:
            raise ValueError("Versión de fuente incompatible con el corpus")
        if int(fila["filas"]) < 1 or not fila["url_fuente"]:
            raise ValueError("Grupo sin observaciones o sin procedencia")
        if any(valor for campo, valor in fila.items() if campo.startswith(("revisor_", "adjudicacion_"))):
            raise ValueError("El corpus base debe permanecer sin anotaciones")
        grupos[grupo_id] = fila
    return grupos, corpus_sha


def crear_plantillas(corpus: Path, inventario: Path, destino: Path) -> dict[str, Path]:
    """Emite copias separadas sin reemplazar revisiones ya existentes."""
    grupos, corpus_sha = cargar_corpus(corpus, inventario)
    destino.mkdir(parents=True, exist_ok=True)
    resultado: dict[str, Path] = {}
    if any((destino / f"{nombre}.csv").exists() for nombre in ("revisor_1", "revisor_2", "adjudicacion")):
        raise FileExistsError("Ya existe al menos una revisión; no se sobrescribe")
    for nombre, campos in (
        ("revisor_1", REVIEW_FIELDS),
        ("revisor_2", REVIEW_FIELDS),
        ("adjudicacion", ADJUDICATION_FIELDS),
    ):
        ruta = destino / f"{nombre}.csv"
        with ruta.open("x", encoding="utf-8", newline="") as archivo:
            escritor = csv.DictWriter(archivo, fieldnames=campos)
            escritor.writeheader()
            for grupo_id in sorted(grupos):
                escritor.writerow({"grupo_id": grupo_id, "corpus_sha256": corpus_sha})
        resultado[nombre] = ruta
    return resultado


def _leer_decisiones(
    path: Path, grupos: dict[str, dict[str, str]], corpus_sha: str, *, adjudicacion: bool = False
) -> tuple[dict[str, dict[str, str]], str | None]:
    campos = ADJUDICATION_FIELDS if adjudicacion else REVIEW_FIELDS
    actor = "adjudicador_id" if adjudicacion else "revisor_id"
    filas = _filas_csv(path, campos)
    decisiones: dict[str, dict[str, str]] = {}
    actores: set[str] = set()
    vistos: set[str] = set()
    for fila in filas:
        grupo_id = fila["grupo_id"]
        if grupo_id not in grupos or grupo_id in vistos or fila["corpus_sha256"] != corpus_sha:
            raise ValueError(f"Grupo duplicado/desconocido o SHA de corpus distinto: {path.name}")
        vistos.add(grupo_id)
        valores = (fila[actor], fila["decision"], fila["justificacion"], fila["evidencia"])
        if any(valores):
            if not all(valor.strip() for valor in valores):
                raise ValueError(f"Decisión parcial: {path.name}:{grupo_id}")
            if fila["decision"] not in DECISIONES:
                raise ValueError(f"Decisión desconocida: {path.name}:{grupo_id}")
            actores.add(fila[actor].strip())
            decisiones[grupo_id] = fila
    if vistos != set(grupos):
        raise ValueError(f"Cobertura de grupos incompleta: {path.name}")
    if len(actores) > 1:
        raise ValueError(f"Un archivo contiene varios revisores: {path.name}")
    return decisiones, next(iter(actores), None)


def evaluar_revisiones(
    corpus: Path, inventario: Path, revisor_1: Path, revisor_2: Path, adjudicacion: Path
) -> dict[str, Any]:
    """No emite precisión hasta tener doble revisión y resolver desacuerdos."""
    grupos, corpus_sha = cargar_corpus(corpus, inventario)
    primera, actor_1 = _leer_decisiones(revisor_1, grupos, corpus_sha)
    segunda, actor_2 = _leer_decisiones(revisor_2, grupos, corpus_sha)
    adjudicadas, adjudicador = _leer_decisiones(adjudicacion, grupos, corpus_sha, adjudicacion=True)
    if actor_1 and actor_2 and actor_1 == actor_2:
        raise ValueError("Las dos revisiones deben pertenecer a personas distintas")
    comunes = set(primera) & set(segunda)
    desacuerdos = sorted(
        grupo_id for grupo_id in comunes if primera[grupo_id]["decision"] != segunda[grupo_id]["decision"]
    )
    desacuerdos_por_par = Counter(
        " | ".join(sorted((primera[grupo_id]["decision"], segunda[grupo_id]["decision"]))) for grupo_id in desacuerdos
    )
    if any(grupo_id not in desacuerdos for grupo_id in adjudicadas):
        raise ValueError("Solo se adjudican desacuerdos de dos revisiones completas")
    if adjudicador and adjudicador in {actor_1, actor_2}:
        raise ValueError("La adjudicación de un desacuerdo exige una tercera persona")
    pesos = {grupo_id: int(fila["filas"]) for grupo_id, fila in grupos.items()}
    salida: dict[str, Any] = {
        "taxonomia_version": VERSION,
        "corpus_sha256": corpus_sha,
        "grupos": len(grupos),
        "observaciones": sum(pesos.values()),
        "revisor_1_completados": len(primera),
        "revisor_2_completados": len(segunda),
        "desacuerdos_identificados": len(desacuerdos),
        "desacuerdos_por_par_de_categorias": dict(sorted(desacuerdos_por_par.items())),
        "desacuerdos_adjudicados": len(adjudicadas),
        "estado": "pendiente_revisiones",
        "acuerdo": None,
        "precision_por_categoria": None,
    }
    if len(primera) != len(grupos) or len(segunda) != len(grupos):
        return salida
    if set(desacuerdos) != set(adjudicadas):
        salida["estado"] = "pendiente_adjudicacion"
        return salida
    referencia = {
        grupo_id: adjudicadas[grupo_id]["decision"] if grupo_id in adjudicadas else primera[grupo_id]["decision"]
        for grupo_id in grupos
    }
    coincidencias = len(grupos) - len(desacuerdos)
    peso_coincidente = sum(pesos[grupo_id] for grupo_id in grupos if grupo_id not in desacuerdos)
    precision: dict[str, dict[str, dict[str, float | int | None]]] = {}
    for nombre, decisiones in (("revisor_1", primera), ("revisor_2", segunda)):
        por_categoria: dict[str, dict[str, float | int | None]] = {}
        tp: Counter[str] = Counter()
        predichos: Counter[str] = Counter()
        for grupo_id, fila in decisiones.items():
            etiqueta = fila["decision"]
            predichos[etiqueta] += 1
            if etiqueta == referencia[grupo_id]:
                tp[etiqueta] += 1
        for etiqueta in sorted(DECISIONES):
            por_categoria[etiqueta] = {
                "predichos": predichos[etiqueta],
                "correctos": tp[etiqueta],
                "precision": tp[etiqueta] / predichos[etiqueta] if predichos[etiqueta] else None,
            }
        precision[nombre] = por_categoria
    salida.update(
        estado="listo_para_revision_experta",
        acuerdo={
            "grupos": coincidencias / len(grupos),
            "observaciones_ponderadas": peso_coincidente / sum(pesos.values()),
        },
        precision_por_categoria=precision,
    )
    return salida
