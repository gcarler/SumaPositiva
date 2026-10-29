"""Lee una serie 7D solo si sus fuentes pertenecen al corte congelado."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from pydantic import BaseModel, Field

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.series_7d_polis import RegistroSerie7D


class ResumenLecturaSerieCorte(BaseModel):
    run_id: str
    serie_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    filas: int = Field(ge=0)
    fuentes: dict[str, int]
    estado_publicacion: str


def _sha(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def verificar_serie_del_corte(contexto: ContextoCorte, inventario: Path, serie: Path) -> ResumenLecturaSerieCorte:
    """Rechaza artefactos íntegros pero derivados de versiones ajenas al run_id."""
    corte = contexto.verificar()
    if _sha(inventario) != corte.inventario_sha256:
        raise ValueError("Inventario distinto al fijado por el corte")
    datos = json.loads(inventario.read_text(encoding="utf-8"))
    if datos.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Esquema de inventario desconocido")
    versiones = {version.fuente_clave: version.sha256_contenido for version in corte.versiones}
    inventariadas = {fuente["fuente_clave"]: fuente["sha256_contenido"] for fuente in datos["fuentes"]}
    if versiones != inventariadas or len(versiones) != len(datos["fuentes"]):
        raise ValueError("Versiones de fuente distintas entre corte e inventario")
    sha_serie = _sha(serie)
    if serie.stem != sha_serie:
        raise ValueError("Nombre o contenido de serie alterado")
    archivos = [archivo for archivo in datos["archivos"] if archivo["sha256"] == sha_serie]
    if len(archivos) != 1 or Path(archivos[0]["ruta"]).name != serie.name:
        raise ValueError("La serie no está registrada en el inventario del corte")
    manifiesto = json.loads(serie.with_suffix(".manifest.json").read_text(encoding="utf-8"))
    if manifiesto.get("esquema") != "polis.series_7d.v1" or manifiesto.get("salida_sha256") != sha_serie:
        raise ValueError("Manifiesto de serie incompatible")
    conteos: Counter[str] = Counter()
    for linea in serie.read_bytes().splitlines():
        if not linea:
            continue
        fila = RegistroSerie7D.model_validate_json(linea)
        if versiones.get(fila.fuente_clave) != fila.version_fuente_sha256:
            raise ValueError(f"Versión de fuente ajena al corte: {fila.fuente_clave}")
        conteos[fila.fuente_clave] += 1
    if sum(conteos.values()) != manifiesto.get("filas"):
        raise ValueError("Cantidad de filas de la serie discrepante")
    return ResumenLecturaSerieCorte(
        run_id=str(corte.run_id),
        serie_sha256=sha_serie,
        filas=sum(conteos.values()),
        fuentes=dict(sorted(conteos.items())),
        estado_publicacion=corte.estado_publicacion,
    )
