import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.testimonios.models import TestimonioComunitario
from app.modules.testimonios.repository import TestimoniosRepository
from app.modules.testimonios.schemas import (
    ResumenTestimonios,
    TestimonioCrear,
    TestimonioEdicion,
    TestimonioLectura,
    TestimonioModeracion,
)


class TestimoniosService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = TestimoniosRepository(session)

    async def listar_publicos(
        self,
        territorio_id: uuid.UUID | None = None,
        dimension_id: uuid.UUID | None = None,
        solo_destacados: bool = False,
    ) -> list[TestimonioLectura]:
        """Consulta pública de testimonios aprobados o destacados."""
        async with transaction(self.session):
            testimonios = await self.repository.listar_publicos(
                territorio_id=territorio_id,
                dimension_id=dimension_id,
                solo_destacados=solo_destacados,
            )
            return [self._mapear_testimonio(t) for t in testimonios]

    async def listar_gestion(
        self,
        estado: str | None = None,
        territorio_id: uuid.UUID | None = None,
    ) -> list[TestimonioLectura]:
        """Consulta para el panel de curaduría y moderación de funcionarios."""
        async with transaction(self.session):
            testimonios = await self.repository.listar_gestion(estado=estado, territorio_id=territorio_id)
            return [self._mapear_testimonio(t) for t in testimonios]

    async def obtener_por_id(self, id: uuid.UUID) -> TestimonioLectura:
        async with transaction(self.session):
            testimonio = await self.repository.obtener_publico_por_id(id)
            if not testimonio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Testimonio comunitario con ID {id} no encontrado",
                )
            return self._mapear_testimonio(testimonio)

    async def obtener_gestion_por_id(self, id: uuid.UUID) -> TestimonioLectura:
        async with transaction(self.session):
            testimonio = await self.repository.obtener_por_id(id)
            if not testimonio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Testimonio comunitario con ID {id} no encontrado",
                )
            return self._mapear_testimonio(testimonio)

    async def crear_testimonio(
        self,
        datos: TestimonioCrear,
        sujeto_id: uuid.UUID | None = None,
        puede_moderar: bool = False,
    ) -> TestimonioLectura:
        """Registra un nuevo relato de memoria social. Admite BORRADOR, PENDIENTE o APROBADO directo."""
        async with transaction(self.session):
            estado_deseado = (datos.estado or "PENDIENTE").upper()
            if estado_deseado not in ("BORRADOR", "PENDIENTE", "APROBADO", "DESTACADO"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Estado inicial inválido. Debe ser BORRADOR, PENDIENTE o APROBADO.",
                )
            if estado_deseado in ("APROBADO", "DESTACADO") and not puede_moderar:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para publicar testimonios directamente sin moderación.",
                )

            codigo = await self.repository.obtener_siguiente_codigo()
            testimonio = TestimonioComunitario(
                codigo_unico=codigo,
                sujeto_id=sujeto_id,
                nombre_autor=datos.nombre_autor,
                organizacion_comunitaria=datos.organizacion_comunitaria,
                territorio_id=datos.territorio_id,
                dimension_id=datos.dimension_id,
                titulo=datos.titulo,
                relato=datos.relato,
                url_foto=datos.url_foto,
                url_audio_video=datos.url_audio_video,
                metadatos_enfoque=datos.metadatos_enfoque,
                estado=estado_deseado,
            )
            creado = await self.repository.crear(testimonio)
            await self.session.refresh(creado)
            return self._mapear_testimonio(creado)

    async def moderar_testimonio(
        self,
        id: uuid.UUID,
        moderacion: TestimonioModeracion,
        moderador_id: uuid.UUID | None = None,
    ) -> TestimonioLectura:
        """Modera un testimonio comunitario (BORRADOR, PENDIENTE, APROBADO, DESTACADO o RECHAZADO con motivo)."""
        async with transaction(self.session):
            testimonio = await self.repository.obtener_por_id(id)
            if not testimonio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Testimonio comunitario con ID {id} no encontrado",
                )

            nuevo_estado = moderacion.estado.upper()
            if nuevo_estado not in ("BORRADOR", "PENDIENTE", "APROBADO", "DESTACADO", "RECHAZADO"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Estado de moderación inválido. Debe ser BORRADOR, PENDIENTE, APROBADO, DESTACADO o RECHAZADO."
                    ),
                )

            if nuevo_estado == "RECHAZADO" and (
                not moderacion.motivo_moderacion or len(moderacion.motivo_moderacion.strip()) < 5
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=("El rechazo de un testimonio comunitario exige un motivo de moderación fundamentado."),
                )

            moderado = await self.repository.moderar(
                testimonio=testimonio,
                nuevo_estado=nuevo_estado,
                motivo=moderacion.motivo_moderacion,
                moderador_id=moderador_id,
            )
            await self.session.refresh(moderado)
            return self._mapear_testimonio(moderado)

    async def editar_testimonio(self, id: uuid.UUID, datos: TestimonioEdicion) -> TestimonioLectura:
        """Actualiza campos editoriales y opcionalmente el estado del testimonio."""
        async with transaction(self.session):
            testimonio = await self.repository.obtener_por_id(id)
            if not testimonio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Testimonio comunitario con ID {id} no encontrado",
                )
            datos_dict = datos.model_dump()
            if datos.estado:
                estado_upper = datos.estado.upper()
                if estado_upper not in ("BORRADOR", "PENDIENTE", "APROBADO", "DESTACADO", "RECHAZADO"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Estado inválido. Debe ser BORRADOR, PENDIENTE, APROBADO, DESTACADO o RECHAZADO.",
                    )
                datos_dict["estado"] = estado_upper
            actualizado = await self.repository.actualizar_contenido(testimonio, datos_dict)
            return self._mapear_testimonio(actualizado)

    async def obtener_resumen_metricas(self) -> ResumenTestimonios:
        async with transaction(self.session):
            metricas = await self.repository.obtener_resumen_metricas()
            return ResumenTestimonios(**metricas)

    def _mapear_testimonio(self, t: TestimonioComunitario) -> TestimonioLectura:
        territorio_nombre = None
        if t.territorio_id and "territorio" in t.__dict__ and t.territorio:
            territorio_nombre = t.territorio.nombre

        dimension_nombre = None
        if t.dimension_id and "dimension" in t.__dict__ and t.dimension:
            dimension_nombre = t.dimension.nombre

        return TestimonioLectura(
            id=t.id,
            codigo_unico=t.codigo_unico,
            nombre_autor=t.nombre_autor,
            organizacion_comunitaria=t.organizacion_comunitaria,
            territorio_id=t.territorio_id,
            territorio_nombre=territorio_nombre,
            dimension_id=t.dimension_id,
            dimension_nombre=dimension_nombre,
            titulo=t.titulo,
            relato=t.relato,
            url_foto=t.url_foto,
            url_audio_video=t.url_audio_video,
            metadatos_enfoque=t.metadatos_enfoque or {},
            estado=t.estado,
            motivo_moderacion=t.motivo_moderacion,
            creado_en=t.creado_en,
            actualizado_en=t.actualizado_en,
        )
