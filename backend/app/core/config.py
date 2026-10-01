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

    jwt_secret_key: str = "polis_secreto_super_seguro_cartagena_2026"
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

    @property
    def async_database_url(self) -> str:
        # Normalize standard PostgreSQL URLs for the asyncpg driver.
        url = (
            self.database_url
            if isinstance(self.database_url, str)
            else self.database_url.unicode_string()
        )
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
