#!/usr/bin/env python3
"""Previsualizar y aplicar exclusivamente un plan de reparación fijado por SHA.

Ejecutar desde la raíz con PYTHONPATH=backend. La base debe declararse de forma
explícita y coincidir con POLIS_DATABASE_URL; no cambia el destino configurado.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.modules.compromisos.reconciliacion_ceros_pa import aplicar_ceros, bytes_plan, previsualizar_ceros


def _crear_exclusivo(ruta: Path, contenido: bytes) -> None:
    descriptor = os.open(ruta, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "wb") as destino:
        destino.write(contenido)
        destino.flush()
        os.fsync(destino.fileno())


async def ejecutar(args: argparse.Namespace) -> dict:
    url = make_url(Settings().async_database_url)
    if not args.base or url.database != args.base:
        raise ValueError("La base declarada no coincide con el destino configurado")
    plan = None
    if args.aplicar:
        if not args.sha256_plan or args.plan.is_symlink() or not args.plan.is_file():
            raise ValueError("Aplicar requiere un plan regular y su SHA-256 explícito")
        if args.plan.stat().st_size > 8 * 1024 * 1024:
            raise ValueError("El plan excede 8 MiB")
        contenido = args.plan.read_bytes()
        plan = json.loads(contenido)
        if (
            not isinstance(plan, dict)
            or contenido != bytes_plan(plan)
            or hashlib.sha256(contenido).hexdigest() != args.sha256_plan
        ):
            raise ValueError("El archivo no coincide con el plan canónico fijado por SHA-256")
    elif args.sha256_plan:
        raise ValueError("SHA-256 solo corresponde al modo aplicar")
    motor = create_async_engine(url, hide_parameters=True)
    try:
        sesiones = async_sessionmaker(motor, expire_on_commit=False)
        async with sesiones() as sesion:
            if args.aplicar:
                resultado = await aplicar_ceros(sesion, plan, sha256_esperado=args.sha256_plan)
                return {"base": args.base, "modo": "aplicar", **resultado}
            await sesion.execute(text("SET TRANSACTION READ ONLY"))
            plan = await previsualizar_ceros(sesion)
            contenido = bytes_plan(plan)
            _crear_exclusivo(args.plan, contenido)
            return {
                "base": args.base,
                "modo": "previsualizar",
                "registros": len(plan["registros"]),
                "sha256_plan": hashlib.sha256(contenido).hexdigest(),
            }
    finally:
        await motor.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--aplicar", action="store_true")
    parser.add_argument("--sha256-plan")
    args = parser.parse_args()
    try:
        resultado = asyncio.run(ejecutar(args))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Reparación rechazada: {error}\n")
    print(json.dumps(resultado, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
