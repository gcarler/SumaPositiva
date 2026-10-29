"""Perfil verificable de las capas territoriales recibidas y activas."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd

RAIZ = Path(__file__).resolve().parents[1]
FUENTES = RAIZ / "data/cartografia_fuentes"
DRIVE = FUENTES / "drive_pshc_insumos"
SALIDA = FUENTES / "registro_capas_2026.json"
GEOJSON_ACTIVOS = (
    *sorted((RAIZ / "geodatos_cartagena/geojson").glob("*.geojson")),
    FUENTES / "ucg_cartagena_15.geojson",
    FUENTES / "poligono_sin_ucg.geojson",
)


def _sha256(ruta: Path) -> str:
    digest = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest()


def _perfil_geojson(ruta: Path, seleccion_corr: dict) -> dict:
    capa = gpd.read_file(ruta)
    geometria = capa.geometry
    es_corregimientos = ruta.relative_to(RAIZ).as_posix() == seleccion_corr["archivo_activo"]
    calidad = "pendiente_procedencia"
    invalidas = int((~geometria.is_valid).sum())
    vacias = int(geometria.is_empty.sum())
    if invalidas or vacias:
        calidad = "cuarentena_geometrica"
    if es_corregimientos:
        if len(capa) != 17 or _sha256(ruta) != seleccion_corr["sha256"]:
            raise ValueError("La capa activa de 17 corregimientos cambió sin nueva selección")
        calidad = "seleccion_analitica_procedencia_pendiente"
    return {
        "archivo": ruta.relative_to(RAIZ).as_posix(),
        "sha256": _sha256(ruta),
        "version_id": _sha256(ruta)[:16],
        "formato": "geojson",
        "registros": len(capa),
        "crs": capa.crs.to_string() if capa.crs else None,
        "geometrias": dict(Counter(geometria.geom_type.fillna("None"))),
        "geometrias_invalidas": invalidas,
        "geometrias_vacias": vacias,
        "bbox_epsg4326": list(capa.to_crs("EPSG:4326").total_bounds) if capa.crs else None,
        "columnas": [col for col in capa.columns if col != "geometry"],
        "estado_calidad": calidad,
        "activa_analisis": es_corregimientos,
        "fecha_fuente": None,
        "metodo_verificacion": "lectura_geometrica_directa",
    }


def _perfil_zip(meta: dict) -> dict:
    ruta = DRIVE / meta["archivo"]
    sha = _sha256(ruta)
    if sha != meta["sha256"]:
        raise ValueError(f"El ZIP cambió desde su perfil: {ruta}")
    invalidas = int(meta["geometrias_invalidas"])
    vacias = int(meta["geometrias_vacias"])
    return {
        "archivo": ruta.relative_to(RAIZ).as_posix(),
        "sha256": sha,
        "version_id": sha[:16],
        "formato": "zip_shp",
        "registros": meta["registros"],
        "crs": meta["crs"],
        "geometrias": meta["geometrias"],
        "geometrias_invalidas": invalidas,
        "geometrias_vacias": vacias,
        "bbox_epsg4326": meta["bbox_epsg4326"],
        "columnas": meta["columnas"],
        "estado_calidad": "cuarentena_geometrica" if invalidas or vacias else "pendiente_procedencia",
        "activa_analisis": False,
        "fecha_fuente": None,
        "metodo_verificacion": "perfil_previo_con_sha256_verificado",
    }


def generar() -> dict:
    seleccion = json.loads((FUENTES / "cartografia_corregimientos_activa.json").read_text())
    previo = json.loads((DRIVE / "inventario_capas.json").read_text())
    capas = [_perfil_geojson(ruta, seleccion) for ruta in GEOJSON_ACTIVOS]
    capas.extend(_perfil_zip(meta) for meta in previo["capas"])
    return {
        "esquema": "polis.registro_capas.v1",
        "inventariado_utc": datetime.now(UTC).isoformat(),
        "seleccion_corregimientos": seleccion,
        "capas": capas,
        "regla": "Una capa recibida no acredita custodio oficial ni geocodifica casos sin geometría propia.",
    }


def main() -> None:
    registro = generar()
    SALIDA.write_text(json.dumps(registro, ensure_ascii=False, indent=2, default=float) + "\n", encoding="utf-8")
    print(f"Catalogadas {len(registro['capas'])} capas; 17 corregimientos activos")


if __name__ == "__main__":
    main()
