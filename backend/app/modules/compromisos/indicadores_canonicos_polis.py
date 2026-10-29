"""Tasas municipales con denominador DANE de la vigencia censal aplicable."""

from __future__ import annotations

import csv
from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel

from app.modules.compromisos.contratos_observacion_polis import ObservacionAgregada, UnidadObservacion

RAIZ = Path(__file__).resolve().parents[4]
SERIE = RAIZ / "data/banco_fuentes_oficiales/poblacion_cartagena_serie_vigencia_censal_2012_2026.csv"


class DenominadorMunicipal(BaseModel):
    anio: int
    codigo_dane: str
    poblacion: int
    base_censal: str
    fuente_archivo: str
    referencia: str


class TasaMunicipal(BaseModel):
    fuente_clave: str
    version_sha256: str
    indicador: str
    anio: int
    numerador: Decimal
    unidad_numerador: str
    ambito_original: str
    subtipo: str | None
    denominador: DenominadorMunicipal
    valor_por_100000: Decimal
    provisional: bool
    advertencias: list[str]


def cargar_denominadores() -> dict[int, DenominadorMunicipal]:
    por_anio: dict[int, dict[str, dict[str, str]]] = {}
    with SERIE.open(encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo):
            if fila["codigo_dane"] != "13001" or fila["apto_como_denominador_municipal"] != "si":
                raise ValueError("La serie demográfica contiene una fila no apta para Cartagena")
            por_anio.setdefault(int(fila["anio"]), {})[fila["indicador"]] = fila
    resultado = {}
    for anio, partes in por_anio.items():
        if set(partes) != {"poblacion_total", "poblacion_cabecera", "poblacion_centros_rural"}:
            raise ValueError(f"Desglose demográfico incompleto en {anio}")
        total = partes["poblacion_total"]
        poblacion = int(total["personas"])
        if poblacion <= 0 or poblacion != sum(
            int(partes[c]["personas"]) for c in ("poblacion_cabecera", "poblacion_centros_rural")
        ):
            raise ValueError(f"Total demográfico no cierra en {anio}")
        base_esperada = "Censo General 2005" if anio <= 2017 else "CNPV 2018"
        if total["base_censal"] != base_esperada or any(
            fila["base_censal"] != base_esperada for fila in partes.values()
        ):
            raise ValueError(f"Base censal incorrecta en {anio}")
        resultado[anio] = DenominadorMunicipal(
            anio=anio,
            codigo_dane="13001",
            poblacion=poblacion,
            base_censal=base_esperada,
            fuente_archivo=total["fuente_archivo"],
            referencia=total["referencia"],
        )
    return resultado


def calcular_tasa_municipal(obs: ObservacionAgregada, denominadores: dict[int, DenominadorMunicipal]) -> TasaMunicipal:
    if obs.territorio_id != "13001" or obs.ambito_original not in {
        "municipio_13001",
        "municipio_hecho_cartagena",
        "municipio_o_subtipo",
    }:
        raise ValueError("Se requiere numerador municipal; no se imputa población a UCG o barrio")
    if obs.unidad_observacion not in {UnidadObservacion.HECHO, UnidadObservacion.PERSONA}:
        raise ValueError("La tasa requiere conteo de hechos o personas, no procesos, oferta ni porcentajes")
    if obs.fuente_clave.startswith("dane_poblacion_"):
        raise ValueError("La población DANE es denominador, no numerador de una tasa de eventos")
    if obs.fuente_clave == "icbf_rpc_cartagena":
        raise ValueError("El indicador ICBF requiere denominador etario; no sirve la población municipal total")
    if obs.valor < 0 or obs.anio not in denominadores:
        raise ValueError("Numerador o denominador no disponible")
    den = denominadores[obs.anio]
    advertencias = []
    if obs.provisional:
        advertencias.append("Numerador parcial; tasa acumulada no comparable con año completo")
    if obs.anio == 2018:
        advertencias.append("Cambio de base censal respecto de 2017")
    return TasaMunicipal(
        fuente_clave=obs.fuente_clave,
        version_sha256=obs.version_sha256,
        indicador=obs.indicador,
        anio=obs.anio,
        numerador=obs.valor,
        unidad_numerador=obs.unidad_original,
        ambito_original=obs.ambito_original,
        subtipo=obs.subtipo,
        denominador=den,
        valor_por_100000=obs.valor * Decimal(100000) / Decimal(den.poblacion),
        provisional=obs.provisional,
        advertencias=advertencias,
    )


def tasas_comparables(primera: TasaMunicipal, segunda: TasaMunicipal) -> bool:
    return (
        primera.fuente_clave == segunda.fuente_clave
        and primera.version_sha256 == segunda.version_sha256
        and primera.indicador == segunda.indicador
        and primera.unidad_numerador == segunda.unidad_numerador
        and primera.ambito_original == segunda.ambito_original
        and primera.subtipo == segunda.subtipo
        and primera.denominador.base_censal == segunda.denominador.base_censal
        and not primera.provisional
        and not segunda.provisional
    )
