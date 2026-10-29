"""Pure domain calculations and source catalog for the Cartagena planning triad."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

from app.modules.compromisos.schemas import (
    ActividadOperativaTriada,
    EjecucionPresupuestalTriada,
    MetaEstrategicaTriada,
)

BASE_TRANSPARENCIA = "https://www.cartagena.gov.co/transparencia"
BASE_CATEGORIAS = "https://www.cartagena.gov.co/Transparencia/Planeación"
PAGINA_PLANES_2026 = (
    f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026"
)
FUENTES_HISTORICAS = {
    2018: (f"{BASE_TRANSPARENCIA}/planeacion-presupuesto-informes/planes-accion/seguimiento-planes-accion-2018"),
    2019: (f"{BASE_TRANSPARENCIA}/planeacion-presupuesto-informes/planes-accion/planes-accion-2019"),
    2020: (f"{BASE_TRANSPARENCIA}/planeacion-presupuesto-informes/planes-accion/planes-accion-2020"),
    2021: (
        f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/"
        "planes-institucionales-del-modelo-integrado-planeacion-gestion-mipg-2021"
    ),
    2022: (
        f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-e-informes/43-plan-accion/"
        "seguimientos-planes-accion-diciembre-31-2022"
    ),
    2023: (f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-2023"),
    2024: (f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-2024-formulado"),
    2025: (
        f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/"
        "seguimientos-planes-accion-corte-30-junio-2025"
    ),
    2026: PAGINA_PLANES_2026,
}

ARCHIVOS_2026 = (
    "DADIS.xls",
    "UMAYOR.xlsx",
    "CORVIVIENDA.xlsx",
    "DATT.xlsx",
    "DISTRISEGURIDAD.xlsx",
    "EPA.xlsx",
    "GERENCIA DE ESPACIO PUBLICO.xlsx",
    "IDER.xlsx",
    "IPCC.xlsx",
    "OAGR.xlsx",
    "PES-PR.xlsx",
    "SEC_EDUCACION.xlsx",
    "SECRETARIA DE HACIENDA.xlsx",
    "SECRETARÍA DE PLANEACION.xlsx",
    "SECRETARIA GENERAL.xlsx",
    "SICC.xlsx",
    "TURISMO.xlsx",
    "VALORIZACION.xlsx",
    "ESCUELA DE GOBERNO.xlsx",
    "IDACCC.xlsx",
    "INFRAESTRUCTURA.xlsx",
    "SPDS - UMATA.xlsx",
    "TRANSCARIBE.xlsx",
)

CATEGORIAS_TRANSPARENCIA = (
    {
        "codigo": "4.1",
        "nombre": "Presupuesto general de ingresos, gastos e inversión",
        "categoria": 50,
    },
    {"codigo": "4.2", "nombre": "Ejecución presupuestal", "categoria": 51},
    {"codigo": "4.3", "nombre": "Plan de Acción", "categoria": 52},
    {"codigo": "4.4", "nombre": "Proyectos de Inversión", "categoria": 53},
)


def obtener_catalogo_transparencia() -> dict[str, Any]:
    """Return published source metadata; attachment URLs are discovered from Drupal at runtime."""
    archivos = []
    for nombre in ARCHIVOS_2026:
        extension = nombre.rsplit(".", 1)[-1].lower()
        archivos.append(
            {
                "nombre_archivo": nombre,
                "extension": extension,
                "formato_estimado": "LEGACY_XLS" if extension == "xls" else "MULTIHOJA_XLSX_2026",
                "vigencia": 2026,
                "url_descarga": None,
                "url_fuente": PAGINA_PLANES_2026,
            }
        )
    return {
        "url_base": BASE_TRANSPARENCIA,
        "categorias": [
            {**item, "url": f"{BASE_CATEGORIAS}?categoria={item['categoria']}"} for item in CATEGORIAS_TRANSPARENCIA
        ],
        "planes_accion_2026": {
            "url_fuente": PAGINA_PLANES_2026,
            "inventario_declarado": len(ARCHIVOS_2026),
            "archivos": archivos,
            "cortes_trimestrales": [
                {
                    "corte": "31-marzo-2026",
                    "url_fuente": (
                        f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/"
                        "seguimientos-planes-accion-corte-31-marzo-2026"
                    ),
                },
                {
                    "corte": "30-junio-2026",
                    "url_fuente": (
                        f"{BASE_TRANSPARENCIA}/4planeacion-presupuesto-informes/43-plan-accion/"
                        "seguimientos-planes-accion-corte-30-junio-2026"
                    ),
                },
            ],
            "descarga": {
                "estrategia": "playwright_headless",
                "flujo": [
                    "abrir la página publicada de transparencia con Chromium headless",
                    "esperar la respuesta del challenge de Cloudflare y la carga de Drupal",
                    "extraer enlaces .xlsx/.xls desde la página ya renderizada",
                    "descargar con la sesión del navegador y validar extensión y tamaño",
                ],
                "descarga_ejecutada": False,
                "nota": "Catálogo consultado; este endpoint no descarga ni persiste adjuntos.",
            },
        },
        "inventario_historico_2018_2026": [
            {"vigencia": year, "url_fuente": url, "categoria_transparencia": "4.3 Plan de Acción"}
            for year, url in FUENTES_HISTORICAS.items()
        ],
        "categoria_ejecucion_presupuestal": {
            "codigo": "4.2",
            "url": f"{BASE_CATEGORIAS}?categoria=51",
        },
        "categoria_proyectos_inversion": {
            "codigo": "4.4",
            "url": f"{BASE_CATEGORIAS}?categoria=53",
        },
        "estado_verificacion": (
            "inventario proporcionado en asignación; enlaces adjuntos sujetos a descubrimiento en vivo"
        ),
    }


def motor_plan_desarrollo(metas: list[MetaEstrategicaTriada]) -> dict[str, Any]:
    agrupado: dict[tuple[str, str], list[MetaEstrategicaTriada]] = defaultdict(list)
    for meta in metas:
        agrupado[(meta.entidad, meta.linea_estrategica)].append(meta)
    lineas = [
        {
            "entidad": entidad,
            "linea_estrategica": linea,
            "metas": len(items),
            "avance_estrategico_pct": round(sum(i.avance_estrategico_pct for i in items) / len(items), 2),
        }
        for (entidad, linea), items in sorted(agrupado.items())
    ]
    return {"motor": "plan_desarrollo", "metas_evaluadas": len(metas), "lineas": lineas}


def motor_plan_accion(actividades: list[ActividadOperativaTriada]) -> dict[str, Any]:
    agrupado: dict[tuple[str, str], list[ActividadOperativaTriada]] = defaultdict(list)
    for actividad in actividades:
        agrupado[(actividad.entidad, actividad.linea_estrategica)].append(actividad)
    lineas = [
        {
            "entidad": entidad,
            "linea_estrategica": linea,
            "actividades": len(items),
            "avance_operativo_fisico_pct": round(sum(i.avance_operativo_fisico_pct for i in items) / len(items), 2),
            "porcentaje_verbos_fuertes_dnp": round(sum(i.porcentaje_verbos_fuertes_dnp for i in items) / len(items), 2),
        }
        for (entidad, linea), items in sorted(agrupado.items())
    ]
    return {"motor": "plan_accion", "actividades_evaluadas": len(actividades), "lineas": lineas}


def motor_inversion_presupuestal(
    ejecuciones: list[EjecucionPresupuestalTriada],
) -> dict[str, Any]:
    items = []
    for dato in ejecuciones:
        apropiacion = dato.apropiacion_definitiva_cop
        items.append(
            {
                **dato.model_dump(),
                "ejecucion_compromisos_pct": round(100 * dato.compromisos_rp_cop / apropiacion, 2)
                if apropiacion
                else None,
                "giro_efectivo_pct": round(100 * dato.pagos_tesoreria_cop / apropiacion, 2) if apropiacion else None,
            }
        )
    return {
        "motor": "inversion_presupuestal",
        "proyectos_evaluados": len(ejecuciones),
        "ejecuciones": items,
    }


def _clave(fila: Any) -> tuple[str, ...]:
    return (
        str(fila.entidad or "").strip().casefold(),
        str(fila.linea_estrategica or "").strip().casefold(),
        str(fila.codigo_bpim or "").strip().casefold(),
        str(getattr(fila, "vigencia", None) or "").strip().casefold(),
    )


def _clave_valida(clave: tuple[str, ...]) -> bool:
    invalidos = {"-", "----", "n/a", "na", "nd", "ninguno", "0", "sin codigo"}
    for valor in clave[:3]:
        normalizado = " ".join(valor.strip().casefold().split())
        if not normalizado or normalizado in invalidos:
            return False
    return not bool(re.fullmatch(r"\d+(?:[.,]\d+)*", clave[0].strip()))


def _corte_rank(fila: Any) -> tuple[int, str]:
    corte = str(getattr(fila, "corte", None) or "").strip().upper()
    match = re.search(r"(?:T|TRIMESTRE\s*)([1-4])", corte)
    return (int(match.group(1)) if match else 0, corte)


def cruzar_tres_lecturas(
    metas: list[MetaEstrategicaTriada],
    actividades: list[ActividadOperativaTriada],
    ejecuciones: list[EjecucionPresupuestalTriada],
) -> dict[str, Any]:
    """Match strategic, physical and financial rows by entity, strategic line and BPIM."""
    maps: list[dict[tuple[str, ...], list[Any]]] = []
    for rows in (metas, actividades, ejecuciones):
        grouped: dict[tuple[str, ...], list[Any]] = defaultdict(list)
        for row in rows:
            key = _clave(row)
            # Never match unrelated records through an empty entity/line/BPIM key.
            if _clave_valida(key):
                grouped[key].append(row)
        for key, keyed_rows in grouped.items():
            if any(getattr(row, "corte", None) for row in keyed_rows):
                latest_cut = max(_corte_rank(row) for row in keyed_rows)
                grouped[key] = [row for row in keyed_rows if _corte_rank(row) == latest_cut]
        maps.append(grouped)
    keys = sorted(set().union(*(set(m) for m in maps)))
    cruces = []
    alertas = []
    for key in keys:
        strategic, operational, financial = (m.get(key, []) for m in maps)
        strategy_pct = (
            round(sum(x.avance_estrategico_pct for x in strategic) / len(strategic), 2) if strategic else None
        )
        physical_pct = (
            round(sum(x.avance_operativo_fisico_pct for x in operational) / len(operational), 2)
            if operational
            else None
        )
        appropriation = sum(x.apropiacion_definitiva_cop for x in financial)
        rp = sum(x.compromisos_rp_cop for x in financial)
        payments = sum(x.pagos_tesoreria_cop for x in financial)
        financial_pct = round(100 * rp / appropriation, 2) if appropriation else None
        payout_pct = round(100 * payments / appropriation, 2) if appropriation else None
        gap = round(financial_pct - physical_pct, 2) if financial_pct is not None and physical_pct is not None else None
        differences = [
            abs(a - b)
            for a, b in (
                (strategy_pct, physical_pct),
                (physical_pct, financial_pct),
                (strategy_pct, financial_pct),
            )
            if a is not None and b is not None
        ]
        index = round(max(0.0, 100 - sum(differences) / len(differences)), 2) if differences else None
        if strategy_pct is not None and (physical_pct is None or strategy_pct - physical_pct >= 20):
            state = "META_PDD_SUBOPERACIONALIZADA"
            finding = "El avance estratégico supera en 20 puntos o más el avance operativo reportado."
            recommendation = "Revisar la desagregación anual de metas y responsables del Plan de Acción."
        elif gap is not None and gap >= 20:
            state = "DESFASE_CRITICO_SOBREEJECUCION"
            finding = "La ejecución de compromisos RP supera en 20 puntos o más el avance físico."
            recommendation = "Conciliar registros RP, obligaciones, pagos y evidencia física del proyecto."
        elif gap is not None and gap <= -20:
            state = "REZAGO_CONTRACTUAL_INVERSION"
            finding = "El avance físico supera en 20 puntos o más los compromisos RP."
            recommendation = "Verificar CDP/RP y oportunidad de contratación frente a la meta física."
        elif len(strategic) and len(operational) and len(financial):
            state = "COHERENCIA_INTEGRAL_ALTA"
            finding = "Las tres lecturas tienen registros coincidentes; no se detecta brecha crítica."
            recommendation = "Mantener seguimiento conjunto de metas, ejecución y pagos."
        else:
            state = "DATOS_INCOMPLETOS"
            finding = "Falta al menos una lectura para emitir semáforo integral."
            recommendation = "Completar las fuentes estratégica, operativa y financiera para esta llave."
        cruce = {
            "entidad": key[0],
            "linea_estrategica": key[1],
            "codigo_bpim": key[2],
            "vigencia": int(key[3]) if key[3].isdigit() else None,
            "avance_estrategico_pdd_pct": strategy_pct,
            "avance_operativo_pa_pct": physical_pct,
            "ejecucion_financiera_rp_pct": financial_pct,
            "giro_pagos_pct": payout_pct,
            "brecha_fisico_financiera_pts": gap,
            "indice_coherencia_tripartita": index,
            "estado_semaforo": state,
            "hallazgo_forense": finding,
            "recomendacion_tecnica": recommendation,
        }
        cruces.append(cruce)
        if state != "COHERENCIA_INTEGRAL_ALTA":
            alertas.append(cruce)

    resumen_semaforo = {
        "coherencia_alta": sum(1 for c in cruces if c["estado_semaforo"] == "COHERENCIA_INTEGRAL_ALTA"),
        "desfase_sobreejecucion": sum(1 for c in cruces if c["estado_semaforo"] == "DESFASE_CRITICO_SOBREEJECUCION"),
        "rezago_contractual": sum(1 for c in cruces if c["estado_semaforo"] == "REZAGO_CONTRACTUAL_INVERSION"),
        "meta_suboperacionalizada": sum(1 for c in cruces if c["estado_semaforo"] == "META_PDD_SUBOPERACIONALIZADA"),
    }
    return {
        "total_cruces": len(cruces),
        "totales_evaluados": len(cruces),
        "cruces": cruces,
        "alertas": alertas,
        "resumen_semaforo": resumen_semaforo,
    }
