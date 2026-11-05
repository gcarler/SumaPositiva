#!/usr/bin/env python3
"""Guion reproducible de captura DIVIPOLA FB-TERR-ID-01.

Fase A (paginado) fallo con ArcGIS 400: esta capa no declara
advancedQueryCapabilities.supportsPagination=False, por lo que resultOffset no
se admite. Fase B correcta: una sola peticion por capa; maxRecordCount=2000 y
conteos previos returnCountOnly (1122 Municipio, 33 Departamento) garantizan
cobertura sin truncamiento; se verifica conteo, exceededTransferLimit y
OBJECTIDs unicos. Solo lectura GET publica, sin credenciales, sin escritura remota.

Nota de intento A (documentado, no reproducido aqui): con resultOffset=0 y
resultRecordCount=1000 la capa 317 devolvio ArcGIS error 400
"Unable to perform query operation." Evidencia: capa317_pagina_00.json.
"""

import urllib.parse
import urllib.request
import json
import hashlib
import sys
from datetime import datetime, timezone

BASE = (
    "https://geoportal.dane.gov.co/mparcgis/"
    "rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer"
)
CAPAS = {
    "317": {
        "nombre": "Municipio",
        "esperado": 1122,
        "campos": "OBJECTID,DPTO_CCDGO,MPIO_CCDGO,MPIO_CDPMP,MPIO_TIPO,MPIO_NANO,"
        "DPTO_CNMBRE,MPIO_CNMBRE,MPIO_CRSLCION",
    },
    "319": {
        "nombre": "Departamento",
        "esperado": 33,
        "campos": "OBJECTID,DPTO_CCDGO,DPTO_NANO,DPTO_CNMBRE,DPTO_ANO_CRCN,DPTO_ACT_ADM",
    },
}


def get(capa: str, timeout: int = 90):
    q = {
        "where": "1=1",
        "returnGeometry": "false",
        "outFields": CAPAS[capa]["campos"],
        "orderByFields": "OBJECTID",
        "f": "json",
    }
    url = f"{BASE}/{capa}/query?" + urllib.parse.urlencode(q, safe=",=")
    req = urllib.request.Request(
        url, headers={"User-Agent": "POLIS-FB-TERR-ID-01/1.0 (consulta GET publica DANE)"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        buf = r.read()
    meta = {"url": url, "sha256": hashlib.sha256(buf).hexdigest(), "bytes": len(buf)}
    return buf, meta


def capturar(capa: str):
    buf, meta = get(capa)
    datos = json.loads(buf.decode("utf-8"))
    if "error" in datos:
        raise RuntimeError(f"capa {capa} devolvio error ArcGIS: {datos['error']}")
    attrs = [f["attributes"] for f in datos.get("features", [])]
    oids = [a["OBJECTID"] for a in attrs]
    checks = {
        "capa": capa,
        "nombre": CAPAS[capa]["nombre"],
        "esperado": CAPAS[capa]["esperado"],
        "recibidos": len(attrs),
        "conteo_coincide": len(attrs) == CAPAS[capa]["esperado"],
        "exceededTransferLimit": bool(datos.get("exceededTransferLimit")),
        "oids_unicos": len(set(oids)) == len(oids),
        "sin_geometria": "features" in datos and all("geometry" not in f for f in datos["features"]),
        "sha256": meta["sha256"],
        "bytes": meta["bytes"],
    }
    return attrs, checks


def principal() -> dict:
    filas = {}
    checks = {}
    for capa in ("317", "319"):
        filas[capa], checks[capa] = capturar(capa)
    problemas = [
        k
        for capa in checks
        for k, v in checks[capa].items()
        if k in ("conteo_coincide", "oids_unicos", "sin_geometria") and not v
    ]
    truncado = any(checks[capa]["exceededTransferLimit"] for capa in checks)
    if problemas or truncado:
        raise RuntimeError(f"falla de truncamiento/duplicados: {problemas} truncado={truncado}")
    print(datetime.now(timezone.utc).isoformat())
    print(json.dumps(checks, indent=2, ensure_ascii=False))
    return {"municipios": filas["317"], "departamentos": filas["319"]}


if __name__ == "__main__":
    salida = principal()
    json.dump(salida, open("atributos_crudos_verificacion.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    sys.exit(0)
