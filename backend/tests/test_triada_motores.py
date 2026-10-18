from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.modules.compromisos.detector_multiformato import (
    detectar_y_normalizar_formato,
    obtener_muestras_multiformato,
)
from app.modules.compromisos.router import get_compromisos_service
from app.modules.compromisos.schemas import (
    ActividadOperativaTriada,
    CruzarTresLecturasSolicitud,
    DetectarFormatoPlanAccionSolicitud,
    EjecucionPresupuestalTriada,
    MetaEstrategicaTriada,
)
from app.modules.compromisos.service import CompromisosService
from app.modules.compromisos.triada_motores import (
    ARCHIVOS_2026,
    cruzar_tres_lecturas,
    motor_inversion_presupuestal,
    motor_plan_accion,
    motor_plan_desarrollo,
)


def test_detecta_formato_2016_monohoja():
    result = detectar_y_normalizar_formato(obtener_muestras_multiformato()["2016_MONOHOJA"])
    assert result.perfil_detectado == "PA_MONOHOJA_2016_2019"
    assert result.registros_normalizados[0].entidad == "DADIS"
    assert result.registros_normalizados[0].presupuesto_ejecutado == 250000


def test_detecta_formato_2021_hibrido_por_pilar():
    result = detectar_y_normalizar_formato(obtener_muestras_multiformato()["2021_HIBRIDO"])
    assert result.perfil_detectado == "PA_HIBRIDO_2020_2023"
    assert result.registros_normalizados[0].avance_t1 == 25


def test_varias_hojas_por_pilar_siguen_siendo_hibrido_2020_2023():
    solicitud = DetectarFormatoPlanAccionSolicitud(
        nombre_archivo="Plan_Accion_2021.xlsx",
        hojas=[
            {"nombre_hoja": "Cartagena Incluyente"},
            {"nombre_hoja": "Cartagena Resiliente"},
            {"nombre_hoja": "Cartagena Contingente"},
            {"nombre_hoja": "Cartagena Transparente"},
        ],
    )
    result = detectar_y_normalizar_formato(solicitud)
    assert result.perfil_detectado == "PA_HIBRIDO_2020_2023"


def test_detecta_formato_2026_multihoja():
    result = detectar_y_normalizar_formato(obtener_muestras_multiformato()["2026_MULTIHOJA"])
    assert result.perfil_detectado == "PA_MULTIHOJA_2024_2026"
    assert len(result.hojas_analizadas) == 4


def test_detecta_formato_canonico_dual():
    result = detectar_y_normalizar_formato(obtener_muestras_multiformato()["2026_CANONICO_DNP"])
    assert result.perfil_detectado == "PA_CANONICO_DNP_POLIS"
    assert len(result.hojas_analizadas) == 2


def test_mapea_sinonimos_semanticos_con_acentos():
    solicitud = DetectarFormatoPlanAccionSolicitud(
        nombre_archivo="plan.xlsx",
        vigencia_declarada=2025,
        hojas=[
            {
                "nombre_hoja": "Datos",
                "encabezados_detectados": [
                    "Secretaría",
                    "Código BPIN",
                    "Descripción de la actividad",
                    "Ejecución presupuestal",
                ],
                "filas": [
                    {
                        "Secretaría": "EPA",
                        "Código BPIN": "BPIN-1",
                        "Descripción de la actividad": "Construir parque",
                        "Ejecución presupuestal": "1.250.000",
                    }
                ],
            }
        ],
    )
    result = detectar_y_normalizar_formato(solicitud)
    row = result.registros_normalizados[0]
    assert result.mapeo_columnas["dependencia"] == "Secretaría"
    assert row.codigo_bpim == "BPIN-1"
    assert row.presupuesto_ejecutado == 1250000


def test_validacion_dnp_y_comparativa_sin_imputacion():
    result = detectar_y_normalizar_formato(obtener_muestras_multiformato()["2016_MONOHOJA"])
    assert result.resumen_validacion_dnp["actividades_evaluadas"] == 1
    assert result.resumen_validacion_dnp["porcentaje_verbos_fuertes"] == 100
    assert result.comparativa_interanual["vigencias"]["2016"]["dato_disponible"] is True
    assert result.comparativa_interanual["vigencias"]["2020"]["meta_programada_anual"] is None


def test_motor_plan_desarrollo_agrupa_lineas():
    result = motor_plan_desarrollo(
        [
            MetaEstrategicaTriada(
                entidad="DADIS", linea_estrategica="Salud", avance_estrategico_pct=40
            ),
            MetaEstrategicaTriada(
                entidad="DADIS", linea_estrategica="Salud", avance_estrategico_pct=60
            ),
        ]
    )
    assert result["metas_evaluadas"] == 2
    assert result["lineas"][0]["avance_estrategico_pct"] == 50


