"""Nodos profundos de Econometría Espacial (GeoPandas/Shapely) y Series Temporales
(statsmodels ARIMA/VAR/Chow/ISRI) más Matriz Multisectorial GBR para PDT-AI-EVALUATOR.

Implementa el Paso 3 (Autocorrelación Espacial Global/Local y Trampas Territoriales),
el Paso 4 (Pronóstico Estocástico ARIMA/VAR, Ruptura Estructural de Chow e ISRI) y la
Matriz de Evaluación Multisectorial de 5 Sectores Prioritarios bajo Gestión Basada en
Resultados (GBR).
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
import warnings
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy.stats import f as f_distribution
from scipy.stats import norm
from shapely import box, make_valid, voronoi_polygons, wkt
from shapely.geometry import MultiPoint, MultiPolygon, Point, Polygon, shape
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.vector_ar.var_model import VAR

ROOT = Path(__file__).resolve().parents[4]
BARRIOS_CARTAGENA_PATH = ROOT / "knowledge-base" / "barrios_cartagena.json"

SPATIAL_PERMUTATIONS_DEFAULT = 999
ISRI_ALERT_THRESHOLD_DEFAULT = 0.40
CHOW_BREAK_YEAR_DEFAULT = 2024

ECUACIONES_ESPACIAL_PREDICTIVO: dict[str, str] = {
    "moran_global": (
        r"I=\frac{N}{S_0}"
        r"\frac{\sum_i\sum_j w_{ij}(y_i-\bar{y})(y_j-\bar{y})}"
        r"{\sum_i(y_i-\bar{y})^2}"
    ),
    "lisa_local": r"I_i=\frac{(y_i-\bar{y})}{m_2}\sum_jw_{ij}(y_j-\bar{y})",
    "chow_test": (r"F=\frac{(RSS_R-(RSS_1+RSS_2))/k}{(RSS_1+RSS_2)/(N_1+N_2-2k)}"),
    "isri": r"ISRI=1-P(Y_{t=final}\geq Meta_{cuatrienio})",
    "dea_bcc_convexidad": r"\sum_{j=1}^{n} \lambda_j = 1",
    "malmquist": r"MPI = Techch \times Pech",
    "similaridad_coseno": (
        r"\operatorname{CosSim}(O_k,A_m)="
        r"\frac{e(O_k)\cdot e(A_m)}{\|e(O_k)\|\|e(A_m)\|}"
    ),
}

SECTORES_PRIORITARIOS_GBR: list[dict[str, Any]] = [
    {
        "sector": "Educación Pública",
        "indicadores_mir": [
            "Tasa de cobertura neta",
            "Tasa de deserción intra-anual",
            "Puntaje promedio en pruebas de logro",
        ],
        "tecnica_principal": "DEA CCR/BCC y Malmquist",
        "ecuacion_rectora": ECUACIONES_ESPACIAL_PREDICTIVO["dea_bcc_convexidad"],
        "keywords": (
            "educacion",
            "educativo",
            "escolar",
            "docente",
            "estudiante",
            "colegio",
            "aula",
            "universidad",
            "formacion",
        ),
    },
    {
        "sector": "Salud Pública",
        "indicadores_mir": [
            "Tasa de mortalidad infantil/materna",
            "Cobertura de inmunización",
            "Tiempos de atención",
        ],
        "tecnica_principal": "LISA / Moran Local",
        "ecuacion_rectora": ECUACIONES_ESPACIAL_PREDICTIVO["lisa_local"],
        "keywords": (
            "salud",
            "mortalidad",
            "inmunizacion",
            "hospital",
            "atencion",
            "vacunacion",
            "epidemiologia",
            "nutricion",
            "dadis",
        ),
    },
    {
        "sector": "Infraestructura Vial",
        "indicadores_mir": [
            "Km de vías secundarias/terciarias intervenidas",
            "Coeficiente de accesibilidad rural",
        ],
        "tecnica_principal": "NLP / BERTopic y Similaridad Coseno",
        "ecuacion_rectora": ECUACIONES_ESPACIAL_PREDICTIVO["similaridad_coseno"],
        "keywords": (
            "via",
            "vial",
            "carretera",
            "movilidad",
            "accesibilidad",
            "transporte",
            "infraestructura",
            "pavimentacion",
            "puente",
        ),
    },
    {
        "sector": "Desarrollo Agrícola",
        "indicadores_mir": [
            "Rendimiento físico por hectárea",
            "% de productores con asistencia técnica integral",
        ],
        "tecnica_principal": "Índice de Malmquist (Techch/Pech)",
        "ecuacion_rectora": ECUACIONES_ESPACIAL_PREDICTIVO["malmquist"],
        "keywords": (
            "agricola",
            "agricultura",
            "hectarea",
            "productores",
            "campesino",
            "rural",
            "agropecuario",
            "pesca",
            "cultivo",
        ),
    },
    {
        "sector": "Medio Ambiente",
        "indicadores_mir": [
            "Tasa de deforestación anual",
            "Toneladas de CO₂ mitigadas",
            "Cobertura de saneamiento",
        ],
        "tecnica_principal": "Series temporales ARIMA/VAR, Chow Test e ISRI",
        "ecuacion_rectora": ECUACIONES_ESPACIAL_PREDICTIVO["isri"],
        "keywords": (
            "ambiental",
            "ambiente",
            "deforestacion",
            "saneamiento",
            "carbono",
            "ecologico",
            "agua",
            "alcantarillado",
            "epac",
        ),
    },
]

# Coordenadas de referencia auditables (WGS84 EPSG:4326) para las 15 Unidades Comuneras
# de Gobierno (UCG) de Cartagena de Indias, agrupadas en sus 3 Localidades oficiales.
_UCG_CARTAGENA_COORDS: dict[str, tuple[float, float, str]] = {
    "1": (-75.5515, 10.4155, "loc-1"),
    "2": (-75.5280, 10.4310, "loc-1"),
    "3": (-75.5190, 10.4430, "loc-1"),
    "4": (-75.5120, 10.3990, "loc-2"),
    "5": (-75.4980, 10.4060, "loc-2"),
    "6": (-75.4740, 10.4110, "loc-2"),
    "7": (-75.4580, 10.4020, "loc-2"),
    "8": (-75.5040, 10.3860, "loc-1"),
    "9": (-75.5150, 10.3810, "loc-1"),
    "10": (-75.4940, 10.3780, "loc-1"),
    "11": (-75.4890, 10.3690, "loc-3"),
    "12": (-75.5010, 10.3590, "loc-3"),
    "13": (-75.4790, 10.3740, "loc-3"),
    "14": (-75.4690, 10.3620, "loc-3"),
    "15": (-75.4560, 10.3710, "loc-3"),
}


def _plain(value: Any) -> Any:
    """Convierte tipos de NumPy/Decimal/Pandas a primitivos serializables en JSON."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (np.floating, float)):
        val = float(value)
        return None if (math.isnan(val) or math.isinf(val)) else val
    if isinstance(value, (np.integer, int)) and not isinstance(value, bool):
        return int(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_plain(item) for item in value]
    return value


def _normalize_text(text_val: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text_val or ""))
    without_accents = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9\s]", " ", without_accents.lower()).strip()


def _sentido_indicador(name: Any) -> str:
    terms = (
        "mortalidad",
        "desercion",
        "pobreza",
        "homicidio",
        "embarazo adolescente",
        "desnutricion",
        "hurto",
        "rezago",
    )
    normalized = _normalize_text(str(name or ""))
    return "DESCENDENTE_FAVORABLE" if any(term in normalized for term in terms) else "ASCENDENTE_FAVORABLE"


def _tokenize(text_val: str) -> set[str]:
    return {tok for tok in _normalize_text(text_val).split() if len(tok) >= 3}


def _estrato_weight(estrato: str) -> float:
    """Convierte la etiqueta de estrato predominante (P1..P6) en índice de vulnerabilidad."""
    clean = str(estrato or "").strip().upper()
    mapping = {
        "P1": 52.0,
        "P2": 38.0,
        "P3": 24.0,
        "P4": 14.0,
        "P5": 7.5,
        "P6": 4.2,
    }
    return mapping.get(clean, 26.0)


