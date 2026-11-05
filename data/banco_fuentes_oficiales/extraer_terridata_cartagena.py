"""Curaduría municipal de indicadores TerriData (DNP, DIVIPOLA 13001)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent
NAME = "TerriData13001.xlsx.zip"
URL = "https://terridata.dnp.gov.co/assets/docs/excel/entidades/TerriData13001.xlsx.zip"
SELECTED = {
    ("Convivencia y seguridad ciudadana", "Tasa de homicidio intencional por cada 100.000 habitantes"): ("homicidio_intencional_tasa", "personal"),
    ("Convivencia y seguridad ciudadana", "Tasa de violencia intrafamiliar por cada 100.000 habitantes"): ("violencia_intrafamiliar_tasa", "comunitaria"),
    ("Salud", "Incidencia del dengue"): ("incidencia_dengue", "salud"),
    ("Salud", "Mortalidad por desnutrición en menores de 5 años"): ("mortalidad_desnutricion_menores_5", "salud"),
    ("Ambiente", "Inundaciones"): ("eventos_inundacion", "ambiental"),
    ("Ambiente", "Área deforestada en la entidad territorial"): ("area_deforestada", "ambiental"),
    ("Pobreza", "Incidencia de la Pobreza Monetaria"): ("incidencia_pobreza_monetaria_terridata", "economica"),
    ("Paz y víctimas", "Víctimas de Desplazamiento Forzado ubicadas"): ("victimas_desplazamiento_ubicadas", "transversal"),
    ("Administración pública", "Política 13. Participación Ciudadana en la Gestión Pública"): ("indice_participacion_institucional", "politica"),
    ("Administración pública", "Política 15. Transparencia, Acceso a la Información y lucha contra la Corrupción"): ("indice_transparencia_institucional", "politica"),
}
FIELDS = ["indicador", "dimension", "anio", "mes", "valor", "unidad", "custodio_original", "hoja", "fila", "sha256_archivo", "nota"]


def extract() -> list[dict]:
    path = BASE / "documentos_oficiales" / NAME
    if not path.exists():
        request = urllib.request.Request(URL, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as archive:
        workbook = load_workbook(io.BytesIO(archive.read("TerriData13001.xlsx")), read_only=True, data_only=True)
    sheet = workbook.active
    output = []
    seen = set()
    for rownum, row in enumerate(sheet.values, 1):
        if rownum == 1:
            if row[:4] != ("Código Departamento", "Departamento", "Código Entidad", "Entidad"):
                raise ValueError("TerriData cambió su estructura")
            continue
        if str(row[2]) != "13001" or row[3] != "Cartagena":
            raise ValueError(f"Fila de otro municipio en archivo Cartagena: {rownum}")
        selected = SELECTED.get((row[4], row[6]))
        if selected is None or row[7] in (None, ""):
            continue
        year, month = int(row[9]), int(row[10])
        if not 2012 <= year <= 2025 or month != 12:
            continue
        indicator, dimension = selected
        identity = indicator, year
        if identity in seen:
            raise ValueError(f"Indicador duplicado: {identity}")
        seen.add(identity)
        value = float(str(row[7]).replace(".", "").replace(",", "."))
        if value < 0:
            raise ValueError(f"Valor negativo: {identity}")
        note = "TerriData replica al custodio original; escala municipal; no sumar con series fuente. Desplazamiento: víctimas ubicadas, no alertas SAT."
        output.append(dict(zip(FIELDS, [indicator, dimension, year, month, value, row[12], row[11],
                                      sheet.title, rownum, sha, note], strict=True)))
    if {r["indicador"] for r in output} != {v[0] for v in SELECTED.values()}:
        raise ValueError("Faltan indicadores TerriData seleccionados")
    return sorted(output, key=lambda r: (r["indicador"], r["anio"]))


def persist(rows: list[dict]) -> None:
    key = "dnp_terridata_13001"
    now = datetime.now(timezone.utc).isoformat()
    with (BASE / "dnp_terridata_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    catalog_path = BASE / "catalogo.csv"
    with catalog_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames
        existing = [row for row in reader if row["clave"] != key]
    if not fields:
        raise ValueError("Catálogo sin cabecera")
    data = json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()
    source = (key, NAME, "Indicadores municipales seleccionados TerriData 13001", "DNP / custodios originales",
              "transversal", URL, URL, now, hashlib.sha256(data).hexdigest(), len(rows),
              min(r["anio"] for r in rows), max(r["anio"] for r in rows), "archivo_municipal_oficial_extraido")
    existing.append(dict(zip(fields, source, strict=True)))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (key,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (key,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                (key, r["indicador"], r["anio"], str(r["mes"]), r["valor"], r["unidad"],
                 f"{r['custodio_original']}; {r['nota']}") for r in rows
            ])
        with catalog_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(existing)
    finally:
        db.close()
    manifest_path = BASE / "documentos_oficiales" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = [item for item in manifest if item["archivo"] != NAME]
    payload = (BASE / "documentos_oficiales" / NAME).read_bytes()
    manifest.append({"archivo": NAME, "url": URL, "sha256": hashlib.sha256(payload).hexdigest(),
                     "bytes": len(payload), "consultado_utc": now})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    result = extract()
    persist(result)
    print(f"TerriData Cartagena: {len(result)} observaciones en {len(SELECTED)} indicadores")
