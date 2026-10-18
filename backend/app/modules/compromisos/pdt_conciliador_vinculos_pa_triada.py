"""Conciliador y poblador canónico de vínculos PDD/PDL <-> Plan de Acción <-> Tríada.

Fase [29B] — Crea y puebla de forma idempotente la tabla PostgreSQL
`seguimiento.pdd_vinculos_meta_pa_triada` en `bd_csh` para las 1,647 metas oficiales
de `PDD_2024_2027` (1,246) y `PDL_1..3_2024_2027` (401), clasificando cada vínculo en:
1. EXACTO_CODIGO_META (score_confianza = 1.0000)
2. EXACTO_BPIM_PROYECTO (score_confianza = 0.9000)
3. PROGRAMA_Y_DEPENDENCIA_ACREDITADOS (score_confianza = 0.7800)
4. VINCULO_SECTORIAL_INFERIDO (score_confianza = 0.5500)
5. SIN_VINCULO_HUERFANO (score_confianza = 0.0000)

Preserva estrictamente los ceros observados (`0.0`) frente a datos faltantes (`None`).
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import re
import unicodedata
import uuid
from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings

PLANES_OBJETIVO_2024_2027: tuple[str, ...] = (
    "PDD_2024_2027",
    "PDL_1_2024_2027",
    "PDL_2_2024_2027",
    "PDL_3_2024_2027",
)

TIPOS_VINCULO_CANONICOS: dict[str, float] = {
    "EXACTO_CODIGO_META": 1.0000,
    "EXACTO_BPIM_PROYECTO": 0.9000,
    "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS": 0.7800,
    "VINCULO_SECTORIAL_INFERIDO": 0.5500,
    "SIN_VINCULO_HUERFANO": 0.0000,
}

DDL_TABLA_VINCULOS = """
CREATE TABLE IF NOT EXISTS seguimiento.pdd_vinculos_meta_pa_triada (
    id UUID PRIMARY KEY,
    codigo_plan VARCHAR(64) NOT NULL,
    meta_id UUID NOT NULL,
    codigo_meta VARCHAR(128) NOT NULL,
    linea_estrategica TEXT,
    dependencia_responsable VARCHAR(255),
    actividad_pa_id UUID,
    registro_triada_id UUID,
    vigencia INTEGER,
    codigo_bpim VARCHAR(128),
    tipo_vinculo VARCHAR(64) NOT NULL,
    score_confianza NUMERIC(6, 4) NOT NULL,
    apropiacion_definitiva_cop NUMERIC(20, 2),
    compromisos_rp_cop NUMERIC(20, 2),
    obligaciones_cop NUMERIC(20, 2),
    pagos_tesoreria_cop NUMERIC(20, 2),
    meta_programada_anual NUMERIC(20, 4),
    meta_ejecutada_anual NUMERIC(20, 4),
    avance_fisico_pct NUMERIC(10, 4),
    ceros_observados_preservados BOOLEAN NOT NULL DEFAULT FALSE,
    evidencia_cruce JSONB NOT NULL DEFAULT '{}'::jsonb,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""

DDL_INDICES_VINCULOS = (
    """
    CREATE UNIQUE INDEX IF NOT EXISTS uq_pdd_vinculos_meta_pa_triada_meta_id
    ON seguimiento.pdd_vinculos_meta_pa_triada (meta_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_pdd_vinculos_meta_pa_triada_plan_tipo
    ON seguimiento.pdd_vinculos_meta_pa_triada (codigo_plan, tipo_vinculo)
    """,
)

STOPWORDS_ES = {
    "para",
    "como",
    "este",
    "esta",
    "estos",
    "estas",
    "entre",
    "sobre",
    "desde",
    "hasta",
    "mediante",
    "durante",
    "distrito",
    "distrital",
    "cartagena",
    "indias",
    "plan",
    "desarrollo",
    "programa",
    "proyecto",
    "meta",
    "indicador",
    "numero",
    "porcentaje",
    "total",
    "ano",
    "anos",
}


def _resolver_url_bd_csh() -> str:
    raw_url = Settings().async_database_url
    parsed = make_url(raw_url)
    if (parsed.database or "").startswith("polis_test"):
        return parsed.set(database="bd_csh").render_as_string(hide_password=False)
    return raw_url


def _normalizar_texto(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _tokens_significativos(valor: Any) -> set[str]:
    norm = _normalizar_texto(valor)
    palabras = re.findall(r"[a-z0-9]{4,}", norm)
    return {p for p in palabras if p not in STOPWORDS_ES}


def _afinidad_lexica(tokens_a: set[str], tokens_b: set[str]) -> float:
    if not tokens_a or not tokens_b:
        return 0.0
    inter = len(tokens_a & tokens_b)
    if inter == 0:
        return 0.0
    denom = min(len(tokens_a), len(tokens_b))
    jaccard = inter / len(tokens_a | tokens_b)
    overlap = inter / denom if denom > 0 else 0.0
    return round(0.55 * overlap + 0.45 * jaccard, 4)


def _to_float_preserve_zero(valor: Any) -> float | None:
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float, Decimal)):
        return float(valor)
    texto = str(valor).strip()
    if not texto or texto.upper() in {"NA", "N/A", "NONE", "NULL", "SIN DATO", "PENDIENTE"}:
        return None
    limpio = texto.replace("$", "").replace("%", "").replace(" ", "")
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
    mapa_norm = {_normalizar_texto(k): v for k, v in datos.items()}
    for cand in candidatos:
        val = mapa_norm.get(_normalizar_texto(cand))
        if val is not None and str(val).strip() != "":
            return val
    for k_norm, val in mapa_norm.items():
        if any(_normalizar_texto(cand) in k_norm for cand in candidatos):
            if val is not None and str(val).strip() != "":
                return val
    return None


