# TAREA ACTIVA — EDIT-11 (asignada a agy2; revisión: agy/coordinador)

Contexto: cierre post-AUD-19 en `bridge/03_dictamen_revision.md` (commit 3d1648f). Pendientes de la auditoría:

## Alcance
1. **H-04**: retirar fallbacks/retornos simulados silenciosos del frontend en agenda, fuentes, indicadores, presupuesto y participación (`src/features/**/services/*-api.ts` y hooks). Regla: el backend es la fuente de verdad; ante error, propagar y mostrar toast; solo permitir lectura vacía si el backend responde vacío. Si un endpoint que el front llama no existe, implementarlo en backend (con test y matriz `docs/permisos-api.md`) o eliminar la llamada muerta.
2. **H-06**: `GET /api/v1/politicas` (404) llamado desde `src/features/politicas/services/politicas-api.ts:109`: implementar el endpoint o corregir la ruta real.
3. **Datos de prueba (SOLO propuesta, NO ejecutar)**: listar en un informe `bridge/` qué propuestas (227), instrumentos (128/337 nodos) y asignaciones presupuestales (14, 7 duplicadas) son de prueba, con el criterio de identificación y la consulta SQL. La purga la autoriza el usuario después de revisión.

## Reglas
- Cero `git push`. No tocar archivos de Codex (noticias, testimonios, `backend/alembic/env.py`, `backend/app/api/router.py`, `panel-store.ts`, `contenido-view.tsx`). `git add` de archivos concretos, nunca `-A`.
- NO tocar `autenticacion.usuarios` ni ejecutar DELETE en `bd_csh`.
- Gates: `bun run check`, `bun test`, pytest de los módulos afectados + `test_access_policy.py`, `alembic check` en `polis_test`, `bun run build` + `systemctl restart polis-frontend polis-backend`.
- Commits atómicos por hallazgo. Al terminar, escribir resultado en `bridge/02_resultado_agy2.md` (evidencia: comandos y salidas) y avisar a `agy`.
