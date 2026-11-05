"""Extrae agregados públicos de PQRSDF radicadas ante Procuraduría desde Cartagena."""

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
KEY = "procuraduria_pqrsdf_cartagena"
DATASET = "s226-fj9i"
PAGE = "https://www.procuraduria.gov.co/Pages/datos-abiertos.aspx"
ENDPOINT = f"https://www.datos.gov.co/resource/{DATASET}.json"
FIELDS = ["fuente", "anio_radicacion", "tipo_pqrsdf", "cantidad", "municipio_reportado", "departamento_reportado", "url_consulta", "sha256_respuesta", "consultado_utc"]


def extract() -> tuple[list[dict], dict]:
    params = {"$select": "date_extract_y(fecha_de_radicaci_n) as anio,tipo_de_pqrsdf,count(*) as n",
              "$where": "departamento='BOLIVAR' AND municipio='CARTAGENA' AND fecha_de_radicaci_n IS NOT NULL",
              "$group": "anio,tipo_de_pqrsdf", "$order": "anio,tipo_de_pqrsdf", "$limit": 1000}
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    source = json.loads(payload)
    if not isinstance(source, list) or not source or len(source) >= 1000:
        raise ValueError("Respuesta PQRSDF vacía o truncada")
    now = datetime.now(timezone.utc).isoformat()
    digest = hashlib.sha256(payload).hexdigest()
    rows = []
    for item in source:
        year, count = int(item["anio"]), int(item["n"])
        if not 2012 <= year <= 2026 or count <= 0:
            raise ValueError("Año o cantidad PQRSDF inesperada")
        rows.append(dict(zip(FIELDS, [KEY, year, item.get("tipo_de_pqrsdf") or "Sin clasificar",
                                      count, "CARTAGENA", "BOLIVAR", url, digest, now], strict=True)))
    metadata = {"url": url, "pagina_entidad": PAGE, "sha256_respuesta": digest,
                "grupos": len(rows), "consultado_utc": now,
                "unidad": "PQRSDF radicadas en la sede electrónica de Procuraduría; municipio informado en el registro",
                "advertencia": "No son casos de violencia ni denuncias penales; la cobertura del conjunto debe revisarse al refrescar"}
    return rows, metadata


def persist(rows: list[dict], metadata: dict) -> None:
    with (BASE / "procuraduria_pqrsdf_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (BASE / "extracciones" / "procuraduria_pqrsdf_cartagena.metadata.json").write_text(
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
    years = [row["anio_radicacion"] for row in rows]
    source = (KEY, DATASET, "PQRSDF de la sede electrónica de Procuraduría con municipio Cartagena",
              "Procuraduría General de la Nación", "politica", PAGE, metadata["url"],
              metadata["consultado_utc"], digest, len(rows), min(years), max(years), "agregados_por_tipo_y_anio")
    previous.append(dict(zip(fields, source, strict=True)))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (KEY,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (KEY,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                (KEY, "pqrsdf_radicadas", row["anio_radicacion"], row["tipo_pqrsdf"],
                 row["cantidad"], "solicitudes", "Municipio informado CARTAGENA, BOLIVAR; no es localización de un hecho")
                for row in rows
            ])
        with catalog.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(previous)
    finally:
        db.close()


if __name__ == "__main__":
    values, meta = extract()
    persist(values, meta)
    print(f"Procuraduría PQRSDF Cartagena: {sum(row['cantidad'] for row in values)} registros en {len(values)} grupos")
