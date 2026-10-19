# Tarea Activa — Fase `[33B]` (`agy2`, 100% Backend)

## Contexto y Restricciones Estrictas
- Lee `/root/polis/bridge/00_plan_sispt_dnp_33.md` y `/root/polis/knowledge-base/16_ESTRUCTURA_SISPT_DNP_PDT_INDICADORES_PLAN_ACCION_SEGUIMIENTO.md`.
- **100% Backend**. **PROHIBIDO tocar `src/**`**, `pdt_revision_por_meta.py`, `pdt_informe_integral_spd.py`, `router.py`, `schemas.py` o `access_policy.py` (esos archivos los edita `codex` en `[33A]`).
- No ejecutes `pytest` sobre todo el repositorio; ejecuta únicamente `/root/polis/backend/.venv/bin/pytest tests/test_pdt_sispt_dnp_evaluador.py -q`.

## Entregables Obligatorios (`[33B]`)

### 1. Crear `backend/app/modules/compromisos/pdt_sispt_dnp_evaluador.py`
Implementa el motor canónico de evaluación **`SisPT` (`https://sispt.dnp.gov.co/`) y Plan de Acción DNP** con las siguientes funciones públicas (importables por `pdt_revision_por_meta.py` y `pdt_informe_integral_spd.py`):

1. `determinar_tipologia_indicador_sispt(sentido_indicador: str | None, tipo_agregacion: str | None, unidad_medida: str | None = None, texto_meta_o_indicador: str = "") -> str`:
   - Devuelve una de las **4 tipologías oficiales `SisPT`**:
     - `"REDUCCION_BRECHA"` (si `sentido_indicador` contiene `"DESCENDENTE"` o `"REDUCCION"` o el texto indica reducir/disminuir tasa/deserción/mortalidad/homicidios/pobreza).
     - `"MANTENIMIENTO_STOCK"` (si `sentido_indicador` contiene `"MANTENIMIENTO"` o `"ESTABILIDAD"` o `tipo_agregacion` contiene `"MANTENIMIENTO"` o el texto empieza por mantener/sostener/conservar).
     - `"INCREMENTO_NO_ACUMULATIVO_CAPACIDAD"` (si es ascendente pero la unidad es porcentaje `%`, tasa, índice o puntaje y no es suma de flujo anual).
     - `"INCREMENTO_ACUMULATIVO_FLUJO"` (caso general de metas de producto acumulables por suma).

2. `calcular_eficacia_indicador_sispt(tipologia_sispt: str, linea_base: float | None, meta_programada: float | None, logro_ejecutado: float | None = None, avance_fisico_observado_pct: float | None = None) -> dict[str, Any]`:
   - Aplica la fórmula matemática exacta de `SisPT` según `tipologia_sispt`:
     - Si `avance_fisico_observado_pct is not None` y (`logro_ejecutado is None` o `meta_programada is None`): usa `eficacia_bruta_pct = float(avance_fisico_observado_pct)` como base observada, o si `meta_programada` y `logro_ejecutado` están presentes calcula por la fórmula exacta `SisPT`:
       - `INCREMENTO_ACUMULATIVO_FLUJO` y `MANTENIMIENTO_STOCK`: `(logro_ejecutado / meta_programada) * 100.0` (si `meta_programada > 0`).
       - `INCREMENTO_NO_ACUMULATIVO_CAPACIDAD`: si `linea_base is not None` y `meta_programada > linea_base` y `logro_ejecutado is not None`: `((logro_ejecutado - linea_base) / (meta_programada - linea_base)) * 100.0`; de lo contrario `(logro_ejecutado / meta_programada) * 100.0`.
       - `REDUCCION_BRECHA`: si `linea_base is not None` y `linea_base > meta_programada` y `logro_ejecutado is not None`: `((linea_base - logro_ejecutado) / (linea_base - meta_programada)) * 100.0`.
   - Si no hay ni `logro_ejecutado` ni `avance_fisico_observado_pct`, preserva `eficacia_bruta_pct = None` y `eficacia_truncada_sispt_pct = None` (nunca inventa `0.0` cuando es `None`; si el valor observado es `0.0`, devuelve `0.0`).
   - Cuando `eficacia_bruta_pct is not None`:
     - `eficacia_truncada_sispt_pct = round(min(max(eficacia_bruta_pct, 0.0), 100.0), 2)` (Regla `SISPT-R2` anti-compensación al `100%`).
     - `sobrecumplimiento_exceso_pct = round(max(eficacia_bruta_pct - 100.0, 0.0), 2)`.
     - `alerta_subestimacion_meta_sispt = bool(eficacia_bruta_pct > 120.0)`.
     - `rango_desempeno_sispt_mdm`:
       - `>= 85.0` -> `"SOBRESALIENTE"` (`semaforo = "VERDE_OSCURO"`)
       - `70.0 <= x < 85.0` -> `"SATISFACTORIO"` (`semaforo = "VERDE_CLARO"`)
       - `60.0 <= x < 70.0` -> `"MEDIO"` (`semaforo = "AMARILLO"`)
       - `40.0 <= x < 60.0` -> `"BAJO"` (`semaforo = "NARANJA"`)
       - `< 40.0` -> `"CRITICO"` (`semaforo = "ROJO"`)

