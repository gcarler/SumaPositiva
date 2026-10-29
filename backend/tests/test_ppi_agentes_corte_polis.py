"""Consulta financiera congelada: exactitud, coherencia y ausencia de SQL."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from decimal import Decimal

import pytest

from app.modules.compromisos import agentes_inteligentes_pdd as pdd
from app.modules.compromisos.catalogo_planeacion_corte_polis import (
    CatalogoPlaneacion,
    ReferenciaCatalogoPlaneacion,
    escribir_catalogo,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.ppi_planeacion_corte_polis import (
    CapturaPPIPlaneacion,
    ReferenciaPPIPlaneacion,
    escribir_captura,
)

CODIGOS = ("PDD_2016_2019", "PDD_2020_2023", "PDL_1_2024_2027")
RAW = '{"2026":9007199254740993.01,"array":[null,0,false,"0"]}'


class SinSQL:
    async def execute(self, *args, **kwargs):
        raise AssertionError("No se permite SQL en la tool PPI congelada")


def modelos():
    nodos, metas, planes = [], [], []
    for i, code in enumerate(CODIGOS):
        node_id = uuid.uuid5(uuid.NAMESPACE_URL, code)
        nodos.append(
            dict(
                id=node_id,
                codigo_plan=code,
                parent_id=None,
                nivel="PROGRAMA",
                codigo=f"P{i}",
                nombre="Salud",
                orden=i,
                ppi_anual_cop={},
                fuente=None,
                metadatos={},
            )
        )
        metas.append(
            dict(
                id=uuid.uuid5(uuid.NAMESPACE_DNS, code),
                codigo_plan=code,
                linea_id=node_id,
                tipo_meta="RESULTADO",
                codigo=f"M{i}",
                nombre="Salud",
                indicador=None,
                unidad_medida=None,
                linea_nombre=None,
                fuente=None,
                fila_fuente=None,
                datos_oficiales={},
            )
        )
        planes.append(
            dict(
                codigo_plan=code,
                periodo="2024-2027",
                nombre_oficial=code,
                ppi_total_corriente_cop=Decimal("9007199254740993.01") if i != 2 else Decimal("0"),
                ppi_total_constante_2025_cop=Decimal("123.45"),
                ppi_anual_cop=RAW,
                fuentes="null",
                metadatos=None,
            )
        )
    cobertura = {k: dict(nodos=1, metas=1) for k in CODIGOS}
    cat = CatalogoPlaneacion(base_origen="polis_test_sintetica", cobertura_sql=cobertura, nodos=nodos, metas=metas)
    ppi = CapturaPPIPlaneacion(
        base_origen=cat.base_origen,
        conteos_sql=cobertura,
        planes=planes,
        nodos=[
            dict(
                id=n.id,
                codigo_plan=n.codigo_plan,
                parent_id=n.parent_id,
                nivel=n.nivel,
                ppi_anual_cop=RAW,
                fuente=None,
                metadatos="null",
            )
            for n in cat.nodos
        ],
    )
    return ppi, cat


def referencias(tmp_path, ppi=None, cat=None):
    defaults = modelos()
    ppi = ppi or defaults[0]
    cat = cat or defaults[1]
    pr, ps = escribir_captura(ppi, tmp_path / "ppi")
    cr, cs = escribir_catalogo(cat, tmp_path / "catalogo")
    inv = tmp_path / "inventario.json"
    inv.write_text(
        json.dumps(
            {
                "esquema": "polis.inventario_fuentes.v1",
                "archivos": [{"ruta": str(pr), "sha256": ps}, {"ruta": str(cr), "sha256": cs}],
            }
        )
    )
    run = uuid.uuid4()
    manifest = tmp_path / "corte.json"
    manifest.write_text(
        json.dumps(
            dict(
                run_id=str(run),
                inventario_sha256=hashlib.sha256(inv.read_bytes()).hexdigest(),
                evaluacion_sha256="a" * 64,
                consolidado_sha256="b" * 64,
                estado_calidad="ambar",
                estado_publicacion="no_publicable",
                artefactos_inventariados=2,
                versiones=[],
            )
        )
    )
    return (
        ContextoCorte(run, manifest, hashlib.sha256(manifest.read_bytes()).hexdigest()),
        ReferenciaPPIPlaneacion(inv, pr),
        ReferenciaCatalogoPlaneacion(inv, cr),
    )


def contexto(tmp_path, **kw):
    corte, ppi, cat = referencias(tmp_path, **kw)
    return pdd.ToolContext(
        session=SinSQL(), consulta=pdd.ConsultaAgentesPDD(pregunta="PDD / PA"), corte=corte, ppi=ppi, catalogo=cat
    )


def test_ppi_exacto_y_cobertura_sin_sql(tmp_path):
    ctx = contexto(tmp_path)
    rows = asyncio.run(pdd._query_ppi(ctx))
    assert len(rows) == 3
    assert rows[0]["ppi_total_corriente_cop"] == "9007199254740993.01"
    assert rows[0]["ppi_anual_cop"] == RAW
    assert rows[0]["fuentes"] == "null" and rows[0]["metadatos"] is None
    assert rows[2]["ppi_total_corriente_cop"] == "0"
    assert ctx.cobertura_universo_bd["metas_por_plan_totales"] == dict.fromkeys(CODIGOS, 1)
    assert ctx.resultados["cobertura_financiera"]["planes_capturados"] == 3
    assert all(r["ppi_total_constante_2025_cop"] is None for r in rows)
    assert all(r["desglose_7d_constante_2025_cop"] is None for r in rows)
    assert json.loads(json.dumps(rows))[0]["valores_crudos"]["ppi_total_constante_2025_cop"] == "123.45"


def test_conflicto_2020_no_se_borra_de_crudos(tmp_path):
    ctx = contexto(tmp_path)
    rows = asyncio.run(pdd._query_ppi(ctx))
    r = rows[1]
    assert r["ppi_total_corriente_cop"] is None
    assert r["valores_crudos"]["ppi_total_corriente_cop"] == "9007199254740993.01"
    assert r["estado_financiero"] == "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"
    assert rows[2]["estado_financiero"] == "SIN_IPC_ANUAL_COMPLETO_2026_2027"
    assert rows[0]["estado_financiero"] == "PPI_CRUDO_SIN_COMPARABILIDAD_ACREDITADA"


@pytest.mark.parametrize("code,expected", [(CODIGOS[0], 1), ("NO_EXISTE", 0)])
def test_filtro_plan_cobertura_y_vacio(tmp_path, code, expected):
    ctx = contexto(tmp_path)
    ctx.consulta.codigo_plan = code
    assert len(asyncio.run(pdd._query_ppi(ctx))) == expected
    assert ctx.resultados["cobertura_financiera"]["planes_filtrados"] == expected


@pytest.mark.parametrize("field,value", [("dimension_sh", "Personal"), ("grado_frontalidad", "A")])
def test_rechaza_filtro_sh_no_acreditado(tmp_path, field, value):
    ctx = contexto(tmp_path)
    setattr(ctx.consulta, field, value)
    with pytest.raises(ValueError, match="solo admite filtro de plan"):
        asyncio.run(pdd._query_ppi(ctx))


@pytest.mark.parametrize("field", ["corte", "catalogo"])
def test_falta_referencia_falla_antes_de_sql(tmp_path, field):
    ctx = contexto(tmp_path)
    setattr(ctx, field, None)
    with pytest.raises(ValueError, match="requiere corte"):
        asyncio.run(pdd._query_ppi(ctx))


@pytest.mark.parametrize("cambio", ["base", "cobertura", "id", "nivel"])
def test_rechaza_catalogo_divergente(tmp_path, cambio):
    ppi, cat = modelos()
    if cambio == "base":
        ppi.base_origen = "polis_test_otra"
    elif cambio == "cobertura":
        ppi.conteos_sql[CODIGOS[0]].metas = 2
    elif cambio == "id":
        ppi.nodos[0].id = uuid.uuid4()
    else:
        ppi.nodos[0].nivel = "PLAN"
    ctx = contexto(tmp_path, ppi=ppi, cat=cat)
    with pytest.raises(ValueError, match="distint"):
        asyncio.run(pdd._query_ppi(ctx))


def test_captura_alterada_sin_sql_fallback(tmp_path):
    ctx = contexto(tmp_path)
    ctx.ppi.captura.write_text("{}")
    with pytest.raises(ValueError, match="alterado"):
        asyncio.run(pdd._query_ppi(ctx))


def test_inventario_ajeno_sin_sql(tmp_path):
    ctx = contexto(tmp_path)
    ctx.ppi.inventario.write_text("{}")
    with pytest.raises(ValueError, match="Inventario distinto"):
        asyncio.run(pdd._query_ppi(ctx))


def test_agent_financiero_local_solo_una_tool_y_repetible(tmp_path, monkeypatch):
    ctx = contexto(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "no-usar")
    monkeypatch.setenv("POLIS_IA_MODELO", "proveedor-inexistente:modelo-inexistente")

    def prohibido(*a, **kw):
        raise AssertionError("No deben invocarse otras tools")

    monkeypatch.setattr(pdd, "_evaluacion_pdt_gbr", prohibido)
    resultado = asyncio.run(pdd.ejecutar_ppi_por_corte(ctx.consulta, ctx.corte, ctx.catalogo, ctx.ppi))
    assert resultado == asyncio.run(pdd.ejecutar_ppi_por_corte(ctx.consulta, ctx.corte, ctx.catalogo, ctx.ppi))
    assert resultado["uso"]["requests"] == 2
    assert [h["herramienta"] for h in resultado["herramientas_invocadas"]] == ["tool_conciliar_ppi_plan"]
    assert resultado["alcance"] == "SOLO_PPI_FORMULADO_POR_CORTE_SIN_SQL"
    assert resultado["estado_publicacion"] == "no_publicable"


def test_grafo_recibe_ppi_y_declara_otras_tools_vivas(tmp_path, monkeypatch):
    ctx = contexto(tmp_path)
    monkeypatch.setenv("POLIS_IA_MODELO", "test")
    original = pdd._run_agent

    async def run(agentes, key, ctx):
        if key in {"reconstructor_causal_mga", "taxonomo_neurosimbolico_sh"}:
            return await original(agentes, key, ctx)
        if key == "auditor_financiero_ppi":
            assert ctx.ppi is not None
            planes = await pdd._query_ppi(ctx)
            pdd._record(ctx, "tool_conciliar_ppi_plan", {}, planes)
        if key == "lector_semantico_documental":
            ctx.resultados["tool_buscar_evidencia_paginas_pdd"] = [{"sha256_contenido": "a" * 64}]
        return ""

    monkeypatch.setattr(pdd, "_run_agent", run)
    result = asyncio.run(
        pdd.ejecutar_consulta_pdd(ctx.session, ctx.consulta, corte=ctx.corte, catalogo=ctx.catalogo, ppi=ctx.ppi)
    )
    assert "NODOS_METAS_Y_PPI_POR_CORTE" in result["alcance_corte"]
    assert "PUEDEN_USAR_SQL_VIVO" in result["alcance_corte"]
    assert result["cobertura_financiera"]["ppi_sha256"] == ctx.ppi.captura.stem
    assert len(result["dictamen_forense_detallado"]["planes_analizados"]) == 3


def test_grafo_rechaza_ppi_sin_corte_antes_de_construir_agentes(tmp_path, monkeypatch):
    ctx = contexto(tmp_path)

    def prohibido(*a, **kw):
        raise AssertionError("Validar antes de construir agentes")

    monkeypatch.setattr(pdd, "_build_agents", prohibido)
    with pytest.raises(ValueError, match="requiere corte"):
        asyncio.run(pdd.ejecutar_consulta_pdd(ctx.session, ctx.consulta, ppi=ctx.ppi, catalogo=ctx.catalogo))
