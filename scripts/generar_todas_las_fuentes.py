"""Generador integral de Diagnóstico y Presentación con TODAS las fuentes oficiales procesadas.
Corte: 27 de Octubre de 2026.
"""

from pathlib import Path
import json
import base64
import asyncio
import shutil
import httpx

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

from pptx import Presentation
from pptx.util import Inches as PptxInches, Pt as PptxPt
from pptx.dml.color import RGBColor as PptxRGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

DIR_BASE = Path("/root/polis/data/analisis_planes")
DIR_FUENTES = Path("/root/polis/data/banco_fuentes_oficiales")
ROOT = Path("/root/polis")
VAR_DESCARGAS = Path("/var/www/descargas")

# Colores institucionales
NAVY = "#0B2545"
BLUE = "#134074"
TEAL = "#00A6A0"
ORANGE = "#E77B4C"
RED = "#C93B2B"
GRAY = "#5D6978"
PALE = "#F0F4F8"
WHITE = "#FFFFFF"

DOCX_NAVY = RGBColor(11, 37, 69)
DOCX_BLUE = RGBColor(19, 64, 116)
DOCX_TEAL = RGBColor(0, 166, 160)
DOCX_ORANGE = RGBColor(231, 123, 76)
DOCX_GRAY = RGBColor(93, 105, 120)

PPTX_NAVY = PptxRGBColor(11, 37, 69)
PPTX_BLUE = PptxRGBColor(19, 64, 116)
PPTX_TEAL = PptxRGBColor(0, 166, 160)
PPTX_ORANGE = PptxRGBColor(231, 123, 76)
PPTX_GRAY = PptxRGBColor(93, 105, 120)
PPTX_WHITE = PptxRGBColor(255, 255, 255)
PPTX_PALE = PptxRGBColor(240, 244, 248)

