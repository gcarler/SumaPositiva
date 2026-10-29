"""Catálogo PDD completo, inmutable y verificable para las tools de metas y nodos."""

from __future__ import annotations

import hashlib
import json
import uuid
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

from .contexto_corte_polis import ContextoCorte
from .matriz_correspondencias_corte_polis import MatrizDelCorte
from .series_7d_polis import RAIZ, _escribir_inmutable


class FilaCatalogo(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NodoPlaneacion(FilaCatalogo):
    id: uuid.UUID
    codigo_plan: str
    parent_id: uuid.UUID | None
    nivel: str
    codigo: str | None
    nombre: str
    orden: int
    ppi_anual_cop: dict[str, JsonValue]
    fuente: str | None
    metadatos: dict[str, JsonValue]


class MetaPlaneacion(FilaCatalogo):
    id: uuid.UUID
    codigo_plan: str
    linea_id: uuid.UUID | None
    tipo_meta: str
    codigo: str | None
    nombre: str
    indicador: str | None
    unidad_medida: str | None
    linea_nombre: str | None
    fuente: str | None
    fila_fuente: int | None
    datos_oficiales: dict[str, JsonValue]


class CoberturaPlan(FilaCatalogo):
    nodos: int = Field(ge=0)
    metas: int = Field(ge=0)


class CatalogoPlaneacion(FilaCatalogo):
    esquema: Literal["polis.catalogo_planeacion.v1"] = "polis.catalogo_planeacion.v1"
    base_origen: str = Field(min_length=1, pattern=r"^[a-zA-Z0-9_-]+$")
    aislamiento: Literal["REPEATABLE READ READ ONLY"] = "REPEATABLE READ READ ONLY"
    cobertura_sql: dict[str, CoberturaPlan]
    nodos: list[NodoPlaneacion]
    metas: list[MetaPlaneacion]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    alcance: Literal["CATALOGO_FORMULADO_NO_ACREDITA_EJECUCION_NI_CLASIFICACION_7D"] = (
        "CATALOGO_FORMULADO_NO_ACREDITA_EJECUCION_NI_CLASIFICACION_7D"
    )

    @model_validator(mode="after")
    def comprobar_integridad(self) -> Self:
        nodos = {n.id: n for n in self.nodos}
        if len(nodos) != len(self.nodos) or len({m.id for m in self.metas}) != len(self.metas):
            raise ValueError("Identidades duplicadas en catálogo")
        if not self.cobertura_sql:
            raise ValueError("Falta cobertura SQL de planes")
        for filas, campo in ((self.nodos, "nodos"), (self.metas, "metas")):
            observados = Counter(f.codigo_plan for f in filas)
            esperados = {p: getattr(c, campo) for p, c in self.cobertura_sql.items() if getattr(c, campo)}
            if dict(observados) != esperados:
                raise ValueError(f"Cobertura SQL discrepante: {campo}")
        for fila in [*self.nodos, *self.metas]:
            referencia = fila.parent_id if isinstance(fila, NodoPlaneacion) else fila.linea_id
            if referencia is not None and (
                referencia not in nodos or nodos[referencia].codigo_plan != fila.codigo_plan
            ):
                raise ValueError("Referencia jerárquica ausente o de otro plan")
        terminados: set[uuid.UUID] = set()
        for nodo in self.nodos:
            visitados: set[uuid.UUID] = set()
            actual: uuid.UUID | None = nodo.id
            while actual is not None and actual not in terminados:
                if actual in visitados:
                    raise ValueError("Ciclo en la jerarquía del catálogo")
                visitados.add(actual)
                actual = nodos[actual].parent_id
            terminados.update(visitados)
        return self


def escribir_catalogo(catalogo: CatalogoPlaneacion, destino: Path) -> tuple[Path, str]:
    catalogo = CatalogoPlaneacion.model_validate(catalogo.model_dump())
    datos = catalogo.model_dump(mode="json")
    for campo in ("nodos", "metas"):
        datos[campo].sort(key=lambda f: (f["codigo_plan"], f["id"]))
    contenido = (json.dumps(datos, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return ruta, sha


@dataclass(frozen=True)
class ReferenciaCatalogoPlaneacion:
    inventario: Path
    catalogo: Path

    def leer(self, contexto: ContextoCorte) -> CatalogoPlaneacion:
        corte = contexto.verificar()
        inventario = self.inventario if self.inventario.is_absolute() else RAIZ / self.inventario
        ruta = self.catalogo if self.catalogo.is_absolute() else RAIZ / self.catalogo
        contenido_inventario = inventario.read_bytes()
        if hashlib.sha256(contenido_inventario).hexdigest() != corte.inventario_sha256:
            raise ValueError("Inventario distinto al fijado por el corte")
        datos = json.loads(contenido_inventario)
        if datos.get("esquema") != "polis.inventario_fuentes.v1":
            raise ValueError("Esquema de inventario desconocido")
        contenido = ruta.read_bytes()
        sha = hashlib.sha256(contenido).hexdigest()
        if ruta.stem != sha:
            raise ValueError("Nombre o contenido de catálogo alterado")
        registrados = [
            f for f in datos["archivos"] if f["sha256"] == sha and (RAIZ / f["ruta"]).resolve() == ruta.resolve()
        ]
        if len(registrados) != 1:
            raise ValueError("El catálogo no está registrado en el inventario del corte")
        return CatalogoPlaneacion.model_validate_json(contenido)


def comprobar_matriz_y_catalogo(catalogo: CatalogoPlaneacion, matriz: MatrizDelCorte) -> None:
    """Un inventario común no basta para acreditar identidades entre dos capturas SQL."""
    if catalogo.base_origen != matriz.base_origen:
        raise ValueError("Matriz y catálogo proceden de bases distintas")
    metas = {m.id: m for m in catalogo.metas}
    nodos = {n.id: n for n in catalogo.nodos}
    if set(metas) != {f.meta_id for f in matriz.matriz.filas}:
        raise ValueError("Matriz y catálogo tienen universos de metas distintos")
    for fila in matriz.matriz.filas:
        meta = metas[fila.meta_id]
        if (meta.codigo_plan, meta.codigo, meta.nombre, meta.tipo_meta, meta.indicador) != (
            fila.codigo_plan,
            fila.codigo_meta,
            fila.nombre_meta,
            fila.tipo_meta,
            fila.indicador_meta,
        ):
            raise ValueError("Identidad de meta discrepante entre matriz y catálogo")
        nodo = nodos.get(meta.linea_id)
        if (nodo.nivel if nodo else None, nodo.nombre if nodo else None) != (
            fila.nodo_plan_nivel,
            fila.nodo_plan_nombre,
        ):
            raise ValueError("Nodo de meta discrepante entre matriz y catálogo")
        actual = nodo
        while actual is not None and actual.nivel != "PROGRAMA":
            actual = nodos.get(actual.parent_id)
        if (actual.id if actual else None, actual.nombre if actual else None) != (
            fila.programa_pdd_id,
            fila.programa_pdd_nombre,
        ):
            raise ValueError("Programa de meta discrepante entre matriz y catálogo")
