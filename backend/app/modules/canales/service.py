"""Servicio del Canal de WhatsApp para normalización, radicación e ingesta comunitaria."""

import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate
from app.modules.canales.schemas import (
    WhatsAppIngestaRespuesta,
    WhatsAppSimulacionEntrante,
    WhatsAppWebhookPayload,
)
from app.modules.notificaciones.models import NotificacionTransaccional

logger = logging.getLogger("polis.canales.whatsapp")

# Barrios, corregimientos y sectores populares emblemáticos de Cartagena de Indias
BARRIOS_POPULARES_CARTAGENA: list[tuple[str, str]] = [
    ("nelson mandela", "Nelson Mandela"),
    ("olaya herrera", "Olaya Herrera"),
    ("el pozon", "El Pozón"),
    ("el pozón", "El Pozón"),
    ("bayunca", "Bayunca"),
    ("pasacaballos", "Pasacaballos"),
    ("baru", "Barú"),
    ("barú", "Barú"),
    ("tierrabomba", "Tierrabomba"),
    ("tierra bomba", "Tierrabomba"),
    ("membrillal", "Membrillal"),
    ("getsemani", "Getsemaní"),
    ("getsemaní", "Getsemaní"),
    ("san francisco", "San Francisco"),
    ("boston", "Boston"),
    ("torices", "Torices"),
    ("la candelaria", "La Candelaria"),
    ("bocachica", "Bocachica"),
    ("la boquilla", "La Boquilla"),
    ("arroz barato", "Arroz Barato"),
    ("albornoz", "Albornoz"),
    ("fredonia", "Fredonia"),
    ("bruselas", "Bruselas"),
    ("la esperanza", "La Esperanza"),
    ("san jose de los campanos", "San José de los Campanos"),
    ("san josé de los campanos", "San José de los Campanos"),
    ("henequen", "Henequén"),
    ("henequén", "Henequén"),
]


def enmascarar_telefono(telefono: str) -> str:
    """Enmascara el número de teléfono para proteger la privacidad ciudadana."""
    limpio = re.sub(r"[^\d+]", "", telefono)
    if len(limpio) >= 8:
        return limpio[:4] + "***" + limpio[-3:]
    return limpio[:2] + "***"


def calcular_hash_remitente(telefono: str) -> str:
    """Genera huella SHA-256 no reversible para prevención de abuso y auditoría forense."""
    return hashlib.sha256(telefono.strip().encode("utf-8")).hexdigest()


def sintetizar_titulo(texto: str) -> str:
    """Genera un título claro y conciso a partir del mensaje ciudadano."""
    limpio = " ".join(texto.split()).strip()
    if len(limpio) <= 90:
        return limpio[0].upper() + limpio[1:] if limpio else "Propuesta ciudadana vía WhatsApp"

    # Buscar corte natural en signo de puntuación
    corte = limpio[:90]
    ultimo_espacio = corte.rfind(" ")
    if ultimo_espacio > 30:
        corte = corte[:ultimo_espacio]
    return (corte[0].upper() + corte[1:] + "...").strip()


