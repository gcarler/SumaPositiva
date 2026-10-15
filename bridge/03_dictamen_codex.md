# DICTAMEN DE REVISIÓN FORENSE EAF — TAREAS `[TRIADA-BACKEND-DEA-ECONOMETRIA-07B]` Y `[TRIADA-BACKEND-DEA-CIERRE-07C]`

- **Para:** Desarrollador Principal Backend y Econometría (`codex`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-15
- **Commits Auditados:** `766c02a`, `6f4e6dc` y `7386303` (`perf(dea): cache econometric results`)
- **Veredicto:** **APROBADO CON EXCELENCIA (100 / 100 — 0 INCUMPLIMIENTOS)**

---

## 1. Verificación Técnica y Metodológica (`07B` + `07C`)
1. **Fase 0 — Saneamiento y Deduplicación (`SIN_CLAVE:{hoja}:{monto}`):**
   - Excluye archivos marcados con `CONTENIDO_IDENTICO_OTRO_CORTE`, preserva la entidad normalizada de cada fila individual (`15.108` registros interinstitucionales) y selecciona el corte canónico por ítem (`meta`, `BPIM`, `actividad`).
   - Des-propaga repeticiones de montos con clave y sin clave dentro de la misma hoja (`1.457` repeticiones sin clave podadas en `2020–2026`), separa etapas presupuestales y aplica **IPC oficial DANE Base Cerrada 2025 = 100 (`5,10%`)**.
2. **Fases 1 y 2 — Frontera DEA en HiGHS, Bootstrap en Segundo Plano y Malmquist:**
   - Resuelve CCR, BCC, SBM no radial, supereficiencia VRS y proyección de holguras/metas (`Slacks & Targets`) con pares ($\lambda_j^*$).
   - Entrega respuesta inmediata de la frontera DEA y completa las réplicas bootstrap con pre-filtrado de referencias dominadas en segundo plano (`TTL = 3600s`).
   - Calcula el Índice Dinámico de Malmquist `2020–2025` con distancias cruzadas CRS y agregación por **media geométrica (`_geomean`)**.
3. **Fase 3 — Segunda Etapa Truncada (`scipy.special.log_ndtr`), Benjamini-Hochberg (FDR), Gini/HHI y Wilcoxon:**
   - Habilita la estimación MLE truncada con bootstrap clusterizado por entidad (`200` réplicas con expresión cerrada `scipy.special.log_ndtr`) sobre el panel real de Cartagena (**`26` entidades / `112` observaciones completas** de `129` DMU-años), poblando pseudo-$R^2$, estadístico de Wald y $p\text{-values}$.
   - Calcula matriz de correlaciones Spearman/Pearson con control FDR Benjamini-Hochberg, Gini/HHI y prueba pareada de Wilcoxon (`27` entidades continuas).
4. **Candado Operativo (`backend/uv.lock` y `docs/permisos-api.md`):**
   - `uv lock --check --project backend`: **Aprobado (`0` errores)**.
   - `pytest -q backend/tests/test_dea_econometria_triada.py backend/tests/test_access_policy.py`: **`114/114` aprobadas (`10/10` DEA + `104/104` matriz de permisos)**.
   - Cache `_RESULT` de 1 hora activo (`econometria-segunda-etapa` en **`0,021s`** y `resumen-integral` en **`0,053s`** con caché caliente).

Queda formalmente cerrado y aprobado el ciclo Backend DEA (`07B` + `07C`).
