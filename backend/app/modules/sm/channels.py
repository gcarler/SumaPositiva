"""Adaptadores de canal para el núcleo portable SM.

Cada adaptador es responsable solo de convertir un mensaje SM al dialecto del
canal. No tiene dependencias de POLIS y puede ser usado por otros software que
consuman este módulo.
"""

from .contracts import SMCanal, SMContacto, SMMensaje, SMResultadoEntrega
from .core import SMCanalesNoAutorizados, SMError


class SMCanalBase:
    """Base común para adaptadores de canal."""

    canal: SMCanal

    @staticmethod
    def validar_contacto(contacto: SMContacto) -> None:
        """Validación mínima del contacto sin reglas de negocio de ninguna plataforma."""
        if not contacto.identificador or not contacto.actor:
            raise SMError("Contacto y actor son obligatorios")

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        """Construye el payload del canal. No envía nada por sí mismo."""
        if mensaje.canal != self.canal or contacto.canal != self.canal:
            raise SMCanalesNoAutorizados(f"El canal {self.canal.value} no corresponde al mensaje/contacto")
        self.validar_contacto(contacto)


class SMCorreoAdapter(SMCanalBase):
    """Adaptador de correo institucional. Compatible con HTML plano o texto."""

    canal = SMCanal.CORREO

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        super().construir(mensaje, contacto)
        return SMResultadoEntrega(
            mensaje_id=mensaje.id,
            canal=self.canal,
            intento=1,
            estado_entrega="enviado",
            payload={
                "destinatario": contacto.identificador,
                "asunto": mensaje.asunto or "Notificación institucional",
                "cuerpo": mensaje.cuerpo or "",
            },
        )


class SMWhatsAppAdapter(SMCanalBase):
    """Adaptador de WhatsApp Cloud API oficial; no hace scraping ni envía en sí."""

    canal = SMCanal.WHATSAPP

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        super().construir(mensaje, contacto)
        return SMResultadoEntrega(
            mensaje_id=mensaje.id,
            canal=self.canal,
            intento=1,
            estado_entrega="enviado",
            payload={
                "canal": "whatsapp",
                "to": contacto.identificador,
                "type": "text",
                "text": (mensaje.cuerpo or "Notificación institucional")[:4096],
            },
        )


class SMTelegramAdapter(SMCanalBase):
    """Adaptador de Telegram oficial; no hace scraping ni usuarios no autorizados."""

    canal = SMCanal.TELEGRAM

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        super().construir(mensaje, contacto)
        return SMResultadoEntrega(
            mensaje_id=mensaje.id,
            canal=self.canal,
            intento=1,
            estado_entrega="enviado",
            payload={
                "chat_id": contacto.identificador,
                "text": (mensaje.cuerpo or "Notificación institucional")[:4096],
                "parse_mode": "HTML",
            },
        )


class SMSMSAdapter(SMCanalBase):
    """Adaptador de SMS oficial. Se limita a 480 caracteres para evitar cortes."""

    canal = SMCanal.SMS

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        super().construir(mensaje, contacto)
        return SMResultadoEntrega(
            mensaje_id=mensaje.id,
            canal=self.canal,
            intento=1,
            estado_entrega="enviado",
            payload={
                "to": contacto.identificador,
                "text": (mensaje.cuerpo or "Notificación institucional")[:480],
            },
        )


class SMWebhookAdapter(SMCanalBase):
    """Adaptador para webhooks internos entre software que comparten SM."""

    canal = SMCanal.WEBHOOK

    def construir(self, mensaje: SMMensaje, contacto: SMContacto) -> SMResultadoEntrega:
        super().construir(mensaje, contacto)
        return SMResultadoEntrega(
            mensaje_id=mensaje.id,
            canal=self.canal,
            intento=1,
            estado_entrega="enviado",
            payload={
                "url": contacto.identificador,
                "evento": mensaje.idempotencia,
                "mensaje_id": str(mensaje.id),
                "cuerpo": mensaje.cuerpo or "",
            },
        )


def adaptador_por_canal(canal: SMCanal) -> SMCanalBase:
    """Fábrica neutral para resolver el adaptador correspondiente."""
    return {
        SMCanal.CORREO: SMCorreoAdapter,
        SMCanal.WHATSAPP: SMWhatsAppAdapter,
        SMCanal.TELEGRAM: SMTelegramAdapter,
        SMCanal.SMS: SMSMSAdapter,
        SMCanal.WEBHOOK: SMWebhookAdapter,
    }[canal]()
