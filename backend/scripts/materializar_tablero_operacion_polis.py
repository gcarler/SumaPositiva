"""Genera la instantánea de control de fuentes del corte activo."""

from __future__ import annotations

import json

from app.modules.compromisos.series_7d_polis import RAIZ
from app.modules.compromisos.tablero_operacion_fuentes_polis import materializar_tablero


def main() -> None:
    banco = RAIZ / "data/banco_fuentes_oficiales"
    resultado = materializar_tablero(
        banco / "inventario_pipeline_2026.json",
        banco / "evaluacion_estructural_2026.json",
        banco / "plan_actualizacion_2026.json",
    )
    print(json.dumps(resultado, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
