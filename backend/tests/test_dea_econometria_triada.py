"""Contratos y salvaguardas del motor DEA, sin escribir en bd_csh."""

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.compromisos.dea_econometria_service import (
    TTL,
    DeaEconometriaService,
    _bh,
    _factor,
    _geomean,
    _lp,
    _prepare,
    _regression_truncated,
    _sbm,
    _scale,
    _unit_factor,
)


def _row(
    i,
    *,
    entity="Secretaría de Educación",
    motor="PLAN_DESARROLLO",
    cut="T2",
    bpim=None,
    meta=None,
    activity=None,
    avance=0.5,
    app=None,
    pay=None,
    strong=None,
):
    return {
        "id": f"row-{i}",
        "archivo_id": f"file-{cut}",
        "entidad": entity,
        "anio": 2025,
        "corte": cut,
        "motor": motor,
        "hoja": "Inversión",
        "fila": i,
        "bpim": bpim,
        "meta": meta,
        "linea": None,
        "indicador": None,
        "actividad": activity,
        "fuerte": strong,
        "avance": avance,
        "programada": None,
        "ejecutada": None,
        "apropiacion": app,
        "rp": None,
        "obligaciones": None,
        "pagos": pay,
        "dimensiones": [],
        "numeros_origen": None,
        "encabezado_apropiacion": "Apropiación (en pesos)",
        "encabezado_rp": None,
        "encabezado_obligaciones": None,
        "encabezado_pagos": "Pagos (en pesos)",
    }


def test_ipc_2025_cerrado_y_2026_provisional():
    assert _factor(2025) == 1
    assert math.isclose(_factor(2024), 1.051)
    assert _factor(2026) is None


def test_escala_con_cociente_y_ambiguedad():
    row = _row(1, avance=0.5)
    row.update(programada=100, ejecutada=50)
    assert _scale(row, {"low": 1, "high": 2}) == (50.0, "COCIENTE_VERIFICADO")
    row.update(programada=None, ejecutada=None)
    assert _scale(row, {"low": 3, "high": 3}) == (None, "ESCALA_AMBIGUA")
    row["avance"] = 110
    assert _scale(row, {"low": 0, "high": 1})[1] == "SOBRECUMPLIMIENTO_O_CANTIDAD_ABSOLUTA"


def test_libro_complementario_y_corte_mas_reciente_por_item():
    rows = [
        _row(1, meta="META-A", cut="T1", avance=0.4),
        _row(2, meta="META-A", cut="ANUAL", avance=0.8),
        _row(3, meta="META-B", cut="T1", avance=0.6),
    ]
    for row in rows:
        row["programada"] = 100
        row["ejecutada"] = row["avance"] * 100
    result = _prepare(rows, 2025)
    assert result["auditoria"]["seleccionados_por_item"] == 2
    assert result["metricas"]["Secretaría de Educación"]["y1"] == pytest.approx(1.4)


def test_contabilidad_separada_y_encabezado_conflictivo():
    row = _row(1, motor="INVERSION_PRESUPUESTAL", bpim="2024130010001", app=3, pay=2)
    row["encabezado_apropiacion"] = "Apropiación en millones de pesos"
    row["encabezado_pagos"] = "Presupuesto ejecutado - compromisos"
    result = _prepare([row], 2025)
    m = result["metricas"][row["entidad"]]
    assert m["apropiacion_cop"] == 3_000_000
    assert m["pagos_cop"] == 0
    assert result["auditoria"]["pagos_encabezado_conflicto_excluidos"] == 1
    assert _unit_factor("Monto en miles de pesos") == (1000, "MILES_EXPLICITOS")


def test_montos_sin_clave_se_despropagan_por_hoja_y_valor():
    rows = [_row(i, motor="INVERSION_PRESUPUESTAL", app=500, avance=0.8) for i in (1, 2, 3)]
    result = _prepare(rows, 2025)
    assert result["metricas"]["Secretaría de Educación"]["apropiacion_cop"] == 500
    assert result["auditoria"]["repeticiones_sin_clave_apropiacion"] == 2
    assert TTL == 3600.0


