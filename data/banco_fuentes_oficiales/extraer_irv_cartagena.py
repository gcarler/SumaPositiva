"""Extrae el IRV municipal desde las capas públicas de la Unidad para las Víctimas."""

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
KEY = "unidad_victimas_irv_cartagena"
SERVICE = "https://vgv.unidadvictimas.gov.co/server/rest/services/IRV/IRV/MapServer"
PAGE = "https://datospaz.unidadvictimas.gov.co/indice-de-riesgo-de-victimizacion/"
FIELDS = ["fuente", "anio", "codigo_dane", "municipio", "irv_estimado", "categoria_riesgo", "capa_id", "url_consulta", "sha256_respuesta"]


def get_json(url: str) -> tuple[dict, bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
    with urllib.request.urlopen(request, timeout=40) as response:
        payload = response.read()
    result = json.loads(payload)
    if not isinstance(result, dict) or result.get("error"):
        raise ValueError(f"Respuesta ArcGIS inválida: {result.get('error') if isinstance(result, dict) else result}")
    return result, payload


def extract() -> tuple[list[dict], dict]:
    service, _ = get_json(SERVICE + "?f=json")
    layers = {int(layer["name"][3:]): layer["id"] for layer in service.get("layers", [])
              if layer.get("name", "").startswith("IRV") and layer["name"][3:].isdigit()}
    expected = set(range(2012, 2026))
    if not expected.issubset(layers):
        raise ValueError(f"Capas IRV faltantes: {sorted(expected - layers.keys())}")
    rows = []
    for year in sorted(expected):
        layer = layers[year]
        params = {"f": "json", "where": "MPIO_CCDGO='13001'", "outFields": "MPIO_CCDGO,MPIO_CNMBR,IRV_NESTIMADO,IRV_CCLUSTER,IRV_CYEAR", "returnGeometry": "false"}
        url = f"{SERVICE}/{layer}/query?{urllib.parse.urlencode(params)}"
        response, payload = get_json(url)
        features = response.get("features", [])
        if len(features) != 1:
            raise ValueError(f"IRV {year}: se esperaba una fila municipal, llegaron {len(features)}")
        attributes = features[0]["attributes"]
        if str(attributes["MPIO_CCDGO"]) != "13001":
            raise ValueError(f"IRV {year}: geografía o vigencia inesperada")
        raw_value = attributes["IRV_NESTIMADO"]
        raw_year = attributes["IRV_CYEAR"]
        if raw_value is None and raw_year is None and attributes["IRV_CCLUSTER"] == "Sin Información":
            value = None
        elif raw_value is not None and int(raw_year) == year:
            value = float(raw_value)
        else:
            raise ValueError(f"IRV {year}: valor o vigencia inesperada")
        if value is not None and not 0 <= value <= 1:
            raise ValueError(f"IRV {year}: valor fuera de escala")
        rows.append(dict(zip(FIELDS, [KEY, year, "13001", attributes["MPIO_CNMBR"], value,
                                      attributes["IRV_CCLUSTER"], layer, url,
                                      hashlib.sha256(payload).hexdigest()], strict=True)))
    metadata = {"servicio": SERVICE, "pagina": PAGE, "escala": "municipio DIVIPOLA 13001",
                "unidad": "índice estimado, escala 0 a 1", "geometria": "polígono municipal de la capa; no punto de hecho",
                "corte_fuente": "sin fecha de corte explícita en el servicio; año de medición en IRV_CYEAR",
                "extraido_utc": datetime.now(timezone.utc).isoformat(), "filas": len(rows),
                "sin_dato": [row["anio"] for row in rows if row["irv_estimado"] is None]}
    return rows, metadata


def persist(rows: list[dict], metadata: dict) -> None:
    with (BASE / "irv_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (BASE / "extracciones" / "irv_cartagena.metadata.json").write_text(
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
    source = (KEY, "IRV-MapServer-2012-2025", "Índice de Riesgo de Victimización municipal Cartagena",
              "Unidad para las Víctimas / RNI", "politica", PAGE, SERVICE,
              metadata["extraido_utc"], digest, len(rows), 2012, 2025, "servicio_municipal_oficial")
    previous.append(dict(zip(fields, source, strict=True)))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (KEY,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (KEY,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                (KEY, "indice_riesgo_victimizacion", row["anio"], row["categoria_riesgo"],
                 row["irv_estimado"], "índice 0–1", f"Medición {row['anio']}; capa {row['capa_id']}; no mide casos observados")
                for row in rows if row["irv_estimado"] is not None
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
    print(f"IRV Cartagena: {len(values)} valores municipales, {values[0]['anio']}–{values[-1]['anio']}")
