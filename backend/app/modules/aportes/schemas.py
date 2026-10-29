"""Esquemas Pydantic v2 para aportes ciudadanos con enfoque diferencial y territorio."""

import re
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, field_validator


def proyectar_metadatos_publicos(datos: Any) -> dict[str, Any]:
    """Contrato público cerrado; los diccionarios originales permanecen privados."""
    if not isinstance(datos, dict):
        return {}
    publico: dict[str, Any] = {}
    if isinstance(datos.get("canal"), str) and datos["canal"] in {"web", "whatsapp", "mesa", "taller", "presencial"}:
        publico["canal"] = datos["canal"]
    if isinstance(datos.get("tipo_mensaje"), str) and datos["tipo_mensaje"] in {"text", "audio", "image", "document"}:
        publico["tipo_mensaje"] = datos["tipo_mensaje"]
    return publico


class MetadataEnfoqueDiferencial(BaseModel):
    """Metadatos de enfoque diferencial (Leyes 1448/11, 1618/13, 1622/13, AL 01/23)."""

    etnia: str | None = Field(
        default=None,
        description=(
            "Identificación étnica: indigena, afrocolombiano_negro, raizal, palenquero, rrom_gitano, mestizo_ninguno"
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
        description=("Tipo de discapacidad: fisica, visual, auditiva, intelectual, psicosocial, multiple"),
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


_CAMPOS_ENFOQUE_PUBLICO = {
    clave: TypeAdapter(campo.rebuild_annotation())
    for clave, campo in MetadataEnfoqueDiferencial.model_fields.items()
    if clave != "datos_adicionales"
}


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

    estado: Literal["borrador", "publicado"] = Field(
        default="publicado",
        description="Alta ciudadana: borrador o publicado; las decisiones institucionales requieren gestión",
    )
    correo_contacto: str | None = Field(
        default=None,
        max_length=255,
        description="Correo electrónico opcional de contacto para recibir constancia oficial de radicación",
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
    codigo_radicado: str = Field(
        ...,
        description="Código oficial único de radicación distrital (ej. POL-2026-0001)",
    )
    apoyos_contador: int = Field(default=0, description="Contador de respaldos ciudadanos")
    estado: str = Field(..., description="Estado actual de tramitación o devolución")
    activo: bool = Field(default=True, description="Bandera para soft-delete")
    territorio_nombre: str | None = Field(default=None, description="Nombre del territorio asociado")
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("metadatos", mode="before")
    @classmethod
    def metadatos_publicos(cls, value: Any) -> dict[str, Any]:
        return proyectar_metadatos_publicos(value)

    @field_validator("metadata_enfoque", mode="before")
    @classmethod
    def enfoque_publico(cls, value: Any) -> dict[str, Any]:
        datos = value.model_dump() if isinstance(value, BaseModel) else value
        if not isinstance(datos, dict):
            return {}
        publico = {}
        for clave, adaptador in _CAMPOS_ENFOQUE_PUBLICO.items():
            if clave not in datos:
                continue
            try:
                contenido = adaptador.validate_python(datos[clave], strict=True)
            except ValidationError:
                # Omitir lo no utilizable conserva los defaults técnicos del contrato;
                # no convierte el JSON legado ni afirma una condición demográfica.
                continue
            if isinstance(contenido, str) and ("@" in contenido or re.search(r"(?:\d[\s()+.-]*){7}", contenido)):
                continue
            publico[clave] = contenido
        return publico

    @field_validator("archivos_adjuntos", mode="before")
    @classmethod
    def adjuntos_publicos(cls, value: Any) -> list[dict[str, Any]]:
        publico = []
        for adjunto in value if isinstance(value, list) else []:
            if not isinstance(adjunto, dict):
                continue
            try:
                evidencia_id = uuid.UUID(str(adjunto.get("evidencia_id") or adjunto.get("id")))
            except (ValueError, TypeError):
                continue
            publico.append({"evidencia_id": str(evidencia_id)})
        return publico


class PropuestasPaginadasRead(BaseModel):
    """Estructura de paginación para listados de aportes ciudadanos."""

    total: int = Field(..., description="Total de registros que coinciden con los filtros")
    limite: int = Field(..., description="Cantidad máxima de elementos solicitados por página")
    desplazamiento: int = Field(..., description="Desplazamiento u offset aplicado")
    elementos: list[PropuestaCiudadanaRead] = Field(..., description="Lista de aportes en la página actual")


class RespuestaToggleApoyo(BaseModel):
    """Respuesta para la alternancia de respaldo cívico a una propuesta."""

    propuesta_id: uuid.UUID = Field(..., description="ID de la propuesta respaldada o des-apoyada")
    apoyado: bool = Field(..., description="True si la sesión apoya la propuesta, False si retiró su apoyo")
    apoyos_contador: int = Field(..., description="Contador consolidado de apoyos tras la operación")
    mensaje: str = Field(..., description="Mensaje explicativo de la acción realizada")


class MisApoyosRespuesta(BaseModel):
    """Listado de propuestas respaldadas por la sesión actual."""

    propuestas_apoyadas: list[uuid.UUID] = Field(
        default_factory=list,
        description="Lista de UUIDs de propuestas que la sesión actual ha respaldado",
    )
