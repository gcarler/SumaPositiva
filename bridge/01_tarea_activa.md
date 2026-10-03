# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_formulacion_fase3.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Módulo Asignado
**Fase de Formulación Estratégica — Hito F-3 (Costeo Presupuestal y Asignación de Fuentes FONSET/SGP/SGR)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_formulacion_fase3.md`

### Resumen de Entregables Requeridos:
1. Conmutador en `alternativas-view.tsx` para alternar entre Banco de Alternativas MGA y **Costeo y Plan Financiero**.
2. Componente `costeo-presupuestal-view.tsx` consumiendo `/api/v1/presupuesto/fuentes`, `/asignaciones` y `/resumen-costeo`.
3. Panel lateral Zero-Modals `asignacion-presupuestal-panel.tsx` montado sobre `PanelShell`, registrado en `panel-registry.tsx` y `panel-store.ts` con ID `"asignacion-presupuestal"`.
4. Servicio `presupuesto-api.ts` y pruebas unitarias `presupuesto-api.test.ts`.
5. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/alternativas`.
6. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
7. **PASO OBLIGATORIO DE NOTIFICACIÓN**:
   `tmux send-keys -t agy "He terminado la entrega del Hito F-3 (Costeo Presupuestal y Asignación de Fuentes). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
