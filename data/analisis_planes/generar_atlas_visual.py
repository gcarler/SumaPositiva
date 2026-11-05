"""Genera un atlas visual reproducible de planes, acción y resultados de Cartagena.

Uso: desde backend/, ejecutar ``./.venv/bin/python ../data/analisis_planes/generar_atlas_visual.py``.
El PDF es descriptivo: una coincidencia temporal no identifica un efecto causal.
"""

from __future__ import annotations

import asyncio
import io
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

OUT = Path(__file__).with_name("ATLAS_VISUAL_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf")
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


def _outcome_chart(fig: plt.Figure, ax: plt.Axes, code: str, thefts: pd.DataFrame) -> tuple[str, str, str]:
    if code == "SEG_PERSONAL":
        ax.remove()
        left = fig.add_subplot(121)
        right = fig.add_subplot(122)
        years = [2019, 2020, 2021, 2022, 2023, 2024]
        rates = [19.6, 22.9, 23.7, 35.4, 40.59, 38.79]
        left.plot(years, rates, color=ORANGE, marker="o", linewidth=2.7)
        left.set_title("Homicidios por 100.000 hab.", fontsize=10)
        left.set_xticks(years)
        left.grid(axis="y", color=PALE)
        pivot = thefts.groupby(["anio", "delito"])["casos"].sum().unstack(fill_value=0).loc[2018:2024]
        for name, color in [("HURTO RESIDENCIAS", BLUE), ("HURTO MOTOCICLETA", TEAL), ("HURTO COMERCIO", MID)]:
            right.plot(pivot.index, pivot[name], marker="o", linewidth=2.2, label=name.replace("HURTO ", ""), color=color)
        right.set_title("Tres tipologías del GeoJSON", fontsize=10)
        right.legend(frameon=False, fontsize=7)
        right.grid(axis="y", color=PALE)
        return ("Los casos no evolucionan al mismo ritmo", "Medicina Legal reportó 427 homicidios en 2023 y 411 en 2024 (−3,7 %); el nivel de 2024 sigue muy por encima de 2019. En el GeoJSON, el hurto a residencias bajó de 618 a 481 y el de motos subió de 503 a 665. Coincidencia temporal con un plan no identifica su efecto.", "Forensis 2024 (INMLCF); Cartagena Cómo Vamos 2024; tres GeoJSON de hurtos aportados e ingeridos en bd_csh. Las fuentes no son un total conjunto.")
    if code == "SEG_ECONOMICA":
        _line(ax, [2023, 2024, 2025], [("Pobreza monetaria", [42.8, 41.1, 34.6], ORANGE)])
        ax.set_ylabel("% de personas")
        return ("Bajó la pobreza monetaria; falta identificar cuánto aportó el plan", "DANE registra 42,8 % en 2023, 41,1 % en 2024 y 34,6 % en 2025. La mejora es un resultado de ciudad, afectado también por empleo, precios y transferencias nacionales. Se requiere vincular productos pagados y población beneficiaria para evaluar la contribución distrital.", "DANE, pobreza monetaria 2024 y presentación de resultados 2025.")
    if code == "SEG_COMUNITARIA":
        _bar(ax, ["Violencia de pareja", "Presunto delito sexual", "Violencia NNA", "Violencia adulto mayor"], [673, 416, 64, 60], BLUE)
        ax.set_ylabel("Casos registrados en 2024")
        return ("Violencias comunitarias y del hogar: magnitud observada en 2024", "Medicina Legal registró 673 casos de violencia de pareja y 416 exámenes por presunto delito sexual en 2024. Las categorías miden hechos distintos y no se suman. El anuario señala una reducción interanual de 14 % en violencia de pareja; aún falta una serie y cobertura territorial homogéneas para valorar las intervenciones.", "Secretaría de Planeación de Cartagena, Anuario Estadístico de Seguridad 2024 (fuente técnica Medicina Legal).")
    if code == "SEG_SANITARIA":
        _bar(ax, ["2023", "2024"], [65.4, 0], TEAL)
        ax.set_ylabel("Razón de mortalidad materna por 100.000 nacidos vivos")
        return ("Mortalidad materna: un avance que exige seguimiento", "Cartagena Cómo Vamos, con datos DADIS, informa razón 65,4 en 2023 y cero muertes maternas en 2024. Un año con cero eventos no prueba por sí solo un efecto de un proyecto concreto; deben revisarse nacidos vivos, atención prenatal y continuidad de la ruta.", "Cartagena Cómo Vamos, Informe de Calidad de Vida 2024, fuente DADIS.")
    ax.axis("off")
    ax.text(0.5, 0.55, "SERIE DE RESULTADO NO HOMOLOGADA", ha="center", va="center",
            transform=ax.transAxes, color=ORANGE, fontsize=21, weight="bold")
    ax.text(0.5, 0.42, "No se representa una reducción de casos sin fuente comparable.", ha="center", va="center",
            transform=ax.transAxes, color=GRAY, fontsize=12)
    return ("El resultado sectorial requiere una serie verificable", "Los datos de metas, actividades y BPIN muestran la respuesta institucional documentada. No se dispone aquí de una serie anual, territorial y metodológicamente comparable del daño o bienestar para este eje. Se define la medición antes de emitir un juicio de eficacia.", "bd_csh, planes PDD/PDL y planes de acción; inventario de brecha de resultados del atlas.")


