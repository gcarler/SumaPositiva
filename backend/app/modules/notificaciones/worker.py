"""Consumidor outbox: lease confirmado antes de SMTP y resultado condicionado al token.

La recuperación de un lease vencido puede repetir una entrega aceptada por SMTP.
El Message-ID estable permite correlacionarla, sin garantizar deduplicación del proveedor.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from email.utils import parseaddr

from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.notificaciones.correo import despachar_correo
from app.modules.notificaciones.models import NotificacionTransaccional

# Tope de intentos por notificación: superado, la fila queda en 'fallido' como registro
# terminal auditable (visible en el historial) y deja de reintentarse. Sin este tope una
# dirección inválida se reintentaba cada hora indefinidamente, dañando la reputación del remitente.
MAX_INTENTOS = 8


def dominio_remitente(settings: Settings) -> str:
    """Dominio del remitente configurado, para un Message-ID alineado con SPF/DKIM."""
    _, direccion = parseaddr(settings.smtp_remitente)
    if "@" not in direccion:
        return "polis.invalid"
    return direccion.rpartition("@")[2].strip().lower() or "polis.invalid"


class EntregaResultado(BaseModel):
    notificacion_id: uuid.UUID
    estado: str
    intentos: int
    identificador_mensaje: str


class NotificacionWorker:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    async def procesar_uno(
        self,
        *,
        transporte: Callable[..., Awaitable[tuple[str, str | None, datetime | None]]] | None = None,
        lease_segundos: int = 60,
        notificacion_id: uuid.UUID | None = None,
    ) -> EntregaResultado | None:
        if lease_segundos < 30:
            raise ValueError("El lease debe cubrir el timeout de SMTP")
        ahora = datetime.now(UTC)
        async with transaction(self.session):
            resultado = await self.session.execute(
                select(NotificacionTransaccional)
                .where(
                    NotificacionTransaccional.id == notificacion_id if notificacion_id else True,
                    or_(
                        and_(
                            NotificacionTransaccional.estado_envio.in_(["pendiente", "fallido"]),
                            NotificacionTransaccional.intentos < MAX_INTENTOS,
                            or_(
                                NotificacionTransaccional.proximo_intento_en.is_(None),
                                NotificacionTransaccional.proximo_intento_en <= ahora,
                            ),
                        ),
                        and_(
                            NotificacionTransaccional.estado_envio == "procesando",
                            NotificacionTransaccional.reclamo_vence_en <= ahora,
                        ),
                    ),
                )
                .order_by(NotificacionTransaccional.creado_en, NotificacionTransaccional.id)
                .limit(1)
                .with_for_update(skip_locked=True)
                .execution_options(populate_existing=True)
            )
            registro = resultado.scalar_one_or_none()
            if registro is None:
                return None
            token = uuid.uuid4()
            registro.estado_envio = "procesando"
            registro.reclamo_token = token
            registro.reclamo_vence_en = ahora + timedelta(seconds=lease_segundos)
            registro.intentos += 1
            registro.error_detalle = None
            await self.session.flush()
            entrega_id, intentos = registro.id, registro.intentos
            message_id = f"<polis-notificacion-{entrega_id}@{dominio_remitente(self.settings)}>"
            argumentos = dict(
                destinatario=registro.destinatario_correo,
                asunto=registro.asunto,
                cuerpo_html=registro.cuerpo_html,
                settings=self.settings,
                identificador_mensaje=message_id,
            )
            # Los valores ya se copian antes de salir del límite de reclamación.
            EntregaResultado(
                notificacion_id=entrega_id, estado="procesando", intentos=intentos, identificador_mensaje=message_id
            )

        # No hay SMTP en el límite que crea el aporte ni antes del commit del lease.
        try:
            estado, error, enviado_en = await (transporte or despachar_correo)(**argumentos)
            if estado not in {"enviado", "simulado", "fallido"}:
                raise ValueError("Resultado de transporte no admisible")
            if estado == "enviado" and enviado_en is None:
                raise ValueError("Entrega real sin fecha de confirmación")
        except Exception as exc:
            estado, error, enviado_en = "fallido", type(exc).__name__, None

        async with transaction(self.session):
            resultado = await self.session.execute(
                select(NotificacionTransaccional)
                .where(
                    NotificacionTransaccional.id == entrega_id,
                    NotificacionTransaccional.reclamo_token == token,
                    NotificacionTransaccional.estado_envio == "procesando",
                )
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            registro = resultado.scalar_one_or_none()
            if registro is None:
                return EntregaResultado(
                    notificacion_id=entrega_id,
                    estado="reclamo_perdido",
                    intentos=intentos,
                    identificador_mensaje=message_id,
                )
            registro.estado_envio = estado
            registro.error_detalle = error
            registro.enviado_en = enviado_en if estado == "enviado" else None
            registro.simulado_en = datetime.now(UTC) if estado == "simulado" else registro.simulado_en
            registro.proximo_intento_en = (
                datetime.now(UTC) + timedelta(seconds=min(3600, 30 * 2 ** min(intentos, 7)))
                if estado == "fallido"
                else None
            )
            registro.reclamo_token = None
            registro.reclamo_vence_en = None
            await self.session.flush()
            return EntregaResultado(
                notificacion_id=entrega_id, estado=estado, intentos=intentos, identificador_mensaje=message_id
            )
