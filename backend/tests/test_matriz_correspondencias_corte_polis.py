"""La matriz congelada conserva cobertura, evidencia y lectura offline por run_id."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.correspondencias_meta_pa_polis import (
    FilaMatrizCorrespondencias,
    resumir_matriz_correspondencias,
)
from app.modules.compromisos.matriz_correspondencias_corte_polis import (
    InstantaneaCorrespondencias,
    ReferenciaMatrizPlaneacion,
    escribir_instantanea,
    escribir_recibo_planeacion,
    leer_matriz_del_corte,
    verificar_planeacion_y_serie,
)
from app.modules.compromisos.series_7d_polis import RegistroSerie7D
from scripts import congelar_matriz_correspondencias_polis as exportador


def _fila(meta_id: uuid.UUID, actividad_id: uuid.UUID | None = None) -> FilaMatrizCorrespondencias:
    return FilaMatrizCorrespondencias(
        codigo_plan="PDD_PRUEBA",
        meta_id=meta_id,
        codigo_meta="M1",
        nombre_meta="Meta sintética",
        tipo_meta="RESULTADO",
        indicador_meta="Personas atendidas",
        nodo_plan_nivel=None,
        nodo_plan_nombre=None,
        programa_pdd_id=None,
        programa_pdd_nombre=None,
        actividad_pa_id=actividad_id,
        codigo_actividad_pa="PA1" if actividad_id else None,
        programa_pa_nombre=None,
        codigo_bpim="BP1" if actividad_id else None,
        vigencia=2024 if actividad_id else None,
        tipo_vinculo_heredado="INFERIDO",
        estado_correspondencia="CANDIDATO_BPIM_VIGENCIA" if actividad_id else "SIN_ACTIVIDAD_PA_IDENTIFICADA",
        documento_evidencia=None,
        pagina_evidencia=None,
    )


def _captura(filas) -> InstantaneaCorrespondencias:
    return InstantaneaCorrespondencias(
        base_origen="polis_test_sintetica",
        metas_fuente_por_plan={"PDD_PRUEBA": len({f.meta_id for f in filas})},
        matriz=resumir_matriz_correspondencias(filas),
    )


def _json(ruta: Path, datos: dict) -> str:
    contenido = (json.dumps(datos, sort_keys=True) + "\n").encode()
    ruta.write_bytes(contenido)
    return hashlib.sha256(contenido).hexdigest()


def _contexto(tmp_path: Path, captura: Path, sha: str, serie: Path | None = None) -> tuple[ContextoCorte, Path]:
    inventario = tmp_path / "inventario.json"
    archivos = [{"ruta": str(captura), "sha256": sha}]
    fuentes = []
    if serie:
        archivos.append({"ruta": str(serie), "sha256": serie.stem})
        fuentes = [{"fuente_clave": "sintetica", "sha256_contenido": "a" * 64}]
    sha_inventario = _json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "archivos": archivos,
            "fuentes": fuentes,
        },
    )
    run_id = uuid.uuid4()
    corte = tmp_path / "corte.json"
    sha_corte = _json(
        corte,
        {
            "run_id": str(run_id),
            "inventario_sha256": sha_inventario,
            "evaluacion_sha256": "a" * 64,
            "consolidado_sha256": "b" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": 1,
            "versiones": [{**f, "version_id": "version-sintetica"} for f in fuentes],
        },
    )
    return ContextoCorte(run_id, corte, sha_corte), inventario


def test_planeacion_y_serie_comparten_corte_sin_inventar_vinculo(tmp_path):
    ruta, sha = escribir_instantanea(_captura([_fila(uuid.uuid4(), uuid.uuid4())]), tmp_path)
    fila = RegistroSerie7D(
        observacion_sha256="b" * 64,
        fuente_clave="sintetica",
        version_fuente_sha256="a" * 64,
        indicador="Hechos sintéticos",
        subtipo=None,
        dimension="PERS",
        estado_clasificacion="exacta",
        anio=2024,
        tipo_fecha="hecho",
        territorio_id="13001",
        ambito_original="municipio",
        valor_original="2",
        unidad_original="casos",
        unidad_observacion="hecho",
        numerador="2",
        denominador=None,
        tasa_por_100000=None,
        metodo="observacion_agregada_sin_suma_entre_fuentes",
        grupo_comparabilidad="c" * 20,
        estado_comparabilidad="misma_fuente_unidad_y_base",
        advertencias=[],
        provisional=False,
        fuente_url=None,
    )
    contenido = (fila.model_dump_json() + "\n").encode()
    sha_serie = hashlib.sha256(contenido).hexdigest()
    serie = tmp_path / f"{sha_serie}.jsonl"
    serie.write_bytes(contenido)
    _json(
        serie.with_suffix(".manifest.json"),
        {
            "esquema": "polis.series_7d.v1",
            "salida_sha256": sha_serie,
            "filas": 1,
        },
    )
    contexto, inventario = _contexto(tmp_path, ruta, sha, serie)
    resultado = verificar_planeacion_y_serie(contexto, inventario, ruta, serie)
    assert resultado.run_id == str(contexto.run_id)
    assert resultado.instantanea_sha256 == sha
    assert resultado.serie_sha256 == sha_serie
    assert resultado.pares_candidatos == 1 and resultado.pares_acreditados == 0
    assert resultado.filas_serie == 1 and resultado.fuentes_serie == 1
    assert resultado.estado_publicacion == "no_publicable"
    assert "no une indicadores a metas" in resultado.alcance
    recibo = escribir_recibo_planeacion(resultado, tmp_path / "recibos")
    assert escribir_recibo_planeacion(resultado, tmp_path / "recibos") == recibo
    resultado.pares_acreditados = 1
    with pytest.raises(ValueError, match="Artefacto existente alterado"):
        escribir_recibo_planeacion(resultado, tmp_path / "recibos")


def test_congela_relacion_1n_y_ausencia_sin_depender_del_orden(tmp_path):
    meta, sin_pa = uuid.uuid4(), uuid.uuid4()
    filas = [_fila(meta, uuid.uuid4()), _fila(meta, uuid.uuid4()), _fila(sin_pa)]
    captura = _captura(filas)
    ruta, sha = escribir_instantanea(captura, tmp_path)
    assert escribir_instantanea(_captura(list(reversed(filas))), tmp_path) == (ruta, sha)
    contexto, inventario = _contexto(tmp_path, ruta, sha)
    resultado = leer_matriz_del_corte(contexto, inventario, ruta)
    assert resultado.run_id == str(contexto.run_id)
    assert resultado.matriz.metas_distintas == 2
    assert resultado.matriz.metas_sin_pa == 1
    assert resultado.matriz.metas_con_multiples_actividades == 1
    assert resultado.estado_publicacion == "no_publicable"
    assert resultado.base_origen == "polis_test_sintetica"
    ruta.write_text("{}")
    with pytest.raises(ValueError, match="instantánea alterado"):
        leer_matriz_del_corte(contexto, inventario, ruta)


def test_rechaza_mezcla_de_inventarios_y_archivo_no_inventariado(tmp_path):
    ruta, sha = escribir_instantanea(_captura([_fila(uuid.uuid4())]), tmp_path)
    contexto, inventario = _contexto(tmp_path, ruta, "c" * 64)
    with pytest.raises(ValueError, match="no está registrada"):
        leer_matriz_del_corte(contexto, inventario, ruta)
    _json(inventario, {"archivos": [{"ruta": str(ruta), "sha256": sha}]})
    with pytest.raises(ValueError, match="Inventario distinto"):
        leer_matriz_del_corte(contexto, inventario, ruta)


def test_rechaza_cobertura_incompleta_duplicados_y_acreditacion_sin_sha():
    fila = _fila(uuid.uuid4(), uuid.uuid4())
    with pytest.raises(ValueError, match="duplicado"):
        _captura([fila, fila])
    datos = _captura([fila]).model_dump()
    datos["metas_fuente_por_plan"]["PDD_PRUEBA"] = 2
    with pytest.raises(ValueError, match="Cobertura de metas"):
        InstantaneaCorrespondencias.model_validate(datos)
    datos["metas_fuente_por_plan"]["PDD_PRUEBA"] = 1
    datos["matriz"]["metas_sin_pa"] = 1
    with pytest.raises(ValueError, match="Resumen de matriz"):
        InstantaneaCorrespondencias.model_validate(datos)
    fila.estado_correspondencia = "ACREDITADO_DOCUMENTAL"
    fila.documento_evidencia = "Documento sintético.pdf"
    fila.pagina_evidencia = 12
    with pytest.raises(ValueError, match="Acreditación sin documento, página y SHA"):
        _captura([fila])
    fila.sha256_documento = "d" * 64
    assert _captura([fila]).matriz.filas[0].sha256_documento == "d" * 64
    datos = _captura([fila]).model_dump()
    datos["modo_matriz"] = "CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR"
    with pytest.raises(ValueError, match="no puede contener acreditaciones"):
        InstantaneaCorrespondencias.model_validate(datos)


def test_tool_pydanticai_lee_corte_sin_sql_y_cuenta_universo_antes_de_muestrear(tmp_path, monkeypatch):
    from app.modules.compromisos import agentes_inteligentes_pdd as pdd

    monkeypatch.setenv("POLIS_IA_MODELO", "test")
    filas = [_fila(uuid.uuid4(), uuid.uuid4()) for _ in range(45)] + [_fila(uuid.uuid4())]
    ruta, sha = escribir_instantanea(_captura(filas), tmp_path)
    corte, inventario = _contexto(tmp_path, ruta, sha)
    referencia = ReferenciaMatrizPlaneacion(inventario, ruta)
    ctx = pdd.ToolContext(
        session=object(),
        consulta=pdd.ConsultaAgentesPDD(pregunta="¿Qué actividades tiene el plan?"),
        corte=corte,
        planeacion=referencia,
    )
    agente = pdd._build_agents(ctx)["articulador_operativo_bpim"]

    async def escenario():
        await agente.run("Consultar articulación del plan", deps=ctx)
        muestra = ctx.resultados["tool_cruzar_actividades_pa_bpim"]
        assert len(muestra) == pdd.MAX_RESULTADOS
        assert all(fila["instantanea_sha256"] == sha for fila in muestra)
        cobertura = ctx.cobertura_universo_operativo
        assert cobertura["metas_distintas"] == 46 and cobertura["metas_sin_pa_identificado"] == 1
        assert cobertura["pares_meta_pa_sin_truncar"] == 45 and cobertura["muestra_truncada"] is True
        assert cobertura["suma_compromisos_universo_filtrado_cop"] is None
        assert cobertura["promedio_avance_fisico_universo_filtrado_pct"] is None
        ctx.consulta.codigo_plan = "PLAN_NO_PRESENTE"
        assert await pdd._query_actividades(ctx) == []
        ctx.consulta.dimension_sh = "Personal"
        with pytest.raises(ValueError, match="no contiene clasificación"):
            await pdd._query_actividades(ctx)
        ctx.consulta.dimension_sh = "TODAS"
        ruta.write_text("{}")
        with pytest.raises(ValueError, match="instantánea alterado"):
            await pdd._query_actividades(ctx)

    asyncio.run(escenario())


def test_grafo_pdd_integra_tool_congelada_y_declara_alcance_mixto(tmp_path, monkeypatch):
    from app.modules.compromisos import agentes_inteligentes_pdd as pdd

    monkeypatch.setenv("POLIS_IA_MODELO", "test")
    ruta, sha = escribir_instantanea(_captura([_fila(uuid.uuid4(), uuid.uuid4())]), tmp_path)
    corte, inventario = _contexto(tmp_path, ruta, sha)
    referencia = ReferenciaMatrizPlaneacion(inventario, ruta)
    original = pdd._run_agent
    outputs = {
        "lector_semantico_documental": ("tool_buscar_evidencia_paginas_pdd", [{"sha256_contenido": "a" * 64}]),
        "reconstructor_causal_mga": ("tool_consultar_metas_oficiales", []),
        "taxonomo_neurosimbolico_sh": ("tool_consultar_nodos_mga", []),
        "auditor_financiero_ppi": ("tool_conciliar_ppi_plan", []),
    }

    async def ejecutar(agentes, key, ctx):
        if key == "articulador_operativo_bpim":
            return await original(agentes, key, ctx)
        if key in outputs:
            herramienta, valor = outputs[key]
            ctx.resultados[herramienta] = valor
        return ""

    monkeypatch.setattr(pdd, "_run_agent", ejecutar)
    consulta = pdd.ConsultaAgentesPDD(pregunta="¿Cómo se articulan las metas del plan?")
    resultado = asyncio.run(pdd.ejecutar_consulta_pdd(object(), consulta, corte=corte, planeacion=referencia))
    assert resultado["run_id"] == str(corte.run_id)
    assert resultado["alcance_corte"] == "ARTICULACION_PA_POR_CORTE_OTRAS_CONSULTAS_SQL_EN_VIVO"
    assert resultado["cobertura_universo_operativo"]["instantanea_sha256"] == sha
    assert len(resultado["evidencia_financiera_y_metas"]["articulacion_pa_bpim"]) == 1
    with pytest.raises(ValueError, match="requiere corte"):
        asyncio.run(pdd.ejecutar_consulta_pdd(object(), consulta, planeacion=referencia))


@pytest.mark.integration
def test_exportador_impide_escritura_sql_incluso_sin_filas_afectadas(database_url, tmp_path, monkeypatch):
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", database_url)

    async def escritura_prohibida(session, **kwargs):
        await session.execute(text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE FALSE"))
        pytest.fail("La transacción permitió una escritura")

    monkeypatch.setattr(exportador, "consultar_matriz_correspondencias", escritura_prohibida)
    with pytest.raises(DBAPIError, match="read-only"):
        asyncio.run(exportador.congelar(tmp_path))
    assert not list(tmp_path.iterdir())
