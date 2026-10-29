"""Materializa paneles temporales 7D locales para gráficas verificables."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.modules.compromisos.paneles_series_7d_polis import materializar_paneles


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepara paneles temporales desde series 7D")
    parser.add_argument("series", type=Path)
    args = parser.parse_args()
    print(json.dumps(materializar_paneles(args.series), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
