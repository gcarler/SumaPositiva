"""Congela las referencias de un corte sin copiar observaciones al estado LangGraph."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class ReferenciaVersionFuente(BaseModel):
    fuente_clave: str = Field(min_length=1)
    version_id: str = Field(min_length=1)
    sha256_contenido: str = Field(pattern=r"^[0-9a-f]{64}$")


class ManifiestoCorteDatos(BaseModel):
    esquema: Literal["polis.corte_datos.v1"] = "polis.corte_datos.v1"
    run_id: uuid.UUID
    inventario_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    evaluacion_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    consolidado_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    estado_calidad: Literal["verde", "ambar", "rojo"]
    estado_publicacion: Literal["publicable", "no_publicable"]
    artefactos_inventariados: int = Field(ge=0)
    versiones: list[ReferenciaVersionFuente]


def _leer_json_y_sha(ruta: Path) -> tuple[dict, str]:
    contenido = ruta.read_bytes()
    paquete = json.loads(contenido)
    if not isinstance(paquete, dict):
        raise ValueError(f"El artefacto no es un objeto JSON: {ruta.name}")
    return paquete, hashlib.sha256(contenido).hexdigest()


def construir_manifiesto_corte(
    inventario: Path,
    evaluacion: Path,
    destino: Path,
    run_id: uuid.UUID,
    resumen_fuentes: dict | None = None,
) -> tuple[Path, str]:
    """Escribe una vez por run_id; un contenido distinto exige otro identificador."""
    datos, inventario_sha = _leer_json_y_sha(inventario)
    calidad, evaluacion_sha = _leer_json_y_sha(evaluacion)
    if datos.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Inventario con esquema desconocido")
    if calidad.get("esquema") != "polis.evaluacion_estructural.v1":
        raise ValueError("Evaluación con esquema desconocido")
    consolidado_sha = datos.get("corte_consolidado_sha256")
    if consolidado_sha != calidad.get("consolidado_sha256"):
        raise ValueError("Inventario y evaluación pertenecen a cortes distintos")
    versiones = sorted(
        (
            ReferenciaVersionFuente.model_validate(
                {
                    "fuente_clave": fuente["fuente_clave"],
                    "version_id": fuente["version_id"],
                    "sha256_contenido": fuente["sha256_contenido"],
                }
            )
            for fuente in datos["fuentes"]
        ),
        key=lambda fuente: fuente.fuente_clave,
    )
    claves = [fuente.fuente_clave for fuente in versiones]
    if len(claves) != len(set(claves)) or len(claves) != datos.get("fuentes_clave"):
        raise ValueError("El inventario contiene claves de fuente duplicadas o faltantes")
    manifiesto = ManifiestoCorteDatos(
        run_id=run_id,
        inventario_sha256=inventario_sha,
        evaluacion_sha256=evaluacion_sha,
        consolidado_sha256=consolidado_sha,
        estado_calidad=calidad["evaluacion"]["estado"],
        estado_publicacion=calidad["estado_publicacion"],
        artefactos_inventariados=datos["artefactos"],
        versiones=versiones,
    )
    if resumen_fuentes is not None:
        verificar_resumen_fuentes(manifiesto, resumen_fuentes)
    contenido = (
        json.dumps(manifiesto.model_dump(mode="json"), ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode()
    sha = hashlib.sha256(contenido).hexdigest()
    ruta = destino / f"{run_id}.json"
    destino.mkdir(parents=True, exist_ok=True)
    try:
        with ruta.open("xb") as salida:
            salida.write(contenido)
    except FileExistsError:
        if ruta.read_bytes() != contenido:
            raise ValueError("El run_id ya tiene un manifiesto de corte distinto") from None
    return ruta, sha


def verificar_resumen_fuentes(manifiesto: ManifiestoCorteDatos, resumen: dict) -> None:
    """Comprueba que la captura reportada corresponde al corte completo."""
    if any(
        (
            manifiesto.consolidado_sha256 != resumen.get("consolidado_sha256"),
            manifiesto.estado_calidad != resumen.get("estado_calidad"),
            manifiesto.estado_publicacion != resumen.get("estado_publicacion"),
        )
    ):
        raise ValueError("El manifiesto no corresponde al resultado de la etapa de fuentes")


def verificar_manifiesto_corte(ruta: Path, sha256: str, run_id: uuid.UUID) -> ManifiestoCorteDatos:
    contenido = ruta.read_bytes()
    if hashlib.sha256(contenido).hexdigest() != sha256:
        raise ValueError("Hash del manifiesto de corte discrepante")
    manifiesto = ManifiestoCorteDatos.model_validate_json(contenido)
    if manifiesto.run_id != run_id:
        raise ValueError("run_id del manifiesto de corte discrepante")
    return manifiesto
