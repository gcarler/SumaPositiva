"""Script idempotente para normalizar las 4,637 metas oficiales en `seguimiento.pdd_metas_oficiales`
y poblar `seguimiento.pdd_vinculos_meta_pa_triada` en `bd_csh` sobre los 8 planes de Cartagena
(`2012-2027`: `PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`,
`PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`).

Fase [32B] — Normalización Canónica OCR + Conciliación Universal de 3 Motores de la Tríada.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (  # noqa: E402
    conciliar_y_poblar_vinculos_meta_pa_triada,
)
from app.modules.compromisos.pdt_normalizador_canonico_metas import (  # noqa: E402
    normalizar_y_actualizar_metas_oficiales,
)


def main() -> int:
    res_norm = normalizar_y_actualizar_metas_oficiales(codigo_plan=None)
    res_vinc = conciliar_y_poblar_vinculos_meta_pa_triada(codigo_plan=None)
    salida = {
        "normalizacion_metas_oficiales": res_norm,
        "conciliacion_vinculos_triada": res_vinc,
    }
    print(json.dumps(salida, indent=2, ensure_ascii=False))
    if int(res_norm.get("total_metas_normalizadas") or 0) != 4637:
        print(
            f"ERROR: se esperaban 4637 metas normalizadas en pdd_metas_oficiales, "
            f"obtenidas {res_norm.get('total_metas_normalizadas')}",
            file=sys.stderr,
        )
        return 1
    if int(res_vinc.get("total_filas_en_bd") or 0) != 4637:
        print(
            f"ERROR: se esperaban 4637 filas en pdd_vinculos_meta_pa_triada, "
            f"obtenidas {res_vinc.get('total_filas_en_bd')}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
