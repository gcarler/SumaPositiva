import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

NivelIdentidadLiteral = Literal["anonima", "declarada", "autenticada", "verificada"]


class UsuarioCreacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    correo: EmailStr = Field(..., description="Correo electrónico único del usuario")

    @field_validator("correo")
    @classmethod
    def normalizar_correo(cls, value: str) -> str:
        return value.strip().lower()

    contrasena: str = Field(..., min_length=8, max_length=72)

    @field_validator("contrasena")
    @classmethod
    def longitud_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña no puede exceder 72 bytes UTF-8")
        return value

    nombres: str = Field(..., max_length=100)
    apellidos: str = Field(..., max_length=100)
    metadatos: dict[str, Any] = Field(default_factory=dict)


class LoginPeticion(BaseModel):
    correo: EmailStr
    contrasena: str = Field(max_length=72)


class TokenRespuesta(BaseModel):
    token_acceso: str
    tipo_token: str = "Bearer"
    rol: str
    nivel_identidad: str
    permisos: list[str]
    expira_en: datetime
    usuario: "UsuarioLectura"
    mfa_requerido: bool = False
    token_desafio_mfa: str | None = None
    mfa_enrolamiento_requerido: bool = False


class UsuarioLectura(BaseModel):
    id: uuid.UUID
    rol_id: uuid.UUID
    correo: EmailStr
    nivel_identidad: str
    nombres: str
    apellidos: str
    activo: bool
    codigo_rol: str
    permisos: list[str]
    correo_verificado_en: datetime | None
    mfa_activo: bool = False

    model_config = ConfigDict(from_attributes=True)


class MfaEstadoLectura(BaseModel):
    activo: bool
    codigos_restantes: int
    activado_en: datetime | None
    exigido_por_rol: bool
    sesion_verificada: bool = False


class MfaIniciarRespuesta(BaseModel):
    secreto_b32: str
    otpauth_uri: str
    qr_code_base64: str


class MfaCodigoPeticion(BaseModel):
    codigo: str = Field(min_length=6, max_length=16)


class MfaActivarRespuesta(BaseModel):
    mensaje: str
    codigos_recuperacion: list[str]


class MfaDesactivarPeticion(BaseModel):
    contrasena: str = Field(max_length=72)
    codigo: str | None = Field(default=None, max_length=16)


class MfaVerificarPeticion(BaseModel):
    token_desafio: str = Field(min_length=32)
    codigo: str = Field(min_length=6, max_length=16)


class SujetoAutenticadoContexto(BaseModel):
    sujeto_id: uuid.UUID
    sesion_id: uuid.UUID | None = None
    rol: str
    nivel_identidad: NivelIdentidadLiteral
    permisos: list[str]
    es_anonimo: bool
    mfa_pendiente: bool = False
    mfa_verificada: bool = False


class MensajeRespuesta(BaseModel):
    mensaje: str


class CorreoPeticion(BaseModel):
    correo: EmailStr


class TokenPeticion(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class RecuperarContrasena(TokenPeticion):
    contrasena: str = Field(min_length=8, max_length=72)
    _validar = field_validator("contrasena")(UsuarioCreacion.longitud_bytes.__func__)


class CambiarContrasena(BaseModel):
    contrasena_actual: str = Field(max_length=72)
    contrasena: str = Field(min_length=8, max_length=72)
    _validar = field_validator("contrasena")(UsuarioCreacion.longitud_bytes.__func__)


class PerfilEdicion(BaseModel):
    nombres: str = Field(min_length=1, max_length=100)
    apellidos: str = Field(min_length=1, max_length=100)


class UsuarioAdministrado(PerfilEdicion):
    codigo_rol: str = Field(max_length=50)
    activo: bool
    motivo: str = Field(min_length=10, max_length=500)


class UsuarioAltaAdministrativa(UsuarioCreacion):
    codigo_rol: str = Field(max_length=50)
    motivo: str = Field(min_length=10, max_length=500)


class RolEdicion(BaseModel):
    nombre: str = Field(min_length=3, max_length=100)
    permisos: list[str] = Field(max_length=50)
    motivo: str = Field(min_length=10, max_length=500)


class RolCreacion(RolEdicion):
    codigo: str = Field(pattern=r"^[a-z][a-z0-9_]{2,49}$")


class RolLectura(BaseModel):
    id: uuid.UUID
    codigo: str
    nombre: str
    permisos: list[str]
    sistema: bool


class UsuariosPagina(BaseModel):
    total: int
    elementos: list[UsuarioLectura]


class SesionLectura(BaseModel):
    id: uuid.UUID
    creada_en: datetime
    expira_en: datetime
    actual: bool


class EventoLectura(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    objetivo_id: uuid.UUID | None
    accion: str
    detalle: dict[str, Any]
    creado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class GoogleOAuthPeticion(BaseModel):
    id_token: str = Field(..., min_length=10, description="Google ID Token JWT emitido por Google Identity Services")


class AmbitoTerritorialLectura(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    tipo_ambito: str
    identificador_territorial: str
    activo: bool
    creado_en: datetime
    actualizado_en: datetime
    model_config = ConfigDict(from_attributes=True)


class AmbitoTerritorialCreacion(BaseModel):
    tipo_ambito: Literal["distrital", "localidad", "mesa"]
    identificador_territorial: str = Field(..., min_length=1, max_length=100)
    motivo: str = Field(..., min_length=10, max_length=500)
