# Tarea agy2 — AUD-01: Compromisos PAS sin persistencia en backend
**Severidad**: ALTA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `compromisos-store.ts` es un store Zustand en memoria alimentado por `compromisos-pas.data.ts`. No existe módulo `compromisos` en `backend/app/modules/` (grep: 0 coincidencias). Al recargar la página se pierden todas las ediciones de avance/estado; no hay auditoría ni autoría. Contradice la regla 'No Parallel Persistence' de AGENTS.md. El dictamen EAF del PAS-1 pasó por alto esto.

## Acción requerida
Crear módulo backend `compromisos` (models, schemas, repository, service, router con prefijo /compromisos), migración, permisos `seguimiento:leer/gestionar` en backend, registro de eventos en auditoría. Cablear el frontend (servicio + react-query) reemplazando la mutación local; el catálogo canónico pasa a ser seed de BD, no fuente de verdad. Tests backend + frontend.

## Criterio de aceptación (verificable por EAF)
Editar un compromiso, recargar el navegador y ver el cambio persistido; registro en /auditoria/registros; auditor_forense recibe 403 en escritura; pytest + bun test verdes.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-01. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
