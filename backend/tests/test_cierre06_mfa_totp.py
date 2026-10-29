import time
import uuid
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad import mfa as mfa_utils
from app.modules.identidad.security import (
    crear_token_desafio_mfa,
    decodificar_token_desafio_mfa,
)

pytestmark = pytest.mark.anyio


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        environment="test",
        jwt_secret_key="test_secret_key_32_characters_long_super_safe",
        database_url="postgresql+asyncpg://polis:polis_local@127.0.0.1:5433/polis",
        ip_salt="test_salt_habeas_data_2026",
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


async def test_mfa_utilidades_criptograficas(settings):
    """Verifica generación, cifrado Fernet en reposo y algoritmos RFC 6238."""
    # 1. Generación y cifrado de secreto
    secreto = mfa_utils.generar_secreto_totp()
    assert len(secreto) == 32
    cifrado = mfa_utils.cifrar_secreto_totp(secreto, settings)
    assert cifrado != secreto
    descifrado = mfa_utils.descifrar_secreto_totp(cifrado, settings)
    assert descifrado == secreto

    # 2. URI y Código QR
    uri = mfa_utils.construir_uri_totp("auditor@cartagena.gov.co", secreto)
    assert "otpauth://totp/POLIS%20Cartagena:auditor%40cartagena.gov.co" in uri
    assert f"secret={secreto}" in uri
    qr_data = mfa_utils.generar_qr_code_data_uri(uri)
    assert qr_data.startswith("data:image/png;base64,")

    # 3. Código TOTP y tolerancia de ventana
    codigo = mfa_utils.calcular_codigo_totp(secreto)
    assert len(codigo) == 6
    assert codigo.isdigit()
    valido, paso = mfa_utils.verificar_codigo_totp(secreto, codigo)
    assert valido is True
    assert isinstance(paso, int)
    valido_inv, paso_inv = mfa_utils.verificar_codigo_totp(secreto, "000000" if codigo != "000000" else "999999")
    assert valido_inv is False
    assert paso_inv is None

    # 4. Códigos de recuperación
    codigos = mfa_utils.generar_codigos_recuperacion(8)
    assert len(codigos) == 8
    for c in codigos:
        assert len(c) == 9 and c[4] == "-"

    hashes = [mfa_utils.hashear_codigo_recuperacion(c, settings.ip_salt) for c in codigos]
    valido, restantes = mfa_utils.verificar_y_consumir_codigo_recuperacion(codigos[0], hashes, settings.ip_salt)
    assert valido is True
    assert len(restantes) == 7

    # Quemado: el mismo código ya no debe ser válido en los restantes
    invalido, _ = mfa_utils.verificar_y_consumir_codigo_recuperacion(codigos[0], restantes, settings.ip_salt)
    assert invalido is False


async def test_token_desafio_mfa(settings):
    """Verifica la emisión y validación del token de desafío temporal de MFA."""
    uid = uuid.uuid4()
    token = crear_token_desafio_mfa(uid, expira_minutos=5, settings=settings)
    assert isinstance(token, str)

    recuperado_id = decodificar_token_desafio_mfa(token, settings)
    assert recuperado_id == uid

    # Token manipulado
    assert decodificar_token_desafio_mfa(token + "invalido", settings) is None


async def test_totp_antirreplay_unitario():
    """Verifica el cumplimiento de RFC 6238 §5.2 rechazando la reutilización de códigos."""
    secreto = mfa_utils.generar_secreto_totp()
    t_fijo = 1770000000
    intervalo = 30
    paso_esperado = t_fijo // intervalo

    codigo_t = mfa_utils.calcular_codigo_totp(secreto, timestamp=t_fijo)

    # 1. Primera verificación sin último paso registrado -> Éxito
    valido, paso = mfa_utils.verificar_codigo_totp(secreto, codigo_t, timestamp=t_fijo, ultimo_paso=None)
    assert valido is True
    assert paso == paso_esperado

    # 2. Reintento con el mismo código en el mismo instante (replay) -> Rechazado
    valido_replay, _ = mfa_utils.verificar_codigo_totp(secreto, codigo_t, timestamp=t_fijo, ultimo_paso=paso)
    assert valido_replay is False

    # 3. Código de un paso previo o igual -> Rechazado
    codigo_previo = mfa_utils.calcular_codigo_totp(secreto, timestamp=t_fijo - intervalo)
    valido_prev, _ = mfa_utils.verificar_codigo_totp(secreto, codigo_previo, timestamp=t_fijo, ultimo_paso=paso)
    assert valido_prev is False

    # 4. Código del siguiente intervalo temporal (t + 30s) -> Éxito
    codigo_siguiente = mfa_utils.calcular_codigo_totp(secreto, timestamp=t_fijo + intervalo)
    valido_sig, paso_sig = mfa_utils.verificar_codigo_totp(
        secreto, codigo_siguiente, timestamp=t_fijo + intervalo, ultimo_paso=paso
    )
    assert valido_sig is True
    assert paso_sig == paso_esperado + 1


