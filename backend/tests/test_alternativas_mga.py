import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app


def test_listar_alternativas_publicas(database_url: str):
    """Verifica la consulta pública de iniciativas del Banco Distrital MGA."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        # Consulta sin autenticación
        resp = client.get("/api/v1/alternativas")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) >= 8

        codigos = [a["codigo"] for a in items]
        assert "ALT-ESCNNA-01" in codigos
        assert "ALT-CONV-02" in codigos
        assert "ALT-AMB-03" in codigos
        assert "ALT-CUID-04" in codigos
        assert "ALT-INS-05" in codigos
        assert "ALT-SEG-06" in codigos
        assert "ALT-ECON-07" in codigos
        assert "ALT-ETN-08" in codigos

        # Filtro por sector
        resp_sec = client.get("/api/v1/alternativas", params={"sector": "proteccion_nna"})
        assert resp_sec.status_code == 200
        items_sec = resp_sec.json()
        assert all(a["sector"] == "proteccion_nna" for a in items_sec)
        assert any(a["codigo"] == "ALT-ESCNNA-01" for a in items_sec)

        # Filtro por enfoque étnico
        resp_etn = client.get("/api/v1/alternativas", params={"enfoque_etnico": "solo_etnicos"})
        assert resp_etn.status_code == 200
        items_etn = resp_etn.json()
        assert len(items_etn) >= 2
        for a in items_etn:
            assert a["requiere_consulta_previa"] is True or a["sector"] == "etnico_comunitario"

        # Búsqueda textual
        resp_busq = client.get("/api/v1/alternativas", params={"busqueda": "Bazurto"})
        assert resp_busq.status_code == 200
        items_busq = resp_busq.json()
        assert any(a["codigo"] == "ALT-ECON-07" for a in items_busq)


def test_obtener_alternativa_por_id_y_codigo(database_url: str):
    """Verifica detalle de alternativa por UUID y por código MGA."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        # Por código
        resp_cod = client.get("/api/v1/alternativas/ALT-ESCNNA-01")
        assert resp_cod.status_code == 200
        data_cod = resp_cod.json()
        assert data_cod["codigo"] == "ALT-ESCNNA-01"
        assert data_cod["sector"] == "proteccion_nna"
        assert data_cod["id"] == "01a0f810-e5ca-7001-a001-000000000001"

        # Por UUID
        resp_uuid = client.get("/api/v1/alternativas/01a0f810-e5ca-7001-a001-000000000001")
        assert resp_uuid.status_code == 200
        assert resp_uuid.json()["codigo"] == "ALT-ESCNNA-01"

        # No encontrado
        resp_404 = client.get("/api/v1/alternativas/ALT-INEXISTENTE-999")
        assert resp_404.status_code == 404


@pytest.fixture
def cabeceras_ciudadano(prepared_test_database):
    """Cuenta y sesión reales de ciudadano para verificar restricción 403."""
    if not prepared_test_database:
        pytest.skip("Configura una base exclusiva de pruebas")

    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
    from app.modules.identidad.service import IdentidadService

    async def iniciar():
        engine = create_async_engine(prepared_test_database, hide_parameters=True)
        try:
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            correo = f"ciudadano-{uuid.uuid4().hex}@example.org"
            async with sessions() as session:
                service = IdentidadService(session)
                await service.registrar_usuario(
                    UsuarioCreacion(
                        correo=correo,
                        contrasena="PruebaCiudadano2026*",
                        nombres="Ciudadano",
                        apellidos="Prueba",
                    )
                )
                return (
                    await service.autenticar_usuario(LoginPeticion(correo=correo, contrasena="PruebaCiudadano2026*"))
                ).token_acceso
        finally:
            await engine.dispose()

    return {"Authorization": f"Bearer {asyncio.run(iniciar())}"}


