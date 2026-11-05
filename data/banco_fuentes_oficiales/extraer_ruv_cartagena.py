"""Extrae agregados municipales del RUV; nunca guarda filas desagregadas."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
KEY = "unidad_victimas_ruv_cartagena"
SERVICE = "https://cifras2.unidadvictimas.gov.co/RNI.Reportes.Servicios/"
METRICS = {"PER_OCU": "personas_por_ocurrencia", "PER_DECLA": "personas_por_declaracion", "EVENTOS": "eventos_reportados"}
FIELDS = ["fuente", "indicador", "anio", "codigo_hecho", "hecho", "valor", "unidad", "fecha_corte", "sha256_respuesta", "nota"]


def get_json(path: str) -> tuple[object, bytes]:
    request = urllib.request.Request(SERVICE + path, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = response.read()
    return json.loads(payload), payload


def extract() -> tuple[list[dict], dict]:
    dates, _ = get_json("api/ListaFechaCorte?idReporte=5")
    if not isinstance(dates, list) or not dates:
        raise ValueError("RUV no publicó fechas de corte")
    cutoff = dates[0]["FECHA_CORTE_CORTA"]
    params = {
        "idReporte": 5, "nivelTerritorial": 2, "fechaReporte": cutoff,
        "anio": 0, "idDepartamento": "13", "idMunicipio": "13001", "idDireccionTerritorial": 0,
    }
    query = "api/Cifras/DatosAbiertos?" + urllib.parse.urlencode(params)
    source_rows, payload = get_json(query)
    if not isinstance(source_rows, list) or not source_rows:
        raise ValueError("RUV no devolvió filas para Cartagena")
    result = defaultdict(int)
    names = {}
    for row in source_rows:
        if row.get("COD_CIUDAD_MUNI") != "13001" or row.get("COD_ESTADO_DEPTO") != "13":
            raise ValueError("Respuesta RUV contiene municipio distinto de Cartagena")
        if cutoff not in str(row.get("FECHA_CORTE", "")):
            raise ValueError("Respuesta RUV con fecha de corte inesperada")
        year = int(row["VIGENCIA"])
        if not 2012 <= year <= 2026:
            continue
        code, fact = str(row["PARAM_HECHO"]), str(row["HECHO"])
        if code in names and names[code] != fact:
            raise ValueError(f"Código de hecho RUV ambiguo: {code}")
        names[code] = fact
        for field, indicator in METRICS.items():
            value = int(row[field])
            if value < 0:
                raise ValueError("RUV devolvió valor negativo")
            result[(year, code, indicator)] += value
    sha = hashlib.sha256(payload).hexdigest()
    output = []
    for (year, code, indicator), value in sorted(result.items()):
        note = ("Vigencia según el reporte RUV; ocurrencia, declaración y eventos son universos distintos. "
                "Personas por hecho/año no son personas únicas entre hechos o años. "
                "Fecha de corte del registro, no fecha del hecho.")
        output.append(dict(zip(FIELDS, [KEY, indicator, year, code, names[code], value,
                                        "personas" if indicator.startswith("personas") else "eventos",
                                        cutoff, sha, note], strict=True)))
    if not output or len({r["codigo_hecho"] for r in output}) < 10:
        raise ValueError("Cobertura RUV inesperadamente reducida")
    metadata = {"url": SERVICE + query, "fecha_corte": cutoff, "sha256_respuesta": sha,
                "filas_consultadas": len(source_rows), "filas_agregadas": len(output),
                "extraido_utc": datetime.now(timezone.utc).isoformat(),
                "privacidad": "Solo se guardan agregados por municipio, año, hecho y métrica"}
    return output, metadata


def persist(rows: list[dict], metadata: dict) -> None:
    with (BASE / "ruv_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (BASE / "extracciones" / "ruv_cartagena.metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    catalog = BASE / "catalogo.csv"
    with catalog.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames
        previous = [r for r in reader if r["clave"] != KEY]
    if not fields:
        raise ValueError("Catálogo sin cabecera")
    data = json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()
    years = [r["anio"] for r in rows]
    source = (KEY, "RUV-reporte-5", "RUV Cartagena: personas por ocurrencia/declaración y eventos por hecho y año",
              "Unidad para las Víctimas / RNI", "transversal",
              "https://datospaz.unidadvictimas.gov.co/registro-unico-de-victimas/", metadata["url"],
              metadata["extraido_utc"], hashlib.sha256(data).hexdigest(), metadata["filas_consultadas"],
              min(years), max(years), "corte_" + metadata["fecha_corte"].replace("/", "-"))
    previous.append(dict(zip(fields, source, strict=True)))
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    try:
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (KEY,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (KEY,))
            db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", source)
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", [
                (KEY, r["indicador"], r["anio"], f"{r['codigo_hecho']} | {r['hecho']}",
                 r["valor"], r["unidad"], f"Corte {r['fecha_corte']}; {r['nota']}") for r in rows
            ])
        with catalog.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(previous)
    finally:
        db.close()


if __name__ == "__main__":
    data, meta = extract()
    persist(data, meta)
    print(f"RUV Cartagena: {len(data)} agregados de {meta['filas_consultadas']} filas; corte {meta['fecha_corte']}")
