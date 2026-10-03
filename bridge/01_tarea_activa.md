# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_formulacion_fase2.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Módulo Asignado
**Fase de Formulación Estratégica — Hito F-2 (Evaluación de Viabilidad Jurídica y Fiscal con IA)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_formulacion_fase2.md`

### Resumen de Entregables Requeridos:
1. Botón "Evaluar Viabilidad IA" en cada fila de `alternativas-tabla.tsx`.
2. Conexión de API con `POST /api/v1/ia/juridico` y `POST /api/v1/ia/fiscal`.
3. Panel lateral Zero-Modals `evaluacion-viabilidad-panel.tsx` montado sobre `PanelShell`, registrado en `panel-registry.tsx` y `panel-store.ts` con ID `"evaluacion-viabilidad"`.
4. Servicio `viabilidad-api.ts` y pruebas unitarias `viabilidad-api.test.ts`.
5. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/alternativas`.
6. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
