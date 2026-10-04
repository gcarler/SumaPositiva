from datetime import UTC, datetime
from typing import Sequence
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.auditoria.models import RegistroAuditoria
from app.modules.fuentes.models import FuenteInformacion
from app.modules.fuentes.repository import FuentesRepository
from app.modules.fuentes.schemas import (
    FuenteInformacionActualizar,
    FuenteInformacionCrear,
    KpisFuentesRespuesta,
)


class FuentesService:
    """Servicio de gestión y persistencia para fuentes oficiales de información (EDIT-03)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FuentesRepository(session)

    async def listar_fuentes(
        self,
        ambito: str | None = None,
        estado: str | None = None,
        dimension: str | None = None,
        tipo: str | None = None,
        busqueda: str | None = None,
    ) -> Sequence[FuenteInformacion]:
        return await self.repo.listar_fuentes(
            ambito=ambito,
            estado=estado,
            dimension=dimension,
            tipo=tipo,
            busqueda=busqueda,
        )

    async def obtener_por_id(self, fuente_id: str) -> FuenteInformacion:
        fuente = await self.repo.obtener_por_id(fuente_id)
        if not fuente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fuente de información con id '{fuente_id}' no encontrada",
            )
        return fuente

    async def obtener_kpis(self) -> KpisFuentesRespuesta:
        metricas = await self.repo.contar_metricas()
        return KpisFuentesRespuesta(**metricas)

    async def crear_fuente(
        self,
        datos: FuenteInformacionCrear,
        usuario_id: uuid.UUID | None = None,
    ) -> FuenteInformacion:
        existente = await self.repo.obtener_por_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una fuente con el código '{datos.codigo}'",
            )

        fuente_id = datos.id or f"fnt-{datos.ambito[:3]}-{uuid.uuid4().hex[:8]}"
        existente_id = await self.repo.obtener_por_id(fuente_id)
        if existente_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una fuente con el identificador '{fuente_id}'",
            )

        async with transaction(self.session):
            nueva_fuente = FuenteInformacion(
                id=fuente_id,
                codigo=datos.codigo,
                entidad=datos.entidad,
                nombre_fuente=datos.nombre_fuente,
                tipo=datos.tipo,
                ambito=datos.ambito,
                dimension_seguridad=datos.dimension_seguridad,
                periodicidad=datos.periodicidad,
                radicado_solicitud=datos.radicado_solicitud,
                fecha_solicitud=datos.fecha_solicitud,
                fecha_limite_respuesta=datos.fecha_limite_respuesta,
                estado_entrega=datos.estado_entrega,
                variables_solicitadas=datos.variables_solicitadas,
                resumen_datos=datos.resumen_datos,
                archivo_adjunto_url=datos.archivo_adjunto_url,
                responsable_contacto=datos.responsable_contacto,
                observaciones_calidad=datos.observaciones_calidad,
                actualizado_por=str(usuario_id) if usuario_id else None,
            )
            creada = await self.repo.crear_fuente(nueva_fuente)

            # Registro de auditoría forense inmutable
            uuid_forense = uuid.uuid5(uuid.NAMESPACE_DNS, f"polis:fuentes:{creada.id}")
            auditoria = RegistroAuditoria(
                tabla_afectada="auditoria.fuentes_informacion",
                registro_id=uuid_forense,
                accion="CREAR_FUENTE_INFORMACION",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=(
                    f"Registro de requerimiento oficial a fuente {creada.codigo} ({creada.entidad})"
                ),
                metadatos={
                    "fuente_id": creada.id,
                    "codigo": creada.codigo,
                    "entidad": creada.entidad,
                    "radicado": creada.radicado_solicitud,
                    "estado_entrega": creada.estado_entrega,
                },
            )
            self.session.add(auditoria)
            await self.session.flush()

        return creada

    async def actualizar_fuente(
        self,
        fuente_id: str,
        cambios: FuenteInformacionActualizar,
        usuario_id: uuid.UUID | None = None,
    ) -> FuenteInformacion:
        async with transaction(self.session):
            fuente = await self.repo.obtener_para_actualizar(fuente_id)
            if not fuente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Fuente con id '{fuente_id}' no encontrada",
                )

            datos_dict = cambios.model_dump(exclude_unset=True)
            if "codigo" in datos_dict and datos_dict["codigo"] != fuente.codigo:
                existente = await self.repo.obtener_por_codigo(datos_dict["codigo"])
                if existente:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"El código '{datos_dict['codigo']}' ya está en uso",
                    )

            for campo, valor in datos_dict.items():
                setattr(fuente, campo, valor)

            fuente.actualizado_en = datetime.now(UTC)
            if usuario_id:
                fuente.actualizado_por = str(usuario_id)

            actualizada = await self.repo.actualizar_fuente(fuente)

            # Registro forense inmutable del cambio
            uuid_forense = uuid.uuid5(uuid.NAMESPACE_DNS, f"polis:fuentes:{actualizada.id}")
            auditoria = RegistroAuditoria(
                tabla_afectada="auditoria.fuentes_informacion",
                registro_id=uuid_forense,
                accion="ACTUALIZAR_FUENTE_INFORMACION",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=(
                    f"Actualización técnica/radicado en fuente {actualizada.codigo} ({actualizada.entidad})"
                ),
                metadatos={
                    "fuente_id": actualizada.id,
                    "codigo": actualizada.codigo,
                    "campos_actualizados": list(datos_dict.keys()),
                    "radicado": actualizada.radicado_solicitud,
                    "estado_entrega": actualizada.estado_entrega,
                },
            )
            self.session.add(auditoria)
            await self.session.flush()

        return actualizada

    async def eliminar_fuente(
        self,
        fuente_id: str,
        usuario_id: uuid.UUID | None = None,
    ) -> None:
        async with transaction(self.session):
            fuente = await self.repo.obtener_para_actualizar(fuente_id)
            if not fuente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Fuente con id '{fuente_id}' no encontrada",
                )

            uuid_forense = uuid.uuid5(uuid.NAMESPACE_DNS, f"polis:fuentes:{fuente.id}")
            auditoria = RegistroAuditoria(
                tabla_afectada="auditoria.fuentes_informacion",
                registro_id=uuid_forense,
                accion="ELIMINAR_FUENTE_INFORMACION",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=(
                    f"Eliminación de fuente de información {fuente.codigo} ({fuente.entidad})"
                ),
                metadatos={"fuente_id": fuente.id, "codigo": fuente.codigo},
            )
            self.session.add(auditoria)
            await self.repo.eliminar_fuente(fuente)
