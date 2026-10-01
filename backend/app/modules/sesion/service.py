"""Servicio de lógica de negocio para emisión y verificación de sesiones anónimas."""

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.sesion.repository import SesionRepository
from app.modules.sesion.schemas import SesionAnonimaRespuesta, SesionContexto
from app.modules.sesion.security import (
    calcular_huella_ip,
    crear_token_sesion,
    decodificar_token_sesion,
    generar_uuidv7,
)


class SesionService:
    """Emisión y auditoría de sesiones deliberativas con firma digital."""

    def __init__(self, repository: SesionRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    async def emitir_sesion_anonima(
        self,
        ip_cliente: str,
        user_agent: str | None = None,
    ) -> SesionAnonimaRespuesta:
        """Emite una nueva sesión cívica anónima con token firmado."""
        async with transaction(self.repository.session):
            huella_hash = calcular_huella_ip(ip_cliente, self.settings.ip_salt)
            sesion_id = generar_uuidv7()

            token, expira_en_segundos, expira_dt = crear_token_sesion(
                sesion_id=sesion_id,
                huella_hash=huella_hash,
                settings=self.settings,
            )

            metadatos = {}
            if user_agent:
                metadatos["agente_usuario_sintetico"] = user_agent[:100]

            await self.repository.registrar_sesion(
                sesion_id=sesion_id,
                huella_hash=huella_hash,
                expira_en=expira_dt,
                metadatos=metadatos,
            )

            return SesionAnonimaRespuesta(
                token_acceso=token,
                tipo_token="Bearer",
                expira_en_segundos=expira_en_segundos,
                sesion_id=sesion_id,
                huella_hash=huella_hash,
                rol="ciudadano_anonimo",
            )

    def verificar_token(self, token: str) -> SesionContexto:
        """Verifica la autenticidad y vigencia de un token de sesión."""
        return decodificar_token_sesion(token, self.settings)
