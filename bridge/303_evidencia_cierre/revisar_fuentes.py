"""Auditoría documental reproducible: lee el banco y metadatos oficiales, sin ingesta."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

MAX_BYTES = 2 * 1024 * 1024


def capturar(url: str, destino: Path) -> dict:
    inicio = datetime.now(UTC).isoformat()
    try:
        with urlopen(Request(url, headers={"User-Agent": "POLIS-revision-fuentes/303"}), timeout=25) as respuesta:
            contenido = respuesta.read(MAX_BYTES + 1)
            if len(contenido) > MAX_BYTES:
                raise ValueError("Límite de captura excedido")
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(contenido)
            try:
                metadata = json.loads(contenido)
            except (json.JSONDecodeError, UnicodeDecodeError):
                metadata = {}
            return {
                "url": url, "consultado_utc": inicio, "http": respuesta.status,
                "url_final": respuesta.url, "bytes": len(contenido),
                "sha256": hashlib.sha256(contenido).hexdigest(),
                "nombre": metadata.get("name"), "licenseId": metadata.get("licenseId"),
                "license": metadata.get("license"), "attribution": metadata.get("attribution"),
                "attributionLink": metadata.get("attributionLink"),
                "rowsUpdatedAt": metadata.get("rowsUpdatedAt"),
            }
    except (OSError, ValueError, HTTPError) as error:
        return {"url": url, "consultado_utc": inicio, "http": getattr(error, "code", None),
                "error": type(error).__name__, "estado": "no_acreditado_por_esta_captura"}


def revisar(raiz: Path, salida: Path, capturas: Path) -> None:
    banco = raiz / "data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite"
    antes = hashlib.sha256(banco.read_bytes()).hexdigest()
    with sqlite3.connect(f"file:{banco}?mode=ro", uri=True) as conexion:
        conexion.row_factory = sqlite3.Row
        fuentes = [dict(fila) for fila in conexion.execute(
            "SELECT clave,dataset_id,titulo,entidad,pagina,consulta,estado,primer_anio,ultimo_anio,"
            "extraido_utc,sha256 FROM fuentes ORDER BY clave"
        )]
    urls = {f"socrata_{f['dataset_id']}": f"https://www.datos.gov.co/api/views/{f['dataset_id']}.json"
            for f in fuentes if re.fullmatch(r"[a-z0-9]{4}-[a-z0-9]{4}", f["dataset_id"] or "")}
    urls["dane_politica_uso"] = "https://www.dane.gov.co/index.php/servicios-al-ciudadano/tramites/ayudas-de-navegabilidad/politica-de-uso"
    with ThreadPoolExecutor(max_workers=4) as pool:
        futuros = {clave: pool.submit(capturar, url, capturas / f"{clave}.bin") for clave, url in urls.items()}
        consultas = {clave: futuro.result() for clave, futuro in futuros.items()}
    with (raiz / "data/capas_analiticas/catalogo_indicadores/catalogo.csv").open(newline="") as archivo:
        fichas = list(csv.DictReader(archivo))
    por_fuente = {f["clave"]: f for f in fuentes}
    matriz = []
    for ficha in fichas:
        fuente = por_fuente.get(ficha["fuente"])
        captura = consultas.get(f"socrata_{fuente['dataset_id']}") if fuente else None
        pendientes = ["aprobacion_metodologica_y_responsable", "criterios_de_publicacion_por_producto"]
        if ficha["tier"] == "C":
            pendientes += ["fuente_operativa", "numerador_y_denominador", "metodo_y_universo_territorial"]
        if not captura or not captura.get("licenseId"):
            pendientes.append("condiciones_de_reutilizacion_especificas_del_producto")
        if ficha["tipo_territorio_fuente"] in {"municipal", "cabecera"}:
            pendientes.append("no_desagregar_a_barrios_sin_evidencia")
        observacion = None
        if ficha["codigo"] in {"PERS_006", "SALUD_005"}:
            if ficha["codigo"] == "PERS_006":
                pendientes.append("revisar_clasificacion_SALUD_alimentacion_conservando_trazabilidad_del_codigo_legacy")
            observacion = "PAE: ubicación del plantel no equivale a residencia de beneficiarios; no fabricar cobertura por barrio."
        matriz.append({
            "codigo": ficha["codigo"], "nombre": ficha["nombre"], "dimension": ficha["dimension"],
            "tier": ficha["tier"], "estado_catalogo": ficha["estado"],
            "fuente": ficha["fuente"], "fuente_localizada": bool(fuente),
            "url_producto": ficha["url_fuente"], "unidad": ficha["unidad"],
            "numerador": ficha["numerador"], "denominador": ficha["denominador"],
            "tipo_territorio_fuente": ficha["tipo_territorio_fuente"],
            "tipo_periodo": ficha["tipo_periodo"], "licencia_catalogo": ficha["licencia"],
            "metadatos_licencia": captura, "criterios_pendientes": pendientes,
            "observacion": observacion, "promovido_a_publicable": False,
        })
    despues = hashlib.sha256(banco.read_bytes()).hexdigest()
    if antes != despues:
        raise RuntimeError("El banco original cambió durante la lectura")
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps({
        "encargo": 303, "generado_utc": datetime.now(UTC).isoformat(),
        "alcance": "29 fichas y 28 fuentes del banco SQLite; no inventario universal de fuentes de POLIS",
        "banco_sha256_antes": antes, "banco_sha256_despues": despues,
        "fuentes": fuentes, "consultas_oficiales": consultas, "indicadores": matriz,
        "limite": "Una licencia en metadatos no acredita calidad, método, vigencia o autorización institucional de una ficha. Las condiciones DANE se contrastan por producto y no se heredan a datos de terceros. No se escriben datos ni estados en la plataforma."
    }, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"fuentes": len(fuentes), "indicadores": len(matriz),
        "consultas": len(consultas), "http_200": sum(c.get("http") == 200 for c in consultas.values()),
        "licencias_declaradas": sum(bool(c.get("licenseId")) for c in consultas.values()),
        "banco_intacto": antes == despues, "salida": str(salida)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raiz", type=Path, required=True)
    parser.add_argument("--salida", type=Path, required=True)
    parser.add_argument("--capturas", type=Path, required=True, help="Directorio privado para respuestas originales")
    args = parser.parse_args()
    revisar(args.raiz.resolve(), args.salida, args.capturas)
