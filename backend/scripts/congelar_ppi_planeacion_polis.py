"""Exporta PPI cruda por plan/nodo desde una única transacción de solo lectura."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from app.modules.compromisos.ppi_planeacion_corte_polis import congelar_ppi


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True, help="Directorio destino de la captura PPI")
    parser.add_argument("--produccion", action="store_true", help="Lectura explícita autorizada por el coordinador")
    args = parser.parse_args()
    resultado = asyncio.run(congelar_ppi(args.destino, produccion=args.produccion))
    print(json.dumps(resultado, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
