import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_migracion_0042_cero_radicados_y_solo_por_solicitar(database_url: str):
    """Inspecciona la base de datos tras la migración 0042 para verificar la ausencia absoluta de datos fabricados."""
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            # 1. Cero radicados inventados
            res_radicados = await conn.execute(
                text("SELECT count(*) FROM auditoria.fuentes_informacion WHERE radicado_solicitud IS NOT NULL;")
            )
            assert res_radicados.scalar() == 0, "La migración no debe sembrar radicados"

            # 2. Todas las fuentes sembradas deben estar en 'por_solicitar'
            res_estados = await conn.execute(
                text("SELECT count(*) FROM auditoria.fuentes_informacion WHERE estado_entrega != 'por_solicitar';")
            )
            assert res_estados.scalar() == 0, "El catálogo inicial solo debe contener estado 'por_solicitar'"

            # 3. Cero fechas falsas de solicitud o límite
            res_fechas = await conn.execute(
                text("""
                    SELECT count(*) FROM auditoria.fuentes_informacion
                    WHERE fecha_solicitud IS NOT NULL OR fecha_limite_respuesta IS NOT NULL;
                """)
            )
            assert res_fechas.scalar() == 0, "No debe haber fechas de solicitud ficticias"

            # 4. Cero resúmenes fabricados, URLs o textos inventados
            res_resumenes = await conn.execute(
                text("""
                    SELECT count(*) FROM auditoria.fuentes_informacion
                    WHERE resumen_datos IS NOT NULL
                       OR archivo_adjunto_url IS NOT NULL
                       OR observaciones_calidad IS NOT NULL;
                """)
            )
            assert res_resumenes.scalar() == 0, "No debe haber resúmenes ni URLs ficticias en la semilla"
    finally:
        await engine.dispose()


def test_get_fuentes_es_publico_y_reporta_por_solicitar(database_url: str):
    """Los endpoints de lectura (GET) son públicos para transparencia ciudadana y reportan 'por_solicitar'."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as anonymous_client:
        # 1. Listar fuentes públicas
        resp = anonymous_client.get("/api/v1/fuentes")
        assert resp.status_code == 200
        fuentes = resp.json()
        assert len(fuentes) >= 18
        assert all(f["estado_entrega"] == "por_solicitar" for f in fuentes)
        assert all(f["radicado_solicitud"] is None for f in fuentes)

        # 2. Consultar KPIs públicos
        resp_kpis = anonymous_client.get("/api/v1/fuentes/kpis")
        assert resp_kpis.status_code == 200
        kpis = resp_kpis.json()
        assert kpis["total"] >= 18
        assert kpis["entregadas"] == 0
        assert kpis["vencidas"] == 0
        assert kpis["por_solicitar"] >= 18
        assert kpis["porcentaje_cumplimiento"] == 0.0

        # 3. Detalle público de fuente canónica
        resp_fnt = anonymous_client.get("/api/v1/fuentes/fnt-loc-01")
        assert resp_fnt.status_code == 200
        data = resp_fnt.json()
        assert data["codigo"] == "FNT-LOC-001"
        assert data["entidad"] == "Policía Metropolitana de Cartagena (MECAR)"
        assert data["estado_entrega"] == "por_solicitar"
        assert data["radicado_solicitud"] is None


def test_seguridad_rbac_fuentes_401_y_403(database_url: str):
    """Verifica 401 para anónimos y 403 para usuarios autenticados sin permiso 'fuentes:gestionar'."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    # 1. Cliente anónimo -> 401 Unauthorized
    with TestClient(app) as anon_client:
        resp_post = anon_client.post("/api/v1/fuentes", json={"codigo": "FNT-TEST"})
        assert resp_post.status_code == 401

        resp_patch = anon_client.patch("/api/v1/fuentes/fnt-loc-01", json={"estado_entrega": "entregada"})
        assert resp_patch.status_code == 401

        resp_delete = anon_client.delete("/api/v1/fuentes/fnt-loc-01")
        assert resp_delete.status_code == 401

    # 2. Cliente con rol ciudadano (sin fuentes:gestionar) -> 403 Forbidden
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.core.transactions import transaction
    from app.modules.identidad.repository import IdentidadRepository
    from app.modules.identidad.schemas import LoginPeticion, UsuarioCreacion
    from app.modules.identidad.service import IdentidadService

    async def obtener_cabeceras_ciudadano():
        engine = create_async_engine(database_url, hide_parameters=True)
        try:
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            correo = f"ciudadano-{uuid.uuid4().hex}@example.org"
            async with sessions() as session:
                service = IdentidadService(session)
                usuario = await service.registrar_usuario(
                    UsuarioCreacion(
                        correo=correo,
                        contrasena="Ciudadano2026*",
                        nombres="Ciudadano",
                        apellidos="Prueba",
                    )
                )
                async with transaction(session):
                    repo = IdentidadRepository(session)
                    cuenta = await repo.obtener_usuario_por_id(usuario.id)
                    rol = await repo.obtener_rol_por_codigo("ciudadano")
                    cuenta.rol_id, cuenta.rol = rol.id, rol
                    await repo.guardar()
                token = await service.autenticar_usuario(LoginPeticion(correo=correo, contrasena="Ciudadano2026*"))
                return {"Authorization": f"Bearer {token.token_acceso}"}
        finally:
            await engine.dispose()

    headers_ciudadano = asyncio.run(obtener_cabeceras_ciudadano())

    with TestClient(app, headers=headers_ciudadano) as citizen_client:
        resp_post = citizen_client.post(
            "/api/v1/fuentes",
            json={
                "codigo": "FNT-NO-AUTH",
                "entidad": "Prueba",
                "nombre_fuente": "Prueba",
                "tipo": "secundaria",
                "ambito": "local",
                "dimension_seguridad": "personal",
                "periodicidad": "mensual",
            },
        )
        assert resp_post.status_code == 403
        assert "fuentes:gestionar" in resp_post.json()["detail"]

        resp_patch = citizen_client.patch(
            "/api/v1/fuentes/fnt-loc-01",
            json={"radicado_solicitud": "RAD-NO-PERMITIDO"},
        )
        assert resp_patch.status_code == 403

        resp_delete = citizen_client.delete("/api/v1/fuentes/fnt-loc-01")
        assert resp_delete.status_code == 403


