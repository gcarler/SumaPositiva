"""Estudio año por año de los planes de desarrollo de Cartagena en Seguridad Humana.

Lee (solo lectura) ``seguimiento.registros_triada_normalizados`` y
``seguimiento.pdd_vinculos_meta_pa_triada`` en ``bd_csh`` y calcula, con datos reales,
la composición anual por eje (los 7 de la Seguridad Humana del PNUD), tendencias
(Theil-Sen + Mann-Kendall), inversión con BPIN identificable e indicadores de integración.

Decisiones metodológicas (se imprimen en el documento):
- La serie anual existe solo para 2017–2026; los planes 2012–2015 solo tienen formulación.
- Las etiquetas ``dimensiones_seguridad_humana`` preexistentes en la base se auditaron por
  muestreo y resultaron de baja precisión (p. ej. informes presupuestales marcados como
  «Seguridad Alimentaria»). Por eso este estudio NO las usa: reclasifica cada actividad con
  un clasificador transparente (léxico por eje + entidad responsable) cuya muestra de
  validación se exporta para revisión humana.
- Los conteos dependen de la cobertura documental de cada año; las tendencias se calculan
  sobre *participaciones* (composición), no sobre volúmenes.
- El avance físico no se usa: mezcla escalas (fracción y porcentaje) y cubre <40 %.
- Dinero: se deduplica por (vigencia, BPIN normalizado) tomando el máximo; es el piso
  verificable con BPIN identificable, no el presupuesto total del Distrito.
"""

from __future__ import annotations

import math
import re
import unicodedata
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.pdt_diagnostico_seguridad_humana_8planes import (
    _resolver_url_bd_csh,
)

EJES: tuple[tuple[int, str, str], ...] = (
    (1, "SEG_PERSONAL", "Seguridad Personal"),
    (2, "SEG_COMUNITARIA", "Seguridad Comunitaria"),
    (3, "SEG_ECONOMICA", "Seguridad Económica"),
    (4, "SEG_ALIMENTARIA", "Seguridad Alimentaria"),
    (5, "SEG_SANITARIA", "Seguridad en Salud"),
    (6, "SEG_AMBIENTAL", "Seguridad Ambiental"),
    (7, "SEG_POLITICA", "Seguridad Política"),
)
NOMBRE_EJE = {c: n for _, c, n in EJES}
CODIGOS = [c for _, c, _ in EJES]
GESTION = "GESTION_INSTITUCIONAL"
SECTORIAL = "SECTORIAL_COMPLEMENTARIO"
SIN_INFO = "SIN_INFORMACION"
NOMBRE_EJE[GESTION] = "Gestión institucional"
NOMBRE_EJE[SECTORIAL] = "Desarrollo sectorial complementario"
TODAS_CATEGORIAS = [*CODIGOS, SECTORIAL, GESTION]

ANIO_MIN_TENDENCIA = 2018
ANIO_MAX_TENDENCIA = 2025  # 2026 es parcial (cortes T1–T2)
ANIOS = list(range(2018, 2027))
PERIODOS = {
    "2018–2019": (2018, 2019),
    "2020–2023": (2020, 2023),
    "2024–2026*": (2024, 2026),
}
PLAN_VIGENTE = {
    2018: "PDD 2016–2019 «Primero la Gente»",
    2019: "PDD 2016–2019 «Primero la Gente»",
    2020: "PDD 2020–2023 «Salvemos Juntos a Cartagena»",
    2021: "PDD 2020–2023 «Salvemos Juntos a Cartagena»",
    2022: "PDD 2020–2023 «Salvemos Juntos a Cartagena»",
    2023: "PDD 2020–2023 «Salvemos Juntos a Cartagena»",
    2024: "PDD 2024–2027 «Cartagena, Ciudad de Derechos» + 3 PDL",
    2025: "PDD 2024–2027 «Cartagena, Ciudad de Derechos» + 3 PDL",
    2026: "PDD 2024–2027 «Cartagena, Ciudad de Derechos» + 3 PDL (corte parcial)",
}

