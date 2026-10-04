import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TipoActorLiteral = Literal[
    "institucional",
    "comunitario",
    "sociedad_civil",
    "gremial_privado",
    "academia",
    "poblacional_diferencial",
    "cooperacion_internacional",
]

NivelPoderLiteral = Literal["alto", "medio", "bajo"]
NivelInteresLiteral = Literal["alto", "medio", "bajo"]
PosturaActorLiteral = Literal[
    "promotor_aliado",
    "neutral_expectante",
    "critico_opositor",
    "vulnerable_reclamante",
]
TerritorioActorLiteral = Literal[
    "distrital",
    "localidad_1",
    "localidad_2",
    "localidad_3",
    "rural_insular",
]


class ContactoActor(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    organizacion: str = Field(..., min_length=1, max_length=200)
    cargo: str = Field(default="Representante / Vocero", max_length=150)
    nombre_lider: str | None = Field(default=None, max_length=150)
    telefono: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=150)
    direccion: str | None = Field(default=None, max_length=250)


class ActorEstrategicoBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    codigo: str = Field(..., min_length=1, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=255)
    tipo: TipoActorLiteral = Field(default="comunitario")
    territorio: TerritorioActorLiteral = Field(default="distrital")
    barrio_vereda: str | None = Field(default=None, max_length=150)
    dimensiones_principales: list[str] = Field(default_factory=list)
    nivel_poder: NivelPoderLiteral = Field(default="medio")
    nivel_interes: NivelInteresLiteral = Field(default="alto")
    postura: PosturaActorLiteral = Field(default="neutral_expectante")
    contacto: dict[str, Any] = Field(default_factory=dict)
    mesas_asistidas: list[str] = Field(default_factory=list)
    propuestas_radicadas: int = Field(default=0, ge=0)
    expectativas_principales: str = Field(default="")
    acciones_involucramiento: str = Field(default="")
    es_demostracion: bool = Field(default=False)


class ActorEstrategicoCrear(ActorEstrategicoBase):
    pass


class ActorEstrategicoActualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    tipo: TipoActorLiteral | None = None
    territorio: TerritorioActorLiteral | None = None
    barrio_vereda: str | None = None
    dimensiones_principales: list[str] | None = None
    nivel_poder: NivelPoderLiteral | None = None
    nivel_interes: NivelInteresLiteral | None = None
    postura: PosturaActorLiteral | None = None
    contacto: dict[str, Any] | None = None
    mesas_asistidas: list[str] | None = None
    propuestas_radicadas: int | None = Field(default=None, ge=0)
    expectativas_principales: str | None = None
    acciones_involucramiento: str | None = None
    es_demostracion: bool | None = None


class ActorEstrategicoRespuesta(ActorEstrategicoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime


class KpisActoresRespuesta(BaseModel):
    total_actores: int
    por_tipo: dict[str, int]
    por_territorio: dict[str, int]
    por_postura: dict[str, int]
    actores_demostracion: int
