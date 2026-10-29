"""Expedientes por punto de serie con hashes de observación y límites de publicación."""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.modules.compromisos.paneles_series_7d_polis import (
    PanelSerie7D,
    _intervalo_poisson_conteo,
    _intervalo_poisson_tasa,
)
from app.modules.compromisos.series_7d_polis import RAIZ, RegistroSerie7D, _escribir_inmutable

DESTINO = RAIZ / "data/capas_analiticas/expedientes_serie_7d"


class EvidenciaObservacion7D(BaseModel):
    observacion_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    fila_serie_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    fuente_clave: str
    version_fuente_sha256: str
    fuente_url: str | None
    valor_original: str
    unidad_original: str
    numerador: str | None
    denominador: dict[str, Any] | None
    advertencias: list[str]


class ExpedientePunto7D(BaseModel):
    esquema: Literal["polis.expediente_punto_7d.v2"] = "polis.expediente_punto_7d.v2"
    afirmacion_id: str = Field(pattern=r"^[0-9a-f]{64}$")
    panel_id: str
    anio: int
    medida: str
    valor: str | None
    unidad: str
    intervalo_inferior: str | None
    intervalo_superior: str | None
    incertidumbre: str
    estado_punto: str
    comparabilidad_con_anterior: str
    estado_revision: Literal["documentado_no_publicable", "provisional", "repetido", "contradiccion"]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    series_7d_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    paneles_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    denominador_serie_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    evidencias: list[EvidenciaObservacion7D] = Field(min_length=1)
    advertencia_inferencia: str = "Punto descriptivo; no demuestra efecto causal de un plan."


