"""Pruebas unitarias y de integración para la gestión de anexos de actividades en Proyectos."""

import io

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def clients(database_url, cabeceras_gestion, tmp_path, monkeypatch):
    from app.core.config import Settings
    from app.main import create_app
    from app.modules.proyectos import service as proyectos_service

    monkeypatch.setattr(proyectos_service, "DIRECTORIO_ANEXOS", tmp_path / "anexos")
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings), headers=cabeceras_gestion) as gestor:
        with TestClient(create_app(settings)) as publico:
            yield gestor, publico


def test_control_acceso_anexos(clients):
    """Las rutas de anexos requieren autenticación."""
    gestor, publico = clients
    act_id = "comunicaciones:test"

    # Público sin token
    res_listar = publico.get(f"/api/v1/proyectos/actividades/{act_id}/anexos")
    assert res_listar.status_code in {401, 403}

    res_subir = publico.post(
        f"/api/v1/proyectos/actividades/{act_id}/anexos",
        files={"archivo": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert res_subir.status_code in {401, 403}


def test_ciclo_completo_anexos(clients):
    """Ciclo completo: listar, subir, descargar y eliminar anexo en actividad existente."""
    gestor, _ = clients

    # 1. Obtener una actividad real existente
    res_acts = gestor.get("/api/v1/proyectos/actividades")
    assert res_acts.status_code == 200
    actividades = res_acts.json()
    assert len(actividades) > 0, "Debe haber al menos una actividad disponible para pruebas"
    actividad = actividades[0]
    actividad_id = actividad["id"]

    # 2. Listar anexos inicialmente
    res_ini = gestor.get(f"/api/v1/proyectos/actividades/{actividad_id}/anexos")
    assert res_ini.status_code == 200
    anexos_ini = res_ini.json()
    conteo_ini = len(anexos_ini)

    # 3. Subir un anexo en formato PDF
    contenido_prueba = b"%PDF-1.4 Informe tecnico de avance institucional POLIS 2026"
    archivo_payload = ("informe_tecnico.pdf", io.BytesIO(contenido_prueba), "application/pdf")

    res_post = gestor.post(
        f"/api/v1/proyectos/actividades/{actividad_id}/anexos",
        files={"archivo": archivo_payload},
        data={"descripcion": "Informe técnico de avance institucional"},
    )
    assert res_post.status_code == 201, res_post.text
    anexo_creado = res_post.json()
    assert anexo_creado["actividad_id"] == actividad_id
    assert anexo_creado["nombre_archivo"] == "informe_tecnico.pdf"
    assert anexo_creado["tipo_mime"] == "application/pdf"
    assert anexo_creado["tamano_bytes"] == len(contenido_prueba)
    assert anexo_creado["descripcion"] == "Informe técnico de avance institucional"
    assert "url_descarga" in anexo_creado
    anexo_id = anexo_creado["id"]

    # 4. Listar de nuevo y comprobar que se incrementó
    res_list_post = gestor.get(f"/api/v1/proyectos/actividades/{actividad_id}/anexos")
    assert res_list_post.status_code == 200
    anexos_post = res_list_post.json()
    assert len(anexos_post) == conteo_ini + 1
    ids = [a["id"] for a in anexos_post]
    assert anexo_id in ids

    # 5. Descargar el archivo
    res_down = gestor.get(f"/api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}/archivo")
    assert res_down.status_code == 200
    assert res_down.content == contenido_prueba
    assert "informe_tecnico.pdf" in res_down.headers.get("content-disposition", "")

    # 6. Eliminar el anexo
    res_del = gestor.delete(f"/api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}")
    assert res_del.status_code == 204

    # 7. Listar de nuevo y confirmar que ya no aparece
    res_list_final = gestor.get(f"/api/v1/proyectos/actividades/{actividad_id}/anexos")
    assert res_list_final.status_code == 200
    ids_final = [a["id"] for a in res_list_final.json()]
    assert anexo_id not in ids_final

    # 8. Descarga posterior da 404
    res_down_404 = gestor.get(f"/api/v1/proyectos/actividades/{actividad_id}/anexos/{anexo_id}/archivo")
    assert res_down_404.status_code == 404


def test_validacion_extensiones_y_actividad_inexistente(clients):
    gestor, _ = clients

    # Subida a actividad que no existe
    res_act_inexistente = gestor.post(
        "/api/v1/proyectos/actividades/comunicaciones:00000000-0000-0000-0000-000000000000/anexos",
        files={"archivo": ("doc.pdf", b"%PDF-1.4 prueba", "application/pdf")},
    )
    assert res_act_inexistente.status_code == 404

    # Subida con extensión prohibida (.exe)
    res_acts = gestor.get("/api/v1/proyectos/actividades")
    actividad_id = res_acts.json()[0]["id"]

    res_extension_mala = gestor.post(
        f"/api/v1/proyectos/actividades/{actividad_id}/anexos",
        files={"archivo": ("script.exe", b"MZ evil executable", "application/x-msdownload")},
    )
    assert res_extension_mala.status_code == 415
