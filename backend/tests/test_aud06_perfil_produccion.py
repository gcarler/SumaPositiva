import uuid
from starlette.testclient import TestClient
from app.core.config import Settings
from app.main import create_app


def test_produccion_deshabilita_docs_y_openapi():
    """En perfil de producción (/api/v1/docs y /api/v1/openapi.json) deben devolver 404."""
    settings = Settings(_env_file=None, environment="production")
    app = create_app(settings)

    with TestClient(app) as client:
        resp_docs = client.get("/api/v1/docs")
        assert resp_docs.status_code == 404

        resp_openapi = client.get("/api/v1/openapi.json")
        assert resp_openapi.status_code == 404


def test_desarrollo_habilita_docs_y_openapi():
    """En perfil development (/api/v1/docs y /api/v1/openapi.json) deben devolver 200."""
    settings = Settings(_env_file=None, environment="development")
    app = create_app(settings)

    with TestClient(app) as client:
        resp_docs = client.get("/api/v1/docs")
        assert resp_docs.status_code == 200

        resp_openapi = client.get("/api/v1/openapi.json")
        assert resp_openapi.status_code == 200


def test_cors_en_produccion_rechaza_origenes_ajenos_e_inseguros():
    """En producción, CORS rechaza localhost y sitios externos ajenos, admitiendo solo dominios autorizados."""
    settings = Settings(_env_file=None, environment="production")
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Origen localhost en HTTP debe ser rechazado en producción
        resp_local = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp_local.status_code == 400
        assert "Disallowed CORS origin" in resp_local.text

        # 2. Origen ajeno malicioso debe ser rechazado
        resp_malicioso = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": "https://malicious-attacker.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp_malicioso.status_code == 400
        assert "Disallowed CORS origin" in resp_malicioso.text

        # 3. Origen legítimo institucional HTTPS debe ser aceptado
        resp_legitimo = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": "https://seguridadhumanaintegral.org",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp_legitimo.status_code == 200
        assert resp_legitimo.headers.get("access-control-allow-origin") == "https://seguridadhumanaintegral.org"


def test_cookies_con_flags_seguros_en_produccion():
    """En producción las cookies emitidas deben contener siempre Secure y SameSite=Lax."""
    from fastapi import APIRouter, Response

    settings = Settings(_env_file=None, environment="production")
    app = create_app(settings)

    # Agregar ruta de prueba para verificar inyección de directivas en cookies
    router_prueba = APIRouter()

    @router_prueba.get("/test-cookie")
    def ruta_cookie(response: Response):
        response.set_cookie(key="mi_cookie", value="valor_secreto", httponly=True)
        return {"status": "ok"}

    app.include_router(router_prueba)

    with TestClient(app) as client:
        resp = client.get("/test-cookie")
        assert resp.status_code == 200
        set_cookie = resp.headers.get("set-cookie", "").lower()
        assert "mi_cookie=valor_secreto" in set_cookie
        assert "secure" in set_cookie
        assert "samesite=lax" in set_cookie


def test_limite_tasa_ia_excedido():
    """El enrutador de IA debe rechazar con 429 si se excede el límite de solicitudes."""
    from app.modules.ia import limpiar_cache_tasa_ia
    from app.modules.identidad.security import crear_token_acceso
    from app.modules.identidad import deps

    token = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="facilitador_mesa",
        nivel_identidad="declarada",
        permisos=["ia:analizar"],
    )

    settings = Settings(_env_file=None, environment="test", ia_limite_ip=3)
    app = create_app(settings)

    # Limpiar caché de memoria para asegurar aislamiento
    limpiar_cache_tasa_ia()

    # Bypass de carga de BD para pruebas sintéticas de endpoints IA
    async def sujeto_controlado(request, contexto):
        return contexto

    original_sujeto = deps.cargar_sujeto_vigente
    deps.cargar_sujeto_vigente = sujeto_controlado

    try:
        with TestClient(app, headers={"Authorization": f"Bearer {token}"}) as client:
            payload = {
                "titulo": "Prueba Diagnóstico",
                "problema_central": "Elevada conflictividad",
                "causas_directas": ["Déficit de equipamientos"],
            }
            # Primeras 3 peticiones permitidas
            for _ in range(3):
                r = client.post("/api/v1/ia/diagnostico", json=payload)
                assert r.status_code == 200

            # La 4ta petición supera el límite (ia_limite_ip=3)
            r_excedido = client.post("/api/v1/ia/diagnostico", json=payload)
            assert r_excedido.status_code == 429
            assert "Límite de solicitudes de IA excedido" in r_excedido.json()["detail"]
            assert "Retry-After" in r_excedido.headers
    finally:
        deps.cargar_sujeto_vigente = original_sujeto


def test_limite_tasa_sesion_anonima_excedido():
    """El control de tasa para sesiones anónimas debe detectar y bloquear excesos."""
    import app.modules.sesion.router as sesion_router_mod
    sesion_router_mod._limite_ip_memoria.clear()

    ip_test = "192.168.1.100"
    limite = 2
    ventana = 60

    # Peticiones dentro del límite
    assert sesion_router_mod.verificar_tasa_ip(ip_test, maximo=limite, ventana=ventana) is True
    assert sesion_router_mod.verificar_tasa_ip(ip_test, maximo=limite, ventana=ventana) is True

    # Petición que excede el límite
    assert sesion_router_mod.verificar_tasa_ip(ip_test, maximo=limite, ventana=ventana) is False


