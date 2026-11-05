"""Contratos y ejemplos HTTP reales181 con secretos sustituidos por strings."""

import asyncio
import json
import os
from pathlib import Path
import uuid

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.main import create_app
from app.modules.identidad import mfa
from app.modules.identidad.schemas import (
    AmbitoTerritorialLectura, MfaEstadoLectura, MfaIniciarRespuesta, TokenRespuesta, UsuarioLectura,
)

OUT = Path(__file__).resolve().parent
URL = os.environ["POLIS_TEST_DATABASE_URL"]
config = Settings(_env_file=None, environment="test", database_url=URL,
                  mfa_roles_exigidos="administrador_identidades", mfa_encryption_key=Fernet.generate_key().decode())
app = create_app(config)
datos = {"correo": "edd-contratos-" + uuid.uuid4().hex + "@example.org", "contrasena": "EddContrato2026*",
         "nombres": "Contrato", "apellidos": "Sintetico"}
ejemplos = {}


async def sql(consulta, params):
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text(consulta), params)
            return result.scalars().all() if result.returns_rows else []
    finally:
        await engine.dispose()


def guardar(nombre, respuesta):
    assert respuesta.status_code in {200, 201}
    ejemplos[nombre] = respuesta.json()
    return respuesta.json()


def sanitizar(valor):
    campos = {"token_acceso", "token_desafio_mfa", "secreto_b32", "otpauth_uri", "qr_code_base64"}
    if isinstance(valor, dict):
        return {key: ("[VALOR_SENSIBLE_RETIRADO]" if key in campos and isinstance(item, str) and item else sanitizar(item))
                for key, item in valor.items()}
    if isinstance(valor, list):
        return [sanitizar(item) for item in valor]
    return valor


with TestClient(app) as client:
    registro = client.post("/api/v1/identidad/registro", json=datos)
    assert registro.status_code == 201
    uid = uuid.UUID(registro.json()["id"])
    try:
        asyncio.run(sql("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles "
                        "WHERE codigo='administrador_identidades') WHERE id=:uid", {"uid": uid}))
        limitada = guardar("login_limitado", client.post("/api/v1/identidad/login", json=datos))
        headers = {"Authorization": "Bearer " + limitada["token_acceso"]}
        guardar("perfil_limitado", client.get("/api/v1/identidad/perfil", headers=headers))
        guardar("estado_pendiente", client.get("/api/v1/identidad/mfa/estado", headers=headers))
        inicio = guardar("enrolamiento", client.post("/api/v1/identidad/mfa/iniciar", headers=headers))
        activada = client.post("/api/v1/identidad/mfa/activar", headers=headers,
                              json={"codigo": mfa.calcular_codigo_totp(inicio["secreto_b32"])})
        assert activada.status_code == 200
        guardar("estado_acreditado", client.get("/api/v1/identidad/mfa/estado", headers=headers))
        guardar("ambito", client.post(f"/api/v1/identidad/usuarios/{uid}/ambitos", headers=headers,
                                      json={"tipo_ambito": "distrital", "identificador_territorial": "13001",
                                            "motivo": "Ejemplo HTTP sintetico EDD de contrato final"}))
        desafio = guardar("login_desafio", client.post("/api/v1/identidad/login", json=datos))
        guardar("login_completo", client.post("/api/v1/identidad/mfa/verificar",
                json={"token_desafio": desafio["token_desafio_mfa"], "codigo": activada.json()["codigos_recuperacion"][0]}))
        clases = [TokenRespuesta, UsuarioLectura, MfaEstadoLectura, MfaIniciarRespuesta, AmbitoTerritorialLectura]
        (OUT / "contratos-identidad-final.json").write_text(json.dumps({
            "nota": "Respuestas HTTP reales; solo valores sensibles sustituidos conservando claves/tipos. Google/SMTP sin activar.",
            "ejemplos": sanitizar(ejemplos),
            "json_schemas": {clase.__name__: clase.model_json_schema() for clase in clases},
        }, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps({"ejemplos_exportados": list(ejemplos), "schemas": [clase.__name__ for clase in clases]}))
    finally:
        ids = asyncio.run(sql("SELECT id FROM autenticacion.sesiones_usuario WHERE usuario_id=:uid", {"uid": uid}))
        asyncio.run(sql("DELETE FROM autenticacion.usuarios WHERE id=:uid", {"uid": uid}))
        asyncio.run(sql("DELETE FROM participacion_ciudadana.sesiones_anonimas WHERE id=ANY(CAST(:ids AS uuid[]))", {"ids": ids}))
