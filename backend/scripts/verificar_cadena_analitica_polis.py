"""Verifica y fija el recibo de una cadena 7D asociada a un run_id."""

from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

from app.modules.compromisos.cadena_analitica_corte_polis import escribir_recibo_cadena, verificar_cadena_analitica
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.series_7d_polis import RAIZ


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", type=uuid.UUID, required=True)
    parser.add_argument("--corte", type=Path, required=True)
    parser.add_argument("--corte-sha256", required=True)
    parser.add_argument("--inventario", type=Path, required=True)
    parser.add_argument("--serie", type=Path, required=True)
    parser.add_argument("--paneles", type=Path, required=True)
    parser.add_argument("--expedientes", type=Path, required=True)
    args = parser.parse_args()
    corte = ContextoCorte(args.run_id, args.corte, args.corte_sha256)
    resultado = verificar_cadena_analitica(corte, args.inventario, args.serie, args.paneles, args.expedientes)
    recibo = escribir_recibo_cadena(resultado, RAIZ / "data/capas_analiticas/derivaciones")
    print(json.dumps({**resultado.model_dump(mode="json"), "recibo": str(recibo)}, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
