"""Coteja publicaciones policiales y prepara un único producto anual para el banco.

Conserva series mensuales y registros agregados como artefactos separados. No
fuerza coincidencias ni suma ediciones; no accede a la base de la aplicación.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
DRIVE = ROOT / "data/cartografia_fuentes/drive_pshc_insumos"
FIELDS = [
    "origen",
    "fuente_clave",
    "custodio",
    "dataset_id",
    "indicador",
    "anio",
    "subtipo",
    "valor",
    "unidad",
    "ambito",
    "estado_validacion",
    "url_fuente",
    "fecha_extraccion",
    "detalle_espacial_json",
    "nota_origen",
]


def sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def write(path: Path, rows: list[dict], fields=None) -> None:
    if path.exists():
        raise ValueError(f"No sobrescribir evidencia existente: {path.name}")
    with path.open("x", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields or list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def save(path: Path, data: object) -> None:
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--captura", type=Path, required=True)
    parser.add_argument("--procesados", type=Path, required=True)
    args = parser.parse_args()
    folder = args.procesados.resolve()
    args.captura = args.captura.resolve()
    if (folder / "cotejo_resumen.json").exists():
        raise ValueError("El cotejo ya existe; no sobrescribir")
    capture = json.loads((args.captura / "manifest.json").read_text())
    processing = json.loads((folder / "procesamiento.json").read_text())
    if processing["codigo_dane"] != "13001":
        raise ValueError("Este cotejo de Cartagena exige DIVIPOLA 13001")
    for name, item in processing["archivos"].items():
        if sha(folder / name) != item["sha256"]:
            raise ValueError(f"Extracción alterada: {name}")
    assert sha(args.captura / "manifest.json") == processing["captura_manifest_sha256"]
    sources = {item["clave"]: item for item in capture["archivos"]}
    for item in sources.values():
        assert sha(args.captura / item["archivo"]) == item["sha256"]
    annual = load(folder / "cuadros_cartagena_anuales.csv")
    if any(row["codigo_dane"] != "13001" for row in annual):
        raise ValueError("El agregado contiene otro municipio")
    monthly = load(folder / "cuadros_cartagena_mensuales.csv")
    weapons = load(folder / "cuadros_cartagena_armas_mensuales.csv")
    last = load(folder / "cuadros_cartagena_ultimo_mes.csv")
    annual_values = {(int(r["anio"]), r["delito"]): int(r["valor"]) for r in annual}
    monthly_values = {
        (int(r["anio"]), int(r["mes"]), r["delito"]): int(r["valor"]) for r in monthly
    }
    if len(annual_values) != 133 or len(monthly_values) != 1539:
        raise ValueError(
            "El universo esperado 2020–septiembre 2026 cambió; revisar cobertura"
        )
    modalities = sorted(
        {
            r["delito"]
            for r in monthly
            if r["delito"].startswith("hurto_") or r["delito"] == "abigeato"
        }
    )
    assert len(modalities) == 8
    controls = []
    for (year, crime), value in sorted(annual_values.items()):
        total = sum(
            v for (y, _, d), v in monthly_values.items() if y == year and d == crime
        )
        controls.append(
            {
                "control": "anual_vs_meses",
                "anio": year,
                "mes": "",
                "delito": crime,
                "publicado": value,
                "suma_detalle": total,
                "diferencia": total - value,
            }
        )
    for (year, month, crime), value in sorted(monthly_values.items()):
        if crime == "hurtos_total":
            total = sum(monthly_values[(year, month, mode)] for mode in modalities)
            controls.append(
                {
                    "control": "total_hurto_vs_8_modalidades",
                    "anio": year,
                    "mes": month,
                    "delito": crime,
                    "publicado": value,
                    "suma_detalle": total,
                    "diferencia": total - value,
                }
            )
    weapon_totals = Counter()
    for row in weapons:
        weapon_totals[(int(row["anio"]), int(row["mes"]), row["delito"])] += int(
            row["valor"]
        )
    for (year, month, crime), value in sorted(weapon_totals.items()):
        published = monthly_values[(year, month, crime)]
        controls.append(
            {
                "control": "total_vs_armas",
                "anio": year,
                "mes": month,
                "delito": crime,
                "publicado": published,
                "suma_detalle": value,
                "diferencia": value - published,
            }
        )
    write(folder / "controles_internos.csv", controls)
    if any(row["diferencia"] for row in controls):
        raise ValueError(
            "Los cuadros tienen inconsistencias internas; detener integración"
        )

    original_zip = DRIVE / "C.S_DELICTIVO_MENSUAL_ANUAL_2020_2026.zip"
    official_zip = args.captura / sources["cuadros_mensuales_2020_2026"]["archivo"]
    if sha(original_zip) != sha(official_zip):
        raise ValueError(
            "El libro compartido corresponde a otra edición; no acreditar identidad"
        )
    drive = []
    for row in load(DRIVE / "policia_cartagena_delitos_anuales_2020_2026.csv"):
        current = annual_values[(int(row["anio"]), row["delito"])]
        drive.append(
            {
                "anio": row["anio"],
                "delito": row["delito"],
                "valor_compartido": row["casos"],
                "valor_oficial": current,
                "diferencia": current - int(row["casos"]),
                "celda_compartida": row["columna"] + row["fila"],
                "hoja": row["hoja"],
                "zip_identico_sha256": sha(official_zip),
            }
        )
    write(folder / "cotejo_excel_compartido.csv", drive)
    if len(drive) != 77 or any(row["diferencia"] for row in drive):
        raise ValueError("La extracción compartida difiere; no sustituir su serie")

    raw_values = Counter()
    for year in range(2020, 2027):
        profile = json.loads((folder / f"registros_perfil_{year}.json").read_text())
        if profile["anomalias"] or profile["iccs_no_catalogados"]:
            raise ValueError(
                "Registros con fechas discordantes o clasificación desconocida"
            )
        for row in load(folder / f"registros_cartagena_mensuales_{year}.csv"):
            raw_values[(int(row["anio"]), int(row["mes"]), row["delito"])] += int(
                row["valor"]
            )
    for year, month, crime in monthly_values:
        if crime == "hurtos_total":
            raw_values[(year, month, crime)] = sum(
                raw_values[(year, month, d)] for d in modalities
            )
    contrast = []
    for (year, month, crime), value in sorted(monthly_values.items()):
        raw = raw_values[(year, month, crime)]
        contrast.append(
            {
                "anio": year,
                "mes": month,
                "delito": crime,
                "valor_cuadro": value,
                "valor_registros": raw,
                "diferencia_registros_menos_cuadro": raw - value,
                "estado": "coincide"
                if raw == value
                else "discordancia_interna_publicador",
                "referencia_analitica": "cuadros_validados_recomendados_por_el_publicador",
                "causa": "no_determinada" if raw != value else "",
            }
        )
    write(folder / "cotejo_registros_vs_cuadros.csv", contrast)
    current_comparison = []
    for row in last:
        value = monthly_values[(int(row["anio"]), int(row["mes"]), row["delito"])]
        current_comparison.append(
            {
                "anio": row["anio"],
                "mes": row["mes"],
                "delito": row["delito"],
                "ultimo_mes": row["valor"],
                "historico_mensual": value,
                "diferencia": int(row["valor"]) - value,
            }
        )
    write(folder / "cotejo_ultimo_mes_vs_historico.csv", current_comparison)

    # Cotejo retrospectivo: diferencias numéricas no acreditan universos iguales.
    mapping = {
        "policia_homicidios": (
            "homicidio_intencional",
            "MinDefensa/SPOA; no acreditar equivalencia por el nombre",
        ),
        "policia_lesiones": (
            "lesiones_personales",
            "Conjunto previo mezcla artículos y lesiones de tránsito",
        ),
        "policia_amenazas": (
            "amenaza",
            "Corte y clasificación pendientes de homologación",
        ),
        "policia_violencia_intrafamiliar": (
            "violencia_intrafamiliar",
            "Corte y clasificación pendientes de homologación",
        ),
        "policia_delitos_sexuales": (
            "violencia_sexual",
            "Suma de artículos previos; ICCS no implica equivalencia automática",
        ),
    }
    old_comparison = []
    catalog = {r["clave"]: r for r in load(BASE / "catalogo.csv")}
    for path in sorted((BASE / "extracciones").glob("policia_*.json")):
        if path.name.endswith(".metadata.json"):
            continue
        key = path.stem
        values = json.loads(path.read_text())
        groups = defaultdict(list)
        for row in values:
            if 2020 <= row[2] <= 2026:
                if key in mapping:
                    groups[(row[2], mapping[key][0])].append(row)
                elif key == "policia_hurto_vehiculos":
                    name = (
                        "hurto_automotores"
                        if row[3] == "ARTÍCULO 239. HURTO AUTOMOTORES"
                        else "hurto_motocicletas"
                        if row[3] == "ARTÍCULO 239. HURTO MOTOCICLETAS"
                        else None
                    )
                    if name is None:
                        raise ValueError(
                            "Nueva modalidad vehicular sin equivalencia revisada"
                        )
                    groups[(row[2], name)].append(row)
                elif key == "policia_hurto_vivienda_comercio":
                    name = (
                        "hurto_comercio"
                        if row[3] == "ARTÍCULO 239. HURTO ENTIDADES COMERCIALES"
                        else "hurto_residencias"
                        if row[3] == "ARTÍCULO 239. HURTO RESIDENCIAS"
                        else None
                    )
                    if name is None:
                        raise ValueError(
                            "Nueva modalidad vivienda/comercio sin equivalencia revisada"
                        )
                    groups[(row[2], name)].append(row)
        for (year, crime), rows in sorted(groups.items()):
            previous = sum(int(r[4]) for r in rows)
            current = annual_values[(year, crime)]
            old_comparison.append(
                {
                    "fuente_previa": key,
                    "dataset_previo": catalog[key]["dataset_id"],
                    "anio": year,
                    "delito_referencia": crime,
                    "valor_previo": previous,
                    "valor_portal": current,
                    "diferencia_aritmetica": current - previous,
                    "subtipos_previos": json.dumps(
                        sorted({r[3] for r in rows}), ensure_ascii=False
                    ),
                    "comparabilidad": "no_acreditada;distinto_corte_o_clasificacion",
                    "advertencia": mapping[key][1]
                    if key in mapping
                    else "Reclasificación ICCS y cortes distintos; no sumar ediciones",
                    "corte_previo": "2026 parcial: revisar ficha del conjunto"
                    if year == 2026
                    else "anual",
                    "corte_portal": "2026-09-30" if year == 2026 else "anual",
                    "expuesto_como_error": False,
                }
            )
    write(folder / "cotejo_socrata_previo_vs_portal.csv", old_comparison)

    result_rows = []
    for row in annual:
        year = int(row["anio"])
        detail = {
            "codigo_dane": "13001",
            "tipo_ubicacion": "agregado_municipal_no_incidente",
            "anio": year,
            "periodo_desde": f"{year}-01-01",
            "periodo_hasta": f"{year}-09-30" if year == 2026 else f"{year}-12-31",
            "tipo_fecha": "periodo_estadistico_publicado;no_inferir_fecha_individual",
            "iccs": row["iccs"],
            "nivel_jerarquia": row["nivel_jerarquia"],
            "hoja": row["hoja"],
            "celda": row["celda"],
            "original_sha256": row["archivo_sha256"],
        }
        result_rows.append(
            {
                "origen": "policia_portal_oficial",
                "fuente_clave": "portal_policia_cuadros_cartagena",
                "custodio": "Policía Nacional de Colombia - DIJIN",
                "dataset_id": "C.S_DELICTIVO_MENSUAL_ANUAL_2020_2026",
                "indicador": row["delito"],
                "anio": year,
                "subtipo": row["nivel_jerarquia"],
                "valor": row["valor"],
                "unidad": "casos",
                "ambito": "municipio_13001",
                "estado_validacion": "procedencia_oficial_cotejada;anio_parcial;corte_2026_09_30"
                if year == 2026
                else "procedencia_oficial_cotejada",
                "url_fuente": row["url_fuente"],
                "fecha_extraccion": capture["captura_utc"],
                "detalle_espacial_json": json.dumps(
                    detail, ensure_ascii=False, sort_keys=True
                ),
                "nota_origen": (
                    f"{row['hoja']}, {row['celda']}. Fuente primaria: cuadros validados del publicador. "
                    "No sumar con registros individuales, ediciones Socrata ni subtotal de hurtos con sus modalidades. "
                    "Series mensuales y discrepancias conservadas en policia_portal/procesados/20261105_v2/. "
                    "Clasificación 7D de esta clave nueva pendiente del catálogo semántico; no heredar una aprobación."
                ),
            }
        )
    write(folder / "integracion_consolidado_anual.csv", result_rows, FIELDS)
    mismatches = [r for r in contrast if r["estado"] != "coincide"]
    summary = {
        "esquema": "polis.policia_portal.cotejo.v1",
        "utc": datetime.now(UTC).isoformat(),
        "estado": "cotejado_con_discrepancias_del_publicador_documentadas",
        "anexos_oficiales": len(sources),
        "anios_registros": list(range(2020, 2027)),
        "filas_nacionales_leidas": sum(
            p["filas_leidas"] for p in processing["registros"]
        ),
        "filas_cartagena": sum(p["filas_municipio"] for p in processing["registros"]),
        "cuadros_por_libro": 12,
        "delitos_hoja": 18,
        "subtotal_hurtos_adicional": 1,
        "observaciones_anuales": len(annual),
        "observaciones_mensuales": len(monthly),
        "observaciones_armas_mensuales": len(weapons),
        "corte_observado_2026": "2026-09-30",
        "drive": {
            "zip_sha256_identico": sha(official_zip),
            "coinciden": len(drive),
            "difieren": 0,
        },
        "controles_internos": {"evaluados": len(controls), "fallidos": 0},
        "registros_vs_cuadros": {
            "comparaciones": len(contrast),
            "coinciden": len(contrast) - len(mismatches),
            "difieren": len(mismatches),
            "diferencia_neta": sum(
                r["diferencia_registros_menos_cuadro"] for r in mismatches
            ),
            "causa": "no_determinada",
            "discrepancias": mismatches,
        },
        "ultimo_mes_vs_historico": {
            "comparaciones": len(current_comparison),
            "difieren": sum(r["diferencia"] != 0 for r in current_comparison),
        },
        "socrata_previo": {
            "comparaciones_aritmeticas": len(old_comparison),
            "diferencias": sum(r["diferencia_aritmetica"] != 0 for r in old_comparison),
            "comparabilidad": "no acreditada; no son errores ni se imputan causas",
        },
        "fuente_para_analisis": (
            "Cuadros publicados validados; registros y Socrata "
            "permanecen separados para trazabilidad"
        ),
        "sin_fecha_individual_exportada": True,
        "sin_geocodificacion_de_incidentes": True,
        "integracion": (
            "133 observaciones anuales; mensuales/armas conservadas "
            "con su granularidad fuera del contrato canónico anual"
        ),
        "licencia": "por_verificar; la procedencia oficial no sustituye la revisión de publicación",
        "cotejador_sha256": sha(Path(__file__)),
    }
    save(folder / "cotejo_resumen.json", summary)
    evidence = [
        args.captura / "manifest.json",
        folder / "procesamiento.json",
        folder / "cotejo_resumen.json",
        folder / "integracion_consolidado_anual.csv",
        folder / "cuadros_cartagena_anuales.csv",
        folder / "cuadros_cartagena_mensuales.csv",
        folder / "cuadros_cartagena_armas_mensuales.csv",
    ]
    save(
        folder / "candidato_activo.json",
        {
            "esquema": "polis.policia_portal.activo.v1",
            "codigo_dane": "13001",
            "fuente_clave": "portal_policia_cuadros_cartagena",
            "filas_anuales": len(result_rows),
            "ruta_consolidado": str(
                (folder / "integracion_consolidado_anual.csv").relative_to(BASE)
            ),
            "ruta_resumen": str((folder / "cotejo_resumen.json").relative_to(BASE)),
            "archivos_sha256": {str(p.relative_to(BASE)): sha(p) for p in evidence},
            "reemplaza_clave_recibida": "drive_excel_policial_11_delitos",
            "conserva_socrata_como_edicion_previa": True,
            "estado_publicacion": "no_publicable;revision_semantica_y_licencia_pendientes",
        },
    )
    print(
        json.dumps(
            {
                k: summary[k]
                for k in [
                    "estado",
                    "observaciones_anuales",
                    "observaciones_mensuales",
                    "controles_internos",
                    "drive",
                    "registros_vs_cuadros",
                    "socrata_previo",
                ]
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
