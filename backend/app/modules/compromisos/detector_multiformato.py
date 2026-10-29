"""Fingerprinting and canonical normalization for district action-plan workbooks."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from typing import Any

from app.modules.compromisos.schemas import (
    DetectarFormatoPlanAccionRespuesta,
    DetectarFormatoPlanAccionSolicitud,
    HojaExcelEntrada,
    RegistroPlanAccionNormalizado,
)

PERFILES = (
    "PA_MONOHOJA_2016_2019",
    "PA_HIBRIDO_2020_2023",
    "PA_MULTIHOJA_2024_2026",
    "PA_CANONICO_DNP_POLIS",
)

SINONIMOS: dict[str, tuple[str, ...]] = {
    "dependencia": ("dependencia", "entidad", "secretaria", "organismo", "institucion"),
    "linea_estrategica": ("linea estrategica", "pilar", "eje estrategico"),
    "codigo_meta_pdd": ("codigo meta pdd", "meta pdd", "codigo meta", "cod meta", "meta producto"),
    "codigo_bpim": ("codigo bpim", "bpim", "bpin", "codigo proyecto", "proyecto de inversion"),
    "indicador": ("indicador", "nombre indicador", "indicador de producto", "indicador resultado"),
    "descripcion_actividad": (
        "descripcion actividad",
        "actividad",
        "accion",
        "producto",
        "nombre actividad",
    ),
    "meta_programada_anual": (
        "meta programada anual",
        "meta anual",
        "meta programada",
        "programacion anual",
    ),
    "meta_ejecutada_anual": (
        "meta ejecutada anual",
        "meta ejecutada",
        "ejecucion anual",
        "avance anual",
    ),
    "avance_t1": ("avance t1", "t1", "primer trimestre", "i trimestre", "trimestre 1"),
    "avance_t2": ("avance t2", "t2", "segundo trimestre", "ii trimestre", "trimestre 2"),
    "avance_t3": ("avance t3", "t3", "tercer trimestre", "iii trimestre", "trimestre 3"),
    "avance_t4": ("avance t4", "t4", "cuarto trimestre", "iv trimestre", "trimestre 4"),
    "presupuesto_apropiado": (
        "presupuesto apropiado",
        "apropiacion definitiva",
        "presupuesto asignado",
        "presupuesto aprobado",
    ),
    "presupuesto_ejecutado": (
        "presupuesto ejecutado",
        "ejecucion presupuestal",
        "ejecutado",
        "pagos",
    ),
}

VERBOS_DEBILES = {
    "apropiar",
    "asegurar",
    "colaborar",
    "consolidar",
    "contribuir",
    "desarrollar",
    "integrar",
    "fomentar",
    "fortalecer",
    "garantizar",
    "implementar",
    "impulsar",
    "mejorar",
    "movilizar",
    "proponer",
    "gestionar",
    "promover",
}


def _normalizar(texto: str) -> str:
    plano = unicodedata.normalize("NFKD", texto.lower())
    plano = "".join(c for c in plano if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", plano).strip()


def _numero(valor: Any) -> float | None:
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip().replace("$", "").replace("%", "").replace(" ", "")
    if not texto:
        return None
    if re.fullmatch(r"-?\d{1,3}(?:\.\d{3})+", texto):
        texto = texto.replace(".", "")
    if "," in texto and "." in texto:
        texto = texto.replace(".", "").replace(",", ".")
    elif "," in texto:
        texto = texto.replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return None


def _verb_info(texto: str | None) -> tuple[bool | None, str | None]:
    if not texto:
        return None, None
    palabra = _normalizar(texto).split(" ")[0]
    es_infinitivo = palabra.endswith(("ar", "er", "ir"))
    return es_infinitivo and palabra not in VERBOS_DEBILES, palabra


def _cabecera_mapeo(hojas: list[HojaExcelEntrada]) -> dict[str, str]:
    resultado: dict[str, str] = {}
    for hoja in hojas:
        encabezados = list(hoja.encabezados_detectados)
        if not encabezados and hoja.filas:
            encabezados = [str(k) for k in hoja.filas[0]]
        resultado.update(_mapear_encabezados(encabezados, resultado))
    return resultado


def _mapear_encabezados(encabezados: list[str], existentes: dict[str, str] | None = None) -> dict[str, str]:
    resultado: dict[str, str] = {}
    existentes = existentes or {}
    for campo, opciones in SINONIMOS.items():
        if campo in existentes:
            continue
        for cabecera in encabezados:
            normalizada = _normalizar(cabecera)
            if any(_normalizar(opcion) == normalizada or _normalizar(opcion) in normalizada for opcion in opciones):
                resultado[campo] = cabecera
                break
    return resultado


def _detectar_perfil(solicitud: DetectarFormatoPlanAccionSolicitud, mapeo: dict[str, str]) -> tuple[str, float]:
    hojas = [_normalizar(h.nombre_hoja) for h in solicitud.hojas]
    nombre = _normalizar(solicitud.nombre_archivo)
    anio = solicitud.vigencia_declarada
    if solicitud.muestra:
        perfil = {
            "2016_MONOHOJA": PERFILES[0],
            "2021_HIBRIDO": PERFILES[1],
            "2026_MULTIHOJA": PERFILES[2],
            "2026_CANONICO_DNP": PERFILES[3],
        }[solicitud.muestra]
        return perfil, 1.0
    canonico = any("plan accion" == h or "plan indicativo" in h for h in hojas)
    if (
        canonico
        and len(solicitud.hojas) <= 2
        and ("polis" in nombre or "canonico" in nombre or "plan indicativo" in hojas)
    ):
        return PERFILES[3], 0.97
    if anio is None:
        match = re.search(r"20(?:1[6-9]|2[0-6])", solicitud.nombre_archivo)
        anio = int(match.group()) if match else None
    if (anio is not None and 2020 <= anio <= 2023) or any(
        x in " ".join(hojas) for x in ("cartagena incluyente", "resiliente", "contingente", "transparente")
    ):
        return PERFILES[1], min(0.95, 0.68 + len(mapeo) * 0.02)
    if len(solicitud.hojas) >= 3 or any(
        x in " ".join(hojas) for x in ("identificacion", "ejecucion presupuestal", "plan indicativo")
    ):
        return PERFILES[2], min(0.98, 0.72 + len(mapeo) * 0.02)
    if len(solicitud.hojas) == 1 and anio is not None and 2016 <= anio <= 2019:
        return PERFILES[0], min(0.96, 0.70 + len(mapeo) * 0.02)
    if anio is not None and 2016 <= anio <= 2019:
        return PERFILES[0], min(0.82, 0.52 + len(mapeo) * 0.02)
    if anio is not None and anio >= 2024:
        return PERFILES[2], min(0.85, 0.56 + len(mapeo) * 0.02)
    return "DESCONOCIDO", min(0.55, len(mapeo) * 0.035)


def detectar_y_normalizar_formato(
    solicitud: DetectarFormatoPlanAccionSolicitud,
) -> DetectarFormatoPlanAccionRespuesta:
    """Infer a workbook profile and normalize its rows without reading arbitrary files."""
    mapeo = _cabecera_mapeo(solicitud.hojas)
    perfil, confianza = _detectar_perfil(solicitud, mapeo)
    anio = solicitud.vigencia_declarada
    if anio is None:
        match = re.search(r"20(?:1[6-9]|2[0-6])", solicitud.nombre_archivo)
        anio = int(match.group()) if match else None
    registros: list[RegistroPlanAccionNormalizado] = []
    for hoja in solicitud.hojas:
        headers = {str(k): k for fila in hoja.filas for k in fila}
        encabezados = hoja.encabezados_detectados or list(headers)
        local_map = _mapear_encabezados(encabezados)
        for fila in hoja.filas:
            values: dict[str, Any] = {}
            for campo, encabezado in local_map.items():
                raw = fila.get(encabezado)
                if campo in {
                    "meta_programada_anual",
                    "meta_ejecutada_anual",
                    "avance_t1",
                    "avance_t2",
                    "avance_t3",
                    "avance_t4",
                    "presupuesto_apropiado",
                    "presupuesto_ejecutado",
                }:
                    values[campo] = _numero(raw)
                elif raw is not None:
                    values[campo] = str(raw).strip()
            verb_ok, verb = _verb_info(values.get("descripcion_actividad"))
            values.update(
                vigencia=anio,
                entidad=solicitud.entidad_declarada,
                verbo_fuerte_dnp=verb_ok,
                verbo_detectado=verb,
                hoja_origen=hoja.nombre_hoja,
                datos_origen=fila,
            )
            registros.append(RegistroPlanAccionNormalizado(**values))
    verbs = [r for r in registros if r.verbo_fuerte_dnp is not None]
    fuertes = sum(bool(r.verbo_fuerte_dnp) for r in verbs)
    por_vigencia: dict[str, Any] = {}
    for year in (2016, 2020, 2026):
        group = [r for r in registros if r.vigencia == year]
        por_vigencia[str(year)] = {
            "registros": len(group),
            "meta_programada_anual": sum(r.meta_programada_anual or 0 for r in group) if group else None,
            "meta_ejecutada_anual": sum(r.meta_ejecutada_anual or 0 for r in group) if group else None,
            "presupuesto_apropiado": sum(r.presupuesto_apropiado or 0 for r in group) if group else None,
            "presupuesto_ejecutado": sum(r.presupuesto_ejecutado or 0 for r in group) if group else None,
            "dato_disponible": bool(group),
        }
    return DetectarFormatoPlanAccionRespuesta(
        perfil_detectado=perfil,
        confianza=round(confianza, 2),
        vigencia=anio,
        entidad=solicitud.entidad_declarada,
        hojas_analizadas=[h.nombre_hoja for h in solicitud.hojas],
        mapeo_columnas=mapeo,
        registros_normalizados=registros,
        resumen_validacion_dnp={
            "actividades_evaluadas": len(verbs),
            "actividades_con_verbo_fuerte": fuertes,
            "porcentaje_verbos_fuertes": round(100 * fuertes / len(verbs), 2) if verbs else None,
            "verbos_detectados": dict(Counter(r.verbo_detectado for r in verbs if r.verbo_detectado)),
        },
        comparativa_interanual={
            "unidad_comparable": "campos canónicos normalizados; sin imputación",
            "vigencias": por_vigencia,
        },
    )


def obtener_muestras_multiformato() -> dict[str, DetectarFormatoPlanAccionSolicitud]:
    """Small deterministic examples; sample values are explicitly synthetic."""
    return {
        "2016_MONOHOJA": DetectarFormatoPlanAccionSolicitud(
            nombre_archivo="DADIS_Plan_Accion_2016.xls",
            vigencia_declarada=2016,
            entidad_declarada="DADIS",
            muestra="2016_MONOHOJA",
            hojas=[
                HojaExcelEntrada(
                    nombre_hoja="Plan de Acción",
                    encabezados_detectados=[
                        "Dependencia",
                        "Código Meta PDD",
                        "Indicador",
                        "Descripción actividad",
                        "Meta anual",
                        "Presupuesto apropiado",
                        "Presupuesto ejecutado",
                    ],
                    filas=[
                        {
                            "Dependencia": "DADIS",
                            "Código Meta PDD": "M-01",
                            "Indicador": "Cobertura",
                            "Descripción actividad": "Ejecutar jornadas de vacunación",
                            "Meta anual": 10,
                            "Presupuesto apropiado": 1000000,
                            "Presupuesto ejecutado": 250000,
                        }
                    ],
                )
            ],
        ),
        "2021_HIBRIDO": DetectarFormatoPlanAccionSolicitud(
            nombre_archivo="DISTRISEGURIDAD_Plan_Accion_2021.xlsx",
            vigencia_declarada=2021,
            entidad_declarada="Distriseguridad",
            muestra="2021_HIBRIDO",
            hojas=[
                HojaExcelEntrada(
                    nombre_hoja="Cartagena Resiliente",
                    encabezados_detectados=[
                        "Entidad",
                        "Meta PDD",
                        "BPIN",
                        "Indicador",
                        "Actividad",
                        "T1",
                        "T2",
                    ],
                    filas=[
                        {
                            "Entidad": "Distriseguridad",
                            "Meta PDD": "M-10",
                            "BPIN": "202113001",
                            "Indicador": "Cobertura",
                            "Actividad": "Instalar cámaras de seguridad",
                            "T1": 25,
                            "T2": 50,
                        }
                    ],
                )
            ],
        ),
        "2026_MULTIHOJA": DetectarFormatoPlanAccionSolicitud(
            nombre_archivo="SECRETARIA_DE_PLANEACION_2026.xlsx",
            vigencia_declarada=2026,
            entidad_declarada="Secretaría de Planeación",
            muestra="2026_MULTIHOJA",
            hojas=[
                HojaExcelEntrada(
                    nombre_hoja="Identificación",
                    encabezados_detectados=["Dependencia"],
                    filas=[{"Dependencia": "Secretaría de Planeación"}],
                ),
                HojaExcelEntrada(
                    nombre_hoja="Plan Indicativo",
                    encabezados_detectados=["Código Meta PDD", "Indicador"],
                ),
                HojaExcelEntrada(
                    nombre_hoja="Plan de Acción T1-T4",
                    encabezados_detectados=[
                        "Descripción actividad",
                        "Meta programada anual",
                        "T1",
                        "T2",
                        "T3",
                        "T4",
                    ],
                    filas=[
                        {
                            "Descripción actividad": "Construir parques barriales",
                            "Meta programada anual": 4,
                            "T1": 1,
                            "T2": 1,
                            "T3": 1,
                            "T4": 1,
                        }
                    ],
                ),
                HojaExcelEntrada(
                    nombre_hoja="Ejecución Presupuestal",
                    encabezados_detectados=["Presupuesto apropiado", "Presupuesto ejecutado"],
                ),
            ],
        ),
        "2026_CANONICO_DNP": DetectarFormatoPlanAccionSolicitud(
            nombre_archivo="PA_CANONICO_DNP_POLIS_2026.xlsx",
            vigencia_declarada=2026,
            entidad_declarada="DADIS",
            muestra="2026_CANONICO_DNP",
            hojas=[
                HojaExcelEntrada(
                    nombre_hoja="Plan_Accion",
                    encabezados_detectados=[
                        "Dependencia",
                        "Meta PDD",
                        "BPIM",
                        "Descripción actividad",
                        "Meta ejecutada anual",
                    ],
                    filas=[
                        {
                            "Dependencia": "DADIS",
                            "Meta PDD": "M-01",
                            "BPIM": "BPIM-01",
                            "Descripción actividad": "Entregar equipos médicos",
                            "Meta ejecutada anual": 2,
                        }
                    ],
                ),
                HojaExcelEntrada(
                    nombre_hoja="Plan_Indicativo",
                    encabezados_detectados=["Indicador", "Código Meta PDD"],
                ),
            ],
        ),
    }
