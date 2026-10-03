# Tarea agy2 — AUD-11: Higiene del repositorio antes de consolidar y subir a remoto
**Severidad**: BAJA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `.env` y `.env.example` están versionados (el .env actual no tiene credenciales embebidas en URL, pero no debe rastrearse); no hay remoto; la identidad de commit no está configurada (committer root@host); el repo mezcla bridge/*.md, auditorias.db y evidencias con código. El usuario consolidará antes de hacer push.

## Acción requerida
Quitar .env del índice (git rm --cached) y reforzar .gitignore; decidir qué de bridge/, docs/evidencias y *.db se versiona; configurar user.name/email; rotar cualquier secreto que haya estado en historial; preparar plan de consolidación (squash por fase) sin ejecutar push.

## Criterio de aceptación (verificable por EAF)
git ls-files sin .env ni .db; propuesta de historial consolidado documentada; sin push realizado.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-11. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
