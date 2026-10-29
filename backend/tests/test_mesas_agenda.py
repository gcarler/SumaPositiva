import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_ciclo_completo_agendas_mesas(database_url: str, cabeceras_gestion):
    """EDIT-02: Dinamización y gestión de cronograma de agendas de mesas en PostgreSQL."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Listar catálogo de agendas semilladas (36 mesas)
        resp_lista = client.get("/api/v1/mesas/agendas")
        assert resp_lista.status_code == 200
        agendas = resp_lista.json()
        assert len(agendas) >= 36
        assert any(a["id"] == "mt-001" for a in agendas)

        # 2. Filtrar por tipo y estado
        resp_filtro = client.get("/api/v1/mesas/agendas?tipo=territorial")
        assert resp_filtro.status_code == 200
        territoriales = resp_filtro.json()
        assert all(t["tipo"] == "territorial" for t in territoriales)

        # 3. Obtener agenda específica por ID
        resp_mt1 = client.get("/api/v1/mesas/agendas/mt-001")
        assert resp_mt1.status_code == 200
        assert resp_mt1.json()["nombre"].startswith("Mesa Territorial")

        # 4. Actualizar estado y fecha (reprogramación) mediante PATCH
        resp_patch = client.patch(
            "/api/v1/mesas/agendas/mt-001",
            json={
                "estado": "reprogramada",
                "fecha": "2026-10-18",
                "observaciones": "Reprogramada por cruce de agenda con Encuentro Distrital",
            },
        )
        assert resp_patch.status_code == 200
        actualizada = resp_patch.json()
        assert actualizada["estado"] == "reprogramada"
        assert actualizada["fecha"] == "2026-10-18"
        assert "Encuentro Distrital" in actualizada["observaciones"]

        # 5. Verificar persistencia tras recarga
        resp_get_check = client.get("/api/v1/mesas/agendas/mt-001")
        assert resp_get_check.status_code == 200
        assert resp_get_check.json()["estado"] == "reprogramada"
        assert resp_get_check.json()["fecha"] == "2026-10-18"

        # 6. Actualizar estado a 'en_curso'
        resp_en_curso = client.patch(
            "/api/v1/mesas/agendas/mt-001",
            json={"estado": "en_curso"},
        )
        assert resp_en_curso.status_code == 200
        assert resp_en_curso.json()["estado"] == "en_curso"

        # 7. Crear una nueva mesa sectorial sobrevenida
        nuevo_id = f"ms-sobrevenida-{uuid.uuid4().hex[:6]}"
        resp_crear = client.post(
            "/api/v1/mesas/agendas",
            json={
                "id": nuevo_id,
                "tipo": "sectorial",
                "nombre": "Mesa Sectorial Sobrevenida — Economía Popular y Vendedores Informales",
                "territorio": "Sector Bazurto - Mercado Central",
                "lugar": "Sede Asocomercio Bazurto",
                "fecha": "2026-11-05",
                "hora_inicio": "09:00",
                "hora_fin": "12:30",
                "estado": "programada",
                "dimensiones_onu": ["Seguridad Económica", "Seguridad Personal"],
                "responsable": "Secretaría de Hacienda Distrital",
                "observaciones": "Mesa solicitada por asociaciones de comerciantes",
            },
        )
        assert resp_crear.status_code == 201
        creada = resp_crear.json()
        assert creada["id"] == nuevo_id
        assert creada["tipo"] == "sectorial"
        assert creada["estado"] == "programada"

        # 8. Validar unicidad de ID (409 Conflict)
        resp_conflicto = client.post(
            "/api/v1/mesas/agendas",
            json={
                "id": nuevo_id,
                "tipo": "sectorial",
                "nombre": "Mesa Duplicada",
                "lugar": "Lugar X",
                "fecha": "2026-11-05",
            },
        )
        assert resp_conflicto.status_code == 409

        # 9. Manejo de errores: 404 para ID inexistente
        resp_404 = client.patch(
            "/api/v1/mesas/agendas/inexistente-12345",
            json={"estado": "reprogramada"},
        )
        assert resp_404.status_code == 404
