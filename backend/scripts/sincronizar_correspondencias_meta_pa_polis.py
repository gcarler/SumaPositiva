"""Puebla candidatos 1:N meta–PA sin importes; requiere base de pruebas o --produccion."""

from __future__ import annotations

import argparse
import asyncio
import json
import os

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.compromisos.correspondencias_meta_pa_polis import sincronizar_correspondencias


async def ejecutar(url: str) -> dict:
    engine = create_async_engine(url)
    try:
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        async with sessions() as session:
            resultado = await sincronizar_correspondencias(session)
            return resultado.model_dump(mode="json")
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--produccion", action="store_true")
    args = parser.parse_args()
    prueba = os.environ.get("POLIS_TEST_DATABASE_URL")
    if prueba:
        if not (make_url(prueba).database or "").startswith("polis_test"):
            raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a polis_test*")
        url = prueba
    elif args.produccion:
        url = os.environ.get("POLIS_DATABASE_URL")
        if not url:
            raise RuntimeError("POLIS_DATABASE_URL no está disponible")
    else:
        raise RuntimeError("La carga operativa exige --produccion; las pruebas usan POLIS_TEST_DATABASE_URL")
    print(json.dumps(asyncio.run(ejecutar(url)), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
