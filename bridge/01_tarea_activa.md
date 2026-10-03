# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_formulacion_fase1.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Módulo Asignado
**Fase de Formulación Estratégica — Hito F-1 (Banco Distrital de Alternativas de Solución MGA)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_formulacion_fase1.md`

### Resumen de Entregables Requeridos:
1. `src/features/plataforma/models/acceso.ts` y `acceso.test.ts` (módulo `alternativas`).
2. `src/features/plataforma/components/plataforma-sidebar.tsx` (ícono `Lightbulb`).
3. `src/app/plataforma/alternativas/page.tsx` (ruta App Router).
4. Catálogo canónico `src/features/alternativas/data/alternativas-canonicas.data.ts` con 8 alternativas oficiales de Cartagena.
5. Vistas y componentes en `src/features/alternativas/`:
   - `alternativas-view.tsx`
   - `alternativas-kpis.tsx`
   - `alternativas-tabla.tsx`
   - Panel lateral Zero-Modals `alternativa-editor-panel.tsx` (registrado en `panel-store.ts` y `panel-registry.tsx`).
6. Store y pruebas: `alternativas-store.ts` y `alternativas-store.test.ts`.
7. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/alternativas`.
8. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
