# ruff: noqa: E501  (texto narrativo largo)
"""Construye el .docx «Análisis y estudio de los planes de desarrollo» (Seguridad Humana).

Todas las cifras y gráficas salen de ``construir_estudio()`` (datos reales de ``bd_csh``).
Uso:  python -m app.modules.compromisos.pdt_analisis_planes_documento [--publicar]
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from docx import Document  # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.oxml import OxmlElement  # noqa: E402
from docx.oxml.ns import qn  # noqa: E402
from docx.shared import Inches, Pt, RGBColor  # noqa: E402

from app.modules.compromisos.pdt_analisis_planes_tendencias import (  # noqa: E402
    ANIO_MAX_TENDENCIA,
    ANIO_MIN_TENDENCIA,
    ANIOS,
    CODIGOS,
    NOMBRE_EJE,
    PERIODOS,
    _tendencia,
    _top_textos,
    construir_estudio,
)

NOMBRE_DOC = "ANALISIS_Y_ESTUDIO_DE_LOS_PLANES_DE_DESARROLLO_SEGURIDAD_HUMANA"
SALIDA = Path("/root/polis/data/analisis_planes")
AZUL, AZUL2, AZUL3, GRIS = "0B2545", "134074", "8DA9C4", "F4F6F8"
PALETA = ["#0B2545", "#2E86AB", "#E07A5F", "#81B29A", "#C1121F", "#6A994E", "#F2A541"]
COLOR = dict(zip(CODIGOS, PALETA, strict=True))
PERIODOS_L = list(PERIODOS)


def pct(x: float, d: int = 1) -> str:
    return f"{100 * float(x):.{d}f} %"


def cop(x: float) -> str:
    x = float(x)
    if abs(x) >= 1e12:
        return f"${x / 1e12:,.2f} billones"
    if abs(x) >= 1e9:
        return f"${x / 1e9:,.1f} mil millones"
    return f"${x / 1e6:,.1f} millones"


def _rgb(h: str) -> RGBColor:
    return RGBColor.from_string(h)


# --------------------------------------------------------------------------- gráficas
def _fig(nombre: str) -> Path:
    SALIDA.mkdir(parents=True, exist_ok=True)
    return SALIDA / f"{nombre}.png"


def _guardar(fig: Any, nombre: str) -> Path:
    ruta = _fig(nombre)
    fig.tight_layout()
    fig.savefig(ruta, dpi=170, facecolor="white")
    plt.close(fig)
    return ruta


def _etq(c: str) -> str:
    return NOMBRE_EJE[c].replace("Seguridad en Salud", "Salud").replace("Seguridad ", "")


def graf_cobertura(e: dict) -> Path:
    cal = e["calidad"]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.bar(cal.index.astype(str), cal["actividades_unicas"], color="#134074")
    for i, v in enumerate(cal["actividades_unicas"]):
        ax.text(i, v, f"{int(v):,}", ha="center", va="bottom", fontsize=8)
    ax.set_title("Actividades únicas de plan de acción documentadas por vigencia", fontsize=10)
    ax.set_ylabel("Actividades únicas")
    ax.spines[["top", "right"]].set_visible(False)
    return _guardar(fig, "g01_cobertura")


def graf_composicion(e: dict, cuota: pd.DataFrame, nombre: str, titulo: str) -> Path:
    c = cuota.reindex(ANIOS) * 100
    fig, ax = plt.subplots(figsize=(7.2, 4))
    ax.stackplot(
        c.index,
        *[c[k] for k in CODIGOS],
        labels=[_etq(k) for k in CODIGOS],
        colors=PALETA,
        alpha=0.92,
    )
    ax.axvline(ANIO_MAX_TENDENCIA + 0.5, color="k", ls=":", lw=1)
    ax.text(ANIO_MAX_TENDENCIA + 0.55, 3, "2026\nparcial", fontsize=7)
    ax.set_ylim(0, 100)
    ax.set_xlim(ANIOS[0], ANIOS[-1])
    ax.set_ylabel("% de la actividad en los 7 ejes")
    ax.set_title(titulo, fontsize=10)
    ax.legend(ncol=4, fontsize=7, loc="upper center", bbox_to_anchor=(0.5, -0.1), frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    return _guardar(fig, nombre)


def graf_multiples(e: dict) -> Path:
    fig, axs = plt.subplots(2, 4, figsize=(8, 4.6), sharex=True)
    c = e["cuota"].reindex(ANIOS) * 100
    ct = e["cuota_texto"].reindex(ANIOS) * 100
    for ax, k in zip(axs.flat, CODIGOS, strict=False):
        ax.plot(c.index, c[k], color=COLOR[k], marker="o", ms=3, label="completa")
        ax.plot(ct.index, ct[k], color="gray", ls="--", lw=1, label="solo texto")
        t = e["tend_act"][k]
        xs = np.array([ANIO_MIN_TENDENCIA, ANIO_MAX_TENDENCIA])
        ax.plot(xs, (t["intercepto"] + t["pendiente_raw"] * xs) * 100, color="k", lw=1)
        ax.set_title(f"{_etq(k)}\n{t['pendiente_pp_anio']:+.1f} pp/año · {t['etiqueta'][:12]}", fontsize=7)
        ax.tick_params(labelsize=6)
        ax.spines[["top", "right"]].set_visible(False)
    axs.flat[-1].axis("off")
    axs.flat[0].legend(fontsize=6, frameon=False)
    return _guardar(fig, "g04_multiples")


def graf_heat(
    df: pd.DataFrame,
    nombre: str,
    titulo: str,
    fmt: str = "{:.0f}",
    filas_etq: list[str] | None = None,
    cols_etq: list[str] | None = None,
) -> Path:
    fig, ax = plt.subplots(figsize=(7.2, 0.45 * len(df) + 1.8))
    im = ax.imshow(df.to_numpy(dtype=float), cmap="Blues", aspect="auto")
    ax.set_xticks(
        range(df.shape[1]),
        cols_etq or [str(c) for c in df.columns],
        fontsize=7,
        rotation=35,
        ha="right",
    )
    ax.set_yticks(range(df.shape[0]), filas_etq or [str(i) for i in df.index], fontsize=7)
    vmax = np.nanmax(df.to_numpy(dtype=float))
    for i in range(df.shape[0]):
        for j in range(df.shape[1]):
            v = df.iat[i, j]
            ax.text(
                j,
                i,
                fmt.format(v),
                ha="center",
                va="center",
                fontsize=7,
                color="white" if v > 0.6 * vmax else "black",
            )
    ax.set_title(titulo, fontsize=10)
    fig.colorbar(im, ax=ax, shrink=0.8)
    return _guardar(fig, nombre)


def graf_eje(e: dict, k: str, i: int) -> Path:
    c = e["cuota"].reindex(ANIOS) * 100
    ct = e["cuota_texto"].reindex(ANIOS) * 100
    ci = e["cuota_inv"].reindex(ANIOS) * 100
    cs = e["cuota_inv_sin"].reindex(ANIOS) * 100
    fig, axs = plt.subplots(1, 2, figsize=(7.4, 3.2))
    ax = axs[0]
    ax.plot(c.index, c[k], color=COLOR[k], marker="o", label="clasificación completa")
    ax.plot(ct.index, ct[k], color="gray", ls="--", marker="s", ms=3, label="solo por texto")
    t = e["tend_act"][k]
    xs = np.array([ANIO_MIN_TENDENCIA, ANIO_MAX_TENDENCIA])
    ax.plot(xs, (t["intercepto"] + t["pendiente_raw"] * xs) * 100, color="k", lw=1, label="Theil-Sen")
    ax.set_title("Participación en la actividad (%)", fontsize=9)
    ax.legend(fontsize=6, frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    ax = axs[1]
    ax.bar(ci.index - 0.18, ci[k], width=0.36, color=COLOR[k], label="con todo")
    ax.bar(cs.index + 0.18, cs[k], width=0.36, color="#BBBBBB", label="sin mayor proyecto")
    ax.set_title("Participación en inversión con BPIN (%)", fontsize=9)
    ax.legend(fontsize=6, frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    for a in axs:
        a.tick_params(labelsize=7)
    fig.suptitle(NOMBRE_EJE[k], fontsize=10, color="#0B2545")
    return _guardar(fig, f"g_eje_{i}")


def graf_integracion(e: dict) -> list[Path]:
    rutas = []
    ev = e["evenness"].reindex(ANIOS)
    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(ev.index, ev, marker="o", color="#134074", label="equilibrio (Pielou)")
    ax.plot(
        e["peso_agenda_sh"].reindex(ANIOS).index,
        e["peso_agenda_sh"].reindex(ANIOS),
        marker="s",
        color="#E07A5F",
        label="peso de los 7 ejes en todo el plan de acción",
    )
    ax.set_ylim(0, 1)
    ax.legend(fontsize=7, frameon=False)
    ax.set_title("Equilibrio entre ejes y peso de la agenda de Seguridad Humana", fontsize=10)
    ax.spines[["top", "right"]].set_visible(False)
    rutas.append(_guardar(fig, "g20_equilibrio"))

    fig, ax = plt.subplots(figsize=(7, 3.4))
    w = 0.26
    x = np.arange(len(CODIGOS))
    for j, p in enumerate(PERIODOS_L):
        ax.bar(x + (j - 1) * w, [100 * e["periodos_act"][p][k] for k in CODIGOS], w, label=p)
    ax.set_xticks(x, [_etq(k) for k in CODIGOS], fontsize=7, rotation=20)
    ax.set_ylabel("% de la actividad")
    ax.legend(fontsize=7, frameon=False)
    ax.set_title("Perfil de la ciudad por periodo de gobierno", fontsize=10)
    ax.spines[["top", "right"]].set_visible(False)
    rutas.append(_guardar(fig, "g21_periodos"))

    inten = pd.DataFrame(e["intensidad"]).reindex(CODIGOS)
    rutas.append(
        graf_heat(
            inten,
            "g22_intensidad",
            "Intensidad = % inversión BPIN / % actividad (1 = proporcional)",
            "{:.2f}",
            [_etq(k) for k in CODIGOS],
        )
    )
    corr = e["corr"].reindex(index=CODIGOS, columns=CODIGOS)
    fig, ax = plt.subplots(figsize=(6, 4.6))
    im = ax.imshow(corr.to_numpy(dtype=float), cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(7), [_etq(k) for k in CODIGOS], fontsize=7, rotation=35, ha="right")
    ax.set_yticks(range(7), [_etq(k) for k in CODIGOS], fontsize=7)
    for a in range(7):
        for b in range(7):
            ax.text(b, a, f"{corr.iat[a, b]:.2f}", ha="center", va="center", fontsize=7)
    fig.colorbar(im, ax=ax, shrink=0.8)
    ax.set_title("Correlación de Spearman entre ejes (2018–2025, n=8; exploratoria)", fontsize=9)
    rutas.append(_guardar(fig, "g23_correlacion"))

    fig, ax = plt.subplots(figsize=(7, 3))
    tr = e["transversal"].reindex(ANIOS) * 100
    ax.bar(tr.index, tr, color="#81B29A")
    ax.set_title("Actividades con crisis/emergencia (%, categoría transversal)", fontsize=10)
    ax.spines[["top", "right"]].set_visible(False)
    rutas.append(_guardar(fig, "g24_transversal"))
    return rutas


# --------------------------------------------------------------------------- docx helpers
def _sombrear(celda: Any, color: str) -> None:
    tcPr = celda._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:color"), "auto")
    sh.set(qn("w:fill"), color)
    tcPr.append(sh)


class Doc:
    def __init__(self) -> None:
        self.d = Document()
        s = self.d.sections[0]
        s.left_margin = s.right_margin = Inches(1)
        st = self.d.styles["Normal"]
        st.font.name = "Calibri"
        st.font.size = Pt(10.5)
        for nivel, color, tam in ((1, AZUL2, 18), (2, AZUL3, 14), (3, AZUL2, 12)):
            h = self.d.styles[f"Heading {nivel}"]
            h.font.name = "Calibri"
            h.font.size = Pt(tam)
            h.font.bold = True
            h.font.color.rgb = _rgb(color if nivel != 2 else "4F6D8F")
        self.nfig = 0

    def h(self, texto: str, nivel: int = 1) -> None:
        self.d.add_heading(texto, level=nivel)

    def p(self, texto: str, negrita: bool = False, cursiva: bool = False) -> None:
        par = self.d.add_paragraph()
        r = par.add_run(texto)
        r.bold, r.italic = negrita, cursiva
        par.paragraph_format.space_after = Pt(6)

    def bullets(self, items: list[str]) -> None:
        for it in items:
            self.d.add_paragraph(it, style="List Bullet")

    def callout(self, texto: str) -> None:
        t = self.d.add_table(rows=1, cols=1)
        c = t.rows[0].cells[0]
        _sombrear(c, GRIS)
        c.text = ""
        r = c.paragraphs[0].add_run(texto)
        r.font.size = Pt(10)
        tcPr = c._tc.get_or_add_tcPr()
        b = OxmlElement("w:tcBorders")
        left = OxmlElement("w:left")
        left.set(qn("w:val"), "single")
        left.set(qn("w:sz"), "36")
        left.set(qn("w:color"), AZUL2)
        b.append(left)
        tcPr.append(b)
        self.d.add_paragraph()

    def tabla(self, cab: list[str], filas: list[list[str]], anchos: list[float] | None = None) -> None:
        t = self.d.add_table(rows=1, cols=len(cab))
        t.style = "Table Grid"
        for i, x in enumerate(cab):
            c = t.rows[0].cells[i]
            _sombrear(c, AZUL)
            c.text = ""
            r = c.paragraphs[0].add_run(x)
            r.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = _rgb("FFFFFF")
        for n, f in enumerate(filas):
            cells = t.add_row().cells
            for i, x in enumerate(f):
                cells[i].text = ""
                rr = cells[i].paragraphs[0].add_run(str(x))
                rr.font.size = Pt(8.5)
                _sombrear(cells[i], "FFFFFF" if n % 2 == 0 else "FAFAFA")
        if anchos:
            for row in t.rows:
                for i, w in enumerate(anchos):
                    row.cells[i].width = Inches(w)
        self.d.add_paragraph()

    def fig(self, ruta: Path, pie: str, ancho: float = 6.3) -> None:
        self.nfig += 1
        self.d.add_picture(str(ruta), width=Inches(ancho))
        self.d.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        par = self.d.add_paragraph()
        r = par.add_run(f"Figura {self.nfig}. {pie}")
        r.italic = True
        r.font.size = Pt(8.5)
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER

    def salto(self) -> None:
        self.d.add_page_break()


# --------------------------------------------------------------------------- redacción
def _lectura(t: dict, tt: dict) -> str:
    robusta = t["etiqueta"] == tt["etiqueta"] and t["etiqueta"] != "sin tendencia concluyente"
    if robusta:
        return (
            f"{t['etiqueta'].upper()} ROBUSTA: coincide en la clasificación completa "
            f"({t['pendiente_pp_anio']:+.2f} pp/año, p={t['p']}) y en la restringida a texto "
            f"({tt['pendiente_pp_anio']:+.2f} pp/año, p={tt['p']})."
        )
    if t["etiqueta"] != "sin tendencia concluyente" or tt["etiqueta"] != "sin tendencia concluyente":
        return (
            f"INDICIO NO CONFIRMADO: completa {t['etiqueta']} ({t['pendiente_pp_anio']:+.2f} "
            f"pp/año, p={t['p']}); solo texto {tt['etiqueta']} ({tt['pendiente_pp_anio']:+.2f} "
            f"pp/año, p={tt['p']}). Las dos lecturas no coinciden: no se afirma tendencia."
        )
    return (
        f"SIN TENDENCIA CONCLUYENTE (completa {t['pendiente_pp_anio']:+.2f} pp/año p={t['p']}; "
        f"solo texto {tt['pendiente_pp_anio']:+.2f} pp/año p={tt['p']})."
    )


def construir_docx(e: dict) -> Path:
    D = Doc()
    cuota, ct, cal = e["cuota"].reindex(ANIOS), e["cuota_texto"].reindex(ANIOS), e["calidad"]
    n_act = int(cal["actividades_unicas"].sum())
    por_texto = float(
        cal["clasif_por_texto"].sum() / max(1, cal["clasif_por_texto"].sum() + cal["clasif_por_entidad"].sum())
    )
    # ---- portada
    D.d.add_paragraph()
    t = D.d.add_paragraph()
    r = t.add_run("ANÁLISIS Y ESTUDIO DE LOS PLANES DE DESARROLLO")
    r.bold, r.font.size, r.font.color.rgb = True, Pt(26), _rgb(AZUL)
    t = D.d.add_paragraph()
    r = t.add_run("Seguridad Humana en Cartagena de Indias, año por año (2018–2026)")
    r.font.size, r.font.color.rgb = Pt(15), _rgb(AZUL2)
    D.p("Tendencia en cada uno de los 7 ejes de la política y análisis integrado de ciudad.")
    D.p(
        "Todas las cifras y gráficas se calculan con Python (pandas, scipy, matplotlib) sobre la "
        "base bd_csh; ninguna cifra es digitada a mano.",
        cursiva=True,
    )
    D.salto()

    D.h("Resumen ejecutivo", 1)
    tr = e["tend_act"]
    tx = e["tend_act_texto"]
    rob = [
        k
        for k in CODIGOS
        if tr[k]["etiqueta"] == tx[k]["etiqueta"] and tr[k]["etiqueta"] != "sin tendencia concluyente"
    ]
    D.p(
        f"Se analizaron {n_act:,} actividades únicas de plan de acción vigencias 2018–2026 y "
        f"{int(e['plan'].shape[0]):,} metas de los 8 planes de desarrollo (2012–2027), "
        "clasificadas en los 7 ejes de Seguridad Humana del PNUD."
    )
    D.bullets(
        [
            f"Peso de la agenda: los 7 ejes concentran {pct(e['peso_agenda_sh'].loc[2018])} (2018) y "
            f"{pct(e['peso_agenda_sh'].loc[2025])} (2025) del plan de acción; tendencia "
            f"{e['tend_agenda']['etiqueta']} ({e['tend_agenda']['pendiente_pp_anio']:+.2f} pp/año).",
            "Tendencias robustas (coinciden en las dos clasificaciones): "
            + (
                ", ".join(f"{_etq(k)} ({tr[k]['etiqueta']}, {tr[k]['pendiente_pp_anio']:+.2f} pp/año)" for k in rob)
                if rob
                else "ninguna."
            ),
            f"Equilibrio entre ejes (Pielou): {e['evenness'].loc[2018]:.2f} en 2018 → "
            f"{e['evenness'].loc[2025]:.2f} en 2025; tendencia {e['tend_evenness']['etiqueta']}.",
            "Distancia (JSD) entre perfiles de periodo: " + "; ".join(f"{a}: {v}" for a, v in e["jsd"].items()) + ".",
        ]
    )
    D.callout(
        "Cómo leer este estudio: las tendencias se miden sobre participaciones (no "
        "volúmenes) porque la cantidad de documentos disponibles cambia mucho por año. Con "
        "solo 8 años (2018–2025) el poder estadístico es bajo: se reporta una tendencia "
        "únicamente si es significativa (p<0,10) y, además, se reproduce con una "
        "clasificación alternativa más estricta."
    )
    D.salto()

    # ---- Cap 0
    D.h("Capítulo 0. Alcance, datos y método", 1)
    D.h("0.1 Qué se puede y qué no se puede decir año por año", 2)
    D.p(
        "La serie anual de ejecución existe de 2017 a 2026. 2017 tiene solo 44 registros y se "
        "excluye; 2026 es parcial (cortes T1–T2) y se muestra pero no entra en el cálculo de "
        "tendencias. Los planes 2012–2015 solo tienen metas formuladas (sin registros de "
        "ejecución): se analizan como formulación, no como serie anual. Por eso la ventana de "
        "tendencia es 2018–2025 (8 puntos)."
    )
    D.fig(
        graf_cobertura(e),
        "Cobertura documental por vigencia. Las diferencias de volumen "
        "reflejan disponibilidad de documentos, no necesariamente más o menos gestión.",
    )
    D.tabla(
        [
            "Vigencia",
            "Filas PA",
            "Actividades únicas",
            "Por texto",
            "Por entidad",
            "Entidades",
            "Proyectos BPIN",
            "Inversión BPIN",
        ],
        [
            [
                str(a),
                f"{int(r.filas_plan_accion):,}",
                f"{int(r.actividades_unicas):,}",
                f"{int(r.clasif_por_texto):,}",
                f"{int(r.clasif_por_entidad):,}",
                str(int(r.entidades_en_ejes)),
                f"{int(r.proyectos_bpin):,}",
                cop(r.inversion_bpin_cop),
            ]
            for a, r in cal.iterrows()
        ],
    )
    D.h("0.2 Clasificación en los 7 ejes", 2)
    D.p(
        "Las etiquetas de dimensión que ya existían en la base se auditaron por muestreo y se "
        "descartaron por baja precisión (p. ej. informes presupuestales marcados como seguridad "
        "alimentaria). En su lugar se usó un clasificador transparente: (1) léxico de palabras "
        "clave por eje sobre indicador y descripción; (2) si el texto no basta, un prior por "
        "entidad responsable (p. ej. Secretaría del Interior → personal; DADIS → salud). Las "
        "actividades de funcionamiento (nómina, contratación, plantillas) van a «Gestión "
        "institucional» y no cuentan en los ejes."
    )
    D.p(
        f"Limitación importante: solo {pct(por_texto)} de las actividades se clasificó por su "
        "texto; el resto por la entidad que la ejecuta, lo cual es una aproximación gruesa. "
        "Por eso toda tendencia se contrasta con la clasificación «solo texto» y solo se llama "
        "robusta si ambas coinciden. La clasificación NO ha sido validada por un experto "
        "independiente; se exporta una muestra para esa revisión."
    )
    D.h("0.3 Dinero y avance físico", 2)
    D.p(
        "Los tres motores de la base repiten los mismos montos; nunca se suman entre motores. "
        "Dentro del motor de inversión se deduplica por (vigencia, BPIN) tomando el máximo. "
        "2018 no tiene BPIN y 2019 es delgado, por lo que la inversión se analiza solo de forma "
        "descriptiva y con una sensibilidad «sin el mayor proyecto de cada año». El avance físico "
        "no se usa: mezcla escalas (fracción y porcentaje, con valores hasta 1.231) y cubre "
        "menos del 40 % de los registros en la mayoría de años."
    )
    D.salto()

    # ---- Cap I
    D.h("Capítulo I. Panorama año por año", 1)
    D.fig(
        graf_composicion(
            e,
            cuota,
            "g02_composicion",
            "Composición anual de la agenda de Seguridad Humana (clasificación completa)",
        ),
        "Participación de cada eje dentro de la actividad en los 7 ejes.",
    )
    D.fig(
        graf_composicion(
            e,
            ct,
            "g03_composicion_texto",
            "Composición anual, solo actividades clasificadas por texto",
        ),
        "Misma composición con la clasificación restringida (prueba de robustez).",
    )
    D.fig(graf_multiples(e), "Series por eje con recta de Theil-Sen (2018–2025).")
    D.fig(
        graf_heat(
            (cuota * 100).T,
            "g05_heat",
            "Participación (%) por eje y vigencia",
            "{:.1f}",
            [_etq(k) for k in CODIGOS],
            [str(a) for a in ANIOS],
        ),
        "Mapa de calor eje × vigencia.",
    )
    D.tabla(
        ["Eje", "Pend. completa (pp/año)", "τ", "p", "Pend. solo texto", "p texto", "Lectura"],
        [
            [
                _etq(k),
                f"{tr[k]['pendiente_pp_anio']:+.2f}",
                f"{tr[k]['tau']:+.2f}",
                f"{tr[k]['p']}",
                f"{tx[k]['pendiente_pp_anio']:+.2f}",
                f"{tx[k]['p']}",
                "robusta: " + tr[k]["etiqueta"]
                if (tr[k]["etiqueta"] == tx[k]["etiqueta"] and tr[k]["etiqueta"] != "sin tendencia concluyente")
                else "no concluyente",
            ]
            for k in CODIGOS
        ],
    )
    D.h("Lectura por vigencia", 2)
    prev = None
    for a in ANIOS:
        D.h(f"{a}" + (" (parcial: cortes T1–T2)" if a == 2026 else ""), 3)
        fila = cuota.loc[a].sort_values(ascending=False)
        r = cal.loc[a]
        txt = (
            f"Plan de desarrollo en ejecución: {_plan_vigente(a)}. Actividades únicas: "
            f"{int(r.actividades_unicas):,}; entidades con actividad en los ejes: "
            f"{int(r.entidades_en_ejes)}. Ejes dominantes: "
            + ", ".join(f"{_etq(k)} ({pct(v)})" for k, v in fila.head(3).items())
            + f". Eje menos presente: {_etq(fila.index[-1])} ({pct(fila.iloc[-1])}). "
        )
        if prev is not None:
            d = (cuota.loc[a] - cuota.loc[prev]) * 100
            mayor = d.abs().sort_values(ascending=False).head(2).index
            txt += "Cambios frente a " + str(prev) + ": " + ", ".join(f"{_etq(k)} {d[k]:+.1f} pp" for k in mayor) + ". "
        if r.proyectos_bpin > 0:
            ci = e["cuota_inv"].loc[a].sort_values(ascending=False)
            txt += (
                f"Inversión con BPIN identificable: {cop(r.inversion_bpin_cop)} en "
                f"{int(r.proyectos_bpin)} proyectos; mayor eje: {_etq(ci.index[0])} "
                f"({pct(ci.iloc[0])}). "
            )
            tp = e["top_proyecto"].loc[a] if a in e["top_proyecto"].index else None
            if tp is not None:
                txt += (
                    f"Mayor proyecto: BPIN {tp['codigo_bpim']} por {cop(tp['aprop'])} "
                    f"({str(tp['descripcion'])[:80].strip()})"
                    + ("; es funcionamiento y no cuenta en los ejes. " if tp["cat"] not in CODIGOS else ". ")
                )
        else:
            txt += "No hay BPIN identificable este año: no se calcula inversión. "
        D.p(txt)
        prev = a
    D.salto()

    # ---- Caps por eje
    romano = ["II", "III", "IV", "V", "VI", "VII", "VIII"]
    ejes_df = e["ejes_df"]
    for i, k in enumerate(CODIGOS):
        D.h(f"Capítulo {romano[i]}. {NOMBRE_EJE[k]}: tendencia 2018–2025", 1)
        D.callout(_lectura(tr[k], tx[k]))
        D.fig(graf_eje(e, k, i), f"{NOMBRE_EJE[k]}: participación en actividad e inversión.")
        D.h("Serie anual", 2)
        D.tabla(
            [
                "Vigencia",
                "Actividades",
                "% completa",
                "% solo texto",
                "% inversión BPIN",
                "% inv. sin mayor proyecto",
            ],
            [
                [
                    str(a),
                    f"{int(e['conteo_cat'].loc[a, k]):,}",
                    pct(cuota.loc[a, k]),
                    pct(ct.loc[a, k]),
                    pct(e["cuota_inv"].loc[a, k]) if cal.loc[a, "proyectos_bpin"] else "s/d",
                    pct(e["cuota_inv_sin"].loc[a, k]) if cal.loc[a, "proyectos_bpin"] else "s/d",
                ]
                for a in ANIOS
            ],
        )
        D.h("Por periodo de gobierno", 2)
        D.tabla(
            ["Periodo", "Actividades", "% actividad", "% inversión BPIN", "Intensidad"],
            [
                [
                    p,
                    f"{e['periodos_conteo'][p][k]:,}",
                    pct(e["periodos_act"][p][k]),
                    pct(e["periodos_inv"][p][k]),
                    f"{e['intensidad'][p][k]:.2f}",
                ]
                for p in PERIODOS_L
            ],
        )
        D.p(
            "Intensidad = participación en inversión BPIN / participación en actividad: sobre 1 "
            "el eje recibe más dinero que su peso en actividades; bajo 1, menos."
        )
        D.h("Formulación en los planes de desarrollo (metas)", 2)
        cp = e["cuota_plan"]
        D.tabla(
            ["Plan", "Metas totales", f"% meta en {_etq(k)} (entre los 7 ejes)"],
            [[pl, f"{int(e['metas_plan'][pl]):,}", pct(cp.loc[pl, k])] for pl in cp.index],
        )
        D.h("Quién ejecuta", 2)
        sub = ejes_df[ejes_df["cat"] == k]
        top_e = sub["entidad"].value_counts().head(6)
        D.tabla(
            ["Entidad", "Actividades únicas", "% del eje"],
            [[str(n)[:60], f"{v:,}", pct(v / len(sub))] for n, v in top_e.items()],
        )
        D.h("Actividades e indicadores recurrentes", 2)
        D.bullets(
            [f"{tx_} (×{n})" for tx_, n in _top_textos(sub["descripcion"], 6)] or ["Sin textos recurrentes relevantes."]
        )
        D.h("Lectura cautelosa", 2)
        s = cuota[k].loc[ANIO_MIN_TENDENCIA:ANIO_MAX_TENDENCIA]
        D.p(
            f"El máximo se observó en {int(s.idxmax())} ({pct(s.max())}) y el mínimo en "
            f"{int(s.idxmin())} ({pct(s.min())}); 2026 (parcial) marca {pct(cuota.loc[2026, k])}. "
            "Estos movimientos describen cómo se distribuyó lo registrado en los planes de acción; "
            "no demuestran por sí solos cambios en resultados o en bienestar de la población. "
            "Explicar el porqué (cambio de administración, formato de reporte, prioridad "
            "política) requiere contrastar con fuentes externas."
        )
        D.salto()

    # ---- Cap IX
    D.h("Capítulo IX. Integración: análisis de ciudad", 1)
    for ruta, pie in zip(
        graf_integracion(e),
        [
            "Equilibrio entre ejes y peso de la agenda en el plan de acción.",
            "Perfil por periodo de gobierno.",
            "Intensidad inversión/actividad por eje y periodo.",
            "Correlaciones exploratorias entre ejes.",
            "Crisis/emergencia como categoría transversal.",
        ],
        strict=False,
    ):
        D.fig(ruta, pie)
    D.h("9.1 Síntesis de las siete tendencias", 2)
    D.tabla(
        ["Eje", "2018–19", "2020–23", "2024–26*", "Pend. pp/año", "Lectura"],
        [
            [_etq(k)]
            + [pct(e["periodos_act"][p][k]) for p in PERIODOS_L]
            + [
                f"{tr[k]['pendiente_pp_anio']:+.2f}",
                "robusta: " + tr[k]["etiqueta"]
                if (tr[k]["etiqueta"] == tx[k]["etiqueta"] and tr[k]["etiqueta"] != "sin tendencia concluyente")
                else "no concluyente",
            ]
            for k in CODIGOS
        ],
    )
    D.h("9.2 Equilibrio y dominancia", 2)
    ev = e["evenness"]
    D.p(
        f"El equilibrio entre ejes (Pielou, 1 = reparto uniforme) pasa de {ev.loc[2018]:.2f} en "
        f"2018 a {ev.loc[2025]:.2f} en 2025 (rango {ev.loc[2018:2025].min():.2f}–"
        f"{ev.loc[2018:2025].max():.2f}); tendencia {e['tend_evenness']['etiqueta']} "
        f"(p={e['tend_evenness']['p']}). Seguridad Comunitaria es el eje dominante en "
        + str(int((cuota.idxmax(axis=1) == "SEG_COMUNITARIA").sum()))
        + f" de {len(ANIOS)} vigencias."
    )
    D.h("9.3 Cambio entre periodos de gobierno", 2)
    D.p(
        "Distancia Jensen-Shannon entre perfiles (0 = idénticos, 1 = máxima diferencia): "
        + "; ".join(f"{a}: {v}" for a, v in e["jsd"].items())
        + ". Mide cuánto cambió la composición de la agenda, no si el cambio fue bueno."
    )
    D.h("9.4 Peso de la agenda dentro de todo el plan de acción", 2)
    pa = e["peso_agenda_sh"]
    D.p(
        f"Los 7 ejes representan entre {pct(pa.loc[2018:2025].min())} y "
        f"{pct(pa.loc[2018:2025].max())} de las actividades; tendencia {e['tend_agenda']['etiqueta']} "
        f"({e['tend_agenda']['pendiente_pp_anio']:+.2f} pp/año, p={e['tend_agenda']['p']}). "
        "El resto corresponde a gestión institucional y a desarrollo sectorial complementario."
    )
    D.h("9.5 Intensidad de la inversión y transversalidad", 2)
    D.p(
        "La intensidad compara el dinero con BPIN identificable con el peso en actividades; es "
        "descriptiva y depende de pocos proyectos grandes (ver sensibilidad y apéndice). "
        f"La categoría transversal de crisis/emergencia varía entre {pct(e['transversal'].min())} "
        f"y {pct(e['transversal'].max())} de las actividades."
    )
    D.h("9.6 Relaciones entre ejes (exploratorio)", 2)
    c2 = e["corr"].where(~np.eye(7, dtype=bool)).stack()
    top = c2.reindex(c2.abs().sort_values(ascending=False).index)
    vistos, lis = set(), []
    for (a, b), v in top.items():
        if frozenset((a, b)) in vistos:
            continue
        vistos.add(frozenset((a, b)))
        lis.append(f"{_etq(a)} – {_etq(b)}: ρ={v:+.2f}")
        if len(lis) == 4:
            break
    D.p(
        "Con n=8 un ρ debe ser ≥0,71 para ser significativo al 5 %. Las asociaciones más fuertes "
        "son, en parte, un artefacto de que las participaciones suman 100 %: si un eje crece "
        "otros deben bajar. Se listan solo como hipótesis: " + "; ".join(lis) + "."
    )
    D.h("9.7 Preguntas abiertas para la ciudad", 2)
    D.bullets(
        [
            "¿Los cambios de composición responden a prioridades de política o a cambios en la forma "
            "de reportar los planes de acción de cada administración?",
            "¿Los ejes con baja participación sostenida (alimentaria, política) están cubiertos por "
            "otras fuentes (nacionales, departamentales) que este estudio no observa?",
            "¿La inversión con BPIN identificable guarda relación con las metas de resultado de cada "
            "plan? Requiere conectar metas, productos y presupuesto proyecto a proyecto.",
            "¿Qué efecto tiene en los indicadores de resultado (homicidios, pobreza, cobertura en "
            "salud) la reasignación entre ejes? Requiere series de indicadores externas.",
        ]
    )
    D.h("9.8 Límites y próximos pasos", 2)
    D.bullets(
        [
            "La clasificación es propia y no validada por terceros; validar la muestra exportada.",
            "Más de la mitad de las actividades se asigna por entidad, no por texto.",
            "El análisis es de ciudad: la base de triada no tiene localización territorial.",
            "No se usa avance físico (escalas inconsistentes) ni se evalúan resultados.",
            "Solo 8 años de ventana: poder estadístico bajo; 2026 parcial.",
            "Próximo paso: indicadores de resultado externos y localización por comuna/UCG.",
        ]
    )
    D.h("9.9 Qué plan priorizó más cada dimensión y el conjunto", 2)
    metas = e["mat_plan"][CODIGOS]
    pdd = metas.loc[[p for p in metas.index if p.startswith("PDD_")]]
    D.p(
        "Las tablas de cada capítulo permiten comparar metas formuladas, pero no medían "
        "explícitamente el total de las siete dimensiones por plan. Esta síntesis cuenta cada "
        "meta una sola vez en su eje principal. Compara PDD distritales entre sí; los PDL "
        "tienen otra jurisdicción y no se suman al PDD vigente."
    )
    D.tabla(
        ["Dimensión", "PDD con más metas", "Metas"],
        [[_etq(k), str(pdd[k].idxmax()), str(int(pdd[k].max()))] for k in CODIGOS],
    )
    total_7 = pdd.sum(axis=1).sort_values(ascending=False)
    D.tabla(
        ["PDD", "Metas en 7 dimensiones", "Metas totales", "% de sus metas"],
        [
            [
                str(plan),
                str(int(total_7.loc[plan])),
                str(int(e["metas_plan"].loc[plan])),
                pct(total_7.loc[plan] / e["metas_plan"].loc[plan]),
            ]
            for plan in total_7.index
        ],
    )
    D.p(
        "Por número absoluto de metas en los siete ejes encabeza el PDD 2024–2027; "
        "por proporción dentro del propio plan encabeza el PDD 2016–2019. La suma de "
        "porcentajes por dimensión no sirve para este ranking porque siempre da 100 % "
        "dentro de los siete ejes. Ninguna de estas medidas demuestra ejecución ni "
        "mejoras en casos, salud o pobreza."
    )
    D.h("9.10 Comparación financiera: lo identificado y lo que falta conciliar", 2)
    proy = e["proy"]
    periodos_fin = [
        ("2019 · PDD 2016–2019", [2019]),
        ("2020–2023 · PDD 2020–2023", [2020, 2021, 2022, 2023]),
        ("2024–2025 · PDD 2024–2027", [2024, 2025]),
    ]
    filas_fin = []
    for etiqueta, vigencias in periodos_fin:
        todos = proy[proy["vigencia"].isin(vigencias)]
        siete = todos[todos["cat"].isin(CODIGOS)]
        sin_dominante = siete.drop(index=siete.groupby("vigencia")["aprop"].idxmax())
        filas_fin.append(
            [
                etiqueta,
                cop(siete["aprop"].sum()),
                cop(siete["aprop"].sum() / len(vigencias)),
                pct(siete["aprop"].sum() / todos["aprop"].sum()),
                cop(sin_dominante["aprop"].sum()),
            ]
        )
    D.tabla(
        ["Periodo observado", "Apropiación 7 ejes", "Promedio anual", "% BPIN", "Sin mayor BPIN anual"],
        filas_fin,
    )
    D.p(
        "La mayor apropiación nominal identificable corresponde a 2024–2025, incluso al "
        "excluir el proyecto de mayor valor de cada año. Es una comparación de periodos "
        "observados, no una asignación contable de cada BPIN a un plan: los registros de "
        "inversión no contienen un vínculo fiable PDD/PDL→proyecto. En 2018 no hay BPIN "
        "identificable, 2019 tiene cobertura delgada, 2026 es parcial y los periodos duran "
        "distinto número de años. Las cifras son COP corrientes, sin ajuste por inflación. "
        "El BPIN 2024130010246 de 2025 es atípico y requiere cotejo con su expediente."
    )
    D.p(
        "Los campos de pagos y compromisos todavía no permiten un ranking de ejecución: "
        "hay proyectos cuyo pago registrado supera ampliamente su apropiación y otros "
        "con compromiso cero pese a pagos positivos. Deben conciliarse vigencia, fuente "
        "presupuestal, valor y unidad antes de comparar gasto ejecutado o concluir cuál "
        "plan aportó más a los resultados de seguridad humana."
    )
    D.salto()
    D.h("Apéndice A. Método y fórmulas", 1)
    D.bullets(
        [
            "Participación del eje k en el año t: n_kt / Σ_k n_kt sobre los 7 ejes.",
            "Tendencia: pendiente de Theil-Sen (pp/año) y τ de Kendall (Mann-Kendall); umbral p<0,10 por el bajo n.",
            "Equilibrio (Pielou): −Σ p_k ln p_k / ln 7.",
            "Distancia entre periodos: raíz de la divergencia de Jensen-Shannon (base 2).",
            "Intensidad: (inversión_k / inversión_7ejes) / (actividad_k / actividad_7ejes).",
            "Inversión: máximo por (vigencia, BPIN normalizado) en el motor de inversión.",
        ]
    )
    D.h("Apéndice B. Proyectos atípicos señalados", 1)
    tp = e["top_proyecto"]
    D.tabla(
        ["Vigencia", "BPIN", "Valor", "Entidad", "Descripción"],
        [
            [
                str(a),
                str(r["codigo_bpim"]),
                cop(r["aprop"]),
                str(r["entidad"])[:35],
                str(r["descripcion"])[:70].replace("\n", " "),
            ]
            for a, r in tp.iterrows()
        ],
    )
    D.p(
        "Casos a verificar: «Pago de salarios» 2020 (funcionamiento, no cuenta en los ejes) y "
        "BPIN 2024130010246 en 2025 (valor atípico, sin verificar). La afiliación en salud de "
        "679.555 personas (BPIN 2024130010016) parece legítima."
    )
    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta = SALIDA / f"{NOMBRE_DOC}.docx"
    D.d.save(ruta)
    return ruta


def _plan_vigente(a: int) -> str:
    from app.modules.compromisos.pdt_analisis_planes_tendencias import PLAN_VIGENTE

    return str(PLAN_VIGENTE.get(a, "s/d"))


def exportar_muestra(e: dict) -> Path:
    u = e["uni"]
    partes = [g.sample(min(10, len(g)), random_state=7) for _, g in u[u["cat"].isin(CODIGOS)].groupby("cat")]
    m = pd.concat(partes)[["vigencia", "entidad", "indicador", "descripcion", "cat", "fuente"]]
    m = m.copy()
    m["validacion_humana_correcto_si_no"] = ""
    ruta = SALIDA / "muestra_validacion_clasificador.csv"
    m.to_csv(ruta, index=False)
    return ruta


async def _main(publicar: bool) -> None:
    e = await construir_estudio()
    ruta = construir_docx(e)
    print("docx:", ruta, ruta.stat().st_size)
    print("muestra:", exportar_muestra(e))
    for k in CODIGOS:
        print(k, _tendencia(e["cuota"][k])["etiqueta"], e["tend_act_texto"][k]["etiqueta"])
    if publicar:
        from app.modules.compromisos.pdt_publicar_docx import publicar_docx

        print(await publicar_docx(ruta, NOMBRE_DOC))


if __name__ == "__main__":
    asyncio.run(_main("--publicar" in sys.argv))
