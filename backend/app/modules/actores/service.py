import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.actores.models import ActorEstrategico
from app.modules.actores.repository import ActoresRepository
from app.modules.actores.schemas import (
    ActorEstrategicoActualizar,
    ActorEstrategicoCrear,
    KpisActoresRespuesta,
)
from app.modules.auditoria.models import RegistroAuditoria


class ActoresService:
    """Servicio de negocio para actores estratégicos con trazabilidad y auditoría (AUD-14)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ActoresRepository(session)

    async def listar_actores(
        self,
        tipo: str | None = None,
        territorio: str | None = None,
        es_demostracion: bool | None = None,
        buscar: str | None = None,
    ) -> Sequence[ActorEstrategico]:
        return await self.repo.listar(
            tipo=tipo,
            territorio=territorio,
            es_demostracion=es_demostracion,
            buscar=buscar,
        )

    async def obtener_por_id(self, actor_id: uuid.UUID) -> ActorEstrategico:
        actor = await self.repo.obtener_por_id(actor_id)
        if not actor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actor estratégico con id {actor_id} no encontrado",
            )
        return actor

    async def crear_actor(
        self,
        datos: ActorEstrategicoCrear,
        usuario_id: uuid.UUID | None = None,
    ) -> ActorEstrategico:
        existente = await self.repo.obtener_por_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un actor con el código {datos.codigo}",
            )

        async with transaction(self.session):
            actor = ActorEstrategico(
                codigo=datos.codigo,
                nombre=datos.nombre,
                tipo=datos.tipo,
                territorio=datos.territorio,
                barrio_vereda=datos.barrio_vereda,
                dimensiones_principales=datos.dimensiones_principales,
                nivel_poder=datos.nivel_poder,
                nivel_interes=datos.nivel_interes,
                postura=datos.postura,
                contacto=datos.contacto,
                mesas_asistidas=datos.mesas_asistidas,
                propuestas_radicadas=datos.propuestas_radicadas,
                expectativas_principales=datos.expectativas_principales,
                acciones_involucramiento=datos.acciones_involucramiento,
                es_demostracion=datos.es_demostracion,
            )

            creado = await self.repo.crear(actor)

            # Registro inmutable de auditoría
            auditoria = RegistroAuditoria(
                tabla_afectada="participacion_ciudadana.actores_estrategicos",
                registro_id=creado.id,
                accion="CREAR_ACTOR",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=f"Registro técnico de actor estratégico {creado.codigo} ({creado.nombre})",
                metadatos={
                    "codigo": creado.codigo,
                    "tipo": creado.tipo,
                    "territorio": creado.territorio,
                    "es_demostracion": creado.es_demostracion,
                },
            )
            self.session.add(auditoria)
            await self.session.flush()

        return creado

    async def actualizar_actor(
        self,
        actor_id: uuid.UUID,
        cambios: ActorEstrategicoActualizar,
        usuario_id: uuid.UUID | None = None,
    ) -> ActorEstrategico:
        actor = await self.obtener_por_id(actor_id)

        datos_dict = cambios.model_dump(exclude_unset=True)
        async with transaction(self.session):
            for campo, valor in datos_dict.items():
                setattr(actor, campo, valor)

            # Registro inmutable de auditoría
            auditoria = RegistroAuditoria(
                tabla_afectada="participacion_ciudadana.actores_estrategicos",
                registro_id=actor.id,
                accion="ACTUALIZAR_ACTOR",
                usuario_id=usuario_id,
                causal="tecnica",
                justificacion_motivada=f"Actualización de campos en actor {actor.codigo}: {list(datos_dict.keys())}",
                metadatos={"cambios": list(datos_dict.keys())},
            )
            self.session.add(auditoria)
            await self.session.flush()

        return actor

    async def eliminar_actor(
        self,
        actor_id: uuid.UUID,
        usuario_id: uuid.UUID | None = None,
    ) -> bool:
        actor = await self.obtener_por_id(actor_id)
        codigo = actor.codigo

        async with transaction(self.session):
            exito = await self.repo.eliminar(actor_id)
            if exito:
                auditoria = RegistroAuditoria(
                    tabla_afectada="participacion_ciudadana.actores_estrategicos",
                    registro_id=actor_id,
                    accion="ELIMINAR_ACTOR",
                    usuario_id=usuario_id,
                    causal="tecnica",
                    justificacion_motivada=f"Eliminación de actor estratégico {codigo}",
                    metadatos={"codigo": codigo},
                )
                self.session.add(auditoria)
                await self.session.flush()

        return exito

    async def obtener_kpis(self) -> KpisActoresRespuesta:
        actores = await self.repo.listar()
        total = len(actores)
        por_tipo: dict[str, int] = {}
        por_territorio: dict[str, int] = {}
        por_postura: dict[str, int] = {}
        demos = 0

        for a in actores:
            por_tipo[a.tipo] = por_tipo.get(a.tipo, 0) + 1
            por_territorio[a.territorio] = por_territorio.get(a.territorio, 0) + 1
            por_postura[a.postura] = por_postura.get(a.postura, 0) + 1
            if a.es_demostracion:
                demos += 1

        return KpisActoresRespuesta(
            total_actores=total,
            por_tipo=por_tipo,
            por_territorio=por_territorio,
            por_postura=por_postura,
            actores_demostracion=demos,
        )
