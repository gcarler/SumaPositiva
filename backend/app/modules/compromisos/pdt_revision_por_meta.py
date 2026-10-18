"""Matriz auditable de revisión integral por meta (10 dimensiones y 7 revisores especializados).

Implementa las recomendaciones de las Secciones 5, 6, 7 y 8 de `revision_motores_18_10_2026.md`:
- Unidad principal de revisión: la meta y su cadena de intervención.
- 10 dimensiones de revisión separadas en Formulación, Ejecución y Resultados (sin score opaco).
- 7 roles especializados de revisión (incluyendo Revisor de Contradicciones).
- Preservación estricta de ceros observados (`0.0`) frente a datos faltantes (`None` ->
  `BRECHA_DE_INFORMACION`).
- Transparencia sobre el universo total de metas vs. metas filtradas vs. muestra devuelta.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import re
import unicodedata
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.service import auditar_consistencia_serie_y_sentido_indicador

ESTADO_BRECHA_INFO = "BRECHA_DE_INFORMACION"
ESTADO_CERO_OBSERVADO = "CERO_OBSERVADO_VERIFICADO"
ESTADO_CON_EVIDENCIA = "CON_EVIDENCIA_VERIFICABLE"
ESTADO_CONTRADICCION = "CONTRADICCION_ENTRE_MOTORES"
ESTADO_ALERTA_REVISION = "ALERTA_REQUIERE_REVISION"

VERSION_REGLA_CANONICA = "EAF_REV_META_26B_V1"

DEFAULT_CACHE_PATH = (
    Path(__file__).resolve().parents[4]
    / "data"
    / "planes_desarrollo"
    / "cache_pdt_ai_evaluator.json"
)

DIEZ_DIMENSIONES_REVISION: tuple[str, ...] = (
    "diagnostico",
    "formulacion",
    "cadena_resultados",
    "operacionalizacion",
    "viabilidad_financiera",
    "ejecucion_fisica",
    "ejecucion_financiera",
    "resultados_y_equidad",
    "cambios_del_plan",
    "control_y_aprendizaje",
)

SIETE_ROLES_REVISORES: tuple[str, ...] = (
    "curador_evidencia",
    "revisor_formulacion",
    "revisor_articulacion",
    "conciliador_ejecucion",
    "analista_metodologico",
    "revisor_contradicciones",
    "redactor_informe",
)

CAMPOS_CONTRATO_HALLAZGO: tuple[str, ...] = (
    "id_hallazgo",
    "codigo_plan",
    "codigo_meta",
    "dependencia",
    "territorio",
    "periodo",
    "regla_aplicada",
    "version_regla",
    "hechos_observados",
    "citas_evidencia",
    "calculo_reproducible",
    "severidad",
    "incertidumbre",
    "evidencia_contradictoria",
    "recomendacion",
    "responsable",
    "estado_revision",
)


def _normalizar(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _to_float_preserve_zero(valor: Any) -> float | None:
    """Convierte a float preservando explícitamente 0.0 y devolviendo None cuando falta el dato."""
    if valor is None:
        return None
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float, Decimal)):
        return float(valor)
    texto = str(valor).strip()
    if not texto or texto.upper() in {"NA", "N/A", "NONE", "NULL", "SIN DATO", "PENDIENTE"}:
        return None
    limpio = texto.replace("$", "").replace(" ", "")
    if "," in limpio and "." in limpio:
        if limpio.rfind(",") > limpio.rfind("."):
            limpio = limpio.replace(".", "").replace(",", ".")
        else:
            limpio = limpio.replace(",", "")
    elif "," in limpio:
        partes = limpio.split(",")
        if len(partes) == 2 and len(partes[1]) <= 2:
            limpio = limpio.replace(",", ".")
        else:
            limpio = limpio.replace(",", "")
    try:
        return float(limpio)
    except ValueError:
        match = re.search(r"-?\d+(?:\.\d+)?", limpio)
        return float(match.group(0)) if match else None


def _extraer_campo_dict(datos: dict[str, Any], candidatos: tuple[str, ...]) -> Any:
    if not isinstance(datos, dict):
        return None
    mapa_norm = {_normalizar(k): v for k, v in datos.items()}
    for cand in candidatos:
        val = mapa_norm.get(_normalizar(cand))
        if val is not None and str(val).strip() != "":
            return val
    for k_norm, val in mapa_norm.items():
        if any(_normalizar(cand) in k_norm for cand in candidatos):
            if val is not None and str(val).strip() != "":
                return val
    return None


def _detectar_sentido_indicador(texto_meta_o_indicador: str) -> str:
    norm = _normalizar(texto_meta_o_indicador)
    palabras_reduccion = (
        "reducir",
        "disminuir",
        "bajar",
        "mortalidad",
        "desercion",
        "pobreza",
        "embarazo adolescente",
        "homicidio",
        "hurto",
        "siniestralidad",
        "desempleo",
        "deficit",
    )
    if any(p in norm for p in palabras_reduccion):
        return "DESCENDENTE_REDUCCION"
    if any(p in norm for p in ("mantener", "sostener", "conservar", "estabilizar")):
        return "MANTENIMIENTO_ESTABILIDAD"
    return "ASCENDENTE_INCREMENTO"


def obtener_especificacion_revision_por_meta() -> dict[str, Any]:
    """Devuelve las 10 dimensiones, los 7 roles revisores y el contrato canónico de hallazgo."""
    return {
        "documento_referencia": "revision_motores_18_10_2026.md (Secciones 5, 6, 7 y 8)",
        "unidad_principal_analisi": "La meta del Plan de Desarrollo y su cadena de intervención",
        "principios_rectores": [
            "Separar revisión de formulación, seguimiento de ejecución y evaluación de resultados.",
            (
                "Preservar ceros observados (0.0) como cero y datos faltantes (None) como "
                "BRECHA_DE_INFORMACION."
            ),
            "Evitar un score global opaco que mezcle dimensiones no comparables.",
            (
                "Informar siempre el universo total de metas, el filtro aplicado y la "
                "muestra devuelta."
            ),
            "No atribuir riesgos ni trampas territoriales sin vínculo acreditado por entidad/meta.",
        ],
        "diez_dimensiones_revision": {
            "diagnostico": {
                "orden": 1,
                "dominio": "FORMULACION",
                "preguntas_clave": [
                    "¿Qué problema público atiende la meta?",
                    "¿Con qué fuente, población objetivo, territorio y línea base verificable?",
                ],
                "campos_auditados": [
                    "problema_atendido",
                    "fuente_diagnostico",
                    "poblacion_objetivo",
                    "territorio_objetivo",
                    "linea_base",
                ],
            },
            "formulacion": {
                "orden": 2,
                "dominio": "FORMULACION",
                "preguntas_clave": [
                    "¿Existe indicador, fórmula, unidad, sentido, meta verificable y fecha?",
                    "¿Es consistente con el problema y cumple criterios CREMA?",
                ],
                "campos_auditados": [
                    "indicador",
                    "formula",
                    "unidad_medida",
                    "sentido_indicador",
                    "meta_cuatrienio_verificable",
                    "horizonte_temporal",
                    "consistencia_crema",
                ],
            },
            "cadena_resultados": {
                "orden": 3,
                "dominio": "FORMULACION",
                "preguntas_clave": [
                    (
                        "¿Qué actividades producen qué bienes o servicios y cómo contribuyen "
                        "al resultado?"
                    ),
                    "¿Qué supuestos causales o eslabones MGA faltan?",
                ],
                "campos_auditados": [
                    "linea_o_programa",
                    "tipo_meta_mga",
                    "actividades_vinculadas_count",
                    "bienes_servicios_identificados",
                    "supuestos_faltantes",
                ],
            },
            "operacionalizacion": {
                "orden": 4,
                "dominio": "EJECUCION",
                "preguntas_clave": [
                    (
                        "¿La meta tiene programación anual, responsable, hitos, cronograma y "
                        "actividades PA?"
                    ),
                ],
                "campos_auditados": [
                    "dependencia_responsable",
                    "programacion_anual_disponible",
                    "hitos_y_cronograma",
                    "actividades_pa_codigos",
                    "codigo_bpim",
                ],
            },
            "viabilidad_financiera": {
                "orden": 5,
                "dominio": "EJECUCION",
                "preguntas_clave": [
                    "¿Existe financiación identificada y conciliada?",
                    "¿Hay brechas entre PPI plurianual, programación anual y ejecución?",
                ],
                "campos_auditados": [
                    "ppi_linea_total_cop",
                    "monto_programado_pa_cop",
                    "apropiacion_definitiva_triada_cop",
                    "brecha_ppi_vs_apropiacion_cop",
                ],
            },
            "ejecucion_fisica": {
                "orden": 6,
                "dominio": "EJECUCION",
                "preguntas_clave": [
                    "¿Qué se entregó realmente, a quién, dónde y con qué evidencia documental?",
                ],
                "campos_auditados": [
                    "meta_programada_anual",
                    "meta_ejecutada_anual",
                    "avance_fisico_pct",
                    "cortes_reportados",
                    "evidencia_soporte",
                ],
            },
            "ejecucion_financiera": {
                "orden": 7,
                "dominio": "EJECUCION",
                "preguntas_clave": [
                    "¿Cuánto se apropió, respaldó con CDP, comprometió (RP), obligó y pagó?",
                    "¿A qué productos verificables corresponde?",
                ],
                "campos_auditados": [
                    "apropiacion_definitiva_cop",
                    "cdp_cop",
                    "compromisos_rp_cop",
                    "obligaciones_cop",
                    "pagos_tesoreria_cop",
                ],
            },
            "resultados_y_equidad": {
                "orden": 8,
                "dominio": "RESULTADOS",
                "preguntas_clave": [
                    "¿Cambió la condición de la población?",
                    (
                        "¿Cómo se distribuye el cambio entre territorios (LISA) y grupos de "
                        "especial protección?"
                    ),
                ],
                "campos_auditados": [
                    "dimension_seguridad_humana",
                    "grado_frontalidad_sh",
                    "riesgo_isri_atribuido",
                    "territorio_verificado",
                    "clasificacion_dato_territorial",
                ],
            },
            "cambios_del_plan": {
                "orden": 9,
                "dominio": "RESULTADOS",
                "preguntas_clave": [
                    (
                        "¿Qué meta, presupuesto o responsable cambió, cuándo y mediante qué "
                        "acto administrativo?"
                    ),
                ],
                "campos_auditados": [
                    "norma_adopcion_plan",
                    "modificaciones_registradas",
                    "ruptura_estructural_chow_2024",
                    "trazabilidad_version",
                ],
            },
            "control_y_aprendizaje": {
                "orden": 10,
                "dominio": "RESULTADOS",
                "preguntas_clave": [
                    (
                        "¿Quién revisó el hallazgo? ¿Qué correctivo PDCA/Catchball se acordó? "
                        "¿Se verificó su cierre?"
                    ),
                ],
                "campos_auditados": [
                    "revisor_asignado",
                    "requiere_revision_humana_hitl",
                    "correctivo_pdca_catchball",
                    "estado_cierre_hallazgos",
                ],
            },
        },
        "siete_roles_revisores": {
            "curador_evidencia": {
                "orden": 1,
                "nombre": "Curador de Evidencia",
                "responsabilidad": (
                    "Entrega documentos identificados, páginas/tablas/filas fuente y estado de "
                    "calidad; señala dudas de extracción o campos faltantes como "
                    "BRECHA_DE_INFORMACION."
                ),
            },
            "revisor_formulacion": {
                "orden": 2,
                "nombre": "Revisor de Formulación",
                "responsabilidad": (
                    "Examina problema, línea base, indicador, unidad, sentido "
                    "(ascendente/descendente) y meta cuatrienal; distingue defecto comprobable "
                    "de sugerencia de mejora."
                ),
            },
            "revisor_articulacion": {
                "orden": 3,
                "nombre": "Revisor de Articulación",
                "responsabilidad": (
                    "Verifica enlaces entre metas PDD, líneas estratégicas, actividades del "
                    "Plan de Acción, códigos BPIM y financiación PPI."
                ),
            },
            "conciliador_ejecucion": {
                "orden": 4,
                "nombre": "Conciliador de Ejecución",
                "responsabilidad": (
                    "Verifica cortes temporales, cantidades físicas, etapas presupuestales "
                    "(apropiación, CDP, RP, obligaciones, pagos), preservando ceros "
                    "observados (0.0)."
                ),
            },
            "analista_metodologico": {
                "orden": 5,
                "nombre": "Analista Metodológico",
                "responsabilidad": (
                    "Evalúa si los datos de la meta e indicador permiten aplicar DEA, "
                    "pronóstico ARIMA/ISRI o análisis espacial LISA y publica las razones de "
                    "exclusión cuando hay unidades incompatibles o datos insuficientes."
                ),
            },
            "revisor_contradicciones": {
                "orden": 6,
                "nombre": "Revisor de Contradicciones",
                "responsabilidad": (
                    "Busca activamente evidencia que refute un hallazgo y desacuerdos entre "
                    "motores: avance físico alto con baja eficiencia DEA, gasto ejecutado con "
                    "baja similaridad semántica NLP (< 0.45), o ejecución física positiva sin "
                    "respaldo presupuestal."
                ),
            },
            "redactor_informe": {
                "orden": 7,
                "nombre": "Redactor de Informe",
                "responsabilidad": (
                    "Sintetiza únicamente hallazgos respaldados por evidencia reproducible, "
                    "conserva límites e incertidumbre y propone acciones con responsable y "
                    "estado de revisión."
                ),
            },
        },
        "contrato_hallazgo_canonic": {
            "campos_obligatorios": list(CAMPOS_CONTRATO_HALLAZGO),
            "descripcion_campos": {
                "id_hallazgo": "Identificador único determinista del hallazgo por plan y meta",
                "codigo_plan": "Código canónico del Plan de Desarrollo (ej. PDD_2024_2027)",
                "codigo_meta": "Código o identificador canónico de la meta evaluada",
                "dependencia": "Secretaría o entidad responsable acreditada (o SIN_ATRIBUCION)",
                "territorio": "Territorio acreditado con evidencia o PENDIENTE_LOCALIZACION",
                "periodo": "Vigencia o horizonte temporal al que aplica el hecho observado",
                "regla_aplicada": "Código de la regla determinista ejecutada",
                "version_regla": VERSION_REGLA_CANONICA,
                "hechos_observados": "Descripción objetiva de los valores observados (0.0 vs None)",
                "citas_evidencia": "Lista de fuentes documentales, tablas y filas de respaldo",
                "calculo_reproducible": "Fórmula y operandos exactos que producen el hallazgo",
                "severidad": "ALTA | MEDIA | BAJA | INFORMATIVA",
                "incertidumbre": "Nivel y causa de incertidumbre metodológica o de datos",
                "evidencia_contradictoria": (
                    "Hechos o señales de otros motores que matizan el hallazgo"
                ),
                "recomendacion": (
                    "Acción técnica sugerida (no modifica presupuesto automáticamente)"
                ),
                "responsable": "Actor institucional responsable de revisar o subsanar",
                "estado_revision": "PENDIENTE_REVISION_HUMANA | VERIFICADO | SUBSANADO",
            },
        },
    }


def _cargar_cache_evaluador() -> dict[str, Any]:
    if not DEFAULT_CACHE_PATH.exists():
        return {}
    try:
        with DEFAULT_CACHE_PATH.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict) and isinstance(data.get("runs"), dict):
            runs = list(data["runs"].values())
            return runs[0] if runs and isinstance(runs[0], dict) else {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


async def _consultar_datos_bd_csh_async(
    codigo_plan: str,
    dependencia: str | None,
    codigo_meta: str | None,
    limit: int,
) -> dict[str, Any]:
    from sqlalchemy.engine import make_url

    from app.core.config import Settings

    raw_url = Settings().async_database_url
    parsed_url = make_url(raw_url)
    if (parsed_url.database or "").startswith("polis_test"):
        raw_url = parsed_url.set(database="bd_csh").render_as_string(hide_password=False)

    engine = create_async_engine(raw_url, pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            res_total = await conn.execute(
                text(
                    "SELECT COUNT(*) FROM seguimiento.pdd_metas_oficiales "
                    "WHERE codigo_plan = :cp"
                ),
                {"cp": codigo_plan},
            )
            total_metas_plan = int(res_total.scalar() or 0)

            res_plan = await conn.execute(
                text(
                    "SELECT codigo_plan, periodo, nombre_oficial, norma_adopcion, "
                    "ppi_total_corriente_cop, ppi_anual_cop, fuentes, metadatos "
                    "FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan = :cp"
                ),
                {"cp": codigo_plan},
            )
            row_plan = res_plan.mappings().first()
            plan_info = dict(row_plan) if row_plan else {"codigo_plan": codigo_plan}

            res_lineas = await conn.execute(
                text(
                    "SELECT id, codigo, nombre, nivel, ppi_anual_cop, fuente, metadatos "
                    "FROM seguimiento.pdd_lineas_y_programas WHERE codigo_plan = :cp"
                ),
                {"cp": codigo_plan},
            )
            lineas_por_id: dict[str, dict[str, Any]] = {}
            for r_lin in res_lineas.mappings().all():
                d_lin = dict(r_lin)
                lineas_por_id[str(d_lin["id"])] = d_lin

            res_metas = await conn.execute(
                text(
                    "SELECT id, codigo_plan, linea_id, tipo_meta, codigo, nombre, "
                    "indicador, unidad_medida, linea_nombre, fuente, fila_fuente, "
                    "datos_oficiales "
                    "FROM seguimiento.pdd_metas_oficiales "
                    "WHERE codigo_plan = :cp "
                    "ORDER BY fila_fuente NULLS LAST, id"
                ),
                {"cp": codigo_plan},
            )
            todas_metas = [dict(r) for r in res_metas.mappings().all()]

            res_pa = await conn.execute(
                text(
                    "SELECT id, codigo, vigencia, compromiso_pas_codigo, "
                    "linea_estrategica_codigo, programa_nombre, entidad_responsable, "
                    "lider_responsable, tipo_meta, meta_producto_vigencia, "
                    "meta_valor_vigencia, unidad_medida, codigo_bpim, proyecto_nombre, "
                    "descripcion_actividad, verbo_infinitivo, periodicidad_seguimiento, "
                    "avance_t1, avance_t2, avance_t3, avance_t4, porcentaje_avance_fisico, "
                    "fuente_financiacion, monto_programado_cop, monto_ejecutado_cop, "
                    "evidencia_soporte "
                    "FROM seguimiento.actividades_plan_accion"
                )
            )
            actividades_pa = [dict(r) for r in res_pa.mappings().all()]

            triada_ids: list[str] = []
            for m in todas_metas:
                do = m.get("datos_oficiales") or {}
                vinc = do.get("_vinculo_triada") if isinstance(do, dict) else None
                if isinstance(vinc, dict) and vinc.get("registro_triada_id"):
                    triada_ids.append(str(vinc["registro_triada_id"]))

            triada_por_id: dict[str, dict[str, Any]] = {}
            if triada_ids:
                ids_unicos = list(dict.fromkeys(triada_ids))[:500]
                res_tri = await conn.execute(
                    text(
                        "SELECT id, vigencia, corte_periodo, entidad_normalizada, "
                        "linea_estrategica, codigo_meta_pdd, codigo_bpim, indicador, "
                        "descripcion_actividad, meta_programada_anual, meta_ejecutada_anual, "
                        "avance_t1, avance_t2, avance_t3, avance_t4, avance_fisico_pct, "
                        "apropiacion_definitiva_cop, cdp_cop, compromisos_rp_cop, "
                        "obligaciones_cop, pagos_tesoreria_cop, hoja_origen, fila_origen_num "
                        "FROM seguimiento.registros_triada_normalizados "
                        "WHERE CAST(id AS TEXT) = ANY(:ids)"
                    ),
                    {"ids": ids_unicos},
                )
                for r_t in res_tri.mappings().all():
                    d_t = dict(r_t)
                    triada_por_id[str(d_t["id"])] = d_t

            return {
                "total_metas_plan": total_metas_plan,
                "plan_info": plan_info,
                "lineas_por_id": lineas_por_id,
                "metas": todas_metas,
                "actividades_pa": actividades_pa,
                "triada_por_id": triada_por_id,
                "filtro_dependencia": dependencia,
                "filtro_codigo_meta": codigo_meta,
                "limit": limit,
            }
    finally:
        await engine.dispose()


def _consultar_datos_bd_csh_sync(
    codigo_plan: str,
    dependencia: str | None,
    codigo_meta: str | None,
    limit: int,
) -> dict[str, Any]:
    coro = _consultar_datos_bd_csh_async(codigo_plan, dependencia, codigo_meta, limit)
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result(timeout=30)


def _construir_hallazgo_canonico(
    *,
    id_hallazgo: str,
    codigo_plan: str,
    codigo_meta: str,
    dependencia: str,
    territorio: str,
    periodo: str,
    regla_aplicada: str,
    hechos_observados: str,
    citas_evidencia: list[str],
    calculo_reproducible: str,
    severidad: str,
    incertidumbre: str,
    evidencia_contradictoria: str,
    recomendacion: str,
    responsable: str,
    estado_revision: str = "PENDIENTE_REVISION_HUMANA",
) -> dict[str, Any]:
    return {
        "id_hallazgo": id_hallazgo,
        "codigo_plan": codigo_plan,
        "codigo_meta": codigo_meta,
        "dependencia": dependencia or "SIN_ATRIBUCION",
        "territorio": territorio or "PENDIENTE_LOCALIZACION",
        "periodo": periodo,
        "regla_aplicada": regla_aplicada,
        "version_regla": VERSION_REGLA_CANONICA,
        "hechos_observados": hechos_observados,
        "citas_evidencia": citas_evidencia,
        "calculo_reproducible": calculo_reproducible,
        "severidad": severidad,
        "incertidumbre": incertidumbre,
        "evidencia_contradictoria": evidencia_contradictoria,
        "recomendacion": recomendacion,
        "responsable": responsable or "Secretaría de Planeación Distrital",
        "estado_revision": estado_revision,
    }


def _evaluar_meta_individual(
    meta: dict[str, Any],
    idx_meta: int,
    codigo_plan: str,
    plan_info: dict[str, Any],
    lineas_por_id: dict[str, dict[str, Any]],
    actividades_pa: list[dict[str, Any]],
    triada_por_id: dict[str, dict[str, Any]],
    dea_por_dep: dict[str, list[float]],
    nlp_por_meta: dict[str, float],
    isri_por_dep: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    datos_of = (
        meta.get("datos_oficiales") if isinstance(meta.get("datos_oficiales"), dict) else {}
    )
    meta_id_str = str(meta.get("id") or f"META-{idx_meta:04d}")
    cod_meta = str(
        meta.get("codigo")
        or _extraer_campo_dict(datos_of, ("codigo_meta", "codigo"))
        or f"M-{meta.get('fila_fuente') or idx_meta:04d}"
    )
    nombre_meta = str(
        meta.get("nombre")
        or _extraer_campo_dict(datos_of, ("Meta del cuatrienio", "meta_cuatrienio"))
        or ""
    ).strip()
    indicador_texto = str(
        meta.get("indicador")
        or _extraer_campo_dict(
            datos_of, ("Indicador de producto", "Indicador de resultado", "indicador")
        )
        or ""
    ).strip()
    unidad_medida = meta.get("unidad_medida") or _extraer_campo_dict(
        datos_of, ("Unidad de medida", "unidad")
    )
    responsable_raw = meta.get("dependencia") or _extraer_campo_dict(
        datos_of, ("Responsable", "Responsabl e", "Entidad responsable")
    )
    dependencia_resp = str(responsable_raw).strip() if responsable_raw else "SIN_ATRIBUCION"
    poblacion_obj = _extraer_campo_dict(datos_of, ("Población", "Poblacion objetivo"))
    territorio_obj = _extraer_campo_dict(datos_of, ("Territorio", "Localidad", "UCG"))
    linea_base_raw = _extraer_campo_dict(datos_of, ("Línea base", "Linea base"))
    valor_meta_cuatrienio_raw = _extraer_campo_dict(
        datos_of, ("Meta del cuatrienio", "valor_meta_cuatrienio", "meta_cuatrienio")
    )
    valor_meta_num = _to_float_preserve_zero(valor_meta_cuatrienio_raw)
    linea_base_num = _to_float_preserve_zero(linea_base_raw)

    linea_id_str = str(meta.get("linea_id") or "")
    linea_obj = lineas_por_id.get(linea_id_str) or {}
    linea_nombre = str(
        meta.get("linea_nombre") or linea_obj.get("nombre") or "SIN_LINEA_VINCULADA"
    )
    ppi_anual_linea = linea_obj.get("ppi_anual_cop") or {}
    ppi_total_linea = (
        sum(float(v) for v in ppi_anual_linea.values() if v is not None)
        if isinstance(ppi_anual_linea, dict) and ppi_anual_linea
        else None
    )

    vinc_triada = datos_of.get("_vinculo_triada") if isinstance(datos_of, dict) else None
    reg_triada_id = (
        str(vinc_triada.get("registro_triada_id"))
        if isinstance(vinc_triada, dict) and vinc_triada.get("registro_triada_id")
        else None
    )
    reg_triada = (
        triada_por_id.get(reg_triada_id)
        if reg_triada_id
        else (
            meta.get("registro_triada")
            if isinstance(meta.get("registro_triada"), dict)
            else None
        )
    )

    pa_vinculadas: list[dict[str, Any]] = []
    if isinstance(meta.get("actividades_pa_vinculadas"), list):
        pa_vinculadas = list(meta["actividades_pa_vinculadas"])
    else:
        norm_dep = _normalizar(dependencia_resp)
        norm_lin = _normalizar(linea_nombre)
        for act in actividades_pa:
            act_dep = _normalizar(act.get("entidad_responsable"))
            act_prog = _normalizar(act.get("programa_nombre"))
            if norm_dep and norm_dep != "sin_atribucion" and norm_dep in act_dep:
                if not norm_lin or any(
                    tok in act_prog for tok in norm_lin.split()[:2] if len(tok) > 3
                ):
                    pa_vinculadas.append(act)
                elif len(pa_vinculadas) < 2:
                    pa_vinculadas.append(act)

    meta_prog_anual = (
        _to_float_preserve_zero(reg_triada.get("meta_programada_anual"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("meta_programada_anual"))
    )
    meta_ejec_anual = (
        _to_float_preserve_zero(reg_triada.get("meta_ejecutada_anual"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("meta_ejecutada_anual"))
    )
    avance_fisico_pct = (
        _to_float_preserve_zero(reg_triada.get("avance_fisico_pct"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("avance_fisico_pct"))
    )
    if avance_fisico_pct is None and pa_vinculadas:
        avances_pa = [
            _to_float_preserve_zero(a.get("porcentaje_avance_fisico")) for a in pa_vinculadas
        ]
        avances_validos = [v for v in avances_pa if v is not None]
        if avances_validos:
            avance_fisico_pct = round(sum(avances_validos) / len(avances_validos), 4)

    apropiacion_cop = (
        _to_float_preserve_zero(reg_triada.get("apropiacion_definitiva_cop"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("apropiacion_definitiva_cop"))
    )
    cdp_cop = (
        _to_float_preserve_zero(reg_triada.get("cdp_cop"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("cdp_cop"))
    )
    compromisos_rp_cop = (
        _to_float_preserve_zero(reg_triada.get("compromisos_rp_cop"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("compromisos_rp_cop"))
    )
    obligaciones_cop = (
        _to_float_preserve_zero(reg_triada.get("obligaciones_cop"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("obligaciones_cop"))
    )
    pagos_cop = (
        _to_float_preserve_zero(reg_triada.get("pagos_tesoreria_cop"))
        if reg_triada
        else _to_float_preserve_zero(meta.get("pagos_tesoreria_cop"))
    )

    monto_prog_pa_cop = (
        sum(
            _to_float_preserve_zero(a.get("monto_programado_cop")) or 0.0
            for a in pa_vinculadas
        )
        if pa_vinculadas
        else None
    )
    monto_ejec_pa_cop = (
        sum(
            _to_float_preserve_zero(a.get("monto_ejecutado_cop")) or 0.0
            for a in pa_vinculadas
        )
        if pa_vinculadas
        else None
    )

    thetas_dep = dea_por_dep.get(_normalizar(dependencia_resp), [])
    theta_bcc_dep = (
        round(sum(thetas_dep) / len(thetas_dep), 4)
        if thetas_dep
        else _to_float_preserve_zero(meta.get("theta_bcc"))
    )
    sim_coseno = nlp_por_meta.get(_normalizar(cod_meta))
    if sim_coseno is None:
        sim_coseno = _to_float_preserve_zero(meta.get("similaridad_coseno_nlp"))

    serie_dep = (
        isri_por_dep.get(_normalizar(dependencia_resp))
        if dependencia_resp != "SIN_ATRIBUCION"
        else None
    )
    isri_atribuido = (
        _to_float_preserve_zero(serie_dep.get("ISRI"))
        if serie_dep
        else _to_float_preserve_zero(meta.get("ISRI"))
    )
    ruptura_chow = (
        bool((serie_dep.get("chow") or {}).get("ruptura_estructural_significativa"))
        if serie_dep
        else False
    )

    sentido_ind = _detectar_sentido_indicador(f"{nombre_meta} {indicador_texto}")
    fuente_doc = str(meta.get("fuente") or "SIN_FUENTE_DOCUMENTAL")
    fila_fuente = meta.get("fila_fuente")
    cita_principal = (
        f"{fuente_doc}#fila={fila_fuente}" if fila_fuente is not None else fuente_doc
    )

    origen_trim = reg_triada if isinstance(reg_triada, dict) else meta
    auditoria_meta = auditar_consistencia_serie_y_sentido_indicador(
        {
            "indicador": indicador_texto,
            "nombre_meta": nombre_meta,
            "unidad_medida": unidad_medida,
            "formula": _extraer_campo_dict(datos_of, ("Fórmula", "Formula", "formula")),
            "linea_base": linea_base_num,
            "meta_cuatrienio": valor_meta_num,
            "meta_valor_vigencia": meta_prog_anual,
            "porcentaje_avance_fisico": avance_fisico_pct,
            "avance_t1": origen_trim.get("avance_t1"),
            "avance_t2": origen_trim.get("avance_t2"),
            "avance_t3": origen_trim.get("avance_t3"),
            "avance_t4": origen_trim.get("avance_t4"),
            "datos_oficiales": datos_of,
        }
    )

    auditorias_pa = [
        auditar_consistencia_serie_y_sentido_indicador(act) for act in pa_vinculadas
    ]
    pa_con_trimestres = [
        a["consistencia_trimestral_t1_t4"]
        for a in auditorias_pa
        if a["consistencia_trimestral_t1_t4"]["trimestres_reportados_count"] > 0
        or a["inconsistencia_aritmetica_trimestral"]
    ]
    if pa_con_trimestres:
        base_trim = dict(pa_con_trimestres[0])
        incons_list: list[str] = []
        for item_t in pa_con_trimestres:
            incons_list.extend(item_t["detalle_inconsistencia_trimestral"])
        if auditoria_meta["inconsistencia_aritmetica_trimestral"]:
            incons_list.extend(auditoria_meta["detalle_inconsistencia_trimestral"])
        base_trim["inconsistencia_aritmetica_trimestral"] = len(incons_list) > 0
        base_trim["detalle_inconsistencia_trimestral"] = incons_list
        base_trim["actividades_pa_auditadas_count"] = len(auditorias_pa)
        consistencia_trimestral_consolidada = base_trim
    else:
        base_trim = dict(auditoria_meta["consistencia_trimestral_t1_t4"])
        base_trim["actividades_pa_auditadas_count"] = len(auditorias_pa)
        consistencia_trimestral_consolidada = base_trim

    dim_1_diagnostico = {
        "estado": (
            ESTADO_CON_EVIDENCIA
            if (linea_base_raw is not None and poblacion_obj is not None)
            else ESTADO_BRECHA_INFO
        ),
        "problema_atendido": linea_nombre,
        "fuente_diagnostico": fuente_doc,
        "poblacion_objetivo": (
            poblacion_obj if poblacion_obj is not None else ESTADO_BRECHA_INFO
        ),
        "territorio_objetivo": (
            territorio_obj if territorio_obj is not None else "PENDIENTE_LOCALIZACION"
        ),
        "linea_base_texto": (
            linea_base_raw if linea_base_raw is not None else ESTADO_BRECHA_INFO
        ),
        "linea_base_numerica": linea_base_num,
    }

    tiene_formulacion_completa = bool(
        indicador_texto and nombre_meta and valor_meta_num is not None
    )
    dim_2_formulacion = {
        "estado": (
            ESTADO_ALERTA_REVISION
            if auditoria_meta["meta_regresiva"]
            else (
                ESTADO_CERO_OBSERVADO
                if valor_meta_num == 0.0
                else (
                    ESTADO_CON_EVIDENCIA
                    if tiene_formulacion_completa
                    else ESTADO_BRECHA_INFO
                )
            )
        ),
        "indicador": indicador_texto or ESTADO_BRECHA_INFO,
        "formula": (
            "COCIENTE_PORCENTUAL"
            if "%" in indicador_texto or "porcentaje" in _normalizar(indicador_texto)
            else "CONTEO_ACUMULADO_UNIDAD"
        ),
        "formula_documental_explicita": auditoria_meta["formula_documental_explicita"],
        "unidad_medida": unidad_medida if unidad_medida is not None else ESTADO_BRECHA_INFO,
        "sentido_indicador": sentido_ind,
        "sentido_indicador_detectado": auditoria_meta["sentido_indicador"],
        "meta_regresiva": auditoria_meta["meta_regresiva"],
        "evaluacion_linea_base_vs_meta": auditoria_meta["evaluacion_linea_base_vs_meta"],
        "meta_cuatrienio_texto": (
            valor_meta_cuatrienio_raw or nombre_meta or ESTADO_BRECHA_INFO
        ),
        "meta_cuatrienio_numerica": valor_meta_num,
        "horizonte_temporal": str(plan_info.get("periodo") or codigo_plan),
        "consistencia_crema": (
            "ALERTA_META_REGRESIVA"
            if auditoria_meta["meta_regresiva"]
            else (
                "CUMPLE_ESTRUCTURA_BASICA"
                if tiene_formulacion_completa
                else ESTADO_BRECHA_INFO
            )
        ),
    }

    supuestos_faltantes: list[str] = []
    if not pa_vinculadas:
        supuestos_faltantes.append("Sin actividades operativas vinculadas en Plan de Acción")
    if unidad_medida is None:
        supuestos_faltantes.append("Unidad de medida explícita no declarada en fuente oficial")
    dim_3_cadena_resultados = {
        "estado": ESTADO_CON_EVIDENCIA if pa_vinculadas else ESTADO_BRECHA_INFO,
        "linea_o_programa": linea_nombre,
        "tipo_meta_mga": str(meta.get("tipo_meta") or "NO_CLASIFICADA"),
        "actividades_vinculadas_count": len(pa_vinculadas),
        "bienes_servicios_identificados": [
            str(a.get("meta_producto_vigencia") or a.get("descripcion_actividad") or "")[:120]
            for a in pa_vinculadas[:5]
        ],
        "similaridad_semantica_nlp": sim_coseno,
        "supuestos_faltantes": supuestos_faltantes,
    }

    codigos_bpim = sorted(
        {
            str(a.get("codigo_bpim"))
            for a in pa_vinculadas
            if a.get("codigo_bpim") is not None
        }
        | (
            {str(reg_triada["codigo_bpim"])}
            if reg_triada and reg_triada.get("codigo_bpim")
            else set()
        )
    )
    dim_4_operacionalizacion = {
        "estado": (
            ESTADO_CON_EVIDENCIA
            if (dependencia_resp != "SIN_ATRIBUCION" and (pa_vinculadas or reg_triada))
            else ESTADO_BRECHA_INFO
        ),
        "dependencia_responsable": dependencia_resp,
        "programacion_anual_disponible": bool(
            meta_prog_anual is not None or monto_prog_pa_cop is not None
        ),
        "hitos_y_cronograma": (
            "TRIMESTRAL_VERIFICABLE" if pa_vinculadas else ESTADO_BRECHA_INFO
        ),
        "actividades_pa_codigos": [
            str(a.get("codigo")) for a in pa_vinculadas if a.get("codigo")
        ],
        "codigos_bpim": codigos_bpim,
    }

    brecha_ppi_aprop = (
        round(ppi_total_linea - apropiacion_cop, 2)
        if (ppi_total_linea is not None and apropiacion_cop is not None)
        else None
    )
    tiene_financiacion = (
        ppi_total_linea is not None
        or apropiacion_cop is not None
        or monto_prog_pa_cop is not None
    )
    dim_5_viabilidad_financiera = {
        "estado": ESTADO_CON_EVIDENCIA if tiene_financiacion else ESTADO_BRECHA_INFO,
        "ppi_linea_total_cop": ppi_total_linea,
        "monto_programado_pa_cop": monto_prog_pa_cop,
        "apropiacion_definitiva_triada_cop": apropiacion_cop,
        "brecha_ppi_vs_apropiacion_cop": brecha_ppi_aprop,
    }

    if meta_ejec_anual == 0.0 or avance_fisico_pct == 0.0:
        estado_ej_fisica = ESTADO_CERO_OBSERVADO
    elif meta_ejec_anual is not None or avance_fisico_pct is not None:
        estado_ej_fisica = ESTADO_CON_EVIDENCIA
    else:
        estado_ej_fisica = ESTADO_BRECHA_INFO

    dim_6_ejecucion_fisica = {
        "estado": estado_ej_fisica,
        "meta_programada_anual": meta_prog_anual,
        "meta_ejecutada_anual": meta_ejec_anual,
        "avance_fisico_pct": avance_fisico_pct,
        "consistencia_trimestral_t1_t4": consistencia_trimestral_consolidada,
        "cortes_reportados": (
            str(reg_triada.get("corte_periodo"))
            if reg_triada and reg_triada.get("corte_periodo")
            else ("TRIMESTRAL_PA" if pa_vinculadas else ESTADO_BRECHA_INFO)
        ),
        "evidencia_soporte": (
            [
                str(a.get("evidencia_soporte"))
                for a in pa_vinculadas
                if a.get("evidencia_soporte")
            ]
            or ([cita_principal] if reg_triada else [])
        ),
    }

    if apropiacion_cop == 0.0 or compromisos_rp_cop == 0.0:
        estado_ej_fin = ESTADO_CERO_OBSERVADO
    elif any(
        v is not None
        for v in (
            apropiacion_cop,
            cdp_cop,
            compromisos_rp_cop,
            obligaciones_cop,
            pagos_cop,
            monto_ejec_pa_cop,
        )
    ):
        estado_ej_fin = ESTADO_CON_EVIDENCIA
    else:
        estado_ej_fin = ESTADO_BRECHA_INFO

    dim_7_ejecucion_financiera = {
        "estado": estado_ej_fin,
        "apropiacion_definitiva_cop": apropiacion_cop,
        "cdp_cop": cdp_cop,
        "compromisos_rp_cop": compromisos_rp_cop,
        "obligaciones_cop": obligaciones_cop,
        "pagos_tesoreria_cop": pagos_cop,
        "monto_ejecutado_pa_cop": monto_ejec_pa_cop,
        "eficiencia_dea_bcc_referencia": theta_bcc_dep,
    }

    grado_sh = str(datos_of.get("grado_frontalidad_sh") or "NO_CLASIFICADO")
    dim_sh = datos_of.get("dimension_sh_primaria")
    dim_8_resultados_y_equidad = {
        "estado": (
            ESTADO_CON_EVIDENCIA
            if (territorio_obj is not None and isri_atribuido is not None)
            else ESTADO_BRECHA_INFO
        ),
        "dimension_seguridad_humana": (
            dim_sh if dim_sh is not None else "MULTIDIMENSIONAL_PENDIENTE"
        ),
        "grado_frontalidad_sh": grado_sh,
        "riesgo_isri_atribuido": isri_atribuido,
        "territorio_verificado": (
            territorio_obj
            if territorio_obj is not None
            else "SIN_VINCULO_TERRITORIAL_ACREDITADO"
        ),
        "clasificacion_dato_territorial": (
            "OBSERVADO_EN_DOCUMENTO_PDD"
            if territorio_obj is not None
            else "NO_ATRIBUIBLE_SIN_SOPORTE_LOCALIZADO"
        ),
    }

    dim_9_cambios_del_plan = {
        "estado": (
            ESTADO_CON_EVIDENCIA if plan_info.get("norma_adopcion") else ESTADO_BRECHA_INFO
        ),
        "norma_adopcion_plan": str(
            plan_info.get("norma_adopcion") or "SIN_NORMA_REGISTRADA"
        ),
        "modificaciones_registradas": "SIN_ACTO_MODIFICATORIO_REGISTRADO",
        "ruptura_estructural_chow_2024": ruptura_chow,
        "trazabilidad_version": VERSION_REGLA_CANONICA,
    }

    auditoria_for = datos_of.get("_auditoria_forense") if isinstance(datos_of, dict) else {}
    req_hitl = bool(
        isinstance(auditoria_for, dict)
        and auditoria_for.get("requiere_revision_humana", True)
    )

    hallazgos: list[dict[str, Any]] = []
    contradicciones_detectadas: list[str] = []

    if (
        avance_fisico_pct is not None
        and avance_fisico_pct >= 80.0
        and theta_bcc_dep is not None
        and theta_bcc_dep < 0.60
    ):
        msg_c1 = (
            f"Cumplimiento físico alto reportado ({avance_fisico_pct}%) contradice baja "
            f"eficiencia técnica DEA-BCC ({theta_bcc_dep}) en {dependencia_resp}."
        )
        contradicciones_detectadas.append(msg_c1)
        calc_c1 = (
            f"avance_fisico_pct ({avance_fisico_pct}) >= 80.0 "
            f"AND theta_bcc ({theta_bcc_dep}) < 0.60"
        )
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-CONTRA-DEA",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_CONTRADICCION_AVANCE_FISICO_VS_DEA_BCC",
                hechos_observados=msg_c1,
                citas_evidencia=[cita_principal],
                calculo_reproducible=calc_c1,
                severidad="ALTA",
                incertidumbre="MEDIA (depende de homogeneidad de unidades DEA en la frontera)",
                evidencia_contradictoria=(
                    f"El reporte físico indica {avance_fisico_pct}% de logro, pero la "
                    f"relación insumo-producto relativa DEA es {theta_bcc_dep}."
                ),
                recomendacion=(
                    "Auditar soportes de entrega física y costos unitarios en sesión Catchball."
                ),
                responsable=dependencia_resp,
            )
        )

    gasto_efectivo = compromisos_rp_cop or apropiacion_cop or monto_ejec_pa_cop
    if (
        gasto_efectivo is not None
        and gasto_efectivo > 0.0
        and sim_coseno is not None
        and sim_coseno < 0.45
    ):
        msg_c2 = (
            f"Recursos comprometidos/apropiados ({gasto_efectivo:,.2f} COP) asociados a "
            f"actividad con baja similaridad semántica coseno ({sim_coseno} < 0.45)."
        )
        contradicciones_detectadas.append(msg_c2)
        calc_c2 = (
            f"gasto_cop ({gasto_efectivo}) > 0 "
            f"AND similaridad_coseno ({sim_coseno}) < 0.45"
        )
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-CONTRA-NLP",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_CONTRADICCION_PRESUPUESTO_VS_MISSION_CREEP_NLP",
                hechos_observados=msg_c2,
                citas_evidencia=[cita_principal],
                calculo_reproducible=calc_c2,
                severidad="ALTA",
                incertidumbre=(
                    "MEDIA (similaridad léxica requiere validación experta de par meta-actividad)"
                ),
                evidencia_contradictoria=(
                    "Existe respaldo presupuestal formal, pero el texto de la actividad "
                    "operativa diverge semánticamente de la meta estratégica."
                ),
                recomendacion=(
                    "Verificar vínculo causal MGA entre la actividad contratada y la meta PDD."
                ),
                responsable=dependencia_resp,
            )
        )

    if (
        gasto_efectivo is not None
        and gasto_efectivo > 0.0
        and (meta_ejec_anual == 0.0 or avance_fisico_pct == 0.0)
    ):
        msg_c3 = (
            f"Desfase físico-financiero: gasto registrado ({gasto_efectivo:,.2f} COP) con "
            f"ejecución física observada exactamente en 0.0."
        )
        contradicciones_detectadas.append(msg_c3)
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-CONTRA-CERO-FISICO",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_CONTRADICCION_GASTO_POSITIVO_AVANCE_CERO",
                hechos_observados=msg_c3,
                citas_evidencia=[cita_principal],
                calculo_reproducible=(
                    f"gasto_cop ({gasto_efectivo}) > 0 AND avance_fisico == 0.0"
                ),
                severidad="ALTA",
                incertidumbre="BAJA (valores numéricos reportados directamente en matriz)",
                evidencia_contradictoria=(
                    "Apropiación/compromiso positivo frente a entrega física reportada en cero."
                ),
                recomendacion=(
                    "Conciliar rezago de entregas físicas frente a compromisos RP expedidos."
                ),
                responsable=dependencia_resp,
            )
        )

    sin_presupuesto_cero = apropiacion_cop == 0.0 and (
        compromisos_rp_cop is None or compromisos_rp_cop == 0.0
    )
    if (avance_fisico_pct is not None and avance_fisico_pct > 0.0) and sin_presupuesto_cero:
        msg_c4 = (
            f"Avance físico positivo ({avance_fisico_pct}%) reportado con "
            "apropiación/compromiso presupuestal igual a 0.0 COP."
        )
        contradicciones_detectadas.append(msg_c4)
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-CONTRA-SIN-PRESUPUESTO",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_CONTRADICCION_AVANCE_POSITIVO_PRESUPUESTO_CERO",
                hechos_observados=msg_c4,
                citas_evidencia=[cita_principal],
                calculo_reproducible=(
                    f"avance_fisico_pct ({avance_fisico_pct}) > 0 AND apropiacion_cop == 0.0"
                ),
                severidad="MEDIA",
                incertidumbre=(
                    "BAJA (puede corresponder a meta de gestión sin erogación u omisión contable)"
                ),
                evidencia_contradictoria=(
                    "Avance físico reportado sin ejecución presupuestal asociada."
                ),
                recomendacion=(
                    "Aclarar si la meta opera con recursos de funcionamiento o si falta "
                    "cargue presupuestal."
                ),
                responsable=dependencia_resp,
            )
        )

    if estado_ej_fisica == ESTADO_BRECHA_INFO or estado_ej_fin == ESTADO_BRECHA_INFO:
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-BRECHA-DATOS",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_PRESERVACION_NULOS_BRECHA_INFORMACION",
                hechos_observados=(
                    f"Meta con brecha de información en ejecución (física={estado_ej_fisica}, "
                    f"financiera={estado_ej_fin}). No se imputan ni inventan calificaciones."
                ),
                citas_evidencia=[cita_principal],
                calculo_reproducible=(
                    "meta_ejecutada_anual IS NULL OR apropiacion_definitiva_cop IS NULL"
                ),
                severidad="MEDIA",
                incertidumbre="ALTA (ausencia de registro conciliado en seguimiento)",
                evidencia_contradictoria=(
                    "Meta existe en el Plan Indicativo oficial pero carece de corte completo."
                ),
                recomendacion=(
                    "Solicitar a la dependencia responsable el cargue del corte físico y "
                    "financiero."
                ),
                responsable=dependencia_resp,
            )
        )

    if auditoria_meta["meta_regresiva"]:
        eval_lb = auditoria_meta["evaluacion_linea_base_vs_meta"]
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-META-REGRESIVA",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_META_REGRESIVA_VS_LINEA_BASE",
                hechos_observados=str(eval_lb["detalle"]),
                citas_evidencia=[cita_principal],
                calculo_reproducible=(
                    f"sentido={auditoria_meta['sentido_indicador']}, "
                    f"linea_base={eval_lb['linea_base']}, "
                    f"meta={eval_lb['meta_evaluada']}"
                ),
                severidad="ALTA",
                incertidumbre="BAJA (comparación directa entre línea base y meta declarada)",
                evidencia_contradictoria=(
                    "La dirección del cambio entre línea base y meta contradice el sentido "
                    "esperado del indicador."
                ),
                recomendacion=(
                    "Verificar en sesión técnica si el indicador mide flujo nuevo anual o si "
                    "existe error tipográfico entre línea base y meta cuatrienal."
                ),
                responsable=dependencia_resp,
            )
        )

    if consistencia_trimestral_consolidada["inconsistencia_aritmetica_trimestral"]:
        det_trim = "; ".join(
            consistencia_trimestral_consolidada["detalle_inconsistencia_trimestral"]
        )
        contradicciones_detectadas.append(det_trim)
        hallazgos.append(
            _construir_hallazgo_canonico(
                id_hallazgo=f"HAL-{codigo_plan}-{cod_meta}-INCONSISTENCIA-T1-T4",
                codigo_plan=codigo_plan,
                codigo_meta=cod_meta,
                dependencia=dependencia_resp,
                territorio=str(territorio_obj or "PENDIENTE_LOCALIZACION"),
                periodo=str(plan_info.get("periodo") or codigo_plan),
                regla_aplicada="REGLA_INCONSISTENCIA_ARITMETICA_TRIMESTRAL_T1_T4",
                hechos_observados=det_trim,
                citas_evidencia=[cita_principal],
                calculo_reproducible=(
                    f"trimestres_reportados="
                    f"{consistencia_trimestral_consolidada['trimestres_reportados_count']}, "
                    f"ceros_observados="
                    f"{consistencia_trimestral_consolidada['trimestres_en_cero_observado_count']}, "
                    f"suma_trimestral={consistencia_trimestral_consolidada['suma_trimestral']}, "
                    f"porcentaje_avance_fisico="
                    f"{consistencia_trimestral_consolidada['porcentaje_avance_fisico']}"
                ),
                severidad="ALTA",
                incertidumbre="BAJA (verificación aritmética directa sobre cortes T1-T4)",
                evidencia_contradictoria=(
                    "Desacuerdo aritmético entre los cortes trimestrales T1-T4 y el porcentaje "
                    "de avance físico consolidado."
                ),
                recomendacion=(
                    "Reconstruir el porcentaje de avance físico desde los numeradores "
                    "trimestrales T1-T4 y el denominador de la meta anual."
                ),
                responsable=dependencia_resp,
            )
        )

    dim_10_control_y_aprendizaje = {
        "estado": ESTADO_ALERTA_REVISION if hallazgos else ESTADO_CON_EVIDENCIA,
        "revisor_asignado": "Comité Técnico Planeación + Auditoría EAF",
        "requiere_revision_humana_hitl": bool(req_hitl or contradicciones_detectadas),
        "correctivo_pdca_catchball": (
            "Activar sesión Catchball para subsanar contradicciones o brechas de datos."
            if hallazgos
            else "Mantener monitoreo trimestral ordinario."
        ),
        "estado_cierre_hallazgos": (
            "ABIERTO_PENDIENTE_VERIFICACION" if hallazgos else "SIN_HALLAZGOS_ABIERTOS"
        ),
    }

    evaluacion_10_dimensiones = {
        "diagnostico": dim_1_diagnostico,
        "formulacion": dim_2_formulacion,
        "cadena_resultados": dim_3_cadena_resultados,
        "operacionalizacion": dim_4_operacionalizacion,
        "viabilidad_financiera": dim_5_viabilidad_financiera,
        "ejecucion_fisica": dim_6_ejecucion_fisica,
        "ejecucion_financiera": dim_7_ejecucion_financiera,
        "resultados_y_equidad": dim_8_resultados_y_equidad,
        "cambios_del_plan": dim_9_cambios_del_plan,
        "control_y_aprendizaje": dim_10_control_y_aprendizaje,
    }

    estado_curador = (
        ESTADO_CON_EVIDENCIA if fuente_doc != "SIN_FUENTE_DOCUMENTAL" else ESTADO_BRECHA_INFO
    )
    razones_excl: list[str] = []
    if unidad_medida is None:
        razones_excl.append("Falta unidad de medida explícita para comparabilidad DEA/ISRI")
    if not (apropiacion_cop and apropiacion_cop > 0):
        razones_excl.append("Sin apropiación presupuestal observada (> 0) para frontera DEA")
    if territorio_obj is None:
        razones_excl.append(
            "Sin localización territorial verificada para inferencia espacial LISA"
        )

    estado_contra = (
        ESTADO_CONTRADICCION
        if contradicciones_detectadas
        else "SIN_CONTRADICCIONES_DETECTADAS"
    )
    dictamen_7_revisores = {
        "curador_evidencia": {
            "estado": estado_curador,
            "fuente_primaria": fuente_doc,
            "fila_fuente": fila_fuente,
            "registro_triada_id": reg_triada_id,
            "observacion": (
                f"Evidencia documental trazada en {cita_principal}."
                if fuente_doc != "SIN_FUENTE_DOCUMENTAL"
                else "Falta referencia documental primaria."
            ),
        },
        "revisor_formulacion": {
            "estado": dim_2_formulacion["estado"],
            "sentido_detectado": sentido_ind,
            "sentido_indicador_detectado": auditoria_meta["sentido_indicador"],
            "meta_regresiva": auditoria_meta["meta_regresiva"],
            "formula_documental_explicita": auditoria_meta["formula_documental_explicita"],
            "unidad_medida": dim_2_formulacion["unidad_medida"],
            "meta_cuatrienio_numerica": valor_meta_num,
            "observacion": (
                auditoria_meta["evaluacion_linea_base_vs_meta"]["detalle"]
                if auditoria_meta["meta_regresiva"]
                else (
                    f"Indicador con sentido {sentido_ind}; meta numérica={valor_meta_num}."
                    if tiene_formulacion_completa
                    else "Formulación incompleta: falta unidad, valor verificable o línea base."
                )
            ),
        },
        "revisor_articulacion": {
            "estado": (
                ESTADO_CON_EVIDENCIA
                if (pa_vinculadas or reg_triada is not None)
                else ESTADO_BRECHA_INFO
            ),
            "linea_estrategica": linea_nombre,
            "actividades_pa_vinculadas": len(pa_vinculadas),
            "codigos_bpim": codigos_bpim,
            "observacion": (
                f"Articulada con {len(pa_vinculadas)} actividad(es) PA y línea "
                f"'{linea_nombre}'."
                if (pa_vinculadas or reg_triada is not None)
                else "Meta sin enlace verificado con actividades del Plan de Acción."
            ),
        },
        "conciliador_ejecucion": {
            "estado_fisico": estado_ej_fisica,
            "estado_financiero": estado_ej_fin,
            "ceros_observados_preservados": bool(
                meta_ejec_anual == 0.0
                or avance_fisico_pct == 0.0
                or apropiacion_cop == 0.0
                or compromisos_rp_cop == 0.0
                or consistencia_trimestral_consolidada["ceros_observados_preservados"]
            ),
            "inconsistencia_aritmetica_trimestral": consistencia_trimestral_consolidada[
                "inconsistencia_aritmetica_trimestral"
            ],
            "consistencia_trimestral_t1_t4": consistencia_trimestral_consolidada,
            "observacion": (
                f"Físico={estado_ej_fisica} (avance={avance_fisico_pct}), "
                f"Financiero={estado_ej_fin} (apropiación={apropiacion_cop}), "
                f"Inconsistencia T1-T4="
                f"{consistencia_trimestral_consolidada['inconsistencia_aritmetica_trimestral']}."
            ),
        },
        "analista_metodologico": {
            "apto_para_dea": bool(
                apropiacion_cop is not None
                and apropiacion_cop > 0.0
                and unidad_medida is not None
                and (meta_ejec_anual is not None or avance_fisico_pct is not None)
            ),
            "apto_para_pronostico_isri": bool(
                serie_dep is not None and unidad_medida is not None
            ),
            "apto_para_lisa_espacial": bool(territorio_obj is not None),
            "razones_exclusion": razones_excl,
        },
        "revisor_contradicciones": {
            "estado": estado_contra,
            "total_contradicciones": len(contradicciones_detectadas),
            "contradicciones": contradicciones_detectadas,
        },
        "redactor_informe": {
            "resumen_ejecutivo_meta": (
                f"Meta [{cod_meta}] ({dependencia_resp}): "
                f"Formulación={dim_2_formulacion['estado']}, "
                f"Ejecución Física={estado_ej_fisica}, "
                f"Ejecución Financiera={estado_ej_fin}, "
                f"Contradicciones={len(contradicciones_detectadas)}, "
                f"Hallazgos={len(hallazgos)}."
            ),
            "nota_gobernanza": (
                "Revisión descriptiva y auditable; no mezcla dimensiones en un score único ni "
                "autoriza modificaciones presupuestales automáticas."
            ),
        },
    }

    return {
        "id_meta_bd": meta_id_str,
        "codigo_plan": codigo_plan,
        "codigo_meta": cod_meta,
        "nombre_meta": nombre_meta,
        "indicador": indicador_texto,
        "dependencia_responsable": dependencia_resp,
        "linea_estrategica": linea_nombre,
        "resumen_por_dominio": {
            "formulacion_estado": dim_2_formulacion["estado"],
            "ejecucion_fisica_estado": estado_ej_fisica,
            "ejecucion_financiera_estado": estado_ej_fin,
            "resultados_estado": dim_8_resultados_y_equidad["estado"],
            "contradicciones_estado": estado_contra,
        },
        "evaluacion_10_dimensiones": evaluacion_10_dimensiones,
        "dictamen_7_revisores": dictamen_7_revisores,
        "hallazgos": hallazgos,
    }


def construir_matriz_revision_por_meta_pdt(
    codigo_plan: str = "PDD_2024_2027",
    dependencia: str | None = None,
    codigo_meta: str | None = None,
    limit: int = 100,
    datos_entrada: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Construye la matriz auditable de revisión por meta (10 dimensiones y 7 revisores)."""
    if datos_entrada is not None:
        raw_data = datos_entrada
        metas_universo = list(raw_data.get("metas") or [])
        total_metas_plan = int(raw_data.get("total_metas_plan") or len(metas_universo))
        plan_info = raw_data.get("plan_info") or {"codigo_plan": codigo_plan}
        lineas_por_id = raw_data.get("lineas_por_id") or {}
        actividades_pa = list(raw_data.get("actividades_pa") or [])
        triada_por_id = raw_data.get("triada_por_id") or {}
        cache_eval = raw_data.get("cache_evaluador") or {}
    else:
        bd_payload = _consultar_datos_bd_csh_sync(
            codigo_plan=codigo_plan,
            dependencia=dependencia,
            codigo_meta=codigo_meta,
            limit=limit,
        )
        metas_universo = list(bd_payload.get("metas") or [])
        total_metas_plan = int(bd_payload.get("total_metas_plan") or len(metas_universo))
        plan_info = bd_payload.get("plan_info") or {"codigo_plan": codigo_plan}
        lineas_por_id = bd_payload.get("lineas_por_id") or {}
        actividades_pa = list(bd_payload.get("actividades_pa") or [])
        triada_por_id = bd_payload.get("triada_por_id") or {}
        cache_eval = _cargar_cache_evaluador()

    dea_por_dep: dict[str, list[float]] = {}
    for row in (cache_eval.get("dea_scores") or {}).get("resultados_dmu") or []:
        dmu_raw = str(row.get("dmu") or "")
        dep_part = dmu_raw.rsplit("|", 1)[0].strip()
        if row.get("theta_bcc") is not None:
            dea_por_dep.setdefault(_normalizar(dep_part), []).append(float(row["theta_bcc"]))

    nlp_por_meta: dict[str, float] = {}
    nlp_block = cache_eval.get("nlp_coherence") or {}
    muestra_nlp = list((nlp_block.get("similaridad_coseno") or {}).get("muestra") or [])
    alertas_nlp = list(nlp_block.get("alertas_mission_creep") or [])
    for item in muestra_nlp + alertas_nlp:
        c_meta = item.get("codigo_meta")
        sim_v = item.get("similaridad_coseno_lexica")
        if c_meta and sim_v is not None:
            nlp_por_meta[_normalizar(c_meta)] = float(sim_v)

    isri_por_dep: dict[str, dict[str, Any]] = {}
    for s in (cache_eval.get("time_series_forecast") or {}).get("series") or []:
        ind_label = str(s.get("indicador") or "")
        if ind_label.startswith("Entidad Ejecutora:"):
            dep_clean = ind_label.removeprefix("Entidad Ejecutora:").strip()
            isri_por_dep[_normalizar(dep_clean)] = s
        elif s.get("entidad"):
            isri_por_dep[_normalizar(s["entidad"])] = s

    norm_dep_filter = _normalizar(dependencia)
    norm_meta_filter = _normalizar(codigo_meta)

    metas_filtradas: list[dict[str, Any]] = []
    for idx, m in enumerate(metas_universo, start=1):
        do = m.get("datos_oficiales") if isinstance(m.get("datos_oficiales"), dict) else {}
        resp_cand = (
            m.get("dependencia")
            or _extraer_campo_dict(do, ("Responsable", "Responsabl e", "Entidad responsable"))
            or ""
        )
        cod_cand = (
            m.get("codigo")
            or _extraer_campo_dict(do, ("codigo_meta", "codigo"))
            or f"M-{m.get('fila_fuente') or idx:04d}"
        )
        if norm_dep_filter and norm_dep_filter not in _normalizar(resp_cand):
            continue
        if norm_meta_filter and norm_meta_filter not in _normalizar(cod_cand):
            continue
        metas_filtradas.append(m)

    total_metas_filtradas = len(metas_filtradas)
    limite_efectivo = max(1, int(limit or 100))
    metas_seleccionadas = metas_filtradas[:limite_efectivo]

    expedientes_metas: list[dict[str, Any]] = []
    todos_hallazgos: list[dict[str, Any]] = []
    conteo_estados = {
        "con_contradicciones": 0,
        "con_brecha_informacion": 0,
        "con_ceros_observados": 0,
        "con_evidencia_completa_ejecucion": 0,
    }

    for idx_m, meta_row in enumerate(metas_seleccionadas, start=1):
        exp = _evaluar_meta_individual(
            meta=meta_row,
            idx_meta=idx_m,
            codigo_plan=codigo_plan,
            plan_info=plan_info,
            lineas_por_id=lineas_por_id,
            actividades_pa=actividades_pa,
            triada_por_id=triada_por_id,
            dea_por_dep=dea_por_dep,
            nlp_por_meta=nlp_por_meta,
            isri_por_dep=isri_por_dep,
        )
        expedientes_metas.append(exp)
        todos_hallazgos.extend(exp["hallazgos"])

        res_dom = exp["resumen_por_dominio"]
        if res_dom["contradicciones_estado"] == ESTADO_CONTRADICCION:
            conteo_estados["con_contradicciones"] += 1
        if (
            res_dom["ejecucion_fisica_estado"] == ESTADO_BRECHA_INFO
            or res_dom["ejecucion_financiera_estado"] == ESTADO_BRECHA_INFO
        ):
            conteo_estados["con_brecha_informacion"] += 1
        ceros_pres = exp["dictamen_7_revisores"]["conciliador_ejecucion"][
            "ceros_observados_preservados"
        ]
        if ceros_pres:
            conteo_estados["con_ceros_observados"] += 1
        if (
            res_dom["ejecucion_fisica_estado"] == ESTADO_CON_EVIDENCIA
            and res_dom["ejecucion_financiera_estado"] == ESTADO_CON_EVIDENCIA
        ):
            conteo_estados["con_evidencia_completa_ejecucion"] += 1

    return {
        "motor": "PDT-AI-EVALUATOR / MATRIZ-REVISION-POR-META",
        "version_regla": VERSION_REGLA_CANONICA,
        "codigo_plan": codigo_plan,
        "nombre_plan": str(
            plan_info.get("nombre_oficial") or f"Plan de Desarrollo {codigo_plan}"
        ),
        "norma_adopcion": str(plan_info.get("norma_adopcion") or "No especificada"),
        "filtros_aplicados": {
            "codigo_plan": codigo_plan,
            "dependencia": dependencia,
            "codigo_meta": codigo_meta,
            "limit": limite_efectivo,
        },
        "cobertura_universo": {
            "total_metas_plan": total_metas_plan,
            "total_metas_filtradas": total_metas_filtradas,
            "metas_devueltas": len(expedientes_metas),
            "truncado_aplicado": total_metas_filtradas > len(expedientes_metas),
            "instruccion_universo_completo": (
                "Incremente el parámetro 'limit' o filtre por 'dependencia' / 'codigo_meta' "
                "para inspeccionar el universo completo sin truncamiento silencioso."
            ),
        },
        "total_metas_plan": total_metas_plan,
        "total_metas_filtradas": total_metas_filtradas,
        "metas_devueltas": len(expedientes_metas),
        "resumen_auditoria": {
            **conteo_estados,
            "total_hallazgos_estructurados": len(todos_hallazgos),
            "nota_metodologica": (
                "No se calcula un score global único: se preservan separados los dominios de "
                "Formulación, Ejecución y Resultados conforme a revision_motores_18_10_2026.md."
            ),
        },
        "metas_auditadas": expedientes_metas,
        "hallazgos_consolidados": todos_hallazgos,
        "generado_en": datetime.now(UTC).isoformat(),
    }
