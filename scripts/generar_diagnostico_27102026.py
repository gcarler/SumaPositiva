"""Generador del Documento Diagnóstico y Presentación Google Slides (Corte 27 de Octubre de 2026).

Genera:
- diagnostico27102026.docx: Informe técnico completo con tablas y gráficos de las 7 dimensiones.
- diagnostico27102026.pptx: Presentación para Google Slides (16:9) con diseño ejecutivo y visualizaciones.
- diagnostico27102026.pdf: Atlas/estudio visual consolidado.
- diagnostico27102026.md: Versión en Markdown para el repositorio.
"""

from pathlib import Path
import shutil
import docx
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
ROOT = Path("/root/polis")

# Colores institucionales
COLOR_NAVY = RGBColor(11, 37, 69)      # #0B2545
COLOR_BLUE = RGBColor(19, 64, 116)     # #134074
COLOR_TEAL = RGBColor(0, 166, 160)     # #00A6A0
COLOR_ORANGE = RGBColor(231, 123, 76)  # #E77B4C
COLOR_GRAY = RGBColor(93, 105, 120)    # #5D6978

PPTX_NAVY = PptxRGBColor(11, 37, 69)
PPTX_BLUE = PptxRGBColor(19, 64, 116)
PPTX_TEAL = PptxRGBColor(0, 166, 160)
PPTX_ORANGE = PptxRGBColor(231, 123, 76)
PPTX_GRAY = PptxRGBColor(93, 105, 120)
PPTX_WHITE = PptxRGBColor(255, 255, 255)
PPTX_PALE = PptxRGBColor(240, 244, 248)

