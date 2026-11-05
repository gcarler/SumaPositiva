"""Genera el estudio visual multifuente de planes, acción y resultados de Cartagena.

Uso: desde la raíz, ejecutar
``backend/.venv/bin/python data/analisis_planes/generar_estudio_visual_multifuente_2026.py``.
El PDF es descriptivo: una coincidencia temporal no identifica un efecto causal.
"""

from __future__ import annotations

import asyncio
import io
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.modules.compromisos.pdt_analisis_planes_tendencias import (
    CODIGOS,
    NOMBRE_EJE,
    construir_estudio,
)
from app.modules.compromisos.pdt_diagnostico_seguridad_humana_8planes import (
    _resolver_url_bd_csh,
)

OUT = Path(__file__).with_name("ESTUDIO_VISUAL_MULTIFUENTE_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf")
DRIVE_SERIES = pd.read_csv(Path(__file__).with_name("series_drive_multifuente_2026.csv"))
DRIVE_SERIES = DRIVE_SERIES.pivot(index="anio", columns="serie", values="casos")
NAVY = "#0B2545"
BLUE = "#134074"
TEAL = "#00A6A0"
ORANGE = "#E77B4C"
PALE = "#E8EEF4"
MID = "#8DA9C4"
GRAY = "#5D6978"
AXIS_COLOR = dict(zip(CODIGOS, [TEAL, BLUE, ORANGE, "#B18C27", "#6F5CA8", "#47885D", "#B35D77"], strict=True))
YEARS = list(range(2018, 2026))
PLANS = {
    "PDD_2012_2015": "PDD 2012–15",
    "PDD_2013_2015": "PDD 2013–15",
    "PDD_2016_2019": "PDD 2016–19",
    "PDD_2020_2023": "PDD 2020–23",
    "PDD_2024_2027": "PDD 2024–27",
    "PDL_1_2024_2027": "PDL 1",
    "PDL_2_2024_2027": "PDL 2",
    "PDL_3_2024_2027": "PDL 3",
}

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVuBold", FONT_BOLD))
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.labelcolor": NAVY,
    "text.color": NAVY,
    "xtick.color": GRAY,
    "ytick.color": GRAY,
    "grid.color": PALE,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})


async def _thefts() -> pd.DataFrame:
    engine = create_async_engine(_resolver_url_bd_csh())
    try:
        async with engine.connect() as conn:
            rows = (await conn.execute(text("""
                SELECT anio, delito, zona, sum(cantidad)::int AS casos
                FROM geodatos.estadisticas_hurtos
                GROUP BY anio, delito, zona ORDER BY anio, delito, zona
            """))).mappings().all()
        return pd.DataFrame([dict(r) for r in rows])
    finally:
        await engine.dispose()


async def _strategic_lines() -> pd.DataFrame:
    engine = create_async_engine(_resolver_url_bd_csh())
    try:
        async with engine.connect() as conn:
            rows = (await conn.execute(text("""
                SELECT id AS meta_id, codigo_plan, linea_nombre
                FROM seguimiento.pdd_metas_oficiales
                WHERE linea_nombre IS NOT NULL
            """))).mappings().all()
        return pd.DataFrame([dict(r) for r in rows])
    finally:
        await engine.dispose()


def _money(value: float) -> str:
    if value >= 1e12:
        return f"{value / 1e12:.2f} billones COP"
    return f"{value / 1e9:.1f} mil millones COP"


def _fig() -> tuple[plt.Figure, plt.Axes]:
    fig, ax = plt.subplots(figsize=(11.2, 5.15), dpi=150)
    fig.subplots_adjust(left=0.11, right=0.97, bottom=0.19, top=0.94)
    ax.grid(axis="y", alpha=0.85)
    ax.set_axisbelow(True)
    return fig, ax


