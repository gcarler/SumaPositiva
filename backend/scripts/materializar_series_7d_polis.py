"""Genera series analíticas 7D locales sin promoción pública."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.modules.compromisos.series_7d_polis import materializar_series


def main() -> None:
    parser = argparse.ArgumentParser(description="Materializa series 7D desde un corte canónico")
    parser.add_argument("canonico", type=Path)
    args = parser.parse_args()
    print(json.dumps(materializar_series(args.canonico), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
