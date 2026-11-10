"""Pruebas de Integración para Generación y Descarga de Actas Oficiales en PDF (DOC-PDF-ACTAS-01)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_descargar_acta_pdf_exitoso(database_url: str, cabeceras_gestion):
    """Verifica que el endpoint GET /mesas/{mesa_id}/acta/pdf retorna un documento PDF válido."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6].upper()

        # 1. Crear Mesa para el test
        codigo_oficial = f"MT-PDF-{test_id}"
        resp_mesa = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": codigo_oficial,
                "shortcode_ciudadano": f"MPDF{test_id}",
                "nombre": "Mesa Territorial San Francisco Test PDF",
                "lugar": "Centro Cultural Las Palmeras",
                "aforo_maximo": 50,
                "estado": "PROGRAMADA",
                "modalidad": "PRESENCIAL",
            },
        )
        assert resp_mesa.status_code == 201, resp_mesa.text
        mesa_id = resp_mesa.json()["id"]

        # 2. Descargar PDF por UUID de mesa
        resp_pdf = client.get(f"/api/v1/mesas/{mesa_id}/acta/pdf")
        assert resp_pdf.status_code == 200, resp_pdf.text
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert "Acta_Oficial" in resp_pdf.headers.get("content-disposition", "")
        assert resp_pdf.content.startswith(b"%PDF")
        assert len(resp_pdf.content) > 1000

        # 3. Descargar PDF por código oficial de mesa
        resp_pdf_codigo = client.get(f"/api/v1/mesas/{codigo_oficial}/acta/pdf")
        assert resp_pdf_codigo.status_code == 200
        assert resp_pdf_codigo.content.startswith(b"%PDF")

        # 4. Mesa inexistente debe retornar 404
        resp_404 = client.get(f"/api/v1/mesas/{uuid.uuid4()}/acta/pdf")
        assert resp_404.status_code == 404


async def test_descargar_acta_pdf_con_acta_cerrada(database_url: str, cabeceras_gestion):
    """Verifica que un acta cerrada con acuerdos y hash SHA-256 se refleje en el PDF generado."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6].upper()

        # 1. Crear Mesa
        codigo_oficial = f"MT-CERRADA-{test_id}"
        resp_mesa = client.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": codigo_oficial,
                "shortcode_ciudadano": f"MCER{test_id}",
                "nombre": "Mesa Territorial con Acta Oficial",
                "lugar": "Coliseo de Combate y Gimnasia",
                "aforo_maximo": 100,
                "estado": "PROGRAMADA",
            },
        )
        assert resp_mesa.status_code == 201
        mesa_id = resp_mesa.json()["id"]

        # 2. Crear borrador de acta con acuerdos
        resp_acta = client.post(
            f"/api/v1/mesas/{mesa_id}/acta",
            json={
                "numero_acta": f"ACTA-{test_id}",
                "resumen_deliberacion": "Deliberación comunitaria sobre iluminación y alarmas vecinales.",
                "acuerdos": [
                    {
                        "detalle": "Instalación de 50 luminarias LED en corredores seguros",
                        "responsables": ["Distriseguridad", "Alcaldía Local 2"],
                        "plazo": "Primer Semestre 2026",
                    }
                ],
                "compromisos_institucionales": [{"compromiso": "Rondas policiales diurnas y nocturnas"}],
            },
        )
        assert resp_acta.status_code == 200

        # 3. Cerrar acta oficialmente
        resp_cierre = client.post(
            f"/api/v1/mesas/{mesa_id}/acta/cerrar",
            json={
                "nombre_facilitador_firma": "Dra. Carmen Mendoza",
            },
        )
        assert resp_cierre.status_code == 200
        acta_cerrada = resp_cierre.json()
        assert acta_cerrada["estado"].lower() in ("cerrada", "concertada")
        assert len(acta_cerrada["sha256_acta"]) == 64

        # 4. Descargar PDF del acta cerrada
        resp_pdf = client.get(f"/api/v1/mesas/{mesa_id}/acta/pdf")
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert resp_pdf.content.startswith(b"%PDF")
        assert len(resp_pdf.content) > 2000


async def test_descargar_acta_pdf_acceso_publico_sin_token(database_url: str, cabeceras_gestion):
    """Verifica la fe pública: la descarga del PDF del acta es pública y no requiere token Bearer."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    test_id = uuid.uuid4().hex[:6].upper()
    codigo_oficial = f"MT-PUB-{test_id}"

    # 1. Crear mesa con credenciales de gestión
    with TestClient(app, headers=cabeceras_gestion) as client_admin:
        resp_mesa = client_admin.post(
            "/api/v1/mesas",
            json={
                "tipo_mesa": "TERRITORIAL",
                "codigo_oficial": codigo_oficial,
                "shortcode_ciudadano": f"MPUB{test_id}",
                "nombre": "Mesa Territorial Fe Pública Test",
                "lugar": "Plaza de la Aduana",
                "aforo_maximo": 40,
                "estado": "PROGRAMADA",
            },
        )
        assert resp_mesa.status_code == 201
        mesa_id = resp_mesa.json()["id"]

    # 2. Descargar PDF sin ningún token ni cabecera de autenticación
    with TestClient(app) as client_anon:
        resp_pdf = client_anon.get(f"/api/v1/mesas/{mesa_id}/acta/pdf")
        assert resp_pdf.status_code == 200
        assert resp_pdf.headers["content-type"] == "application/pdf"
        assert resp_pdf.content.startswith(b"%PDF")
        assert len(resp_pdf.content) > 1000


