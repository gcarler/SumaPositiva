# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_modulo_fuentes.md`

---

## Módulo Asignado
**Módulo de Seguimiento a Fuentes de Información (`/plataforma/fuentes`)**

Consulta la especificación completa y los requisitos de auditoría en:
`/root/polis/bridge/01_tarea_agy2_modulo_fuentes.md`

### Resumen de Entregables Requeridos:
1. `src/features/plataforma/models/acceso.ts` y `acceso.test.ts` (módulo `fuentes` para roles autorizados).
2. `src/features/plataforma/components/plataforma-sidebar.tsx` (icono `Database`).
3. `src/app/plataforma/fuentes/page.tsx` (ruta de plataforma).
4. `src/features/fuentes/models/fuente.ts`, `data/fuentes-iniciales.data.ts`, `state/fuentes-store.ts`.
5. `src/features/plataforma/views/fuentes-view.tsx`, `components/fuentes-kpis.tsx`, `components/fuentes-datagrid.tsx`.
6. Panel Zero-Modals `fuente-editor` en `src/features/fuentes/panels/fuente-editor-panel.tsx` registrado en `panel-registry.tsx` y `panel-store.ts`.
7. Validación de estándares técnicos (`bun run check`, `node scripts/ui-policy.mjs`, `bun run build`, reinicio de `polis-frontend.service`).
8. Informe de entrega en `bridge/02_entrega_agy2.md` y commit formal en git.