def crear_documento_word():
    doc = Document()
    
    # Configuración de márgenes
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Portada / Cabecera
    titulo = doc.add_paragraph()
    r_tit = titulo.add_run("DIAGNÓSTICO INTEGRAL DE SEGURIDAD HUMANA\nCARTAGENA DE INDIAS 2026")
    r_tit.bold = True
    r_tit.font.size = Pt(24)
    r_tit.font.color.rgb = COLOR_NAVY
    titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph()
    r_sub = sub.add_run("Apuestas Políticas, Planes de Acción y Resultados Observados (2012–2027)\nCorte de Integración Multifuente: 27 de octubre de 2026")
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = COLOR_TEAL
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("―" * 45).alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Metadatos institucionales
    p_meta = doc.add_paragraph()
    p_meta.add_run("Plataforma: ").bold = True
    p_meta.add_run("POLIS — Sistema Distrital de Formulación y Seguimiento de Política Pública\n")
    p_meta.add_run("Ámbito Territorial: ").bold = True
    p_meta.add_run("Cartagena de Indias (DIVIPOLA 13001) · 15 Unidades Comuneras de Gobierno\n")
    p_meta.add_run("Bases Integradas: ").bold = True
    p_meta.add_run("DANE, Instituto Nacional de Medicina Legal, Policía Nacional/MinDefensa, TerriData DNP, Unidad para las Víctimas (RUV/IRV), IDEAM (SISAIRE), INS (SIVICAP), Triada PDD ↔ PA ↔ BPIM (8 planes, 4.637 metas y 27.592 actividades).\n")

    doc.add_page_break()

    # 1. Resumen Ejecutivo
    h1 = doc.add_heading("1. Resumen Ejecutivo", level=1)
    h1.style.font.color.rgb = COLOR_NAVY

    doc.add_paragraph(
        "El presente documento consolida el diagnóstico multifuente de seguridad humana en Cartagena de Indias al corte del "
        "27 de octubre de 2026. A partir del procesamiento riguroso de 28 conjuntos de datos oficiales y de la triada "
        "estratégica distrital (Planes de Desarrollo, Planes de Acción y Banco de Proyectos de Inversión), este informe evalúa "
        "si las prioridades de gobierno se tradujeron en intervenciones efectivas sobre los factores de riesgo territorial."
    )

    doc.add_paragraph(
        "Para garantizar la validez técnica y jurídica de los hallazgos, el análisis separa tres niveles analíticos: "
        "(1) la apuesta gubernamental (metas PDD/PDL), (2) la respuesta institucional (actividades de planes de acción y pagos BPIN), "
        "y (3) los resultados poblacionales observados (tasas, conteos y percepciones). Bajo el marco de la ONU y el mandato de la "
        "Sentencia C-150 de 2015, se examinan las siete dimensiones de la seguridad humana sin confundir correlación temporal con causalidad."
    )

    # Gráfico Composición
    img_comp = DIR_BASE / "g02_composicion.png"
    if img_comp.exists():
        doc.add_paragraph()
        doc.add_picture(str(img_comp), width=Inches(6.2))
        p_cap = doc.add_paragraph("Figura 1. Composición y evolución de la agenda de seguridad humana en los planes de acción (2018–2025).")
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.runs[0].font.size = Pt(9)
        p_cap.runs[0].font.italic = True

    # 2. Fuentes Procesadas
    h2 = doc.add_heading("2. Banco de Fuentes Oficiales Procesadas", level=1)
    h2.style.font.color.rgb = COLOR_NAVY

    doc.add_paragraph(
        "El estudio incorpora un banco reproducible de datos oficiales normalizados con trazabilidad de huella digital SHA-256:"
    )

    tabla_f = doc.add_table(rows=1, cols=4)
    tabla_f.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = tabla_f.rows[0].cells
    hdr[0].text = "Entidad Custodia"
    hdr[1].text = "Conjuntos / Variables"
    hdr[2].text = "Periodo"
    hdr[3].text = "Criterio de Rigor Metodológico"
    for cell in hdr:
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = COLOR_NAVY

    datos_fuentes = [
        ("Medicina Legal (Forensis)", "Homicidios, violencia intrafamiliar, interpersonal, presuntos delitos sexuales, suicidios y accidentes viales.", "2015–2024", "Hechos corroborados forensemente. No promediar con denuncias policiales."),
        ("Policía Nacional / MinDefensa", "Homicidios, lesiones, amenazas, violencia intrafamiliar y hurtos (comercio, residencias, motocicletas).", "2010–2026", "Registra denuncias ciudadanas y capturas; universo complementario."),
        ("DANE (GEIH, ECSC, SAE)", "Pobreza monetaria, desocupación, informalidad, percepción de inseguridad y FIES experimental.", "2018–2025", "Estimaciones muestrales representativas de cabecera; intervalos de confianza explícitos."),
        ("DNP / TerriData", "Incidencia dengue, tasas de violencia, coberturas y finanzas públicas territoriales.", "2018–2024", "Compilador estandarizado nacional para indicadores sectoriales."),
        ("Unidad para las Víctimas (RUV / IRV)", "Hechos victimizantes, índice de riesgo de victimización e indemnizaciones radicadas.", "2012–2026", "Mide hechos del conflicto armado y demanda de reparación administrativa."),
        ("IDEAM (SISAIRE) e INS (SIVICAP)", "Calidad del aire por estación meteorológica e índice de calidad del agua potable (IRCA).", "2014–2025", "Monitoreo físico-químico ambiental puntual."),
        ("Triada PDD ↔ PA ↔ BPIM", "8 Planes (5 PDD + 3 PDL), 4.637 metas, 27.592 actividades y proyectos BPIN.", "2012–2026", "Auditoría de correspondencia entre metas formuladas, presupuesto pagado y productos."),
    ]

    for ent, conj, per, crit in datos_fuentes:
        row = tabla_f.add_row().cells
        row[0].text = ent
        row[1].text = conj
        row[2].text = per
        row[3].text = crit
        for c in row:
            for p in c.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9.5)

    doc.add_page_break()

    # 3. Diagnóstico por las Siete Dimensiones
    h3 = doc.add_heading("3. Diagnóstico por Dimensiones de Seguridad Humana", level=1)
    h3.style.font.color.rgb = COLOR_NAVY

    ejes_info = [
        ("3.1. Seguridad Personal (Violencia Letal, Hurtos y Protección de la Vida)",
         "g_eje_0.png",
         "La seguridad personal concentra metas dirigidas a la preservación de la vida, convivencia ciudadana y reducción de hechos delictivos. "
         "En Medicina Legal, la tasa de homicidios registró una reducción moderada al pasar de 427 casos en 2023 a 411 en 2024 (tasa de 38,79 por 100.000 hab.), "
         "manteniéndose aún por encima de los niveles de 2019. Por tipología de hurto, se evidencia un comportamiento disímil: disminuyó el hurto a residencias "
         "(de 618 en 2023 a 481 en 2024), mientras que el hurto a motocicletas presentó un incremento sostenido (503 en 2023 a 665 en 2024). "
         "La extorsión muestra una tendencia al alza en los registros policiales. La respuesta institucional requiere articular tecnología de vigilancia "
         "con presencia social y control barrial territorializado."),

        ("3.2. Seguridad Comunitaria (Tejido Social, Familia y Equidad)",
         "g_eje_1.png",
         "Este eje representa la mayor apuesta de metas del PDD 2024–2027 (53,9% de metas clasificadas). En el plano de violencia intrafamiliar, "
         "el conjunto médico legal reporta 323 casos en 2024 frente a 394 en 2023, mientras que los registros de Policía alcanzan 3.412 expedientes. "
         "Esta diferencia refleja que la Policía capta llamados de auxilio inmediato y denuncias directas, mientras Medicina Legal examina casos con lesiones "
         "dictaminadas. Los exámenes por presuntos delitos sexuales bajaron de 500 a 430 en el mismo periodo. Es imperativo consolidar la ruta de atención a mujeres "
         "y jóvenes en las localidades 2 y 3."),

        ("3.3. Seguridad Económica (Ingresos, Pobreza y Empleo)",
         "g_eje_2.png",
         "Presenta el crecimiento más consistente en la composición documental de los planes de acción (+1,85 puntos porcentuales anuales). "
         "La pobreza monetaria oficial disminuyó del 42,8% en 2023 al 41,1% en 2024 y 34,6% en 2025. No obstante, el mercado laboral presenta tensiones: "
         "la desocupación del trimestre móvil octubre-diciembre subió de 10,94% en 2024 a 14,14% en 2025, con una informalidad que bordea el 50,2%. "
         "La diversificación productiva y la inserción laboral juvenil resultan prioritarias."),

        ("3.4. Seguridad Alimentaria (Nutrición y Acceso a Alimentos)",
         "g_eje_3.png",
         "La estimación del modelo SAE para inseguridad alimentaria moderada o grave (FIES) se situó en 28,10% en 2024 (IC 95%: 23,42–32,78), "
         "frente al 22,15% en 2022. La amplitud de los intervalos estadísticos exige fortalecer los sistemas de información municipal sobre desnutrición infantil "
         "y cobertura del Programa de Alimentación Escolar (PAE), integrando redes de abastecimiento local."),

        ("3.5. Seguridad en Salud (Salud Mental, Epidemiología y Atención)",
         "g_eje_4.png",
         "En salud mental, los suicidios certificados por Medicina Legal pasaron de 55 en 2023 a 33 en 2024. En contraste, la incidencia de dengue "
         "compilada en TerriData evidenció un repunte epidémico de 242,31 a 713,24 casos por 100.000 habitantes en riesgo. Esto demuestra que los desafíos "
         "sanitarios de la ciudad responden tanto a condiciones clínicas y de bienestar psicológico como a saneamiento ambiental."),

        ("3.6. Seguridad Ambiental (Riesgo Hídrico, Aire y Cambio Climático)",
         "g_eje_5.png",
         "Las estaciones del SISAIRE documentan la concentración de material particulado con impacto en zonas portuarias e industriales. "
         "En calidad del agua potable, el índice IRCA total se mantuvo en rangos seguros (0,3% en 2023 y 2,8% en 2024 en cabecera urbana). Sin embargo, "
         "las áreas rurales e insulares continúan demandando inversiones en redes de acueducto y obras de drenaje pluvial para mitigación de inundaciones recurrentes."),

        ("3.7. Seguridad Política e Institucional (Participación, Rendición de Cuentas y Víctimas)",
         "g_eje_6.png",
         "El RUV contabiliza 522 hechos y series de víctimas históricas en la ciudad con un índice de riesgo de victimización (IRV) clasificado en 'Medio Bajo'. "
         "El reto institucional se centra en el fortalecimiento del canal ciudadano y la devolución motivada: garantizar que las propuestas y actas de las 37 mesas "
         "distritales queden blindadas con trazabilidad pública inalterable.")
    ]

    for titulo_eje, archivo_img, texto_eje in ejes_info:
        doc.add_heading(titulo_eje, level=2).style.font.color.rgb = COLOR_BLUE
        doc.add_paragraph(texto_eje)
        ruta_img = DIR_BASE / archivo_img
        if ruta_img.exists():
            doc.add_paragraph()
            doc.add_picture(str(ruta_img), width=Inches(5.8))
            p_cap = doc.add_paragraph(f"Visualización: Actividad institucional, inversión BPIN y resultados de {titulo_eje.split('(')[0].strip()}.")
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.runs[0].font.size = Pt(8.5)
            p_cap.runs[0].font.italic = True

    # 4. Evaluación de la Triada y Eficiencia
    doc.add_page_break()
    h4 = doc.add_heading("4. Evaluación de la Triada de Gestión (PDD ↔ PA ↔ BPIM)", level=1)
    h4.style.font.color.rgb = COLOR_NAVY

    doc.add_paragraph(
        "El análisis econométrico y de eficiencia relativa (Data Envelopment Analysis - DEA) aplicado a las metas distritales "
        "revela que la eficiencia en la ejecución presupuestal varía sustancialmente según la dependencia y la tipología de intervención. "
        "La integración del catálogo homologado del DNP permite verificar la consistencia entre los verbos rectores de las metas, "
        "los productos de marco lógico entregados y la tasa de impacto observada."
    )

    img_heat = DIR_BASE / "g05_heat.png"
    if img_heat.exists():
        doc.add_paragraph()
        doc.add_picture(str(img_heat), width=Inches(6.0))
        p_cap = doc.add_paragraph("Figura 9. Mapa de calor de intensidad de metas y actividades en la serie temporal 2018–2026.")
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.runs[0].font.size = Pt(9)
        p_cap.runs[0].font.italic = True

    # 5. Cautelas y Conclusiones
    h5 = doc.add_heading("5. Cautelas Metodológicas y Próximos Pasos", level=1)
    h5.style.font.color.rgb = COLOR_NAVY

    doc.add_paragraph(
        "1. No inferir causalidad exclusiva: Las disminuciones en delitos o mejoras en pobreza obedecen a factores multivariados "
        "(dinámica macroeconómica nacional, estacionalidad, operativos interagenciales). La evaluación de impacto requiere grupos de control.\n"
        "2. Precaución geográfica: Dado que los registros de hurto y delitos de la fuente compartida presentan agregación zonal o municipal, "
        "no se realizan extrapolaciones a nivel de barrio sin contar con microdatos georreferenciados punto a punto.\n"
        "3. Transición a Fase 2 (Formulación de la Política Pública): El presente diagnóstico constituye el soporte empírico oficial para la priorización "
        "de alternativas de solución, ejes estratégicos y plan de acción participativo en la plataforma POLIS."
    )

    out_docx = DIR_BASE / "diagnostico27102026.docx"
    doc.save(str(out_docx))
    print(f"Word generado: {out_docx} ({out_docx.stat().st_size} bytes)")
    return out_docx

