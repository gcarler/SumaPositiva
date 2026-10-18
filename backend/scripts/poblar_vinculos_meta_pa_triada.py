"""Script idempotente para poblar `seguimiento.pdd_vinculos_meta_pa_triada` en `bd_csh`
sobre los planes `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027` y `PDL_3_2024_2027`
(`1,647` metas en total).

Fase [29B] — Conciliación canónica PDD/PDL <-> Plan de Acción <-> Tríada.
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


def main() -> int:
    resultado = conciliar_y_poblar_vinculos_meta_pa_triada(codigo_plan=None)
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
    if int(resultado.get("total_filas_en_bd") or 0) < 1647:
        print(
            f"ERROR: se esperaban >= 1647 filas en pdd_vinculos_meta_pa_triada, "
            f"obtenidas {resultado.get('total_filas_en_bd')}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
