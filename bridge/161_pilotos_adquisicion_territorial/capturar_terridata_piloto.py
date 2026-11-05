"""Adquisicion publica acotada de TerriData para el piloto 161.

No edita backend, no usa banco ni SQL, no genera datos sinteticos.
Solo produce manifiestos y archivos originales bajo este directorio.
"""
from __future__ import annotations

import csv
import hashlib
import http.client
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))
from app.modules.compromisos.parser_terridata_polis import (  # noqa: E402
    ENCABEZADO_ESPERADO,
    IdentidadEsperadaTerridata,
    MetadatosCapturaTerridata,
    parsear_terridata_txt,
)

BASE = Path(__file__).resolve().parent
RAW = BASE / "raw"
SALIDAS = BASE / "salidas"
HOST_OFICIAL = "terridata.dnp.gov.co"
CODIGOS = ("13001", "13673", "23660", "11001")
PATRON_TXT = "https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData{codigo}.txt.zip"
MAXIMO_ZIP_BYTES = 8 * 1024 * 1024
MAXIMO_TXT_BYTES = 64 * 1024 * 1024
REGLA_NUMERICA = "decimal_coma_miles_terridata.v1"
SHA_CATALOGO = "82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc"
ZIP_75 = RAIZ / "bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip"


def _sha_bytes(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def _ahora_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _capturar_url(url: str) -> dict:
    partes = urlsplit(url)
    if partes.scheme != "https" or partes.netloc != HOST_OFICIAL or partes.hostname != HOST_OFICIAL:
        raise ValueError(f"Destino no HTTPS-oficial: {url}")
    contexto_ssl = __import__("ssl").create_default_context()
    conexion = http.client.HTTPSConnection(
        partes.netloc,
        timeout=20.0,
        context=contexto_ssl,
    )
    intento = {
        "url_solicitada": url,
        "url_final": url,
        "utc": None,
        "estado_http": None,
        "content_type": None,
        "content_length": None,
        "etag": None,
        "last_modified": None,
        "bytes": 0,
        "sha256": None,
        "error": None,
    }
    try:
        conexion.request(
            "GET",
            partes.path + ("?" + partes.query if partes.query else ""),
            headers={
                "Accept": "application/zip, application/octet-stream, */*",
                "Accept-Encoding": "identity",
                "User-Agent": "Polis/OL-TERR-ADQ-02",
                "Connection": "close",
            },
        )
        respuesta = conexion.getresponse()
        intento["utc"] = _ahora_utc()
        intento["estado_http"] = respuesta.status
        intento["content_type"] = respuesta.getheader("Content-Type")
        intento["content_length"] = respuesta.getheader("Content-Length")
        intento["etag"] = respuesta.getheader("ETag")
        intento["last_modified"] = respuesta.getheader("Last-Modified")
        datos = respuesta.read(MAXIMO_ZIP_BYTES + 1)
        if len(datos) > MAXIMO_ZIP_BYTES:
            intento["error"] = "limite_8mib_zip_excedido"
            datos = datos[:MAXIMO_ZIP_BYTES]
        if respuesta.status >= 300:
            intento["error"] = intento["error"] or "estado_http_no_2xx"
        intento["bytes"] = len(datos)
        intento["sha256"] = _sha_bytes(datos) if datos else None
    except Exception as exc:
        intento["utc"] = intento.get("utc") or _ahora_utc()
        intento["error"] = f"{type(exc).__name__}: {exc}"
        datos = b""
    finally:
        conexion.close()
    return {"intento": intento, "datos": datos}


def _descargar_con_reintento(url: str) -> tuple[dict, bytes]:
    resultado1 = _capturar_url(url)
    error1 = resultado1["intento"].get("error")
    if error1 not in (None, "estado_http_no_2xx"):
        resultado2 = _capturar_url(url)
        resultado1["reintentos"] = 1
        if resultado2["intento"].get("error") is None:
            return {"intentos": [resultado1["intento"], resultado2["intento"]], "datos": resultado2["datos"]}
        return {"intentos": [resultado1["intento"], resultado2["intento"]], "datos": resultado1["datos"]}
    if error1 == "estado_http_no_2xx":
        return {"intentos": [resultado1["intento"]], "datos": resultado1["datos"]}
    return {"intentos": [resultado1["intento"]], "datos": resultado1["datos"]}


def _validar_zip_txt(codigo: str, datos_zip: bytes) -> dict:
    validacion = {
        "es_zip_valido": False,
        "miembro_esperado": f"TerriData{codigo}.txt",
        "miembros": [],
        "miembro_encontrado": None,
        "bytes_declarados_txt": None,
        "bytes_reales_txt": None,
        "cifrado": False,
        "crc_valido": False,
        "bytes_txt": None,
        "sha256_txt": None,
        "encabezado_literal": None,
        "encabezado_13_columnas_conforme": False,
        "errores": [],
    }
    if not datos_zip:
        validacion["errores"].append("sin_bytes")
        return validacion
    try:
        archivo_zip = zipfile.ZipFile(io.BytesIO(datos_zip))
    except zipfile.BadZipFile as exc:
        validacion["errores"].append(f"zip_invalido: {exc}")
        return validacion
    try:
        infos = archivo_zip.infolist()
        validacion["miembros"] = [
            {
                "nombre": info.filename,
                "compress_size": info.compress_size,
                "file_size": info.file_size,
                "flag_bits": info.flag_bits,
            }
            for info in infos
        ]
        if len(infos) != 1 or infos[0].filename != validacion["miembro_esperado"]:
            validacion["errores"].append("miembro_esperado_unico_no_cumplido")
            return validacion
        info = infos[0]
        validacion["miembro_encontrado"] = info.filename
        validacion["bytes_declarados_txt"] = info.file_size
        validacion["cifrado"] = bool(info.flag_bits & 1)
        if validacion["cifrado"]:
            validacion["errores"].append("zip_cifrado")
            return validacion
        if info.file_size > MAXIMO_TXT_BYTES:
            validacion["errores"].append("txt_excede_64mib")
            return validacion
        archivo = archivo_zip.open(info.filename, "r")
        with archivo:
            datos_txt = archivo.read(MAXIMO_TXT_BYTES + 1)
        validacion["bytes_reales_txt"] = len(datos_txt)
        validacion["sha256_txt"] = _sha_bytes(datos_txt)
        validacion["crc_valido"] = archivo_zip.testzip() is None
        if not validacion["crc_valido"]:
            validacion["errores"].append("crc_invalido")
            return validacion
        texto = datos_txt.decode("utf-8-sig")
        lector = csv.reader(io.StringIO(texto, newline=""), delimiter="|", quotechar=None, doublequote=False, escapechar=None, strict=True, quoting=csv.QUOTE_NONE)
        try:
            encabezado = next(lector)
        except StopIteration:
            validacion["errores"].append("encabezado_ausente")
            return validacion
        except csv.Error as exc:
            validacion["errores"].append(f"csv_encabezado: {exc}")
            return validacion
        validacion["encabezado_literal"] = "|".join(encabezado)
        validacion["encabezado_13_columnas_conforme"] = tuple(encabezado) == ENCABEZADO_ESPERADO
        if not validacion["encabezado_13_columnas_conforme"]:
            validacion["errores"].append("encabezado_no_conforme_13_columnas")
            return validacion
        validacion["es_zip_valido"] = True
        validacion["bytes_txt"] = datos_txt
        return validacion
    finally:
        archivo_zip.close()


def _resumen_parser(resultado_parser, codigo: str) -> dict:
    filas = resultado_parser.filas
    codigos = sorted({fila.codigo_entidad for fila in filas})
    entidades = sorted({fila.entidad for fila in filas})
    estados = {
        "aceptadas": sum(1 for fila in filas if fila.estado_fila == "aceptada"),
        "retenidas": sum(1 for fila in filas if fila.estado_fila == "retiene"),
        "rechazadas": sum(1 for fila in filas if fila.estado_fila == "rechazada"),
        "identidad_concordante": sum(1 for fila in filas if fila.estado_identidad == "concordante_declarada"),
        "identidad_discordante": sum(1 for fila in filas if fila.estado_identidad == "discordante_declarada"),
        "identidad_no_contrastable": sum(1 for fila in filas if fila.estado_identidad == "no_contrastable"),
        "identidad_no_evaluable": sum(1 for fila in filas if fila.estado_identidad == "no_evaluable_por_estructura"),
        "valor_numerico_valido": sum(1 for fila in filas if fila.estado_valor_numerico == "decimal_validado"),
        "valor_numerico_formato_no_regla": sum(1 for fila in filas if fila.estado_valor_numerico == "formato_no_regla"),
        "valor_numerico_no_presente": sum(1 for fila in filas if fila.estado_valor_numerico == "no_presente"),
        "anio_conforme": sum(1 for fila in filas if fila.estado_temporalidad == "declarada_sin_regla_proveedor"),
        "anio_no_conforme": sum(1 for fila in filas if fila.estado_temporalidad == "anio_no_conforme"),
        "mes_0": sum(1 for fila in filas if fila.estado_temporalidad == "mes_0_sin_regla_proveedor"),
        "estructura_no_evaluable": sum(1 for fila in filas if fila.estado_temporalidad == "no_evaluable_por_estructura"),
    }
    return {
        "filas_total": len(filas),
        "codigos_entidad_presentes": codigos,
        "entidades_presentes": entidades,
        "estados": estados,
    }


def _escribir_json(ruta: Path, datos: dict) -> Path:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    datos_bytes = (json.dumps(datos, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    ruta.write_bytes(datos_bytes)
    return ruta


def _captura_75_13001() -> dict:
    datos_zip = ZIP_75.read_bytes()
    validacion = _validar_zip_txt("13001", datos_zip)
    texto = validacion.get("bytes_txt") or b""
    return {
        "zip_sha256": _sha_bytes(datos_zip),
        "zip_bytes": len(datos_zip),
        "txt_sha256": validacion.get("sha256_txt"),
        "txt_bytes": validacion.get("bytes_reales_txt"),
        "es_zip_valido": validacion.get("es_zip_valido"),
        "encabezado_literal": validacion.get("encabezado_literal"),
    }


def main() -> None:
    catalogo = json.loads((RAIZ / "bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json").read_text(encoding="utf-8"))
    referencia_75 = _captura_75_13001()
    entidades: list[dict] = []
    for codigo in CODIGOS:
        registro_cat = next(r for r in catalogo["municipios"] if r["concat"] == codigo)
        url = PATRON_TXT.format(codigo=codigo)
        captura = _descargar_con_reintento(url)
        bytes_zip = captura["datos"]
        ruta_raw = RAW / codigo / "original.respuesta.bin"
        ruta_raw.parent.mkdir(parents=True, exist_ok=True)
        ruta_raw.write_bytes(bytes_zip)
        validacion = _validar_zip_txt(codigo, bytes_zip)
        parser = None
        error_parser = None
        if validacion.get("es_zip_valido") and validacion.get("bytes_txt"):
            ruta_txt = SALIDAS / codigo / f"TerriData{codigo}.txt"
            ruta_txt.parent.mkdir(parents=True, exist_ok=True)
            ruta_txt.write_bytes(validacion["bytes_txt"])
            try:
                resultado_parser = parsear_terridata_txt(
                    validacion["bytes_txt"],
                    MetadatosCapturaTerridata(
                        canal_declarado="TerriData",
                        origen_declarado=url,
                        miembro_texto=validacion["miembro_encontrado"],
                        fecha_captura=datetime.now(timezone.utc).date(),
                        sha256_captura_declarado=validacion["sha256_txt"],
                        regla_numerica=REGLA_NUMERICA,
                    ),
                    IdentidadEsperadaTerridata(
                        codigo_departamento=registro_cat["dpto"],
                        nombre_departamento=registro_cat["dpto_nombre"],
                        codigo_entidad=codigo,
                        nombre_entidad=registro_cat["nombre"],
                    ),
                )
                parser = _resumen_parser(resultado_parser, codigo)
            except Exception as exc:
                error_parser = f"{type(exc).__name__}: {exc}"
        comparacion_13001 = None
        if codigo == "13001":
            zip75_validacion = _validar_zip_txt("13001", ZIP_75.read_bytes())
            comparacion_13001 = {
                "zip_75_sha256": referencia_75["zip_sha256"],
                "zip_nuevo_sha256": _sha_bytes(bytes_zip),
                "zip_igual": referencia_75["zip_sha256"] == _sha_bytes(bytes_zip),
                "txt_75_sha256": zip75_validacion.get("sha256_txt"),
                "txt_nuevo_sha256": validacion.get("sha256_txt"),
                "txt_igual": zip75_validacion.get("sha256_txt") == validacion.get("sha256_txt"),
                "ambas_versiones_conservadas": True,
            }
        entidad = {
            "codigo": codigo,
            "catalogo_128": {
                "dpto": registro_cat["dpto"],
                "dpto_nombre": registro_cat["dpto_nombre"],
                "mpio": registro_cat["mpio"],
                "concat": registro_cat["concat"],
                "tipo": registro_cat["tipo"],
                "nombre": registro_cat["nombre"],
                "anio_version": registro_cat["anio_version"],
                "anio_creacion": registro_cat["anio_creacion"],
                "sha256_catalogo": SHA_CATALOGO,
            },
            "url": url,
            "intentos": captura["intentos"],
            "raw_sha256": _sha_bytes(bytes_zip),
            "raw_bytes": len(bytes_zip),
            "raw_ruta": str(ruta_raw.relative_to(BASE)),
            "zip_validacion": {**validacion, "bytes_txt": None},
            "parser": parser,
            "error_parser": error_parser,
            "comparacion_13001": comparacion_13001,
            "objetivo": "evidencia_publica_piloto; no ingesta; no ficha certificada",
        }
        entidades.append(entidad)

    resumen = {
        "fecha_utc": _ahora_utc(),
        "url_patron": PATRON_TXT,
        "host_oficial": HOST_OFICIAL,
        "objetivos": len(CODIGOS),
        "respuestas": len(entidades),
        "zip_validos": sum(1 for entidad in entidades if entidad["zip_validacion"]["es_zip_valido"]),
        "txt_validos": sum(1 for entidad in entidades if entidad["zip_validacion"]["es_zip_valido"]),
        "parseos": sum(1 for entidad in entidades if entidad["parser"] is not None),
        "entidades_ingeridas_banco": 0,
        "entidades_sin_datos": sum(1 for entidad in entidades if entidad["raw_bytes"] == 0),
        "entidades_error_descarga": sum(1 for entidad in entidades if any(intento.get("error") for intento in entidad["intentos"])),
        "entidades": entidades,
        "limites": {
            "no_acredita_cobertura_nacional": True,
            "no_acredita_estatus_juridico": True,
            "no_acredita_validacion_semantica": True,
            "no_acredita_condiciones_de_uso": True,
        },
    }
    _escribir_json(BASE / "manifiesto_lote.json", resumen)
    print(BASE / "manifiesto_lote.json")


if __name__ == "__main__":
    main()
