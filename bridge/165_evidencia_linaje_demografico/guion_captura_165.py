"""Captura acotada FB-DEMO-LINAJE-01 (alcance 164): solo lectura pública HTTPS de dos
páginas DANE. No descarga lotes, PDF ni hojas de datos; no sigue hosts externos.
Sin credenciales, sin SQL, sin cambios de aplicación.

Uso:  python3 guion_captura_165.py
Salida: manifiesto.json + originales/*.html (bytes tal cual recibidos).
"""

from __future__ import annotations

import hashlib
import json
import ssl
import time
import urllib.error
import urllib.request
from datetime import datetime, UTC
from pathlib import Path

BASE = Path(__file__).resolve().parent
ORIGINALES = BASE / "originales"
ORIGINALES.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 8 * 1024 * 1024
TIMEOUT = 20

DESTINOS = {
    "proyecciones_poblacion": (
        "https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion",
        "proyecciones_de_poblacion.html",
    ),
    "censo_general_2005": (
        "https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/censo-general-2005-1",
        "censo_general_2005_1.html",
    ),
}
HOST_DANE = "www.dane.gov.co"


def capturar(nombre: str, url: str, archivo: str) -> dict:
    intentos = 0
    ultimo_error = None
    while intentos <= 1:  # un reintento solo para fallo transitorio de red
        intentos += 1
        try:
            peticion = urllib.request.Request(url, headers={"User-Agent": "POLIS-evidencia-165 (evidencia primaria; sin credenciales)"})
            with urllib.request.urlopen(peticion, timeout=TIMEOUT, context=ssl.create_default_context()) as respuesta:
                bytes_html = respuesta.read(MAX_BYTES + 1)
                if len(bytes_html) > MAX_BYTES:
                    raise ValueError(f"{url} excede {MAX_BYTES} bytes")
                cabeceras = dict(respuesta.headers.items())
                final_url = respuesta.geturl()
                codigo = respuesta.status
                tipo_contenido = respuesta.headers.get_content_type()
                charseconsola = respuesta.headers.get_content_charset() or "desconocido"
            registro = {
                "clave": nombre,
                "url_solicitada": url,
                "url_final": final_url,
                "codigo_http": codigo,
                "redirigido": final_url.rstrip("/") != url.rstrip("/"),
                "momento_utc": datetime.now(UTC).isoformat(),
                "bytes": len(bytes_html),
                "sha256": hashlib.sha256(bytes_html).hexdigest(),
                "content_type": tipo_contenido,
                "charset": charseconsola,
                "cabeceras": cabeceras,
                "intentos": intentos,
            }
            (ORIGINALES / archivo).write_bytes(bytes_html)
            return registro
        except (urllib.error.URLError, TimeoutError, ConnectionError, ssl.SSLError) as error:
            ultimo_error = error
            time.sleep(2)  # espera breve entre reintentos transitorios
    return {
        "clave": nombre,
        "url_solicitada": url,
        "error_reproduccion": str(ultimo_error),
        "intentos": intentos,
    }


def main() -> None:
    registros = {}
    for nombre, (url, archivo) in sorted(DESTINOS.items()):
        registros[nombre] = capturar(nombre, url, archivo)

    manifiesto = {
        "tarea": "FB-DEMO-LINAJE-01",
        "objetivo": "evidencia primaria de páginas oficiales DANE sobre proyecciones y censo 2005; sin descarga de lotes/PDF/hojas",
        "host_permitido": HOST_DANE,
        "limite_bytes": MAX_BYTES,
        "timeout_segundos": TIMEOUT,
        "reintentos": 1,
        "sin_credenciales": True,
        "sin_sql": True,
        "sin_red": False,  # HTTPS público acotado autorizado por 164
        "sin_banco": True,
        "registros": registros,
        "generado_utc": datetime.now(UTC).isoformat(),
    }
    (BASE / "manifiesto.json").write_text(json.dumps(manifiesto, indent=2, ensure_ascii=False) + "\n")
    for nombre, registro in registros.items():
        if "error_reproduccion" in registro:
            print(f"ERROR {nombre}: {registro['error_reproduccion']}")
        else:
            print(f"OK {nombre}: HTTP {registro['codigo_http']} {registro['bytes']} bytes sha {registro['sha256'][:16]} final={registro['url_final']}")


if __name__ == "__main__":
    main()