def test_token_firmado_con_otra_clave_rechazado_401():
    """OBS-09: Un token firmado con una clave distinta a settings.jwt_secret_key debe ser rechazado con 401 en cualquier entorno."""
    import jwt
    import pytest
    from fastapi import HTTPException
    from app.modules.identidad.security import decodificar_token_acceso
    from app.modules.sesion.security import decodificar_token_sesion
    from datetime import datetime, timezone, timedelta

    clave_forjada = "clave_forjada_no_autorizada_por_polis_2026"
    clave_legitima = "clave_legitima_autorizada_produccion_2026_secreta"
    settings = Settings(_env_file=None, environment="development", jwt_secret_key=clave_legitima)

    # 1. Token de acceso forjado
    payload_acceso = {
        "sub": str(uuid.uuid4()),
        "jti": str(uuid.uuid4()),
        "typ": "acceso_usuario",
        "rol": "administrador",
        "nivel_identidad": "verificada",
        "permisos": ["politicas:gestionar"],
        "es_anonimo": False,
        "iss": "polis-identidad",
        "aud": "polis-api",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token_forjado = jwt.encode(payload_acceso, clave_forjada, algorithm="HS256")

    # decodificar_token_acceso debe devolver None ante firma inválida
    assert decodificar_token_acceso(token_forjado, settings=settings) is None

    # 2. Token de sesión cívica forjado debe lanzar HTTPException 401
    payload_sesion = {
        "sesion_id": str(uuid.uuid4()),
        "huella_hash": "huella_prueba",
        "rol": "ciudadano_anonimo",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    token_sesion_forjado = jwt.encode(payload_sesion, clave_forjada, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        decodificar_token_sesion(token_sesion_forjado, settings=settings)
    assert exc_info.value.status_code == 401

    # 3. Verificación contra endpoint protegido en la aplicación
    app = create_app(settings)
    with TestClient(app, headers={"Authorization": f"Bearer {token_forjado}"}) as client:
        resp = client.get("/api/v1/sesion/verificar")
        assert resp.status_code == 401


def test_error_sql_en_gating_devuelve_null_y_registra_log(caplog):
    """OBS-08: Si falla la consulta SQL en gating, debe registrar log de error y retornar None (null en JSON)."""
    import asyncio
    import logging
    from unittest.mock import AsyncMock
    from app.modules.politicas.gating import calcular_progreso_real_fases

    mock_session = AsyncMock()
    mock_session.execute.side_effect = Exception("Conexión perdida o fallo en consulta SQL")

    with caplog.at_level(logging.ERROR):
        progresos = asyncio.run(calcular_progreso_real_fases(mock_session))

    assert progresos["FASE_1_DIAGNOSTICO"] is None
    assert progresos["FASE_2_FORMULACION"] is None
    assert progresos["FASE_3_PLAN_ACCION"] is None

    assert any("Error SQL calculando progreso empírico de FASE_1_DIAGNOSTICO" in record.message for record in caplog.records)
    assert any("Error SQL calculando progreso empírico de FASE_2_FORMULACION" in record.message for record in caplog.records)
    assert any("Error SQL calculando progreso empírico de FASE_3_PLAN_ACCION" in record.message for record in caplog.records)


def test_limite_tasa_sesion_anonima_endpoint_429():
    """OBS-10: Petición HTTP que supera el límite de tasa de sesión anónima debe recibir 429 con Retry-After."""
    from unittest.mock import AsyncMock
    import app.modules.sesion.router as sesion_router_mod
    sesion_router_mod._limite_ip_memoria.clear()

    settings = Settings(_env_file=None, environment="test", sesion_anonima_limite_ip=2, identidad_ventana_segundos=120)
    app = create_app(settings)

    mock_service = AsyncMock()
    mock_service.emitir_sesion_anonima.return_value = {
        "token_acceso": "token_dummy",
        "tipo_token": "Bearer",
        "expira_en_segundos": 900,
        "sesion_id": uuid.uuid4(),
        "huella_hash": "huella_dummy_sha256",
        "rol": "ciudadano_anonimo",
    }
    app.dependency_overrides[sesion_router_mod.get_sesion_service] = lambda: mock_service

    try:
        with TestClient(app) as client:
            headers = {"X-Forwarded-For": "203.0.113.195"}
            # Primeras 2 permitidas
            r1 = client.post("/api/v1/sesion/anonima", headers=headers)
            assert r1.status_code == 201
            r2 = client.post("/api/v1/sesion/anonima", headers=headers)
            assert r2.status_code == 201

            # La 3ra debe devolver 429
            r3 = client.post("/api/v1/sesion/anonima", headers=headers)
            assert r3.status_code == 429
            assert "Demasiadas solicitudes de sesión anónima" in r3.json()["detail"]
            assert r3.headers.get("retry-after") == "120"
    finally:
        app.dependency_overrides.clear()


