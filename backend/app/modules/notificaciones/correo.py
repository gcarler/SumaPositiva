"""Plantillas HTML institucionales y despacho resiliente de correos transaccionales."""

import asyncio
import html
import logging
import smtplib
import ssl
from datetime import UTC, datetime
from email.message import EmailMessage
from email.utils import formatdate
from html.parser import HTMLParser

from app.core.config import Settings

logger = logging.getLogger("polis.notificaciones")


def generar_html_constancia_radicacion(
    radicado: str,
    titulo: str,
    descripcion: str,
    autor: str,
    enlace_consulta: str,
) -> str:
    """Genera la plantilla HTML institucional para la constancia de radicación ciudadana."""
    titulo_limpio = html.escape(titulo)
    desc_limpia = html.escape(descripcion)
    autor_limpio = html.escape(autor)
    radicado_limpio = html.escape(radicado)
    enlace_limpio = html.escape(enlace_consulta)
    fecha_emision = datetime.now(UTC).strftime("%d/%m/%Y %H:%M UTC")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Constancia Oficial de Radicación - {radicado_limpio}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Cabecera Institucional Distrital -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">
                                            Alcaldía Mayor de Cartagena de Indias
                                        </p>
                                        <h1 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                                            Sistema Distrital POLIS
                                        </h1>
                                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">
                                            Cartagena Ciudad de Derechos · Seguridad y Convivencia
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Cuerpo de la Notificación -->
                    <tr>
                        <td style="padding: 32px;">
                            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 16px; margin-bottom: 24px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">
                                    Constancia Oficial de Radicación
                                </p>
                                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800; color: #0c4a6e; letter-spacing: 0.08em; font-family: monospace;">
                                    {radicado_limpio}
                                </p>
                            </div>

                            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                                Estimado(a) <strong>{autor_limpio}</strong>:
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                                En cumplimiento de los principios de transparencia, fe pública y el deber constitucional de proscripción del silencio administrativo (Sentencia C-150 de 2015), confirmamos la recepción oficial de su propuesta ciudadana:
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Título del Aporte</p>
                                        <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #0f172a;">{titulo_limpio}</p>
                                        
                                        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Resumen</p>
                                        <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.5; color: #334155;">{desc_limpia}</p>

                                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Fecha y Hora Oficial</p>
                                        <p style="margin: 0; font-size: 12px; color: #475569;">{fecha_emision}</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin: 32px 0 24px 0;">
                                <a href="{enlace_limpio}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);">
                                    Consultar Estado de Tramitación
                                </a>
                            </div>

                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                                Puede hacer seguimiento a este trámite en cualquier momento ingresando su código de radicado en la plataforma pública POLIS.
                            </p>
                        </td>
                    </tr>

                    <!-- Pie Institucional -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; line-height: 1.5; color: #64748b; text-align: center;">
                            <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">
                                Alcaldía Mayor de Cartagena de Indias · Secretaría del Interior y Convivencia Ciudadana
                            </p>
                            <p style="margin: 0 0 8px 0;">
                                Sistema POLIS para la Seguridad Humana Integral y la Participación Vinculante.
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 10px;">
                                Este mensaje es una notificación automática del sistema. Por favor no responda directamente a este correo.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def generar_html_cambio_estado(
    radicado: str,
    titulo: str,
    nuevo_estado: str,
    observaciones: str,
    enlace_consulta: str,
) -> str:
    """Genera la plantilla HTML institucional para notificaciones de cambio de estado o priorización."""
    titulo_limpio = html.escape(titulo)
    radicado_limpio = html.escape(radicado)
    estado_limpio = html.escape(nuevo_estado.replace("_", " ").upper())
    obs_limpia = html.escape(observaciones)
    enlace_limpio = html.escape(enlace_consulta)
    fecha_emision = datetime.now(UTC).strftime("%d/%m/%Y %H:%M UTC")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Actualización de Tramitación - {radicado_limpio}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <tr>
                        <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
                            <p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">
                                Alcaldía Mayor de Cartagena de Indias
                            </p>
                            <h1 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                                Sistema Distrital POLIS
                            </h1>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">
                                Cartagena Ciudad de Derechos · Notificación de Tramitación
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                                Le informamos que la propuesta ciudadana radicada bajo el número <strong>{radicado_limpio}</strong> ha registrado una actualización de estado:
                            </p>

                            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin-bottom: 24px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase;">
                                    Nuevo Estado
                                </p>
                                <p style="margin: 6px 0 0 0; font-size: 20px; font-weight: 700; color: #14532d;">
                                    {estado_limpio}
                                </p>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Propuesta</p>
                                        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #0f172a;">{titulo_limpio}</p>
                                        
                                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Detalles y Observaciones</p>
                                        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;">{obs_limpia}</p>

                                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Fecha de Actualización</p>
                                        <p style="margin: 0; font-size: 12px; color: #475569;">{fecha_emision}</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin: 32px 0 24px 0;">
                                <a href="{enlace_limpio}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px;">
                                    Ver Detalle en POLIS
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; line-height: 1.5; color: #64748b; text-align: center;">
                            <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">
                                Alcaldía Mayor de Cartagena de Indias
                            </p>
                            <p style="margin: 0;">
                                Notificación automática para la erradicación del silencio administrativo.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


