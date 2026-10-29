"""Pruebas unitarias y de integración para el canal de WhatsApp y radicación comunitaria.

Tarea: [CANAL-WHATSAPP-01]
Plan Maestro: Fase 2 - Ingesta de Datos Vivos y Feedback Loop
"""

import hashlib
import hmac
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.main import create_app
from app.modules.canales.service import CanalWhatsAppService

pytestmark = pytest.mark.anyio


def configuracion_whatsapp():
    return Settings(
        _env_file=None,
        environment="test",
        whatsapp_habilitado=True,
        whatsapp_verify_token="token-local-pruebas",
        whatsapp_app_secret="secreto-local-pruebas",
    )


@pytest.fixture
async def session(database_url: str):
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as s:
        yield s
    await engine.dispose()


def test_handshake_verificacion_webhook_meta_exitoso():
    """Valida que el endpoint GET /webhook responda con el challenge ante token correcto."""
    app = create_app(configuracion_whatsapp())
    with TestClient(app) as cliente:
        respuesta = cliente.get(
            "/api/v1/canales/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "1158201444",
                "hub.verify_token": "token-local-pruebas",
            },
        )
        assert respuesta.status_code == 200
        assert respuesta.text == "1158201444"


def test_handshake_verificacion_webhook_meta_token_invalido():
    """Valida que el endpoint GET /webhook rechace con 403 un token ilegítimo."""
    app = create_app(configuracion_whatsapp())
    with TestClient(app) as cliente:
        respuesta = cliente.get(
            "/api/v1/canales/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "1158201444",
                "hub.verify_token": "token_fraudulento",
            },
        )
        assert respuesta.status_code == 403
        assert "inválida" in respuesta.json()["detail"]


async def test_simular_ingesta_whatsapp_con_extraccion_barrio_y_radicacion(session):
    """Valida la recepción de un mensaje comunitario, detección de barrio y radicación oficial."""
    app = create_app(configuracion_whatsapp())
    with TestClient(app) as cliente:
        payload = {
            "telefono_remitente": "+573001234567",
            "nombre_remitente": "Luz Marina Gómez",
            "texto_mensaje": (
                "Buenas tardes señores de la Alcaldía de Cartagena. En el sector Las Torres de "
                "Nelson Mandela necesitamos con urgencia la instalación de alarmas comunitarias "
                "y patrullajes en las noches porque las fronteras invisibles no dejan transitar a los jóvenes."
            ),
            "tipo_mensaje": "text",
        }

        respuesta = cliente.post("/api/v1/canales/whatsapp/simular", json=payload)
        assert respuesta.status_code == 201
        data = respuesta.json()

        assert "codigo_radicado" in data
        assert data["codigo_radicado"].startswith("POL-2026-")
        assert data["canal"] == "whatsapp"
        assert data["territorio_identificado"] == "Nelson Mandela"
        assert "POL-2026-" in data["mensaje_respuesta"]
        assert "Alcaldía Mayor de Cartagena" in data["mensaje_respuesta"]

        radicado = data["codigo_radicado"]

        # Verificar persistencia en base de datos
        res_prop = await session.execute(
            text(
                "SELECT id, codigo_radicado, autor_nombre, metadatos "
                "FROM participacion_ciudadana.propuestas_ciudadanas "
                "WHERE codigo_radicado = :rad"
            ),
            {"rad": radicado},
        )
        prop = res_prop.first()
        assert prop is not None
        assert prop.codigo_radicado == radicado
        assert prop.autor_nombre == "Luz Marina Gómez"
        assert prop.metadatos["canal"] == "whatsapp"
        assert prop.metadatos["telefono_remitente"].startswith("+573***")
        assert prop.metadatos["barrio_identificado"] == "Nelson Mandela"

        # Verificar constancia en notificaciones transaccionales
        res_notif = await session.execute(
            text(
                "SELECT id, codigo_radicado, destinatario_correo, tipo_evento, estado_envio "
                "FROM participacion_ciudadana.notificaciones_transaccionales "
                "WHERE codigo_radicado = :rad"
            ),
            {"rad": radicado},
        )
        notif = res_notif.first()
        assert notif is not None
        assert notif.codigo_radicado == radicado
        assert notif.tipo_evento == "radicacion"
        assert notif.estado_envio == "simulado"
        assert "wa:+573001234567" in notif.destinatario_correo


