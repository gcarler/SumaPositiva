import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.anyio


async def test_creacion_y_serializacion_arbol_problemas(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        # 1. Crear instrumento Árbol de Problemas
        resp_inst = client.post(
            "/api/v1/instrumentos",
            json={
                "tipo_instrumento": "ARBOL_PROBLEMAS",
                "nombre": f"Árbol de Movilidad Sostenible {test_id}",
                "descripcion": "Diagnóstico participativo de movilidad en el corredor histórico.",
            },
        )
        assert resp_inst.status_code == 201
        inst_data = resp_inst.json()
        inst_id = inst_data["id"]
        assert inst_data["estado"] == "EN_CONSTRUCCION"

        # 2. Agregar Problema Central
        resp_central = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "PROBLEMA_CENTRAL",
                "contenido": (
                    "Elevados índices de siniestralidad y congestión en el Centro Histórico"
                ),
            },
        )
        assert resp_central.status_code == 201
        central_data = resp_central.json()
        central_id = central_data["id"]
        assert central_data["tipo_relacion"] == "CENTRAL"
        assert central_data["nivel"] == 0

        # 3. Agregar Causa Directa
        resp_c1 = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "CAUSA_DIRECTA",
                "nodo_padre_id": central_id,
                "contenido": "Falta de infraestructura cicloinclusiva y peatonal segura",
            },
        )
        assert resp_c1.status_code == 201
        c1_id = resp_c1.json()["id"]

        # 4. Agregar Causa Indirecta (hija de Causa 1)
        resp_c1_sub = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "CAUSA_INDIRECTA",
                "nodo_padre_id": c1_id,
                "contenido": "Déficit de presupuesto distrital para señalización horizontal",
            },
        )
        assert resp_c1_sub.status_code == 201
        assert resp_c1_sub.json()["nivel"] == 2

        # 5. Agregar Efecto Directo
        resp_e1 = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "EFECTO_DIRECTO",
                "nodo_padre_id": central_id,
                "contenido": "Altos índices de fatalidades en peatones y ciclistas",
            },
        )
        assert resp_e1.status_code == 201
        e1_id = resp_e1.json()["id"]

        # 6. Agregar Efecto Indirecto (hijo de Efecto 1)
        resp_e1_sub = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "EFECTO_INDIRECTO",
                "nodo_padre_id": e1_id,
                "contenido": "Baja utilización de modos no motorizados por percepción de riesgo",
            },
        )
        assert resp_e1_sub.status_code == 201

        # 7. Rechazo de tipo de nodo inconsistente (MGA DNP)
        resp_invalido = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "OBJETIVO_CENTRAL",
                "contenido": "Objetivo inválido en árbol de problemas",
            },
        )
        assert resp_invalido.status_code == 400
        assert "no admite nodos de tipo Objetivo" in resp_invalido.json()["detail"]

        # 8. Serializar árbol jerárquico
        resp_arbol = client.get(f"/api/v1/instrumentos/{inst_id}/arbol")
        assert resp_arbol.status_code == 200
        arbol = resp_arbol.json()
        assert arbol["total_nodos"] == 5
        assert arbol["nodo_central"]["id"] == central_id
        assert len(arbol["causas_o_medios"]) == 1
        assert len(arbol["efectos_o_fines"]) == 1
        # Verificar anidamiento de hijos secundarios
        assert len(arbol["causas_o_medios"][0]["hijos"]) == 1
        assert arbol["causas_o_medios"][0]["hijos"][0]["tipo_nodo"] == "CAUSA_INDIRECTA"
        assert len(arbol["efectos_o_fines"][0]["hijos"]) == 1
        assert arbol["efectos_o_fines"][0]["hijos"][0]["tipo_nodo"] == "EFECTO_INDIRECTO"


