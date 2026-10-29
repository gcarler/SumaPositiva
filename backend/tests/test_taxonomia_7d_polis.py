"""Cruces exactos 7D; los indicadores genéricos no se clasifican por nombre de archivo."""

from app.modules.compromisos.taxonomia_7d_polis import DIMENSIONES, VERSION, clasificar


def test_siete_dimensiones_y_separacion_de_tipos():
    assert len(DIMENSIONES) == 7
    assert VERSION == "seguridad_humana_7d_v5"
    assert clasificar("policia_homicidios", "casos_registrados").dimension == "PERS"
    assert clasificar("policia_violencia_intrafamiliar", "casos_registrados").dimension == "COM"
    assert clasificar("drive_excel_policial_11_delitos", "terrorismo").dimension == "SAT"
    assert clasificar("ideam_calidad_aire", "concentracion_media_estacion").dimension == "AMB"
    assert clasificar("icbf_bienestarina", "bienestarina").dimension == "SALUD"
    assert clasificar("dane_geih_cartagena", "tasa_desocupacion").dimension == "ECON"
    assert clasificar("procuraduria_pqrsdf_cartagena", "pqrsdf_radicadas").dimension == "POL"


def test_subtipos_ruv_y_busquedas_fiscalia_conservan_su_unidad():
    assert (
        clasificar("unidad_victimas_ruv_cartagena", "personas_por_ocurrencia", "5 | Desplazamiento forzado").dimension
        == "SAT"
    )
    assert clasificar("unidad_victimas_ruv_cartagena", "eventos_reportados", "6 | Homicidio").dimension == "PERS"
    assert (
        clasificar(
            "fiscalia_spoa_busquedas_por_anio_hecho", "procesos_coincidentes_con_termino", "contaminacion ambiental"
        ).dimension
        == "AMB"
    )
    assert (
        clasificar(
            "fiscalia_spoa_busquedas_por_anio_hecho", "procesos_coincidentes_con_termino", "inasistencia alimentaria"
        ).estado
        == "sin_clasificar"
    )
    assert clasificar("medicina_suicidios", "casos_registrados").dimension == "SALUD"


def test_no_infiere_fiscalia_generica_ni_poblacion_como_casos():
    total = clasificar("fiscalia_spoa_procesos_por_anio_hecho", "procesos_penales_registrados")
    assert total.dimension is None and total.estado == "total_multidimensional"
    resultado = clasificar("icbf_rpc_cartagena", "Número de mesas de participación")
    assert resultado.dimension is None and resultado.estado == "sin_clasificar"


def test_oferta_y_reparacion_no_se_presentan_como_resultados_de_casos():
    ejemplos = (
        ("icbf_prevencion", "prevencion"),
        ("icbf_primera_infancia", "primera_infancia"),
        ("icbf_uds", "uds"),
        ("unidad_victimas_indemnizaciones_cartagena", "valor_indemnizaciones"),
        (
            "icbf_rpc_cartagena",
            "Número de mesas de participación de niños, niñas y adolescentes conformadas y en operación",
        ),
    )
    for fuente, indicador in ejemplos:
        resultado = clasificar(fuente, indicador)
        assert resultado.dimension is None
        assert resultado.estado == "respuesta_publica"
        assert resultado.evidencia == f"{fuente}:{indicador}"
    assert clasificar("icbf_uds", "indicador_nuevo").estado == "sin_clasificar"


def test_ecsc_y_nbi_tienen_cruces_exactos_sin_inferir_toda_la_fuente():
    assert clasificar("dane_ecsc_2024", "victimizacion_hurto_personas").dimension == "PERS"
    assert clasificar("dane_ecsc_2024", "victimas_que_no_denunciaron").dimension == "POL"
    assert clasificar("dane_nbi_cnpv2018", "nbi_dependencia_economica").dimension == "ECON"
    assert clasificar("dane_nbi_cnpv2018", "nbi_hacinamiento").estado == "sin_clasificar"


def test_poblacion_dane_es_denominador_transversal_y_no_caso_sin_clasificar():
    for fuente in ("dane_poblacion_municipal", "dane_poblacion_vigencia_censal"):
        for indicador in ("poblacion_total", "poblacion_cabecera", "poblacion_centros_rural"):
            resultado = clasificar(fuente, indicador)
            assert resultado.dimension is None
            assert resultado.estado == "no_medible_con_esta_fuente"
            assert resultado.regla == "denominador_transversal"
    assert clasificar("dane_poblacion_municipal", "indicador_desconocido").estado == "sin_clasificar"


def test_icbf_rpc_temas_directos_sin_confundir_fuente_con_casos_nuevos():
    ejemplos = (
        ("Tasa de homicidios en adolescentes (12 a 17 años)", "PERS"),
        ("Tasa de violencia intrafamiliar en niños y niñas de 0 a 5 años", "COM"),
        ("Tasa de mortalidad por desnutrición en menores de 5 años.", "SALUD"),
        (
            "Porcentaje de niños y niñas de primera infancia víctimas de desplazamiento forzado "
            "del  total NNA víctimas del conflicto armado",
            "SAT",
        ),
    )
    for indicador, dimension in ejemplos:
        resultado = clasificar("icbf_rpc_cartagena", indicador)
        assert resultado.dimension == dimension
        assert resultado.regla == "fuente_indicador_exacto"
    assert clasificar("icbf_rpc_cartagena", "Cobertura escolar bruta en transición").estado == "sin_clasificar"