def _bar(ax: plt.Axes, labels: list[str], values: list[float], color: str, horizontal: bool = False) -> None:
    if horizontal:
        ax.barh(labels, values, color=color, height=0.64)
        ax.invert_yaxis()
        ax.grid(axis="x", alpha=0.85)
        ax.grid(axis="y", visible=False)
        ax.set_xlim(0, max(values or [1]) * 1.19)
        for i, v in enumerate(values):
            ax.text(v, i, f" {v:,.1f}" if isinstance(v, float) else f" {v:,}", va="center", fontsize=9)
    else:
        ax.bar(labels, values, color=color, width=0.63)
        ax.set_ylim(0, max(values or [1]) * 1.18)
        for i, v in enumerate(values):
            ax.text(i, v, f"{v:,.1f}" if isinstance(v, float) else f"{v:,}", ha="center", va="bottom", fontsize=8)
    ax.spines["left"].set_visible(False)


def _line(ax: plt.Axes, years: list[int], series: list[tuple[str, list[float], str]]) -> None:
    for label, vals, color in series:
        ax.plot(years, vals, marker="o", markersize=6, linewidth=2.9, color=color, label=label)
    ax.set_xticks(years)
    ax.set_xlim(min(years) - 0.15, max(years) + 0.15)
    ax.legend(frameon=False, loc="upper left", ncol=2, fontsize=8.5)
    ax.spines["left"].set_visible(False)


def _wrap(text: str, limit: int = 75) -> str:
    return text[: limit - 1] + "…" if len(text) > limit else text


