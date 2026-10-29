import hashlib
import logging
import re
import uuid
from datetime import date
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import BACKEND_DIR
from app.core.transactions import transaction
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.proyectos.models import ActividadAnexo
from app.modules.proyectos.repository import ProyectosRepository
from app.modules.proyectos.schemas import (
    ActividadProyectoLectura,
    AnexoActividadLectura,
    ResumenProyectosLectura,
)

logger = logging.getLogger("polis.proyectos")

MODULOS_VALIDOS = ("comunicaciones", "mesas", "formularios")

DIRECTORIO_ANEXOS = BACKEND_DIR / "media" / "actividades_anexos"
MAX_BYTES_ANEXO = 25 * 1024 * 1024  # 25 MB

MIME_TYPES_PERMITIDOS = {
    # Documentos
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
    # Imágenes
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}

EXTENSIONES_PERMITIDAS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".zip",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
}


def _sanitizar_nombre_archivo(nombre: str) -> str:
    nombre_limpio = Path(nombre).name
    # Reemplazar caracteres no alfanuméricos preservando punto y guiones
    nombre_limpio = re.sub(r"[^\w\s\.-]", "_", nombre_limpio).strip()
    return nombre_limpio or "anexo"


class ProyectosService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ProyectosRepository(session)
        DIRECTORIO_ANEXOS.mkdir(parents=True, exist_ok=True)

    async def listar(
        self,
        *,
        modulo: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> list[ActividadProyectoLectura]:
        if modulo is not None and modulo not in MODULOS_VALIDOS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"El módulo '{modulo}' no es una fuente válida de proyectos",
            )
        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="La fecha desde no puede ser posterior a la fecha hasta",
            )

        async with transaction(self.session):
            actividades = [
                ActividadProyectoLectura.model_validate(f)
                async for f in self.repository.listar(
                    modulo=modulo,
                    fecha_desde=fecha_desde,
                    fecha_hasta=fecha_hasta,
                )
            ]
        actividades.sort(key=lambda a: (a.fecha_inicio, a.titulo))
        return actividades

    async def resumen(self) -> ResumenProyectosLectura:
        actividades = await self.listar()
        por_modulo: dict[str, int] = {}
        por_estado: dict[str, int] = {}
        for a in actividades:
            por_modulo[a.modulo_dueno] = por_modulo.get(a.modulo_dueno, 0) + 1
            por_estado[a.estado_canonico] = por_estado.get(a.estado_canonico, 0) + 1
        return ResumenProyectosLectura(
            total_actividades=len(actividades),
            por_modulo=por_modulo,
            por_estado_canonico=por_estado,
        )

    def _mapear_anexo_lectura(self, anexo: ActividadAnexo) -> AnexoActividadLectura:
        return AnexoActividadLectura(
            id=anexo.id,
            actividad_id=anexo.actividad_id,
            nombre_archivo=anexo.nombre_archivo_original,
            tipo_mime=anexo.tipo_mime,
            tamano_bytes=anexo.tamano_bytes,
            hash_sha256=anexo.hash_sha256,
            descripcion=anexo.descripcion,
            subido_por=anexo.subido_por_nombre,
            creado_en=anexo.creado_en,
            url_descarga=f"/api/v1/proyectos/actividades/{anexo.actividad_id}/anexos/{anexo.id}/archivo",
        )

    async def listar_anexos(self, actividad_id: str) -> list[AnexoActividadLectura]:
        async with transaction(self.session):
            anexos = await self.repository.listar_anexos(actividad_id)
            return [self._mapear_anexo_lectura(a) for a in anexos]

    async def guardar_anexo(
        self,
        actividad_id: str,
        archivo: UploadFile,
        descripcion: str | None,
        sujeto: SujetoAutenticadoContexto,
    ) -> AnexoActividadLectura:
        async with transaction(self.session):
            existe, modulo_dueno, recurso_id = await self.repository.existe_actividad(actividad_id)
            if not existe:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"La actividad '{actividad_id}' no existe o no es válida.",
                )

            nombre_original = archivo.filename or "archivo_sin_nombre"
            nombre_sanitizado = _sanitizar_nombre_archivo(nombre_original)
            ext = Path(nombre_sanitizado).suffix.lower()

            if ext not in EXTENSIONES_PERMITIDAS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=(
                        f"Extensión '{ext}' no permitida. Formatos admitidos: documentos "
                        "(PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP) e imágenes (JPG, PNG, WEBP, GIF, SVG)."
                    ),
                )

            tipo_mime = archivo.content_type or "application/octet-stream"
            contenido = await archivo.read()

            if len(contenido) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El archivo proporcionado está vacío.",
                )

            if len(contenido) > MAX_BYTES_ANEXO:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"El archivo excede el tamaño máximo permitido de 25 MB ({len(contenido)} bytes recibidos).",
                )

            hash_sha256 = hashlib.sha256(contenido).hexdigest()
            id_anexo = uuid.uuid4()
            nombre_seguro = f"{id_anexo.hex}_{nombre_sanitizado}"
            ruta_disco = DIRECTORIO_ANEXOS / nombre_seguro

            # Escribir archivo físico
            try:
                ruta_disco.write_bytes(contenido)
            except Exception as e:
                logger.exception("Error al escribir archivo de anexo en disco")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudo almacenar el archivo en disco.",
                ) from e

            # Obtener nombre legible del usuario si está disponible
            subido_por_nombre = sujeto.rol
            subido_por_id = None
            if not sujeto.es_anonimo:
                subido_por_id = sujeto.sujeto_id
                from app.modules.identidad.models import Usuario

                res_u = (
                    await self.session.execute(Usuario.__table__.select().where(Usuario.id == subido_por_id))
                ).first()
                if res_u:
                    subido_por_nombre = f"{res_u.nombres} {res_u.apellidos}".strip() or sujeto.rol

            anexo = ActividadAnexo(
                id=id_anexo,
                actividad_id=actividad_id,
                modulo_dueno=modulo_dueno,
                recurso_id=recurso_id,
                nombre_archivo_original=nombre_original,
                nombre_archivo_seguro=nombre_seguro,
                ruta_almacenamiento=str(ruta_disco),
                tipo_mime=tipo_mime,
                tamano_bytes=len(contenido),
                hash_sha256=hash_sha256,
                descripcion=descripcion.strip() if descripcion else None,
                subido_por_sujeto_id=subido_por_id,
                subido_por_nombre=subido_por_nombre,
            )

            anexo = await self.repository.crear_anexo(anexo)
            return self._mapear_anexo_lectura(anexo)

    async def obtener_anexo_para_descarga(
        self,
        actividad_id: str,
        anexo_id: uuid.UUID,
    ) -> tuple[Path, str, str]:
        """Retorna (ruta_archivo, nombre_original, tipo_mime)."""
        async with transaction(self.session):
            anexo = await self.repository.obtener_anexo(actividad_id, anexo_id)
            if not anexo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El anexo solicitado no existe o fue eliminado.",
                )
            ruta = Path(anexo.ruta_almacenamiento)
            if not ruta.is_file():
                # En caso de que se haya movido la ruta base o estemos en test
                alt_ruta = DIRECTORIO_ANEXOS / anexo.nombre_archivo_seguro
                if alt_ruta.is_file():
                    ruta = alt_ruta
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="El archivo físico asociado no se encuentra en el servidor.",
                    )
            return ruta, anexo.nombre_archivo_original, anexo.tipo_mime

    async def eliminar_anexo(
        self,
        actividad_id: str,
        anexo_id: uuid.UUID,
        sujeto: SujetoAutenticadoContexto,
    ) -> None:
        async with transaction(self.session):
            anexo = await self.repository.obtener_anexo(actividad_id, anexo_id)
            if not anexo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El anexo solicitado no existe o ya fue eliminado.",
                )
            await self.repository.eliminar_anexo(anexo)