3. `clasificar_meta_y_actividad_plan_accion_dnp(texto_meta: str, actividades_pa: list[dict[str, Any]] | None = None, apropiacion_definitiva_cop: float | None = None, codigo_bpin: str | None = None) -> dict[str, Any]`:
   - Clasifica la meta en una de las **3 clases del Instructivo Plan de Acción DNP**:
     - `"META_DE_PRODUCTO"`, `"META_DE_GESTION"`, `"META_ADMINISTRATIVA"`.
   - Clasifica cada actividad del Plan de Acción (o infiere de la meta si la lista viene vacía) en las **4 tipologías oficiales de actividades del DNP**:
     - `"ACTIVIDAD_NORMATIVA"` (verbos: adecuar, adoptar, expedir, modificar, reglamentar, fijar, derogar, actualizar estatuto/norma/decreto/acuerdo).
     - `"ACTIVIDAD_ADMINISTRATIVA"` (verbos: firmar, contratar, suscribir, diseñar, ajustar, adquirir, licitar, convenio, software, proceso contractual).
     - `"ACTIVIDAD_LOGISTICA"` (verbos: notificar, publicar, suministrar, verificar, instalar, organizar, disponer, dotar).
     - `"ACTIVIDAD_DE_GESTION"` (verbos: crear, identificar, gestionar, ejecutar, construir, intervenir, rehabilitar, capacitar, atender, brindar, mantener, mejorar, fortalecer, apoyar, promover, realizar, reducir, restaurar, proteger).
   - Clasifica la bolsa de financiación en las **3 bolsas del Plan de Acción DNP**:
     - `"INVERSION"` (si tiene `apropiacion_definitiva_cop > 0` o `codigo_bpin`), `"FUNCIONAMIENTO"` (si es `META_ADMINISTRATIVA`), `"RECURSOS_DE_GESTION"` (si es `META_DE_GESTION` sin apropiación presupuestal directa).
   - Devuelve `clase_meta_pa_dnp`, `bolsa_financiacion_pa_dnp`, `conteo_actividades_por_tipo_dnp` (`dict` con las 4 llaves) y `cumple_7_pasos_pa_ley_1474`.

4. `evaluar_interoperabilidad_sispt_cuipo_piip_meta(eficacia_truncada_sispt_pct: float | None, apropiacion_definitiva_cop: float | None, compromisos_rp_cop: float | None, pagos_cop: float | None, codigo_bpin: str | None, total_actividades_pa: int, clase_meta_pa_dnp: str = "META_DE_PRODUCTO") -> dict[str, Any]`:
   - Evalúa las reglas `SISPT-R3`, `SISPT-R4` y `SISPT-R5` (`Plan Indicativo ↔ Plan de Acción ↔ CUIPO ↔ PIIP`):
     - Calcula `ejecucion_financiera_cuipo_pct` (`(compromisos_rp_cop / apropiacion_definitiva_cop) * 100.0` si `apropiacion_definitiva_cop > 0`).
     - Determina `estado_coherencia_cuipo_piip`:
       - `"DESFASE_CUIPO_SIN_AVANCE_PIIP"` si `ejecucion_financiera_cuipo_pct >= 75.0` y `(eficacia_truncada_sispt_pct is not None and eficacia_truncada_sispt_pct < 40.0)`.
       - `"AVANCE_FISICO_SIN_SOPORTE_CUIPO"` si `clase_meta_pa_dnp == "META_DE_PRODUCTO"` y `(eficacia_truncada_sispt_pct is not None and eficacia_truncada_sispt_pct >= 80.0)` y `(apropiacion_definitiva_cop is None or apropiacion_definitiva_cop <= 0.0)`.
       - `"SIN_MEDICION_OBSERVADA"` si `eficacia_truncada_sispt_pct is None` y `apropiacion_definitiva_cop is None`.
       - `"COHERENTE_SISPT_CUIPO_PIIP"` en los demás casos.
     - Devuelve `trazabilidad_pi_pa_cuipo_piip_completa: bool`, `ejecucion_financiera_cuipo_pct`, `estado_coherencia_cuipo_piip`, `reglas_sispt_evaluadas` (`SISPT-R1`..`SISPT-R5`).