def test_motor_plan_accion_agrupa_avance_y_validacion():
    result = motor_plan_accion(
        [
            ActividadOperativaTriada(
                entidad="EPA",
                linea_estrategica="Ambiente",
                avance_operativo_fisico_pct=80,
                porcentaje_verbos_fuertes_dnp=100,
            )
        ]
    )
    assert result["actividades_evaluadas"] == 1
    assert result["lineas"][0]["porcentaje_verbos_fuertes_dnp"] == 100


def test_motor_financiero_calcula_rp_y_giros():
    result = motor_inversion_presupuestal(
        [
            EjecucionPresupuestalTriada(
                apropiacion_definitiva_cop=1000, compromisos_rp_cop=800, pagos_tesoreria_cop=300
            )
        ]
    )
    assert result["ejecuciones"][0]["ejecucion_compromisos_pct"] == 80
    assert result["ejecuciones"][0]["giro_efectivo_pct"] == 30


def test_cruce_tripartito_coherente():
    meta = MetaEstrategicaTriada(
        entidad="DADIS", linea_estrategica="Salud", codigo_bpim="BPIM-1", avance_estrategico_pct=50
    )
    actividad = ActividadOperativaTriada(
        entidad="DADIS",
        linea_estrategica="Salud",
        codigo_bpim="BPIM-1",
        avance_operativo_fisico_pct=50,
    )
    financiero = EjecucionPresupuestalTriada(
        entidad="DADIS",
        linea_estrategica="Salud",
        codigo_bpim="BPIM-1",
        apropiacion_definitiva_cop=100,
        compromisos_rp_cop=50,
        pagos_tesoreria_cop=40,
    )
    result = cruzar_tres_lecturas([meta], [actividad], [financiero])
    assert result["cruces"][0]["estado_semaforo"] == "COHERENCIA_INTEGRAL_ALTA"
    assert result["cruces"][0]["indice_coherencia_tripartita"] == 100


def test_cruce_triadas_deduplica_cortes_y_separa_vigencias():
    metas = [
        MetaEstrategicaTriada(
            entidad="DADIS",
            linea_estrategica="Salud",
            codigo_bpim="BPIM-1",
            vigencia=2025,
            corte="T1",
            avance_estrategico_pct=25,
        ),
        MetaEstrategicaTriada(
            entidad="DADIS",
            linea_estrategica="Salud",
            codigo_bpim="BPIM-1",
            vigencia=2025,
            corte="T2",
            avance_estrategico_pct=50,
        ),
    ]
    actividad = ActividadOperativaTriada(
        entidad="DADIS",
        linea_estrategica="Salud",
        codigo_bpim="BPIM-1",
        vigencia=2025,
        corte="T2",
        avance_operativo_fisico_pct=50,
    )
    ejecucion = EjecucionPresupuestalTriada(
        entidad="DADIS",
        linea_estrategica="Salud",
        codigo_bpim="BPIM-1",
        vigencia=2025,
        corte="T2",
        apropiacion_definitiva_cop=100,
    )
    result = cruzar_tres_lecturas(metas, [actividad], [ejecucion])
    assert result["total_cruces"] == 1
    assert result["cruces"][0]["avance_estrategico_pdd_pct"] == 50
    assert result["cruces"][0]["vigencia"] == 2025


def test_cruce_no_agrupa_registros_con_claves_incompletas():
    meta = MetaEstrategicaTriada(
        entidad="", linea_estrategica="", codigo_bpim="", avance_estrategico_pct=80
    )
    activity = ActividadOperativaTriada(
        entidad="", linea_estrategica="", codigo_bpim="", avance_operativo_fisico_pct=10
    )
    expense = EjecucionPresupuestalTriada(
        entidad="", linea_estrategica="", codigo_bpim="", apropiacion_definitiva_cop=100
    )

    result = cruzar_tres_lecturas([meta], [activity], [expense])

    assert result["total_cruces"] == 0
    assert result["alertas"] == []


def test_cruce_alerta_sobreejecucion():
    activity = ActividadOperativaTriada(
        entidad="DATT",
        linea_estrategica="Movilidad",
        codigo_bpim="B-1",
        avance_operativo_fisico_pct=20,
    )
    expense = EjecucionPresupuestalTriada(
        entidad="DATT",
        linea_estrategica="Movilidad",
        codigo_bpim="B-1",
        apropiacion_definitiva_cop=100,
        compromisos_rp_cop=80,
    )
    result = cruzar_tres_lecturas([], [activity], [expense])
    assert result["cruces"][0]["estado_semaforo"] == "DESFASE_CRITICO_SOBREEJECUCION"
    assert len(result["alertas"]) == 1


