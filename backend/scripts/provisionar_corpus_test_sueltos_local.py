"""Ingesta de los Excel sueltos 2024/2026 en la base de pruebas fresca.

Cada archivo entra por `IngestaMasivaService.ingerir` con `periodo_gobierno`
explícito (el ZIP deduplicó por hash y quedó sin periodo, inservible para el
conciliador). Idempotente y confinado a la base polis_test*.
"""

import asyncio
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path("backend").resolve()))

from app.modules.compromisos.ingesta_masiva_service import IngestaMasivaService  # noqa: E402
from app.modules.compromisos.models import ArchivoPlanIngerido  # noqa: E402

RAIZ = Path("data/planes_accion/muestras_reales_cartagena")
CASOS = {
    "PA_2024_DADIS.xlsx": "2024_2027",
    "PA_2026_T2_DADIS.xlsx": "2024_2027",
    "PA_2026_T2_DISTRISEGURIDAD.xlsx": "2024_2027",
    "PA_2026_T2_HACIENDA.xlsx": "2024_2027",
    "PA_2026_T2_INFRAESTRUCTURA.xlsx": "2024_2027",
    "PA_2026_T2_PLANEACION.xlsx": "2024_2027",
    "PDD_2026_T2_MATRIZ.xlsx": "2024_2027",
    "PA_2024_DADIS_ENERO_derivado.csv": "2024_2027",
}


async def main() -> None:
    url = os.environ["POLIS_TEST_DATABASE_URL"]
    engine = create_async_engine(url, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    import hashlib

    for nombre, periodo in CASOS.items():
        ruta = RAIZ / nombre
        if not ruta.exists():
            print(f"Ausente, se omite: {nombre}")
            continue
        raw = ruta.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        async with sessions() as session:
            previo = await session.scalar(select(ArchivoPlanIngerido).where(ArchivoPlanIngerido.hash_sha256 == digest))
        if previo:
            print(f"Deduplicado por hash, ya estaba: {nombre}")
            continue
        async with sessions() as session:
            service = IngestaMasivaService(session)
            res = await service.ingerir(
                [(nombre, raw)],
                origen="GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                metadatos_por_archivo={nombre: {"periodo_gobierno": periodo}},
            )
        ok = int(res.get("archivos_exitosos") or 0)
        err = int(res.get("archivos_con_error") or 0)
        print(f"{nombre}: exitosos={ok} con_error={err} errores={res.get('errores')}")
        if err:
            for e in (res.get("errores") or [])[:2]:
                print("   ", e.get("nombre_archivo"), (e.get("error") or "")[:160])
    await engine.dispose()


asyncio.run(main())
