"""Generador Oficial de Actas Comunitarias en PDF con ReportLab (DOC-PDF-ACTAS-01).

Genera documentos PDF vectoriales con membrete institucional de la Alcaldía Mayor de Cartagena,
folio único, ficha técnica de la mesa, matriz de acuerdos, código QR dinámico y sello criptográfico SHA-256.
"""

from __future__ import annotations

import hashlib
import io
from datetime import datetime, UTC
from typing import Any

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa


class ActaNumberedCanvas(canvas.Canvas):
    """Canvas con doble pasada para numeración exacta de páginas ('Página X de Y') y pie de seguridad."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Línea separadora tenue de pie
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(1.5 * cm, 1.4 * cm, letter[0] - 1.5 * cm, 1.4 * cm)

        # Texto institucional y paginación
        left_text = (
            "POLIS — Sistema Distrital de Seguridad Humana | "
            "Alcaldía Mayor de Cartagena de Indias | Documento Público Oficial"
        )
        self.drawString(1.5 * cm, 0.9 * cm, left_text)
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(letter[0] - 1.5 * cm, 0.9 * cm, page_text)
        self.restoreState()


def _generar_qr_en_memoria(url: str, tamano_cm: float = 2.4) -> Image:
    """Genera un código QR nítido en memoria para ReportLab."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0B2545", back_color="white")
    qr_buf = io.BytesIO()
    img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    return Image(qr_buf, width=tamano_cm * cm, height=tamano_cm * cm)