def _draw_page(pdf: canvas.Canvas, page: int, axis_num: int, index: int, axis_name: str,
               fig: plt.Figure, title: str, reading: str, source: str) -> None:
    width, height = pdf._pagesize
    pdf.setFillColor(colors.HexColor(NAVY))
    pdf.rect(0, height - 90, width, 90, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("DejaVu", 10)
    pdf.drawString(42, height - 33, f"ATLAS VISUAL · CARTAGENA · EJE {axis_num} / 7")
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
    pdf.drawString(43, 30, "BORRADOR: falta GeoJSON multifuente · lectura descriptiva · corte 20 oct 2026")
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
    pdf.drawString(54, 40, "BORRADOR INCOMPLETO · falta incorporar el GeoJSON multifuente indicado por el usuario")
    pdf.drawRightString(width - 54, 40, f"{page:03d}")
    pdf.showPage()


async def main() -> None:
    study, thefts, lines = await asyncio.gather(construir_estudio(), _thefts(), _strategic_lines())
    from reportlab.lib.pagesizes import A4, landscape

    pdf = canvas.Canvas(str(OUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Borrador incompleto: atlas visual de seguridad humana de Cartagena")
    pdf.setAuthor("POLIS · análisis de evidencia")
    _front(pdf, "Seguridad humana en Cartagena", [
        "<b>Borrador incompleto: falta el GeoJSON multifuente mencionado por el usuario.</b> Esta versión solo cruza ocho planes de desarrollo, planes de acción de 2018–2026, tres GeoJSON de hurtos y algunas series oficiales de resultado, organizados en siete ejes y 105 láminas analíticas.",
        "La pregunta central es si el cambio de prioridades y de ejecución coincide con mejoras en los daños y privaciones. Las gráficas muestran lo que la evidencia permite observar; la atribución de efectos requiere comparadores y control de factores externos.",
    ], 1)
    _front(pdf, "Cómo leer el atlas", [
        "<b>Formulación:</b> 4.637 metas de ocho PDD/PDL, clasificadas por contenido. <b>Acción:</b> 27.592 actividades únicas de 2018–2026; la tendencia termina en 2025 porque 2026 está incompleto. <b>Finanzas:</b> proyectos con BPIN deduplicados por vigencia; no representan todo el gasto distrital.",
        "<b>Resultados:</b> se usan series oficiales solo cuando existen en un periodo comparable. Los GeoJSON de hurto cubren comercio, residencias y motocicletas; su geometría representa zona urbana o rural y no permite ubicar casos individuales por barrio o UCG.",
        "La clasificación de actividades por eje usa texto y, cuando falta información, entidad responsable. Esta segunda regla es aproximada. Las láminas 6 y 12 de cada eje muestran sensibilidad de clasificación y presupuesto.",
    ], 2)
    _front(pdf, "Lo que sabemos al cruzar fuentes", [
        "<b>Seguridad personal:</b> Forensis registra 427 homicidios en 2023 y 411 en 2024, aunque el nivel de 2024 continúa muy por encima del de 2019. Los hurtos de residencias bajan en el archivo compartido; los de motocicletas suben.",
        "<b>Seguridad económica:</b> DANE reporta pobreza monetaria de 42,8 % (2023), 41,1 % (2024) y 34,6 % (2025). <b>Salud:</b> CCV/DADIS reportan cero muertes maternas en 2024. Estas variaciones no pueden atribuirse por sí mismas a un plan específico.",
        "El atlas no agrega homicidios, hurtos, lesiones, pobreza y mortalidad en un índice único: son unidades, fuentes y riesgos diferentes. Tampoco usa tasas territoriales donde faltan denominadores compatibles.",
    ], 3)
    page = 4
    for axis_num, code in enumerate(CODIGOS, 1):
        for index in range(1, 16):
            fig, title, reading, source = _chart(study, thefts, lines, code, index)
            _draw_page(pdf, page, axis_num, index, NOMBRE_EJE[code], fig, title, reading, source)
            page += 1
    _front(pdf, "Fuentes y decisiones pendientes", [
        "<b>Fuentes internas:</b> ocho planes en data/planes_desarrollo; registros de planes de acción, metas y BPIN en bd_csh; tres GeoJSON originales en el archivo de ingesta de hurtos. Estudio base reproducible: pdt_analisis_planes_tendencias.py.",
        "<b>Fuentes externas:</b> Instituto Nacional de Medicina Legal, Forensis 2024 (https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf); DANE, pobreza monetaria 2024 y 2025 (https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/pobreza-monetaria); Cartagena Cómo Vamos, Informe de Calidad de Vida 2024 (https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf); Secretaría de Planeación, Anuario de Seguridad (https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/seguridad-785).",
        "<b>Para estimar efecto de política:</b> vincular cada meta con actividad, producto entregado, fecha, monto pagado y territorio; incorporar series de casos con igual definición y una zona de comparación. El cambio antes/después es descriptivo hasta completar ese diseño.",
    ], page)
    pdf.save()
    print(f"{OUT} | paginas={page} | bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    asyncio.run(main())
