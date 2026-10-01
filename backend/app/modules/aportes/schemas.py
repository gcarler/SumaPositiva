"""Esquemas Pydantic v2 para aportes ciudadanos con enfoque diferencial y territorio."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class MetadataEnfoqueDiferencial(BaseModel):
    """Metadatos de enfoque diferencial (Leyes 1448/11, 1618/13, 1622/13, AL 01/23)."""

    etnia: str | None = Field(
        default=None,
        description=(
            "Identificación étnica: indigena, afrocolombiano_negro, raizal, "
            "palenquero, rrom_gitano, mestizo_ninguno"
        ),
    )
    genero: str | None = Field(
        default=None,
        description="Identidad de género u orientación: mujer, hombre, lgbtiq+, no_binario, otro",
    )
    ciclo_vital: str | None = Field(
        default=None,
        description="Ciclo vital: primera_infancia, ninez, juventud, adultez, persona_mayor",
    )
    es_victima_conflicto: bool = Field(
        default=False,
        description="Víctima del conflicto armado interno según Ley 1448 de 2011",
    )
    hecho_victimizante: str | None = Field(
        default=None,
        description="Hecho victimizante principal (ej. desplazamiento forzado, despojo)",
    )
    situacion_discapacidad: bool = Field(
        default=False,
        description="Persona con discapacidad según Ley Estatutaria 1618 de 2013",
    )
    tipo_discapacidad: str | None = Field(
        default=None,
        description=(
            "Tipo de discapacidad: fisica, visual, auditiva, intelectual, psicosocial, multiple"
        ),
    )
    poblacion_campesina: bool = Field(
        default=False,
        description="Protección campesina conforme al Acto Legislativo 01 de 2023",
    )
    persona_cuidadora: bool = Field(
        default=False,
        description="Persona dedicada a labores de cuidado no remunerado (Sistema del Cuidado)",
    )
    organizacion_social: str | None = Field(
        default=None,
        max_length=250,
        description="Organización o colectivo de base comunitaria al que pertenece",
    )
    datos_adicionales: dict[str, Any] = Field(
        default_factory=dict,
        description="Campos adicionales abiertos del enfoque diferencial",
    )

    model_config = ConfigDict(extra="allow")


TipoAporteLiteral = Literal[
    "propuesta",
    "observacion",
    "alerta_comunitaria",
    "anotacion",
    "pregunta",
]

EstadoPropuestaLiteral = Literal[
    "borrador",
    "publicado",
    "en_revision",
    "incorporado",
    "rechazado",
]


class PropuestaCiudadanaBase(BaseModel):
    """Esquema base para propuestas y aportes ciudadanos."""

    linea_id: uuid.UUID = Field(
        ...,
        description="UUID de la línea estratégica asociada",
    )
    dimension_id: uuid.UUID | None = Field(
        default=None,
        description="UUID opcional de la dimensión de Seguridad Humana",
    )
    territorio_id: uuid.UUID | None = Field(
        default=None,
        description="UUID opcional del territorio distrital de anclaje",
    )
    tipo_aporte: TipoAporteLiteral = Field(
        default="propuesta",
        description="Tipo de aporte participativo",
    )
    titulo: str = Field(
        ...,
        min_length=3,
        max_length=300,
        description="Título sintético de la propuesta o alerta",
    )
    descripcion: str = Field(
        ...,
        min_length=5,
        description="Desarrollo detallado del aporte ciudadano",
    )
    autor_nombre: str = Field(
        default="Ciudadano Anónimo",
        max_length=150,
        description="Nombre o seudónimo del autor",
    )
    es_anonimo: bool = Field(
        default=True,
        description="Indica si la propuesta se publica anónimamente para proteger al ciudadano",
    )
    metadata_enfoque: MetadataEnfoqueDiferencial = Field(
        default_factory=MetadataEnfoqueDiferencial,
        description="Información de enfoque diferencial y poblacional",
    )
    archivos_adjuntos: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Lista de adjuntos o evidencias ciudadanas (fotos, audios, documentos)",
    )
    metadatos: dict[str, Any] = Field(
        default_factory=dict,
        description="Metadatos técnicos y contexto de captura (canal, mesa, taller)",
    )
    es_territorio_etnico: bool = Field(default=False)
    requiere_consulta_previa: bool = Field(default=False)
    ruta_etnica_diferenciada: bool = Field(default=False)
    consejo_comunitario: str | None = Field(default=None)


class PropuestaCiudadanaCreate(PropuestaCiudadanaBase):
    """Esquema para recepción y creación de propuestas ciudadanas."""

    estado: EstadoPropuestaLiteral = Field(
        default="publicado",
        description="Estado inicial de la propuesta",
    )


class PropuestaCiudadanaUpdate(BaseModel):
    """Esquema para actualización de propuestas ciudadanas."""

    titulo: str | None = Field(default=None, min_length=3, max_length=300)
    descripcion: str | None = Field(default=None, min_length=5)
    linea_id: uuid.UUID | None = None
    dimension_id: uuid.UUID | None = None
    territorio_id: uuid.UUID | None = None
    tipo_aporte: TipoAporteLiteral | None = None
    metadata_enfoque: MetadataEnfoqueDiferencial | None = None
    archivos_adjuntos: list[dict[str, Any]] | None = None
    estado: EstadoPropuestaLiteral | None = None
    activo: bool | None = None
    es_territorio_etnico: bool | None = None
    requiere_consulta_previa: bool | None = None
    ruta_etnica_diferenciada: bool | None = None
    consejo_comunitario: str | None = None
    metadatos: dict[str, Any] | None = None


class PropuestaCiudadanaRead(PropuestaCiudadanaBase):
    """Esquema de salida serializado para propuestas ciudadanas."""

    id: uuid.UUID
    sesion_id: uuid.UUID | None = Field(
        default=None, description="UUIDv7 de la sesión anónima originaria"
    )
    huella_hash: str | None = Field(
        default=None, description="Huella criptográfica de la sesión (Habeas Data)"
    )
    apoyos_contador: int = Field(default=0, description="Contador de respaldos ciudadanos")
    estado: str = Field(..., description="Estado actual de tramitación o devolución")
    activo: bool = Field(default=True, description="Bandera para soft-delete")
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class PropuestasPaginadasRead(BaseModel):
    """Estructura de paginación para listados de aportes ciudadanos."""

    total: int = Field(..., description="Total de registros que coinciden con los filtros")
    limite: int = Field(..., description="Cantidad máxima de elementos solicitados por página")
    desplazamiento: int = Field(..., description="Desplazamiento u offset aplicado")
    elementos: list[PropuestaCiudadanaRead] = Field(
        ..., description="Lista de aportes en la página actual"
    )
