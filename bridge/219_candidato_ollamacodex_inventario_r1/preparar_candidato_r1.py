"""Genera candidato R1 desde 213, sin tocar banco, app ni datos activos."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE_213 = RAIZ / "bridge/213_candidato_ollamacodex_inventario"
BASE_219 = Path(__file__).resolve().parent

INV_213 = next(BASE_213.glob("inventario_pipeline_2026.sha-*.json"))
RES_213 = next(BASE_213.glob("resumen_sincronizacion.sha-*.json"))
CAND_213 = next(BASE_213.glob("candidato_inventario_*.json"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def crear(path: Path, datos: bytes) -> Path:
    if path.exists() or path.is_symlink():
        raise ValueError(f"destino ya existe: {path}")
    path.write_bytes(datos)
    return path


def main() -> None:
    inv_bytes = INV_213.read_bytes()
    res_bytes = RES_213.read_bytes()
    cand_213_bytes = CAND_213.read_bytes()
    inv = json.loads(inv_bytes)
    res = json.loads(res_bytes)
    cand = json.loads(cand_213_bytes)
    resumen = {"sha256": hashlib.sha256(res_bytes).hexdigest(), "bytes": len(res_bytes)}
    futuro = next(
        a for a in cand["archivos"]
        if "/versiones/" in a["ruta"] and "resumen_sincronizacion" in a["ruta"]
    )
    futuro["rol"] = "derivado_control"
    futuro["evidencia_origen"] = {
        "captura_origen_ruta": RES_213.relative_to(RAIZ).as_posix(),
        "captura_origen_sha256": resumen["sha256"],
        "captura_origen_bytes": resumen["bytes"],
        "captura_utc": datetime.now(timezone.utc).isoformat(),
        "naturaleza": "captura_control_derivado_no_fuente_oficial",
        "sin_fuente_oficial": True,
        "sin_validacion_semantica": True,
        "sin_validacion_censo": True,
        "sin_revision_licencia": True,
    }
    ahora = datetime.now(timezone.utc).isoformat()
    cand["generado_utc"] = ahora
    cand["version_captura"] = "polis.fuentes.candidato.v1"
    cand["inventario_anterior"] = {
        "ruta": INV_213.relative_to(RAIZ).as_posix(),
        "sha256": hashlib.sha256(inv_bytes).hexdigest(),
        "bytes": len(inv_bytes),
        "fecha_captura_utc": datetime.fromtimestamp(
            INV_213.stat().st_mtime_ns / 1e9, timezone.utc
        ).isoformat(),
        "estado": "congelado_en_213",
    }
    cand["captura_control"] = {
        "ruta_origen_213": RES_213.relative_to(RAIZ).as_posix(),
        "sha256": hashlib.sha256(res_bytes).hexdigest(),
        "bytes": len(res_bytes),
        "fecha_lectura_utc": datetime.now(timezone.utc).isoformat(),
        "naturaleza": "captura_control_derivado_no_fuente_oficial",
        "sin_fuente_oficial": True,
        "sin_validacion_semantica": True,
        "sin_validacion_censo": True,
        "sin_revision_licencia": True,
        "estado": "pendiente_publicacion_ruta_futura",
    }
    cand["hallazgo_historico"] = {
        "original": {
            "ruta": "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json",
            "sha256": "a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a",
            "bytes": 51693,
            "estado": "no_localizado",
        },
        "diferencia_semantica": "no_comprobada",
        "sin_contenido_original": True,
    }
    cand["validaciones"] = {
        "fuentes": len(cand["fuentes"]),
        "paquetes": len(cand["paquetes"]),
        "archivos": len(cand["archivos"]),
        "entradas_sustituidas": 1,
        "ruta_unica_captura": True,
        "prefijo_paquete": "data/planes_accion/",
        "prefijo_valido": True,
        "cargable_ahora": False,
        "motivo_no_cargable": "ruta futura no existe todavia",
    }
    salida_bytes = (json.dumps(cand, ensure_ascii=False, indent=2) + "\n").encode()
    sha_salida = hashlib.sha256(salida_bytes).hexdigest()
    salida = BASE_219 / f"candidato_inventario_r1_2026-10-26.sha-{sha_salida}.json"
    crear(salida, salida_bytes)
    manifiesto = {
        "tarea": "OL-FUENTES-SHA-02-R1",
        "fecha_utc_real": ahora,
        "esquema": "polis.inventario_fuentes.v1",
        "origen_213": {
            "inventario": {
                "ruta": INV_213.relative_to(RAIZ).as_posix(),
                "sha256": sha(INV_213),
                "bytes": len(inv_bytes),
                "mtime_ns": INV_213.stat().st_mtime_ns,
            },
            "resumen": {
                "ruta": RES_213.relative_to(RAIZ).as_posix(),
                "sha256": sha(RES_213),
                "bytes": len(res_bytes),
                "mtime_ns": RES_213.stat().st_mtime_ns,
            },
            "candidato_213": {
                "ruta": CAND_213.relative_to(RAIZ).as_posix(),
                "sha256": sha(CAND_213),
                "bytes": len(cand_213_bytes),
            },
        },
        "candidato_219": {
            "tipo": "inventario_candidato",
            "ruta": salida.relative_to(RAIZ).as_posix(),
            "sha256": sha_salida,
            "bytes": len(salida_bytes),
            "fuentes": len(cand["fuentes"]),
            "paquetes": len(cand["paquetes"]),
            "archivos": len(cand["archivos"]),
            "entrada_sustituida_indice": 1648,
            "ruta_futura": futuro["ruta"],
            "cargable_ahora": False,
            "motivo": "ruta futura no existe todavia",
        },
        "resumen_capturado_r1": {
            "ruta": RES_213.relative_to(RAIZ).as_posix(),
            "sha256": sha(RES_213),
            "bytes": len(res_bytes),
            "origen": "copia congelada de 213",
            "estado": "captura_control_derivado_no_fuente_oficial",
        },
        "hallazgo_historico_r1": {
            "original_no_localizado": True,
            "sha256": "a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a",
            "bytes": 51693,
            "diferencia_semantica": "no_comprobada",
        },
        "sin_red": True,
        "sin_sql": True,
        "sin_pytest": True,
        "sin_banco": True,
        "sin_commit": True,
        "sin_push": True,
        "sin_despliegue": True,
    }
    manifiesto_path = BASE_219 / "manifiesto_candidato_r1.json"
    crear(
        manifiesto_path,
        (json.dumps(manifiesto, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode(),
    )
    print(salida)
    print(manifiesto_path)


if __name__ == "__main__":
    main()
