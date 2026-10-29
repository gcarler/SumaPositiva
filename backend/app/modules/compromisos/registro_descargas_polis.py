"""Productos revisados en53; consultas explícitas, no inferencia por institución."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FuenteDescarga:
    producto_id: str
    metodo: str
    url: str
    dataset: str = ""
    filtro: str = ""
    seleccion: str = ""
    grupo: str = ""
    columnas: tuple[str, ...] = ()
    formato: str = ""
    nombre_xlsx: str | None = None


def _socrata(
    clave: str, dataset: str, filtro: str, seleccion: str, grupo: str, columnas: tuple[str, ...]
) -> FuenteDescarga:
    return FuenteDescarga(
        f"local:{clave}",
        "socrata",
        f"https://www.datos.gov.co/resource/{dataset}.json",
        dataset,
        filtro,
        seleccion,
        grupo,
        columnas,
    )


def registro_descargas() -> dict[str, FuenteDescarga]:
    """Devuelve un registro nuevo; no habilita promoción ni acceso con credenciales."""
    fuentes = []
    medicina = {
        "homicidios": "vtub-3de2",
        "violencia_intrafamiliar": "ers2-kerr",
        "examenes_sexuales": "hyqu-diue",
        "violencia_interpersonal": "e3xi-4zq5",
        "suicidios": "f75u-mirk",
        "lesiones_accidentales": "6cjn-eevd",
        "lesiones_transporte": "ezhf-hscf",
    }
    for nombre, dataset in medicina.items():
        fuentes.append(
            _socrata(
                f"medicina_{nombre}",
                dataset,
                "codigo_dane_municipio='13001'",
                "a_o_del_hecho,count(*) as filas",
                "a_o_del_hecho",
                ("codigo_dane_municipio", "a_o_del_hecho"),
            )
        )
    policia = {
        "homicidios": ("m8fd-ahd9", "cod_muni='13001'", "spoa_caracterizacion"),
        "lesiones": ("72sg-cybi", "codigo_dane='13001000'", "descripci_n_conducta"),
        "amenazas": ("meew-mguv", "codigo_dane='13001000'", ""),
        "violencia_intrafamiliar": ("vuyt-mqpw", "codigo_dane='13001000'", ""),
        "delitos_sexuales": ("fpe5-yrmw", "codigo_dane='13001000'", "delito"),
        "hurto_vehiculos": ("9vha-vh9n", "codigo_dane='13001000'", "tipo_de_hurto"),
        "hurto_vivienda_comercio": ("6sqw-8cg5", "codigo_dane='13001000'", "tipo_de_hurto"),
    }
    for nombre, (dataset, filtro, detalle) in policia.items():
        # Solo homicidios publica fecha nativa; los otros seis publican texto.
        temporal = "anio" if nombre == "homicidios" else "fecha_hecho"
        expresion = "date_extract_y(fecha_hecho) as anio" if nombre == "homicidios" else "fecha_hecho"
        cantidad = "cantidad::number" if nombre in {"lesiones", "violencia_intrafamiliar"} else "cantidad"
        grupo = temporal + (f",{detalle}" if detalle else "")
        columnas = (filtro.split("=")[0], "fecha_hecho", "cantidad") + ((detalle,) if detalle else ())
        fuentes.append(
            _socrata(
                f"policia_{nombre}",
                dataset,
                filtro,
                expresion
                + (f",{detalle}" if detalle else "")
                + f",sum({cantidad}) as cantidad_reportada,count(*) as filas",
                grupo,
                columnas,
            )
        )
    fuentes.extend(
        [
            _socrata(
                "icbf_rpc_cartagena",
                "v9qk-hdcc",
                "divipola_municipio='13001'",
                "divipola_municipio,nombre_indicador,fuente,derecho,ciclo_vital,anno_vigencia,"
                "valor_indicador,unidad_medida",
                "",
                (
                    "divipola_municipio",
                    "nombre_indicador",
                    "fuente",
                    "derecho",
                    "ciclo_vital",
                    "anno_vigencia",
                    "valor_indicador",
                    "unidad_medida",
                ),
            ),
            _socrata(
                "icbf_primera_infancia",
                "5akr-u7t8",
                "codigo_municipio_uds='13001'",
                "vigencia,tipo_beneficiario_homologado,sum(beneficiarios) as beneficiarios_reportados,"
                "count(*) as filas",
                "vigencia,tipo_beneficiario_homologado",
                ("codigo_municipio_uds", "vigencia", "tipo_beneficiario_homologado", "beneficiarios"),
            ),
            _socrata(
                "icbf_prevencion",
                "g58z-k6f6",
                "codigo_municipio_atenci_n='13001'",
                "a_o,area_misional,sum(beneficiarios) as beneficiarios_reportados,count(*) as filas",
                "a_o,area_misional",
                ("codigo_municipio_atenci_n", "a_o", "area_misional", "beneficiarios"),
            ),
            _socrata(
                "icbf_uds",
                "i8ww-5mcf",
                "codigo_dane_municipio='13001'",
                "vigencia,count(distinct codigo_unidad_servicio) as puntos_distintos,count(*) as filas",
                "vigencia",
                ("codigo_dane_municipio", "vigencia", "codigo_unidad_servicio"),
            ),
            _socrata(
                "icbf_bienestarina",
                "crxh-as6c",
                "codigo_dane_municipio='13001'",
                "anno,count(distinct cod_punto_de_entrega) as puntos_distintos,count(*) as filas",
                "anno",
                ("codigo_dane_municipio", "anno", "cod_punto_de_entrega"),
            ),
            _socrata(
                "ideam_calidad_aire",
                "kekd-7v7h",
                "c_digo_del_municipio='13001'",
                "a_o,id_estacion,estaci_n,variable,tiempo_de_exposici_n_horas,promedio,unidades,"
                "representatividad_temporal,latitud,longitud",
                "",
                (
                    "c_digo_del_municipio",
                    "a_o",
                    "id_estacion",
                    "estaci_n",
                    "variable",
                    "tiempo_de_exposici_n_horas",
                    "promedio",
                    "unidades",
                    "representatividad_temporal",
                    "latitud",
                    "longitud",
                ),
            ),
            _socrata(
                "ins_calidad_agua",
                "nxt2-39c3",
                "municipiocodigo='13001'",
                "a_o,irca,ircaurbano,ircarural,nivel_de_riesgo",
                "",
                ("municipiocodigo", "a_o", "irca", "ircaurbano", "ircarural", "nivel_de_riesgo"),
            ),
            _socrata(
                "procuraduria_pqrsdf_cartagena",
                "s226-fj9i",
                "departamento='BOLIVAR' AND municipio='CARTAGENA' AND fecha_de_radicaci_n IS NOT NULL",
                "date_extract_y(fecha_de_radicaci_n) as anio,tipo_de_pqrsdf,count(*) as filas",
                "anio,tipo_de_pqrsdf",
                ("departamento", "municipio", "fecha_de_radicaci_n", "tipo_de_pqrsdf"),
            ),
            FuenteDescarga(
                "local:dane_ecsc_2024",
                "anexo",
                "https://www.dane.gov.co/files/operaciones/ECSC/anex-ECSC-2024.xlsx",
                formato="xlsx",
            ),
            FuenteDescarga(
                "local:dnp_terridata_13001",
                "anexo",
                "https://terridata.dnp.gov.co/assets/docs/excel/entidades/TerriData13001.xlsx.zip",
                formato="zip_xlsx",
                nombre_xlsx="TerriData13001.xlsx",
            ),
            FuenteDescarga(
                "local:unidad_victimas_irv_cartagena",
                "irv",
                "https://vgv.unidadvictimas.gov.co/server/rest/services/IRV/IRV/MapServer",
            ),
            FuenteDescarga(
                "local:unidad_victimas_indemnizaciones_cartagena",
                "indemnizaciones",
                "https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/1",
            ),
            FuenteDescarga(
                "local:unidad_victimas_ruv_cartagena",
                "ruv",
                "https://cifras2.unidadvictimas.gov.co/RNI.Reportes.Servicios",
            ),
        ]
    )
    fuentes.append(
        FuenteDescarga(
            "local:fiscalia_spoa_procesos_por_anio_hecho",
            "fiscalia_supervisada",
            "https://www.fiscalia.gov.co/colombia/gestion/estadisticas/",
        )
    )
    return {f.producto_id: f for f in fuentes}
