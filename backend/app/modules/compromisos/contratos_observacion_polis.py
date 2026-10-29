"""Contrato canónico de observaciones agregadas; conserva la unidad original.

Este módulo clasifica estructura y comparabilidad. No atribuye oficialidad,
identidad de casos ni causalidad a las cifras recibidas.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.modules.compromisos.taxonomia_7d_polis import Clasificacion7D, clasificar


class UnidadObservacion(StrEnum):
    HECHO = "hecho"
    PERSONA = "persona"
    PROCESO = "proceso"
    EVENTO = "evento"
    OFERTA = "oferta"
    MEDICION = "medicion"
    TASA = "tasa"
    INDICE = "indice"
    DINERO = "dinero"
    SUPERFICIE = "superficie"
    SOLICITUD = "solicitud"
    DESCONOCIDA = "desconocida"


UNIDADES: dict[str, UnidadObservacion] = {
    "casos": UnidadObservacion.HECHO,
    "casos_reportados": UnidadObservacion.HECHO,
    "personas": UnidadObservacion.PERSONA,
    "beneficiarios_reportados": UnidadObservacion.OFERTA,
    "puntos_distintos": UnidadObservacion.OFERTA,
    "procesos": UnidadObservacion.PROCESO,
    "eventos": UnidadObservacion.EVENTO,
    "solicitudes": UnidadObservacion.SOLICITUD,
    "giros": UnidadObservacion.OFERTA,
    "millones cop": UnidadObservacion.DINERO,
    "hectáreas": UnidadObservacion.SUPERFICIE,
    "ugm3": UnidadObservacion.MEDICION,
    "mmhg": UnidadObservacion.MEDICION,
    "celsius": UnidadObservacion.MEDICION,
    "%": UnidadObservacion.TASA,
    "porcentaje": UnidadObservacion.TASA,
    "porcentaje (el valor esta multiplicado por 100)": UnidadObservacion.TASA,
    "índice 0–1": UnidadObservacion.INDICE,
    "puntos": UnidadObservacion.INDICE,
}

UNIDADES_ICBF_RPC_NUMERO: dict[str, UnidadObservacion] = {
    "número de mesas de participación de niños, niñas y adolescentes "
    "conformadas y en operación": UnidadObservacion.OFERTA,
    "número de niños, niñas y mujeres gestantes con educación inicial "
    "en el marco de la atención integral a la primera infancia.": UnidadObservacion.OFERTA,
    "número de niños y niñas menores de 1 año con registro civil por lugar de residencia": UnidadObservacion.PERSONA,
}


def clasificar_unidad(unidad: str) -> UnidadObservacion:
    normalizada = unidad.strip().casefold()
    if normalizada in UNIDADES:
        return UNIDADES[normalizada]
    if normalizada.startswith(("tasa", "casos por cada")):
        return UnidadObservacion.TASA
    return UnidadObservacion.DESCONOCIDA


def clasificar_unidad_contextual(fuente: str, indicador: str, unidad: str) -> tuple[UnidadObservacion, str]:
    """Resuelve solo los tres 'Número' ICBF cuyo objeto está descrito por el indicador."""
    if fuente == "icbf_rpc_cartagena" and unidad.strip().casefold() == "número":
        observacion = UNIDADES_ICBF_RPC_NUMERO.get(indicador.strip().casefold())
        if observacion is not None:
            return observacion, "icbf_rpc_indicador_exacto_v1"
        return UnidadObservacion.DESCONOCIDA, "sin_regla_contextual"
    observacion = clasificar_unidad(unidad)
    return observacion, "literal_unidad_v1" if observacion != UnidadObservacion.DESCONOCIDA else "sin_regla_contextual"


class ObservacionAgregada(BaseModel):
    fuente_clave: str = Field(min_length=1)
    version_sha256: str = Field(min_length=64, max_length=64)
    indicador: str = Field(min_length=1)
    anio: int = Field(ge=1900, le=2100)
    tipo_fecha: str
    valor: Decimal
    unidad_original: str = Field(min_length=1)
    unidad_observacion: UnidadObservacion
    regla_unidad: str = "literal_unidad_v1"
    ambito_original: str = Field(min_length=1)
    territorio_id: str | None = None
    coordenadas_estacion: tuple[Decimal, Decimal] | None = None
    estado_validacion_original: str
    corte_extraccion: str | None = None
    provisional: bool
    url_fuente: str | None = None
    subtipo: str | None = None
    clasificacion_7d: Clasificacion7D

    @field_validator("version_sha256")
    @classmethod
    def sha_valido(cls, valor: str) -> str:
        if any(caracter not in "0123456789abcdef" for caracter in valor):
            raise ValueError("SHA-256 debe ser hexadecimal")
        return valor


def normalizar_fila(fila: dict[str, str], version_sha256: str) -> ObservacionAgregada:
    """Estructura una fila sin inferir un territorio más fino que el declarado."""
    ambito = fila["ambito"]
    territorio = (
        "13001"
        if ambito
        in {
            "municipio_13001",
            "municipio_hecho_cartagena",
            "municipio_o_subtipo",
            "municipio_con_desglose_urbano_rural",
        }
        else None
    )
    fuente = fila["fuente_clave"]
    indicador = fila["indicador"]
    coordenadas_estacion = None
    if ambito == "estacion" and fila.get("detalle_espacial_json"):
        detalle = json.loads(fila["detalle_espacial_json"])
        latitud = Decimal(str(detalle["latitud"]))
        longitud = Decimal(str(detalle["longitud"]))
        if (
            detalle.get("dataset_id") == "kekd-7v7h"
            and detalle.get("tipo_ubicacion") == "estacion_monitoreo_no_incidente"
            and 9 <= latitud <= 11
            and -76 <= longitud <= -74
        ):
            coordenadas_estacion = (latitud, longitud)
    if fila.get("origen", "").startswith("fiscalia_spoa") or fuente.startswith(("policia_", "medicina_")):
        tipo_fecha = "anio_hecho"
    elif fila.get("origen") == "dane_serie_vigencia_censal":
        tipo_fecha = "anio_proyeccion_base_censal"
    elif fuente == "unidad_victimas_ruv_cartagena" and indicador == "personas_por_declaracion":
        tipo_fecha = "vigencia_declaracion_ruv"
    elif fuente == "unidad_victimas_ruv_cartagena" and indicador == "personas_por_ocurrencia":
        tipo_fecha = "vigencia_ocurrencia_ruv"
    elif fuente == "unidad_victimas_ruv_cartagena" and indicador == "eventos_reportados":
        tipo_fecha = "vigencia_eventos_ruv"
    else:
        tipo_fecha = "anio_declarado_por_fuente"
    estado = fila.get("estado_validacion", "")
    anio = int(fila["anio"])
    fecha_extraccion = fila.get("fecha_extraccion") or ""
    anio_captura = date.fromisoformat(fecha_extraccion[:10]).year if fecha_extraccion else None
    provisional = (
        "anio_parcial" in estado
        or (anio == 2026 and "corte_" in estado)
        or (anio_captura is not None and anio >= anio_captura and fila.get("origen") != "dane_serie_vigencia_censal")
    )
    unidad_observacion, regla_unidad = clasificar_unidad_contextual(fuente, indicador, fila["unidad"])
    return ObservacionAgregada(
        fuente_clave=fila["fuente_clave"],
        version_sha256=version_sha256,
        indicador=fila["indicador"],
        anio=anio,
        tipo_fecha=tipo_fecha,
        valor=Decimal(fila["valor"]),
        unidad_original=fila["unidad"],
        unidad_observacion=unidad_observacion,
        regla_unidad=regla_unidad,
        ambito_original=ambito,
        territorio_id=territorio,
        coordenadas_estacion=coordenadas_estacion,
        estado_validacion_original=estado,
        corte_extraccion=fila.get("fecha_extraccion"),
        provisional=provisional,
        url_fuente=fila.get("url_fuente") or None,
        subtipo=fila.get("subtipo") or None,
        clasificacion_7d=clasificar(fila["fuente_clave"], fila["indicador"], fila.get("subtipo")),
    )


def llave_comparable(obs: ObservacionAgregada) -> tuple[str, str, str, str, str, int, str | None, str | None]:
    """Solo filas del mismo universo, unidad y versión pueden agregarse."""
    return (
        obs.fuente_clave,
        obs.version_sha256,
        obs.indicador,
        obs.unidad_original,
        obs.ambito_original,
        obs.anio,
        obs.territorio_id,
        obs.subtipo,
    )


def evaluar_lote(filas: list[dict[str, str]], versiones: dict[str, str]) -> dict[str, Any]:
    """Puerta conservadora: rojo por integridad, ámbar por semántica pendiente."""
    problemas: Counter[str] = Counter()
    observaciones: list[ObservacionAgregada] = []
    for fila in filas:
        clave = fila.get("fuente_clave", "")
        sha = versiones.get(clave)
        if not sha:
            problemas["fuente_sin_version"] += 1
            continue
        try:
            obs = normalizar_fila(fila, sha)
        except (KeyError, ValueError, InvalidOperation):
            problemas["esquema_o_valor_invalido"] += 1
            continue
        if obs.valor < 0 and obs.unidad_observacion not in {UnidadObservacion.MEDICION, UnidadObservacion.DINERO}:
            problemas["conteo_negativo"] += 1
        if obs.unidad_observacion == UnidadObservacion.DESCONOCIDA:
            problemas["unidad_sin_contrato"] += 1
        if not obs.url_fuente:
            problemas["sin_url_fuente"] += 1
        if obs.ambito_original == "estacion" and obs.coordenadas_estacion is None:
            problemas["estacion_sin_geocodigo"] += 1
        if obs.clasificacion_7d.estado == "sin_clasificar":
            problemas["dimension_sin_clasificar"] += 1
        observaciones.append(obs)
    rojos = {"fuente_sin_version", "esquema_o_valor_invalido", "conteo_negativo"}
    estado = "rojo" if any(problemas[c] for c in rojos) else "ambar" if problemas else "verde"
    return {
        "estado": estado,
        "filas_entrada": len(filas),
        "filas_tipadas": len(observaciones),
        "problemas": dict(sorted(problemas.items())),
        "contrato": "observacion_agregada_v1",
    }
