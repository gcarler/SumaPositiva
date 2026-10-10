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
                "compromisos_institucionales": [
                    {"compromiso": "Rondas policiales diurnas y nocturnas"}
                ],
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
