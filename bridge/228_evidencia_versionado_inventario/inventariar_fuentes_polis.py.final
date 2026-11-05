"""Inventario reproducible de fuentes y artefactos locales de seguridad humana.

Conserva la distinción entre la clave de una serie y la fuente institucional.
No modifica los insumos ni promociona registros de calidad incierta.
"""

from __future__ import annotations

import copy
import csv
import hashlib
import json
import os
import re
import stat
import tempfile
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import BinaryIO

RAIZ = Path(__file__).resolve().parents[1]
BANCO = Path(os.environ.get("POLIS_INVENTARIO_BANCO", RAIZ / "data/banco_fuentes_oficiales"))
CONSOLIDADO = BANCO / "indicadores_consolidados_cartagena_2026.csv"
SALIDA = BANCO / "inventario_pipeline_2026.json"
VERSIONES_INVENTARIO = RAIZ / "data/fuentes_versiones/inventarios"
PLAN_OPERATIVO = BANCO / "plan_actualizacion_2026.json"
SOLICITUDES = BANCO / "solicitudes_datos_pendientes_2026.json"
RAICES = (
    BANCO,
    RAIZ / "data/cartografia_fuentes",
    RAIZ / "data/analisis_planes",
    RAIZ / "data/planes_desarrollo",
    RAIZ / "data/planes_accion",
    RAIZ / "data/capas_analiticas",
    RAIZ / "geodatos_cartagena",
    RAIZ / "public/geodatos",
)
IGNORAR = {"__pycache__", ".DS_Store", ".gitkeep"}
EXCLUIR_PREFIJOS = (
    "data/capas_analiticas/cortes/",
    "data/capas_analiticas/derivaciones/",
    "data/capas_analiticas/tablero_operacion_fuentes/",
    "data/planes_desarrollo/cache_",
    "data/planes_desarrollo/checkpoints_",
)
EXCLUIR_MUTABLES = {
    "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json",
    "data/planes_desarrollo/cache_inteligencia_triada_6m.json",
    "data/planes_desarrollo/cache_pdt_ai_evaluator.json",
    "data/planes_desarrollo/estado_sistema_multiagente_pdd.json",
    "data/planes_desarrollo/checkpoints_pdt_ai_evaluator.json",
}
PREFIJO_CAPTURAS = "data/planes_accion/drive_sector_seguridad/versiones/"
RESUMEN_MUTABLE = "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json"
PAQUETES = {
    "banco_local": {
        "prefijo": "data/banco_fuentes_oficiales/",
        "descripcion": "Archivos locales de extracción, revisión y consolidación de indicadores",
        "atribucion": "mixta_pendiente_verificacion",
    },
    "cartografia_recepcion": {
        "prefijo": "data/cartografia_fuentes/",
        "descripcion": "Capas recibidas, versiones curadas y auditorías cartográficas",
        "atribucion": "custodio_y_edicion_pendientes_verificacion",
    },
    "analisis_derivados": {
        "prefijo": "data/analisis_planes/",
        "descripcion": "Informes y gráficas derivados de análisis previos",
        "atribucion": "producto_analitico_no_fuente_independiente",
    },
    "planes_locales": {
        "prefijo": "data/planes_desarrollo/",
        "descripcion": "Documentos y extracciones de planes de desarrollo y acción",
        "atribucion": "edicion_documental_pendiente_verificacion",
    },
    "planes_accion": {
        "prefijo": "data/planes_accion/",
        "descripcion": "Planes de acción recibidos, catálogo Drive y extracciones documentales",
        "atribucion": "custodio_y_edicion_pendientes_verificacion",
    },
    "analitica_canonica": {
        "prefijo": "data/capas_analiticas/",
        "descripcion": "Cortes derivados tipados y manifiestos de calidad",
        "atribucion": "derivado_no_fuente_independiente",
    },
    "geodatos_recepcion": {
        "prefijo": "geodatos_cartagena/",
        "descripcion": "Paquete cartográfico recibido y sus componentes de formato",
        "atribucion": "custodio_y_edicion_pendientes_verificacion",
    },
    "geodatos_publicados": {
        "prefijo": "public/geodatos/",
        "descripcion": "Copias técnicas de geodatos para la interfaz",
        "atribucion": "derivado_no_fuente_independiente",
    },
}


