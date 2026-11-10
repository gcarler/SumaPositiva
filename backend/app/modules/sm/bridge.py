"""Puente institucional de eventos POLIS hacia el núcleo portable SM.

Provee coexistencia pacífica con el subsistema Herald legacy y traduce eventos
del dominio de POLIS (mesas, compromisos, seguridad) al modelo agnóstico SM.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.modules.identidad.models import Usuario
from app.modules.notificaciones.models import NotificacionTransaccional

from .contracts import SMCanal, SMContacto, SMEvento, SMMensaje
from .core import SMError
from .models import SMEntregaRegistro, SMMensajeRegistro
from .repository import SMRepository


class SMBridge:
    """Adaptador de eventos de dominio POLIS hacia SM Core."""

    def __init__(self, tenant: str = "polis", *, settings: Settings | None = None) -> None:
        self.tenant = tenant
        self.settings = settings or Settings()
        self.repo = SMRepository(tenant=tenant, settings=self.settings)

    async def emitir_evento_dominio(
        self,
        session: AsyncSession,
        *,
        tipo_evento: str,
        actor: str,
        canal: SMCanal,
        contacto_identificador: str,
        idempotencia: str,
        entidad: str | None = None,
        entidad_id: str | None = None,
        plantilla: str | None = None,
        asunto: str | None = None,
        cuerpo: str | None = None,
        payload: dict[str, str] | None = None,
    ) -> SMMensaje:
        """Emite un evento de POLIS al núcleo SM garantizando trazabilidad y no repudio."""
        if not session.in_transaction() and not session.info.get("polis_transaction_owner"):
            raise SMError("SMBridge requiere la transacción del caso de uso de dominio")
        contacto = SMContacto(
            canal=canal,
            identificador=contacto_identificador,
            actor=actor,
        )
        evento = SMEvento(
            tenant=self.tenant,
            tipo_evento=tipo_evento,
            actor=actor,
            entidad=entidad,
            entidad_id=entidad_id,
            payload=payload or {},
            idempotencia=idempotencia,
            origen="polis.bridge",
            canal=canal,
            contacto=contacto,
            plantilla=plantilla,
            asunto=asunto,
            cuerpo=cuerpo,
        )
        return await self.repo.procesar_evento(session, evento)

    async def sincronizar_notificacion(self, session: AsyncSession, notificacion) -> SMMensaje | None:
        """Herald → outbox SM en la misma transacción, con sombra o corte por tipo.

        Copia el asunto y el cuerpo reales que Herald ya generó, sin heredar
        consentimientos ni reutilizar tokens de uso único de Herald: si el
        contenido no es apto para el núcleo (correo o teléfono en el cuerpo),
        el validador de SM rechaza el evento y la transacción se revierte
        completa. En sombra el mensaje lleva ``sm_modo_sombra=1`` y el worker
        SM lo simula; en corte el mensaje sale sin esa marca y lo despacha SM.
        """
        if notificacion.tipo_evento not in self.settings.sm_eventos_dominio:
            return None
        if not session.in_transaction() and not session.info.get("polis_transaction_owner"):
            raise SMError("El evento de dominio debe estar dentro de una transacción")
        actor_id = await session.scalar(
            select(Usuario.id).where(
                func.lower(Usuario.correo) == notificacion.destinatario_correo.lower(), Usuario.activo.is_(True)
            )
        )
        if actor_id is None:
            return None
        actor = str(actor_id)
        huellas = self.repo.huellas_contacto(actor, SMCanal.CORREO, notificacion.destinatario_correo)
        if not await self.repo.verificar_consentimiento(
            session, actor=actor, canal=SMCanal.CORREO, contacto_hashes=huellas
        ):
            return None
        corte = notificacion.tipo_evento in self.settings.sm_corte_tipos
        payload = {"notificacion_id": str(notificacion.id)}
        if not corte:
            payload["sm_modo_sombra"] = "1"
        return await self.emitir_evento_dominio(
            session,
            tipo_evento=f"herald.{notificacion.tipo_evento}",
            actor=actor,
            canal=SMCanal.CORREO,
            contacto_identificador=notificacion.destinatario_correo,
            idempotencia=f"herald:{notificacion.id}",
            entidad="notificacion",
            entidad_id=str(notificacion.id),
            asunto=notificacion.asunto[:200],
            cuerpo=notificacion.cuerpo_html,
            payload=payload,
        )

    async def liberar_delegadas(self, session: AsyncSession) -> dict[str, int]:
        """Reversa del corte: devuelve a Herald lo que SM no llegó a entregar.

        Solo libera filas ``delegado`` de tipos que ya salieron de
        ``POLIS_SM_CORTE_TIPOS`` y sin entrega SM confirmada. Si SM ya envió o
        entregó el mensaje, la fila se conserva: reenviarla desde Herald
        duplicaría el correo. El llamador delimita la transacción.
        """
        if not session.in_transaction() and not session.info.get("polis_transaction_owner"):
            raise SMError("La liberación de delegadas requiere una transacción del caso de uso")
        filas = (
            await session.execute(
                select(NotificacionTransaccional.id, NotificacionTransaccional.tipo_evento).where(
                    NotificacionTransaccional.estado_envio == "delegado"
                )
            )
        ).all()
        candidatas = [(fila[0], fila[1]) for fila in filas if fila[1] not in self.settings.sm_corte_tipos]
        if not candidatas:
            return {"liberadas": 0, "conservadas_entregadas_por_sm": 0}

        idempotencias = [f"herald:{notificacion_id}" for notificacion_id, _ in candidatas]
        entregadas = set(
            (
                await session.scalars(
                    select(SMMensajeRegistro.idempotencia).where(
                        SMMensajeRegistro.idempotencia.in_(idempotencias),
                        (
                            SMMensajeRegistro.estado.in_(["enviado", "entregado"])
                            | SMMensajeRegistro.id.in_(
                                select(SMEntregaRegistro.mensaje_id).where(
                                    SMEntregaRegistro.estado_entrega == "enviado"
                                )
                            )
                        ),
                    )
                )
            ).all()
        )
        a_liberar = [
            notificacion_id for notificacion_id, _ in candidatas if f"herald:{notificacion_id}" not in entregadas
        ]
        if a_liberar:
            await session.execute(
                update(NotificacionTransaccional)
                .where(
                    NotificacionTransaccional.id.in_(a_liberar),
                    NotificacionTransaccional.estado_envio == "delegado",
                )
                .values(estado_envio="pendiente", intentos=0, proximo_intento_en=None, error_detalle=None)
            )
            await session.flush()
        return {
            "liberadas": len(a_liberar),
            "conservadas_entregadas_por_sm": len(candidatas) - len(a_liberar),
        }

    async def notificar_convocatoria_mesa(
        self,
        session: AsyncSession,
        *,
        mesa_id: str,
        mesa_nombre: str,
        actor: str,
        canal: SMCanal,
        contacto: str,
        fecha: str,
        lugar: str,
        enlace: str = "https://polis.gob.co/mesas",
    ) -> SMMensaje:
        """Convocatoria oficial a mesa de trabajo ciudadana."""
        return await self.emitir_evento_dominio(
            session=session,
            tipo_evento="mesa.convocatoria",
            actor=actor,
            canal=canal,
            contacto_identificador=contacto,
            idempotencia=f"mesa-convocatoria-{mesa_id}-{actor}-{fecha}",
            entidad="mesa",
            entidad_id=mesa_id,
            plantilla="sm.mesa.convocatoria",
            payload={
                "mesa_nombre": mesa_nombre,
                "fecha": fecha,
                "lugar": lugar,
                "enlace": enlace,
            },
        )

    async def notificar_asignacion_compromiso(
        self,
        session: AsyncSession,
        *,
        compromiso_id: str,
        titulo: str,
        actor: str,
        canal: SMCanal,
        contacto: str,
        fecha_limite: str,
        descripcion: str = "",
        enlace: str = "https://polis.gob.co/compromisos",
    ) -> SMMensaje:
        """Asignación de responsabilidad sobre un compromiso ciudadano."""
        return await self.emitir_evento_dominio(
            session=session,
            tipo_evento="compromiso.asignado",
            actor=actor,
            canal=canal,
            contacto_identificador=contacto,
            idempotencia=f"compromiso-asig-{compromiso_id}-{actor}",
            entidad="compromiso",
            entidad_id=compromiso_id,
            plantilla="sm.compromiso.asignado",
            payload={
                "compromiso_id": compromiso_id,
                "titulo": titulo,
                "fecha_limite": fecha_limite,
                "descripcion": descripcion,
                "enlace": enlace,
            },
        )

    async def notificar_alerta_seguridad(
        self,
        session: AsyncSession,
        *,
        actor: str,
        accion: str,
        canal: SMCanal,
        contacto: str,
        hash_traza: str,
    ) -> SMMensaje:
        """Notificación de evento de seguridad o auditoría crítica."""
        ahora_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
        return await self.emitir_evento_dominio(
            session=session,
            tipo_evento="seguridad.alerta",
            actor=actor,
            canal=canal,
            contacto_identificador=contacto,
            idempotencia=f"seguridad-alerta-{uuid.uuid4().hex[:12]}",
            entidad="seguridad",
            plantilla="sm.seguridad.alerta",
            payload={
                "accion": accion,
                "fecha": ahora_str,
                "hash": hash_traza,
            },
        )
