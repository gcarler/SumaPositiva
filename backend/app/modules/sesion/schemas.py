"""Esquemas Pydantic v2 para sesión anónima, firma digital y contratos de autenticación."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SesionAnonimaRespuesta(BaseModel):
    """Respuesta contractual para la emisión de sesión anónima firmada."""

    token_acceso: str = Field(
        ...,
        description="Token JWT firmado con HMAC-SHA256 para autenticar la sesión cívica",
    )
    tipo_token: str = Field(
        default="Bearer",
        description="Esquema de autenticación HTTP estándar",
    )
    expira_en_segundos: int = Field(
        ...,
        description="Tiempo de vida restante de la sesión en segundos",
    )
    sesion_id: uuid.UUID = Field(
        ...,
        description="Identificador universal único de la sesión (UUIDv7)",
    )
    huella_hash: str = Field(
        ...,
        description="Huella criptográfica no reversible de la IP con salt (Ley 1581/2012)",
    )
    rol: str = Field(
        default="ciudadano_anonimo",
        description="Rol base asignado para la participación deliberativa",
    )


class SesionContexto(BaseModel):
    """Contexto de seguridad extraído de un token firmado válido."""

    sesion_id: uuid.UUID = Field(
        ...,
        description="UUIDv7 de la sesión anónima",
    )
    huella_hash: str = Field(
        ...,
        description="Huella criptográfica verificada de la conexión",
    )
    rol: str = Field(
        default="ciudadano_anonimo",
        description="Rol activo del participante",
    )
    expira_en: datetime = Field(
        ...,
        description="Marca temporal de expiración de la sesión",
    )
    es_anonimo: bool = Field(
        default=True,
        description="Indica si la sesión opera bajo anonimato protegido",
    )

    model_config = ConfigDict(from_attributes=True)


class SesionAnonimaPayload(BaseModel):
    """Estructura interna del payload firmado en el JWT."""

    sub: str = Field(default="sesion_anonima", description="Sujeto del token")
    sesion_id: str = Field(..., description="UUIDv7 de la sesión")
    huella_hash: str = Field(..., description="Hash no reversible con salt")
    rol: str = Field(default="ciudadano_anonimo", description="Rol del usuario")
    iat: int = Field(..., description="Timestamp de emisión (Issued At)")
    exp: int = Field(..., description="Timestamp de expiración")