def _paquete(ruta: str) -> str:
    if ruta.startswith("banco_fuentes_oficiales/"):
        return "banco_local"
    return next(clave for clave, ficha in PAQUETES.items() if ruta.startswith(ficha["prefijo"]))


def _indice_drive() -> tuple[dict[str, dict], dict[str, list[dict]], str]:
    ruta = RAIZ / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
    _ruta_sin_enlaces(ruta)
    if not ruta.is_file():
        return {}, {}, ""
    entradas = json.loads(_leer_regular(ruta))
    por_sha: dict[str, list[dict]] = defaultdict(list)
    for entrada in entradas:
        if entrada.get("sha256"):
            por_sha[entrada["sha256"]].append(entrada)
    return {entrada["id"]: entrada for entrada in entradas}, por_sha, _sha256(ruta)


def _evidencia_drive(ruta: str, sha: str, indice: tuple[dict[str, dict], dict[str, list[dict]], str]) -> dict:
    base = "data/planes_accion/drive_sector_seguridad/"
    if not ruta.startswith(base):
        return {}
    por_id, por_sha, catalogo_sha = indice
    nombre = Path(ruta).stem
    if ruta.startswith(base + "archivos/"):
        entrada = por_id.get(nombre)
        if entrada and entrada.get("sha256") != sha:
            raise ValueError(f"SHA del catálogo Drive no coincide: {ruta}")
        relacionadas = [entrada] if entrada else []
        relacion = "original_recibido"
    elif ruta.startswith(base + "archivos_pdf/"):
        relacionadas = por_sha.get(sha, [])
        relacion = "original_pdf_recibido"
    elif ruta.startswith(base + "anydoc_md/"):
        relacionadas = por_sha.get(nombre, [])
        relacion = "transcripcion_de_pdf"
    else:
        return {}
    return {
        "catalogo_ruta": base + "catalogo_drive_1383.json",
        "catalogo_sha256": catalogo_sha,
        "relacion": relacion,
        "drive_file_ids": sorted({entrada["id"] for entrada in relacionadas}),
        "rutas_drive": sorted({entrada["path"] for entrada in relacionadas if entrada.get("path")}),
        "custodio_confirmado": False,
    }


def _sha256(ruta: Path) -> str:
    digest = hashlib.sha256()
    with _abrir_regular(ruta) as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest()


def _ruta_sin_enlaces(ruta: Path) -> Path:
    ruta = ruta if ruta.is_absolute() else Path.cwd() / ruta
    if ".." in ruta.parts:
        raise ValueError(f"Ruta con componente padre no permitida: {ruta}")
    actual = Path(ruta.anchor)
    for parte in ruta.parts[1:]:
        actual /= parte
        if actual.is_symlink():
            raise ValueError(f"Enlace simbólico no permitido: {actual}")
    return ruta


def _abrir_regular(ruta: Path) -> BinaryIO:
    ruta = _ruta_sin_enlaces(ruta)
    if not ruta.is_file():
        raise ValueError(f"No es un archivo regular: {ruta}")
    archivo = os.fdopen(os.open(ruta, os.O_RDONLY | os.O_NOFOLLOW), "rb")
    if not stat.S_ISREG(os.fstat(archivo.fileno()).st_mode):
        archivo.close()
        raise ValueError(f"No es un archivo regular: {ruta}")
    return archivo


def _leer_regular(ruta: Path) -> bytes:
    with _abrir_regular(ruta) as archivo:
        return archivo.read()


def _json_anterior(contenido: bytes) -> dict:
    def unicas(pares):
        resultado = {}
        for clave, valor in pares:
            if clave in resultado:
                raise ValueError(f"Clave JSON duplicada: {clave}")
            resultado[clave] = valor
        return resultado

    def constante_invalida(valor):
        raise ValueError(f"Constante JSON inválida: {valor}")

    try:
        anterior = json.loads(contenido, object_pairs_hook=unicas, parse_constant=constante_invalida)
    except (UnicodeError, ValueError) as exc:
        raise ValueError("Inventario anterior ilegible") from exc
    if not isinstance(anterior, dict) or anterior.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Inventario anterior incompatible")
    return anterior


