# ASIGNACIÓN TÉCNICA EDD: `[TRIADA-BACKEND-01]`
## MOTOR BACKEND DE LA TRIADA DE PLANEACIÓN Y HACIENDA DISTRITAL (PLAN DE DESARROLLO + PLAN DE ACCIÓN MULTIFORMATO 2016–2026 + INVERSIÓN Y EJECUCIÓN PRESUPUESTAL) Y CONECTOR DE TRANSPARENCIA CARTAGENA

- **Para:** Desarrollador Backend / Arquitectura (`codex`)
- **De:** Coordinador General / Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-14
- **Rama de trabajo:** `main` (Política **Zero-Push**: solo commit local)
- **Trabajo concurrente en curso:** `agy2` está ejecutando `[TRIADA-FRONTEND-02]` exclusivamente sobre `src/features/seguimiento/*` y `bridge/02_resultado_agy2.md`. **NO modifiques ni agregues a tu commit ningún archivo bajo `src/` ni los archivos `bridge/01_tarea_activa.md`, `bridge/02_resultado_agy2.md` o `bridge/03_dictamen_revision.md`.**

---

## 1. Contexto y Objetivo de la Tarea

La Alcaldía Mayor de Cartagena (`https://www.cartagena.gov.co/transparencia`, Sección **4. Planeación, Presupuesto e Informes**) publica en 4 subcategorías (`4.1 Presupuesto`, `4.2 Ejecución Presupuestal`, `4.3 Plan de Acción`, `4.4 Proyectos de Inversión`) los instrumentos de gestión distrital. Sin embargo:
1. **Los formatos Excel de Plan de Acción cambian entre vigencias:** en **2016–2019** era **1 sola hoja plana por entidad** (`PA_MONOHOJA_2016_2019`); en **2020–2023** cambió a matrices híbridas por línea estratégica (`PA_HIBRIDO_2020_2023`); en **2024–2026** son libros **multihoja** (`PA_MULTIHOJA_2024_2026`: `Identificación`, `Plan Indicativo`, `Plan de Acción T1-T4`, `Ejecución Presupuestal`), además de nuestra plantilla dual (`PA_CANONICO_DNP_POLIS`).
2. **Se requiere articular 3 Motores en el backend** para obtener las **3 lecturas cruzadas**:
   - **Motor 1 — Motor de Plan de Desarrollo (Lectura Estratégica Cuatrienal):** Planes de Desarrollo `2016-2019 Primero la Gente`, `2020-2023 Salvemos Juntos a Cartagena` y `2024-2027 Cartagena Ciudad de Derechos` (Líneas Estratégicas, Programas MGA, Indicadores de Resultado/Bienestar y Metas de Producto Cuatrienales).
   - **Motor 2 — Motor de Plan de Acción Multiformato (Lectura Operativa Anual/Trimestral — Cat. `4.3`):** Con detector polimórfico de formatos Excel (`2016` a `2026`), normalizador canónico para lectura comparativa interanual, validador de verbos fuertes DNP e inventario oficial de los **23 archivos `.xlsx`/`.xls` de 2026** publicados en `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026`.
   - **Motor 3 — Motor de Inversión y Ejecución Presupuestal (Lectura Financiera — Cat. `4.1`, `4.2`, `4.4`):** Cascada presupuestal completa (`apropiacion_inicial`, `apropiacion_definitiva`, `cdp_acumulado`, `compromisos_rp`, `obligaciones`, `pagos_tesoreria`), proyectos `BPIM`/`BPIN` y fuentes (`ICLD`, `SGP`, `FONSET`, `SGR`, `CREDITO`, `RECURSOS_PROPIOS`).
   - **Motor de Cruce Tripartito (`CruzarTresLecturas`):** Cruza el avance estratégico (Motor 1), el avance físico operativo (Motor 2) y la ejecución financiera RP/Pagos (Motor 3) por entidad, línea estratégica y proyecto `BPIM`, emitiendo el **Semáforo de Coherencia Físico-Financiera-Estratégica**.

---

## 2. Alcance Exacto de Archivos Bajo Responsabilidad de `codex`

