# Ensayo P7 sobre copia restaurada de bd_csh — 2026-11-08

**Alcance:** restaurar el respaldo diario más reciente de `bd_csh`, aplicar la
cadena `0096 → 0100` sobre la copia, verificar datos, readiness y reversa, y
limpiar. **No se tocó `bd_csh`, ni el servicio `polis-backend`, ni systemd.**

## Origen y verificación del respaldo

| Dato | Valor |
| --- | --- |
| Archivo | `backups/diarios/bd_csh_diario_20261108_020002.dump` |
| Fecha del respaldo | 2026-11-08 02:00 (local) |
| Tamaño | 55 MB |
| SHA-256 esperado | `99b31be1ece7d37bd5cf410599f1dcdee5ad6a55210990ea34e2058fe3fc18fa` |
| Verificación | `sha256sum -c` → **OK** |
| Réplica offsite | mismo archivo y hash en `/var/backups/polis_offsite/` |

## Restauración

Base destino: `polis_test_p7_ensayo_20261108` (PostgreSQL 16, contenedor
`polis-database-1`, 127.0.0.1:5433). Creada vacía y restaurada desde el dump.

El respaldo se generó con `pg_dump` de PostgreSQL 18 (formato de archivo 1.16),
mientras el contenedor de base tiene PostgreSQL 16. Por eso:

- `pg_restore` del contenedor rechazó el archivo (`unsupported version 1.16`).
- Se usó el `pg_restore` 18 del host contra el servidor 16, en modo SQL
  (`-f -`), eliminando la sentencia `SET transaction_timeout` que el servidor 16
  no reconoce.
- Las tablas de datos de extensión `topology.topology` y `topology.layer` se
  excluyeron del TOC porque el dump usa una versión de PostGIS posterior a la
  3.5.2 instalada; no son tablas de aplicación. El esquema y la extensión
  `postgis_topology` sí se crearon.

Resultado de la restauración: **exit 0**.

## Estado restaurado

| Comprobación | Resultado |
| --- | --- |
| `alembic_version` | `0096_riesgo_sin_evaluar` (coincide con producción documentada) |
| `autenticacion.usuarios` | 45 |
| `participacion_ciudadana.propuestas_ciudadanas` | 7 |
| `participacion_ciudadana.notificaciones_transaccionales` | 18 |
| `mesas_trabajo.mesas` | 35 |
| `seguimiento.compromisos_pas` | 10 |

## Actualización y reversa

| Paso | Comando | Resultado |
| --- | --- | --- |
| Upgrade | `alembic upgrade head` | **exit 0**, 3,02 s; cabeza `0100_sm_auditoria_operador` |
| Drift | `alembic check` | `No new upgrade operations detected.` |
| Reversa | `alembic downgrade 0096_riesgo_sin_evaluar` | **exit 0**, 2,76 s |
| Reaplicación | `alembic upgrade head` | **exit 0**, cabeza `0100_sm_auditoria_operador` |

Tras la actualización y tras el ciclo de reversa, los cinco conteos de datos
permanecieron idénticos. Las tablas SM (`sm_mensajes`, `sm_contactos_boveda`)
quedaron creadas y vacías: el ensayo no generó mensajes ni contactos.

## Readiness con la copia actualizada

Backend levantado en `127.0.0.1:18312` con `POLIS_ENVIRONMENT=test`, la base
restaurada, `POLIS_SM_WORKER_HABILITADO=false` y **sin** `POLIS_SM_BOVEDA_KEY`.

| Ruta | Resultado |
| --- | --- |
| `GET /api/v1/health/live` | 200 |
| `GET /api/v1/health/ready` | 200; `{"status":"ready","database":"ok","migrations":"ok","extensions":"ok"}` |
| `GET /api/v1/noticias` | 200 (ruta pública existente) |
| `GET /api/v1/health/herald` | 200 |
| `GET /api/v1/notificaciones/radicado/POL-2026-0000` | 404 de recurso, no 500 |
| `GET /api/v1/sm/health` sin token | 401 |
| Errores en el log del backend | 0 |

## Hallazgos operativos

1. **Compatibilidad de respaldo:** el dump diario lo produce un cliente
   PostgreSQL 18 y el contenedor de restauración es 16. Un `pg_restore` dentro
   del contenedor no puede leerlo. El runbook debe usar el cliente 18 del host o
   alinear versiones antes de una recuperación real.
2. **PostGIS:** el dump contiene datos de `topology` de una versión mayor que la
   instalada. En una recuperación real hay que instalar la misma versión de
   PostGIS o excluir explícitamente esas tablas de extensión, nunca las de
   aplicación.
3. El upgrade de SM no modifica filas de negocio: solo agrega tablas y columnas
   nuevas; los conteos se conservaron.

## Limpieza

Backend detenido, base `polis_test_p7_ensayo_20261108` eliminada y copia temporal
del dump retirada del contenedor. `bd_csh` no se leyó ni escribió; el respaldo se
usó desde el archivo local verificado.
