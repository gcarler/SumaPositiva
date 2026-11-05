"""Prepara copias congeladas y candidato 213 sin tocar banco ni app."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
INVENTARIO_ACTIVO = RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
RESUMEN_ACTIVO = RAIZ / "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def iso(ns: int) -> str:
    return datetime.fromtimestamp(ns / 1e9, timezone.utc).isoformat()


def crear(path: Path, datos: bytes) -> Path:
    if path.exists() or path.is_symlink():
        raise ValueError(f"Destino ya existe: {path}")
    with path.open("xb") as archivo:
        archivo.write(datos)
        archivo.flush()
        os.fsync(archivo.fileno())
    return path


def main() -> None:
    inv_bytes = INVENTARIO_ACTIVO.read_bytes()
    res_bytes = RESUMEN_ACTIVO.read_bytes()
    inv_sha = hashlib.sha256(inv_bytes).hexdigest()
    res_sha = hashlib.sha256(res_bytes).hexdigest()
    inv = json.loads(inv_bytes)
    res = json.loads(res_bytes)
    fecha_captura = datetime.now(timezone.utc).isoformat()
    copias = {
        "inventario": crear(
            BASE / f"inventario_pipeline_2026.sha-{inv_sha}.json", inv_bytes
        ).relative_to(BASE).as_posix(),
        "resumen": crear(
            BASE / f"resumen_sincronizacion.sha-{res_sha}.json", res_bytes
        ).relative_to(BASE).as_posix(),
    }
    fuente_ruta = "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json"
    indice = next(i for i, a in enumerate(inv["archivos"]) if a["ruta"] == fuente_ruta)
    futura_ruta = (
        "data/planes_accion/drive_sector_seguridad/versiones/2026-10-26/"
        f"resumen_sincronizacion.{res_sha}.json"
    )
    candidato = deepcopy(inv)
    candidato["archivos"][indice] = {
        "ruta": futura_ruta,
        "paquete_clave": "planes_accion",
        "evidencia_origen": {},
        "sha256": res_sha,
        "version_id": res_sha[:16],
        "bytes": len(res_bytes),
        "formato": "json",
        "rol": "derivado",
        "estado_calidad": "sin_evaluacion_por_artefacto",
    }
    if (
        sum(1 for a in candidato["archivos"] if a["ruta"] == futura_ruta) != 1
        or any(a["ruta"] == fuente_ruta for a in candidato["archivos"])
    ):
        raise ValueError("Candidato no tiene un unico artefacto de captura futura")
    candidato_bytes = (
        json.dumps(candidato, ensure_ascii=False, indent=2) + "\n"
    ).encode()
    candidato_sha = hashlib.sha256(candidato_bytes).hexdigest()
    crear(BASE / f"candidato_inventario_20261026T{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}.sha-{candidato_sha}.json", candidato_bytes)
    manifiesto = {
        "tarea": "OL-FUENTES-SHA-02",
        "captura_utc": fecha_captura,
        "inventario_activo": {
            "ruta": INVENTARIO_ACTIVO.relative_to(RAIZ).as_posix(),
            "sha256": inv_sha,
            "bytes": len(inv_bytes),
            "mtime_ns": INVENTARIO_ACTIVO.stat().st_mtime_ns,
            "mtime_utc": iso(INVENTARIO_ACTIVO.stat().st_mtime_ns),
            "copia_local": copias["inventario"],
            "sha_copia": sha(BASE / copias["inventario"]),
        },
        "resumen_activo": {
            "ruta": RESUMEN_ACTIVO.relative_to(RAIZ).as_posix(),
            "sha256": res_sha,
            "bytes": len(res_bytes),
            "mtime_ns": RESUMEN_ACTIVO.stat().st_mtime_ns,
            "mtime_utc": iso(RESUMEN_ACTIVO.stat().st_mtime_ns),
            "copia_local": copias["resumen"],
            "sha_copia": sha(BASE / copias["resumen"]),
        },
        "candidato": {
            "ruta_futura": futura_ruta,
            "sha256": res_sha,
            "bytes": len(res_bytes),
            "indice_sustituido": indice,
            "fuentes": len(candidato["fuentes"]),
            "paquetes": len(candidato["paquetes"]),
            "archivos": len(candidato["archivos"]),
            "sha_candidato": candidato_sha,
            "cargable_ahora": False,
            "razon": "ruta futura aun no existe",
        },
        "original_historico": {
            "sha256_esperado": "a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a",
            "bytes_esperados": 51693,
            "estado": "no_localizado",
            "diferencia_semantica": "no_comprobada",
        },
        "sin_red": True,
        "sin_sql": True,
        "sin_pytest": True,
        "sin_commit": True,
        "sin_push": True,
    }
    manifiesto_path = crear(BASE / "manifiesto_captura.json", (json.dumps(manifiesto, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode())
    print(manifiesto_path)


if __name__ == "__main__":
    main()