# ----------------------------- Clasificador transparente -----------------------------
# Raíces sin tildes. Se busca como subcadena sobre texto normalizado.
LEXICO: dict[str, tuple[str, ...]] = {
    "SEG_PERSONAL": (
        "homicid",
        "violencia",
        "delit",
        "hurto",
        "extors",
        "seguridad ciudadana",
        "convivencia",
        "policia",
        "criminal",
        "victima",
        "maltrato",
        "abuso sexual",
        "feminicid",
        "vbg",
        "riña",
        "armas",
        "pandill",
        "videovigilancia",
        "camaras de seguridad",
        "seguridad vial",
        "siniestr",
        "accidente de transito",
        "actores viales",
        "trata de personas",
        "carcel",
        "penitenciar",
        "reclus",
        "conflicto armado",
        "desmovilizad",
        "reintegra",
        "comisaria",
        "intrafamiliar",
        "explotacion sexual",
        "reinsercion",
        "orden publico",
        "piscc",
        "distriseguridad",
        "seguridad humana",
    ),
    "SEG_COMUNITARIA": (
        "comunitari",
        "juventud",
        "joven",
        "adulto mayor",
        "persona mayor",
        "primera infancia",
        "infancia",
        "adolescen",
        "etnic",
        "afro",
        "palenquer",
        "raizal",
        "indigen",
        "cultural",
        "patrimonio",
        "deporte",
        "recreacion",
        "recreo",
        "cabildo",
        "accion comunal",
        "lgbti",
        "discapacidad",
        "equidad de genero",
        "mujer",
        "cultura",
        "biblioteca",
        "tejido social",
        "familia",
        "habitante de calle",
        "migrante",
        "juegos",
        "artistic",
        "arte ",
        "festival",
        "gestor cultural",
        "grupos vulnerables",
        "poblacion vulnerable",
    ),
    "SEG_ECONOMICA": (
        "empleo",
        "empleabil",
        "emprendim",
        "ingreso",
        "pobreza",
        "microcredito",
        "microempres",
        "mipyme",
        "economia popular",
        "productiv",
        "turismo",
        "turistic",
        "informal",
        "formalizacion",
        "vendedores",
        "artesan",
        "inclusion productiva",
        "competitiv",
        "innovacion",
        "desarrollo economico",
        "comercio",
        "empresari",
        "mercado laboral",
        "trabajo decente",
        "capital semilla",
        "cadena de valor",
        "exportac",
        "inversion extranjera",
        "oficios",
        "formacion para el trabajo",
    ),
    "SEG_ALIMENTARIA": (
        "aliment",
        "nutric",
        "desnutric",
        "hambre",
        "comedor",
        "restaurante escolar",
        " pae ",
        "agricult",
        "agropecuari",
        "campesin",
        "pesca",
        "pescador",
        "huerta",
        "canasta",
        "ganader",
        "plaza de mercado",
        "cultivo",
        "siembra",
        "semilla",
        "umata",
        "soberania alimentaria",
        "acuicultur",
        "granja",
    ),
    "SEG_SANITARIA": (
        "salud",
        "hospital",
        " ips ",
        " eps ",
        "mortalidad",
        "morbilidad",
        "vacun",
        "inmuniz",
        "epidemi",
        "materno",
        "prenatal",
        "embarazo",
        "salud mental",
        "suicid",
        "sustancias psicoactivas",
        "aseguramiento",
        "regimen subsidiado",
        "dengue",
        " vih",
        "enfermedad",
        "sanitari",
        "zoonosis",
        "ambulancia",
        "covid",
        "cancer",
        "tuberculosis",
        "lactancia",
        "crued",
        "medicamento",
        "atencion primaria",
        "vigilancia en salud",
    ),
    "SEG_AMBIENTAL": (
        "ambient",
        "climatic",
        "cambio climatico",
        "ecosistema",
        "manglar",
        "cienaga",
        "humedal",
        "bosque",
        "arbol",
        "residuo",
        "reciclaj",
        "basura",
        "drenaje",
        "pluvial",
        "inundac",
        "gestion del riesgo",
        "riesgo de desastre",
        "erosion",
        "proteccion costera",
        "agua potable",
        "alcantarillado",
        "saneamiento basico",
        "contaminacion",
        "resiliencia",
        "cuenca",
        "fauna",
        "flora",
        "vertimiento",
        "relimpia",
        "batimetria",
        "negocios verdes",
        "mitigacion",
        "simulacro",
        "bioingenier",
        "reforestacion",
        "calidad del aire",
        "zonas verdes",
        "parque natural",
    ),
    "SEG_POLITICA": (
        "derechos humanos",
        "ddhh",
        "lideres sociales",
        "defensores",
        "participacion ciudadana",
        "transparencia",
        "anticorrup",
        "rendicion de cuentas",
        "control social",
        "veedur",
        "gobierno abierto",
        "presupuesto participativo",
        "democra",
        "acceso a la informacion",
        "memoria historica",
        "libertad de",
        "formacion sociopolitica",
        "incidencia politica",
        "junta administradora local",
        "cabildo abierto",
        "consulta previa",
        "liderazgo",
    ),
    GESTION: (
        "gestion documental",
        "talento humano",
        "nomina",
        "salario",
        "contratacion",
        "mipg",
        "furag",
        "control interno",
        "archivo",
        "sistemas de informacion",
        "comunicaciones",
        "informe presupuestal",
        "informes sobre la situacion presupuestal",
        "tesoreria",
        "recaudo",
        "impuesto",
        "catastro",
        "plan de accion",
        "auditoria",
        "financiera",
        "predial",
        "cartera",
        "bienes e inmuebles",
        "tecnologias de la informacion",
        "servicios administrativos",
        "defensa juridica",
        "tutelas",
        "capacitacion de funcionarios",
    ),
}
PRIORIDAD_EMPATE = [*CODIGOS, GESTION]

