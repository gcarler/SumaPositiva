import numpy as np
import pandas as pd

from app.modules.compromisos.pdt_analisis_planes_tendencias import (
    CODIGOS,
    _evenness,
    _jsd,
    _tendencia,
    clasificar_actividad,
)


def test_clasificar_por_texto_prevalece_sobre_entidad():
    cat, fuertes, fuente = clasificar_actividad(
        "Secretaría General",
        "",
        "Contratar el suministro de ayuda humanitaria alimentaria y nutrición infantil",
    )
    assert cat in CODIGOS
    assert fuente == "texto"
    assert cat in fuertes


def test_clasificar_devuelve_categoria_valida_siempre():
    cat, _, fuente = clasificar_actividad("Entidad desconocida", "", "xyz")
    assert isinstance(cat, str)
    assert fuente in {"texto", "entidad", "ninguna"} or isinstance(fuente, str)


def test_tendencia_creciente_clara():
    s = pd.Series(np.linspace(0.10, 0.30, 8), index=range(2018, 2026))
    t = _tendencia(s)
    assert t["etiqueta"] == "creciente"
    assert t["pendiente_pp_anio"] > 0
    assert t["p"] < 0.10


def test_tendencia_decreciente_clara():
    s = pd.Series(np.linspace(0.30, 0.10, 8), index=range(2018, 2026))
    assert _tendencia(s)["etiqueta"] == "decreciente"


def test_tendencia_constante_sin_variacion_y_ruido_no_concluyente():
    const = pd.Series([0.2] * 8, index=range(2018, 2026))
    assert _tendencia(const)["etiqueta"] == "sin variación"
    ruido = pd.Series([0.2, 0.3, 0.1, 0.25, 0.15, 0.3, 0.12, 0.22], index=range(2018, 2026))
    assert _tendencia(ruido)["etiqueta"] == "sin tendencia concluyente"


def test_tendencia_ignora_2026_parcial():
    s = pd.Series([0.2] * 8 + [0.9], index=range(2018, 2027))
    assert _tendencia(s)["n"] == 8


def test_evenness_y_jsd():
    assert abs(_evenness(np.full(7, 1 / 7)) - 1.0) < 1e-9
    assert _evenness(np.array([1.0, 0, 0, 0, 0, 0, 0])) == 0.0
    p = np.array([0.5, 0.5])
    assert _jsd(p, p) == 0.0
    assert 0 < _jsd(np.array([1.0, 0.0]), np.array([0.0, 1.0])) <= 1.0