Debes crear/modificar **únicamente** los siguientes archivos en `backend/` y `bridge/`:
1. `backend/app/modules/compromisos/detector_multiformato.py` *(nuevo)*
2. `backend/app/modules/compromisos/triada_motores.py` *(nuevo)*
3. `backend/app/modules/compromisos/schemas.py` *(ampliar con los esquemas Pydantic de la Triada y el Detector Multiformato)*
4. `backend/app/modules/compromisos/service.py` *(exponer métodos delegados a `detector_multiformato.py` y `triada_motores.py`)*
5. `backend/app/modules/compromisos/router.py` *(agregar los 3 endpoints públicos bajo `/compromisos/triada/...`)*
6. `backend/tests/test_triada_motores.py` *(nuevo — suite exhaustiva de pruebas unitarias e integración API)*
7. `bridge/02_entrega_codex.md` *(reporte de entrega EDD)*

> **Nota sobre Ruff:** Todos los archivos que crees o modifiques en esta tarea (`detector_multiformato.py`, `triada_motores.py`, `schemas.py`, `service.py`, `router.py`, `test_triada_motores.py`) deben pasar `uv run --project backend ruff check` y `ruff format --check` con **0 errores**.

---

## 3. Especificación Técnica Detallada

### 3.1. `backend/app/modules/compromisos/detector_multiformato.py`
Implementar el **Detector y Estandarizador Polimórfico de Formatos (`2016–2026`)**:
1. **Perfiles de formato soportados (`PerfilFormatoPlanAccion`):**
   - `PA_MONOHOJA_2016_2019`: 1 sola hoja plana por entidad (`vigencia` 2016–2019), columnas combinadas de objetivo/meta/presupuesto anual sin desglose trimestral o con semestres.
   - `PA_HIBRIDO_2020_2023`: Hojas por Pilar (`Salvemos Juntos a Cartagena 2020-2023`: `Cartagena Incluyente`, `Cartagena Resiliente`, `Cartagena Contingente`, `Cartagena Transparente`) y seguimiento trimestral/semestral.
   - `PA_MULTIHOJA_2024_2026`: Libro institucional multihoja (`Identificación`/`Ficha`, `Plan Indicativo`/`Metas PDD`, `Plan de Acción`/`Actividades T1-T4`, `Ejecución Presupuestal`/`POAI`).
   - `PA_CANONICO_DNP_POLIS`: Formato dual (`Hoja 1: Plan_Accion`, `Hoja 2: Plan_Indicativo`).
2. **Función `detectar_y_normalizar_formato(solicitud)`:**
   - Recibe:
     - `nombre_archivo: str` (ej. `"DADIS_Plan_Accion_2016.xls"`, `"SECRETARIA_DE_HACIENDA_2026.xlsx"`)
     - `vigencia_declarada: int | None`
     - `entidad_declarada: str | None`
     - `hojas: list[HojaExcelEntrada]` donde cada hoja tiene `nombre_hoja: str`, `encabezados_detectados: list[str]` (o filas crudas en las primeras 30 filas) y `filas: list[dict[str, Any]]`.
   - **Algoritmo de `Schema Fingerprinting`:**
     - Calcula la huella estructural según el número de hojas, los nombres de las pestañas y la coincidencia semántica de los encabezados contra el diccionario de sinónimos (`dependencia`, `codigo_meta_pdd`, `codigo_bpim`, `indicador`, `descripcion_actividad`, `meta_programada_anual`, `meta_ejecutada_anual`, `avance_t1..t4`, `presupuesto_apropiado`, `presupuesto_ejecutado`).
     - Determina `perfil_detectado`, `confianza` (`0.0` a `1.0`), `hojas_analizadas`, `mapeo_columnas: dict[str, str]` y transforma todas las filas al modelo canónico `RegistroPlanAccionNormalizado`.
     - Ejecuta validación de verbo fuerte DNP sobre cada actividad normalizada y genera un bloque de `comparativa_interanual` (`2016` vs. `2020` vs. `2026`) que permite comparar manzanas con manzanas entre vigencias con formatos distintos.
   - Incluir también 4 **datasets/plantillas de muestra preconfiguradas** (`obtener_muestras_multiformato()`) listas para probar inmediatamente los 4 formatos (`2016 Monohoja DADIS`, `2021 Híbrido Distriseguridad`, `2026 Multihoja Secretaría de Planeación`, `2026 Canónico DNP POLIS`).

