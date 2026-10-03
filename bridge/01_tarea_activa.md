# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA / CRÍTICA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_pas_fase1.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_pas.md`

---

## Módulo Asignado
**Fase de Plan de Acción y Seguimiento — Hito PAS-1 (Matriz de Compromisos Institucionales y Metas Cuatrienales)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_pas_fase1.md`

### Resumen de Entregables Requeridos:
1. `src/features/plataforma/models/acceso.ts` y `acceso.test.ts` (módulo `seguimiento`).
2. `src/features/plataforma/components/plataforma-sidebar.tsx` (ícono `CheckSquare`).
3. `src/app/plataforma/seguimiento/page.tsx` (ruta App Router).
4. Catálogo canónico `src/features/seguimiento/data/compromisos-pas.data.ts` con los 10 compromisos institucionales de Cartagena.
5. Vistas y componentes en `src/features/seguimiento/`:
   - `seguimiento-view.tsx`
   - `seguimiento-kpis.tsx`
   - `compromisos-tabla.tsx` (con barras de avance cromáticas y badges de estado).
   - Panel lateral Zero-Modals `compromiso-editor-panel.tsx` (registrado en `panel-store.ts` y `panel-registry.tsx`).
6. Store y pruebas: `compromisos-store.ts` y `compromisos-store.test.ts`.
7. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/seguimiento`.
8. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
9. **PASO OBLIGATORIO DE NOTIFICACIÓN**:
   `tmux send-keys -t agy "He terminado la entrega del Hito PAS-1 (Matriz de Compromisos del PAS). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