def _datos_referencia(referencia: dict) -> tuple[Path, str, int]:
    if not isinstance(referencia, dict):
        raise ValueError("Referencia de inventario/captura inválida")
    ruta, sha, cantidad = (referencia.get(k) for k in ("ruta", "sha256", "bytes"))
    if (
        not isinstance(ruta, str)
        or "\\" in ruta
        or PurePosixPath(ruta).is_absolute()
        or PurePosixPath(ruta).as_posix() != ruta
        or ".." in PurePosixPath(ruta).parts
        or not isinstance(sha, str)
        or re.fullmatch(r"[a-f0-9]{64}", sha) is None
        or type(cantidad) is not int
        or cantidad < 0
    ):
        raise ValueError("Ruta, SHA o bytes de referencia inconsistentes")
    return _ruta_sin_enlaces(RAIZ / ruta), sha, cantidad


def _verificar_referencia(referencia: dict) -> None:
    ruta, sha, cantidad = _datos_referencia(referencia)
    contenido = _leer_regular(ruta)
    if hashlib.sha256(contenido).hexdigest() != sha or len(contenido) != cantidad:
        raise ValueError(f"Referencia con SHA/bytes distintos: {ruta}")


def _metadatos_control(anterior: dict, actuales: list[dict]) -> dict:
    """Traslada solo la asociación exacta; ausencia omite, alteración rechaza."""
    captura = anterior.get("captura_control")
    if captura is None:
        if "hallazgo_historico" in anterior:
            raise ValueError("Hallazgo histórico sin captura de control")
        return {}
    if not isinstance(captura, dict):
        raise ValueError("Metadata de captura de control inválida")
    if captura.get(
        "naturaleza", "captura_control_derivado_no_fuente_oficial"
    ) != "captura_control_derivado_no_fuente_oficial" or any(
        campo in captura and captura[campo] is not True
        for campo in ("sin_fuente_oficial", "sin_validacion_semantica", "sin_validacion_censo", "sin_revision_licencia")
    ):
        raise ValueError("La captura de control no acredita fuente oficial ni validación")
    if "ruta" in captura and "ruta_inventariada" in captura and captura["ruta"] != captura["ruta_inventariada"]:
        raise ValueError("Rutas de captura de control inconsistentes")
    archivos = anterior.get("archivos", [])
    if not isinstance(archivos, list) or any(
        not isinstance(a, dict) or not {"ruta", "sha256", "bytes", "rol"} <= a.keys() or not isinstance(a["ruta"], str)
        for a in archivos
    ):
        raise ValueError("Artefactos anteriores de captura inválidos")
    declarada = captura.get("ruta_inventariada", captura.get("ruta"))
    candidatas = [
        a
        for a in archivos
        if a["ruta"].startswith(PREFIJO_CAPTURAS)
        and a["sha256"] == captura.get("sha256")
        and a["bytes"] == captura.get("bytes")
        and (declarada is None or a["ruta"] == declarada)
    ]
    if len(candidatas) != 1:
        raise ValueError("Captura de control sin una asociación previa única de ruta/SHA/bytes")
    previa = candidatas[0]
    _datos_referencia(previa)
    _datos_referencia({"ruta": previa["ruta"], "sha256": captura["sha256"], "bytes": captura["bytes"]})
    if (
        previa["rol"] != "derivado_control"
        or previa.get("evidencia_origen")
        or previa.get("paquete_clave") != "planes_accion"
    ):
        raise ValueError("Captura de control con rol o asociación Drive incompatibles")
    presente = next((a for a in actuales if a["ruta"] == previa["ruta"]), None)
    if presente is None:
        return {}
    if any(presente[k] != previa[k] for k in ("sha256", "bytes")):
        raise ValueError(f"Captura de control alterada: {previa['ruta']}")
    _verificar_referencia(presente)
    origen = captura.get("ruta_origen_213")
    if origen is not None:
        _verificar_referencia({"ruta": origen, "sha256": captura["sha256"], "bytes": captura["bytes"]})
    procedencia = captura.get("procedencia_captura")
    if procedencia is not None:
        if not isinstance(procedencia, dict):
            raise ValueError("Procedencia de captura inválida")
        ref = {
            "ruta": procedencia.get("captura_origen_ruta"),
            "sha256": procedencia.get("captura_origen_sha256"),
            "bytes": procedencia.get("captura_origen_bytes"),
        }
        if ref["sha256"] != captura["sha256"] or ref["bytes"] != captura["bytes"]:
            raise ValueError("Procedencia asociada a otra captura")
        _verificar_referencia(ref)
    conservada = copy.deepcopy(captura)
    conservada["ruta_inventariada"] = previa["ruta"]
    conservada["estado"] = "captura_inventariada_sin_promocion"
    metadatos = {"captura_control": conservada, "version_captura": "polis.fuentes.captura_control.v1"}
    if "hallazgo_historico" in anterior:
        hallazgo = anterior["hallazgo_historico"]
        if not isinstance(hallazgo, dict):
            raise ValueError("Hallazgo histórico inválido")
        original = hallazgo.get("original", {})
        _datos_referencia(original)  # El original no localizado no se lee ni se reconstruye.
        if (
            original["ruta"] != RESUMEN_MUTABLE
            or original.get("estado") != "no_localizado"
            or hallazgo.get("diferencia_semantica") != "no_comprobada"
            or hallazgo.get("sin_contenido_original") is not True
        ):
            raise ValueError("Hallazgo histórico no corresponde a esta captura")
        metadatos["hallazgo_historico"] = copy.deepcopy(hallazgo)
    return metadatos


