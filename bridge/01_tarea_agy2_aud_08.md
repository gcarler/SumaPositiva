# Tarea agy2 — AUD-08: Accesibilidad del módulo Seguimiento
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: 0 ocurrencias de aria-label/role en src/features/seguimiento. Barras de avance sin role=progressbar ni valor, semáforos que dependen solo del color, tabs y tabla sin etiquetas, botones de icono sin nombre accesible.

## Acción requerida
Auditar con axe (jest-axe o Playwright+axe) las 3 pestañas y los 3 paneles; añadir roles/aria/valores, no depender solo del color (texto + icono), foco gestionado al abrir/cerrar paneles (PanelShell).

## Criterio de aceptación (verificable por EAF)
0 violaciones serias/críticas de axe en /plataforma/seguimiento; navegación completa por teclado.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-08. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
