import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.identidad.repository import IdentidadRepository
from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
from app.modules.identidad.service import IdentidadService


@pytest.fixture
def cabeceras_auditor(prepared_test_database):
    """Cuenta y sesión reales de auditor_forense para verificar restricción 403 en escritura."""
    if not prepared_test_database:
        pytest.skip("Configura una base exclusiva de pruebas")

    async def iniciar():
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            correo = f"auditor-{uuid.uuid4().hex}@example.org"
            async with sessions() as session:
                service = IdentidadService(session)
                usuario = await service.registrar_usuario(
                    UsuarioCreacion(
                        correo=correo,
                        contrasena="PruebaAuditor2026*",
                        nombres="Auditor",
                        apellidos="Forense",
                    )
                )
                async with transaction(session):
                    repo = IdentidadRepository(session)
                    cuenta = await repo.obtener_usuario_por_id(usuario.id)
                    rol = await repo.obtener_rol_por_codigo("auditor_forense")
                    cuenta.rol_id, cuenta.rol = rol.id, rol
                    await repo.guardar()
                return (
                    await service.autenticar_usuario(
                        LoginPeticion(correo=correo, contrasena="PruebaAuditor2026*")
                    )
                ).token_acceso
        finally:
            await engine.dispose()

    return {"Authorization": f"Bearer {asyncio.run(iniciar())}"}


def test_listar_compromisos_canonicos_sembrados(database_url: str):
    """Verifica que los compromisos canónicos estén persistidos y disponibles."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        resp = client.get("/api/v1/compromisos")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) >= 10
        codigos = [c["codigo"] for c in items]
        assert "PAS-SEC-01" in codigos
        assert "PAS-JUV-02" in codigos
        assert "PAS-SEG-03" in codigos
        assert "PAS-ETN-10" in codigos


def test_flujo_completo_persistencia_compromiso_y_auditoria(database_url: str, cabeceras_gestion):
    """Prueba creación, actualización de avance y registro pericial inmutable en auditoría."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_gestion) as client:
        codigo_unico = f"PAS-TEST-{uuid.uuid4().hex[:6].upper()}"
        nuevo_compromiso = {
            "codigo": codigo_unico,
            "nombre": "Plan de Choque para Seguridad en Playas",
            "descripcion": "Instalación de boyas inteligentes y salvavidas en Bocagrande.",
            "entidad_responsable": "Distriseguridad",
            "linea_estrategica_codigo": "LE-01",
            "alternativa_mga_codigo": "ALT-SEG-06",
            "indicador_asociado_codigo": "IND-PROD-01",
            "meta_cuatrienal_descripcion": "Instalar 100 boyas",
            "meta_cuatrienal_valor": 100,
            "unidad_medida": "Boyas instaladas",
            "avance_cuatrienal_valor": 10,
            "porcentaje_cumplimiento": 10,
            "presupuesto_anual_cop": 500000000,
            "vigencias_programadas": [2026, 2027],
            "estado": "en_ejecucion",
            "fecha_corte_ultimo_reporte": "2026-10-01",
            "metadatos": {"fuente_financiamiento": "FONSET"},
        }

        # 1. Crear compromiso
        resp_crear = client.post("/api/v1/compromisos", json=nuevo_compromiso)
        assert resp_crear.status_code == 201, resp_crear.text
        datos_creado = resp_crear.json()
        compromiso_id = datos_creado["id"]
        assert datos_creado["codigo"] == codigo_unico

        # 2. Actualizar avance
        resp_avance = client.patch(
            f"/api/v1/compromisos/{compromiso_id}/avance",
            json={
                "avance_cuatrienal_valor": 95,
                "observacion_cualitativa": "Operativo exitoso al 95%",
                "url_evidencia": "https://evidencias.cartagena.gov.co/playas.pdf",
            },
        )
        assert resp_avance.status_code == 200, resp_avance.text
        datos_avance = resp_avance.json()
        assert datos_avance["avance_cuatrienal_valor"] == 95
        assert datos_avance["porcentaje_cumplimiento"] == 95
        assert datos_avance["estado"] == "en_ejecucion"
        assert datos_avance["metadatos"]["observacion_cualitativa"] == "Operativo exitoso al 95%"

        # 3. Consultar persistencia real (GET directo)
        resp_get = client.get(f"/api/v1/compromisos/{compromiso_id}")
        assert resp_get.status_code == 200
        assert resp_get.json()["avance_cuatrienal_valor"] == 95

        # 4. Verificar registro forense en /api/v1/auditoria/registros
        resp_auditoria = client.get("/api/v1/auditoria/registros?tabla=compromisos_pas")
        assert resp_auditoria.status_code == 200
        registros = resp_auditoria.json()["elementos"]
        assert any(
            r["registro_id"] == compromiso_id and r["accion"] in ("compromiso_creado", "compromiso_actualizado")
            for r in registros
        )


def test_auditor_forense_recibe_403_en_escritura(database_url: str, cabeceras_auditor):
    """Criterio de aceptación AUD-01: auditor_forense tiene solo lectura y recibe 403 en mutaciones."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app, headers=cabeceras_auditor) as client:
        # 1. Auditor puede leer
        resp_lectura = client.get("/api/v1/compromisos")
        assert resp_lectura.status_code == 200

        # 2. Auditor recibe 403 al crear
        resp_crear = client.post(
            "/api/v1/compromisos",
            json={
                "codigo": "PAS-UNAUTH-01",
                "nombre": "Intento no autorizado",
                "descripcion": "No debe permitirse",
                "entidad_responsable": "Distriseguridad",
                "linea_estrategica_codigo": "LE-01",
                "alternativa_mga_codigo": "ALT-SEG-06",
                "indicador_asociado_codigo": "IND-PROD-01",
                "meta_cuatrienal_descripcion": "Test",
                "meta_cuatrienal_valor": 10,
                "unidad_medida": "Unidades",
            },
        )
        assert resp_crear.status_code == 403

        # 3. Auditor recibe 403 al actualizar avance
        resp_avance = client.patch(
            "/api/v1/compromisos/PAS-SEC-01/avance",
            json={"avance_cuatrienal_valor": 90},
        )
        assert resp_avance.status_code == 403

        # 4. Auditor recibe 403 al eliminar
        resp_eliminar = client.delete("/api/v1/compromisos/PAS-SEC-01")
        assert resp_eliminar.status_code == 403
