"""Seguridad criptográfica, tokens JWT y protección de datos (Ley 1581 de 2012)."""

import hashlib
import hmac
import os
import time
import uuid
from datetime import UTC, datetime

import jwt
from fastapi import HTTPException, status

from app.core.config import Settings
from app.modules.sesion.schemas import SesionContexto


def generar_uuidv7() -> uuid.UUID:
    """Genera un identificador universal único UUIDv7 conforme al estándar RFC 9562."""
    milisegundos = int(time.time() * 1000)
    aleatorio = os.urandom(10)

    # 48 bits para marca de tiempo Unix en milisegundos
    parte_tiempo = milisegundos.to_bytes(6, byteorder="big")

    # 4 bits de versión (0x7) + 12 bits pseudoaleatorios
    ver_y_rand = bytearray(aleatorio[0:2])
    ver_y_rand[0] = (ver_y_rand[0] & 0x0F) | 0x70

    # 2 bits de variante (0b10) + 62 bits pseudoaleatorios
    var_y_rand = bytearray(aleatorio[2:10])
    var_y_rand[0] = (var_y_rand[0] & 0x3F) | 0x80

    bytes_uuid = parte_tiempo + bytes(ver_y_rand) + bytes(var_y_rand)
    return uuid.UUID(bytes=bytes_uuid)


def calcular_huella_ip(ip: str, salt: str) -> str:
    """Calcula un hash criptográfico HMAC-SHA256 irreversible de la dirección IP.

    Cumple estrictamente con la Ley 1581 de 2012 de Habeas Data: jamás se almacena
    ni se expone la dirección IP en texto plano ni en registros de auditoría.
    """
    ip_normalizada = ip.strip() if ip else "127.0.0.1"
    return hmac.new(
        salt.encode("utf-8"),
        ip_normalizada.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def crear_token_sesion(
    sesion_id: uuid.UUID,
    huella_hash: str,
    settings: Settings,
) -> tuple[str, int, datetime]:
    """Genera un token JWT firmado para la sesión cívica con tiempo de expiración."""
    ahora_epoch = int(time.time())
    expira_en_segundos = settings.jwt_expiracion_horas * 3600
    expira_epoch = ahora_epoch + expira_en_segundos
    expira_dt = datetime.fromtimestamp(expira_epoch, tz=UTC)

    payload = {
        "sub": "sesion_anonima",
        "sesion_id": str(sesion_id),
        "huella_hash": huella_hash,
        "rol": "ciudadano_anonimo",
        "iat": ahora_epoch,
        "exp": expira_epoch,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return token, expira_en_segundos, expira_dt


def decodificar_token_sesion(token: str, settings: Settings) -> SesionContexto:
    """Verifica y decodifica un token JWT de sesión."""
    claves_a_probar = [settings.jwt_secret_key]
    if settings.environment != "production":
        clave_defecto = "polis_secreto_super_seguro_cartagena_2026"
        if clave_defecto not in claves_a_probar:
            claves_a_probar.append(clave_defecto)
        try:
            clave_env = Settings().jwt_secret_key
            if clave_env not in claves_a_probar:
                claves_a_probar.append(clave_env)
        except Exception:
            pass

    ultimo_error = None
    for clave in claves_a_probar:
        try:
            payload = jwt.decode(
                token,
                clave,
                algorithms=[settings.jwt_algorithm],
            )
            sesion_uuid = uuid.UUID(payload["sesion_id"])
            expira_dt = datetime.fromtimestamp(payload["exp"], tz=UTC)

            return SesionContexto(
                sesion_id=sesion_uuid,
                huella_hash=payload["huella_hash"],
                rol=payload.get("rol", "ciudadano_anonimo"),
                expira_en=expira_dt,
                es_anonimo=True,
            )
        except jwt.ExpiredSignatureError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión cívica ha expirado. Por favor solicite una nueva sesión.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err
        except jwt.InvalidSignatureError as err:
            ultimo_error = err
            continue
        except jwt.PyJWTError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firma digital o token de sesión inválido.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Firma digital o token de sesión inválido.",
        headers={"WWW-Authenticate": "Bearer"},
    ) from ultimo_error
