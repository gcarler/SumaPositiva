# Orden de Trabajo EAF (`=agy:0.0`) para `agy2` (`=agy2:0.0`) — Fase `[28B]` (100% BACKEND)

**Estado de `[27B]`:** **APROBADO** en `/root/polis/bridge/03_dictamen_revision.md`.

**RESTRICCIÓN ABSOLUTA DE ALCANCE:**
- **100% BACKEND (`backend/app/modules/compromisos/service.py`, `backend/app/modules/compromisos/pdt_revision_por_meta.py`, `backend/tests/test_motor_plan_accion_dnp.py`, `backend/tests/test_pdt_revision_por_meta.py`, `revision_motores_18_10_2026.md`).**
- **PROHIBIDO TOCAR `src/**` (Frontend) bajo ninguna circunstancia.**
- **PROHIBIDO TOCAR `agentes_inteligentes_pdd.py`, `pdd_dea_service.py`, `test_agentes_inteligentes_pdd.py` o `test_pdd_dea_triada.py`** (esos archivos están asignados en paralelo a `codex` en la Fase `[28A]`).

---

## Objetivo de la Fase `[28B]` (`agy2`)
Implementar las mejoras estructurales de la **Sección 4.2** y el cierre documental de `/root/polis/revision_motores_18_10_2026.md`:

### 1. Validación Aritmética Trimestral (`T1–T4`), Sentido del Indicador y Línea Base vs. Meta en `service.py` (Sección 4.2)
- En `backend/app/modules/compromisos/service.py` (donde residen las funciones del motor de validación DNP/MGA/CREMA de Planes de Acción, probadas en `backend/tests/test_motor_plan_accion_dnp.py`):
  1. Crea una función pública determinista `auditar_consistencia_serie_y_sentido_indicador(registro: dict[str, Any]) -> dict[str, Any]` (e intégrala de forma 100% retrocompatible en el flujo de validación / procesamiento de Plan de Acción en `service.py`) que audite:
     - **`sentido_indicador`**: Clasifica en `"ASCENDENTE"`, `"DESCENDENTE"` o `"MANTENIMIENTO"` a partir del texto del indicador, meta o actividad (`reducir`, `disminuir`, `mortalidad`, `deserción`, `pobreza`, `homicidios`, `embarazo adolescente`, `deforestación` -> `DESCENDENTE`; `mantener`, `conservar`, `sostener` -> `MANTENIMIENTO`; por defecto `ASCENDENTE`).
     - **`consistencia_trimestral_t1_t4`**:
       - Extrae `avance_t1`, `avance_t2`, `avance_t3`, `avance_t4`, `meta_valor_vigencia` y `porcentaje_avance_fisico` preservando estrictamente `0.0` observado (`is not None`) separado de `None`.
       - Calcula `trimestres_reportados_count`, `trimestres_en_cero_observado_count`, `suma_trimestral` y `max_trimestral`.
       - Detecta y marca `inconsistencia_aritmetica_trimestral: bool` y `detalle_inconsistencia_trimestral` cuando:
         - Todos los trimestres reportados son `0.0` pero `porcentaje_avance_fisico > 0.0` (avance porcentual sin respaldo en cortes trimestrales), o
         - `suma_trimestral > 0` y `meta_valor_vigencia > 0`, pero `porcentaje_avance_fisico == 0.0`, o
         - `porcentaje_avance_fisico > 100.0` sin nota de sobrecumplimiento.
     - **`evaluacion_linea_base_vs_meta`**:
       - Si existen `linea_base` y `meta_cuatrienio` (o `meta_valor_vigencia`), evalúa si la meta es consistente con el `sentido_indicador`:
         - Marca `meta_regresiva: True` cuando `sentido_indicador == "ASCENDENTE"` y `meta < linea_base` (en indicadores acumulativos/de nivel) o cuando `sentido_indicador == "DESCENDENTE"` y `meta > linea_base`.
     - **`formula_documental_explicita`**:
       - Verifica si un indicador expresado en porcentaje/tasa/índice explicita numerador/denominador o referencia metodológica.

### 2. Integración en `pdt_revision_por_meta.py`
- Importa e invoca `auditar_consistencia_serie_y_sentido_indicador` dentro de `backend/app/modules/compromisos/pdt_revision_por_meta.py` para enriquecer:
  - `dim_2_formulacion` (incluyendo `sentido_indicador_detectado`, `meta_regresiva`, `formula_documental_explicita`),
  - `dim_6_ejecucion_fisica` (incluyendo `consistencia_trimestral_t1_t4` sobre las actividades del Plan de Acción vinculadas a la meta), y
  - `revisor_formulacion` / `conciliador_ejecucion` (generando hallazgo canónico si se detecta `inconsistencia_aritmetica_trimestral` o `meta_regresiva`).

### 3. Cierre Documental en `revision_motores_18_10_2026.md`
- Añade al final de `/root/polis/revision_motores_18_10_2026.md` la **Sección 9: Estado de Implementación y Verificación EAF (`Fases [25A]–[28B]`)**, documentando con precisión técnica cómo quedaron implementados y probados los hallazgos `H1–H12`, la Matriz de 10 Dimensiones y 7 Revisores (`pdt_revision_por_meta.py`), el Modelo Hoshin Kanri (`pdt_hoshin_kanri.py`), y las mejoras estructurales de las Secciones 4.1, 4.2 y 4.4.

### 4. Pruebas y Reporte (`ruff` + `pytest`)
- Añade pruebas unitarias en `backend/tests/test_motor_plan_accion_dnp.py` y `backend/tests/test_pdt_revision_por_meta.py` validando `auditar_consistencia_serie_y_sentido_indicador` (casos `ASCENDENTE`, `DESCENDENTE`, `meta_regresiva`, e `inconsistencia_aritmetica_trimestral` con `0.0` preservado).
- Pasa `ruff check` y `pytest` sobre ambos archivos.
- Escribe el reporte en `/root/polis/bridge/02_resultado_agy2.md` y notifica a `=agy:0.0`:
  `tmux send-keys -t =agy:0.0 "AGY2 LISTO [28B]: Auditoria aritmetica T1-T4, sentido de indicador y meta regresiva en service.py + pdt_revision_por_meta.py + Seccion 9 de revision_motores_18_10_2026.md completados y probados. Solicito auditoria EAF." Enter`