def _chart(study: dict, thefts: pd.DataFrame, lines: pd.DataFrame, code: str, index: int) -> tuple[plt.Figure, str, str, str]:
    fig, ax = _fig()
    color = AXIS_COLOR[code]
    cuota = study["cuota"][code].reindex(YEARS).fillna(0) * 100
    texto = study["cuota_texto"][code].reindex(YEARS).fillna(0) * 100
    counts = study["conteo_cat"][code].reindex(YEARS).fillna(0).astype(int)
    inv = study["inv_cat"][code].reindex(YEARS).fillna(0)
    inv_share = study["cuota_inv"][code].reindex(YEARS).fillna(0) * 100
    plans = list(PLANS)
    plan_counts = study["mat_plan"].reindex(plans)[code].fillna(0).astype(int)
    plan_share = study["cuota_plan"].reindex(plans)[code].fillna(0) * 100
    short_plans = list(PLANS.values())
    source = "bd_csh: seguimiento.registros_triada_normalizados y seguimiento.pdd_vinculos_meta_pa_triada."
    title = ""
    reading = ""
    if index == 1:
        title = "Peso del eje en las metas formuladas por los ocho planes"
        _bar(ax, short_plans, plan_share.tolist(), color)
        ax.set_ylabel("% de las metas de los siete ejes en cada plan")
        reading = f"El mayor peso relativo aparece en {short_plans[int(np.argmax(plan_share))]} ({plan_share.max():.1f} %). La proporción expresa prioridad de formulación; no mide ejecución ni reducción de daños."
    elif index == 2:
        title = "Cuántas metas del eje contiene cada plan"
        _bar(ax, short_plans, plan_counts.tolist(), color)
        ax.set_ylabel("Metas clasificadas")
        reading = f"Se identificaron {int(plan_counts.sum()):,} metas del eje entre los ocho planes. Los planes tienen tamaños distintos; comparar solo conteos daría ventaja a los documentos más extensos."
    elif index == 3:
        title = "Líneas estratégicas que concentran las metas del eje"
        linked = study["plan"].query("cat == @code and fuente == 'texto'")[["meta_id", "codigo_plan"]].merge(
            lines, on=["meta_id", "codigo_plan"], how="left"
        )
        linked["linea_nombre"] = linked["linea_nombre"].fillna("").str.strip()
        linked = linked[linked["linea_nombre"].str.len().between(8, 105)]
        grouped = (linked.groupby(["codigo_plan", "linea_nombre"]).size()
                   .sort_values(ascending=False).head(9))
        labels = [f"{PLANS.get(plan, plan)} · {_wrap(line, 34)}" for plan, line in grouped.index]
        _bar(ax, labels, grouped.astype(int).tolist(), color, horizontal=True)
        ax.set_xlabel("Metas clasificadas en la línea")
        reading = "Estas son líneas registradas en metas clasificadas por su propio texto; se excluyen nombres vacíos o con fuerte contaminación de OCR. Su tamaño expresa amplitud de formulación y no demuestra que la intervención se haya ejecutado."
    elif index == 4:
        title = "Actividades de plan de acción documentadas"
        _bar(ax, [str(y) for y in YEARS], counts.tolist(), color)
        ax.set_ylabel("Actividades únicas clasificadas")
        reading = f"Entre 2018 y 2025 el archivo contiene {int(counts.sum()):,} actividades del eje. El volumen depende de la cantidad y granularidad de documentos digitalizados por año."
    elif index == 5:
        title = "Participación del eje dentro de la agenda de seguridad humana"
        _line(ax, YEARS, [("Clasificación completa", cuota.tolist(), color)])
        ax.set_ylabel("% de actividades en los siete ejes")
        reading = f"La participación pasa de {cuota.iloc[0]:.1f} % en 2018 a {cuota.iloc[-1]:.1f} % en 2025. El cambio se refiere a composición de la agenda observada, no a intensidad real de prestación de servicios."
    elif index == 6:
        title = "Prueba de sensibilidad: texto frente a clasificación completa"
        _line(ax, YEARS, [("Texto de la actividad", texto.tolist(), color), ("Texto + entidad", cuota.tolist(), MID)])
        ax.set_ylabel("% dentro de los siete ejes")
        gap = abs(float((texto - cuota).mean()))
        reading = f"La distancia media entre métodos es {gap:.1f} puntos porcentuales. La asignación por entidad es una aproximación; la divergencia obliga a revisar manualmente las actividades que sustentan el juicio sectorial."
    elif index == 7:
        title = "Perfil relativo por periodo de gobierno"
        labels = list(study["periodos_act"])
        vals = [100 * study["periodos_act"][p][code] for p in labels]
        _bar(ax, labels, vals, color)
        ax.set_ylabel("% de actividades de los siete ejes")
        reading = "La comparación respeta las ventanas 2018–2019, 2020–2023 y 2024–2026. El último periodo incluye un 2026 parcial; la lectura principal de tendencia termina en 2025."
    elif index == 8:
        title = "Quién ejecuta la actividad registrada"
        grouped = (study["ejes_df"].query("cat == @code and vigencia >= 2018 and vigencia <= 2025")
                   .groupby("entidad").size().sort_values(ascending=False).head(9))
        labels = [_wrap(str(s), 42) for s in grouped.index]
        _bar(ax, labels, grouped.astype(int).tolist(), color, horizontal=True)
        ax.set_xlabel("Actividades únicas")
        reading = f"La entidad con más actividades clasificadas es {grouped.index[0]} ({int(grouped.iloc[0]):,}). Actividad reportada no equivale a cobertura efectiva ni a calidad de la intervención."
    elif index == 9:
        title = "Inversión con BPIN identificable por año"
        _bar(ax, [str(y) for y in YEARS], (inv / 1e9).round(1).tolist(), color)
        ax.set_ylabel("Miles de millones COP, apropiación")
        reading = f"La apropiación identificable alcanza un máximo de {_money(float(inv.max()))} en {int(inv.idxmax())}. Es un piso documental de proyectos BPIN, no el presupuesto total del eje."
    elif index == 10:
        title = "Participación en la inversión de los siete ejes"
        _line(ax, YEARS, [("Participación BPIN", inv_share.tolist(), color)])
        ax.set_ylabel("% de la apropiación identificable")
        reading = "La concentración de recursos en proyectos grandes puede mover este porcentaje sin que cambie la cobertura de personas. Por eso la siguiente lámina presenta una sensibilidad."
    elif index == 11:
        title = "Cadena financiera: apropiado, comprometido y pagado"
        comp = study["inv_comp"][code].reindex(YEARS).fillna(0) / 1e9
        paid = study["inv_pag"][code].reindex(YEARS).fillna(0) / 1e9
        x = np.arange(len(YEARS))
        ax.bar(x - 0.25, inv / 1e9, 0.24, label="Apropiado", color=color)
        ax.bar(x, comp, 0.24, label="Comprometido", color=MID)
        ax.bar(x + 0.25, paid, 0.24, label="Pagado", color=ORANGE)
        ax.set_xticks(x, [str(y) for y in YEARS])
        ax.set_ylabel("Miles de millones COP")
        ax.legend(frameon=False, ncol=3, fontsize=8)
        reading = "La cadena presupuestal muestra capacidad de ejecutar recursos, pero no demuestra que se haya entregado un producto ni que haya cambiado un indicador de resultado."
    elif index == 12:
        title = "¿Depende la cuota de un megaproyecto?"
        without = study["cuota_inv_sin"][code].reindex(YEARS).fillna(0) * 100
        _line(ax, YEARS, [("Con todos los BPIN", inv_share.tolist(), color), ("Sin el mayor BPIN anual", without.tolist(), ORANGE)])
        ax.set_ylabel("% de la inversión de los siete ejes")
        reading = f"En {int(abs(inv_share - without).idxmax())}, retirar el mayor BPIN cambia la cuota {float(abs(inv_share - without).max()):.1f} puntos. La lectura del gasto debe acompañarse de los proyectos que lo dominan."
    elif index == 13:
        title = "Proyectos que más pesan en la lectura financiera"
        top = study["proy"].query("cat == @code and vigencia >= 2018 and vigencia <= 2025").nlargest(8, "aprop")
        labels = [f"{int(row.vigencia)} · {_wrap(str(row.codigo_bpim), 24)}" for row in top.itertuples()]
        _bar(ax, labels, (top["aprop"] / 1e9).round(1).tolist(), color, horizontal=True)
        ax.set_xlabel("Miles de millones COP apropiados")
        reading = "Los nombres y montos de estos BPIN requieren validación documental antes de atribuirles una línea política concreta. Se excluyeron filas sin BPIN y se deduplicó por vigencia y código."
    elif index == 14:
        title, reading, source = _outcome_chart(fig, ax, code, thefts)
    elif index == 15:
        title = "Juicio de evidencia: de la apuesta al resultado"
        ax.axis("off")
        labels = ["Meta en PDD/PDL", "Actividad PA", "BPIN y pago", "Servicio entregado", "Cambio en casos", "Atribución"]
        for i, label in enumerate(labels):
            x = 0.015 + i * 0.163
            ax.add_patch(plt.Rectangle((x, 0.42), 0.143, 0.22, transform=ax.transAxes,
                                       facecolor=color if i < 3 else PALE, edgecolor="none"))
            ax.text(x + 0.071, 0.53, label, transform=ax.transAxes, ha="center", va="center",
                    color="white" if i < 3 else NAVY, fontsize=8, weight="bold", wrap=True)
            if i < len(labels) - 1:
                ax.annotate("", (x + 0.157, 0.53), (x + 0.143, 0.53), xycoords=ax.transAxes,
                            arrowprops={"arrowstyle": "->", "color": MID, "lw": 1.5})
        reading = "El archivo permite observar prioridades, actividades y parte de la cadena financiera. Para estimar contribución se necesitan productos entregados, series de resultado comparables y población expuesta; para atribución causal se requiere además un contrafactual creíble."
    return fig, title, reading, source


