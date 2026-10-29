"""Sin credenciales reales ni red: Google debe verificar antes de crear una sesión."""

from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from google.oauth2 import id_token as google_id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.modules.identidad.service import IdentidadService


def servicio(client_id="cliente-google-pruebas"):
    return IdentidadService(AsyncSession(), Settings(_env_file=None, environment="test", google_client_id=client_id))


def test_google_sin_configuracion_no_autentica():
    with pytest.raises(HTTPException) as error:
        servicio(None)._verificar_google_token("cualquier-token")
    assert error.value.status_code == 503


@pytest.mark.parametrize(
    "token",
    [
        "test-google-token:admin@cartagena.gov.co:Admin:sub",
        "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6ImFkbWluQGNhcnRhZ2VuYS5nb3YuY28ifQ.",
        "token-de-otra-aplicacion",
    ],
)
def test_google_rechaza_tokens_no_verificados(monkeypatch, token):
    verificar = Mock(side_effect=ValueError("Firma o audiencia inválida"))
    monkeypatch.setattr(google_id_token, "verify_oauth2_token", verificar)
    with pytest.raises(HTTPException) as error:
        servicio()._verificar_google_token(token)
    assert error.value.status_code == 401
    assert verificar.call_args.kwargs["audience"] == "cliente-google-pruebas"


@pytest.mark.parametrize("claims", [{"sub": "123", "email_verified": False}, {"sub": "123"}, {"email_verified": True}])
def test_google_requiere_sujeto_y_correo_verificado(monkeypatch, claims):
    monkeypatch.setattr(google_id_token, "verify_oauth2_token", Mock(return_value=claims))
    with pytest.raises(HTTPException) as error:
        servicio()._verificar_google_token("token")
    assert error.value.status_code == 401


def test_google_usa_audiencia_configurada(monkeypatch):
    claims = {"sub": "123", "email_verified": True, "email": "prueba@gmail.com"}
    verificar = Mock(return_value=claims)
    monkeypatch.setattr(google_id_token, "verify_oauth2_token", verificar)
    assert servicio()._verificar_google_token("id-token") == claims
    assert verificar.call_args.kwargs["audience"] == "cliente-google-pruebas"
