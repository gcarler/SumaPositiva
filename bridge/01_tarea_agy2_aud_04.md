# Tarea agy2 — AUD-04: Actualización optimista sin reversión y 'modo simulación' en control de fases
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `fases-control-panel.tsx` actualiza el switch antes de la respuesta y, si el PATCH falla, solo muestra un toast 'modo simulación' dejando el switch en el nuevo valor. La UI queda mostrando una fase abierta/cerrada que en BD no lo está. Además hay ids de fase hardcodeados como fallback.

## Acción requerida
Revertir el estado en caso de error, mostrar error real (401/403/5xx diferenciados), eliminar el catálogo de fases hardcodeado y el 'modo simulación'. Confirmar el cambio con la respuesta del servidor (invalidar query).

## Criterio de aceptación (verificable por EAF)
Con permiso insuficiente el switch vuelve a su valor y se ve un mensaje de permiso; test del panel.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-04. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
