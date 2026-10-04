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

