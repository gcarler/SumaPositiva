"""DEA exploratorio y auditoría reproducible de la Triada; nunca escribe en bd_csh.

Las observaciones sin unidad/escala verificable permanecen visibles en la auditoría,
pero no alimentan la frontera. Las cifras son analíticas, no presupuesto oficial.
"""

from __future__ import annotations

import asyncio
import math
import re
import time
from collections import Counter, defaultdict
from typing import Any

import numpy as np
from scipy.optimize import linprog, minimize
from scipy.stats import norm, pearsonr, spearmanr, wilcoxon
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

IPC_DANE = {
    2017: 4.09,
    2018: 3.18,
    2019: 3.80,
    2020: 1.61,
    2021: 5.62,
    2022: 13.12,
    2023: 9.28,
    2024: 5.20,
    2025: 5.10,
}
CUT_RANK = {"FORMULADO": 0, "T1": 1, "T2": 2, "T3": 3, "T4": 4, "ANUAL": 5}
CLONE = "CONTENIDO_IDENTICO_OTRO_CORTE"
TTL = 300.0
_RAW: dict[tuple[str, int], tuple[float, list[dict[str, Any]]]] = {}
_PREP: dict[tuple[str, int], tuple[float, dict[str, Any]]] = {}
_RESULT: dict[tuple[Any, ...], tuple[float, dict[str, Any]]] = {}
_LOCKS: dict[tuple[str, int], asyncio.Lock] = {}

_SQL = text("""
SELECT r.id, r.archivo_id, r.entidad_normalizada entidad, r.vigencia anio,
 a.entidad_normalizada archivo_entidad,
 a.creado_en archivo_creado_en,
 r.corte_periodo corte, r.motor_destino motor, r.hoja_origen hoja,
 r.fila_origen_num fila, r.codigo_bpim bpim, r.codigo_meta_pdd meta,
 r.linea_estrategica linea, r.indicador, r.descripcion_actividad actividad,
 r.verbo_fuerte_dnp fuerte, r.avance_fisico_pct avance,
 r.meta_programada_anual programada, r.meta_ejecutada_anual ejecutada,
 r.apropiacion_definitiva_cop apropiacion, r.compromisos_rp_cop rp,
 r.obligaciones_cop obligaciones, r.pagos_tesoreria_cop pagos,
 r.dimensiones_seguridad_humana dimensiones,
 a.metadatos->>'huella_tabular_sha256' huella,
 a.mapeo_columnas -> r.hoja_origen ->> 'apropiacion_definitiva_cop' encabezado_apropiacion,
 a.mapeo_columnas -> r.hoja_origen ->> 'compromisos_rp_cop' encabezado_rp,
 a.mapeo_columnas -> r.hoja_origen ->> 'obligaciones_cop' encabezado_obligaciones,
 a.mapeo_columnas -> r.hoja_origen ->> 'pagos_tesoreria_cop' encabezado_pagos,
 CASE WHEN r.avance_fisico_pct > 0 AND r.avance_fisico_pct <= 1 THEN
  (SELECT jsonb_object_agg(k,v) FROM jsonb_each(r.datos_origen) AS z(k,v)
   WHERE jsonb_typeof(v) = 'number'
   AND k ~* '(meta|avance|program|ejecut|reporte|cumpl)')
 ELSE NULL END AS numeros_origen
FROM seguimiento.registros_triada_normalizados r
JOIN seguimiento.archivos_plan_ingeridos a ON a.id=r.archivo_id
WHERE r.vigencia=:anio AND r.motor_destino=:motor
 AND r.entidad_normalizada IS NOT NULL
 AND coalesce(a.metadatos->>'alerta_calidad','')<>:clone
""")
_SUM_MARK = re.compile(r"^\s*(total(?:\s+general)?|subtotal|consolidado)(?:\s|:|$)", re.I)
_BAD_KEY = re.compile(r"^(?:-+|0+|na|n/?a|sin codigo|pendiente|no aplica)$", re.I)


def _num(value: Any) -> float | None:
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def _key(value: Any) -> str | None:
    val = str(value or "").strip().casefold()
    return val if len(val) > 2 and not _BAD_KEY.fullmatch(val) else None


def _group(entity: str) -> str:
    if entity.startswith("Alcaldía Local"):
        return "ALCALDIAS_LOCALES"
    if entity.startswith(("Secretaría", "Alcaldía Mayor", "Gerencia", "Oficina")):
        return "SECTOR_CENTRAL_RECTOR"
    return "DESCENTRALIZADAS_Y_AUTORIDADES"


def _sigla(entity: str) -> str:
    skip = {"de", "del", "la", "el", "y", "para", "en"}
    words = [w for w in re.findall(r"[\wÁÉÍÓÚÑáéíóúñ]+", entity) if w.casefold() not in skip]
    return "".join(w[0].upper() for w in words[:5])


def _factor(year: int) -> float | None:
    if year > 2025 or year < 2017:
        return None
    return math.prod(1 + IPC_DANE[y] / 100 for y in range(year + 1, 2026))


def _origin_ratio(row: dict[str, Any]) -> float | None:
    programmed = _num(row.get("programada"))
    executed = _num(row.get("ejecutada"))
    if programmed and programmed > 0 and executed is not None and executed >= 0:
        return executed / programmed
    origin = row.get("numeros_origen") or {}
    if not isinstance(origin, dict):
        return None
    den = [
        float(v)
        for k, v in origin.items()
        if re.search(r"meta.*(program|producto|anual)|programad", k, re.I)
        and not re.search(r"avance|reporte", k, re.I)
        and _num(v)
        and _num(v) > 0
    ]
    num = [
        float(v)
        for k, v in origin.items()
        if re.search(r"ejecutad|reporte acumulad|avance acumulad", k, re.I)
        and _num(v) is not None
        and _num(v) >= 0
    ]
    if len(den) == len(num) == 1:
        return num[0] / den[0]
    return None


def _scale(row: dict[str, Any], sheet_stats: Counter) -> tuple[float | None, str]:
    value = _num(row.get("avance"))
    if value is None:
        return None, "SIN_DATO"
    if value < 0:
        return None, "NEGATIVO_INVALIDO"
    if value == 0:
        return 0.0, "CERO_OBSERVADO"
    if value > 100:
        return None, "SOBRECUMPLIMIENTO_O_CANTIDAD_ABSOLUTA"
    ratio = _origin_ratio(row)
    if ratio is not None and 0 <= ratio <= 1.2:
        tolerance = max(0.01, ratio * 0.03)
        if abs(value - ratio) <= tolerance:
            return min(value * 100, 100.0), "COCIENTE_VERIFICADO"
        if abs(value / 100 - ratio) <= tolerance / 100:
            return value, "PORCENTAJE_VERIFICADO"
    low, high = sheet_stats["low"], sheet_stats["high"]
    if value > 1:
        if value <= 3 and low >= 5 and high <= max(3, low * 0.05):
            return None, "ESCALA_AMBIGUA"
        return value, "PORCENTAJE_INFERIDO"
    if low >= 10 and high == 0:
        return value * 100, "COCIENTE_INFERIDO"
    return None, "ESCALA_AMBIGUA"


def _item(row: dict[str, Any], motor: str) -> str:
    bpim, meta, activity = (_key(row.get(k)) for k in ("bpim", "meta", "actividad"))
    indicator = _key(row.get("indicador"))
    if motor == "PLAN_DESARROLLO":
        core = meta or indicator or bpim
    elif motor == "PLAN_ACCION":
        core = f"{bpim or meta or ''}:{activity}" if activity else bpim or meta
    else:
        core = bpim or meta
    return core or f"SIN_CLAVE:{row['archivo_id']}:{row.get('hoja')}:{row.get('fila')}"


