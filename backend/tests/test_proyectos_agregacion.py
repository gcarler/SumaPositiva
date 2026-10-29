"""Pruebas automatizadas para la vista agregada de Proyectos (read-only)."""

import collections

import pytest
from fastapi.testclient import TestClient

# Alcance del agregado (encargo 2026-10-28): solo formulación de la política;
# el Plan de Acción NO es fuente y vive en /api/v1/seguimiento.
FONDOS_AGREGADOS = {"comunicaciones", "mesas", "formularios"}


@pytest.fixture
def clients(database_url, cabeceras_gestion):
    from app.core.config import Settings
    from app.main import create_app

    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    with TestClient(create_app(settings), headers=cabeceras_gestion) as gestor:
        with TestClient(create_app(settings)) as publico:
            yield gestor, publico


def _actividades(client: TestClient) -> list[dict]:
    res = client.get("/api/v1/proyectos/actividades")
    assert res.status_code == 200, res.text
    return res.json()


def test_control_acceso_proyectos(clients):
    """Toda ruta requiere clasificación: 401/403 sin sesión institucional."""
    gestor, publico = clients
    res = publico.get("/api/v1/proyectos/actividades")
    assert res.status_code in {401, 403}
    res_resumen = publico.get("/api/v1/proyectos/resumen")
    assert res_resumen.status_code in {401, 403}

    res_gest = gestor.get("/api/v1/proyectos/actividades")
    assert res_gest.status_code == 200


def test_agrega_las_fuentes_de_formulacion(clients):
    gestor, _ = clients
    actividades = _actividades(gestor)
    assert len(actividades) > 20

    presentes = {a["modulo_dueno"] for a in actividades}
    assert FONDOS_AGREGADOS.issubset(presentes)
    # El Plan de Acción (proyectos de los Planes de Desarrollo) no se agrega:
    # su gestión vive en el módulo de Seguimiento.
    assert "plan_accion" not in presentes

    # Contrato: identificadores compuestos y permiso del módulo dueño
    for a in actividades:
        assert a["id"] == f"{a['modulo_dueno']}:{a['recurso_id']}"
        assert a["permiso_editar"]
        assert a["estado_canonico"] in {
            "pendiente",
            "programada",
            "en_progreso",
            "completada",
            "reprogramada",
            "cancelada",
        }
        assert a["fecha_inicio"] <= (a["fecha_fin"] or a["fecha_inicio"] or a["fecha_inicio"])

    # Ordenamiento por fecha de inicio
    fechas = [a["fecha_inicio"] for a in actividades]
    assert fechas == sorted(fechas)


def test_filtro_por_modulo(clients):
    gestor, _ = clients
    res = gestor.get("/api/v1/proyectos/actividades", params={"modulo": "mesas"})
    assert res.status_code == 200
    assert res.json()
    assert all(a["modulo_dueno"] == "mesas" for a in res.json())
    assert all("mesas:" in a["id"] for a in res.json())


def test_plan_accion_no_es_fuente_valida(clients):
    """El parametrizador no acepta plan_accion como fuente del agregado."""
    gestor, _ = clients
    res = gestor.get("/api/v1/proyectos/actividades", params={"modulo": "plan_accion"})
    assert res.status_code == 422


def test_modulo_invalido_y_rango_inconsistente(clients):
    gestor, _ = clients
    res = gestor.get("/api/v1/proyectos/actividades", params={"modulo": "vecinos"})
    assert res.status_code == 422

    res_rango = gestor.get(
        "/api/v1/proyectos/actividades",
        params={"fecha_desde": "2031-01-01", "fecha_hasta": "2030-01-01"},
    )
    assert res_rango.status_code == 422


def test_resumen_consistente_con_listado(clients):
    """El resumen refleja exactamente el listado agregado, fuente por fuente."""
    gestor, _ = clients
    actividades = _actividades(gestor)
    res_resumen = gestor.get("/api/v1/proyectos/resumen")
    assert res_resumen.status_code == 200, res_resumen.text
    resumen = res_resumen.json()

    assert resumen["total_actividades"] == len(actividades)
    suma_modulos = sum(resumen["por_modulo"].values())
    assert suma_modulos == resumen["total_actividades"]
    suma_estados = sum(resumen["por_estado_canonico"].values())
    assert suma_estados == resumen["total_actividades"]

    # Conteos exactos: el resumen no debe desviar ni una actividad por módulo
    # ni por estado canónico respecto del listado que la produce.
    por_modulo_listado = collections.Counter(a["modulo_dueno"] for a in actividades)
    assert resumen["por_modulo"] == dict(por_modulo_listado)
    por_estado_listado = collections.Counter(a["estado_canonico"] for a in actividades)
    assert resumen["por_estado_canonico"] == dict(por_estado_listado)


def test_lectura_no_muta_los_fuentes(clients):
    """La proyección es read-only: repetir la consulta es estable y sin efectos."""
    gestor, _ = clients
    antes = _actividades(gestor)
    despues = _actividades(gestor)
    assert antes == despues