def crear_presentacion_pptx():
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)
    prs.slide_height = PptxInches(7.5)  # 16:9 panorámico

    blank_layout = prs.slide_layouts[6]

    def agregar_fondo_header(slide, titulo_texto, subtitulo_texto=""):
        # Header banner
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, PptxInches(13.333), PptxInches(1.1))
        header.fill.solid()
        header.fill.fore_color.rgb = PPTX_NAVY
        header.line.fill.background()

        # Texto de cabecera
        tb = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(0.15), PptxInches(11.7), PptxInches(0.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = titulo_texto
        p.font.size = PptxPt(22)
        p.font.bold = True
        p.font.color.rgb = PPTX_WHITE

        if subtitulo_texto:
            p2 = tf.add_paragraph()
            p2.text = subtitulo_texto
            p2.font.size = PptxPt(12)
            p2.font.color.rgb = PPTX_TEAL

        # Footer
        footer = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, PptxInches(7.1), PptxInches(13.333), PptxInches(0.4))
        footer.fill.solid()
        footer.fill.fore_color.rgb = PPTX_PALE
        footer.line.fill.background()

        tb_f = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(7.12), PptxInches(11.7), PptxInches(0.3))
        tf_f = tb_f.text_frame
        pf = tf_f.paragraphs[0]
        pf.text = "POLIS Cartagena · Diagnóstico de Seguridad Humana 2026 · Corte 27 de Octubre de 2026"
        pf.font.size = PptxPt(10)
        pf.font.color.rgb = PPTX_GRAY

    # ================= SLIDE 1: PORTADA =================
    slide1 = prs.slides.add_slide(blank_layout)
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, PptxInches(13.333), PptxInches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = PPTX_NAVY
    bg1.line.fill.background()

    # Título central
    tb1 = slide1.shapes.add_textbox(PptxInches(1.2), PptxInches(2.0), PptxInches(11.0), PptxInches(3.5))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "DIAGNÓSTICO INTEGRAL DE SEGURIDAD HUMANA"
    p1.font.size = PptxPt(36)
    p1.font.bold = True
    p1.font.color.rgb = PPTX_WHITE

    p2 = tf1.add_paragraph()
    p2.text = "Cartagena de Indias (2012–2027) · Evaluación Multifuente de Metas, Acción y Resultados"
    p2.font.size = PptxPt(20)
    p2.font.color.rgb = PPTX_TEAL

    p3 = tf1.add_paragraph()
    p3.text = "\nDocumento Oficial de Soporte para la Formulación de Política Pública (POLIS)\nFecha de Corte: 27 de Octubre de 2026"
    p3.font.size = PptxPt(14)
    p3.font.color.rgb = PPTX_PALE

    # ================= SLIDE 2: RESUMEN EJECUTIVO =================
    slide2 = prs.slides.add_slide(blank_layout)
    agregar_fondo_header(slide2, "1. Resumen Ejecutivo y Marco Conceptual", "Enfoque de Seguridad Humana (ONU) y Rigor Metodológico")

    tb2 = slide2.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(11.7), PptxInches(5.4))
    tf2 = tb2.text_frame
    tf2.word_wrap = True

    p = tf2.paragraphs[0]
    p.text = "Objetivo del Diagnóstico:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    p = tf2.add_paragraph()
    p.text = "• Evaluar si las prioridades de los 8 Planes de Desarrollo (PDD/PDL) se convirtieron en bienes y servicios efectivos que impactaron la calidad de vida en Cartagena."
    p.font.size = PptxPt(13)
    p.font.color.rgb = PPTX_GRAY

    p = tf2.add_paragraph()
    p.text = "\nLos Tres Niveles de la Evidencia:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    p = tf2.add_paragraph()
    p.text = "1. La Apuesta: Metas y líneas estratégicas formuladas en los PDD distritales y PDL locales (4.637 metas integradas).\n" \
             "2. La Respuesta: Actividades ejecutadas en planes de acción (27.592) y recursos financieros pagados vía proyectos BPIN.\n" \
             "3. El Resultado: Comportamiento medido de tasas delictivas, pobreza, salud, ambiente y bienestar ciudadano."
    p.font.size = PptxPt(13)
    p.font.color.rgb = PPTX_GRAY

    p = tf2.add_paragraph()
    p.text = "\nRegla Metodológica Inviolable: Correlación ≠ Causalidad"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_ORANGE

    p = tf2.add_paragraph()
    p.text = "Una reducción en homicidios o pobreza no se atribuye automáticamente al plan vigente sin aislar factores exógenos y macroeconómicos."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    # ================= SLIDE 3: FUENTES PROCESADAS =================
    slide3 = prs.slides.add_slide(blank_layout)
    agregar_fondo_header(slide3, "2. Fuentes Oficiales Procesadas y Trazabilidad", "Banco reproducible de datos normalizados con huella SHA-256")

    tb3 = slide3.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(6.0), PptxInches(5.4))
    tf3 = tb3.text_frame
    tf3.word_wrap = True

    p = tf3.paragraphs[0]
    p.text = "Ecosistema de Datos Integrado:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    fuentes_txt = [
        ("Medicina Legal (2015–2024)", "Homicidios (411 en 2024), violencia intrafamiliar (323), interpersonal, sexual y vial."),
        ("Policía Nacional / MinDefensa", "Homicidios policiales (381), hurtos (comercio, casas, motos) y extorsión."),
        ("DANE (GEIH, ECSC, SAE)", "Pobreza monetaria (34,6% en 2025), desempleo (14,14%), informalidad (50,2%) y FIES."),
        ("DNP / TerriData", "Incidencia dengue (713/100k hab), violencia y variables sectoriales."),
        ("Unidad para las Víctimas (RUV)", "522 agregados por hecho victimizante e índice de riesgo municipal IRV."),
        ("Ambientales (IDEAM / INS)", "Monitoreo SISAIRE de calidad de aire e índice IRCA de agua potable (2,8%)."),
    ]
    for tit_f, desc_f in fuentes_txt:
        p = tf3.add_paragraph()
        p.text = f"• {tit_f}: {desc_f}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = PPTX_GRAY

    # Imagen lateral g01_cobertura.png
    img_cob = DIR_BASE / "g01_cobertura.png"
    if img_cob.exists():
        slide3.shapes.add_picture(str(img_cob), PptxInches(7.1), PptxInches(1.5), width=PptxInches(5.4))

    # ================= SLIDE 4: EVOLUCIÓN GLOBAL (7 EJES) =================
    slide4 = prs.slides.add_slide(blank_layout)
    agregar_fondo_header(slide4, "3. Evolución Global de la Agenda en Planes de Acción", "Distribución de actividades en los siete ejes de Seguridad Humana (2018–2025)")

    tb4 = slide4.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.0), PptxInches(5.4))
    tf4 = tb4.text_frame
    tf4.word_wrap = True

    p = tf4.paragraphs[0]
    p.text = "Hallazgos de Composición:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    p = tf4.add_paragraph()
    p.text = "• Crecimiento en Seguridad Económica: Aumento de +1,85 puntos porcentuales por año en planes de acción, reflejando prioridad en empleo y superación de pobreza."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    p = tf4.add_paragraph()
    p.text = "• Seguridad Comunitaria Dominante: Concentra más del 40% del volumen documental (programas de recreación, juventud, cultura e inclusión)."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    p = tf4.add_paragraph()
    p.text = "• Seguridad Personal Estable: Pasó del 22,0% al 14,4% del total de actividades, orientándose hacia inversión en tecnología de control."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    img_g02 = DIR_BASE / "g02_composicion.png"
    if img_g02.exists():
        slide4.shapes.add_picture(str(img_g02), PptxInches(6.0), PptxInches(1.4), width=PptxInches(6.8))

    # ================= SLIDES 5 A 11: LAS 7 DIMENSIONES =================
    slides_dimensiones = [
        ("Dimensión 1: Seguridad Personal", "g_eje_0.png", [
            "Homicidios: 411 en 2024 (Medicina Legal) vs. 427 en 2023. Tasa actual: 38,79 por 100.000 hab.",
            "Policía Nacional reporta 381 registros para 2024: universos metodológicos distintos que deben analizarse en paralelo.",
            "Hurtos: Fuerte incremento en hurto a motocicletas (503 en 2023 → 665 en 2024); baja en residencias (618 → 481).",
            "Extorsión: Subió de 197 a 382 casos reportados en los registros del archivo compartido.",
            "Reto: Articular equipamiento tecnológico con focalización en corredores críticos."
        ]),
        ("Dimensión 2: Seguridad Comunitaria", "g_eje_1.png", [
            "Mayor volumen de metas: Representa el 53,9% de las metas del PDD 2024–2027.",
            "Violencia intrafamiliar: Medicina Legal registra 323 casos en 2024; Policía registra 3.412 denuncias.",
            "Exámenes por presunto delito sexual: 430 en 2024 (baja frente a 500 en 2023).",
            "Sensibilidad financiera: La inversión reportada depende fuertemente de auditoría a expedientes BPIN comunitarios.",
            "Reto: Fortalecer comisarías de familia y casas de justicia en Localidades 2 y 3."
        ]),
        ("Dimensión 3: Seguridad Económica", "g_eje_2.png", [
            "Pobreza monetaria: Descenso favorable del 42,8% (2023) al 41,1% (2024) y 34,6% (2025).",
            "Desocupación: Repunte en el corte trimestral de fin de año, pasando del 10,94% (2024) al 14,14% (2025).",
            "Informalidad: Se sostiene alta en 50,20% en 2025.",
            "Diagnóstico integral: Coexisten avances en ingreso familiar con vulnerabilidades en empleo formal.",
            "Reto: Programas de empleo formal, microcrédito y transición productiva incluyente."
        ]),
        ("Dimensión 4: Seguridad Alimentaria", "g_eje_3.png", [
            "Escala de Inseguridad Alimentaria (FIES SAE): 28,10% en 2024 (IC 95%: 23,42–32,78%).",
            "Tendencia: El dato central aumentó frente al 22,15% de 2022, pero con intervalos estadísticos superpuestos.",
            "Nutrición infantil: Se precisa seguimiento a indicadores de peso/talla y prevalencia de desnutrición.",
            "Programas institucionales: El PAE y centros comunitarios constituyen la primera línea de protección nutricional.",
            "Reto: Asegurar continuidad y cobertura efectiva en sectores vulnerables."
        ]),
        ("Dimensión 5: Seguridad en Salud", "g_eje_4.png", [
            "Salud mental: Suicidios médico legales disminuyeron de 55 casos (2023) a 33 (2024).",
            "Epidemiología: Alerta por brote de dengue en 2024 (713,24 casos por 100.000 hab. en TerriData).",
            "Lesiones de tránsito: 632 casos en 2024 frente a 740 en 2023.",
            "Articulación sectorial: La salud humana requiere cruces inmediatos con saneamiento e infraestructura vial.",
            "Reto: Vigilancia epidemiológica temprana y centros de escucha comunitaria."
        ]),
        ("Dimensión 6: Seguridad Ambiental", "g_eje_5.png", [
            "Agua potable (IRCA): Calidad favorable en cabecera urbana (0,3% en 2023 y 2,8% en 2024).",
            "Brecha urbano-rural: Zona insular y corregimental requiere ampliación de redes y continuidad.",
            "Aire (SISAIRE): Niveles de material particulado monitoreados por estaciones en corredores industriales.",
            "Riesgo climático: Inundaciones por mareas y lluvias exigen culminación del Plan Maestro de Drenajes Pluviales.",
            "Reto: Adaptación climática con infraestructura verde y canalizaciones seguras."
        ]),
        ("Dimensión 7: Seguridad Política e Institucional", "g_eje_6.png", [
            "Víctimas del conflicto: RUV registra 522 hechos históricos; índice de riesgo IRV en 'Medio Bajo'.",
            "Participación ciudadana: 37 Mesas de Diálogo territoriales activas para la construcción de acuerdos.",
            "Garantía de Devolución de Razones: Cada aporte ciudadano cuenta con sustentación técnica y respuesta formal.",
            "Transparencia: Blindaje con hash criptográfico SHA-256 en actas de concertación ciudadana.",
            "Reto: Preservar memoria social y rendición de cuentas inalterable."
        ])
    ]

    for titulo_dim, img_dim, puntos_dim in slides_dimensiones:
        s_dim = prs.slides.add_slide(blank_layout)
        agregar_fondo_header(s_dim, titulo_dim, "Análisis de metas, actividades e indicadores de resultado")

        tb_dim = s_dim.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.6), PptxInches(5.4))
        tf_dim = tb_dim.text_frame
        tf_dim.word_wrap = True

        p = tf_dim.paragraphs[0]
        p.text = "Puntos Clave del Diagnóstico:"
        p.font.bold = True
        p.font.size = PptxPt(15)
        p.font.color.rgb = PPTX_NAVY

        for pt in puntos_dim:
            p = tf_dim.add_paragraph()
            p.text = f"• {pt}"
            p.font.size = PptxPt(11.5)
            p.font.color.rgb = PPTX_GRAY

        img_path = DIR_BASE / img_dim
        if img_path.exists():
            s_dim.shapes.add_picture(str(img_path), PptxInches(6.6), PptxInches(1.4), width=PptxInches(6.0))

    # ================= SLIDE 12: EFICIENCIA Y TRIADA =================
    slide12 = prs.slides.add_slide(blank_layout)
    agregar_fondo_header(slide12, "4. Triada de Gestión y Eficiencia de Recursos", "Articulación PDD ↔ Plan de Acción ↔ Proyectos BPIM (DEA)")

    tb12 = slide12.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(5.4), PptxInches(5.4))
    tf12 = tb12.text_frame
    tf12.word_wrap = True

    p = tf12.paragraphs[0]
    p.text = "Resultados del Análisis DEA y Triada:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    p = tf12.add_paragraph()
    p.text = "• 4.637 metas sistematizadas en los 8 planes (5 PDD + 3 PDL) con homologación al catálogo DNP."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    p = tf12.add_paragraph()
    p.text = "• 27.592 actividades evaluadas con seguimiento a apropiación, compromiso y pago efectivo."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    p = tf12.add_paragraph()
    p.text = "• Eficiencia de conversión: Se identificaron sectores con alta ejecución financiera pero baja trazabilidad en bienes finales, y áreas de alto rendimiento social."
    p.font.size = PptxPt(12)
    p.font.color.rgb = PPTX_GRAY

    img_heat = DIR_BASE / "g05_heat.png"
    if img_heat.exists():
        slide12.shapes.add_picture(str(img_heat), PptxInches(6.4), PptxInches(1.4), width=PptxInches(6.2))

    # ================= SLIDE 13: CONCLUSIONES Y PASO A FORMULACIÓN =================
    slide13 = prs.slides.add_slide(blank_layout)
    agregar_fondo_header(slide13, "5. Conclusiones y Próximos Pasos", "De la Fase 1 (Diagnóstico) a la Fase 2 (Formulación de la Política Pública)")

    tb13 = slide13.shapes.add_textbox(PptxInches(0.8), PptxInches(1.4), PptxInches(11.7), PptxInches(5.4))
    tf13 = tb13.text_frame
    tf13.word_wrap = True

    p = tf13.paragraphs[0]
    p.text = "Conclusiones Estratégicas:"
    p.font.bold = True
    p.font.size = PptxPt(16)
    p.font.color.rgb = PPTX_NAVY

    p = tf13.add_paragraph()
    p.text = "1. Diagnóstico Sólido: Se cuenta con una línea base robusta que supera interpretaciones unidimensionales y refleja la complejidad del territorio.\n" \
             "2. Priorización Evidenciada: Las 3 prioridades críticas identificadas son (a) contención de hurtos y extorsión, (b) informalidad laboral y pobreza residual, y (c) seguridad alimentaria y dengue.\n" \
             "3. Plataforma POLIS Habilitada: El motor de alternativas de solución y la formulación concertada de la política pública se encuentran listos para abrir la deliberación en las 37 mesas."
    p.font.size = PptxPt(13)
    p.font.color.rgb = PPTX_GRAY

    p = tf13.add_paragraph()
    p.text = "\nPróximo Paso: Habilitación de la Fase 2 en la Plataforma Distrital"
    p.font.bold = True
    p.font.size = PptxPt(15)
    p.font.color.rgb = PPTX_ORANGE

    p = tf13.add_paragraph()
    p.text = "El sistema POLIS activará el Banco de Alternativas y la matriz de formulación con control de versiones y participación ciudadana vinculante."
    p.font.size = PptxPt(13)
    p.font.color.rgb = PPTX_GRAY

    out_pptx = DIR_BASE / "diagnostico27102026.pptx"
    prs.save(str(out_pptx))
    print(f"PowerPoint/Google Slides generado: {out_pptx} ({out_pptx.stat().st_size} bytes)")
    return out_pptx

