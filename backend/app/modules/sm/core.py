"""Pure core del núcleo portable SM, sin dependencias externas."""

import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any

from .contracts import FIRMA_VERSION, SMEstadoMensaje, SMEvento, SMMensaje


class SMError(Exception):
    """Base de errores del núcleo SM."""


class SMConsentimientoFaltante(SMError):
    """No se puede contactar sin consentimiento vigente por canal y contacto."""


class SMCanalesNoAutorizados(SMError):
    """El canal solicitado no está autorizado por política institucional."""


class SMContactoInvalido(SMError):
    """El contacto no cumple el contrato mínimo del canal."""


class SMIdempotenciaConflict(SMError):
    """La misma llave de idempotencia reutiliza datos distintos."""


def hash_contacto(tenant: str, actor: str, canal: str, identificador: str, *, secreto: bytes) -> str:
    """HMAC-SHA256 del contacto con un secreto de servidor, no un SHA-256 desnudo.

    El secreto impide probar correos/teléfonos por fuerza bruta a partir del hash
    almacenado. La rotación se resuelve probando las huellas de todas las claves
    vigentes; nunca se guarda el contacto crudo.
    """
    if not tenant or not actor or not identificador or not secreto:
        raise SMContactoInvalido("tenant, actor, identificador y secreto son obligatorios")
    base = f"{tenant}|{actor}|{canal}|{FIRMA_VERSION}|{identificador}"
    return hmac.new(secreto, base.encode("utf-8"), hashlib.sha256).hexdigest()


def hash_traza(
    tenant: str,
    actor: str,
    accion: str,
    evento_id: str,
    mensaje_id: str | None,
    payload: dict[str, Any] | None,
) -> str:
    """Hash forense de auditoría, determinístico y sin PII en la propia cadena."""
    base = {
        "tenant": tenant,
        "actor": actor,
        "accion": accion,
        "evento_id": evento_id,
        "mensaje_id": mensaje_id,
        "payload": payload or {},
    }
    serial = json.dumps(base, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serial.encode("utf-8")).hexdigest()


def mensaje_desde_evento(evento: SMEvento, contacto_hash: str) -> SMMensaje:
    """Convierte un evento en mensaje sin depender de plataforma ni canal."""
    return SMMensaje(
        id=evento.id,
        tenant=evento.tenant,
        evento_id=evento.id,
        canal=evento.canal,
        actor=evento.actor,
        contacto_hash=contacto_hash,
        plantilla=evento.plantilla,
        asunto=evento.asunto,
        cuerpo=evento.cuerpo,
        estado=SMEstadoMensaje.PENDIENTE,
        idempotencia=evento.idempotencia,
        metadatos={
            "sm_origen": evento.origen,
            "sm_entidad": evento.entidad or "",
            "sm_entidad_id": evento.entidad_id or "",
            "sm_tipo_evento": evento.tipo_evento,
            **evento.payload,
        },
    )


def transicion_estado(actual: SMEstadoMensaje, nuevo: SMEstadoMensaje) -> SMEstadoMensaje:
    """Transiciones controladas. El outbox no regresa a pendiente salvo reintento."""
    if actual == nuevo:
        return nuevo
    if actual in (
        SMEstadoMensaje.CANCELADO,
        SMEstadoMensaje.AGOTADO,
        SMEstadoMensaje.SIMULADO,
        SMEstadoMensaje.ENVIADO,
        SMEstadoMensaje.ENTREGADO,
    ):
        raise SMError(f"No se puede cambiar un mensaje en estado {actual.value}")
    if nuevo == SMEstadoMensaje.PENDIENTE and actual != SMEstadoMensaje.FALLIDO:
        raise SMError("Solo un mensaje fallido puede volver a pendiente (reintento)")
    return nuevo


def actualizado_en() -> datetime:
    """Fecha de actualización uniforme del núcleo."""
    return datetime.now(UTC)


__all__ = [
    "FIRMA_VERSION",
    "SMCanalesNoAutorizados",
    "SMConsentimientoFaltante",
    "SMContactoInvalido",
    "SMError",
    "SMIdempotenciaConflict",
    "actualizado_en",
    "hash_contacto",
    "hash_traza",
    "mensaje_desde_evento",
    "transicion_estado",
]
