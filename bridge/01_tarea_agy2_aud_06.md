# Tarea agy2 — AUD-06: Perfil de producción: entorno 'development' y OpenAPI expuesto
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: backend corre con POLIS_ENVIRONMENT=development; `/api/v1/docs` responde 200. En producción docs/openapi se deshabilitan solo si el entorno es production. Revisar también CORS, cookies Secure/SameSite y logging en ese perfil.

## Acción requerida
Definir checklist de despliegue productivo: variable de entorno, docs/openapi off, CORS restringido al dominio, cookies Secure, secretos fuera del repo, límites de tasa en endpoints públicos y de IA. Probar con POLIS_ENVIRONMENT=production.

## Criterio de aceptación (verificable por EAF)
Con production: /api/v1/docs 404, CORS rechaza orígenes ajenos, cookies con Secure; documento docs/operacion.md actualizado.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-06. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
