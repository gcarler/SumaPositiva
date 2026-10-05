# TAREA ACTIVA — EDIT-13 (asignada a agy2; revisión: agy)

Corregir los hallazgos abiertos de AUD-19 (ver tabla en `bridge/02_entrega_agy2.md`, ~L3078-3085). Excluido: **H-10** (Codex, bloqueado). H-06 ya cerrado en EDIT-11.

## Alcance (un commit atómico por hallazgo, en este orden)
1. **H-11** (bajo): `MesaRespuesta.facilitador_nombre` por join con `autenticacion.usuarios` (columna `correo`/nombre real: verificar esquema). Frontend (`mesas-api.ts`) usa el nombre y quita el valor genérico. Test backend + bun.
2. **H-09**: sembrar las 3 líneas estratégicas faltantes en `motor_politicas.lineas_estrategicas` mediante **migración Alembic de datos idempotente** (`ON CONFLICT DO NOTHING`), tomando nombre/código/descripción EXACTOS de `src/features/politicas/data/politicas.data.ts`. Verificar columnas NOT NULL/FK (fase_id, etc.). No inventar contenido.
3. **H-05**: unificar fuentes mesas↔agendas. Primero informe de análisis en `02_resultado_agy2.md` (relación real entre `mesas_trabajo.mesas` (33) y `mesas_trabajo.agendas` (36): ¿hay vínculo? ¿cuáles agendas no tienen mesa?). Implementar la solución mínima y segura (preferible: vista pública y geovisor consumen una única fuente coherente, o vínculo `mesa_id` en agendas con migración). Si requiere decisión de producto, DETENERSE y preguntar a `agy`.
4. **H-08**: conectar el cargador de fotos (`fotos-pregunta.tsx`, `aporte-editor-panel.tsx`) a `POST /evidencias/subir` (sanitización EXIF/GPS), con tests y sin retornos simulados.
5. **H-07** (destructivo, DOS FASES):
   - Fase A: inventario de las 14 columnas legadas (nombre, tipo, nº de filas con dato NO nulo, vistas/funciones/triggers/índices que las usan, referencias en `bd/scripts/`). Redactar migración Alembic con downgrade y entregarla en commit **sin aplicar**. **DETENERSE** y avisar a `agy` para revisión.
   - Fase B (solo tras mi aprobación escrita en `03_dictamen_revision.md`): respaldo `pg_dump -Fc`, servicios detenidos, `alembic upgrade head`, reiniciar servicios, `alembic check` sin diff en `bd_csh` y `polis_test`.
   - Si alguna columna tiene datos, NO se elimina: se mapea en el modelo o se migra el dato; consultar.

## Reglas
- Cero `git push`; no tocar archivos de Codex (noticias, testimonios, `backend/alembic/env.py`, `backend/app/api/router.py`, `panel-store.ts`, `contenido-view.tsx`); `git add` de archivos concretos, nunca `-A`; no tocar `autenticacion.usuarios` ni borrar datos en `bd_csh`.
- Migraciones en `bd_csh` solo con servicios detenidos y respaldo previo; usar `cd backend && env -i HOME=/root PATH=/usr/bin:/bin .venv/bin/alembic -c alembic.ini …` (NO `source .env`). `psql` con `-P pager=off`. Pytest: `backend/.venv/bin/pytest`.
- Gates por hallazgo: `bun run check`, `bun test`, pytest de módulos afectados + `test_access_policy.py` (actualizar `docs/permisos-api.md` si hay rutas), `alembic check` en `polis_test`, `bun run build` + `systemctl restart polis-backend polis-frontend`, verificación HTTP en vivo.
- Resultado con comandos y salidas literales en `bridge/02_resultado_agy2.md` (sección EDIT-13). Avisar a `agy` al terminar cada hito con punto de parada (H-05 si hay decisión, H-07 fase A) y al final.
