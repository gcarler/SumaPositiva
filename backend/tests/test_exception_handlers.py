"""Pruebas unitarias para manejadores globales de excepciones tipadas en FastAPI.

Tarea: [AUD-COMP-02]
Plan Maestro: Auditoría Técnica de Completitud y Consistencia POLIS 2026
"""

import pytest
from fastapi import APIRouter, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.main import create_app


router_pruebas = APIRouter(prefix="/api/v1/test-errores", tags=["TestErrores"])


class ModeloPayload(BaseModel):
    valor_obligatorio: str = Field(..., min_length=5)
    numero_positivo: int = Field(..., gt=0)


@router_pruebas.post("/validacion")
async def ruta_validacion(payload: ModeloPayload):
    return {"status": "ok", "datos": payload.model_dump()}


@router_pruebas.get("/error-401")
async def ruta_error_401():
    raise HTTPException(
        status_code=401,
        detail="Credenciales no suministradas",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router_pruebas.get("/error-403")
async def ruta_error_403():
    raise HTTPException(
        status_code=403,
        detail="Permiso distrital insuficiente: requiere 'indicadores:gestionar'",
    )


@router_pruebas.get("/error-404")
async def ruta_error_404():
    raise HTTPException(
        status_code=404,
        detail="Recurso distrital no localizado en el catálogo oficial",
    )


@router_pruebas.get("/error-409-integridad")
async def ruta_error_409_integridad():
    raise IntegrityError(
        statement="INSERT INTO participacion_ciudadana.propuestas_ciudadanas VALUES (...)",
        params={},
        orig=Exception("duplicate key value violates unique constraint 'uq_apoyo_propuesta_sujeto'"),
    )


@router_pruebas.get("/error-500-no-controlado")
async def ruta_error_500():
    raise RuntimeError("Fallo inesperado del motor interno de cómputo")


@pytest.fixture
def cliente_test():
    settings = Settings(_env_file=None, environment="test", jwt_secret_key="a" * 32)
    app = create_app(settings)
    app.include_router(router_pruebas)
    return TestClient(app, raise_server_exceptions=False)


def test_manejador_error_validacion_pydantic_422(cliente_test):
    """Verifica que RequestValidationError retorne HTTP 422 con formato estructurado."""
    respuesta = cliente_test.post(
        "/api/v1/test-errores/validacion",
        json={"valor_obligatorio": "ab", "numero_positivo": -5},
    )
    assert respuesta.status_code == 422
    datos = respuesta.json()
    assert "detail" in datos
    assert isinstance(datos["detail"], list)
    assert len(datos["detail"]) >= 2


def test_manejador_error_autenticacion_401(cliente_test):
    """Verifica que HTTPException 401 preserve encabezados WWW-Authenticate."""
    respuesta = cliente_test.get("/api/v1/test-errores/error-401")
    assert respuesta.status_code == 401
    assert respuesta.headers.get("www-authenticate") == "Bearer"
    assert respuesta.json() == {"detail": "Credenciales no suministradas"}


def test_manejador_error_autorizacion_403(cliente_test):
    """Verifica que HTTPException 403 retorne detalle institucional del permiso faltante."""
    respuesta = cliente_test.get("/api/v1/test-errores/error-403")
    assert respuesta.status_code == 403
    assert "Permiso distrital insuficiente" in respuesta.json()["detail"]


def test_manejador_error_no_encontrado_404(cliente_test):
    """Verifica que HTTPException 404 retorne detalle claro."""
    respuesta = cliente_test.get("/api/v1/test-errores/error-404")
    assert respuesta.status_code == 404
    assert "Recurso distrital no localizado" in respuesta.json()["detail"]


def test_manejador_error_integridad_sqlalchemy_409(cliente_test):
    """Verifica que IntegrityError retorne HTTP 409 sin filtrar sentencias SQL crudas."""
    respuesta = cliente_test.get("/api/v1/test-errores/error-409-integridad")
    assert respuesta.status_code == 409
    datos = respuesta.json()
    assert "detail" in datos
    assert "Conflicto de integridad de datos" in datos["detail"]
    # Asegurar que NINGUNA sentencia SQL cruda se filtre al cliente
    assert "INSERT INTO" not in respuesta.text
    assert "VALUES" not in respuesta.text


def test_manejador_error_excepcion_no_controlada_500(cliente_test):
    """Verifica que excepciones inesperadas retornen HTTP 500 seguro y sanitizado."""
    respuesta = cliente_test.get("/api/v1/test-errores/error-500-no-controlado")
    assert respuesta.status_code == 500
    datos = respuesta.json()
    assert "detail" in datos
    assert "Error interno del servidor" in datos["detail"]
    # Asegurar que el mensaje de error crudo interno no se filtre
    assert "Fallo inesperado del motor" not in respuesta.text
