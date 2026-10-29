"""Audita solapes y salida del límite distrital en capas administrativas."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
from shapely import union_all

RAIZ = Path(__file__).resolve().parents[1]
FUENTES = RAIZ / "data/cartografia_fuentes"
SALIDA = FUENTES / "auditoria_topologia_2026.json"
METRICO = "EPSG:32618"


def _sha256(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _auditar_capa(nombre: str, ruta: Path, distrito) -> dict:
    capa = gpd.read_file(ruta).to_crs(METRICO)
    geometrias = list(capa.geometry)
    invalidas = int((~capa.geometry.is_valid).sum())
    if invalidas:
        raise ValueError(f"Capa inválida en auditoría: {ruta}")
    union = union_all(geometrias)
    fuera_m2 = float(union.difference(distrito).area)
    indice = capa.sindex
    solapes = []
    parejas_solapadas = 0
    total_solape_m2 = 0.0
    for posicion, geometria in enumerate(geometrias):
        for candidata in indice.query(geometria, predicate="intersects"):
            pareja = int(candidata)
            if pareja <= posicion:
                continue
            area = float(geometria.intersection(geometrias[pareja]).area)
            if area > 1.0:
                parejas_solapadas += 1
                total_solape_m2 += area
                if len(solapes) < 25:
                    solapes.append({"fila_a": posicion, "fila_b": pareja, "area_m2": area})
    return {
        "capa": nombre,
        "archivo": ruta.relative_to(RAIZ).as_posix(),
        "sha256": _sha256(ruta),
        "registros": len(capa),
        "crs_medicion": METRICO,
        "geometrias_invalidas": invalidas,
        "area_union_m2": float(union.area),
        "area_fuera_distrito_m2": fuera_m2,
        "parejas_solapadas_mas_1m2": parejas_solapadas,
        "area_solape_parejas_m2": total_solape_m2,
        "muestra_solapes": solapes,
        "estado": "requiere_revision_topologica" if fuera_m2 > 1.0 or total_solape_m2 > 1.0 else "sin_solape_medido",
    }


def generar() -> dict:
    reparaciones = json.loads((FUENTES / "registro_correccion_geometrica_2026.json").read_text())
    derivadas = {
        Path(item["origen"]).stem: RAIZ / item["derivado"]
        for item in reparaciones["reparaciones"]
    }
    base = RAIZ / "geodatos_cartagena/geojson"
    distrito_ruta = base / "cartagena_limite_distrital.geojson"
    distrito = union_all(gpd.read_file(distrito_ruta).to_crs(METRICO).geometry)
    rutas = {
        "barrios": derivadas["cartagena_barrios"],
        "localidades": derivadas["cartagena_localidades"],
        "ucg": FUENTES / "ucg_cartagena_15.geojson",
        "corregimientos_17": base / "cartagena_corregimientos.geojson",
    }
    return {
        "esquema": "polis.auditoria_topologia.v1",
        "generado_utc": datetime.now(UTC).isoformat(),
        "limite_distrital": {
            "archivo": distrito_ruta.relative_to(RAIZ).as_posix(),
            "sha256": _sha256(distrito_ruta),
        },
        "capas": [_auditar_capa(nombre, ruta, distrito) for nombre, ruta in rutas.items()],
        "regla": "Solape >1 m² o superficie fuera del distrito exige revisión; no se redistribuyen casos.",
    }


def main() -> None:
    auditoria = generar()
    SALIDA.write_text(json.dumps(auditoria, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print({capa["capa"]: capa["estado"] for capa in auditoria["capas"]})


if __name__ == "__main__":
    main()
