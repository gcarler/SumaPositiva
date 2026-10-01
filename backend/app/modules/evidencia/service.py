import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.evidencia.models import EvidenciaMultimedia
from app.modules.evidencia.repository import EvidenciaRepository
from app.modules.evidencia.sanitizer import sanitizar_imagen_bytes
from app.modules.evidencia.schemas import EvidenciaRespuesta
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.sesion.security import generar_uuidv7


class EvidenciaService:
    def __init__(self, session: AsyncSession, settings: Settings):
        self.session = session
        self.settings = settings
        self.repository = EvidenciaRepository(session)
        self.directorio = settings.directorio_subidas
        self.directorio.mkdir(parents=True, exist_ok=True)
        self.max_bytes = settings.tamano_maximo_archivo_mb * 1024 * 1024

    async def guardar_evidencia(
        self,
        archivo: UploadFile,
        sujeto: SujetoAutenticadoContexto,
        propuesta_id: uuid.UUID | None = None,
    ) -> EvidenciaRespuesta:
        # 1. Validación de tipo MIME por cabecera HTTP
        if archivo.content_type not in self.settings.tipos_mime_permitidos:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    "Tipo de archivo no permitido. Tipos autorizados: "
                    f"{', '.join(self.settings.tipos_mime_permitidos)}"
                ),
            )

        # 2. Validación de tamaño máximo permitido
        contenido = await archivo.read()
        if len(contenido) > self.max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    f"El archivo excede el tamaño máximo permitido de "
                    f"{self.settings.tamano_maximo_archivo_mb} MB."
                ),
            )

        # 3. Sanitización de imagen y despojo estricto de EXIF/GPS
        try:
            bytes_limpios, metadatos = sanitizar_imagen_bytes(
                contenido, archivo.filename or "evidencia_anonima.jpg"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e

        # 4. Validación de tipo real verificado por Pillow
        if metadatos["tipo_mime"] not in self.settings.tipos_mime_permitidos:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="El formato real de la imagen no coincide con los formatos permitidos.",
            )

        # 5. Generación de identificador seguro UUIDv7 y nombre de almacenamiento
        archivo_id = generar_uuidv7()
        extension = metadatos["tipo_mime"].split("/")[-1]
        if extension == "jpeg":
            extension = "jpg"

        nombre_original_limpio = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", metadatos["nombre_original"])
        nombre_seguro = f"{archivo_id}_{nombre_original_limpio}"
        if not nombre_seguro.endswith(f".{extension}"):
            nombre_seguro = f"{nombre_seguro}.{extension}"

        ruta_archivo = self.directorio / nombre_seguro
        try:
            with open(ruta_archivo, "wb") as f:
                f.write(bytes_limpios)

            async with transaction(self.session):
                # 6. Persistencia física en bd_csh (participacion_ciudadana.evidencias_multimedia)
                modelo = EvidenciaMultimedia(
                    id=archivo_id,
                    propuesta_id=propuesta_id,
                    autor_sujeto_id=sujeto.sujeto_id,
                    nombre_archivo_original=metadatos["nombre_original"],
                    nombre_archivo_seguro=nombre_seguro,
                    ruta_almacenamiento=str(ruta_archivo),
                    tipo_mime=metadatos["tipo_mime"],
                    tamano_bytes=metadatos["tamano_bytes"],
                    hash_sha256=metadatos["hash_sha256"],
                    exif_despojado=True,
                )
                guardado = await self.repository.guardar_evidencia(modelo)

                respuesta = EvidenciaRespuesta(
                    id=guardado.id,
                    propuesta_id=guardado.propuesta_id,
                    autor_sujeto_id=guardado.autor_sujeto_id,
                    nombre_archivo_original=guardado.nombre_archivo_original,
                    nombre_archivo_seguro=guardado.nombre_archivo_seguro,
                    tamano_bytes=guardado.tamano_bytes,
                    tipo_mime=guardado.tipo_mime,
                    hash_sha256=guardado.hash_sha256,
                    exif_despojado=guardado.exif_despojado,
                    ancho=metadatos["ancho"],
                    alto=metadatos["alto"],
                    creado_en=guardado.creado_en,
                )

        except BaseException:
            ruta_archivo.unlink(missing_ok=True)
            raise
        return respuesta

    async def obtener_evidencia(self, evidencia_id: uuid.UUID) -> EvidenciaRespuesta:
        modelo = await self.repository.obtener_por_id(evidencia_id)
        if not modelo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidencia fotográfica no encontrada.",
            )
        return EvidenciaRespuesta(
            id=modelo.id,
            propuesta_id=modelo.propuesta_id,
            autor_sujeto_id=modelo.autor_sujeto_id,
            nombre_archivo_original=modelo.nombre_archivo_original,
            nombre_archivo_seguro=modelo.nombre_archivo_seguro,
            tamano_bytes=modelo.tamano_bytes,
            tipo_mime=modelo.tipo_mime,
            hash_sha256=modelo.hash_sha256,
            exif_despojado=modelo.exif_despojado,
            ancho=None,
            alto=None,
            creado_en=modelo.creado_en,
        )

    async def obtener_ruta_archivo(self, evidencia_id: uuid.UUID) -> tuple[Path, str]:
        modelo = await self.repository.obtener_por_id(evidencia_id)
        if not modelo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidencia no encontrada.",
            )
        ruta = Path(modelo.ruta_almacenamiento)
        if not ruta.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El archivo físico sanitizado no se encuentra en el almacenamiento.",
            )
        return ruta, modelo.tipo_mime