def _sha(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _cargar_series(
    ruta: Path,
) -> tuple[dict[str, list[RegistroSerie7D]], dict[str, list[str]], dict[str, Any]]:
    sha = _sha(ruta)
    manifiesto = json.loads(ruta.with_suffix(".manifest.json").read_text(encoding="utf-8"))
    if (
        ruta.stem != sha
        or manifiesto.get("salida_sha256") != sha
        or manifiesto.get("estado_publicacion") != "no_publicable"
    ):
        raise ValueError("SHA o manifiesto de serie 7D incompatible")
    filas: dict[str, list[RegistroSerie7D]] = defaultdict(list)
    hashes: dict[str, list[str]] = defaultdict(list)
    for linea in ruta.read_bytes().splitlines():
        if not linea:
            continue
        fila = RegistroSerie7D.model_validate_json(linea)
        filas[fila.observacion_sha256].append(fila)
        hashes[fila.observacion_sha256].append(hashlib.sha256(linea).hexdigest())
    if sum(len(grupo) for grupo in filas.values()) != manifiesto["filas"]:
        raise ValueError("Cantidad de filas de serie discrepante")
    return filas, hashes, manifiesto


def materializar_expedientes(series: Path, paneles: Path, destino: Path = DESTINO) -> dict[str, Any]:
    """Materializa expedientes inmutables; exige la misma versión de serie en cada panel."""
    filas, hashes, manifiesto_serie = _cargar_series(series)
    sha_paneles = _sha(paneles)
    paquete = json.loads(paneles.read_text(encoding="utf-8"))
    if (
        paneles.stem != sha_paneles
        or paquete.get("esquema") not in {"polis.paneles_series_7d.v1", "polis.paneles_series_7d.v2"}
        or paquete.get("estado_publicacion") != "no_publicable"
        or paquete.get("series_7d_sha256") != manifiesto_serie["salida_sha256"]
    ):
        raise ValueError("Paneles de un corte distinto o alterados")
    if paquete["conteos"]["paneles"] != len(paquete["paneles"]):
        raise ValueError("Conteo de paneles discrepante")
    expedientes: list[ExpedientePunto7D] = []
    estados: Counter[str] = Counter()
    for payload in paquete["paneles"]:
        panel = PanelSerie7D.model_validate(payload)
        for punto in panel.puntos:
            evidencias = []
            ocurrencias: Counter[str] = Counter()
            for observacion_sha in punto.observaciones_sha256:
                indice = ocurrencias[observacion_sha]
                ocurrencias[observacion_sha] += 1
                grupo = filas.get(observacion_sha, [])
                if indice >= len(grupo):
                    raise ValueError("Punto sin observación en la serie congelada")
                fila = grupo[indice]
                if (
                    fila.fuente_clave != panel.fuente_clave
                    or fila.version_fuente_sha256 != panel.version_fuente_sha256
                    or fila.indicador != panel.indicador
                    or fila.subtipo != panel.subtipo
                    or fila.dimension != panel.dimension
                    or fila.anio != punto.anio
                    or fila.territorio_id != panel.territorio_id
                    or fila.ambito_original != panel.ambito_original
                    or fila.tipo_fecha != panel.tipo_fecha
                    or (fila.unidad_original if panel.medida == "valor_original" else "por 100.000 habitantes")
                    != panel.unidad
                    or (fila.valor_original if panel.medida == "valor_original" else fila.tasa_por_100000)
                    not in punto.valores_reportados
                ):
                    raise ValueError("Punto y observación no pertenecen al mismo universo")
                if panel.medida == "tasa_por_100000" and (fila.denominador is None or fila.numerador is None):
                    raise ValueError("Tasa sin numerador y denominador verificables")
                evidencias.append(
                    EvidenciaObservacion7D(
                        observacion_sha256=observacion_sha,
                        fila_serie_sha256=hashes[observacion_sha][indice],
                        fuente_clave=fila.fuente_clave,
                        version_fuente_sha256=fila.version_fuente_sha256,
                        fuente_url=fila.fuente_url,
                        valor_original=str(fila.valor_original),
                        unidad_original=fila.unidad_original,
                        numerador=str(fila.numerador) if fila.numerador is not None else None,
                        denominador=fila.denominador.model_dump(mode="json") if fila.denominador else None,
                        advertencias=fila.advertencias,
                    )
                )
            if punto.estado == "valores_contradictorios":
                revision = "contradiccion"
            elif punto.provisional:
                revision = "provisional"
            elif punto.estado == "duplicado_identico":
                revision = "repetido"
            else:
                revision = "documentado_no_publicable"
            if (punto.valor is None) != (revision == "contradiccion"):
                raise ValueError("Valor del punto incompatible con su estado")
            intervalo_esperado = (
                (
                    _intervalo_poisson_tasa(filas[punto.observaciones_sha256[0]][0])
                    if panel.medida == "tasa_por_100000"
                    else _intervalo_poisson_conteo(filas[punto.observaciones_sha256[0]][0])
                )
                if paquete["esquema"] == "polis.paneles_series_7d.v2" and len(punto.observaciones_sha256) == 1
                else None
            )
            if intervalo_esperado is None:
                if punto.intervalo_inferior is not None or punto.intervalo_superior is not None:
                    raise ValueError("Intervalo de panel sin base verificable")
                if punto.incertidumbre != "intervalo_no_disponible_en_corte":
                    raise ValueError("Método de incertidumbre incompatible con la serie")
            elif (
                punto.intervalo_inferior,
                punto.intervalo_superior,
            ) != intervalo_esperado or punto.incertidumbre != (
                "poisson_exacto_95_condicional_al_registro"
                if panel.medida == "tasa_por_100000"
                else "poisson_exacto_95_conteo_hechos_registrados"
            ):
                raise ValueError("Intervalo de panel discrepante con numerador y denominador")
            claim_key = f"{sha_paneles}|{panel.panel_id}|{punto.anio}"
            expediente = ExpedientePunto7D(
                afirmacion_id=hashlib.sha256(claim_key.encode()).hexdigest(),
                panel_id=panel.panel_id,
                anio=punto.anio,
                medida=panel.medida,
                valor=str(punto.valor) if punto.valor is not None else None,
                unidad=panel.unidad,
                intervalo_inferior=str(punto.intervalo_inferior) if punto.intervalo_inferior is not None else None,
                intervalo_superior=str(punto.intervalo_superior) if punto.intervalo_superior is not None else None,
                incertidumbre=punto.incertidumbre,
                estado_punto=punto.estado,
                comparabilidad_con_anterior=punto.comparabilidad_con_anterior,
                estado_revision=revision,
                series_7d_sha256=manifiesto_serie["salida_sha256"],
                paneles_sha256=sha_paneles,
                denominador_serie_sha256=manifiesto_serie["denominador_sha256"],
                evidencias=evidencias,
            )
            expedientes.append(expediente)
            estados[revision] += 1
    if len(expedientes) != paquete["conteos"]["puntos"]:
        raise ValueError("Cantidad de puntos de panel discrepante")
    lineas = [json.dumps(item.model_dump(mode="json"), ensure_ascii=False, sort_keys=True) for item in expedientes]
    contenido = ("\n".join(lineas) + "\n").encode()
    salida_sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    _escribir_inmutable(destino / f"{salida_sha}.jsonl", contenido)
    salida = {
        "esquema": "polis.expedientes_serie_7d.v2",
        "salida_sha256": salida_sha,
        "series_7d_sha256": manifiesto_serie["salida_sha256"],
        "paneles_sha256": sha_paneles,
        "expedientes": len(expedientes),
        "estados_revision": dict(sorted(estados.items())),
        "estado_publicacion": "no_publicable",
        "limite": "Expedientes descriptivos por punto; no acreditan causalidad ni dictámenes de planes.",
    }
    manifiesto_bytes = (json.dumps(salida, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    _escribir_inmutable(destino / f"{salida_sha}.manifest.json", manifiesto_bytes)
    return salida
