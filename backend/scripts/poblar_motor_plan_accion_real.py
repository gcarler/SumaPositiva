"""Populate the Plan Acción DNP motor with a deterministic real activity sample."""

from __future__ import annotations

import asyncio
import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402

ENTITY_MAPPING: dict[str, tuple[str, str]] = {
    "Alcaldía Local Histórica y del Caribe Norte": ("LE-02", "PAS-DES-08"),
    "Alcaldía Local Industrial y de la Bahía": ("LE-03", "PAS-AMB-05"),
    "Alcaldía Local de la Virgen y Turística": ("LE-05", "PAS-ETN-10"),
    "Alcaldía Mayor de Cartagena": ("LE-02", "PAS-SEG-03"),
    "Corvivienda": ("LE-04", "PAS-ETN-10"),
    "Departamento Administrativo Distrital de Salud": ("LE-06", "PAS-CUID-07"),
    "Departamento Administrativo de Tránsito y Transporte": ("LE-01", "PAS-POL-06"),
    "Departamento Administrativo de Valorización Distrital": ("LE-03", "PAS-AMB-05"),
    "Distriseguridad": ("LE-01", "PAS-SEG-03"),
    "Escuela Taller Cartagena de Indias": ("LE-04", "PAS-ETN-10"),
    "Escuela de Gobierno y Liderazgo": ("LE-02", "PAS-JUV-02"),
    "Establecimiento Público Ambiental": ("LE-03", "PAS-AMB-05"),
    "Gerencia de Espacio Público y Movilidad": ("LE-03", "PAS-AMB-05"),
    "Instituto Distrital de Deporte y Recreación": ("LE-02", "PAS-JUV-02"),
    "Instituto de Acción Comunal y Capital Social de Cartagena": ("LE-02", "PAS-JUV-02"),
    "Instituto de Patrimonio y Cultura de Cartagena": ("LE-04", "PAS-ETN-10"),
    "Oficina Asesora para la Gestión del Riesgo de Desastres": ("LE-03", "PAS-AMB-05"),
    "Plan de Emergencia Social Pedro Romero": ("LE-04", "PAS-CUID-07"),
    "Secretaría General": ("LE-01", "PAS-ALUM-04"),
    "Secretaría de Educación": ("LE-02", "PAS-JUV-02"),
    "Secretaría de Hacienda": ("LE-04", "PAS-BAZ-09"),
    "Secretaría de Infraestructura": ("LE-03", "PAS-AMB-05"),
    "Secretaría de Infraestructura y Conectividad de Cartagena": ("LE-03", "PAS-AMB-05"),
    "Secretaría de Participación y Desarrollo Social": ("LE-04", "PAS-CUID-07"),
    "Secretaría de Planeación": ("LE-02", "PAS-SEG-03"),
    "Secretaría de Turismo": ("LE-04", "PAS-BAZ-09"),
    "Secretaría del Interior y Convivencia Ciudadana": ("LE-02", "PAS-DES-08"),
    "Transcaribe": ("LE-03", "PAS-AMB-05"),
    "Unidad Municipal de Asistencia Técnica Agropecuaria": ("LE-05", "PAS-ETN-10"),
}

VERBOS = (
    "adecuar",
    "adoptar",
    "analizar",
    "atender",
    "capacitar",
    "construir",
    "crear",
    "desarrollar",
    "diseñar",
    "ejecutar",
    "expedir",
    "fortalecer",
    "gestionar",
    "identificar",
    "implementar",
    "instalar",
    "intervenir",
    "mantener",
    "mejorar",
    "organizar",
    "promover",
    "proteger",
    "realizar",
    "reducir",
    "rehabilitar",
    "restaurar",
    "suministrar",
    "verificar",
)


