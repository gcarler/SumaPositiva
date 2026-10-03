# Tarea agy2 — AUD-03: Rendición de cuentas C-150 usa catálogo hardcoded, no los aportes reales
**Severidad**: ALTA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: la pestaña Rendición de Cuentas muestra 8 propuestas inventadas (PROP-CTG-001..008) y una 'tasa de incorporación 62,5%' calculada sobre ellas. El backend tiene 179 aportes reales (`GET /aportes` total=179) y `POST /aportes/{id}/devolucion-razon`. Nota de corrección: cifras previas que citaban 227 propuestas eran incorrectas; el dato real es 179. Un tablero de control social con datos de muestra presentado como reales es riesgoso jurídicamente.

## Acción requerida
Alimentar la matriz desde `/aportes` (paginado) y persistir la devolución motivada con `/aportes/{id}/devolucion-razon`; el estado 'sin respuesta' debe ser visible y contabilizado (la proscripción del descarte silencioso se mide sobre aportes reales). Calcular KPIs sobre datos reales. El catálogo queda solo como fixture de tests/storybook.

## Criterio de aceptación (verificable por EAF)
La tabla lista los 179 aportes con paginación; KPI de respuesta motivada = respondidos/179; exportación CSV/JSON refleja datos reales; test de integración.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-03. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
