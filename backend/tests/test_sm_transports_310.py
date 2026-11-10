"""Contratos de transporte: servidor SMTP efímero y HTTP simulado en el proceso."""

import asyncio
import hashlib
import hmac
import json
import logging
import smtplib
from uuid import uuid4

import httpx
import pytest

from app.core.config import Settings
from app.modules.sm.channels import adaptador_por_canal
from app.modules.sm.contracts import SMCanal, SMContacto, SMEstadoEntrega, SMMensaje
from app.modules.sm.transports import (
    SMCorreoTransporte,
    SMFalloTransporte,
    SMSMSTransporte,
    SMTelegramTransporte,
    SMWebhookTransporte,
    SMWhatsAppTransporte,
    transportes_desde_settings,
)

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


def config(**kwargs):
    return Settings(
        _env_file=None,
        environment="development",
        sm_webhook_secret="k" * 32,
        sm_webhook_origenes=["https://webhook.example.invalid"],
        sm_telegram_token="123:token_ficticio",
        sm_whatsapp_token="token_ficticio",
        sm_whatsapp_phone_id="1234",
        sm_whatsapp_api_version="v25.0",
        sm_whatsapp_plantilla="institucional",
        sm_whatsapp_plantilla_aprobada=True,
        **kwargs,
    )


def preparado(canal):
    destino = {
        SMCanal.CORREO: "destino@example.invalid",
        SMCanal.WEBHOOK: "https://webhook.example.invalid/recibir",
        SMCanal.TELEGRAM: "123456",
        SMCanal.WHATSAPP: "+573001234567",
        SMCanal.SMS: "+573001234567",
    }[canal]
    msg = SMMensaje(
        evento_id=uuid4(),
        canal=canal,
        actor="actor-opaco",
        contacto_hash="h" * 64,
        cuerpo="Aviso institucional",
        asunto="Asunto",
        idempotencia="transporte-310-" + uuid4().hex,
    )
    return adaptador_por_canal(canal).construir(msg, SMContacto(canal=canal, actor=msg.actor, identificador=destino))


@pytest.mark.parametrize("canal", list(SMCanal))
async def test_entorno_test_nunca_usa_red_aunque_haya_credenciales(canal):
    s = config().model_copy(update={"environment": "test"})
    transporte = transportes_desde_settings(s)[canal]
    assert not transporte.disponible
    res = await transporte.enviar(preparado(canal))
    assert res.estado_entrega == SMEstadoEntrega.SIMULADO


async def test_smtp_servidor_loopback_efimero_envio_real_y_message_id_estable():
    recibidos, comandos = [], []

    async def smtp(reader, writer):
        writer.write(b"220 smtp.prueba ESMTP\r\n")
        await writer.drain()
        datos = []
        while linea := await reader.readline():
            cmd = linea.decode().strip()
            comandos.append(cmd)
            if cmd.upper().startswith("EHLO"):
                writer.write(b"250 smtp.prueba\r\n")
            elif cmd.upper().startswith(("MAIL FROM", "RCPT TO")):
                writer.write(b"250 ok\r\n")
            elif cmd.upper() == "DATA":
                writer.write(b"354 datos\r\n")
                await writer.drain()
                while (linea := await reader.readline()) != b".\r\n":
                    if not linea:
                        break
                    datos.append(linea)
                recibidos.append(b"".join(datos))
                writer.write(b"250 en cola\r\n")
            elif cmd.upper() == "QUIT":
                writer.write(b"221 adios\r\n")
                await writer.drain()
                break
            else:
                writer.write(b"500 no soportado\r\n")
            await writer.drain()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(smtp, "127.0.0.1", 0)
    async with server:
        port = server.sockets[0].getsockname()[1]
        assert port != 25
        transporte = SMCorreoTransporte(
            config(
                smtp_host="127.0.0.1",
                smtp_port=port,
                smtp_tls=False,
                smtp_usuario=None,
                smtp_remitente="SM <sm@example.invalid>",
            )
        )
        payload = preparado(SMCanal.CORREO)
        recibo = await transporte.enviar(payload)
        assert recibo.estado_entrega == SMEstadoEntrega.ENVIADO
        assert len(recibo.externo_id) == 64
        assert f"<{payload.mensaje_id}@sm.invalid>".encode() in recibidos[0]
        assert any(cmd.lower() == "rcpt to:<destino@example.invalid>" for cmd in comandos)


