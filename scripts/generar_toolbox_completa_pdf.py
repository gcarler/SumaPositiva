#!/usr/bin/env python3
"""
Generador Maestro de la Caja de Herramientas de Seguridad Humana Integral
Distrito Turístico y Cultural de Cartagena de Indias - POLIS Plataforma

Genera 4 documentos de POLIS multi-página, de alta calidad institucional y pedagógica:
1. ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf (Cartilla pedagógica de 8 páginas y referencias)
2. PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf (Presentación ejecutiva de 10 láminas y referencias)
3. MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf (Matriz técnica de 5 páginas y referencias)
4. GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf (Manual de 5 páginas y referencias)
"""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

RAIZ_REPO = Path(__file__).resolve().parents[1]
OUTPUT_DIR = str(RAIZ_REPO / "public" / "docs")
ARCHIVO_LINAJE = RAIZ_REPO / "data/capas_analiticas/catalogo_indicadores/linaje_territorial_documentos.json"


def cargar_linaje_territorial():
    """Verifica el corte geográfico y la programación local antes de generar PDF."""
    linaje = json.loads(ARCHIVO_LINAJE.read_text(encoding="utf-8"))
    for capa in linaje["capas"]:
        original = (RAIZ_REPO / capa["archivo"]).read_bytes()
        if hashlib.sha256(original).hexdigest() != capa["sha256"]:
            raise ValueError(f"La fuente territorial cambió: {capa['id']}; revise su linaje")
        cantidad = len(json.loads(original)["features"])
        if cantidad != capa["cantidad_objetos"]:
            raise ValueError(f"El conteo territorial no coincide: {capa['id']}")
    programacion = linaje["programacion_mesas"]
    original = (RAIZ_REPO / programacion["archivo"]).read_bytes()
    if hashlib.sha256(original).hexdigest() != programacion["sha256"]:
        raise ValueError("Cambió el archivo de programación de mesas")
    codigos = re.findall(r"\('[0-9a-f-]{36}', '([^']+)'", original.decode().split(") AS c(")[0])
    if codigos != programacion["codigos"] or len(codigos) != programacion["cantidad_codigos"]:
        raise ValueError("El conteo de mesas programadas no coincide con su evidencia")
    return linaje


def agregar_referencias_territoriales(story, estilos):
    """Publica procedencia, universo y SHA; no presenta geometrías como barrios certificados."""
    linaje = cargar_linaje_territorial()
    story.append(PageBreak())
    story.append(Paragraph("Fuentes territoriales y programación: corte verificable", estilos["H1"]))
    story.append(Paragraph(
        "Los conteos siguientes describen objetos de archivos recibidos. No acreditan por sí solos "
        "vigencia de delimitaciones, un censo de barrios del POT o reuniones realizadas. "
        "La selección analítica de 17 polígonos acordada para el mapa es una decisión metodológica; "
        "no crea 17 UCG administrativas. Las cifras demográficas requieren su fuente y año propios.",
        estilos["Body"],
    ))
    for capa in linaje["capas"]:
        story.append(Paragraph(
            f"<b>{capa['id']}: {capa['cantidad_objetos']} objetos.</b> {capa['alcance']}<br/>"
            f"Archivo: {capa['archivo']}<br/>SHA-256: {capa['sha256']}",
            estilos["TableCell"],
        ))
        story.append(Spacer(1, 8))
    p = linaje["programacion_mesas"]
    story.append(Paragraph(
        f"<b>{p['cantidad_codigos']} mesas en la programación local.</b> {p['alcance']}<br/>"
        f"Archivo: {p['archivo']}<br/>SHA-256: {p['sha256']}", estilos["TableCell"],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Registro de estas referencias: data/capas_analiticas/catalogo_indicadores/"
        f"linaje_territorial_documentos.json. Fecha de cotejo: {linaje['verificado_utc']}. "
        "Una capa o programación nueva requiere actualizar el registro y comprobar sus conteos.",
        estilos["TableCell"],
    ))

# ---------------------------------------------------------------------------
# PALETA INSTITUCIONAL POLIS / CARTAGENA
# ---------------------------------------------------------------------------
C_NAVY_DARK   = colors.HexColor("#0A1128")
C_SLATE_DARK  = colors.HexColor("#0F172A")
C_SLATE_MED   = colors.HexColor("#1E293B")
C_EMBER       = colors.HexColor("#D97706")
C_EMBER_LIGHT = colors.HexColor("#FEF3C7")
C_CYAN        = colors.HexColor("#0284C7")
C_CYAN_LIGHT  = colors.HexColor("#E0F2FE")
C_EMERALD     = colors.HexColor("#059669")
C_EMERALD_LT  = colors.HexColor("#D1FAE5")
C_ROSE        = colors.HexColor("#DC2626")
C_ROSE_LT     = colors.HexColor("#FEE2E2")
C_BG_CARD     = colors.HexColor("#F8FAFC")
C_BG_ALT      = colors.HexColor("#F1F5F9")
C_BORDER      = colors.HexColor("#CBD5E1")
C_TEXT_MAIN   = colors.HexColor("#0F172A")
C_TEXT_MUTED  = colors.HexColor("#475569")
C_WHITE       = colors.HexColor("#FFFFFF")

# ---------------------------------------------------------------------------
# CANVAS CON NUMERACIÓN DE PÁGINAS Y MEMBRETE ("Página X de Y")
# ---------------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = getattr(self, 'doc_title', "POLIS Cartagena • Seguridad Humana Integral")
        self.is_landscape = False

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        width, height = self._pagesize
        # Si es portada (página 1), no dibuja encabezado ni pie estándar
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(C_TEXT_MUTED)

        # Encabezado
        marca = "POLIS • PLATAFORMA PARA LA CONSTRUCCIÓN DE POLÍTICAS PÚBLICAS"
        self.drawString(36, height - 28, marca)
        self.setFont("Helvetica", 7.5)
        self.drawString(36 + self.stringWidth(marca, "Helvetica-Bold", 7.5) + 10, height - 28, "•   Seguridad Humana Integral • Cartagena de Indias")
        self.setStrokeColor(C_BORDER)
        self.setLineWidth(0.6)
        self.line(36, height - 32, width - 36, height - 32)

        # Pie de página
        self.line(36, 32, width - 36, 32)
        self.setFont("Helvetica", 7.5)
        self.drawString(36, 22, "Documento de POLIS • Versión de trabajo para consulta • Ley 1757/2015 • Sentencia C-150/2015 • Decreto 1070/2021")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(width - 36, 22, page_str)
        self.restoreState()


