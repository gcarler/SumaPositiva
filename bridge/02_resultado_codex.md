# Resultado Codex — Fase [29A]

**Fecha:** 2026-10-18
**Alcance:** articulación Hoshin Kanri PDD–PDL y dictamen transaccional de hallazgos.

## Implementación

- Hoshin Kanri consulta desde `bd_csh` los planes `PDL_1..3`, sus líneas/metas y territorios UCG; integra la articulación en `articulacion_distrital_local_pdl` y crea sesiones Catchball locales para metas y coldspots LISA.
- La comprobación de integración en la BD configurada devolvió **3 planes locales, 401 metas, 3 localidades y 15 UCGs**.
- `asegurar_tablas_pdt_ai_pg` crea `seguimiento.pdt_ai_hallazgos_revision` e índice de consulta. Se implementaron alta con SHA-256, validación de estados permitidos, listado filtrable e inclusión del total y registros recientes en el historial HITL.
- Se añadieron `POST .../revision-por-meta/dictaminar-hallazgo` y `GET .../revision-por-meta/dictamenes-hallazgos`, sus esquemas Pydantic y la documentación pública. El alta confirma la transacción en el endpoint.
- Se agregó el POST público al contrato de `test_access_policy.py`.

## Verificación

- Ruff sobre los siete archivos autorizados: **All checks passed!**
- `pytest tests/test_pdt_hoshin_kanri.py tests/test_pdt_persistencia_pg.py`: **14 passed**.
- `pytest tests/test_access_policy.py -k test_matriz_cubre_todas_las_rutas_y_sus_controles`: **1 passed, 106 deselected**.

No modifiqué `src/**` ni `pdt_revision_por_meta.py`.

---

# Resultado Codex — Fase [30A]

**Fecha:** 2026-10-18
**Alcance:** Integración de la DEA jerárquica de cuatro niveles de Cartagena y el tablero de Alcalde / armonización presupuestal.

## Implementación

- Se añadieron los endpoints GET `/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/4-niveles` y `/dea-cartagena/tablero-alcalde-armonizacion`, con esquemas Pydantic permisivos y parámetros de orientación/sector/nivel según contrato.
- El servicio intenta cargar dinámicamente `pdt_dea_4niveles_cartagena`; si todavía no está importable, ofrece fallback determinista con los cuatro niveles, mapeo MGA-DNP/MIR, recálculo de alertas por cumplimiento nominal con `theta_BCC <= 0.70` y benchmarks de frontera `theta=1.0`.
- `pdd_dea_service.py` incluye el resumen de DMUs por nivel, alertas y benchmarks. El resumen PDT del Consejo Multiagente incorpora el mismo análisis.
- Se documentaron ambas rutas como públicas y se agregaron pruebas de contrato para orientaciones input/output, tablero y resumen multiagente.

## Verificación

- Ruff en los seis módulos/pruebas de esta fase: **All checks passed!**
- `pytest tests/test_pdt_ai_evaluator.py tests/test_agentes_inteligentes_pdd.py tests/test_access_policy.py -q`: **125 passed**.
- `pytest -q` del backend alcanzó 61% y terminó con código **143 (SIGTERM)**, mostrando fallos/errores en pruebas ajenas a estos tres archivos; no completó y no se atribuyen como suite aprobada. La batería afectada por esta fase pasó completa.

No se modificó `src/**` ni `pdt_revision_por_meta.py` como parte de esta fase.

---

# Resultado Codex — Fase [31A]

**Fecha:** 2026-10-18
**Alcance:** Informe integral auditable para la Secretaría de Planeación Distrital (SPD).

## Implementación

- Se creó `backend/app/modules/compromisos/pdt_informe_integral_spd.py` para consolidar Hoshin Kanri/PDL, revisión 10D y vínculos PA, dictámenes de hallazgos, cuatro niveles DEA y alertas/armonización presupuestal.
- El informe calcula SHA-256 reproducible sobre las cinco síntesis cuantitativas y genera exportables Markdown y CSV con las columnas solicitadas.
- Se expuso `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/informe-integral-spd`, se añadió `PdtAiInformeIntegralSpdResponse` y se registró la ruta pública en la matriz de permisos.
- La prueba de endpoint valida HTTP 200, huella hexadecimal de 64 caracteres, cinco síntesis y ambos exportables.