class _ExtractorTexto(HTMLParser):
    """Convierte el HTML institucional en texto plano legible (parte text/plain)."""

    _BLOQUES = {"p", "div", "tr", "h1", "h2", "h3", "li", "br", "table"}
    _OMITIR = {"style", "script", "title", "head"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._partes: list[str] = []
        self._omitir = 0
        self._enlace: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag in self._OMITIR:
            self._omitir += 1
        elif tag in self._BLOQUES:
            self._partes.append("\n")
        elif tag == "a":
            self._enlace = dict(attrs).get("href")

    def handle_endtag(self, tag):
        if tag in self._OMITIR:
            self._omitir = max(0, self._omitir - 1)
        elif tag in self._BLOQUES:
            self._partes.append("\n")
        elif tag == "a" and self._enlace:
            self._partes.append(f" ({self._enlace})")
            self._enlace = None

    def handle_data(self, data):
        if not self._omitir and data.strip():
            self._partes.append(" ".join(data.split()))

    def texto(self) -> str:
        crudo = " ".join(self._partes)
        lineas = [" ".join(linea.split()) for linea in crudo.splitlines()]
        compacto: list[str] = []
        for linea in lineas:
            if linea or (compacto and compacto[-1]):
                compacto.append(linea)
        return "\n".join(compacto).strip()


def texto_plano_desde_html(cuerpo_html: str) -> str:
    """Alternativa text/plain fiel al contenido del evento (no una frase genérica)."""
    extractor = _ExtractorTexto()
    extractor.feed(cuerpo_html)
    extractor.close()
    return extractor.texto() or "Mensaje institucional de POLIS. Acceda a la plataforma para consultar el detalle."


async def despachar_correo(
    destinatario: str,
    asunto: str,
    cuerpo_html: str,
    settings: Settings,
    identificador_mensaje: str | None = None,
) -> tuple[str, str | None, datetime | None]:
    """
    Despacha un correo electrónico de forma resiliente.
    Retorna (estado_envio, error_detalle, enviado_en).
    """
    if not settings.smtp_host:
        logger.info(
            "SMTP no configurado en entorno %s; entrega simulada",
            settings.environment,
        )
        return "simulado", None, None

    mensaje = EmailMessage()
    mensaje["From"] = settings.smtp_remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje["Date"] = formatdate(usegmt=True)
    # RFC 3834: evita respuestas automáticas (vacaciones, rebotes en bucle) a un correo del sistema.
    mensaje["Auto-Submitted"] = "auto-generated"
    if identificador_mensaje:
        mensaje["Message-ID"] = identificador_mensaje
    mensaje.set_content(texto_plano_desde_html(cuerpo_html))
    mensaje.add_alternative(cuerpo_html, subtype="html")

    def entregar():
        contexto = ssl.create_default_context()
        if settings.smtp_port == 465:
            # SMTPS (TLS implícito): starttls() fallaría contra este puerto.
            conexion = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10, context=contexto)
        else:
            conexion = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        with conexion as smtp:
            if settings.smtp_tls and settings.smtp_port != 465:
                smtp.starttls(context=contexto)
            if settings.smtp_usuario:
                smtp.login(settings.smtp_usuario, settings.smtp_contrasena or "")
            smtp.send_message(mensaje)

    try:
        await asyncio.to_thread(entregar)
        return "enviado", None, datetime.now(UTC)
    except Exception as err:
        logger.warning("Fallo de transporte de correo transaccional: %s", type(err).__name__)
        return "fallido", type(err).__name__, None
