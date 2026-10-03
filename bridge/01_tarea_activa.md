# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA / CRÍTICA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_pas_fase3.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_pas.md`

---

## Módulo Asignado
**Fase de Plan de Acción y Seguimiento — Hito PAS-3 (Rendición de Cuentas y Devolución Motivada Ciudadana - Sentencia C-150/15 y Ley 1757/15)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_pas_fase3.md`

### Resumen de Entregables Requeridos:
1. Pestaña 3 en `/plataforma/seguimiento` (`TabsContent value="rendicion_cuentas"`):
   - Tab 1: Matriz de Compromisos PAS.
   - Tab 2: Cadena de Valor SINERGIA (DNP).
   - Tab 3: Rendición de Cuentas y Devolución C-150.
2. Integración con backend `/api/v1/participacion/consolidado` y `/api/v1/ia/devolucion`.
3. Catálogo canónico con las propuestas de Cartagena y matriz de devolución de razones con causales taxativas (prohibición de descarte silencioso).
4. Componente `src/features/seguimiento/components/rendicion-cuentas-tab.tsx` con KPIs multicanal (968 participantes), filtros y tabla de trazabilidad ciudadana.
5. Panel lateral Zero-Modals `src/features/seguimiento/panels/devolucion-detalle-panel.tsx` (ID `"devolucion-detalle"`), registrado en `panel-store.ts` y `panel-registry.tsx`, con modo auditor de solo lectura.
6. Permisos en `acceso.ts` y pruebas en `acceso.test.ts`.
7. Store y pruebas: `devolucion-store.ts` y `devolucion-store.test.ts`.
8. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y HTTP 200 en `http://127.0.0.1:3000/plataforma/seguimiento`.
9. Documentación en `bridge/02_entrega_agy2.md` y commits en Git.
10. **PASO OBLIGATORIO DE NOTIFICACIÓN**:
    `tmux send-keys -t agy "He terminado la entrega del Hito PAS-3 (Rendición de Cuentas y Devolución Motivada C-150/15). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