def test_cruce_alerta_rezago_contractual():
    activity = ActividadOperativaTriada(
        entidad="EPA",
        linea_estrategica="Ambiente",
        codigo_bpim="B-2",
        avance_operativo_fisico_pct=70,
    )
    expense = EjecucionPresupuestalTriada(
        entidad="EPA",
        linea_estrategica="Ambiente",
        codigo_bpim="B-2",
        apropiacion_definitiva_cop=100,
        compromisos_rp_cop=20,
    )
    result = cruzar_tres_lecturas([], [activity], [expense])
    assert result["cruces"][0]["estado_semaforo"] == "REZAGO_CONTRACTUAL_INVERSION"


def test_cruce_alerta_meta_sin_operacionalizar():
    meta = MetaEstrategicaTriada(
        entidad="EPA", linea_estrategica="Ambiente", codigo_bpim="B-3", avance_estrategico_pct=80
    )
    result = cruzar_tres_lecturas([meta], [], [])
    assert result["cruces"][0]["estado_semaforo"] == "META_PDD_SUBOPERACIONALIZADA"


def test_catalogo_incluye_23_archivos_y_cortes():
    assert len(ARCHIVOS_2026) == 23
    assert sum(name.endswith(".xls") for name in ARCHIVOS_2026) == 1


def test_tres_endpoints_http_publicos_y_calculados():
    class Repository:
        async def listar_actividades(self, **kwargs):
            return []

    app = create_app(
        Settings(
            _env_file=None,
            environment="test",
            database_url="postgresql+asyncpg://polis@127.0.0.1:5432/polis_test",
        )
    )
    app.dependency_overrides[get_compromisos_service] = lambda: CompromisosService(Repository())
    with TestClient(app) as client:
        summary = client.get("/api/v1/compromisos/triada/resumen")
        assert summary.status_code == 200
        assert (
            len(
                summary.json()["catalogo_transparencia_cartagena"]["planes_accion_2026"]["archivos"]
            )
            == 23
        )
        detected = client.post("/api/v1/compromisos/triada/detectar-formato", json="2016_MONOHOJA")
        assert detected.status_code == 200, detected.text
        assert detected.json()["perfil_detectado"] == "PA_MONOHOJA_2016_2019"
        crossed = client.post("/api/v1/compromisos/triada/cruzar-lecturas", json={})
        assert crossed.status_code == 200
        assert crossed.json()["total_cruces"] == 0


def test_endpoint_detectar_formato_acepta_hojas_personalizadas():
    class Repository:
        async def listar_actividades(self, **kwargs):
            return []

    app = create_app(
        Settings(
            _env_file=None,
            environment="test",
            database_url="postgresql+asyncpg://polis@127.0.0.1:5432/polis_test",
        )
    )
    app.dependency_overrides[get_compromisos_service] = lambda: CompromisosService(Repository())
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/compromisos/triada/detectar-formato",
            json={
                "nombre_archivo": "mi_plan_2021.xlsx",
                "hojas": [
                    {"nombre_hoja": "Cartagena Incluyente", "encabezados_detectados": ["Actividad"]}
                ],
            },
        )
    assert response.status_code == 200
    assert response.json()["perfil_detectado"] == "PA_HIBRIDO_2020_2023"


def test_endpoint_cruzar_lecturas_devuelve_alertas():
    class Repository:
        async def listar_actividades(self, **kwargs):
            return []

    app = create_app(
        Settings(
            _env_file=None,
            environment="test",
            database_url="postgresql+asyncpg://polis@127.0.0.1:5432/polis_test",
        )
    )
    app.dependency_overrides[get_compromisos_service] = lambda: CompromisosService(Repository())
    request = CruzarTresLecturasSolicitud(
        actividades_operativas=[
            ActividadOperativaTriada(
                entidad="DATT",
                linea_estrategica="Movilidad",
                codigo_bpim="B-1",
                avance_operativo_fisico_pct=10,
            )
        ],
        ejecuciones_presupuestales=[
            EjecucionPresupuestalTriada(
                entidad="DATT",
                linea_estrategica="Movilidad",
                codigo_bpim="B-1",
                apropiacion_definitiva_cop=100,
                compromisos_rp_cop=70,
            )
        ],
    )
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/compromisos/triada/cruzar-lecturas", json=request.model_dump()
        )
    assert response.status_code == 200, response.text
    assert response.json()["alertas"][0]["estado_semaforo"] == "DESFASE_CRITICO_SOBREEJECUCION"
