"""Procesa la captura pública real sin red, SQL ni sobrescritura de productos."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from app.modules.geodatos.analitica_multifuente import construir_analitica
from app.modules.geodatos.schemas import FiltrosMultifuente


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entrada", required=True, type=Path)
    parser.add_argument("--salida", required=True, type=Path)
    args = parser.parse_args()
    contenido = args.entrada.read_bytes()
    captura = json.loads(contenido)
    filas = captura["indicadores"]
    inicio = time.perf_counter()
    general = construir_analitica(filas, FiltrosMultifuente())
    policia = next(s.id for s in general.series if s.nombre == "Homicidio intencional" and "portal_policia" in s.fuente)
    medicina = next(s.id for s in general.series if "medicina_homicidios" in s.fuente)
    comparacion = construir_analitica(filas, FiltrosMultifuente(), serie_x=policia, serie_y=medicina)
    duracion = time.perf_counter() - inicio
    args.salida.mkdir(parents=True, exist_ok=False)
    productos = {
        "analitica_banco_real.json": general,
        "comparacion_homicidios_real.json": comparacion,
    }
    hashes = {}
    for nombre, modelo in productos.items():
        datos = (modelo.model_dump_json(indent=2) + "\n").encode()
        (args.salida / nombre).write_bytes(datos)
        hashes[nombre] = hashlib.sha256(datos).hexdigest()
    paquetes = {}
    for nombre in ("pandas", "numpy", "scipy", "geopandas", "statsmodels"):
        try:
            paquetes[nombre] = version(nombre)
        except PackageNotFoundError:
            paquetes[nombre] = "distribucion_no_instalada"
    resumen = {
        "entrada_sha256": hashlib.sha256(contenido).hexdigest(),
        "filas_entrada": len(filas),
        "filas_consulta": general.total_observaciones,
        "series": len(general.series),
        "ediciones_previas_excluidas": general.observaciones_excluidas,
        "pares_homicidios": comparacion.comparacion.muestra_total,
        "pares_elegibles": comparacion.comparacion.muestra_elegible,
        "pearson": comparacion.comparacion.pearson,
        "spearman": comparacion.comparacion.spearman,
        "segundos_dos_consultas": duracion,
        "versiones": paquetes,
        "productos_sha256": hashes,
        "sin_red": True,
        "sin_sql": True,
        "sin_imputacion": True,
        "metodo": general.version_metodo,
    }
    (args.salida / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
