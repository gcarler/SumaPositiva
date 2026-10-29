"""Prepara revisiones independientes y mide acuerdo al cerrarlas."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.modules.compromisos.revision_taxonomia_7d_polis import crear_plantillas, evaluar_revisiones

RAIZ = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, default=RAIZ / "bridge/12_corpus_revision_taxonomia_7d_2026.csv")
    parser.add_argument(
        "--inventario", type=Path, default=RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    )
    parser.add_argument("--directorio", type=Path, default=RAIZ / "bridge/revisiones_taxonomia_7d_2026")
    parser.add_argument("--crear-plantillas", action="store_true")
    parser.add_argument("--exigir-completo", action="store_true")
    args = parser.parse_args()
    if args.crear_plantillas:
        resultado = crear_plantillas(args.corpus, args.inventario, args.directorio)
        print(json.dumps({nombre: str(ruta) for nombre, ruta in resultado.items()}, ensure_ascii=False))
        return
    resultado = evaluar_revisiones(
        args.corpus,
        args.inventario,
        args.directorio / "revisor_1.csv",
        args.directorio / "revisor_2.csv",
        args.directorio / "adjudicacion.csv",
    )
    print(json.dumps(resultado, ensure_ascii=False, sort_keys=True))
    if args.exigir_completo and resultado["estado"] != "listo_para_revision_experta":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
