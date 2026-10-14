# TAREA ACTIVA PARA CODEX: `[ARCH-CONSOLIDACION-01]`
## EJECUCIÓN DEL PLAN DE CONSOLIDACIÓN DE ARQUITECTURA CON LOS AJUSTES DEL DICTAMEN FORENSE EAF

- **Asignado por:** `agy` (Coordinador General / Auditor Forense EAF)
- **Responsable de ejecución:** `codex` (Sesión `tmux` `codex:0.0`)
- **Fecha:** 2026-10-14
- **Documento base:** `docs/plan-consolidacion-arquitectura.md`
- **Archivo de reporte de entrega de Codex:** `bridge/02_entrega_codex.md`

---

## 1. Dictamen Forense EAF y Ajustes Obligatorios Incorporados al Plan

El plan en `docs/plan-consolidacion-arquitectura.md` ha sido **APROBADO CON 5 AJUSTES OBLIGATORIOS** tras contrastarlo contra la evidencia real del repositorio. Debes primero **incorporar estos 5 ajustes en `docs/plan-consolidacion-arquitectura.md`** y a continuación **ejecutar el plan consolidado**:

### Ajuste 1 — `eslint.config.mjs` ignora silenciosamente `noticias` y `testimonios`
- **Evidencia:** En `eslint.config.mjs` (líneas 67–68), el arreglo `ignores` excluye `"src/features/noticias/**"` y `"src/features/testimonios/**"`.
- **Acción obligatoria:** Retirar esas dos exclusiones de `eslint.config.mjs` y corregir cualquier warning/error de lint en `src/features/noticias/**` y `src/features/testimonios/**` para que `bun run check` (`eslint .`) audite realmente el 100% de `src/features/`.

### Ajuste 2 — Retiro directo de Prisma en Fase 3 (Evidencia concluyente de código muerto)
- **Evidencia:**
  - `prisma/schema.prisma` apunta a `sqlite` con modelos de plantilla `User` y `Post` (`cuid()`), sin relación alguna con PostgreSQL/PostGIS ni con `bd_csh`.
  - Ningún archivo de `src/`, `backend/`, `scripts/` o `.github/` importa `src/core/database/legacy-prisma.ts` ni `@prisma/client`.
  - `package.json` conserva scripts peligrosos (`"db:push": "prisma db push --accept-data-loss"`, `"db:reset": "prisma migrate reset"`).
- **Acción obligatoria (Fase 3 inmediata):**
  - Eliminar `src/core/database/legacy-prisma.ts` y `prisma/schema.prisma` (y el directorio `prisma/`).
  - Retirar `@prisma/client` y `prisma` de `package.json`, así como los scripts `db:push`, `db:generate`, `db:migrate` y `db:reset`.
  - Actualizar `docs/arquitectura.md` para reflejar que los restos de Prisma ya fueron retirados.
  - Añadir una comprobación en `scripts/ui-policy.mjs` (y su test en `scripts/ui-policy.test.mjs`) que prohíba importar `@prisma/client` o reintroducir `legacy-prisma`.

### Ajuste 3 — Desacople real de `src/core/panels/panel-store.ts` y eliminación de los 45 casts inseguros en `src/app/_composition/panel-registry.tsx` (Fase 2)
- **Evidencia:**
  - `src/core/panels/panel-store.ts` (líneas 12–186) incrustaba inline los 45 nombres de paneles y DTOs de negocio (`PanelPropsMap`, incluyendo estructuras de 23 líneas como `"validacion-mga"`).
  - En `src/app/_composition/panel-registry.tsx` (líneas 191–240), las 45 entradas usan `as ComponentType<PanelComponentProps>`, silenciando divergencias reales entre `PanelPropsMap[K]` y las props del componente (por ejemplo, `RendicionCuentasPanel` acepta `{ dependenciaId?: string; vistaInicial?: "dependencias" | "plan_accion_dnp" }` mientras que `PanelPropsMap["rendicion-cuentas"]` solo tenía `{ dependenciaId?: string }`).
- **Acción obligatoria (Fase 2):**
  1. Redactar un ADR corto en `docs/adr/0001-desacople-panel-store.md`.
  2. En `src/core/panels/panel-store.ts`, dejar únicamente la infraestructura genérica de la pila de paneles y una interfaz abierta `export interface PanelPropsRegistry {}` (o contrato genérico registrable por aumentación de módulos), sin ningún nombre ni DTO de negocio en `src/core/`.
  3. Mover las declaraciones de contratos de paneles de dominio (`PanelPropsMap` / `declare module "@/core/panels/panel-store"`) a un módulo de contratos de composición (ej. `src/core/panels/panel-types.d.ts` o `src/app/_composition/panel-contracts.ts` + aumentación de tipos) respetando las reglas de `scripts/ui-policy.mjs` (`UI004`: `core` no importa `features` ni `app`).
  4. En `src/app/_composition/panel-registry.tsx`, alinear las props de todos los paneles registrados (incluido `rendicion-cuentas`) y reemplazar los casts inseguros o verificar mediante un helper tipado que cada clave `K extends PanelType` coincida con las props de su componente.

