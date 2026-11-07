"""Reparación acotada del fallback histórico que sustituyó un cero observado.

El plan identifica cada fila y fija su fuente, mapeo y valor anterior. Aplicarlo
es un único caso de uso transaccional; una discrepancia revierte el lote entero.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.compromisos.ingesta_masiva_excel import _numero
from app.modules.compromisos.models import ArchivoPlanIngerido, RegistroTriadaNormalizado

RECETA_CEROS = "reconciliacion_cero_observado_pa.v1"
CLAVE_AUDITORIA = "_reconciliacion_cero_presupuestal"
MAX_CORRECCIONES = 10_000


def bytes_plan(plan: dict[str, Any]) -> bytes:
    return (
        json.dumps(plan, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n"
    ).encode()


def _sha(objeto: dict[str, Any]) -> str:
    return hashlib.sha256(bytes_plan(objeto)).hexdigest()


def _candidato(registro: RegistroTriadaNormalizado, archivo: ArchivoPlanIngerido) -> dict[str, Any] | None:
    mapeo = (archivo.mapeo_columnas or {}).get(registro.hoja_origen, {})
    if not all(c in mapeo for c in ("apropiacion_definitiva_cop", "apropiacion_inicial_cop")):
        return None
    datos = registro.datos_origen or {}
    definitiva = _numero(datos.get(mapeo["apropiacion_definitiva_cop"]))
    inicial = _numero(datos.get(mapeo["apropiacion_inicial_cop"]))
    anterior = registro.apropiacion_definitiva_cop
    if definitiva != 0 or inicial in (None, 0) or anterior == 0:
        return None
    if anterior is None or Decimal(str(anterior)) != Decimal(str(inicial)).quantize(Decimal("0.01")):
        raise ValueError("La fila no reproduce el fallback histórico; requiere revisión individual")
    if CLAVE_AUDITORIA in datos:
        raise ValueError("La fila ya declara una reparación pero su valor no es cero")
    return {
        "id": str(registro.id),
        "archivo_id": str(archivo.id),
        "archivo_sha256": archivo.hash_sha256,
        "hoja_origen": registro.hoja_origen,
        "fila_origen_num": registro.fila_origen_num,
        "valor_anterior": str(anterior),
        "valor_nuevo": "0.00",
        "datos_origen_sha256": _sha(datos),
        "mapeo_sha256": _sha(mapeo),
    }


async def previsualizar_ceros(session: AsyncSession) -> dict[str, Any]:
    consulta = (
        select(RegistroTriadaNormalizado, ArchivoPlanIngerido)
        .join(ArchivoPlanIngerido, RegistroTriadaNormalizado.archivo_id == ArchivoPlanIngerido.id)
        .where(
            RegistroTriadaNormalizado.apropiacion_definitiva_cop != 0,
            text("(mapeo_columnas->hoja_origen) ? 'apropiacion_definitiva_cop'"),
            text("(mapeo_columnas->hoja_origen) ? 'apropiacion_inicial_cop'"),
        )
        .order_by(RegistroTriadaNormalizado.id)
    )
    registros = []
    async for registro, archivo in await session.stream(consulta):
        candidato = _candidato(registro, archivo)
        if candidato:
            registros.append(candidato)
            if len(registros) > MAX_CORRECCIONES:
                raise ValueError("El plan excede el límite de reparación acotada")
    return {
        "receta": RECETA_CEROS,
        "base": await session.scalar(text("SELECT current_database()")),
        "registros": registros,
    }


async def aplicar_ceros(session: AsyncSession, plan: dict[str, Any], *, sha256_esperado: str) -> dict[str, Any]:
    if not isinstance(plan, dict):
        raise ValueError("El plan debe ser un objeto JSON")
    digest = _sha(plan)
    if digest != sha256_esperado:
        raise ValueError("El SHA-256 del plan no coincide")
    if set(plan) != {"receta", "base", "registros"} or plan["receta"] != RECETA_CEROS:
        raise ValueError("Contrato de reparación desconocido")
    filas = plan["registros"]
    if not isinstance(filas, list) or len(filas) > MAX_CORRECCIONES:
        raise ValueError("Número de correcciones no válido")
    campos = {
        "id",
        "archivo_id",
        "archivo_sha256",
        "hoja_origen",
        "fila_origen_num",
        "valor_anterior",
        "valor_nuevo",
        "datos_origen_sha256",
        "mapeo_sha256",
    }
    if any(not isinstance(fila, dict) or set(fila) != campos for fila in filas):
        raise ValueError("Contrato de fila de reparación no válido")
    try:
        ids = [uuid.UUID(fila["id"]) for fila in filas]
    except (AttributeError, TypeError, ValueError) as error:
        raise ValueError("Identificador de corrección no válido") from error
    if len(set(ids)) != len(ids) or ids != sorted(ids):
        raise ValueError("Las correcciones deben ser únicas y ordenadas")
    async with transaction(session):
        if await session.scalar(text("SELECT current_database()")) != plan["base"]:
            raise ValueError("El plan pertenece a otra base")
        pendientes = []
        ya_aplicados = 0
        for fila, identificador in zip(filas, ids, strict=True):
            resultado = (
                await session.execute(
                    select(RegistroTriadaNormalizado, ArchivoPlanIngerido)
                    .join(ArchivoPlanIngerido, RegistroTriadaNormalizado.archivo_id == ArchivoPlanIngerido.id)
                    .where(RegistroTriadaNormalizado.id == identificador)
                    .with_for_update()
                )
            ).one_or_none()
            if resultado is None:
                raise ValueError("Una fila del plan ya no existe")
            registro, archivo = resultado
            auditoria = (registro.datos_origen or {}).get(CLAVE_AUDITORIA, {})
            if registro.apropiacion_definitiva_cop == 0 and auditoria.get("plan_sha256") == digest:
                original = dict(registro.datos_origen)
                original.pop(CLAVE_AUDITORIA)
                candidato_original = _candidato(
                    RegistroTriadaNormalizado(
                        id=registro.id,
                        hoja_origen=registro.hoja_origen,
                        fila_origen_num=registro.fila_origen_num,
                        datos_origen=original,
                        apropiacion_definitiva_cop=Decimal(fila["valor_anterior"]),
                    ),
                    archivo,
                )
                if candidato_original != fila:
                    raise ValueError("La fuente cambió después de la reparación")
                ya_aplicados += 1
                continue
            if _candidato(registro, archivo) != fila:
                raise ValueError("La fila o su fuente cambió después de la previsualización")
            pendientes.append(registro)
        ahora = datetime.now(UTC).isoformat()
        for registro in pendientes:
            anterior = str(registro.apropiacion_definitiva_cop)
            registro.apropiacion_definitiva_cop = Decimal("0.00")
            registro.datos_origen = {
                **registro.datos_origen,
                CLAVE_AUDITORIA: {
                    "receta": RECETA_CEROS,
                    "plan_sha256": digest,
                    "anterior": anterior,
                    "nuevo": "0.00",
                    "aplicado_en": ahora,
                    "causa": "La apropiación definitiva observada era cero; se había usado la inicial",
                },
            }
        await session.flush()
        return {"plan_sha256": digest, "corregidos": len(pendientes), "ya_aplicados": ya_aplicados}
