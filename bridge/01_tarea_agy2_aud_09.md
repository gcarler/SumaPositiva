# Tarea agy2 — AUD-09: Pruebas E2E reales de flujos críticos
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: los dictámenes EAF anteriores se apoyaron en bun test unitarios, ui-policy y HTTP 200. Ninguno ejecuta el flujo en navegador (login → editar → persistir → recargar). Por eso hallazgos como AUD-01/02/04 no fueron detectados.

## Acción requerida
Añadir Playwright con smoke E2E: login por rol, conmutar fase, editar mesa, editar línea, editar compromiso, registrar medición, devolución de un aporte; verificar persistencia tras recarga y modo solo lectura del auditor. Integrar en `bun run check:e2e`.

## Criterio de aceptación (verificable por EAF)
Suite E2E verde y documentada; falla si un cambio no persiste.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-09. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
