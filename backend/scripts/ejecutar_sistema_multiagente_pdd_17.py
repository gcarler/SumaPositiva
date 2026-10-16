"""Run the five-agent PDD/PDL absorption, diagnosis, and publication pipeline."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.modules.compromisos.motor_multiagente_pdd import (  # noqa: E402
    ejecutar_sistema_multiagente_pdd,
    finalizar_sistema_multiagente_pdd_desde_bd,
    preparar_sistema_multiagente_pdd,
)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", action="store_true", help="Validar corpus sin escribir.")
    parser.add_argument(
        "--no-publicar", action="store_true", help="No actualizar Google Workspace."
    )
    parser.add_argument(
        "--finalizar-desde-bd",
        action="store_true",
        help="Revalidar una ingesta ya persistida y publicar sin releer los PDF.",
    )
    args = parser.parse_args()
    if args.finalizar_desde_bd:
        payload = await finalizar_sistema_multiagente_pdd_desde_bd()
    elif args.preflight:
        payload = await preparar_sistema_multiagente_pdd()
    else:
        payload = await ejecutar_sistema_multiagente_pdd(publicar=not args.no_publicar)
    print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
