# DICTAMEN DE AUDITORÍA FORENSE EAF — `[PA-TRANSPARENCIA-03]` (CIERRE DEL BLOQUE DNP)

- **Fecha:** 2026-10-14
- **Auditor:** `agy` (Coordinador General / Auditor Forense EAF)
- **Ejecutor:** `agy2` (Desarrollador Principal)
- **Commit Auditado:** `b91bba7` (`feat(seguimiento): visor publico ciudadano ley 1474 y storybook motor dnp [PA-TRANSPARENCIA-03]`)
- **Estado:** **APROBADO AL 100% — PLAN MAESTRO MOTOR DE PLAN DE ACCIÓN DNP CULMINADO**

---

## 1. Verificación Forense de Entregables (`[PA-TRANSPARENCIA-03]`)

1. **Visor Público Ciudadano del Plan de Acción DNP 2026 (`src/features/politicas/panels/rendicion-cuentas-panel.tsx`):**
   - Incorporado selector de vistas con `Button variant="unstyled" size="unstyled"`:
     - **Vista 1 (`27 Dependencias Distritales`):** conserva intacto todo el mosaico de las 27 dependencias oficiales de Cartagena, buscador y semáforos.
     - **Vista 2 (`Matriz Plan de Acción DNP 2026 (Ley 1474)` — `data-testid="tab-publico-plan-accion-dnp"`):** consume `obtenerMatrizPlanAccionApi({ vigencia: 2026 })` con fallback inmediato a `ACTIVIDADES_PA_CANONICAS`.
   - Muestra el **Sello Legal de Transparencia (`PUBLICADO EL 31 DE ENERO DE 2026 — ESTATUTO ANTICORRUPCIÓN (LEY 1474 ART. 74)`)**, el badge **Aprobado en Consejo de Gobierno (Art. 41 Ley 152 de 1994)** y los 4 KPIs consolidados (`12` actividades canónicas, `100%` verbos fuertes en infinitivo `-ar/-er/-ir`, inversión total programada discriminando Recursos Propios POAI vs. Fuentes Externas SGR/PGN/Cooperación, y `88.0%` de avance físico promedio).
   - Incluye filtros por Línea Estratégica (`Todas`, `LE-01`..`LE-08`), buscador multicriterio, tarjetas detalladas de las 12 actividades (`PA-2026-001`..`PA-2026-012`) con código `BPIM`, badge `Verbo DNP: <Verbo>`, cruce heredado de `Hoja 2 Plan_Indicativo` (Columna D Programa y Columna E Meta de Producto), avance trimestral `T1–T4` y botón directo hacia `/plataforma/seguimiento`.

2. **Cobertura Storybook WCAG 2.1 AA (`src/app/_stories/plataforma-interna.stories.tsx`) y Pruebas Unitarias (`src/features/politicas/__tests__/rendicion-cuentas-panel.test.tsx`):**
   - Historia `MotorPlanAccionDNP` exportada en `src/app/_stories/plataforma-interna.stories.tsx`, validada en `bun run ui:test` (`213 / 213` historias aprobadas con `axe-core`).
   - Suite unitaria `rendicion-cuentas-panel.test.tsx` con `7 / 7` tests aprobados y `110` aserciones.
   - Sincronización de `backend/app/modules/compromisos/models.py` con la migración `0062` (`alembic check` en `test_identidad_migracion.py` 100% limpio).

3. **Quality Gates Independientes y Censo `bd_csh`:**
   - `pytest`: **110 / 110 pruebas aprobadas** (`test_motor_plan_accion_dnp.py`, `test_access_policy.py`, `test_identidad_migracion.py`).
   - `bun test`: **601 / 601 pruebas aprobadas** (`7 / 7` en `rendicion-cuentas-panel.test.tsx`, `15 / 15` en `motor-plan-accion.test.tsx`).
   - `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`): **0 errores**.
   - `bun run ui:test`: **213 / 213 historias Storybook aprobadas con `axe-core`**.
   - `bun run build`: **192 / 192 rutas compiladas** y servicios `polis-backend` + `polis-frontend` en estado `active (running)`.
   - Censo `bd_csh` intacto: **33 mesas, 36 agendas, 11 fichas, 17 actores, 10 compromisos PAS, 12.280 hurtos y 12 actividades PA**.

---

## 2. Balance de Cierre del Plan Maestro (`PLAN_MAESTRO_MOTOR_PLAN_ACCION_DNP.md`)

| Actividad | Código | Commit | Estado |
| :--- | :--- | :---: | :---: |
| **Actividad 1:** Banco de Conocimiento DNP, Persistencia SQL (`0062`), Validador Lingüístico y Motor (`Hoja 1` + `Hoja 2`) | `[PA-BANCO-MOTOR-01]` | `7b6f2ae` | **APROBADA 100%** |
| **Actividad 2:** Procesador Masivo y Auditor por Lotes DNP (`BUSCARV` Hoja 2 → Hoja 1, exención Pág. 11, autocorrección de verbos débiles y Certificado Ley 1474) | `[PA-PROCESADOR-PUBLICO-02]` | `776c229` | **APROBADA 100%** |
| **Actividad 3:** Visor Público Ciudadano del Plan de Acción DNP 2026 (Ley 1474 Art. 74) en Home y Cobertura Storybook `axe-core` | `[PA-TRANSPARENCIA-03]` | `b91bba7` | **APROBADA 100%** |