async def test_mfa_clave_cifrado_obligatoria():
    """Verifica que la clave MFA dedicada sea obligatoria en producción y cuando se exige MFA."""
    # 1. Al arrancar con roles MFA exigidos y sin clave MFA -> Falla en Settings
    with pytest.raises(ValueError, match="POLIS_MFA_ENCRYPTION_KEY es obligatoria"):
        Settings(
            _env_file=None,
            environment="production",
            jwt_secret_key="a" * 32,
            mfa_roles_exigidos="administrador",
            mfa_encryption_key=None,
        )

    # 2. Con clave Fernet inválida -> Falla en Settings
    with pytest.raises(ValueError, match="no es una clave Fernet válida"):
        Settings(
            _env_file=None,
            environment="production",
            jwt_secret_key="a" * 32,
            mfa_encryption_key="clave_no_fernet_invalida",
        )

    # 3. En producción si falta la clave y se intenta operar con MFA -> RuntimeError (sin fallback a JWT)
    conf_prod_sin_clave = Settings(
        _env_file=None,
        environment="production",
        jwt_secret_key="a" * 32,
        mfa_encryption_key=None,
    )
    with pytest.raises(RuntimeError, match="POLIS_MFA_ENCRYPTION_KEY es obligatoria en producción"):
        mfa_utils.obtener_cifrador_mfa(conf_prod_sin_clave)

    # 4. Con clave Fernet válida -> Se instancia y cifra correctamente
    clave_valida = Fernet.generate_key().decode("ascii")
    conf = Settings(
        _env_file=None,
        environment="production",
        jwt_secret_key="a" * 32,
        mfa_encryption_key=clave_valida,
    )
    cifrador = mfa_utils.obtener_cifrador_mfa(conf)
    assert isinstance(cifrador, Fernet)


