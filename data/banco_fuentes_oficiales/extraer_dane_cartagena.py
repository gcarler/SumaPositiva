"""Extrae indicadores municipales verificables de anexos oficiales del DANE.

Uso: uv run --project backend python data/banco_fuentes_oficiales/extraer_dane_cartagena.py
No extrapola la muestra ECSC a barrios, UCG o zona rural de Cartagena.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent
DOCS = BASE / "documentos_oficiales"
URLS = {
    "dane_poblacion_municipal_2005_2017.xlsx": "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/DCD-area-proypoblacion-Mun-2005-2017_VP.xlsx",
    "dane_poblacion_municipal_2018_2042.xlsx": "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx",
    "dane_ecsc_2024.xlsx": "https://www.dane.gov.co/files/operaciones/ECSC/anex-ECSC-2024.xlsx",
    "dane_nbi_cnpv2018.xlsx": "https://www.dane.gov.co/files/censo2018/informacion-tecnica/CNPV-2018-NBI.xlsx",
}
SOURCE_KEYS = {"dane_poblacion_municipal", "dane_ecsc_2024", "dane_nbi_cnpv2018"}
FIELDS = ["fuente", "indicador", "anio", "ambito", "valor", "unidad", "cve_pct", "lim_inf", "lim_sup", "archivo", "hoja", "celda", "sha256_archivo", "nota"]


def record(source: str, indicator: str, year: int, area: str, value: float,
           unit: str, filename: str, sheet: str, cell: str, note: str = "",
           cve: float | None = None, lower: float | None = None,
           upper: float | None = None) -> dict:
    return dict(zip(FIELDS, [source, indicator, year, area, value, unit, cve,
                             lower, upper, filename, sheet, cell,
                             hashlib.sha256((DOCS / filename).read_bytes()).hexdigest(), note], strict=True))


def population() -> list[dict]:
    output = []
    for filename, sheet, code_col in [
        ("dane_poblacion_municipal_2005_2017.xlsx", "NuevaMpal", 3),
        ("dane_poblacion_municipal_2018_2042.xlsx", "PobMunicipalxÁrea", 2),
    ]:
        ws = load_workbook(DOCS / filename, read_only=True, data_only=True)[sheet]
        for rownum, row in enumerate(ws.iter_rows(values_only=True), 1):
            if str(row[code_col]).strip() != "13001":
                continue
            year = row[4]
            if not isinstance(year, int) or not 2012 <= year <= 2027:
                continue
            area = str(row[5]).strip()
            indicator = {
                "Total": "poblacion_total",
                "Cabecera Municipal": "poblacion_cabecera",
                "Centros Poblados y Rural Disperso": "poblacion_centros_rural",
            }.get(area)
            if indicator is None:
                continue
            value = row[6]
            if not isinstance(value, int) or value <= 0:
                raise ValueError(f"Población inválida en {filename}:{rownum}")
            output.append(record("dane_poblacion_municipal", indicator, year,
                                 "Cartagena DIVIPOLA 13001", value, "personas",
                                 filename, sheet, f"G{rownum}",
                                 "Proyección/retroproyección municipal, base CNPV 2018; versión del anexo 2025"))
    years = {int(r["anio"]) for r in output if r["indicador"] == "poblacion_total"}
    if years != set(range(2012, 2028)) or len(output) != 48:
        raise ValueError(f"Cobertura poblacional incompleta: {sorted(years)}, {len(output)} filas")
    by_year = {}
    for row in output:
        by_year.setdefault(row["anio"], {})[row["indicador"]] = row["valor"]
    for year, values in by_year.items():
        if values["poblacion_total"] != values["poblacion_cabecera"] + values["poblacion_centros_rural"]:
            raise ValueError(f"Desglose poblacional no suma en {year}")
    return sorted(output, key=lambda r: (r["anio"], r["indicador"]))


def nbi() -> list[dict]:
    filename, sheet = "dane_nbi_cnpv2018.xlsx", "Municipios"
    ws = load_workbook(DOCS / filename, read_only=True, data_only=True)[sheet]
    matches = [(i, row) for i, row in enumerate(ws.iter_rows(values_only=True), 1)
               if str(row[0]).strip() == "13" and str(row[2]).strip() == "001"]
    if len(matches) != 1:
        raise ValueError("No se encontró una única fila NBI de Cartagena (13/001)")
    rownum, row = matches[0]
    labels = ["personas_nbi", "personas_miseria", "vivienda", "servicios",
              "hacinamiento", "inasistencia_escolar", "dependencia_economica"]
    output = []
    for area, start in [("municipio", 4), ("cabecera", 11), ("centros_poblados_rural", 18)]:
        for offset, label in enumerate(labels):
            value = row[start + offset]
            if not isinstance(value, (int, float)) or not 0 <= value <= 100:
                raise ValueError(f"NBI inválido: {area}/{label}")
            col = chr(ord("A") + start + offset)
            output.append(record("dane_nbi_cnpv2018", f"nbi_{label}", 2018,
                                 f"Cartagena DIVIPOLA 13001 / {area}", float(value), "%",
                                 filename, sheet, f"{col}{rownum}",
                                 "CNPV 2018: línea base censal, no serie anual"))
    return output


def ecsc() -> list[dict]:
    filename = "dane_ecsc_2024.xlsx"
    wb = load_workbook(DOCS / filename, read_only=True, data_only=True)
    specs = [
        ("Cuadro 5", "victimizacion_algun_delito", 2023, 1),
        ("Cuadro 7", "victimas_que_denunciaron", 2023, 1),
        ("Cuadro 7", "victimas_que_no_denunciaron", 2023, 16),
        ("Cuadro 12", "victimizacion_hurto_personas", 2023, 1),
        ("Cuadro 25", "victimizacion_extorsion_o_intento", 2023, 1),
        ("Cuadro 32", "percepcion_inseguridad_ciudad", 2024, 1),
        ("Cuadro 34", "percepcion_inseguridad_barrio", 2024, 1),
    ]
    output = []
    for sheet, indicator, year, base in specs:
        ws = wb[sheet]
        matches = [(i, row) for i, row in enumerate(ws.iter_rows(min_row=1, max_row=35, values_only=True), 1)
                   if str(row[0]).strip() == "Cartagena"]
        if len(matches) != 1:
            raise ValueError(f"No se encontró una única fila Cartagena en {sheet}")
        rownum, row = matches[0]
        value, cve, lower, upper = (row[base + j] for j in (1, 2, 3, 4))
        if not all(isinstance(x, (int, float)) for x in (value, cve, lower, upper)):
            raise ValueError(f"Estadístico ECSC inválido: {sheet}/{indicator}")
        col = chr(ord("A") + base + 1)
        output.append(record("dane_ecsc_2024", indicator, year,
                             "cabecera de Cartagena; población 15 años y más",
                             float(value), "%", filename, sheet, f"{col}{rownum}",
                             "Estimación muestral; intervalo y CVE del anexo DANE; sin desagregación por UCG",
                             float(cve), float(lower), float(upper)))
    return output


def persist(rows: list[dict]) -> None:
    path = BASE / "dane_indicadores_cartagena.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    grouped = {key: [r for r in rows if r["fuente"] == key] for key in SOURCE_KEYS}
    now = datetime.now(timezone.utc).isoformat()
    metadata = {
        "dane_poblacion_municipal": ("municipal_2005_2017+2018_2042", "Proyecciones municipales Cartagena 2012–2027", "transversal", "https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion"),
        "dane_ecsc_2024": ("anex-ECSC-2024.xlsx", "ECSC Cartagena: victimización, denuncia y percepción", "personal", "https://www.dane.gov.co/index.php/estadisticas-por-tema/seguridad-y-defensa/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc"),
        "dane_nbi_cnpv2018": ("CNPV-2018-NBI.xlsx", "NBI censal 2018 Cartagena", "economica", "https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/necesidades-basicas-insatisfechas-nbi"),
    }
    catalog_path = BASE / "catalogo.csv"
    with catalog_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        existing = [r for r in reader if r["clave"] not in SOURCE_KEYS]
    if not fieldnames:
        raise ValueError("Catálogo sin cabecera")
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        for key in sorted(SOURCE_KEYS):
            selected = grouped[key]
            data_id, title, dimension, page = metadata[key]
            source_hash = hashlib.sha256(json.dumps(selected, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
            years = [int(r["anio"]) for r in selected]
            source = (key, data_id, title, "DANE", dimension, page, page, now,
                      source_hash, len(selected), min(years), max(years), "anexo_oficial_extraido")
            existing.append(dict(zip(fieldnames, source, strict=True)))
            with db:
                db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (key,))
                db.execute("DELETE FROM fuentes WHERE clave=?", (key,))
                db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
                db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                    (key, r["indicador"], r["anio"], r["ambito"], r["valor"], r["unidad"],
                     f"{r['nota']}; CVE={r['cve_pct']}; IC=[{r['lim_inf']},{r['lim_sup']}]" if r["cve_pct"] is not None else r["nota"])
                    for r in selected
                ])
        with catalog_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(existing)
    finally:
        db.close()

    manifest_path = DOCS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = [r for r in manifest if r["archivo"] not in URLS]
    for name, url in URLS.items():
        payload = (DOCS / name).read_bytes()
        manifest.append({"archivo": name, "url": url,
                         "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload),
                         "consultado_utc": now})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    rows = population() + nbi() + ecsc()
    persist(rows)
    print(f"DANE Cartagena: {len(rows)} indicadores curados, 3 fuentes adicionales")


if __name__ == "__main__":
    main()
