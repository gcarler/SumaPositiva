"""Unify Cartagena indicator extracts while keeping every source separate."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent
PROJECT = BASE.parents[1]
ANALYSIS = PROJECT / "data/analisis_planes"
GEODATOS = PROJECT / "data/cartografia_fuentes/drive_pshc_insumos"
OUTPUT = BASE / "indicadores_consolidados_cartagena_2026.csv"
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
ESTACION_ID_NOMBRE = re.compile(r"estación ([0-9]+) \((.+)\)$")


def _geocodigos_ideam() -> tuple[dict[tuple[int, str, str], dict], int | None]:
    """Descarta el registro espacial cuando ya no corresponde al corte medido."""
    extracciones = BASE / "extracciones"
    ruta = extracciones / "ideam_estaciones_cartagena.json"
    ficha = extracciones / "ideam_calidad_aire.metadata.json"
    if not ruta.exists() or not ficha.exists():
        return {}, None
    registro = json.loads(ruta.read_text(encoding="utf-8"))
    metadata = json.loads(ficha.read_text(encoding="utf-8"))
    revision = metadata.get("rowsUpdatedAt")
    if (
        registro.get("dataset_id") != "kekd-7v7h"
        or revision is None
        or registro.get("rowsUpdatedAt") != revision
    ):
        return {}, None
    coordenadas: dict[tuple[int, str, str], dict] = {}
    for estacion in registro.get("estaciones", []):
        llave = (
            int(estacion["anio"]),
            str(estacion["id_estacion"]),
            estacion["nombre"],
        )
        if llave in coordenadas:
            raise ValueError(f"IDEAM: estación duplicada en registro espacial: {llave}")
        coordenadas[llave] = estacion
    return coordenadas, revision


def _detalle_estacion(
    subtipo: str, anio: int, coordenadas: dict, revision: int | None
) -> str:
    coincidencia = ESTACION_ID_NOMBRE.search(subtipo)
    if not coincidencia or revision is None:
        return ""
    estacion = coordenadas.get((anio, coincidencia.group(1), coincidencia.group(2)))
    if estacion is None:
        return ""
    return json.dumps(
        {
            "id_estacion": estacion["id_estacion"],
            "nombre_estacion": estacion["nombre"],
            "latitud": estacion["latitud"],
            "longitud": estacion["longitud"],
            "dataset_id": "kekd-7v7h",
            "rowsUpdatedAt": revision,
            "tipo_ubicacion": "estacion_monitoreo_no_incidente",
        },
        ensure_ascii=False,
    )


def _csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def _bank() -> list[dict]:
    estaciones, revision_estaciones = _geocodigos_ideam()
    connection = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    connection.row_factory = sqlite3.Row
    sql = """
        SELECT o.fuente_clave, o.indicador, o.anio, o.subtipo, o.valor, o.unidad,
               o.nota, f.entidad, f.dataset_id, f.pagina, f.extraido_utc,
               f.dimension, f.estado
        FROM observaciones o JOIN fuentes f ON f.clave = o.fuente_clave
        ORDER BY o.fuente_clave, o.indicador, o.anio, o.subtipo
    """
    result = []
    for row in connection.execute(sql):
        scope = (
            "estacion"
            if row["fuente_clave"] == "ideam_calidad_aire"
            else (
                "cabecera"
                if row["fuente_clave"] == "dane_ecsc_2024"
                else "municipio_o_subtipo"
            )
        )
        result.append(
            {
                "origen": "banco_oficial_28",
                "fuente_clave": row["fuente_clave"],
                "custodio": row["entidad"],
                "dataset_id": row["dataset_id"] or "",
                "indicador": row["indicador"],
                "anio": row["anio"],
                "subtipo": row["subtipo"] or "",
                "valor": row["valor"],
                "unidad": row["unidad"] or "",
                "ambito": scope,
                "estado_validacion": row["estado"] or "revisar_catalogo",
                "url_fuente": row["pagina"] or "",
                "fecha_extraccion": row["extraido_utc"] or "",
                "detalle_espacial_json": (
                    _detalle_estacion(
                        row["subtipo"] or "",
                        row["anio"],
                        estaciones,
                        revision_estaciones,
                    )
                    if row["fuente_clave"] == "ideam_calidad_aire"
                    else ""
                ),
                "nota_origen": row["nota"] or "",
            }
        )
    connection.close()
    return result


def _icbf() -> list[dict]:
    meta = json.loads(
        (BASE / "icbf_cartagena.manifest.json").read_text(encoding="utf-8")
    )
    extracted = meta["consulta_utc"]
    result = []
    for row in _csv(BASE / "icbf_rpc_cartagena.csv"):
        result.append(
            {
                "origen": "icbf_rpc_compilacion",
                "fuente_clave": "icbf_rpc_cartagena",
                "custodio": row["fuente"],
                "dataset_id": "v9qk-hdcc",
                "indicador": row["nombre_indicador"],
                "anio": row["anno_vigencia"],
                "subtipo": row["ciclo_vital"],
                "valor": row["valor_indicador"],
                "unidad": row["unidad_medida"],
                "ambito": "municipio_13001",
                "estado_validacion": row["estado_calidad"],
                "url_fuente": "https://www.datos.gov.co/d/v9qk-hdcc",
                "fecha_extraccion": extracted,
                "detalle_espacial_json": "",
                "nota_origen": "Indicador compilado por ICBF; verificar custodio y no sumar con su fuente original.",
            }
        )
    for row in _csv(BASE / "icbf_oferta_cartagena.csv"):
        result.append(
            {
                "origen": "icbf_oferta",
                "fuente_clave": f"icbf_{row['dataset']}",
                "custodio": "ICBF",
                "dataset_id": row["dataset_id"],
                "indicador": row["dataset"],
                "anio": row["anio"],
                "subtipo": row["desagregacion"],
                "valor": row["valor"],
                "unidad": row["unidad"],
                "ambito": "municipio_13001",
                "estado_validacion": "oferta_no_resultado",
                "url_fuente": f"https://www.datos.gov.co/d/{row['dataset_id']}",
                "fecha_extraccion": extracted,
                "detalle_espacial_json": "",
                "nota_origen": f"{row['filas_agregadas']} filas agregadas; no implica personas únicas ni casos evitados.",
            }
        )
    return result


def _shared() -> list[dict]:
    manifest = json.loads(
        (ANALYSIS / "series_drive_multifuente_2026.manifest.json").read_text(
            encoding="utf-8"
        )
    )
    matched = {"homicidios", "suicidios", "violencia_intrafamiliar", "delito_sexual"}
    result = []
    for row in _csv(ANALYSIS / "series_drive_multifuente_2026.csv"):
        year = int(row["anio"])
        status = (
            "cotejado_medicina_legal_2015_2024"
            if row["serie"] in matched and 2015 <= year <= 2024
            else "sin_ficha_institucional"
        )
        if year == 2026:
            status += ";anio_parcial"
        result.append(
            {
                "origen": "archivo_usuario_drive",
                "fuente_clave": f"drive_{row['serie']}",
                "custodio": "archivo_compartido_origen_pendiente",
                "dataset_id": row["serie"],
                "indicador": "casos_reportados",
                "anio": year,
                "subtipo": "total",
                "valor": row["casos"],
                "unidad": "casos_reportados",
                "ambito": "municipio_con_desglose_urbano_rural",
                "estado_validacion": status,
                "url_fuente": "https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4",
                "fecha_extraccion": manifest["fecha_extraccion"],
                "detalle_espacial_json": json.dumps(
                    {
                        "urbano": row["urbano"],
                        "rural": row["rural"],
                        "otra_zona": row["otra_zona"],
                    },
                    ensure_ascii=False,
                ),
                "nota_origen": "GeoJSON por zona, no punto de incidente; no sumar a Medicina Legal sin deduplicación.",
            }
        )
    return result


def _fiscalia_powerbi() -> list[dict]:
    meta = json.loads(
        (BASE / "fiscalia_powerbi_cartagena.manifest.json").read_text(encoding="utf-8")
    )
    result = []
    for row in _csv(BASE / "fiscalia_spoa_cartagena_procesos_por_anio_2026.csv"):
        result.append(
            {
                "origen": "fiscalia_spoa_powerbi",
                "fuente_clave": "fiscalia_spoa_procesos_por_anio_hecho",
                "custodio": "Fiscalía General de la Nación",
                "dataset_id": "tablero_publico_spoa",
                "indicador": "procesos_penales_registrados",
                "anio": row["anio_hecho"],
                "subtipo": "total_municipio_hecho",
                "valor": row["procesos"],
                "unidad": "procesos",
                "ambito": "municipio_hecho_cartagena",
                "estado_validacion": row["estado"],
                "url_fuente": meta["source_url"],
                "fecha_extraccion": meta["accessed_utc"],
                "detalle_espacial_json": "",
                "nota_origen": (
                    f"Año del hecho; corte {meta['cutoff']}. Total del tablero menos suma anual visible: "
                    f"{meta['total_minus_annual_sum']}; no imputar residuo. No equivale a víctimas ni a condenas."
                ),
            }
        )
    return result


def _poblacion_vigencia_censal() -> list[dict]:
    """Serie municipal DANE con cambio de base visible desde 2018."""
    meta = json.loads(
        (
            BASE / "poblacion_cartagena_serie_vigencia_censal_2012_2026.manifest.json"
        ).read_text()
    )
    archivos = {fuente["archivo"]: fuente for fuente in meta["fuentes"]}
    resultado = []
    for fila in _csv(BASE / meta["archivo"]):
        archivo = archivos[fila["fuente_archivo"]]
        resultado.append(
            {
                "origen": "dane_serie_vigencia_censal",
                "fuente_clave": "dane_poblacion_vigencia_censal",
                "custodio": "DANE",
                "dataset_id": fila["fuente_archivo"],
                "indicador": fila["indicador"],
                "anio": fila["anio"],
                "subtipo": fila["base_censal"],
                "valor": fila["personas"],
                "unidad": "personas",
                "ambito": "municipio_13001",
                "estado_validacion": "serie_municipal_cambio_base_2018",
                "url_fuente": archivo["url"],
                "fecha_extraccion": "",
                "detalle_espacial_json": "",
                "nota_origen": (
                    f"{fila['tipo']}; {fila['referencia']}; base {fila['base_censal']}; "
                    f"denominador municipal: {fila['apto_como_denominador_municipal']}. "
                    "No distribuir a UCG o barrio; total no sumar a cabecera y rural."
                ),
            }
        )
    return resultado


def _policia_excel_compartido() -> list[dict]:
    """Series del libro compartido; custodia institucional aún por acreditar."""
    ruta = GEODATOS / "policia_cartagena_delitos_anuales_2020_2026.csv"
    resultado = []
    for fila in _csv(ruta):
        provisional = fila["provisional"].strip().lower() == "true"
        resultado.append(
            {
                "origen": "archivo_usuario_drive",
                "fuente_clave": "drive_excel_policial_11_delitos",
                "custodio": "archivo compartido atribuido a Policía Nacional; sin acreditar",
                "dataset_id": "C.S_DELICTIVO_MENSUAL_ANUAL_2020_2026.xlsx",
                "indicador": fila["delito"],
                "anio": fila["anio"],
                "subtipo": "total_anual",
                "valor": fila["casos"],
                "unidad": "casos_reportados",
                "ambito": "municipio_13001",
                "estado_validacion": "fuente_institucional_pendiente;anio_parcial"
                if provisional
                else "fuente_institucional_pendiente",
                "url_fuente": "https://drive.google.com/drive/folders/1eE5e5rX6wvzxCuAoJZ74OKEWT1e73et4",
                "fecha_extraccion": "",
                "detalle_espacial_json": "",
                "nota_origen": (
                    f"Celda {fila['columna']}{fila['fila']} de {fila['hoja']}; "
                    "no sumar a SIEDCO hasta acreditar procedencia y deduplicar."
                ),
            }
        )
    return resultado


def _fiscalia_delitos_anuales() -> list[dict]:
    """Búsquedas SPOA solapadas; excluye años sin punto mostrado en Power BI."""
    meta = json.loads(
        (
            BASE / "fiscalia_spoa_cartagena_delitos_por_anio_2026.manifest.json"
        ).read_text()
    )
    resultado = []
    for fila in _csv(BASE / "fiscalia_spoa_cartagena_delitos_por_anio_2026.csv"):
        if fila["procesos"] == "" or fila["estado"] not in {
            "punto_del_grafico",
            "anio_parcial",
        }:
            continue
        resultado.append(
            {
                "origen": "fiscalia_spoa_busqueda_textual",
                "fuente_clave": "fiscalia_spoa_busquedas_por_anio_hecho",
                "custodio": "Fiscalía General de la Nación",
                "dataset_id": "tablero_publico_spoa_busquedas_textuales",
                "indicador": "procesos_coincidentes_con_termino",
                "anio": fila["anio_hecho"],
                "subtipo": fila["termino_busqueda"],
                "valor": fila["procesos"],
                "unidad": "procesos",
                "ambito": "municipio_hecho_cartagena",
                "estado_validacion": (
                    "busqueda_textual_superpuesta;anio_parcial"
                    if fila["anio_hecho"] == "2026"
                    else "busqueda_textual_superpuesta"
                ),
                "url_fuente": meta["source_url"],
                "fecha_extraccion": meta["accessed_utc"],
                "detalle_espacial_json": "",
                "nota_origen": (
                    f"Término '{fila['termino_busqueda']}' con operador {meta['query_operator']}; "
                    f"año del hecho, corte {meta['cutoff']}. Las búsquedas se solapan; "
                    "no sumarlas entre términos ni al total SPOA."
                ),
            }
        )
    return resultado


def main() -> None:
    rows = (
        _bank()
        + _icbf()
        + _shared()
        + _fiscalia_powerbi()
        + _poblacion_vigencia_censal()
        + _policia_excel_compartido()
        + _fiscalia_delitos_anuales()
    )
    with OUTPUT.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    manifest = {
        "archivo": OUTPUT.name,
        "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        "filas": len(rows),
        "filas_por_origen": dict(Counter(row["origen"] for row in rows)),
        "fuentes_clave": len({row["fuente_clave"] for row in rows}),
        "entradas_sha256": {
            str(path.relative_to(PROJECT)): hashlib.sha256(
                path.read_bytes()
            ).hexdigest()
            for path in (
                BASE / "cartagena_seguridad_humana.sqlite",
                BASE / "icbf_rpc_cartagena.csv",
                BASE / "icbf_oferta_cartagena.csv",
                BASE / "icbf_cartagena.manifest.json",
                ANALYSIS / "series_drive_multifuente_2026.csv",
                ANALYSIS / "series_drive_multifuente_2026.manifest.json",
                BASE / "fiscalia_spoa_cartagena_procesos_por_anio_2026.csv",
                BASE / "fiscalia_spoa_top5_municipios_2026.csv",
                BASE / "fiscalia_spoa_cartagena_busquedas_delito_2026.csv",
                BASE / "fiscalia_spoa_cartagena_delitos_por_anio_2026.csv",
                BASE / "fiscalia_powerbi_cartagena.manifest.json",
                BASE / "fiscalia_spoa_cartagena_busquedas_delito_2026.manifest.json",
                BASE / "fiscalia_spoa_cartagena_delitos_por_anio_2026.manifest.json",
                BASE / "poblacion_cartagena_serie_vigencia_censal_2012_2026.csv",
                BASE
                / "poblacion_cartagena_serie_vigencia_censal_2012_2026.manifest.json",
                GEODATOS / "policia_cartagena_delitos_anuales_2020_2026.csv",
            )
        },
        "alertas_calidad": {
            "icbf_valores_conflictivos": sum(
                row["estado_validacion"] == "valores_conflictivos" for row in rows
            ),
            "icbf_duplicados_identicos": sum(
                row["estado_validacion"] == "duplicado_identico" for row in rows
            ),
            "drive_sin_ficha_institucional": sum(
                "sin_ficha_institucional" in row["estado_validacion"] for row in rows
            ),
            "drive_anio_parcial": sum(
                "anio_parcial" in row["estado_validacion"] for row in rows
            ),
            "fiscalia_total_menos_suma_anual": json.loads(
                (BASE / "fiscalia_powerbi_cartagena.manifest.json").read_text(
                    encoding="utf-8"
                )
            )["total_minus_annual_sum"],
        },
        "regla": "Unión vertical sin suma de fuentes ni deduplicación transversal; las filas originales y conflictos ICBF se conservan.",
        "cartografia_ucg": "data/cartografia_fuentes/ucg_cartagena_15.geojson; no existe localización por UCG para los casos compartidos.",
        "comparacion_fiscalia_top5": "data/banco_fuentes_oficiales/fiscalia_spoa_top5_municipios_2026.csv; acumulados separados de la serie anual para evitar doble conteo.",
        "busquedas_fiscalia_delito": "data/banco_fuentes_oficiales/fiscalia_spoa_cartagena_busquedas_delito_2026.csv; conteos textuales superpuestos y sin año específico, separados de la tabla anual.",
        "series_fiscalia_delito_anio": "data/banco_fuentes_oficiales/fiscalia_spoa_cartagena_delitos_por_anio_2026.csv; 18 búsquedas textuales por año del hecho, separadas de los totales para evitar doble conteo.",
        "poblacion_vigencia_censal": "DANE 2005 hasta 2017 y CNPV 2018 desde 2018; denominador solo municipal.",
        "excel_policial_compartido": "11 delitos anuales 2020-2026; año 2026 parcial y custodia institucional pendiente de acreditar.",
        "busquedas_fiscalia_anuales_en_consolidado": (
            "Solo puntos visibles del gráfico por año del hecho; búsquedas textuales superpuestas, "
            "no aditivas entre sí ni con el total SPOA."
        ),
    }
    (BASE / "indicadores_consolidados_cartagena_2026.manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {"filas": len(rows), "origenes": manifest["filas_por_origen"]},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
