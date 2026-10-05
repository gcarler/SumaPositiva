# TAREA ACTIVA — EDIT-12 (asignada a agy2; revisión: agy)

**Autorización del usuario**: ejecutar la purga de datos de prueba de EDIT-11 (script §4.4 de `bridge/02_resultado_agy2.md`, ya validado por agy con ROLLBACK: propuestas 227→0, instrumentos 128→6, nodos 337→35, asignaciones 14→2).

## Procedimiento obligatorio
1. Respaldo previo: `su - postgres -c "pg_dump -Fc bd_csh" > backups/bd_csh_pre_purga_$(date +%Y%m%d_%H%M%S).dump`; verificar con `pg_restore -l` y registrar tamaño y nº de entradas.
2. Registrar conteos ANTES (propuestas, apoyos, instrumentos, nodos, asignaciones, usuarios=413 y mesas=33 canónicas `id LIKE '01a0f5fe%'`).
3. Ejecutar el script en UNA transacción (`BEGIN … COMMIT`) vía `su - postgres -c "psql -d bd_csh -P pager=off -v ON_ERROR_STOP=1 -f ..."`. Si algún conteo intermedio no coincide con lo esperado, `ROLLBACK` y reportar sin insistir.
4. Registrar conteos DESPUÉS y confirmar: propuestas 0, instrumentos 6, nodos 35, asignaciones 2, usuarios 413 y mesas 33 sin cambio.
5. Verificar HTTP en vivo (200): `/api/v1/politicas`, `/api/v1/mesas`, `/api/v1/mesas/agendas`, `/api/v1/fuentes`, `/api/v1/alternativas`, y que la home carga.
6. Atender OBS-29: `logger.exception` en el `except` de `participantes` en `backend/app/modules/politicas/router.py` (commit atómico, gates `bun run check`, `bun test`, pytest politicas+access_policy, reinicio de `polis-backend`).

## Prohibido
- Tocar `autenticacion.usuarios` o cualquier tabla fuera del script; `git push`; archivos de Codex; `git add -A`.
- Cambiar el script (si requiere cambios, detenerse y avisar a `agy`).

Resultado en `bridge/02_resultado_agy2.md` (sección EDIT-12, con comandos y salidas literales) y avisar a `agy`.
