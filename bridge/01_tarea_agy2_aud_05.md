# Tarea agy2 — AUD-05: Incoherencia fase ↔ módulos: fases 2 y 3 'preparatoria' con módulos operativos
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `GET /politicas/fases` devuelve Fase 1 activa (35%), Fase 2 y 3 'preparatoria' (0%), pero los módulos Alternativas y Seguimiento están plenamente habilitados y no consultan el estado de fase. El 'activar/apagar fases' no gobierna el acceso real; el progreso_porcentaje no se calcula a partir del trabajo realizado.

## Acción requerida
Definir y documentar la regla: qué habilita cada fase (participación web y/o edición de módulos). Implementar gating en frontend (banner/solo lectura cuando la fase no está activa) y en backend para escrituras. Calcular progreso_porcentaje desde indicadores de avance reales.

## Criterio de aceptación (verificable por EAF)
Con Fase 2 en 'preparatoria' Alternativas muestra aviso y bloquea escritura a no-admins; progreso de fase se recalcula; documentado en docs/plataforma.md.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-05. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
