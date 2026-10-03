# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_modulo_actores.md`

---

## Módulo Asignado
**Módulo de Mapeo y Caracterización de Actores (`/plataforma/actores`)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_modulo_actores.md`

### Resumen de Entregables Requeridos:
1. `src/features/plataforma/models/acceso.ts` y `acceso.test.ts` (módulo `actores` con permisos RBAC).
2. `src/features/plataforma/components/plataforma-sidebar.tsx` (icono `Users`).
3. `src/app/plataforma/actores/page.tsx` (ruta en App Router).
4. `src/features/actores/models/actor.ts`, `data/actores-iniciales.data.ts`, `state/actores-store.ts`.
5. `src/features/plataforma/views/actores-view.tsx`, `components/actores-kpis.tsx`, `components/actores-matriz.tsx` (Matriz 2x2 Poder vs Interés), `components/actores-datagrid.tsx`.
6. Panel Zero-Modals `actor-editor` en `src/features/actores/panels/actor-editor-panel.tsx` registrado en `panel-registry.tsx` y `panel-store.ts`.
7. Suite de pruebas: `acceso.test.ts` y `actores-store.test.ts`.
8. Verificación de calidad: `bun run check`, `node scripts/ui-policy.mjs`, `bun run build`, reinicio supervisado de `polis-frontend.service` y HTTP 200 en `/plataforma/actores`.
9. Informe formal en `bridge/02_entrega_agy2.md` y commit formal en git.
