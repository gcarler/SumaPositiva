"""Pruebas unitarias de la regla institucional de autenticación Google para funcionarios
y flujo de recuperación de contraseña ciudadana (Encargo 322).
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.modules.identidad.schemas import LoginPeticion
from app.modules.identidad.service import (
    IdentidadService,
    ROLES_FUNCIONARIOS,
    MENSAJE_REGLA_GOOGLE_FUNCIONARIOS,
)


def crear_servicio_con_mocks(rol_codigo="ciudadano", activo=True, probar_bloqueo=True):
    settings = Settings(
        _env_file=None,
        environment="test",
        jwt_secret_key="a" * 32,
        google_client_id="cliente-google-test",
        google_requerido_para_funcionarios=True,
        probar_bloqueo_google_funcionarios=probar_bloqueo,
    )
    session = AsyncMock()
    session.info = {}
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    servicio = IdentidadService(session, settings=settings)

    # Mock usuario y rol
    usuario_mock = MagicMock()
    usuario_mock.id = "00000000-0000-0000-0000-000000000001"
    usuario_mock.correo = "funcionario@cartagena.gov.co"
    usuario_mock.activo = activo
    usuario_mock.correo_verificado_en = None
    usuario_mock.mfa = None
    usuario_mock.nivel_identidad = "declarada"

    rol_mock = MagicMock()
    rol_mock.codigo = rol_codigo
    rol_mock.permisos = ["mesas:gestionar"]
    usuario_mock.rol = rol_mock

    # Mock repo
    servicio.repo.obtener_usuario_por_correo = AsyncMock(return_value=usuario_mock)
    servicio.repo.obtener_usuario_por_id = AsyncMock(return_value=usuario_mock)
    return servicio, usuario_mock


@pytest.mark.parametrize("rol", list(ROLES_FUNCIONARIOS))
def test_funcionarios_bloqueados_en_login_ordinario(rol):
    """Cualquier rol de funcionario institucional es rechazado con 403 al intentar login con contraseña."""
    async def correr():
        servicio, _ = crear_servicio_con_mocks(rol_codigo=rol, probar_bloqueo=True)
        peticion = LoginPeticion(correo="funcionario@cartagena.gov.co", contrasena="PasswordSegura2026*")

        with pytest.raises(HTTPException) as exc_info:
            await servicio.autenticar_usuario(peticion)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == MENSAJE_REGLA_GOOGLE_FUNCIONARIOS
        assert "Continuar con Google" in exc_info.value.detail

    asyncio.run(correr())


@pytest.mark.parametrize("rol", list(ROLES_FUNCIONARIOS))
def test_funcionarios_bloqueados_en_recuperacion_contrasena(rol):
    """Cualquier rol de funcionario es rechazado con 403 al solicitar recuperación de contraseña."""
    async def correr():
        servicio, _ = crear_servicio_con_mocks(rol_codigo=rol, probar_bloqueo=True)
        transporte_mock = MagicMock()
        transporte_mock.comprobar_configuracion = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await servicio.solicitar_correo(
                correo="funcionario@cartagena.gov.co",
                proposito="recuperar",
                transporte=transporte_mock,
            )

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == MENSAJE_REGLA_GOOGLE_FUNCIONARIOS
        assert "Google" in exc_info.value.detail

    asyncio.run(correr())


def test_ciudadano_no_bloqueado_por_regla_google():
    """Los ciudadanos comunes pueden solicitar recuperación sin ser bloqueados por la regla de funcionarios."""
    async def correr():
        servicio, usuario_mock = crear_servicio_con_mocks(rol_codigo="ciudadano", probar_bloqueo=True)
        servicio.repo.crear_token = AsyncMock()
        servicio.repo.registrar_evento = AsyncMock()

        transporte_mock = MagicMock()
        transporte_mock.comprobar_configuracion = MagicMock()

        resultado = await servicio.solicitar_correo(
            correo="ciudadano@example.org",
            proposito="recuperar",
            transporte=transporte_mock,
        )

        assert "recibirás un enlace por correo" in resultado.mensaje
        servicio.repo.crear_token.assert_awaited_once()

    asyncio.run(correr())


def test_consumir_token_recuperacion_actualiza_contrasena():
    """El token de recuperación emitido para un ciudadano permite actualizar la contraseña."""
    async def correr():
        servicio, usuario_mock = crear_servicio_con_mocks(rol_codigo="ciudadano")
        token_mock = MagicMock()
        token_mock.usado_en = None
        from datetime import UTC, datetime, timedelta
        token_mock.expira_en = datetime.now(UTC) + timedelta(minutes=30)
        token_mock.usuario_id = usuario_mock.id
        token_mock.hash_token = "hash-token"

        servicio.repo.obtener_token = AsyncMock(return_value=token_mock)
        servicio.repo.invalidar_tokens = AsyncMock()
        servicio.repo.revocar_sesiones = AsyncMock()
        servicio.repo.guardar = AsyncMock()
        servicio.repo.registrar_evento = AsyncMock()

        resultado = await servicio.consumir_token(
            token="token-recuperacion-valido-123",
            proposito="recuperar",
            contrasena="NuevaClaveCiudadana2026*",
        )

        assert "Solicitud completada" in resultado.mensaje
        assert token_mock.usado_en is not None
        servicio.repo.guardar.assert_awaited_once()

    asyncio.run(correr())