PRIOR_ENTIDAD: tuple[tuple[str, str], ...] = (
    ("salud", "SEG_SANITARIA"),
    ("agropecuari", "SEG_ALIMENTARIA"),
    ("ambiental", "SEG_AMBIENTAL"),
    ("gestion del riesgo", "SEG_AMBIENTAL"),
    ("interior y convivencia", "SEG_PERSONAL"),
    ("distriseguridad", "SEG_PERSONAL"),
    ("transito y transporte", "SEG_PERSONAL"),
    ("pedro romero", "SEG_ECONOMICA"),
    ("turismo", "SEG_ECONOMICA"),
    ("desarrollo economico", "SEG_ECONOMICA"),
    ("escuela taller", "SEG_ECONOMICA"),
    ("accion comunal", "SEG_COMUNITARIA"),
    ("patrimonio y cultura", "SEG_COMUNITARIA"),
    ("deporte y recreacion", "SEG_COMUNITARIA"),
    ("participacion y desarrollo social", "SEG_COMUNITARIA"),
    ("escuela de gobierno", "SEG_POLITICA"),
    ("planeacion", GESTION),
    ("secretaria general", GESTION),
    ("hacienda", GESTION),
    ("alcaldia mayor", GESTION),
    ("educacion", SECTORIAL),
    ("infraestructura", SECTORIAL),
    ("espacio publico", SECTORIAL),
    ("valorizacion", SECTORIAL),
    ("transcaribe", SECTORIAL),
    ("corvivienda", SECTORIAL),
    ("alcaldia local", SECTORIAL),
)

_RUIDO = re.compile(
    r"colocar en esta casilla|ejec\. financiera seg|^\s*(si|no|n/a|na|0)\s*$|"
    r"^\W*\d+(\.\d+)*\W*$",
    re.IGNORECASE,
)


def _norm(valor: Any) -> str:
    t = unicodedata.normalize("NFKD", str(valor or ""))
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return " " + re.sub(r"\s+", " ", t).strip().lower() + " "


def _prior(entidad_norm: str) -> str | None:
    for token, cat in PRIOR_ENTIDAD:
        if token in entidad_norm:
            return cat
    return None