def test_regresion_segunda_etapa_admite_panel_26_entidades():
    panel = []
    for entity in range(26):
        for year in range(4):
            panel.append(
                {
                    "entidad": f"Entidad {entity}",
                    "grupo": "SECTOR_CENTRAL_RECTOR"
                    if entity < 10
                    else "DESCENTRALIZADAS_Y_AUTORIDADES",
                    "eficiencia": 0.5 + ((entity * 3 + year) % 10) / 20,
                    "debil": ((entity + year) % 5) / 5,
                    "continuidad": ((entity * 2 + year) % 7) / 7,
                    "completitud_documental": ((entity + year * 2) % 6) / 5,
                }
            )
    fit = _regression_truncated(panel, replicas=20)
    assert fit["estado"] == "EXPLORATORIO_PANEL_CLUSTER"
    assert fit["n_entidades"] == 26
    assert fit["n_observaciones"] == 104
    assert len(fit["coeficientes"]) == 5
    assert 0 <= fit["ajuste_modelo"]["pseudo_r_cuadrado"] <= 1
    assert 0 <= fit["ajuste_modelo"]["p_value_modelo"] <= 1


def test_lp_crs_bcc_sbm_y_exclusion_financiera():
    X = np.array([[1.0], [2.0], [3.0]])
    Y = np.array([[1.0, 1.0], [3.0, 3.0], [3.0, 3.0]])
    crs = _lp(X, Y, X[0], Y[0])
    bcc = _lp(X, Y, X[0], Y[0], vrs=True)
    assert crs["estado"] == bcc["estado"] == "CALCULADO"
    assert 0 < crs["eficiencia"] <= bcc["eficiencia"] <= 1
    assert _sbm(X, Y, 0)["estado"] == "CALCULADO"
    assert _lp(X, Y, np.array([0.0]), Y[0])["estado"] == "NO_ESTIMABLE"


def test_fdr_bh_monotono():
    q = _bh([0.001, 0.01, 0.5])
    assert q == pytest.approx([0.003, 0.015, 0.5])
    assert _geomean([0.5, 2.0]) == pytest.approx(1.0)


def test_contrato_frontera_con_nueve_dmus_y_sin_bootstrap_costoso():
    rows = []
    for i in range(1, 10):
        entity = f"Secretaría de prueba {i}"
        pdd = _row(100 + i, entity=entity, meta=f"META-{i}", avance=0.5)
        pa = _row(
            200 + i,
            entity=entity,
            motor="PLAN_ACCION",
            activity=f"Entregar producto {i}",
            avance=0.6,
            strong=True,
        )
        inv = _row(
            300 + i,
            entity=entity,
            motor="INVERSION_PRESUPUESTAL",
            bpim=f"2024130010{i:03d}",
            app=1_000_000 * i,
            avance=0.8,
        )
        for row in (pdd, pa, inv):
            row["programada"] = 100
            row["ejecutada"] = row["avance"] * 100
            rows.append(row)
    data = _prepare(rows, 2025)
    result = DeaEconometriaService._frontier_sync(data, "nucleo_1x2", "apropiacion", False)
    assert result["estado"] == "CALCULADO"
    assert result["dmus_estimables"] == 9
    assert len(result["ranking_eficiencia"]) == 9
    assert result["fronteras_grupo"][0]["cumple_cooper"]
    assert all(0 < m["theta_ccr"] <= 1 for m in result["ranking_eficiencia"])


def test_cinco_rutas_dea_y_validacion_http(monkeypatch):
    async def stub(*_args, **_kwargs):
        return {"estado": "CALCULADO"}

    for method in (
        "auditoria_saneamiento",
        "frontera_eficiencia",
        "malmquist",
        "econometria_segunda_etapa",
        "resumen_integral",
    ):
        monkeypatch.setattr(DeaEconometriaService, method, stub)
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="postgresql+asyncpg://polis:polis@127.0.0.1:5432/polis_test_dea_dummy",
    )
    app = create_app(settings)
    paths = (
        "auditoria-saneamiento",
        "frontera-eficiencia",
        "malmquist",
        "econometria-segunda-etapa",
        "resumen-integral",
    )
    with TestClient(app) as client:
        for path in paths:
            response = client.get(f"/api/v1/compromisos/triada/dea/{path}")
            assert response.status_code == 200, response.text
            assert response.json()["estado"] == "CALCULADO"
        assert (
            client.get(
                "/api/v1/compromisos/triada/dea/frontera-eficiencia", params={"modo": "incorrecto"}
            ).status_code
            == 422
        )
        assert (
            client.get(
                "/api/v1/compromisos/triada/dea/malmquist", params={"desde": 2025, "hasta": 2020}
            ).status_code
            == 422
        )