def _emparejar_meta_determinista(
    meta: dict[str, Any],
    idx_meta: int,
    lineas_por_id: dict[str, dict[str, Any]],
    pa_por_codigo_meta: dict[str, dict[str, Any]],
    pa_por_bpim: dict[str, dict[str, Any]],
    pa_por_dep: dict[str, list[dict[str, Any]]],
    pa_todas: list[dict[str, Any]],
    triada_por_id: dict[str, dict[str, Any]],
    triada_por_codigo_meta: dict[str, dict[str, Any]],
    triada_por_bpim: dict[str, dict[str, Any]],
    triada_por_dep: dict[str, list[dict[str, Any]]],
    triada_muestra_global: list[dict[str, Any]],
) -> dict[str, Any]:
    meta_id = str(meta["id"])
    codigo_plan = str(meta["codigo_plan"])
    datos_of = (
        meta.get("datos_oficiales") if isinstance(meta.get("datos_oficiales"), dict) else {}
    )
    fila_fuente = meta.get("fila_fuente")
    cod_meta_raw = (
        meta.get("codigo")
        or _extraer_campo_dict(datos_of, ("codigo_meta", "codigo", "N°", "No."))
    )
    cod_meta = (
        str(cod_meta_raw).strip()
        if cod_meta_raw is not None and str(cod_meta_raw).strip() != ""
        else f"M-{fila_fuente or idx_meta:04d}"
    )[:128]

    linea_id_str = str(meta.get("linea_id") or "")
    linea_obj = lineas_por_id.get(linea_id_str) or {}
    linea_nombre = str(
        meta.get("linea_nombre")
        or linea_obj.get("nombre")
        or _extraer_campo_dict(
            datos_of,
            (
                "Línea Estratégica",
                "Programa del Plan de Desarrollo Distrital",
                "Impulsor de Avance",
            ),
        )
        or "SIN_LINEA_VINCULADA"
    ).strip()

    resp_raw = meta.get("dependencia") or _extraer_campo_dict(
        datos_of, ("Responsable", "Responsabl e", "Entidad responsable", "Secretaría")
    )
    if not resp_raw and codigo_plan.startswith("PDL_"):
        num_loc = codigo_plan.split("_")[1] if "_" in codigo_plan else "1"
        resp_raw = f"Alcaldía Local {num_loc}"
    dependencia_resp = str(resp_raw).strip()[:255] if resp_raw else "SIN_ATRIBUCION"
    norm_dep = _normalizar_texto(dependencia_resp)

    nombre_meta = str(
        meta.get("nombre")
        or _extraer_campo_dict(datos_of, ("Meta del cuatrienio", "Producto", "meta_cuatrienio"))
        or ""
    ).strip()
    indicador_texto = str(
        meta.get("indicador")
        or _extraer_campo_dict(
            datos_of, ("Indicador de producto", "Indicador de resultado", "Indicador")
        )
        or ""
    ).strip()
    bpim_meta = str(
        _extraer_campo_dict(datos_of, ("codigo_bpim", "BPIM", "Código BPIN", "BPIN")) or ""
    ).strip()

    tokens_meta = _tokens_significativos(f"{nombre_meta} {indicador_texto} {linea_nombre}")
    tokens_ind = _tokens_significativos(f"{nombre_meta} {indicador_texto}")

    vinc_previo = datos_of.get("_vinculo_triada") if isinstance(datos_of, dict) else None
    reg_triada_prev_id = (
        str(vinc_previo.get("registro_triada_id"))
        if isinstance(vinc_previo, dict) and vinc_previo.get("registro_triada_id")
        else None
    )
    metodo_previo = (
        str(vinc_previo.get("metodo_emparejamiento") or "")
        if isinstance(vinc_previo, dict)
        else ""
    )
    score_previo = (
        float(vinc_previo.get("score") or 0.0)
        if isinstance(vinc_previo, dict) and vinc_previo.get("score") is not None
        else 0.0
    )

    act_match: dict[str, Any] | None = None
    tri_match: dict[str, Any] | None = None
    tipo_vinculo = "SIN_VINCULO_HUERFANO"
    score_confianza = TIPOS_VINCULO_CANONICOS["SIN_VINCULO_HUERFANO"]
    afinidad_calc = 0.0
    regla_detalle = "SIN_COINCIDENCIA_ACREDITADA"

    # 1. EXACTO_CODIGO_META (1.0000)
    norm_cod = _normalizar_texto(cod_meta)
    if norm_cod in pa_por_codigo_meta:
        act_match = pa_por_codigo_meta[norm_cod]
        tipo_vinculo = "EXACTO_CODIGO_META"
        score_confianza = TIPOS_VINCULO_CANONICOS["EXACTO_CODIGO_META"]
        afinidad_calc = 1.0
        regla_detalle = "COINCIDENCIA_EXACTA_COMPROMISO_PAS_CODIGO"
    elif norm_cod in triada_por_codigo_meta:
        tri_match = triada_por_codigo_meta[norm_cod]
        tipo_vinculo = "EXACTO_CODIGO_META"
        score_confianza = TIPOS_VINCULO_CANONICOS["EXACTO_CODIGO_META"]
        afinidad_calc = 1.0
        regla_detalle = "COINCIDENCIA_EXACTA_CODIGO_META_PDD_TRIADA"

    # 2. EXACTO_BPIM_PROYECTO (0.9000)
    if tipo_vinculo == "SIN_VINCULO_HUERFANO" and bpim_meta:
        norm_bpim = _normalizar_texto(bpim_meta)
        if norm_bpim in pa_por_bpim:
            act_match = pa_por_bpim[norm_bpim]
            tipo_vinculo = "EXACTO_BPIM_PROYECTO"
            score_confianza = TIPOS_VINCULO_CANONICOS["EXACTO_BPIM_PROYECTO"]
            afinidad_calc = 0.90
            regla_detalle = "COINCIDENCIA_EXACTA_BPIM_PLAN_ACCION"
        elif norm_bpim in triada_por_bpim:
            tri_match = triada_por_bpim[norm_bpim]
            tipo_vinculo = "EXACTO_BPIM_PROYECTO"
            score_confianza = TIPOS_VINCULO_CANONICOS["EXACTO_BPIM_PROYECTO"]
            afinidad_calc = 0.90
            regla_detalle = "COINCIDENCIA_EXACTA_BPIM_TRIADA"

    if (
        tipo_vinculo == "SIN_VINCULO_HUERFANO"
        and reg_triada_prev_id
        and reg_triada_prev_id in triada_por_id
    ):
        cand_tri = triada_por_id[reg_triada_prev_id]
        cand_bpim = str(cand_tri.get("codigo_bpim") or "").strip()
        if cand_bpim and cand_bpim in pa_por_bpim:
            act_match = pa_por_bpim[_normalizar_texto(cand_bpim)]
            tri_match = cand_tri
            tipo_vinculo = "EXACTO_BPIM_PROYECTO"
            score_confianza = TIPOS_VINCULO_CANONICOS["EXACTO_BPIM_PROYECTO"]
            afinidad_calc = max(0.90, round(score_previo, 4))
            regla_detalle = "PUENTE_BPIM_TRIADA_A_PLAN_ACCION"

    # 3. PROGRAMA_Y_DEPENDENCIA_ACREDITADOS (0.7800)
    if tipo_vinculo == "SIN_VINCULO_HUERFANO":
        candidatos_pa_dep: list[dict[str, Any]] = []
        if norm_dep and norm_dep != "sin_atribucion":
            for k_dep, lista_pa in pa_por_dep.items():
                if norm_dep in k_dep or k_dep in norm_dep:
                    candidatos_pa_dep.extend(lista_pa)
        mejor_pa: dict[str, Any] | None = None
        mejor_afinidad_pa = 0.0
        for act in candidatos_pa_dep:
            af = _afinidad_lexica(tokens_meta, act["_tokens"])
            if af > mejor_afinidad_pa:
                mejor_afinidad_pa = af
                mejor_pa = act
        if mejor_pa is not None and mejor_afinidad_pa >= 0.35:
            act_match = mejor_pa
            tipo_vinculo = "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"
            score_confianza = TIPOS_VINCULO_CANONICOS["PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"]
            afinidad_calc = mejor_afinidad_pa
            regla_detalle = "DEPENDENCIA_Y_PROGRAMA_AFINIDAD_LEXICA_PA"
            bpim_pa = _normalizar_texto(mejor_pa.get("codigo_bpim"))
            if bpim_pa and bpim_pa in triada_por_bpim:
                tri_match = triada_por_bpim[bpim_pa]

    if (
        tipo_vinculo == "SIN_VINCULO_HUERFANO"
        and reg_triada_prev_id
        and reg_triada_prev_id in triada_por_id
    ):
        cand_tri = triada_por_id[reg_triada_prev_id]
        af_tri = _afinidad_lexica(tokens_meta, cand_tri["_tokens"])
        if metodo_previo == "INDICADOR_ENTIDAD" or score_previo >= 0.60 or af_tri >= 0.35:
            tri_match = cand_tri
            tipo_vinculo = "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"
            score_confianza = TIPOS_VINCULO_CANONICOS["PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"]
            afinidad_calc = max(round(score_previo, 4), af_tri, 0.35)
            regla_detalle = f"VINCULO_TRIADA_ACREDITADO_{metodo_previo or 'AFINIDAD'}"
        else:
            tri_match = cand_tri
            tipo_vinculo = "VINCULO_SECTORIAL_INFERIDO"
            score_confianza = TIPOS_VINCULO_CANONICOS["VINCULO_SECTORIAL_INFERIDO"]
            afinidad_calc = max(round(score_previo, 4), af_tri, 0.15)
            regla_detalle = f"VINCULO_TRIADA_INFERIDO_{metodo_previo or 'SEMANTICO'}"

    # 4. Búsqueda en candidatos de Tríada por dependencia y afinidad léxica
    if tipo_vinculo == "SIN_VINCULO_HUERFANO":
        candidatos_tri_dep: list[dict[str, Any]] = []
        if norm_dep and norm_dep != "sin_atribucion":
            for k_dep, lista_tri in triada_por_dep.items():
                if norm_dep in k_dep or k_dep in norm_dep:
                    candidatos_tri_dep.extend(lista_tri)

        mejor_tri: dict[str, Any] | None = None
        mejor_af_tri = 0.0
        for reg_t in candidatos_tri_dep[:250]:
            af = _afinidad_lexica(tokens_meta, reg_t["_tokens"])
            if af > mejor_af_tri:
                mejor_af_tri = af
                mejor_tri = reg_t

        if mejor_tri is not None and mejor_af_tri >= 0.35:
            tri_match = mejor_tri
            tipo_vinculo = "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"
            score_confianza = TIPOS_VINCULO_CANONICOS["PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"]
            afinidad_calc = mejor_af_tri
            regla_detalle = "COINCIDENCIA_DEPENDENCIA_E_INDICADOR_TRIADA"
        elif mejor_tri is not None and mejor_af_tri >= 0.15:
            tri_match = mejor_tri
            tipo_vinculo = "VINCULO_SECTORIAL_INFERIDO"
            score_confianza = TIPOS_VINCULO_CANONICOS["VINCULO_SECTORIAL_INFERIDO"]
            afinidad_calc = mejor_af_tri
            regla_detalle = "COINCIDENCIA_SECTORIAL_DEPENDENCIA_TRIADA"
        elif candidatos_pa_dep:
            act_match = candidatos_pa_dep[0]
            tipo_vinculo = "VINCULO_SECTORIAL_INFERIDO"
            score_confianza = TIPOS_VINCULO_CANONICOS["VINCULO_SECTORIAL_INFERIDO"]
            afinidad_calc = max(mejor_afinidad_pa, 0.20)
            regla_detalle = "COINCIDENCIA_SECTORIAL_MISMA_DEPENDENCIA_PA"
        elif tokens_ind:
            mejor_global_pa: dict[str, Any] | None = None
            mejor_af_global_pa = 0.0
            for act in pa_todas:
                af = _afinidad_lexica(tokens_ind, act["_tokens"])
                if af > mejor_af_global_pa:
                    mejor_af_global_pa = af
                    mejor_global_pa = act
            if mejor_global_pa is not None and mejor_af_global_pa >= 0.45:
                act_match = mejor_global_pa
                tipo_vinculo = "VINCULO_SECTORIAL_INFERIDO"
                score_confianza = TIPOS_VINCULO_CANONICOS["VINCULO_SECTORIAL_INFERIDO"]
                afinidad_calc = mejor_af_global_pa
                regla_detalle = "AFINIDAD_LEXICA_SECTORIAL_PA"
            else:
                mejor_global_tri: dict[str, Any] | None = None
                mejor_af_global_tri = 0.0
                for reg_t in triada_muestra_global:
                    af = _afinidad_lexica(tokens_ind, reg_t["_tokens"])
                    if af > mejor_af_global_tri:
                        mejor_af_global_tri = af
                        mejor_global_tri = reg_t
                if mejor_global_tri is not None and mejor_af_global_tri >= 0.45:
                    tri_match = mejor_global_tri
                    tipo_vinculo = "VINCULO_SECTORIAL_INFERIDO"
                    score_confianza = TIPOS_VINCULO_CANONICOS["VINCULO_SECTORIAL_INFERIDO"]
                    afinidad_calc = mejor_af_global_tri
                    regla_detalle = "AFINIDAD_LEXICA_SECTORIAL_TRIADA"

    # Extraer métricas preservando estrictamente 0.0 observado vs None
    apropiacion_cop = (
        _to_float_preserve_zero(tri_match.get("apropiacion_definitiva_cop"))
        if tri_match is not None
        else (
            _to_float_preserve_zero(act_match.get("monto_programado_cop"))
            if act_match is not None
            else None
        )
    )
    compromisos_rp_cop = (
        _to_float_preserve_zero(tri_match.get("compromisos_rp_cop"))
        if tri_match is not None
        else (
            _to_float_preserve_zero(act_match.get("monto_ejecutado_cop"))
            if act_match is not None
            else None
        )
    )
    obligaciones_cop = (
        _to_float_preserve_zero(tri_match.get("obligaciones_cop"))
        if tri_match is not None
        else None
    )
    pagos_cop = (
        _to_float_preserve_zero(tri_match.get("pagos_tesoreria_cop"))
        if tri_match is not None
        else None
    )
    meta_prog_anual = (
        _to_float_preserve_zero(tri_match.get("meta_programada_anual"))
        if tri_match is not None
        and _to_float_preserve_zero(tri_match.get("meta_programada_anual")) is not None
        else (
            _to_float_preserve_zero(act_match.get("meta_valor_vigencia"))
            if act_match is not None
            else None
        )
    )
    meta_ejec_anual = (
        _to_float_preserve_zero(tri_match.get("meta_ejecutada_anual"))
        if tri_match is not None
        else None
    )
    avance_fisico_pct = (
        _to_float_preserve_zero(tri_match.get("avance_fisico_pct"))
        if tri_match is not None
        and _to_float_preserve_zero(tri_match.get("avance_fisico_pct")) is not None
        else (
            _to_float_preserve_zero(act_match.get("porcentaje_avance_fisico"))
            if act_match is not None
            else None
        )
    )

    valores_auditados = (
        apropiacion_cop,
        compromisos_rp_cop,
        obligaciones_cop,
        pagos_cop,
        meta_prog_anual,
        meta_ejec_anual,
        avance_fisico_pct,
    )
    ceros_preservados = any(v is not None and v == 0.0 for v in valores_auditados)

    vigencia_val = (
        int(tri_match["vigencia"])
        if tri_match is not None and tri_match.get("vigencia") is not None
        else (
            int(act_match["vigencia"])
            if act_match is not None and act_match.get("vigencia") is not None
            else None
        )
    )
    codigo_bpim_val = (
        str(tri_match.get("codigo_bpim") or "").strip()
        if tri_match is not None and tri_match.get("codigo_bpim")
        else (
            str(act_match.get("codigo_bpim") or "").strip()
            if act_match is not None and act_match.get("codigo_bpim")
            else (bpim_meta or None)
        )
    )
    if codigo_bpim_val:
        codigo_bpim_val = codigo_bpim_val[:128]

    if dependencia_resp == "SIN_ATRIBUCION":
        if tri_match is not None and tri_match.get("entidad_normalizada"):
            dependencia_resp = str(tri_match["entidad_normalizada"])[:255]
        elif act_match is not None and act_match.get("entidad_responsable"):
            dependencia_resp = str(act_match["entidad_responsable"])[:255]

    evidencia_cruce = {
        "regla_emparejamiento": regla_detalle,
        "tipo_vinculo": tipo_vinculo,
        "score_confianza": score_confianza,
        "afinidad_lexica": afinidad_calc,
        "es_vinculo_exacto": tipo_vinculo in {"EXACTO_CODIGO_META", "EXACTO_BPIM_PROYECTO"},
        "es_vinculo_inferido": tipo_vinculo == "VINCULO_SECTORIAL_INFERIDO",
        "fuente_meta": meta.get("fuente"),
        "fila_fuente_meta": fila_fuente,
        "codigo_actividad_pa": act_match.get("codigo") if act_match else None,
        "hoja_origen_triada": tri_match.get("hoja_origen") if tri_match else None,
        "fila_origen_triada": tri_match.get("fila_origen_num") if tri_match else None,
        "corte_periodo_triada": tri_match.get("corte_periodo") if tri_match else None,
        "ceros_observados_preservados": ceros_preservados,
    }

    vinculo_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"polis-vinculo-meta-pa-triada:{meta_id}")

    return {
        "id": str(vinculo_uuid),
        "codigo_plan": codigo_plan,
        "meta_id": meta_id,
        "codigo_meta": cod_meta,
        "linea_estrategica": linea_nombre,
        "dependencia_responsable": dependencia_resp,
        "actividad_pa_id": str(act_match["id"]) if act_match else None,
        "registro_triada_id": str(tri_match["id"]) if tri_match else None,
        "vigencia": vigencia_val,
        "codigo_bpim": codigo_bpim_val,
        "tipo_vinculo": tipo_vinculo,
        "score_confianza": score_confianza,
        "apropiacion_definitiva_cop": apropiacion_cop,
        "compromisos_rp_cop": compromisos_rp_cop,
        "obligaciones_cop": obligaciones_cop,
        "pagos_tesoreria_cop": pagos_cop,
        "meta_programada_anual": meta_prog_anual,
        "meta_ejecutada_anual": meta_ejec_anual,
        "avance_fisico_pct": avance_fisico_pct,
        "ceros_observados_preservados": ceros_preservados,
        "evidencia_cruce": json.dumps(evidencia_cruce, ensure_ascii=False),
    }


