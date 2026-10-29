import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def sync_client(database_url: str):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def obtener_token_ciudadano(client: TestClient) -> tuple[str, str]:
    correo = f"ciudadano_form_{os.urandom(4).hex()}@cartagena.gov.co"
    clave = "Cartagena2026*"
    resp_reg = client.post(
        "/api/v1/identidad/registro",
        json={
            "correo": correo,
            "contrasena": clave,
            "nombres": "Ciudadano",
            "apellidos": "Participante",
        },
    )
    assert resp_reg.status_code == 201
    resp_log = client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": clave})
    assert resp_log.status_code == 200
    token = resp_log.json()["token_acceso"]
    sujeto_id = resp_reg.json()["id"]
    return token, sujeto_id


def obtener_token_autoridad(client: TestClient, provisionar_usuario_sync) -> str:
    correo = f"autoridad_form_{os.urandom(4).hex()}@cartagena.gov.co"
    clave = "Cartagena2026*"
    resp_prov = provisionar_usuario_sync(
        client,
        {
            "correo": correo,
            "contrasena": clave,
            "nombres": "Doctora",
            "apellidos": "Secretaria",
            "codigo_rol": "autoridad_distrital",
        },
    )
    assert resp_prov.status_code == 201
    resp_log = client.post("/api/v1/identidad/login", json={"correo": correo, "contrasena": clave})
    assert resp_log.status_code == 200
    return resp_log.json()["token_acceso"]


def test_listar_formularios_publicos(sync_client: TestClient):
    """Verifica el catálogo público con las semillas oficiales."""
    resp = sync_client.get("/api/v1/formularios")
    assert resp.status_code == 200
    formularios = resp.json()
    assert isinstance(formularios, list)
    assert len(formularios) >= 2

    codigos = [f["codigo"] for f in formularios]
    assert "FORM-L02-CONV-2026" in codigos
    assert "FORM-CIENAGA-AMB-2026" in codigos

    form_l02 = next(f for f in formularios if f["codigo"] == "FORM-L02-CONV-2026")
    assert form_l02["estado"] == "PUBLICADO"
    assert form_l02["enfoque_diferencial_habilitado"] is True
    assert form_l02["permite_evidencias"] is True
    assert len(form_l02["esquema_preguntas"]) >= 3


def test_obtener_formulario_detalle(sync_client: TestClient):
    """Verifica la consulta detallada de un formulario individual."""
    resp_lista = sync_client.get("/api/v1/formularios")
    form_id = resp_lista.json()[0]["id"]

    resp = sync_client.get(f"/api/v1/formularios/{form_id}")
    assert resp.status_code == 200
    form = resp.json()
    assert form["id"] == form_id
    assert "esquema_preguntas" in form
    assert isinstance(form["esquema_preguntas"], list)


def test_enviar_respuesta_y_unicidad_por_sujeto(sync_client: TestClient):
    """Valida respuestas con enfoque diferencial y unicidad por sujeto."""
    resp_lista = sync_client.get("/api/v1/formularios")
    form_l02 = next(f for f in resp_lista.json() if f["codigo"] == "FORM-L02-CONV-2026")
    form_id = form_l02["id"]

    token_ciudadano, sujeto_id = obtener_token_ciudadano(sync_client)
    headers = {"Authorization": f"Bearer {token_ciudadano}"}

    # 1. Enviar respuesta válida
    payload_respuesta = {
        "datos_enfoque": {
            "poblacion_vulnerable": "Ley 1448/11 (Víctimas del Conflicto)",
            "etnia": "Comunidad Negra / Afrocolombiana",
            "genero": "Femenino",
            "rango_edad": "29-45",
        },
        "datos_respuesta": {
            "preg-conv-01": "Falta de alumbrado y espacios públicos seguros",
            "preg-conv-02": 4,
            "preg-conv-03": "Creación de frentes de seguridad comunitaria y alarmas barriales.",
            "preg-conv-04": "Totalmente de acuerdo",
        },
        "evidencias": [
            {
                "archivo_id": str(uuid.uuid4()),
                "descripcion": "Foto de luminaria averiada en calle 15",
            }
        ],
    }

    resp_envio = sync_client.post(
        f"/api/v1/formularios/{form_id}/respuestas",
        json=payload_respuesta,
        headers=headers,
    )
    assert resp_envio.status_code == 201, resp_envio.text
    datos_creados = resp_envio.json()
    assert datos_creados["formulario_id"] == form_id
    assert datos_creados["sujeto_id"] == sujeto_id
    assert datos_creados["datos_enfoque"]["poblacion_vulnerable"] == "Ley 1448/11 (Víctimas del Conflicto)"

    # 2. Intento de respuesta duplicada por el mismo sujeto -> 409 Conflict
    resp_duplicada = sync_client.post(
        f"/api/v1/formularios/{form_id}/respuestas",
        json=payload_respuesta,
        headers=headers,
    )
    assert resp_duplicada.status_code == 409
    assert "ya ha enviado una respuesta" in resp_duplicada.json()["detail"]


