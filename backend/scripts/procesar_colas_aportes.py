"""Consume una tanda finita del inbox WhatsApp o de notificaciones confirmadas.

PYTHONPATH=backend uv run --project backend python -m scripts.procesar_colas_aportes inbox --limite 50
La programación periódica y la activación de proveedores se configuran por operación.
"""

import argparse
import asyncio

from app.core.config import Settings
from app.core.database import Database
from app.modules.canales.service import CanalWhatsAppService
from app.modules.notificaciones.worker import NotificacionWorker


async def ejecutar(cola: str, limite: int) -> int:
    if limite < 1 or limite > 1000:
        raise ValueError("El límite debe estar entre 1 y 1000")
    settings = Settings()
    database = Database(settings)
    procesados = 0
    try:
        async with database.sessions() as session:
            for _ in range(limite):
                if cola == "inbox":
                    resultado = await CanalWhatsAppService(session).procesar_inbox_uno()
                else:
                    resultado = await NotificacionWorker(session, settings).procesar_uno()
                if resultado is None:
                    break
                # Solo UUID técnico, estado, intentos y radicado; sin payload/destinos.
                print(resultado.model_dump_json(), flush=True)
                procesados += 1
    finally:
        await database.engine.dispose()
    return procesados


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cola", choices=("inbox", "outbox"))
    parser.add_argument("--limite", type=int, default=50)
    args = parser.parse_args()
    asyncio.run(ejecutar(args.cola, args.limite))


if __name__ == "__main__":
    main()
