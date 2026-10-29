"""Integridad, cobertura y tools offline del catálogo de planificación congelado."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection

from app.modules.compromisos import agentes_inteligentes_pdd as pdd
from app.modules.compromisos.catalogo_planeacion_corte_polis import (
    CatalogoPlaneacion,
    ReferenciaCatalogoPlaneacion,
    comprobar_matriz_y_catalogo,
    escribir_catalogo,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.correspondencias_meta_pa_polis import (
    FilaMatrizCorrespondencias,
    resumir_matriz_correspondencias,
)
from app.modules.compromisos.matriz_correspondencias_corte_polis import MatrizDelCorte
from scripts import congelar_catalogo_planeacion_polis as exportador


def _catalogo(total=1):
    nodo = {
        "id": str(uuid.uuid4()),
        "codigo_plan": "PDD_PRUEBA",
        "parent_id": None,
        "nivel": "PROGRAMA",
        "codigo": "P1",
        "nombre": "Programa de atención ciudadana",
        "orden": 0,
        "ppi_anual_cop": {"2024": None},
        "fuente": None,
        "metadatos": {"dimension_sh_primaria": "Seguridad Personal", "grado_frontalidad_sh": "A_DIRECTA"},
    }
    metas = [
        {
            "id": str(uuid.uuid4()),
            "codigo_plan": "PDD_PRUEBA",
            "linea_id": nodo["id"],
            "tipo_meta": "RESULTADO",
            "codigo": f"M{i}",
            "nombre": "Atención ciudadana",
            "indicador": "Personas atendidas",
            "unidad_medida": "personas",
            "linea_nombre": None,
            "fuente": None,
            "fila_fuente": i if i else None,
            "datos_oficiales": {"linea_base": None, "meta_cuatrienio": "100", "valor_textual": "001.20"},
        }
        for i in range(total)
    ]
    return CatalogoPlaneacion(
        base_origen="polis_test_sintetica",
        cobertura_sql={"PDD_PRUEBA": {"nodos": 1, "metas": total}},
        nodos=[nodo],
        metas=metas,
    )


def _json(ruta, datos):
    contenido = json.dumps(datos, sort_keys=True).encode()
    ruta.write_bytes(contenido)
    return hashlib.sha256(contenido).hexdigest()


def _referencia(tmp_path, catalogo):
    ruta, sha = escribir_catalogo(catalogo, tmp_path / "catalogos")
    inventario = tmp_path / "inventario.json"
    sha_inventario = _json(
        inventario,
        {
            "esquema": "polis.inventario_fuentes.v1",
            "archivos": [{"ruta": str(ruta), "sha256": sha}],
        },
    )
    run_id = uuid.uuid4()
    manifiesto = tmp_path / "corte.json"
    sha_corte = _json(
        manifiesto,
        {
            "run_id": str(run_id),
            "inventario_sha256": sha_inventario,
            "evaluacion_sha256": "a" * 64,
            "consolidado_sha256": "b" * 64,
            "estado_calidad": "ambar",
            "estado_publicacion": "no_publicable",
            "artefactos_inventariados": 1,
            "versiones": [],
        },
    )
    return ContextoCorte(run_id, manifiesto, sha_corte), ReferenciaCatalogoPlaneacion(inventario, ruta)


def test_catalogo_estable_nulos_y_valores_textuales_sin_convertir(tmp_path):
    catalogo = _catalogo(42)
    ruta, sha = escribir_catalogo(catalogo, tmp_path)
    catalogo.metas.reverse()
    assert escribir_catalogo(catalogo, tmp_path) == (ruta, sha)
    copia = CatalogoPlaneacion.model_validate_json(ruta.read_bytes())
    assert copia.metas[0].datos_oficiales["linea_base"] is None
    assert copia.metas[0].datos_oficiales["valor_textual"] == "001.20"
    assert copia.nodos[0].ppi_anual_cop == {"2024": None}


@pytest.mark.parametrize("defecto", ["duplicado", "conteo", "ciclo", "otro_plan", "ausente"])
def test_catalogo_rechaza_integridad_rota(defecto):
    datos = _catalogo().model_dump(mode="json")
    if defecto == "duplicado":
        datos["metas"].append(datos["metas"][0])
    elif defecto == "conteo":
        datos["cobertura_sql"]["PDD_PRUEBA"]["metas"] = 2
    elif defecto == "ciclo":
        datos["nodos"][0]["parent_id"] = datos["nodos"][0]["id"]
    elif defecto == "otro_plan":
        datos["cobertura_sql"]["PDL_PRUEBA"] = {"nodos": 0, "metas": 1}
        datos["cobertura_sql"]["PDD_PRUEBA"]["metas"] = 0
        datos["metas"][0]["codigo_plan"] = "PDL_PRUEBA"
    else:
        datos["metas"][0]["linea_id"] = str(uuid.uuid4())
    with pytest.raises(ValueError):
        CatalogoPlaneacion.model_validate(datos)


def test_catalogo_rechaza_archivo_alterado_o_inventario_ajeno(tmp_path):
    corte, referencia = _referencia(tmp_path, _catalogo())
    assert len(referencia.leer(corte).metas) == 1
    original = referencia.catalogo.read_bytes()
    referencia.catalogo.write_bytes(original + b" ")
    with pytest.raises(ValueError, match="alterado"):
        referencia.leer(corte)
    referencia.catalogo.write_bytes(original)
    referencia.inventario.write_text("{}")
    with pytest.raises(ValueError, match="Inventario distinto"):
        referencia.leer(corte)


def test_catalogo_exige_pertenencia_y_corte(tmp_path):
    corte, referencia = _referencia(tmp_path, _catalogo())
    otra_ruta, _ = escribir_catalogo(_catalogo(), tmp_path / "otro")
    with pytest.raises(ValueError, match="no está registrado"):
        ReferenciaCatalogoPlaneacion(referencia.inventario, otra_ruta).leer(corte)
    ctx = pdd.ToolContext(None, pdd.ConsultaAgentesPDD(pregunta="Listar programas"), catalogo=referencia)
    with pytest.raises(ValueError, match="requiere corte"):
        asyncio.run(pdd._query_nodos(ctx))


def test_tools_offline_muestreo_filtros_y_cobertura_completa(tmp_path):
    corte, referencia = _referencia(tmp_path, _catalogo(45))
    consulta = pdd.ConsultaAgentesPDD(pregunta="Atención ciudadana", dimension_sh="Personal", grado_frontalidad="A")
    ctx = pdd.ToolContext(None, consulta, corte=corte, catalogo=referencia)
    assert len(asyncio.run(pdd._query_nodos(ctx))) == 1
    assert ctx.cobertura_nodos["etiquetas_dimension_consultadas"] == ["Personal", "Seguridad Personal"]
    consulta.dimension_sh = "Seguridad Personal"
    assert len(asyncio.run(pdd._query_nodos(ctx))) == 1
    metas = asyncio.run(pdd._query_metas(ctx))
    assert len(metas) == 40
    assert ctx.cobertura_universo_bd["metas_por_plan_totales"] == {"PDD_PRUEBA": 45}
    assert ctx.cobertura_universo_bd["total_metas_coincidentes_sin_truncar"] == 45
    assert ctx.cobertura_universo_bd["muestra_truncada"] is True
    assert metas[0]["fila_fuente"] == 1  # NULLS LAST y desempate por id estable.
    consulta.dimension_sh = "Ambiental"
    assert asyncio.run(pdd._query_nodos(ctx)) == []
    assert len(asyncio.run(pdd._query_metas(ctx))) == 40  # No se inventa clasificación de metas.
    consulta.dimension_sh = "PERS"
    with pytest.raises(ValueError, match="clasificación SH heredada"):
        asyncio.run(pdd._query_nodos(ctx))
    consulta.dimension_sh = "TODAS"
    consulta.codigo_plan = "NO_EXISTE"
    assert asyncio.run(pdd._query_metas(ctx)) == []
    assert ctx.cobertura_universo_bd["metas_por_plan_totales"] == {}


def test_agent_local_ejecuta_ambas_tools_sin_sql_ni_proveedor(tmp_path, monkeypatch):
    corte, referencia = _referencia(tmp_path, _catalogo(45))
    monkeypatch.setenv("OPENAI_API_KEY", "no-utilizar-proveedor")
    monkeypatch.setenv("POLIS_IA_MODELO", "proveedor-inexistente:modelo-inexistente")
    consulta = pdd.ConsultaAgentesPDD(pregunta="Atención ciudadana")
    resultado = asyncio.run(pdd.ejecutar_catalogo_por_corte(consulta, corte, referencia))
    assert resultado == asyncio.run(pdd.ejecutar_catalogo_por_corte(consulta, corte, referencia))
    assert resultado["uso"]["requests"] == 3
    assert resultado["estado_publicacion"] == "no_publicable"
    assert resultado["catalogo_sha256"] == referencia.catalogo.stem
    assert {h["herramienta"] for h in resultado["herramientas_invocadas"]} == {
        "tool_consultar_nodos_mga",
        "tool_consultar_metas_oficiales",
    }


def test_grafo_integra_catalogo_y_declara_consultas_aun_en_vivo(tmp_path, monkeypatch):
    corte, referencia = _referencia(tmp_path, _catalogo(45))
    monkeypatch.setenv("POLIS_IA_MODELO", "test")
    original = pdd._run_agent

    async def ejecutar(agentes, key, ctx):
        if key in {"reconstructor_causal_mga", "taxonomo_neurosimbolico_sh"}:
            return await original(agentes, key, ctx)
        if key == "lector_semantico_documental":
            ctx.resultados["tool_buscar_evidencia_paginas_pdd"] = [{"sha256_contenido": "a" * 64}]
        if key == "auditor_financiero_ppi":
            ctx.resultados["tool_conciliar_ppi_plan"] = []
        return ""

    monkeypatch.setattr(pdd, "_run_agent", ejecutar)
    consulta = pdd.ConsultaAgentesPDD(pregunta="Atención ciudadana")
    resultado = asyncio.run(pdd.ejecutar_consulta_pdd(object(), consulta, corte=corte, catalogo=referencia))
    assert resultado["run_id"] == str(corte.run_id)
    assert resultado["alcance_corte"] == "NODOS_Y_METAS_POR_CORTE_OTRAS_CONSULTAS_SQL_EN_VIVO"
    evidencia = resultado["evidencia_financiera_y_metas"]
    assert evidencia["cobertura_universo_bd"]["total_metas_coincidentes_sin_truncar"] == 45
    assert evidencia["cobertura_nodos"]["nodos_incluidos_en_muestra"] == 1
    assert len(evidencia["metas_destacadas"]) == 20
    with pytest.raises(ValueError, match="requiere corte"):
        asyncio.run(pdd.ejecutar_consulta_pdd(object(), consulta, catalogo=referencia))
    referencia.catalogo.write_text("{}")
    with pytest.raises(ValueError, match="alterado"):
        asyncio.run(pdd.ejecutar_consulta_pdd(object(), consulta, corte=corte, catalogo=referencia))


def test_consulta_ppi_no_sobrescribe_cobertura_de_metas_con_sql_vivo(tmp_path):
    corte, referencia = _referencia(tmp_path, _catalogo(45))
    consultas = []

    class SessionFinanciera:
        async def execute(self, statement, *args, **kwargs):
            consultas.append(str(statement))
            assert "pdd_metas_oficiales" not in str(statement)
            return self

        def mappings(self):
            return self

        def all(self):
            return []

    ctx = pdd.ToolContext(
        SessionFinanciera(), pdd.ConsultaAgentesPDD(pregunta="Atención ciudadana"), corte=corte, catalogo=referencia
    )
    assert asyncio.run(pdd._query_ppi(ctx)) == []
    assert len(consultas) == 1
    assert ctx.cobertura_universo_bd["metas_por_plan_totales"] == {"PDD_PRUEBA": 45}
    assert ctx.cobertura_universo_bd["metas_incluidas_en_muestra"] == 40


def test_matriz_y_catalogo_exigen_mismas_identidades_y_jerarquia():
    catalogo = _catalogo()
    meta, nodo = catalogo.metas[0], catalogo.nodos[0]
    fila = FilaMatrizCorrespondencias(
        codigo_plan=meta.codigo_plan,
        meta_id=meta.id,
        codigo_meta=meta.codigo,
        nombre_meta=meta.nombre,
        tipo_meta=meta.tipo_meta,
        indicador_meta=meta.indicador,
        nodo_plan_nivel=nodo.nivel,
        nodo_plan_nombre=nodo.nombre,
        programa_pdd_id=nodo.id,
        programa_pdd_nombre=nodo.nombre,
        actividad_pa_id=None,
        codigo_actividad_pa=None,
        programa_pa_nombre=None,
        codigo_bpim=None,
        vigencia=None,
        tipo_vinculo_heredado="INFERIDO",
        estado_correspondencia="SIN_ACTIVIDAD_PA_IDENTIFICADA",
        documento_evidencia=None,
        pagina_evidencia=None,
    )
    matriz = MatrizDelCorte(
        run_id=str(uuid.uuid4()),
        instantanea_sha256="a" * 64,
        base_origen=catalogo.base_origen,
        modo_matriz="MATERIALIZADA",
        matriz=resumir_matriz_correspondencias([fila]),
    )
    comprobar_matriz_y_catalogo(catalogo, matriz)
    matriz.matriz.filas[0].nombre_meta = "Nombre de otra edición"
    with pytest.raises(ValueError, match="Identidad de meta"):
        comprobar_matriz_y_catalogo(catalogo, matriz)
    matriz.matriz.filas[0].nombre_meta = meta.nombre
    matriz.matriz.filas[0].programa_pdd_id = None
    with pytest.raises(ValueError, match="Programa de meta"):
        comprobar_matriz_y_catalogo(catalogo, matriz)


def test_exportador_requiere_base_de_prueba_o_produccion_explicita(tmp_path, monkeypatch):
    monkeypatch.delenv("POLIS_TEST_DATABASE_URL", raising=False)
    with pytest.raises(ValueError, match="lectura explícita"):
        asyncio.run(exportador.congelar(tmp_path))
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", "postgresql+asyncpg://localhost/bd_csh")
    with pytest.raises(ValueError, match="polis_test"):
        asyncio.run(exportador.congelar(tmp_path, produccion=True))


@pytest.mark.integration
def test_exportador_transaccion_readonly_real(database_url, tmp_path, monkeypatch):
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", database_url)
    ejecutar = AsyncConnection.execute

    async def interceptar(conn, statement, *args, **kwargs):
        if "SELECT p.codigo_plan" in str(statement):
            assert await conn.scalar(text("SHOW transaction_read_only")) == "on"
            assert await conn.scalar(text("SHOW transaction_isolation")) == "repeatable read"
            return await ejecutar(conn, text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE FALSE"))
        return await ejecutar(conn, statement, *args, **kwargs)

    monkeypatch.setattr(AsyncConnection, "execute", interceptar)
    with pytest.raises(DBAPIError, match="read-only"):
        asyncio.run(exportador.congelar(tmp_path))
    assert not list(tmp_path.iterdir())