def _enrich_cartagena_ucg_records(
    existing_records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Enriquece el universo espacial de Cartagena con las 15 UCG de barrios_cartagena.json
    cuando las unidades territoriales base tienen menos de 15 geometrías pero corresponden
    al Distrito de Cartagena.
    """
    if not BARRIOS_CARTAGENA_PATH.exists():
        return existing_records
    try:
        payload = json.loads(BARRIOS_CARTAGENA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return existing_records

    barrios = payload.get("barrios", [])
    if not isinstance(barrios, list) or not barrios:
        return existing_records

    # Base de indicadores por localidad existente en BD (si existe)
    loc_base_values: dict[str, float] = {
        "loc-1": 21.8,
        "loc-2": 44.6,
        "loc-3": 33.4,
    }
    indicator_name = "Índice de Pobreza Multidimensional / Vulnerabilidad UCG (%)"
    indicator_code = "IND-IPM-UCG"
    for rec in existing_records:
        name_norm = _normalize_text(str(rec.get("nombre") or ""))
        val = rec.get("valor")
        if val is not None:
            if rec.get("nombre_indicador"):
                indicator_name = str(rec["nombre_indicador"])
            if rec.get("codigo_indicador"):
                indicator_code = str(rec["codigo_indicador"])
            if "localidad 1" in name_norm or "historica" in name_norm:
                loc_base_values["loc-1"] = float(val)
            elif "localidad 2" in name_norm or "virgen" in name_norm:
                loc_base_values["loc-2"] = float(val)
            elif "localidad 3" in name_norm or "industrial" in name_norm:
                loc_base_values["loc-3"] = float(val)

    by_ucg: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in barrios:
        ucg = str(item.get("ucg") or "").strip()
        if ucg in _UCG_CARTAGENA_COORDS:
            by_ucg[ucg].append(item)

    enriched = list(existing_records)
    existing_names = {_normalize_text(str(r.get("nombre") or "")) for r in existing_records}
    for ucg_key in sorted(by_ucg, key=lambda x: int(x)):
        items = by_ucg[ucg_key]
        lon, lat, default_loc = _UCG_CARTAGENA_COORDS[ucg_key]
        loc_id = str(items[0].get("localidad_id") or default_loc)
        loc_nombre = str(items[0].get("localidad_nombre") or loc_id)
        ucg_name = f"UCG {ucg_key} ({loc_nombre.split('—')[0].strip()})"
        if _normalize_text(ucg_name) in existing_names:
            continue
        estratos = [_estrato_weight(str(b.get("estrato") or "")) for b in items]
        estrato_mean = float(np.mean(estratos)) if estratos else 25.0
        loc_anchor = loc_base_values.get(loc_id, 30.0)
        # Valor determinista combinado entre ancla de localidad y composición socioeconómica UCG
        derived_value = round(0.55 * estrato_mean + 0.45 * loc_anchor + 0.15 * int(ucg_key), 4)
        enriched.append(
            {
                "codigo": f"CTG-UCG-{int(ucg_key):02d}",
                "nombre": ucg_name,
                "tipo_territorio": "UCG",
                "lon": lon,
                "lat": lat,
                "poblacion_estimada": len(items) * 4850,
                "codigo_indicador": indicator_code,
                "nombre_indicador": indicator_name,
                "valor": derived_value,
                "inversion_per_capita_cop": round(1850000.0 / max(derived_value, 5.0), 2),
                "anio_corte": 2025,
                "fuente_datos": "knowledge-base/barrios_cartagena.json + geodatos.territorios",
                "naturaleza_dato": "DERIVADO_HEURISTICO",
                "sentido_indicador": _sentido_indicador(indicator_name),
            }
        )
    return enriched


def _should_enrich_cartagena(records: list[dict[str, Any]]) -> bool:
    """Determina si los registros pertenecen a Cartagena y requieren desagregación UCG."""
    if not records:
        return False
    valid_units = {
        str(r.get("nombre") or r.get("codigo") or "")
        for r in records
        if r.get("lon") is not None and r.get("lat") is not None and r.get("valor") is not None
    }
    if len(valid_units) >= 5:
        # Si ya hay 5 o más unidades válidas (ej. pruebas unitarias sintéticas o BD completa),
        # verificamos si son explícitamente las 4 localidades/distrito de Cartagena.
        joined = " ".join(_normalize_text(u) for u in valid_units)
        if len(valid_units) < 15 and ("cartagena" in joined or "localidad" in joined):
            return True
        return False
    joined_all = " ".join(_normalize_text(str(r.get("nombre") or r.get("codigo") or "")) for r in records)
    return "cartagena" in joined_all or "localidad" in joined_all or "13001" in joined_all


def _parse_postgis_polygon(raw_geom: Any) -> Polygon | MultiPolygon | None:
    """Parsea una geometría poligonal desde GeoJSON (str/dict), WKT o instancia Shapely."""
    if raw_geom is None:
        return None
    if isinstance(raw_geom, (Polygon, MultiPolygon)):
        return make_valid(raw_geom) if not raw_geom.is_valid else raw_geom
    if isinstance(raw_geom, dict):
        try:
            geom = shape(raw_geom)
            if isinstance(geom, (Polygon, MultiPolygon)) and not geom.is_empty:
                return make_valid(geom) if not geom.is_valid else geom
        except Exception:
            return None
    if isinstance(raw_geom, str):
        text_geom = raw_geom.strip()
        if not text_geom:
            return None
        try:
            if text_geom.startswith("{"):
                geom = shape(json.loads(text_geom))
            else:
                geom = wkt.loads(text_geom)
            if isinstance(geom, (Polygon, MultiPolygon)) and not geom.is_empty:
                return make_valid(geom) if not geom.is_valid else geom
        except Exception:
            return None
    return None


def _build_spatial_geodataframe(
    territories: list[dict[str, Any]],
) -> gpd.GeoDataFrame:
    """Construye un GeoDataFrame en EPSG:4326, lo proyecta a EPSG:3116 (MAGNA-SIRGAS) y
    prioriza los polígonos reales MultiPolygon/Polygon de PostGIS (geojson_geom/wkt_geom)
    antes de recurrir al Voronoi sintético acotado.
    """
    rows = []
    point_geometries = []
    raw_polygons_wgs84: list[Polygon | MultiPolygon | None] = []
    for item in territories:
        lon = float(item["lon"])
        lat = float(item["lat"])
        poly_wgs84 = _parse_postgis_polygon(item.get("geojson_geom") or item.get("wkt_geom"))
        rows.append(
            {
                "codigo": str(item.get("codigo") or item["nombre"]),
                "nombre": str(item["nombre"]),
                "tipo_territorio": str(item.get("tipo_territorio") or "TERRITORIO"),
                "lon": lon,
                "lat": lat,
                "valor": float(item["valor"]),
                "inversion_x": float(item.get("inversion_x", 0.0)),
                "poblacion_estimada": int(item.get("poblacion_estimada") or 0),
                "es_poligono_postgis": poly_wgs84 is not None,
            }
        )
        point_geometries.append(Point(lon, lat))
        raw_polygons_wgs84.append(poly_wgs84)

    gdf_wgs84 = gpd.GeoDataFrame(rows, geometry=point_geometries, crs="EPSG:4326")
    try:
        gdf_projected = gdf_wgs84.to_crs("EPSG:3116")
    except Exception:
        gdf_projected = gdf_wgs84.copy()

    gdf_projected["centroide_x_m"] = gdf_projected.geometry.x.astype(float)
    gdf_projected["centroide_y_m"] = gdf_projected.geometry.y.astype(float)

    # Proyectar polígonos reales PostGIS a EPSG:3116 cuando estén presentes
    projected_real_polys: list[Polygon | MultiPolygon | None] = [None] * len(rows)
    valid_indices = [idx for idx, p in enumerate(raw_polygons_wgs84) if p is not None]
    if valid_indices:
        try:
            poly_series = gpd.GeoSeries(
                [raw_polygons_wgs84[idx] for idx in valid_indices],
                crs="EPSG:4326",
            ).to_crs("EPSG:3116")
            for pos, orig_idx in enumerate(valid_indices):
                proj_geom = poly_series.iloc[pos]
                projected_real_polys[orig_idx] = make_valid(proj_geom) if not proj_geom.is_valid else proj_geom
        except Exception:
            for orig_idx in valid_indices:
                projected_real_polys[orig_idx] = raw_polygons_wgs84[orig_idx]

    # Construcción de polígonos Voronoi acotados únicamente como respaldo si falta polígono real
    points_list = list(gdf_projected.geometry)
    n_pts = len(points_list)
    fallback_polygons: list[Polygon | MultiPolygon] = []
    if len(valid_indices) < n_pts:
        if n_pts >= 4:
            try:
                mp = MultiPoint(points_list)
                minx, miny, maxx, maxy = mp.bounds
                span = max(maxx - minx, maxy - miny, 1000.0)
                envelope = box(
                    minx - span * 0.25,
                    miny - span * 0.25,
                    maxx + span * 0.25,
                    maxy + span * 0.25,
                )
                vor_collection = voronoi_polygons(mp, extend_to=envelope)
                vor_polys = list(vor_collection.geoms)
                for pt in points_list:
                    matched = next(
                        (poly for poly in vor_polys if poly.contains(pt) or poly.touches(pt)),
                        None,
                    )
                    if matched is None:
                        matched = min(vor_polys, key=lambda poly: poly.distance(pt))
                    fallback_polygons.append(matched.intersection(envelope))
            except Exception:
                fallback_polygons = [pt.buffer(1500.0) for pt in points_list]
        else:
            fallback_polygons = [pt.buffer(1500.0) for pt in points_list]
    else:
        fallback_polygons = [pt.buffer(1500.0) for pt in points_list]

    final_polygons = [
        projected_real_polys[idx] if projected_real_polys[idx] is not None else fallback_polygons[idx]
        for idx in range(n_pts)
    ]
    gdf_projected["poligono_territorial"] = final_polygons
    return gdf_projected


def _build_knn_weights_from_gdf(
    gdf: gpd.GeoDataFrame,
    k: int = 4,
) -> tuple[list[dict[int, float]], float]:
    """Construye matriz de pesos espaciales k-NN estandarizada por fila en EPSG:3116."""
    coords = list(
        zip(
            gdf["centroide_x_m"].astype(float).tolist(),
            gdf["centroide_y_m"].astype(float).tolist(),
            strict=True,
        )
    )
    n = len(coords)
    k_eff = min(k, max(1, n - 1))
    weights: list[dict[int, float]] = []
    all_nn_dists: list[float] = []
    for idx, pt in enumerate(coords):
        dists = [(math.dist(pt, other), other_idx) for other_idx, other in enumerate(coords) if other_idx != idx]
        dists.sort(key=lambda item: item[0])
        chosen = dists[:k_eff]
        if chosen:
            all_nn_dists.append(chosen[0][0])
            w_val = 1.0 / len(chosen)
            weights.append({other_idx: w_val for _, other_idx in chosen})
        else:
            weights.append({})
    mean_min_dist_m = float(np.mean(all_nn_dists)) if all_nn_dists else 0.0
    return weights, mean_min_dist_m


def _build_queen_weights_from_gdf(
    gdf: gpd.GeoDataFrame,
    fallback_knn: list[dict[int, float]],
    tolerance_m: float = 15.0,
) -> list[dict[int, float]]:
    """Construye matriz de contigüidad Queen (arista, vértice o separación <= 15m por caños
    y canales internos de Cartagena) sobre los polígonos proyectados en EPSG:3116,
    estandarizada por fila.
    """
    polys: list[Polygon | MultiPolygon] = list(gdf["poligono_territorial"])
    n = len(polys)
    queen_weights: list[dict[int, float]] = []
    for i in range(n):
        poly_i = polys[i]
        neighbors = [
            j
            for j in range(n)
            if j != i
            and (
                poly_i.touches(polys[j])
                or poly_i.intersects(polys[j])
                or float(poly_i.distance(polys[j])) <= tolerance_m
            )
        ]
        if neighbors:
            w_val = 1.0 / len(neighbors)
            queen_weights.append({j: w_val for j in neighbors})
        else:
            queen_weights.append(dict(fallback_knn[i]) if i < len(fallback_knn) else {})
    return queen_weights


def _global_moran_from_weights(
    values: np.ndarray,
    weights: list[dict[int, float]],
) -> float:
    n = len(values)
    z = values - values.mean()
    denom = float(np.sum(z**2))
    s0 = float(sum(sum(row.values()) for row in weights))
    if denom <= 1e-12 or s0 <= 1e-12:
        return 0.0
    numerator = sum(z[i] * sum(w_ij * z[j] for j, w_ij in row.items()) for i, row in enumerate(weights))
    return float((n / s0) * (numerator / denom))


def _bivariate_moran_xy(
    x_values: np.ndarray,
    y_values: np.ndarray,
    weights: list[dict[int, float]],
) -> float:
    """Calcula el Índice de Moran Bivariado I_XY entre inversión/insumo X y resultado Y."""
    if len(x_values) < 5 or float(np.std(x_values)) <= 1e-12 or float(np.std(y_values)) <= 1e-12:
        return 0.0
    zx = (x_values - x_values.mean()) / float(x_values.std())
    zy = (y_values - y_values.mean()) / float(y_values.std())
    s0 = float(sum(sum(row.values()) for row in weights))
    denom = float(np.sum(zx**2))
    if s0 <= 1e-12 or denom <= 1e-12:
        return 0.0
    numerator = sum(zx[i] * sum(w_ij * zy[j] for j, w_ij in row.items()) for i, row in enumerate(weights))
    return float((len(x_values) / s0) * (numerator / denom))


def ejecutar_econometria_espacial_pdt(
    territory_records: list[dict[str, Any]],
    unidades_ineficientes_dea: list[str] | None = None,
    permutations: int = SPATIAL_PERMUTATIONS_DEFAULT,
) -> dict[str, Any]:
    """Ejecuta el Nodo de Econometría Espacial (Paso 3) con GeoPandas y Shapely.

    - Construye un GeoDataFrame proyectado en EPSG:3116 (MAGNA-SIRGAS Colombia) usando
      los polígonos reales ST_MultiPolygon de PostGIS (`geojson_geom` / `wkt_geom`) cuando
      están disponibles.
    - Genera matrices de pesos espaciales W_Queen (contigüidad poligonal exacta en EPSG:3116
      con tolerancia de 15m para canales/cuerpos de agua) y W_kNN (k=min(4, N-1)).
    - Calcula I de Moran Global, E[I] = -1/(N-1), Z-score, p-valor por permutación
      Monte Carlo (R=999), I de Moran Bivariado y resumen multidimensional de los 4
      indicadores territoriales (`indicadores_evaluados_multidimensional`).
    - Calcula estadísticos LISA (Moran Local I_i) y clasifica Hotspots, Coldspots y
      Outliers espaciales, cruzándolos con unidades DEA ineficientes para detectar
      Trampas Territoriales de Gestión Pública.
    """
    inefficient_units = list(unidades_ineficientes_dea or [])
    working_records = list(territory_records or [])
    enriched_with_ucg = False
    if _should_enrich_cartagena(working_records):
        working_records = _enrich_cartagena_ucg_records(working_records)
        enriched_with_ucg = True

    for record in working_records:
        if not record.get("naturaleza_dato"):
            source_name = str(record.get("fuente_datos") or "").casefold()
            record["naturaleza_dato"] = "ESTIMADO_EVIDENCIA_PDD" if "pdd" in source_name else "OBSERVADO_BD"
        record.setdefault(
            "sentido_indicador",
            _sentido_indicador(record.get("nombre_indicador") or record.get("codigo_indicador")),
        )

    grouped: dict[str, dict[str, Any]] = {}
    for record in working_records:
        name = str(record.get("nombre") or record.get("codigo") or "").strip()
        if not name or record.get("lon") is None or record.get("lat") is None:
            continue
        entry = grouped.setdefault(
            name,
            {
                "codigo": record.get("codigo") or name,
                "nombre": name,
                "tipo_territorio": record.get("tipo_territorio") or "TERRITORIO",
                "lon": float(record["lon"]),
                "lat": float(record["lat"]),
                "poblacion_estimada": record.get("poblacion_estimada"),
                "inversion_per_capita_cop": record.get("inversion_per_capita_cop"),
                "geojson_geom": record.get("geojson_geom"),
                "wkt_geom": record.get("wkt_geom"),
                "indicadores": [],
                "naturaleza_dato": record.get("naturaleza_dato") or "OBSERVADO_BD",
                "sentido_indicador": record.get("sentido_indicador")
                or _sentido_indicador(record.get("nombre_indicador")),
            },
        )
        if not entry.get("geojson_geom") and record.get("geojson_geom"):
            entry["geojson_geom"] = record.get("geojson_geom")
        if not entry.get("wkt_geom") and record.get("wkt_geom"):
            entry["wkt_geom"] = record.get("wkt_geom")
        if record.get("valor") is not None:
            ind_code = str(record.get("codigo_indicador") or "IND-TERR")
            ind_val = float(record["valor"])
            if ind_code == "IND_INVERSION_PER_CAPITA_PDT_COP":
                entry["inversion_per_capita_cop"] = ind_val
            entry["indicadores"].append(
                {
                    "codigo": ind_code,
                    "nombre": record.get("nombre_indicador") or "Indicador Territorial",
                    "valor": ind_val,
                    "anio": record.get("anio_corte"),
                    "fuente": record.get("fuente_datos"),
                    "naturaleza_dato": record.get("naturaleza_dato")
                    or (
                        "ESTIMADO_EVIDENCIA_PDD"
                        if "pdd" in str(record.get("fuente_datos") or "").casefold()
                        else "OBSERVADO_BD"
                    ),
                    "sentido_indicador": record.get("sentido_indicador")
                    or _sentido_indicador(record.get("nombre_indicador") or "Indicador Territorial"),
                }
            )

    territories_with_ind = [item for item in grouped.values() if item["indicadores"]]
    if not territories_with_ind:
        return _plain(
            {
                "estado": "PENDIENTE_GEOMETRIAS_O_INDICADORES",
                "registros_territoriales": _plain(working_records),
                "n": len(grouped),
                "moran_global_i": None,
                "p_valor_permutacion": None,
                "lisa": [],
                "territorios_con_geometria": len(grouped),
                "territorios_con_indicador": 0,
                "poligonos_reales_postgis": 0,
                "indicadores_evaluados_multidimensional": [],
                "hotspots": [],
                "coldspots": [],
                "outliers_espaciales": [],
                "unidades_dea_ineficientes_en_coldspots": [],
                "trampas_territoriales_gestion_publica": [],
                "observacion": ("La BD no ofrece al menos cinco territorios con geometría y un indicador comparable."),
                "geometrias": (
                    "ST_MultiPolygon / ST_X/ST_Y PostGIS, EPSG:4326 -> EPSG:3116; no se fabrican geometrías faltantes"
                ),
            }
        )

    indicators_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    indicator_code_by_name: dict[str, str] = {}
    for territory in territories_with_ind:
        seen_ind_names: set[str] = set()
        for ind in territory["indicadores"]:
            ind_name = str(ind["nombre"] or "Indicador Territorial")
            if ind_name in seen_ind_names:
                continue
            seen_ind_names.add(ind_name)
            indicator_code_by_name[ind_name] = str(ind.get("codigo") or "IND-TERR")
            val = float(ind["valor"])
            inv_x = territory.get("inversion_per_capita_cop")
            if inv_x is None:
                inv_x = 1000.0 / max(abs(val), 1.0)
            indicators_by_name[ind_name].append(
                {
                    "codigo": territory["codigo"],
                    "nombre": territory["nombre"],
                    "tipo_territorio": territory["tipo_territorio"],
                    "lon": territory["lon"],
                    "lat": territory["lat"],
                    "poblacion_estimada": territory.get("poblacion_estimada") or 0,
                    "geojson_geom": territory.get("geojson_geom"),
                    "wkt_geom": territory.get("wkt_geom"),
                    "valor": val,
                    "inversion_x": float(inv_x),
                    "fuente": ind.get("fuente"),
                    "naturaleza_dato": ind.get("naturaleza_dato", territory.get("naturaleza_dato", "OBSERVADO_BD")),
                    "sentido_indicador": ind.get(
                        "sentido_indicador",
                        territory.get("sentido_indicador", "ASCENDENTE_FAVORABLE"),
                    ),
                }
            )

    # Priorizar a igual cobertura el indicador de Rezago Estructural IPM o Densidad PDT
    most_covered = max(
        indicators_by_name,
        key=lambda key: (
            len(indicators_by_name[key]),
            indicator_code_by_name.get(key) == "IND_REZAGO_ESTRUCTURAL_IPM",
            indicator_code_by_name.get(key) == "IND_DENSIDAD_PROGRAMATICA_PDT",
        ),
    )
    selected_rows = indicators_by_name[most_covered]
    count = len(selected_rows)
    values_arr = np.asarray([row["valor"] for row in selected_rows], dtype=float)

    if count < 5 or float(np.var(values_arr)) <= 1e-12:
        return _plain(
            {
                "estado": "PENDIENTE_DATOS_ESPACIALES",
                "registros_territoriales": _plain(working_records),
                "n": count,
                "indicador": most_covered,
                "moran_global_i": None,
                "p_valor_permutacion": None,
                "lisa": [],
                "territorios_con_geometria": len(grouped),
                "territorios_con_indicador": len(territories_with_ind),
                "poligonos_reales_postgis": 0,
                "indicadores_evaluados_multidimensional": [],
                "hotspots": [],
                "coldspots": [],
                "outliers_espaciales": [],
                "unidades_dea_ineficientes_en_coldspots": [],
                "trampas_territoriales_gestion_publica": [],
                "geometrias": ("GeoPandas GeoDataFrame EPSG:4326 -> EPSG:3116; muestra insuficiente (n < 5)"),
            }
        )

    gdf = _build_spatial_geodataframe(selected_rows)
    real_poly_count = int(gdf["es_poligono_postgis"].sum())
    knn_weights, mean_nn_dist_m = _build_knn_weights_from_gdf(gdf, k=4)
    queen_weights = _build_queen_weights_from_gdf(gdf, knn_weights, tolerance_m=15.0)

    numbers = gdf["valor"].to_numpy(dtype=float)
    inv_x_arr = gdf["inversion_x"].to_numpy(dtype=float)
    names = gdf["nombre"].astype(str).tolist()
    codes = gdf["codigo"].astype(str).tolist()

    # Cuando existen polígonos reales PostGIS para la mayoría de las unidades, usar Queen
    # como ponderación primaria de adyacencia territorial, o k-NN en caso contrario.
    primary_weights = queen_weights if real_poly_count >= max(5, count // 2) else knn_weights
    observed_knn = _global_moran_from_weights(numbers, knn_weights)
    observed_queen = _global_moran_from_weights(numbers, queen_weights)
    observed_primary = observed_queen if primary_weights is queen_weights else observed_knn
    bivariate_i = _bivariate_moran_xy(inv_x_arr, numbers, primary_weights)

    # Resumen comparativo multidimensional de los indicadores territoriales
    multidimensional_summary: list[dict[str, Any]] = []
    code_order_map = {code: idx for idx, code in enumerate(codes)}
    for ind_name, rows_ind in sorted(
        indicators_by_name.items(),
        key=lambda item: indicator_code_by_name.get(item[0], item[0]),
    ):
        if len(rows_ind) < 5:
            continue
        ordered_rows = sorted(rows_ind, key=lambda r: code_order_map.get(str(r["codigo"]), 9999))
        arr_ind = np.asarray([float(r["valor"]) for r in ordered_rows], dtype=float)
        if len(arr_ind) == count and float(np.var(arr_ind)) > 1e-12:
            m_knn = round(_global_moran_from_weights(arr_ind, knn_weights), 6)
            m_queen = round(_global_moran_from_weights(arr_ind, queen_weights), 6)
        else:
            gdf_ind = _build_spatial_geodataframe(ordered_rows)
            w_knn_i, _ = _build_knn_weights_from_gdf(gdf_ind, k=4)
            w_queen_i = _build_queen_weights_from_gdf(gdf_ind, w_knn_i, tolerance_m=15.0)
            m_knn = round(_global_moran_from_weights(arr_ind, w_knn_i), 6)
            m_queen = round(_global_moran_from_weights(arr_ind, w_queen_i), 6)
        multidimensional_summary.append(
            {
                "codigo_indicador": indicator_code_by_name.get(ind_name, "IND-TERR"),
                "nombre_indicador": ind_name,
                "naturaleza_dato": (
                    "DERIVADO_HEURISTICO"
                    if any(row.get("naturaleza_dato") == "DERIVADO_HEURISTICO" for row in rows_ind)
                    else rows_ind[0].get("naturaleza_dato", "OBSERVADO_BD")
                ),
                "naturaleza_dato_por_observacion": {
                    value: sum(row.get("naturaleza_dato") == value for row in rows_ind)
                    for value in (
                        "OBSERVADO_BD",
                        "ESTIMADO_EVIDENCIA_PDD",
                        "DERIVADO_HEURISTICO",
                    )
                    if any(row.get("naturaleza_dato") == value for row in rows_ind)
                },
                "sentido_indicador": rows_ind[0].get("sentido_indicador", _sentido_indicador(ind_name)),
                "n_territorios": len(arr_ind),
                "media": round(float(np.mean(arr_ind)), 4),
                "desviacion_estandar": round(float(np.std(arr_ind)), 4),
                "minimo": round(float(np.min(arr_ind)), 4),
                "maximo": round(float(np.max(arr_ind)), 4),
                "moran_global_knn_i": m_knn,
                "moran_global_queen_i": m_queen,
            }
        )

    expected_i = -1.0 / (count - 1)
    rng = np.random.default_rng(20261018)
    sim_is = np.asarray(
        [_global_moran_from_weights(rng.permutation(numbers), primary_weights) for _ in range(permutations)],
        dtype=float,
    )
    extreme = int(np.sum(np.abs(sim_is) >= abs(observed_primary)))
    p_value = (extreme + 1) / (permutations + 1)
    sim_std = float(np.std(sim_is)) if len(sim_is) > 1 else 0.0
    z_score_global = (observed_primary - expected_i) / sim_std if sim_std > 1e-12 else 0.0

    centered = numbers - numbers.mean()
    std_val = float(numbers.std())
    z_scores = centered / std_val if std_val > 1e-12 else np.zeros_like(centered)
    m2 = float(np.sum(centered**2)) / count

    local_rows: list[dict[str, Any]] = []
    local_rng = np.random.default_rng(20261019)
    local_perms = min(permutations, 199)
    for idx, row_weights in enumerate(primary_weights):
        lag = float(sum(w_ij * centered[j] for j, w_ij in row_weights.items()))
        local_i = float(centered[idx] * lag / m2) if m2 > 1e-12 else 0.0
        null_values = []
        for _ in range(local_perms):
            permuted = local_rng.permutation(centered)
            null_values.append(float(permuted[idx] * sum(w_ij * permuted[j] for j, w_ij in row_weights.items()) / m2))
        local_p = (sum(abs(val) >= abs(local_i) for val in null_values) + 1) / (len(null_values) + 1)
        if z_scores[idx] >= 0 and lag >= 0:
            cuadrante = "Alto-Alto (Hotspots)"
        elif z_scores[idx] < 0 and lag < 0:
            cuadrante = "Bajo-Bajo (Coldspots)"
        elif z_scores[idx] >= 0 > lag:
            cuadrante = "Alto-Bajo (Outlier espacial)"
        else:
            cuadrante = "Bajo-Alto (Outlier espacial)"

        is_significant = local_p <= 0.05
        cluster = cuadrante if is_significant else "No significativo"
        local_rows.append(
            {
                "codigo": codes[idx],
                "unidad": names[idx],
                "naturaleza_dato": selected_rows[idx].get("naturaleza_dato", "OBSERVADO_BD"),
                "sentido_indicador": selected_rows[idx].get("sentido_indicador", _sentido_indicador(most_covered)),
                "valor": round(float(numbers[idx]), 4),
                "Ii": round(local_i, 8),
                "p_valor_permutacion": round(float(local_p), 6),
                "significancia_estadistica": "SIGNIFICATIVO_P_005"
                if is_significant
                else "EXPLORATORIO_NO_SIGNIFICATIVO",
                "cluster": cluster,
                "cuadrante_moran": cuadrante,
                "z_score": round(float(z_scores[idx]), 6),
                "lag_espacial": round(lag, 6),
                "vecinos_queen": len(queen_weights[idx]),
            }
        )

    hotspots = sorted(
        {
            item["unidad"]
            for item in local_rows
            if "Alto-Alto" in item["cluster"] or (p_value < 0.05 and "Alto-Alto" in item["cuadrante_moran"])
        }
    )
    coldspots_sig = {item["unidad"] for item in local_rows if "Bajo-Bajo" in item["cluster"]}
    coldspots_quad = {
        item["unidad"] for item in local_rows if "Bajo-Bajo" in item["cuadrante_moran"] and item["z_score"] <= -0.35
    }
    coldspots = sorted(coldspots_sig)
    coldspots_exploratorios = sorted(coldspots_quad - coldspots_sig)
    outliers = sorted({item["unidad"] for item in local_rows if "Outlier" in item["cluster"]})

    # Cruce de unidades ineficientes DEA con Coldspots (por localidad/UCG)
    traps: list[str] = []
    trap_details: list[dict[str, Any]] = []
    trap_hypotheses: list[dict[str, Any]] = []
    for unit in sorted(set(inefficient_units)):
        matched_coldspot = next(
            (cs for cs in coldspots if cs.casefold() in unit.casefold() or unit.casefold() in cs.casefold()),
            None,
        )
        if matched_coldspot is not None:
            traps.append(unit)
            trap_details.append(
                {
                    "unidad_dmu": unit,
                    "estado_vinculo": "VINCULO_ACREDITADO",
                    "coldspot_asociado": matched_coldspot,
                    "alerta": "Trampa Territorial de Gestión Pública",
                    "diagnostico": (
                        f"DMU ineficiente ({unit}) opera sobre territorio en rezago espacial ({matched_coldspot})."
                    ),
                }
            )
            continue
        matched_exploratory = next(
            (
                cs
                for cs in coldspots_exploratorios
                if cs.casefold() in unit.casefold() or unit.casefold() in cs.casefold()
            ),
            None,
        )
        if matched_exploratory is not None:
            trap_hypotheses.append(
                {
                    "unidad_dmu": unit,
                    "estado_vinculo": "HIPOTESIS_PENDIENTE_REVISION",
                    "coldspots_candidatos": [matched_exploratory],
                    "coincidencia_territorial_explicita": True,
                    "significancia_estadistica": "EXPLORATORIO_NO_SIGNIFICATIVO",
                    "requiere_soporte_proyecto_territorio": True,
                }
            )
            continue
        normalized_unit = _normalize_text(unit)
        generic_terms = ("educacion", "salud", "infraestructura", "social", "localidad")
        if any(token in normalized_unit for token in generic_terms) and (coldspots or coldspots_exploratorios):
            trap_hypotheses.append(
                {
                    "unidad_dmu": unit,
                    "estado_vinculo": "HIPOTESIS_PENDIENTE_REVISION",
                    "coldspots_candidatos": sorted(set(coldspots + coldspots_exploratorios)),
                    "senal_generica": [token for token in generic_terms if token in normalized_unit],
                    "requiere_soporte_proyecto_territorio": True,
                }
            )

    fuentes = sorted({str(row["fuente"]) for row in selected_rows if row.get("fuente")})
    return _plain(
        {
            "estado": "ESTIMADO_GEOPANDAS_LISA",
            "registros_territoriales": _plain(working_records),
            "n": count,
            "indicador": most_covered,
            "codigo_indicador": indicator_code_by_name.get(most_covered, "IND-TERR"),
            "fuentes": fuentes,
            "formula_moran": ECUACIONES_ESPACIAL_PREDICTIVO["moran_global"],
            "formula_lisa": ECUACIONES_ESPACIAL_PREDICTIVO["lisa_local"],
            "crs_origen": "EPSG:4326",
            "crs_proyectado": "EPSG:3116",
            "poligonos_reales_postgis": real_poly_count,
            "tolerancia_queen_canales_m": 15.0,
            "distancia_media_vecino_mas_cercano_m": round(mean_nn_dist_m, 2),
            "matriz_pesos": (
                "Contigüidad Queen Exacta sobre ST_MultiPolygon PostGIS en EPSG:3116 "
                "(tolerancia 15m para canales) + k-NN (k=min(4,n-1)) estandarizada por fila"
                if real_poly_count > 0
                else (
                    "Híbrida GeoPandas: Contigüidad Queen (Voronoi EPSG:3116) + "
                    "k-NN (k=min(4,n-1)) estandarizada por fila"
                )
            ),
            "moran_global_i": round(float(observed_primary), 8),
            "moran_global_knn_i": round(float(observed_knn), 8),
            "moran_global_queen_i": round(float(observed_queen), 8),
            "moran_bivariado_xy": round(float(bivariate_i), 8),
            "valor_esperado_e_i": round(float(expected_i), 8),
            "z_score_global": round(float(z_score_global), 6),
            "p_valor_permutacion": round(float(p_value), 6),
            "patron_espacial_significativo": bool(p_value < 0.05),
            "permutaciones_globales": permutations,
            "indicadores_evaluados_multidimensional": multidimensional_summary,
            "lisa": local_rows,
            "territorios_con_geometria": len(grouped),
            "territorios_con_indicador": len(territories_with_ind),
            "desagregacion_ucg_cartagena": enriched_with_ucg or real_poly_count >= 15,
            "hotspots": hotspots,
            "coldspots": coldspots,
            "coldspots_exploratorios": coldspots_exploratorios,
            "outliers_espaciales": outliers,
            "unidades_dea_ineficientes_en_coldspots": traps,
            "trampas_territoriales_gestion_publica": trap_details,
            "hipotesis_trampas_territoriales": trap_hypotheses,
            "geometrias": (
                f"GeoPandas GeoDataFrame proyectado en EPSG:3116 (MAGNA-SIRGAS) con "
                f"{real_poly_count}/{count} polígonos ST_MultiPolygon PostGIS reales "
                "y respaldo Voronoi acotado (Shapely)"
            ),
        }
    )


def _chow_test_statsmodels(
    years: list[int],
    values: list[float],
    break_year: int = CHOW_BREAK_YEAR_DEFAULT,
) -> dict[str, Any]:
    """Ejecuta la Prueba de Chow de Ruptura Estructural mediante regresiones OLS de
    statsmodels antes y después del año de aprobación del PDT (break_year=2024).
    """
    before = [(year, val) for year, val in zip(years, values, strict=False) if year < break_year]
    after = [(year, val) for year, val in zip(years, values, strict=False) if year >= break_year]
    if len(before) < 3 or len(after) < 2:
        return {
            "estado": "PENDIENTE_SERIE_CORTA",
            "anio_ruptura": break_year,
            "estadistico_f": None,
            "p_valor": None,
            "ruptura_estructural_significativa": False,
        }

    def _ols_rss(obs: list[tuple[int, float]]) -> float:
        x_vec = np.asarray([yr for yr, _ in obs], dtype=float)
        y_vec = np.asarray([val for _, val in obs], dtype=float)
        exog = sm.add_constant(x_vec, has_constant="add")
        fit = sm.OLS(y_vec, exog).fit()
        return float(fit.ssr)

    pooled = list(zip(years, values, strict=True))
    rss_restricted = _ols_rss(pooled)
    rss_unrestricted = _ols_rss(before) + _ols_rss(after)
    k_params = 2
    denom_df = len(pooled) - 2 * k_params
    if denom_df <= 0 or rss_unrestricted <= 1e-12:
        return {
            "estado": "PENDIENTE_VARIANZA_INSUFICIENTE",
            "anio_ruptura": break_year,
            "estadistico_f": None,
            "p_valor": None,
            "ruptura_estructural_significativa": False,
        }
    f_stat = max(0.0, (rss_restricted - rss_unrestricted) / k_params) / (rss_unrestricted / denom_df)
    p_val = float(f_distribution.sf(f_stat, k_params, denom_df))
    return {
        "estado": "ESTIMADO_STATSMODELS_OLS",
        "formula": ECUACIONES_ESPACIAL_PREDICTIVO["chow_test"],
        "anio_ruptura": break_year,
        "estadistico_f": round(float(f_stat), 8),
        "p_valor": round(p_val, 8),
        "grados_libertad": [k_params, denom_df],
        "rss_restringido": round(rss_restricted, 6),
        "rss_no_restringido": round(rss_unrestricted, 6),
        "ruptura_estructural_significativa": bool(p_val < 0.05),
    }


def _fit_arima_or_ols_series(
    years: list[int],
    values: list[float],
    final_year: int,
    *,
    use_arima: bool = True,
) -> dict[str, Any]:
    """Ajusta un modelo ARIMA(1,0,0) en statsmodels (con fallback a ARIMA(0,1,1) u OLS de
    statsmodels cuando la serie es corta o cuasi-colineal) y retorna el pronóstico y error
    estándar en t = final_year.
    """
    x_arr = np.asarray(years, dtype=float)
    y_arr = np.asarray(values, dtype=float)
    steps = max(1, int(final_year - years[-1]))

    if use_arima and len(years) >= 4 and float(np.std(y_arr)) > 1e-6:
        for order in ((1, 0, 0), (0, 1, 1)):
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    trend = "ct" if order[1] == 0 else "n"
                    model = ARIMA(
                        y_arr,
                        order=order,
                        trend=trend,
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                    )
                    res = model.fit()
                    fc = res.get_forecast(steps=steps)
                    mean_fc = float(np.asarray(fc.predicted_mean)[-1])
                    se_fc = float(np.asarray(fc.se_mean)[-1])
                    if math.isnan(mean_fc) or math.isinf(mean_fc):
                        continue
                    if math.isnan(se_fc) or math.isinf(se_fc) or se_fc <= 1e-6:
                        resid_std = float(np.std(res.resid, ddof=1)) if len(res.resid) > 1 else 1.0
                        se_fc = max(resid_std, 1e-3)
                    return {
                        "estado": "ESTIMADO_ARIMA_STATSMODELS",
                        "modelo_aplicado": f"ARIMA{order} (statsmodels)",
                        "forecast": mean_fc,
                        "sigma": se_fc,
                        "aic": round(float(res.aic), 4) if not math.isnan(float(res.aic)) else None,
                        "bic": round(float(res.bic), 4) if not math.isnan(float(res.bic)) else None,
                    }
            except Exception:
                continue

    # Regresión OLS en statsmodels cuando N == 3 o ARIMA no converge
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        exog = sm.add_constant(x_arr, has_constant="add")
        ols_res = sm.OLS(y_arr, exog).fit()
        exog_pred = np.asarray([[1.0, float(final_year)]], dtype=float)
        pred = ols_res.get_prediction(exog_pred)
        mean_fc = float(np.asarray(pred.predicted_mean)[0])
        se_fc = float(np.asarray(pred.se_obs)[0]) if hasattr(pred, "se_obs") else 0.0
        if math.isnan(se_fc) or math.isinf(se_fc) or se_fc <= 1e-6:
            residuals = y_arr - ols_res.fittedvalues
            se_fc = float(np.std(residuals, ddof=2)) if len(residuals) > 2 else 0.0
        aic_val = float(ols_res.aic) if float(ols_res.ssr) > 1e-12 else math.nan
        bic_val = float(ols_res.bic) if float(ols_res.ssr) > 1e-12 else math.nan
    return {
        "estado": "ESTIMADO_OLS_STATSMODELS",
        "modelo_aplicado": "OLS Tendencia Lineal (statsmodels)",
        "forecast": mean_fc,
        "sigma": max(0.0, se_fc),
        "aic": round(aic_val, 4) if math.isfinite(aic_val) else None,
        "bic": round(bic_val, 4) if math.isfinite(bic_val) else None,
    }


def _estimate_macro_var(
    normalized_records: list[dict[str, Any]],
    final_year: int,
) -> dict[str, Any]:
    """Ajusta un modelo Vector Autorregresivo (VAR) macro-sectorial sobre las series anuales
    de los sectores prioritarios utilizando statsmodels.tsa.vector_ar.var_model.VAR.
    """
    sector_year_vals: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    for rec in normalized_records:
        year = rec.get("vigencia")
        val = rec.get("avance_estrategico_pct")
        if val is None:
            val = rec.get("avance_fisico_pct")
        if year is None or val is None:
            continue
        blob = " ".join(
            str(rec.get(k) or "")
            for k in (
                "linea_estrategica",
                "indicador",
                "descripcion_actividad",
                "entidad_normalizada",
            )
        )
        tokens = _tokenize(blob)
        matched_sector = None
        for sec in SECTORES_PRIORITARIOS_GBR:
            if set(sec["keywords"]) & tokens:
                matched_sector = sec["sector"]
                break
        if matched_sector is None:
            matched_sector = "Educación Pública"
        sector_year_vals[matched_sector][int(year)].append(float(val))

    if len(sector_year_vals) < 2:
        return {
            "estado": "PENDIENTE_SECTORES_MULTIANUALES",
            "sectores_incluidos": list(sector_year_vals),
            "pronosticos_var": {},
        }

    all_years = sorted({yr for s_map in sector_year_vals.values() for yr in s_map})
    if len(all_years) < 4:
        return {
            "estado": "PENDIENTE_HORIZONTE_VAR",
            "anios_disponibles": all_years,
            "sectores_incluidos": sorted(sector_year_vals),
            "pronosticos_var": {},
        }

    df_dict: dict[str, list[float]] = {}
    for sector_name in sorted(sector_year_vals):
        s_map = sector_year_vals[sector_name]
        series_vals = [float(np.mean(s_map[yr])) if yr in s_map else np.nan for yr in all_years]
        s_pd = pd.Series(series_vals, index=all_years, dtype=float).interpolate(method="linear", limit_direction="both")
        if s_pd.std() > 1e-6:
            df_dict[sector_name] = s_pd.tolist()

    if len(df_dict) < 2:
        return {
            "estado": "PENDIENTE_VARIANZA_INTERSECTORIAL",
            "anios_disponibles": all_years,
            "sectores_incluidos": sorted(df_dict),
            "pronosticos_var": {},
        }

    df_var = pd.DataFrame(df_dict, index=all_years)
    # Seleccionar hasta 3 sectores con mayor varianza para VAR(1)
    top_cols = df_var.var().sort_values(ascending=False).head(min(3, max(2, len(all_years) - 2))).index.tolist()
    df_sub = df_var[top_cols]
    steps = max(1, int(final_year - all_years[-1]))
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            var_model = VAR(df_sub.to_numpy(dtype=float))
            var_res = var_model.fit(maxlags=1, trend="c")
            fc = var_res.forecast(df_sub.to_numpy(dtype=float)[-var_res.k_ar :], steps=steps)
            last_fc = fc[-1]
            forecasts = {col: round(float(last_fc[idx]), 4) for idx, col in enumerate(top_cols)}
            return {
                "estado": "ESTIMADO_VAR_STATSMODELS",
                "modelo": "VAR(1) Multivariado (statsmodels)",
                "anios_entrenamiento": all_years,
                "sectores_incluidos": top_cols,
                "horizonte_pronostico": final_year,
                "pronosticos_var": forecasts,
            }
    except Exception:
        cov_matrix = df_sub.cov().round(4).to_dict()
        return {
            "estado": "ESTIMADO_COVARIANZA_DINAMICA",
            "modelo": "Matriz de Covarianza Dinámica Intersectorial",
            "anios_entrenamiento": all_years,
            "sectores_incluidos": top_cols,
            "matriz_covarianza": cov_matrix,
            "pronosticos_var": {col: round(float(df_sub[col].iloc[-1]), 4) for col in top_cols},
        }


def ejecutar_analitica_predictiva_pdt(
    normalized_records: list[dict[str, Any]],
    time_horizon: str = "2024-2027",
    isri_threshold: float = ISRI_ALERT_THRESHOLD_DEFAULT,
) -> dict[str, Any]:
    """Ejecuta el Nodo de Analítica Predictiva y Riesgo de Incumplimiento (Paso 4).

    - Ajusta modelos ARIMA(1,0,0) y OLS en statsmodels por indicador y entidad ejecutora.
    - Ajusta un modelo VAR(1) macro-sectorial sobre las series multianuales.
    - Ejecuta la prueba de Chow (ruptura estructural en 2024).
    - Calcula el Índice Sintético de Riesgo de Incumplimiento (ISRI) y activa la bandera
      "Alto Riesgo de Incumplimiento" si ISRI > 0.40.
    """
    grouped: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    targets: dict[str, list[float]] = defaultdict(list)
    reduction_terms = (
        "mortalidad",
        "desercion",
        "pobreza",
        "homicidio",
        "embarazo adolescente",
        "desnutricion",
        "hurto",
        "rezago",
    )

    for record in normalized_records or []:
        indicator = str(record.get("indicador") or record.get("codigo_meta_pdd") or "").strip()
        year = record.get("vigencia")
        value = record.get("avance_estrategico_pct")
        if value is None:
            value = record.get("avance_fisico_pct")
        if indicator and year is not None and value is not None:
            grouped[indicator][int(year)].append(float(value))
            percentage_target = record.get("meta_cuatrienio_pct")
            annual_target = record.get("meta_programada_anual")
            if percentage_target is None and annual_target is not None and 0 < float(annual_target) <= 100:
                percentage_target = annual_target
            if percentage_target is not None and 0 < float(percentage_target) <= 100:
                targets[indicator].append(float(percentage_target))
        entity_name = record.get("entidad_normalizada")
        if entity_name and year is not None and value is not None:
            ent_key = f"Entidad Ejecutora: {entity_name}"
            grouped[ent_key][int(year)].append(float(value))
            targets[ent_key].append(100.0)

    horizon_match = re.findall(r"20\d{2}", str(time_horizon or "2024-2027"))
    final_year = max(map(int, horizon_match)) if horizon_match else 2027

    series_results: list[dict[str, Any]] = []
    for indicator, observations in grouped.items():
        years = sorted(observations)
        values = [float(np.mean(observations[year])) for year in years]
        chow_res = _chow_test_statsmodels(years, values, break_year=CHOW_BREAK_YEAR_DEFAULT)
        if len(years) < 3:
            series_results.append(
                {
                    "indicador": indicator,
                    "estado": "PENDIENTE_SERIE_CORTA",
                    "n_observaciones": len(years),
                    "pronostico_arima_var": None,
                    "chow": chow_res,
                    "ISRI": None,
                }
            )
            continue

        use_arima = len(years) >= 6 or indicator.startswith("Entidad Ejecutora:") or len(grouped) <= 30
        fit_info = _fit_arima_or_ols_series(years, values, final_year, use_arima=use_arima)
        forecast = float(fit_info["forecast"])
        sigma = float(fit_info["sigma"])
        is_percentage = all(0 <= value <= 100 for value in values)
        target = (
            max(targets[indicator])
            if targets[indicator] and is_percentage
            else 100.0
            if is_percentage
            else max(targets[indicator], default=0.0)
        )
        direction = "REDUCCION" if any(term in _normalize_text(indicator) for term in reduction_terms) else "INCREMENTO"
        if sigma > 1e-9:
            z_score = (target - forecast) / sigma
            probability_meet = float(norm.cdf(z_score if direction == "REDUCCION" else -z_score))
        else:
            met = forecast <= target if direction == "REDUCCION" else forecast >= target
            probability_meet = 1.0 if met else 0.0
        isri = max(0.0, min(1.0, 1.0 - probability_meet))
        ci_low = forecast - 1.96 * sigma
        ci_high = forecast + 1.96 * sigma

        holdout = None
        if len(values) >= 4:
            train = np.asarray(values[:-1], dtype=float)
            actual = float(values[-1])
            naive = float(train[-1])
            # One-step linear trend forecast on the training window, held out by year.
            model_holdout = float(np.polyval(np.polyfit(np.arange(len(train)), train, 1), len(train)))
            holdout = {
                "vigencia_holdout": years[-1],
                "valor_observado": round(actual, 6),
                "pronostico_modelo": round(model_holdout, 6),
                "mae_holdout": round(abs(actual - model_holdout), 6),
                "naive_last_value": {
                    "pronostico": round(naive, 6),
                    "mae": round(abs(actual - naive), 6),
                },
            }
        series_results.append(
            {
                "indicador": indicator,
                "sentido_indicador": direction,
                "estado": fit_info["estado"],
                "n_observaciones": len(years),
                "serie": [{"vigencia": year, "valor": round(val, 6)} for year, val in zip(years, values, strict=True)],
                "modelo_solicitado": "ARIMA/VAR (statsmodels)",
                "modelo_aplicado": fit_info["modelo_aplicado"],
                "aic": fit_info["aic"],
                "bic": fit_info["bic"],
                "pronostico_arima_var": {
                    "vigencia": final_year,
                    "valor": round(forecast, 6),
                    "error_estandar": round(sigma, 6),
                    "ic_95": [round(ci_low, 4), round(ci_high, 4)],
                },
                "meta_cuatrienio": round(target, 4),
                "unidad_meta": "PORCENTAJE" if is_percentage else "UNIDAD_INDICADOR",
                "probabilidad_cumplimiento": round(probability_meet, 8),
                "ISRI": round(isri, 8),
                "validacion_temporal_holdout": holdout,
                "bandera": ("Alto Riesgo de Incumplimiento" if isri > isri_threshold else None),
                "chow": chow_res,
            }
        )

    series_results.sort(
        key=lambda item: (
            item.get("ISRI") is None,
            -(item.get("ISRI") or 0.0),
            -int(item.get("n_observaciones") or 0),
        )
    )
    var_summary = _estimate_macro_var(normalized_records or [], final_year)

    return _plain(
        {
            "modelo": "ARIMA(1,0,0) / VAR(1) y OLS con prueba de Chow en statsmodels",
            "ecuacion_isri": ECUACIONES_ESPACIAL_PREDICTIVO["isri"],
            "ecuacion_chow": ECUACIONES_ESPACIAL_PREDICTIVO["chow_test"],
            "umbral_alto_riesgo": isri_threshold,
            "modelo_var_macrosectorial": var_summary,
            "series": series_results[:120],
            "series_evaluadas": len(series_results),
            "series_estimadas": sum(item.get("ISRI") is not None for item in series_results),
            "rupturas_estructurales_detectadas": sum(
                bool(item.get("chow", {}).get("ruptura_estructural_significativa")) for item in series_results
            ),
            "estado": "ESTIMADO" if series_results else "PENDIENTE_DATOS_MULTIANUALES",
        }
    )


def evaluar_matriz_multisectorial_gbr(
    goal_records: list[dict[str, Any]],
    activity_records: list[dict[str, Any]],
    normalized_records: list[dict[str, Any]],
    dea_scores: dict[str, Any] | None = None,
    nlp_coherence: dict[str, Any] | None = None,
    spatial_lisa: dict[str, Any] | None = None,
    time_series_forecast: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Construye la Matriz de Evaluación Multisectorial para los 5 Sectores Prioritarios
    bajo el enfoque de Gestión Basada en Resultados (GBR), consolidando metas, actividades,
    presupuesto, avance físico, eficiencia DEA, coherencia NLP e ISRI.
    """
    goals = list(goal_records or [])
    activities = list(activity_records or [])
    normalized = list(normalized_records or [])
    dea_data = dea_scores or {}
    nlp_data = nlp_coherence or {}
    spatial_data = spatial_lisa or {}
    forecast_data = time_series_forecast or {}

    goal_tokens = [
        _tokenize(" ".join(str(g.get(k) or "") for k in ("nombre", "indicador", "linea_nombre"))) for g in goals
    ]
    act_tokens = [
        _tokenize(
            " ".join(
                str(a.get(k) or "")
                for k in (
                    "entidad_responsable",
                    "programa_nombre",
                    "proyecto_nombre",
                    "descripcion_actividad",
                )
            )
        )
        for a in activities
    ]
    norm_tokens = [
        (
            rec,
            _tokenize(
                " ".join(
                    str(rec.get(k) or "")
                    for k in (
                        "entidad_normalizada",
                        "linea_estrategica",
                        "indicador",
                        "descripcion_actividad",
                    )
                )
            ),
        )
        for rec in normalized
    ]

    dmu_scores = dea_data.get("dmus", [])
    global_dea_mean = (
        float(np.mean([float(d["theta_bcc"]) for d in dmu_scores if d.get("theta_bcc") is not None]))
        if dmu_scores
        else None
    )
    nlp_pairs = nlp_data.get("pares_evaluados", [])
    global_cos_mean = float(nlp_data.get("resumen_coherencia", {}).get("similaridad_promedio") or 0.0)
    series_list = forecast_data.get("series", [])

    matrix_rows: list[dict[str, Any]] = []
    for sector_def in SECTORES_PRIORITARIOS_GBR:
        kw_set = set(sector_def["keywords"])
        matched_goals = sum(1 for toks in goal_tokens if kw_set & toks)
        matched_acts = sum(1 for toks in act_tokens if kw_set & toks)
        matched_norms = [rec for rec, toks in norm_tokens if kw_set & toks]
        total_docs = matched_goals + matched_acts + len(matched_norms)

        apropiacion = sum(float(r.get("apropiacion_definitiva_cop") or 0.0) for r in matched_norms)
        compromisos = sum(float(r.get("compromisos_rp_cop") or 0.0) for r in matched_norms)
        avances = [
            float(
                r.get("avance_estrategico_pct")
                if r.get("avance_estrategico_pct") is not None
                else r.get("avance_fisico_pct")
            )
            for r in matched_norms
            if r.get("avance_estrategico_pct") is not None or r.get("avance_fisico_pct") is not None
        ]
        mean_avance = round(float(np.mean(avances)), 2) if avances else None

        sector_dmus = [
            float(d["theta_bcc"])
            for d in dmu_scores
            if d.get("theta_bcc") is not None and (kw_set & _tokenize(str(d.get("dmu") or "")))
        ]
        dea_mean = (
            round(float(np.mean(sector_dmus)), 4)
            if sector_dmus
            else (round(global_dea_mean, 4) if global_dea_mean is not None else None)
        )

        sector_pairs = [
            float(p["similaridad_coseno_lexica"])
            for p in nlp_pairs
            if p.get("similaridad_coseno_lexica") is not None
            and (kw_set & _tokenize(f"{p.get('meta_estrategica', '')} {p.get('actividad_operativa', '')}"))
        ]
        cos_mean = round(float(np.mean(sector_pairs)), 4) if sector_pairs else round(global_cos_mean, 4)

        sector_isri = [
            float(s["ISRI"])
            for s in series_list
            if s.get("ISRI") is not None and (kw_set & _tokenize(str(s.get("indicador") or "")))
        ]
        isri_mean = (
            round(float(np.mean(sector_isri)), 4)
            if sector_isri
            else (
                round(
                    float(np.mean([float(s["ISRI"]) for s in series_list if s.get("ISRI") is not None])),
                    4,
                )
                if any(s.get("ISRI") is not None for s in series_list)
                else None
            )
        )

        if isri_mean is not None and isri_mean > ISRI_ALERT_THRESHOLD_DEFAULT:
            audit_status = "ALTO_RIESGO_INCUMPLIMIENTO_ISRI"
        elif cos_mean > 0 and cos_mean < 0.45:
            audit_status = "ALERTA_MISSION_CREEP_NLP"
        elif total_docs > 0:
            audit_status = "CONFORME_MONITOREADO_GBR"
        else:
            audit_status = "SIN_COBERTURA_CORPUS"

        matrix_rows.append(
            _plain(
                {
                    "sector": sector_def["sector"],
                    "indicadores_mir": list(sector_def["indicadores_mir"]),
                    "tecnica_principal": sector_def["tecnica_principal"],
                    "ecuacion_rectora": sector_def["ecuacion_rectora"],
                    "documentos_coincidentes": total_docs,
                    "metas_asociadas": matched_goals,
                    "actividades_asociadas": matched_acts,
                    "registros_triada_asociados": len(matched_norms),
                    "presupuesto_apropiado_cop": round(apropiacion, 2),
                    "presupuesto_ejecutado_cop": round(compromisos, 2),
                    "avance_fisico_promedio_pct": mean_avance,
                    "eficiencia_dea_promedio": dea_mean,
                    "similaridad_semantica_promedio": cos_mean,
                    "riesgo_isri_promedio": isri_mean,
                    "coldspots_territoriales_activos": len(spatial_data.get("coldspots", [])),
                    "estado_auditoria_gbr": audit_status,
                }
            )
        )

    return matrix_rows
