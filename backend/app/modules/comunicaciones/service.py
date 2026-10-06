import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.comunicaciones.models import TareaComunicacion
from app.modules.comunicaciones.repository import ComunicacionesRepository
from app.modules.comunicaciones.schemas import (
    TareaComunicacionActualizar,
    TareaComunicacionCrear,
    TareaComunicacionLectura,
)


class ComunicacionesService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ComunicacionesRepository(session)

    async def listar(
        self,
        *,
        etapa: str | None = None,
        estado: str | None = None,
    ) -> list[TareaComunicacionLectura]:
        async with transaction(self.session):
            tareas = await self.repository.listar(etapa=etapa, estado=estado)
            return [TareaComunicacionLectura.model_validate(t) for t in tareas]

    async def obtener(self, id: uuid.UUID) -> TareaComunicacionLectura:
        async with transaction(self.session):
            tarea = await self.repository.obtener_por_id(id)
            if tarea is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tarea de comunicación no encontrada",
                )
            return TareaComunicacionLectura.model_validate(tarea)

    async def crear(self, datos: TareaComunicacionCrear) -> TareaComunicacionLectura:
        async with transaction(self.session):
            existente = await self.repository.obtener_por_codigo(datos.codigo)
            if existente is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe una tarea con el código '{datos.codigo}'",
                )
            if datos.fecha_fin < datos.fecha_inicio:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="La fecha de culminación no puede ser anterior a la fecha de inicio",
                )

            tarea = TareaComunicacion(**datos.model_dump())
            try:
                await self.repository.guardar(tarea)
            except IntegrityError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Error de integridad al registrar la tarea",
                ) from exc

            return TareaComunicacionLectura.model_validate(tarea)

    async def actualizar(
        self, id: uuid.UUID, datos: TareaComunicacionActualizar
    ) -> TareaComunicacionLectura:
        async with transaction(self.session):
            tarea = await self.repository.obtener_por_id(id)
            if tarea is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tarea de comunicación no encontrada",
                )

            datos_dict = datos.model_dump(exclude_unset=True)
            if not datos_dict:
                return TareaComunicacionLectura.model_validate(tarea)

            # Validar código único si cambia
            if "codigo" in datos_dict and datos_dict["codigo"] != tarea.codigo:
                existente = await self.repository.obtener_por_codigo(datos_dict["codigo"])
                if existente is not None and existente.id != tarea.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Ya existe otra tarea con el código '{datos_dict['codigo']}'",
                    )

            # Validar consistencia de fechas
            fecha_ini = datos_dict.get("fecha_inicio", tarea.fecha_inicio)
            fecha_fin = datos_dict.get("fecha_fin", tarea.fecha_fin)
            if fecha_fin < fecha_ini:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="La fecha de culminación no puede ser anterior a la fecha de inicio",
                )

            for campo, valor in datos_dict.items():
                setattr(tarea, campo, valor)

            try:
                await self.repository.guardar(tarea)
            except IntegrityError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Error de integridad al actualizar la tarea",
                ) from exc

            return TareaComunicacionLectura.model_validate(tarea)

    async def eliminar(self, id: uuid.UUID) -> None:
        async with transaction(self.session):
            tarea = await self.repository.obtener_por_id(id)
            if tarea is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tarea de comunicación no encontrada",
                )
            await self.repository.eliminar(tarea)