def _rank(row: dict[str, Any]) -> tuple[int, str, str]:
    return (
        CUT_RANK.get(row.get("corte"), -1),
        str(row.get("archivo_creado_en") or ""),
        str(row["id"]),
    )


def _is_sum(row: dict[str, Any]) -> bool:
    # Solo se descarta un sumatorio explícito, nunca una mención incidental de "total".
    return any(_SUM_MARK.match(str(row.get(k) or "")) for k in ("linea", "indicador", "actividad"))


def _unit_factor(header: str | None) -> tuple[float, str]:
    label = str(header or "").casefold()
    if "millones" in label:
        return 1e6, "MILLONES_EXPLICITOS"
    if "miles" in label and "pesos" in label:
        return 1e3, "MILES_EXPLICITOS"
    if "pesos" in label or "cop" in label:
        return 1.0, "PESOS_EXPLICITOS"
    return 1.0, "UNIDAD_NO_DECLARADA"


def _prepare(rows: list[dict[str, Any]], year: int) -> dict[str, Any]:
    sheet = defaultdict(Counter)
    for row in rows:
        v = _num(row.get("avance"))
        if v and v > 0:
            sheet[(row["archivo_id"], row["hoja"], row["motor"])]["low" if v <= 1 else "high"] += 1
    selected: dict[tuple[str, str, str], dict[str, Any]] = {}
    money_by_source: dict[tuple[Any, ...], dict[str, Any]] = {}
    audit = Counter()
    audit["registros"] = len(rows)
    audit["archivos"] = len({r["archivo_id"] for r in rows})
    audit["filas_fisicas"] = len({(r["archivo_id"], r["hoja"], r["fila"]) for r in rows})
    audit["entidades"] = len({r["entidad"] for r in rows})
    audit["filas_interinstitucionales"] = sum(
        r["entidad"] != r.get("archivo_entidad") for r in rows
    )
    audit["hojas_motor_analizadas"] = len(sheet)
    audit["hojas_motor_mixtas"] = sum(c["low"] > 0 and c["high"] > 0 for c in sheet.values())
    cuts_by_entity = defaultdict(set)
    for row in rows:
        motor = row["motor"]
        entity = row["entidad"]
        cuts_by_entity[entity].add(row.get("corte"))
        row["avance_norm"], state = _scale(row, sheet[(row["archivo_id"], row["hoja"], motor)])
        audit[f"escala_{state}"] += 1
        item = _item(row, motor)
        key = (entity, motor, item)
        old = selected.get(key)
        if old is None or _rank(row) > _rank(old):
            selected[key] = row
        if motor != "INVERSION_PRESUPUESTAL":
            continue
        if _is_sum(row):
            audit["sumatorios_explicitos"] += 1
            continue
        money_key = _key(row.get("bpim")) or _key(row.get("meta"))
        for stage in ("apropiacion", "rp", "obligaciones", "pagos"):
            value = _num(row.get(stage))
            if value is None or value <= 0:
                continue
            header = row.get(f"encabezado_{stage}")
            if (
                stage == "pagos"
                and header
                and re.search(r"compromis|registro presupuestal", header, re.I)
            ):
                audit["pagos_encabezado_conflicto_excluidos"] += 1
                continue
            factor, unit_state = _unit_factor(header)
            audit[f"unidad_{unit_state}"] += 1
            value *= factor
            audit[f"bruto_{stage}_cop"] += value
            # Sin clave/celda combinada demostrada, no se colapsan montos iguales.
            # Una posición en la misma plantilla puede repetirse entre cortes;
            # esta clave sustituta es explícitamente de menor confianza.
            source = money_key or f"FILA:{row['hoja']}:{row['fila']}:{value}"
            if not money_key:
                audit["importe_sin_clave_proyecto"] += 1
            signature = (entity, row["archivo_id"], row["hoja"], source, stage, value)
            previous = money_by_source.get(signature)
            if previous is not None:
                audit[f"repeticiones_{stage}"] += 1
            else:
                money_by_source[signature] = row
    # Conservar todos los importes distintos de un proyecto en el archivo de corte
    # superior. Las líneas sin clave mantienen su fila y su procedencia.
    best_file: dict[tuple[str, str, str], tuple[int, str, str]] = {}
    same_cut_files = defaultdict(set)
    for signature, row in money_by_source.items():
        entity, _file, _sheet, item, _stage, _amount = signature
        cut_rank = CUT_RANK.get(row.get("corte"), -1)
        rank = (cut_rank, str(row.get("archivo_creado_en") or ""), str(row["archivo_id"]))
        k = (entity, item, _stage)
        same_cut_files[(entity, item, _stage, cut_rank)].add(str(row["archivo_id"]))
        if k not in best_file or rank > best_file[k]:
            best_file[k] = rank
    audit["proyectos_etapa_multilibro_mismo_corte"] = sum(
        len(files) > 1 for files in same_cut_files.values()
    )
    money = defaultdict(lambda: defaultdict(float))
    dims = defaultdict(lambda: defaultdict(float))
    for signature, row in money_by_source.items():
        entity, _file, _sheet, item, stage, amount = signature
        rank = (
            CUT_RANK.get(row.get("corte"), -1),
            str(row.get("archivo_creado_en") or ""),
            str(row["archivo_id"]),
        )
        if best_file[(entity, item, stage)] != rank:
            audit[f"corte_reemplazado_{stage}"] += 1
            continue
        money[entity][stage] += amount
        if stage == "apropiacion":
            labels = list(dict.fromkeys(row.get("dimensiones") or []))
            if not labels:
                dims[entity]["SIN_ASIGNAR"] += amount
            else:
                for label in labels:
                    dims[entity][label] += amount / len(labels)
    entities = {r["entidad"] for r in rows}
    metrics = {
        e: {
            "entidad": e,
            "vigencia": year,
            "grupo": _group(e),
            "y1": 0.0,
            "y2": 0.0,
            "y2_fuerte": 0.0,
            "y3": 0.0,
            "x2": 0.0,
            "pa_total": 0,
            "pa_debil": 0,
            "bpim": set(),
            "dimensiones_cop": dims[e],
        }
        for e in entities
    }
    for (entity, motor, _), row in selected.items():
        m = metrics[entity]
        pct = row.get("avance_norm")
        if motor == "PLAN_DESARROLLO" and pct is not None:
            m["y1"] += pct / 100
        if motor == "PLAN_ACCION":
            m["pa_total"] += 1
            if row.get("fuerte") is False:
                m["pa_debil"] += 1
            if pct is not None:
                m["y2"] += pct / 100
                if row.get("fuerte") is True:
                    m["y2_fuerte"] += pct / 100
        if motor == "INVERSION_PRESUPUESTAL":
            bpim = _key(row.get("bpim"))
            if bpim and re.fullmatch(r"\d{8,}", bpim):
                m["bpim"].add(bpim)
                if pct is not None and pct >= 70:
                    m["y3"] += 1
    factor = _factor(year)
    for entity, m in metrics.items():
        for stage in ("apropiacion", "rp", "obligaciones", "pagos"):
            raw = money[entity].get(stage, 0.0)
            m[f"{stage}_cop"] = raw
            m[f"{stage}_constante_2025_cop"] = raw * factor if factor is not None else None
        m["x2"] = float(len(m["bpim"]))
        m["completitud_documental"] = (
            len(cuts_by_entity[entity] & {"T1", "T2", "T3", "T4", "ANUAL"}) / 5
        )
        m["pa_debil_proporcion"] = m["pa_debil"] / m["pa_total"] if m["pa_total"] else None
    audit["seleccionados_por_item"] = len(selected)
    bpim_cuts = defaultdict(list)
    for row in rows:
        bpim = str(row.get("bpim") or "").strip()
        if re.fullmatch(r"\d{8,}", bpim):
            bpim_cuts[(row["entidad"], bpim)].append(CUT_RANK.get(row.get("corte"), -1))
    top_rank = defaultdict(lambda: -1)
    for row in rows:
        top_rank[row["entidad"]] = max(top_rank[row["entidad"]], CUT_RANK.get(row.get("corte"), -1))
    audit["bpim_solo_corte_anterior"] = sum(
        max(ranks) < top_rank[entity] for (entity, _), ranks in bpim_cuts.items()
    )
    audit["insumo_financiero_ausente"] = sum(m["apropiacion_cop"] <= 0 for m in metrics.values())
    audit["factor_ipc_2025"] = factor
    audit["provisional"] = year > 2025
    audit["finanzas_saneadas_cop"] = {
        stage: sum(m[f"{stage}_cop"] for m in metrics.values())
        for stage in ("apropiacion", "rp", "obligaciones", "pagos")
    }
    return {"vigencia": year, "metricas": metrics, "auditoria": dict(audit)}