def test_flujo_crud_persistencia_rbac_y_auditoria(database_url: str, cabeceras_gestion, cabeceras_ciudadano):
    """Prueba integral de formulación, edición, RBAC y auditoría inmutable."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    nuevo_codigo = f"ALT-TEST-{uuid.uuid4().hex[:6].upper()}"
    payload_crear = {
        "codigo": nuevo_codigo,
        "nombre": "Red de Alarmas Comunitarias y Senderos Iluminados en San Francisco",
        "descripcion": "Instalación de luminarias solares y sensores de pánico en sectores de ladera.",
        "sector": "seguridad_convivencia",
        "linea_estrategica_codigo": "LE-01",
        "dimension_codigo": "personal",
        "objetivo_central": "Disminuir la incidencia de hurtos y mejorar la percepción de seguridad barrial.",
        "territorio_cobertura": "San Francisco (UCG 2)",
        "poblacion_objetivo_estimada": 8500,
        "costo_estimado_cop": 750000000,
        "horizonte_anios": 2,
        "fuentes_financiacion_sugeridas": ["FONSET", "Presupuesto Participativo"],
        "estado": "en_formulacion",
        "requiere_consulta_previa": False,
        "territorios_focalizados": ["UCG-2"],
        "metadatos": {"prioridad_comunitaria": "alta"},
    }

    # 1. Denegación sin token y con rol ciudadano
    with TestClient(app) as anon_client:
        r_anon = anon_client.post("/api/v1/alternativas", json=payload_crear)
        assert r_anon.status_code == 401

    with TestClient(app, headers=cabeceras_ciudadano) as ciud_client:
        r_ciud = ciud_client.post("/api/v1/alternativas", json=payload_crear)
        assert r_ciud.status_code == 403

    # 2. Creación exitosa con rol de autoridad distrital
    with TestClient(app, headers=cabeceras_gestion) as admin_client:
        resp_crear = admin_client.post("/api/v1/alternativas", json=payload_crear)
        assert resp_crear.status_code == 201, resp_crear.text
        datos_creado = resp_crear.json()
        alt_id = datos_creado["id"]
        assert datos_creado["codigo"] == nuevo_codigo
        assert float(datos_creado["costo_estimado_cop"]) == 750000000.0

        # Código duplicado devuelve 409 Conflict
        r_dup = admin_client.post("/api/v1/alternativas", json=payload_crear)
        assert r_dup.status_code == 409

        # 3. Actualización controlada (PATCH)
        resp_patch = admin_client.patch(
            f"/api/v1/alternativas/{alt_id}",
            json={
                "costo_estimado_cop": 820000000,
                "estado": "viable",
                "justificacion_motivada": "Ajuste presupuestal tras comité técnico de viabilidad MGA.",
            },
        )
        assert resp_patch.status_code == 200, resp_patch.text
        datos_patch = resp_patch.json()
        assert float(datos_patch["costo_estimado_cop"]) == 820000000.0
        assert datos_patch["estado"] == "viable"

        # 4. Eliminación de iniciativa no vinculada (DELETE)
        resp_del = admin_client.delete(f"/api/v1/alternativas/{alt_id}")
        assert resp_del.status_code == 204

        # Comprobar que ya no existe (404)
        resp_post_del = admin_client.get(f"/api/v1/alternativas/{alt_id}")
        assert resp_post_del.status_code == 404

    # 5. Verificación pericial de trazabilidad en auditoría forense
    async def verificar_auditoria():
        engine = create_async_engine(database_url, hide_parameters=True)
        try:
            async with engine.connect() as conn:
                res = await conn.execute(
                    text(
                        "SELECT accion, causal, justificacion_motivada "
                        "FROM auditoria.registros_auditoria "
                        "WHERE tabla_afectada = 'banco_alternativas' "
                        "  AND registro_id = :id "
                        "ORDER BY creado_en ASC"
                    ),
                    {"id": uuid.UUID(alt_id)},
                )
                filas = res.fetchall()
                assert len(filas) >= 3  # creada, actualizada, eliminada
                acciones = [f[0] for f in filas]
                assert "alternativa_creada" in acciones
                assert "alternativa_actualizada" in acciones
                assert "alternativa_eliminada" in acciones
        finally:
            await engine.dispose()

    asyncio.run(verificar_auditoria())


def test_restriccion_eliminacion_si_existen_compromisos_vinculados(database_url: str, cabeceras_gestion):
    """Verifica que no se pueda eliminar una alternativa con compromisos PAS vinculados (409 Conflict)."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # ALT-ESCNNA-01 está vinculada al compromiso PAS-SEC-01 sembrado
        resp = client.delete("/api/v1/alternativas/ALT-ESCNNA-01")
        assert resp.status_code == 409
        detalle = resp.json()["detail"]
        assert "compromiso(s) institucional(es)" in detalle
        assert "ALT-ESCNNA-01" in detalle