def _drive_line(ax: plt.Axes, key: str, color: str, title: str) -> None:
    """Marca con trazos discontinuos los años sin cotejo con el banco oficial."""
    serie = DRIVE_SERIES[key].dropna()
    cotejada = key in {"homicidios", "violencia_intrafamiliar", "delito_sexual", "suicidios"}
    if cotejada:
        comprobada = serie.loc[serie.index <= 2024]
        ax.plot(comprobada.index, comprobada.values, color=color, marker="o", linewidth=2.5)
        if 2025 in serie.index and 2024 in serie.index:
            ax.plot([2024, 2025], [serie.loc[2024], serie.loc[2025]], color=color,
                    marker="o", linewidth=2.2, linestyle="--")
    else:
        provisional = serie.loc[serie.index <= 2025]
        ax.plot(provisional.index, provisional.values, color=color, marker="o",
                linewidth=2.2, linestyle="--", markerfacecolor="white")
    ax.set_title(title, fontsize=10, weight="bold")
    ax.grid(axis="y", color=PALE)
    ax.set_axisbelow(True)
    ax.set_xlim(max(2015, int(serie.index.min())) - 0.2, 2025.2)
    ax.set_xticks([2015, 2017, 2019, 2021, 2023, 2025])
    ax.tick_params(axis="x", labelsize=8)


