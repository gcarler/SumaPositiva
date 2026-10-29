import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

# Fuentes solo-formulación: el plan de acción no es fuente de esta vista.
ModuloProyectoDueno = Literal["comunicaciones", "mesas", "formularios"]

EstadoCanonico = Literal["pendiente", "programada", "en_progreso", "completada", "reprogramada", "cancelada"]


class AnexoActividadLectura(BaseModel):
    """Metadatos de un anexo o evidencia documental adjunta a una actividad."""

    id: uuid.UUID
    actividad_id: str
    nombre_archivo: str
    tipo_mime: str
    tamano_bytes: int
    hash_sha256: str
    descripcion: str | None = None
    subido_por: str | None = None
    creado_en: datetime
    url_descarga: str

    model_config = ConfigDict(from_attributes=True)


class ActividadProyectoLectura(BaseModel):
    """Proyección unificada read-only de una actividad de la política.

    `id` es la clave compuesta `<modulo_dueno>:<recurso_id>`.
    `estado_nativo` conserva el estado del módulo dueño; `estado_canonico`
    lo traduce a un vocabulario común para Kanban y Gantt.
    """

    id: str
    modulo_dueno: ModuloProyectoDueno
    recurso_id: str
    codigo: str = ""
    titulo: str
    descripcion: str = ""
    etapa: str | None = None
    territorio: str = ""
    lugar: str | None = None
    fecha_inicio: date
    # `None` = ventana abierta (formulario sin fecha de cierre), se representa como abierta.
    fecha_fin: date | None = None
    hora_inicio: str | None = None
    hora_fin: str | None = None
    estado_nativo: str
    estado_canonico: EstadoCanonico
    avance_pct: float = 0.0
    responsable: str = ""
    permiso_editar: str
    total_anexos: int = 0

    model_config = ConfigDict(from_attributes=True)


class ResumenProyectosLectura(BaseModel):
    total_actividades: int
    por_modulo: dict[str, int]
    por_estado_canonico: dict[str, int]