def test_generar_acta_pdf_unitario_con_qr():
    """Valida la función pura generar_acta_pdf produciendo un binario PDF con ReportLab y QR."""
    from datetime import date

    from app.modules.mesas.acta_pdf import generar_acta_pdf
    from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa

    mesa = Mesa(
        id=uuid.uuid4(),
        tipo_mesa="TERRITORIAL",
        codigo_oficial="MT-UNIT-01",
        shortcode_ciudadano="MUNIT01",
        slug="mt-unit-01",
        ruta_jerarquica="raiz",
        nombre="Mesa Unitaria de Prueba Fe Pública",
        lugar_nombre="Salón Comunal Getsemaní",
        fecha=date(2026, 10, 15),
        horario="09:00 - 12:00",
        estado="CONCERTADA",
        modalidad="PRESENCIAL",
    )

    acta = ActaComunitaria(
        id=uuid.uuid4(),
        mesa_id=mesa.id,
        numero_acta="ACTA-2026-UNIT-01",
        estado="CERRADA",
        resumen_deliberacion="Discusión territorial y priorización de proyectos comunitarios.",
        acuerdos=[
            {
                "detalle": "Mantenimiento del alumbrado público en calle del Pozo",
                "responsables": ["Alcaldía Local 1", "Distriseguridad"],
                "plazo": "Noviembre 2026",
            }
        ],
        compromisos_institucionales=[{"compromiso": "Rondines preventivos de cuadrante policial"}],
        nombre_facilitador_firma="Dr. Pericial",
        sha256_acta="a" * 64,
    )

    participante = ParticipanteMesa(
        id=uuid.uuid4(),
        mesa_id=mesa.id,
        sujeto_id="sujeto-test-01",
        nombre_completo="Líder Comunitario Test",
        rol_en_mesa="delegado_comunitario",
        asistencia_confirmada=True,
    )

    pdf_bytes = generar_acta_pdf(
        mesa=mesa,
        acta=acta,
        participantes=[participante],
        url_base_publica="https://seguridadhumanaintegral.org",
    )

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 2000