5. `evaluar_universo_sispt_dnp_bd_csh(codigo_plan: str | None = None) -> dict[str, Any]`:
   - Consulta en `bd_csh` (`seguimiento.pdd_metas_oficiales` JOIN `seguimiento.pdd_vinculos_meta_pa_triada`) las `4,637` metas de los 8 planes (o filtra por `codigo_plan` si no es `None`/`"TODOS"`).
   - Calcula para cada plan y para el consolidado de los 8 planes:
     - `total_metas_evaluadas`
     - `distribucion_tipologias_sispt` (conteo en las 4 tipologías)
     - `eficacia_media_bruta_pct` vs `eficacia_media_truncada_sispt_pct` y `sesgo_compensacion_eliminado_pct`
     - `distribucion_semaforo_mdm` (`SOBRESALIENTE`, `SATISFACTORIO`, `MEDIO`, `BAJO`, `CRITICO`, `SIN_MEDICION`)
     - `distribucion_clases_meta_pa_dnp` (`META_DE_PRODUCTO`, `META_DE_GESTION`, `META_ADMINISTRATIVA`)
     - `distribucion_bolsas_financiacion_pa` (`INVERSION`, `FUNCIONAMIENTO`, `RECURSOS_DE_GESTION`)
     - `resumen_interoperabilidad_cuipo_piip` (conteos de `COHERENTE_SISPT_CUIPO_PIIP`, `DESFASE_CUIPO_SIN_AVANCE_PIIP`, `AVANCE_FISICO_SIN_SOPORTE_CUIPO`, `SIN_MEDICION_OBSERVADA`)
     - `resumen_por_plan` (lista de los 8 planes con sus métricas `SisPT`).
   - Incluye fallback determinista si la BD no está disponible.

### 2. Crear `backend/tests/test_pdt_sispt_dnp_evaluador.py`
- Agrega al menos 6 pruebas unitarias y de integración con `bd_csh` que verifiquen:
  1. Las 4 fórmulas matemáticas exactas (`INCREMENTO_ACUMULATIVO_FLUJO`, `INCREMENTO_NO_ACUMULATIVO_CAPACIDAD`, `REDUCCION_BRECHA`, `MANTENIMIENTO_STOCK`).
  2. La regla `SISPT-R2` de truncamiento anti-compensación al `100%` (`eficacia_bruta_pct = 180% -> eficacia_truncada_sispt_pct = 100%`) y preservación estricta de `0.0` frente a `None`.
  3. La clasificación de las 3 clases de metas, 4 tipos de actividades del Plan de Acción DNP y 3 bolsas de financiación.
  4. Las alertas de interoperabilidad `CUIPO` + `PIIP` (`DESFASE_CUIPO_SIN_AVANCE_PIIP` y `AVANCE_FISICO_SIN_SOPORTE_CUIPO`).
  5. La evaluación real sobre las `4,637` metas de los 8 planes en `bd_csh` (`evaluar_universo_sispt_dnp_bd_csh("TODOS")`).

## Verificación y Cierre
1. Ejecuta `/root/polis/backend/.venv/bin/ruff check app/modules/compromisos/pdt_sispt_dnp_evaluador.py tests/test_pdt_sispt_dnp_evaluador.py`.
2. Ejecuta `/root/polis/backend/.venv/bin/pytest tests/test_pdt_sispt_dnp_evaluador.py -q`.
3. Documenta los resultados en `/root/polis/bridge/02_resultado_agy2.md`.
4. Notifica al coordinador:
   `tmux send-keys -t =agy:0.0 "AGY2 LISTO [33B]: Motor pdt_sispt_dnp_evaluador.py (4 formulas SisPT + truncamiento 100% + 4 tipos actividades PA + interoperabilidad CUIPO/PIIP en 4637 metas) completado y probado. Solicito auditoria EAF." Enter`
