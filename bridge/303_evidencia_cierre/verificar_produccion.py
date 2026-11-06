"""Comprobación HTTP de una release de POLIS. Solo GET/HEAD, sin credenciales."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://seguridadhumanaintegral.org"
MAX_BYTES = 12 * 1024 * 1024


def obtener(ruta: str, revision: str, metodo: str = "GET"):
    separador = "&" if "?" in ruta else "?"
    url = BASE + ruta + separador + urlencode({"cierre303": revision})
    try:
        with urlopen(
            Request(
                url,
                method=metodo,
                headers={"Cache-Control": "no-cache", "User-Agent": "POLIS-cierre-303"},
            ),
            timeout=20,
        ) as respuesta:
            cuerpo = respuesta.read(MAX_BYTES + 1) if metodo == "GET" else b""
            if len(cuerpo) > MAX_BYTES:
                raise ValueError("Respuesta excede el límite de comprobación")
            return respuesta.status, dict(respuesta.headers), cuerpo
    except HTTPError as error:
        return error.code, dict(error.headers), b""


def verificar(raiz: Path, build_id: str, commit: str, salida: Path):
    pruebas = []
    revision = datetime.now(UTC).isoformat()
    evidencia = {
        "inicio_utc": revision,
        "base_url": BASE,
        "metodos": ["GET", "HEAD"],
        "credenciales": False,
        "build_id_esperado": build_id,
        "commit_codigo_esperado": commit,
        "pruebas": pruebas,
        "errores": [],
    }
    paginas = {}
    for ruta in [
        "/",
        "/indicadores",
        "/marco-legal",
        "/trazabilidad",
        "/geovisor",
        "/plataforma",
        "/contacto",
        "/api/v1/health/live",
        "/api/v1/health/ready",
        "/api/v1/indicadores/catalogo",
    ]:
        estado, headers, cuerpo = obtener(ruta, revision)
        prueba = {
            "ruta": ruta,
            "http": estado,
            "bytes": len(cuerpo),
            "sha256": hashlib.sha256(cuerpo).hexdigest(),
        }
        pruebas.append(prueba)
        if estado != 200:
            evidencia["errores"].append(f"{ruta}: HTTP {estado}")
        if ruta in {"/", "/marco-legal", "/trazabilidad"}:
            paginas[ruta] = cuerpo.decode("utf-8", errors="replace")
        if ruta == "/api/v1/indicadores/catalogo" and estado == 200:
            fichas = json.loads(cuerpo)["indicadores"]
            prueba["fichas"] = len(fichas)
            prueba["licencias_cc_by_sa"] = sum(
                f["licencia"].startswith("CC-BY-SA-4.0") for f in fichas
            )
            assert len(fichas) == 29 and prueba["licencias_cc_by_sa"] == 10
            assert all(f["estado"] == "no_publicable" for f in fichas)
            assert any(f["codigo"] == "SALUD_005" for f in fichas)
        if ruta == "/marco-legal":
            csp = headers.get("Content-Security-Policy") or headers.get(
                "content-security-policy", ""
            )
            prueba["csp"] = csp
            assert "https://accounts.google.com/gsi/style" in csp
            assert "'unsafe-eval'" not in csp
            assert "Decreto Nacional 0037 de 2026" in paginas[ruta]
            assert "Decreto Distrital 037 de 2026" not in paginas[ruta]
        if ruta == "/trazabilidad":
            assert "propone cinco fases de trabajo" in paginas[ruta]
            assert "Decreto Distrital 037" not in paginas[ruta]
    assert "Datos" in paginas["/"]
    estado, _, cuerpo = obtener("/release-polis.json", revision)
    version = json.loads(cuerpo) if estado == 200 else {}
    pruebas.append({"ruta": "/release-polis.json", "http": estado, "version": version})
    assert (
        estado == 200
        and version["build_id"] == build_id
        and version["commit_codigo"] == commit
    )
    urls = list(
        dict.fromkeys(
            re.findall(r'(?:src|href)="([^\"]*?/_next/static/[^\"]+)"', paginas["/"])
        )
    )
    assert urls
    for url in urls[:3]:
        assert url.startswith("/_next/")
        estado, _, cuerpo = obtener(url.replace("&amp;", "&"), revision)
        pruebas.append({"ruta": url, "http": estado, "bytes": len(cuerpo)})
        assert estado == 200 and cuerpo
    for nombre in [
        "ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf",
        "PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf",
        "MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf",
        "GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf",
    ]:
        estado, _, cuerpo = obtener("/docs/" + nombre, revision)
        esperado = hashlib.sha256(
            (raiz / "public/docs" / nombre).read_bytes()
        ).hexdigest()
        real = hashlib.sha256(cuerpo).hexdigest()
        pruebas.append(
            {
                "ruta": "/docs/" + nombre,
                "http": estado,
                "sha256": real,
                "sha256_esperado": esperado,
            }
        )
        assert estado == 200 and real == esperado
    for ruta in ["/.env", "/.env.local"]:
        estado, _, _ = obtener(ruta, revision, "HEAD")
        pruebas.append(
            {"ruta": ruta, "metodo": "HEAD", "http": estado, "cuerpo_leido": False}
        )
        assert estado in {403, 404}
    assert not evidencia["errores"]
    evidencia["fin_utc"] = datetime.now(UTC).isoformat()
    evidencia["estado"] = "verificado"
    salida.write_text(json.dumps(evidencia, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {
                "estado": evidencia["estado"],
                "comprobaciones": len(pruebas),
                "build_id": build_id,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raiz", type=Path, required=True)
    parser.add_argument("--build-id", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--salida", type=Path, required=True)
    args = parser.parse_args()
    verificar(args.raiz, args.build_id, args.commit, args.salida)
