"""Contactos AES-256-GCM. El repositorio no confirma y no revela el texto en errores."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from collections.abc import Mapping
from typing import Protocol

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings

from .contracts import SMCanal, SMContacto, SMMensaje
from .core import SMError, hash_contacto
from .models import (
    SMConsentimientoRegistro,
    SMContactoBovedaRegistro,
    SMEventoRegistro,
    SMMensajeRegistro,
)


class SMBovedaError(SMError):
    """Error de configuración/integridad sin texto de contacto ni bytes criptográficos."""


class SMResolutorContacto(Protocol):
    def huellas(self, tenant: str, actor: str, canal: str, identificador: str) -> tuple[str, ...]: ...

    async def resolver(self, session: AsyncSession, mensaje: SMMensaje) -> SMContacto | None: ...


def validar_datos_no_personales(*valores: str | None, contacto: str | None = None) -> None:
    """No aceptar destinos en campos libres persistentes. Los actores deben ser IDs opacos.

    Esto no convierte texto libre en anónimo: los llamadores deben enviar resúmenes
    institucionales sin nombres/datos personales, no expedientes ni plantillas de Herald.
    """
    for valor in valores:
        sin_ids = re.sub(r"\b[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\b", "", valor or "")
        sin_ids = re.sub(r"\b[12][0-9]{3}-[01][0-9]-[0-3][0-9]\b", "", sin_ids)
        telefonos = re.findall(r"(?<![\w])\+?[0-9][0-9 ()-]{8,}[0-9](?![\w])", sin_ids)
        if valor and (
            re.search(r"[^\s<>]+@[^\s<>]+\.[a-zA-Z]{2,}", valor)
            or any(len(re.sub(r"\D", "", candidato)) >= 10 for candidato in telefonos)
            or (contacto and len(contacto) >= 3 and contacto.casefold() in valor.casefold())
        ):
            raise SMError("Los campos persistentes requieren identificadores opacos y contenido sin contactos")


class SMBovedaContactoDB:
    """El cifrado liga tenant/actor/canal/hash/key_id mediante AAD.

    El worker es el único consumidor de resolver(); rotar() es la operación
    administrativa explícita para sustituir claves sin exponer el texto.
    """

    def __init__(self, *, claves: Mapping[str, bytes], key_id: str) -> None:
        if (
            not re.fullmatch(r"[a-zA-Z0-9_-]{1,40}", key_id)
            or key_id not in claves
            or len(claves) > 10
            or any(not isinstance(k, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,40}", k) for k in claves)
            or any(len(k) != 32 for k in claves.values())
        ):
            raise SMBovedaError("Configuración de bóveda no válida")
        self._claves = dict(claves)
        self.key_id = key_id

    @classmethod
    def desde_settings(cls, settings: Settings | None = None) -> SMBovedaContactoDB:
        config = settings or Settings()
        try:
            claves = (
                json.loads(config.sm_boveda_claves_anteriores.get_secret_value())
                if config.sm_boveda_claves_anteriores
                else {}
            )
            if not isinstance(claves, dict) or config.sm_boveda_key_id in claves or not config.sm_boveda_key:
                raise ValueError
            claves[config.sm_boveda_key_id] = config.sm_boveda_key.get_secret_value()
            decodificadas = {
                k: base64.b64decode(v.encode("ascii"), altchars=b"-_", validate=True) for k, v in claves.items()
            }
            return cls(claves=decodificadas, key_id=config.sm_boveda_key_id)
        except (ValueError, TypeError, AttributeError, UnicodeError):
            raise SMBovedaError("Configure POLIS_SM_BOVEDA_KEY: clave AES de 32 bytes en base64") from None

    def _secreto_huella(self, key_id: str) -> bytes:
        """Subclave HMAC independiente de la clave AES, derivada con HKDF."""
        return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=b"sm-contacto-hash-v1").derive(
            self._claves[key_id]
        )

    def huella(self, tenant: str, actor: str, canal: str, identificador: str) -> str:
        """Huella con la clave activa; es la que se persiste para contactos nuevos."""
        return hash_contacto(
            tenant,
            actor,
            canal,
            identificador,
            secreto=self._secreto_huella(self.key_id),
        )

    def huellas(self, tenant: str, actor: str, canal: str, identificador: str) -> tuple[str, ...]:
        """Huellas válidas durante una rotación: activa primero y luego las anteriores."""
        return tuple(
            hash_contacto(tenant, actor, canal, identificador, secreto=self._secreto_huella(clave))
            for clave in (self.key_id, *(clave for clave in self._claves if clave != self.key_id))
        )

    @staticmethod
    def _aad(tenant: str, actor: str, canal: str, contacto_hash: str, key_id: str) -> bytes:
        return json.dumps(
            ["sm-boveda-v1", tenant, actor, canal, contacto_hash, key_id], ensure_ascii=True, separators=(",", ":")
        ).encode()

    def _cifrar(self, texto: str, tenant: str, actor: str, canal: str, contacto_hash: str) -> bytes:
        nonce = os.urandom(12)
        aad = self._aad(tenant, actor, canal, contacto_hash, self.key_id)
        return b"\x01" + nonce + AESGCM(self._claves[self.key_id]).encrypt(nonce, texto.encode(), aad)

    def _descifrar(self, registro: SMContactoBovedaRegistro) -> str:
        try:
            datos = registro.contacto_cifrado
            if len(datos) < 30 or datos[0] != 1:
                raise ValueError
            aad = self._aad(registro.tenant, registro.actor, registro.canal, registro.contacto_hash, registro.key_id)
            texto = AESGCM(self._claves[registro.key_id]).decrypt(datos[1:13], datos[13:], aad).decode()
            if registro.contacto_hash not in self.huellas(registro.tenant, registro.actor, registro.canal, texto):
                raise ValueError
            return texto
        except (KeyError, InvalidTag, ValueError, UnicodeError):
            raise SMBovedaError("No se pudo autenticar el contacto cifrado") from None

    async def almacenar(self, session: AsyncSession, *, tenant: str, contacto: SMContacto) -> None:
        validar_datos_no_personales(tenant, contacto.actor, contacto=contacto.identificador)
        huella = self.huella(tenant, contacto.actor, contacto.canal.value, contacto.identificador)
        stmt = insert(SMContactoBovedaRegistro).values(
            tenant=tenant,
            actor=contacto.actor,
            canal=contacto.canal.value,
            contacto_hash=huella,
            contacto_cifrado=self._cifrar(contacto.identificador, tenant, contacto.actor, contacto.canal.value, huella),
            key_id=self.key_id,
        )
        await session.execute(
            stmt.on_conflict_do_update(
                index_elements=["tenant", "actor", "canal", "contacto_hash"],
                set_={
                    "contacto_cifrado": stmt.excluded.contacto_cifrado,
                    "key_id": self.key_id,
                    "actualizado_en": func.clock_timestamp(),
                },
            )
        )
        await session.flush()

    @staticmethod
    async def purgar(session: AsyncSession, *, tenant: str, actor: str, canal: SMCanal, contacto_hash: str) -> None:
        await session.execute(
            delete(SMContactoBovedaRegistro).where(
                SMContactoBovedaRegistro.tenant == tenant,
                SMContactoBovedaRegistro.actor == actor,
                SMContactoBovedaRegistro.canal == canal.value,
                SMContactoBovedaRegistro.contacto_hash == contacto_hash,
            )
        )
        await session.flush()

    async def resolver(self, session: AsyncSession, mensaje: SMMensaje) -> SMContacto | None:
        registro = await session.scalar(
            select(SMContactoBovedaRegistro).where(
                SMContactoBovedaRegistro.tenant == mensaje.tenant,
                SMContactoBovedaRegistro.actor == mensaje.actor,
                SMContactoBovedaRegistro.canal == mensaje.canal.value,
                SMContactoBovedaRegistro.contacto_hash == mensaje.contacto_hash,
            )
        )
        if registro is None:
            return None
        return SMContacto(canal=mensaje.canal, actor=mensaje.actor, identificador=self._descifrar(registro))

    async def rotar(self, session: AsyncSession, *, tenant: str, limite: int = 100) -> int:
        registros = (
            await session.scalars(
                select(SMContactoBovedaRegistro)
                .where(
                    SMContactoBovedaRegistro.tenant == tenant,
                    SMContactoBovedaRegistro.key_id != self.key_id,
                )
                .order_by(SMContactoBovedaRegistro.id)
                .limit(limite)
                .with_for_update(skip_locked=True)
            )
        ).all()
        for registro in registros:
            texto = self._descifrar(registro)
            viejo = registro.contacto_hash
            nuevo = self.huella(registro.tenant, registro.actor, registro.canal, texto)
            if nuevo != viejo:
                for modelo in (SMConsentimientoRegistro, SMMensajeRegistro, SMEventoRegistro):
                    await session.execute(
                        update(modelo)
                        .where(
                            modelo.tenant == registro.tenant,
                            modelo.actor == registro.actor,
                            modelo.canal == registro.canal,
                            modelo.contacto_hash == viejo,
                        )
                        .values(contacto_hash=nuevo)
                    )
                registro.contacto_hash = nuevo
            registro.contacto_cifrado = self._cifrar(texto, registro.tenant, registro.actor, registro.canal, nuevo)
            registro.key_id = self.key_id
            registro.actualizado_en = func.clock_timestamp()
        await session.flush()
        return len(registros)


def huella_payload(payload: dict[str, str]) -> str:
    """Guardar una huella del payload de envío, nunca el payload que contiene el destino."""
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=True).encode()).hexdigest()
