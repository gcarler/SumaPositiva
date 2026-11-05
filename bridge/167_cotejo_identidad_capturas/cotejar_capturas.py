"""Cotejo local de capturas 161 con el parser congelado, sin red ni banco."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
import zipfile
from datetime import date
from pathlib import Path
from collections import Counter, defaultdict
from typing import Literal

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))
from app.modules.compromisos.parser_terridata_polis import (
    ENCABEZADO_ESPERADO,
    IdentidadEsperadaTerridata,
    MetadatosCapturaTerridata,
    parsear_terridata_txt,
)

BASE = Path(__file__).resolve().parent
BASE161 = RAIZ / "bridge/161_pilotos_adquisicion_territorial"
CATALOGO = RAIZ / "bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ahora() -> str:
    return "2026-10-26"


def leer_zip(codigo: str) -> dict:
    ruta_zip = BASE161 / "raw" / codigo / "original.respuesta.bin"
    datos = ruta_zip.read_bytes()
    salida = {
        "codigo": codigo,
        "zip_ruta": str(ruta_zip.relative_to(RAIZ)),
        "zip_sha256": hashlib.sha256(datos).hexdigest(),
        "zip_bytes": len(datos),
        "miembro": None,
        "txt_sha256": None,
        "txt_bytes": None,
        "crc_valido": False,
        "cifrado": False,
        "encabezado_literal": None,
        "errores": [],
    }
    with zipfile.ZipFile(io.BytesIO(datos)) as archivo_zip:
        infos = archivo_zip.infolist()
        if len(infos) != 1:
            salida["errores"].append("miembro_unico_no_cumplido")
            return salida
        info = infos[0]
        salida["miembro"] = info.filename
        salida["cifrado"] = bool(info.flag_bits & 1)
        with archivo_zip.open(info.filename, "r") as archivo:
            bytes_txt = archivo.read()
        salida["txt_sha256"] = hashlib.sha256(bytes_txt).hexdigest()
        salida["txt_bytes"] = len(bytes_txt)
        salida["crc_valido"] = archivo_zip.testzip() is None
        texto = bytes_txt.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(texto, newline=""), delimiter="|", quotechar=None, doublequote=False, escapechar=None, strict=True, quoting=csv.QUOTE_NONE)
        try:
            encabezado = next(reader)
        except (StopIteration, csv.Error):
            salida["errores"].append("encabezado_ausente")
            return salida
        salida["encabezado_literal"] = "|".join(encabezado)
        salida["encabezado_conforme_13"] = tuple(encabezado) == ENCABEZADO_ESPERADO
    return salida


def parsear(codigo: str, bytes_txt: bytes, ident: IdentidadEsperadaTerridata) -> object:
    metadatos = MetadatosCapturaTerridata(
        canal_declarado="TerriData",
        origen_declarado="local-161",
        miembro_texto=f"TerriData{codigo}.txt",
        fecha_captura=date(2026, 10, 26),
        sha256_captura_declarado=hashlib.sha256(bytes_txt).hexdigest(),
        regla_numerica="decimal_coma_miles_terridata.v1",
    )
    return parsear_terridata_txt(bytes_txt, metadatos, ident)


def resumen(resultado, codigo: str, ident: IdentidadEsperadaTerridata) -> dict:
    filas = resultado.filas
    estados = Counter(fila.estado_identidad for fila in filas)
    temporal = Counter(fila.estado_temporalidad for fila in filas)
    advertencias = Counter()
    for fila in filas:
        advertencias.update(fila.advertencias)
    discrepancias = {
        "codigo_departamento": sum(1 for fila in filas if fila.codigo_departamento != (ident.codigo_departamento or "")),
        "codigo_entidad": sum(1 for fila in filas if fila.codigo_entidad != (ident.codigo_entidad or "")),
        "nombre_departamento": sum(1 for fila in filas if ident.nombre_departamento is not None and fila.departamento != ident.nombre_departamento),
        "nombre_entidad": sum(1 for fila in filas if ident.nombre_entidad is not None and fila.entidad != ident.nombre_entidad),
    }
    return {
        "fecha_utc": ahora(),
        "identidad_esperada": {
            "codigo_departamento": ident.codigo_departamento,
            "codigo_entidad": ident.codigo_entidad,
            "nombre_departamento": ident.nombre_departamento,
            "nombre_entidad": ident.nombre_entidad,
            "nivel_territorial": ident.nivel_territorial,
        },
        "filas_total": len(filas),
        "estado_identidad": dict(estados),
        "estado_temporalidad": dict(temporal),
        "advertencias_frecuentes": dict(advertencias.most_common(12)),
        "discrepancias_por_campo": discrepancias,
        "pares_literal": {
            "nombre_departamento": list({(fila.departamento, ident.nombre_departamento) for fila in filas}) if ident.nombre_departamento is not None else [],
            "nombre_entidad": list({(fila.entidad, ident.nombre_entidad) for fila in filas}) if ident.nombre_entidad is not None else [],
        },
    }


def main() -> None:
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    objetivos: list[dict] = []
    for codigo in ("13001", "13673", "23660", "11001"):
        registro = next(r for r in catalogo["municipios"] if r["concat"] == codigo)
        infozip = leer_zip(codigo)
        ruta_txt = BASE161 / "salidas" / codigo / f"TerriData{codigo}.txt"
        bytes_txt = ruta_txt.read_bytes()
        completa = IdentidadEsperadaTerridata(
            codigo_departamento=registro["dpto"],
            nombre_departamento=registro["dpto_nombre"],
            codigo_entidad=registro["concat"],
            nombre_entidad=registro["nombre"],
        )
        solo_codigo = IdentidadEsperadaTerridata(
            codigo_departamento=registro["dpto"],
            codigo_entidad=registro["concat"],
        )
        primera = resumen(parsear(codigo, bytes_txt, completa), codigo, completa)
        segunda = resumen(parsear(codigo, bytes_txt, solo_codigo), codigo, solo_codigo)
        objetivos.append(
            {
                "codigo": codigo,
                "hash_zip": infozip,
                "hash_txt": sha(ruta_txt),
                "identidad_completa_original": primera,
                "identidad_solo_codigos": segunda,
                "diferencias_con_primera": {
                    "estado_identidad": dict(Counter(segunda["estado_identidad"]) - Counter(primera["estado_identidad"])),
                    "discrepancias_por_campo": {k: segunda["discrepancias_por_campo"][k] for k in ("codigo_departamento", "codigo_entidad")},
                },
            }
        )

    datos = {
        "tarea": "OL-TERR-ADQ-02-R1",
        "fecha_utc": ahora(),
        "hash_parser": sha(RAIZ / "backend/app/modules/compromisos/parser_terridata_polis.py"),
        "catalogo_sha256": sha(CATALOGO),
        "objetivos": objetivos,
        "limites": {
            "no_red": True,
            "no_sql": True,
            "no_pytest": True,
            "no_commit": True,
            "no_push": True,
            "no_deploy": True,
            "no_aplicacion_modificada": True,
            "no_parser_modificado": True,
            "no_resolver_modificado": True,
            "no_catalogo_modificado": True,
            "no_diagnostico_modificado": True,
        },
    }
    (BASE / "cotejo_identidad.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(BASE / "cotejo_identidad.json")


if __name__ == "__main__":
    main()
