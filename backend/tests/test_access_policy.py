"""Contrato de rutas documentado y denegación HTTP de operaciones de gestión."""

import re
import uuid
from pathlib import Path

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.database import get_session
from app.main import create_app
from app.modules.identidad.deps import requerir_permiso, requerir_rol
from app.modules.identidad.security import crear_token_acceso

MATRIZ = Path(__file__).resolve().parents[2] / "docs" / "permisos-api.md"


def leer_matriz():
    filas = []
    for line in MATRIZ.read_text().splitlines():
        if not line.startswith("| "):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) == 4 and cells[0] in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
            filas.append(tuple(cells))
    return filas


def rutas_efectivas(app):
    # FastAPI expone includes diferidos en la versión resuelta del lockfile.
    for route in app.routes:
        if isinstance(route, APIRoute):
            yield route
        elif hasattr(route, "effective_route_contexts"):
            yield from route.effective_route_contexts()


def callbacks(dependant):
    yield dependant.call
    for child in dependant.dependencies:
        yield from callbacks(child)


def test_matriz_cubre_todas_las_rutas_y_sus_controles():
    app = create_app(Settings(_env_file=None, environment="test"))
    documentadas = leer_matriz()
    assert len({(method, path) for method, path, _, _ in documentadas}) == len(documentadas)
    esperadas = {
        (method, path): (control, motivo) for method, path, control, motivo in documentadas
    }
    reales = {}
    for route in rutas_efectivas(app):
        for method in route.methods:
            reales[(method, route.path)] = list(callbacks(route.dependant))
    assert set(reales) == set(esperadas), "Actualizar matriz y autorización al cambiar rutas"
    for clave, llamadas in reales.items():
        control, motivo = esperadas[clave]
        assert motivo, clave
        permisos = {
            (c.permiso, c.nivel_minimo) for c in llamadas if isinstance(c, requerir_permiso)
        }
        roles = {tuple(c.roles) for c in llamadas if isinstance(c, requerir_rol)}
        nombres = {getattr(c, "__name__", "") for c in llamadas}
        if control.startswith("permiso:"):
            permiso, nivel = control.removeprefix("permiso:").split("@")
            assert permisos == {(permiso, nivel)}, clave
            assert "obtener_sujeto_autenticado" in nombres, clave
        elif control.startswith("roles:"):
            assert roles == {tuple(control.removeprefix("roles:").split(","))}, clave
            assert "obtener_sujeto_autenticado" in nombres, clave
        elif control == "sesion":
            assert "obtener_sesion_requerida" in nombres, clave
        elif control == "sujeto":
            assert "obtener_sujeto_autenticado" in nombres, clave
        else:
            assert control == "publico", clave
            assert not permisos and not roles, clave
            assert not nombres.intersection(
                {"obtener_sujeto_autenticado", "obtener_sesion_requerida"}
            ), clave
            if clave[0] == "GET" and clave[1] == "/api/v1/mesas/geovisor":
                assert "get_evidencia_service" in nombres
            if clave[0] != "GET":
                assert clave in {
                    ("POST", "/api/v1/sesion/anonima"),
                    ("POST", "/api/v1/identidad/registro"),
                    ("POST", "/api/v1/identidad/login"),
                    ("POST", "/api/v1/identidad/oauth/google"),
                    ("POST", "/api/v1/identidad/recuperacion/solicitar"),
                    ("POST", "/api/v1/identidad/recuperacion/confirmar"),
                    ("POST", "/api/v1/identidad/correo/confirmar"),
                    ("POST", "/api/v1/identidad/magic-link/solicitar"),
                    ("POST", "/api/v1/identidad/magic-link/confirmar"),
                    ("POST", "/api/v1/canales/whatsapp/webhook"),
                    ("POST", "/api/v1/canales/whatsapp/simular"),
                    ("POST", "/api/v1/geodatos/estandarizar-direccion"),
                    ("POST", "/api/v1/seguridad/csp-report"),
                    ("POST", "/api/v1/identidad/mfa/verificar"),
                    ("POST", "/api/v1/compromisos/plan-accion/validar-redaccion"),
                    ("POST", "/api/v1/compromisos/plan-accion/procesar-lote"),
                }, "Una escritura pública nueva requiere decisión explícita y pruebas"


