import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_ciclo_completo_fuentes_informacion(database_url: str, cabeceras_gestion):
    """EDIT-03: Persistencia backend para fuentes de información y solicitudes oficiales."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Consultar catálogo inicial sembrado (18 fuentes oficiales)
        resp_lista = client.get("/api/v1/fuentes")
        assert resp_lista.status_code == 200
        fuentes = resp_lista.json()
        assert len(fuentes) >= 18
        assert any(f["codigo"] == "FNT-LOC-001" for f in fuentes)
        assert any(f["codigo"] == "FNT-NAC-001" for f in fuentes)
        assert any(f["codigo"] == "FNT-INT-001" for f in fuentes)

        # 2. Filtrado por ámbito y estado
        resp_loc = client.get("/api/v1/fuentes?ambito=local")
        assert resp_loc.status_code == 200
        assert all(f["ambito"] == "local" for f in resp_loc.json())

        resp_entregadas = client.get("/api/v1/fuentes?estado=entregada")
        assert resp_entregadas.status_code == 200
        assert all(f["estado_entrega"] == "entregada" for f in resp_entregadas.json())

        # 3. KPIs agregados
        resp_kpis = client.get("/api/v1/fuentes/kpis")
        assert resp_kpis.status_code == 200
        kpis = resp_kpis.json()
        assert kpis["total"] >= 18
        assert kpis["entregadas"] >= 1
        assert "porcentaje_cumplimiento" in kpis

        # 4. Detalle de una fuente específica
        resp_fnt = client.get("/api/v1/fuentes/fnt-loc-01")
        assert resp_fnt.status_code == 200
        assert resp_fnt.json()["codigo"] == "FNT-LOC-001"
        assert resp_fnt.json()["entidad"] == "Policía Metropolitana de Cartagena (MECAR)"

        # 5. Actualización de radicado y estado mediante PATCH (solicitud oficial)
        resp_patch = client.patch(
            "/api/v1/fuentes/fnt-loc-05",
            json={
                "radicado_solicitud": "DIST-SEC-2026-INSISTENCIA-99",
                "estado_entrega": "entregada",
                "resumen_datos": "Datos ambientales entregados formalmente tras requerimiento.",
                "observaciones_calidad": "Validación pericial de emisión sonora y cuenca.",
            },
        )
        assert resp_patch.status_code == 200
        actualizada = resp_patch.json()
        assert actualizada["radicado_solicitud"] == "DIST-SEC-2026-INSISTENCIA-99"
        assert actualizada["estado_entrega"] == "entregada"
        assert "requerimiento" in actualizada["resumen_datos"]

        # 6. Verificación de persistencia tras recarga
        resp_check = client.get("/api/v1/fuentes/fnt-loc-05")
        assert resp_check.status_code == 200
        assert resp_check.json()["radicado_solicitud"] == "DIST-SEC-2026-INSISTENCIA-99"
        assert resp_check.json()["estado_entrega"] == "entregada"

        # 7. Creación de nueva fuente con radicado oficial (POST)
        nueva_id = f"fnt-loc-qa-{uuid.uuid4().hex[:6]}"
        codigo_qa = f"FNT-QA-{uuid.uuid4().hex[:4].upper()}"
        resp_post = client.post(
            "/api/v1/fuentes",
            json={
                "id": nueva_id,
                "codigo": codigo_qa,
                "entidad": "Secretaría de Hacienda Distrital",
                "nombre_fuente": "Recaudo ICA y Predial Cartagena",
                "tipo": "secundaria",
                "ambito": "local",
                "dimension_seguridad": "economica",
                "periodicidad": "trimestral",
                "radicado_solicitud": "HAC-RAD-2026-0044",
                "fecha_solicitud": "2026-03-01",
                "fecha_limite_respuesta": "2026-04-01",
                "estado_entrega": "en_termino",
                "variables_solicitadas": ["Recaudo por comuna", "Cartera morosa"],
            },
        )
        assert resp_post.status_code == 201
        creada = resp_post.json()
        assert creada["id"] == nueva_id
        assert creada["codigo"] == codigo_qa

        # 8. Validar 404 ante fuente inexistente
        resp_404 = client.get("/api/v1/fuentes/fnt-inexistente-999")
        assert resp_404.status_code == 404

    # 9. Verificación de auditoría forense inmutable en PostgreSQL
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            registros = await conn.execute(
                text("""
                    SELECT accion, tabla_afectada, metadatos
                    FROM auditoria.registros_auditoria
                    WHERE tabla_afectada = 'auditoria.fuentes_informacion'
                    ORDER BY creado_en DESC
                    LIMIT 5
                """)
            )
            filas = registros.fetchall()
            assert len(filas) >= 2
            acciones = [f[0] for f in filas]
            assert "ACTUALIZAR_FUENTE_INFORMACION" in acciones or "CREAR_FUENTE_INFORMACION" in acciones
    finally:
        await engine.dispose()


def test_seguridad_permisos_fuentes(database_url: str):
    """Verifica que mutaciones a fuentes requieran autenticación y permiso 'fuentes:gestionar'."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as anonymous_client:
        # Intento de creación anónima -> 401
        resp_post = anonymous_client.post(
            "/api/v1/fuentes",
            json={
                "codigo": "FNT-HACK-01",
                "entidad": "Entidad No Autorizada",
                "nombre_fuente": "Fuente Spoofed",
            },
        )
        assert resp_post.status_code == 401

        # Intento de actualización anónima -> 401
        resp_patch = anonymous_client.patch(
            "/api/v1/fuentes/fnt-loc-01",
            json={"estado_entrega": "vencida_sin_entrega"},
        )
        assert resp_patch.status_code == 401
