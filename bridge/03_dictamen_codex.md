# Dictamen de Auditoría Forense EAF — `[ARCH-CONSOLIDACION-01]`

- **Para:** Desarrollador de Consolidación de Arquitectura (`codex`)
- **De:** Coordinador General / Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-14
- **Commits Auditados:** `6b956ab` (`refactor(architecture): consolidate POLIS scaffold`) y `436964a` (`docs(bridge): report architecture consolidation EDD`)
- **Estado del Dictamen:** ✅ **APROBADO AL 100% EN SU ALCANCE ESTRUCTURAL Y FRONTEND/COMPOSICIÓN (DICTAMEN FAVORABLE EAF)**

---

## 1. Verificación Forense Independiente de los 5 Ajustes Obligatorios

Se ejecutó auditoría independiente sobre el árbol de código y las herramientas de verificación del repositorio:

1. **Ajuste 1 — Reactivación de ESLint global sin exclusiones de features (`APROBADO`):**
   - En [eslint.config.mjs](file:///root/polis/eslint.config.mjs) se eliminaron las exclusiones de `src/features/noticias/**` y `src/features/testimonios/**`, se limpiaron los imports sin uso en ambos módulos y se añadió la regla `no-restricted-imports` sobre `src/core/**/*.{ts,tsx}` para impedir dependencias hacia `@/features/*` y `@/app/*`.
   - Verificado con `bun run check` (`node scripts/ui-policy.mjs && tsc --noEmit && eslint .`): **0 errores**.

2. **Ajuste 2 — Retiro integral del scaffold Prisma y blindaje `UI009` (`APROBADO CON MÉRITO ADICIONAL`):**
   - Eliminados `prisma/schema.prisma`, `src/core/database/legacy-prisma.ts`, dependencias `@prisma/client` / `prisma` y scripts `db:*` en [package.json](file:///root/polis/package.json).
   - Adicionalmente, `codex` identificó y erradicó el uso residual de SQLite/Prisma en `.zscripts/build.sh`, `.zscripts/dev.sh`, `.zscripts/start.sh`, `.zscripts/database-runtime-build.sh` y `tests/database-runtime-build.sh`.
   - Incorporada la regla `UI009` en [scripts/ui-policy.mjs](file:///root/polis/scripts/ui-policy.mjs) y validada con `bun run ui:policy:test` ([scripts/ui-policy.test.mjs](file:///root/polis/scripts/ui-policy.test.mjs)): **10 / 10 pruebas aprobadas**.

3. **Ajuste 3 — Desacople de `panel-store.ts`, contratos de composición y ADR 0001 (`APROBADO`):**
   - [src/core/panels/panel-store.ts](file:///root/polis/src/core/panels/panel-store.ts) quedó reducido a 88 líneas de infraestructura genérica pura con la interfaz abierta `PanelPropsRegistry`.
   - [src/app/_composition/panel-contracts.d.ts](file:///root/polis/src/app/_composition/panel-contracts.d.ts) centraliza los contratos mediante module augmentation (incluyendo `vistaInicial?: "dependencias" | "plan_accion_dnp"` en `rendicion-cuentas`).
   - [src/app/_composition/panel-registry.tsx](file:///root/polis/src/app/_composition/panel-registry.tsx) valida exhaustivamente el mapa con `satisfies PanelComponentRegistry` y encapsula el único cast dinámico en `resolvePanelComponent`.
   - Documentado en [docs/adr/0001-desacople-panel-store.md](file:///root/polis/docs/adr/0001-desacople-panel-store.md) y probado en [src/core/panels/panel-store.test.ts](file:///root/polis/src/core/panels/panel-store.test.ts) (**2 / 2 PASS**).

4. **Ajuste 4 — Inclusión de `bun test` y `ui:policy:test` en CI (`APROBADO`):**
   - [.github/workflows/check.yml](file:///root/polis/.github/workflows/check.yml) ejecuta `bun run check`, `bun run ui:policy:test` y `bun test` antes del build y de `bun run ui:test`.

5. **Ajuste 5 — Sincronización de Alembic (`0062`), CSP real y Matriz de Trazabilidad Honesta (`APROBADO`):**
   - [docs/arquitectura.md](file:///root/polis/docs/arquitectura.md), [docs/plan-trabajo.md](file:///root/polis/docs/plan-trabajo.md), [docs/plan-consolidacion-arquitectura.md](file:///root/polis/docs/plan-consolidacion-arquitectura.md) y [docs/matriz-trazabilidad-modulos.md](file:///root/polis/docs/matriz-trazabilidad-modulos.md) reflejan con rigor el head real de Alembic (`0062_motor_plan_accion_dnp`), el estado real de CSP en código (`Report-Only` por defecto, enforcement configurable) y el censo exacto verificado:
     - **21 directorios** en `src/features/`.
     - **22 llamadas `include_router`** en `backend/app/api/router.py`.
     - **3 módulos backend con `router.py` no montados** en el ensamblador raíz (`actores`, `alternativas`, `fuentes`), dejados explícitamente identificados como hallazgo real.

---

## 2. Verificación de Integridad de Datos y Coexistencia

- **Coexistencia con `agy2` (`[GEO-UX-SCROLL-01]`):** Respetada al 100%. El commit `1707f67` de `agy2` se preservó intacto como ancestro en `main`.
- **Censo de Base de Datos Canónica (`bd_csh`):** Verificado tras la ejecución de `codex`:
  - `mesas_trabajo.mesas`: **33**
  - `mesas_trabajo.agendas`: **36**
  - `indicadores.fichas_tecnicas_indicadores`: **11**
  - `participacion_ciudadana.actores_estrategicos`: **17**
  - `seguimiento.compromisos_pas`: **10**
  - `seguimiento.actividades_plan_accion`: **12**
  - `geodatos.estadisticas_hurtos`: **12.280**

---

## 3. Deuda Técnica Registrada para Siguiente Iteración Backend

Se valida y respalda la decisión de `codex` de **no ejecutar un reformateo masivo fuera de alcance** en `backend/` durante esta tarea:
1. **Higiene Ruff en `backend/`:** `ruff check backend` (840 hallazgos) y `ruff format --check backend` (110 archivos) deben abordarse en una tarea dedicada exclusivamente a higiene de lint Python (`[BACKEND-RUFF-HYGIENE-01]`) para no contaminar diffs funcionales.
2. **Montaje de routers `actores`, `alternativas` y `fuentes` en `backend/app/api/router.py`:** Registrado en la matriz de trazabilidad para conectarse en la tarea específica de persistencia de esos 3 módulos.

---

## 4. Conclusión

Se emite **DICTAMEN FAVORABLE EAF** para la entrega de `codex` en **`[ARCH-CONSOLIDACION-01]`**.
