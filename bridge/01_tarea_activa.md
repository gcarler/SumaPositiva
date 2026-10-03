# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA / CRÍTICA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_pas_fase2.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_pas.md`

---

## Módulo Asignado
**Fase de Plan de Acción y Seguimiento — Hito PAS-2 (Tablero SINERGIA DNP y Cadena de Valor Insumo → Producto → Resultado)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_pas_fase2.md`

### Resumen de Entregables Requeridos:
1. Pestañas en `/plataforma/seguimiento` (`Tabs` en `seguimiento-view.tsx`):
   - Tab 1: "Matriz de Compromisos PAS".
   - Tab 2: "Cadena de Valor SINERGIA (DNP)".
2. Servicio frontend `src/features/seguimiento/services/cadena-valor-api.ts` consumiendo `GET /api/v1/indicadores/cadena-valor` y fallback canónico tipado con los 8 indicadores distritales de Cartagena.
3. Componente `src/features/seguimiento/components/cadena-valor-tab.tsx` con diagrama interactivo jerárquico de 3 bloques (Insumos ➔ Productos ➔ Resultados), tarjetas con códigos DNP, sentido esperado (ascendente/descendente), línea base vs meta cuatrienal vs avance actual.
4. Panel lateral Zero-Modals `src/features/seguimiento/panels/indicador-detalle-panel.tsx` (ID `"indicador-detalle"`), registrado en `panel-store.ts` y `panel-registry.tsx`, con modo solo lectura para `auditor_forense` y formulario de mediciones.
5. Permisos en `acceso.ts` y pruebas en `acceso.test.ts` para el panel `"indicador-detalle"`.
6. Store y pruebas: `cadena-valor-store.ts` y `cadena-valor-store.test.ts`.
7. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio de `polis-frontend.service` y verificación HTTP 200 en `http://127.0.0.1:3000/plataforma/seguimiento`.
8. Documentación en `bridge/02_entrega_agy2.md` y commits en Git.
9. **PASO OBLIGATORIO DE NOTIFICACIÓN**:
   `tmux send-keys -t agy "He terminado la entrega del Hito PAS-2 (Cadena de Valor SINERGIA DNP). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