def _normalizar(valor: Any) -> str:
    value = unicodedata.normalize("NFKD", str(valor or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", value)).strip()


def _text(value: Any, fallback: str) -> str:
    result = str(value or "").strip()
    return fallback if not result or result.upper() in {"N/A", "NA", "NONE", "NULL", "-"} else result


def _number(value: Any, *, percent: bool = False) -> float:
    if value is None:
        return 0.0
    try:
        result = float(value)
    except (TypeError, ValueError):
        try:
            result = float(str(value).replace(".", "").replace(",", "."))
        except ValueError:
            return 0.0
    if percent and 0 <= result <= 1:
        result *= 100
    if percent:
        return min(100.0, max(0.0, result))
    return max(0.0, result)


def _verb(description: str, existing: Any) -> str:
    existing_value = _normalizar(existing)
    if existing_value and existing_value not in {"na", "n a", "none"}:
        return str(existing).strip().lower()[:50]
    words = _normalizar(description).split()
    for word in words:
        if word in VERBOS or word.endswith(("ar", "er", "ir")):
            return word[:50]
    return "gestionar"


def _money(execution: dict[str, Any]) -> float:
    for key in ("pagos_tesoreria_cop", "obligaciones_cop", "compromisos_rp_cop"):
        value = execution.get(key)
        if value is not None:
            return _number(value)
    return 0.0


async def populate() -> dict[str, Any]:
    engine = create_async_engine(Settings().async_database_url)
    try:
        async with engine.begin() as connection:
            result = await connection.execute(
                text("""
                    WITH candidates AS (
                        SELECT
                            r.id::text AS registro_id,
                            r.archivo_id::text AS archivo_id,
                            r.entidad_normalizada,
                            r.vigencia,
                            r.linea_estrategica,
                            r.codigo_bpim,
                            r.indicador,
                            r.descripcion_actividad,
                            r.verbo_fuerte_dnp,
                            r.verbo_detectado,
                            r.meta_programada_anual,
                            r.meta_ejecutada_anual,
                            r.avance_t1,r.avance_t2,r.avance_t3,r.avance_t4,
                            r.avance_fisico_pct,
                            r.apropiacion_definitiva_cop,
                            r.pagos_tesoreria_cop,r.obligaciones_cop,r.compromisos_rp_cop,
                            r.datos_origen,
                            row_number() OVER (
                                PARTITION BY r.entidad_normalizada,r.vigencia,
                                  coalesce(nullif(r.codigo_bpim,''),r.descripcion_actividad)
                                ORDER BY
                                  coalesce(r.apropiacion_definitiva_cop,0) DESC,
                                  (r.avance_fisico_pct IS NOT NULL)::int DESC,
                                  r.creado_en DESC,r.id
                            ) AS duplicate_rank
                        FROM seguimiento.registros_triada_normalizados r
                        WHERE r.motor_destino='PLAN_ACCION'
                          AND r.periodo_gobierno='2024_2027'
                          AND r.vigencia IN (2024,2025,2026)
                          AND r.entidad_normalizada IS NOT NULL
                          AND length(trim(coalesce(r.descripcion_actividad,''))) >= 30
                          AND upper(trim(r.descripcion_actividad)) NOT IN ('N/A','NA','SIN DATO')
                    ), ranked AS (
                        SELECT *, row_number() OVER (
                            PARTITION BY entidad_normalizada,vigencia
                            ORDER BY coalesce(apropiacion_definitiva_cop,0) DESC,
                              (avance_fisico_pct IS NOT NULL)::int DESC, registro_id
                        ) AS sample_rank
                        FROM candidates WHERE duplicate_rank=1
                    )
                    SELECT * FROM ranked WHERE sample_rank <= 2
                    ORDER BY vigencia,entidad_normalizada,sample_rank
                """)
            )
            rows = [dict(row._mapping) for row in result]
            entities = {row["entidad_normalizada"] for row in rows}
            unmapped = sorted(entities - set(ENTITY_MAPPING))
            if unmapped:
                raise ValueError(f"Entidades sin mapeo estratégico explicitado: {unmapped}")
            years = {year: 0 for year in (2024, 2025, 2026)}
            entity_year: dict[str, set[int]] = defaultdict(set)
            for row in rows:
                years[row["vigencia"]] += 1
                entity_year[row["entidad_normalizada"]].add(row["vigencia"])
            if len(entities) != 29:
                raise ValueError(f"Se esperaban 29 entidades; selección contiene {len(entities)}")
            if len(rows) < 120 or len(rows) > 250:
                raise ValueError(f"La muestra debe quedar entre 120 y 250; resultado={len(rows)}")

            counters: dict[int, int] = defaultdict(int)
            for row in rows:
                year = int(row["vigencia"])
                counters[year] += 1
                code = f"PA-REAL-{year}-{counters[year]:03d}"
                line_code, pas_code = ENTITY_MAPPING[row["entidad_normalizada"]]
                data = row["datos_origen"] or {}
                if isinstance(data, str):
                    data = json.loads(data)
                description = _text(row["descripcion_actividad"], "Actividad del Plan de Acción")
                program = _text(data.get("PROGRAMA"), "Plan de Acción institucional")
                project = _text(data.get("PROYECTO DE INVERSIÓN"), program)
                objective = _text(
                    data.get("OBJETIVO GENERAL DEL PROYECTO") or data.get("OBJETIVO ESPECIFICO DEL PROYECTO"),
                    description,
                )
                indicator = _text(row["indicador"], description)
                bpim = _text(row["codigo_bpim"], f"BPIM-INST-{code}")[:50]
                unit = _text(data.get("UNIDAD DE MEDIDA"), "unidad")
                resource_source = _text(
                    data.get("FUENTE DE RECURSOS") or data.get("FUENTE DE FINANCIACIÓN"),
                    "No reportada",
                )
                advance = _number(row["avance_fisico_pct"], percent=True)
                if advance == 0:
                    quarterly = [_number(row.get(f"avance_t{quarter}"), percent=True) for quarter in range(1, 5)]
                    advance = max(quarterly, default=0)
                quarterly = [_number(row.get(f"avance_t{quarter}"), percent=True) for quarter in range(1, 5)]
                start = date(year, 1, 1)
                end = date(year, 12, 31)
                await connection.execute(
                    text("""
                        INSERT INTO seguimiento.actividades_plan_accion (
                            codigo,vigencia,compromiso_pas_codigo,linea_estrategica_codigo,
                            programa_nombre,entidad_responsable,lider_responsable,
                            dependencias_articuladas,tipo_meta,meta_producto_vigencia,
                            meta_valor_vigencia,unidad_medida,codigo_bpim,proyecto_nombre,
                            objetivo_proyecto,tipo_actividad,descripcion_actividad,verbo_infinitivo,
                            fecha_inicio,fecha_terminacion,periodicidad_seguimiento,
                            avance_t1,avance_t2,avance_t3,avance_t4,porcentaje_avance_fisico,
                            categoria_recursos,fuente_financiacion,monto_programado_cop,
                            monto_ejecutado_cop,estado_aprobacion,evidencia_soporte,metadatos
                        ) VALUES (
                            :codigo,:year,:pas,:line,:program,:entity,
                            'Unidad responsable de la entidad','[]'::jsonb,'PRODUCTO',
                            :indicator,:meta,:unit,:bpim,:project,:objective,
                            'PROYECTO_INVERSION',:description,:verb,:start,:end,
                            'TRIMESTRAL',:t1,:t2,:t3,:t4,:advance,'INVERSIÓN',
                            :source,:budget,:execution,'APROBADO_CONSEJO_GOBIERNO',
                            :evidence,CAST(:metadata AS jsonb)
                        )
                        ON CONFLICT (codigo) DO UPDATE SET
                            vigencia=EXCLUDED.vigencia,
                            compromiso_pas_codigo=EXCLUDED.compromiso_pas_codigo,
                            linea_estrategica_codigo=EXCLUDED.linea_estrategica_codigo,
                            programa_nombre=EXCLUDED.programa_nombre,
                            entidad_responsable=EXCLUDED.entidad_responsable,
                            tipo_meta=EXCLUDED.tipo_meta,
                            meta_producto_vigencia=EXCLUDED.meta_producto_vigencia,
                            meta_valor_vigencia=EXCLUDED.meta_valor_vigencia,
                            unidad_medida=EXCLUDED.unidad_medida,
                            codigo_bpim=EXCLUDED.codigo_bpim,
                            proyecto_nombre=EXCLUDED.proyecto_nombre,
                            objetivo_proyecto=EXCLUDED.objetivo_proyecto,
                            descripcion_actividad=EXCLUDED.descripcion_actividad,
                            verbo_infinitivo=EXCLUDED.verbo_infinitivo,
                            fecha_inicio=EXCLUDED.fecha_inicio,
                            fecha_terminacion=EXCLUDED.fecha_terminacion,
                            avance_t1=EXCLUDED.avance_t1, avance_t2=EXCLUDED.avance_t2,
                            avance_t3=EXCLUDED.avance_t3, avance_t4=EXCLUDED.avance_t4,
                            porcentaje_avance_fisico=EXCLUDED.porcentaje_avance_fisico,
                            fuente_financiacion=EXCLUDED.fuente_financiacion,
                            monto_programado_cop=EXCLUDED.monto_programado_cop,
                            monto_ejecutado_cop=EXCLUDED.monto_ejecutado_cop,
                            evidencia_soporte=EXCLUDED.evidencia_soporte,
                            metadatos=EXCLUDED.metadatos,
                            actualizado_en=clock_timestamp()
                    """),
                    {
                        "codigo": code,
                        "year": year,
                        "pas": pas_code,
                        "line": line_code,
                        "program": program[:250],
                        "entity": row["entidad_normalizada"][:150],
                        "indicator": indicator[:300],
                        "meta": _number(row["meta_programada_anual"] or row["meta_ejecutada_anual"] or 1),
                        "unit": unit[:50],
                        "bpim": bpim,
                        "project": project[:300],
                        "objective": objective,
                        "description": description,
                        "verb": _verb(description, row.get("verbo_detectado")),
                        "start": start,
                        "end": end,
                        "t1": quarterly[0],
                        "t2": quarterly[1],
                        "t3": quarterly[2],
                        "t4": quarterly[3],
                        "advance": advance,
                        "source": resource_source[:50],
                        "budget": _number(row["apropiacion_definitiva_cop"]),
                        "execution": _money(row),
                        "evidence": ("Seguimiento Triada normalizado; evidencia primaria enlazada en metadatos."),
                        "metadata": json.dumps(
                            {
                                "registro_triada_id": row["registro_id"],
                                "archivo_id": row["archivo_id"],
                                "mapeo_entidad_linea_pas": "CURADURIA_EAF_13",
                                "linea_mapeada": line_code,
                                "compromiso_pas_mapeado": pas_code,
                                "corte_origen": "REGISTRO_TRIADA_NORMALIZADO",
                            },
                            ensure_ascii=False,
                        ),
                    },
                )
            total = await connection.scalar(text("SELECT count(*) FROM seguimiento.actividades_plan_accion"))
            seed_count = await connection.scalar(
                text(
                    """SELECT count(*) FROM seguimiento.actividades_plan_accion
                       WHERE codigo LIKE 'PA-2026-%'"""
                )
            )
        return {
            "actividades_reales_upserted": len(rows),
            "actividades_motor_total": total,
            "semillas_preservadas": seed_count,
            "entidades_cubiertas": len(entities),
            "por_vigencia": years,
            "entidades_por_vigencia": {entity: sorted(entity_year[entity]) for entity in sorted(entity_year)},
        }
    finally:
        await engine.dispose()


def main() -> None:
    print(json.dumps(asyncio.run(populate()), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
