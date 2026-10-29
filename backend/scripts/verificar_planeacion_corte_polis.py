"""Verifica matriz PDD–PA y serie 7D bajo el mismo corte sin consultar SQL."""

from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.matriz_correspondencias_corte_polis import (
    escribir_recibo_planeacion,
    verificar_planeacion_y_serie,
)
from app.modules.compromisos.series_7d_polis import RAIZ


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", type=uuid.UUID, required=True)
    parser.add_argument("--corte", type=Path, required=True)
    parser.add_argument("--corte-sha256", required=True)
    parser.add_argument("--inventario", type=Path, required=True)
    parser.add_argument("--instantanea", type=Path, required=True)
    parser.add_argument("--serie", type=Path, required=True)
    args = parser.parse_args()
    contexto = ContextoCorte(args.run_id, args.corte, args.corte_sha256)
    resultado = verificar_planeacion_y_serie(contexto, args.inventario, args.instantanea, args.serie)
    recibo = escribir_recibo_planeacion(resultado, RAIZ / "data/capas_analiticas/derivaciones")
    print(json.dumps({**resultado.model_dump(), "recibo": str(recibo)}, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
