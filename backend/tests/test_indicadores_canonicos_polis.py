"""El cálculo municipal conserva la base censal y rechaza falsa precisión local."""

from decimal import Decimal

import pytest

from app.modules.compromisos.contratos_observacion_polis import normalizar_fila
from app.modules.compromisos.indicadores_canonicos_polis import (
    calcular_tasa_municipal,
    cargar_denominadores,
    tasas_comparables,
)


def _observacion(anio: int, *, unidad: str = "casos", estado: str = "disponible"):
    return normalizar_fila(
        {
            "fuente_clave": "policia_homicidios",
            "indicador": "casos_registrados",
            "anio": str(anio),
            "valor": "10",
            "unidad": unidad,
            "ambito": "municipio_13001",
            "estado_validacion": estado,
            "url_fuente": "https://example.org",
            "origen": "banco_oficial_28",
        },
        "a" * 64,
    )


def test_denominadores_dane_cierran_y_respetan_quiebre_2018():
    denominadores = cargar_denominadores()
    assert len(denominadores) == 15
    assert denominadores[2017].base_censal == "Censo General 2005"
    assert denominadores[2018].base_censal == "CNPV 2018"
    assert denominadores[2026].codigo_dane == "13001"

    antes = calcular_tasa_municipal(_observacion(2017), denominadores)
    despues = calcular_tasa_municipal(_observacion(2018), denominadores)
    assert antes.valor_por_100000 == Decimal(10) * 100000 / denominadores[2017].poblacion
    assert "Cambio de base censal respecto de 2017" in despues.advertencias
    assert not tasas_comparables(antes, despues)


def test_no_publica_tasa_de_ucg_ni_de_proceso_o_anio_parcial_como_comparable():
    denominadores = cargar_denominadores()
    municipal = _observacion(2026, estado="anio_parcial")
    parcial = calcular_tasa_municipal(municipal, denominadores)
    assert parcial.provisional and parcial.advertencias
    assert not tasas_comparables(parcial, calcular_tasa_municipal(_observacion(2025), denominadores))
    with pytest.raises(ValueError, match="no se imputa"):
        calcular_tasa_municipal(municipal.model_copy(update={"territorio_id": "UCG-01"}), denominadores)
    with pytest.raises(ValueError, match="no procesos"):
        calcular_tasa_municipal(_observacion(2025, unidad="procesos"), denominadores)
    total = calcular_tasa_municipal(_observacion(2024), denominadores)
    otro_subtipo = calcular_tasa_municipal(
        _observacion(2025).model_copy(update={"subtipo": "otra_modalidad"}), denominadores
    )
    assert not tasas_comparables(total, otro_subtipo)


def test_icbf_registro_civil_no_usa_poblacion_total_como_denominador_etario():
    observacion = normalizar_fila(
        {
            "fuente_clave": "icbf_rpc_cartagena",
            "indicador": "Número de niños y niñas menores de 1 año con registro civil por lugar de residencia",
            "anio": "2021",
            "valor": "100",
            "unidad": "Número",
            "ambito": "municipio_13001",
            "estado_validacion": "disponible",
            "url_fuente": "https://www.datos.gov.co/d/v9qk-hdcc",
            "origen": "icbf_rpc_compilacion",
        },
        "a" * 64,
    )
    with pytest.raises(ValueError, match="denominador etario"):
        calcular_tasa_municipal(observacion, cargar_denominadores())


@pytest.mark.parametrize("fuente", ["dane_poblacion_vigencia_censal", "dane_poblacion_municipal"])
def test_poblacion_dane_no_puede_ser_numerador_de_si_misma(fuente):
    observacion = normalizar_fila(
        {
            "fuente_clave": fuente,
            "indicador": "poblacion_total",
            "anio": "2018",
            "valor": "1000000",
            "unidad": "personas",
            "ambito": "municipio_13001",
            "estado_validacion": "disponible",
            "url_fuente": "https://www.dane.gov.co/",
            "origen": "dane_serie_vigencia_censal",
        },
        "a" * 64,
    )
    with pytest.raises(ValueError, match="es denominador"):
        calcular_tasa_municipal(observacion, cargar_denominadores())
