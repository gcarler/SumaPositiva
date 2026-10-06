"""Pruebas automatizadas para el módulo de Comunicaciones y Cronograma de Trabajo."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.comunicaciones.models import TareaComunicacion
from app.modules.comunicaciones.repository import ComunicacionesRepository


@pytest.fixture
def clients(database_url, cabeceras_gestion):
    from app.core.config import Settings
    from app.main import create_app

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings), headers=cabeceras_gestion) as gestor:
        with TestClient(create_app(settings)) as publico:
            yield gestor, publico


def test_control_acceso_comunicaciones(clients):
    gestor, publico = clients
    # Acceso no autenticado es rechazado
    res_pub = publico.get("/api/v1/comunicaciones/tareas")
    assert res_pub.status_code in {401, 403}

    # Acceso autenticado como autoridad_distrital es concedido
    res_gest = gestor.get("/api/v1/comunicaciones/tareas")
    assert res_gest.status_code == 200
    tareas = res_gest.json()
    assert len(tareas) >= 18
    # Verificar que TC-01 y TC-10 existen
    codigos = {t["codigo"] for t in tareas}
    assert "TC-01" in codigos
    assert "TC-10" in codigos
    assert "TC-18" in codigos


def test_filtrar_tareas_comunicacion(clients):
    gestor, _ = clients
    # Filtrar por etapa
    res_etapa = gestor.get(
        "/api/v1/comunicaciones/tareas",
        params={"etapa": "Etapa 1: Pre-Producción y Banco de Evidencias"},
    )
    assert res_etapa.status_code == 200
    tareas_etapa = res_etapa.json()
    assert len(tareas_etapa) == 9
    assert all("Pre-Producción" in t["etapa"] for t in tareas_etapa)

    # Filtrar por estado
    res_prog = gestor.get(
        "/api/v1/comunicaciones/tareas",
        params={"estado": "en_progreso"},
    )
    assert res_prog.status_code == 200
    assert any(t["codigo"] == "TC-01" for t in res_prog.json())


def test_actualizar_tarea_y_fechas_persiste(clients):
    gestor, _ = clients
    # Obtener TC-02
    todas = gestor.get("/api/v1/comunicaciones/tareas").json()
    tc02 = next(t for t in todas if t["codigo"] == "TC-02")
    tarea_id = tc02["id"]

    # Actualizar fechas y estado
    cambios = {
        "titulo": "Jornada de Campo 1 (Ajustada): Canapote y Torices",
        "fecha_inicio": "2026-10-07",
        "fecha_fin": "2026-10-08",
        "estado": "en_progreso",
        "entregables": "20 fotos de alta resolución + 4 cápsulas de video",
    }
    res_act = gestor.put(f"/api/v1/comunicaciones/tareas/{tarea_id}", json=cambios)
    assert res_act.status_code == 200, res_act.text
    datos = res_act.json()
    assert datos["titulo"] == cambios["titulo"]
    assert datos["fecha_fin"] == "2026-10-08"
    assert datos["estado"] == "en_progreso"

    # Verificar persistencia en consulta subsiguiente
    res_verif = gestor.get(f"/api/v1/comunicaciones/tareas/{tarea_id}")
    assert res_verif.status_code == 200
    assert res_verif.json()["fecha_fin"] == "2026-10-08"


def test_validacion_fechas_inconsistentes(clients):
    gestor, _ = clients
    todas = gestor.get("/api/v1/comunicaciones/tareas").json()
    tarea_id = todas[0]["id"]

    # Intentar poner fecha_fin anterior a fecha_inicio
    res_invalida = gestor.put(
        f"/api/v1/comunicaciones/tareas/{tarea_id}",
        json={"fecha_inicio": "2026-10-15", "fecha_fin": "2026-10-10"},
    )
    assert res_invalida.status_code == 422
    assert "no puede ser anterior" in res_invalida.text


def test_crear_y_eliminar_tarea(clients):
    gestor, _ = clients
    nueva_tarea = {
        "codigo": "TC-EXTRA-01",
        "etapa": "Etapa 1: Pre-Producción y Banco de Evidencias",
        "territorio": "Localidad 1: Canapote",
        "titulo": "Grabación de tomas con dron en canales pluviales",
        "descripcion": "Registro aéreo de puntos críticos de inundación.",
        "entregables": "5 clips de video aéreo 4K.",
        "fecha_inicio": "2026-10-09",
        "fecha_fin": "2026-10-09",
        "estado": "pendiente",
        "responsable": "Operador de Dron y Audiovisual",
        "orden": 99,
    }
    res_crear = gestor.post("/api/v1/comunicaciones/tareas", json=nueva_tarea)
    assert res_crear.status_code == 201, res_crear.text
    creada = res_crear.json()
    assert creada["codigo"] == "TC-EXTRA-01"

    # Conflicto ante código duplicado
    res_dup = gestor.post("/api/v1/comunicaciones/tareas", json=nueva_tarea)
    assert res_dup.status_code == 409

    # Eliminar tarea
    res_del = gestor.delete(f"/api/v1/comunicaciones/tareas/{creada['id']}")
    assert res_del.status_code == 204

    # Verificar que ya no existe
    res_check = gestor.get(f"/api/v1/comunicaciones/tareas/{creada['id']}")
    assert res_check.status_code == 404
