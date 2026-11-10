"""Outbox con reclamación confirmada antes de enviar y finalización independiente.

SKIP LOCKED + token/lease excluyen workers simultáneos. Tras caída se recupera el
mensaje con el mismo ID externo. SMTP no ofrece exactly-once: una caída después
de aceptar y antes de confirmar puede repetir un envío; ver runbook.
"""

from __future__ import annotations

import asyncio
import re
import secrets
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction

from .boveda import SMBovedaContactoDB, SMBovedaError, SMResolutorContacto, huella_payload
from .channels import SMCanalBase
from .contracts import SMCanal, SMContacto, SMEstadoEntrega, SMEstadoMensaje, SMMensaje
from .core import SMError, hash_traza, transicion_estado
from .models import (
    SMAuditoriaRegistro,
    SMConsentimientoRegistro,
    SMEntregaRegistro,
    SMMensajeRegistro,
    SMWorkerLatidoRegistro,
)
from .repository import ADAPTADORES_BASE, SMRepository
from .transports import SMFalloTransporte, SMReciboTransporte, SMTransporte, transportes_desde_settings


@dataclass(frozen=True)
class SMResumenProcesamiento:
    procesados: int = 0
    enviados: int = 0
    fallidos: int = 0
    agotados: int = 0
    sin_contacto: int = 0
    simulados: int = 0
    cancelados: int = 0


@dataclass(frozen=True)
class _Reclamacion:
    mensaje: SMMensaje
    token: uuid.UUID
    intento: int
    entrega_id: uuid.UUID


