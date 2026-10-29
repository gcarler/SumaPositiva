"""CLI local para construir ficha territorial provisional desde parser.

No descarga, no abre bases de datos y no modifica parser ni conciliador.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import pathlib
import shutil
import sys
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modules.compromisos.ficha_territorial_polis import construir_ficha_territorial
from app.modules.compromisos.parser_terridata_polis import (
    IdentidadEsperadaTerridata,
    MetadatosCapturaTerridata,
    parsear_terridata_txt,
)

ROOT = Path(__file__).resolve().parents[2]
MAXIMO_ZIP_BYTES = 8 * 1024 * 1024
MAXIMO_TXT_BYTES = 64 * 1024 * 1024
SHA_CATALOGO = "82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc"


def _leer_bytes_acotados(ruta: Path, maximo: int) -> bytes:
    with ruta.open("rb") as archivo:
        datos = archivo.read(maximo + 1)
    if len(datos) > maximo:
        raise ValueError(f"Entrada excede limite: {ruta} ({len(datos)} > {maximo})")
    if not datos:
        raise ValueError(f"Entrada vacia: {ruta}")
    return datos


def _leer_zip_validado(ruta_zip: Path, sha256_zip_esperado: str, miembro: str) -> bytes:
    bytes_zip = _leer_bytes_acotados(ruta_zip, MAXIMO_ZIP_BYTES)
    if hashlib.sha256(bytes_zip).hexdigest() != sha256_zip_esperado:
        raise ValueError("SHA-256 del ZIP no coincide con esperado")
    archivo_zip = zipfile.ZipFile(io.BytesIO(bytes_zip))
    try:
        infos = archivo_zip.infolist()
        if len(infos) != 1 or infos[0].filename != miembro:
            raise ValueError(f"Miembro inesperado en ZIP: {[i.filename for i in infos]}")
        if any(info.flag_bits & 1 for info in infos):
            raise ValueError("Miembro cifrado no permitido")
        info = infos[0]
        if info.compress_size > MAXIMO_ZIP_BYTES or info.file_size > MAXIMO_TXT_BYTES:
            raise ValueError(f"Tamaño ZIP/TXT excede límites: {info.compress_size}/{info.file_size}")
        with archivo_zip.open(miembro, "r") as lector:
            bytes_txt = lector.read(MAXIMO_TXT_BYTES + 1)
        if len(bytes_txt) > MAXIMO_TXT_BYTES:
            raise ValueError(f"TXT excede límite: {len(bytes_txt)} > {MAXIMO_TXT_BYTES}")
        if archivo_zip.testzip() is not None:
            raise ValueError("CRC del ZIP inconsistente")
    finally:
        archivo_zip.close()
    return bytes_txt


def _parsear_json_estricto(texto: str) -> object:
    def _sin_duplicados(pares: list[tuple[str, object]]) -> dict[str, object]:
        salida: dict[str, object] = {}
        for campo, valor in pares:
            if campo in salida:
                raise ValueError(f"Clave JSON duplicada: {campo}")
            salida[campo] = valor
        return salida

    def _rechazo_json(valor: str) -> None:
        raise ValueError(f"Valor JSON no permitido: {valor}")

    return json.loads(
        texto,
        object_pairs_hook=_sin_duplicados,
        parse_float=_rechazo_json,
        parse_int=int,
        parse_constant=_rechazo_json,
    )


def _leer_json_acotado(ruta: Path) -> object:
    datos_bytes = _leer_bytes_acotado_small(ruta)
    texto = datos_bytes.decode("utf-8")
    return _parsear_json_estricto(texto)


def _leer_bytes_acotado_small(ruta: Path) -> bytes:
    return _leer_bytes_acotados(ruta, 2 * 1024 * 1024)


def parsear_seleccion(ruta: Path):
    datos = _leer_json_acotado(ruta)
    from app.modules.compromisos.ficha_territorial_polis import SeleccionTerritorial

    return SeleccionTerritorial.model_validate(datos)


def _cargar_catalogo(ruta: Path | None, sha256_esperado: str | None):
    from app.modules.compromisos.identidad_territorial_catalogo_polis import cargar_catalogo_identidad

    if ruta is None:
        return None
    datos = _leer_bytes_acotados(ruta, 8 * 1024 * 1024)
    sha = sha256_esperado or SHA_CATALOGO
    return cargar_catalogo_identidad(
        datos,
        sha256_esperado=sha,
        procedencia=str(ruta),
    )


def _escribir_publicacion(
    salida: Path,
    ficha_bytes: bytes,
    manifiesto: dict,
) -> Path:
    if salida.is_symlink():
        raise ValueError("Salida simbólica no permitida")
    if salida.exists():
        raise FileExistsError(f"Salida ya existe: {salida}")
    salida.parent.mkdir(parents=True, exist_ok=True)
    temporal = salida.parent / f".{salida.name}.tmp-{uuid.uuid4().hex}"
    temporal.mkdir(mode=0o700)
    try:
        (temporal / "ficha.json").write_bytes(ficha_bytes)
        manifiesto_bytes = (json.dumps(manifiesto, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
        (temporal / "manifiesto.json").write_bytes(manifiesto_bytes)
        temporal.rename(salida)
    except Exception:
        if temporal.exists():
            shutil.rmtree(temporal)
        raise
    return salida


def main() -> None:
    parser_arg = argparse.ArgumentParser(description=__doc__)
    parser_arg.add_argument("--zip", type=Path, required=True)
    parser_arg.add_argument("--sha256-zip", required=True)
    parser_arg.add_argument("--miembro", required=True)
    parser_arg.add_argument("--identidad-codigo-departamento", required=True)
    parser_arg.add_argument("--identidad-codigo-entidad", required=True)
    parser_arg.add_argument("--regla-numerica", required=True)
    parser_arg.add_argument("--version-ficha", required=True)
    parser_arg.add_argument("--procedencia", required=True)
    parser_arg.add_argument("--fecha-elaboracion", required=True)
    parser_arg.add_argument("--salida", type=Path, required=True)
    parser_arg.add_argument("--seleccion", type=Path, required=True)
    parser_arg.add_argument("--catalogo", type=Path)
    parser_arg.add_argument("--sha256-catalogo", default=SHA_CATALOGO)
    parser_arg.add_argument("--identidad-evidencia", default=None)
    args = parser_arg.parse_args()

    permitida = ROOT / "bridge"
    if args.salida.is_symlink():
        raise ValueError("Salida simbólica no permitida")
    salida = args.salida.resolve()
    if not salida.is_relative_to(permitida):
        raise ValueError(f"Salida fuera de {permitida}: {salida}")
    if args.seleccion.is_symlink():
        raise ValueError("Selección simbólica no permitida")
    if args.zip.is_symlink():
        raise ValueError("Entrada ZIP simbólica no permitida")

    bytes_txt = _leer_zip_validado(args.zip, args.sha256_zip, args.miembro)
    metadatos = MetadatosCapturaTerridata(
        canal_declarado="TerriData",
        origen_declarado=str(args.zip),
        miembro_texto=args.miembro,
        sha256_captura_declarado=hashlib.sha256(bytes_txt).hexdigest(),
        regla_numerica=args.regla_numerica,
    )
    identidad = IdentidadEsperadaTerridata(
        codigo_departamento=args.identidad_codigo_departamento,
        codigo_entidad=args.identidad_codigo_entidad,
    )
    resultado_parser = parsear_terridata_txt(bytes_txt, metadatos, identidad)
    ficha_codigo_sha256 = hashlib.sha256(
        (ROOT / "backend/app/modules/compromisos/ficha_territorial_polis.py").read_bytes()
    ).hexdigest()
    parser_codigo_sha256 = hashlib.sha256(
        (ROOT / "backend/app/modules/compromisos/parser_terridata_polis.py").read_bytes()
    ).hexdigest()
    cli_codigo_sha256 = hashlib.sha256(pathlib.Path(__file__).resolve().read_bytes()).hexdigest()
    catalogo = _cargar_catalogo(args.catalogo, args.sha256_catalogo)
    ficha = construir_ficha_territorial(
        resultado_parser=resultado_parser,
        seleccion=parsear_seleccion(args.seleccion),
        procedencia=args.procedencia,
        fecha_elaboracion=args.fecha_elaboracion,
        fecha_elaboracion_utc=datetime.now().astimezone(),
        catalogo_identidad=catalogo,
        ficha_codigo_sha256=ficha_codigo_sha256,
        parser_codigo_sha256=parser_codigo_sha256,
    )
    if args.version_ficha != ficha.version_ficha:
        raise ValueError(f"version_ficha declarada {args.version_ficha!r} difiere de ficha {ficha.version_ficha!r}")
    ficha_bytes = ficha.model_dump_json().encode()
    manifiesto = {
        "esquema": "polis.ficha_territorial.manifiesto.v2",
        "version_ficha": args.version_ficha,
        "estado_ficha": ficha.estado,
        "identidad_resolucion": ficha.identidad_resolucion.model_dump(mode="json")
        if ficha.identidad_resolucion
        else None,
        "identidad_evidencia_declarada": args.identidad_evidencia,
        "insumos_sha256": {
            "zip": args.sha256_zip,
            "txt": resultado_parser.sha256_bytes_txt,
            "catalogo": catalogo.sha256_bytes_catalogo if catalogo else None,
            "seleccion": ficha.seleccion_sha256,
        },
        "codigo_sha256": {
            "ficha": ficha_codigo_sha256,
            "parser": parser_codigo_sha256,
            "cli": cli_codigo_sha256,
        },
        "hashes_resultado": {
            "resultado_parser": ficha.resultado_parser_sha256,
            "ficha": hashlib.sha256(ficha_bytes).hexdigest(),
        },
        "artefactos_sha256": {
            "ficha.json": hashlib.sha256(ficha_bytes).hexdigest(),
        },
        "seleccion": ficha.seleccion.model_dump(mode="json"),
        "corte_observaciones": ficha.corte_observaciones.model_dump(),
        "corte_conocimiento": ficha.corte_conocimiento.model_dump(),
        "conteos": ficha.conteos,
        "sin_sql": True,
        "sin_red": True,
        "sin_promocion_banco": True,
    }
    salida_final = _escribir_publicacion(salida, ficha_bytes, manifiesto)
    print(salida_final / "ficha.json")
    print(salida_final / "manifiesto.json")


if __name__ == "__main__":
    main()
