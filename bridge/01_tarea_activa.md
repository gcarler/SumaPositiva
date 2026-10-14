# TAREA ACTIVA PARA AGY2: `[PA-TRANSPARENCIA-03]`

- **Prioridad:** ALTA (Actividad 3 y cierre del Plan Maestro del Motor de Procesamiento de Planes de Acción DNP / SisPT)
- **Asignado por:** `agy` (Coordinador General / Auditor Forense EAF)
- **Estado previo:** Actividades 1 (`[PA-BANCO-MOTOR-01]`) y 2 (`[PA-PROCESADOR-PUBLICO-02]`) aprobadas al 100% en `bridge/03_dictamen_revision.md`.

---

## 1. Contexto y Objetivo

En las Actividades 1 y 2 construimos el **Banco de Conocimiento DNP**, el **Motor de Plan de Acción (`Hoja 1 Plan_Accion` + `Hoja 2 Plan_Indicativo`)**, el **Validador Lingüístico de Verbos Fuertes** y el **Procesador/Auditor por Lotes DNP** dentro de `/plataforma/seguimiento`.

Para culminar el bloque completo del **Plan Maestro del Motor de Plan de Acción DNP (`PLAN_MAESTRO_MOTOR_PLAN_ACCION_DNP.md`)**, la **Actividad 3 (`[PA-TRANSPARENCIA-03]`)** consiste en:
1. Llevar el cumplimiento del **Art. 74 de la Ley 1474 de 2011 (Estatuto Anticorrupción — Publicación Ciudadana del Plan de Acción Anual antes del 31 de enero)** directamente al **Portal Público Ciudadano (`/`)**, dentro del panel de **Rendición de Cuentas y Cumplimiento 2026** (`src/features/politicas/panels/rendicion-cuentas-panel.tsx`).
2. Incorporar cobertura de historias Storybook (`axe-core` WCAG 2.1 AA) en `src/app/_stories/plataforma-interna.stories.tsx` para el Motor de Plan de Acción DNP y el Banco de Conocimiento DNP.

---

## 2. Especificaciones Técnicas Obligatorias

### 2.1. Integración del Visor Público Ciudadano del Plan de Acción DNP 2026 en `src/features/politicas/panels/rendicion-cuentas-panel.tsx`
1. Añade en la parte superior de `RendicionCuentasPanel` un selector de vista (con `Button variant="unstyled" size="unstyled"`):
   - **Vista 1 (por defecto): `27 Dependencias Distritales`** (conserva intacto todo el buscador, semáforos y mosaico actual de las 27 dependencias para no romper ningún test existente).
   - **Vista 2: `Matriz Plan de Acción DNP 2026 (Ley 1474)`** (`data-testid="tab-publico-plan-accion-dnp"`).
2. Cuando el ciudadano active la vista **`Matriz Plan de Acción DNP 2026 (Ley 1474)`**:
   - Carga las actividades del Plan de Acción 2026 consumiendo `obtenerMatrizPlanAccion({ vigencia: 2026 })` de `@/features/seguimiento/services/plan-accion-dnp-api` (con estado inicial / fallback inmediato desde `ACTIVIDADES_PLAN_ACCION_CANONICAS` para que renderice instantáneamente sin parpadeos ni errores offline).
   - Muestra una **Tarjeta de Certificación Legal de Transparencia (Art. 74 Ley 1474 de 2011 + Art. 41 Ley 152 de 1994)**:
     - Sello: `PUBLICADO EL 31 DE ENERO DE 2026 — ESTATUTO ANTICORRUPCIÓN (LEY 1474 ART. 74)`.
     - KPIs resumidos de las 12 actividades canónicas:
       - Total Actividades Programadas (`12`)
       - Verbos Fuertes Validados DNP (`100%` en infinitivo `-ar/-er/-ir`)
       - Inversión Total Programada 2026 (suma de `total_programado_cop` en formato moneda COP, diferenciando Recursos Propios POAI Alcaldía vs. Fuentes Externas SGR/PGN/Cooperación)
       - Avance Físico Promedio Pond. (`%`)
   - Incluye un **filtro rápido por Línea Estratégica (`Todas`, `LE-01`..`LE-08`)** y buscador por texto (actividad, verbo fuerte, dependencia o código BPIM).
   - Renderiza el listado de las **12 actividades del Plan de Acción 2026** en tarjetas claras para control social ciudadano, mostrando en cada una:
     - Código de actividad (`PA-2026-001`..`PA-2026-012`), código `BPIM`, etiqueta de `Tipo de Meta` (`PRODUCTO` / `ACTIVIDAD`) y badge del **Verbo Fuerte DNP** (ej. `Verbo DNP: Implementar`, `Instalar`, `Construir`, etc.).
     - `descripcion_actividad`, `dependencia_responsable` y cruce heredado de Hoja 2 (`columna_d_programa` + `columna_e_meta_producto`).
     - Avance Trimestral (`T1`, `T2`, `T3`, `T4`), `% Avance Físico`, `% Ejecución Financiera`, `total_programado_cop` y `fuentes_financiacion`.
   - Incluye al pie un botón/enlace hacia `/plataforma/seguimiento` (*«Abrir Workbench Técnico DNP / SisPT en Plataforma»*) para que los enlaces técnicos y auditores puedan ir directamente al motor completo.

### 2.2. Pruebas Unitarias y Storybook (`axe-core`)
1. **Pruebas unitarias (`bun test`):**
   - Crea o amplía pruebas en `src/features/politicas/__tests__/rendicion-cuentas-panel.test.tsx` verificando:
     - Que `RendicionCuentasPanel` renderiza la vista por defecto de 27 dependencias.
     - Que al hacer clic en `Matriz Plan de Acción DNP 2026 (Ley 1474)` (`data-testid="tab-publico-plan-accion-dnp"`) se muestra el sello `LEY 1474 ART. 74`, las 12 actividades (`PA-2026-001`..`PA-2026-012`), sus verbos fuertes y códigos BPIM, y el filtro por Línea Estratégica.
2. **Historia Storybook (`src/app/_stories/plataforma-interna.stories.tsx`):**
   - Añade una historia exportada `MotorPlanAccionDNP` en `src/app/_stories/plataforma-interna.stories.tsx` que monte `BancoConocimientoDnpTab` y `MotorPlanAccionTab` dentro de `PlataformaShell` (con mock de `/api/v1/compromisos/plan-accion/*` en `beforeEach` si es necesario o usando sus fallbacks canónicos) y verifique con `play` que renderiza sin violaciones `axe-core` en `bun run ui:test`.

---

## 3. Quality Gates Obligatorios antes de Reportar

1. `/root/polis/venv/bin/pytest` -> **100% en verde**.
2. `bun test` -> **100% en verde**.
3. `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`) -> **0 errores**.
4. `bun run ui:test` -> **100% historias Storybook aprobadas con `axe-core`**.
5. `bun run build` -> **Build de producción exitoso** y reinicio limpio de `polis-frontend` y `polis-backend`.
6. **Censo de `bd_csh` intacto:** 33 mesas, 36 agendas, 11 fichas, 17 actores, 10 compromisos PAS, 12.280 hurtos y 12 actividades PA.
7. Commit local en `main` (**Política Zero-Push**) y reporte detallado en `bridge/02_resultado_agy2.md`.
