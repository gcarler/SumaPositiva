from pathlib import Path
from typing import Literal

from pydantic import Field, PostgresDsn, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="POLIS_", env_file=BACKEND_DIR / ".env", extra="ignore")

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

    whatsapp_habilitado: bool = False
    whatsapp_app_secret: str | None = None
    whatsapp_verify_token: str | None = None

    identidad_url_publica: str = "https://seguridadhumanaintegral.org"
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_usuario: str | None = None
    smtp_contrasena: str | None = None
    smtp_remitente: str = "Polis Plataforma <no-reply@example.org>"
    smtp_tls: bool = True
    # Herald Fase 3: interruptor del resumen diario de pendientes (Encargo 275).
    herald_resumen_activo: bool = True

    # SM: apagado por defecto. Secretos separados de JWT y MFA, sin valores implícitos.
    sm_boveda_key: SecretStr | None = None
    sm_boveda_key_id: str = Field(default="v1", pattern=r"^[a-zA-Z0-9_-]{1,40}$")
    sm_boveda_claves_anteriores: SecretStr | None = None
    sm_worker_habilitado: bool = False
    sm_worker_base_segundos: int = Field(default=30, ge=1, le=3600)
    sm_worker_max_reintentos: int = Field(default=5, ge=1, le=20)
    sm_worker_lease_segundos: int = Field(default=120, ge=60, le=3600)
    sm_worker_max_espera_segundos: int = Field(default=3600, ge=60, le=86400)
    sm_http_timeout_segundos: int = Field(default=10, ge=1, le=20)
    sm_webhook_secret: SecretStr | None = None
    sm_webhook_origenes: list[str] = []
    sm_telegram_token: SecretStr | None = None
    sm_whatsapp_token: SecretStr | None = None
    sm_whatsapp_phone_id: str | None = None
    sm_whatsapp_api_version: str | None = Field(default=None, pattern=r"^v[0-9]+\.0$")
    sm_whatsapp_plantilla: str | None = None
    sm_whatsapp_plantilla_aprobada: bool = False
    sm_whatsapp_idioma: str = "es_CO"
    sm_eventos_dominio: list[str] = []
    # Corte real P5: tipos cuyo envío asume SM Core. Debe ser subconjunto de
    # sm_eventos_dominio; vacío por defecto significa que Herald envía todo.
    sm_corte_tipos: list[str] = []

    identidad_token_minutos: int = Field(default=30, ge=5, le=120)
    identidad_limite_ip: int = Field(default=60, ge=1)
    identidad_limite_cuenta: int = Field(default=10, ge=1)
    identidad_ventana_segundos: int = Field(default=900, ge=1)

    directorio_subidas: Path = BACKEND_DIR / "media" / "evidencias"
    tamano_maximo_archivo_mb: int = 10
    tipos_mime_permitidos: list[str] = ["image/jpeg", "image/png", "image/webp"]

    sesion_anonima_limite_ip: int = Field(default=30, ge=1)
    ia_limite_ip: int = Field(default=30, ge=1)
    csp_report_limite_ip: int = Field(default=60, ge=1)
    mfa_encryption_key: str | None = Field(default=None)
    mfa_roles_exigidos: str = Field(default="")
    mfa_max_intentos: int = Field(default=5, ge=1)
    mfa_bloqueo_minutos: int = Field(default=15, ge=1)
    mfa_token_expira_minutos: int = Field(default=5, ge=1)
    sentry_dsn: str | None = None
    google_requerido_para_funcionarios: bool = True
    probar_bloqueo_google_funcionarios: bool = False

    @model_validator(mode="after")
    def validar_mfa_encryption_key(self) -> "Settings":
        key = (self.mfa_encryption_key or "").strip()
        mfa_habilitado = bool((self.mfa_roles_exigidos or "").strip())
        if mfa_habilitado and not key:
            raise ValueError(
                "POLIS_MFA_ENCRYPTION_KEY es obligatoria al arrancar con MFA habilitado "
                "(POLIS_MFA_ROLES_EXIGIDOS configurado)."
            )
        if key:
            try:
                from cryptography.fernet import Fernet

                Fernet(key.encode("ascii"))
            except Exception as e:
                raise ValueError(
                    f"POLIS_MFA_ENCRYPTION_KEY no es una clave Fernet válida (32 bytes url-safe base64): {e}"
                ) from e
        return self

    @model_validator(mode="after")
    def validar_corte_sm(self) -> "Settings":
        # Un tipo cortado sin sombra previa nunca pasaría por el puente: Herald
        # seguiría enviando y la bandera no tendría efecto, en silencio.
        huerfanos = sorted({tipo for tipo in self.sm_corte_tipos if tipo not in self.sm_eventos_dominio})
        if huerfanos:
            raise ValueError(
                "POLIS_SM_CORTE_TIPOS exige que cada tipo esté también en POLIS_SM_EVENTOS_DOMINIO: "
                + ", ".join(huerfanos)
            )
        return self

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
        url = self.database_url if isinstance(self.database_url, str) else self.database_url.unicode_string()
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
