"""Materializa un corte canónico reproducible sin promocionar indicadores."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

from app.modules.compromisos import contratos_observacion_polis, taxonomia_7d_polis
from app.modules.compromisos.contratos_observacion_polis import evaluar_lote, normalizar_fila

RAIZ = Path(__file__).resolve().parents[2]
INVENTARIO = RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
CONSOLIDADO = RAIZ / "data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv"
SALIDA = RAIZ / "data/capas_analiticas/observaciones"


def _sha_adaptador() -> str:
    digest = hashlib.sha256()
    for modulo in (contratos_observacion_polis, taxonomia_7d_polis):
        digest.update(Path(modulo.__file__).read_bytes())
    digest.update(Path(__file__).read_bytes())
    return digest.hexdigest()


def materializar(destino: Path = SALIDA) -> dict:
    inventario = json.loads(INVENTARIO.read_text(encoding="utf-8"))
    sha_entrada = hashlib.sha256(CONSOLIDADO.read_bytes()).hexdigest()
    if sha_entrada != inventario["corte_consolidado_sha256"]:
        raise ValueError("El consolidado cambió después del inventario")
    versiones = {fuente["fuente_clave"]: fuente["sha256_contenido"] for fuente in inventario["fuentes"]}
    with CONSOLIDADO.open(encoding="utf-8", newline="") as archivo:
        filas = list(csv.DictReader(archivo))
    calidad = evaluar_lote(filas, versiones)
    if calidad["estado"] == "rojo":
        raise ValueError(f"El lote no supera la puerta estructural: {calidad['problemas']}")
    adaptador_sha = _sha_adaptador()
    lineas = []
    for fila in filas:
        obs = normalizar_fila(fila, versiones[fila["fuente_clave"]])
        registro = obs.model_dump(mode="json")
        registro["estado_publicacion"] = "no_publicable"
        registro["corte_entrada_sha256"] = sha_entrada
        registro["adaptador_sha256"] = adaptador_sha
        lineas.append(json.dumps(registro, ensure_ascii=False, sort_keys=True))
    contenido = ("\n".join(sorted(lineas)) + "\n").encode("utf-8")
    sha_salida = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha_salida}.jsonl"
    if ruta.exists():
        if hashlib.sha256(ruta.read_bytes()).hexdigest() != sha_salida:
            raise ValueError("Artefacto canónico existente alterado")
    else:
        temporal = destino / f".{sha_salida}.tmp"
        temporal.write_bytes(contenido)
        temporal.replace(ruta)
    manifiesto = {
        "esquema": "polis.observacion_agregada.v1",
        "entrada_sha256": sha_entrada,
        "adaptador_sha256": adaptador_sha,
        "salida_sha256": sha_salida,
        "ruta": ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta),
        "filas": len(lineas),
        "calidad_estructural": calidad,
        "estado_publicacion": "no_publicable",
        "regla": "La capa tipada no acredita licencia, custodio, comparabilidad ni autorización de publicación.",
    }
    ruta_manifiesto = destino / f"{sha_salida}.manifest.json"
    manifiesto_bytes = (json.dumps(manifiesto, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    if ruta_manifiesto.exists():
        if ruta_manifiesto.read_bytes() != manifiesto_bytes:
            raise ValueError("Manifiesto canónico existente alterado")
    else:
        temporal_manifiesto = destino / f".{sha_salida}.manifest.tmp"
        temporal_manifiesto.write_bytes(manifiesto_bytes)
        temporal_manifiesto.replace(ruta_manifiesto)
    return manifiesto


def main() -> None:
    print(json.dumps(materializar(), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