### 3.2. `backend/app/modules/compromisos/triada_motores.py`
Implementar la lógica y catálogo canónico de los **3 Motores Articulados + Conector Transparencia Cartagena**:
1. **Catálogo Oficial de `https://www.cartagena.gov.co/transparencia` (Sección 4):**
   - `4.1 Presupuesto general de ingresos, gastos e inversión` (`/Transparencia/Planeación?categoria=50`)
   - `4.2 Ejecución presupuestal` (`/Transparencia/Planeación?categoria=51`)
   - `4.3 Plan de Acción` (`/Transparencia/Planeación?categoria=52`), incluyendo el registro completo de los **23 archivos `.xlsx`/`.xls` institucionales 2026** publicados en `/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026` (`DADIS.xls`, `UMAYOR.xlsx`, `CORVIVIENDA.xlsx`, `DATT.xlsx`, `DISTRISEGURIDAD.xlsx`, `EPA.xlsx`, `GERENCIA DE ESPACIO PUBLICO.xlsx`, `IDER.xlsx`, `IPCC.xlsx`, `OAGR.xlsx`, `PES-PR.xlsx`, `SEC_EDUCACION.xlsx`, `SECRETARIA DE HACIENDA.xlsx`, `SECRETARÍA DE PLANEACION.xlsx`, `SECRETARIA GENERAL.xlsx`, `SICC.xlsx`, `TURISMO.xlsx`, `VALORIZACION.xlsx`, `ESCUELA DE GOBERNO.xlsx`, `IDACCC.xlsx`, `INFRAESTRUCTURA.xlsx`, `SPDS - UMATA.xlsx`, `TRANSCARIBE.xlsx`) y los cortes trimestrales (`31-marzo-2026`, `30-junio-2026`), indicando el formato detectado (`.xls` Legacy vs `.xlsx` Multihoja 2026) y el mecanismo de descarga vía Playwright Headless para superar el challenge de Cloudflare en `/sites/default/files/transparencia/documentos/...`.
   - `4.4 Proyectos de Inversión` (`/Transparencia/Planeación?categoria=53`).
2. **Motor 1 (`motor_plan_desarrollo` — Estratégico Cuatrienal):**
   - Los 3 Planes de Desarrollo (`2016-2019 Primero la Gente`, `2020-2023 Salvemos Juntos a Cartagena`, `2024-2027 Cartagena Ciudad de Derechos`), sus Líneas Estratégicas, Programas MGA, Indicadores de Resultado/Bienestar y Metas de Producto Cuatrienales con su `avance_estrategico_pct`.
3. **Motor 2 (`motor_plan_accion` — Operativo Anual/Trimestral):**
   - Articulación de las dependencias distritales con sus metas operativas anuales (`2016–2026`), formato de origen detectado, entregas trimestrales (`T1–T4`), porcentaje de verbos fuertes DNP y `avance_operativo_fisico_pct`.
4. **Motor 3 (`motor_inversion_presupuestal` — Financiero POAI / Ejecución / BPIM):**
   - Cascada presupuestal por dependencia, línea estratégica y proyecto `BPIM`/`BPIN`:
     - `apropiacion_inicial_cop`
     - `apropiacion_definitiva_cop`
     - `cdp_acumulado_cop`
     - `compromisos_rp_cop` (`ejecucion_compromisos_pct`)
     - `obligaciones_cop`
     - `pagos_tesoreria_cop` (`giro_efectivo_pct`)
     - Desglose por fuentes (`ICLD`, `SGP`, `FONSET`, `SGR`, `CREDITO`, `RECURSOS_PROPIOS`).
