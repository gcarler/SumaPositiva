"""Ingesta del corpus PA real local en la base de pruebas fresca.

Canal idéntico al de pruebas: `IngestaMasivaService.ingerir` con metadatos de
periodo y dimensiones inferidos de la taxonomía; persistencia en la base
exclusiva polis_test* definida por POLIS_TEST_DATABASE_URL. No se usa la API ni
credenciales externas (Drive no está disponible en este entorno).
"""

import asyncio
import hashlib
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BACKEND = Path("backend")
sys.path.insert(0, str(BACKEND.resolve()))

from app.modules.compromisos.ingesta_masiva_service import IngestaMasivaService  # noqa: E402
from app.modules.compromisos.models import (  # noqa: E402
    ArchivoPlanIngerido,
    RegistroTriadaNormalizado,
)

ARCHIVO = Path("data/planes_accion/muestras_reales_cartagena/lote_cartagena_oficial_2018_2026.zip")

ORIGEN = "GOOGLE_DRIVE_SECTOR_SEGURIDAD"


async def main() -> None:
    url = os.environ["POLIS_TEST_DATABASE_URL"]
    engine = create_async_engine(url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    bytes_zip = ARCHIVO.read_bytes()
    digest = hashlib.sha256(bytes_zip).hexdigest()
    print(f"Archivo: {ARCHIVO.name} | SHA-256: {digest}")

    # El servicio deduplica por hash; si este archivo ya fue ingerido en la base
    # fresca, informamos y no repetimos el lote.
    async with sessions() as session:
        existente = await session.scalar(select(ArchivoPlanIngerido).where(ArchivoPlanIngerido.hash_sha256 == digest))
        if existente:
            print(f"Ya estaba ingerido en lote existente: {existente.lote_id}")
            return

    async with sessions() as session:
        service = IngestaMasivaService(session)
        resultado = await service.ingerir(
            [(ARCHIVO.name, bytes_zip)],
            origen=ORIGEN,
            metadatos_por_archivo={
                ARCHIVO.name: {
                    "origen_drive": ORIGEN,
                    "manifiesto": str(ARCHIVO.with_name("MANIFIESTO.md")),
                }
            },
        )
    print("Archivos procesados:", resultado.get("archivos_exitosos"))
    print("Archivos con error:", resultado.get("archivos_con_error"))
    if resultado.get("errores"):
        for e in resultado["errores"][:6]:
            print("  Error:", e.get("nombre_archivo"), e.get("error"))

    async with sessions() as session:
        rows = (
            await session.execute(
                select(
                    RegistroTriadaNormalizado.motor_destino,
                    RegistroTriadaNormalizado.periodo_gobierno,
                ).distinct()
            )
        ).all()
        total = (await session.execute(select(RegistroTriadaNormalizado.id))).scalars().all()
        print("Distribución motor/periodo:")
        for r in rows:
            print(f"  {r[0]} · {r[1]}")
        print(f"Total registros normalizados en BD: {len(total)}")

    await engine.dispose()


asyncio.run(main())
