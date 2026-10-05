import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.evidencia.models import EvidenciaMultimedia, FotoMesa
from app.modules.mesas.models import Mesa
from app.modules.evidencia.repository import EvidenciaRepository
from app.modules.evidencia.sanitizer import sanitizar_imagen_bytes
from app.modules.evidencia.schemas import EvidenciaRespuesta
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.mesas.schemas import (
    FotoMesaModeracion,
    FotoMesaModeradaRespuesta,
    FotoMesaPublica,
    FotoMesaRevision,
    FotoMesaSubidaRespuesta,
    MesaGeovisorRespuesta,
)
from app.modules.sesion.security import generar_uuidv7


class EvidenciaService:
    def __init__(self, session: AsyncSession, settings: Settings):
        self.session = session
        self.settings = settings
        self.repository = EvidenciaRepository(session)
        self.directorio = settings.directorio_subidas
        self.directorio.mkdir(parents=True, exist_ok=True)
        self.max_bytes = settings.tamano_maximo_archivo_mb * 1024 * 1024

    async def _sanitizar_y_guardar_archivo(self, archivo: UploadFile) -> tuple[Path, uuid.UUID, dict]:
        if archivo.content_type not in self.settings.tipos_mime_permitidos:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    "Tipo de archivo no permitido. Tipos autorizados: "
                    f"{', '.join(self.settings.tipos_mime_permitidos)}"
                ),
            )

        contenido = await archivo.read()
        if len(contenido) > self.max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    f"El archivo excede el tamaño máximo permitido de "
                    f"{self.settings.tamano_maximo_archivo_mb} MB."
                ),
            )
        try:
            bytes_limpios, metadatos = sanitizar_imagen_bytes(
                contenido, archivo.filename or "evidencia_anonima.jpg"
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        if metadatos["tipo_mime"] not in self.settings.tipos_mime_permitidos:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="El formato real de la imagen no coincide con los formatos permitidos.",
            )

        archivo_id = generar_uuidv7()
        extension = metadatos["tipo_mime"].split("/")[-1]
        if extension == "jpeg":
            extension = "jpg"
        nombre_original_limpio = re.sub(
            r"[^a-zA-Z0-9_\-\.]", "_", metadatos["nombre_original"]
        )
        nombre_seguro = f"{archivo_id}_{nombre_original_limpio}"
        if not nombre_seguro.endswith(f".{extension}"):
            nombre_seguro = f"{nombre_seguro}.{extension}"
        ruta_archivo = self.directorio / nombre_seguro
        ruta_archivo.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(ruta_archivo, "xb") as archivo_salida:
                archivo_salida.write(bytes_limpios)
        except FileExistsError as error:
            raise HTTPException(status_code=409, detail="Conflicto al almacenar evidencia") from error
        metadatos["nombre_seguro"] = nombre_seguro
        metadatos["ruta"] = ruta_archivo
        metadatos["id"] = archivo_id
        return ruta_archivo, archivo_id, metadatos

    def _crear_modelo_evidencia(
        self,
        metadatos: dict,
        sujeto_id: uuid.UUID,
        propuesta_id: uuid.UUID | None,
    ) -> EvidenciaMultimedia:
        return EvidenciaMultimedia(
            id=metadatos["id"],
            propuesta_id=propuesta_id,
            autor_sujeto_id=sujeto_id,
            nombre_archivo_original=metadatos["nombre_original"],
            nombre_archivo_seguro=metadatos["nombre_seguro"],
            ruta_almacenamiento=str(metadatos["ruta"]),
            tipo_mime=metadatos["tipo_mime"],
            tamano_bytes=metadatos["tamano_bytes"],
            hash_sha256=metadatos["hash_sha256"],
            exif_despojado=True,
        )

    async def guardar_evidencia(
        self,
        archivo: UploadFile,
        sujeto: SujetoAutenticadoContexto,
        propuesta_id: uuid.UUID | None = None,
    ) -> EvidenciaRespuesta:
        ruta, _, metadatos = await self._sanitizar_y_guardar_archivo(archivo)
        try:
            async with transaction(self.session):
                guardado = await self.repository.guardar_evidencia(
                    self._crear_modelo_evidencia(metadatos, sujeto.sujeto_id, propuesta_id)
                )
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
            ruta.unlink(missing_ok=True)
            raise
        return respuesta

    async def guardar_foto_mesa(
        self,
        mesa_id: uuid.UUID,
        archivo: UploadFile,
        sujeto: SujetoAutenticadoContexto,
        autorizacion_imagen: bool,
    ) -> FotoMesaSubidaRespuesta:
        if not autorizacion_imagen:
            raise HTTPException(status_code=422, detail="Se requiere autorización para publicar la imagen")
        ruta, _, metadatos = await self._sanitizar_y_guardar_archivo(archivo)
        try:
            async with transaction(self.session):
                mesa = await self.session.get(Mesa, mesa_id)
                if not mesa:
                    raise HTTPException(status_code=404, detail="Mesa no encontrada")
                evidencia = await self.repository.guardar_evidencia(
                    self._crear_modelo_evidencia(metadatos, sujeto.sujeto_id, None)
                )
                foto = FotoMesa(
                    mesa_id=mesa_id,
                    evidencia_id=evidencia.id,
                    subido_por_id=None if sujeto.es_anonimo else sujeto.sujeto_id,
                    autorizacion_imagen=autorizacion_imagen,
                    estado="PENDIENTE",
                )
                foto = await self.repository.guardar_foto_mesa(foto)
                respuesta = FotoMesaSubidaRespuesta(id=foto.id)
        except BaseException:
            ruta.unlink(missing_ok=True)
            raise
        return respuesta

    async def moderar_foto_mesa(
        self,
        foto_id: uuid.UUID,
        datos: FotoMesaModeracion,
        sujeto: SujetoAutenticadoContexto,
    ) -> FotoMesaModeradaRespuesta:
        async with transaction(self.session):
            foto = await self.repository.foto_mesa_por_id(foto_id)
            if not foto:
                raise HTTPException(status_code=404, detail="Fotografía de mesa no encontrada")
            if foto.estado != "PENDIENTE":
                raise HTTPException(status_code=409, detail="La fotografía ya fue revisada")
            if datos.estado == "APROBADA" and not foto.autorizacion_imagen:
                raise HTTPException(status_code=422, detail="No se puede aprobar una imagen sin autorización")
            foto.estado = datos.estado
            foto.observacion_revision = datos.observacion
            foto.revisada_por_id = sujeto.sujeto_id
            foto.revisada_en = datetime.now(UTC)
            self.session.add(foto)
            await self.session.flush()
            await self.session.refresh(foto)
            respuesta = FotoMesaModeradaRespuesta(
                id=foto.id,
                mesa_id=foto.mesa_id,
                estado=datos.estado,
                observacion_revision=foto.observacion_revision,
                revisada_en=foto.revisada_en,
            )
        return respuesta

    async def listar_fotos_pendientes(self) -> list[FotoMesaRevision]:
        filas = await self.repository.listar_fotos_revision()
        return [
            FotoMesaRevision(
                id=foto.id,
                mesa_id=mesa.id,
                mesa_nombre=mesa.nombre,
                nombre_archivo_original=evidencia.nombre_archivo_original,
                autorizacion_imagen=foto.autorizacion_imagen,
                creada_en=foto.creado_en,
                archivo_revision_url=f"/api/v1/mesas/fotos/{foto.id}/revision/archivo",
            )
            for foto, mesa, evidencia in filas
        ]

    async def obtener_archivo_para_revision(
        self, foto_id: uuid.UUID, sujeto: SujetoAutenticadoContexto
    ) -> tuple[Path, str]:
        if "testimonios:moderar" not in sujeto.permisos:
            raise HTTPException(status_code=403, detail="Permiso para revisar evidencias denegado")
        fila = await self.repository.foto_revision_con_archivo(foto_id)
        if not fila:
            raise HTTPException(status_code=404, detail="Fotografía pendiente no encontrada")
        foto, evidencia = fila
        ruta = Path(evidencia.ruta_almacenamiento)
        if not ruta.exists():
            raise HTTPException(status_code=404, detail="Archivo no disponible")
        return ruta, evidencia.tipo_mime

    async def listar_mesas_geovisor(self) -> list[MesaGeovisorRespuesta]:
        filas = await self.repository.listar_mesas_geovisor()
        por_mesa: dict[uuid.UUID, MesaGeovisorRespuesta] = {}
        for mesa, territorio_nombre, territorio_codigo, longitud, latitud, foto, evidencia in filas:
            if mesa.id not in por_mesa:
                por_mesa[mesa.id] = MesaGeovisorRespuesta(
                    id=mesa.id,
                    nombre=mesa.nombre,
                    fecha=mesa.fecha,
                    horario=mesa.horario,
                    estado=mesa.estado,
                    realizada=mesa.estado in {"ACTA_CONCERTADA", "FINALIZADA"},
                    total_asistentes=mesa.total_asistentes,
                    territorio_id=mesa.territorio_id,
                    territorio_nombre=territorio_nombre,
                    territorio_codigo=territorio_codigo,
                    longitud_referencia=float(longitud) if longitud is not None else None,
                    latitud_referencia=float(latitud) if latitud is not None else None,
                    tipo_ubicacion="centroide_territorial_referencia" if longitud is not None and latitud is not None else None,
                    fotos=[],
                    codigo_oficial=mesa.codigo_oficial,
                    shortcode_ciudadano=mesa.shortcode_ciudadano,
                )
            if foto is not None and evidencia is not None:
                por_mesa[mesa.id].fotos.append(
                    FotoMesaPublica(
                        id=foto.id,
                        archivo_url=f"/api/v1/evidencias/{evidencia.id}/archivo",
                    )
                )
        return list(por_mesa.values())

    async def obtener_evidencia(self, evidencia_id: uuid.UUID) -> EvidenciaRespuesta:
        modelo = await self.repository.obtener_por_id(evidencia_id)
        if not modelo:
            raise HTTPException(status_code=404, detail="Evidencia fotográfica no encontrada.")
        estado_foto = None
        if modelo.propuesta_id is None:
            estado_foto = await self.repository.estado_foto_evidencia(evidencia_id)
            if estado_foto in {"PENDIENTE", "RECHAZADA"}:
                raise HTTPException(status_code=404, detail="Evidencia fotográfica no encontrada.")
        es_foto_mesa = estado_foto == "APROBADA"
        return EvidenciaRespuesta(
            id=modelo.id,
            propuesta_id=modelo.propuesta_id,
            autor_sujeto_id=None if es_foto_mesa else modelo.autor_sujeto_id,
            nombre_archivo_original=(
                "Fotografía de mesa aprobada" if es_foto_mesa else modelo.nombre_archivo_original
            ),
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
            raise HTTPException(status_code=404, detail="Evidencia no encontrada.")
        estado_foto = None
        if modelo.propuesta_id is None:
            estado_foto = await self.repository.estado_foto_evidencia(evidencia_id)
            if estado_foto in {"PENDIENTE", "RECHAZADA"}:
                raise HTTPException(status_code=404, detail="Evidencia no encontrada.")
        ruta = Path(modelo.ruta_almacenamiento)
        if not ruta.exists():
            raise HTTPException(status_code=404, detail="El archivo físico sanitizado no se encuentra en el almacenamiento.")
        return ruta, modelo.tipo_mime
