import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EvidenciaRespuesta(BaseModel):
    id: uuid.UUID = Field(description="Identificador único del archivo UUIDv7")
    propuesta_id: uuid.UUID | None = Field(
        default=None, description="Propuesta vinculada si aplica"
    )
    autor_sujeto_id: uuid.UUID | None = Field(default=None, description="Autor de la evidencia")
    nombre_archivo_original: str = Field(description="Nombre original subido por el usuario")
    nombre_archivo_seguro: str = Field(description="Nombre normalizado del archivo en disco")
    tamano_bytes: int = Field(description="Tamaño final del archivo limpio en bytes")
    tipo_mime: str = Field(description="Formato MIME validado")
    hash_sha256: str = Field(description="Hash forense para validación de inmutabilidad")
    exif_despojado: bool = Field(default=True, description="Confirmación técnica de sanitización")
    despojo_exif_exitoso: bool = Field(default=True, description="Alias para despojo exif exitoso")
    ancho: int | None = Field(default=None, description="Resolución horizontal")
    alto: int | None = Field(default=None, description="Resolución vertical")
    creado_en: datetime = Field(description="Marca de tiempo de registro")

    model_config = ConfigDict(from_attributes=True)
