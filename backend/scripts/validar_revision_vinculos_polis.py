"""Crea plantillas o valida la doble revisión humana de vínculos PDD/PA/BPIM."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.modules.compromisos.corpus_vinculos_polis import crear_plantillas_revision, evaluar_revisiones_vinculos


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directorio", type=Path, required=True)
    parser.add_argument("--crear-plantillas", action="store_true")
    parser.add_argument("--exigir-completo", action="store_true")
    args = parser.parse_args()
    if args.crear_plantillas:
        print(json.dumps({name: str(path) for name, path in crear_plantillas_revision(args.directorio).items()}))
        return 0
    result = evaluar_revisiones_vinculos(args.directorio)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 2 if args.exigir_completo and result["estado"] != "listo_para_revision_experta" else 0


if __name__ == "__main__":
    raise SystemExit(main())