5. **Motor de Cruce Tripartito (`cruzar_tres_lecturas`):**
   - Cruza **Motor 1 (Estratégico)** ↔ **Motor 2 (Operativo)** ↔ **Motor 3 (Financiero)** por entidad, línea estratégica y proyecto `BPIM`.
   - Calcula para cada cruce:
     - `avance_estrategico_pdd_pct`
     - `avance_operativo_pa_pct`
     - `ejecucion_financiera_rp_pct`
     - `giro_pagos_pct`
     - `brecha_fisico_financiera_pts` (`ejecucion_financiera_rp_pct - avance_operativo_pa_pct`)
     - `indice_coherencia_tripartita` (`0.0` a `100.0`)
     - `estado_semaforo`: `"COHERENCIA_INTEGRAL_ALTA" | "DESFASE_CRITICO_SOBREEJECUCION" | "REZAGO_CONTRACTUAL_INVERSION" | "META_PDD_SUBOPERACIONALIZADA"`
     - `hallazgo_forense` y `recomendacion_tecnica`.

### 3.3. Endpoints FastAPI en `backend/app/modules/compromisos/router.py`
Añadir (de acceso público conforme a Ley 1712/14 y Ley 1474/11 Art. 74):
1. `GET /compromisos/triada/resumen` (`obtener_resumen_triada_motores`):
   - Query params opcionales: `cuatrienio: str | None = None`, `vigencia: int | None = None`, `entidad: str | None = None`, `fuente: str | None = None`.
   - Retorna el estado consolidado de los 3 motores (`motor_1_plan_desarrollo`, `motor_2_plan_accion`, `motor_3_inversion_presupuestal`), el `cruce_tres_lecturas`, la `comparativa_interanual_2016_2026`, los `perfiles_formato_excel` y el `catalogo_transparencia_cartagena` (con las 4 categorías `4.1–4.4` y los 23 archivos `.xlsx`/`.xls` de 2026).
2. `POST /compromisos/triada/detectar-formato` (`detectar_formato_plan_accion_multianual`):
   - Recibe una solicitud `DetectarFormatoPlanAccionSolicitud` (o el código de una de las muestras `"2016_MONOHOJA" | "2021_HIBRIDO" | "2026_MULTIHOJA" | "2026_CANONICO_DNP"` más hojas personalizadas opcionales) y devuelve la huella de esquema detectada (`perfil_detectado`, `confianza`, `mapeo_columnas`, `registros_normalizados`, `resumen_validacion_dnp` y `comparativa_interanual`).
3. `POST /compromisos/triada/cruzar-lecturas` (`ejecutar_cruce_tres_lecturas`):
   - Permite evaluar y cruzar en vivo lotes o filtros combinados de metas del Plan de Desarrollo (Motor 1), actividades del Plan de Acción (Motor 2) y ejecución presupuestal `BPIM/CDP/RP/Pagos` (Motor 3), devolviendo el dictamen tripartito y las alertas de coherencia físico-financiera.

---

## 4. Criterios de Aceptación y Quality Gates

1. `uv run --project backend ruff check backend/app/modules/compromisos/detector_multiformato.py backend/app/modules/compromisos/triada_motores.py backend/app/modules/compromisos/schemas.py backend/app/modules/compromisos/service.py backend/app/modules/compromisos/router.py backend/tests/test_triada_motores.py` → **0 errores**.
2. `uv run --project backend ruff format --check backend/app/modules/compromisos/detector_multiformato.py backend/app/modules/compromisos/triada_motores.py backend/app/modules/compromisos/schemas.py backend/app/modules/compromisos/service.py backend/app/modules/compromisos/router.py backend/tests/test_triada_motores.py` → **0 archivos pendientes de formato**.
3. `PYTHONPATH=backend /root/polis/venv/bin/pytest backend/tests/test_triada_motores.py backend/tests/test_compromisos_api.py` → **100% PASS** (mínimo 12 tests nuevos en `test_triada_motores.py` probando detección de formato 2016 monohoja, 2021 híbrido, 2026 multihoja, mapeo semántico de sinónimos, los 3 motores, el cruce de las 3 lecturas, las alertas de sobreejecución/rezago y los 3 endpoints HTTP).
4. Reiniciar `polis-backend.service` (`systemctl restart polis-backend.service`) y verificar con `curl` que `http://127.0.0.1:8000/api/v1/compromisos/triada/resumen` responde `200 OK`.
5. Hacer commit local en `main` **únicamente** de los archivos de `backend/` listados en la Sección 2 + `bridge/02_entrega_codex.md` (sin tocar `src/`).