def clasificar_actividad(
    entidad: Any, indicador: Any, descripcion: Any
) -> tuple[str, list[str], str]:
    """Devuelve (categoria_primaria, ejes_fuertes, fuente).

    fuente: 'texto' (léxico), 'entidad' (prior por entidad responsable) o 'sin_informacion'.
    """
    ind = str(indicador or "")
    des = str(descripcion or "")
    ent = _norm(entidad)
    texto_crudo = f"{ind} {des}".strip()
    if len(texto_crudo) < 12 or _RUIDO.search(texto_crudo):
        prior = _prior(ent)
        return (prior, [], "entidad") if prior else (SIN_INFO, [], "sin_informacion")
    t = _norm(texto_crudo)
    puntajes = {cat: sum(1 for raiz in raices if raiz in t) for cat, raices in LEXICO.items()}
    maximo = max(puntajes.values())
    prior = _prior(ent)
    if maximo == 0:
        return (prior, [], "entidad") if prior else (SIN_INFO, [], "sin_informacion")
    cercanos = [c for c, v in puntajes.items() if v >= max(1, 0.6 * maximo)]
    if prior in cercanos:
        primaria = prior
    else:
        primaria = max(cercanos, key=lambda c: (puntajes[c], -PRIORIDAD_EMPATE.index(c)))
    fuertes = [c for c in cercanos if c in CODIGOS]
    return primaria, fuertes, "texto"


def _bpin(valor: Any) -> str:
    s = str(valor or "").strip()
    return re.sub(r"\.0+$", "", s)