class CanalWhatsAppService:
    """Servicio de procesamiento de mensajes de WhatsApp y radicación oficial."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.aporte_repo = AporteRepository(session)

    async def _obtener_linea_estrategica_predeterminada(
        self, texto: str, linea_id_explicit: uuid.UUID | None
    ) -> uuid.UUID:
        """Asigna la línea estratégica idónea según palabras clave o la primera línea activa."""
        if linea_id_explicit:
            return linea_id_explicit

        t_lower = texto.lower()

        # Reglas temáticas institucionales de Cartagena
        codigo_meta = "LE-02"  # Convivencia por defecto
        if any(w in t_lower for w in ["niño", "niñez", "escnna", "explotacion", "explotación", "infancia"]):
            codigo_meta = "LE-01"
        elif any(w in t_lower for w in ["cienaga", "ciénaga", "manglar", "ambiental", "basura", "inundacion", "inundación", "caño"]):
            codigo_meta = "LE-03"
        elif any(w in t_lower for w in ["empleo", "vendedor", "informal", "credito", "crédito", "gota a gota", "emprendimiento", "trabajo"]):
            codigo_meta = "LE-04"
        elif any(w in t_lower for w in ["hambre", "comida", "comedor", "alimento", "nutricion", "nutrición", "olla"]):
            codigo_meta = "LE-05"
        elif any(w in t_lower for w in ["salud", "droga", "adiccion", "adicción", "sustancia", "hospital", "puesto de salud", "mental"]):
            codigo_meta = "LE-06"
        elif any(w in t_lower for w in ["corrupcion", "corrupción", "lider", "líder", "amenaza", "transparencia", "veeduria", "veeduría"]):
            codigo_meta = "LE-07"

        # Buscar por código en base de datos
        res = await self.session.execute(
            text("SELECT id FROM motor_politicas.lineas_estrategicas WHERE codigo = :cod LIMIT 1"),
            {"cod": codigo_meta},
        )
        row = res.scalar_one_or_none()
        if row:
            return row

        # Fallback a la primera línea estratégica existente
        res_primera = await self.session.execute(
            text("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1")
        )
        primera = res_primera.scalar_one_or_none()
        if not primera:
            raise ValueError("No existen líneas estratégicas registradas en motor_politicas.")
        return primera

    async def _identificar_territorio(
        self, texto: str, territorio_id_explicit: uuid.UUID | None
    ) -> tuple[uuid.UUID | None, str | None]:
        """Detecta menciones a barrios o corregimientos de Cartagena y resuelve su territorio_id."""
        if territorio_id_explicit:
            res_expl = await self.session.execute(
                text("SELECT nombre FROM geodatos.territorios WHERE id = :tid"),
                {"tid": territorio_id_explicit},
            )
            nombre = res_expl.scalar_one_or_none()
            return territorio_id_explicit, nombre

        t_lower = texto.lower()
        barrio_encontrado: str | None = None
        for needle, nombre_oficial in BARRIOS_POPULARES_CARTAGENA:
            if re.search(rf"\b{re.escape(needle)}\b", t_lower):
                barrio_encontrado = nombre_oficial
                break

        if not barrio_encontrado:
            return None, None

        # Intentar enlazar con geodatos.territorios
        res = await self.session.execute(
            text(
                "SELECT id, nombre FROM geodatos.territorios "
                "WHERE nombre ILIKE :term LIMIT 1"
            ),
            {"term": f"%{barrio_encontrado}%"},
        )
        fila = res.first()
        if fila:
            return fila[0], fila[1]

        return None, barrio_encontrado

    async def registrar_mensaje_comunitario(
        self,
        telefono_remitente: str,
        nombre_remitente: str,
        texto_mensaje: str,
        tipo_mensaje: str = "text",
        linea_id: uuid.UUID | None = None,
        territorio_id: uuid.UUID | None = None,
        wa_id: str | None = None,
    ) -> WhatsAppIngestaRespuesta:
        """Procesa un mensaje comunitario de WhatsApp, genera radicado y acuse institucional."""
        telefono_limpio = telefono_remitente.strip()
        tel_mascarado = enmascarar_telefono(telefono_limpio)
        huella = calcular_hash_remitente(telefono_limpio)

        linea_final = await self._obtener_linea_estrategica_predeterminada(texto_mensaje, linea_id)
        terr_final_id, terr_nombre = await self._identificar_territorio(texto_mensaje, territorio_id)

        titulo = sintetizar_titulo(texto_mensaje)

        metadatos = {
            "canal": "whatsapp",
            "wa_id": wa_id or telefono_limpio,
            "telefono_remitente": tel_mascarado,
            "tipo_mensaje": tipo_mensaje,
            "barrio_identificado": terr_nombre,
            "ingesta_en": datetime.now(timezone.utc).isoformat(),
        }

        aporte_create = PropuestaCiudadanaCreate(
            linea_id=linea_final,
            territorio_id=terr_final_id,
            tipo_aporte="propuesta",
            titulo=titulo,
            descripcion=texto_mensaje.strip(),
            autor_nombre=nombre_remitente.strip() or "Líder Comunitario WhatsApp",
            es_anonimo=False,
            metadatos=metadatos,
        )

        propuesta = await self.aporte_repo.crear(aporte_create)

        # Mensaje de confirmación oficial para el ciudadano
        mensaje_respuesta = (
            f"¡Aporte recibido con éxito! La Alcaldía Mayor de Cartagena te agradece por tu "
            f"participación en 'Cartagena Ciudad de Derechos'. Tu propuesta ha sido radicada "
            f"bajo el código oficial: {propuesta.codigo_radicado}. Puedes consultar su estado en: "
            f"https://seguridadhumanaintegral.org/radicado/{propuesta.codigo_radicado}"
        )

        cuerpo_html = (
            f"<div style='font-family: sans-serif; color: #1e293b;'>"
            f"<h2>Constancia de Radicación Comunitaria WhatsApp</h2>"
            f"<p><strong>Radicado:</strong> {propuesta.codigo_radicado}</p>"
            f"<p><strong>Remitente:</strong> {nombre_remitente} ({tel_mascarado})</p>"
            f"<p><strong>Sector:</strong> {terr_nombre or 'Cartagena de Indias'}</p>"
            f"<p><strong>Mensaje:</strong> {texto_mensaje}</p>"
            f"<p><strong>Respuesta enviada:</strong> {mensaje_respuesta}</p>"
            f"</div>"
        )

        # Persistir notificación transaccional auditada
        notificacion = NotificacionTransaccional(
            codigo_radicado=propuesta.codigo_radicado,
            destinatario_correo=f"wa:{telefono_limpio}",
            tipo_evento="radicacion",
            asunto=f"POLIS WhatsApp: Constancia {propuesta.codigo_radicado}",
            cuerpo_html=cuerpo_html,
            estado_envio="simulado",
            enviado_en=datetime.now(timezone.utc),
        )
        self.session.add(notificacion)
        await self.session.commit()
        await self.session.refresh(propuesta)

        logger.info(
            "Propuesta radicada exitosamente desde WhatsApp: radicado=%s autor=%s",
            propuesta.codigo_radicado,
            tel_mascarado,
        )

        return WhatsAppIngestaRespuesta(
            codigo_radicado=propuesta.codigo_radicado,
            propuesta_id=propuesta.id,
            titulo=propuesta.titulo,
            canal="whatsapp",
            territorio_identificado=terr_nombre,
            mensaje_respuesta=mensaje_respuesta,
        )

    async def procesar_webhook_meta(
        self, payload: WhatsAppWebhookPayload
    ) -> list[WhatsAppIngestaRespuesta]:
        """Procesa todas las entradas y mensajes de un payload recibido de Meta Cloud API."""
        respuestas: list[WhatsAppIngestaRespuesta] = []

        for entry in payload.entry:
            for change in entry.changes:
                value = change.value
                contactos_dict = {c.wa_id: c.profile.name for c in value.contacts if c.wa_id}

                for msg in value.messages:
                    texto = ""
                    tipo = msg.type

                    if msg.text and msg.text.body:
                        texto = msg.text.body
                    elif msg.audio and msg.audio.caption:
                        texto = msg.audio.caption
                    elif msg.image and msg.image.caption:
                        texto = msg.image.caption
                    elif msg.document and msg.document.caption:
                        texto = msg.document.caption
                    else:
                        texto = f"Aporte comunitario en formato {tipo} recibido vía WhatsApp."

                    nombre = contactos_dict.get(msg.from_, "Líder Comunitario WhatsApp")

                    respuesta = await self.registrar_mensaje_comunitario(
                        telefono_remitente=msg.from_,
                        nombre_remitente=nombre,
                        texto_mensaje=texto,
                        tipo_mensaje=tipo,
                        wa_id=msg.id,
                    )
                    respuestas.append(respuesta)

        return respuestas