async def test_smtp_cuerpo_html_de_herald_se_envia_como_html():
    """El cuerpo real de Herald es HTML: enviarlo como texto mostraría etiquetas."""
    recibidos = []

    async def smtp(reader, writer):
        writer.write(b"220 smtp.prueba ESMTP\r\n")
        await writer.drain()
        while linea := await reader.readline():
            cmd = linea.decode().strip().upper()
            if cmd.startswith("EHLO"):
                writer.write(b"250 smtp.prueba\r\n")
            elif cmd.startswith(("MAIL FROM", "RCPT TO")):
                writer.write(b"250 ok\r\n")
            elif cmd == "DATA":
                writer.write(b"354 datos\r\n")
                await writer.drain()
                datos = []
                while (linea := await reader.readline()) != b".\r\n":
                    if not linea:
                        break
                    datos.append(linea)
                recibidos.append(b"".join(datos))
                writer.write(b"250 en cola\r\n")
            elif cmd == "QUIT":
                writer.write(b"221 adios\r\n")
                await writer.drain()
                break
            else:
                writer.write(b"500 no soportado\r\n")
            await writer.drain()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(smtp, "127.0.0.1", 0)
    async with server:
        puerto = server.sockets[0].getsockname()[1]
        transporte = SMCorreoTransporte(
            config(
                smtp_host="127.0.0.1",
                smtp_port=puerto,
                smtp_tls=False,
                smtp_usuario=None,
                smtp_remitente="SM <sm@example.invalid>",
            )
        )
        payload = preparado(SMCanal.CORREO)
        payload.payload["cuerpo"] = "<html><body><p>Constancia oficial</p></body></html>"
        assert (await transporte.enviar(payload)).estado_entrega == SMEstadoEntrega.ENVIADO

    enviado = recibidos[0]
    assert b"multipart/alternative" in enviado.lower()
    assert b"text/html" in enviado.lower()
    assert b"<p>Constancia oficial</p>" in enviado


async def test_smtp_test_no_invoca_factory_y_error_no_incluye_contacto():
    def prohibido(*args, **kwargs):
        raise AssertionError("No conectar a Postfix")

    t = SMCorreoTransporte(config().model_copy(update={"environment": "test"}), smtp_factory=prohibido)
    assert (await t.enviar(preparado(SMCanal.CORREO))).estado_entrega == SMEstadoEntrega.SIMULADO
    p = preparado(SMCanal.CORREO)
    p.payload["destinatario"] = "a@example.invalid\r\nBcc:b@example.invalid"
    with pytest.raises(SMFalloTransporte) as exc:
        await SMCorreoTransporte(config(), smtp_factory=prohibido).enviar(p)
    assert not exc.value.transitorio and "@" not in str(exc.value)


@pytest.mark.parametrize(
    ("error", "transitorio"),
    [
        (smtplib.SMTPNotSupportedError("sin TLS destino@example.invalid"), False),
        (smtplib.SMTPDataError(550, b"rechazo destino@example.invalid"), False),
        (smtplib.SMTPDataError(421, b"temporal destino@example.invalid"), True),
    ],
)
async def test_smtp_clasifica_errores_sin_eco_del_proveedor(error, transitorio):
    def fallar(*args, **kwargs):
        raise error

    with pytest.raises(SMFalloTransporte) as exc:
        await SMCorreoTransporte(config(), smtp_factory=fallar).enviar(preparado(SMCanal.CORREO))
    assert exc.value.transitorio is transitorio and "@" not in str(exc.value)


async def test_webhook_cuerpo_canonico_hmac_tiempo_id_y_sin_url():
    requests = []

    def responder(request):
        requests.append(request)
        return httpx.Response(204)

    transporte = SMWebhookTransporte(config(), http_transport=httpx.MockTransport(responder))
    p = preparado(SMCanal.WEBHOOK)
    recibo = await transporte.enviar(p)
    r = requests[0]
    firma = hmac.new(b"k" * 32, r.headers["X-SM-Timestamp"].encode() + b"." + r.content, hashlib.sha256).hexdigest()
    assert r.headers["X-SM-Signature"] == "sha256=" + firma
    assert r.headers["Idempotency-Key"] == str(p.mensaje_id)
    assert "url" not in json.loads(r.content)
    assert recibo.estado_entrega == SMEstadoEntrega.ENVIADO


