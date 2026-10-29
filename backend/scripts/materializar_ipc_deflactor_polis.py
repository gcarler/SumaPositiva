"""Materializa el deflactor anual IPC oficial DANE para análisis de COP."""

from __future__ import annotations

import json

from app.modules.compromisos.ipc_deflactor_polis import materializar_deflactor


def main() -> None:
    print(json.dumps(materializar_deflactor(), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
