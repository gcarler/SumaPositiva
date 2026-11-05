"""Extract municipal ICBF/SUIN aggregates without storing beneficiary records."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent
BASE = "https://www.datos.gov.co"
DATASETS = {
    "rpc": "v9qk-hdcc",
    "primera_infancia": "5akr-u7t8",
    "prevencion": "g58z-k6f6",
    "uds": "i8ww-5mcf",
    "bienestarina": "crxh-as6c",
}


def _get(client: httpx.Client, dataset_id: str, params: dict[str, str]) -> list[dict]:
    response = client.get(f"{BASE}/resource/{dataset_id}.json", params=params)
    response.raise_for_status()
    rows = response.json()
    if not isinstance(rows, list):
        raise ValueError(f"Respuesta inesperada: {dataset_id}")
    return rows


def _write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    queries = {
        "rpc": {
            "$select": "divipola_municipio,departamento,municipio,nombre_indicador,fuente,derecho,ciclo_vital,anno_vigencia,valor_indicador,unidad_medida",
            "$where": "divipola_municipio='13001'",
            "$order": "nombre_indicador,anno_vigencia,valor_indicador",
            "$limit": "1000",
        },
        "primera_infancia": {
            "$select": "vigencia,tipo_beneficiario_homologado,sum(beneficiarios) as valor,count(*) as filas",
            "$where": "codigo_municipio_uds='13001'",
            "$group": "vigencia,tipo_beneficiario_homologado",
            "$order": "vigencia,tipo_beneficiario_homologado",
            "$limit": "1000",
        },
        "prevencion": {
            "$select": "a_o,area_misional,sum(beneficiarios) as valor,count(*) as filas",
            "$where": "codigo_municipio_atenci_n='13001'",
            "$group": "a_o,area_misional",
            "$order": "a_o,area_misional",
            "$limit": "1000",
        },
        "uds": {
            "$select": "vigencia,count(distinct codigo_unidad_servicio) as valor,count(*) as filas",
            "$where": "codigo_dane_municipio='13001'",
            "$group": "vigencia",
            "$order": "vigencia",
            "$limit": "1000",
        },
        "bienestarina": {
            "$select": "anno,count(distinct cod_punto_de_entrega) as valor,count(*) as filas",
            "$where": "codigo_dane_municipio='13001'",
            "$group": "anno",
            "$order": "anno",
            "$limit": "1000",
        },
    }
    with httpx.Client(timeout=45) as client:
        extracted = {name: _get(client, DATASETS[name], params) for name, params in queries.items()}

    rpc = extracted["rpc"]
    if len(rpc) >= 1000 or any(row.get("divipola_municipio") != "13001" for row in rpc):
        raise ValueError("La extracción RPC excede el límite o contiene otros municipios")
    key_values: dict[tuple[str, str, str, str], list[str]] = defaultdict(list)
    for row in rpc:
        key = (
            row.get("nombre_indicador", ""),
            row.get("anno_vigencia", ""),
            row.get("fuente", ""),
            row.get("ciclo_vital", ""),
        )
        key_values[key].append(row.get("valor_indicador", ""))
    ambiguous = {key: vals for key, vals in key_values.items() if len(set(vals)) > 1}
    repeated = {key: vals for key, vals in key_values.items() if len(vals) > 1}
    for row in rpc:
        key = (
            row.get("nombre_indicador", ""),
            row.get("anno_vigencia", ""),
            row.get("fuente", ""),
            row.get("ciclo_vital", ""),
        )
        row["estado_calidad"] = "valores_conflictivos" if key in ambiguous else (
            "duplicado_identico" if key in repeated else "sin_duplicado"
        )
    rpc_fields = [
        "divipola_municipio", "departamento", "municipio", "nombre_indicador",
        "fuente", "derecho", "ciclo_vital", "anno_vigencia", "valor_indicador",
        "unidad_medida", "estado_calidad",
    ]
    _write_csv(ROOT / "icbf_rpc_cartagena.csv", rpc_fields, rpc)

    oferta: list[dict] = []
    for name in ("primera_infancia", "prevencion", "uds", "bienestarina"):
        for row in extracted[name]:
            oferta.append({
                "dataset": name,
                "dataset_id": DATASETS[name],
                "anio": row.get("vigencia") or row.get("a_o") or row.get("anno"),
                "desagregacion": row.get("tipo_beneficiario_homologado") or row.get("area_misional") or "total",
                "valor": row["valor"],
                "filas_agregadas": row["filas"],
                "unidad": "beneficiarios_reportados" if name in {"primera_infancia", "prevencion"} else "puntos_distintos",
            })
    _write_csv(
        ROOT / "icbf_oferta_cartagena.csv",
        ["dataset", "dataset_id", "anio", "desagregacion", "valor", "filas_agregadas", "unidad"],
        oferta,
    )
    manifest = {
        "consulta_utc": datetime.now(UTC).isoformat(),
        "divipola": "13001",
        "datasets": {name: {"id": DATASETS[name], "url": f"{BASE}/d/{DATASETS[name]}", "parametros": queries[name], "filas_salida": len(rows)} for name, rows in extracted.items()},
        "rpc_indicadores_distintos": len({row.get("nombre_indicador") for row in rpc}),
        "rpc_claves_duplicadas": len(repeated),
        "rpc_claves_con_valores_conflictivos": [
            {"indicador": key[0], "anio": key[1], "fuente": key[2], "ciclo_vital": key[3], "valores": vals}
            for key, vals in ambiguous.items()
        ],
        "exclusiones": {
            "pard_gj35-hct5": "No expone código de municipio; centro zonal no equivale a municipio de residencia o hecho.",
            "contratos_4s78-bzvq": "El código municipal corresponde al contratista; no acredita ejecución en Cartagena.",
            "salud_mental_xlsx": "Archivo descargable inspeccionado; sus tablas son nacionales, sin fila municipal Cartagena.",
        },
        "nota": "RPC compila varias entidades; no sumar con sus fuentes originales. Beneficiarios y puntos no son casos ni personas únicas; comparar cortes y cobertura antes de inferir tendencias.",
    }
    for filename in ("icbf_rpc_cartagena.csv", "icbf_oferta_cartagena.csv"):
        manifest.setdefault("sha256_salida", {})[filename] = hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()
    (ROOT / "icbf_cartagena.manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"rpc": len(rpc), "oferta": len(oferta), "duplicados": len(repeated), "conflictivos": len(ambiguous)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
