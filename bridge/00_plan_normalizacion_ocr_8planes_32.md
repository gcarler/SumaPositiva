# Plan Maestro — Fase `[32A]` + `[32B]`: Normalización Canónica OCR de las `4,637` Metas (8 Planes `2012–2027`) y Reconciliación Universal Tríada (`225,380` registros)

- **Fecha:** 2026-10-19
- **Coordinador / Auditor EAF:** `agy` (`=agy:0.0`)
- **Agentes Ejecutores:** `codex` (`=codex:0.0`, Fase `[32A]`) y `agy2` (`=agy2:0.0`, Fase `[32B]`)
- **Restricción Crítica:** **100% BACKEND y PostgreSQL `bd_csh` (`PROHIBIDO TOCAR src/**`).**

---

## División Estricta sin Colisión de Archivos

| Fase | Agente | Archivos Autorizados | Entregable Principal |
| :--- | :--- | :--- | :--- |
| **`[32A]`** | `codex` (`=codex:0.0`) | `backend/app/modules/compromisos/pdt_revision_por_meta.py`, `backend/app/modules/compromisos/pdt_informe_integral_spd.py`, `backend/tests/test_pdt_revision_por_meta.py`, `backend/tests/test_pdt_ai_evaluator.py`, `bridge/02_resultado_codex.md` | Extractor resiliente a llaves OCR/posicionales en `pdt_revision_por_meta.py` con soporte para los **8 planes (`2012–2027` + `PDL 1..3`)** o `TODOS`, más sección `cobertura_historica_8_planes_2012_2027` en `pdt_informe_integral_spd.py`. |
| **`[32B]`** | `agy2` (`=agy2:0.0`) | `backend/app/modules/compromisos/pdt_normalizador_canonico_metas.py` (nuevo), `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py`, `backend/scripts/poblar_vinculos_meta_pa_triada.py`, `backend/tests/test_pdt_normalizador_y_vinculos_8planes.py` (nuevo), `bridge/02_resultado_agy2.md` | Normalización canónica en BD (`seguimiento.pdd_metas_oficiales`, `4,637` metas) y expansión de `seguimiento.pdd_vinculos_meta_pa_triada` a las **`4,637` metas de los 8 planes** cruzando los 3 motores hermanos (`PLAN_DESARROLLO`, `PLAN_ACCION`, `INVERSION_PRESUPUESTAL`) de `seguimiento.registros_triada_normalizados` (`225,380` filas). |
