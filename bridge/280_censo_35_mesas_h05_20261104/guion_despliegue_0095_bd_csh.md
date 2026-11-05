# Guion de despliegue de 0095 sobre `bd_csh` — Censo canónico de 35 mesas (H-05)

**Fecha de elaboración**: 2026-11-04 (encargo 280)
**Objetivo**: aplicar la revisión `0095_sembrar_censo_35_mesas` (y la cadena pendiente hasta ella) sobre la base de producción `bd_csh` durante una ventana de mantenimiento, con servicios detenidos y respaldo previo mandatorio.
**Alcance**: este guion queda **preparado y no ejecutado**. La ejecución corresponde a coordinación de despliegue; el implementador no firma el dictamen EAF. Durante la elaboración del encargo, `bd_csh` se tocó únicamente en solo lectura (SELECT).

Referencias normativas: `docs/despliegue-produccion.md` (runbook general), `docs/operacion.md` (cautela de rutas y entorno), `bridge/280_censo_35_mesas_h05_20261104/resumen.json` (corrección y verificación técnica de 0095), `docs/transacciones.md`.

---

## 0. Perfil del cambio que se despliega

| Aspecto | Detalle |
| --- | --- |
| Migración cabeza | `0095_sembrar_censo_35_mesas` (revises `0094_herald_salud_resumen`; única cabeza del repositorio — confirmar con `alembic heads`) |
| Tipo | Siembra de datos institucional, **no DDL**: `INSERT ... ON CONFLICT (codigo_oficial) DO UPDATE` idempotente sobre `mesas_trabajo.mesas` + `UPDATE` de vínculo 1:1 en `mesas_trabajo.agendas` |
| Protección de datos | El `DO UPDATE` no incluye `total_asistentes` ni columnas de sucesos: re-ejecutar no borra ni reinicia registros persistidos. La plenaria `pc-001` permanece sin mesa |
| Guardia censal | Si tras la siembra el estado no es exactamente 35 mesas / 36 agendas / 35 vinculadas / 35 distintas (distribución 3 TERRITORIAL, 11 RURAL_INSULAR, 9 POBLACIONAL, 12 SECTORIAL), la migración lanza `RAISE EXCEPTION` y aborta: el censo incompleto no puede quedar registrado como verde |
| Cadena acompañante | Si `bd_csh` quedó detrás, el `upgrade head` aplicará en bloque todo lo pendiente hasta 0095 (mínimo notable: **0089** fija fechas/horarios/lugar de las 35 mesas en «Por definir» en `mesas` y `agendas`, y 0090–0094 entregan anexos de actividades, líneas cartagena, eventos de notificación, gestión y salud-resumen de Herald). El respaldo del paso 2 ampara cualquier mutación de la cadena |
| Reversibilidad | Downgrade de 0095: desvincula y elimina **solo** las 35 mesas del censo; si existen registros dependientes (actas, participantes), el DELETE se detiene por las claves foráneas **por diseño** — no destruye datos. Reversión completa vía restauración del dump del paso 2 |

---

## 1. Cheques previos en solo lectura (fuera de la ventana, sin interrumpir servicio)

```bash
cd /root/polis          # o el checkout real del entorno; docs/operacion.md pide no asumir rutas
git status --short      # árbol limpio en el commit que trae 0095
git log --oneline -3

# Única cabeza y estado de bd_csh (solo lectura):
export PYTHONPATH=backend
backend/.venv/bin/alembic -c backend/alembic.ini heads
# Esperado: 0095_sembrar_censo_35_mesas (single head)

backend/.venv/bin/alembic -c backend/alembic.ini current
# Registrar la revisión actual de bd_csh en el manifiesto; define cuántas revisiones aplicará el upgrade.
```

`alembic` lee el DSN del entorno configurado (backend/.env del servidor, permisos 0600; no consignar secretos).

---

## 2. Ventana de mantenimiento

2.1. Aviso a la mesa de operaciones distrital y activación de página de mantenimiento en Nginx (runbook, paso 1).

2.2. Detención de la aplicación antes de tocar la base:

```bash
sudo systemctl stop polis-frontend polis-backend
sudo systemctl is-active polis-frontend polis-backend   # ambos: 'inactive'
# Opcional: confirmar cero sesiones activas en la base
sudo -u postgres psql -d bd_csh -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'bd_csh';"
```

---

## 3. Respaldo previo mandatorio (bloqueante)

```bash
/root/polis/scripts/respaldo_bd.sh

# Verificación obligatoria — detener el despliegue si falla:
ls -lh /root/polis/backups/ | tail -n 2
cd /root/polis/backups && sha256sum -c bd_csh_*.dump.sha256 | tail -n 1   # '...dump: OK'
```

Guardar en el manifiesto de la ventana la ruta y hash exactos del dump. El respaldo es la única vía de retorno completa si el upgrade abortase a mitad de la cadena.

---

## 4. Aplicación de migraciones (condicional)

