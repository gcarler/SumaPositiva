"""Instantánea operativa del banco; separa validación estructural de aprobación."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from app.modules.compromisos.series_7d_polis import RAIZ, _escribir_inmutable

DESTINO = RAIZ / "data/capas_analiticas/tablero_operacion_fuentes"


def _cargar(ruta: Path) -> tuple[dict[str, Any], str]:
    contenido = ruta.read_bytes()
    datos = json.loads(contenido)
    if not isinstance(datos, dict):
        raise ValueError(f"El artefacto no es un objeto JSON: {ruta.name}")
    return datos, hashlib.sha256(contenido).hexdigest()


def _claves_unicas(filas: list[dict[str, Any]], nombre: str) -> dict[str, dict[str, Any]]:
    por_clave = {fila["fuente_clave"]: fila for fila in filas}
    if len(por_clave) != len(filas):
        raise ValueError(f"Hay claves de fuente repetidas en {nombre}")
    return por_clave


def materializar_tablero(
    inventario: Path,
    evaluacion: Path,
    plan_actualizacion: Path,
    destino: Path = DESTINO,
) -> dict[str, Any]:
    """Genera un tablero reproducible del corte local, siempre no publicable."""
    inv, inv_sha = _cargar(inventario)
    ev, ev_sha = _cargar(evaluacion)
    plan, plan_sha = _cargar(plan_actualizacion)
    if (
        inv.get("esquema") != "polis.inventario_fuentes.v1"
        or ev.get("esquema") != "polis.evaluacion_estructural.v1"
        or plan.get("esquema") != "polis.plan_actualizacion.v1"
    ):
        raise ValueError("Esquema incompatible para el tablero operativo")
    corte = inv["corte_consolidado_sha256"]
    if corte != ev.get("consolidado_sha256") or corte != plan.get("inventario_sha256_consolidado"):
        raise ValueError("Inventario, evaluación y plan de actualización pertenecen a cortes distintos")
    fuentes = _claves_unicas(inv["fuentes"], "inventario")
    actualizaciones = _claves_unicas(plan["fuentes"], "plan de actualización")
    validaciones = _claves_unicas(ev["validacion_fuentes"]["resultados"], "validación estructural")
    if set(fuentes) != set(actualizaciones) or set(fuentes) != set(validaciones):
        raise ValueError("Las fuentes del corte no coinciden entre artefactos")
    if len(fuentes) != inv["fuentes_clave"] or len(fuentes) != ev["validacion_fuentes"]["fuentes_evaluadas"]:
        raise ValueError("El recuento de fuentes del corte es inconsistente")
    transversales = plan.get("fuentes_transversales", [])
    if len({fuente["fuente_clave"] for fuente in transversales}) != len(transversales):
        raise ValueError("Hay fuentes transversales repetidas")
    if any(fuente["fuente_clave"] in fuentes for fuente in transversales):
        raise ValueError("Una fuente transversal aparece duplicada como indicador 7D")
    fecha_corte = datetime.fromisoformat(inv["generado_utc"])
    if fecha_corte.tzinfo is None:
        raise ValueError("La fecha del inventario debe incluir zona horaria")

    fichas = []
    for clave in sorted(fuentes):
        fuente, agenda, validacion = fuentes[clave], actualizaciones[clave], validaciones[clave]
        if fuente["version_id"] != agenda["version_id"] or fuente["filas"] != validacion["filas"]:
            raise ValueError(f"La versión o el número de filas de {clave} discrepa")
        alertas = []
        if agenda["estado_revision"] != "revision_en_plazo":
            alertas.append(f"frescura:{agenda['estado_revision']}")
        if validacion["estado"] != "validado_estructural":
            alertas.append(f"estructura:{validacion['estado']}")
        if fuente["licencia"] == "por_verificar":
            alertas.append("licencia_por_verificar")
        if fuente["estado_promocion"] != "aprobada":
            alertas.append(f"promocion:{fuente['estado_promocion']}")
        fichas.append(
            {
                "fuente_clave": clave,
                "version_id": fuente["version_id"],
                "sha256_contenido": fuente["sha256_contenido"],
                "filas": fuente["filas"],
                "custodios_declarados": fuente["custodios"],
                "indicadores": fuente["indicadores"],
                "anios": fuente["anios"],
                "ultima_extraccion_utc": fuente["ultima_extraccion_utc"],
                "proxima_revision_utc": agenda["proxima_revision_utc"],
                "estado_revision": agenda["estado_revision"],
                "modo_actualizacion": agenda["modo"],
                "responsable_rol": agenda["responsable_rol"],
                "estado_estructural": validacion["estado"],
                "problemas_estructurales": validacion["problemas"],
                "licencia": fuente["licencia"],
                "estado_promocion": fuente["estado_promocion"],
                "alertas": alertas,
            }
        )
    motivos = Counter(alerta for ficha in fichas for alerta in ficha["alertas"])
    salida = {
        "esquema": "polis.tablero_operacion_fuentes.v1",
        "corte_consolidado_sha256": corte,
        "inventario_sha256": inv_sha,
        "evaluacion_sha256": ev_sha,
        "plan_actualizacion_sha256": plan_sha,
        "fecha_corte_utc": fecha_corte.isoformat(),
        "estado_calidad_global": ev["evaluacion"]["estado"],
        "problemas_globales": ev["evaluacion"]["problemas"],
        "estado_publicacion": "no_publicable",
        "resumen": {
            "fuentes": len(fichas),
            "artefactos": inv["artefactos"],
            "filas": ev["evaluacion"]["filas_tipadas"],
            "estados_revision": dict(sorted(Counter(f["estado_revision"] for f in fichas).items())),
            "estados_estructurales": dict(sorted(Counter(f["estado_estructural"] for f in fichas).items())),
            "motivos_alerta": dict(sorted(motivos.items())),
            "fuentes_con_alerta": sum(bool(f["alertas"]) for f in fichas),
            "fuentes_transversales": len(transversales),
            "fuentes_transversales_con_alerta": sum(bool(f["alerta"]) for f in transversales),
        },
        "fuentes": fichas,
        "fuentes_transversales": transversales,
        "limitacion": "La validación estructural no acredita custodia, licencia, comparabilidad ni publicación.",
    }
    contenido = (json.dumps(salida, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return {
        "ruta": ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta),
        "sha256": sha,
        "resumen": salida["resumen"],
        "estado_publicacion": "no_publicable",
    }