def _version_existente(ruta: Path, contenido: bytes) -> None:
    ruta = _ruta_sin_enlaces(ruta)
    if ruta.exists() and _leer_regular(ruta) != contenido:
        raise ValueError(f"Instantánea de inventario existente alterada: {ruta}")


def _trazabilidad(artefactos: list[dict]) -> dict:
    salida = _ruta_sin_enlaces(SALIDA)
    if not salida.exists():
        return {}
    contenido = _leer_regular(salida)
    anterior = _json_anterior(contenido)
    if "inventario_anterior" in anterior:
        _verificar_referencia(anterior["inventario_anterior"])
    sha = hashlib.sha256(contenido).hexdigest()
    version = _ruta_sin_enlaces(VERSIONES_INVENTARIO / f"{sha}.json")
    _version_existente(version, contenido)
    return _metadatos_control(anterior, artefactos) | {
        "inventario_anterior": {"ruta": version.relative_to(RAIZ).as_posix(), "sha256": sha, "bytes": len(contenido)}
    }


def _registro_fuentes() -> list[dict]:
    grupos: dict[str, dict] = {}
    _ruta_sin_enlaces(CONSOLIDADO)
    with CONSOLIDADO.open(encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo):
            clave = fila["fuente_clave"]
            grupo = grupos.setdefault(
                clave,
                {
                    "fuente_clave": clave,
                    "custodios": set(),
                    "dataset_ids": set(),
                    "origenes": set(),
                    "indicadores": set(),
                    "unidades": set(),
                    "ambitos": set(),
                    "estados_calidad": set(),
                    "anios": set(),
                    "urls": set(),
                    "fechas_extraccion": set(),
                    "filas": 0,
                    "_filas_version": [],
                },
            )
            for campo, valor in (
                ("custodios", fila["custodio"]),
                ("dataset_ids", fila["dataset_id"]),
                ("origenes", fila["origen"]),
                ("indicadores", fila["indicador"]),
                ("unidades", fila["unidad"]),
                ("ambitos", fila["ambito"]),
                ("estados_calidad", fila["estado_validacion"]),
                ("anios", fila["anio"]),
                ("urls", fila["url_fuente"]),
                ("fechas_extraccion", fila["fecha_extraccion"]),
            ):
                if valor:
                    grupo[campo].add(valor)
            grupo["filas"] += 1
            # Una consulta nueva no crea versión si sus observaciones son idénticas.
            contenido = {campo: valor for campo, valor in fila.items() if campo != "fecha_extraccion"}
            grupo["_filas_version"].append(json.dumps(contenido, ensure_ascii=False, sort_keys=True))
    salida = []
    for grupo in grupos.values():
        filas_version = grupo.pop("_filas_version")
        sha = hashlib.sha256("\n".join(sorted(filas_version)).encode()).hexdigest()
        for clave, valor in list(grupo.items()):
            if isinstance(valor, set):
                grupo[clave] = sorted(valor)
        grupo["sha256_contenido"] = sha
        grupo["version_id"] = sha[:16]
        grupo["ultima_extraccion_utc"] = max(grupo["fechas_extraccion"], default=None)
        grupo["licencia"] = "por_verificar"
        grupo["contrato"] = "observacion_agregada_v1"
        grupo["es_fuente_independiente"] = not any(
            origen in {"icbf_rpc_compilacion", "archivo_usuario_drive"} for origen in grupo["origenes"]
        )
        grupo["estado_promocion"] = "pendiente_validacion"
        salida.append(grupo)
    return sorted(salida, key=lambda fila: fila["fuente_clave"])


