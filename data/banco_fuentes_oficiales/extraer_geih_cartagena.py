"""Extrae cortes comparables de mercado laboral para Cartagena de anexos DANE.

Uso: uv run --project backend python data/banco_fuentes_oficiales/extraer_geih_cartagena.py
El año es el del trimestre móvil; los cortes oct-dic no son promedios anuales.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent
DOCS = BASE / "documentos_oficiales"
FILES = {
    "dane_geih_cartagena": (
        "anex-GEIH-ago2026.xlsx", "Total 23 ciudades A.M. Trim",
        "https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIH-ago2026.xlsx",
        240, 241, {243: "tasa_global_participacion", 244: "tasa_ocupacion", 245: "tasa_desocupacion"},
    ),
    "dane_geih_informalidad_cartagena": (
        "anex-GEIHEISS-jun-ago2026.xlsx", "Prop informalidad",
        "https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIHEISS-jun-ago2026.xlsx",
        11, 12, {27: "proporcion_informalidad"},
    ),
}
FIELDS = ["fuente", "indicador", "anio", "periodo", "valor", "unidad", "ambito", "archivo", "hoja", "celda", "sha256_archivo", "nota"]


def extract() -> list[dict]:
    output = []
    for key, (filename, sheet, url, year_row, period_row, indicators) in FILES.items():
        path = DOCS / filename
        if not path.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
            with urllib.request.urlopen(request, timeout=90) as response:
                path.write_bytes(response.read())
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        ws = load_workbook(path, data_only=True)[sheet]
        if str(ws.cell(27 if key.endswith("informalidad_cartagena") else 238, 1).value).strip() != "Cartagena":
            raise ValueError(f"Fila Cartagena cambió en {filename}")
        year = None
        for col in range(2, ws.max_column + 1):
            marker = ws.cell(year_row, col).value
            if isinstance(marker, int) and 2012 <= marker <= 2026:
                year = marker
            period = str(ws.cell(period_row, col).value or "").strip().lower()
            selected = period in {"oct - dic", "jun - ago"} and (
                period == "oct - dic" and year is not None and year <= 2025
                or period == "jun - ago" and year == 2026
            )
            if not selected:
                continue
            for row, indicator in indicators.items():
                value = ws.cell(row, col).value
                if not isinstance(value, (float, int)) or not 0 <= value <= 100:
                    raise ValueError(f"Valor inválido: {filename}/{row}/{col}")
                output.append(dict(zip(FIELDS, [key, indicator, year, period, float(value), "%",
                    "cabecera de Cartagena; GEIH 23 ciudades", filename, sheet,
                    ws.cell(row, col).coordinate, sha,
                    "Trimestre móvil; oct-dic es corte de cierre, no promedio anual; 2026 jun-ago es parcial"], strict=True)))
    expected = {"dane_geih_cartagena": 45, "dane_geih_informalidad_cartagena": 6}
    for key, count in expected.items():
        actual = sum(r["fuente"] == key for r in output)
        if actual != count:
            raise ValueError(f"Cobertura GEIH incompleta: {key}={actual}, esperado {count}")
    return output


def persist(rows: list[dict]) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with (BASE / "dane_geih_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    catalog = BASE / "catalogo.csv"
    with catalog.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        previous = [r for r in reader if r["clave"] not in FILES]
    if not fieldnames:
        raise ValueError("Catálogo sin cabecera")
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        for key, (filename, _, url, *_unused) in FILES.items():
            selected = [r for r in rows if r["fuente"] == key]
            data = json.dumps(selected, ensure_ascii=False, sort_keys=True).encode()
            source = (key, filename, f"GEIH Cartagena: {key.removeprefix('dane_geih_')}", "DANE", "economica", url, url, now,
                      hashlib.sha256(data).hexdigest(), len(selected), min(r["anio"] for r in selected),
                      max(r["anio"] for r in selected), "anexo_oficial_extraido")
            previous.append(dict(zip(fieldnames, source, strict=True)))
            with db:
                db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (key,))
                db.execute("DELETE FROM fuentes WHERE clave=?", (key,))
                db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
                db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                    (key, r["indicador"], r["anio"], r["periodo"], r["valor"], r["unidad"], r["nota"])
                    for r in selected
                ])
        with catalog.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(previous)
    finally:
        db.close()
    manifest_path = DOCS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = [r for r in manifest if r["archivo"] not in {v[0] for v in FILES.values()}]
    for filename, _, url, *_ in FILES.values():
        payload = (DOCS / filename).read_bytes()
        manifest.append({"archivo": filename, "url": url, "sha256": hashlib.sha256(payload).hexdigest(),
                         "bytes": len(payload), "consultado_utc": now})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    result = extract()
    persist(result)
    print(f"GEIH Cartagena: {len(result)} observaciones, 2 fuentes")
