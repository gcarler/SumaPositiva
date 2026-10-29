"""Acceso inbox; la recepción y los límites pertenecen al servicio."""

import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.canales.models import WhatsAppInbox


class WhatsAppInboxRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def recibir(
        self, *, cuenta: str, mensaje_id: str, contenido_hash: str, payload: dict[str, Any]
    ) -> tuple[WhatsAppInbox, bool]:
        resultado = await self.session.execute(
            insert(WhatsAppInbox)
            .values(
                cuenta_proveedor=cuenta, mensaje_externo_id=mensaje_id, contenido_hash=contenido_hash, payload=payload
            )
            .on_conflict_do_nothing(constraint="uq_whatsapp_inbox_mensaje")
            .returning(WhatsAppInbox.id)
        )
        nuevo_id = resultado.scalar_one_or_none()
        registro = await self.session.scalar(
            select(WhatsAppInbox).where(
                WhatsAppInbox.cuenta_proveedor == cuenta, WhatsAppInbox.mensaje_externo_id == mensaje_id
            )
        )
        if registro.contenido_hash != contenido_hash:
            raise HTTPException(409, "Identificador externo ya recibido con contenido diferente")
        await self.session.flush()
        return registro, nuevo_id is not None

    async def obtener_reclamado(self, mensaje_id: uuid.UUID, token: uuid.UUID) -> WhatsAppInbox | None:
        return await self.session.scalar(
            select(WhatsAppInbox)
            .where(
                WhatsAppInbox.id == mensaje_id,
                WhatsAppInbox.reclamo_token == token,
                WhatsAppInbox.estado == "procesando",
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