@pytest.mark.parametrize(
    ("status", "transitorio"), [(400, False), (401, False), (302, False), (429, True), (503, True), (408, True)]
)
async def test_webhook_clasificacion_y_no_filtra_respuesta(status, transitorio):
    def responder(request):
        return httpx.Response(
            status,
            text="secret=privado destino@example.invalid",
            headers={"Location": "https://no-permitido.example.invalid"},
        )

    t = SMWebhookTransporte(config(), http_transport=httpx.MockTransport(responder))
    with pytest.raises(SMFalloTransporte) as exc:
        await t.enviar(preparado(SMCanal.WEBHOOK))
    assert exc.value.transitorio is transitorio
    assert "privado" not in str(exc.value) and "@" not in str(exc.value)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "https://otro.example.invalid/",
        "https://usuario:clave@webhook.example.invalid/",
        "file:///tmp/datos",
    ],
)
async def test_webhook_destinos_no_autorizados_no_hacen_red(url):
    def prohibido(request):
        pytest.fail("No debe existir request al destino rechazado")

    t = SMWebhookTransporte(config(), http_transport=httpx.MockTransport(prohibido))
    p = preparado(SMCanal.WEBHOOK)
    p.payload["url"] = url
    with pytest.raises(SMFalloTransporte, match="no_autorizado"):
        await t.enviar(p)


async def test_telegram_api_y_logs_sin_token_contacto(caplog):
    requests = []

    def responder(request):
        requests.append(request)
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 998}})

    caplog.set_level(logging.INFO, logger="httpx")
    t = SMTelegramTransporte(config(), http_transport=httpx.MockTransport(responder))
    assert (await t.enviar(preparado(SMCanal.TELEGRAM))).estado_entrega == SMEstadoEntrega.ENVIADO
    assert requests[0].url.path == "/bot123:token_ficticio/sendMessage"
    assert json.loads(requests[0].content)["chat_id"] == "123456"
    assert "token_ficticio" not in caplog.text and "123456" not in caplog.text


async def test_telegram_http_200_sin_ok_no_es_envio():
    t = SMTelegramTransporte(
        config(),
        http_transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"ok": False, "error_code": 429})),
    )
    with pytest.raises(SMFalloTransporte) as exc:
        await t.enviar(preparado(SMCanal.TELEGRAM))
    assert exc.value.transitorio


async def test_whatsapp_solo_plantilla_aprobada_y_recibo_real():
    requests = []

    def responder(request):
        requests.append(request)
        return httpx.Response(200, json={"messages": [{"id": "wamid.prueba"}]})

    t = SMWhatsAppTransporte(config(), http_transport=httpx.MockTransport(responder))
    assert (await t.enviar(preparado(SMCanal.WHATSAPP))).estado_entrega == SMEstadoEntrega.ENVIADO
    datos = json.loads(requests[0].content)
    assert datos["type"] == "template" and datos["template"]["name"] == "institucional"
    assert requests[0].headers["Authorization"] == "Bearer token_ficticio"
    t = SMWhatsAppTransporte(
        config().model_copy(update={"sm_whatsapp_plantilla_aprobada": False}),
        http_transport=httpx.MockTransport(responder),
    )
    assert (await t.enviar(preparado(SMCanal.WHATSAPP))).estado_entrega == SMEstadoEntrega.SIMULADO
    assert len(requests) == 1


async def test_sms_cliente_modular_o_simulado_explicito():
    class Cliente:
        async def enviar(self, **datos):
            assert datos["destinatario"] == "+573001234567"
            assert datos["idempotencia"]
            return "recibo-proveedor"

    p = preparado(SMCanal.SMS)
    assert (await SMSMSTransporte(config()).enviar(p)).estado_entrega == SMEstadoEntrega.SIMULADO
    assert (await SMSMSTransporte(config(), cliente=Cliente()).enviar(p)).estado_entrega == SMEstadoEntrega.ENVIADO


@pytest.mark.parametrize("canal", [SMCanal.WEBHOOK, SMCanal.WHATSAPP, SMCanal.TELEGRAM, SMCanal.SMS])
async def test_sin_credenciales_no_reporta_envio(canal):
    s = config().model_copy(update={"sm_webhook_secret": None, "sm_telegram_token": None, "sm_whatsapp_token": None})
    t = transportes_desde_settings(s)[canal]
    assert not t.disponible
    assert (await t.enviar(preparado(canal))).estado_entrega == SMEstadoEntrega.SIMULADO