## Verificación

- Ruff sobre el módulo nuevo, `router.py`, `schemas.py` y `test_pdt_ai_evaluator.py`: **All checks passed!**
- `pytest tests/test_pdt_ai_evaluator.py tests/test_access_policy.py -q`: **120 passed**.
- Ejecuté pytest únicamente sobre los dos archivos indicados.

No se modificó `src/**` ni `pdt_dea_4niveles_cartagena.py`.

---

# Resultado Codex — Fase [32A]

**Fecha:** 2026-10-19
**Alcance:** Normalización OCR de metas y cobertura histórica de los ocho planes PDD/PDL.

## Implementación

- `pdt_revision_por_meta.py` ahora normaliza llaves OCR ignorando acentos, mayúsculas y espacios internos; prioriza los campos canónicos, resuelve columnas posicionales PDL, recupera responsables desde vínculos y aplica inferencias documentadas para las tres Alcaldías Locales.
- Añadí extracción numérica que preserva el cero observado, reconoce números parentéticos y palabras numéricas, interpreta coma decimal y puntos de miles, y conserva `ND` como `ND (Sin línea base histórica)`. La unidad se normaliza o infiere por el indicador y la meta.
- La revisión acepta los ocho códigos oficiales y `TODOS`. En `TODOS` carga y evalúa el universo completo; se optimizó la lectura para consultar las actividades de Plan de Acción una sola vez.
- El informe SPD incluye `cobertura_historica_8_planes_2012_2027`, su tabla en Markdown y esos datos en la huella de corte. Se consulta `bd_csh` y se conserva un fallback determinista.
- La consulta de solo lectura a `bd_csh` confirmó **4,637 metas** y **4,637 vínculos**: PDD 2012–2015 (469), PDD 2013–2015 (676), PDD 2016–2019 (898), PDD 2020–2023 (947), PDD 2024–2027 (1,246), PDL 1 (110), PDL 2 (89), PDL 3 (202).

## Verificación

- Ruff sobre los cuatro archivos de esta fase: **All checks passed!**
- `pytest tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py -q`: **26 passed**.
- No ejecuté pytest sobre el repositorio completo.

No modifiqué `src/**`, `pdt_conciliador_vinculos_pa_triada.py` ni `poblar_vinculos_meta_pa_triada.py`.

---

# Resultado Codex — Fase [33A]

**Fecha:** 2026-10-19
**Alcance:** Integración de seguimiento SisPT DNP, Plan de Acción y conciliación CUIPO/PIIP.

## Implementación

- `pdt_revision_por_meta.py` incorpora una evaluación SisPT en cada meta: tipología, eficacia bruta y truncada al 100%, exceso, rango MDM, clasificación de meta/actividad y estado de coherencia CUIPO/PIIP. Importa las funciones de `pdt_sispt_dnp_evaluador` de forma resiliente y conserva cálculo determinista local si no está disponible.
- El resultado de revisión incluye `resumen_sispt_dnp`, con distribución de tipologías y clases, medias de eficacia, semáforo MDM y conteo de alertas de interoperabilidad.
- Se expuso `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento`, con `codigo_plan=TODOS` por defecto. El endpoint entrega los totales y distribuciones del evaluador; cuando el módulo aún no está instalado, devuelve el esquema de respaldo para los ocho planes y las 4,637 metas.
- Se añadió el esquema de respuesta y se registró la ruta pública en `docs/permisos-api.md` y `backend/app/core/security/access_policy.py`.
- El informe SPD incorpora `sintesis_sispt_dnp_cuipo_piip`; la síntesis participa en la huella SHA-256 y aparece en la sección SisPT del Markdown exportable.
- Se añadieron pruebas de revisión por meta, respuesta HTTP 200 del endpoint, presencia de la síntesis del informe y política pública.

## Verificación

- Ruff sobre los ocho archivos de la fase: **All checks passed!**
- `pytest tests/test_pdt_revision_por_meta.py tests/test_pdt_ai_evaluator.py tests/test_access_policy.py -q`: **136 passed**.
- No ejecuté pytest sobre el repositorio completo.

No modifiqué `src/**` ni `pdt_sispt_dnp_evaluador.py` / `test_pdt_sispt_dnp_evaluador.py`.
