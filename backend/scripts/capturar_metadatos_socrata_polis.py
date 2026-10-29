"""Captura metadatos oficiales públicos de los datasets Socrata inventariados."""

from __future__ import annotations

import asyncio
import json

from app.modules.compromisos.metadatos_socrata_polis import capturar_metadatos
from app.modules.compromisos.series_7d_polis import RAIZ


def main() -> None:
    ruta = RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    inventario = json.loads(ruta.read_text(encoding="utf-8"))
    resultado = asyncio.run(capturar_metadatos(inventario))
    print(
        json.dumps(
            {
                clave: resultado[clave]
                for clave in (
                    "ruta",
                    "datasets_esperados",
                    "datasets_capturados",
                    "licencias_declaradas",
                    "estado",
                    "errores",
                )
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    if resultado["errores"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
