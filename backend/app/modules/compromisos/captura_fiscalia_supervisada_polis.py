"""Reutiliza el extractor público de Fiscalía en una copia aislada del banco.

El extractor adaptado descubre la cantidad de puntos y espera las cinco filas
del ranking. No accede a API V2 ni inicia sesión; depende de la interfaz pública.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[4]


async def capturar_fiscalia_supervisada(carpeta: Path) -> dict:
    """Ejecuta solo copias de los dos insumos revisados, con timeout y trazabilidad."""
    if not carpeta.resolve().is_relative_to((RAIZ / "bridge").resolve()):
        raise ValueError("La captura supervisada solo escribe bajo bridge/")
    origen = RAIZ / "data/banco_fuentes_oficiales"
    insumos = {
        "capturar_fiscalia_supervisada.mjs": RAIZ / "backend/scripts/capturar_fiscalia_supervisada.mjs",
        "fiscalia_cartagena.manifest.json": origen / "fiscalia_cartagena.manifest.json",
    }
    hashes = {}
    for nombre, ruta in insumos.items():
        contenido = ruta.read_bytes()
        hashes[nombre] = hashlib.sha256(contenido).hexdigest()
        with (carpeta / nombre).open("xb") as archivo:
            archivo.write(contenido)
    proceso = await asyncio.create_subprocess_exec(
        "node",
        str(carpeta / "capturar_fiscalia_supervisada.mjs"),
        cwd=RAIZ,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proceso.communicate(), timeout=240)
    except TimeoutError as exc:
        proceso.kill()
        await proceso.communicate()
        raise ValueError("Tiempo de captura de Fiscalía agotado") from exc
    for nombre, contenido in (("ejecucion.stdout.txt", stdout), ("ejecucion.stderr.txt", stderr)):
        with (carpeta / nombre).open("xb") as archivo:
            archivo.write(contenido)
    if proceso.returncode:
        raise ValueError(f"Extractor supervisado de Fiscalía falló: exit{proceso.returncode}; ver stderr")
    metadata = json.loads((carpeta / "fiscalia_powerbi_cartagena.manifest.json").read_text())
    artefactos = []
    for nombre in (
        "fiscalia_spoa_cartagena_procesos_por_anio.csv",
        "fiscalia_spoa_top5_municipios.csv",
        "fiscalia_powerbi_cartagena.manifest.json",
    ):
        contenido = (carpeta / nombre).read_bytes()
        artefactos.append({"archivo": nombre, "sha256": hashlib.sha256(contenido).hexdigest(), "bytes": len(contenido)})
    return {
        "metodo": "navegador_publico_supervisado",
        "corte_fuente": metadata["cutoff"],
        "filas_resultado": metadata["annual_rows"],
        "artefactos": artefactos,
        "insumos_copiados_sha256": hashes,
        "advertencia": "procesos no equivalen a delitos ocurridos, personas únicas ni condenas",
        "limite": "extracción por etiquetas accesibles; cambios de interfaz requieren nueva revisión",
    }
