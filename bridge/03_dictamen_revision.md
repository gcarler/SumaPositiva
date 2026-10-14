# DICTAMEN DE AUDITORÍA FORENSE EAF — PAQUETE TRIPLE [FASES-CICLO-01] + [LINEAS-APORTES-01] + [NAV-RETORNO-01]
## ESTADO REAL DEL CICLO DE POLÍTICA PÚBLICA, RECONEXIÓN DE APORTES EN LAS 8 LÍNEAS ESTRATÉGICAS Y NAVEGACIÓN DE RETORNO EN RUTAS PÚBLICAS

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Commit Auditado:** `3c3c909` (`feat(politicas): cierre del ciclo de fases, reconexion de aportes y navegacion de retorno [FASES-CICLO-01][LINEAS-APORTES-01][NAV-RETORNO-01]`)
**Estado del Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## 1. Verificación Forense de Entregables

1. **`[FASES-CICLO-01]` — Ciclo de Formulación de la Política Pública (Home y Backend):**
   - Verificado en vivo en `GET http://127.0.0.1:8000/api/v1/politicas/fases` y `GET http://127.0.0.1:8000/api/v1/politicas`:
     - `FASE_1_DIAGNOSTICO` (Orden 1): `estado = "activa"`, `progreso_porcentaje = "15.00"`.
     - `FASE_2_FORMULACION` (Orden 2): `estado = "preparatoria"`, `progreso_porcentaje = "0.00"`.
     - `FASE_3_PLAN_ACCION` (Orden 3): `estado = "preparatoria"`, `progreso_porcentaje = "0.00"`.
   - En `src/features/politicas/views/inicio-view.tsx` (`#fases-politica`), la Fase 01 se muestra **"En curso"** con barra al **15%**, y las Fases 02 y 03 se muestran **"Próxima · Sin iniciar"** con avance del **0%**.

2. **`[LINEAS-APORTES-01]` — Reconexión de «Ver aportes» y «Aportar a esta línea» en las 8 Líneas Estratégicas:**
   - Implementada resolución híbrida resiliente (Zustand store + TanStack Query `useLineas()`, `useFases()`, `usePoliticas()`) en `LineaPanel`, `FasePanel`, `PoliticaPanel` y `AporteEditorPanel`, con estado `Skeleton` mientras carga la consulta inicial.
   - `ExplorarView` (`src/features/politicas/views/explorar-view.tsx`) corregido para despachar `politicaPrincipal?.id ?? "pol-001"` y mostrar el conteo real de aportes radicados (`aportes_count`) desde PostgreSQL.

3. **`[NAV-RETORNO-01]` — Navegación de Retorno en `/asistencia/[mesaId]` y `/f/[slug]`:**
   - En `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`: marca institucional clicable hacia `/`, botón **«← Volver al inicio»** en el `<header>`, barra superior de retorno **«← Volver a la plataforma POLIS»** sobre la ficha de la mesa y enlace de regreso en el `<footer>`.
   - En `src/features/formularios/views/formulario-publico-view.tsx`: marca clicable hacia `/` y botón **«← Volver al inicio»** en el `<header>`.

---

## 2. Certificación Independiente de Calidad y Censo

- **Pruebas Backend (`pytest`):** `528 / 528 pasadas` (`7 / 7` en `test_politicas_catalogo.py` y `test_aud05_gating_fases.py`).
- **Pruebas Unitarias Nuevas (`bun test`):** `6 / 6 pasadas` en `linea-panel.test.tsx`, `asistencia-cliente.test.tsx` y `formulario-publico-view.test.tsx` (`572 / 572` en la suite global).
- **Quality Gates (`bun run ui:check` + `tsc --noEmit` + `eslint .`):** `0 errores`.
- **Storybook (`bun run ui:test`):** `212 / 212 historias pasadas` con `axe-core`.
- **Servicios y Censo `bd_csh`:** `polis-backend` y `polis-frontend` activos (`HTTP 200 OK` en `/`, `/asistencia/mt-l01-01` y `/f/reporte-inseguridad`). Censo intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores).

Queda aprobado el paquete triple. Procede de inmediato con la **Tarea #5 (`[GEO-GESTOR-01]`)** especificada en `bridge/01_tarea_activa.md`.
