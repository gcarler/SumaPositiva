"""Ejecutor SM. No migra, no configura proveedores y está apagado por defecto."""

from __future__ import annotations

import argparse
import asyncio
import json
import signal
import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings  # noqa: E402
from app.core.database import Database  # noqa: E402
from app.modules.sm.boveda import SMBovedaContactoDB  # noqa: E402
from app.modules.sm.worker import SMWorker  # noqa: E402


def argumentos(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Outbox SM (sin migraciones ni activación implícita)")
    modo = parser.add_mutually_exclusive_group(required=True)
    modo.add_argument("--once", action="store_true")
    modo.add_argument("--daemon", action="store_true")
    parser.add_argument("--tenant", default="polis")
    parser.add_argument("--limite", type=int, default=25, choices=range(1, 201), metavar="1..200")
    parser.add_argument("--intervalo", type=float, default=5)
    args = parser.parse_args(argv)
    if not 0.1 <= args.intervalo <= 60:
        parser.error("--intervalo debe estar entre 0.1 y 60 segundos")
    if not args.tenant or len(args.tenant) > 32:
        parser.error("--tenant requiere entre 1 y 32 caracteres")
    return args


async def ejecutar(args: argparse.Namespace) -> int:
    settings = Settings()
    if not settings.sm_worker_habilitado:
        print(json.dumps({"estado": "deshabilitado", "envios": 0}))
        return 0
    # Fallar antes de abrir conexiones o enviar si falta la clave.
    boveda = SMBovedaContactoDB.desde_settings(settings)
    database = Database(settings)
    worker = SMWorker(tenant=args.tenant, settings=settings, resolutor=boveda)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)
    try:
        while not stop.is_set():
            async with database.sessions() as session:
                resumen = await worker.procesar_lote(session, limite=args.limite, detener=stop.is_set)
            print(json.dumps({"estado": "ronda_completada", **asdict(resumen)}), flush=True)
            if args.once:
                break
            try:
                await asyncio.wait_for(stop.wait(), timeout=args.intervalo)
            except TimeoutError:
                pass
        return 0
    finally:
        await database.engine.dispose()


def main(argv: list[str] | None = None) -> int:
    args = argumentos(argv)
    try:
        return asyncio.run(ejecutar(args))
    except KeyboardInterrupt:
        return 130
    except Exception:
        # Nunca imprimir DSN, SQL, destinos, claves o excepciones del proveedor.
        print(json.dumps({"estado": "error", "codigo": "sm_worker_fallo"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