def _registro_artefactos() -> list[dict]:
    resultado = []
    indice_drive = _indice_drive()
    for raiz in RAICES:
        _ruta_sin_enlaces(raiz)
        for ruta in sorted(raiz.rglob("*")):
            _ruta_sin_enlaces(ruta)
            if (
                not ruta.is_file()
                or ruta in {SALIDA, PLAN_OPERATIVO, SOLICITUDES}
                or any(parte in IGNORAR for parte in ruta.parts)
            ):
                continue
            relativo = ruta.relative_to(RAIZ).as_posix()
            if raiz == BANCO and BANCO.name != "banco_fuentes_oficiales":
                relativo = relativo.replace(BANCO.name, "banco_fuentes_oficiales", 1)
            if relativo.startswith(EXCLUIR_PREFIJOS) or relativo in EXCLUIR_MUTABLES:
                # Cortes y caches mutables no pueden incluir su propia huella.
                continue
            sha = _sha256(ruta)
            resultado.append(
                {
                    "ruta": relativo,
                    "paquete_clave": _paquete(relativo),
                    "evidencia_origen": _evidencia_drive(relativo, sha, indice_drive),
                    "sha256": sha,
                    "version_id": sha[:16],
                    "bytes": ruta.stat().st_size,
                    "formato": ruta.suffix.lower().lstrip(".") or "sin_extension",
                    "rol": "derivado_control"
                    if relativo.startswith(PREFIJO_CAPTURAS)
                    else "derivado"
                    if (
                        ruta.name.startswith(("indicadores_consolidados", "cache_"))
                        or relativo.startswith(("public/geodatos/", "data/capas_analiticas/"))
                    )
                    else "insumo_o_evidencia",
                    "estado_calidad": "sin_evaluacion_por_artefacto",
                }
            )
    return resultado


def generar() -> dict:
    fuentes = _registro_fuentes()
    artefactos = _registro_artefactos()
    identidades: dict[str, list[str]] = defaultdict(list)
    for fuente in fuentes:
        for custodio in fuente["custodios"]:
            for dataset in fuente["dataset_ids"]:
                identidades[f"{custodio}|{dataset}"].append(fuente["fuente_clave"])
    return {
        "esquema": "polis.inventario_fuentes.v1",
        "generado_utc": datetime.now(UTC).isoformat(),
        "corte_consolidado_sha256": _sha256(CONSOLIDADO),
        "fuentes_clave": len(fuentes),
        "artefactos": len(artefactos),
        "identidades_con_multiples_claves": {
            identidad: claves for identidad, claves in sorted(identidades.items()) if len(set(claves)) > 1
        },
        "regla": (
            "Clave de serie no equivale a fuente independiente; la promoción requiere licencia y control de calidad."
        ),
        "paquetes": PAQUETES,
        "fuentes": fuentes,
        "archivos": artefactos,
    } | _trazabilidad(artefactos)