async def test_conversion_metodologica_mga_problemas_a_objetivos(
    database_url: str, cabeceras_gestion
):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        # 1. Crear Árbol de Problemas
        resp_inst = client.post(
            "/api/v1/instrumentos",
            json={
                "tipo_instrumento": "ARBOL_PROBLEMAS",
                "nombre": f"Diagnóstico Género y Cuidado {test_id}",
            },
        )
        inst_id = resp_inst.json()["id"]

        # 2. Poblar Problema Central
        resp_central = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "PROBLEMA_CENTRAL",
                "contenido": "Sobrecarga de trabajo de cuidado no remunerado en mujeres",
            },
        )
        central_id = resp_central.json()["id"]

        # 3. Poblar Causa Directa y Causa Indirecta
        resp_c1 = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "CAUSA_DIRECTA",
                "nodo_padre_id": central_id,
                "contenido": "Déficit de servicios públicos de cuidado institucional",
            },
        )
        c1_id = resp_c1.json()["id"]

        resp_c1_sub = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "CAUSA_INDIRECTA",
                "nodo_padre_id": c1_id,
                "contenido": "Falta de jardines infantiles y centros de día barriales",
            },
        )
        c1_sub_id = resp_c1_sub.json()["id"]

        # 4. Poblar Efecto Directo
        resp_e1 = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "EFECTO_DIRECTO",
                "nodo_padre_id": central_id,
                "contenido": "Alta tasa de informalidad y dependencia económica femenina",
            },
        )
        e1_id = resp_e1.json()["id"]

        # 5. Ejecutar Conversión Metodológica MGA DNP
        resp_conv = client.post(
            f"/api/v1/instrumentos/{inst_id}/convertir-a-objetivos",
            json={
                "nombre_objetivos": f"Árbol de Soluciones Sistema del Cuidado {test_id}",
            },
        )
        assert resp_conv.status_code == 201
        arbol_obj = resp_conv.json()

        # Validaciones de Instrumento Objetivo
        inst_obj = arbol_obj["instrumento"]
        assert inst_obj["tipo_instrumento"] == "ARBOL_OBJETIVOS"
        assert inst_obj["estado"] == "VALIDADO"
        assert inst_obj["instrumento_origen_id"] == inst_id

        # Validar que el instrumento origen pasó a CONVERTIDO
        resp_origen = client.get(f"/api/v1/instrumentos/{inst_id}")
        assert resp_origen.json()["estado"] == "CONVERTIDO"

        # Validar Mapeo de Nodos
        assert arbol_obj["total_nodos"] == 4

        # Objetivo Central
        obj_central = arbol_obj["nodo_central"]
        assert obj_central["tipo_nodo"] == "OBJETIVO_CENTRAL"
        assert obj_central["tipo_relacion"] == "CENTRAL"
        assert obj_central["nodo_origen_id"] == central_id
        # Inversión de "Sobrecarga de..." -> "Redistribuir equitativamente..."
        assert "Redistribuir equitativamente la carga de" in obj_central["contenido"]

        # Medios (Causas transformadas)
        medios = arbol_obj["causas_o_medios"]
        assert len(medios) == 1
        medio_1 = medios[0]
        assert medio_1["tipo_nodo"] == "MEDIO_DIRECTO"
        assert medio_1["tipo_relacion"] == "MEDIO"
        assert medio_1["nodo_origen_id"] == c1_id
        assert "Superar el déficit de" in medio_1["contenido"]

        # Medio Indirecto anidado
        assert len(medio_1["hijos"]) == 1
        medio_ind = medio_1["hijos"][0]
        assert medio_ind["tipo_nodo"] == "MEDIO_INDIRECTO"
        assert medio_ind["nodo_origen_id"] == c1_sub_id
        assert "Garantizar la provisión de" in medio_ind["contenido"]

        # Fines (Efectos transformados)
        fines = arbol_obj["efectos_o_fines"]
        assert len(fines) == 1
        fin_1 = fines[0]
        assert fin_1["tipo_nodo"] == "FIN_DIRECTO"
        assert fin_1["tipo_relacion"] == "FIN"
        assert fin_1["nodo_origen_id"] == e1_id
        assert "Reducir la" in fin_1["contenido"]


async def test_conversion_con_modificaciones_manuales(database_url: str, cabeceras_gestion):
    settings = Settings(_env_file=None, environment="test", database_url=database_url)
    app = create_app(settings)

    with TestClient(app, headers=cabeceras_gestion) as client:
        test_id = uuid.uuid4().hex[:6]

        resp_inst = client.post(
            "/api/v1/instrumentos",
            json={
                "tipo_instrumento": "ARBOL_PROBLEMAS",
                "nombre": f"Test Personalizado {test_id}",
            },
        )
        inst_id = resp_inst.json()["id"]

        resp_central = client.post(
            f"/api/v1/instrumentos/{inst_id}/nodos",
            json={
                "tipo_nodo": "PROBLEMA_CENTRAL",
                "contenido": "Deterioro de la Ciénaga de la Virgen por vertimientos",
            },
        )
        central_id = resp_central.json()["id"]

        # Conversión con texto redactado manualmente por el formulador
        texto_personalizado = (
            "Recuperar ecológicamente la Ciénaga de la Virgen y garantizar su saneamiento integral"
        )
        resp_conv = client.post(
            f"/api/v1/instrumentos/{inst_id}/convertir-a-objetivos",
            json={"modificaciones_manuales": {central_id: texto_personalizado}},
        )
        assert resp_conv.status_code == 201
        arbol_obj = resp_conv.json()
        assert arbol_obj["nodo_central"]["contenido"] == texto_personalizado
