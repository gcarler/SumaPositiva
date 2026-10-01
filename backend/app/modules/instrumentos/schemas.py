from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoInstrumentoLiteral = Literal["ARBOL_PROBLEMAS", "ARBOL_OBJETIVOS"]
EstadoInstrumentoLiteral = Literal["EN_CONSTRUCCION", "VALIDADO", "CONVERTIDO", "APROBADO"]
TipoNodoLiteral = Literal[
    "PROBLEMA_CENTRAL",
    "CAUSA_DIRECTA",
    "CAUSA_INDIRECTA",
    "EFECTO_DIRECTO",
    "EFECTO_INDIRECTO",
    "OBJETIVO_CENTRAL",
    "MEDIO_DIRECTO",
    "MEDIO_INDIRECTO",
    "FIN_DIRECTO",
    "FIN_INDIRECTO",
]
TipoRelacionLiteral = Literal["CENTRAL", "CAUSA", "EFECTO", "MEDIO", "FIN"]


class InstrumentoBase(BaseModel):
    tipo_instrumento: TipoInstrumentoLiteral
    nombre: str
    descripcion: str | None = None
    mesa_id: uuid.UUID | None = None
    linea_id: uuid.UUID | None = None
    estado: EstadoInstrumentoLiteral = "EN_CONSTRUCCION"
    metadatos: dict[str, Any] = Field(default_factory=dict)


class InstrumentoCrear(InstrumentoBase):
    pass


class InstrumentoActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    estado: EstadoInstrumentoLiteral | None = None
    metadatos: dict[str, Any] | None = None


class InstrumentoRespuesta(InstrumentoBase):
    id: uuid.UUID
    instrumento_origen_id: uuid.UUID | None = None
    creado_en: datetime
    actualizado_en: datetime
    version_seq: int = 1

    model_config = ConfigDict(from_attributes=True)


class NodoInstrumentoCrear(BaseModel):
    tipo_nodo: TipoNodoLiteral
    contenido: str
    nodo_padre_id: uuid.UUID | None = None
    tipo_relacion: TipoRelacionLiteral | None = None
    nivel: int | None = None
    orden: int = 0
    metadatos: dict[str, Any] = Field(default_factory=dict)


class NodoInstrumentoActualizar(BaseModel):
    contenido: str | None = None
    tipo_nodo: TipoNodoLiteral | None = None
    nodo_padre_id: uuid.UUID | None = None
    orden: int | None = None
    metadatos: dict[str, Any] | None = None
    version_esperada: int | None = None
    version_seq: int | None = None


class NodoInstrumentoRespuesta(BaseModel):
    id: uuid.UUID
    instrumento_id: uuid.UUID
    nodo_padre_id: uuid.UUID | None = None
    tipo_nodo: str
    tipo_relacion: str
    nivel: int
    orden: int
    contenido: str
    nodo_origen_id: uuid.UUID | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)
    creado_en: datetime
    actualizado_en: datetime
    version_seq: int = 1
    etag: str | None = None

    model_config = ConfigDict(from_attributes=True)


class NodoArbolJerarquico(BaseModel):
    id: uuid.UUID
    tipo_nodo: str
    tipo_relacion: str
    nivel: int
    orden: int
    contenido: str
    nodo_padre_id: uuid.UUID | None = None
    nodo_origen_id: uuid.UUID | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)
    hijos: list[NodoArbolJerarquico] = Field(default_factory=list)
    version_seq: int = 1
    etag: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ArbolSerializado(BaseModel):
    instrumento: InstrumentoRespuesta
    nodo_central: NodoArbolJerarquico | None = None
    causas_o_medios: list[NodoArbolJerarquico] = Field(default_factory=list)
    efectos_o_fines: list[NodoArbolJerarquico] = Field(default_factory=list)
    total_nodos: int = 0


class ConversionObjetivosPeticion(BaseModel):
    nombre_objetivos: str | None = None
    modificaciones_manuales: dict[str, str] = Field(default_factory=dict)