def escribir_inventario(inventario: dict, salida: Path = SALIDA, versiones: Path = VERSIONES_INVENTARIO) -> Path:
    """Archiva los bytes anteriores y nuevos antes de publicar la vista atómica."""
    salida, versiones = _ruta_sin_enlaces(salida), _ruta_sin_enlaces(versiones)
    if salida.is_relative_to(versiones):
        raise ValueError("La vista mutable no puede estar dentro de versiones")
    if not isinstance(inventario, dict) or inventario.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Inventario nuevo incompatible")
    contenido = (json.dumps(inventario, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    inmutable = versiones / f"{sha}.json"
    anterior = _leer_regular(salida) if salida.exists() else None
    versiones_a_guardar = {inmutable: contenido}
    if anterior is not None:
        datos_anteriores = _json_anterior(anterior)
        if "inventario_anterior" in datos_anteriores:
            _verificar_referencia(datos_anteriores["inventario_anterior"])
        sha_anterior = hashlib.sha256(anterior).hexdigest()
        versiones_a_guardar[versiones / f"{sha_anterior}.json"] = anterior
    if "inventario_anterior" in inventario:
        referencia = inventario["inventario_anterior"]
        ruta_ref, sha_ref, bytes_ref = _datos_referencia(referencia)
        if ruta_ref == salida:
            raise ValueError("Referencia anterior apunta a la vista mutable")
        if contenido != anterior:
            if anterior is None or sha_ref != sha_anterior or bytes_ref != len(anterior):
                raise ValueError("El inventario anterior cambió desde la generación")
        if ruta_ref in versiones_a_guardar:
            datos_ref = versiones_a_guardar[ruta_ref]
            if hashlib.sha256(datos_ref).hexdigest() != sha_ref or len(datos_ref) != bytes_ref:
                raise ValueError("Ruta de versión anterior no corresponde a su SHA/bytes")
        else:
            _verificar_referencia(referencia)
    _metadatos_control(inventario, inventario.get("archivos", []))
    for ruta, datos in versiones_a_guardar.items():
        _version_existente(ruta, datos)
    versiones.mkdir(parents=True, exist_ok=True)
    for ruta, datos in versiones_a_guardar.items():
        temporal = _escribir_temporal(versiones, datos)
        try:
            try:
                os.link(temporal, _ruta_sin_enlaces(ruta), follow_symlinks=False)
            except FileExistsError:
                _version_existente(ruta, datos)
        finally:
            temporal.unlink(missing_ok=True)
    salida.parent.mkdir(parents=True, exist_ok=True)
    temporal = _escribir_temporal(salida.parent, contenido)
    try:
        _ruta_sin_enlaces(salida)
        actual = _leer_regular(salida) if salida.exists() else None
        if actual != anterior:
            raise ValueError("La vista mutable cambió durante la publicación")
        os.replace(temporal, salida)
    finally:
        temporal.unlink(missing_ok=True)
    return inmutable


def _escribir_temporal(directorio: Path, contenido: bytes) -> Path:
    _ruta_sin_enlaces(directorio)
    with tempfile.NamedTemporaryFile(dir=directorio, prefix=".inventario.", delete=False) as archivo:
        temporal = Path(archivo.name)
        try:
            if archivo.write(contenido) != len(contenido):
                raise OSError("Escritura incompleta del inventario")
            archivo.flush()
            os.fsync(archivo.fileno())
        except BaseException:
            temporal.unlink(missing_ok=True)
            raise
    if _leer_regular(temporal) != contenido:
        temporal.unlink(missing_ok=True)
        raise ValueError("Los bytes escritos del inventario no coinciden")
    return temporal


def main() -> None:
    inventario = generar()
    version = escribir_inventario(inventario)
    print(
        f"Inventariadas {inventario['fuentes_clave']} claves y {inventario['artefactos']} artefactos; "
        f"instantánea {version.name}"
    )


if __name__ == "__main__":
    main()
