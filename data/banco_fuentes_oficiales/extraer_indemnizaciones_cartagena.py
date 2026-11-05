"""Extrae los agregados municipales anuales del mapa oficial de indemnizaciones."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
KEY = "unidad_victimas_indemnizaciones_cartagena"
SERVICE = "https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/1"
PAGE = "https://datospaz.unidadvictimas.gov.co/mapa-indemnizacion/"
FIELDS = ["fuente", "anio", "codigo_dane", "municipio", "giros", "personas_atendidas", "valor_millones_cop", "url_consulta", "sha256_respuesta"]


def extract() -> tuple[list[dict], dict]:
    params = {"f": "json", "where": "MPIO_CCDGO='13001'", "outFields": "MPIO_CCDGO,MPIO_CNMBR,VIGENCIA,GIROS,PERSONAS,VALOR", "returnGeometry": "false", "resultRecordCount": 1000}
    url = SERVICE + "/query?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
    with urllib.request.urlopen(request, timeout=40) as response:
        payload = response.read()
    result = json.loads(payload)
    if result.get("error") or result.get("exceededTransferLimit"):
        raise ValueError("Servicio de indemnizaciones incompleto o con error")
    comparison_url = SERVICE.rsplit("/", 1)[0] + "/4/query?" + urllib.parse.urlencode({
        "f": "json", "where": "MPIO_CCDGO='13001'", "outFields": "*",
        "returnGeometry": "false", "resultRecordCount": 1000,
    })
    with urllib.request.urlopen(urllib.request.Request(
        comparison_url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"}
    ), timeout=40) as response:
        comparison = json.load(response)
    if comparison.get("error") or comparison.get("exceededTransferLimit"):
        raise ValueError("Capa desagregada de indemnizaciones incompleta o con error")
    comparison_by_year = {a["VIGENCIA"]: a for feature in comparison.get("features", [])
                          if (a := feature["attributes"])["VIGENCIA"].isdigit()}
    rows = []
    years = set()
    discrepancies = []
    for feature in result.get("features", []):
        a = feature["attributes"]
        if str(a["MPIO_CCDGO"]) != "13001":
            raise ValueError("Respuesta contiene otro municipio")
        if not str(a["VIGENCIA"]).isdigit():
            continue  # El servicio también publica el bloque plurianual 2009–2011.
        year = int(a["VIGENCIA"])
        if year in years:
            raise ValueError(f"Vigencia repetida: {year}")
        years.add(year)
        measures = [int(a["GIROS"]), int(a["PERSONAS"]), float(a["VALOR"])]
        if min(measures) < 0:
            raise ValueError(f"Valor negativo en {year}")
        other = comparison_by_year.get(str(year))
        if other is None:
            raise ValueError(f"Falta vigencia {year} en capa desagregada")
        by_fact = [sum(int(other[f"{fact}_{metric}"]) for fact in ("DESPLAZAMIENTO", "OTROS_HECHOS", "JUSTICIA_PAZ"))
                   for metric in ("GIROS", "PERSONAS", "VALOR")]
        if measures[:2] != by_fact[:2] or abs(measures[2] - by_fact[2]) > 1:
            discrepancies.append({"anio": year, "capa_general": measures, "capa_por_hecho": by_fact})
            continue
        rows.append(dict(zip(FIELDS, [KEY, year, "13001", a["MPIO_CNMBR"], *measures,
                                      url, hashlib.sha256(payload).hexdigest()], strict=True)))
    rows.sort(key=lambda row: row["anio"])
    if years != set(range(2012, 2025)) or {item["anio"] for item in discrepancies} != {2024}:
        raise ValueError(f"Cobertura inesperada de vigencias: {sorted(years)}")
    metadata = {"servicio": SERVICE, "pagina": PAGE, "unidad_valor": "millones de pesos colombianos, según la etiqueta del visor",
                "escala": "municipio DIVIPOLA 13001", "filas_consultadas": len(result["features"]),
                "filas_anuales_aceptadas": len(rows), "corte_fuente": "sin fecha de corte explícita en esta capa",
                "discrepancias_excluidas": discrepancies,
                "tolerancia_valor_millones": 1,
                "extraido_utc": datetime.now(timezone.utc).isoformat(),
                "nota": "Giros, personas y valor son medidas de indemnización; no hechos de victimización. No sumar con la capa desagregada por hecho."}
    return rows, metadata


def persist(rows: list[dict], metadata: dict) -> None:
    with (BASE / "indemnizaciones_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (BASE / "extracciones" / "indemnizaciones_cartagena.metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    catalog = BASE / "catalogo.csv"
    with catalog.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames
        previous = [row for row in reader if row["clave"] != KEY]
    if not fields:
        raise ValueError("Catálogo sin cabecera")
    digest = hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    source = (KEY, "Indemnizaciones-MapServer-1", "Indemnizaciones municipales por vigencia en Cartagena",
              "Unidad para las Víctimas / RNI", "politica", PAGE, SERVICE,
              metadata["extraido_utc"], digest, metadata["filas_consultadas"], 2012, 2023,
              "servicio_municipal_2024_excluido_por_discrepancia")
    previous.append(dict(zip(fields, source, strict=True)))
    observations = []
    for row in rows:
        for column, indicator, unit in [("giros", "giros_indemnizacion", "giros"),
                                        ("personas_atendidas", "personas_indemnizadas", "personas"),
                                        ("valor_millones_cop", "valor_indemnizaciones", "millones COP")]:
            observations.append((KEY, indicator, row["anio"], "total municipal", row[column], unit,
                                 "Vigencia de indemnización; capa general municipal; sin corte explícito en el servicio"))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (KEY,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (KEY,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", observations)
        with catalog.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(previous)
    finally:
        db.close()


if __name__ == "__main__":
    values, meta = extract()
    persist(values, meta)
    print(f"Indemnizaciones Cartagena: {len(values)} vigencias, {values[0]['anio']}–{values[-1]['anio']}")