def _two_axes(fig: plt.Figure, ax: plt.Axes) -> tuple[plt.Axes, plt.Axes]:
    ax.remove()
    left = fig.add_subplot(121)
    right = fig.add_subplot(122)
    fig.subplots_adjust(left=0.09, right=0.97, bottom=0.19, top=0.87, wspace=0.27)
    return left, right


def _outcome_chart(fig: plt.Figure, ax: plt.Axes, code: str, thefts: pd.DataFrame) -> tuple[str, str, str]:
    drive = "Drive Data Política Publica; cuatro series 2015–2024 cotejadas con Medicina Legal; extorsión y transporte sin cotejo."
    if code == "SEG_PERSONAL":
        left, right = _two_axes(fig, ax)
        _drive_line(left, "homicidios", ORANGE, "Homicidios médico legales")
        _drive_line(right, "extorsion", BLUE, "Extorsión registrada")
        return ("Homicidios altos; extorsión en ascenso",
                "Homicidios: 427 en 2023 y 411 en 2024 (−3,7 %); el archivo compartido registra 410 en 2025, pendiente de ficha de origen. Extorsión: 197 en 2024 y 382 en 2025 en el archivo del usuario. Las series tienen sistemas de registro distintos y no se suman. La simultaneidad con el PDD no identifica su efecto.", drive)
    if code == "SEG_COMUNITARIA":
        left, right = _two_axes(fig, ax)
        _drive_line(left, "violencia_intrafamiliar", BLUE, "Violencia intrafamiliar médico legal")
        _drive_line(right, "delito_sexual", ORANGE, "Exámenes por presunto delito sexual")
        return ("Dos daños descienden en 2024, con vigilancia necesaria",
                "La serie médico legal de violencia intrafamiliar pasa de 394 (2023) a 323 (2024); los exámenes por presunto delito sexual, de 500 a 430. El archivo del usuario registra 332 y 383 en 2025, aún sin ficha de procedencia. Estas series no equivalen a violencia de pareja ni a denuncias policiales; una baja de registros puede reflejar también acceso o denuncia.", drive)
    if code == "SEG_ECONOMICA":
        left, right = _two_axes(fig, ax)
        left.plot([2023, 2024, 2025], [42.8, 41.1, 34.6], color=TEAL, marker="o", linewidth=2.7)
        left.set_title("Pobreza monetaria DANE (%)", fontsize=10, weight="bold")
        left.set_xticks([2023, 2024, 2025]); left.grid(axis="y", color=PALE)
        _drive_line(right, "extorsion", ORANGE, "Extorsión registrada (casos)")
        return ("Menos pobreza monetaria y más presión extorsiva",
                "La pobreza monetaria oficial bajó de 42,8 % (2023) a 34,6 % (2025), mientras el archivo compartido muestra un alza de la extorsión registrada hasta 382 casos en 2025. Son resultados de distinta naturaleza: mejora de ingresos no implica protección automática frente a economías ilegales. La respuesta de cada programa debe evaluarse con beneficiarios, fechas y productos entregados.",
                "DANE, pobreza monetaria Cartagena 2023–2025; Drive Data Política Publica, extorsión (2025 sin ficha de origen).")
    if code == "SEG_ALIMENTARIA":
        sae = pd.read_csv(ROOT / "data/banco_fuentes_oficiales/dane_sae_cartagena.csv")
        sae = sae[sae["indicador"] == "inseguridad_alimentaria_moderada_grave_sae"].sort_values("anio")
        years = sae["anio"].astype(int).tolist()
        values = sae["estimacion_pct"].astype(float).tolist()
        errors = sae["error_estandar_pct"].astype(float).tolist()
        ax.errorbar(years, values, yerr=[1.96 * e for e in errors], color=ORANGE,
                    marker="o", linewidth=2.5, capsize=7)
        ax.set_xticks(years); ax.set_ylabel("% de población; IC aproximado 95 %")
        ax.set_ylim(0, max(values) + 12)
        return ("La inseguridad alimentaria estimada empeoró",
                "El modelo municipal SAE de DANE estima 22,2 % (2022) y 28,1 % (2024) de inseguridad alimentaria moderada o grave. Las barras expresan incertidumbre del estimador; la diferencia entre dos estimaciones no prueba un efecto de un programa ni permite conocer la exposición a PAE o apoyos alimentarios. Se requieren cobertura y raciones efectivas por territorio.",
                "DANE, SAE Fay-Herriot FIES municipal 2022 y 2024; archivo y celda trazados en banco oficial POLIS.")
    if code == "SEG_SANITARIA":
        left, right = _two_axes(fig, ax)
        _drive_line(left, "suicidios", BLUE, "Suicidios médico legales")
        _drive_line(right, "muertes_transporte", ORANGE, "Muertes por transporte")
        return ("Salud mental y trauma: señales en direcciones distintas",
                "Los suicidios bajaron de 55 (2023) a 33 (2024), pero el archivo compartido registra 42 en 2025; las muertes por eventos de transporte suben de 149 a 173 entre 2024 y 2025. La serie de transporte del Drive aún requiere ficha de origen y cotejo externo. Son daños distintos y no se agregan a un supuesto total sanitario.",
                "Medicina Legal, suicidios 2015–2024; Drive Data Política Publica, suicidios y transporte (2025 provisional).")
    if code == "SEG_AMBIENTAL":
        water = pd.DataFrame(json.loads((ROOT / "data/banco_fuentes_oficiales/extracciones/ins_calidad_agua.json").read_text()))
        water = water[(water[3] == "total") & (water[2] >= 2018)]
        values = dict(zip(water[2].astype(int), water[4].astype(float)))
        years = list(range(2018, 2025))
        ax.plot(years, [values.get(year, np.nan) for year in years],
                color=TEAL, marker="o", linewidth=2.7)
        ax.set_xticks(list(range(2018, 2025))); ax.set_ylabel("IRCA municipal (%)")
        ax.grid(axis="y", color=PALE)
        return ("Calidad del agua: señal de deterioro en 2024",
                "El IRCA total publicado por INS/SIVICAP alcanza 2,8 % en 2024 frente a 0,3 % en 2023; 2020 no aparece en la extracción y no se interpola. El indicador resume muestras de agua, no personas expuestas ni contaminación de todos los barrios. Las apuestas ambientales requieren mediciones de aire, manglar e inundación con cobertura territorial comprobada.",
                "INS/SIVICAP, calidad del agua para consumo humano de Cartagena; banco oficial POLIS.")
    if code == "SEG_POLITICA":
        risk = pd.read_csv(ROOT / "data/banco_fuentes_oficiales/irv_cartagena.csv")
        values = risk.set_index("anio")["irv_estimado"]
        years = list(range(2012, 2026))
        ax.plot(years, values.reindex(years), color=BLUE, marker="o", linewidth=2.6)
        ax.set_ylabel("Índice de riesgo de victimización (0–1)")
        ax.set_xticks(list(range(2012, 2026, 2))); ax.grid(axis="y", color=PALE)
        return ("Riesgo de victimización: seguimiento preventivo",
                "El IRV de la Unidad para las Víctimas sintetiza riesgo municipal y cambia de categoría a lo largo del periodo; 2016 carece de dato. No es un conteo de delitos ni mide por sí solo acceso a derechos o participación. Para evaluar las apuestas políticas faltan amenazas, respuestas institucionales y trazabilidad de propuestas a decisiones.",
                "Unidad para las Víctimas, IRV Cartagena 2012–2025; banco oficial POLIS.")
    raise ValueError(code)