def crear_pdf_y_markdown():
    # PDF: Copiar el estudio visual multifuente recién generado a diagnostico27102026.pdf
    pdf_origen = DIR_BASE / "ESTUDIO_VISUAL_MULTIFUENTE_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf"
    pdf_destino = DIR_BASE / "diagnostico27102026.pdf"
    if pdf_origen.exists():
        shutil.copyfile(pdf_origen, pdf_destino)
        print(f"PDF generado: {pdf_destino} ({pdf_destino.stat().st_size} bytes)")

    # Markdown: Crear diagnostico27102026.md
    md_origen = DIR_BASE / "INFORME_INTEGRADO_SEGURIDAD_HUMANA_CARTAGENA_2026.md"
    md_destino = DIR_BASE / "diagnostico27102026.md"
    if md_origen.exists():
        shutil.copyfile(md_origen, md_destino)
        print(f"Markdown generado: {md_destino} ({md_destino.stat().st_size} bytes)")

def crear_copias_en_raiz():
    # Copiar a /root/polis/ para acceso directo del usuario
    for ext in ["docx", "pptx", "pdf", "md"]:
        f_orig = DIR_BASE / f"diagnostico27102026.{ext}"
        if f_orig.exists():
            shutil.copyfile(f_orig, ROOT / f"diagnostico27102026.{ext}")
            print(f"Copia creada en raíz: {ROOT / f'diagnostico27102026.{ext}'}")

if __name__ == "__main__":
    print("Iniciando generación de diagnostico27102026...")
    crear_documento_word()
    crear_presentacion_pptx()
    crear_pdf_y_markdown()
    crear_copias_en_raiz()
    print("¡Generación completada exitosamente!")