plt.rcParams.update({
    "font.sans-serif": "DejaVu Sans",
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.labelcolor": NAVY,
    "text.color": NAVY,
    "xtick.color": GRAY,
    "ytick.color": GRAY,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

def generar_graficas_todas_las_fuentes():
    print("--> Generando gráficas de todas las fuentes...")
    
    # 1. Ecosistema de Fuentes (28 conjuntos en las 7 dimensiones)
    fig, ax = plt.subplots(figsize=(11, 5.2))
    dims = [
        "Personal\n(Policía, ML, SPOA)",
        "Comunitaria\n(ML, Policía, ICBF)",
        "Económica\n(DANE GEIH, Pobreza)",
        "Alimentaria\n(DANE SAE, TerriData)",
        "Salud\n(ML, TerriData, INS)",
        "Ambiental\n(IDEAM, SIVICAP, DNP)",
        "Institucional\n(RUV, IRV, Procuraduría)"
    ]
    conteo_datasets = [8, 5, 4, 3, 3, 3, 4]
    colores_barras = [RED, ORANGE, BLUE, TEAL, "#6F5CA8", "#47885D", NAVY]
    barras = ax.bar(dims, conteo_datasets, color=colores_barras, width=0.55, edgecolor="none", zorder=3)
    ax.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for b in barras:
        h = b.get_height()
        ax.annotate(f"{h} datasets", (b.get_x() + b.get_width()/2, h), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=10, fontweight="bold", color=NAVY)
    ax.set_title("Ecosistema POLIS: 28 Datasets Oficiales y 2.340 Indicadores en las 7 Dimensiones", fontsize=12, fontweight="bold", pad=14)
    ax.set_ylabel("Conjuntos de datos estructurados")
    ax.set_ylim(0, 10)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f01_ecosistema_fuentes.png", dpi=200)
    plt.close()

    # 2. Seguridad y Justicia: Medicina Legal vs Policía vs Hurto/Extorsión
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    anios = [2018, 2019, 2020, 2021, 2022, 2023, 2024]
    ml_hom = [244, 248, 255, 260, 368, 427, 411]
    pol_hom = [228, 235, 240, 252, 355, 410, 381]
    ax1.plot(anios, ml_hom, marker="o", linewidth=2.5, color=RED, label="Medicina Legal (Forensis - Dictamen pericial)")
    ax1.plot(anios, pol_hom, marker="s", linewidth=2.5, color=BLUE, linestyle="--", label="Policía Nacional (Denuncias SIEDCO)")
    for x, y in zip(anios, ml_hom):
        ax1.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, 6), ha="center", fontsize=8.5, fontweight="bold", color=RED)
    for x, y in zip(anios, pol_hom):
        ax1.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, -13), ha="center", fontsize=8.5, color=BLUE)
    ax1.set_title("Homicidios en Cartagena: Medicina Legal vs. Policía (2018–2024)", fontsize=11, fontweight="bold", pad=10)
    ax1.set_ylabel("Víctimas / Casos anuales")
    ax1.grid(axis="y", linestyle=":", alpha=0.6)
    ax1.legend(loc="upper left", fontsize=8.5)
    ax1.set_ylim(190, 480)

    anios_h = [2019, 2020, 2021, 2022, 2023, 2024]
    hurto_motos = [430, 395, 460, 490, 503, 665]
    hurto_casas = [710, 580, 620, 640, 618, 481]
    extorsion = [110, 95, 125, 160, 197, 382]
    ax2.plot(anios_h, hurto_motos, marker="^", linewidth=2.2, color=ORANGE, label="Hurto Motocicletas (Alza crítica +32%)")
    ax2.plot(anios_h, hurto_casas, marker="v", linewidth=2.2, color=TEAL, label="Hurto Residencias (Descenso -22%)")
    ax2.plot(anios_h, extorsion, marker="d", linewidth=2.2, color=RED, label="Extorsión Policía (Se duplicó en 2 años)")
    for x, y in zip(anios_h, extorsion):
        ax2.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, 6), ha="center", fontsize=8.5, fontweight="bold", color=RED)
    ax2.set_title("Hurto a Motocicletas vs. Residencias vs. Extorsión", fontsize=11, fontweight="bold", pad=10)
    ax2.grid(axis="y", linestyle=":", alpha=0.6)
    ax2.legend(loc="upper left", fontsize=8.5)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f02_seguridad_justicia_cruce.png", dpi=200)
    plt.close()

    # 3. Violencias de Género e Intrafamiliar (Medicina Legal vs Policía vs SPOA)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    anios_vif = [2021, 2022, 2023, 2024]
    pol_vif = [2850, 3120, 3412, 3047]
    ml_vif = [360, 380, 394, 323]
    ax1.bar([x - 0.2 for x in anios_vif], pol_vif, width=0.4, color=BLUE, label="Policía Nacional (Denuncias y llamados)", zorder=3)
    ax1.bar([x + 0.2 for x in anios_vif], ml_vif, width=0.4, color=ORANGE, label="Medicina Legal (Dictamen de lesiones)", zorder=3)
    ax1.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for x, y in zip(anios_vif, pol_vif):
        ax1.annotate(f"{y:,}", (x - 0.2, y), textcoords="offset points", xytext=(0, 4), ha="center", fontsize=8, fontweight="bold", color=BLUE)
    for x, y in zip(anios_vif, ml_vif):
        ax1.annotate(str(y), (x + 0.2, y), textcoords="offset points", xytext=(0, 4), ha="center", fontsize=8, fontweight="bold", color=ORANGE)
    ax1.set_title("Violencia Intrafamiliar: Denuncias Policiales vs. Dictamen Médico Legal", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_ylabel("Casos anuales")
    ax1.legend(loc="upper left", fontsize=8.5)

    anios_sex = [2019, 2020, 2021, 2022, 2023, 2024]
    ml_sex = [512, 430, 475, 490, 500, 430]
    ax2.plot(anios_sex, ml_sex, marker="o", linewidth=2.5, color="#6F5CA8", label="Medicina Legal (Exámenes presunto delito sexual)")
    for x, y in zip(anios_sex, ml_sex):
        ax2.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, 6), ha="center", fontsize=8.5, fontweight="bold", color="#6F5CA8")
    ax2.set_title("Presuntos Delitos Sexuales en Cartagena (Medicina Legal 2019–2024)", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Exámenes periciales")
    ax2.grid(axis="y", linestyle=":", alpha=0.6)
    ax2.legend(loc="upper right", fontsize=8.5)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f03_violencia_genero_familia.png", dpi=200)
    plt.close()

    # 4. DANE: Pobreza Monetaria, Desempleo e Informalidad
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    anios_pob = [2021, 2022, 2023, 2024, 2025]
    pob_monetaria = [47.5, 43.6, 42.8, 41.1, 34.6]
    ax1.plot(anios_pob, pob_monetaria, marker="s", linewidth=2.5, color=TEAL, label="Pobreza Monetaria Municipal (%)")
    for x, y in zip(anios_pob, pob_monetaria):
        ax1.annotate(f"{y}%", (x, y), textcoords="offset points", xytext=(0, 7), ha="center", fontsize=9, fontweight="bold", color=TEAL)
    ax1.set_title("Evolución de la Pobreza Monetaria en Cartagena (DANE 2021–2025)", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_ylabel("Porcentaje de la población (%)")
    ax1.grid(axis="y", linestyle=":", alpha=0.6)
    ax1.legend(loc="upper right", fontsize=8.5)
    ax1.set_ylim(25, 52)

    anios_lab = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
    desempleo = [7.5, 15.2, 11.8, 10.5, 11.17, 10.94, 14.14]
    informalidad = [54.2, 58.1, 56.0, 53.4, 51.89, 45.73, 50.20]
    ax2.plot(anios_lab, informalidad, marker="^", linewidth=2.2, color=ORANGE, label="Tasa de Informalidad (%)")
    ax2.plot(anios_lab, desempleo, marker="o", linewidth=2.2, color=RED, label="Tasa de Desocupación Trim. Oct-Dic (%)")
    for x, y in zip([2023, 2024, 2025], [11.17, 10.94, 14.14]):
        ax2.annotate(f"{y}%", (x, y), textcoords="offset points", xytext=(0, -14), ha="center", fontsize=8.5, fontweight="bold", color=RED)
    for x, y in zip([2023, 2024, 2025], [51.89, 45.73, 50.20]):
        ax2.annotate(f"{y}%", (x, y), textcoords="offset points", xytext=(0, 6), ha="center", fontsize=8.5, fontweight="bold", color=ORANGE)
    ax2.set_title("Mercado Laboral GEIH: Desempleo e Informalidad (DANE)", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Tasa porcentual (%)")
    ax2.grid(axis="y", linestyle=":", alpha=0.6)
    ax2.legend(loc="center right", fontsize=8.5)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f04_dane_pobreza_mercado_laboral.png", dpi=200)
    plt.close()

    # 5. DANE ECSC (Cifra Oculta) y DANE SAE (FIES Hambre)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    # ECSC: Victimización vs Denuncia
    categorias_ecsc = ["Victimización\n(Vivió un delito)", "Cifra Oculta\n(NO denunció el hecho)", "Percepción de Inseguridad\n(Se siente inseguro)"]
    valores_ecsc = [9.53, 74.60, 75.11]
    colores_ecsc = [ORANGE, RED, NAVY]
    b_ecsc = ax1.bar(categorias_ecsc, valores_ecsc, color=colores_ecsc, width=0.5, zorder=3)
    ax1.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for b in b_ecsc:
        h = b.get_height()
        ax1.annotate(f"{h:.1f}%", (b.get_x() + b.get_width()/2, h), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=10, fontweight="bold", color=NAVY)
    ax1.set_title("DANE ECSC: La Cifra Oculta de la Delincuencia en Cartagena", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_ylabel("Porcentaje de ciudadanos (%)")
    ax1.set_ylim(0, 90)

    # DANE SAE: FIES
    anios_fies = [2022, 2024]
    fies_val = [22.15, 28.10]
    fies_err_min = [22.15 - 17.25, 28.10 - 23.42]
    fies_err_max = [27.06 - 22.15, 32.78 - 28.10]
    ax2.errorbar(anios_fies, fies_val, yerr=[fies_err_min, fies_err_max], fmt="o", color=RED, ecolor=GRAY, elinewidth=2, capsize=6, capthick=2, markersize=8, label="FIES Inseguridad Alimentaria Moderada/Grave (IC 95%)")
    for x, y in zip(anios_fies, fies_val):
        ax2.annotate(f"{y:.1f}%", (x, y), textcoords="offset points", xytext=(15, -4), fontsize=9.5, fontweight="bold", color=RED)
    ax2.set_title("DANE SAE: Inseguridad Alimentaria con Intervalos de Confianza", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Prevalencia municipal estimada (%)")
    ax2.set_xlim(2021, 2025)
    ax2.set_ylim(10, 40)
    ax2.grid(axis="y", linestyle=":", alpha=0.6)
    ax2.legend(loc="lower right", fontsize=8.5)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f05_dane_ecsc_seguridad_hambre.png", dpi=200)
    plt.close()

    # 6. Unidad para las Víctimas: RUV e Índice de Riesgo IRV
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    hechos_top = ["Desplazamiento\nForzado", "Amenazas", "Homicidios\nConflicto", "Delitos\nSexuales", "Pérdida de\nBienes"]
    val_top = [21341, 10818, 1910, 570, 406]
    ax1.barh(hechos_top[::-1], val_top[::-1], color=BLUE, height=0.55, zorder=3)
    ax1.grid(axis="x", linestyle=":", alpha=0.6, zorder=0)
    for i, v in enumerate(val_top[::-1]):
        ax1.annotate(f"{v:,}", (v, i), textcoords="offset points", xytext=(6, -3), va="center", fontsize=9, fontweight="bold", color=NAVY)
    ax1.set_title("Registro Único de Víctimas (RUV Cartagena): Hechos Históricos", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_xlabel("Número de víctimas registradas")
    ax1.set_xlim(0, 25000)

    anios_irv = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    irv_val = [0.152, 0.148, 0.142, 0.138, 0.141, 0.134, 0.147, 0.134]
    ax2.plot(anios_irv, irv_val, marker="d", linewidth=2.2, color=ORANGE, label="Índice de Riesgo de Victimización (IRV)")
    ax2.axhline(0.20, color=RED, linestyle=":", label="Umbral Riesgo Medio (0.20)")
    for x, y in zip(anios_irv, irv_val):
        ax2.annotate(f"{y:.3f}", (x, y), textcoords="offset points", xytext=(0, 6), ha="center", fontsize=8, color=NAVY)
    ax2.set_title("Evolución del Índice de Riesgo Municipal (IRV Víctimas)", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Valor del Índice (0 a 1 - Nivel 'Medio Bajo')")
    ax2.grid(axis="y", linestyle=":", alpha=0.6)
    ax2.legend(loc="upper right", fontsize=8.5)
    ax2.set_ylim(0.10, 0.22)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f06_unidad_victimas_ruv_irv.png", dpi=200)
    plt.close()

    # 7. DNP TerriData: Dengue, Desnutrición e Inundaciones
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    anios_dengue = [2019, 2020, 2021, 2022, 2023, 2024]
    tasa_dengue = [310.2, 145.0, 280.4, 320.1, 242.31, 713.24]
    ax1.bar(anios_dengue, tasa_dengue, color=[TEAL if y < 500 else RED for y in tasa_dengue], width=0.5, zorder=3)
    ax1.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for x, y in zip(anios_dengue, tasa_dengue):
        ax1.annotate(f"{y:.1f}", (x, y), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=8.5, fontweight="bold", color=NAVY)
    ax1.set_title("DNP TerriData: Incidencia de Dengue en Cartagena (por 100k hab)", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_ylabel("Tasa por 100.000 habitantes en riesgo")
    ax1.set_ylim(0, 850)

    # Indicadores Ambientales y Sanitarios
    conceptos = ["IRCA Agua Potable\n(INS SIVICAP - Seguro)", "Cobertura Acueducto\n(TerriData)", "Desnutrición Infantil <5\n(TerriData tasa)", "Eventos Inundación\n(DNP anual)"]
    valores_amb = [2.8, 92.4, 5.2, 8.0]
    ax2.bar(conceptos, valores_amb, color=[TEAL, BLUE, ORANGE, RED], width=0.5, zorder=3)
    ax2.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for i, v in enumerate(valores_amb):
        ax2.annotate(f"{v}", (i, v), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=9.5, fontweight="bold", color=NAVY)
    ax2.set_title("Indicadores Ambientales y de Salubridad Básica (INS y DNP)", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Porcentaje / Tasa / Conteo")
    ax2.set_ylim(0, 105)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f07_dnp_terridata_salud_ambiente.png", dpi=200)
    plt.close()

    # 8. ICBF, Procuraduría y Defensoría (Institucional y Social)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))
    # ICBF oferta
    oferta_nombres = ["Centros de\nDesarrollo Infantil", "Hogares\nComunitarios", "Puntos Entrega\nBienestarina", "Unidades Servicio\nPrimera Infancia"]
    oferta_val = [42, 615, 28, 114]
    ax1.bar(oferta_nombres, oferta_val, color="#47885D", width=0.5, zorder=3)
    ax1.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for i, v in enumerate(oferta_val):
        ax1.annotate(str(v), (i, v), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=9.5, fontweight="bold", color=NAVY)
    ax1.set_title("ICBF / SUIN: Red de Atención y Protección a la Niñez", fontsize=10.5, fontweight="bold", pad=10)
    ax1.set_ylabel("Unidades / Puntos activos")

    # Procuraduría PQRSDF
    pqrs_tipos = ["Derechos de\nPetición", "Quejas / Denuncias\nServidores", "Reclamos\nInstitucionales"]
    pqrs_val = [179, 109, 35]
    ax2.bar(pqrs_tipos, pqrs_val, color=NAVY, width=0.45, zorder=3)
    ax2.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)
    for i, v in enumerate(pqrs_val):
        ax2.annotate(str(v), (i, v), textcoords="offset points", xytext=(0, 5), ha="center", fontsize=9.5, fontweight="bold", color=NAVY)
    ax2.set_title("Procuraduría General: 323 Solicitudes Ciudadanas PQRSDF (2024)", fontsize=10.5, fontweight="bold", pad=10)
    ax2.set_ylabel("Radicaciones en Cartagena")
    ax2.set_ylim(0, 220)
    plt.tight_layout()
    plt.savefig(DIR_BASE / "f08_icbf_procuraduria_defensoria.png", dpi=200)
    plt.close()

    print("--> Gráficas de fuentes completadas exitosamente.")

def generar_presentacion_todas_las_fuentes():
    print("--> Generando Presentación Google Slides con TODAS las fuentes...")
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)
    prs.slide_height = PptxInches(7.5)
    blank = prs.slide_layouts[6]

    def agregar_header(slide, titulo, subtitulo):
        h = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, PptxInches(13.333), PptxInches(1.15))
        h.fill.solid()
        h.fill.fore_color.rgb = PPTX_NAVY
        h.line.fill.background()

        tb = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(0.15), PptxInches(11.7), PptxInches(0.85))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = titulo
        p.font.size = PptxPt(21)
        p.font.bold = True
        p.font.color.rgb = PPTX_WHITE

        p2 = tf.add_paragraph()
        p2.text = subtitulo
        p2.font.size = PptxPt(12)
        p2.font.color.rgb = PPTX_TEAL

        f = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, PptxInches(7.1), PptxInches(13.333), PptxInches(0.4))
        f.fill.solid()
        f.fill.fore_color.rgb = PPTX_PALE
        f.line.fill.background()

        tb_f = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(7.12), PptxInches(11.7), PptxInches(0.3))
        pf = tb_f.text_frame.paragraphs[0]
        pf.text = "POLIS Cartagena · Diagnóstico Multifuente de Seguridad Humana 2026 · Corte: 27 de Octubre de 2026"
        pf.font.size = PptxPt(10)
        pf.font.color.rgb = PPTX_GRAY

    # Slide 1: Portada
    s1 = prs.slides.add_slide(blank)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, PptxInches(13.333), PptxInches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = PPTX_NAVY
    bg1.line.fill.background()

    tb1 = s1.shapes.add_textbox(PptxInches(1.0), PptxInches(1.8), PptxInches(11.3), PptxInches(4.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "DIAGNÓSTICO MULTIFUENTE DE SEGURIDAD HUMANA"
    p.font.size = PptxPt(36)
    p.font.bold = True
    p.font.color.rgb = PPTX_WHITE

    p = tf1.add_paragraph()
    p.text = "Cartagena de Indias · Integración Completa de Fuentes Oficiales, Triada y 8 Planes (2012–2027)"
    p.font.size = PptxPt(19)
    p.font.color.rgb = PPTX_TEAL

    p = tf1.add_paragraph()
    p.text = "\nBases Procesadas: DANE · Medicina Legal · Policía Nacional · Fiscalía SPOA · TerriData DNP · Unidad Víctimas (RUV) · ICBF · IDEAM · INS · Procuraduría\nFecha de Corte: 27 de Octubre de 2026"
    p.font.size = PptxPt(13)
    p.font.color.rgb = PPTX_PALE

    # Slide 2: El Ecosistema de 28 Fuentes
    s2 = prs.slides.add_slide(blank)
    agregar_header(s2, "1. Ecosistema de Fuentes Oficiales Procesadas", "Banco reproducible de 28 conjuntos de datos y 2.340 observaciones normalizadas")
    tb = s2.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.6), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Cobertura por Entidad Custodia:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s2 = [
        "Medicina Legal: 7 series de violencia y daño físico (2015–2024).",
        "Policía Nacional: 7 conjuntos de delitos, hurtos y extorsión (2010–2026).",
        "Fiscalía General (SPOA): Noticias criminales y procesos penales ingresados.",
        "DANE: Pobreza monetaria, mercado laboral GEIH, ECSC y FIES experimental SAE.",
        "DNP / TerriData: 82 observaciones de 10 indicadores sectoriales territoriales.",
        "Unidad para las Víctimas: 522 hechos RUV, índice de riesgo IRV e indemnizaciones.",
        "ICBF / SUIN: Primera infancia, unidades de servicio y nutrición.",
        "Ambientales: IDEAM SISAIRE (aire) e INS SIVICAP (agua potable IRCA)."
    ]
    for b in bullets_s2:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s2.shapes.add_picture(str(DIR_BASE / "f01_ecosistema_fuentes.png"), PptxInches(6.6), PptxInches(1.45), width=PptxInches(6.0))

    # Slide 3: Medicina Legal vs Policía
    s3 = prs.slides.add_slide(blank)
    agregar_header(s3, "2. Fuentes de Seguridad: Medicina Legal vs. Policía Nacional", "Cotejo de homicidios, hurtos discriminados y extorsión (2018–2024)")
    tb = s3.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Hallazgos de la Evidencia:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s3 = [
        "Homicidios en Medicina Legal: 411 en 2024 vs. 427 en 2023. Tasa de 38,79 por 100k hab. (Persiste sobre el nivel de 2019).",
        "Divergencia Policial: Policía registra 381 homicidios en 2024. Criterio técnico: NO promediar universos diferentes.",
        "Hurto a Motocicletas: Disparo crítico al pasar de 503 (2023) a 665 (2024), un incremento del +32%.",
        "Hurto a Residencias: Reducción positiva de 618 a 481 casos.",
        "Extorsión: Duplicada en registros policiales pasando de 197 a 382 casos anuales."
    ]
    for b in bullets_s3:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s3.shapes.add_picture(str(DIR_BASE / "f02_seguridad_justicia_cruce.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 4: Violencia Intrafamiliar y Género
    s4 = prs.slides.add_slide(blank)
    agregar_header(s4, "3. Fuentes de Género y Familia: Medicina Legal vs. Policía", "Violencia intrafamiliar y exámenes periciales por presunto delito sexual")
    tb = s4.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Comparativo de Universos:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s4 = [
        "Brecha de Captura: Policía capta más de 3.000 llamadas/denuncias anuales (3.047 en 2024); Medicina Legal valora 323 casos de lesiones dictaminadas.",
        "Violencia de Pareja: El anuario distrital añade 673 casos específicos de pareja que no deben diluirse.",
        "Delitos Sexuales: Medicina Legal realizó 430 exámenes en 2024, reduciendo frente a los 500 de 2023.",
        "Conclusión Técnica: Se requiere una ruta única interinstitucional que garantice protección cautelar antes del dictamen forense."
    ]
    for b in bullets_s4:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s4.shapes.add_picture(str(DIR_BASE / "f03_violencia_genero_familia.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 5: DANE Pobreza y Mercado Laboral
    s5 = prs.slides.add_slide(blank)
    agregar_header(s5, "4. Fuentes DANE: Pobreza Monetaria y Mercado de Trabajo", "Evolución de la pobreza (2021–2025) y tensiones laborales de la GEIH")
    tb = s5.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Lectura Conjunta DANE:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s5 = [
        "Pobreza Monetaria: Descenso sostenido del 47,5% (2021) al 42,8% (2023), 41,1% (2024) y 34,6% (2025).",
        "Desocupación Trimestral: Repunte en el corte octubre-diciembre al pasar de 10,94% (2024) a 14,14% (2025).",
        "Informalidad Laboral: Afecta a la mitad de los ocupados (50,20% en 2025).",
        "Conclusión Económica: La caída de pobreza monetaria no elimina la fragilidad laboral; los ingresos son vulnerables ante choques externos."
    ]
    for b in bullets_s5:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s5.shapes.add_picture(str(DIR_BASE / "f04_dane_pobreza_mercado_laboral.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 6: DANE ECSC y DANE SAE
    s6 = prs.slides.add_slide(blank)
    agregar_header(s6, "5. Fuentes DANE: Victimización Oculta y Escala de Hambre (FIES)", "Encuesta ECSC y estimación experimental SAE de áreas pequeñas")
    tb = s6.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Señales de Vulnerabilidad Subyacente:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s6 = [
        "Cifra Oculta (ECSC): El 74,60% de las víctimas de delitos en Cartagena NO denuncia formalmente. La caída de denuncias puede reflejar desconfianza y no baja del delito.",
        "Percepción de Inseguridad: 75,11% de los ciudadanos manifiesta sentirse inseguro en la ciudad.",
        "Inseguridad Alimentaria FIES (SAE): Se estima en 28,10% en 2024 (IC 95%: 23,42–32,78%), frente al 22,15% en 2022.",
        "Rigor Estadístico: Los intervalos de confianza se solapan; no puede proclamarse un cambio estadísticamente probado sin microdatos directos."
    ]
    for b in bullets_s6:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s6.shapes.add_picture(str(DIR_BASE / "f05_dane_ecsc_seguridad_hambre.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 7: Unidad para las Víctimas
    s7 = prs.slides.add_slide(blank)
    agregar_header(s7, "6. Fuentes de Víctimas: RUV, IRV e Indemnizaciones", "Registro Único de Víctimas e Índice de Riesgo Municipal (2012–2026)")
    tb = s7.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Impacto del Conflicto en Cartagena:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s7 = [
        "Desplazamiento Forzado: Hecho victimizante dominante con 21.341 registros históricos radicados.",
        "Amenazas y Homicidios: 10.818 amenazas y 1.910 homicidios en el marco del conflicto.",
        "Índice de Riesgo IRV: Se mantiene estable en rango 'Medio Bajo' (0,134 en 2025).",
        "Indemnizaciones: 36 observaciones consolidadas (2012–2023) por más de $150.000 millones COP de reparación nacional.",
        "Exclusión Metodológica: 2024 se excluyó por discrepancias técnicas entre capas oficiales de la Unidad."
    ]
    for b in bullets_s7:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s7.shapes.add_picture(str(DIR_BASE / "f06_unidad_victimas_ruv_irv.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 8: DNP TerriData e Indicadores Ambientales
    s8 = prs.slides.add_slide(blank)
    agregar_header(s8, "7. Fuentes DNP TerriData y Sanitarias/Ambientales (INS e IDEAM)", "Alertas epidemiológicas, calidad de agua potable (IRCA) e inundaciones")
    tb = s8.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Alertas Territoriales DNP:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s8 = [
        "Brote Epidémico de Dengue: Disparo de 242,31 a 713,24 casos por 100.000 hab. en 2024 en TerriData.",
        "Calidad del Agua (IRCA): 2,8% en 2024 (nivel sin riesgo en cabecera urbana).",
        "Brecha Rural e Insular: El dato urbano oculta privaciones críticas de acueducto en corregimientos e islas.",
        "Riesgo de Inundación: Eventos pluviales recurrentes que exigen acelerar obras de drenajes.",
        "Calidad del Aire: Estaciones SISAIRE reportan concentraciones moderadas en zonas industriales."
    ]
    for b in bullets_s8:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s8.shapes.add_picture(str(DIR_BASE / "f07_dnp_terridata_salud_ambiente.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 9: ICBF, Procuraduría y Defensoría
    s9 = prs.slides.add_slide(blank)
    agregar_header(s9, "8. Fuentes Sociales e Institucionales: ICBF, Procuraduría y Defensoría", "Protección a la niñez, demandas ciudadanas PQRSDF y Alertas Tempranas SAT")
    tb = s9.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Demanda y Protección Institucional:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s9 = [
        "ICBF Primera Infancia: 615 hogares comunitarios, 42 centros de desarrollo infantil y 28 puntos de Bienestarina.",
        "Procuraduría General: 323 radicaciones en 2024 (179 derechos de petición, 109 quejas a servidores y 35 reclamos).",
        "Defensoría del Pueblo (SAT): Alertas 001-17 y 002-20 activas por presencia de estructuras multicrimen en zonas periurbanas e insulares.",
        "Conclusión Institucional: La protección ciudadana exige responder oportunamente a las alertas preventivas."
    ]
    for b in bullets_s9:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s9.shapes.add_picture(str(DIR_BASE / "f08_icbf_procuraduria_defensoria.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 10: La Triada de Gestión (Los 8 Planes y los Planes de Acción)
    s10 = prs.slides.add_slide(blank)
    agregar_header(s10, "9. La Respuesta Gubernamental: Triada PDD ↔ PA ↔ BPIM", "Auditoría de 8 planes de desarrollo (4.637 metas) y 27.592 actividades")
    tb = s10.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Sistematización de la Gestión Pública:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY
    bullets_s10 = [
        "8 Planes Evaluados: 5 PDD distritales (2012–2027) y 3 Planes Locales (PDL 2024–2027).",
        "4.637 Metas Clasificadas: 53,9% en seguridad comunitaria, 13,5% en seguridad personal y 11,2% en económica.",
        "27.592 Actividades de Planes de Acción: Monitoreo a compromisos y pagos efectivos de proyectos BPIN.",
        "Eficiencia DEA: Análisis de envoltura de datos para medir qué dependencias convierten presupuesto en productos reales.",
        "Advertencia Técnica: Un BPIN anómalo de 2025 ($1,4 billones) debe auditarse antes de asumir un salto financiero comunal."
    ]
    for b in bullets_s10:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = PptxPt(11.5)
        p.font.color.rgb = PPTX_GRAY
    s10.shapes.add_picture(str(DIR_BASE / "g05_heat.png"), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.4))

    # Slide 11: Cruce de Fuentes vs Planes (Matriz de Brechas)
    s11 = prs.slides.add_slide(blank)
    agregar_header(s11, "10. Matriz de Contraste: Realidad de las Fuentes vs. Apuestas de Planes", "¿Responden los planes de desarrollo a los daños prioritarios medidos en el territorio?")
    tb = s11.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(11.7), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Balance Multidimensional de Correspondencia:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY

    filas_contraste = [
        ("Seguridad Personal", "Alerta Crítica", "Homicidios sobre 400 casos, alza de extorsión (+94%) y hurto de motos (+32%).", "Peso de metas bajó de 20% a 13,5%. Fuerte concentración en compras tecnológicas de vigilancia."),
        ("Seguridad Comunitaria", "Alerta Media", "Violencia intrafamiliar alta (3.047 denuncias policía) y 430 delitos sexuales.", "Concentra el 53,9% de las metas, pero con dispersión recreativa y sin ruta unificada de protección."),
        ("Seguridad Económica", "Prioridad Positiva", "Pobreza bajó a 34,6%, pero desempleo subió a 14,14% e informalidad en 50,2%.", "Crecimiento sostenido en agenda (+1,85 pp/año). Requiere programas de empleo formal juvenil."),
        ("Seguridad Alimentaria", "Brecha Crítica", "FIES subió a 28,10% en estimación SAE. Riesgo nutricional en niñez.", "Cobertura PAE no se traduce automáticamente en seguridad alimentaria en hogares."),
        ("Seguridad en Salud", "Alerta Sanitaria", "Brote de dengue récord (713/100k) frente a mejoras en salud mental (33 suicidios).", "Inversión reactiva a epidemias; falta articulación con control de vectores y saneamiento."),
        ("Seguridad Ambiental", "Riesgo Estructural", "Calidad de agua urbana favorable (IRCA 2,8%), pero graves inundaciones y brecha rural.", "Obras de drenajes pluviales avanzan con lentitud frente al riesgo de cambio climático.")
    ]
    for dim, semaforo, fuentes_txt, planes_txt in filas_contraste:
        p = tf.add_paragraph()
        p.text = f"• {dim} [{semaforo}]: "
        p.font.bold = True
        p.font.size = PptxPt(11)
        p.font.color.rgb = PPTX_NAVY
        p2 = tf.add_paragraph()
        p2.text = f"   - Fuentes Oficiales: {fuentes_txt}\n   - Respuesta de Planes: {planes_txt}"
        p2.font.size = PptxPt(10.5)
        p2.font.color.rgb = PPTX_GRAY

    # Slide 12: Conclusiones y Hoja de Ruta de Política Pública
    s12 = prs.slides.add_slide(blank)
    agregar_header(s12, "11. Conclusiones y Transición a la Fase 2 (Formulación de la Política Pública)", "De la evidencia empírica multifuente a la definición de objetivos, alternativas y plan de acción")
    tb = s12.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(11.7), PptxInches(5.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Conclusiones para la Toma de Decisiones de Política Pública:"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_NAVY

    bullets_s12 = [
        "1. Diagnóstico Validado e Integral: Cartagena dispone por primera vez de un diagnóstico que no se limita a la actividad de los planes de gobierno, sino que coteja la realidad medida por DANE, Medicina Legal, Policía, Fiscalía, DNP, RUV e ICBF.",
        "2. Tres Frentes de Acción Inmediata: (a) Contención de extorsión y hurto a motocicletas, (b) choque contra la informalidad laboral (50,2%) y el desempleo (14,14%), y (c) control epidemiológico de dengue y vulnerabilidad alimentaria (28,1%).",
        "3. Habilitación de la Fase 2 (Formulación de la Política Pública): El diagnóstico multifuente constituye el insumo empírico vinculante para que las 37 Mesas de Diálogo y los equipos técnicos formulen los ejes estratégicos, alternativas de solución, plan de acción y costeo de la política pública con trazabilidad de fe pública.",
        "4. Garantía de Devolución de Razones: Cada iniciativa ciudadana radicada en POLIS será contrastada contra esta evidencia oficial para fundamentar su viabilidad técnica, social y presupuestal."
    ]
    for b in bullets_s12:
        p = tf.add_paragraph()
        p.text = b
        p.font.size = PptxPt(12)
        p.font.color.rgb = PPTX_GRAY

    out_pptx = DIR_BASE / "diagnostico27102026.pptx"
    prs.save(str(out_pptx))
    print(f"--> PowerPoint / Google Slides guardado: {out_pptx} ({out_pptx.stat().st_size} bytes)")
    return out_pptx

def generar_documento_word_todas_las_fuentes():
    print("--> Generando Documento Word con TODAS las fuentes oficiales...")
    doc = Document()
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)

    # Portada
    t = doc.add_paragraph()
    r = t.add_run("DIAGNÓSTICO INTEGRAL DE SEGURIDAD HUMANA\nCARTAGENA DE INDIAS 2026")
    r.bold = True
    r.font.size = Pt(22)
    r.font.color.rgb = DOCX_NAVY
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph()
    r = sub.add_run("Evaluación Multifuente: DANE, Medicina Legal, Policía Nacional, Fiscalía SPOA, TerriData DNP, Unidad de Víctimas (RUV), ICBF y Triada de 8 Planes\nCorte Oficial: 27 de octubre de 2026")
    r.font.size = Pt(12)
    r.font.color.rgb = DOCX_TEAL
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("―" * 45).alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_page_break()

    # Capítulos con gráficos de fuentes
    capitulos = [
        ("1. Ecosistema de Fuentes Oficiales Procesadas", "f01_ecosistema_fuentes.png",
         "El sistema POLIS ha integrado un banco reproducible de 28 conjuntos de datos oficiales y 2.340 observaciones "
         "que abarcan las siete dimensiones de seguridad humana de la ONU. A diferencia de diagnósticos tradicionales centrados "
         "únicamente en los reportes de gestión gubernamental, este documento incorpora mediciones independientes del DANE, "
         "dictámenes periciales del Instituto Nacional de Medicina Legal, noticias criminales de Policía Nacional y Fiscalía SPOA, "
         "fichas sectoriales del DNP TerriData, el Registro Único de Víctimas (RUV) y registros del ICBF."),

        ("2. Seguridad Personal y Justicia (Medicina Legal vs. Policía y Fiscalía)", "f02_seguridad_justicia_cruce.png",
         "En seguridad personal se contrastan tres universos oficiales: Medicina Legal registra 411 homicidios en 2024 (tasa 38,79 por 100.000 hab.), "
         "frente a 381 registros de homicidio en la Policía Nacional. Se mantiene la proscripción metodológica de promediar ambas fuentes. "
         "En delitos patrimoniales, la Policía documenta un incremento alarmante del hurto a motocicletas (+32%, de 503 a 665 casos en 2024), "
         "mientras que la extorsión reportada se duplicó en dos años pasando de 197 a 382 casos."),

        ("3. Género, Familia y Delitos Sexuales", "f03_violencia_genero_familia.png",
         "La Policía Nacional reportó 3.047 denuncias por violencia intrafamiliar en 2024, mientras que Medicina Legal practicó 323 exámenes "
         "periciales por lesiones dictaminadas. Por su parte, los exámenes por presunto delito sexual pasaron de 500 a 430 en el mismo periodo. "
         "Esta diferencia refleja la brecha existente entre el auxilio inmediato y la valoración médico legal, exigiendo una ruta distrital de protección inmediata."),

        ("4. Pobreza Monetaria y Dinámica Laboral (DANE)", "f04_dane_pobreza_mercado_laboral.png",
         "El DANE certifica una reducción favorable en la pobreza monetaria municipal, pasando de 42,8% en 2023 a 41,1% en 2024 y 34,6% en 2025. "
         "Sin embargo, el mercado laboral presenta un deterioro simultáneo: la tasa de desocupación trimestral subió de 10,94% a 14,14% en 2025, "
         "y la informalidad laboral permanece en 50,20%. La ciudad experimenta una paradoja de mejora monetaria con alta fragilidad laboral."),

        ("5. Victimización Oculta (DANE ECSC) e Inseguridad Alimentaria (DANE SAE)", "f05_dane_ecsc_seguridad_hambre.png",
         "La Encuesta de Convivencia y Seguridad Ciudadana (ECSC) revela que el 74,60% de los ciudadanos víctimas de delitos en Cartagena NO denunció. "
         "Asimismo, el 75,11% declara sentirse inseguro. Por su parte, el modelo SAE de estimación de áreas pequeñas sitúa la inseguridad alimentaria "
         "moderada o grave (escala FIES) en 28,10% en 2024 (IC 95%: 23,42–32,78%), lo que demanda un fortalecimiento directo del PAE y de las redes de abastecimiento."),

        ("6. Víctimas del Conflicto Armado y Reparación (RUV e IRV)", "f06_unidad_victimas_ruv_irv.png",
         "La Unidad para las Víctimas registra 522 hechos consolidados en Cartagena, liderados por el desplazamiento forzado (21.341 víctimas históricas) "
         "y amenazas (10.818). El Índice de Riesgo de Victimización (IRV) se ubica en 0,134 ('Medio Bajo'). Se han consolidado más de $150.000 millones "
         "en indemnizaciones administrativas para la reparación de la población víctima asentada en el distrito."),

        ("7. Alertas Epidemiológicas y Salubridad Básica (DNP TerriData e INS)", "f07_dnp_terridata_salud_ambiente.png",
         "TerriData DNP evidencia un repunte crítico de dengue en 2024 alcanzando 713,24 casos por 100.000 habitantes en riesgo. En agua potable, "
         "el índice IRCA de la cabecera urbana se mantiene en 2,8% (seguro), pero se constatan brechas severas de continuidad y saneamiento en la zona insular "
         "y corregimental. Las inundaciones recurrentes exigen acelerar el Plan Maestro de Drenajes Pluviales."),

        ("8. Protección a la Niñez y Demanda Institucional (ICBF y Procuraduría)", "f08_icbf_procuraduria_defensoria.png",
         "El ICBF reporta una red de 615 hogares comunitarios y 42 centros de desarrollo infantil. En demanda institucional, la Procuraduría "
         "atendió 323 radicaciones PQRSDF en 2024 (179 derechos de petición y 109 quejas contra servidores públicos). Las Alertas Tempranas SAT "
         "de la Defensoría (001-17 y 002-20) advierten riesgos de reclutamiento y control multicrimen en zonas vulnerables."),

        ("9. La Respuesta Gubernamental: Triada PDD ↔ PA ↔ BPIM", "g05_heat.png",
         "La auditoría a los 8 planes de desarrollo (5 distritales y 3 locales) sistematiza 4.637 metas y 27.592 actividades de planes de acción. "
         "El análisis econométrico de eficiencia relativa (DEA) demuestra que la asignación presupuestal ha favorecido a la seguridad comunitaria "
         "(53,9% de metas), pero con debilidades de trazabilidad entre pagos de inversión y productos físicos entregados a la ciudadanía."),

        ("10. Conclusiones y Hoja de Ruta para la Formulación de la Política Pública", "g02_composicion.png",
         "El diagnóstico multifuente concluye que la ciudad debe priorizar tres urgencias territoriales en su formulación de política pública: "
         "(1) choque frontal contra la extorsión y el hurto de motocicletas, (2) formalización y empleo juvenil frente al 50,2% de informalidad, y "
         "(3) contingencia sanitaria de dengue y hambre. La plataforma POLIS abre formalmente la Fase 2 de formulación participativa en las 37 mesas.")
    ]

    for tit, img_f, desc in capitulos:
        doc.add_heading(tit, level=1).style.font.color.rgb = DOCX_NAVY
        doc.add_paragraph(desc)
        p_img = DIR_BASE / img_f
        if p_img.exists():
            doc.add_paragraph()
            doc.add_picture(str(p_img), width=Inches(6.0))
            p_cap = doc.add_paragraph(f"Visualización Oficial: {tit}")
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.runs[0].font.size = Pt(8.5)
            p_cap.runs[0].font.italic = True
        doc.add_page_break()

    out_docx = DIR_BASE / "diagnostico27102026.docx"
    doc.save(str(out_docx))
    print(f"--> Documento Word guardado: {out_docx} ({out_docx.stat().st_size} bytes)")
    return out_docx

def generar_presentacion_html_todas_las_fuentes():
    print("--> Generando Presentación HTML interactiva de todas las fuentes...")
    def to_b64(fname):
        p = DIR_BASE / fname
        if p.exists():
            return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode("ascii")
        return ""

    slides_info = [
        {
            "tipo": "portada",
            "titulo": "DIAGNÓSTICO MULTIFUENTE DE SEGURIDAD HUMANA",
            "subtitulo": "Cartagena de Indias · Integración Completa de Fuentes Oficiales, Triada y 8 Planes (2012–2027)",
            "fecha": "Corte Oficial: 27 de Octubre de 2026 · Sistema Distrital POLIS",
            "badge": "EVALUACIÓN INTEGRAL MULTIFUENTE"
        },
        {
            "tipo": "contenido",
            "titulo": "1. Ecosistema de 28 Fuentes Oficiales",
            "subtitulo": "Banco de 28 conjuntos de datos y 2.340 observaciones normalizadas en 7 dimensiones",
            "bullets": [
                "<strong>Medicina Legal:</strong> 7 series de violencia y daño físico (2015–2024).",
                "<strong>Policía Nacional:</strong> 7 conjuntos de delitos, hurtos y extorsión (2010–2026).",
                "<strong>Fiscalía SPOA:</strong> Procesos penales y noticias criminales anuales.",
                "<strong>DANE:</strong> Pobreza monetaria, empleo GEIH, convivencia ECSC y FIES hambre.",
                "<strong>DNP TerriData:</strong> 82 observaciones de 10 indicadores sectoriales.",
                "<strong>Unidad de Víctimas:</strong> 522 hechos RUV, índice de riesgo IRV e indemnizaciones.",
                "<strong>ICBF / SUIN:</strong> Red de primera infancia, bienestarina y protección.",
                "<strong>Ambientales:</strong> Calidad de aire IDEAM y calidad de agua potable INS SIVICAP."
            ],
            "img": to_b64("f01_ecosistema_fuentes.png"),
            "pie": "Ecosistema POLIS: 28 fuentes y 2.340 observaciones consolidadas."
        },
        {
            "tipo": "contenido",
            "titulo": "2. Seguridad y Justicia: Medicina Legal vs. Policía",
            "subtitulo": "Homicidios, hurtos discriminados por tipología y extorsión",
            "bullets": [
                "<strong>Homicidios Medicina Legal:</strong> 411 en 2024 vs. 427 en 2023. Tasa de 38,79 por 100k hab. Permanece por encima de 2019.",
                "<strong>Divergencia Policial:</strong> Policía registra 381 homicidios en 2024. Se analizan en paralelo sin promediar.",
                "<strong>Hurto a Motocicletas:</strong> Disparo alarmante (+32%, de 503 a 665 casos en 2024).",
                "<strong>Hurto a Residencias:</strong> Reducción favorable (-22%, de 618 a 481 casos).",
                "<strong>Extorsión:</strong> Se duplicó en dos años pasando de 197 a 382 casos reportados."
            ],
            "img": to_b64("f02_seguridad_justicia_cruce.png"),
            "pie": "Cruce Medicina Legal vs. Policía Nacional (Homicidios, Hurtos y Extorsión)."
        },
        {
            "tipo": "contenido",
            "titulo": "3. Género, Familia y Delitos Sexuales",
            "subtitulo": "Violencia intrafamiliar y exámenes periciales en Cartagena",
            "bullets": [
                "<strong>Brecha de Captura:</strong> Policía registra más de 3.000 denuncias anuales (3.047 en 2024); Medicina Legal valora 323 casos de lesiones dictaminadas.",
                "<strong>Violencia de Pareja:</strong> El anuario distrital suma 673 casos específicos de pareja.",
                "<strong>Delitos Sexuales:</strong> Medicina Legal realizó 430 exámenes en 2024, reduciendo frente a los 500 de 2023.",
                "<strong>Reto Institucional:</strong> Garantizar medidas cautelares de protección inmediata sin supeditar la ruta al dictamen forense."
            ],
            "img": to_b64("f03_violencia_genero_familia.png"),
            "pie": "Violencia intrafamiliar y delitos sexuales (Medicina Legal vs. Policía)."
        },
        {
            "tipo": "contenido",
            "titulo": "4. DANE: Pobreza Monetaria y Mercado Laboral",
            "subtitulo": "Pobreza en descenso vs. desempleo e informalidad persistentes",
            "bullets": [
                "<strong>Pobreza Monetaria:</strong> Descenso del 47,5% (2021) al 42,8% (2023), 41,1% (2024) y 34,6% (2025).",
                "<strong>Desocupación Trimestral:</strong> Repunte a 14,14% en el corte de fin de año 2025 frente a 10,94% en 2024.",
                "<strong>Informalidad Laboral:</strong> Se ubica en 50,20% en 2025.",
                "<strong>Diagnóstico:</strong> Coexisten mejoras en ingresos con alta vulnerabilidad en estabilidad laboral formal."
            ],
            "img": to_b64("f04_dane_pobreza_mercado_laboral.png"),
            "pie": "Pobreza monetaria y mercado laboral (DANE GEIH 2021–2025)."
        },
        {
            "tipo": "contenido",
            "titulo": "5. DANE ECSC (Cifra Oculta) y DANE SAE (Hambre)",
            "subtitulo": "Victimización sin denuncia y escala FIES de inseguridad alimentaria",
            "bullets": [
                "<strong>Cifra Oculta:</strong> El 74,60% de las víctimas de delitos NO denuncia formalmente (DANE ECSC).",
                "<strong>Percepción de Inseguridad:</strong> 75,11% de la ciudadanía se siente insegura en la ciudad.",
                "<strong>Inseguridad Alimentaria FIES:</strong> Estimada en 28,10% en 2024 (IC 95%: 23,42–32,78%), frente a 22,15% en 2022.",
                "<strong>Rigor Metodológico:</strong> Intervalos de confianza superpuestos demandan seguimiento continuo sin proclamar causalidad."
            ],
            "img": to_b64("f05_dane_ecsc_seguridad_hambre.png"),
            "pie": "Cifra oculta delictiva (ECSC) y escala de hambre FIES (DANE SAE)."
        },
        {
            "tipo": "contenido",
            "titulo": "6. Unidad para las Víctimas (RUV / IRV)",
            "subtitulo": "Hechos victimizantes, índice de riesgo municipal y reparación",
            "bullets": [
                "<strong>Desplazamiento Forzado:</strong> 21.341 víctimas históricas registradas en el RUV de Cartagena.",
                "<strong>Amenazas y Homicidios:</strong> 10.818 amenazas y 1.910 homicidios en el marco del conflicto.",
                "<strong>Índice de Riesgo IRV:</strong> 0,134 en 2025 (clasificación 'Medio Bajo').",
                "<strong>Indemnizaciones:</strong> Más de $150.000 millones COP en giros consolidados para reparación administrativa."
            ],
            "img": to_b64("f06_unidad_victimas_ruv_irv.png"),
            "pie": "RUV Cartagena: Hechos victimizantes e Índice de Riesgo Municipal."
        },
        {
            "tipo": "contenido",
            "titulo": "7. DNP TerriData e Indicadores Ambientales",
            "subtitulo": "Alerta por dengue, agua potable (IRCA) e inundaciones",
            "bullets": [
                "<strong>Brote de Dengue:</strong> Repunte a 713,24 casos por 100k hab. en 2024 en TerriData.",
                "<strong>Calidad de Agua Potable:</strong> IRCA de 2,8% en cabecera urbana (seguro). Severa brecha en corregimientos e islas.",
                "<strong>Vulnerabilidad Hídrica:</strong> Inundaciones recurrentes exigen culminar obras del Plan Maestro de Drenajes.",
                "<strong>Calidad de Aire:</strong> Estaciones SISAIRE vigilan material particulado en el corredor Mamonal."
            ],
            "img": to_b64("f07_dnp_terridata_salud_ambiente.png"),
            "pie": "Indicadores sectoriales DNP TerriData y salubridad básica."
        },
        {
            "tipo": "contenido",
            "titulo": "8. ICBF, Procuraduría y Defensoría del Pueblo",
            "subtitulo": "Primera infancia, quejas ciudadanas PQRSDF y Alertas Tempranas SAT",
            "bullets": [
                "<strong>ICBF Niñez:</strong> 615 hogares comunitarios, 42 centros de desarrollo infantil y 28 puntos de Bienestarina.",
                "<strong>Procuraduría General:</strong> 323 radicaciones en 2024 (179 derechos de petición, 109 quejas contra servidores).",
                "<strong>Defensoría del Pueblo:</strong> Alertas Tempranas 001-17 y 002-20 activas por estructuras multicrimen.",
                "<strong>Protección:</strong> Fortalecer el control social y la respuesta institucional temprana."
            ],
            "img": to_b64("f08_icbf_procuraduria_defensoria.png"),
            "pie": "Red de atención ICBF y solicitudes ciudadanas Procuraduría."
        },
        {
            "tipo": "contenido",
            "titulo": "9. Triada de Gestión: 8 Planes y Planes de Acción",
            "subtitulo": "4.637 metas y 27.592 actividades evaluadas con eficiencia DEA",
            "bullets": [
                "<strong>8 Planes Evaluados:</strong> 5 PDD distritales (2012–2027) y 3 Planes Locales (PDL 2024–2027).",
                "<strong>4.637 Metas:</strong> 53,9% comunitaria, 13,5% personal y 11,2% económica.",
                "<strong>27.592 Actividades:</strong> Auditoría a la conversión entre presupuesto pagado y productos entregados.",
                "<strong>Eficiencia DEA:</strong> Brecha entre gasto comprometido y entregables comprobados en territorio."
            ],
            "img": to_b64("g05_heat.png"),
            "pie": "Mapa de calor de intensidad de metas y actividades (2018–2026)."
        },
        {
            "tipo": "conclusiones",
            "titulo": "10. Conclusiones y Transición a la Fase 2 (Formulación de Política Pública)",
            "subtitulo": "Prioridades validadas por las fuentes para la formulación participativa",
            "bloques": [
                {
                    "titulo": "Diagnóstico Multifuente Completo",
                    "texto": "Cartagena cuenta con una línea base que cruza la gestión pública frente a los registros independientes de DANE, Medicina Legal, Policía, Fiscalía, DNP y Víctimas."
                },
                {
                    "titulo": "Tres Focos de Política Urgentes",
                    "texto": "Contención de extorsión y hurto de motos, formalización laboral frente al 50,2% de informalidad, y mitigación de la vulnerabilidad alimentaria y dengue."
                },
                {
                    "titulo": "Apertura de la Fase 2 en POLIS",
                    "texto": "Activación de la concertación de alternativas, plan de acción y gobernanza de la política pública para deliberación ciudadana vinculante en las 37 mesas territoriales."
                }
            ]
        }
    ]

    html = '''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POLIS Cartagena — Diagnóstico Multifuente (Corte 27/10/2026)</title>
    <style>
        :root {
            --navy: #0B2545; --blue: #134074; --teal: #00A6A0; --orange: #E77B4C;
            --gray: #5D6978; --pale: #F0F4F8; --white: #FFFFFF; --border: #DDE3EA;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0E1318; color: #2D3748; display: flex; flex-direction: column;
            align-items: center; justify-content: center; min-height: 100vh;
        }
        .controls-top {
            position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
            z-index: 100; display: flex; align-items: center; gap: 12px;
            background: rgba(11, 37, 69, 0.94); backdrop-filter: blur(8px);
            padding: 8px 18px; border-radius: 999px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            color: white; font-size: 13px;
        }
        .controls-top button {
            background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
            color: white; padding: 5px 12px; border-radius: 6px; cursor: pointer;
            font-weight: 600; font-size: 12px; transition: all 0.2s;
        }
        .controls-top button:hover { background: var(--teal); border-color: var(--teal); }
        .downloads-bar {
            position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
            z-index: 100; display: flex; align-items: center; gap: 8px;
            background: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
            padding: 6px 14px; border-radius: 999px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-size: 12px;
        }
        .downloads-bar a {
            color: var(--blue); text-decoration: none; padding: 4px 10px;
            border-radius: 6px; font-weight: 600; background: var(--pale); transition: all 0.2s;
        }
        .downloads-bar a:hover { background: var(--navy); color: white; }
        .slide-container {
            width: 92vw; max-width: 1220px; aspect-ratio: 16 / 9;
            background: white; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.5);
            position: relative; overflow: hidden; display: flex; flex-direction: column;
        }
        .slide { position: absolute; inset: 0; display: none; flex-direction: column; background: white; }
        .slide.active { display: flex; }
        .slide-portada {
            background: linear-gradient(135deg, var(--navy) 0%, #061527 100%);
            color: white; justify-content: center; align-items: center; text-align: center; padding: 40px;
        }
        .slide-portada .badge-top {
            display: inline-block; background: rgba(0, 166, 160, 0.2); border: 1px solid var(--teal);
            color: var(--teal); font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
            padding: 4px 12px; border-radius: 20px; margin-bottom: 20px;
        }
        .slide-portada h1 { font-size: 2.3rem; font-weight: 800; color: white; line-height: 1.2; margin-bottom: 16px; max-width: 950px; }
        .slide-portada h2 { font-size: 1.15rem; color: var(--teal); font-weight: 500; margin-bottom: 24px; max-width: 850px; }
        .slide-portada .fecha { font-size: 0.9rem; color: #9AA8B8; }
        .slide-header {
            background: var(--navy); color: white; padding: 12px 28px;
            display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid var(--teal);
        }
        .slide-header h2 { font-size: 1.25rem; font-weight: 700; }
        .slide-header p { font-size: 0.8rem; color: var(--teal); margin-top: 2px; }
        .slide-body {
            flex: 1; display: grid; grid-template-columns: 1.05fr 1fr;
            gap: 22px; padding: 20px 28px; align-items: center; min-height: 0;
        }
        .bullets-box ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
        .bullets-box li { position: relative; padding-left: 16px; font-size: 0.86rem; line-height: 1.42; color: #2D3748; }
        .bullets-box li::before { content: '▪'; position: absolute; left: 0; color: var(--orange); font-size: 1.1rem; line-height: 1; }
        .bullets-box strong { color: var(--navy); }
        .image-box {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: var(--pale); border: 1px solid var(--border); border-radius: 8px;
            padding: 8px; height: 100%; max-height: 385px;
        }
        .image-box img { max-width: 100%; max-height: 340px; object-fit: contain; border-radius: 4px; }
        .image-box .caption { font-size: 0.72rem; color: var(--gray); margin-top: 5px; text-align: center; font-style: italic; }
        .blocks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 24px 28px; flex: 1; }
        .card-concl {
            background: var(--pale); border: 1px solid var(--border); border-radius: 8px;
            padding: 20px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid var(--teal);
        }
        .card-concl h3 { font-size: 1.05rem; color: var(--navy); font-weight: 700; }
        .card-concl p { font-size: 0.88rem; color: var(--gray); line-height: 1.5; }
        .slide-footer {
            background: #E8EEF4; padding: 6px 28px; display: flex; justify-content: space-between;
            font-size: 0.7rem; color: var(--gray); border-top: 1px solid var(--border);
        }
    </style>
</head>
<body>
    <div class="controls-top">
        <button onclick="prevSlide()">◀ Anterior</button>
        <span id="counter">1 / 11</span>
        <button onclick="nextSlide()">Siguiente ▶</button>
        <button onclick="toggleFullscreen()">⛶ Pantalla Completa</button>
    </div>

    <div class="slide-container" id="slide-container">
'''

    for idx, s in enumerate(slides_info):
        active_cls = " active" if idx == 0 else ""
        if s["tipo"] == "portada":
            html += f'''
            <div class="slide slide-portada{active_cls}" data-index="{idx}">
                <span class="badge-top">{s['badge']}</span>
                <h1>{s['titulo']}</h1>
                <h2>{s['subtitulo']}</h2>
                <p class="fecha">{s['fecha']}</p>
            </div>
            '''
        elif s["tipo"] == "contenido":
            lis = "".join(f"<li>{b}</li>" for b in s["bullets"])
            html += f'''
            <div class="slide{active_cls}" data-index="{idx}">
                <div class="slide-header">
                    <div>
                        <h2>{s['titulo']}</h2>
                        <p>{s['subtitulo']}</p>
                    </div>
                </div>
                <div class="slide-body">
                    <div class="bullets-box">
                        <ul>{lis}</ul>
                    </div>
                    <div class="image-box">
                        <img src="{s['img']}" alt="{s['titulo']}" />
                        <span class="caption">{s['pie']}</span>
                    </div>
                </div>
                <div class="slide-footer">
                    <span>POLIS Cartagena · Diagnóstico Multifuente 2026</span>
                    <span>Corte 27/10/2026 · Diapositiva {idx+1} de {len(slides_info)}</span>
                </div>
            </div>
            '''
        elif s["tipo"] == "conclusiones":
            cards = "".join(f'''
            <div class="card-concl">
                <h3>{b['titulo']}</h3>
                <p>{b['texto']}</p>
            </div>''' for b in s["bloques"])
            html += f'''
            <div class="slide{active_cls}" data-index="{idx}">
                <div class="slide-header">
                    <div>
                        <h2>{s['titulo']}</h2>
                        <p>{s['subtitulo']}</p>
                    </div>
                </div>
                <div class="blocks-grid">
                    {cards}
                </div>
                <div class="slide-footer">
                    <span>POLIS Cartagena · Diagnóstico Multifuente 2026</span>
                    <span>Corte 27/10/2026 · Diapositiva {idx+1} de {len(slides_info)}</span>
                </div>
            </div>
            '''

    html += '''
    </div>

    <div class="downloads-bar">
        <span style="font-weight:700; color:var(--navy);">Descargas:</span>
        <a href="diagnostico27102026.pptx" download>📥 PowerPoint (Google Slides)</a>
        <a href="diagnostico27102026.docx" download>📄 Documento Word</a>
        <a href="diagnostico27102026.pdf" download target="_blank">📑 Atlas PDF (109 págs)</a>
    </div>

    <script>
        let current = 0;
        const slides = document.querySelectorAll('.slide');
        const counter = document.getElementById('counter');

        function showSlide(n) {
            slides[current].classList.remove('active');
            current = (n + slides.length) % slides.length;
            slides[current].classList.add('active');
            counter.innerText = (current + 1) + ' / ' + slides.length;
        }

        function nextSlide() { showSlide(current + 1); }
        function prevSlide() { showSlide(current - 1); }

        function toggleFullscreen() {
            const el = document.getElementById('slide-container');
            if (!document.fullscreenElement) {
                el.requestFullscreen().catch(err => alert(err.message));
            } else {
                document.exitFullscreen();
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') nextSlide();
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevSlide();
        });
    </script>
</body>
</html>
'''
    out_html = VAR_DESCARGAS / "diagnostico27102026_presentacion.html"
    out_html.write_text(html, encoding="utf-8")
    print(f"--> Presentación HTML interactiva guardada: {out_html} ({out_html.stat().st_size} bytes)")

def sincronizar_descargas_y_raiz():
    print("--> Sincronizando descargas web y raíz...")
    for ext in ["docx", "pptx", "pdf", "md"]:
        f_orig = DIR_BASE / f"diagnostico27102026.{ext}"
        if f_orig.exists():
            shutil.copyfile(f_orig, ROOT / f"diagnostico27102026.{ext}")
            shutil.copyfile(f_orig, VAR_DESCARGAS / f"diagnostico27102026.{ext}")
            print(f"Sincronizado {ext} en raíz y /var/www/descargas/")

async def subir_a_google_drive():
    print("--> Subiendo archivos actualizados a Google Drive (1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS)...")
    from app.modules.compromisos.pdt_generador_google_doc_pshc import _credentials, _drive_token, _drive_request

    FOLDER_ID = "1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS"
    creds = _credentials()
    token = await _drive_token(creds)
    boundary = "===polis_gdrive_upload==="

    archivos_a_subir = [
        ("diagnostico27102026 (Google Slides)", DIR_BASE / "diagnostico27102026.pptx", "application/vnd.google-apps.presentation", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        ("diagnostico27102026.pptx", DIR_BASE / "diagnostico27102026.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        ("diagnostico27102026 (Google Docs)", DIR_BASE / "diagnostico27102026.docx", "application/vnd.google-apps.document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("diagnostico27102026.docx", DIR_BASE / "diagnostico27102026.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("diagnostico27102026.pdf", DIR_BASE / "diagnostico27102026.pdf", "application/pdf", "application/pdf")
    ]

    async with httpx.AsyncClient(timeout=180) as client:
        q = f"'{FOLDER_ID}' in parents and trashed = false"
        existentes_res = await _drive_request(
            client, "GET", "https://www.googleapis.com/drive/v3/files", token,
            params={"q": q, "pageSize": 100, "fields": "files(id,name,mimeType)", "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"}
        )
        mapa_existentes = {f["name"]: f["id"] for f in existentes_res.get("files", [])}

        for nombre, path_local, mime_destino, content_tipo in archivos_a_subir:
            if not path_local.exists():
                continue
            contenido = path_local.read_bytes()
            fid_existente = mapa_existentes.get(nombre)

            if fid_existente:
                metadata = {"name": nombre}
                if mime_destino != content_tipo:
                    metadata["mimeType"] = mime_destino
                url = f"https://www.googleapis.com/upload/drive/v3/files/{fid_existente}"
                method = "PATCH"
            else:
                metadata = {"name": nombre, "parents": [FOLDER_ID]}
                if mime_destino != content_tipo:
                    metadata["mimeType"] = mime_destino
                url = "https://www.googleapis.com/upload/drive/v3/files"
                method = "POST"

            params = {"uploadType": "multipart", "supportsAllDrives": "true", "fields": "id,name,mimeType,webViewLink"}
            body = (
                f"--{boundary}\r\n"
                "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                f"{json.dumps(metadata)}\r\n"
                f"--{boundary}\r\n"
                f"Content-Type: {content_tipo}\r\n\r\n"
            ).encode("utf-8") + contenido + f"\r\n--{boundary}--\r\n".encode("utf-8")

            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
            }
            res = await client.request(method, url, params=params, headers=headers, content=body)
            res.raise_for_status()
            data = res.json()
            print(f"Drive OK: {data.get('name')} -> {data.get('webViewLink')}")

if __name__ == "__main__":
    print("=== INICIANDO CONSTRUCCIÓN COMPLETA DE TODAS LAS FUENTES ===")
    generar_graficas_todas_las_fuentes()
    generar_presentacion_todas_las_fuentes()
    generar_documento_word_todas_las_fuentes()
    generar_presentacion_html_todas_las_fuentes()
    sincronizar_descargas_y_raiz()
    asyncio.run(subir_a_google_drive())
    print("=== FINALIZADO EXITOSAMENTE ===")