def test_validacion_payload_fuentes(database_url: str, cabeceras_gestion):
    """Valida que los esquemas rechacen payloads con valores inválidos o faltantes con 422."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Payload incompleto (falta entidad y tipo) -> 422
        resp_inc = client.post("/api/v1/fuentes", json={"codigo": "FNT-FALTA-CAMPOS"})
        assert resp_inc.status_code == 422

        # 2. Estado de entrega inválido -> 422
        resp_inv = client.post(
            "/api/v1/fuentes",
            json={
                "codigo": "FNT-INVALIDO",
                "entidad": "Entidad Válida",
                "nombre_fuente": "Fuente Válida",
                "tipo": "primaria",
                "ambito": "local",
                "dimension_seguridad": "personal",
                "periodicidad": "mensual",
                "estado_entrega": "estado_inexistente_inventado",
            },
        )
        assert resp_inv.status_code == 422


async def test_ciclo_completo_radicacion_y_auditoria_fuentes(database_url: str, cabeceras_gestion):
    """Verifica que una autoridad distrital pueda radicar formalmente un requerimiento con registro de auditoría."""
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        # 1. Creación de nueva fuente oficial (POST)
        nueva_id = f"fnt-loc-test-{uuid.uuid4().hex[:6]}"
        codigo_nuevo = f"FNT-TEST-{uuid.uuid4().hex[:4].upper()}"
        resp_post = client.post(
            "/api/v1/fuentes",
            json={
                "id": nueva_id,
                "codigo": codigo_nuevo,
                "entidad": "Entidad Distrital de Control",
                "nombre_fuente": "Sistema de Vigilancia Territorial",
                "tipo": "primaria",
                "ambito": "local",
                "dimension_seguridad": "personal",
                "periodicidad": "mensual",
                "estado_entrega": "por_solicitar",
            },
        )
        assert resp_post.status_code == 201
        creada = resp_post.json()
        assert creada["id"] == nueva_id

        # 2. Radicación formal en la fuente de prueba (PATCH)
        radicado_oficial = f"RAD-DIST-2026-{uuid.uuid4().hex[:5].upper()}"
        resp_patch = client.patch(
            f"/api/v1/fuentes/{nueva_id}",
            json={
                "radicado_solicitud": radicado_oficial,
                "fecha_solicitud": "2026-03-01",
                "fecha_limite_respuesta": "2026-04-01",
                "estado_entrega": "en_termino",
                "variables_solicitadas": ["Cifras oficiales de prueba"],
                "observaciones_calidad": "Oficio radicado formalmente ante entidad.",
            },
        )
        assert resp_patch.status_code == 200, resp_patch.text
        actualizada = resp_patch.json()
        assert actualizada["radicado_solicitud"] == radicado_oficial
        assert actualizada["estado_entrega"] == "en_termino"

        # 3. Eliminación de la fuente de prueba (DELETE)
        resp_del = client.delete(f"/api/v1/fuentes/{nueva_id}")
        assert resp_del.status_code == 204

    # 4. Verificación de auditoría forense inmutable
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as conn:
            res_aud = await conn.execute(
                text("""
                    SELECT accion, tabla_afectada, causal
                    FROM auditoria.registros_auditoria
                    WHERE tabla_afectada = 'auditoria.fuentes_informacion'
                    ORDER BY creado_en DESC
                    LIMIT 3;
                """)
            )
            filas = res_aud.fetchall()
            assert len(filas) >= 2
            acciones = [f[0] for f in filas]
            assert "ACTUALIZAR_FUENTE_INFORMACION" in acciones
            assert "ELIMINAR_FUENTE_INFORMACION" in acciones or "CREAR_FUENTE_INFORMACION" in acciones
            assert all(f[2] == "tecnica" for f in filas)
    finally:
        await engine.dispose()
