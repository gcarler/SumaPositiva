# Tarea agy2 — AUD-10: Tipado débil: `any` y advertencia de lint
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: más de 15 usos de `any` (mesas-api.ts, geovisor-mapa.tsx, geovisor.ts, noticias/testimonios views) y 1 warning react-hooks/incompatible-library en mesas-datagrid.tsx. Los informes anteriores decían 'sin tipos any'.

## Acción requerida
Tipar respuestas del backend de mesas con interfaces/Zod, tipar GeoJSON, resolver el warning del React Compiler o documentarlo con justificación. Activar regla no-explicit-any como error.

## Criterio de aceptación (verificable por EAF)
grep ': any' = 0 en src (salvo excepciones justificadas); eslint 0 warnings.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-10. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