def test_analitica_y_tabulacion_matematica(sync_client: TestClient, provisionar_usuario_sync):
    """Valida analítica con enfoque diferencial y tabulación de preguntas."""
    resp_lista = sync_client.get("/api/v1/formularios")
    form_l02 = next(f for f in resp_lista.json() if f["codigo"] == "FORM-L02-CONV-2026")
    form_id = form_l02["id"]

    # Asegurar al menos una respuesta registrada
    token_ciudadano, _ = obtener_token_ciudadano(sync_client)
    sync_client.post(
        f"/api/v1/formularios/{form_id}/respuestas",
        json={
            "datos_enfoque": {"poblacion_vulnerable": "Ley 1448/11 (Víctimas del Conflicto)"},
            "datos_respuesta": {
                "preg-conv-01": "Falta de alumbrado y espacios públicos seguros",
                "preg-conv-02": 5,
                "preg-conv-04": "Totalmente de acuerdo",
            },
        },
        headers={"Authorization": f"Bearer {token_ciudadano}"},
    )

    token_autoridad = obtener_token_autoridad(sync_client, provisionar_usuario_sync)
    headers = {"Authorization": f"Bearer {token_autoridad}"}

    resp_analitica = sync_client.get(f"/api/v1/formularios/{form_id}/analitica", headers=headers)
    assert resp_analitica.status_code == 200, resp_analitica.text
    analitica = resp_analitica.json()

    assert analitica["formulario_id"] == form_id
    assert analitica["total_respuestas"] >= 1
    assert "desglose_enfoque_diferencial" in analitica
    assert "tabulacion_preguntas" in analitica
    assert isinstance(analitica["tabulacion_preguntas"], dict)

    # Verificar que las preguntas del esquema tienen su tabulación
    assert "preg-conv-01" in analitica["tabulacion_preguntas"]


def test_gestion_formularios_crud_y_denegacion_ciudadano(sync_client: TestClient, provisionar_usuario_sync):
    """Valida el ciclo CRUD institucional y la denegación (403) a ciudadanos no autorizados."""
    token_ciudadano, _ = obtener_token_ciudadano(sync_client)
    token_autoridad = obtener_token_autoridad(sync_client, provisionar_usuario_sync)

    nuevo_form_data = {
        "codigo": f"FORM-TEST-{os.urandom(3).hex().upper()}",
        "titulo": "Consulta de Salud Preventiva en Barrios Unidos",
        "descripcion": "Encuesta ciudadana para evaluar coberturas de centros de salud locales.",
        "estado": "PUBLICADO",
        "esquema_preguntas": [
            {
                "id": "preg_acceso_salud",
                "tipo": "opcion_unica",
                "texto": "¿Tiene acceso a un centro de salud a menos de 15 minutos?",
                "obligatoria": True,
                "opciones": ["Sí", "No"],
            }
        ],
        "enfoque_diferencial_habilitado": True,
        "permite_evidencias": False,
    }

    # 1. Ciudadano intenta crear formulario -> 403 Forbidden
    resp_denegada = sync_client.post(
        "/api/v1/formularios",
        json=nuevo_form_data,
        headers={"Authorization": f"Bearer {token_ciudadano}"},
    )
    assert resp_denegada.status_code == 403

    # 2. Autoridad distrital crea formulario -> 201 Created
    resp_crear = sync_client.post(
        "/api/v1/formularios",
        json=nuevo_form_data,
        headers={"Authorization": f"Bearer {token_autoridad}"},
    )
    assert resp_crear.status_code == 201, resp_crear.text
    creado = resp_crear.json()
    nuevo_id = creado["id"]
    assert creado["codigo"] == nuevo_form_data["codigo"]

    # 3. Autoridad actualiza formulario -> 200 OK
    resp_actualizar = sync_client.put(
        f"/api/v1/formularios/{nuevo_id}",
        json={"descripcion": "Descripción actualizada con enfoque territorial."},
        headers={"Authorization": f"Bearer {token_autoridad}"},
    )
    assert resp_actualizar.status_code == 200
    assert resp_actualizar.json()["descripcion"] == "Descripción actualizada con enfoque territorial."

    # 4. Autoridad elimina formulario -> 200 OK
    resp_eliminar = sync_client.delete(
        f"/api/v1/formularios/{nuevo_id}",
        headers={"Authorization": f"Bearer {token_autoridad}"},
    )
    assert resp_eliminar.status_code == 200
    assert "eliminado exitosamente" in resp_eliminar.json()["mensaje"]
