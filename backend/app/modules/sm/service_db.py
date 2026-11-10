"""Límites de casos de uso SM. El puente compone el repositorio, no este servicio."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction

from .boveda import SMBovedaContactoDB
from .contracts import SMConsentimiento, SMEvento, SMMensaje
from .repository import SMRepository


class SMServicioDB:
    def __init__(
        self,
        session: AsyncSession,
        *,
        tenant: str = "polis",
        boveda: SMBovedaContactoDB | None = None,
        settings: Settings | None = None,
    ):
        self.session = session
        self.repo = SMRepository(tenant=tenant, boveda=boveda, settings=settings)
        self.settings = settings

    async def registrar_consentimiento(self, **datos) -> SMConsentimiento:
        async with transaction(self.session):
            if datos["consentido"] and self.repo.boveda is None:
                self.repo.boveda = SMBovedaContactoDB.desde_settings(self.settings)
            resultado = await self.repo.registrar_consentimiento(self.session, **datos)
            return SMConsentimiento.model_validate(resultado)

    async def procesar_evento(self, evento: SMEvento, *, operador: str | None = None) -> SMMensaje:
        async with transaction(self.session):
            resultado = await self.repo.procesar_evento(self.session, evento, operador=operador)
            return SMMensaje.model_validate(resultado)

    async def rotar_boveda(self, boveda: SMBovedaContactoDB, *, limite: int = 100) -> int:
        async with transaction(self.session):
            return await boveda.rotar(self.session, tenant=self.repo.tenant, limite=limite)
