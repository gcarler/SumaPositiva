"""FB-TERR-NUM-01 · Piloto real local: parser v2 con regla explicita coma/miles.

Reproduce la ejecucion sobre la captura oficial conservada en 75, leyendo el
miembro del ZIP en memoria (sin extraccion de rutas), aplicando
decimal_coma_miles_terridata.v1 y escribiendo evidencia en 118.
Uso: backend/.venv/bin/python bridge/118_validacion_parser_numerico/guion_piloto_118.py
"""
from __future__ import annotations

import hashlib
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))

from app.modules.compromisos import parser_terridata_polis as parser  # noqa: E402

REGla = "decimal_coma_miles_terridata.v1"
ZIPO = RAIZ / "bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip"
SALIDA = RAIZ / "bridge/118_validacion_parser_numerico"
LIMITE_COMPRIMIDO = 8 * 1024 * 1024
LIMITE_EXPANSION = 8 * 1024 * 1024


def sha256_bytes(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def preparar_memoria(zip_bytes: bytes) -> tuple[str, bytes]:
    if len(zip_bytes) > LIMITE_COMPRIMIDO:
        raise ValueError("ZIP excede limite comprimido")
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        if zf.testzip() is not None:
            raise ValueError("CRC invalido del ZIP")
        miembros = zf.namelist()
        if miembros != ["TerriData13001.txt"]:
            raise ValueError(f"Miembros inesperados: {miembros}")
        info = zf.infolist()[0]
        if info.flag_bits & 0x1 or info.comment or info.filename != "TerriData13001.txt":
            raise ValueError("ZIP con cifrado o nombre inesperado")
        token = zf.read(info)
        if len(token) > LIMITE_EXPANSION:
            raise ValueError("Expansion excede limite")
        return info.filename, token


def main() -> None:
    zip_bytes = ZIPO.read_bytes()
    sha_zip = sha256_bytes(zip_bytes)
    miembro, txt = preparar_memoria(zip_bytes)
    sha_txt = sha256_bytes(txt)

    captura = parser.MetadatosCapturaTerridata(
        canal_declarado="TerriData",
        origen_declarado="zip-oficial-conservado-75 (ejecucion local 118)",
        miembro_texto=miembro,
        fecha_captura=None,
        sha256_captura_declarado=sha_txt,
        regla_numerica=REGla,
    )
    identidad = parser.IdentidadEsperadaTerridata(
        codigo_departamento="13", codigo_entidad="13001"
    )
    resultado = parser.parsear_terridata_txt(txt, captura, identidad)

    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta_filas = SALIDA / "filas.jsonl"
    with ruta_filas.open("w", encoding="utf-8") as fh:
        for fila in resultado.filas:
            registro = fila.model_dump(mode="json")
            registro["version_parser"] = parser.VERSION_PARSER
            registro["regla_numerica"] = parser.REGLA_NUMERICA_COMA_MILES
            fh.write(json.dumps(registro, ensure_ascii=False, sort_keys=False) + "\n")

    conversiones_por_estado = {"aceptada": 0, "retiene": 0, "rechazada": 0}
    sin_regla_por_estado = {"aceptada": 0, "retiene": 0, "rechazada": 0}
    no_presente = 0
    for fila in resultado.filas:
        if fila.estado_valor_numerico == "decimal_validado":
            conversiones_por_estado[fila.estado_fila] += 1
        elif fila.estado_valor_numerico == "formato_no_regla":
            sin_regla_por_estado[fila.estado_fila] += 1
        else:
            no_presente += 1

    resumen = {
        "esquema": parser.ESQUEMA_RESULTADO,
        "version_parser": parser.VERSION_PARSER,
        "regla_numerica": REGla,
        "estado": "regla_numerica_implementada_piloto_pendiente_revision",
        "insumo": {"ruta_zip": str(ZIPO.relative_to(RAIZ)), "sha256_zip": sha_zip, "bytes_zip": len(zip_bytes),
                   "miembro": miembro, "sha256_txt": sha_txt, "bytes_txt": len(txt), "crc_verificado": True,
                   "sin_extraccion_filesystem": True},
        "conteos": json.loads(resultado.conteos.model_dump_json()),
        "valor_numerico_por_estado_fila": {"decimal_validado": conversiones_por_estado,
                                            "formato_no_regla": sin_regla_por_estado,
                                            "no_presente_total": no_presente},
        "identidad": json.loads(parser.IdentidadEsperadaTerridata(
            codigo_departamento="13", codigo_entidad="13001").model_dump_json()),
        "inicio_utc": datetime.now(timezone.utc).isoformat(),
        "sin_sql": True, "sin_red": True, "sin_promocion_banco": True,
        "tarea": "FB-TERR-NUM-01",
    }
    (SALIDA / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")

    manifiesto = {
        "esquema": "polis.piloto_118_manifiesto.v1",
        "tarea": "FB-TERR-NUM-01",
        "hashes": {
            "zip": sha_zip, "txt": sha_txt,
            "parser": sha256_bytes((RAIZ / "backend/app/modules/compromisos/parser_terridata_polis.py").read_bytes()),
            "regla": REGla,
            "filas_jsonl": sha256_bytes(ruta_filas.read_bytes()),
            "resumen": sha256_bytes((SALIDA / "resumen.json").read_bytes()),
        },
        "resultados": {
            "filas": len(resultado.filas),
            "decimal_validado": resumen["conteos"]["filas_con_valor_numerico_valido"],
            "formato_no_regla": resumen["conteos"]["filas_con_numerico_sin_regla"],
            "conversiones_por_estado_fila": conversiones_por_estado,
        },
        "guion": "bridge/118_validacion_parser_numerico/guion_piloto_118.py",
        "fin_utc": datetime.now(timezone.utc).isoformat(),
    }
    (SALIDA / "manifiesto_ejecucion.json").write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifiesto["resultados"], ensure_ascii=False))


if __name__ == "__main__":
    main()