class SMWorker:
    def __init__(
        self,
        tenant: str = "polis",
        max_reintentos: int | None = None,
        adaptadores: dict[SMCanal, type[SMCanalBase]] | None = None,
        *,
        settings: Settings | None = None,
        resolutor: SMResolutorContacto | None = None,
        transportes: dict[SMCanal, SMTransporte] | None = None,
        reloj: Callable[[], datetime] | None = None,
        jitter: Callable[[], float] | None = None,
    ) -> None:
        self.settings = settings or Settings()
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,31}", tenant):
            raise SMError("El tenant debe ser un identificador opaco")
        self.tenant = tenant
        self.max_reintentos = self.settings.sm_worker_max_reintentos if max_reintentos is None else max_reintentos
        if not 1 <= self.max_reintentos <= 20:
            raise ValueError("max_reintentos fuera de rango")
        self.adaptadores = dict(ADAPTADORES_BASE if adaptadores is None else adaptadores)
        self.transportes = transportes_desde_settings(self.settings) if transportes is None else dict(transportes)
        self.resolutor = resolutor
        self.reloj = reloj
        self.jitter = jitter or (lambda: secrets.randbelow(1000) / 1000)

    async def _ahora(self, session: AsyncSession) -> datetime:
        return self.reloj() if self.reloj else await session.scalar(select(func.clock_timestamp()))

    async def _reclamar(self, session: AsyncSession, excluidos: set[uuid.UUID]) -> _Reclamacion | None:
        async with transaction(session):
            ahora = await self._ahora(session)
            await session.execute(
                insert(SMWorkerLatidoRegistro)
                .values(
                    tenant=self.tenant,
                    ultimo_latido_en=ahora,
                )
                .on_conflict_do_update(index_elements=["tenant"], set_={"ultimo_latido_en": ahora})
            )
            msg = await session.scalar(
                select(SMMensajeRegistro)
                .where(
                    SMMensajeRegistro.tenant == self.tenant,
                    SMMensajeRegistro.reintentable.is_(True),
                    SMMensajeRegistro.estado.in_(["pendiente", "fallido", "encolado"]),
                    or_(SMMensajeRegistro.proximo_intento_en.is_(None), SMMensajeRegistro.proximo_intento_en <= ahora),
                    or_(SMMensajeRegistro.reclamado_hasta.is_(None), SMMensajeRegistro.reclamado_hasta <= ahora),
                    SMMensajeRegistro.id.not_in(excluidos),
                )
                .order_by(SMMensajeRegistro.creado_en, SMMensajeRegistro.id)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if msg is None:
                return None
            anteriores = (
                await session.scalar(
                    select(func.count()).select_from(SMEntregaRegistro).where(SMEntregaRegistro.mensaje_id == msg.id)
                )
                or 0
            )
            if msg.reclamacion_token is not None:
                perdidas = (
                    await session.scalars(
                        select(SMEntregaRegistro).where(
                            SMEntregaRegistro.mensaje_id == msg.id,
                            SMEntregaRegistro.estado_entrega == "en_curso",
                        )
                    )
                ).all()
                for perdida in perdidas:
                    perdida.estado_entrega = "incierto"
                    perdida.detalle = "resultado_desconocido_tras_caida"
            if anteriores >= self.max_reintentos:
                msg.estado, msg.reintentable, msg.proximo_intento_en = "agotado", False, None
                msg.reclamacion_token, msg.reclamado_hasta = None, None
                msg.actualizado_en = ahora
                session.add(
                    SMAuditoriaRegistro(
                        tenant=self.tenant,
                        evento_id=msg.evento_id,
                        mensaje_id=msg.id,
                        actor=msg.actor,
                        accion="worker.agotado",
                        detalle="max_intentos_tras_caida",
                        hash=hash_traza(self.tenant, msg.actor, "worker.agotado", str(msg.evento_id), str(msg.id), {}),
                    )
                )
                return _Reclamacion(SMRepository._mapear_mensaje_modelo(msg), uuid.uuid4(), 0, uuid.uuid4())
            token, entrega_id = uuid.uuid4(), uuid.uuid4()
            msg.estado, msg.reclamacion_token = "encolado", token
            msg.reclamado_hasta = ahora + timedelta(seconds=self.settings.sm_worker_lease_segundos)
            msg.actualizado_en = ahora
            session.add(
                SMEntregaRegistro(
                    id=entrega_id,
                    mensaje_id=msg.id,
                    tenant=self.tenant,
                    idempotencia=f"{msg.id}:{anteriores + 1}",
                    canal=msg.canal,
                    intento=anteriores + 1,
                    estado_entrega="en_curso",
                    detalle="reclamacion_pendiente_de_resultado",
                    payload={},
                )
            )
            await session.flush()
            return _Reclamacion(SMRepository._mapear_mensaje_modelo(msg), token, anteriores + 1, entrega_id)

    async def _contacto(
        self,
        session: AsyncSession,
        reclamacion: _Reclamacion,
        contactos: dict[str, SMContacto],
    ) -> SMContacto | None:
        msg = reclamacion.mensaje
        async with transaction(session):
            consentimiento = await session.scalar(
                select(SMConsentimientoRegistro)
                .where(
                    SMConsentimientoRegistro.tenant == msg.tenant,
                    SMConsentimientoRegistro.actor == msg.actor,
                    SMConsentimientoRegistro.canal == msg.canal.value,
                    SMConsentimientoRegistro.contacto_hash == msg.contacto_hash,
                )
                .with_for_update()
            )
            if consentimiento is None or consentimiento.estado != "otorgado":
                return None
            resolutor = self.resolutor or SMBovedaContactoDB.desde_settings(self.settings)
            contacto = contactos.get(msg.contacto_hash)
            if contacto is None:
                contacto = await resolutor.resolver(session, msg)
            if contacto and (
                contacto.actor != msg.actor
                or contacto.canal != msg.canal
                or msg.contacto_hash
                not in resolutor.huellas(msg.tenant, contacto.actor, contacto.canal.value, contacto.identificador)
            ):
                raise SMBovedaError("El contacto no corresponde a la reclamación")
            if contacto is None:
                raise SMBovedaError("Contacto no disponible en bóveda")
            return contacto

    async def _finalizar(
        self,
        session: AsyncSession,
        rec: _Reclamacion,
        *,
        recibo: SMReciboTransporte | None,
        fallo: SMFalloTransporte | None = None,
        payload_hash: str | None = None,
    ) -> str:
        async with transaction(session):
            msg = await session.scalar(
                select(SMMensajeRegistro)
                .where(
                    SMMensajeRegistro.id == rec.mensaje.id,
                    SMMensajeRegistro.tenant == self.tenant,
                )
                .with_for_update()
            )
            if msg is None or msg.reclamacion_token != rec.token:
                raise SMError("Reclamación vencida o sustituida; resultado externo incierto")
            entrega = await session.get(SMEntregaRegistro, rec.entrega_id)
            ahora = await self._ahora(session)
            if recibo is None and fallo is None:
                estado, codigo = "cancelado", "consentimiento_revocado"
                entrega.estado_entrega = "fallido"
                msg.reintentable = False
            elif fallo:
                codigo = fallo.codigo
                agotado = rec.intento >= self.max_reintentos and fallo.transitorio
                estado = "agotado" if agotado else "fallido"
                entrega.estado_entrega = "fallido"
                msg.reintentable = fallo.transitorio and not agotado
                if msg.reintentable:
                    espera = min(
                        self.settings.sm_worker_base_segundos * (2**rec.intento),
                        getattr(self.settings, "sm_worker_max_espera_segundos", 3600),
                    )
                    msg.proximo_intento_en = ahora + timedelta(seconds=espera + max(0, min(1, self.jitter())))
            else:
                if recibo.estado_entrega not in (SMEstadoEntrega.ENVIADO, SMEstadoEntrega.SIMULADO):
                    raise SMError("El transporte no confirmó envío ni simulación")
                estado, codigo = recibo.estado_entrega.value, recibo.codigo
                entrega.estado_entrega = estado
                entrega.externo_id = recibo.externo_id
                msg.reintentable = False
            if not msg.reintentable:
                msg.proximo_intento_en = None
            entrega.detalle = codigo
            entrega.payload = {"codigo": codigo, "payload_sha256": payload_hash or ""}
            estado = transicion_estado(SMEstadoMensaje(msg.estado), SMEstadoMensaje(estado)).value
            msg.estado, msg.actualizado_en = estado, ahora
            msg.reclamacion_token, msg.reclamado_hasta = None, None
            accion = f"worker.{estado}"
            session.add(
                SMAuditoriaRegistro(
                    tenant=self.tenant,
                    evento_id=msg.evento_id,
                    mensaje_id=msg.id,
                    actor=msg.actor,
                    accion=accion,
                    detalle=codigo,
                    hash=hash_traza(
                        self.tenant,
                        msg.actor,
                        accion,
                        str(msg.evento_id),
                        str(msg.id),
                        {"intento": str(rec.intento), "codigo": codigo},
                    ),
                )
            )
            await session.flush()
            return estado

    async def procesar_lote(
        self,
        session: AsyncSession,
        *,
        limite: int = 25,
        contactos_resolver: dict[str, SMContacto] | None = None,
        detener: Callable[[], bool] | None = None,
    ) -> SMResumenProcesamiento:
        """Sesión exclusiva nueva. Cada mensaje se procesa como máximo una vez por ronda.

        El despacho tiene un límite de tiempo inferior al lease. Una revocación
        posterior a la autorización no deshace un envío ya aceptado externamente.
        """
        if session.in_transaction() or session.info.get("polis_transaction_owner") or not 1 <= limite <= 200:
            raise SMError("El worker requiere sesión nueva y límite entre 1 y 200")
        contadores = {campo: 0 for campo in SMResumenProcesamiento.__dataclass_fields__}
        excluidos: set[uuid.UUID] = set()
        for _ in range(limite):
            if detener is not None and detener():
                break
            rec = await self._reclamar(session, excluidos)
            if rec is None:
                break
            excluidos.add(rec.mensaje.id)
            contadores["procesados"] += 1
            if rec.intento == 0:
                contadores["agotados"] += 1
                continue
            recibo, fallo, payload_hash = None, None, None
            try:
                contacto = await self._contacto(session, rec, contactos_resolver or {})
                if contacto:
                    adaptador = self.adaptadores.get(rec.mensaje.canal)
                    transporte = self.transportes.get(rec.mensaje.canal)
                    if adaptador is None or transporte is None:
                        raise SMFalloTransporte("canal_no_configurado", transitorio=False)
                    preparado = adaptador().construir(mensaje=rec.mensaje, contacto=contacto)
                    payload_hash = huella_payload(preparado.payload)
                    if rec.mensaje.metadatos.get("sm_modo_sombra") == "1":
                        recibo = SMReciboTransporte(SMEstadoEntrega.SIMULADO, "puente_modo_sombra")
                    else:
                        recibo = await asyncio.wait_for(
                            transporte.enviar(preparado), timeout=self.settings.sm_http_timeout_segundos * 2 + 5
                        )
                    del contacto, preparado
            except SMBovedaError:
                contadores["sin_contacto"] += 1
                fallo = SMFalloTransporte("boveda_no_disponible", transitorio=True)
            except SMFalloTransporte as exc:
                fallo = exc
            except SQLAlchemyError:
                raise
            except Exception:
                fallo = SMFalloTransporte("despacho_error", transitorio=True)
            # La persistencia no se captura como fallo del proveedor: propaga y revierte.
            try:
                estado = await self._finalizar(session, rec, recibo=recibo, fallo=fallo, payload_hash=payload_hash)
            except SMError:
                contadores["fallidos"] += 1
                continue
            contadores[
                {
                    "enviado": "enviados",
                    "simulado": "simulados",
                    "fallido": "fallidos",
                    "agotado": "agotados",
                    "cancelado": "cancelados",
                }[estado]
            ] += 1
        return SMResumenProcesamiento(**contadores)
