from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import bcrypt
import jwt
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import Settings
from app.modules.identidad.schemas import SujetoAutenticadoContexto


def validar_configuracion_identidad(config: Settings) -> None:
    if config.environment == "production" and (
        len(config.jwt_secret_key) < 32
        or config.jwt_secret_key == "polis_secreto_super_seguro_cartagena_2026"
        or config.jwt_secret_key.startswith("cambiar_por_")
        or config.ip_salt == "polis_salt_habeas_data_2026"
        or config.ip_salt.startswith("cambiar_por_")
    ):
        raise HTTPException(503, "Configura los secretos de identidad antes de habilitar acceso")


def obtener_hash_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_contrasena(contrasena_plana: str, contrasena_hash: str) -> bool:
    try:
        return bcrypt.checkpw(contrasena_plana.encode("utf-8"), contrasena_hash.encode("utf-8"))
    except ValueError:
        return False


def crear_token_acceso(
    sujeto_id: UUID,
    rol: str,
    nivel_identidad: str,
    permisos: list[str],
    es_anonimo: bool = False,
    *,
    sesion_id: UUID | None = None,
    settings: Settings | None = None,
) -> str:
    config = settings or Settings()
    validar_configuracion_identidad(config)
    ahora = datetime.now(UTC)
    payload = {
        "sub": str(sujeto_id),
        "rol": rol,
        "nivel_identidad": nivel_identidad,
        "permisos": permisos,
        "es_anonimo": es_anonimo,
        "jti": str(sesion_id or uuid4()),
        "typ": "acceso_usuario",
        "iss": "polis-identidad",
        "aud": "polis-api",
        "iat": ahora,
        "exp": ahora + timedelta(hours=config.jwt_expiracion_horas),
    }
    return jwt.encode(payload, config.jwt_secret_key, algorithm=config.jwt_algorithm)


def decodificar_token_acceso(
    token: str,
    settings: Settings | None = None,
) -> SujetoAutenticadoContexto | None:
    config = settings or Settings()
    validar_configuracion_identidad(config)
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key,
            algorithms=[config.jwt_algorithm],
            issuer="polis-identidad",
            audience="polis-api",
            options={"require": ["sub", "jti", "typ", "exp", "iat", "iss", "aud"]},
        )
        if payload["typ"] != "acceso_usuario":
            return None
        return SujetoAutenticadoContexto(
            sujeto_id=UUID(payload["sub"]),
            sesion_id=UUID(payload["jti"]),
            rol=payload["rol"],
            nivel_identidad=payload["nivel_identidad"],
            permisos=payload.get("permisos", []),
            es_anonimo=payload.get("es_anonimo", False),
        )
    except (jwt.PyJWTError, ValueError, KeyError, TypeError, ValidationError):
        return None


def crear_token_desafio_mfa(
    sujeto_id: UUID,
    expira_minutos: int = 5,
    settings: Settings | None = None,
) -> str:
    config = settings or Settings()
    validar_configuracion_identidad(config)
    ahora = datetime.now(UTC)
    payload = {
        "sub": str(sujeto_id),
        "typ": "desafio_mfa",
        "iss": "polis-identidad",
        "aud": "polis-api",
        "iat": ahora,
        "exp": ahora + timedelta(minutes=expira_minutos),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, config.jwt_secret_key, algorithm=config.jwt_algorithm)


def decodificar_token_desafio_mfa(
    token: str,
    settings: Settings | None = None,
) -> UUID | None:
    config = settings or Settings()
    validar_configuracion_identidad(config)
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key,
            algorithms=[config.jwt_algorithm],
            issuer="polis-identidad",
            audience="polis-api",
            options={"require": ["sub", "jti", "typ", "exp", "iat", "iss", "aud"]},
        )
        if payload.get("typ") != "desafio_mfa":
            return None
        return UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError, TypeError):
        return None
