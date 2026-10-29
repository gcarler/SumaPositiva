"""Captura pública y versionada de metadatos Socrata sin acreditar custodia automáticamente."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import httpx

from app.modules.compromisos.series_7d_polis import RAIZ, _escribir_inmutable

DESTINO = RAIZ / "data/banco_fuentes_oficiales/metadatos_socrata"
PATRON_ID = re.compile(r"^[a-z0-9]{4}-[a-z0-9]{4}$")
URL_BASE = "https://www.datos.gov.co/api/views"
ATRIBUCIONES_ESPERADAS = {
    "medicina_": ("medicina legal", "ciencias forenses"),
    "policia_": ("policia", "dijin", "mindefensa", "defensa nacional"),
    "icbf_": ("icbf", "bienestar familiar"),
    "ideam_": ("ideam", "hidrologia"),
    "ins_": ("instituto nacional de salud", "ins"),
    "procuraduria_": ("procuraduria",),
}


def _normalizar(texto: str) -> str:
    return "".join(
        caracter for caracter in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(caracter)
    )


def _alertas_atribucion(claves: list[str], atribucion: str | None) -> list[str]:
    texto = _normalizar(atribucion or "")
    alertas = []
    for clave in claves:
        esperados = next(
            (tokens for prefijo, tokens in ATRIBUCIONES_ESPERADAS.items() if clave.startswith(prefijo)), None
        )
        if esperados and not any(token in texto for token in esperados):
            alertas.append(f"ATRIBUCION_NO_COINCIDE:{clave}")
    return alertas


def fuentes_socrata(inventario: dict[str, Any]) -> dict[str, list[str]]:
    """Conserva las claves internas; un dataset no se confunde con una entidad."""
    resultado: dict[str, list[str]] = defaultdict(list)
    for fuente in inventario["fuentes"]:
        for dataset_id in fuente["dataset_ids"]:
            if PATRON_ID.fullmatch(dataset_id):
                resultado[dataset_id].append(fuente["fuente_clave"])
    return {dataset_id: sorted(claves) for dataset_id, claves in sorted(resultado.items())}


async def consultar_metadata(cliente: httpx.AsyncClient, dataset_id: str) -> bytes:
    if not PATRON_ID.fullmatch(dataset_id):
        raise ValueError("ID Socrata inválido")
    url = f"{URL_BASE}/{dataset_id}.json"
    for intento in range(3):
        respuesta = await cliente.get(url)
        if respuesta.status_code in {429, 500, 502, 503, 504} and intento < 2:
            await asyncio.sleep(0.25 * 2**intento)
            continue
        respuesta.raise_for_status()
        paquete = respuesta.json()
        if not isinstance(paquete, dict) or paquete.get("id") != dataset_id:
            raise ValueError(f"Metadatos con identidad ajena al dataset {dataset_id}")
        return respuesta.content
    raise RuntimeError("Reintentos Socrata agotados")


def ficha_metadata(dataset_id: str, contenido: bytes, claves: list[str]) -> dict[str, Any]:
    paquete = json.loads(contenido)
    if paquete.get("id") != dataset_id:
        raise ValueError("ID de dataset discrepante")
    licencia = paquete.get("license") if isinstance(paquete.get("license"), dict) else {}
    propietario = paquete.get("owner") if isinstance(paquete.get("owner"), dict) else {}
    return {
        "dataset_id": dataset_id,
        "url_metadata": f"{URL_BASE}/{dataset_id}.json",
        "url_ficha": f"https://www.datos.gov.co/d/{dataset_id}",
        "fuentes_clave": claves,
        "sha256_respuesta": hashlib.sha256(contenido).hexdigest(),
        "nombre_publicado": paquete.get("name"),
        "atribucion_publicada": paquete.get("attribution"),
        "alertas_atribucion": _alertas_atribucion(claves, paquete.get("attribution")),
        "propietario_portal": propietario.get("displayName"),
        "licencia_publicada": licencia.get("name"),
        "terminos_licencia_url": licencia.get("termsLink"),
        "estado_publicacion_portal": paquete.get("publicationStage"),
        "filas_actualizadas_unix": paquete.get("rowsUpdatedAt"),
        "fecha_publicacion_unix": paquete.get("publicationDate"),
        "estado_acreditacion": "PENDIENTE_COTEJO_CUSTODIO_LICENCIA_Y_VERSION",
    }


async def capturar_metadatos(
    inventario: dict[str, Any], destino: Path = DESTINO, *, cliente: httpx.AsyncClient | None = None
) -> dict[str, Any]:
    """Captura todos los ID públicos con concurrencia acotada y conserva fallos visibles."""
    ids = fuentes_socrata(inventario)
    semaforo = asyncio.Semaphore(4)
    propio = cliente is None
    if cliente is None:
        cliente = httpx.AsyncClient(timeout=20, follow_redirects=False)
    fichas: list[dict[str, Any]] = []
    errores: list[dict[str, str]] = []

    async def uno(dataset_id: str, claves: list[str]) -> None:
        async with semaforo:
            try:
                contenido = await consultar_metadata(cliente, dataset_id)
                ficha = ficha_metadata(dataset_id, contenido, claves)
                ruta = destino / "respuestas" / dataset_id / f"{ficha['sha256_respuesta']}.json"
                ruta.parent.mkdir(parents=True, exist_ok=True)
                _escribir_inmutable(ruta, contenido)
                ficha["ruta_respuesta"] = ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta)
                fichas.append(ficha)
            except (httpx.HTTPError, ValueError, OSError, json.JSONDecodeError) as exc:
                errores.append({"dataset_id": dataset_id, "error": type(exc).__name__, "detalle": str(exc)[:200]})

    try:
        await asyncio.gather(*(uno(dataset_id, claves) for dataset_id, claves in ids.items()))
    finally:
        if propio:
            await cliente.aclose()
    resultado = {
        "esquema": "polis.metadatos_socrata.v1",
        "inventario_fuentes_sha256": hashlib.sha256(
            json.dumps(inventario["fuentes"], ensure_ascii=False, sort_keys=True).encode()
        ).hexdigest(),
        "datasets_esperados": len(ids),
        "datasets_capturados": len(fichas),
        "licencias_declaradas": sum(bool(ficha["licencia_publicada"]) for ficha in fichas),
        "datasets_con_alerta_atribucion": sum(bool(ficha["alertas_atribucion"]) for ficha in fichas),
        "estado": "CAPTURA_COMPLETA_PENDIENTE_ACREDITACION" if not errores else "CAPTURA_PARCIAL",
        "fichas": sorted(fichas, key=lambda ficha: ficha["dataset_id"]),
        "errores": sorted(errores, key=lambda error: error["dataset_id"]),
        "regla": "Metadato del portal; exige cotejar custodio, licencia de derivados y comparabilidad.",
    }
    contenido = (json.dumps(resultado, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{hashlib.sha256(contenido).hexdigest()}.json"
    _escribir_inmutable(ruta, contenido)
    return {**resultado, "ruta": str(ruta)}