async def test_webhook_meta_cloud_api_payload_completo(session):
    """Valida la ingesta a través de la estructura oficial de eventos de Meta Cloud API."""
    app = create_app(configuracion_whatsapp())
    with TestClient(app) as cliente:
        meta_payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                    "changes": [
                        {
                            "field": "messages",
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "573009998877",
                                    "phone_number_id": "10492837281",
                                },
                                "contacts": [
                                    {
                                        "profile": {"name": "Carlos Julio Pérez"},
                                        "wa_id": "573105556677",
                                    }
                                ],
                                "messages": [
                                    {
                                        "from": "573105556677",
                                        "id": "wamid.HBgNNTczMTA1NTU2Njc3FQIAERgSRjQ2OTc2QkE3QTE2NTg3QjcwAA==",
                                        "timestamp": "1791730000",
                                        "type": "text",
                                        "text": {
                                            "body": (
                                                "Reporte ciudadano desde El Pozón: solicitamos que se "
                                                "incluya en el plan distrital la limpieza del caño "
                                                "y dragado antes de las lluvias."
                                            )
                                        },
                                    }
                                ],
                            },
                        }
                    ],
                }
            ],
        }

        mensaje = meta_payload["entry"][0]["changes"][0]["value"]["messages"][0]
        mensaje["id"] = "wamid.prueba-" + uuid.uuid4().hex
        cuerpo = json.dumps(meta_payload).encode()
        firma = (
            "sha256=" + hmac.new(app.state.settings.whatsapp_app_secret.encode(), cuerpo, hashlib.sha256).hexdigest()
        )
        respuesta = cliente.post(
            "/api/v1/canales/whatsapp/webhook",
            content=cuerpo,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": firma,
            },
        )
        assert respuesta.status_code == 200
        data = respuesta.json()
        assert data["status"] == "received"
        assert data["mensajes_recibidos"] == data["mensajes_nuevos"] == 1
        assert "radicados" not in data
        recepcion_id = await session.scalar(
            text("SELECT id FROM participacion_ciudadana.whatsapp_inbox WHERE mensaje_externo_id=:id"),
            {"id": mensaje["id"]},
        )
        resultado = await CanalWhatsAppService(session).procesar_inbox_uno(recepcion_id=recepcion_id)
        assert resultado.estado == "procesado" and resultado.codigo_radicado.startswith("POL-2026-")


async def test_inferencia_tematica_linea_estrategica_ambiental(session):
    """Valida que una propuesta sobre la Ciénaga de la Virgen se asigne a LE-03."""
    app = create_app(configuracion_whatsapp())
    with TestClient(app) as cliente:
        payload = {
            "telefono_remitente": "+573007654321",
            "nombre_remitente": "Pescador Comunitario",
            "texto_mensaje": (
                "Estamos denunciando la tala indiscriminada de manglar y arrojo de basuras "
                "en la ciénaga de la virgen a la altura de Olaya Herrera sector Ricaurte."
            ),
            "tipo_mensaje": "text",
        }

        respuesta = cliente.post("/api/v1/canales/whatsapp/simular", json=payload)
        assert respuesta.status_code == 201
        data = respuesta.json()
        radicado = data["codigo_radicado"]

        res = await session.execute(
            text(
                "SELECT p.codigo_radicado, l.codigo AS linea_codigo "
                "FROM participacion_ciudadana.propuestas_ciudadanas p "
                "JOIN motor_politicas.lineas_estrategicas l ON p.linea_id = l.id "
                "WHERE p.codigo_radicado = :rad"
            ),
            {"rad": radicado},
        )
        fila = res.first()
        assert fila is not None
        # LE-03 es Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen
        assert fila.linea_codigo == "LE-03"