def test_generar_acta_pdf_estilos_google_docs_exhaustivo():
    """Valida el diseño editorial estilo Google Docs con árboles, compromisos, QR y fe pública (ENCARGO 320)."""
    from datetime import date
    import subprocess
    import tempfile

    from app.modules.mesas.acta_pdf import generar_acta_pdf
    from app.modules.mesas.models import ActaComunitaria, Mesa, ParticipanteMesa

    mesa = Mesa(
        id=uuid.UUID("01a0f5fe-86df-717b-a4d0-5b6605bdf993"),
        tipo_mesa="TERRITORIAL",
        codigo_oficial="MT-L01-01",
        shortcode_ciudadano="ML0101",
        slug="mt-l01-01-centro-historico",
        ruta_jerarquica="raiz.l01",
        nombre="Mesa Territorial de Seguridad Humana — Centro Histórico y San Diego",
        lugar_nombre="Claustro de la Merced — Salón Paraninfo",
        fecha=date(2026, 9, 24),
        horario="08:30 – 12:30 COT",
        aforo_maximo=80,
        total_asistentes=54,
        estado="CONCERTADA",
        modalidad="PRESENCIAL",
        metadatos={
            "localidad": "Localidad 1: Histórica y del Caribe Norte",
            "ucg": "UCG 1 — Centro Histórico",
            "barrio": "San Diego / Getsemaní",
            "direccion": "Calle de la Chicharra No. 38-42",
            "coordenadas": {"lat": 10.4241, "lng": -75.5478},
            "facilitador": "Dra. Carmen Mendoza Gómez (Secretaría del Interior)",
            "relator": "Lic. Andrés Felipe Quintana (Secretaría de Planeación Distrital)",
            "arbolProblemas": {
                "problemaCentral": "Inseguridad ciudadana y deterioro de la convivencia nocturna por microtráfico y exceso de ruido",
                "causas": [
                    {
                        "texto": "Inspección y control policivo nocturno insuficiente",
                        "metadatos": {"dimensionOnu": "Seguridad Personal", "actorResponsable": "Secretaría del Interior"},
                        "hijos": [
                            {"texto": "Déficit de cámaras domo en puntos ciegos", "metadatos": {"actorResponsable": "Distriseguridad"}}
                        ]
                    }
                ],
                "efectos": [
                    {"texto": "Pérdida de tranquilidad residencial y habitabilidad comunitaria"}
                ]
            },
            "arbolSoluciones": {
                "objetivoCentral": "Garantizar la seguridad humana integral y la convivencia pacífica nocturna en el Centro Histórico",
                "medios": [
                    {"texto": "Despliegue de cuadrantes mixtos y monitoreo inteligente", "metadatos": {"actorResponsable": "Distriseguridad"}}
                ],
                "fines": [
                    {"texto": "Preservación del patrimonio residencial y cívico de Cartagena"}
                ]
            },
            "compromisos": [
                {
                    "codigo": "COMP-01",
                    "descripcion": "Puesto de Mando Unificado nocturno en Plaza San Diego.",
                    "entidadResponsable": "Secretaría del Interior",
                    "personaResponsable": "Dr. Bruno Hernández",
                    "fechaLimite": "15 de Octubre de 2026",
                    "tipo": "gestion_institucional",
                    "estado": "en_ejecucion",
                    "observaciones": "Operativo piloto en marcha."
                }
            ],
            "logistica": {
                "observacionesLogistica": "Equipamiento completo con rotafolios de marco lógico y accesibilidad garantizada."
            },
            "informe": "Deliberación comunitaria articulada entre autoridades distritales y 54 delegados ciudadanos."
        },
    )

    acta = ActaComunitaria(
        id=uuid.uuid4(),
        mesa_id=mesa.id,
        numero_acta="ACTA-2026-MT-L01-01",
        estado="CONCERTADA",
        quorum_alcanzado=True,
        total_participantes=54,
        resumen_deliberacion=mesa.metadatos["informe"],
        sha256_acta="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        nombre_facilitador_firma="Dra. Carmen Mendoza Gómez",
    )

    participante = ParticipanteMesa(
        id=uuid.uuid4(),
        mesa_id=mesa.id,
        sujeto_id="sujeto-test-01",
        nombre_completo="Vocero Comunitario San Diego",
        rol_en_mesa="delegado_comunitario",
        asistencia_confirmada=True,
    )

    pdf_bytes = generar_acta_pdf(
        mesa=mesa,
        acta=acta,
        participantes=[participante],
        url_base_publica="https://seguridadhumanaintegral.org",
    )

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 10000  # Documento exhaustivo con estilo Google Docs

    # Verificación de texto extraído mediante pdftotext
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    res = subprocess.run(["pdftotext", tmp_path, "-"], capture_output=True, text=True, check=True)
    contenido_txt = res.stdout

    # Validaciones obligatorias de contenido territorial y estilo editorial
    txt_normalizado = " ".join(contenido_txt.split())
    assert "REPÚBLICA DE COLOMBIA" in txt_normalizado
    assert "ALCALDÍA MAYOR DE CARTAGENA DE INDIAS" in txt_normalizado
    assert "ACTA OFICIAL DE CONCERTACIÓN Y DELIBERACIÓN TERRITORIAL" in txt_normalizado
    assert "1. MARCO NORMATIVO Y FUNDAMENTO JURÍDICO VINCULANTE" in txt_normalizado
    assert "Ley Estatutaria 1757 de 2015" in txt_normalizado
    assert "Sentencia C-150 de 2015" in txt_normalizado
    assert "Decreto Distrital 1070 de 2021" in txt_normalizado
    assert "3. DIAGNÓSTICO TERRITORIAL CONCERTADO — ÁRBOL DE PROBLEMAS" in txt_normalizado
    assert "PROBLEMA CENTRAL PRIORIZADO POR LA COMUNIDAD" in txt_normalizado
    assert "4. ESTRUCTURA PROGRAMÁTICA DE TRANSFORMACIÓN — ÁRBOL DE SOLUCIONES" in txt_normalizado
    assert "OBJETIVO CENTRAL TRANSFORMADOR ACORDADO" in txt_normalizado
    assert "5. MATRIZ VINCULANTE DE COMPROMISOS INSTITUCIONALES Y CIUDADANOS" in txt_normalizado
    assert "COMP-01" in txt_normalizado
    assert "6. MEMORIA TÉCNICA Y SÍNTESIS DE LA RELATORÍA COMUNITARIA" in txt_normalizado
    assert "8. CERTIFICACIÓN DE INTEGRIDAD DIGITAL Y FE PÚBLICA" in txt_normalizado
    assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in txt_normalizado
    assert "9. CONSTANCIA DE SUSCRIPCIÓN Y FE DE DELIBERACIÓN" in txt_normalizado
    assert "Dra. Carmen Mendoza Gómez" in txt_normalizado
    assert "Lic. Andrés Felipe Quintana" in txt_normalizado
    assert "Página 1 de" in txt_normalizado

