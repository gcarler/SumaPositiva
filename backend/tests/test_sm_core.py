"""Pruebas del núcleo portable SM: trazabilidad, consentimiento y adaptadores."""

import asyncio
from uuid import uuid4

import pytest

from app.core.config import Settings
from app.modules.sm.channels import SMCanal, SMWebhookAdapter, adaptador_por_canal
from app.modules.sm.contracts import (
    SMContacto,
    SMEstadoMensaje,
    SMEvento,
    SMMensaje,
)
from app.modules.sm.core import (
    SMConsentimientoFaltante,
    SMIdempotenciaConflict,
    hash_contacto,
    hash_traza,
    mensaje_desde_evento,
)
from app.modules.sm.service import SMCoreService

settings = Settings(_env_file=None, environment="test", database_url="postgresql://localhost/polis_test_sm_core")


def _evento(idempotencia: str = "aporte-radicado-prueba-100") -> SMEvento:
    contacto = SMContacto(
        canal=SMCanal.WHATSAPP,
        identificador="+573001234567",
        actor="ciudadano-pruebas",
    )
    return SMEvento(
        tenant="polis",
        tipo_evento="aporte.radicado",
        actor=contacto.actor,
        entidad="aporte",
        entidad_id=f"POL-2026-{uuid4().hex[:8].upper()}",
        payload={"resumen": "Radicación institucional con auditoría SM"},
        idempotencia=idempotencia,
        origen="polis",
        canal=contacto.canal,
        contacto=contacto,
        plantilla="constancia_radicacion_whatsapp",
        asunto="Constancia de radicación",
        cuerpo="Su aporte fue radicado y ya es trazable.",
    )


SECRETO_CONTACTO = "secreto-de-prueba-sm-core-32-bytes"


def test_hash_contacto_es_stable_y_anti_pii():
    contacto = _evento().contacto
    identificador = contacto.identificador
    hash_a = hash_contacto(
        tenant="polis",
        actor=contacto.actor,
        canal=contacto.canal.value,
        identificador=identificador,
        secreto=SECRETO_CONTACTO.encode(),
    )
    hash_b = hash_contacto(
        tenant="polis",
        actor=contacto.actor,
        canal=contacto.canal.value,
        identificador=identificador,
        secreto=SECRETO_CONTACTO.encode(),
    )
    assert hash_a == hash_b
    assert contacto.identificador not in hash_a
    assert hash_traza(
        tenant="polis",
        actor=contacto.actor,
        accion="evento.creado",
        evento_id=str(uuid4()),
        mensaje_id=None,
        payload={"cuerpo": "Su aporte fue radicado."},
    )


def test_mensaje_desde_evento_lleva_trazabilidad_y_sin_contacto_crudo():
    evento = _evento()
    mensaje = mensaje_desde_evento(
        evento=evento,
        contacto_hash=hash_contacto(
            tenant=evento.tenant,
            actor=evento.actor,
            canal=evento.canal.value,
            identificador=evento.contacto.identificador,
            secreto=SECRETO_CONTACTO.encode(),
        ),
    )
    assert mensaje.evento_id == evento.id
    assert mensaje.idempotencia == evento.idempotencia
    assert evento.contacto.identificador not in mensaje.contacto_hash


def test_consentimiento_registra_hash_no_contacto():
    async def flujo():
        servicio = SMCoreService(secreto_contacto=SECRETO_CONTACTO)
        evento = _evento()
        return await servicio.registrar_consentimiento(
            actor=evento.actor,
            canal=evento.canal,
            contacto=evento.contacto.identificador,
            consentido=True,
        )

    consentimiento = asyncio.run(flujo())
    assert consentimiento.contacto_hash.startswith("sm_") is False


def test_evento_requiere_consentimiento_y_genera_mensaje():
    async def flujo():
        servicio = SMCoreService(secreto_contacto=SECRETO_CONTACTO)
        evento = _evento()
        with pytest.raises(SMConsentimientoFaltante):
            await servicio.procesar_evento(evento)

        await servicio.registrar_consentimiento(
            actor=evento.actor,
            canal=evento.canal,
            contacto=evento.contacto.identificador,
            consentido=True,
        )
        return await servicio.procesar_evento(evento)

    mensaje = asyncio.run(flujo())
    assert mensaje.idempotencia == _evento().idempotencia
    assert mensaje.estado == SMEstadoMensaje.PENDIENTE


def test_evento_repetido_con_otro_datos_conflicto():
    async def flujo():
        servicio = SMCoreService(secreto_contacto=SECRETO_CONTACTO)
        evento = _evento()
        await servicio.registrar_consentimiento(
            actor=evento.actor,
            canal=evento.canal,
            contacto=evento.contacto.identificador,
            consentido=True,
        )
        await servicio.procesar_evento(evento)
        with pytest.raises(SMIdempotenciaConflict):
            await servicio.procesar_evento(evento.model_copy(update={"entidad": "otro", "id": uuid4()}))

    asyncio.run(flujo())


def test_mensaje_whatsapp_se_adapta_y_registra_entrega():
    async def flujo():
        servicio = SMCoreService(secreto_contacto=SECRETO_CONTACTO)
        evento = _evento()
        await servicio.registrar_consentimiento(
            actor=evento.actor,
            canal=evento.canal,
            contacto=evento.contacto.identificador,
            consentido=True,
        )
        mensaje = await servicio.procesar_evento(evento)
        entrega = await servicio.despachar_mensaje(mensaje.id, contacto=evento.contacto)
        return entrega, await servicio.salud()

    entrega, salud = asyncio.run(flujo())
    assert len(entrega.payload["payload_sha256"]) == 64
    assert salud.pendientes == 0
    assert salud.enviados == 0


def test_adaptador_por_canal_conversa_a_dialecto_portable():
    evento = _evento()
    contacto = evento.contacto
    mensaje = SMMensaje(
        tenant=evento.tenant,
        evento_id=evento.id,
        canal=evento.canal,
        actor=evento.actor,
        contacto_hash=hash_contacto(
            tenant=evento.tenant,
            actor=evento.actor,
            canal=evento.canal.value,
            identificador=contacto.identificador,
            secreto=SECRETO_CONTACTO.encode(),
        ),
        plantilla=evento.plantilla,
        asunto=evento.asunto,
        cuerpo=evento.cuerpo,
        estado=SMEstadoMensaje.PENDIENTE,
        idempotencia=evento.idempotencia,
    )
    entrega = adaptador_por_canal(SMCanal.WHATSAPP).construir(mensaje, contacto)
    assert entrega.mensaje_id == mensaje.id
    assert entrega.canal == contacto.canal
    assert entrega.estado_entrega == "preparado"
    assert "Su aporte fue radicado" in entrega.payload["text"]


def test_adaptador_webhook_sin_contacto_crudo():
    adapter = SMWebhookAdapter()
    contacto = SMContacto(
        canal=adapter.canal,
        identificador="https://other.internal/sm",
        actor="otro-software",
    )
    assert adapter.canal == contacto.canal


def test_hash_contacto_depende_del_secreto():
    contacto = _evento().contacto
    argumentos = {
        "tenant": "polis",
        "actor": contacto.actor,
        "canal": contacto.canal.value,
        "identificador": contacto.identificador,
    }
    primera = hash_contacto(**argumentos, secreto=b"a" * 32)
    segunda = hash_contacto(**argumentos, secreto=b"b" * 32)
    assert primera != segunda
    assert len(primera) == len(segunda) == 64