async def _consultar() -> dict[str, pd.DataFrame]:
    engine = create_async_engine(_resolver_url_bd_csh(), pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION READ ONLY"))
            act = await conn.execute(
                text(
                    """
                    SELECT vigencia, entidad_normalizada AS entidad, indicador,
                           descripcion_actividad AS descripcion
                    FROM seguimiento.registros_triada_normalizados
                    WHERE motor_destino = 'PLAN_ACCION' AND vigencia BETWEEN 2017 AND 2026
                    """
                )
            )
            df_act = pd.DataFrame(act.mappings().all())
            inv = await conn.execute(
                text(
                    """
                    SELECT vigencia, codigo_bpim, entidad_normalizada AS entidad,
                           indicador, descripcion_actividad AS descripcion,
                           apropiacion_definitiva_cop AS aprop,
                           compromisos_rp_cop AS comp, pagos_tesoreria_cop AS pagos
                    FROM seguimiento.registros_triada_normalizados
                    WHERE motor_destino = 'INVERSION_PRESUPUESTAL'
                      AND codigo_bpim IS NOT NULL AND vigencia BETWEEN 2017 AND 2026
                    """
                )
            )
            df_inv = pd.DataFrame(inv.mappings().all())
            pl = await conn.execute(
                text(
                    """
                    SELECT v.codigo_plan, v.meta_id, m.nombre, m.indicador,
                           v.dependencia_responsable AS entidad
                    FROM seguimiento.pdd_vinculos_meta_pa_triada v
                    JOIN seguimiento.pdd_metas_oficiales m ON m.id = v.meta_id
                    """
                )
            )
            df_plan = pd.DataFrame(pl.mappings().all())
            cob = await conn.execute(
                text(
                    """
                    SELECT vigencia, motor_destino, COUNT(*) AS filas,
                           COUNT(*) FILTER (WHERE avance_fisico_pct IS NOT NULL) AS con_avance
                    FROM seguimiento.registros_triada_normalizados
                    WHERE vigencia BETWEEN 2017 AND 2026
                    GROUP BY 1,2
                    """
                )
            )
            df_cob = pd.DataFrame(cob.mappings().all())
    finally:
        await engine.dispose()
    return {"act": df_act, "inv": df_inv, "plan": df_plan, "cob": df_cob}


def _tendencia(serie: pd.Series, desde: int = ANIO_MIN_TENDENCIA) -> dict[str, Any]:
    s = serie.loc[desde:ANIO_MAX_TENDENCIA].dropna()
    x = s.index.to_numpy(dtype=float)
    y = s.to_numpy(dtype=float)
    base = {"pendiente_pp_anio": 0.0, "tau": 0.0, "p": 1.0, "n": len(y)}
    if len(y) < 5 or np.allclose(y, y[0]):
        return {**base, "etiqueta": "sin variación", "intercepto": 0.0, "pendiente_raw": 0.0}
    ts = stats.theilslopes(y, x)
    tau, p = stats.kendalltau(x, y)
    pend = float(ts.slope) * 100.0
    etiqueta = (
        ("creciente" if pend > 0 else "decreciente") if p < 0.10 else "sin tendencia concluyente"
    )
    return {
        "pendiente_pp_anio": round(pend, 3),
        "tau": round(float(tau), 3),
        "p": round(float(p), 3),
        "n": int(len(y)),
        "etiqueta": etiqueta,
        "intercepto": float(ts.intercept),
        "pendiente_raw": float(ts.slope),
    }


def _evenness(v: np.ndarray) -> float:
    v = v[v > 0]
    if len(v) == 0:
        return 0.0
    return float(-(v * np.log(v)).sum() / math.log(len(CODIGOS)))


def _jsd(p: np.ndarray, q: np.ndarray) -> float:
    m = 0.5 * (p + q)

    def kl(a: np.ndarray, b: np.ndarray) -> float:
        mask = a > 0
        return float((a[mask] * np.log2(a[mask] / b[mask])).sum())

    return math.sqrt(0.5 * kl(p, m) + 0.5 * kl(q, m))


def _top_textos(serie: pd.Series, n: int) -> list[tuple[str, int]]:
    s = serie.dropna().astype(str).str.strip()
    s = s[(s.str.len() > 14) & (~s.str.contains(_RUIDO))]
    vc = s.value_counts().head(n)
    return [(str(k)[:180], int(v)) for k, v in vc.items()]


def _clasificar_df(df: pd.DataFrame) -> pd.DataFrame:
    res = [
        clasificar_actividad(e, i, d)
        for e, i, d in zip(df["entidad"], df["indicador"], df["descripcion"], strict=True)
    ]
    df = df.copy()
    df["cat"] = [r[0] for r in res]
    df["fuertes"] = [r[1] for r in res]
    df["fuente"] = [r[2] for r in res]
    return df


def _cuota(tabla: pd.DataFrame, columnas: list[str]) -> pd.DataFrame:
    sub = tabla[columnas]
    return sub.div(sub.sum(axis=1).replace(0, np.nan), axis=0).fillna(0.0)


async def construir_estudio() -> dict[str, Any]:
    raw = await _consultar()
    act = raw["act"].copy()
    for col in ("entidad", "indicador", "descripcion"):
        act[col] = act[col].fillna("").astype(str).str.strip()
    act["clave"] = act["entidad"] + "|" + act["indicador"] + "|" + act["descripcion"]
    uni = (
        act.groupby(["vigencia", "clave"], sort=False)
        .agg(
            entidad=("entidad", "first"),
            indicador=("indicador", "first"),
            descripcion=("descripcion", "first"),
            repeticiones=("clave", "size"),
        )
        .reset_index()
    )
    uni = _clasificar_df(uni)
    uni["k"] = uni["fuertes"].map(len)
    uni = uni[uni["vigencia"].between(2018, 2026)]

    anios = ANIOS
    total_unicas = uni.groupby("vigencia").size().reindex(anios).fillna(0)
    conteo_cat = (
        uni.groupby(["vigencia", "cat"]).size().unstack(fill_value=0).reindex(anios).fillna(0)
    )
    for c in [*TODAS_CATEGORIAS, SIN_INFO]:
        if c not in conteo_cat.columns:
            conteo_cat[c] = 0
    ejes_total = conteo_cat[CODIGOS].sum(axis=1)
    cuota = _cuota(conteo_cat, CODIGOS)
    clasificadas = conteo_cat[TODAS_CATEGORIAS].sum(axis=1)
    peso_agenda_sh = (ejes_total / clasificadas.replace(0, np.nan)).fillna(0.0)
    cuota_9 = _cuota(conteo_cat, TODAS_CATEGORIAS)

    por_fuente = (
        uni.groupby(["vigencia", "fuente"]).size().unstack(fill_value=0).reindex(anios).fillna(0)
    )
    ejes_df = uni[uni["cat"].isin(CODIGOS)]
    solo_texto = ejes_df[ejes_df["fuente"] == "texto"]
    conteo_texto = (
        solo_texto.groupby(["vigencia", "cat"])
        .size()
        .unstack(fill_value=0)
        .reindex(anios)
        .fillna(0)
    )
    for c in CODIGOS:
        if c not in conteo_texto.columns:
            conteo_texto[c] = 0
    cuota_texto = _cuota(conteo_texto, CODIGOS)

    entidades_anio = ejes_df.groupby("vigencia")["entidad"].nunique().reindex(anios).fillna(0)
    transversal = (
        solo_texto.assign(multi=solo_texto["k"] >= 2)
        .groupby("vigencia")["multi"]
        .mean()
        .reindex(anios)
        .fillna(0.0)
    )

    # ---------------- Inversión con BPIN identificable ----------------
    inv = raw["inv"].copy()
    inv["codigo_bpim"] = inv["codigo_bpim"].map(_bpin)
    inv = inv[inv["codigo_bpim"] != ""]
    for col in ("aprop", "comp", "pagos"):
        inv[col] = pd.to_numeric(inv[col], errors="coerce").fillna(0.0)
    for col in ("entidad", "indicador", "descripcion"):
        inv[col] = inv[col].fillna("").astype(str).str.strip()
    proy = (
        inv.groupby(["vigencia", "codigo_bpim"], sort=False)
        .agg(
            aprop=("aprop", "max"),
            comp=("comp", "max"),
            pagos=("pagos", "max"),
            entidad=("entidad", "first"),
            indicador=("indicador", lambda s: s.value_counts().index[0] if len(s) else ""),
            descripcion=("descripcion", lambda s: s.value_counts().index[0] if len(s) else ""),
        )
        .reset_index()
    )
    proy = proy[proy["vigencia"].between(2018, 2026)]
    proy = _clasificar_df(proy)
    inv_total = proy.groupby("vigencia")["aprop"].sum().reindex(anios).fillna(0.0)
    n_proy = proy.groupby("vigencia").size().reindex(anios).fillna(0)
    inv_cat = (
        proy.pivot_table(
            index="vigencia", columns="cat", values="aprop", aggfunc="sum", fill_value=0.0
        )
        .reindex(anios)
        .fillna(0.0)
    )
    inv_comp = (
        proy.pivot_table(
            index="vigencia", columns="cat", values="comp", aggfunc="sum", fill_value=0.0
        )
        .reindex(anios)
        .fillna(0.0)
    )
    inv_pag = (
        proy.pivot_table(
            index="vigencia", columns="cat", values="pagos", aggfunc="sum", fill_value=0.0
        )
        .reindex(anios)
        .fillna(0.0)
    )
    for tabla in (inv_cat, inv_comp, inv_pag):
        for c in [*TODAS_CATEGORIAS, SIN_INFO]:
            if c not in tabla.columns:
                tabla[c] = 0.0
    cuota_inv = _cuota(inv_cat, CODIGOS)
    # sensibilidad: sin el mayor proyecto de cada año
    idx_max = proy.groupby("vigencia")["aprop"].idxmax()
    proy_sin = proy.drop(index=idx_max.values)
    inv_cat_sin = (
        proy_sin.pivot_table(
            index="vigencia", columns="cat", values="aprop", aggfunc="sum", fill_value=0.0
        )
        .reindex(anios)
        .fillna(0.0)
    )
    for c in CODIGOS:
        if c not in inv_cat_sin.columns:
            inv_cat_sin[c] = 0.0
    cuota_inv_sin = _cuota(inv_cat_sin, CODIGOS)
    top_proyecto = (
        proy.sort_values("aprop", ascending=False).groupby("vigencia").head(1).set_index("vigencia")
    )

    # ---------------- Tendencias ----------------
    tend_act = {c: _tendencia(cuota[c]) for c in CODIGOS}
    tend_act_texto = {c: _tendencia(cuota_texto[c]) for c in CODIGOS}
    tend_agenda = _tendencia(peso_agenda_sh)
    periodos_act: dict[str, dict[str, float]] = {}
    periodos_inv: dict[str, dict[str, float]] = {}
    periodos_conteo: dict[str, dict[str, float]] = {}
    for nombre, (a, b) in PERIODOS.items():
        sub = conteo_cat.loc[a:b, CODIGOS].sum()
        periodos_conteo[nombre] = sub.to_dict()
        periodos_act[nombre] = (sub / sub.sum()).to_dict()
        subi = inv_cat.loc[a:b, CODIGOS].sum()
        periodos_inv[nombre] = (
            (subi / subi.sum()).to_dict() if subi.sum() > 0 else {c: 0.0 for c in CODIGOS}
        )

    # ---------------- Integración de ciudad ----------------
    evenness = pd.Series({y: _evenness(cuota.loc[y].to_numpy()) for y in anios})
    tend_evenness = _tendencia(evenness)
    nombres_p = list(PERIODOS)
    jsd = {}
    for i, a in enumerate(nombres_p):
        for b in nombres_p[i + 1 :]:
            jsd[f"{a} vs {b}"] = round(
                _jsd(
                    np.array([periodos_act[a][c] for c in CODIGOS]),
                    np.array([periodos_act[b][c] for c in CODIGOS]),
                ),
                4,
            )
    corr = cuota.loc[ANIO_MIN_TENDENCIA:ANIO_MAX_TENDENCIA].corr(method="spearman")
    intensidad = {
        p: {
            c: (periodos_inv[p][c] / periodos_act[p][c]) if periodos_act[p][c] > 0 else float("nan")
            for c in CODIGOS
        }
        for p in PERIODOS
    }

    # ---------------- Plan × eje (metas formuladas) ----------------
    plan = raw["plan"].copy()
    for col in ("nombre", "indicador", "entidad"):
        plan[col] = plan[col].fillna("").astype(str)
    plan = plan.rename(columns={"nombre": "descripcion"})
    plan = _clasificar_df(plan[["codigo_plan", "meta_id", "entidad", "indicador", "descripcion"]])
    planes = sorted(plan["codigo_plan"].unique())
    mat_plan = (
        plan.pivot_table(
            index="codigo_plan", columns="cat", values="meta_id", aggfunc="count", fill_value=0
        )
        .reindex(planes)
        .fillna(0)
    )
    for c in [*TODAS_CATEGORIAS, SIN_INFO]:
        if c not in mat_plan.columns:
            mat_plan[c] = 0
    metas_plan = plan.groupby("codigo_plan").size()
    cuota_plan = _cuota(mat_plan, CODIGOS)

    # ---------------- Cobertura / calidad ----------------
    cob = raw["cob"]
    cob_pa = cob[cob["motor_destino"] == "PLAN_ACCION"].set_index("vigencia")
    calidad = pd.DataFrame(
        {
            "filas_plan_accion": cob_pa["filas"].reindex(anios),
            "actividades_unicas": total_unicas,
            "clasif_por_texto": por_fuente.get("texto", pd.Series(0, index=anios)),
            "clasif_por_entidad": por_fuente.get("entidad", pd.Series(0, index=anios)),
            "sin_informacion": por_fuente.get("sin_informacion", pd.Series(0, index=anios)),
            "en_7_ejes": ejes_total,
            "entidades_en_ejes": entidades_anio,
            "proyectos_bpin": n_proy,
            "inversion_bpin_cop": inv_total,
            "pct_con_avance_fisico": (cob_pa["con_avance"] / cob_pa["filas"] * 100)
            .reindex(anios)
            .round(1),
        }
    ).fillna(0)

    return {
        "uni": uni,
        "ejes_df": ejes_df,
        "solo_texto": solo_texto,
        "conteo_cat": conteo_cat,
        "cuota": cuota,
        "cuota_9": cuota_9,
        "cuota_texto": cuota_texto,
        "peso_agenda_sh": peso_agenda_sh,
        "entidades_anio": entidades_anio,
        "transversal": transversal,
        "proy": proy,
        "inv_total": inv_total,
        "n_proy": n_proy,
        "inv_cat": inv_cat,
        "inv_comp": inv_comp,
        "inv_pag": inv_pag,
        "cuota_inv": cuota_inv,
        "cuota_inv_sin": cuota_inv_sin,
        "top_proyecto": top_proyecto,
        "tend_act": tend_act,
        "tend_act_texto": tend_act_texto,
        "tend_agenda": tend_agenda,
        "periodos_act": periodos_act,
        "periodos_inv": periodos_inv,
        "periodos_conteo": periodos_conteo,
        "evenness": evenness,
        "tend_evenness": tend_evenness,
        "jsd": jsd,
        "corr": corr,
        "intensidad": intensidad,
        "plan": plan,
        "mat_plan": mat_plan,
        "cuota_plan": cuota_plan,
        "metas_plan": metas_plan,
        "calidad": calidad,
    }
