# Dictamen Forense EAF — `[TRIADA-BACKEND-DEA-PDD-08]`

- **Fecha:** 2026-10-15
- **Auditor:** `agy` (Coordinador General y Auditor Forense EAF)
- **Auditado:** `codex` (Desarrollador Principal Backend / Econometría)
- **Commit auditado:** `095c3b40703d1318091556135ba3c37ab866bd8d` (`feat(compromisos): add PDD DEA analysis endpoints`)
- **Calificación Global EAF:** **100 / 100 — APROBADO SIN OBSERVACIONES PENDIENTES**

## 1. Verificación de Entregables y Contratos

1. **Servicio DEA y Evaluación de Planes de Desarrollo (`backend/app/modules/compromisos/pdd_dea_service.py`):**
   - Catálogo normativo y conciliación del **Plan Plurianual de Inversiones (PPI)** de los 5 Planes de Desarrollo de Cartagena (`PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`) + los 3 Planes de Desarrollo Local (`PDL_2024_2027_L1`, `PDL_2024_2027_L2`, `PDL_2024_2027_L3`) en `/root/polis/data/planes_desarrollo/`.
   - Conciliación explícita entre el techo oficial del Acuerdo 139 de 2024 (`$12.800.853.474.855` COP corrientes) y del P.A. 016 de 2020 (`$6.022.982.600.000` COP constantes dic-2019) frente a los montos reconstruidos en `bd_csh`, con conversión a pesos constantes base 2025 (serie IPC DANE).
   - Evaluación de cumplimiento de metas (`cumplimiento-metas`) con deduplicación por `(entidad, vigencia, meta)` y control de escalas de avance (`0-1` vs `0-100`).
   - Frontera de eficiencia no paramétrica DEA (`frontera-dea-pdd`) mediante programación lineal exacta (`scipy.optimize.linprog(method='highs')`) para **CCR**, **BCC** y **SBM** sobre `PDD_2016_2019` (`n=21`), `PDD_2020_2023` (`n=27`) y `PDD_2024_2027` (`n=29`).
   - Econometría comparada (`econometria-comparada-pdd`) con índices de concentración Gini y Herfindahl-Hirschman (HHI), correlaciones de Pearson y Spearman con corrección FDR Benjamini-Hochberg (`n=1.580`), pruebas pareadas de Wilcoxon entre planes y variación inter-plan.
   - Lectura SQL paginada por cursor asíncrono para respetar el `command_timeout=3s` de `asyncpg` y caché compartida `_RESULT` (`TTL=3600s`).
2. **Router, Permisos y Suite de Pruebas:**
   - 5 endpoints registrados en `backend/app/modules/compromisos/router.py` bajo `/api/v1/compromisos/triada/pdd-dea/*` y documentados en `docs/permisos-api.md`.
   - `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_pdd_dea_triada.py backend/tests/test_access_policy.py`: **`120 passed in 34.72s`**.
   - `/root/polis/venv/bin/ruff check`: **`All checks passed!`**.
3. **Verificación HTTP en Vivo (`127.0.0.1:8000`):**
   - `GET /api/v1/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi`: `HTTP 200` (`0.011s` en caché).
   - `GET /api/v1/compromisos/triada/pdd-dea/cumplimiento-metas`: `HTTP 200` (`0.513s`).
   - `GET /api/v1/compromisos/triada/pdd-dea/frontera-dea-pdd`: `HTTP 200` (`0.039s`).
   - `GET /api/v1/compromisos/triada/pdd-dea/econometria-comparada-pdd`: `HTTP 200` (`0.009s`).
   - `GET /api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo`: `HTTP 200` (`0.102s`).
4. **Inviolabilidad de `bd_csh`:**
   - Se preservan intactos los `217.740` registros normalizados y los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).
