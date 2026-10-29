"""Persistencia 1:N, idempotencia y rollback real de candidatos meta–PA."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.compromisos.correspondencias_meta_pa_polis import (
    CorrespondenciasRepository,
    consultar_matriz_correspondencias,
    sincronizar_correspondencias,
)
from app.modules.compromisos.models import ActividadPlanAccion
from scripts import sincronizar_catalogo_pdd

pytestmark = pytest.mark.integration


async def _sembrar(engine, code: str) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    meta_id, vinculo_id, actividad_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    async with engine.begin() as conn:
        base = (
            (
                await conn.execute(
                    text(
                        "SELECT id, codigo_bpim, vigencia FROM seguimiento.actividades_plan_accion ORDER BY id LIMIT 1"
                    )
                )
            )
            .mappings()
            .one()
        )
        columnas = [col.name for col in ActividadPlanAccion.__table__.columns if col.name not in {"id", "codigo"}]
        lista = ", ".join(columnas)
        await conn.execute(
            text(
                f"INSERT INTO seguimiento.actividades_plan_accion (id, codigo, {lista}) "
                f"SELECT :id, :codigo, {lista} FROM seguimiento.actividades_plan_accion WHERE id=:base"
            ),
            {"id": actividad_id, "codigo": f"PA-{code}", "base": base["id"]},
        )
        await conn.execute(
            text(
                """
                INSERT INTO seguimiento.planes_desarrollo_distrital
                  (codigo_plan, periodo, nombre_oficial, tipo_plan)
                VALUES (:code, '2024-2027', 'Plan de prueba 1:N', 'PDD')
                """
            ),
            {"code": code},
        )
        await conn.execute(
            text(
                """
                INSERT INTO seguimiento.pdd_metas_oficiales
                  (id, codigo_plan, tipo_meta, codigo, nombre)
                VALUES (:id, :code, 'RESULTADO', 'M-1', 'Meta sintética de prueba')
                """
            ),
            {"id": meta_id, "code": code},
        )
        await conn.execute(
            text(
                """
                INSERT INTO seguimiento.pdd_vinculos_meta_pa_triada
                  (id, codigo_plan, meta_id, codigo_meta, codigo_bpim, vigencia,
                   tipo_vinculo, score_confianza)
                VALUES (:id, :code, :meta, 'M-1', :bpim, :anio,
                        'VINCULO_SECTORIAL_INFERIDO', 0.55)
                """
            ),
            {
                "id": vinculo_id,
                "code": code,
                "meta": meta_id,
                "bpim": base["codigo_bpim"],
                "anio": base["vigencia"],
            },
        )
    return meta_id, vinculo_id, actividad_id, base["id"]


async def _contar(engine, meta_id: uuid.UUID) -> int:
    async with engine.connect() as conn:
        return await conn.scalar(
            text("SELECT count(*) FROM seguimiento.pdd_correspondencias_meta_pa_bpim WHERE meta_id=:meta"),
            {"meta": meta_id},
        )


def test_correspondencias_1n_idempotentes_y_rollback_otra_sesion(prepared_test_database, monkeypatch):
    if prepared_test_database is None:
        pytest.skip("Se requiere POLIS_TEST_DATABASE_URL")

    async def escenario() -> None:
        engine = create_async_engine(prepared_test_database)
        code = f"TEST_1N_{uuid.uuid4().hex[:8]}"
        old_code = f"TEST_OLD_{uuid.uuid4().hex[:8]}"
        programa_id, subprograma_id, sin_pa_id, sin_pa_vinculo_id = (
            uuid.uuid4(),
            uuid.uuid4(),
            uuid.uuid4(),
            uuid.uuid4(),
        )
        old_meta_id, old_vinculo_id = uuid.uuid4(), uuid.uuid4()
        nueva_linea_id = uuid.uuid4()
        meta_id = vinculo_id = actividad_id = None
        try:
            meta_id, vinculo_id, actividad_id, _ = await _sembrar(engine, code)
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_lineas_y_programas
                          (id, codigo_plan, nivel, codigo, nombre)
                        VALUES (:id, :code, 'PROGRAMA', 'P-1', 'Programa de prueba')
                        """
                    ),
                    {"id": programa_id, "code": code},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_lineas_y_programas
                          (id, codigo_plan, parent_id, nivel, codigo, nombre)
                        VALUES (:id, :code, :padre, 'SUBPROGRAMA', 'SP-1', 'Subprograma de prueba')
                        """
                    ),
                    {"id": subprograma_id, "code": code, "padre": programa_id},
                )
                await conn.execute(
                    text("UPDATE seguimiento.pdd_metas_oficiales SET linea_id=:linea WHERE id=:meta"),
                    {"linea": subprograma_id, "meta": meta_id},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_metas_oficiales
                          (id, codigo_plan, tipo_meta, codigo, nombre)
                        VALUES (:id, :code, 'RESULTADO', 'M-2', 'Meta sin actividad PA')
                        """
                    ),
                    {"id": sin_pa_id, "code": code},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_vinculos_meta_pa_triada
                          (id, codigo_plan, meta_id, codigo_meta, tipo_vinculo, score_confianza)
                        VALUES (:id, :code, :meta, 'M-2', 'PROGRAMA_Y_DEPENDENCIA_ACREDITADOS', 0.78)
                        """
                    ),
                    {"id": sin_pa_vinculo_id, "code": code, "meta": sin_pa_id},
                )
                pa_base = (
                    (
                        await conn.execute(
                            text("SELECT codigo_bpim, vigencia FROM seguimiento.actividades_plan_accion WHERE id=:id"),
                            {"id": actividad_id},
                        )
                    )
                    .mappings()
                    .one()
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.planes_desarrollo_distrital
                          (codigo_plan, periodo, nombre_oficial, tipo_plan)
                        VALUES (:code, '2012–2015', 'Plan histórico de prueba', 'PDD')
                        """
                    ),
                    {"code": old_code},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_metas_oficiales
                          (id, codigo_plan, tipo_meta, codigo, nombre)
                        VALUES (:id, :code, 'RESULTADO', 'M-OLD', 'Meta histórica de prueba')
                        """
                    ),
                    {"id": old_meta_id, "code": old_code},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_vinculos_meta_pa_triada
                          (id, codigo_plan, meta_id, codigo_meta, codigo_bpim, vigencia,
                           tipo_vinculo, score_confianza)
                        VALUES (:id, :code, :meta, 'M-OLD', :bpim, :anio,
                                'VINCULO_SECTORIAL_INFERIDO', 0.55)
                        """
                    ),
                    {
                        "id": old_vinculo_id,
                        "code": old_code,
                        "meta": old_meta_id,
                        "bpim": pa_base["codigo_bpim"],
                        "anio": pa_base["vigencia"],
                    },
                )
            sessions = async_sessionmaker(engine, expire_on_commit=False)

            class FallarDespuesDeInsertar(CorrespondenciasRepository):
                async def insertar_candidatos(self, candidatos):
                    assert await super().insertar_candidatos(candidatos) >= 2
                    raise RuntimeError("fallo posterior a INSERT efectivo")

            async with sessions() as session:
                with pytest.raises(RuntimeError, match="posterior"):
                    await sincronizar_correspondencias(session, FallarDespuesDeInsertar(session))
            assert await _contar(engine, meta_id) == 0

            class CancelarDespuesDeInsertar(CorrespondenciasRepository):
                async def insertar_candidatos(self, candidatos):
                    assert await super().insertar_candidatos(candidatos) >= 2
                    raise asyncio.CancelledError()

            async with sessions() as session:
                with pytest.raises(asyncio.CancelledError):
                    await sincronizar_correspondencias(session, CancelarDespuesDeInsertar(session))
            assert await _contar(engine, meta_id) == 0

            class RespuestaInvalida(CorrespondenciasRepository):
                async def resumen(self):
                    result = await super().resumen()
                    return {**result, "total_matriz": -1}

            async with sessions() as session:
                with pytest.raises(ValidationError):
                    await sincronizar_correspondencias(session, RespuestaInvalida(session))
            assert await _contar(engine, meta_id) == 0

            async with sessions() as session:

                async def fallar_commit():
                    raise RuntimeError("commit fallido")

                session.commit = fallar_commit
                with pytest.raises(RuntimeError, match="commit fallido"):
                    await sincronizar_correspondencias(session)
            assert await _contar(engine, meta_id) == 0

            async with sessions() as session:
                primero = await sincronizar_correspondencias(session)
            assert primero.insertados >= 2
            assert primero.descartados_por_vigencia >= 2
            assert primero.metas_con_multiples_actividades >= 1
            assert primero.estado_publicacion == "no_publicable"
            assert await _contar(engine, meta_id) == 2
            assert await _contar(engine, old_meta_id) == 0

            for tabla, columna, valor in (
                ("pdd_metas_oficiales", "id", meta_id),
                ("actividades_plan_accion", "id", actividad_id),
                ("pdd_vinculos_meta_pa_triada", "id", vinculo_id),
            ):
                with pytest.raises(IntegrityError):
                    async with engine.begin() as conn:
                        await conn.execute(
                            text(f"DELETE FROM seguimiento.{tabla} WHERE {columna}=:valor"), {"valor": valor}
                        )
                assert await _contar(engine, meta_id) == 2

            class SettingsPrueba:
                async_database_url = prepared_test_database

            monkeypatch.setattr(sincronizar_catalogo_pdd, "Settings", SettingsPrueba)

            async def no_calentar_cache() -> int:
                return 0

            monkeypatch.setattr(sincronizar_catalogo_pdd, "warm_pdd_cache", no_calentar_cache)
            resumen_catalogo = await sincronizar_catalogo_pdd.synchronize(extracted=([], [], []))
            assert resumen_catalogo["metas_historicas_conservadas"] >= 2
            assert resumen_catalogo["lineas_nuevas"] == 0
            assert await _contar(engine, meta_id) == 2
            async with engine.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:code"),
                        {"code": code},
                    )
                    == 1
                )

            async with sessions() as session:
                segundo = await sincronizar_correspondencias(session)
            assert segundo.insertados == 0
            assert await _contar(engine, meta_id) == 2

            async with sessions() as session:
                matriz = await consultar_matriz_correspondencias(session, code)
            assert matriz.metas_distintas == 2
            assert matriz.metas_sin_pa == 1
            assert matriz.metas_con_multiples_actividades == 1
            assert len(matriz.filas) == 3
            assert {fila.programa_pdd_nombre for fila in matriz.filas if fila.meta_id == meta_id} == {
                "Programa de prueba"
            }
            sin_pa = next(fila for fila in matriz.filas if fila.meta_id == sin_pa_id)
            assert sin_pa.estado_correspondencia == "SIN_ACTIVIDAD_PA_IDENTIFICADA"
            assert sin_pa.tipo_vinculo_heredado == "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"
            assert all(fila.estado_correspondencia != "ACREDITADO_DOCUMENTAL" for fila in matriz.filas)
            async with sessions() as session:
                derivada = await consultar_matriz_correspondencias(session, code, derivar_candidatos=True)
            assert derivada.model_dump() == matriz.model_dump()
            async with sessions() as session:
                matriz_general = await consultar_matriz_correspondencias(session)
            assert {meta_id, sin_pa_id} <= {fila.meta_id for fila in matriz_general.filas}
            historica = next(fila for fila in matriz_general.filas if fila.meta_id == old_meta_id)
            assert historica.estado_correspondencia == "SIN_ACTIVIDAD_PA_IDENTIFICADA"
            assert historica.tipo_vinculo_heredado == "VINCULO_SECTORIAL_INFERIDO"

            with pytest.raises(IntegrityError):
                async with engine.begin() as conn:
                    await conn.execute(
                        text(
                            """
                            UPDATE seguimiento.pdd_correspondencias_meta_pa_bpim
                            SET estado_revision='ACREDITADO'
                            WHERE meta_id=:meta
                            """
                        ),
                        {"meta": meta_id},
                    )
            with pytest.raises(IntegrityError):
                async with engine.begin() as conn:
                    await conn.execute(
                        text(
                            """
                            UPDATE seguimiento.pdd_correspondencias_meta_pa_bpim
                            SET estado_revision='ACREDITADO', documento_evidencia='plan.pdf',
                                sha256_documento=:sha, revisor='Ana', fecha_revision=NOW()
                            WHERE meta_id=:meta
                            """
                        ),
                        {"meta": meta_id, "sha": "a" * 64},
                    )
            with pytest.raises(IntegrityError):
                async with engine.begin() as conn:
                    await conn.execute(
                        text(
                            """
                            UPDATE seguimiento.pdd_correspondencias_meta_pa_bpim
                            SET estado_revision='DESCARTADO' WHERE meta_id=:meta
                            """
                        ),
                        {"meta": meta_id},
                    )
            assert await _contar(engine, meta_id) == 2

            async with engine.begin() as conn:
                candidate_id = await conn.scalar(
                    text(
                        """
                        SELECT id FROM seguimiento.pdd_correspondencias_meta_pa_bpim
                        WHERE meta_id=:meta ORDER BY id LIMIT 1
                        """
                    ),
                    {"meta": meta_id},
                )
                await conn.execute(
                    text(
                        """
                        UPDATE seguimiento.pdd_correspondencias_meta_pa_bpim
                        SET estado_revision='ACREDITADO', documento_evidencia='plan.pdf',
                            pagina_evidencia=7, sha256_documento=:sha,
                            revisor='Auditora de prueba', fecha_revision=NOW()
                        WHERE id=:id
                        """
                    ),
                    {"id": candidate_id, "sha": "a" * 64},
                )
            async with sessions() as session:
                posterior = await sincronizar_correspondencias(session)
            assert posterior.insertados == 0
            async with engine.connect() as conn:
                estado = await conn.scalar(
                    text("SELECT estado_revision FROM seguimiento.pdd_correspondencias_meta_pa_bpim WHERE id=:id"),
                    {"id": candidate_id},
                )
            assert estado == "ACREDITADO"
            async with sessions() as session:
                revisada = await consultar_matriz_correspondencias(session, code)
            assert sum(fila.estado_correspondencia == "ACREDITADO_DOCUMENTAL" for fila in revisada.filas) == 1
            assert revisada.metas_con_multiples_actividades == 1
            assert (
                next(
                    fila.sha256_documento
                    for fila in revisada.filas
                    if fila.estado_correspondencia == "ACREDITADO_DOCUMENTAL"
                )
                == "a" * 64
            )
            async with sessions() as session:
                sin_decisiones = await consultar_matriz_correspondencias(session, code, derivar_candidatos=True)
                historica_derivada = await consultar_matriz_correspondencias(session, old_code, derivar_candidatos=True)
            assert not any(fila.estado_correspondencia == "ACREDITADO_DOCUMENTAL" for fila in sin_decisiones.filas)
            assert historica_derivada.metas_sin_pa == 1

            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        """UPDATE seguimiento.planes_desarrollo_distrital
                           SET ppi_total_corriente_cop=42,
                               metadatos='{"revision_manual":"conservar","ppi_estado":"ANTERIOR"}'::jsonb
                           WHERE codigo_plan=:code"""
                    ),
                    {"code": code},
                )
            plan_nuevo = {
                "codigo_plan": code,
                "periodo": "2024-2027",
                "nombre_oficial": "Plan de prueba 1:N",
                "tipo_plan": "PDD",
                "norma_adopcion": None,
                "localidad": None,
                "ppi_total_corriente_cop": None,
                "ppi_total_constante_2025_cop": None,
                "ppi_anual_cop": {},
                "fuentes": [],
                "metadatos": {"ppi_estado": "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"},
            }
            programa_extraido, subprograma_extraido = uuid.uuid4(), uuid.uuid4()
            lineas_nuevas = [
                {
                    "id": programa_extraido,
                    "codigo_plan": code,
                    "parent_id": None,
                    "nivel": "PROGRAMA",
                    "codigo": "P-1",
                    "nombre": "Programa de prueba",
                    "orden": 0,
                    "ppi_anual_cop": {},
                    "fuente": None,
                    "metadatos": {},
                },
                {
                    "id": subprograma_extraido,
                    "codigo_plan": code,
                    "parent_id": programa_extraido,
                    "nivel": "SUBPROGRAMA",
                    "codigo": "SP-1",
                    "nombre": "Subprograma de prueba",
                    "orden": 0,
                    "ppi_anual_cop": {},
                    "fuente": None,
                    "metadatos": {},
                },
                {
                    "id": nueva_linea_id,
                    "codigo_plan": code,
                    "parent_id": programa_extraido,
                    "nivel": "PROGRAMA",
                    "codigo": "P-2",
                    "nombre": "Programa nuevo",
                    "orden": 2,
                    "ppi_anual_cop": {},
                    "fuente": "plan-test.md",
                    "metadatos": {},
                },
            ]
            metas_extraidas = [
                {
                    "id": uuid.uuid4(),
                    "codigo_plan": code,
                    "linea_id": subprograma_extraido,
                    "tipo_meta": "RESULTADO",
                    "codigo": "M-1",
                    "nombre": "Meta sintética de prueba",
                    "indicador": None,
                    "unidad_medida": None,
                    "linea_nombre": None,
                    "fuente": None,
                    "fila_fuente": None,
                    "datos_oficiales": {},
                },
                {
                    "id": uuid.uuid4(),
                    "codigo_plan": code,
                    "linea_id": programa_extraido,
                    "tipo_meta": "RESULTADO",
                    "codigo": "M-2",
                    "nombre": "Meta reformulada de prueba",
                    "indicador": None,
                    "unidad_medida": None,
                    "linea_nombre": None,
                    "fuente": None,
                    "fila_fuente": None,
                    "datos_oficiales": {},
                },
            ]
            extraido = ([plan_nuevo], lineas_nuevas, metas_extraidas)
            primer_sync = await sincronizar_catalogo_pdd.synchronize(extracted=extraido)
            assert primer_sync["lineas_reutilizadas"] == 2
            assert primer_sync["lineas_nuevas"] == 1
            assert primer_sync["metas_reutilizadas"] == 1
            assert primer_sync["metas_pendientes_identidad"] == 1
            assert primer_sync["metas_nuevas"] == 0
            assert primer_sync["estado_publicacion"] == "no_publicable"
            assert await _contar(engine, meta_id) == 2
            async with engine.connect() as conn:
                nuevo_padre = await conn.scalar(
                    text("SELECT parent_id FROM seguimiento.pdd_lineas_y_programas WHERE id=:id"),
                    {"id": nueva_linea_id},
                )
                plan_actual = (
                    (
                        await conn.execute(
                            text(
                                "SELECT ppi_total_corriente_cop, metadatos, sincronizado_en FROM "
                                "seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:code"
                            ),
                            {"code": code},
                        )
                    )
                    .mappings()
                    .one()
                )
            assert nuevo_padre == programa_id
            assert plan_actual["ppi_total_corriente_cop"] is None
            assert plan_actual["metadatos"]["revision_manual"] == "conservar"
            assert plan_actual["metadatos"]["ppi_estado"] == "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"
            segundo_sync = await sincronizar_catalogo_pdd.synchronize(extracted=extraido)
            assert segundo_sync["lineas_nuevas"] == 0
            assert segundo_sync["metas_pendientes_identidad"] == 1
            async with engine.connect() as conn:
                assert (
                    await conn.scalar(
                        text(
                            "SELECT sincronizado_en FROM seguimiento.planes_desarrollo_distrital "
                            "WHERE codigo_plan=:code"
                        ),
                        {"code": code},
                    )
                    == plan_actual["sincronizado_en"]
                )
            concurrentes = await asyncio.gather(
                sincronizar_catalogo_pdd.synchronize(extracted=extraido),
                sincronizar_catalogo_pdd.synchronize(extracted=extraido),
            )
            assert all(resumen["lineas_nuevas"] == 0 for resumen in concurrentes)
            assert await _contar(engine, meta_id) == 2

            upsert_real = sincronizar_catalogo_pdd._upsert_planes

            async def fallar_tras_upsert(conn, nuevos_planes):
                await upsert_real(conn, nuevos_planes)
                raise RuntimeError("fallo tras UPSERT efectivo")

            monkeypatch.setattr(sincronizar_catalogo_pdd, "_upsert_planes", fallar_tras_upsert)
            plan_alterado = {**plan_nuevo, "nombre_oficial": "Nombre que debe revertirse"}
            with pytest.raises(RuntimeError, match="UPSERT efectivo"):
                await sincronizar_catalogo_pdd.synchronize(extracted=([plan_alterado], lineas_nuevas, metas_extraidas))
            monkeypatch.setattr(sincronizar_catalogo_pdd, "_upsert_planes", upsert_real)

            duplicada = {**metas_extraidas[0], "id": uuid.uuid4()}
            with pytest.raises(ValueError, match="Identidad ambigua de meta extraída"):
                await sincronizar_catalogo_pdd.synchronize(
                    extracted=([plan_alterado], lineas_nuevas, [*metas_extraidas, duplicada])
                )

            async def cancelar_tras_upsert(conn, nuevos_planes):
                await upsert_real(conn, nuevos_planes)
                raise asyncio.CancelledError()

            monkeypatch.setattr(sincronizar_catalogo_pdd, "_upsert_planes", cancelar_tras_upsert)
            with pytest.raises(asyncio.CancelledError):
                await sincronizar_catalogo_pdd.synchronize(extracted=([plan_alterado], lineas_nuevas, metas_extraidas))
            monkeypatch.setattr(sincronizar_catalogo_pdd, "_upsert_planes", upsert_real)

            reconciliar_real = sincronizar_catalogo_pdd._reconciliar_catalogo

            def invalidar_respuesta(*args):
                nuevas_lineas, nuevas_metas, conteos = reconciliar_real(*args)
                return nuevas_lineas, nuevas_metas, {**conteos, "lineas_nuevas": -1}

            monkeypatch.setattr(sincronizar_catalogo_pdd, "_reconciliar_catalogo", invalidar_respuesta)
            with pytest.raises(ValidationError):
                await sincronizar_catalogo_pdd.synchronize(extracted=([plan_alterado], lineas_nuevas, metas_extraidas))
            async with engine.connect() as conn:
                assert (
                    await conn.scalar(
                        text(
                            "SELECT nombre_oficial FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:code"
                        ),
                        {"code": code},
                    )
                    == "Plan de prueba 1:N"
                )
            assert await _contar(engine, meta_id) == 2
        finally:
            if meta_id is not None:
                async with engine.begin() as conn:
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_correspondencias_meta_pa_bpim WHERE meta_id=:meta"),
                        {"meta": meta_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_vinculos_meta_pa_triada WHERE id=:id"),
                        {"id": vinculo_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_vinculos_meta_pa_triada WHERE id=:id"),
                        {"id": sin_pa_vinculo_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_vinculos_meta_pa_triada WHERE id=:id"),
                        {"id": old_vinculo_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE id=:id"),
                        {"id": meta_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE id=:id"),
                        {"id": sin_pa_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE id=:id"),
                        {"id": old_meta_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_lineas_y_programas WHERE id=:id"),
                        {"id": nueva_linea_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_lineas_y_programas WHERE id=:id"),
                        {"id": subprograma_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.pdd_lineas_y_programas WHERE id=:id"),
                        {"id": programa_id},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:code"),
                        {"code": code},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:code"),
                        {"code": old_code},
                    )
                    await conn.execute(
                        text("DELETE FROM seguimiento.actividades_plan_accion WHERE id=:id"),
                        {"id": actividad_id},
                    )
            await engine.dispose()

    asyncio.run(escenario())
