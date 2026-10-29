"""CLI local del trazador documental OL-CODEX-01-R2, con salidas v4 separadas."""

from __future__ import annotations

import argparse
from pathlib import Path

from app.modules.compromisos.auditoria_indicadores_planeacion_polis import ejecutar_trazador

SHA_CATALOGO = "0ccf1867a4dedb045a627a5da0e9b3cd553f9b1d8819e74f92daaf1f1ace5c11"
CATALOGO = "data/capas_analiticas/catalogos_planeacion/" + SHA_CATALOGO + ".json"
SHA_INVENTARIO = "f494ccdf035b6021914bd9f04d6d08cce836df72a8b69c77779798d9b6982b2c"
INVENTARIO = "data/fuentes_versiones/inventarios/" + SHA_INVENTARIO + ".json"
LISTA = "bridge/18_metas_indicador_pendiente.csv"
SALIDA_JSONL = "bridge/23_evidencia_codex_indicadores_v4.jsonl"
SALIDA_RESUMEN = "bridge/23_resumen_codex_indicadores_v4.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Cotejo documental de 140 metas sin indicador")
    parser.add_argument("--raiz", default="/root/polis")
    parser.add_argument("--lista", default=LISTA)
    args = parser.parse_args()
    raiz = Path(args.raiz).resolve()
    resultado = ejecutar_trazador(
        ruta_lista=raiz / args.lista,
        ruta_catalogo=raiz / CATALOGO,
        sha_catalogo_esperado=SHA_CATALOGO,
        ruta_inventario=raiz / INVENTARIO,
        sha_inventario_esperado=SHA_INVENTARIO,
        raiz_de_repositorio=raiz,
        ruta_jsonl=SALIDA_JSONL,
        ruta_resumen=SALIDA_RESUMEN,
    )
    print(resultado["resumen"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
