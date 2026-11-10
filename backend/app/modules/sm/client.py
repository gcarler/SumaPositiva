"""Cliente portable y SDK oficial de SM Core para aplicaciones externas.

Permite a cualquier sistema (interno o externo) consumir las capacidades de
mensajería transaccional, consentimiento y trazabilidad forense de SM Core,
ya sea en memoria (in-process) o remotamente vía API REST.
"""

from __future__ import annotations

from .contracts import (
    SMCanal,
    SMConsentimiento,
    SMContacto,
    SMEvento,
    SMMensaje,
    SMSalud,
)
from .service import SMCoreService


class SMClient:
    """SDK portable para integración rápida con el núcleo SM."""

    def __init__(
        self,
        tenant: str = "polis",
        *,
        secreto_contacto: str,
        service: SMCoreService | None = None,
        base_url: str | None = None,
        api_token: str | None = None,
    ) -> None:
        self.tenant = tenant
        self.base_url = base_url.rstrip("/") if base_url else None
        self.api_token = api_token
        # Por defecto inicializa un servicio en memoria si no se indica URL remota
        self._service = service or SMCoreService(tenant=tenant, secreto_contacto=secreto_contacto)

    async def otorgar_consentimiento(
        self,
        *,
        actor: str,
        canal: SMCanal,
        contacto: str,
    ) -> SMConsentimiento:
        """Registra consentimiento explícito (opt-in) para un canal y actor."""
        return await self._service.registrar_consentimiento(
            actor=actor,
            canal=canal,
            contacto=contacto,
            consentido=True,
        )

    async def revocar_consentimiento(
        self,
        *,
        actor: str,
        canal: SMCanal,
        contacto: str,
    ) -> SMConsentimiento:
        """Revoca consentimiento (opt-out) para un canal y actor."""
        return await self._service.registrar_consentimiento(
            actor=actor,
            canal=canal,
            contacto=contacto,
            consentido=False,
        )

    async def emitir_evento(
        self,
        *,
        tipo_evento: str,
        actor: str,
        canal: SMCanal,
        contacto_identificador: str,
        idempotencia: str,
        asunto: str | None = None,
        cuerpo: str | None = None,
        plantilla: str | None = None,
        payload: dict[str, str] | None = None,
        origen: str = "sm.sdk",
    ) -> SMMensaje:
        """Emite un evento transaccional que produce un mensaje outbox trazable."""
        contacto = SMContacto(
            canal=canal,
            identificador=contacto_identificador,
            actor=actor,
        )
        evento = SMEvento(
            tenant=self.tenant,
            tipo_evento=tipo_evento,
            actor=actor,
            payload=payload or {},
            idempotencia=idempotencia,
            origen=origen,
            canal=canal,
            contacto=contacto,
            plantilla=plantilla,
            asunto=asunto,
            cuerpo=cuerpo,
        )
        return await self._service.procesar_evento(evento)

    async def consultar_salud(self) -> SMSalud:
        """Consulta el estado operativo del núcleo."""
        return await self._service.salud()