def _arrays(items: list[dict[str, Any]], modo: str, insumo: str):
    xkey = f"{insumo}_constante_2025_cop"
    valid = [m for m in items if m.get(xkey) and m[xkey] > 0 and m["y1"] + m["y2"] > 0]
    if modo == "extendido_2x3":
        valid = [m for m in valid if m["x2"] > 0 and m["y3"] > 0]
    X = np.array(
        [[m[xkey] / 1e6] + ([m["x2"]] if modo == "extendido_2x3" else []) for m in valid],
        dtype=float,
    )
    Y = np.array(
        [[m["y1"], m["y2"]] + ([m["y3"]] if modo == "extendido_2x3" else []) for m in valid],
        dtype=float,
    )
    return valid, X, Y


def _lp(
    X: np.ndarray,
    Y: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    *,
    vrs: bool = False,
    exclude: int | None = None,
) -> dict[str, Any]:
    n = len(X)
    if not n or sum(y) <= 0 or np.any(x <= 0):
        return {"estado": "NO_ESTIMABLE"}
    # phi, lambda_1,...,lambda_n. Dividir restricciones por escala observada.
    scale_x = np.maximum(np.max(X, axis=0), np.maximum(x, 1e-9))
    scale_y = np.maximum(np.max(Y, axis=0), np.maximum(y, 1e-9))
    aub = np.vstack(
        [
            np.column_stack([np.zeros(X.shape[1]), (X / scale_x).T]),
            np.column_stack([(y / scale_y), -(Y / scale_y).T]),
        ]
    )
    bub = np.concatenate([x / scale_x, np.zeros(Y.shape[1])])
    c = np.r_[-1.0, np.zeros(n)]
    bounds = [(0, None)] + [(0, 0) if j == exclude else (0, None) for j in range(n)]
    eq = np.r_[0.0, np.ones(n)].reshape(1, -1) if vrs else None
    result = linprog(
        c,
        A_ub=aub,
        b_ub=bub,
        A_eq=eq,
        b_eq=np.array([1.0]) if vrs else None,
        bounds=bounds,
        method="highs",
        options={"primal_feasibility_tolerance": 1e-8, "dual_feasibility_tolerance": 1e-8},
    )
    if not result.success or result.x[0] <= 0:
        return {
            "estado": "INFACTIBLE_VRS" if vrs and exclude is not None else "SOLVER_FALLO",
            "solver_status": int(result.status),
        }
    return {
        "estado": "CALCULADO",
        "eficiencia": float(1 / result.x[0]),
        "phi": float(result.x[0]),
        "lambda": result.x[1:].tolist(),
        "solver_status": int(result.status),
    }


def _sbm(X: np.ndarray, Y: np.ndarray, i: int) -> dict[str, Any]:
    x, y = X[i], Y[i]
    if np.any(x <= 0) or np.any(y <= 0):
        return {"estado": "NO_ESTIMABLE_OUTPUT_CERO"}
    n, m, s = len(X), X.shape[1], Y.shape[1]
    # Tone no orientado CRS, transformación lineal-fraccional de Charnes-Cooper.
    # variables: lambda_bar(n), s_minus_bar(m), s_plus_bar(s), t.
    size = n + m + s + 1
    c = np.zeros(size)
    c[n : n + m] = -1 / (m * x)
    c[-1] = 1
    eq = np.zeros((m + s + 1, size))
    eq[:m, :n] = X.T
    eq[:m, n : n + m] = np.eye(m)
    eq[:m, -1] = -x
    eq[m : m + s, :n] = Y.T
    eq[m : m + s, n + m : n + m + s] = -np.eye(s)
    eq[m : m + s, -1] = -y
    eq[-1, n + m : n + m + s] = 1 / (s * y)
    eq[-1, -1] = 1
    rhs = np.r_[np.zeros(m + s), 1.0]
    res = linprog(c, A_eq=eq, b_eq=rhs, bounds=(0, None), method="highs")
    if not res.success or res.x[-1] <= 1e-10:
        return {"estado": "SOLVER_FALLO", "solver_status": int(res.status)}
    t = res.x[-1]
    sm = res.x[n : n + m] / t
    sp = res.x[n + m : n + m + s] / t
    return {
        "estado": "CALCULADO",
        "eficiencia": float(np.clip(res.fun, 0, 1)),
        "holguras_input": sm.tolist(),
        "holguras_output": sp.tolist(),
        "targets_input": (x - sm).tolist(),
        "targets_output": (y + sp).tolist(),
        "lambda": (res.x[:n] / t).tolist(),
    }


def _gini(values: list[float]) -> float | None:
    v = np.sort(np.asarray(values, dtype=float))
    if not len(v) or v.sum() <= 0:
        return None
    return float((2 * np.arange(1, len(v) + 1) - len(v) - 1) @ v / (len(v) * v.sum()))


def _hhi(values: list[float]) -> float | None:
    total = sum(values)
    return sum((v / total) ** 2 for v in values) if total > 0 else None


def _geomean(values: list[float]) -> float:
    positive = [v for v in values if v > 0 and math.isfinite(v)]
    return math.exp(sum(math.log(v) for v in positive) / len(positive)) if positive else 0.0


def _bh(pvalues: list[float]) -> list[float]:
    n = len(pvalues)
    result = [1.0] * n
    minimum = 1.0
    for rank, idx in reversed(list(enumerate(sorted(range(n), key=lambda i: pvalues[i]), 1))):
        minimum = min(minimum, pvalues[idx] * n / rank)
        result[idx] = minimum
    return result