```bash
cd /root/polis
export PYTHONPATH=backend
CURRENT_REV=$(backend/.venv/bin/alembic -c backend/alembic.ini current 2>/dev/null | awk '{print $1}')
HEAD_REV=$(backend/.venv/bin/alembic -c backend/alembic.ini heads 2>/dev/null | awk '{print $1}')

if [ "$CURRENT_REV" = "$HEAD_REV" ]; then
    echo "✔ bd_csh ya está en la cabeza ($CURRENT_REV); se omite el upgrade."
else
    echo "⚠ Pendiente: $CURRENT_REV → $HEAD_REV. Ejecutando upgrade head..."
    backend/.venv/bin/alembic -c backend/alembic.ini upgrade head

    POST_REV=$(backend/.venv/bin/alembic -c backend/alembic.ini current 2>/dev/null | awk '{print $1}')
    [ "$POST_REV" = "$HEAD_REV" ] || { echo "❌ bd_csh quedó en $POST_REV (esperado $HEAD_REV). Rollback."; exit 1; }
    echo "✔ Migración completada: $POST_REV."
fi
```

Si el `upgrade` aborta: **no reintentar a ciegas** — la guardia censal de 0095 falla antes de mutar datos cuando el estado es incompatible (p. ej. mesas fuera del censo acumuladas en producción). Diagnosticar con las consultas del paso 5, corregir la causa en ventana, o revertir por el dump.

---

## 5. Verificación post-migración de la Ventana (solo lectura)

Censo H-05 esperado en `bd_csh`:

```sql
-- 35 / 36 / 35 / 35 y pc-001 sin mesa:
SELECT (SELECT count(*) FROM mesas_trabajo.mesas)                    AS mesas,   -- 35
       (SELECT count(*) FROM mesas_trabajo.agendas)                  AS agendas, -- 36
       (SELECT count(mesa_id) FROM mesas_trabajo.agendas)            AS vinculadas,  -- 35
       (SELECT count(DISTINCT mesa_id) FROM mesas_trabajo.agendas)   AS distintas_vinculadas, -- 35
       (SELECT count(*) FROM mesas_trabajo.agendas WHERE id = 'pc-001' AND mesa_id IS NULL) AS plenaria_sin_mesa; -- 1

-- Distribución 3/11/9/12:
SELECT tipo_mesa, count(*) FROM mesas_trabajo.mesas GROUP BY tipo_mesa ORDER BY tipo_mesa;
-- SECTORIAL=12, POBLACIONAL=9, RURAL_INSULAR=11, TERRITORIAL=3

-- Sin mesa sin catálogo de territorio/dimensión (idempotencia con catálogo):
SELECT count(*) FROM mesas_trabajo.mesas WHERE territorio_id IS NULL OR dimension_id IS NULL;  -- 0
```

```bash
export PYTHONPATH=backend
backend/.venv/bin/alembic -c backend/alembic.ini check
# Esperado: "No new upgrade operations detected."
```

Idempotencia (test de reintento seguro): re-ejecutar `alembic upgrade head` **en la misma ventana** (es no-op) y repetir los conteos anteriores — deben ser idénticos, y los `total_asistentes` persistidos sin variación.

---

## 6. Arranque de servicios y disponibilidad

```bash
sudo systemctl start polis-backend polis-frontend
sudo systemctl status polis-backend --no-pager --lines=3
sudo systemctl status polis-frontend --no-pager --lines=3

# Readiness (debe reportar migraciones y base ok):
curl -s http://127.0.0.1:8000/api/v1/health/live    # {"status":"ok","service":"polis-api"}
curl -s http://127.0.0.1:8000/api/v1/health/ready   # 200 {"status":"ready","database":"ok","migrations":"ok",...}

# Superficies visibles del censo:
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento   # 200
curl -s http://127.0.0.1:8000/api/v1/aportes | grep -o '"total":[0-9]*'                 # 179 aportes conservados
```

Cierre de la ventana: desactivar página de mantenimiento y `sudo systemctl reload nginx` (con la autorización de recarga vigente, ver runbook §7.5).

---

## 7. Contingencia y rollback

| Escenario | Acción |
| --- | --- |
| Guardia censal aborta el upgrade (diferencia aceptable diagnosticada) | `alembic current` queda sin avanzar (transacción abortada); corregir la causa y re-ejecutar `upgrade head` — la siembra es idempotente |
| Fallo no subsanable en la cadena | Detener servicios, restaurar el dump verificado del paso 3 (`scripts/restaurar_bd.sh` o `pg_restore` completo, runbook §5.2), y reversión de código al commit anterior estable + `bun run build` si se requiere |
| Reversión solo de 0095 (base íntegra, sin dependientes de las mesas) | `alembic -c backend/alembic.ini downgrade -1` — desvincula agendas y retira las 35 mesas sembradas; si hay actas/participantes dependientes, el DELETE se detiene por FK **sin dañar datos**: no forzar el borrado, usar restauración desde dump |
| Readiness `unavailable`/503 tras arranque | Volver al paso 5: distinguir problema de migración (revisión no alcanzada) de problema de servicio/SMTP; no "parchear" el censo con SQL improvisado (docs/operacion.md lo prohíbe) |

---

## 8. Registro posterior

Anexar al manifiesto de ejecución de la ventana: revisión previa y final de `alembic`, ruta y hash del dump, salida de las consultas del paso 5, resultados de readiness, y hora de apertura/cierre. Dejar la evaluación independiente del despliegue a quien corresponda en EAF (los checks del implementador son evidencia técnica, no dictamen).
