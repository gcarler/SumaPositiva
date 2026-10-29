"""Publicación local con precondiciones; staging físico antes de tocar datos activos."""

import argparse
import hashlib
import importlib.util
import json
import os
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "bridge/217_evidencia_revision_inventario"
PREVIO = "5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c"
CANDIDATO_SHA = "ec1b06f4f255791561308ade00bf4dd7b60b1d3856d1d0ce5fe3f6d5ef5b2823"
VISTA = Path("data/banco_fuentes_oficiales/inventario_pipeline_2026.json")


def digest(datos):
    return hashlib.sha256(datos).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("modo", choices=("staging", "publicar"))
    parser.add_argument("--sha-generador", required=True)
    args = parser.parse_args()
    fuente = ROOT / "scripts/inventariar_fuentes_polis.py"
    assert digest(fuente.read_bytes()) == args.sha_generador, "El generador cambió"
    datos = (OUT / "candidato_publicacion.json").read_bytes()
    assert digest(datos) == CANDIDATO_SHA, "Candidato distinto al revisado"
    candidato = json.loads(datos)
    anteriores = (ROOT / VISTA).read_bytes()
    assert digest(anteriores) == PREVIO, "La vista activa cambió; no sustituir"
    entrada = next(a for a in candidato["archivos"] if a["rol"] == "derivado_control")
    captura = candidato["captura_control"]
    original_captura = ROOT / captura["ruta_origen_213"]
    crudo = original_captura.read_bytes()
    assert digest(crudo) == entrada["sha256"] and len(crudo) == entrada["bytes"]
    assert (ROOT / candidato["hallazgo_historico"]["original"]["ruta"]).read_bytes() == crudo
    registro = OUT / f"publicacion_{args.modo}.json"
    assert not registro.exists(), "No sobrescribir evidencia de una ejecución previa"
    spec = importlib.util.spec_from_file_location("inventario_controlado_217", fuente)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    if args.modo == "staging":
        raiz = OUT / "staging_publicacion_fisica"
        raiz.mkdir(exist_ok=False)
        vista = raiz / VISTA
        vista.parent.mkdir(parents=True)
        vista.write_bytes(anteriores)
        copia_captura = raiz / captura["ruta_origen_213"]
        copia_captura.parent.mkdir(parents=True)
        copia_captura.write_bytes(crudo)
        modulo.RAIZ = raiz
    else:
        # Staging propio ya debe haber demostrado ambas instantáneas byte a byte.
        comprobado = json.loads((OUT / "publicacion_staging.json").read_bytes())
        assert comprobado["candidato_sha256"] == CANDIDATO_SHA
        assert comprobado["generador_sha256"] == args.sha_generador
        assert comprobado["vista_y_version_nueva_identicas"]
        raiz = ROOT
        vista = ROOT / VISTA
    destino_captura = raiz / entrada["ruta"]
    modulo._ruta_sin_enlaces(destino_captura)
    if destino_captura.exists():
        assert modulo._leer_regular(destino_captura) == crudo, "Captura existente distinta"
    else:
        destino_captura.parent.mkdir(parents=True, exist_ok=True)
        temporal = modulo._escribir_temporal(destino_captura.parent, crudo)
        try:
            os.link(temporal, destino_captura, follow_symlinks=False)
        finally:
            temporal.unlink(missing_ok=True)
    if args.modo == "publicar":
        comprobacion_previa = modulo.generar()
        assert comprobacion_previa["fuentes"] == candidato["fuentes"]
        assert comprobacion_previa["paquetes"] == candidato["paquetes"]
        assert {a["ruta"]: a for a in comprobacion_previa["archivos"]} == {
            a["ruta"]: a for a in candidato["archivos"]
        }, "Los insumos cambiaron respecto al candidato comprobado"
    versiones = raiz / "data/fuentes_versiones/inventarios"
    inmutable = modulo.escribir_inventario(candidato, vista, versiones)
    assert vista.read_bytes() == datos == inmutable.read_bytes()
    assert (versiones / f"{PREVIO}.json").read_bytes() == anteriores
    assert digest(fuente.read_bytes()) == args.sha_generador
    if args.modo == "staging":
        assert modulo.escribir_inventario(candidato, vista, versiones) == inmutable
    else:
        # Lectura del generador real posterior: no publica otra versión.
        regenerado = modulo.generar()
        assert regenerado["fuentes"] == candidato["fuentes"]
        assert regenerado["paquetes"] == candidato["paquetes"]
        assert {a["ruta"]: a for a in regenerado["archivos"]} == {
            a["ruta"]: a for a in candidato["archivos"]
        }
        assert regenerado["hallazgo_historico"] == candidato["hallazgo_historico"]
        assert regenerado["inventario_anterior"]["sha256"] == CANDIDATO_SHA
    resultado = {
        "fecha_utc": datetime.now(UTC).isoformat(), "modo": args.modo,
        "generador_sha256": args.sha_generador, "candidato_sha256": CANDIDATO_SHA,
        "anterior_sha256": PREVIO, "anterior_preservado_bytes_exactos": True,
        "vista_y_version_nueva_identicas": True,
        "captura_sha256": digest(crudo), "captura_bytes": len(crudo),
        "fuentes_clave": candidato["fuentes_clave"], "artefactos": candidato["artefactos"],
        "hallazgo_no_localizado_conservado": True, "sin_sql": True,
        "publicacion_local_activa": args.modo == "publicar",
    }
    with registro.open("x") as archivo:
        json.dump(resultado, archivo, ensure_ascii=False, indent=2)
        archivo.write("\n")
    print(json.dumps(resultado, ensure_ascii=False))


if __name__ == "__main__":
    main()
