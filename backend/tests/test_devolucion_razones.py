import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_devolucion_razones_flujo_completo(database_url: str, provisionar_usuario):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app) as client:
        # 1. Crear sesión anonima y registrar una propuesta para probar
        resp_sesion = client.post("/api/v1/sesion/anonima")
        token_ciudadano = resp_sesion.json()["token_acceso"]
        headers_ciudadano = {"Authorization": f"Bearer {token_ciudadano}"}

        # Necesitamos linea_id para crear propuesta, busquemos una
        # o solo hacemos POST, la API falla si no existe,
        # mejor creamos un token de Autoridad Distrital
        resp_reg = await provisionar_usuario(
            client,
            {
                "correo": f"autoridad_{uuid.uuid4().hex[:6]}@cartagena.gov.co",
                "contrasena": "Secreta123*",
                "nombres": "Aut",
                "apellidos": "Dist",
                "codigo_rol": "autoridad_distrital",
            },
        )
        assert resp_reg.status_code == 201

        resp_login = client.post(
            "/api/v1/identidad/login",
            json={"correo": resp_reg.json()["correo"], "contrasena": "Secreta123*"},
        )
        token_autoridad = resp_login.json()["token_acceso"]
        headers_autoridad = {"Authorization": f"Bearer {token_autoridad}"}

        # Para crear propuesta, obtenemos linea
        resp_lineas = client.get("/api/v1/politicas/lineas")
        linea_id = resp_lineas.json()[0]["id"]

        resp_prop = client.post(
            "/api/v1/aportes",
            json={
                "linea_id": linea_id,
                "titulo": "Propuesta para probar devolucion",
                "descripcion": "Verificando el sistema de auditoria forense",
                "tipo_aporte": "propuesta",
            },
            headers=headers_ciudadano,
        )
        assert resp_prop.status_code == 201
        aporte_id = resp_prop.json()["id"]

        # 2. Verificar que NO se puede hacer descarte silencioso
        resp_silencioso = client.patch(
            f"/api/v1/aportes/{aporte_id}", json={"estado": "rechazado"}, headers=headers_autoridad
        )
        assert resp_silencioso.status_code == 422
        assert "descarte silencioso" in resp_silencioso.json()["detail"].lower()

        # 3. Ciudadano intenta devolver -> 403 Forbidden
        resp_ciudadano_dev = client.post(
            f"/api/v1/aportes/{aporte_id}/devolucion-razon",
            json={
                "causal": "tecnica",
                "justificacion_motivada": (
                    "Esta es una justificacion motivada que tiene al menos veinte caracteres"
                ),
            },
            headers=headers_ciudadano,
        )
        assert resp_ciudadano_dev.status_code == 403

        # 3.1 Causal inválida rechazada (422)
        resp_causal_invalida = client.post(
            f"/api/v1/aportes/{aporte_id}/devolucion-razon",
            json={
                "causal": "antojadiza",
                "justificacion_motivada": (
                    "Justificación con longitud suficiente pero causal no permitida por C-150"
                ),
            },
            headers=headers_autoridad,
        )
        assert resp_causal_invalida.status_code == 422

        # 3.2 Justificación insuficiente (<20 caracteres) rechazada (422)
        resp_corta = client.post(
            f"/api/v1/aportes/{aporte_id}/devolucion-razon",
            json={"causal": "juridica", "justificacion_motivada": "Muy corta"},
            headers=headers_autoridad,
        )
        assert resp_corta.status_code == 422

        # 4. Autoridad hace la devolución válida
        resp_aut_dev = client.post(
            f"/api/v1/aportes/{aporte_id}/devolucion-razon",
            json={
                "causal": "tecnica",
                "justificacion_motivada": (
                    "Esta propuesta presenta inconsistencias met"
                    "odologicas graves y por lo tanto se rechaza."
                ),
            },
            headers=headers_autoridad,
        )
        assert resp_aut_dev.status_code == 201
        devolucion_json = resp_aut_dev.json()
        assert "id" in devolucion_json
        # Verificar UUIDv7
        uuid_obj = uuid.UUID(devolucion_json["id"])
        assert uuid_obj.version == 7

        # 4.1 Intento de re-devolver una propuesta ya rechazada -> 400 Bad Request
        resp_doble = client.post(
            f"/api/v1/aportes/{aporte_id}/devolucion-razon",
            json={
                "causal": "presupuestal",
                "justificacion_motivada": (
                    "Intento de sobreescribir rechazo constitucional ya establecido."
                ),
            },
            headers=headers_autoridad,
        )
        assert resp_doble.status_code == 400

        # 5. Obtener historial publico
        resp_historial = client.get(f"/api/v1/aportes/{aporte_id}/devolucion-razon")
        assert resp_historial.status_code == 200
        historial = resp_historial.json()
        assert len(historial) == 1
        assert historial[0]["causal"] == "tecnica"

        # 6. Prueba de inmutabilidad en base de datos
        engine = create_async_engine(database_url)
        async with engine.begin() as conn:
            # Intentar borrar el registro
            try:
                await conn.execute(
                    text(
                        "DELETE FROM auditoria.registros_auditoria WHERE registro_id = '"
                        f"{aporte_id}"
                        "'"
                    )
                )
                raise AssertionError("Debería haber fallado por inmutabilidad")
            except Exception as e:
                assert "inmutable" in str(e).lower()

        async with engine.begin() as conn:
            # Intentar actualizar el registro
            try:
                await conn.execute(
                    text(
                        "UPDATE auditoria.registros_auditoria SET causal = 'juridica' WHE"
                        "RE registro_id = '"
                        f"{aporte_id}"
                        "'"
                    )
                )
                raise AssertionError("Debería haber fallado por inmutabilidad")
            except Exception as e:
                assert "inmutable" in str(e).lower()

        await engine.dispose()
