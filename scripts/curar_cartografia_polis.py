"""Repara geometrías inválidas en copias versionadas sin sustituir las originales."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
from shapely import make_valid, union_all
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon

RAIZ = Path(__file__).resolve().parents[1]
FUENTES = RAIZ / "data/cartografia_fuentes"
CURADAS = FUENTES / "curadas"
SALIDA = FUENTES / "registro_correccion_geometrica_2026.json"
RUTAS = (
    RAIZ / "geodatos_cartagena/geojson/cartagena_barrios.geojson",
    RAIZ / "geodatos_cartagena/geojson/cartagena_localidades.geojson",
    *(FUENTES / "drive_pshc_insumos" / nombre for nombre in (
        "ANMProyectado2040.zip", "VulBioEscOpt2040.zip",
        "VulBioEscPes2040.zip", "VulPes2040.zip",
    )),
)


def _sha256(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _poligonos(geometria):
    """Descarta residuos lineales de make_valid sin inventar superficie."""
    if isinstance(geometria, (Polygon, MultiPolygon)):
        return geometria
    if isinstance(geometria, GeometryCollection):
        partes = [_poligonos(parte) for parte in geometria.geoms]
        superficies = [parte for parte in partes if parte is not None and not parte.is_empty]
        return union_all(superficies) if superficies else None
    return None


def _reparar(ruta: Path, destino_base: Path) -> dict:
    origen = gpd.read_file("zip://" + str(ruta) if ruta.suffix.lower() == ".zip" else ruta)
    if origen.crs is None:
        raise ValueError(f"Capa sin CRS: {ruta}")
    invalidas = ~origen.geometry.is_valid
    if not invalidas.any():
        raise ValueError(f"La capa ya no contiene geometrías inválidas: {ruta}")
    curada = origen.copy()
    deltas = []
    origen_m = origen.to_crs("EPSG:32618")
    for posicion in origen.index[invalidas]:
        geometria = _poligonos(make_valid(origen.at[posicion, "geometry"]))
        if geometria is None or geometria.is_empty or not geometria.is_valid:
            raise ValueError(f"No se pudo reparar la geometría {posicion} de {ruta}")
        curada.at[posicion, "geometry"] = geometria
        area_antes = float(origen_m.loc[[posicion]].area.iloc[0])
        area_despues = float(curada.loc[[posicion]].to_crs("EPSG:32618").area.iloc[0])
        deltas.append({
            "fila": int(posicion),
            "area_original_m2": area_antes,
            "area_reparada_m2": area_despues,
            "delta_m2": area_despues - area_antes,
        })
    if int((~curada.geometry.is_valid).sum()) or int(curada.geometry.is_empty.sum()):
        raise ValueError(f"La reparación dejó geometrías inválidas o vacías: {ruta}")
    sha_origen = _sha256(ruta)
    destino = destino_base / ruta.stem / f"{sha_origen[:16]}.geojson"
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_suffix(".tmp.geojson")
    curada.to_file(temporal, driver="GeoJSON")
    temporal.replace(destino)
    return {
        "origen": ruta.relative_to(RAIZ).as_posix(),
        "sha256_origen": sha_origen,
        "derivado": destino.relative_to(RAIZ).as_posix(),
        "sha256_derivado": _sha256(destino),
        "registros": len(origen),
        "invalidas_originales": int(invalidas.sum()),
        "invalidas_derivadas": 0,
        "crs": curada.crs.to_string(),
        "cambios_area": deltas,
        "estado_calidad": "reparada_pendiente_topologia_y_procedencia",
    }


def generar(destino_base: Path = CURADAS) -> dict:
    reparaciones = [_reparar(ruta, destino_base) for ruta in RUTAS]
    return {
        "esquema": "polis.reparaciones_geometricas.v1",
        "generado_utc": datetime.now(UTC).isoformat(),
        "reparaciones": reparaciones,
        "regla": "Originales intactos; las copias no son capas activas hasta superar topología y procedencia.",
    }


def main() -> None:
    registro = generar()
    SALIDA.write_text(json.dumps(registro, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Reparadas {len(registro['reparaciones'])} capas en copias versionadas")


if __name__ == "__main__":
    main()
