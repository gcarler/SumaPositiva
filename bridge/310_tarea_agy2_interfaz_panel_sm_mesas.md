# Encargo 310 — Subtarea AGY2: Panel Administrativo SM Core e Integración con Mesas (308)

**Asignado a:** `agy2` (`agy2:0`)  
**Fecha:** 2026-11-07  
**Rama/Base:** `main` (workspace frontend `src/`)  
**Coordinación:** Antigravity  

---

## 1. Contexto y Objetivos

Con el núcleo SM Core y sus endpoints administrativos autenticados (`/api/v1/sm/*`), se requiere que la interfaz de administración de POLIS cuente con visibilidad operativa y que el motor de Mesas de Trabajo (Encargo 308) se enlace con la capacidad de notificación institucional:

1. **Panel Operativo SM Core (`src/features/sm/` o dentro de Administración/Notificaciones)**:
   - Componente visual `SMPanelOperativo`:
     - Tarjetas KPI: Pendientes, Enviados, Fallidos, Agotados, Canales Vivos.
     - Indicador de estado de salud general (`SALUDABLE`, `DEGRADADO`, `CRITICO`) y por canal según `/api/v1/sm/health`.
     - Tabla paginada de mensajes recientes (`/api/v1/sm/messages`) mostrando ID, canal (badge con icono o color), estado, fecha y hash de contacto truncado con etiqueta de privacidad Ley 1581 (sin exponer PII).
     - Botón de acción administrativa: "Ejecutar ronda de outbox" (`POST /api/v1/sm/worker/run-once`) con retroalimentación inmediata (procesados, enviados, fallidos).
   - Cliente API tipado en TypeScript: `src/features/sm/api/sm-api.ts`.
   - Store Zustand o hook React Query / SWR / Fetch nativo respetando patrones de POLIS.

2. **Integración con Mesas de Trabajo (Encargo 308)**:
   - En el panel de mesas (`src/features/mesas/panels/mesa-panel.tsx` o subcomponentes `mesa-compromisos-tabla.tsx` y `mesa-logistica-panel.tsx`):
     - Botón / acción: "Notificar convocatoria a participantes" disparando el evento correspondiente.
     - En la tabla de compromisos, acción: "Notificar asignación a responsable" informando por canal habilitado.
     - Diálogo o banner accesible de confirmación informando que la notificación se encoló con hash forense.

3. **Pruebas y Quality Gates**:
   - Pruebas unitarias de componentes con `bun test` en `src/features/sm/`.
   - 0 violaciones de `node scripts/ui-policy.mjs`.
   - `tsc --noEmit` con 0 errores de tipado.
   - `eslint .` con 0 advertencias y 0 errores.

---

## 2. Reglas de Trabajo

- Usar exclusivamente tokens y componentes canónicos de `@/shared/ui`.
- Cero commits directos y cero push; congelar cambios y documentar en `bridge/310_entrega_agy2_sm_panel_mesas.md`.
