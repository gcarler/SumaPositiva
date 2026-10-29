"""Candidatos 1:N meta–PA por BPIM/vigencia, sin copiar montos presupuestales."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction
from app.modules.compromisos.models import PddCorrespondenciaMetaPaBpim


class ResumenCorrespondencias(BaseModel):
    candidatos_en_fuente: int = Field(ge=0)
    descartados_por_vigencia: int = Field(ge=0)
    insertados: int = Field(ge=0)
    total_matriz: int = Field(ge=0)
    metas_con_multiples_actividades: int = Field(ge=0)
    sin_documento_y_pagina: int = Field(ge=0)
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    limite: str = "Coincidencia BPIM y vigencia; falta acreditar documento y página. No se imputan montos."


class FilaMatrizCorrespondencias(BaseModel):
    codigo_plan: str
    meta_id: uuid.UUID
    codigo_meta: str | None
    nombre_meta: str
    tipo_meta: str
    indicador_meta: str | None
    nodo_plan_nivel: str | None
    nodo_plan_nombre: str | None
    programa_pdd_id: uuid.UUID | None
    programa_pdd_nombre: str | None
    actividad_pa_id: uuid.UUID | None
    codigo_actividad_pa: str | None
    programa_pa_nombre: str | None
    codigo_bpim: str | None
    vigencia: int | None
    tipo_vinculo_heredado: str | None
    estado_correspondencia: Literal[
        "SIN_ACTIVIDAD_PA_IDENTIFICADA", "CANDIDATO_BPIM_VIGENCIA", "ACREDITADO_DOCUMENTAL", "DESCARTADO"
    ]
    documento_evidencia: str | None
    pagina_evidencia: int | None
    sha256_documento: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


class MatrizCorrespondencias(BaseModel):
    filas: list[FilaMatrizCorrespondencias]
    metas_distintas: int = Field(ge=0)
    metas_sin_pa: int = Field(ge=0)
    metas_con_multiples_actividades: int = Field(ge=0)
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    limite: str = "Matriz descriptiva; las candidaturas no acreditan ejecución ni impacto. Sin montos aditivos."


class CorrespondenciasRepository:
    """Consultas y escrituras del caso de uso; el servicio controla el commit."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def candidatos(self) -> list[dict[str, Any]]:
        filas = (
            (
                await self.session.execute(
                    text(
                        """
                    SELECT v.id AS vinculo_origen_id, v.codigo_plan, v.meta_id,
                           a.id AS actividad_pa_id, trim(v.codigo_bpim) AS codigo_bpim,
                           v.vigencia
                    FROM seguimiento.pdd_vinculos_meta_pa_triada AS v
                    JOIN seguimiento.actividades_plan_accion AS a
                      ON lower(trim(v.codigo_bpim)) = lower(trim(a.codigo_bpim))
                     AND v.vigencia = a.vigencia
                    JOIN seguimiento.planes_desarrollo_distrital AS p
                      ON p.codigo_plan = v.codigo_plan
                    WHERE v.codigo_bpim IS NOT NULL AND trim(v.codigo_bpim) <> ''
                      AND p.periodo ~ '^[0-9]{4}[-–][0-9]{4}$'
                      AND v.vigencia BETWEEN substring(p.periodo from 1 for 4)::int
                                         AND right(p.periodo, 4)::int
                    ORDER BY v.meta_id, a.id
                    """
                    )
                )
            )
            .mappings()
            .all()
        )
        return [dict(fila) for fila in filas]

    async def contar_fuera_de_periodo(self) -> int:
        """Conserva visible el número de emparejamientos BPIM/año rechazados."""
        return await self.session.scalar(
            text(
                """
                SELECT count(*)
                FROM seguimiento.pdd_vinculos_meta_pa_triada AS v
                JOIN seguimiento.actividades_plan_accion AS a
                  ON lower(trim(v.codigo_bpim)) = lower(trim(a.codigo_bpim))
                 AND v.vigencia = a.vigencia
                LEFT JOIN seguimiento.planes_desarrollo_distrital AS p
                  ON p.codigo_plan = v.codigo_plan
                WHERE v.codigo_bpim IS NOT NULL AND trim(v.codigo_bpim) <> ''
                  AND (
                    p.codigo_plan IS NULL OR p.periodo !~ '^[0-9]{4}[-–][0-9]{4}$'
                    OR v.vigencia NOT BETWEEN substring(p.periodo from 1 for 4)::int
                                           AND right(p.periodo, 4)::int
                  )
                """
            )
        )

    async def insertar_candidatos(self, candidatos: list[dict[str, Any]]) -> int:
        if not candidatos:
            return 0
        valores = []
        for candidato in candidatos:
            meta_id = candidato["meta_id"]
            actividad_id = candidato["actividad_pa_id"]
            valores.append(
                {
                    "id": uuid.uuid5(uuid.NAMESPACE_URL, f"polis:meta-pa:{meta_id}:{actividad_id}"),
                    **candidato,
                    "regla_candidatura": "BPIM_Y_VIGENCIA",
                    "estado_revision": "CANDIDATO_SIN_ACREDITAR",
                    "evidencia_cruce": {
                        "regla": "igualdad_codigo_bpim_y_vigencia",
                        "vinculo_origen_id": str(candidato["vinculo_origen_id"]),
                        "actividad_pa_id": str(actividad_id),
                        "documento_y_pagina": "pendientes",
                    },
                }
            )
        insertados = 0
        for inicio in range(0, len(valores), 500):
            sentencia = (
                insert(PddCorrespondenciaMetaPaBpim)
                .values(valores[inicio : inicio + 500])
                .on_conflict_do_nothing(constraint="uq_pdd_correspondencias_meta_actividad")
            )
            resultado = await self.session.execute(sentencia)
            insertados += resultado.rowcount
        return insertados

    async def resumen(self) -> dict[str, int]:
        fila = (
            (
                await self.session.execute(
                    text(
                        """
                    SELECT count(*) AS total_matriz,
                           count(*) FILTER (
                             WHERE documento_evidencia IS NULL OR pagina_evidencia IS NULL
                           ) AS sin_documento_y_pagina
                    FROM seguimiento.pdd_correspondencias_meta_pa_bpim
                    """
                    )
                )
            )
            .mappings()
            .one()
        )
        multiples = await self.session.scalar(
            text(
                """
                SELECT count(*) FROM (
                  SELECT meta_id FROM seguimiento.pdd_correspondencias_meta_pa_bpim
                  GROUP BY meta_id HAVING count(*) > 1
                ) AS varias
                """
            )
        )
        return {
            "total_matriz": fila["total_matriz"],
            "metas_con_multiples_actividades": multiples,
            "sin_documento_y_pagina": fila["sin_documento_y_pagina"],
        }

    async def matriz(self, codigo_plan: str | None = None, *, derivar_candidatos: bool = False) -> list[dict[str, Any]]:
        """Conserva una fila por par meta–PA y una fila explícita si falta PA."""
        # Solo se interpolan estas dos consultas internas; los filtros siguen parametrizados.
        correspondencias = (
            """
            SELECT DISTINCT a.id, v.codigo_plan, v.meta_id, a.id AS actividad_pa_id,
                   trim(v.codigo_bpim) AS codigo_bpim, v.vigencia,
                   'CANDIDATO_SIN_ACREDITAR'::text AS estado_revision,
                   NULL::text AS documento_evidencia, NULL::integer AS pagina_evidencia,
                   NULL::text AS sha256_documento
            FROM seguimiento.pdd_vinculos_meta_pa_triada AS v
            JOIN seguimiento.actividades_plan_accion AS a
              ON lower(trim(v.codigo_bpim)) = lower(trim(a.codigo_bpim))
             AND v.vigencia=a.vigencia
            JOIN seguimiento.planes_desarrollo_distrital AS p ON p.codigo_plan=v.codigo_plan
            WHERE v.codigo_bpim IS NOT NULL AND trim(v.codigo_bpim) <> ''
              AND v.vigencia BETWEEN
                  CASE WHEN p.periodo ~ '^[0-9]{4}[-–][0-9]{4}$'
                       THEN substring(p.periodo from 1 for 4)::int END
                  AND CASE WHEN p.periodo ~ '^[0-9]{4}[-–][0-9]{4}$'
                           THEN right(p.periodo, 4)::int END
            """
            if derivar_candidatos
            else "SELECT * FROM seguimiento.pdd_correspondencias_meta_pa_bpim"
        )
        filas = (
            (
                await self.session.execute(
                    text(
                        f"""
                    WITH RECURSIVE correspondencias AS ({correspondencias}), ancestros AS (
                      SELECT m.id AS meta_id, m.codigo_plan, n.id AS nodo_id, n.parent_id,
                             n.nivel, n.nombre, 0 AS profundidad, ARRAY[n.id] AS camino
                      FROM seguimiento.pdd_metas_oficiales AS m
                      JOIN seguimiento.pdd_lineas_y_programas AS n
                        ON n.id=m.linea_id AND n.codigo_plan=m.codigo_plan
                      WHERE CAST(:codigo_plan AS VARCHAR(64)) IS NULL
                         OR m.codigo_plan=CAST(:codigo_plan AS VARCHAR(64))
                      UNION ALL
                      SELECT anc.meta_id, anc.codigo_plan, padre.id, padre.parent_id,
                             padre.nivel, padre.nombre, anc.profundidad + 1, anc.camino || padre.id
                      FROM ancestros AS anc
                      JOIN seguimiento.pdd_lineas_y_programas AS padre
                        ON padre.id=anc.parent_id AND padre.codigo_plan=anc.codigo_plan
                      WHERE anc.profundidad < 12 AND NOT padre.id=ANY(anc.camino)
                    ), programas AS (
                      SELECT DISTINCT ON (meta_id) meta_id, nodo_id, nombre
                      FROM ancestros WHERE nivel='PROGRAMA'
                      ORDER BY meta_id, profundidad
                    )
                    SELECT m.codigo_plan, m.id AS meta_id, m.codigo AS codigo_meta,
                           m.nombre AS nombre_meta, m.tipo_meta, m.indicador AS indicador_meta,
                           nodo.nivel AS nodo_plan_nivel, nodo.nombre AS nodo_plan_nombre,
                           p.nodo_id AS programa_pdd_id, p.nombre AS programa_pdd_nombre,
                           c.actividad_pa_id, a.codigo AS codigo_actividad_pa,
                           a.programa_nombre AS programa_pa_nombre,
                           c.codigo_bpim, c.vigencia,
                           v.tipo_vinculo AS tipo_vinculo_heredado,
                           CASE
                             WHEN c.id IS NULL THEN 'SIN_ACTIVIDAD_PA_IDENTIFICADA'
                             WHEN c.estado_revision='ACREDITADO' THEN 'ACREDITADO_DOCUMENTAL'
                             WHEN c.estado_revision='DESCARTADO' THEN 'DESCARTADO'
                             ELSE 'CANDIDATO_BPIM_VIGENCIA'
                           END AS estado_correspondencia,
                           c.documento_evidencia, c.pagina_evidencia, c.sha256_documento
                    FROM seguimiento.pdd_metas_oficiales AS m
                    LEFT JOIN seguimiento.pdd_lineas_y_programas AS nodo ON nodo.id=m.linea_id
                    LEFT JOIN programas AS p ON p.meta_id=m.id
                    LEFT JOIN seguimiento.pdd_vinculos_meta_pa_triada AS v ON v.meta_id=m.id
                    LEFT JOIN correspondencias AS c ON c.meta_id=m.id AND c.codigo_plan=m.codigo_plan
                    LEFT JOIN seguimiento.actividades_plan_accion AS a ON a.id=c.actividad_pa_id
                    WHERE CAST(:codigo_plan AS VARCHAR(64)) IS NULL
                       OR m.codigo_plan=CAST(:codigo_plan AS VARCHAR(64))
                    ORDER BY m.codigo_plan, m.id, c.actividad_pa_id
                    """
                    ),
                    {"codigo_plan": codigo_plan},
                )
            )
            .mappings()
            .all()
        )
        return [dict(fila) for fila in filas]