class SlideCanvas(canvas.Canvas):
    """Canvas para presentaciones horizontales con estilo de diapositiva ejecutiva"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_slide_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_slide_decorations(self, page_count):
        width, height = self._pagesize
        if self._pageNumber == 1 or self._pageNumber == page_count:
            self.saveState()
            self.setFillColor(C_EMBER)
            self.rect(0, height - 6, width, 6, fill=1, stroke=0)
            self.setFillColor(C_CYAN)
            self.rect(0, height - 10, width * 0.45, 4, fill=1, stroke=0)
            self.setFillColor(C_EMBER)
            self.rect(0, 0, width, 6, fill=1, stroke=0)
            self.restoreState()
            return  # Portada y Cierre limpios con fondo oscuro y cintas ejecutivas

        self.saveState()
        # Barra superior decorativa
        self.setFillColor(C_SLATE_DARK)
        self.rect(0, height - 18, width, 18, fill=1, stroke=0)
        self.setFillColor(C_EMBER)
        self.rect(0, height - 20, width, 2, fill=1, stroke=0)

        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(C_WHITE)
        self.drawString(24, height - 13, "POLIS CARTAGENA DE INDIAS  |  DIAGNÓSTICO MULTIDIMENSIONAL DE SEGURIDAD HUMANA")
        self.drawRightString(width - 24, height - 13, "TALLERES BARRIALES 2026–2036")

        # Barra inferior
        self.setStrokeColor(C_BORDER)
        self.setLineWidth(0.5)
        self.line(24, 22, width - 24, 22)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(C_TEXT_MUTED)
        self.drawString(24, 12, "Documento de POLIS • Plataforma para la construcción de políticas públicas")
        self.drawRightString(width - 24, 12, f"Diapositiva {self._pageNumber} de {page_count}")
        self.restoreState()


def get_custom_styles():
    styles = getSampleStyleSheet()
    s = {}

    s["TitleCover"] = ParagraphStyle(
        "TitleCover", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=23, leading=27,
        textColor=C_NAVY_DARK, alignment=0, spaceAfter=8
    )
    s["SubCover"] = ParagraphStyle(
        "SubCover", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=12, leading=16,
        textColor=C_EMBER, alignment=0, spaceAfter=14
    )
    s["LemaCover"] = ParagraphStyle(
        "LemaCover", parent=styles["Normal"],
        fontName="Helvetica-Oblique", fontSize=11, leading=15,
        textColor=C_TEXT_MUTED, alignment=0, spaceAfter=20
    )
    s["H1"] = ParagraphStyle(
        "H1_Custom", parent=styles["Heading1"],
        fontName="Helvetica-Bold", fontSize=14, leading=18,
        textColor=C_NAVY_DARK, spaceBefore=12, spaceAfter=6, keepWithNext=True
    )
    s["H2"] = ParagraphStyle(
        "H2_Custom", parent=styles["Heading2"],
        fontName="Helvetica-Bold", fontSize=10.5, leading=14,
        textColor=C_SLATE_MED, spaceBefore=8, spaceAfter=4, keepWithNext=True
    )
    s["H3"] = ParagraphStyle(
        "H3_Custom", parent=styles["Heading3"],
        fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=C_EMBER, spaceBefore=4, spaceAfter=2, keepWithNext=True
    )
    s["Body"] = ParagraphStyle(
        "Body_Custom", parent=styles["Normal"],
        fontName="Helvetica", fontSize=8.5, leading=12.5,
        textColor=C_TEXT_MAIN, spaceAfter=5
    )
    s["BodyMuted"] = ParagraphStyle(
        "BodyMuted", parent=styles["Normal"],
        fontName="Helvetica", fontSize=8, leading=11,
        textColor=C_TEXT_MUTED, spaceAfter=4
    )
    s["BodyBold"] = ParagraphStyle(
        "BodyBold", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.5, leading=12.5,
        textColor=C_TEXT_MAIN, spaceAfter=4
    )
    s["Callout"] = ParagraphStyle(
        "Callout", parent=styles["Normal"],
        fontName="Helvetica-Oblique", fontSize=8.5, leading=12.5,
        textColor=C_SLATE_MED
    )
    s["TableHead"] = ParagraphStyle(
        "TableHead", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8, leading=11,
        textColor=C_WHITE, alignment=1
    )
    s["TableCell"] = ParagraphStyle(
        "TableCell", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.5, leading=10.5,
        textColor=C_TEXT_MAIN
    )
    s["TableCellBold"] = ParagraphStyle(
        "TableCellBold", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=7.5, leading=10.5,
        textColor=C_NAVY_DARK
    )
    s["SlideTitle"] = ParagraphStyle(
        "SlideTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=18, leading=22,
        textColor=C_NAVY_DARK, spaceAfter=4
    )
    s["SlideSub"] = ParagraphStyle(
        "SlideSub", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=9.5, leading=13,
        textColor=C_EMBER, spaceAfter=10
    )
    s["SlideActionTitle"] = ParagraphStyle(
        "SlideActionTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=15, leading=19,
        textColor=C_NAVY_DARK, spaceAfter=2
    )
    s["SlideSubAction"] = ParagraphStyle(
        "SlideSubAction", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.8, leading=12,
        textColor=C_EMBER, spaceAfter=8
    )
    s["CoverPill"] = ParagraphStyle(
        "CoverPill", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        textColor=colors.HexColor("#F59E0B")
    )
    s["CoverTitle"] = ParagraphStyle(
        "CoverTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=22, leading=26,
        textColor=C_WHITE, spaceAfter=6
    )
    s["CoverSub"] = ParagraphStyle(
        "CoverSub", parent=styles["Normal"],
        fontName="Helvetica", fontSize=11, leading=15,
        textColor=colors.HexColor("#94A3B8"), spaceAfter=10
    )
    s["CoverQuote"] = ParagraphStyle(
        "CoverQuote", parent=styles["Normal"],
        fontName="Helvetica-Oblique", fontSize=10, leading=14,
        textColor=colors.HexColor("#FDE68A")
    )
    s["CoverMetaCardTitle"] = ParagraphStyle(
        "CoverMetaCardTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        textColor=colors.HexColor("#38BDF8"), spaceAfter=3
    )
    s["CoverMetaCardText"] = ParagraphStyle(
        "CoverMetaCardText", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.3, leading=10,
        textColor=colors.HexColor("#E2E8F0")
    )
    s["CardTitleSm"] = ParagraphStyle(
        "CardTitleSm", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=C_NAVY_DARK, spaceAfter=3
    )
    s["CardTextSm"] = ParagraphStyle(
        "CardTextSm", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.4, leading=10.5,
        textColor=C_TEXT_MAIN
    )
    s["SlideKpiNum"] = ParagraphStyle(
        "SlideKpiNum", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=26, leading=28,
        alignment=1
    )
    s["SlideKpiTitle"] = ParagraphStyle(
        "SlideKpiTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.2, leading=10.5,
        textColor=C_SLATE_DARK, alignment=1, spaceAfter=2
    )
    s["SlideKpiText"] = ParagraphStyle(
        "SlideKpiText", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.1, leading=9.5,
        textColor=C_TEXT_MUTED, alignment=1
    )
    s["StepNum"] = ParagraphStyle(
        "StepNum", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=19, leading=21,
        alignment=1
    )
    s["StepTitle"] = ParagraphStyle(
        "StepTitle", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=8.2, leading=10.5,
        alignment=1, spaceAfter=2
    )
    s["StepText"] = ParagraphStyle(
        "StepText", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.1, leading=9.4,
        textColor=C_TEXT_MAIN, alignment=1
    )
    s["BannerText"] = ParagraphStyle(
        "BannerText", parent=styles["Normal"],
        fontName="Helvetica", fontSize=7.4, leading=10.5,
        textColor=C_TEXT_MAIN
    )
    return s

STYLES = get_custom_styles()

# ===========================================================================
# DOCUMENTO 1: ABC DE LA SEGURIDAD HUMANA INTEGRAL (8 PÁGINAS)
# ===========================================================================
def generar_doc_abc():
    pdf_path = os.path.join(OUTPUT_DIR, "ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf")
    doc = SimpleDocTemplate(
        pdf_path, pagesize=letter,
        leftMargin=36, rightMargin=36, topMargin=44, bottomMargin=44
    )
    st = STYLES
    story = []

    # ------------------ PÁGINA 1: PORTADA OFICIAL ------------------
    badge_data = [[
        Paragraph("<b>POLIS • PLATAFORMA PARA LA CONSTRUCCIÓN DE POLÍTICAS PÚBLICAS</b><br/>"
                  "<font color='#0284C7'>Documento de POLIS • Seguridad Humana Integral en Cartagena de Indias</font>", st["BodyBold"]),
        Paragraph("<b>POLIS CARTAGENA</b><br/><font color='#64748B'>Versión de trabajo 2026–2036</font>", st["BodyBold"])
    ]]
    t_head = Table(badge_data, colWidths=[380, 160])
    t_head.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1.5, C_EMBER),
    ]))
    story.append(t_head)
    story.append(Spacer(1, 40))

    story.append(Paragraph("ABC DE LA SEGURIDAD HUMANA INTEGRAL", st["TitleCover"]))
    story.append(Paragraph("Cartilla Pedagógica y Doctrinal para la Construcción Participativa de la Paz Territorial en Cartagena de Indias", st["SubCover"]))
    story.append(Paragraph("«Poner la vida, la justicia social y la dignidad de las comunidades en el centro absoluto de las decisiones de gobierno.»", st["LemaCover"]))
    story.append(Spacer(1, 20))

    # Tarjeta de salvaguarda y metadatos de portada
    meta_box = [
        [Paragraph("<b>Marco Constitucional y Legal:</b>", st["TableCellBold"]),
         Paragraph("Constitución Política de Colombia (Arts. 1, 2, 22), Sentencia de Constitucionalidad C-150 de 2015, Ley Estatutaria de Participación 1757 de 2015, Ley 70 de 1993 de Comunidades Negras y Decreto Distrital 1070 de 2021 de Planeación Distrital.", st["TableCell"])],
        [Paragraph("<b>Marco Internacional ONU:</b>", st["TableCellBold"]),
         Paragraph("Resolución 66/290 de la Asamblea General de las Naciones Unidas (2012) sobre el paradigma de Seguridad Humana; Informe PNUD 1994 sobre las 7 dimensiones vitales.", st["TableCell"])],
        [Paragraph("<b>Ámbito Territorial:</b>", st["TableCellBold"]),
         Paragraph("Cartagena de Indias: localidades, UCG urbanas, barrios, corregimientos y zonas insulares. Los objetos de las capas recibidas se documentan en las referencias territoriales; no constituyen un censo de barrios del POT. La programación local contempla 35 mesas y no acredita reuniones realizadas.", st["TableCell"])],
        [Paragraph("<b>Finalidad del Documento:</b>", st["TableCellBold"]),
         Paragraph("Instrumento pedagógico vinculante y de consulta ciudadana para líderes comunales, Juntas de Acción Comunal (JAC), ediles de JAL, organizaciones sociales, veedurías y servidores públicos distritales.", st["TableCell"])],
        [Paragraph("<b>Garantía de Fe Pública:</b>", st["TableCellBold"]),
         Paragraph("Toda propuesta y requerimiento tramitado a través de POLIS cuenta con número de radicado oficial obligatorio, código QR único de trazabilidad forense y deber de respuesta motivada perentoria.", st["TableCell"])],
    ]
    t_meta = Table(meta_box, colWidths=[150, 390])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 30))

    callout_cover = [
        [Paragraph("<b>NOTA DE ACCESIBILIDAD Y LIBRE REPRODUCCIÓN:</b> Esta cartilla está redactada en lenguaje ciudadano claro. Su contenido es de dominio público y está autorizada su libre reproducción total o parcial en asambleas barriales, colegios, parroquias y organizaciones de base de Cartagena de Indias.", st["Callout"])]
    ]
    t_call = Table(callout_cover, colWidths=[540])
    t_call.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_EMBER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_EMBER),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_call)
    story.append(PageBreak())

    # ------------------ PÁGINA 2: PRESENTACIÓN INSTITUCIONAL Y TABLA DE CONTENIDO ------------------
    story.append(Paragraph("Presentación", st["H1"]))
    story.append(Paragraph(
        "Cartagena de Indias inicia una transformación histórica en su manera de concebir el orden y la convivencia. "
        "Durante décadas, la política de seguridad distrital estuvo reducida casi con exclusividad a la reacción policial, "
        "la compra de vehículos patrulla, el incremento del pie de fuerza y la instalación reactiva de cámaras en corredores turísticos. "
        "No obstante, las cifras y la vivencia diaria en nuestros barrios populares evidenciaron que la represión por sí sola "
        "no extingue las causas estructurales del delito ni restituye la tranquilidad familiar.",
        st["Body"]
    ))
    story.append(Paragraph(
        "La Política Pública de Seguridad Humana Integral (2026–2036) adopta el mandato de las Naciones Unidas (Resolución 66/290) "
        "y el rigor constitucional colombiano (Sentencia C-150 de 2015). La verdadera seguridad no se mide por el número de armas incautadas, "
        "sino por la tranquilidad con la que una madre camina de noche con sus hijos por Olaya Herrera, El Pozón o Bayunca; "
        "por el acceso continuo al agua potable y a la alimentación digna; por la mitigación de los canales pluviales que se desbordan; "
        "y por el derecho irrenunciable de los vecinos a decidir, de manera vinculante, las prioridades de inversión en su propio territorio.",
        st["Body"]
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Contenido General de la Cartilla", st["H2"]))
    toc_data = [
        [Paragraph("<b>Capítulo 1:</b> El Tránsito Doctrinal hacia la Seguridad Humana", st["TableCellBold"]), Paragraph("Pág. 3", st["TableCell"])],
        [Paragraph("<b>Capítulo 2:</b> Cuadro Comparativo: ¿Qué NO es vs. ¿Qué SÍ es?", st["TableCellBold"]), Paragraph("Pág. 4", st["TableCell"])],
        [Paragraph("<b>Capítulo 3:</b> Las Siete (7) Dimensiones Integrales en Cartagena de Indias", st["TableCellBold"]), Paragraph("Pág. 5", st["TableCell"])],
        [Paragraph("<b>Capítulo 4:</b> Metodología de las mesas programadas y radicación", st["TableCellBold"]), Paragraph("Pág. 6", st["TableCell"])],
        [Paragraph("<b>Capítulo 5:</b> Las Diez (10) Preguntas Clave del ABC Ciudadano", st["TableCellBold"]), Paragraph("Pág. 7", st["TableCell"])],
        [Paragraph("<b>Capítulo 6:</b> Glosario Técnico, Directorio Distrital y Canales de Veeduría", st["TableCellBold"]), Paragraph("Pág. 8", st["TableCell"])],
    ]
    t_toc = Table(toc_data, colWidths=[480, 60])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 14))

    # Cuadro de autoridades distritales
    story.append(Paragraph("Actores distritales con los que se propone articular la política (por confirmar con cada dependencia)", st["H2"]))
    gov_data = [
        [Paragraph("<b>Alcalde Mayor de Cartagena:</b>", st["TableCellBold"]), Paragraph("Dirección general de la administración distrital", st["TableCell"])],
        [Paragraph("<b>Secretaría del Interior y Convivencia:</b>", st["TableCellBold"]), Paragraph("Coordinación operativa, concertación de mesas y convivencia comunitaria", st["TableCell"])],
        [Paragraph("<b>Secretaría de Planeación Distrital:</b>", st["TableCellBold"]), Paragraph("Alineación con el Decreto 1070/2021, PDD y Banco de Proyectos Distrital", st["TableCell"])],
        [Paragraph("<b>Secretaría de Hacienda Distrital:</b>", st["TableCellBold"]), Paragraph("Garantía de viabilidad fiscal, recursos FONSET y cofinanciación SGP", st["TableCell"])],
        [Paragraph("<b>Secretaría de Participación y Desarrollo:</b>", st["TableCellBold"]), Paragraph("Convocatoria comunitaria, enlaces de JAC y salvaguardas étnicas", st["TableCell"])],
    ]
    t_gov = Table(gov_data, colWidths=[180, 360])
    t_gov.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_ALT),
        ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_gov)
    story.append(PageBreak())

    # ------------------ PÁGINA 3: CAPÍTULO 1 - EL TRÁNSITO DOCTRINAL ------------------
    story.append(Paragraph("Capítulo 1: El Tránsito Doctrinal hacia la Seguridad Humana", st["H1"]))
    story.append(Paragraph(
        "El concepto de Seguridad Humana fue introducido en el concierto internacional por el Programa de las Naciones Unidas "
        "para el Desarrollo (PNUD) en 1994 y formalmente refrendado por la Asamblea General de la ONU en la Resolución 66/290 de 2012. "
        "Establece una ruptura con la visión tradicional estado-céntrica y militarizada, situando a la <b>persona y su comunidad</b> "
        "en el centro del quehacer institucional. No sustituye la seguridad del Estado ni la labor constitucional de la fuerza pública, "
        "sino que la complementa asegurando las condiciones socioeconómicas, ambientales y comunitarias mínimas para vivir sin miedo.",
        st["Body"]
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Los Tres Pilares Universales de las Naciones Unidas", st["H2"]))
    pilares_data = [
        [
            Paragraph("<b>1. LIBRE DE TEMOR</b><br/><font color='#DC2626'><i>Freedom from Fear</i></font>", st["BodyBold"]),
            Paragraph(
                "Protege a las personas contra amenazas violentas directas: homicidios, extorsión a tiendas barriales, reclutamiento "
                "de adolescentes por estructuras multicrimen, microtráfico en entornos escolares y violencia intrafamiliar. "
                "Su foco no es solo la judicialización, sino el desmantelamiento temprano de los factores que alimentan la violencia.",
                st["TableCell"]
            )
        ],
        [
            Paragraph("<b>2. LIBRE DE NECESIDAD</b><br/><font color='#D97706'><i>Freedom from Want</i></font>", st["BodyBold"]),
            Paragraph(
                "Garantiza que el hambre, la falta de agua potable, el desempleo estructural y la precariedad habitacional dejen de ser "
                "combustible para la delincuencia. Ningún territorio puede estar seguro si sus jóvenes carecen de oportunidades de "
                "capacitación técnica o si las familias dependen de la usura del 'gota a gota' para surtir sus negocios familiares.",
                st["TableCell"]
            )
        ],
        [
            Paragraph("<b>3. VIVIR CON DIGNIDAD</b><br/><font color='#059669'><i>Freedom to Live in Dignity</i></font>", st["BodyBold"]),
            Paragraph(
                "Asegura el pleno respeto de los derechos fundamentales, la no discriminación étnica, racial y de género, el fin de "
                "la revictimización y el ejercicio real del poder vinculante de la ciudadanía. Un ciudadano empoderado que co-diseña "
                "el destino de su barrio es el mejor guardián de la convivencia pacífica.",
                st["TableCell"]
            )
        ],
    ]
    t_pil = Table(pilares_data, colWidths=[150, 390])
    t_pil.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_pil)
    story.append(Spacer(1, 10))

    story.append(Paragraph("El Fundamento Constitucional Colombiano: Sentencia C-150 de 2015", st["H2"]))
    story.append(Paragraph(
        "En Colombia, la participación ciudadana no es un trámite protocolario ni una concesión graciosa de los gobernantes. "
        "La Corte Constitucional, mediante la emblemática <b>Sentencia C-150 de 2015</b> (revisión de la Ley 1757 de 2015), fijó doctrina "
        "reiterando que la participación ciudadana es un <b>derecho fundamental vinculante</b>. Las administraciones públicas tienen la "
        "obligación de diseñar canales transparentes de deliberación, motivar técnicamente la aceptación o rechazo de los aportes "
        "comunitarios y rendir cuentas periódicas. POLIS materializa este mandato constitucional al asignarle fe pública a cada propuesta.",
        st["Body"]
    ))
    story.append(PageBreak())

    # ------------------ PÁGINA 4: CAPÍTULO 2 - CUADRO COMPARATIVO ------------------
    story.append(Paragraph("Capítulo 2: Cuadro Comparativo de Paradigma", st["H1"]))
    story.append(Paragraph(
        "Para erradicar la confusión común entre funcionarios y ciudadanos, este cuadro sintetiza qué NO es la Política de Seguridad Humana "
        "frente a lo que verdaderamente SÍ representa en el Distrito de Cartagena de Indias:",
        st["Body"]
    ))
    story.append(Spacer(1, 6))

    comp_rows = [
        [
            Paragraph("<b>ASPECTO</b>", st["TableHead"]),
            Paragraph("<b>¿QUÉ NO ES LA POLÍTICA DE SEGURIDAD HUMANA?</b>", st["TableHead"]),
            Paragraph("<b>¿QUÉ SÍ ES LA SEGURIDAD HUMANA INTEGRAL?</b>", st["TableHead"])
        ],
        [
            Paragraph("<b>Enfoque Doctrinal</b>", st["TableCellBold"]),
            Paragraph("No es un plan exclusivamente policial ni una estrategia de militarización permanente del territorio.", st["TableCell"]),
            Paragraph("Es un modelo multidimensional que ataca las causas profundas: hambre, desempleo, inundaciones y exclusión.", st["TableCell"])
        ],
        [
            Paragraph("<b>Instrumento</b>", st["TableCellBold"]),
            Paragraph("No es un documento teórico de archivo elaborado por consultores para cumplir un requisito legal o trámite de escritorio.", st["TableCell"]),
            Paragraph("Es un ejercicio práctico y vivo de acción comunitaria concertado en el barrio para transformar la vida cotidiana.", st["TableCell"])
        ],
        [
            Paragraph("<b>Participación</b>", st["TableCellBold"]),
            Paragraph("No son reuniones informativas donde el funcionario habla y los vecinos asisten como espectadores pasivos.", st["TableCell"]),
            Paragraph("Es deliberación vinculante con fe pública: cada propuesta genera radicado oficial y respuesta motivada obligatoria.", st["TableCell"])
        ],
        [
            Paragraph("<b>Manejo del Delito</b>", st["TableCellBold"]),
            Paragraph("No es impunidad ni condescendencia con las estructuras criminales ni abandono de la persecución penal.", st["TableCell"]),
            Paragraph("Es articulación de la justicia con prevención temprana del reclutamiento infantil y oportunidades reales para jóvenes.", st["TableCell"])
        ],
        [
            Paragraph("<b>Planeación</b>", st["TableCellBold"]),
            Paragraph("No son promesas electorales aisladas ni listas improvisadas de peticiones sin sustento financiero.", st["TableCell"]),
            Paragraph("Es articulación rigurosa con el Decreto 1070/2021, el PDD y el Banco de Proyectos con respaldo en FONSET y SGP.", st["TableCell"])
        ],
        [
            Paragraph("<b>Territorio</b>", st["TableCellBold"]),
            Paragraph("No es un programa centralista concentrado en el Centro Histórico y Bocagrande olvidando el cordón de pobreza.", st["TableCell"]),
            Paragraph("Se propone presencia en barrios, corregimientos e islas: de Nelson Mandela a Tierrabomba y Bayunca. La cobertura efectivamente alcanzada se verifica con actas y registros de cada corte.", st["TableCell"])
        ],
        [
            Paragraph("<b>Veeduría</b>", st["TableCellBold"]),
            Paragraph("No es opacidad ni desinformación sobre el gasto de recursos o el destino de las obras prometidas.", st["TableCell"]),
            Paragraph("Es trazabilidad abierta con código QR y Geovisor en tiempo real para que la JAC audite cada peso ejecutado.", st["TableCell"])
        ],
    ]
    t_comp = Table(comp_rows, colWidths=[90, 225, 225])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
        ('TEXTCOLOR', (1,1), (1,-1), C_ROSE),
        ('TEXTCOLOR', (2,1), (2,-1), C_EMERALD),
    ]))
    story.append(t_comp)
    story.append(PageBreak())

    # ------------------ PÁGINA 5: CAPÍTULO 3 - LAS 7 DIMENSIONES EN CARTAGENA ------------------
    story.append(Paragraph("Capítulo 3: Las Siete (7) Dimensiones Integrales en Cartagena", st["H1"]))
    story.append(Paragraph(
        "Alineadas con la doctrina internacional pero contextualizadas a la realidad geográfica, social y económica de Cartagena de Indias, "
        "la política pública estructura su acción en siete dimensiones interdependientes:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    dim_rows = [
        [
            Paragraph("<b>DIMENSIÓN</b>", st["TableHead"]),
            Paragraph("<b>DESAFÍO CRÍTICO EN CARTAGENA</b>", st["TableHead"]),
            Paragraph("<b>LÍNEA DE ACCIÓN PROPUESTA</b>", st["TableHead"]),
            Paragraph("<b>ENTIDAD RESPONSABLE</b>", st["TableHead"])
        ],
        [
            Paragraph("<b>1. Económica</b>", st["TableCellBold"]),
            Paragraph("Desocupación de 14,1 % e informalidad de 50,2 % (oct–dic 2025, GEIH-DANE, cabecera); la informalidad fue 47,5 % en jun–ago 2026 (parcial).", st["TableCell"]),
            Paragraph("Bancos barriales de microcrédito productivo para sustituir el 'gota a gota' y empleo joven.", st["TableCell"]),
            Paragraph("Secretaría de Hacienda / Desarrollo Económico", st["TableCell"])
        ],
        [
            Paragraph("<b>2. Alimentaria</b>", st["TableCellBold"]),
            Paragraph("Inseguridad alimentaria moderada o grave en el 28,1 % de la población (2024, DANE SAE, estimación experimental).", st["TableCell"]),
            Paragraph("Comedores comunitarios sostenibles en UCGs críticas y canastas agroecológicas con corregimientos.", st["TableCell"]),
            Paragraph("Plan de Emergencia Social (PES) / Gestión Social", st["TableCell"])
        ],
        [
            Paragraph("<b>3. En Salud</b>", st["TableCellBold"]),
            Paragraph("Incidencia de dengue de 713,24 por 100.000 hab. en riesgo en 2024 (INS-SIVIGILA, vía TerriData). Mortalidad materna: pendiente de estadísticas vitales (DANE).", st["TableCell"]),
            Paragraph("Equipos extramurales de salud mental barrial y mejoramiento de infraestructura básica del CAP.", st["TableCell"]),
            Paragraph("DADIS (Departamento Administrativo de Salud)", st["TableCell"])
        ],
        [
            Paragraph("<b>4. Ambiental</b>", st["TableCellBold"]),
            Paragraph("IRCA de 2,8 en 2024, nivel «Sin riesgo» (INS-SIVICAP). El inventario de puntos críticos de inundación sigue pendiente (Oficina de Gestión del Riesgo).", st["TableCell"]),
            Paragraph("Limpieza comunitaria de caños, alertas tempranas por lluvia y dragado de canales pluviales.", st["TableCell"]),
            Paragraph("OAGRD / EPA Cartagena / Sec. de Infraestructura", st["TableCell"])
        ],
        [
            Paragraph("<b>5. Personal</b>", st["TableCellBold"]),
            Paragraph("Homicidio intencional: 35,4 por 100.000 hab. en 2025 (Policía Nacional y proyección DANE); cifra preliminar.", st["TableCell"]),
            Paragraph("Prevención temprana, mediación de conflictos, iluminación de puntos ciegos y coordinación con la Policía Metropolitana.", st["TableCell"]),
            Paragraph("Secretaría del Interior / Policía Metropolitana", st["TableCell"])
        ],
        [
            Paragraph("<b>6. Comunitaria</b>", st["TableCellBold"]),
            Paragraph("Percepción de inseguridad: 37,7 % en el barrio y 75,1 % en la ciudad (2024, ECSC-DANE, cabecera).", st["TableCell"]),
            Paragraph("Mediación comunitaria y adecuación de espacios de encuentro con las Juntas de Acción Comunal.", st["TableCell"]),
            Paragraph("Escuela de Gobierno / IDER / Sec. de Participación", st["TableCell"])
        ],
        [
            Paragraph("<b>7. Política</b>", st["TableCellBold"]),
            Paragraph("POLIS aún no mide el porcentaje de aportes con respuesta motivada; la línea base se generará con el primer corte.", st["TableCell"]),
            Paragraph("Radicación vinculante con fe pública en POLIS y audiencias semestrales de rendición de cuentas.", st["TableCell"]),
            Paragraph("Secretaría de Planeación / Control Disciplinario", st["TableCell"])
        ],
    ]
    t_dim = Table(dim_rows, colWidths=[80, 160, 180, 120])
    t_dim.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
    ]))
    story.append(t_dim)
    story.append(PageBreak())

    # ------------------ PÁGINA 6: CAPÍTULO 4 - METODOLOGÍA Y POLIS ------------------
    story.append(Paragraph("Capítulo 4: Programación de mesas comunitarias y POLIS", st["H1"]))
    story.append(Paragraph(
        "La Política de Seguridad Humana no se construye detrás de un escritorio ni mediante encuestas telefónicas. "
        "La programación local propone <b>35 mesas territoriales, rurales, sectoriales y poblacionales</b> "
        "en las tres localidades de Cartagena, los corregimientos rurales y el cordón insular.",
        st["Body"]
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("La Ruta Metodológica en Cuatro (4) Fases", st["H2"]))
    fases_data = [
        [
            Paragraph("<b>FASE 1: CONVOCATORIA AMPLIA</b><br/><font color='#0284C7'>En el Barrio y la Calle</font>", st["BodyBold"]),
            Paragraph("Convocatoria pública a JAC, comités de juventud, asociaciones de mujeres, madres comunitarias, comerciantes de barrio y líderes religiosos. Cero requisitos de afiliación política partidista.", st["TableCell"])
        ],
        [
            Paragraph("<b>FASE 2: MAPEO DE VULNERABILIDADES</b><br/><font color='#D97706'>Diagnóstico en Geovisor</font>", st["BodyBold"]),
            Paragraph("La propia comunidad marca en el Geovisor interactivo de POLIS los puntos críticos: focos de atraco, canales desbordados, luminarias quemadas o lotes baldíos usados como botaderos.", st["TableCell"])
        ],
        [
            Paragraph("<b>FASE 3: CO-DISEÑO Y RADICACIÓN</b><br/><font color='#DC2626'>Fe Pública Inmediata</font>", st["BodyBold"]),
            Paragraph("Formulación conjunta de la propuesta barrial por dimensión. Registro digital en POLIS con generación instantánea de comprobante de radicado y código QR entregado a los voceros.", st["TableCell"])
        ],
        [
            Paragraph("<b>FASE 4: DEVOLUCIÓN MOTIVADA</b><br/><font color='#059669'>Acuerdos Vinculantes</font>", st["BodyBold"]),
            Paragraph("La administración debe responder de forma motivada dentro de los términos legales aplicables. Las propuestas viables se incorporan al Plan de Acción según disponibilidad presupuestal (FONSET, SGP u otras fuentes).", st["TableCell"])
        ],
    ]
    t_fases = Table(fases_data, colWidths=[160, 380])
    t_fases.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_fases)
    story.append(Spacer(1, 10))

    story.append(Paragraph("¿Qué es la Fe Pública de POLIS?", st["H2"]))
    story.append(Paragraph(
        "En los modelos tradicionales de participación, los ciudadanos entregaban cartas y firmas que se extraviaban "
        "en los archivos distritales sin dejar constancia. POLIS incorpora el concepto legal de <b>Fe Pública Digital</b>: "
        "cada radicado ingresado adquiere valor probatorio administrativo. Si la Alcaldía no contesta dentro de los plazos "
        "legales previstos en la Ley 1757 de 2015, los entes de control (Personería Distrital y Procuraduría) pueden intervenir "
        "por vulneración del derecho fundamental a la participación y respuesta motivada.",
        st["Body"]
    ))
    story.append(PageBreak())

    # ------------------ PÁGINA 7: CAPÍTULO 5 - 10 PREGUNTAS CLAVE ------------------
    story.append(Paragraph("Capítulo 5: Las Diez (10) Preguntas Clave del ABC Ciudadano", st["H1"]))
    story.append(Paragraph(
        "Respuestas directas y claras a las inquietudes más frecuentes de los cartageneros sobre la política pública:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    faqs = [
        ("1. ¿Qué es exactamente la Seguridad Humana?",
         "Es un enfoque de gobierno que protege la vida y la dignidad integral de las familias: no solo con patrullas policiales, sino garantizando alimentación, salud, empleo, ambiente sano y voz con poder vinculante en el barrio."),
        ("2. ¿Esto significa que ya no habrá policía ni capturas?",
         "No. La Policía Metropolitana y la Fiscalía continúan con su misión constitucional de combatir el delito. La Seguridad Humana complementa su labor atacando las causas del delito: sin hambre y con empleo juvenil, la criminalidad se desactiva."),
        ("3. ¿Quién puede radicar una propuesta en POLIS?",
         "Cualquier ciudadano, Junta de Acción Comunal (JAC), organización de mujeres, jóvenes, pescadores o comerciantes de los barrios, corregimientos e islas de Cartagena. No se requiere tramitador ni costo económico."),
        ("4. ¿Qué significa que mi propuesta tenga 'Fe Pública'?",
         "Significa que tu radicado es una prueba legal oficial. La Alcaldía de Cartagena tiene la obligación jurídica de responderte por escrito explicando la viabilidad técnica y presupuestal de la obra solicitada."),
        ("5. ¿De dónde saldrá el dinero para financiar estas obras?",
         "De fuentes públicas distritales aseguradas: Fondo Territorial de Seguridad (FONSET), Sistema General de Participaciones (SGP), recursos propios y regalías articulados en el Plan de Desarrollo Distrital."),
        ("6. ¿Cómo se eligen los barrios donde se inician las obras?",
         "A través de datos objetivos: el Geovisor cruza los índices de homicidio, desnutrición infantil, zonas de inundación y las propuestas radicadas por la comunidad, priorizando donde la necesidad es más urgente."),
        ("7. ¿Cómo puedo consultar el estado de mi propuesta?",
         "Ingresando al portal público POLIS con el número de radicado o escaneando el código QR impreso en el comprobante oficial entregado en la mesa de concertación."),
        ("8. ¿Qué papel juegan las Juntas de Acción Comunal (JAC)?",
         "Son las aliadas estratégicas centrales: convocan las asambleas barriales, priorizan las necesidades del sector y ejercen la veeduría social para vigilar que el contratista cumpla los acuerdos."),
        ("9. ¿Qué pasa si una propuesta es rechazada por el Distrito?",
         "La administración está obligada a emitir una Devolución Motivada indicando las razones técnicas o normativas del rechazo y proponiendo alternativas viables para resolver la problemática planteada."),
        ("10. ¿Cómo me entero de la fecha de la mesa en mi barrio?",
         "A través del portal web de POLIS, las carteleras de la Junta de Acción Comunal de tu barrio, los canales de WhatsApp comunitarios y las visitas de los facilitadores distritales en territorio."),
    ]

    faq_cells = []
    for q, a in faqs:
        faq_cells.append([Paragraph(f"<b>{q}</b>", st["H3"])])
        faq_cells.append([Paragraph(a, st["TableCell"])])
    t_faq = Table(faq_cells, colWidths=[540])
    t_faq.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_faq)
    story.append(PageBreak())

    # ------------------ PÁGINA 8: CAPÍTULO 6 - GLOSARIO Y DIRECTORIO ------------------
    story.append(Paragraph("Capítulo 6: Glosario Técnico y Directorio Distrital", st["H1"]))
    story.append(Paragraph(
        "Glosario para comprender la terminología de la política pública y directorio de canales oficiales de atención:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    glosario_items = [
        ("Devolución Motivada:", "Obligación de la autoridad de fundamentar por escrito y con razones jurídicas y financieras cada respuesta a un aporte ciudadano."),
        ("FONSET:", "Fondo Territorial de Seguridad y Convivencia Ciudadana, cuenta especial para financiar obras preventivas y operativas."),
        ("Geovisor Territorial:", "Herramienta digital interactiva de POLIS que mapea riesgos socioambientales en tiempo real sobre el mapa de Cartagena."),
        ("POT de Cartagena:", "Instrumento de ordenamiento cuya delimitación y vigencia deben verificarse por versión. Los conteos de capas recibidas se identifican en las referencias territoriales de este documento."),
        ("Sentencia C-150 de 2015:", "Fallo de la Corte Constitucional que declaró la participación ciudadana como un derecho fundamental vinculante en Colombia."),
    ]
    g_cells = []
    for term, defn in glosario_items:
        g_cells.append([Paragraph(f"<b>{term}</b> {defn}", st["TableCell"])])
    t_glo = Table(g_cells, colWidths=[540])
    t_glo.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_ALT),
        ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_glo)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Directorio de Contacto Institucional y Veeduría", st["H2"]))
    dir_data = [
        [Paragraph("<b>Entidad</b>", st["TableHead"]), Paragraph("<b>Dependencia / Enlace</b>", st["TableHead"]), Paragraph("<b>Canal de Atención</b>", st["TableHead"])],
        [Paragraph("<b>Alcaldía Mayor de Cartagena</b>", st["TableCellBold"]), Paragraph("Despacho del Alcalde / Dirección de Participación", st["TableCell"]), Paragraph("Palacio de la Aduana, Plaza de la Aduana", st["TableCell"])],
        [Paragraph("<b>Sec. del Interior y Convivencia</b>", st["TableCellBold"]), Paragraph("Programa de Seguridad Humana y Convivencia", st["TableCell"]), Paragraph("Sitio institucional: cartagena.gov.co", st["TableCell"])],
        [Paragraph("<b>Sec. de Planeación Distrital</b>", st["TableCellBold"]), Paragraph("Dirección de Políticas Públicas y POT", st["TableCell"]), Paragraph("Sitio institucional: planeacion.cartagena.gov.co", st["TableCell"])],
        [Paragraph("<b>Personería Distrital</b>", st["TableCellBold"]), Paragraph("Veeduría Ciudadana y Derechos Humanos", st["TableCell"]), Paragraph("Canales oficiales de la Personería (verificar vigencia)", st["TableCell"])],
        [Paragraph("<b>POLIS Plataforma Digital</b>", st["TableCellBold"]), Paragraph("Módulo Ciudadano de Seguridad Humana", st["TableCell"]), Paragraph("https://seguridadhumanaintegral.org/seguridad-humana", st["TableCell"])],
    ]
    t_dir = Table(dir_data, colWidths=[160, 190, 190])
    t_dir.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
    ]))
    story.append(t_dir)
    story.append(Spacer(1, 14))

    final_box = [
        [Paragraph("<b>COMPROMISO CON LA TRANSPARENCIA:</b> Este documento fue producido por POLIS como parte de su estrategia de democratización del conocimiento sobre seguridad humana. Si un funcionario se niega a recibir o tramitar tu propuesta con fe pública, puedes reportarlo inmediatamente ante la Personería Distrital.", st["Callout"])]
    ]
    t_fin = Table(final_box, colWidths=[540])
    t_fin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_EMBER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_EMBER),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_fin)

    agregar_referencias_territoriales(story, st)
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generado exitosamente: {pdf_path}")


# ===========================================================================
# DOCUMENTO 2: PRESENTACIÓN DE DIAGNÓSTICO BARRIAL (10 DIAPOSITIVAS VISUALES EJECUTIVAS)
# ===========================================================================
def generar_doc_presentacion():
    pdf_path = os.path.join(OUTPUT_DIR, "PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf")
    doc = SimpleDocTemplate(
        pdf_path, pagesize=landscape(letter),
        leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36
    )
    st = STYLES
    story = []

    # =========================================================================
    # DIAPOSITIVA 1: PORTADA EJECUTIVA (DARK THEME)
    # =========================================================================
    meta_cards = [
        [
            Table([
                [Paragraph("<b>MARCO UNIVERSAL ONU</b>", st["CoverMetaCardTitle"])],
                [Paragraph("Resolución ONU 66/290 • Sentencia C-150 de 2015 • Ley Estatutaria 1757 de 2015", st["CoverMetaCardText"])],
            ], colWidths=[218]),
            Table([
                [Paragraph("<font color='#F59E0B'><b>COBERTURA DISTRITAL</b></font>", st["CoverMetaCardTitle"])],
                [Paragraph("Cartagena • Programación local de 35 mesas • Cobertura territorial por verificar", st["CoverMetaCardText"])],
            ], colWidths=[218]),
            Table([
                [Paragraph("<font color='#10B981'><b>FE PÚBLICA Y VINCULATORIEDAD</b></font>", st["CoverMetaCardTitle"])],
                [Paragraph("Priorización Barrial con Radicado Atómico Inmutable y Trazabilidad Forense QR", st["CoverMetaCardText"])],
            ], colWidths=[218]),
        ]
    ]
    t_meta = Table(meta_cards, colWidths=[226, 226, 226])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('LINEABOVE', (0,0), (0,0), 3, colors.HexColor("#38BDF8")),
        ('LINEABOVE', (1,0), (1,0), 3, colors.HexColor("#F59E0B")),
        ('LINEABOVE', (2,0), (2,0), 3, colors.HexColor("#10B981")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))

    d1_card = [
        [Paragraph("<font color='#F59E0B'><b>POLIS</b></font> &nbsp;•&nbsp; <font color='#38BDF8'>PLATAFORMA PARA LA CONSTRUCCIÓN DE POLÍTICAS PÚBLICAS</font>", st["CoverPill"])],
        [Spacer(1, 10)],
        [Paragraph("DIAGNÓSTICO MULTIDIMENSIONAL DE SEGURIDAD HUMANA INTEGRAL", st["CoverTitle"])],
        [Paragraph("Guía Ejecutiva en Diapositivas para Facilitadores, Asambleas Barriales y Juntas de Acción Comunal (2026–2036)", st["CoverSub"])],
        [Spacer(1, 8)],
        [
            Table([
                [Paragraph("<b>LEMA INSTITUCIONAL DISTRITAL:</b><br/><i>«Poner la vida, la justicia social y la dignidad de las comunidades en el centro absoluto de las decisiones de gobierno.»</i>", st["CoverQuote"])]
            ], colWidths=[678], style=[
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
                ('PADDING', (0,0), (-1,-1), 10),
            ])
        ],
        [Spacer(1, 14)],
        [t_meta]
    ]
    t_d1 = Table(d1_card, colWidths=[720])
    t_d1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 2, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(t_d1)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 2: EL GRAN GIRO DOCTRINAL (COMPARATIVA VISUAL)
    # =========================================================================
    story.append(Paragraph("Del Control Punitivo Reactivo a la Protección Integral de la Vida y el Territorio", st["SlideActionTitle"]))
    story.append(Paragraph("Cartagena rompe con la doctrina caduca que reduce la seguridad ciudadana a patrullas y requisas policiales", st["SlideSubAction"]))

    card_punitivo = Table([
        [Paragraph("<font color='#DC2626'><b>❌ MODELO POLICIAL TRADICIONAL (CADUCO)</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Centro de Protección:</b> El Estado, edificios administrativos y áreas comerciales, desatendiendo la periferia urbana.", st["CardTextSm"])],
        [Paragraph("• <b>Respuesta Operativa:</b> Reacción armada tardía cuando el delito ya ocurrió; capturas masivas y requisas aleatorias.", st["CardTextSm"])],
        [Paragraph("• <b>Tratamiento de Causas:</b> Ignora el hambre, la falta de alcantarillado y el desempleo juvenil considerándolos ajenos al delito.", st["CardTextSm"])],
        [Paragraph("• <b>Rol del Ciudadano:</b> Informante pasivo sin poder decisorio ni respuesta obligatoria a sus denuncias.", st["CardTextSm"])],
        [Paragraph("• <b>Criterio de Evaluación:</b> Conteo de capturados e incautaciones (cifras reactivas que no reducen el homicidio ni el miedo).", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF5F5")),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FECACA")),
        ('PADDING', (0,0), (-1,-1), 10),
    ])

    card_seg_humana = Table([
        [Paragraph("<font color='#059669'><b>✔ DOCTRINA DE SEGURIDAD HUMANA INTEGRAL (POLIS)</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Centro de Protección:</b> La persona, la familia y la comunidad viva en sus calles, caños, corregimientos e islas.", st["CardTextSm"])],
        [Paragraph("• <b>Respuesta Operativa:</b> Prevención temprana, salud mental, inclusión productiva y mediación comunitaria de paz.", st["CardTextSm"])],
        [Paragraph("• <b>Tratamiento de Causas:</b> Erradica el hambre infantil (comedores PES), combate el 'gota a gota' y mitiga canales pluviales.", st["CardTextSm"])],
        [Paragraph("• <b>Rol del Ciudadano:</b> Actor protagónico vinculante amparado en la Ley 1757 de 2015 y la Sentencia C-150 de 2015.", st["CardTextSm"])],
        [Paragraph("• <b>Criterio de Evaluación:</b> Disminución real de homicidios, calidad de vida barrial y proyectos concertados ejecutados.", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#A7F3D0")),
        ('PADDING', (0,0), (-1,-1), 10),
    ])

    t_giro = Table([[card_punitivo, card_seg_humana]], colWidths=[355, 355])
    t_giro.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_giro)
    story.append(Spacer(1, 10))

    banner_giro = Table([[
        Paragraph("<b>HALLAZGO CENTRAL:</b> El 75,1 % de la población de 15 años y más percibe inseguridad en la ciudad, pero el 37,7 % la percibe en su propio barrio (ECSC-DANE 2024, cabecera). La seguridad no se agota en las patrullas: se construye con datos, con el barrio y con respuesta institucional.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_CYAN_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_CYAN),
        ('PADDING', (0,0), (-1,-1), 7),
    ])
    story.append(banner_giro)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 3: LOS TRES PILARES UNIVERSALES DE LA ONU (RES. 66/290)
    # =========================================================================
    story.append(Paragraph("Tres Libertades Universales que Rigen la Inversión Pública en Cartagena", st["SlideActionTitle"]))
    story.append(Paragraph("Resolución 66/290 de la Asamblea General de las Naciones Unidas articulada a los desafíos de las tres localidades", st["SlideSubAction"]))

    card_p1 = Table([
        [Paragraph("<font color='#DC2626'><b>1. LIBRE DE TEMOR</b></font><br/><font color='#64748B'>Seguridad Personal y Convivencia</font>", st["CardTitleSm"])],
        [Spacer(1, 2)],
        [Paragraph("<b>Propósito:</b> Erradicar la violencia física, el desarme barrial y contener el sicariato.", st["CardTextSm"])],
        [Paragraph("• Vigilancia comunitaria coordinada con la Policía.<br/>• Blindaje de entornos escolares vs. microtráfico.<br/>• Mediación de conflictos y desarme de jóvenes.<br/>• Desarticulación de extorsiones a tiendas.", st["CardTextSm"])],
        [Spacer(1, 4)],
        [Paragraph("<font color='#DC2626'><b>Indicador:</b></font> 35,4 homicidios por 100 mil hab. (2025). Meta: por fijar en el Plan de Acción.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 9),
    ])

    card_p2 = Table([
        [Paragraph("<font color='#D97706'><b>2. LIBRE DE NECESIDAD</b></font><br/><font color='#64748B'>Condiciones Materiales y Hábitat</font>", st["CardTitleSm"])],
        [Spacer(1, 2)],
        [Paragraph("<b>Propósito:</b> Asegurar alimentación, empleo digno, salud y resiliencia climática.", st["CardTextSm"])],
        [Paragraph("• Comedores comunitarios del Plan de Emergencia Social.<br/>• Microcrédito popular vs. 'gota a gota'.<br/>• Dragado urgente de canales antes de lluvias.<br/>• Agua potable en corregimientos e islas.", st["CardTextSm"])],
        [Spacer(1, 4)],
        [Paragraph("<font color='#D97706'><b>Indicador:</b></font> 28,1 % de inseguridad alimentaria moderada o grave (2024). Meta: por fijar.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 9),
    ])

    card_p3 = Table([
        [Paragraph("<font color='#0284C7'><b>3. VIVIR CON DIGNIDAD</b></font><br/><font color='#64748B'>Derechos Humanos, Voz y Fe Pública</font>", st["CardTitleSm"])],
        [Spacer(1, 2)],
        [Paragraph("<b>Propósito:</b> Empoderamiento social, justicia oportuna y fe pública digital.", st["CardTextSm"])],
        [Paragraph("• Radicación vinculante con código QR en POLIS.<br/>• Respuesta motivada dentro de los términos legales.<br/>• Salvaguardas étnicas en comunidades afro.<br/>• Rutas de atención frente a violencias de género.", st["CardTextSm"])],
        [Spacer(1, 4)],
        [Paragraph("<font color='#0284C7'><b>Indicador:</b></font> aportes con respuesta motivada. Línea base: se medirá en POLIS. Meta: por fijar.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 9),
    ])

    t_pil = Table([[card_p1, card_p2, card_p3]], colWidths=[236, 236, 236])
    t_pil.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_pil)
    story.append(Spacer(1, 10))

    banner_pil = Table([[
        Paragraph("<b>ENFOQUE INTEGRAL INDIVISIBLE:</b> Los 3 pilares operan de forma simultánea. No es viable erradicar el miedo sin proveer ingresos dignos a los jóvenes, ni puede haber dignidad comunitaria sin seguridad física efectiva en el barrio.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_EMBER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_EMBER),
        ('PADDING', (0,0), (-1,-1), 7),
    ])
    story.append(banner_pil)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 4: EL TERRITORIO EN CIFRAS (DASHBOARD DE KPIS DE ALTO IMPACTO)
    # =========================================================================
    story.append(Paragraph("Cartagena en Cifras: Diagnóstico Crítico que Justifica la Intervención", st["SlideActionTitle"]))
    story.append(Paragraph("Cifras oficiales del municipio de Cartagena (DANE, Policía Nacional). No están desagregadas por barrio", st["SlideSubAction"]))

    kpi1 = Table([
        [Paragraph("<font color='#DC2626'><b>14,1%</b></font>", st["SlideKpiNum"])],
        [Paragraph("TASA DE DESOCUPACIÓN", st["SlideKpiTitle"])],
        [Paragraph("Trimestre móvil oct–dic 2025, cabecera de Cartagena (GEIH, DANE). La informalidad fue 50,2 % (oct–dic 2025) y 47,5 % (jun–ago 2026, parcial). El dato por edad no está en el banco de fuentes.", st["SlideKpiText"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    kpi2 = Table([
        [Paragraph("<font color='#D97706'><b>28,1%</b></font>", st["SlideKpiNum"])],
        [Paragraph("INSEGURIDAD ALIMENTARIA MODERADA O GRAVE", st["SlideKpiTitle"])],
        [Paragraph("Población en 2024; intervalo de confianza 95 %: 23,4 a 32,8 (DANE SAE, estimación experimental municipal).", st["SlideKpiText"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    kpi3 = Table([
        [Paragraph("<font color='#0F172A'><b>35,4</b></font>", st["SlideKpiNum"])],
        [Paragraph("HOMICIDIOS POR 100K HAB.", st["SlideKpiTitle"])],
        [Paragraph("2025: 358 casos de homicidio intencional (Policía Nacional) sobre 1.011.520 hab. (proyección DANE). Cifra preliminar. Medicina Legal registró 411 casos en 2024, otro universo.", st["SlideKpiText"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_kpi_r1 = Table([[kpi1, kpi2, kpi3]], colWidths=[236, 236, 236])
    t_kpi_r1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_kpi_r1)
    story.append(Spacer(1, 8))

    kpi4 = Table([
        [Paragraph("<font color='#0284C7'><b>34,6%</b></font>", st["SlideKpiNum"])],
        [Paragraph("POBREZA MONETARIA", st["SlideKpiTitle"])],
        [Paragraph("Incidencia en 2025 (DANE, pobreza monetaria). En 2024 fue 41,1 % y en 2023, 42,8 %. El NBI censal 2018 fue de 12,5 %.", st["SlideKpiText"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    kpi5 = Table([
        [Paragraph("<font color='#059669'><b>Barrios, corregimientos e islas</b></font>", st["SlideKpiNum"])],
        [Paragraph("35 MESAS EN LA PROGRAMACIÓN LOCAL", st["SlideKpiTitle"])],
        [Paragraph("Programación territorial, rural, sectorial y poblacional. La cobertura y las reuniones realizadas se acreditan con actas de cada corte.", st["SlideKpiText"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_kpi_r2 = Table([[kpi4, kpi5]], colWidths=[355, 355])
    t_kpi_r2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_kpi_r2)
    story.append(Spacer(1, 8))

    banner_kpi = Table([[
        Paragraph("<b>SÍNTESIS DIAGNÓSTICA:</b> Estas cifras describen la ciudad en su conjunto y no permiten señalar barrios. Fuentes: DANE (GEIH oct–dic 2025; pobreza monetaria 2025; SAE 2024), Policía Nacional (2025) y proyecciones de población DANE. Son estimaciones sujetas a revisión; no establecen relaciones de causa y efecto.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 7),
    ])
    story.append(banner_kpi)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 5: LAS 7 DIMENSIONES EN ACCIÓN
    # =========================================================================
    story.append(Paragraph("Las Siete (7) Dimensiones Integrales: Corresponsabilidad Distrital", st["SlideActionTitle"]))
    story.append(Paragraph("Líneas base verificadas, metas por fijar y dependencias líderes propuestas (Decreto 1070/2021)", st["SlideSubAction"]))

    d_card1 = Table([
        [Paragraph("<font color='#DC2626'><b>1. Personal</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> 35,4 hom./100 mil (2025)<br/>• <b>Meta:</b> por fijar<br/>• <b>Líder propuesto:</b> Interior / Policía", st["CardTextSm"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    d_card2 = Table([
        [Paragraph("<font color='#EA580C'><b>2. Comunitaria</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> 37,7% percibe inseguridad en su barrio (2024)<br/>• <b>Meta:</b> por fijar<br/>• <b>Líder propuesto:</b> Interior / IDER", st["CardTextSm"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor("#EA580C")),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    d_card3 = Table([
        [Paragraph("<font color='#D97706'><b>3. Económica</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> 14,1% desocupación; 50,2% informalidad (oct–dic 2025; 47,5% jun–ago 2026, parcial)<br/>• <b>Meta:</b> por fijar<br/>• <b>Líder propuesto:</b> por confirmar", st["CardTextSm"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    d_card4 = Table([
        [Paragraph("<font color='#059669'><b>4. Ambiental</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> IRCA 2,8 (2024); inventario de inundaciones pendiente<br/>• <b>Meta:</b> por fijar<br/>• <b>Líder propuesto:</b> OAGRD / Infraestructura", st["CardTextSm"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    t_dim_r1 = Table([[d_card1, d_card2, d_card3, d_card4]], colWidths=[176, 176, 176, 176])
    t_dim_r1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_dim_r1)
    story.append(Spacer(1, 8))

    d_card5 = Table([
        [Paragraph("<font color='#0D9488'><b>5. Seguridad Alimentaria</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> 28,1% inseguridad alimentaria moderada o grave (2024).<br/>• <b>Meta:</b> por fijar en el Plan de Acción.<br/>• <b>Dependencia líder propuesta:</b> Plan de Emergencia Social (PES)", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor("#0D9488")),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    d_card6 = Table([
        [Paragraph("<font color='#0284C7'><b>6. Seguridad en Salud</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> dengue 713,24 por 100 mil hab. en riesgo (2024).<br/>• <b>Meta:</b> por fijar.<br/>• <b>Dependencia líder propuesta:</b> DADIS", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    d_card7 = Table([
        [Paragraph("<font color='#0F172A'><b>7. Política y Fe Pública</b></font>", st["CardTitleSm"])],
        [Paragraph("• <b>Línea Base:</b> POLIS la medirá desde su primer corte.<br/>• <b>Meta:</b> por fijar.<br/>• <b>Dependencia líder propuesta:</b> Secretaría de Planeación Distrital", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3, C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])

    t_dim_r2 = Table([[d_card5, d_card6, d_card7]], colWidths=[236, 236, 236])
    t_dim_r2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_dim_r2)
    story.append(Spacer(1, 8))

    banner_dim = Table([[
        Paragraph("<b>ARTICULACIÓN PRESUPUESTAL POR DEFINIR:</b> Las metas de cada dimensión se asociarán a programas del Plan de Desarrollo Distrital y a fuentes de financiación en el Plan de Acción y el Banco de Proyectos.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_EMERALD_LT),
        ('BOX', (0,0), (-1,-1), 1, C_EMERALD),
        ('PADDING', (0,0), (-1,-1), 6),
    ])
    story.append(banner_dim)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 6: CARTOGRAFÍA DE ALERTAS CRÍTICAS Y GEOVISOR POLIS
    # =========================================================================
    story.append(Paragraph("Focalización Territorial: lo que los datos permiten decir y lo que falta", st["SlideActionTitle"]))
    story.append(Paragraph("Los datos abiertos son municipales: señalar barrios exige datos desagregados y diagnóstico comunitario", st["SlideSubAction"]))

    geo1 = Table([
        [Paragraph("<font color='#DC2626'><b>CABECERA URBANA</b></font><br/><font color='#64748B'>DANE • CNPV 2018 y ECSC 2024</font>", st["CardTitleSm"])],
        [Paragraph("• <b>Lo que dice el dato:</b> NBI de 11,6 % de las personas (2018). El 37,7 % percibe inseguridad en su barrio y el 75,1 % en la ciudad (2024).", st["CardTextSm"])],
        [Paragraph("• <b>Lectura:</b> la percepción en la ciudad casi duplica la del barrio. Las mesas barriales sirven para precisar qué ocurre en cada sector.", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    geo2 = Table([
        [Paragraph("<font color='#D97706'><b>CENTROS POBLADOS Y RURAL DISPERSO</b></font><br/><font color='#64748B'>Corregimientos e islas • DANE CNPV 2018</font>", st["CardTitleSm"])],
        [Paragraph("• <b>Lo que dice el dato:</b> NBI de 20,6 % y miseria de 4,1 % de las personas, frente a 11,6 % y 1,7 % en la cabecera.", st["CardTextSm"])],
        [Paragraph("• <b>Lectura:</b> la privación fuera de la cabecera es casi el doble (dato censal 2018, no serie anual). Donde existan consejos comunitarios aplica la consulta previa.", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_geo_r1 = Table([[geo1, geo2]], colWidths=[355, 355])
    t_geo_r1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_geo_r1)
    story.append(Spacer(1, 8))

    geo3 = Table([
        [Paragraph("<font color='#0284C7'><b>LO QUE EL DATO PÚBLICO NO DICE</b></font><br/><font color='#64748B'>Escala municipal</font>", st["CardTitleSm"])],
        [Paragraph("• <b>Límite:</b> Policía, Medicina Legal y DANE (GEIH, SAE) publican para el municipio, sin UCG, barrio ni coordenadas.", st["CardTextSm"])],
        [Paragraph("• <b>Consecuencia:</b> hoy no es posible ordenar barrios con datos abiertos. POLIS no replica cifras municipales a los barrios.", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    geo4 = Table([
        [Paragraph("<font color='#059669'><b>CÓMO SE COMPLETA LA FOCALIZACIÓN</b></font><br/><font color='#64748B'>Ruta de trabajo</font>", st["CardTitleSm"])],
        [Paragraph("• <b>Mesas barriales:</b> la programación local contempla 35 mesas para recoger diagnóstico comunitario. La realización se acredita con actas; los aportes geográficos se consultan en Datos.", st["CardTextSm"])],
        [Paragraph("• <b>Acceso institucional:</b> se solicita a Policía y Fiscalía la desagregación por UCG; sin ella, el mapa de delitos se mantiene a escala distrital.", st["CardTextSm"])],
    ], colWidths=[345], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_geo_r2 = Table([[geo3, geo4]], colWidths=[355, 355])
    t_geo_r2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_geo_r2)
    story.append(Spacer(1, 8))

    banner_geo = Table([[
        Paragraph("<b>GEOVISOR PÚBLICO:</b> Consulta las capas oficiales disponibles y el avance de los compromisos en <b>https://seguridadhumanaintegral.org/geovisor</b>.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])
    story.append(banner_geo)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 7: RUTA METODOLÓGICA DE LAS 35 MESAS (120 MINUTOS)
    # =========================================================================
    story.append(Paragraph("Metodología Participativa: La Ruta de Co-Diseño Barrial en 4 Momentos", st["SlideActionTitle"]))
    story.append(Paragraph("Protocolo riguroso de deliberación comunitaria para construir acuerdos vinculantes con fe pública", st["SlideSubAction"]))

    step1 = Table([
        [Paragraph("<font color='#0284C7'><b>01</b></font>", st["StepNum"])],
        [Paragraph("<font color='#0284C7'><b>INSTALACIÓN</b></font><br/><font color='#64748B'>00 a 15 Minutos</font>", st["StepTitle"])],
        [Paragraph("Verificación de quórum vecinal, paridad obligatoria de mujeres y jóvenes, lectura de reglas de respeto y presentación de las 7 dimensiones.", st["StepText"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    step2 = Table([
        [Paragraph("<font color='#D97706'><b>02</b></font>", st["StepNum"])],
        [Paragraph("<font color='#D97706'><b>GEO-DIAGNÓSTICO</b></font><br/><font color='#64748B'>15 a 45 Minutos</font>", st["StepTitle"])],
        [Paragraph("Identificación colectiva de problemas en el Geovisor, marcación de zonas de miedo e inundación y registro de testimonios comunitarios.", st["StepText"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    step3 = Table([
        [Paragraph("<font color='#DC2626'><b>03</b></font>", st["StepNum"])],
        [Paragraph("<font color='#DC2626'><b>CO-DISEÑO</b></font><br/><font color='#64748B'>45 a 85 Minutos</font>", st["StepTitle"])],
        [Paragraph("Deliberación en mesas temáticas por dimensión, formulación de iniciativas viables y votación democrática de prioridades de inversión.", st["StepText"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_ROSE),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    step4 = Table([
        [Paragraph("<font color='#059669'><b>04</b></font>", st["StepNum"])],
        [Paragraph("<font color='#059669'><b>RADICADO QR</b></font><br/><font color='#64748B'>85 a 120 Minutos</font>", st["StepTitle"])],
        [Paragraph("Carga al sistema POLIS, expedición del radicado atómico inmutable y entrega de acta sellada con código QR a la Junta Comunal.", st["StepText"])],
    ], colWidths=[168], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_steps = Table([[step1, step2, step3, step4]], colWidths=[176, 176, 176, 176])
    t_steps.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 14))

    banner_step = Table([[
        Paragraph("<b>SALVAGUARDA DE NO REVICTIMIZACIÓN:</b> En las mesas comunitarias está terminantemente prohibido exigir a las víctimas de violencia o desplazamiento que relaten hechos traumáticos para validar una solicitud. Los requerimientos se concentran exclusivamente en las soluciones de infraestructura, convivencia y programas sociales.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_ROSE_LT),
        ('BOX', (0,0), (-1,-1), 1, C_ROSE),
        ('PADDING', (0,0), (-1,-1), 8),
    ])
    story.append(banner_step)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 8: SISTEMA DE TRAZABILIDAD, FE PÚBLICA Y VALIDACIÓN QR
    # =========================================================================
    story.append(Paragraph("Fe Pública y Control Social: El Ciclo de Transparencia Inviolable", st["SlideActionTitle"]))
    story.append(Paragraph("Respuesta motivada a cada aporte, conforme a la Sentencia C-150 de 2015 (base jurídica de POLIS, sujeta a revisión jurídica)", st["SlideSubAction"]))

    qr_card1 = Table([
        [Paragraph("<font color='#0284C7'><b>PASO 1: RADICADO ATÓMICO</b></font><br/><font color='#64748B'>Ley 527 de 1999 • Mensajes de Datos</font>", st["CardTitleSm"])],
        [Spacer(1, 4)],
        [Paragraph("Cada propuesta genera un radicado oficial único (<b>POL-2026-XXXX</b>) con sello de tiempo legal y constancia digital. No puede ser borrada ni modificada sin dejar rastro forense auditable en el sistema POLIS Herald.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
    ])

    qr_card2 = Table([
        [Paragraph("<font color='#D97706'><b>PASO 2: DEVOLUCIÓN MOTIVADA</b></font><br/><font color='#64748B'>Sentencia C-150 de 2015 • Términos legales aplicables</font>", st["CardTitleSm"])],
        [Spacer(1, 4)],
        [Paragraph("Planeación Distrital asigna la iniciativa a la secretaría responsable, la cual debe emitir, dentro de los términos legales aplicables, un concepto motivado: viabilidad, presupuesto posible o razones para no acogerla.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
    ])

    qr_card3 = Table([
        [Paragraph("<font color='#059669'><b>PASO 3: AUDITORÍA CON CÓDIGO QR</b></font><br/><font color='#64748B'>Veeduría Ciudadana Permanente 24/7</font>", st["CardTitleSm"])],
        [Spacer(1, 4)],
        [Paragraph("La Junta de Acción Comunal y cualquier ciudadano escanean el código QR en cualquier momento desde su teléfono móvil para verificar el estado del trámite, la asignación de recursos y la ejecución física en el barrio.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
    ])

    t_qr_flow = Table([[qr_card1, qr_card2, qr_card3]], colWidths=[236, 236, 236])
    t_qr_flow.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_qr_flow)
    story.append(Spacer(1, 14))

    banner_qr = Table([[
        Paragraph("<b>PROHIBICIÓN CONSTITUCIONAL DEL SILENCIO ADMINISTRATIVO:</b> La Corte Constitucional determinó que cuando el Estado convoca a participar no puede descartar propuestas arbitrariamente. En POLIS, toda propuesta no acogida exige una Devolución Motivada formal sustentada técnica y presupuestalmente.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_CYAN_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_CYAN),
        ('PADDING', (0,0), (-1,-1), 8),
    ])
    story.append(banner_qr)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 9: HOJA DE RUTA 2026–2036 Y FINANCIACIÓN GARANTIZADA
    # =========================================================================
    story.append(Paragraph("Hoja de Ruta Plurianual y Fuentes de Financiación Identificadas", st["SlideActionTitle"]))
    story.append(Paragraph("Articulación con el Plan de Desarrollo Distrital y el Banco de Proyectos de Inversión", st["SlideSubAction"]))

    phase1 = Table([
        [Paragraph("<font color='#0284C7'><b>FASE 1: DIAGNÓSTICO (2026-I)</b></font>", st["CardTitleSm"])],
        [Paragraph("• Programación propuesta de 35 mesas territoriales, rurales, sectoriales y poblacionales; ejecución sujeta a convocatoria y actas.<br/>• Consolidación de las propuestas radicadas con QR.<br/>• Gestión de recursos ante el FONSET y el SGP según disponibilidad presupuestal.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_CYAN),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    phase2 = Table([
        [Paragraph("<font color='#D97706'><b>FASE 2: EJECUCIÓN (2026-II)</b></font>", st["CardTitleSm"])],
        [Paragraph("• Priorización de proyectos con las dependencias competentes.<br/>• Definición de metas y fuentes de financiación.<br/>• Inscripción formal de proyectos en el BPID bajo Decreto 1070/2021.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMBER),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    phase3 = Table([
        [Paragraph("<font color='#059669'><b>FASE 3: RENDICIÓN (2027+)</b></font>", st["CardTitleSm"])],
        [Paragraph("• Audiencias públicas de rendición de cuentas (se proponen semestrales).<br/>• Seguimiento de los indicadores de la matriz.<br/>• Auditorías sociales con la Personería Distrital y comités de veeduría comunitaria.", st["CardTextSm"])],
    ], colWidths=[226], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_WHITE),
        ('LINEABOVE', (0,0), (-1,0), 3.5, C_EMERALD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_phases = Table([[phase1, phase2, phase3]], colWidths=[236, 236, 236])
    t_phases.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_phases)
    story.append(Spacer(1, 10))

    src1 = Table([[Paragraph("<b>FONSET DISTRITAL</b><br/>Seguridad y convivencia", st["CardTextSm"])]], colWidths=[168], style=[('BACKGROUND', (0,0), (-1,-1), C_WHITE), ('BOX', (0,0), (-1,-1), 1, C_BORDER), ('LINEABOVE', (0,0), (-1,0), 2.5, C_ROSE), ('PADDING', (0,0), (-1,-1), 5)])
    src2 = Table([[Paragraph("<b>SGP / NACIÓN</b><br/>Salud, educación y propósito general", st["CardTextSm"])]], colWidths=[168], style=[('BACKGROUND', (0,0), (-1,-1), C_WHITE), ('BOX', (0,0), (-1,-1), 1, C_BORDER), ('LINEABOVE', (0,0), (-1,0), 2.5, C_EMBER), ('PADDING', (0,0), (-1,-1), 5)])
    src3 = Table([[Paragraph("<b>REGALÍAS (SGR)</b><br/>Proyectos de impacto regional", st["CardTextSm"])]], colWidths=[168], style=[('BACKGROUND', (0,0), (-1,-1), C_WHITE), ('BOX', (0,0), (-1,-1), 1, C_BORDER), ('LINEABOVE', (0,0), (-1,0), 2.5, C_CYAN), ('PADDING', (0,0), (-1,-1), 5)])
    src4 = Table([[Paragraph("<b>RECURSOS PROPIOS</b><br/>Ingresos de libre destinación", st["CardTextSm"])]], colWidths=[168], style=[('BACKGROUND', (0,0), (-1,-1), C_WHITE), ('BOX', (0,0), (-1,-1), 1, C_BORDER), ('LINEABOVE', (0,0), (-1,0), 2.5, C_EMERALD), ('PADDING', (0,0), (-1,-1), 5)])

    t_src = Table([[src1, src2, src3, src4]], colWidths=[176, 176, 176, 176])
    t_src.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_src)
    story.append(Spacer(1, 8))

    banner_fase = Table([[
        Paragraph("<b>COMPROMISO FISCAL:</b> Los proyectos concertados en las mesas se incorporan formalmente al Plan Operativo Anual de Inversiones (POAI) con código BPIN.", st["BannerText"])
    ]], colWidths=[720], style=[
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ])
    story.append(banner_fase)
    story.append(PageBreak())

    # =========================================================================
    # DIAPOSITIVA 10: CIERRE Y LLAMADO A LA ACCIÓN (DARK THEME)
    # =========================================================================
    ch1 = Table([
        [Paragraph("<font color='#38BDF8'><b>PORTAL WEB POLIS</b></font>", st["CoverMetaCardTitle"])],
        [Paragraph("<font color='#FFFFFF'><b>seguridadhumanaintegral.org</b></font>", st["CoverPill"])],
        [Paragraph("Infografía interactiva, selector de las 7 dimensiones y descarga de la Caja de Herramientas completa.", st["CoverMetaCardText"])],
    ], colWidths=[218], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
        ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor("#38BDF8")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    ch2 = Table([
        [Paragraph("<font color='#F59E0B'><b>MODO BARRIO LIGERO</b></font>", st["CoverMetaCardTitle"])],
        [Paragraph("<font color='#FFFFFF'><b>seguridadhumanaintegral.org/barrio</b></font>", st["CoverPill"])],
        [Paragraph("Radica alertas y propuestas desde tu celular con ultra-bajo consumo de datos y soporte offline.", st["CoverMetaCardText"])],
    ], colWidths=[218], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
        ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor("#F59E0B")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    ch3 = Table([
        [Paragraph("<font color='#10B981'><b>ASAMBLEAS Y MESAS</b></font>", st["CoverMetaCardTitle"])],
        [Paragraph("<font color='#FFFFFF'><b>JAC, JAL y Comités de Paz</b></font>", st["CoverPill"])],
        [Paragraph("Asiste a la mesa territorial de tu barrio y ejerce tu derecho constitucional a la participación vinculante.", st["CoverMetaCardText"])],
    ], colWidths=[218], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1E293B")),
        ('LINEABOVE', (0,0), (-1,0), 3, colors.HexColor("#10B981")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#334155")),
        ('PADDING', (0,0), (-1,-1), 8),
    ])

    t_ch = Table([[ch1, ch2, ch3]], colWidths=[226, 226, 226])
    t_ch.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))

    d10_card = [
        [Paragraph("<font color='#F59E0B'><b>PLAN DECENAL DE SEGURIDAD HUMANA 2026–2036</b></font>", st["CoverPill"])],
        [Spacer(1, 8)],
        [Paragraph("¡Cartagena se Transforma con la Fuerza de sus Barrios!", st["CoverTitle"])],
        [Paragraph("«La seguridad humana no se decreta desde un escritorio en el centro amurallado; se conquista deliberando en cada calle, caño y vereda de la ciudad.»", st["CoverSub"])],
        [Spacer(1, 10)],
        [t_ch],
        [Spacer(1, 16)],
        [Paragraph("<font color='#64748B'>Documento de POLIS • Cartagena de Indias</font><br/><font color='#F59E0B'><b>POLIS: Plataforma Integral de Participación, Inteligencia Territorial y Seguridad Humana</b></font>", st["CoverMetaCardText"])],
    ]
    t_d10 = Table(d10_card, colWidths=[720])
    t_d10.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 2, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(t_d10)

    agregar_referencias_territoriales(story, st)
    doc.build(story, canvasmaker=SlideCanvas)
    print(f"Generado exitosamente: {pdf_path}")


# ===========================================================================
# DOCUMENTO 3: MATRIZ DE METAS E INDICADORES (5 PÁGINAS HORIZONTALES)
# ===========================================================================
def generar_doc_matriz():
    pdf_path = os.path.join(OUTPUT_DIR, "MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf")
    doc = SimpleDocTemplate(
        pdf_path, pagesize=landscape(letter),
        leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36
    )
    st = STYLES
    story = []

    # Página 1: Propósito, cómo leerla y límites
    story.append(Paragraph("MATRIZ DE SEGUIMIENTO: INDICADORES CON LÍNEA BASE VERIFICADA Y METAS POR DEFINIR", st["TitleCover"]))
    story.append(Paragraph("Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026–2036) • Versión de trabajo, corte 5 de noviembre de 2026", st["SubCover"]))
    story.append(Paragraph(
        "Esta matriz es un <b>instrumento de trabajo propuesto</b>; no es un acto administrativo ni fija metas. Reúne los indicadores "
        "de seguridad humana para los que ya existe una <b>línea base oficial verificable</b> (con fuente, periodo, escala y huella "
        "SHA-256 de la extracción) y señala cuáles siguen pendientes. Las <b>metas</b> las fija el Plan de Acción, en articulación con "
        "la Secretaría de Planeación Distrital (Decreto Distrital 1070 de 2021) y el Plan de Desarrollo Distrital; aquí aparecen como «por fijar».",
        st["Body"]
    ))
    story.append(Spacer(1, 8))

    meta_tec = [
        [Paragraph("<b>CÓMO LEER LA MATRIZ</b>", st["TableHead"]), Paragraph("<b>LÍMITES QUE EL LECTOR DEBE CONOCER</b>", st["TableHead"])],
        [
            Paragraph(
                "• <b>Estado A:</b> línea base verificada en el banco de fuentes oficiales de POLIS.<br/>"
                "• <b>Estado B:</b> fuente pública identificada, aún no incorporada.<br/>"
                "• <b>Estado C:</b> sin fuente verificada; no se publica ninguna cifra.<br/>"
                "• <b>Escala:</b> cada fila conserva su universo: <b>municipio, cabecera o estación</b>; no son intercambiables.<br/>"
                "• <b>Entidad líder:</b> propuesta, por confirmar con cada dependencia.",
                st["TableCell"]
            ),
            Paragraph(
                "• Las cifras municipales <b>no se reparten entre barrios</b> ni sirven para ordenar territorios internos.<br/>"
                "• Policía y Medicina Legal conservan universos distintos. Su contraste requiere armonizar periodo, territorio, unidad y criterio de registro; <b>no se suman</b>.<br/>"
                "• Los trimestres móviles de la GEIH no son promedios anuales; las estimaciones SAE son experimentales.<br/>"
                "• Las tasas usan la población proyectada por el DANE para el año citado.<br/>"
                "• Las cifras no establecen relaciones de causa y efecto.<br/>"
                "• Los conteos de objetos geográficos y sus SHA se documentan en las referencias. No equivalen a un censo del POT. Las 35 mesas corresponden a programación local, no a reuniones realizadas.",
                st["TableCell"]
            )
        ]
    ]
    t_mtec = Table(meta_tec, colWidths=[360, 360])
    t_mtec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_BG_CARD]),
    ]))
    story.append(t_mtec)
    story.append(Spacer(1, 12))

    conv_box = [
        [Paragraph("<b>FUENTES DE FINANCIACIÓN POSIBLES (a definir por proyecto):</b> FONSET, Sistema General de Participaciones (SGP), "
                   "recursos propios (ICLD) y Sistema General de Regalías (SGR). La asignación de una fuente a cada meta se decide en el Plan de Acción y el Banco de Proyectos; no está preasignada en esta matriz.", st["Callout"])]
    ]
    t_cb = Table(conv_box, colWidths=[720])
    t_cb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_EMBER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, C_EMBER),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cb)
    story.append(PageBreak())

    def agregar_tabla_indicadores(titulo, subtitulo, filas):
        story.append(Paragraph(titulo, st["SlideTitle"]))
        story.append(Paragraph(subtitulo, st["SlideSub"]))
        col_w = [78, 140, 118, 160, 34, 70, 120]
        encabezado = [
            Paragraph("<b>DIMENSIÓN</b>", st["TableHead"]),
            Paragraph("<b>INDICADOR</b>", st["TableHead"]),
            Paragraph("<b>LÍNEA BASE</b>", st["TableHead"]),
            Paragraph("<b>FUENTE, ESCALA Y SALVEDADES</b>", st["TableHead"]),
            Paragraph("<b>EST.</b>", st["TableHead"]),
            Paragraph("<b>META</b>", st["TableHead"]),
            Paragraph("<b>ENTIDAD LÍDER (POR CONFIRMAR)</b>", st["TableHead"]),
        ]
        tabla_datos = [encabezado]
        for f in filas:
            tabla_datos.append([
                Paragraph(f[0], st["TableCellBold"]),
                Paragraph(f[1], st["TableCell"]),
                Paragraph(f[2], st["TableCellBold"]),
                Paragraph(f[3], st["TableCell"]),
                Paragraph(f[4], st["TableCellBold"]),
                Paragraph("Por fijar en el Plan de Acción", st["TableCell"]),
                Paragraph(f[5], st["TableCell"]),
            ])
        t_sec = Table(tabla_datos, colWidths=col_w, repeatRows=1)
        t_sec.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
            ('BOX', (0,0), (-1,-1), 1, C_BORDER),
            ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
        ]))
        story.append(t_sec)
        story.append(PageBreak())

    # Población usada: DANE, proyección municipal (2024: 1.010.408; 2025: 1.011.520)
    filas_a1 = [
        ("Personal", "Homicidio intencional por 100.000 hab.",
         "35,4 (2025)<br/>358 casos ÷ 1.011.520 hab.",
         "Policía Nacional (datos abiertos) y proyección DANE. Municipal. Cifra preliminar, sujeta a revisión. 2024: 37,4 (378 casos).",
         "A", "Secretaría del Interior / Policía Metropolitana"),
        ("Personal", "Presuntos homicidios (Medicina Legal)",
         "411 casos (2024)<br/>40,7 por 100.000 hab.",
         "Medicina Legal, cifras definitivas. Municipal. Universo distinto al de la Policía: no son comparables.",
         "A", "Secretaría del Interior"),
        ("Personal", "Violencia intrafamiliar (denuncias) por 100.000 hab.",
         "301,2 (2025)<br/>3.047 casos (2024: 3.412)",
         "Policía Nacional. Municipal. Mide denuncias registradas, no la prevalencia real del fenómeno.",
         "A", "Secretaría del Interior / Comisarías de Familia"),
        ("Comunitaria", "Victimización por algún delito (15 años y más)",
         "9,5 % (2023)",
         "DANE, Encuesta de Convivencia y Seguridad Ciudadana. Cabecera de Cartagena. Encuesta: tiene error muestral.",
         "A", "Secretaría del Interior"),
        ("Comunitaria", "Percepción de inseguridad en el barrio y en la ciudad",
         "37,7 % barrio<br/>75,1 % ciudad (2024)",
         "DANE, Encuesta de Convivencia y Seguridad Ciudadana. Cabecera, 15 años y más. Es percepción, no incidencia de delitos.",
         "A", "Secretaría del Interior / Participación"),
    ]
    agregar_tabla_indicadores(
        "Indicadores con línea base verificada (1/2): Seguridad Personal y Comunitaria",
        "Estado A. Las cifras provienen del banco de fuentes oficiales de POLIS; cada fila declara su periodo y escala municipal o de cabecera:",
        filas_a1
    )

    filas_a2 = [
        ("Económica", "Tasa de desocupación",
         "14,1 % (oct–dic 2025)<br/>14,4 % (jun–ago 2026, parcial)",
         "DANE, GEIH. Cabecera de Cartagena. Trimestre móvil: no es un promedio anual.",
         "A", "Por confirmar (desarrollo económico)"),
        ("Económica", "Proporción de informalidad",
         "50,2 % (oct–dic 2025)<br/>47,5 % (jun–ago 2026, parcial)<br/>2024: 45,7 %",
         "DANE, GEIH. Cabecera de Cartagena. Trimestres móviles de ventanas distintas: no son equivalentes ni promedios anuales.",
         "A", "Por confirmar (desarrollo económico)"),
        ("Económica", "Pobreza monetaria",
         "34,6 % (2025)<br/>2024: 41,1 % · 2023: 42,8 %",
         "DANE, pobreza monetaria (serie 2023–2025). Municipal. Cifra oficial publicada; verificar revisiones del DANE.",
         "A", "Por confirmar (desarrollo económico)"),
        ("Económica", "Necesidades Básicas Insatisfechas (NBI), personas",
         "12,5 % total<br/>11,6 % cabecera<br/>20,6 % centros poblados y rural (2018)",
         "DANE, Censo Nacional de Población y Vivienda 2018. Censal: no es una serie anual. Única cifra con corte urbano y rural.",
         "A", "Secretaría de Planeación Distrital"),
        ("Alimentaria y sanitaria", "Inseguridad alimentaria moderada o grave",
         "28,1 % (2024)<br/>IC 95 %: 23,4 a 32,8<br/>2022: 22,2 %",
         "DANE, Small Area Estimation (escala FIES). Estimación experimental municipal. Los intervalos se solapan: no concluir aumento.",
         "A", "Plan de Emergencia Social"),
        ("Alimentaria y sanitaria", "Incidencia de dengue",
         "713,24 casos por 100.000 hab. en riesgo (2024)<br/>2023: 242,31",
         "INS (SIVIGILA), replicado por TerriData (DNP). Municipal. La base es la población en riesgo, no la población total.",
         "A", "DADIS"),
        ("Ambiental", "Índice de Riesgo de la Calidad del Agua (IRCA)",
         "2,8 (2024, total)<br/>Urbano 2,9 · Rural 2,4",
         "INS (SIVICAP). Municipal, con corte urbano y rural. Nivel publicado: «Sin riesgo».",
         "A", "DADIS / Empresa de acueducto"),
    ]
    agregar_tabla_indicadores(
        "Indicadores con línea base verificada (2/2): Seguridad Económica, Alimentaria y Ambiental",
        "Estado A. Las encuestas y estimaciones tienen error estadístico; se citan con su salvedad:",
        filas_a2
    )

    filas_bc = [
        ("Alimentaria y sanitaria", "Razón de mortalidad materna por 100.000 nacidos vivos",
         "Sin línea base en el banco",
         "Fuente prevista: estadísticas vitales del DANE y DADIS. Municipal.",
         "B", "DADIS"),
        ("Ambiental", "Puntos críticos de inundación georreferenciados",
         "Sin inventario verificado",
         "Pendiente: inventario de la Oficina de Gestión del Riesgo y cartografía distrital. TerriData solo reporta eventos de inundación (1 en 2021), que no equivale a un inventario de puntos críticos.",
         "C", "Gestión del Riesgo (OAGRD)"),
        ("Alertas tempranas", "Alertas tempranas de la Defensoría con ficha para Cartagena",
         "2 fichas verificadas (001-17 y 002-20)",
         "Defensoría del Pueblo, SAT. Catálogo documental no exhaustivo: no es una tasa ni una serie.",
         "A (doc.)", "Defensoría del Pueblo"),
        ("Comunitaria", "Cobertura de programas comunitarios por barrio",
         "Sin fuente verificada",
         "Pendiente de identificar custodio, escala y periodicidad.",
         "C", "Por confirmar"),
        ("Política", "Aportes ciudadanos con respuesta motivada dentro del plazo legal",
         "POLIS aún no lo mide",
         "Registro propio de POLIS. La línea base se genera con el primer corte de radicados.",
         "C", "Secretaría de Planeación Distrital"),
        ("Política", "Veedurías ciudadanas activas",
         "Sin fuente verificada",
         "Pendiente: registro de la Personería y de la Secretaría de Participación.",
         "C", "Personería / Participación"),
    ]
    agregar_tabla_indicadores(
        "Indicadores pendientes de línea base (estados B y C)",
        "Aún no se publican cifras. Se listan para que la matriz muestre qué falta y de dónde vendrá:",
        filas_bc
    )

    # Salvaguardas y auditoría social
    story.append(Paragraph("Salvaguardas Étnicas y Auditoría Social", st["SlideTitle"]))
    story.append(Paragraph("Marco jurídico de referencia y aplicación propuesta en el uso de esta matriz:", st["SlideSub"]))

    salv_data = [
        [Paragraph("<b>COMPONENTE</b>", st["TableHead"]), Paragraph("<b>MARCO JURÍDICO DE REFERENCIA</b>", st["TableHead"]), Paragraph("<b>APLICACIÓN PROPUESTA</b>", st["TableHead"])],
        [
            Paragraph("<b>Pueblos étnicos y afrodescendientes</b>", st["TableCellBold"]),
            Paragraph("Ley 70 de 1993, Convenio 169 de la OIT y jurisprudencia constitucional sobre consulta previa.", st["TableCell"]),
            Paragraph("Las mesas y esta matriz no sustituyen la consulta previa. En territorios con consejos comunitarios reconocidos, se concerta con sus autoridades.", st["TableCell"])
        ],
        [
            Paragraph("<b>Enfoque de género</b>", st["TableCellBold"]),
            Paragraph("Ley 1257 de 2008 sobre prevención y sanción de violencias contra las mujeres.", st["TableCell"]),
            Paragraph("Se propone garantizar participación equilibrada de mujeres en las mesas y canales confidenciales para denunciar violencias.", st["TableCell"])
        ],
        [
            Paragraph("<b>Personas con discapacidad</b>", st["TableCellBold"]),
            Paragraph("Ley Estatutaria 1618 de 2013 sobre ejercicio pleno de derechos de las personas con discapacidad.", st["TableCell"]),
            Paragraph("Los espacios y materiales de las mesas deben ser accesibles. POLIS aplica verificaciones automáticas de accesibilidad en su interfaz.", st["TableCell"])
        ],
        [
            Paragraph("<b>Control social</b>", st["TableCellBold"]),
            Paragraph("Ley 1757 de 2015 sobre promoción y protección del derecho a la participación democrática.", st["TableCell"]),
            Paragraph("Se propone que la Personería Distrital y las veedurías puedan consultar el estado de los aportes radicados y detectar silencios administrativos.", st["TableCell"])
        ],
    ]
    t_salv = Table(salv_data, colWidths=[160, 240, 320])
    t_salv.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
    ]))
    story.append(t_salv)

    agregar_referencias_territoriales(story, st)
    doc.build(story, canvasmaker=SlideCanvas)
    print(f"Generado exitosamente: {pdf_path}")


# ===========================================================================
# DOCUMENTO 4: GUÍA DE FACILITADORES PARA MESAS (5 PÁGINAS VERTICALES)
# ===========================================================================
def generar_doc_facilitadores():
    pdf_path = os.path.join(OUTPUT_DIR, "GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf")
    doc = SimpleDocTemplate(
        pdf_path, pagesize=letter,
        leftMargin=36, rightMargin=36, topMargin=44, bottomMargin=44
    )
    st = STYLES
    story = []

    # Página 1: Portada y Presentación
    story.append(Paragraph("GUÍA METODOLÓGICA PARA FACILITADORES Y MODERADORES", st["TitleCover"]))
    story.append(Paragraph("Protocolos de Moderación, Captura Territorial y Radicación con Fe Pública en Mesas Comunitarias", st["SubCover"]))
    story.append(Paragraph("«El facilitador no impone decisiones: cuida la palabra comunitaria, garantiza la no revictimización y custodia la fe pública.»", st["LemaCover"]))
    story.append(Spacer(1, 10))

    meta_fac = [
        [Paragraph("<b>Destinatarios:</b>", st["TableCellBold"]), Paragraph("Enlaces territoriales de la Secretaría del Interior, facilitadores de la Secretaría de Participación, presidentes y secretarios de Juntas de Acción Comunal (JAC), ediles y líderes barriales de Cartagena.", st["TableCell"])],
        [Paragraph("<b>Objetivo del Manual:</b>", st["TableCellBold"]), Paragraph("Orientar las 35 mesas de la programación local para que cada reunión comunitaria sea ordenada, rigurosa, libre de manipulación partidista y con entrega inmediata de comprobantes QR con valor vinculante.", st["TableCell"])],
        [Paragraph("<b>Principio de Neutralidad:</b>", st["TableCellBold"]), Paragraph("Queda prohibido el proselitismo político o electoral en las mesas. Toda deliberación tiene fines exclusivos de planeación del gasto público e inversión de la política de seguridad humana.", st["TableCell"])],
    ]
    t_mf = Table(meta_fac, colWidths=[140, 400])
    t_mf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_mf)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Rol del Facilitador Institucional", st["H2"]))
    story.append(Paragraph(
        "El facilitador es un servidor o líder comunitario investido de la responsabilidad de orientar la conversación pública. "
        "Su función no es prometer obras a título personal ni defender a rajatabla la gestión gubernamental, sino escuchar "
        "con empatía, organizar las peticiones según las 7 dimensiones integrales y asegurar que cada propuesta quede radicada "
        "con fe pública en el sistema POLIS. La credibilidad del proceso depende de su honestidad e imparcialidad metodológica.",
        st["Body"]
    ))
    story.append(PageBreak())

    # Página 2: Principios Rectores y Código de Conducta
    story.append(Paragraph("Principios Rectores del Facilitador Comunitario", st["H1"]))
    story.append(Paragraph(
        "Cinco mandatos éticos y metodológicos de obligatorio cumplimiento durante toda la sesión barrial:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    principios = [
        ("1. Neutralidad Activa e Imparcialidad:",
         "El facilitador no toma partido en rencillas vecinales ni favorece a determinados voceros. Da la palabra de manera equitativa y asegura que las minorías y los jóvenes participen con el mismo tiempo que los líderes tradicionales."),
        ("2. Salvaguarda Absoluta de No Revictimización:",
         "Bajo ninguna circunstancia se pedirá a víctimas de violencia, abuso o desplazamiento que expongan su dolor frente al auditorio para respaldar una petición. Los problemas se abordan desde el derecho a la seguridad y la convivencia."),
        ("3. Lenguaje Claro y Ciudadano:",
         "Evitar siglas burocráticas incomprensibles (MFMP, BPIN, CONPES, etc.). Explicar las cosas en los términos cotidianos del barrio: agua, comida, empleo para los jóvenes, parques iluminados y tranquilidad al caminar de noche."),
        ("4. Escucha Activa sin Promesas Falsas:",
         "No prometer presupuestos ni fechas que no estén respaldadas técnicamente. El facilitador garantiza el trámite y la respuesta obligatoria motivada de la administración, no la aprobación ciega de cualquier solicitud."),
        ("5. Custodia de la Fe Pública Digital:",
         "Asegurar que cada propuesta concertada sea registrada en POLIS con exactitud en su descripción y ubicación en el mapa, entregando el comprobante impreso o por WhatsApp al vocero de la JAC al cierre del taller."),
    ]
    p_cells = []
    for tit, desc in principios:
        p_cells.append([Paragraph(f"<b>{tit}</b><br/>{desc}", st["TableCell"])])
    t_p = Table(p_cells, colWidths=[540])
    t_p.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_p)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Protocolo ante Intentos de Politización Partidista", st["H2"]))
    story.append(Paragraph(
        "Si algún asistente intenta convertir la mesa en un mitin proselitista o tribuna electoral, el facilitador intervendrá "
        "con respeto recordando que la mesa comunitaria de Seguridad Humana se rige por la <b>Sentencia C-150 de 2015</b> y el "
        "<b>Decreto Distrital 1070 de 2021</b>. Si la conducta persiste, el moderador suspenderá brevemente la mesa y solicitará "
        "el acompañamiento del delegado de la Personería Distrital presente en la sesión.",
        st["Body"]
    ))
    story.append(PageBreak())

    # Página 3: Minuta Operativa del Taller Barrial (Paso a Paso)
    story.append(Paragraph("Minuta Operativa y Cronograma del Taller Barrial", st["H1"]))
    story.append(Paragraph(
        "El taller tiene una duración estándar de <b>120 minutos (2 horas)</b> para garantizar agilidad, foco y respeto por el tiempo de los vecinos:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    minuta_data = [
        [Paragraph("<b>TIEMPO</b>", st["TableHead"]), Paragraph("<b>FASE / ACTIVIDAD</b>", st["TableHead"]), Paragraph("<b>ACCIONES METODOLÓGICAS CLAVE</b>", st["TableHead"])],
        [
            Paragraph("<b>00 – 15 min</b><br/>(15 min)", st["TableCellBold"]),
            Paragraph("<b>Apertura e Instalación</b>", st["TableCellBold"]),
            Paragraph("• Registro de firmas de asistencia y contacto.<br/>• Presentación del objetivo: construir seguridad humana.<br/>• Acuerdos de convivencia: respeto de tiempos y uso de la palabra.", st["TableCell"])
        ],
        [
            Paragraph("<b>15 – 45 min</b><br/>(30 min)", st["TableCellBold"]),
            Paragraph("<b>Mapeo en Geovisor</b>", st["TableCellBold"]),
            Paragraph("• Proyección del mapa del barrio en el Geovisor POLIS.<br/>• La comunidad ubica los puntos críticos de inundación, atraco o falta de luz.<br/>• Clasificación preliminar por dimensiones prioritarias.", st["TableCell"])
        ],
        [
            Paragraph("<b>45 – 85 min</b><br/>(40 min)", st["TableCellBold"]),
            Paragraph("<b>Deliberación en Mesas</b>", st["TableCellBold"]),
            Paragraph("• División en 3 submesas de trabajo temático.<br/>• Discusión de soluciones viables: ¿qué se necesita y quién se beneficia?<br/>• Redacción de la ficha unificada de propuesta por mesa.", st["TableCell"])
        ],
        [
            Paragraph("<b>85 – 105 min</b><br/>(20 min)", st["TableCellBold"]),
            Paragraph("<b>Plenaria y Consenso</b>", st["TableCellBold"]),
            Paragraph("• Los voceros de cada submesa exponen 3 minutos la propuesta.<br/>• Votación a mano alzada o consenso barrial de las 3 prioridades del sector.<br/>• Aprobación por la asamblea general de vecinos.", st["TableCell"])
        ],
        [
            Paragraph("<b>105 – 120 min</b><br/>(15 min)", st["TableCellBold"]),
            Paragraph("<b>Radicación y Cierre</b>", st["TableCellBold"]),
            Paragraph("• Registro en POLIS (en tablet o móvil de la JAC).<br/>• Generación del número de radicado oficial y código QR.<br/>• Entrega del comprobante físico y digital a la Junta de Acción Comunal.", st["TableCell"])
        ],
    ]
    t_min = Table(minuta_data, colWidths=[90, 130, 320])
    t_min.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_BG_CARD]),
    ]))
    story.append(t_min)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Kit de Materiales Requerido por Mesa", st["H2"]))
    story.append(Paragraph(
        "Cada equipo facilitador debe portar: (1) Tablet o teléfono inteligente con acceso a POLIS y modo offline habilitado; "
        "(2) 50 copias impresas del folleto resumen del ABC de Seguridad Humana; (3) Mapa impreso a gran escala del barrio según el POT; "
        "(4) Formatos físicos de actas de plenaria con papel carbón; (5) Marcadores y papel periódico para lluvia de ideas.",
        st["Body"]
    ))
    story.append(PageBreak())

    # Página 4: Uso de POLIS Móvil y Modo Offline
    story.append(Paragraph("Operación Digital en Territorio: POLIS y Modo Barrio", st["H1"]))
    story.append(Paragraph(
        "En sectores periféricos o insulares de Cartagena de Indias donde la señal móvil sea débil o inexistente (ej. Tierrabomba, "
        "faldas de La Popa, zonas rurales de Bayunca), el facilitador operará bajo el protocolo de <b>Modo Barrio Autónomo</b>:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    offline_steps = [
        ("Paso 1: Precarga de Datos en la Sede Distrital:",
         "Antes de salir al territorio, el facilitador sincroniza su tablet o móvil en la red de la Alcaldía. Antes de cada taller se verifica la versión del catálogo territorial disponible. La cobertura del archivo no acredita por sí sola un censo administrativo vigente."),
        ("Paso 2: Captura en Terreno sin Internet:",
         "Durante el taller, se diligencia la propuesta con el selector oficial de barrios. Se toma la evidencia fotográfica y los nombres de los voceros. El sistema genera un radicado criptográfico provisional en memoria local."),
        ("Paso 3: Sincronización Inmediata al Retornar:",
         "Tan pronto el dispositivo detecta conexión Wi-Fi o datos 4G, los radicados se sincronizan automáticamente con la base de datos central de POLIS, emitiendo el comprobante definitivo con fe pública."),
        ("Paso 4: Envío de Comprobante por WhatsApp a la JAC:",
         "El enlace distrital o facilitador envía el archivo PDF del radicado con código QR al número móvil del presidente de la JAC y de los líderes designados como veedores comunitarios."),
    ]
    off_cells = []
    for tit, desc in offline_steps:
        off_cells.append([Paragraph(f"<b>{tit}</b><br/>{desc}", st["TableCell"])])
    t_off = Table(off_cells, colWidths=[540])
    t_off.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_off)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Verificación de la Información Territorial", st["H2"]))
    story.append(Paragraph(
        "Es obligatorio verificar que el nombre del barrio seleccionado coincida exactamente con la nomenclatura del <b>Plan de Ordenamiento "
        "Territorial (POT) de Cartagena</b> y con la capa adoptada para el corte, identificada por archivo, fuente y SHA. El número de objetos geométricos no equivale a un censo de unidades administrativas. Si la comunidad denomina un sector por un "
        "nombre popular (ejemplo: 'Playas Blancas' o 'El Chivo'), se seleccionará el barrio canónico (ej. Olaya Herrera o La María) "
        "y se precisará el microsector en el cuerpo de la propuesta.",
        st["Body"]
    ))
    story.append(PageBreak())

    # Página 5: Formato de Acta de Plenaria y Compromisos
    story.append(Paragraph("Formato Modelo de Acta de Plenaria y Acuerdos", st["H1"]))
    story.append(Paragraph(
        "Plantilla institucional para consignar las firmas y compromisos formales en caso de requerir respaldo físico:",
        st["Body"]
    ))
    story.append(Spacer(1, 4))

    acta_header = [
        [Paragraph("<b>ACTA DE CONCERTACIÓN BARRIAL • POLIS CARTAGENA</b>", st["TableHead"])],
        [Paragraph("<b>Localidad:</b> ___________________________  <b>UCG:</b> ______  <b>Barrio/Corregimiento (POT):</b> ___________________________<br/>"
                   "<b>Fecha:</b> _____ / _____ / 2026   <b>Lugar / Sede:</b> ________________________________________________________________<br/>"
                   "<b>Número de Asistentes:</b> Total: _____  Mujeres: _____  Jóvenes (14-28): _____  Adultos Mayores: _____", st["TableCell"])],
    ]
    t_ah = Table(acta_header, colWidths=[540])
    t_ah.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SLATE_DARK),
        ('BACKGROUND', (0,1), (-1,1), C_BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_ah)
    story.append(Spacer(1, 8))

    acta_prop = [
        [Paragraph("<b>PROPUESTA PRIORIZADA 1 (CONCERTADA EN ASAMBLEA)</b>", st["TableCellBold"])],
        [Paragraph("<b>Dimensión de Seguridad Humana:</b> [  ] Económica  [  ] Alimentaria  [  ] Salud  [  ] Ambiental  [  ] Personal  [  ] Comunitaria  [  ] Política<br/>"
                   "<b>Descripción Clara de la Iniciativa:</b> __________________________________________________________________________________________<br/>"
                   "________________________________________________________________________________________________________________________<br/>"
                   "<b>Ubicación Exacta / Dirección Barrial:</b> ________________________________________________________________________________________<br/>"
                   "<b>Población Beneficiaria Directa:</b> ____________________________________  <b>Número de Radicado POLIS:</b> ___________________________", st["TableCell"])],
        [Paragraph("<b>PROPUESTA PRIORIZADA 2 (CONCERTADA EN ASAMBLEA)</b>", st["TableCellBold"])],
        [Paragraph("<b>Dimensión de Seguridad Humana:</b> [  ] Económica  [  ] Alimentaria  [  ] Salud  [  ] Ambiental  [  ] Personal  [  ] Comunitaria  [  ] Política<br/>"
                   "<b>Descripción Clara de la Iniciativa:</b> __________________________________________________________________________________________<br/>"
                   "________________________________________________________________________________________________________________________<br/>"
                   "<b>Ubicación Exacta / Dirección Barrial:</b> ________________________________________________________________________________________<br/>"
                   "<b>Población Beneficiaria Directa:</b> ____________________________________  <b>Número de Radicado POLIS:</b> ___________________________", st["TableCell"])],
    ]
    t_ap = Table(acta_prop, colWidths=[540])
    t_ap.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_BG_ALT),
        ('BACKGROUND', (0,2), (-1,2), C_BG_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_ap)
    story.append(Spacer(1, 8))

    firmas_box = [
        [
            Paragraph("<b>POR LA COMUNIDAD / JAC:</b><br/><br/><br/>________________________________________<br/>Firma: Presidente(a) de JAC<br/>C.C. N°<br/>Teléfono:", st["TableCell"]),
            Paragraph("<b>POR EL COMITÉ DE MUJERES / JÓVENES:</b><br/><br/><br/>________________________________________<br/>Firma: Vocero(a) Comunitario<br/>C.C. N°<br/>Teléfono:", st["TableCell"]),
            Paragraph("<b>POR LA ALCALDÍA DE CARTAGENA:</b><br/><br/><br/>________________________________________<br/>Firma: Facilitador(a) Institucional<br/>C.C. N°<br/>Cargo / Dependencia:", st["TableCell"]),
        ]
    ]
    t_fir = Table(firmas_box, colWidths=[180, 180, 180])
    t_fir.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_fir)

    agregar_referencias_territoriales(story, st)
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generado exitosamente: {pdf_path}")


# ===========================================================================
# EJECUCIÓN PRINCIPAL
# ===========================================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directorio-salida", type=Path, default=Path(OUTPUT_DIR))
    opciones = parser.parse_args()
    OUTPUT_DIR = str(opciones.directorio_salida)
    cargar_linaje_territorial()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Iniciando generación institucional de los 4 documentos de la Caja de Herramientas...")
    generar_doc_abc()
    generar_doc_presentacion()
    generar_doc_matriz()
    generar_doc_facilitadores()
    print("¡Los 4 documentos de POLIS fueron generados con éxito!")