def test_flujo_completo_mfa_api(database_url: str):
    """Prueba integral de enrolamiento, login desafiado, verificación y desactivación por API."""
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        jwt_secret_key="test_secret_key_32_characters_long_super_safe",
        ip_salt="test_salt_habeas_data_2026",
    )
    app = create_app(settings)
    with TestClient(app) as client:
        # 1. Registrar usuario para la prueba
        correo_test = f"admin_mfa_{uuid.uuid4().hex[:8]}@cartagena.gov.co"
        reg_resp = client.post(
            "/api/v1/identidad/registro",
            json={
                "correo": correo_test,
                "contrasena": "PasswordSeguro2026!",
                "nombres": "Admin",
                "apellidos": "MFA Test",
            },
        )
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()
        # Validación intrínseca en línea; AUD-2026-10-21 T2 elimina la variable
        # muerta del original (el flujo MFA subsiguiente usa el correo, no el id).
        assert uuid.UUID(user_data["id"])

        # 2. Login inicial (sin MFA activado)
        login1 = client.post(
            "/api/v1/identidad/login",
            json={"correo": correo_test, "contrasena": "PasswordSeguro2026!"},
        )
        assert login1.status_code == 200
        data1 = login1.json()
        assert data1["mfa_requerido"] is False
        assert len(data1["token_acceso"]) > 20
        token_auth = data1["token_acceso"]
        auth_headers = {"Authorization": f"Bearer {token_auth}"}

        # 3. Consultar estado MFA inicial
        estado_resp = client.get("/api/v1/identidad/mfa/estado", headers=auth_headers)
        assert estado_resp.status_code == 200
        assert estado_resp.json()["activo"] is False
        assert estado_resp.json()["codigos_restantes"] == 0

        # 4. Iniciar enrolamiento MFA
        iniciar_resp = client.post("/api/v1/identidad/mfa/iniciar", headers=auth_headers)
        assert iniciar_resp.status_code == 200
        iniciar_data = iniciar_resp.json()
        secreto_b32 = iniciar_data["secreto_b32"]
        assert len(secreto_b32) == 32
        assert iniciar_data["qr_code_base64"].startswith("data:image/png;base64,")

        # 5. Activar MFA con código inválido -> 400
        activar_fail = client.post(
            "/api/v1/identidad/mfa/activar",
            json={"codigo": "000000"},
            headers=auth_headers,
        )
        assert activar_fail.status_code == 400

        # 6. Activar MFA con código TOTP válido
        codigo_valido = mfa_utils.calcular_codigo_totp(secreto_b32)
        activar_ok = client.post(
            "/api/v1/identidad/mfa/activar",
            json={"codigo": codigo_valido},
            headers=auth_headers,
        )
        assert activar_ok.status_code == 200
        activar_data = activar_ok.json()
        codigos_recuperacion = activar_data["codigos_recuperacion"]
        assert len(codigos_recuperacion) == 8

        # 7. Verificar estado MFA activo
        estado_activo = client.get("/api/v1/identidad/mfa/estado", headers=auth_headers)
        assert estado_activo.status_code == 200
        assert estado_activo.json()["activo"] is True
        assert estado_activo.json()["codigos_restantes"] == 8

        # 8. Login con MFA activo -> Retorna mfa_requerido: true
        login2 = client.post(
            "/api/v1/identidad/login",
            json={"correo": correo_test, "contrasena": "PasswordSeguro2026!"},
        )
        assert login2.status_code == 200
        data2 = login2.json()
        assert data2["mfa_requerido"] is True
        assert data2["token_acceso"] == ""
        token_desafio = data2["token_desafio_mfa"]
        assert len(token_desafio) > 20

        # 9. Resolver desafío con código erróneo -> 401
        verif_fail = client.post(
            "/api/v1/identidad/mfa/verificar",
            json={"token_desafio": token_desafio, "codigo": "123456"},
        )
        assert verif_fail.status_code == 401

        # 9b. Reutilizar el código de activación -> 401 (Antirreplay RFC 6238 §5.2)
        replay_fail = client.post(
            "/api/v1/identidad/mfa/verificar",
            json={"token_desafio": token_desafio, "codigo": codigo_valido},
        )
        assert replay_fail.status_code == 401

        # 10. Resolver desafío con código TOTP del siguiente intervalo (+35s) -> 200 con token_acceso
        t_base = int(time.time())
        with patch("time.time", return_value=t_base + 35):
            codigo_siguiente = mfa_utils.calcular_codigo_totp(secreto_b32, timestamp=t_base + 35)
            verif_ok = client.post(
                "/api/v1/identidad/mfa/verificar",
                json={"token_desafio": token_desafio, "codigo": codigo_siguiente},
            )
            assert verif_ok.status_code == 200
            data_verif = verif_ok.json()
            assert data_verif["mfa_requerido"] is False
            assert len(data_verif["token_acceso"]) > 20

            # 10b. Intentar reutilizar inmediatamente el mismo código -> 401 (Antirreplay en login)
            login_replay = client.post(
                "/api/v1/identidad/login",
                json={"correo": correo_test, "contrasena": "PasswordSeguro2026!"},
            )
            desafio_replay = login_replay.json()["token_desafio_mfa"]
            verif_replay = client.post(
                "/api/v1/identidad/mfa/verificar",
                json={"token_desafio": desafio_replay, "codigo": codigo_siguiente},
            )
            assert verif_replay.status_code == 401

        # 11. Resolver desafío alternativo usando código de recuperación
        # Login de nuevo para obtener otro desafío
        login3 = client.post(
            "/api/v1/identidad/login",
            json={"correo": correo_test, "contrasena": "PasswordSeguro2026!"},
        )
        desafio3 = login3.json()["token_desafio_mfa"]

        # Usar el primer código de recuperación
        recovery_code = codigos_recuperacion[0]
        rec_verif = client.post(
            "/api/v1/identidad/mfa/verificar",
            json={"token_desafio": desafio3, "codigo": recovery_code},
        )
        assert rec_verif.status_code == 200
        assert rec_verif.json()["mfa_requerido"] is False

        # Verificar que el código se consumió (restan 7)
        headers3 = {"Authorization": f"Bearer {rec_verif.json()['token_acceso']}"}
        estado_post_rec = client.get("/api/v1/identidad/mfa/estado", headers=headers3)
        assert estado_post_rec.json()["codigos_restantes"] == 7

        # 12. Regenerar códigos de recuperación (avanzando al siguiente intervalo +70s)
        with patch("time.time", return_value=t_base + 70):
            codigo_regen = mfa_utils.calcular_codigo_totp(secreto_b32, timestamp=t_base + 70)
            regen_resp = client.post(
                "/api/v1/identidad/mfa/recuperacion/regenerar",
                json={"codigo": codigo_regen},
                headers=headers3,
            )
            assert regen_resp.status_code == 200
            assert len(regen_resp.json()["codigos_recuperacion"]) == 8

        # 13. Desactivar MFA con contraseña incorrecta -> 401
        desact_fail = client.post(
            "/api/v1/identidad/mfa/desactivar",
            json={"contrasena": "ClaveIncorrecta!"},
            headers=headers3,
        )
        assert desact_fail.status_code == 401

        # 14. Desactivar MFA con contraseña correcta -> 200
        desact_ok = client.post(
            "/api/v1/identidad/mfa/desactivar",
            json={"contrasena": "PasswordSeguro2026!"},
            headers=headers3,
        )
        assert desact_ok.status_code == 200

        # 15. Comprobar que el login posterior vuelve a ser directo sin MFA
        login_final = client.post(
            "/api/v1/identidad/login",
            json={"correo": correo_test, "contrasena": "PasswordSeguro2026!"},
        )
        assert login_final.status_code == 200
        assert login_final.json()["mfa_requerido"] is False
        assert len(login_final.json()["token_acceso"]) > 20