### Ajuste 4 — Incorporar `bun test` en `.github/workflows/check.yml` y en la Validación EDD (Fase 6)
- **Evidencia:** `.github/workflows/check.yml` no ejecutaba `bun test` (las >600 pruebas unitarias de frontend).
- **Acción obligatoria:** Añadir el paso `- run: bun test` en `.github/workflows/check.yml` y en la lista de validación de `docs/plan-consolidacion-arquitectura.md`.

### Ajuste 5 — Cobertura completa de los 23 módulos backend y 23 features frontend hasta la migración `0062` (Fases 1, 4 y 5)
- **Evidencia:**
  - `docs/arquitectura.md` solo listaba 11 módulos backend, omitiendo 11 routers activos en `backend/app/api/router.py` (`auditoria`, `compromisos`, `formularios`, `noticias`, `participacion`, `testimonios`, `comunicaciones`, `notificaciones`, `canales`, `seguridad`, `health`).
  - `docs/plan-trabajo.md` se detuvo en la migración `0025`, mientras la cabeza actual de Alembic es `0062_motor_plan_accion_dnp` (incluyendo `0061_estadisticas_hurtos_siedco` y `0062_motor_plan_accion_dnp`).
  - En la Tarea 4.7 (fallbacks), se debe distinguir entre **mutaciones** (donde ningún fallo de API puede fingir éxito local) y **consultas/lecturas** (donde los catálogos semilla canónicos permiten que el prerenderizado SSG de las 192 rutas y las 213 historias de Storybook funcionen sin backend vivo).

---

## 2. Reglas Operativas y de Coexistencia (MUY IMPORTANTE)

1. **Inviolabilidad de `bd_csh`:** PROHIBIDO alterar, truncar o ejecutar pruebas destructivas contra `bd_csh`. Toda prueba de integración/migración backend debe usar exclusivamente una base de datos aislada `polis_test*` vía `POLIS_TEST_DATABASE_URL`.
2. **Coexistencia con `agy2`:**
   - El agente `agy2` está trabajando simultáneamente en archivos de `src/features/geovisor/*`, `src/app/geovisor/page.tsx` y reporta en `bridge/01_tarea_activa.md` / `bridge/02_resultado_agy2.md`.
   - **NO modifiques ni reviertas cambios en `src/features/geovisor/*`, `src/app/geovisor/page.tsx`, `bridge/01_tarea_activa.md`, `bridge/02_resultado_agy2.md` ni `bridge/03_dictamen_revision.md`.**
   - Tu archivo exclusivo de entrega es **`bridge/02_entrega_codex.md`**.
3. **Política Zero-Push:** Realiza commits locales atómicos y limpios en la rama `main` (solo agregando con `git add <archivos>` los archivos de tu alcance para no interferir con `agy2`). Nunca ejecutes `git push`, `git reset --hard` ni `git checkout -- .`.

---

## 3. Entregables Esperados de Codex

1. **`docs/plan-consolidacion-arquitectura.md`** actualizado con los 5 ajustes del dictamen EAF.
2. **Fase 0 y Fase 1:** Documento versionado **`docs/matriz-trazabilidad-modulos.md`** con el inventario real de las 23 features de `src/features/`, los 23 routers de `backend/app/api/router.py`, cabeza Alembic `0062_motor_plan_accion_dnp`, estado de conexión (`persistente verificado`, `parcial`, `solo lectura`, etc.) y referencia a `docs/permisos-api.md`.
3. **Fase 3 (Retiro de Prisma):** Eliminación de `src/core/database/legacy-prisma.ts`, `prisma/schema.prisma`, dependencias/scripts Prisma en `package.json`, guarda en `scripts/ui-policy.mjs` (+ test en `scripts/ui-policy.test.mjs`) y actualización de `docs/arquitectura.md`.
4. **Fase 2 (Desacople de `panel-store.ts`):**
   - `docs/adr/0001-desacople-panel-store.md`
   - `src/core/panels/panel-store.ts` libre de nombres y DTOs de negocio.
   - Contratos de paneles por dominio ensamblados sin violar `UI004` y tipado verificado en `src/app/_composition/panel-registry.tsx`.
5. **Rehabilitación de ESLint y CI:**
   - `eslint.config.mjs` sin los `ignores` de `src/features/noticias/**` ni `src/features/testimonios/**`, con `0` errores en `bun run check`.
   - `.github/workflows/check.yml` actualizado incluyendo `bun test`.
6. **Fase 5 y 6 (Alineación documental y verificación):**
   - `docs/arquitectura.md` actualizado con los 23 módulos de `backend/app/api/router.py`, estado real de CSP en `next.config.ts` (`Report-Only` por defecto, conmutable con `POLIS_CSP_ENFORCE=true`) y cabeza Alembic `0062_motor_plan_accion_dnp`.
   - Ejecución de todos los quality gates (`bun run check`, `bun run ui:policy:test`, `bun test`, `pytest` en base `polis_test*`) y reporte completo con hashes de commit y evidencias en **`bridge/02_entrega_codex.md`**.
   - Al terminar, envía notificación a `agy` ejecutando:
     `tmux send-keys -t "=agy:0.0" "Hola agy. Soy codex. He completado la ejecucion de [ARCH-CONSOLIDACION-01] y deje el informe detallado en bridge/02_entrega_codex.md. Por favor procede con tu auditoria EAF." Enter`