GESTION = [
    (method, path)
    for method, path, control, _ in leer_matriz()
    if control.startswith(("permiso:", "roles:"))
]


@pytest.mark.parametrize("method,path", GESTION)
def test_gestion_rechaza_sin_token_y_ciudadano(method, path, monkeypatch):
    from app.modules.identidad import deps

    # Solo se simula la consulta de sesión vigente. Firma, expiración y guardas HTTP
    # se ejecutan; la validación de sesiones reales y revocación tiene suite propia.
    async def sujeto_controlado(request, contexto):
        return contexto

    monkeypatch.setattr(deps, "cargar_sujeto_vigente", sujeto_controlado)
    settings = Settings(_env_file=None, environment="test")
    token = crear_token_acceso(
        sujeto_id=uuid.uuid4(),
        rol="ciudadano",
        nivel_identidad="declarada",
        permisos=["aportes:leer"],
    )
    url = re.sub(r"\{[^}]+\}", str(uuid.uuid4()), path)
    app = create_app(settings)

    async def prohibir_base():
        raise AssertionError("Una petición denegada no debe llegar a persistencia")

    app.dependency_overrides[get_session] = prohibir_base
    esperado_control = next(
        control for m, p, control, _ in leer_matriz() if (m, p) == (method, path)
    )
    if esperado_control.startswith("permiso:"):
        permiso = esperado_control.removeprefix("permiso:").split("@")[0]
        token_nivel_bajo = crear_token_acceso(
            sujeto_id=uuid.uuid4(),
            rol="ciudadano_anonimo",
            nivel_identidad="anonima",
            permisos=[permiso],
            es_anonimo=True,
        )
    else:
        token_nivel_bajo = token
    with TestClient(app) as client:
        for headers, esperado in [
            ({}, 401),
            ({"Authorization": "Bearer token-invalido"}, 401),
            ({"Authorization": f"Bearer {token}"}, 403),
            ({"Authorization": f"Bearer {token_nivel_bajo}"}, 403),
        ]:
            response = client.request(method, url, json={}, headers=headers)
            assert response.status_code == esperado, (method, path, response.text)
            if esperado == 401:
                assert response.headers["WWW-Authenticate"] == "Bearer"


def test_documentacion_api_no_se_expone_en_produccion():
    app = create_app(Settings(_env_file=None, environment="production"))
    assert app.docs_url is None
    assert app.openapi_url is None


@pytest.mark.integration
@pytest.mark.anyio
async def test_roles_canonicos_coinciden_con_la_matriz(database_url):
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    esperados = {}
    for line in MATRIZ.read_text().splitlines():
        if not line.startswith("| "):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) == 3 and ":" in cells[0]:
            esperados[cells[0]] = {rol.strip() for rol in cells[1].split(",")}
    assert esperados
    engine = create_async_engine(database_url, hide_parameters=True)
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("""
                SELECT codigo, permisos FROM autenticacion.roles
                WHERE codigo IN ('ciudadano', 'facilitador_mesa',
                                 'autoridad_distrital', 'auditor_forense',
                                 'administrador_identidades')
            """)
            )
            permisos = {row.codigo: row.permisos for row in result}
        assert set(permisos) == {
            "ciudadano",
            "facilitador_mesa",
            "autoridad_distrital",
            "auditor_forense",
            "administrador_identidades",
        }
        for permiso, roles in esperados.items():
            assert {rol for rol, concedidos in permisos.items() if permiso in concedidos} == roles
    finally:
        await engine.dispose()
