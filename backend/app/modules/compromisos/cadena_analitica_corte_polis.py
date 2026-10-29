"""Reproduce serie, panel y expedientes 7D bajo un único corte de fuentes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from pydantic import BaseModel, Field

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.expedientes_serie_7d_polis import materializar_expedientes
from app.modules.compromisos.lector_serie_corte_polis import verificar_serie_del_corte
from app.modules.compromisos.paneles_series_7d_polis import materializar_paneles
from app.modules.compromisos.series_7d_polis import RAIZ, _escribir_inmutable


class CadenaAnaliticaCorte(BaseModel):
    esquema: str = "polis.cadena_analitica_corte.v1"
    run_id: str
    corte_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    inventario_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    serie_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    paneles_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    expedientes_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    filas_serie: int = Field(ge=0)
    fuentes: int = Field(ge=0)
    paneles: int = Field(ge=0)
    expedientes: int = Field(ge=0)
    estado_publicacion: str


def _sha(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _ruta_inventario(fila: dict) -> Path:
    registrada = Path(fila["ruta"])
    return (registrada if registrada.is_absolute() else RAIZ / registrada).resolve()


def _exigir_inventariado(archivos: list[dict], ruta: Path) -> None:
    encontrados = [fila for fila in archivos if _ruta_inventario(fila) == ruta.resolve()]
    if len(encontrados) != 1 or encontrados[0]["sha256"] != _sha(ruta):
        raise ValueError(f"Artefacto ausente o alterado en inventario del corte: {ruta.name}")


def verificar_cadena_analitica(
    corte: ContextoCorte, inventario: Path, serie: Path, paneles: Path, expedientes: Path
) -> CadenaAnaliticaCorte:
    """Verifica pertenencia al corte y reproduce byte a byte los dos derivados."""
    resumen_serie = verificar_serie_del_corte(corte, inventario, serie)
    datos = json.loads(inventario.read_text(encoding="utf-8"))
    for ruta in (
        serie,
        serie.with_suffix(".manifest.json"),
        paneles,
        expedientes,
        expedientes.with_suffix(".manifest.json"),
    ):
        _exigir_inventariado(datos["archivos"], ruta)
    with TemporaryDirectory(prefix="polis-cadena-7d-") as temporal:
        base = Path(temporal)
        referencia_paneles = materializar_paneles(serie, base / "paneles")
        if _sha(paneles) != referencia_paneles["sha256"] or paneles.stem != referencia_paneles["sha256"]:
            raise ValueError("Los paneles no se reproducen desde la serie del corte")
        referencia_expedientes = materializar_expedientes(serie, paneles, base / "expedientes")
        if (
            _sha(expedientes) != referencia_expedientes["salida_sha256"]
            or expedientes.stem != referencia_expedientes["salida_sha256"]
            or json.loads(expedientes.with_suffix(".manifest.json").read_text(encoding="utf-8"))
            != referencia_expedientes
        ):
            raise ValueError("Los expedientes no se reproducen desde la serie y los paneles del corte")
    return CadenaAnaliticaCorte(
        run_id=str(corte.run_id),
        corte_sha256=corte.sha256,
        inventario_sha256=_sha(inventario),
        serie_sha256=resumen_serie.serie_sha256,
        paneles_sha256=referencia_paneles["sha256"],
        expedientes_sha256=referencia_expedientes["salida_sha256"],
        filas_serie=resumen_serie.filas,
        fuentes=len(resumen_serie.fuentes),
        paneles=referencia_paneles["conteos"]["paneles"],
        expedientes=referencia_expedientes["expedientes"],
        estado_publicacion=resumen_serie.estado_publicacion,
    )


def escribir_recibo_cadena(resultado: CadenaAnaliticaCorte, destino: Path) -> Path:
    """Guarda una referencia inmutable por run_id, fuera del inventario autocontenido."""
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{resultado.run_id}.json"
    contenido = (
        json.dumps(resultado.model_dump(mode="json"), ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode()
    _escribir_inmutable(ruta, contenido)
    return ruta
