"""Las unidades institucionales no se convierten en un total de casos."""

import json

from app.modules.compromisos.contratos_observacion_polis import (
    UnidadObservacion,
    clasificar_unidad,
    evaluar_lote,
    llave_comparable,
    normalizar_fila,
)

SHA = "a" * 64


def _fila(**cambios):
    base = {
        "fuente_clave": "policia_homicidios",
        "indicador": "homicidios",
        "anio": "2026",
        "valor": "7",
        "unidad": "casos",
        "ambito": "municipio_13001",
        "estado_validacion": "corte_30-09-2026",
        "url_fuente": "https://example.org/fuente",
        "fecha_extraccion": "2026-10-22T00:00:00Z",
        "origen": "banco_oficial_28",
        "subtipo": "total",
    }
    return {**base, **cambios}


def test_unidades_y_versiones_impiden_suma_incompatible():
    hecho = normalizar_fila(_fila(), SHA)
    victima = normalizar_fila(_fila(unidad="personas"), SHA)
    proceso = normalizar_fila(
        _fila(fuente_clave="fiscalia_spoa_procesos_por_anio_hecho", unidad="procesos", origen="fiscalia_spoa_powerbi"),
        SHA,
    )
    assert hecho.unidad_observacion == UnidadObservacion.HECHO
    assert victima.unidad_observacion == UnidadObservacion.PERSONA
    assert proceso.unidad_observacion == UnidadObservacion.PROCESO
    assert proceso.tipo_fecha == "anio_hecho"
    assert len({llave_comparable(hecho), llave_comparable(victima), llave_comparable(proceso)}) == 3
    assert hecho.territorio_id == "13001" and hecho.provisional
    assert hecho.tipo_fecha == "anio_hecho"
    assert clasificar_unidad("beneficiarios_reportados") == UnidadObservacion.OFERTA


def test_ruv_separa_vigencia_de_declaracion_y_ocurrencia():
    comun = {"fuente_clave": "unidad_victimas_ruv_cartagena", "unidad": "personas"}
    declaracion = normalizar_fila(_fila(**comun, indicador="personas_por_declaracion"), SHA)
    ocurrencia = normalizar_fila(_fila(**comun, indicador="personas_por_ocurrencia"), SHA)
    assert declaracion.tipo_fecha == "vigencia_declaracion_ruv"
    assert ocurrencia.tipo_fecha == "vigencia_ocurrencia_ruv"
    desplazamiento = normalizar_fila(
        _fila(**comun, indicador="personas_por_ocurrencia", subtipo="5 | Desplazamiento forzado"), SHA
    )
    assert desplazamiento.clasificacion_7d.dimension == "SAT"
    assert desplazamiento.unidad_observacion == UnidadObservacion.PERSONA


def test_busqueda_fiscalia_tematica_sigue_siendo_proceso():
    busqueda = normalizar_fila(
        _fila(
            fuente_clave="fiscalia_spoa_busquedas_por_anio_hecho",
            indicador="procesos_coincidentes_con_termino",
            subtipo="homicidio",
            unidad="procesos",
            origen="fiscalia_spoa_busqueda_textual",
        ),
        SHA,
    )
    assert busqueda.clasificacion_7d.dimension == "PERS"
    assert busqueda.unidad_observacion == UnidadObservacion.PROCESO


def test_anio_en_curso_es_parcial_aunque_fuente_diga_disponible():
    policia = normalizar_fila(_fila(estado_validacion="disponible"), SHA)
    assert policia.provisional
    proyeccion = normalizar_fila(
        _fila(origen="dane_serie_vigencia_censal", estado_validacion="serie_municipal_cambio_base_2018"), SHA
    )
    assert not proyeccion.provisional


def test_puerta_conservadora_rojo_ambar_verde():
    versiones = {"policia_homicidios": SHA}
    assert evaluar_lote([_fila()], versiones)["estado"] == "verde"
    ambar = evaluar_lote([_fila(unidad="Número")], versiones)
    assert ambar["estado"] == "ambar" and ambar["problemas"]["unidad_sin_contrato"] == 1
    rojo = evaluar_lote([_fila(valor="-1")], versiones)
    assert rojo["estado"] == "rojo" and rojo["problemas"]["conteo_negativo"] == 1
    assert evaluar_lote([_fila()], {})["problemas"]["fuente_sin_version"] == 1


def test_no_infiere_geocodigo_de_estacion():
    observacion = normalizar_fila(_fila(ambito="estacion"), SHA)
    assert observacion.territorio_id is None
    assert evaluar_lote([_fila(ambito="estacion")], {"policia_homicidios": SHA})["estado"] == "ambar"


def test_geocodigo_ideam_es_de_estacion_y_no_de_incidente():
    fila = _fila(
        fuente_clave="ideam_calidad_aire",
        ambito="estacion",
        indicador="concentracion_media_estacion",
        detalle_espacial_json=json.dumps(
            {
                "latitud": 10.32646,
                "longitud": -75.489407,
                "dataset_id": "kekd-7v7h",
                "tipo_ubicacion": "estacion_monitoreo_no_incidente",
            }
        ),
    )
    observacion = normalizar_fila(fila, SHA)
    assert observacion.territorio_id is None
    assert tuple(map(float, observacion.coordenadas_estacion)) == (10.32646, -75.489407)
    assert "estacion_sin_geocodigo" not in evaluar_lote([fila], {"ideam_calidad_aire": SHA})["problemas"]
    fila["detalle_espacial_json"] = fila["detalle_espacial_json"].replace("10.32646", "1.32646")
    assert evaluar_lote([fila], {"ideam_calidad_aire": SHA})["problemas"]["estacion_sin_geocodigo"] == 1


def test_icbf_numero_se_tipa_solo_con_indicador_exacto():
    indicadores = (
        (
            "Número de mesas de participación de niños, niñas y adolescentes conformadas y en operación",
            UnidadObservacion.OFERTA,
        ),
        (
            "Número de niños, niñas y mujeres gestantes con educación inicial "
            "en el marco de la atención integral a la primera infancia.",
            UnidadObservacion.OFERTA,
        ),
        (
            "Número de niños y niñas menores de 1 año con registro civil por lugar de residencia",
            UnidadObservacion.PERSONA,
        ),
    )
    for nombre, esperado in indicadores:
        observacion = normalizar_fila(_fila(fuente_clave="icbf_rpc_cartagena", indicador=nombre, unidad="Número"), SHA)
        assert observacion.unidad_observacion == esperado
        assert observacion.regla_unidad == "icbf_rpc_indicador_exacto_v1"
    desconocida = normalizar_fila(
        _fila(fuente_clave="icbf_rpc_cartagena", indicador="Número de beneficiarios sin definición", unidad="Número"),
        SHA,
    )
    assert desconocida.unidad_observacion == UnidadObservacion.DESCONOCIDA
    assert desconocida.regla_unidad == "sin_regla_contextual"
