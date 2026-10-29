"""Materializa expedientes de cada punto 7D a partir de serie y paneles fijados por SHA."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.modules.compromisos.expedientes_serie_7d_polis import materializar_expedientes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serie", type=Path, required=True)
    parser.add_argument("--paneles", type=Path, required=True)
    parser.add_argument("--destino", type=Path)
    args = parser.parse_args()
    resultado = (
        materializar_expedientes(args.serie, args.paneles, args.destino)
        if args.destino is not None
        else materializar_expedientes(args.serie, args.paneles)
    )
    print(json.dumps(resultado, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
