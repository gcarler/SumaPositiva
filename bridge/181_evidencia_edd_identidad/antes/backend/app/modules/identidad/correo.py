"""Transporte SMTP inyectable; nunca imprime enlaces o códigos en logs."""

import asyncio
import base64
import hashlib
import hmac
import smtplib
import ssl
import uuid
from datetime import UTC, datetime
from email.message import EmailMessage
from urllib.parse import urlencode

from fastapi import HTTPException, Request
from sqlalchemy import select

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.identidad.models import TokenAccion, Usuario


class CorreoIdentidad:
    def __init__(self, settings: Settings):
        self.settings = settings

    def comprobar_configuracion(self) -> None:
        if not self.settings.smtp_host:
            raise HTTPException(503, "El servicio de correo aún no está configurado")
        if self.settings.environment == "production" and (
            not self.settings.smtp_tls or not self.settings.identidad_url_publica.startswith("https://")
        ):
            raise HTTPException(503, "El servicio de correo requiere HTTPS y TLS")

    async def enviar(self, destinatario: str, proposito: str, token: str) -> None:
        self.comprobar_configuracion()
        fragmento = urlencode({"accion": proposito, "token": token})
        enlace = f"{self.settings.identidad_url_publica.rstrip('/')}#{fragmento}"
        mensaje = EmailMessage()
        mensaje["From"] = self.settings.smtp_remitente
        mensaje["To"] = destinatario
        if proposito == "verificar":
            asunto = "POLIS: verificar correo"
            cuerpo_accion = "completar la verificación de tu correo"
            minutos = self.settings.identidad_token_minutos
        elif proposito == "magic_link":
            asunto = "POLIS: Enlace de acceso directo (Magic Link)"
            cuerpo_accion = "iniciar sesión instantáneamente en la plataforma"
            minutos = 15
        else:
            asunto = "POLIS: recuperar contraseña"
            cuerpo_accion = "restablecer tu contraseña"
            minutos = self.settings.identidad_token_minutos

        mensaje["Subject"] = asunto
        mensaje.set_content(
            f"Abre este enlace para {cuerpo_accion}:\n{enlace}\n\n"
            f"Caduca en {minutos} minutos y solo se usa una vez.\n"
            "Si no solicitaste esta acción, puedes ignorar este mensaje."
        )

        def entregar():
            with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=10) as smtp:
                if self.settings.smtp_tls:
                    smtp.starttls(context=ssl.create_default_context())
                if self.settings.smtp_usuario:
                    smtp.login(self.settings.smtp_usuario, self.settings.smtp_contrasena or "")
                smtp.send_message(mensaje)

        try:
            await asyncio.to_thread(entregar)
        except (OSError, smtplib.SMTPException) as error:
            raise HTTPException(503, "No se pudo enviar el correo; vuelve a solicitarlo") from error


def obtener_correo_identidad(request: Request) -> CorreoIdentidad:
    return CorreoIdentidad(request.app.state.settings)


def token_para_correo(nonce: uuid.UUID, settings: Settings) -> str:
    digest = hmac.new(settings.jwt_secret_key.encode(), f"polis-correo:{nonce}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


async def procesar_cola_correo(sessions, settings, transporte, maximo=20) -> int:
    """Cola durable: solo nonce y hash en BD; envío al menos una vez, enlace de uso único."""
    procesados = 0
    for _ in range(maximo):
        fallo_entrega = False
        async with sessions() as session:
            async with transaction(session):
                registro = await session.scalar(
                    select(TokenAccion)
                    .where(
                        TokenAccion.enviado_en.is_(None),
                        TokenAccion.usado_en.is_(None),
                        TokenAccion.expira_en > datetime.now(UTC),
                        TokenAccion.entregas < 5,
                    )
                    .order_by(TokenAccion.entregas, TokenAccion.expira_en)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
                if not registro:
                    break
                usuario = await session.get(Usuario, registro.usuario_id)
                registro.entregas += 1
                token = token_para_correo(registro.nonce, settings)
                if (
                    not usuario
                    or not usuario.activo
                    or hashlib.sha256(token.encode()).hexdigest() != registro.hash_token
                ):
                    registro.usado_en = datetime.now(UTC)
                else:
                    try:
                        await transporte.enviar(usuario.correo, registro.proposito, token)
                    except HTTPException:
                        # Reintentar en otro lote; no agotar intentos ante una caída del SMTP.
                        fallo_entrega = True
                    else:
                        registro.enviado_en = datetime.now(UTC)
                await session.flush()
                procesados += 1
        if fallo_entrega:
            break
    return procesados