def _draw_page(pdf: canvas.Canvas, page: int, axis_num: int, index: int, axis_name: str,
               fig: plt.Figure, title: str, reading: str, source: str) -> None:
    width, height = pdf._pagesize
    pdf.setFillColor(colors.HexColor(NAVY))
    pdf.rect(0, height - 90, width, 90, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("DejaVu", 10)
    pdf.drawString(42, height - 33, f"ESTUDIO VISUAL · CARTAGENA · EJE {axis_num} / 7")
    pdf.setFont("DejaVuBold", 18)
    pdf.drawString(42, height - 64, axis_name)
    pdf.setFillColor(colors.HexColor(TEAL))
    pdf.roundRect(width - 115, height - 60, 68, 28, 13, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("DejaVuBold", 10)
    pdf.drawCentredString(width - 81, height - 51, f"{index:02d} / 15")

    pdf.setFillColor(colors.HexColor(NAVY))
    pdf.setFont("DejaVuBold", 15)
    pdf.drawString(44, height - 122, title)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=170, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    pdf.drawImage(ImageReader(buf), 42, 161, width=width - 84, height=height - 305,
                  preserveAspectRatio=True, anchor="c", mask="auto")
    pdf.setFillColor(colors.HexColor(PALE))
    pdf.roundRect(42, 69, width - 84, 82, 10, stroke=0, fill=1)
    style = ParagraphStyle("reading", fontName="DejaVu", fontSize=9.2, leading=14,
                           textColor=colors.HexColor(NAVY), alignment=TA_LEFT)
    paragraph = Paragraph(reading, style)
    _, pheight = paragraph.wrap(width - 120, 68)
    paragraph.drawOn(pdf, 60, 137 - pheight)
    pdf.setFont("DejaVu", 6.7)
    pdf.setFillColor(colors.HexColor(GRAY))
    src = _wrap(source, 175)
    pdf.drawString(43, 48, f"Fuente: {src}")
    pdf.drawString(43, 30, "ESTUDIO MULTIFUENTE · lectura descriptiva · 2025 del Drive pendiente de ficha de origen")
    pdf.drawRightString(width - 43, 30, f"{page:03d}")
    pdf.showPage()


def _front(pdf: canvas.Canvas, title: str, body: list[str], page: int) -> None:
    width, height = pdf._pagesize
    pdf.setFillColor(colors.HexColor(NAVY))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor(TEAL))
    pdf.rect(0, height - 14, width, 14, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("DejaVuBold", 29)
    pdf.drawString(54, height - 100, title)
    style = ParagraphStyle("front", fontName="DejaVu", fontSize=12, leading=21,
                           textColor=colors.white, alignment=TA_LEFT)
    y = height - 151
    for paragraph in body:
        p = Paragraph(paragraph, style)
        _, h = p.wrap(width - 110, 140)
        p.drawOn(pdf, 54, y - h)
        y -= h + 19
    pdf.setFont("DejaVu", 9)
    pdf.setFillColor(colors.HexColor(MID))
    pdf.drawString(54, 40, "ESTUDIO DE TRABAJO · series oficiales y archivo del usuario separados por procedencia")
    pdf.drawRightString(width - 54, 40, f"{page:03d}")
    pdf.showPage()


async def main() -> None:
    study, thefts, lines = await asyncio.gather(construir_estudio(), _thefts(), _strategic_lines())
    from reportlab.lib.pagesizes import A4, landscape

    pdf = canvas.Canvas(str(OUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Estudio visual multifuente de seguridad humana de Cartagena 2012–2026")
    pdf.setAuthor("POLIS · análisis de evidencia")
    _front(pdf, "Seguridad humana en Cartagena", [
        "<b>Estudio visual multifuente.</b> Cruza ocho planes de desarrollo, planes de acción de 2018–2026, inversión BPIN, seis series nuevas del Drive, tres tipologías de hurtos y resultados oficiales de DANE, Medicina Legal, INS y Unidad para las Víctimas. Siete ejes se desarrollan en 105 láminas analíticas.",
        "La pregunta central es si el cambio de prioridades y de ejecución coincide con mejoras en daños y privaciones. Las gráficas distinguen planificación, pagos y resultados; la atribución de efectos requiere productos entregados, comparadores y control de factores externos.",
    ], 1)
    _front(pdf, "Cómo leer el estudio", [
        "<b>Formulación:</b> 4.637 metas de ocho PDD/PDL, clasificadas por contenido. <b>Acción:</b> 27.592 actividades únicas de 2018–2026; la tendencia termina en 2025 porque 2026 está incompleto. <b>Finanzas:</b> proyectos con BPIN deduplicados por vigencia; no representan todo el gasto distrital.",
        "<b>Resultados:</b> los CSV del Drive incluyen homicidios, extorsión, delito sexual, violencia intrafamiliar, suicidios y muertes por transporte hasta 2026. Cuatro series coinciden exactamente con el banco oficial médico legal en 2015–2024. Extorsión y muertes por transporte carecen de cotejo externo en este estudio; 2025–2026 carecen de ficha de corte. Los trazos discontinuos indican cifras provisionales y 2026 se excluye de comparaciones anuales.",
        "<b>Geografía:</b> los GeoJSON adjuntan a cada registro el mismo polígono urbano o rural; no contienen el punto del incidente. No permiten mapas de calor por barrio ni atribución de una acción local a una reducción cercana.",
        "La clasificación de actividades por eje usa texto y, cuando falta información, entidad responsable. Esta segunda regla es aproximada. Las láminas 6 y 12 de cada eje muestran sensibilidad de clasificación y presupuesto.",
    ], 2)
    _front(pdf, "Lo que sabemos al cruzar fuentes", [
        "<b>Seguridad personal:</b> los homicidios médico legales bajan de 427 (2023) a 411 (2024), pero permanecen sobre 2019. Los tres hurtos del archivo cambian en direcciones opuestas. El CSV del Drive sugiere más extorsión en 2025, pendiente de ficha de origen.",
        "<b>Comunidad:</b> violencia intrafamiliar y exámenes por presunto delito sexual médico legales bajan entre 2023 y 2024. <b>Economía:</b> DANE reporta pobreza monetaria de 42,8 % (2023), 41,1 % (2024) y 34,6 % (2025). <b>Alimentación:</b> la estimación SAE FIES sube de 22,2 % (2022) a 28,1 % (2024).",
        "El estudio no agrega homicidios, hurtos, lesiones, pobreza y mortalidad en un índice único: son unidades, fuentes y riesgos diferentes. Tampoco usa tasas territoriales donde faltan denominadores compatibles.",
    ], 3)
    page = 4
    for axis_num, code in enumerate(CODIGOS, 1):
        for index in range(1, 16):
            fig, title, reading, source = _chart(study, thefts, lines, code, index)
            _draw_page(pdf, page, axis_num, index, NOMBRE_EJE[code], fig, title, reading, source)
            page += 1
    _front(pdf, "Fuentes y decisiones pendientes", [
        "<b>Fuentes internas:</b> ocho planes en data/planes_desarrollo; planes de acción, metas y BPIN en bd_csh; tres tipologías de hurtos en geodatos.estadisticas_hurtos. Series del Drive y SHA-256 de cada CSV en data/analisis_planes/series_drive_multifuente_2026.manifest.json; carpeta https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4.",
        "<b>Fuentes externas:</b> Instituto Nacional de Medicina Legal, Forensis 2024 (https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf); DANE, pobreza monetaria 2024 y 2025 (https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/pobreza-monetaria); Cartagena Cómo Vamos, Informe de Calidad de Vida 2024 (https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf); Secretaría de Planeación, Anuario de Seguridad (https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/seguridad-785).",
        "<b>Para estimar efecto de política:</b> vincular cada meta con actividad, producto entregado, fecha, monto pagado y territorio; incorporar series de casos con igual definición y una zona de comparación. Verificar procedencia y corte de los nuevos ZIP. El cambio antes/después sigue siendo descriptivo hasta completar ese diseño.",
    ], page)
    pdf.save()
    print(f"{OUT} | paginas={page} | bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    asyncio.run(main())
