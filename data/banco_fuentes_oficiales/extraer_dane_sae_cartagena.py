"""Extrae las seis estimaciones municipales SAE publicadas por el DANE."""

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
KEY = "dane_sae_fies_pobreza_cartagena"
URL = "https://sitios.dane.gov.co/EstimacionesModeloSAE/documentos/estimaciones-pobreza-alimentaria-fies-modelo-sae-2022-y-2024.xlsx"
METHODOLOGY = "https://sitios.dane.gov.co/EstimacionesModeloSAE/documentos/metodologia-estimaciones-pobreza-alimentaria-fies-modelo-sae-2022-y-2024.pdf"
FILE = BASE / "documentos_oficiales" / "dane_sae_fies_pobreza_2022_2024.xlsx"
FIELDS = ["fuente", "indicador", "anio", "codigo_dane", "municipio", "estimacion_pct", "error_estandar_pct", "ic_inferior_pct", "ic_superior_pct", "cvlog_original", "hoja", "fila", "sha256_archivo", "metodo"]
INDICATORS = {"FIES": "inseguridad_alimentaria_moderada_grave_sae", "Monetaria": "pobreza_monetaria_sae", "Multidimensional": "pobreza_multidimensional_sae"}


def extract() -> tuple[list[dict], dict]:
    request = urllib.request.Request(URL, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = response.read()
    if len(payload) < 100_000 or payload[:2] != b"PK":
        raise ValueError("Archivo SAE descargado inválido")
    FILE.write_bytes(payload)
    digest = hashlib.sha256(payload).hexdigest()
    workbook = load_workbook(FILE, read_only=True, data_only=True)
    result = []
    for prefix, indicator in INDICATORS.items():
        for year in (2022, 2024):
            name = f"{prefix} {year}"
            if name not in workbook.sheetnames:
                raise ValueError(f"Hoja SAE ausente: {name}")
            matches = [(number, row) for number, row in enumerate(workbook[name].values, 1)
                       if str(row[2]) == "13001"]
            if len(matches) != 1:
                raise ValueError(f"Cartagena aparece {len(matches)} veces en {name}")
            number, row = matches[0]
            if row[3] != "Cartagena de Indias":
                raise ValueError(f"Municipio inesperado en {name}: {row[3]}")
            estimate, se, low, high, cvlog = map(float, row[4:9])
            if not 0 <= low <= estimate <= high <= 1 or se < 0:
                raise ValueError(f"Intervalo inválido en {name}")
            result.append(dict(zip(FIELDS, [KEY, indicator, year, "13001", row[3], estimate * 100,
                                            se * 100, low * 100, high * 100, cvlog, name, number,
                                            digest, "SAE Fay-Herriot; estimación experimental municipal"], strict=True)))
    workbook.close()
    metadata = {"url": URL, "metodologia": METHODOLOGY, "sha256_archivo": digest,
                "tamano_bytes": len(payload), "filas_extraidas": len(result),
                "escala": "municipio 13001", "periodos": [2022, 2024],
                "advertencia": "Estimaciones modeladas SAE; no equivalen a estimaciones directas de encuesta ni a conteos de personas",
                "extraido_utc": datetime.now(timezone.utc).isoformat()}
    return result, metadata


def persist(rows: list[dict], metadata: dict) -> None:
    with (BASE / "dane_sae_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (BASE / "extracciones" / "dane_sae_cartagena.metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    manifest_path = BASE / "documentos_oficiales" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    manifest = [item for item in manifest if item.get("archivo") != FILE.name]
    manifest.append({"archivo": FILE.name, "url": URL, "sha256": metadata["sha256_archivo"],
                     "bytes": metadata["tamano_bytes"], "consultado_utc": metadata["extraido_utc"]})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    catalog = BASE / "catalogo.csv"
    with catalog.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames
        previous = [row for row in reader if row["clave"] != KEY]
    if not fields:
        raise ValueError("Catálogo sin cabecera")
    source = (KEY, "SAE-FIES-PM-IPM-2022-2024", "Estimaciones municipales SAE de FIES y pobreza para Cartagena",
              "DANE", "transversal", "https://sitios.dane.gov.co/EstimacionesModeloSAE/", URL,
              metadata["extraido_utc"], metadata["sha256_archivo"], 6, 2022, 2024,
              "xlsx_oficial_estimacion_experimental")
    previous.append(dict(zip(fields, source, strict=True)))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (KEY,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (KEY,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                (KEY, row["indicador"], row["anio"], "Cartagena municipal SAE",
                 row["estimacion_pct"], "%", f"IC {row['ic_inferior_pct']:.3f}–{row['ic_superior_pct']:.3f}; hoja {row['hoja']} fila {row['fila']}; estimación experimental")
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
    print(f"DANE SAE Cartagena: {len(values)} estimaciones municipales de 2022 y 2024")
