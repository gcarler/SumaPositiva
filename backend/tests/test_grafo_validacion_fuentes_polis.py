"""El fan-out de versiones se une sin mezclar ni publicar fuentes."""

import asyncio
import csv
import hashlib
import json

from app.modules.compromisos.grafo_validacion_fuentes_polis import validar_fuentes_en_grafo


def _fuente(clave, fila):
    contenido = json.dumps(
        {k: v for k, v in fila.items() if k != "fecha_extraccion"}, ensure_ascii=False, sort_keys=True
    )
    sha = hashlib.sha256(contenido.encode()).hexdigest()
    return {"fuente_clave": clave, "filas": 1, "sha256_contenido": sha, "version_id": sha[:16]}


def test_fanout_valida_versiones_independientes_y_reune_resultados(tmp_path):
    ruta = tmp_path / "corte.csv"
    filas = [
        {"fuente_clave": "b", "valor": "2", "fecha_extraccion": "2026-10-22"},
        {"fuente_clave": "a", "valor": "1", "fecha_extraccion": "2026-10-22"},
    ]
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        writer = csv.DictWriter(archivo, fieldnames=list(filas[0]))
        writer.writeheader()
        writer.writerows(filas)
    fuentes = [_fuente(fila["fuente_clave"], fila) for fila in filas]
    resumen = asyncio.run(validar_fuentes_en_grafo(ruta, fuentes, max_concurrencia=2))
    assert resumen["fuentes_evaluadas"] == 2
    assert resumen["estados"] == {"validado_estructural": 2}
    assert [item["fuente_clave"] for item in resumen["resultados"]] == ["a", "b"]

    fuentes[0]["sha256_contenido"] = "0" * 64
    resumen = asyncio.run(validar_fuentes_en_grafo(ruta, fuentes, max_concurrencia=2))
    assert resumen["estados"] == {"cuarentena": 1, "validado_estructural": 1}
    assert resumen["resultados"][0]["estado"] == "validado_estructural"
    assert "version_discrepante" in resumen["resultados"][1]["problemas"]
