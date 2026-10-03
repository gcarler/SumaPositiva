# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_diagnostico_fase2.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Módulo Asignado
**Fase de Diagnóstico — Hito D-2 (Árbol de Problemas Distrital MGA y Validación Causal IA DNP)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_diagnostico_fase2.md`

### Resumen de Entregables Requeridos:
1. Conmutador en `src/features/diagnostico/views/diagnostico-view.tsx` entre **Línea Base Cuantitativa** y **Árbol de Problemas y Soluciones MGA**.
2. Componente visualizador `src/features/diagnostico/components/arbol-problemas-view.tsx` con jerarquía MGA (Problema Central, Causas, Efectos, y conmutación a Árbol de Objetivos).
3. Conexión de evaluación causal hacia `POST /api/v1/ia/diagnostico` con botón "Validar con Agente IA DNP".
4. Panel lateral Zero-Modals `validacion-mga-panel.tsx` montado sobre `PanelShell`, registrado en `panel-registry.tsx` y `panel-store.ts` con ID `"validacion-mga"`.
5. Servicio `src/features/diagnostico/services/mga-api.ts` y pruebas unitarias `mga-api.test.ts`.
6. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `/plataforma/diagnostico`.
7. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