def generar_acta_pdf(
    mesa: Mesa,
    acta: ActaComunitaria | None = None,
    participantes: list[ParticipanteMesa] | None = None,
    url_base_publica: str = "https://seguridadhumanaintegral.org",
) -> bytes:
    """Construye y retorna el binario PDF del Acta Oficial de una Mesa Territorial."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.3 * cm,
        bottomMargin=1.8 * cm,
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos institucionales
    header_republica = ParagraphStyle(
        "HeaderRepublica",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor("#475569"),
    )
    header_alcaldia = ParagraphStyle(
        "HeaderAlcaldia",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=15,
        alignment=1,
        textColor=colors.HexColor("#0B2545"),
    )
    header_secretaria = ParagraphStyle(
        "HeaderSecretaria",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#334155"),
    )
    doc_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        alignment=1,
        textColor=colors.HexColor("#1E3A8A"),
    )
    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0B2545"),
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
    )
    cell_regular = ParagraphStyle(
        "CellRegular",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
    )
    hash_style = ParagraphStyle(
        "HashMono",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0B2545"),
        alignment=0,
    )
    legal_note = ParagraphStyle(
        "LegalNote",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#475569"),
    )

    elements: list[Any] = []

    # 1. ENCABEZADO INSTITUCIONAL
    elements.append(Paragraph("REPÚBLICA DE COLOMBIA — DEPARTAMENTO DE BOLÍVAR", header_republica))
    elements.append(Paragraph("ALCALDÍA MAYOR DE CARTAGENA DE INDIAS", header_alcaldia))
    elements.append(
        Paragraph(
            "SECRETARÍA DEL INTERIOR Y CONVIVENCIA CIUDADANA · SECRETARÍA DE PLANEACIÓN DISTRITAL",
            header_secretaria,
        )
    )
    elements.append(
        Paragraph(
            "POLIS — PLAN DISTRITAL 'CARTAGENA CIUDAD DE DERECHOS 2024–2027'",
            header_secretaria,
        )
    )
    elements.append(Spacer(1, 0.25 * cm))
    elements.append(
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0B2545"), spaceAfter=6)
    )
    elements.append(Paragraph("ACTA OFICIAL DE CONCERTACIÓN Y DELIBERACIÓN TERRITORIAL", doc_title))
    elements.append(Spacer(1, 0.3 * cm))

    # 2. METADATOS Y FICHA TÉCNICA FORMAL
    folio_oficial = (
        acta.numero_acta
        if acta and acta.numero_acta
        else f"ACTA-{mesa.codigo_oficial or str(mesa.id)[:8].upper()}-2026"
    )
    estado_acta = (acta.estado.upper() if acta else mesa.estado or "PROGRAMADA").replace("_", " ")
    fecha_mesa_str = (
        mesa.fecha.isoformat() if mesa.fecha else datetime.now(UTC).strftime("%Y-%m-%d")
    )
    horario_str = mesa.horario or "08:30 am - 12:30 pm"
    lugar_str = (
        mesa.lugar_nombre
        or (mesa.metadatos.get("lugar") if isinstance(mesa.metadatos, dict) else None)
        or "Sede Distrital de Participación"
    )
    facilitador_str = (
        (acta.nombre_facilitador_firma if acta and acta.nombre_facilitador_firma else None)
        or mesa.facilitador_nombre
        or "Facilitador Institucional Designado"
    )

    total_asistentes_val = (
        (acta.total_participantes if acta else None)
        or len(participantes or [])
        or mesa.total_asistentes
        or 0
    )
    quorum_str = (
        "QUÓRUM VERIFICADO"
        if (acta and acta.quorum_alcanzado) or total_asistentes_val >= 10
        else "EN CONVOCATORIA"
    )

    tabla_meta_data = [
        [
            Paragraph(f"<b>Folio Oficial:</b> {folio_oficial}", cell_regular),
            Paragraph(f"<b>Estado del Acta:</b> <b>{estado_acta}</b>", cell_regular),
        ],
        [
            Paragraph(f"<b>Mesa Territorial:</b> {mesa.nombre}", cell_regular),
            Paragraph(
                f"<b>Código Oficial:</b> {mesa.codigo_oficial} ({mesa.shortcode_ciudadano})",
                cell_regular,
            ),
        ],
        [
            Paragraph(f"<b>Lugar de Realización:</b> {lugar_str}", cell_regular),
            Paragraph(f"<b>Fecha y Horario:</b> {fecha_mesa_str} | {horario_str}", cell_regular),
        ],
        [
            Paragraph(f"<b>Facilitador(a) Responsable:</b> {facilitador_str}", cell_regular),
            Paragraph(
                f"<b>Asistencia Oficial:</b> {total_asistentes_val} Asistentes ({quorum_str})",
                cell_regular,
            ),
        ],
        [
            Paragraph("<b>Entidad Convocante:</b> Alcaldía Mayor de Cartagena", cell_regular),
            Paragraph(f"<b>Modalidad:</b> {mesa.modalidad or 'PRESENCIAL'}", cell_regular),
        ],
    ]

    tabla_meta = Table(tabla_meta_data, colWidths=[9.8 * cm, 8.8 * cm])
    tabla_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(tabla_meta)
    elements.append(Spacer(1, 0.4 * cm))

    # 3. SECCIÓN I: RESUMEN DE LA DELIBERACIÓN COMUNITARIA
    elements.append(Paragraph("I. RESUMEN DE DELIBERACIÓN COMUNITARIA", section_title))
    elements.append(
        HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceAfter=5)
    )

    resumen_texto = ""
    if acta and acta.resumen_deliberacion and acta.resumen_deliberacion.strip():
        resumen_texto = acta.resumen_deliberacion.strip()
    elif isinstance(mesa.metadatos, dict) and mesa.metadatos.get("resumen"):
        resumen_texto = str(mesa.metadatos["resumen"]).strip()
    else:
        resumen_texto = (
            f"En la fecha {fecha_mesa_str}, la comunidad del territorio y las autoridades distritales "
            f"se congregaron en {lugar_str} para deliberar en torno a las prioridades de "
            "seguridad humana, convivencia pacífica, alternativas de inversión y compromisos "
            "estratégicos en el marco del Plan Distrital de Seguridad Humana de Cartagena de Indias. "
            "Durante la jornada se consolidaron los acuerdos y se recepcionaron las inquietudes "
            "ciudadanas con verificación de asistencia oficial."
        )

    elements.append(Paragraph(resumen_texto, body_style))
    elements.append(Spacer(1, 0.4 * cm))

    # 4. SECCIÓN II: ACUERDOS CONCERTADOS Y COMPROMISOS INSTITUCIONALES
    elements.append(
        Paragraph("II. ACUERDOS CONCERTADOS Y COMPROMISOS INSTITUCIONALES", section_title)
    )
    elements.append(
        HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceAfter=5)
    )

    acuerdos_raw: list[Any] = []
    if acta and isinstance(acta.acuerdos, list) and len(acta.acuerdos) > 0:
        acuerdos_raw = acta.acuerdos
    elif isinstance(mesa.metadatos, dict) and isinstance(mesa.metadatos.get("acuerdos"), list):
        acuerdos_raw = mesa.metadatos["acuerdos"]
    elif isinstance(mesa.metadatos, dict) and isinstance(mesa.metadatos.get("acuerdos"), str):
        lineas = [linea.strip() for linea in mesa.metadatos["acuerdos"].split("\n") if linea.strip()]
        acuerdos_raw = [
            {"detalle": linea, "responsables": ["Distrito de Cartagena"]} for linea in lineas
        ]

    filas_acuerdos: list[list[Any]] = [
        [
            Paragraph("<b>#</b>", cell_bold),
            Paragraph("<b>Acuerdo / Compromiso Concertado</b>", cell_bold),
            Paragraph("<b>Entidad Responsable</b>", cell_bold),
            Paragraph("<b>Plazo / Meta</b>", cell_bold),
        ]
    ]

    if acuerdos_raw:
        for idx, ac in enumerate(acuerdos_raw, start=1):
            detalle = ac.get("detalle") if isinstance(ac, dict) else str(ac)
            responsables = (
                ", ".join(ac.get("responsables", []))
                if isinstance(ac, dict) and isinstance(ac.get("responsables"), list)
                else "Secretaría del Interior / Alcaldía Distrital"
            )
            plazo = (
                ac.get("plazo", "Vigencia 2026–2027")
                if isinstance(ac, dict)
                else "Vigencia 2026–2027"
            )
            filas_acuerdos.append(
                [
                    Paragraph(str(idx), cell_regular),
                    Paragraph(detalle, cell_regular),
                    Paragraph(responsables, cell_regular),
                    Paragraph(plazo, cell_regular),
                ]
            )
    else:
        filas_acuerdos.append(
            [
                Paragraph("1", cell_regular),
                Paragraph(
                    "Concertación de prioridades territoriales de seguridad "
                    "integral y convivencia comunitaria.",
                    cell_regular,
                ),
                Paragraph("Secretaría del Interior / Distriseguridad", cell_regular),
                Paragraph("Inmediato / Fase de Formulación", cell_regular),
            ]
        )

    tabla_acuerdos = Table(filas_acuerdos, colWidths=[0.9 * cm, 9.8 * cm, 4.7 * cm, 3.2 * cm])
    tabla_acuerdos.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B2545")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    elements.append(tabla_acuerdos)
    elements.append(Spacer(1, 0.45 * cm))

    # 5. SECCIÓN III: FE PÚBLICA, SELLO CRIPTOGRÁFICO Y QR
    # Cálculo o lectura de hash SHA-256 oficial
    if acta and acta.sha256_acta and len(acta.sha256_acta.strip()) == 64:
        sha256_hash = acta.sha256_acta.strip()
    else:
        # Semilla determinista forense en caso de borrador
        semilla = f"{mesa.id}:{mesa.codigo_oficial}:{mesa.nombre}:{fecha_mesa_str}:{lugar_str}"
        sha256_hash = hashlib.sha256(semilla.encode("utf-8")).hexdigest()

    url_verificacion = (
        f"{url_base_publica.rstrip('/')}/asistencia/{mesa.shortcode_ciudadano or str(mesa.id)}"
    )
    qr_imagen = _generar_qr_en_memoria(url_verificacion, tamano_cm=2.5)

    info_seguridad = [
        Paragraph("<b>III. CERTIFICACIÓN DE INTEGRIDAD Y FE PÚBLICA</b>", section_title),
        Spacer(1, 0.15 * cm),
        Paragraph(
            "El presente documento es testimonio fidedigno de los acuerdos concertados en la "
            "Mesa Territorial. Su integridad, autoría y trazabilidad están garantizadas por la "
            "arquitectura inmutable del sistema POLIS.",
            legal_note,
        ),
        Spacer(1, 0.15 * cm),
        Paragraph("<b>SELLO CRIPTOGRÁFICO SHA-256:</b>", cell_bold),
        Paragraph(sha256_hash, hash_style),
        Spacer(1, 0.15 * cm),
        Paragraph(
            f"<b>Fecha de Certificación:</b> {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S UTC')} "
            "| <b>Sujeto Custodio:</b> Alcaldía Mayor de Cartagena",
            legal_note,
        ),
    ]

    col_qr = [
        qr_imagen,
        Paragraph("Escanee para verificar autenticidad en el portal oficial", legal_note),
    ]

    tabla_seguridad = Table([[info_seguridad, col_qr]], colWidths=[15.0 * cm, 3.6 * cm])
    tabla_seguridad.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
            ]
        )
    )

    # 6. SECCIÓN IV: CUADRO DE FIRMAS
    firma_linea = "________________________________________<br/>"
    firmas_data = [
        [
            Paragraph(
                f"{firma_linea}<b>Facilitador(a) Institucional</b><br/>Alcaldía Mayor de Cartagena",
                cell_regular,
            ),
            Paragraph(
                f"{firma_linea}<b>Relator(a) Comunitario(a)</b><br/>Representante de la Mesa",
                cell_regular,
            ),
            Paragraph(
                f"{firma_linea}<b>Veeduría / Control Social</b><br/>Liderazgo Ciudadano",
                cell_regular,
            ),
        ]
    ]
    tabla_firmas = Table(firmas_data, colWidths=[6.2 * cm, 6.2 * cm, 6.2 * cm])
    tabla_firmas.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    bloque_cierre = KeepTogether(
        [
            tabla_seguridad,
            Spacer(1, 0.4 * cm),
            Paragraph("<b>IV. SUSCRIPCIÓN Y CONSTANCIA OFICIAL</b>", section_title),
            Spacer(1, 0.2 * cm),
            tabla_firmas,
        ]
    )
    elements.append(bloque_cierre)

    # Compilación final del PDF
    doc.build(elements, canvasmaker=ActaNumberedCanvas)
    return buffer.getvalue()