async def conciliar_y_poblar_vinculos_meta_pa_triada_async(
    codigo_plan: str | None = None,
) -> dict[str, Any]:
    """Concilia y puebla idempotentemente `seguimiento.pdd_vinculos_meta_pa_triada` en `bd_csh`."""
    planes = (codigo_plan,) if codigo_plan else PLANES_OBJETIVO_2024_2027
    engine = create_async_engine(_resolver_url_bd_csh(), pool_pre_ping=True)

    try:
        async with engine.begin() as conn:
            await conn.execute(text(DDL_TABLA_VINCULOS))
            for ddl_idx in DDL_INDICES_VINCULOS:
                await conn.execute(text(ddl_idx))

            res_lineas = await conn.execute(
                text(
                    "SELECT id, codigo_plan, codigo, nombre "
                    "FROM seguimiento.pdd_lineas_y_programas "
                    "WHERE codigo_plan = ANY(:planes)"
                ),
                {"planes": list(planes)},
            )
            lineas_por_id = {
                str(r["id"]): dict(r) for r in res_lineas.mappings().all()
            }

            res_metas = await conn.execute(
                text(
                    "SELECT id, codigo_plan, linea_id, tipo_meta, codigo, nombre, "
                    "indicador, unidad_medida, linea_nombre, fuente, fila_fuente, "
                    "datos_oficiales "
                    "FROM seguimiento.pdd_metas_oficiales "
                    "WHERE codigo_plan = ANY(:planes) "
                    "ORDER BY codigo_plan, fila_fuente NULLS LAST, id"
                ),
                {"planes": list(planes)},
            )
            metas = [dict(r) for r in res_metas.mappings().all()]

            res_pa = await conn.execute(
                text(
                    "SELECT id, codigo, vigencia, compromiso_pas_codigo, "
                    "linea_estrategica_codigo, programa_nombre, entidad_responsable, "
                    "tipo_meta, meta_producto_vigencia, meta_valor_vigencia, "
                    "unidad_medida, codigo_bpim, proyecto_nombre, descripcion_actividad, "
                    "porcentaje_avance_fisico, monto_programado_cop, monto_ejecutado_cop, "
                    "evidencia_soporte "
                    "FROM seguimiento.actividades_plan_accion "
                    "ORDER BY vigencia DESC, codigo"
                )
            )
            actividades_pa = [dict(r) for r in res_pa.mappings().all()]

            ids_triada_explicitos: list[str] = []
            for m in metas:
                do = m.get("datos_oficiales")
                if isinstance(do, dict):
                    vt = do.get("_vinculo_triada")
                    if isinstance(vt, dict) and vt.get("registro_triada_id"):
                        ids_triada_explicitos.append(str(vt["registro_triada_id"]))

            triada_por_id: dict[str, dict[str, Any]] = {}
            if ids_triada_explicitos:
                ids_unicos = list(dict.fromkeys(ids_triada_explicitos))
                for offset in range(0, len(ids_unicos), 500):
                    chunk_ids = ids_unicos[offset : offset + 500]
                    res_t_exp = await conn.execute(
                        text(
                            "SELECT id, vigencia, corte_periodo, entidad_normalizada, "
                            "linea_estrategica, codigo_meta_pdd, codigo_bpim, indicador, "
                            "descripcion_actividad, meta_programada_anual, meta_ejecutada_anual, "
                            "avance_fisico_pct, apropiacion_definitiva_cop, compromisos_rp_cop, "
                            "obligaciones_cop, pagos_tesoreria_cop, hoja_origen, fila_origen_num "
                            "FROM seguimiento.registros_triada_normalizados "
                            "WHERE CAST(id AS TEXT) = ANY(:ids)"
                        ),
                        {"ids": chunk_ids},
                    )
                    for r_t in res_t_exp.mappings().all():
                        d_t = dict(r_t)
                        d_t["_tokens"] = _tokens_significativos(
                            f"{d_t.get('indicador') or ''} "
                            f"{d_t.get('descripcion_actividad') or ''} "
                            f"{d_t.get('linea_estrategica') or ''}"
                        )
                        triada_por_id[str(d_t["id"])] = d_t

            res_t_dedup = await conn.execute(
                text(
                    "SELECT DISTINCT ON ("
                    "  entidad_normalizada, "
                    "  COALESCE(codigo_meta_pdd, ''), "
                    "  COALESCE(codigo_bpim, ''), "
                    "  COALESCE(LEFT(indicador, 80), '')"
                    ") "
                    "id, vigencia, corte_periodo, entidad_normalizada, "
                    "linea_estrategica, codigo_meta_pdd, codigo_bpim, indicador, "
                    "descripcion_actividad, meta_programada_anual, meta_ejecutada_anual, "
                    "avance_fisico_pct, apropiacion_definitiva_cop, compromisos_rp_cop, "
                    "obligaciones_cop, pagos_tesoreria_cop, hoja_origen, fila_origen_num "
                    "FROM seguimiento.registros_triada_normalizados "
                    "WHERE vigencia IN (2024, 2025, 2026) "
                    "  AND (indicador IS NOT NULL OR codigo_bpim IS NOT NULL "
                    "       OR apropiacion_definitiva_cop IS NOT NULL) "
                    "ORDER BY "
                    "  entidad_normalizada, "
                    "  COALESCE(codigo_meta_pdd, ''), "
                    "  COALESCE(codigo_bpim, ''), "
                    "  COALESCE(LEFT(indicador, 80), ''), "
                    "  vigencia DESC, "
                    "  apropiacion_definitiva_cop DESC NULLS LAST "
                    "LIMIT 4500"
                )
            )
            triada_dedup = [dict(r) for r in res_t_dedup.mappings().all()]

            pa_por_codigo_meta: dict[str, dict[str, Any]] = {}
            pa_por_bpim: dict[str, dict[str, Any]] = {}
            pa_por_dep: dict[str, list[dict[str, Any]]] = {}
            for act in actividades_pa:
                act["_tokens"] = _tokens_significativos(
                    f"{act.get('programa_nombre') or ''} "
                    f"{act.get('meta_producto_vigencia') or ''} "
                    f"{act.get('proyecto_nombre') or ''} "
                    f"{act.get('descripcion_actividad') or ''}"
                )
                c_pas = _normalizar_texto(act.get("compromiso_pas_codigo"))
                if c_pas:
                    pa_por_codigo_meta.setdefault(c_pas, act)
                c_bpim = _normalizar_texto(act.get("codigo_bpim"))
                if c_bpim:
                    pa_por_bpim.setdefault(c_bpim, act)
                dep_k = _normalizar_texto(act.get("entidad_responsable"))
                if dep_k:
                    pa_por_dep.setdefault(dep_k, []).append(act)

            triada_por_codigo_meta: dict[str, dict[str, Any]] = {}
            triada_por_bpim: dict[str, dict[str, Any]] = {}
            triada_por_dep: dict[str, list[dict[str, Any]]] = {}
            for d_t in list(triada_por_id.values()) + triada_dedup:
                tid = str(d_t["id"])
                if "_tokens" not in d_t:
                    d_t["_tokens"] = _tokens_significativos(
                        f"{d_t.get('indicador') or ''} "
                        f"{d_t.get('descripcion_actividad') or ''} "
                        f"{d_t.get('linea_estrategica') or ''}"
                    )
                triada_por_id.setdefault(tid, d_t)
                cm = _normalizar_texto(d_t.get("codigo_meta_pdd"))
                if cm:
                    triada_por_codigo_meta.setdefault(cm, d_t)
                cb = _normalizar_texto(d_t.get("codigo_bpim"))
                if cb:
                    triada_por_bpim.setdefault(cb, d_t)
                dep_t = _normalizar_texto(d_t.get("entidad_normalizada"))
                if dep_t:
                    triada_por_dep.setdefault(dep_t, []).append(d_t)

            triada_muestra_global = triada_dedup[:800]

            filas_a_insertar: list[dict[str, Any]] = []
            conteo_por_tipo: Counter[str] = Counter()
            conteo_por_plan: Counter[str] = Counter()
            ceros_preservados_total = 0

            for idx_m, meta in enumerate(metas, start=1):
                fila = _emparejar_meta_determinista(
                    meta=meta,
                    idx_meta=idx_m,
                    lineas_por_id=lineas_por_id,
                    pa_por_codigo_meta=pa_por_codigo_meta,
                    pa_por_bpim=pa_por_bpim,
                    pa_por_dep=pa_por_dep,
                    pa_todas=actividades_pa,
                    triada_por_id=triada_por_id,
                    triada_por_codigo_meta=triada_por_codigo_meta,
                    triada_por_bpim=triada_por_bpim,
                    triada_por_dep=triada_por_dep,
                    triada_muestra_global=triada_muestra_global,
                )
                filas_a_insertar.append(fila)
                conteo_por_tipo[fila["tipo_vinculo"]] += 1
                conteo_por_plan[fila["codigo_plan"]] += 1
                if fila["ceros_observados_preservados"]:
                    ceros_preservados_total += 1

            stmt_upsert = text(
                """
                INSERT INTO seguimiento.pdd_vinculos_meta_pa_triada (
                    id, codigo_plan, meta_id, codigo_meta, linea_estrategica,
                    dependencia_responsable, actividad_pa_id, registro_triada_id,
                    vigencia, codigo_bpim, tipo_vinculo, score_confianza,
                    apropiacion_definitiva_cop, compromisos_rp_cop, obligaciones_cop,
                    pagos_tesoreria_cop, meta_programada_anual, meta_ejecutada_anual,
                    avance_fisico_pct, ceros_observados_preservados, evidencia_cruce,
                    actualizado_en
                ) VALUES (
                    CAST(:id AS UUID),
                    :codigo_plan,
                    CAST(:meta_id AS UUID),
                    :codigo_meta,
                    :linea_estrategica,
                    :dependencia_responsable,
                    CAST(:actividad_pa_id AS UUID),
                    CAST(:registro_triada_id AS UUID),
                    :vigencia,
                    :codigo_bpim,
                    :tipo_vinculo,
                    :score_confianza,
                    :apropiacion_definitiva_cop,
                    :compromisos_rp_cop,
                    :obligaciones_cop,
                    :pagos_tesoreria_cop,
                    :meta_programada_anual,
                    :meta_ejecutada_anual,
                    :avance_fisico_pct,
                    :ceros_observados_preservados,
                    CAST(:evidencia_cruce AS JSONB),
                    NOW()
                )
                ON CONFLICT (meta_id) DO UPDATE SET
                    codigo_plan = EXCLUDED.codigo_plan,
                    codigo_meta = EXCLUDED.codigo_meta,
                    linea_estrategica = EXCLUDED.linea_estrategica,
                    dependencia_responsable = EXCLUDED.dependencia_responsable,
                    actividad_pa_id = EXCLUDED.actividad_pa_id,
                    registro_triada_id = EXCLUDED.registro_triada_id,
                    vigencia = EXCLUDED.vigencia,
                    codigo_bpim = EXCLUDED.codigo_bpim,
                    tipo_vinculo = EXCLUDED.tipo_vinculo,
                    score_confianza = EXCLUDED.score_confianza,
                    apropiacion_definitiva_cop = EXCLUDED.apropiacion_definitiva_cop,
                    compromisos_rp_cop = EXCLUDED.compromisos_rp_cop,
                    obligaciones_cop = EXCLUDED.obligaciones_cop,
                    pagos_tesoreria_cop = EXCLUDED.pagos_tesoreria_cop,
                    meta_programada_anual = EXCLUDED.meta_programada_anual,
                    meta_ejecutada_anual = EXCLUDED.meta_ejecutada_anual,
                    avance_fisico_pct = EXCLUDED.avance_fisico_pct,
                    ceros_observados_preservados = EXCLUDED.ceros_observados_preservados,
                    evidencia_cruce = EXCLUDED.evidencia_cruce,
                    actualizado_en = NOW()
                """
            )
            if filas_a_insertar:
                await conn.execute(stmt_upsert, filas_a_insertar)

            res_count_db = await conn.execute(
                text("SELECT COUNT(*) FROM seguimiento.pdd_vinculos_meta_pa_triada")
            )
            total_en_bd = int(res_count_db.scalar() or 0)

        return {
            "tabla": "seguimiento.pdd_vinculos_meta_pa_triada",
            "planes_procesados": list(planes),
            "metas_conciliadas": len(filas_a_insertar),
            "total_filas_en_bd": total_en_bd,
            "distribucion_por_plan": dict(conteo_por_plan),
            "distribucion_por_tipo_vinculo": dict(conteo_por_tipo),
            "ceros_observados_preservados_count": ceros_preservados_total,
            "generado_en": datetime.now(UTC).isoformat(),
        }
    finally:
        await engine.dispose()


def conciliar_y_poblar_vinculos_meta_pa_triada(
    codigo_plan: str | None = None,
) -> dict[str, Any]:
    """Envoltorio síncrono determinista para conciliar y poblar vínculos en `bd_csh`."""
    coro = conciliar_y_poblar_vinculos_meta_pa_triada_async(codigo_plan=codigo_plan)
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result(timeout=60)