def _frontier_contract(result: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    """Campos usados por el laboratorio visual, con resultados reales y estados visibles."""
    source = data["metricas"]
    ranking = []
    for score in result.get("entidades", []):
        if score.get("estado") != "CALCULADO":
            continue
        m = source[score["entidad"]]
        sbm = score.get("sbm", {})
        boot = score.get("bootstrap", {})
        slx = sbm.get("holguras_input") or [0]
        sly = sbm.get("holguras_output") or [0, 0]
        tx = sbm.get("targets_input") or [score["x1_millones_cop_2025"]]
        ty = sbm.get("targets_output") or [m["y1"], m["y2"]]
        ranking.append(
            {
                "entidad": m["entidad"],
                "sigla": _sigla(m["entidad"]),
                "grupo_institucional": m["grupo"],
                "vigencia": m["vigencia"],
                "x1_presupuesto_constante_2025_mcop": m["apropiacion_constante_2025_cop"] / 1e6,
                "x1_pagos_constante_2025_mcop": m["pagos_constante_2025_cop"] / 1e6,
                "x2_proyectos_bpim_activos": m["x2"],
                "y1_metas_pdd_equivalentes": m["y1"],
                "y2_actividades_pa_equivalentes": m["y2"],
                "y2_calidad_verbo_fuerte_equivalentes": m["y2_fuerte"],
                "y3_proyectos_ejecucion_ge70": m["y3"],
                "theta_ccr": score["ccr"],
                "theta_bcc": score["bcc"],
                "escala_eficiencia_se": score["eficiencia_escala"],
                "retornos_escala_rts": score["rendimientos_escala"],
                "theta_sbm": sbm.get("eficiencia", 0),
                "sbm_estado": sbm.get("estado"),
                "theta_supereficiencia": score["supereficiencia"],
                "estado_supereficiencia": "ESTIMADO"
                if score["estado_supereficiencia"] == "CALCULADO"
                else score["estado_supereficiencia"],
                "theta_bootstrap_corregido": boot.get("puntaje_corregido"),
                "bootstrap_bias": boot.get("sesgo_estimado"),
                "ic95_inf": boot.get("ic95_inf"),
                "ic95_sup": boot.get("ic95_sup"),
                "bootstrap_estado": boot.get("estado"),
                "peers": [
                    {"sigla": _sigla(p["entidad"]), "lambda": p["peso"]} for p in score["peers"]
                ],
                "holguras_slacks": {
                    "slack_x1_mcop": slx[0],
                    "slack_y1_metas": sly[0],
                    "slack_y2_actividades": sly[1],
                },
                "metas_target_frontera": {
                    "target_x1_mcop": tx[0],
                    "target_y1_metas": ty[0],
                    "target_y2_actividades": ty[1],
                },
                "estado_estimacion": "ESTIMABLE",
            }
        )
    ranking.sort(key=lambda row: (-row["theta_bcc"], -row["theta_ccr"], row["entidad"]))
    excluded = [
        {
            "entidad": e["entidad"],
            "sigla": _sigla(e["entidad"]),
            "vigencia": data["vigencia"],
            "motivo": e["estado"],
            "estado": e["estado"],
        }
        for e in result.get("exclusiones", [])
    ]
    groups = []
    for name, summary in result.get("fronteras_grupo", {}).items():
        vals = [
            s.get("eficiencia_grupo_bcc")
            for s in result.get("entidades", [])
            if s.get("grupo") == name and s.get("eficiencia_grupo_bcc") is not None
        ]
        groups.append(
            {
                "grupo": name,
                "nombre_grupo": name.replace("_", " ").title(),
                "n_efectivo": summary["n_elegible"],
                "cumple_cooper": summary["estado"] == "CALCULADO",
                "cooper_minimo": result.get("minimo_cooper", 9),
                "eficiencia_media_bcc": float(np.mean(vals)) if vals else 0,
                "estado": summary["estado"],
            }
        )
    result.update(
        {
            "modo": "extendida_2x3"
            if result.get("modo") == "extendido_2x3"
            else result.get("modo", "nucleo_1x2"),
            "cooper_n_minimo": result.get("minimo_cooper", 9),
            "dmus_totales_observadas": len(source),
            "dmus_estimables": len(ranking),
            "dmus_excluidas": len(excluded),
            "eficiencia_media_ccr": float(np.mean([r["theta_ccr"] for r in ranking]))
            if ranking
            else 0,
            "eficiencia_media_bcc": float(np.mean([r["theta_bcc"] for r in ranking]))
            if ranking
            else 0,
            "eficiencia_media_sbm": float(
                np.mean([r["theta_sbm"] for r in ranking if r["theta_sbm"] is not None])
            )
            if any(r["theta_sbm"] is not None for r in ranking)
            else 0,
            "ranking_eficiencia": ranking,
            "entidades_excluidas": excluded,
            "detalle_grupos": result.get("fronteras_grupo", {}),
            "fronteras_grupo": groups,
        }
    )
    return result


def _regression_truncated(panel: list[dict[str, Any]], replicas: int = 300) -> dict[str, Any]:
    """Normal truncada en cero; bootstrap por entidad, solo con muestra defendible."""
    usable = [
        r
        for r in panel
        if r["grupo"] != "ALCALDIAS_LOCALES"
        and all(r.get(k) is not None for k in ("debil", "continuidad", "completitud_documental"))
    ]
    entities = sorted({r["entidad"] for r in usable})
    if len(entities) < 30 or len(usable) < 100:
        return {
            "estado": "NO_ESTIMABLE_MUESTRA_INSUFICIENTE",
            "n_entidades": len(entities),
            "n_observaciones": len(usable),
            "minimo_entidades": 30,
        }
    names = [
        "intercepto",
        "verbo_debil",
        "continuidad_bpim",
        "completitud_documental",
        "grupo_central",
    ]

    def design(rows):
        y = np.array([max(0.0, 1 / r["eficiencia"] - 1) for r in rows])
        z = np.array(
            [
                [
                    1,
                    r["debil"],
                    r["continuidad"],
                    r["completitud_documental"],
                    float(r["grupo"] == "SECTOR_CENTRAL_RECTOR"),
                ]
                for r in rows
            ]
        )
        return y, z

    def fit(rows):
        y, z = design(rows)
        if np.linalg.matrix_rank(z) < z.shape[1]:
            return None

        def objective(v):
            mu = z @ v[:-1]
            sigma = np.exp(v[-1])
            value = norm.logpdf((y - mu) / sigma) - v[-1] - norm.logcdf(mu / sigma)
            return -float(np.sum(value)) if np.all(np.isfinite(value)) else 1e100

        start = np.r_[np.linalg.lstsq(z, y, rcond=None)[0], np.log(max(np.std(y), 0.01))]
        result = minimize(
            objective, start, method="L-BFGS-B", bounds=[(None, None)] * z.shape[1] + [(-10, 5)]
        )
        return result.x[:-1] if result.success and np.all(np.isfinite(result.x)) else None

    estimate = fit(usable)
    if estimate is None:
        return {"estado": "NO_ESTIMABLE_SOLVER_O_COLINEALIDAD", "n_entidades": len(entities)}
    rng = np.random.default_rng(20261015)
    grouped = defaultdict(list)
    for row in usable:
        grouped[row["entidad"]].append(row)
    draws = []
    for _ in range(replicas):
        sampled = rng.choice(entities, size=len(entities), replace=True)
        sample = [row for entity in sampled for row in grouped[entity]]
        coefficients = fit(sample)
        if coefficients is not None:
            draws.append(coefficients)
    if len(draws) < replicas * 0.9:
        return {
            "estado": "NO_ESTIMABLE_BOOTSTRAP",
            "replicas_validas": len(draws),
            "n_entidades": len(entities),
        }
    arr = np.asarray(draws)
    return {
        "estado": "EXPLORATORIO",
        "n_entidades": len(entities),
        "n_observaciones": len(usable),
        "replicas": len(draws),
        "seed": 20261015,
        "dependiente": "ineficiencia_crs_1_sobre_theta_menos_1",
        "coeficientes": [
            {
                "variable": name,
                "beta": float(estimate[i]),
                "error_bootstrap": float(np.std(arr[:, i], ddof=1)),
                "ic95_inf": float(np.quantile(arr[:, i], 0.025)),
                "ic95_sup": float(np.quantile(arr[:, i], 0.975)),
                "p_bootstrap_aproximado": float(
                    2 * min(np.mean(arr[:, i] <= 0), np.mean(arr[:, i] >= 0))
                ),
            }
            for i, name in enumerate(names)
        ],
    }


class DeaEconometriaService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bind_key = str(getattr(session.get_bind(), "url", id(session.get_bind())))

    async def _year(self, year: int) -> dict[str, Any]:
        key = (self.bind_key, year)
        cached = _PREP.get(key)
        if cached and time.monotonic() - cached[0] < TTL:
            return cached[1]
        lock = _LOCKS.setdefault(key, asyncio.Lock())
        async with lock:
            cached = _PREP.get(key)
            if cached and time.monotonic() - cached[0] < TTL:
                return cached[1]
            rows = []
            # El pool API fija command_timeout=3 s. Cada motor cabe en ese límite;
            # consultar la vigencia completa de una vez excede el timeout.
            for motor in ("INVERSION_PRESUPUESTAL", "PLAN_ACCION", "PLAN_DESARROLLO"):
                part = (
                    (
                        await self.session.execute(
                            _SQL, {"anio": year, "motor": motor, "clone": CLONE}
                        )
                    )
                    .mappings()
                    .all()
                )
                rows.extend(part)
            # Separar la labor numérica del event loop; descartar JSON bruto tras consolidar.
            data = await asyncio.to_thread(_prepare, [dict(r) for r in rows], year)
            _PREP[key] = (time.monotonic(), data)
            return data

    async def auditoria_saneamiento(self) -> dict[str, Any]:
        years = [await self._year(y) for y in range(2020, 2027)]
        audits = [x["auditoria"] for x in years]
        total = (
            await self.session.execute(
                text("SELECT count(*) FROM seguimiento.registros_triada_normalizados")
            )
        ).scalar_one()
        missing = [
            {
                "entidad": m["entidad"],
                "sigla": _sigla(m["entidad"]),
                "vigencia": x["vigencia"],
                "motivo": "Sin apropiacion positiva verificable",
                "tratamiento_metodologico": "Exclusion sin epsilon artificial",
            }
            for x in years
            if x["vigencia"] <= 2025
            for m in x["metricas"].values()
            if m["apropiacion_cop"] <= 0
        ]
        ipc = [
            {
                "vigencia": y,
                "inflacion_anual_pct": IPC_DANE[y],
                "factor_deflactor_base_2025": _factor(y),
                "fuente": "DANE IPC cierre anual",
                "estado": "BASE_CERRADA" if y == 2025 else "CERTIFICADO",
            }
            for y in range(2017, 2026)
        ]
        ipc.append(
            {
                "vigencia": "2026_PARCIAL",
                "inflacion_anual_pct": None,
                "factor_deflactor_base_2025": None,
                "fuente": "Sin cierre anual DANE 2026",
                "estado": "CORTE_PARCIAL_PROVISIONAL",
            }
        )
        return {
            "estado": "CALCULADO",
            "base_ipc": 2025,
            "fuente_ipc": "DANE IPC variacion anual, cierre diciembre 2025 = 5,10%",
            "vigencias": [
                a | {"vigencia": x["vigencia"]} for a, x in zip(audits, years, strict=True)
            ],
            "embudo_financiero": {
                "presupuesto_bruto_cop": sum(a.get("bruto_apropiacion_cop", 0) for a in audits),
                "duplicados_intermotor_filas": sum(
                    a["registros"] - a["filas_fisicas"] for a in audits
                ),
                "presupuesto_deduplicado_cop": sum(
                    a["finanzas_saneadas_cop"]["apropiacion"] for a in audits
                ),
                "bpim_complementarios_preservados": sum(
                    a["bpim_solo_corte_anterior"] for a in audits
                ),
                "filas_interinstitucionales_preservadas": sum(
                    a["filas_interinstitucionales"] for a in audits
                ),
                "grupos_repetidos_despropagados": sum(
                    a.get("repeticiones_apropiacion", 0) for a in audits
                ),
                "sumatorios_podados": sum(a.get("sumatorios_explicitos", 0) for a in audits),
                "presupuesto_anual_saneado_promedio_cop": sum(
                    a["finanzas_saneadas_cop"]["apropiacion"] for a in audits[:6]
                )
                / 6,
                "total_registros_bd": total,
                "estado": "ESTIMACION_NO_CONCILIADA",
            },
            "deflactacion_ipc_dane": ipc,
            "auditoria_escalas_porcentuales": {
                "total_hojas_motor_analizadas": sum(a["hojas_motor_analizadas"] for a in audits),
                "hojas_mixtas_detectadas": sum(a["hojas_motor_mixtas"] for a in audits),
                "reconciliadas_cociente_ejec_prog": sum(
                    a.get("escala_COCIENTE_VERIFICADO", 0)
                    + a.get("escala_PORCENTAJE_VERIFICADO", 0)
                    for a in audits
                ),
                "casos_cuarentena_escala_ambigua": sum(
                    a.get("escala_ESCALA_AMBIGUA", 0) for a in audits
                ),
                "casos_mayores_100_auditados": sum(
                    a.get("escala_SOBRECUMPLIMIENTO_O_CANTIDAD_ABSOLUTA", 0) for a in audits
                ),
                "diagnostico_metodologico": (
                    "Escalas inferidas por columna/hoja con cotejo de cociente cuando existe. "
                    "Los casos ambiguos y >100 no alimentan DEA."
                ),
            },
            "pares_sin_insumo_financiero": missing,
            "advertencias": [
                "Estimaciones del corpus, pendientes de conciliacion presupuestal oficial",
                "2026 es corte parcial; sin deflactor anual definitivo",
                "Escalas ambiguas y unidades monetarias mixtas quedan visibles; "
                "solo se reescalan unidades explicitas",
            ],
        }

    async def frontera_eficiencia(
        self, vigencia: int = 2025, modo: str = "nucleo_1x2", insumo: str = "apropiacion"
    ) -> dict[str, Any]:
        if modo == "extendida_2x3":
            modo = "extendido_2x3"
        key = (self.bind_key, "frontera", vigencia, modo, insumo)
        cached = _RESULT.get(key)
        if cached and time.monotonic() - cached[0] < TTL:
            return cached[1]
        data = await self._year(vigencia)
        if vigencia > 2025:
            return _frontier_contract(
                {
                    "estado": "NO_ESTIMABLE_CORTE_PARCIAL",
                    "vigencia": vigencia,
                    "muestra": len(data["metricas"]),
                    "entidades": [],
                    "modo": modo,
                    "insumo": insumo,
                    "exclusiones": [
                        {"entidad": m["entidad"], "estado": "no_estimable_corte_parcial"}
                        for m in data["metricas"].values()
                    ],
                },
                data,
            )
        response = await asyncio.to_thread(self._frontier_sync, data, modo, insumo, True)
        if modo == "nucleo_1x2":
            response["ventana_panel_localidades"] = await self._local_panel(insumo)
        _RESULT[key] = (time.monotonic(), response)
        return response

    async def _local_panel(self, insumo: str) -> dict[str, Any]:
        years = [await self._year(y) for y in range(2020, 2026)]
        local = [
            m
            for data in years
            for m in data["metricas"].values()
            if m["grupo"] == "ALCALDIAS_LOCALES"
        ]
        valid, X, Y = _arrays(local, "nucleo_1x2", insumo)
        if len(valid) < 9:
            return {
                "estado": "NO_ESTIMABLE_MUESTRA_INSUFICIENTE",
                "n_elegible": len(valid),
                "minimo_cooper": 9,
            }
        return {
            "estado": "EXPLORATORIO_PANEL_CON_ANIOS_REPETIDOS",
            "n_elegible": len(valid),
            "observaciones": [
                {
                    "entidad": m["entidad"],
                    "vigencia": m["vigencia"],
                    "ccr": _lp(X, Y, X[i], Y[i]).get("eficiencia"),
                }
                for i, m in enumerate(valid)
            ],
        }

    @staticmethod
    def _frontier_sync(
        data: dict[str, Any], modo: str, insumo: str, bootstrap: bool
    ) -> dict[str, Any]:
        all_items = sorted(data["metricas"].values(), key=lambda m: m["entidad"])
        valid, X, Y = _arrays(all_items, modo, insumo)
        minimum = 9 if modo == "nucleo_1x2" else 15
        if len(valid) < minimum:
            return _frontier_contract(
                {
                    "estado": "NO_ESTIMABLE_MUESTRA_INSUFICIENTE",
                    "vigencia": data["vigencia"],
                    "modo": modo,
                    "insumo": insumo,
                    "n_elegible": len(valid),
                    "minimo_cooper": minimum,
                    "exclusiones": [
                        {
                            "entidad": m["entidad"],
                            "estado": "no_estimable_sin_insumo_financiero"
                            if not m.get(f"{insumo}_constante_2025_cop")
                            else "no_estimable_sin_outputs_o_extension",
                        }
                        for m in all_items
                        if m not in valid
                    ],
                    "entidades": [],
                },
                data,
            )
        scores = []
        for i, m in enumerate(valid):
            crs = _lp(X, Y, X[i], Y[i])
            vrs = _lp(X, Y, X[i], Y[i], vrs=True)
            sbm = _sbm(X, Y, i)
            super_vrs = _lp(X, Y, X[i], Y[i], vrs=True, exclude=i)
            if crs["estado"] != "CALCULADO" or vrs["estado"] != "CALCULADO":
                scores.append({"entidad": m["entidad"], "estado": "SOLVER_FALLO"})
                continue
            lambdas = crs["lambda"]
            sum_lambda = sum(lambdas)
            scale = "CRS" if abs(sum_lambda - 1) <= 1e-5 else ("IRS" if sum_lambda < 1 else "DRS")
            scores.append(
                {
                    "entidad": m["entidad"],
                    "grupo": m["grupo"],
                    "estado": "CALCULADO",
                    "x1_millones_cop_2025": X[i, 0],
                    "y1": m["y1"],
                    "y2": m["y2"],
                    "y2_verbo_fuerte": m["y2_fuerte"],
                    "ccr": crs["eficiencia"],
                    "bcc": vrs["eficiencia"],
                    "eficiencia_escala": crs["eficiencia"] / vrs["eficiencia"],
                    "rendimientos_escala": scale,
                    "sbm": sbm,
                    "supereficiencia": super_vrs.get("eficiencia"),
                    "estado_supereficiencia": super_vrs["estado"],
                    "peers": [
                        {"entidad": valid[j]["entidad"], "peso": w}
                        for j, w in enumerate(lambdas)
                        if w > 1e-6
                    ],
                    "bootstrap": {"estado": "PENDIENTE"},
                }
            )
        groups = {}
        for name in (
            "SECTOR_CENTRAL_RECTOR",
            "DESCENTRALIZADAS_Y_AUTORIDADES",
            "ALCALDIAS_LOCALES",
        ):
            indices = [i for i, m in enumerate(valid) if m["grupo"] == name]
            if len(indices) < minimum:
                groups[name] = {
                    "estado": "NO_ESTIMABLE_MUESTRA_INSUFICIENTE",
                    "n_elegible": len(indices),
                    "minimo_cooper": minimum,
                }
                continue
            gx, gy = X[indices], Y[indices]
            groups[name] = {"estado": "CALCULADO", "n_elegible": len(indices)}
            for j, i in enumerate(indices):
                local = _lp(gx, gy, gx[j], gy[j])
                local_bcc = _lp(gx, gy, gx[j], gy[j], vrs=True)
                if local["estado"] == "CALCULADO" and scores[i]["estado"] == "CALCULADO":
                    scores[i]["eficiencia_grupo"] = local["eficiencia"]
                    scores[i]["eficiencia_grupo_bcc"] = local_bcc.get("eficiencia")
                    scores[i]["mtr"] = min(1.0, scores[i]["ccr"] / local["eficiencia"])
        if bootstrap:
            rng = np.random.default_rng(20261015)
            draws = [[] for _ in valid]
            # 1.000 fronteras remuestreadas; intervalo exploratorio, no el
            # bootstrap suavizado ni la correccion Simar-Wilson.
            for _ in range(1000):
                indices = rng.integers(0, len(valid), size=len(valid))
                bx, by = X[indices], Y[indices]
                for i in range(len(valid)):
                    result = _lp(bx, by, X[i], Y[i])
                    if result["estado"] == "CALCULADO":
                        draws[i].append(min(1.0, result["eficiencia"]))
            for i, score in enumerate(scores):
                if score["estado"] != "CALCULADO":
                    continue
                vals = np.asarray(draws[i])
                if len(vals) < 900:
                    score["bootstrap"] = {"estado": "NO_ESTIMABLE_REPLICAS", "n": len(vals)}
                    continue
                mean = float(np.mean(vals))
                score["bootstrap"] = {
                    "estado": "EXPLORATORIO",
                    "replicas": len(vals),
                    "seed": 20261015,
                    "sesgo_estimado": mean - score["ccr"],
                    "puntaje_corregido": float(np.clip(2 * score["ccr"] - mean, 0, 1)),
                    "ic95_inf": float(np.quantile(vals, 0.025)),
                    "ic95_sup": float(np.quantile(vals, 0.975)),
                }
        return _frontier_contract(
            {
                "estado": "CALCULADO",
                "vigencia": data["vigencia"],
                "modo": modo,
                "insumo": insumo,
                "n_elegible": len(valid),
                "minimo_cooper": minimum,
                "base_ipc": 2025,
                "advertencia": (
                    "DEA exploratorio sobre datos ingeridos sin conciliacion presupuestal externa"
                ),
                "entidades": scores,
                "fronteras_grupo": groups,
                "exclusiones": [
                    {
                        "entidad": m["entidad"],
                        "estado": "no_estimable_sin_insumo_financiero"
                        if not m.get(f"{insumo}_constante_2025_cop")
                        else "no_estimable_sin_outputs_o_extension",
                    }
                    for m in all_items
                    if m not in valid
                ],
            },
            data,
        )

    async def malmquist(self, desde: int = 2020, hasta: int = 2025) -> dict[str, Any]:
        if desde < 2020 or hasta > 2025 or hasta <= desde:
            return {"estado": "NO_ESTIMABLE_RANGO", "transiciones": []}
        years = {y: await self._year(y) for y in range(desde, hasta + 1)}
        transitions = []
        for y in range(desde, hasta):
            old, new = years[y], years[y + 1]
            a, ax, ay = _arrays(list(old["metricas"].values()), "nucleo_1x2", "apropiacion")
            b, bx, by = _arrays(list(new["metricas"].values()), "nucleo_1x2", "apropiacion")
            if len(a) < 9 or len(b) < 9:
                transitions.append(
                    {"desde": y, "hasta": y + 1, "estado": "NO_ESTIMABLE_MUESTRA_INSUFICIENTE"}
                )
                continue
            ai = {m["entidad"]: i for i, m in enumerate(a)}
            bi = {m["entidad"]: i for i, m in enumerate(b)}
            results = []
            for entity in sorted(ai.keys() & bi.keys()):
                i, j = ai[entity], bi[entity]
                d00 = _lp(ax, ay, ax[i], ay[i])
                d11 = _lp(bx, by, bx[j], by[j])
                d01 = _lp(ax, ay, bx[j], by[j])
                d10 = _lp(bx, by, ax[i], ay[i])
                if any(z["estado"] != "CALCULADO" for z in (d00, d11, d01, d10)):
                    results.append({"entidad": entity, "estado": "NO_ESTIMABLE_DISTANCIA"})
                    continue
                e = d11["eficiencia"] / d00["eficiencia"]
                t = math.sqrt(
                    (d01["eficiencia"] / d11["eficiencia"])
                    * (d00["eficiencia"] / d10["eficiencia"])
                )
                v0 = _lp(ax, ay, ax[i], ay[i], vrs=True)
                v1 = _lp(bx, by, bx[j], by[j], vrs=True)
                pech = (
                    v1["eficiencia"] / v0["eficiencia"]
                    if v0["estado"] == v1["estado"] == "CALCULADO"
                    else None
                )
                results.append(
                    {
                        "entidad": entity,
                        "sigla": _sigla(entity),
                        "estado": "CALCULADO",
                        "effch": e,
                        "techch": t,
                        "mpi": e * t,
                        "pech": pech,
                        "sech": e / pech if pech else None,
                        "interpretacion": "Mejora" if e * t > 1 else "Retroceso",
                    }
                )
            estimable = [r for r in results if r["estado"] == "CALCULADO"]
            transitions.append(
                {
                    "desde": y,
                    "hasta": y + 1,
                    "periodo": f"{y}–{y + 1}",
                    "estado": "CALCULADO",
                    "n_pareado": len(results),
                    "dmus_evaluadas": len(estimable),
                    "mpi_medio": _geomean([r["mpi"] for r in estimable]),
                    "effch_medio": _geomean([r["effch"] for r in estimable]),
                    "techch_medio": _geomean([r["techch"] for r in estimable]),
                    "pech_medio": _geomean([r["pech"] for r in estimable if r["pech"]]),
                    "sech_medio": _geomean([r["sech"] for r in estimable if r["sech"]]),
                    "media_agregada": "GEOMETRICA",
                    "alertas_mpi_extremo": sum(r["mpi"] > 5 or r["mpi"] < 0.2 for r in estimable),
                    "desglose_por_entidad": estimable,
                    "entidades": results,
                }
            )
        all_scores = [r for tr in transitions for r in tr.get("desglose_por_entidad", [])]
        global_mpi = _geomean([r["mpi"] for r in all_scores])
        return {
            "estado": "EXPLORATORIO",
            "desde": desde,
            "hasta": hasta,
            "base_ipc": 2025,
            "retornos": "CRS",
            "transiciones": transitions,
            "resumen_periodo_completo": {
                "mpi_global": global_mpi,
                "effch_global": _geomean([r["effch"] for r in all_scores]),
                "techch_global": _geomean([r["techch"] for r in all_scores]),
                "media_agregada": "GEOMETRICA",
                "alertas_mpi_extremo": sum(r["mpi"] > 5 or r["mpi"] < 0.2 for r in all_scores),
                "entidades_avance_productividad": len(
                    {r["entidad"] for r in all_scores if r["mpi"] > 1}
                ),
                "entidades_retroceso_productividad": len(
                    {r["entidad"] for r in all_scores if r["mpi"] < 1}
                ),
                "diagnostico_institucional": (
                    "Media geometrica exploratoria de anos cerrados; hay MPI extremos "
                    "por calidad de datos y no se infiere causalidad."
                ),
            },
        }

    async def econometria_segunda_etapa(self) -> dict[str, Any]:
        years = [await self._year(y) for y in range(2020, 2026)]
        panel = []
        concentration = []
        prior_bpim = defaultdict(set)
        for data in years:
            year = data["vigencia"]
            metrics = list(data["metricas"].values())
            eligible, X, Y = _arrays(metrics, "nucleo_1x2", "apropiacion")
            if len(eligible) >= 9:
                for i, m in enumerate(eligible):
                    fit = _lp(X, Y, X[i], Y[i])
                    if fit["estado"] != "CALCULADO":
                        continue
                    bpim = m["bpim"]
                    panel.append(
                        {
                            "entidad": m["entidad"],
                            "vigencia": year,
                            "eficiencia": fit["eficiencia"],
                            "presupuesto_cop_2025": m["apropiacion_constante_2025_cop"],
                            "y1": m["y1"],
                            "y2": m["y2"],
                            "debil": m["pa_debil_proporcion"],
                            "continuidad": len(bpim & prior_bpim[m["entidad"]]) / len(bpim)
                            if bpim
                            else None,
                            "completitud_documental": m["completitud_documental"],
                            "grupo": m["grupo"],
                        }
                    )
            values = [m["apropiacion_constante_2025_cop"] or 0 for m in metrics]
            by_dim = defaultdict(float)
            for m in metrics:
                for dim, value in m["dimensiones_cop"].items():
                    by_dim[dim] += value * (_factor(year) or 1)
                prior_bpim[m["entidad"]].update(m["bpim"])
            unassigned = by_dim.pop("SIN_ASIGNAR", 0.0)
            concentration.append(
                {
                    "vigencia": year,
                    "n_entidades": len(metrics),
                    "gini_entidades": _gini(values),
                    "hhi_entidades": _hhi(values),
                    "sin_dimension_cop_2025": unassigned,
                    "dimensiones": [
                        {"dimension": k, "cop_2025": v} for k, v in sorted(by_dim.items())
                    ],
                    "gini_dimensiones": _gini(list(by_dim.values())),
                    "hhi_dimensiones": _hhi(list(by_dim.values())),
                }
            )
        correlations = []
        names = ("eficiencia", "presupuesto_cop_2025", "y1", "y2", "debil", "continuidad")
        for i, a in enumerate(names):
            for b in names[i + 1 :]:
                paired = [(r[a], r[b]) for r in panel if r[a] is not None and r[b] is not None]
                if (
                    len(paired) < 10
                    or len({p[0] for p in paired}) < 3
                    or len({p[1] for p in paired}) < 3
                ):
                    continue
                va, vb = zip(*paired, strict=True)
                rho, pr = spearmanr(va, vb)
                r, pp = pearsonr(va, vb)
                correlations.append(
                    {
                        "variable_a": a,
                        "variable_b": b,
                        "n": len(paired),
                        "spearman_rho": float(rho),
                        "spearman_p": float(pr),
                        "pearson_r": float(r),
                        "pearson_p": float(pp),
                    }
                )
        for kind in ("spearman", "pearson"):
            q = _bh([r[f"{kind}_p"] for r in correlations])
            for row, adjusted in zip(correlations, q, strict=True):
                row[f"{kind}_q_bh"] = adjusted
        by_entity = defaultdict(lambda: [[], []])
        for r in panel:
            by_entity[r["entidad"]][0 if r["vigencia"] <= 2023 else 1].append(r["eficiencia"])
        paired = [(sum(a) / len(a), sum(b) / len(b)) for a, b in by_entity.values() if a and b]
        if len(paired) >= 10 and any(abs(a - b) > 1e-10 for a, b in paired):
            statistic, p = wilcoxon([b - a for a, b in paired], zero_method="wilcox")
            compare = {
                "estado": "CALCULADO",
                "n_pareado": len(paired),
                "estadistico_wilcoxon": float(statistic),
                "p_value": float(p),
                "media_2020_2023": float(np.mean([a for a, _ in paired])),
                "media_2024_2025": float(np.mean([b for _, b in paired])),
            }
        else:
            compare = {"estado": "NO_ESTIMABLE_MUESTRA_O_VARIACION", "n_pareado": len(paired)}
        regression = await asyncio.to_thread(_regression_truncated, panel)
        corr_contract = [
            {
                "variable_a": c["variable_a"],
                "variable_b": c["variable_b"],
                "spearman_rho": c["spearman_rho"],
                "pearson_r": c["pearson_r"],
                "n": c["n"],
                "p_value": c["spearman_p"],
                "q_value_fdr": c["spearman_q_bh"],
                "es_significativa_fdr": c["spearman_q_bh"] < 0.05,
            }
            for c in correlations
        ]
        coeff = [
            {
                "parametro": c["variable"],
                "nombre_covariable": c["variable"],
                "coeficiente": c["beta"],
                "error_estandar": c["error_bootstrap"],
                "t_statistic": c["beta"] / c["error_bootstrap"] if c["error_bootstrap"] > 0 else 0,
                "p_value": c["p_bootstrap_aproximado"],
                "ic95_inferior": c["ic95_inf"],
                "ic95_superior": c["ic95_sup"],
                "significancia": "Exploratorio"
                if c["p_bootstrap_aproximado"] < 0.05
                else "No significativo",
                "interpretacion_politica": "Asociacion no causal, condicionada a elegibilidad",
            }
            for c in regression.get("coeficientes", [])
        ]
        last = years[-1]["metricas"]
        dim_entities = defaultdict(list)
        for m in last.values():
            for dim, value in m["dimensiones_cop"].items():
                if dim != "SIN_ASIGNAR":
                    dim_entities[dim].append(value)
        dim_total = sum(sum(v) for v in dim_entities.values())
        dim_contract = [
            {
                "dimension": dim,
                "hhi_puntos": (_hhi(values) or 0) * 10000,
                "clasificacion_hhi": "CONCENTRACION_ALTA"
                if (_hhi(values) or 0) > 0.25
                else "CONCENTRACION_MODERADA",
                "participacion_presupuesto_pct": 100 * sum(values) / dim_total if dim_total else 0,
            }
            for dim, values in sorted(dim_entities.items())
        ]
        p_w = compare.get("p_value", 1.0)
        delta = compare.get("media_2024_2025", 0) - compare.get("media_2020_2023", 0)
        wilcoxon_contract = {
            "periodo_1": "2020–2023",
            "periodo_2": "2024–2025",
            "n_pareado": compare["n_pareado"],
            "eficiencia_media_p1": compare.get("media_2020_2023", 0),
            "eficiencia_media_p2": compare.get("media_2024_2025", 0),
            "diferencia_medias": delta,
            "estadistico_w": compare.get("estadistico_wilcoxon", 0),
            "z_score": math.copysign(norm.isf(max(p_w, 1e-12) / 2), delta)
            if compare["estado"] == "CALCULADO"
            else 0,
            "p_value_bilateral": p_w,
            "conclusion_cientifica": "Comparacion descriptiva pareada, sin inferencia causal"
            if compare["estado"] == "CALCULADO"
            else "No estimable",
            "estado": compare["estado"],
        }
        return {
            "estado": "EXPLORATORIO",
            "n_panel": len(panel),
            "segunda_etapa": regression,
            "correlaciones": correlations,
            "concentracion": concentration,
            "comparacion_gobiernos": compare,
            "especificacion_modelo": {
                "variable_dependiente": "ineficiencia_crs_1_sobre_theta_menos_1",
                "metodo_estimacion": regression["estado"],
                "observaciones_n": regression.get("n_observaciones", 0),
                "r_cuadrado": 0,
                "r_cuadrado_ajustado": 0,
                "f_statistic": 0,
                "p_value_modelo": 1,
                "exclusion_endogeneidad": "Sin logaritmo de presupuesto; R2 y F no aplican",
                "estado": regression["estado"],
            },
            "coeficientes_regresion": coeff,
            "matriz_correlaciones": corr_contract,
            "desigualdad_presupuestal": {
                "gini_historico": [
                    {
                        "vigencia": c["vigencia"],
                        "coeficiente_gini": c["gini_entidades"] or 0,
                        "concentracion": "Exploratoria; presupuesto no conciliado",
                    }
                    for c in concentration
                ],
                "hhi_por_dimension": dim_contract,
                "hhi_general_distrital": (concentration[-1]["hhi_entidades"] or 0) * 10000,
            },
            "prueba_wilcoxon_pareada": wilcoxon_contract,
            "advertencia": (
                "Asociaciones descriptivas; no prueban causalidad ni presupuesto oficial"
            ),
        }

    async def resumen_integral(self) -> dict[str, Any]:
        audit = await self.auditoria_saneamiento()
        frontier = await self.frontera_eficiencia()
        malmquist = await self.malmquist()
        economy = await self.econometria_segunda_etapa()
        canonical = (
            await self.session.execute(
                text(
                    "SELECT count(DISTINCT entidad_normalizada) "
                    "FROM seguimiento.registros_triada_normalizados "
                    "WHERE entidad_normalizada IS NOT NULL"
                )
            )
        ).scalar_one()
        scores = frontier.get("ranking_eficiencia", [])
        msum = malmquist.get("resumen_periodo_completo", {})
        w = economy.get("prueba_wilcoxon_pareada", {})
        weak = next(
            (
                c
                for c in economy.get("coeficientes_regresion", [])
                if c["parametro"] == "verbo_debil"
            ),
            None,
        )
        return {
            "estado": "EXPLORATORIO",
            "universo_analitico": {
                "total_registros_bd": audit["embudo_financiero"]["total_registros_bd"],
                "entidades_canonicas": canonical,
                "periodo_historico": "2017–2026 parcial",
                "calidad_forense_pct": 0,
                "estado": "NO_CERTIFICADO_SIN_CONCILIACION_EXTERNA",
            },
            "frontera_vigente": {
                "vigencia_activa": 2025,
                "eficiencia_media_bcc": frontier.get("eficiencia_media_bcc", 0),
                "eficiencia_media_ccr": frontier.get("eficiencia_media_ccr", 0),
                "dmus_eficientes_bcc": sum(s["theta_bcc"] >= 0.999999 for s in scores),
                "dmus_ineficientes": sum(s["theta_bcc"] < 0.999999 for s in scores),
            },
            "malmquist_global": {
                "mpi_medio": msum.get("mpi_global", 0),
                "effch_medio": msum.get("effch_global", 0),
                "techch_medio": msum.get("techch_global", 0),
                "conclusion": "Exploratorio; no identifica efecto causal de gobierno",
            },
            "econometria_clave": {
                "impacto_verbo_debil_coef": weak["coeficiente"] if weak else 0,
                "p_value_verbo_debil": weak["p_value"] if weak else 1,
                "diferencia_wilcoxon_pct": w.get("diferencia_medias", 0) * 100,
                "p_value_wilcoxon": w.get("p_value_bilateral", 1),
                "segunda_etapa_estado": economy["segunda_etapa"]["estado"],
            },
            "auditoria_saneamiento": audit,
            "frontera_eficiencia": frontier,
            "malmquist": malmquist,
            "econometria_segunda_etapa": economy,
        }
