"""Captura los nueve anexos del portal policial con hashes y originales intactos.

Uso: python adquirir_policia_portal.py --destino policia_portal/capturas/ID
Las rutas relativas se resuelven desde este banco; nunca usa PostgreSQL.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from html import unescape
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urljoin, urlsplit

import requests

BASE = Path(__file__).resolve().parent
RAIZ = BASE.parents[1]
PORTAL = "https://www.policia.gov.co/estadistica-delictiva"
HOST = "www.policia.gov.co"
MAX_DESCARGA = 512 * 1024 * 1024
MAX_DESCOMPRIMIDO = 3 * 1024**3
HEADERS = {
    "User-Agent": "POLIS-FuentesOficiales/1.0",
    "Referer": PORTAL,
    "Accept": "*/*",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def guardar(path: Path, data: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def url_oficial(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != HOST or parsed.username:
        raise ValueError("Destino fuera del portal oficial permitido")
    return url


def abrir(url: str) -> requests.Response:
    for _ in range(4):
        response = requests.get(
            url_oficial(url),
            headers=HEADERS,
            stream=True,
            timeout=(20, 120),
            allow_redirects=False,
        )
        if response.status_code in {301, 302, 303, 307, 308}:
            url = url_oficial(urljoin(url, response.headers["Location"]))
            response.close()
            continue
        response.raise_for_status()
        return response
    raise ValueError("Demasiadas redirecciones")


def validar_zip(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if len(infos) > 2000 or sum(i.file_size for i in infos) > MAX_DESCOMPRIMIDO:
            raise ValueError("Contenedor excede límites declarados")
        names = set()
        for member in infos:
            name = member.filename
            if (
                name in names
                or member.flag_bits & 1
                or "\\" in name
                or PurePosixPath(name).is_absolute()
                or ".." in PurePosixPath(name).parts
                or stat.S_ISLNK(member.external_attr >> 16)
            ):
                raise ValueError("Miembro ZIP inseguro o duplicado")
            names.add(name)
        if archive.testzip() is not None:
            raise ValueError("Fallo CRC en anexo")
        if path.suffix == ".xlsx":
            if not {"[Content_Types].xml", "xl/workbook.xml"}.issubset(names):
                raise ValueError("El anexo no es un XLSX")
        elif not any(name.lower().endswith(".xlsx") for name in names):
            raise ValueError("El ZIP no contiene XLSX")
        return [
            {"nombre": i.filename, "bytes": i.file_size, "crc32": f"{i.CRC:08x}"}
            for i in infos
        ]


def descargar(item: dict, destination: Path) -> dict:
    path = destination / item["archivo"]
    temporary = path.with_suffix(path.suffix + ".part")
    start = time.monotonic()
    for attempt in range(1, 4):
        try:
            with abrir(item["url"]) as response, temporary.open("wb") as output:
                total = 0
                for block in response.iter_content(1024 * 1024):
                    total += len(block)
                    if total > MAX_DESCARGA:
                        raise ValueError("El anexo excede 512 MiB")
                    output.write(block)
                declared = response.headers.get("Content-Length")
                if declared and int(declared) != total:
                    raise ValueError("La longitud recibida no coincide")
                if not zipfile.is_zipfile(temporary):
                    raise ValueError(
                        "Respuesta no ZIP/XLSX; no aceptar HTML como datos"
                    )
                headers = {
                    key: response.headers.get(key)
                    for key in [
                        "Content-Type",
                        "Content-Length",
                        "ETag",
                        "Last-Modified",
                        "Date",
                    ]
                }
                effective = response.url
            temporary.replace(path)
            members = validar_zip(path)
            result = {
                **item,
                "estado": "capturado",
                "url_efectiva": effective,
                "extraido_utc": datetime.now(UTC).isoformat(),
                "bytes": total,
                "sha256": sha256(path),
                "cabeceras_http": headers,
                "miembros": members,
                "crc_verificado": True,
                "intentos": attempt,
                "segundos": round(time.monotonic() - start, 3),
            }
            path.chmod(0o600)
            print(
                json.dumps(
                    {k: result[k] for k in ["clave", "estado", "bytes", "sha256"]}
                ),
                flush=True,
            )
            return result
        except (
            requests.RequestException,
            OSError,
            ValueError,
            zipfile.BadZipFile,
        ) as error:
            temporary.unlink(missing_ok=True)
            if attempt == 3:
                return {
                    **item,
                    "estado": "error",
                    "tipo_error": type(error).__name__,
                    "detalle": str(error),
                }
            time.sleep(attempt)
    raise AssertionError("Estado inalcanzable")


def catalogar(html: str) -> list[dict]:
    links = []
    for href in re.findall(r"href=[\"']([^\"']+)", html):
        url = urljoin(PORTAL, unescape(href))
        if "/sites/default/files/" not in url:
            continue
        name = unquote(urlsplit(url).path.rsplit("/", 1)[-1]).upper()
        if "DELICTIVO" in name and "ULTIMO_MES" in name:
            key, year = "cuadros_ultimo_mes", None
        elif "DELICTIVO" in name and "2020_2026" in name:
            key, year = "cuadros_mensuales_2020_2026", None
        elif "NIVEL_DE_REGISTRO" in name:
            match = re.search(r"20(?:20|21|22|23|24|25|26)", name)
            if not match:
                continue
            year = int(match.group())
            key = f"registros_{year}"
        else:
            continue
        extension = Path(name).suffix.lower()
        if extension not in {".zip", ".xlsx"}:
            raise ValueError("Extensión de anexo no admitida")
        item = {
            "clave": key,
            "anio": year,
            "url": url_oficial(url),
            "archivo": key + extension,
        }
        if item not in links:
            links.append(item)
    expected = {
        "cuadros_ultimo_mes",
        "cuadros_mensuales_2020_2026",
        *(f"registros_{y}" for y in range(2020, 2027)),
    }
    if {item["clave"] for item in links} != expected or len(links) != 9:
        raise ValueError("El catálogo del portal cambió; revisar antes de descargar")
    return links


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destino", type=Path, required=True)
    args = parser.parse_args()
    destination = args.destino if args.destino.is_absolute() else BASE / args.destino
    destination.mkdir(parents=True, exist_ok=False)
    destination.chmod(0o700)
    inputs = [
        BASE / "catalogo.csv",
        BASE / "cartagena_seguridad_humana.sqlite",
        BASE / "indicadores_consolidados_cartagena_2026.csv",
        BASE / "indicadores_consolidados_cartagena_2026.manifest.json",
        BASE / "inventario_pipeline_2026.json",
        RAIZ
        / "data/cartografia_fuentes/drive_pshc_insumos/C.S_DELICTIVO_MENSUAL_ANUAL_2020_2026.zip",
        RAIZ
        / "data/cartografia_fuentes/drive_pshc_insumos/policia_cartagena_delitos_anuales_2020_2026.csv",
        *sorted((BASE / "extracciones").glob("policia_*.json")),
    ]
    guardar(
        destination / "entradas_previas.json",
        {
            "utc": datetime.now(UTC).isoformat(),
            "archivos": {str(p.relative_to(RAIZ)): sha256(p) for p in inputs},
        },
    )
    with abrir(PORTAL) as response:
        html = response.content
    (destination / "portal.html").write_bytes(html)
    links = catalogar(html.decode("utf-8"))
    manifest = {
        "esquema": "polis.policia_portal.captura.v1",
        "portal": PORTAL,
        "captura_utc": datetime.now(UTC).isoformat(),
        "portal_sha256": hashlib.sha256(html).hexdigest(),
        "archivos": [],
        "estado": "en_proceso",
        "workers": 3,
        "limites": {
            "bytes_anexo": MAX_DESCARGA,
            "bytes_descomprimidos": MAX_DESCOMPRIMIDO,
        },
        "regla": "Original oficial conservado; ningún agregado se suma entre publicaciones ni a Datos Abiertos.",
    }
    guardar(destination / "manifest.json", manifest)
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(descargar, item, destination) for item in links]
        for future in as_completed(futures):
            manifest["archivos"].append(future.result())
            guardar(destination / "manifest.json", manifest)
    manifest["archivos"].sort(key=lambda item: item["clave"])
    manifest["estado"] = (
        "completa"
        if all(i["estado"] == "capturado" for i in manifest["archivos"])
        else "parcial"
    )
    guardar(destination / "manifest.json", manifest)
    print(
        json.dumps(
            {
                "destino": str(destination),
                "estado": manifest["estado"],
                "anexos": len(manifest["archivos"]),
            }
        ),
        flush=True,
    )
    if manifest["estado"] != "completa":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
