from pathlib import Path
from typing import Literal

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="POLIS_", env_file=BACKEND_DIR / ".env", extra="ignore"
    )

    environment: Literal["development", "test", "production"] = "development"
    database_url: PostgresDsn = "postgresql+asyncpg://polis:polis_local@127.0.0.1:5433/polis"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://seguridadhumanaintegral.org",
        "https://seguridadhumanaintegral.org",
        "http://www.seguridadhumanaintegral.org",
        "https://www.seguridadhumanaintegral.org",
    ]
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    jwt_secret_key: str = Field(
        ...,
        min_length=32,
        description="Clave secreta obligatoria para firma de tokens JWT (POLIS_JWT_SECRET_KEY)",
    )
    ip_salt: str = "polis_salt_habeas_data_2026"
    jwt_algorithm: str = "HS256"
    jwt_expiracion_horas: int = 24

    google_client_id: str | None = None

    identidad_url_publica: str = "https://seguridadhumanaintegral.org"
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_usuario: str | None = None
    smtp_contrasena: str | None = None
    smtp_remitente: str = "POLIS <no-reply@example.org>"
    smtp_tls: bool = True
    identidad_token_minutos: int = Field(default=30, ge=5, le=120)
    identidad_limite_ip: int = Field(default=60, ge=1)
    identidad_limite_cuenta: int = Field(default=10, ge=1)
    identidad_ventana_segundos: int = Field(default=900, ge=1)

    directorio_subidas: Path = BACKEND_DIR / "media" / "evidencias"
    tamano_maximo_archivo_mb: int = 10
    tipos_mime_permitidos: list[str] = ["image/jpeg", "image/png", "image/webp"]

    sesion_anonima_limite_ip: int = Field(default=30, ge=1)
    ia_limite_ip: int = Field(default=30, ge=1)
    sentry_dsn: str | None = None

    @property
    def cors_origins_efectivos(self) -> list[str]:
        if self.environment == "production":
            # En producción únicamente se permiten orígenes HTTPS seguros excluyendo localhost y 127.0.0.1
            filtrados = [
                o.strip()
                for o in self.cors_origins
                if o.startswith("https://") and "localhost" not in o and "127.0.0.1" not in o
            ]
            if not filtrados:
                return [
                    "https://seguridadhumanaintegral.org",
                    "https://www.seguridadhumanaintegral.org",
                ]
            return filtrados
        return self.cors_origins

    @property
    def cookie_secure(self) -> bool:
        return self.environment == "production"

    @property
    def cookie_samesite(self) -> Literal["lax", "strict", "none"]:
        return "lax"

    @property
    def async_database_url(self) -> str:
        # Normalize standard PostgreSQL URLs for the asyncpg driver.
        url = (
            self.database_url
            if isinstance(self.database_url, str)
            else self.database_url.unicode_string()
        )
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
