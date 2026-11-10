"""Transportes SM: envío real separado de construcción; auditoría sin destinatarios.

Los clientes HTTP/SMTP son inyectables. Test nunca usa credenciales ni Postfix.
Una aceptación del proveedor es `enviado`, no prueba de lectura/entrega final.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import re
import smtplib
import time
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import parseaddr
from typing import Protocol
from urllib.parse import urlsplit

import httpx

from app.core.config import Settings

from .contracts import SMCanal, SMEstadoEntrega, SMResultadoEntrega

_HTTP_SM = ContextVar("http_sm_sin_pii", default=False)


class _SinURLsSM(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return not _HTTP_SM.get()


# httpx INFO incluye la URL; Telegram lleva el secreto en el path. Filtrar solo
# nuestras llamadas, no silenciar la telemetría del resto de la aplicación.
for _logger in (
    "httpx",
    "httpcore",
    "httpcore.connection",
    "httpcore.http11",
    "httpcore.http2",
    "httpcore.proxy",
    "httpcore.socks",
):
    logging.getLogger(_logger).addFilter(_SinURLsSM())


@contextmanager
def _sin_urls():
    token = _HTTP_SM.set(True)
    try:
        yield
    finally:
        _HTTP_SM.reset(token)


class SMFalloTransporte(Exception):
    """Código cerrado: jamás interpolar respuestas, direcciones o excepciones originales."""

    def __init__(self, codigo: str, *, transitorio: bool) -> None:
        self.codigo = codigo if re.fullmatch(r"[a-z_]{1,60}", codigo) else "transporte_error"
        self.transitorio = transitorio
        super().__init__(self.codigo)


@dataclass(frozen=True)
class SMReciboTransporte:
    estado_entrega: SMEstadoEntrega
    codigo: str
    externo_id: str | None = None

    def __post_init__(self):
        if not re.fullmatch(r"[a-z_]{1,60}", self.codigo):
            raise ValueError("El recibo requiere un código cerrado sin contenido del proveedor")
        if self.externo_id and not re.fullmatch(r"[0-9a-f]{64}", self.externo_id):
            object.__setattr__(self, "externo_id", hashlib.sha256(self.externo_id.encode()).hexdigest())


class SMTransporte(Protocol):
    @property
    def disponible(self) -> bool: ...

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte: ...


def _simulado(codigo: str) -> SMReciboTransporte:
    return SMReciboTransporte(SMEstadoEntrega.SIMULADO, codigo)


def _recibo(externo: str) -> SMReciboTransporte:
    # El proveedor puede incluir teléfono/correo en su ID: conservar solo SHA.
    return SMReciboTransporte(SMEstadoEntrega.ENVIADO, "proveedor_acepto", hashlib.sha256(externo.encode()).hexdigest())


class _LectorSMTP:
    def __init__(self, archivo, smtp):
        self.archivo, self.smtp = archivo, smtp

    def readline(self, size=-1):
        self.smtp._presupuesto()
        return self.archivo.readline(size)

    def close(self):
        self.archivo.close()


class _SMTPConDeadline(smtplib.SMTP):
    """Presupuesto total, también ante replies multilínea o varios comandos SMTP."""

    def __init__(self, host, port, *, timeout):
        self._limite = time.monotonic() + timeout
        super().__init__(host, port, timeout=timeout)

    def _presupuesto(self):
        restante = self._limite - time.monotonic()
        if restante <= 0:
            raise TimeoutError("smtp_timeout")
        if self.sock:
            self.sock.settimeout(restante)

    def getreply(self):
        self._presupuesto()
        if self.file is None:
            self.file = _LectorSMTP(self.sock.makefile("rb"), self)
        return super().getreply()

    def send(self, s):
        self._presupuesto()
        return super().send(s)


_HTML_CORREO = re.compile(r"<\s*(?:html|body|p|div|table|br|a)\b", re.IGNORECASE)


class SMCorreoTransporte:
    def __init__(self, settings: Settings, *, smtp_factory=_SMTPConDeadline) -> None:
        self.settings = settings
        self.smtp_factory = smtp_factory

    @property
    def disponible(self) -> bool:
        return self.settings.environment != "test"

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        if not self.disponible:
            return _simulado("entorno_test")
        return await asyncio.to_thread(self._enviar, preparado)

    def _enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        config = self.settings
        destino = preparado.payload.get("destinatario", "")
        remitente = config.smtp_remitente
        if (
            any(c in destino + remitente for c in "\r\n")
            or "@" not in parseaddr(destino)[1]
            or parseaddr(destino)[1] != destino
            or not parseaddr(remitente)[1]
        ):
            raise SMFalloTransporte("smtp_direccion_invalida", transitorio=False)
        try:
            mensaje = EmailMessage()
            mensaje["From"] = remitente
            mensaje["To"] = destino
            mensaje["Subject"] = preparado.payload.get("asunto", "Notificación institucional")
            mensaje["Message-ID"] = f"<{preparado.mensaje_id}@sm.invalid>"
            cuerpo = preparado.payload.get("cuerpo", "")
            # Paridad Herald→SM: el cuerpo puede ser el HTML institucional ya
            # generado; enviarlo como texto plano mostraría las etiquetas.
            if _HTML_CORREO.search(cuerpo):
                mensaje.set_content(
                    "Mensaje institucional de POLIS. Use un cliente compatible con HTML para ver el contenido completo."
                )
                mensaje.add_alternative(cuerpo, subtype="html")
            else:
                mensaje.set_content(cuerpo)
            host = config.smtp_host or "127.0.0.1"
            puerto = config.smtp_port if config.smtp_host else 25
            with self.smtp_factory(host, puerto, timeout=config.sm_http_timeout_segundos) as smtp:
                smtp.ehlo()
                if config.smtp_host and config.smtp_tls:
                    smtp.starttls()
                    smtp.ehlo()
                if config.smtp_usuario:
                    if not config.smtp_tls and host not in ("127.0.0.1", "localhost", "::1"):
                        raise SMFalloTransporte("smtp_tls_requerido", transitorio=False)
                    smtp.login(config.smtp_usuario, config.smtp_contrasena or "")
                rechazados = smtp.send_message(mensaje, from_addr=parseaddr(remitente)[1], to_addrs=[destino])
                if rechazados:
                    raise SMFalloTransporte("smtp_rechazado", transitorio=False)
            return _recibo(str(preparado.mensaje_id))
        except SMFalloTransporte:
            raise
        except smtplib.SMTPNotSupportedError:
            raise SMFalloTransporte("smtp_no_soportado", transitorio=False) from None
        except smtplib.SMTPRecipientsRefused as exc:
            transitorio = any(400 <= valor[0] < 500 for valor in exc.recipients.values())
            raise SMFalloTransporte("smtp_rechazado", transitorio=transitorio) from None
        except smtplib.SMTPResponseException as exc:
            raise SMFalloTransporte("smtp_respuesta", transitorio=400 <= exc.smtp_code < 500) from None
        except (OSError, smtplib.SMTPException):
            raise SMFalloTransporte("smtp_conexion", transitorio=True) from None
        except (ValueError, KeyError):
            raise SMFalloTransporte("smtp_payload_invalido", transitorio=False) from None


class _HTTPTransporte:
    def __init__(self, settings: Settings, *, http_transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.settings = settings
        self.http_transport = http_transport

    async def _post(self, url: str, *, contenido: bytes, headers: dict[str, str]) -> dict:
        try:
            with _sin_urls():
                async with httpx.AsyncClient(
                    transport=self.http_transport,
                    timeout=self.settings.sm_http_timeout_segundos,
                    trust_env=False,
                    follow_redirects=False,
                ) as client:
                    async with client.stream("POST", url, content=contenido, headers=headers) as response:
                        if not 200 <= response.status_code < 300:
                            raise SMFalloTransporte(
                                "http_respuesta",
                                transitorio=response.status_code in (408, 425, 429) or response.status_code >= 500,
                            )
                        partes = bytearray()
                        async for parte in response.aiter_bytes():
                            partes.extend(parte)
                            if len(partes) > 65536:
                                raise SMFalloTransporte("http_respuesta_excesiva", transitorio=False)
                        try:
                            datos = json.loads(partes) if partes else {}
                        except ValueError:
                            datos = {}
                        return datos if isinstance(datos, dict) else {}
        except httpx.HTTPError:
            raise SMFalloTransporte("http_conexion", transitorio=True) from None


def _json(datos: dict) -> bytes:
    return json.dumps(datos, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


class SMWebhookTransporte(_HTTPTransporte):
    @property
    def disponible(self) -> bool:
        secret = self.settings.sm_webhook_secret
        return self.settings.environment != "test" and bool(
            secret and len(secret.get_secret_value()) >= 32 and self.settings.sm_webhook_origenes
        )

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        if not self.disponible:
            return _simulado("webhook_sin_configuracion")
        url = preparado.payload.get("url", "")
        try:
            partes = urlsplit(url)
            origen = f"{partes.scheme}://{partes.netloc}"
            if (
                partes.scheme != "https"
                or partes.username
                or partes.password
                or partes.fragment
                or origen not in self.settings.sm_webhook_origenes
            ):
                raise ValueError
        except ValueError:
            raise SMFalloTransporte("webhook_destino_no_autorizado", transitorio=False) from None
        cuerpo = _json({k: v for k, v in preparado.payload.items() if k != "url"})
        timestamp = str(int(time.time()))
        secret = self.settings.sm_webhook_secret.get_secret_value().encode()
        firma = hmac.new(secret, timestamp.encode() + b"." + cuerpo, hashlib.sha256).hexdigest()
        await self._post(
            url,
            contenido=cuerpo,
            headers={
                "Content-Type": "application/json",
                "X-SM-Signature": f"sha256={firma}",
                "X-SM-Timestamp": timestamp,
                "X-SM-Message-ID": str(preparado.mensaje_id),
                "Idempotency-Key": str(preparado.mensaje_id),
            },
        )
        return _recibo(str(preparado.mensaje_id))


class SMTelegramTransporte(_HTTPTransporte):
    @property
    def disponible(self) -> bool:
        token = self.settings.sm_telegram_token
        return self.settings.environment != "test" and bool(token and token.get_secret_value())

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        if not self.disponible:
            return _simulado("telegram_sin_configuracion")
        token = self.settings.sm_telegram_token.get_secret_value()
        if not re.fullmatch(r"[0-9]+:[a-zA-Z0-9_-]+", token):
            raise SMFalloTransporte("telegram_configuracion_invalida", transitorio=False)
        respuesta = await self._post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            contenido=_json(preparado.payload),
            headers={"Content-Type": "application/json"},
        )
        if respuesta.get("ok") is not True or not isinstance(respuesta.get("result"), dict):
            raise SMFalloTransporte("telegram_no_acepto", transitorio=respuesta.get("error_code") == 429)
        message_id = respuesta["result"].get("message_id")
        if message_id is None:
            raise SMFalloTransporte("telegram_sin_recibo", transitorio=True)
        return _recibo(str(message_id))


class SMWhatsAppTransporte(_HTTPTransporte):
    @property
    def disponible(self) -> bool:
        s = self.settings
        return s.environment != "test" and bool(
            s.sm_whatsapp_token
            and s.sm_whatsapp_token.get_secret_value()
            and s.sm_whatsapp_phone_id
            and s.sm_whatsapp_api_version
            and s.sm_whatsapp_plantilla
            and s.sm_whatsapp_plantilla_aprobada
        )

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        if not self.disponible:
            return _simulado("whatsapp_sin_plantilla_aprobada_o_credenciales")
        s = self.settings
        if not re.fullmatch(r"[0-9]+", s.sm_whatsapp_phone_id or ""):
            raise SMFalloTransporte("whatsapp_configuracion_invalida", transitorio=False)
        # No asumir ventana de 24h: solo plantilla aprobada, con un parámetro body
        # cuyo contrato debe coincidir con la plantilla configurada por el operador.
        datos = {
            "messaging_product": "whatsapp",
            "to": preparado.payload.get("to", ""),
            "type": "template",
            "template": {
                "name": s.sm_whatsapp_plantilla,
                "language": {"code": s.sm_whatsapp_idioma},
                "components": [
                    {"type": "body", "parameters": [{"type": "text", "text": preparado.payload.get("text", "")}]}
                ],
            },
        }
        respuesta = await self._post(
            f"https://graph.facebook.com/{s.sm_whatsapp_api_version}/{s.sm_whatsapp_phone_id}/messages",
            contenido=_json(datos),
            headers={
                "Authorization": f"Bearer {s.sm_whatsapp_token.get_secret_value()}",
                "Content-Type": "application/json",
            },
        )
        messages = respuesta.get("messages")
        if (
            not isinstance(messages, list)
            or not messages
            or not isinstance(messages[0], dict)
            or not messages[0].get("id")
        ):
            raise SMFalloTransporte("whatsapp_sin_recibo", transitorio=True)
        return _recibo(str(messages[0]["id"]))


class SMSMSCliente(Protocol):
    async def enviar(self, *, destinatario: str, texto: str, idempotencia: str) -> str: ...


class SMSMSTransporte:
    """Proveedor oficial inyectable; no elegir ni fingir un proveedor sin contrato."""

    def __init__(self, settings: Settings, *, cliente: SMSMSCliente | None = None) -> None:
        self.settings, self.cliente = settings, cliente

    @property
    def disponible(self) -> bool:
        return self.settings.environment != "test" and self.cliente is not None

    async def enviar(self, preparado: SMResultadoEntrega) -> SMReciboTransporte:
        if not self.disponible:
            return _simulado("sms_sin_proveedor")
        try:
            recibo = await asyncio.wait_for(
                self.cliente.enviar(
                    destinatario=preparado.payload.get("to", ""),
                    texto=preparado.payload.get("text", ""),
                    idempotencia=str(preparado.mensaje_id),
                ),
                timeout=self.settings.sm_http_timeout_segundos,
            )
        except SMFalloTransporte:
            raise
        except Exception:
            raise SMFalloTransporte("sms_conexion", transitorio=True) from None
        if not recibo:
            raise SMFalloTransporte("sms_sin_recibo", transitorio=True)
        return _recibo(str(recibo))


def transportes_desde_settings(settings: Settings) -> dict[SMCanal, SMTransporte]:
    return {
        SMCanal.CORREO: SMCorreoTransporte(settings),
        SMCanal.WEBHOOK: SMWebhookTransporte(settings),
        SMCanal.TELEGRAM: SMTelegramTransporte(settings),
        SMCanal.WHATSAPP: SMWhatsAppTransporte(settings),
        SMCanal.SMS: SMSMSTransporte(settings),
    }
