"""Paneles temporales 7D reproducibles, sin intervalos inventados ni uniones de fuentes."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field
from scipy import __version__ as scipy_version
from scipy.stats import chi2

from app.modules.compromisos.series_7d_polis import RAIZ, RegistroSerie7D, _escribir_inmutable

DESTINO = RAIZ / "data/capas_analiticas/paneles_series_7d"
Medida = Literal["valor_original", "tasa_por_100000"]


class PuntoSerie7D(BaseModel):
    anio: int
    valor: Decimal | None
    valores_reportados: list[Decimal]
    observaciones_sha256: list[str]
    provisional: bool
    base_censal: str | None
    estado: Literal["observado", "periodo_parcial", "duplicado_identico", "valores_contradictorios"]
    comparabilidad_con_anterior: Literal[
        "primer_punto",
        "comparable_dentro_fuente",
        "sin_periodo_intermedio",
        "ruptura_base_censal",
        "no_comparable_periodo_parcial",
        "no_comparable_colision",
    ]
    intervalo_inferior: Decimal | None = None
    intervalo_superior: Decimal | None = None
    incertidumbre: Literal[
        "poisson_exacto_95_condicional_al_registro",
        "poisson_exacto_95_conteo_hechos_registrados",
        "intervalo_no_disponible_en_corte",
    ] = "intervalo_no_disponible_en_corte"


class PanelSerie7D(BaseModel):
    panel_id: str = Field(pattern=r"^[0-9a-f]{24}$")
    fuente_clave: str
    version_fuente_sha256: str
    indicador: str
    subtipo: str | None
    dimension: str | None
    medida: Medida
    unidad: str
    territorio_id: str | None
    ambito_original: str
    tipo_fecha: str
    anios_sin_dato: list[int]
    quiebre_censal_2018: bool
    puntos: list[PuntoSerie7D]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"


def _llave(fila: RegistroSerie7D, medida: Medida) -> tuple[Any, ...]:
    return (
        fila.fuente_clave,
        fila.version_fuente_sha256,
        fila.indicador,
        fila.subtipo,
        fila.dimension,
        medida,
        fila.unidad_original,
        fila.territorio_id,
        fila.ambito_original,
        fila.tipo_fecha,
    )


def _recuento_elegible(fila: RegistroSerie7D) -> Decimal | None:
    if (
        fila.provisional
        or fila.colision_clave != "ninguna"
        or fila.estado_comparabilidad in {"duplicado_identico", "valores_contradictorios"}
        or fila.numerador is None
    ):
        return None
    casos = fila.numerador
    if casos < 0 or casos != casos.to_integral_value() or casos != fila.valor_original:
        return None
    return casos


def _limites_poisson(casos: Decimal) -> tuple[Decimal, Decimal]:
    k = int(casos)
    inferior = Decimal(0) if k == 0 else Decimal(str(chi2.ppf(0.025, 2 * k))) / 2
    superior = Decimal(str(chi2.ppf(0.975, 2 * (k + 1)))) / 2
    return inferior, superior


def _intervalo_poisson_conteo(fila: RegistroSerie7D) -> tuple[Decimal, Decimal] | None:
    """IC condicional para hechos anuales registrados, sin modelar subregistro."""
    casos = _recuento_elegible(fila)
    if casos is None or fila.unidad_observacion != "hecho":
        return None
    return _limites_poisson(casos)


def _intervalo_poisson_tasa(fila: RegistroSerie7D) -> tuple[Decimal, Decimal] | None:
    """IC Garwood 95 % solo para recuentos anuales completos y tasa aritméticamente consistente."""
    casos = _recuento_elegible(fila)
    if casos is None or fila.denominador is None or fila.tasa_por_100000 is None:
        return None
    poblacion = Decimal(fila.denominador.poblacion)
    if poblacion <= 0:
        return None
    tasa_esperada = casos * Decimal(100000) / poblacion
    if abs(tasa_esperada - fila.tasa_por_100000) > Decimal("0.000000001"):
        return None
    inferior, superior = _limites_poisson(casos)
    factor = Decimal(100000) / poblacion
    return inferior * factor, superior * factor


def _puntos(filas: list[RegistroSerie7D], medida: Medida) -> list[PuntoSerie7D]:
    por_anio: dict[int, list[RegistroSerie7D]] = defaultdict(list)
    for fila in filas:
        por_anio[fila.anio].append(fila)
    puntos = []
    anterior: PuntoSerie7D | None = None
    for anio, grupo in sorted(por_anio.items()):
        valores = sorted(
            (fila.valor_original if medida == "valor_original" else fila.tasa_por_100000 for fila in grupo),
            key=Decimal,
        )
        valores_validos = [valor for valor in valores if valor is not None]
        if not valores_validos:
            continue
        colision = (
            "valores_contradictorios"
            if len(set(valores_validos)) > 1
            else "duplicado_identico"
            if len(grupo) > 1
            else None
        )
        provisional = any(fila.provisional for fila in grupo)
        estado = colision or ("periodo_parcial" if provisional else "observado")
        bases = {fila.denominador.base_censal for fila in grupo if fila.denominador is not None}
        base = next(iter(bases)) if len(bases) == 1 else None
        if anterior is None:
            comparabilidad = "primer_punto"
        elif colision or anterior.estado in {"duplicado_identico", "valores_contradictorios"}:
            comparabilidad = "no_comparable_colision"
        elif provisional or anterior.provisional:
            comparabilidad = "no_comparable_periodo_parcial"
        elif medida == "tasa_por_100000" and base != anterior.base_censal:
            comparabilidad = "ruptura_base_censal"
        elif anio - anterior.anio != 1:
            comparabilidad = "sin_periodo_intermedio"
        else:
            comparabilidad = "comparable_dentro_fuente"
        intervalo = None
        if len(grupo) == 1 and colision is None:
            intervalo = (
                _intervalo_poisson_tasa(grupo[0])
                if medida == "tasa_por_100000"
                else _intervalo_poisson_conteo(grupo[0])
            )
        punto = PuntoSerie7D(
            anio=anio,
            valor=None if colision == "valores_contradictorios" else valores_validos[0],
            valores_reportados=valores_validos,
            observaciones_sha256=sorted(fila.observacion_sha256 for fila in grupo),
            provisional=provisional,
            base_censal=base,
            estado=estado,
            comparabilidad_con_anterior=comparabilidad,
            intervalo_inferior=intervalo[0] if intervalo else None,
            intervalo_superior=intervalo[1] if intervalo else None,
            incertidumbre=(
                (
                    "poisson_exacto_95_condicional_al_registro"
                    if medida == "tasa_por_100000"
                    else "poisson_exacto_95_conteo_hechos_registrados"
                )
                if intervalo
                else "intervalo_no_disponible_en_corte"
            ),
        )
        puntos.append(punto)
        anterior = punto
    return puntos


def _panel(llave: tuple[Any, ...], filas: list[RegistroSerie7D]) -> PanelSerie7D:
    fuente, version, indicador, subtipo, dimension, medida, unidad_original, territorio, ambito, tipo_fecha = llave
    puntos = _puntos(filas, medida)
    if not puntos:
        raise ValueError("Un panel temporal no puede quedar sin puntos")
    vistos = {punto.anio for punto in puntos}
    faltantes = sorted(set(range(min(vistos), max(vistos) + 1)) - vistos)
    identificador = hashlib.sha256(json.dumps(llave, ensure_ascii=False, default=str).encode()).hexdigest()[:24]
    return PanelSerie7D(
        panel_id=identificador,
        fuente_clave=fuente,
        version_fuente_sha256=version,
        indicador=indicador,
        subtipo=subtipo,
        dimension=dimension,
        medida=medida,
        unidad=unidad_original if medida == "valor_original" else "por 100.000 habitantes",
        territorio_id=territorio,
        ambito_original=ambito,
        tipo_fecha=tipo_fecha,
        anios_sin_dato=faltantes,
        quiebre_censal_2018=medida == "tasa_por_100000" and {2017, 2018} <= vistos,
        puntos=puntos,
    )


def materializar_paneles(series: Path, destino: Path = DESTINO) -> dict[str, Any]:
    """Crea paneles con huecos, cambios de base y conflictos visibles para gráficas."""
    sha_entrada = hashlib.sha256(series.read_bytes()).hexdigest()
    if series.stem != sha_entrada:
        raise ValueError("La ruta de series 7D no coincide con el SHA de su contenido")
    manifiesto = json.loads(series.with_suffix(".manifest.json").read_text(encoding="utf-8"))
    if manifiesto.get("salida_sha256") != sha_entrada or manifiesto.get("estado_publicacion") != "no_publicable":
        raise ValueError("Manifiesto de series 7D incompatible")
    filas = [RegistroSerie7D.model_validate_json(linea) for linea in series.read_bytes().splitlines() if linea]
    if len(filas) != manifiesto["filas"]:
        raise ValueError("Cantidad de registros 7D discrepante")
    agrupados: dict[tuple[Any, ...], list[RegistroSerie7D]] = defaultdict(list)
    for fila in filas:
        agrupados[_llave(fila, "valor_original")].append(fila)
        if fila.tasa_por_100000 is not None:
            agrupados[_llave(fila, "tasa_por_100000")].append(fila)
    paneles = [_panel(llave, grupo) for llave, grupo in sorted(agrupados.items(), key=lambda par: str(par[0]))]
    resultado = {
        "esquema": "polis.paneles_series_7d.v2",
        "series_7d_sha256": sha_entrada,
        "paneles": [panel.model_dump(mode="json") for panel in paneles],
        "conteos": {
            "paneles": len(paneles),
            "puntos": sum(len(panel.puntos) for panel in paneles),
            "quiebres_censales_2018": sum(panel.quiebre_censal_2018 for panel in paneles),
            "puntos_contradictorios": sum(
                punto.estado == "valores_contradictorios" for panel in paneles for punto in panel.puntos
            ),
            "puntos_parciales": sum(punto.provisional for panel in paneles for punto in panel.puntos),
        },
        "estado_publicacion": "no_publicable",
        "regla_incertidumbre": (
            "IC exacto de Garwood 95 % para hechos registrados con recuento entero y año completo; "
            "en tasas municipales exige además denominador y aritmética consistentes. Condicional al "
            "proceso de registro observado y, en tasas, a población fija. No estima subregistro, "
            "error censal ni efecto causal. Periodos parciales, colisiones y otras unidades sin intervalo."
        ),
        "scipy_version_intervalo": scipy_version,
    }
    contenido = (json.dumps(resultado, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha_salida = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha_salida}.json"
    _escribir_inmutable(ruta, contenido)
    return {
        "ruta": ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta),
        "sha256": sha_salida,
        "series_7d_sha256": sha_entrada,
        "conteos": resultado["conteos"],
        "estado_publicacion": "no_publicable",
    }
