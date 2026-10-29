"""Compara captura PPI v2 y catálogo v1 dentro de un único corte verificado."""

from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

from app.modules.compromisos.catalogo_planeacion_corte_polis import ReferenciaCatalogoPlaneacion
from app.modules.compromisos.comparacion_ppi_catalogo_polis import comparar_ppi_catalogo
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.ppi_planeacion_corte_polis import ReferenciaPPIPlaneacion


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifiesto", type=Path, required=True)
    parser.add_argument("--run-id", type=uuid.UUID, required=True)
    parser.add_argument("--sha", required=True, help="SHA256 del manifiesto de corte")
    parser.add_argument("--inventario", type=Path, required=True)
    parser.add_argument("--captura", type=Path, required=True)
    parser.add_argument("--catalogo", type=Path, required=True)
    parser.add_argument("--salida", type=Path, required=True, help="Directorio destino del informe nuevo")
    args = parser.parse_args()
    contexto = ContextoCorte(run_id=args.run_id, manifiesto=args.manifiesto, sha256=args.sha)
    ref_ppi = ReferenciaPPIPlaneacion(inventario=args.inventario, captura=args.captura)
    ref_catalogo = ReferenciaCatalogoPlaneacion(inventario=args.inventario, catalogo=args.catalogo)
    ruta, sha, informe = comparar_ppi_catalogo(contexto, ref_ppi, ref_catalogo, args.salida)
    print(
        json.dumps(
            {"ruta": str(ruta), "sha256": sha, "estado_publicacion": informe.estado_publicacion},
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
