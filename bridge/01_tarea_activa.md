# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_diagnostico_fase3.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Módulo Asignado
**Fase de Diagnóstico — Hito D-3 (Geodiagnóstico Territorial y Fichas de Vulnerabilidad por UCG / Corregimiento)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_diagnostico_fase3.md`

### Resumen de Entregables Requeridos:
1. Conmutador en `src/features/diagnostico/views/diagnostico-view.tsx` ampliado a 3 modos: Línea Base, Árbol MGA y **Geodiagnóstico Territorial**.
2. Componente `src/features/diagnostico/components/geodiagnostico-territorial-view.tsx` con filtros por localidad/zona étnica, buscador y grid de fichas con semáforos de riesgo.
3. Panel lateral Zero-Modals `ficha-territorial-panel.tsx` registrado en `panel-registry.tsx` y `panel-store.ts` con ID `"ficha-territorial"`.
4. Catálogo canónico `src/features/diagnostico/data/territorios-diagnostico.data.ts` con los 15 territorios distritales de Cartagena y sus métricas de vulnerabilidad.
5. Servicio `territorios-api.ts` y pruebas unitarias `territorios-api.test.ts`.
6. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/diagnostico`.
7. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