async def sincronizar_correspondencias(
    session: AsyncSession, repository: CorrespondenciasRepository | None = None
) -> ResumenCorrespondencias:
    """Inserta candidatos de forma idempotente; no modifica decisiones humanas previas."""
    repo = repository or CorrespondenciasRepository(session)
    if repo.session is not session:
        raise ValueError("El repositorio debe usar la sesión exclusiva del caso de uso")
    async with transaction(session):
        candidatos = await repo.candidatos()
        descartados = await repo.contar_fuera_de_periodo()
        insertados = await repo.insertar_candidatos(candidatos)
        resumen = await repo.resumen()
        respuesta = ResumenCorrespondencias.model_validate(
            {
                "candidatos_en_fuente": len(candidatos),
                "descartados_por_vigencia": descartados,
                "insertados": insertados,
                **resumen,
            }
        )
    return respuesta


async def consultar_matriz_correspondencias(
    session: AsyncSession, codigo_plan: str | None = None, *, derivar_candidatos: bool = False
) -> MatrizCorrespondencias:
    """Lee la matriz completa sin sumar montos ni inferir causalidad."""
    filas = [
        FilaMatrizCorrespondencias.model_validate(fila)
        for fila in await CorrespondenciasRepository(session).matriz(codigo_plan, derivar_candidatos=derivar_candidatos)
    ]
    return resumir_matriz_correspondencias(filas)


def resumir_matriz_correspondencias(filas: list[FilaMatrizCorrespondencias]) -> MatrizCorrespondencias:
    """El mismo cómputo resume lecturas SQL y matrices congeladas sin sumar dinero."""
    metas = {fila.meta_id for fila in filas}
    conteos: dict[uuid.UUID, int] = {}
    for fila in filas:
        if fila.actividad_pa_id is not None and fila.estado_correspondencia != "DESCARTADO":
            conteos[fila.meta_id] = conteos.get(fila.meta_id, 0) + 1
    return MatrizCorrespondencias(
        filas=filas,
        metas_distintas=len(metas),
        metas_sin_pa=len(metas - conteos.keys()),
        metas_con_multiples_actividades=sum(cantidad > 1 for cantidad in conteos.values()),
    )
