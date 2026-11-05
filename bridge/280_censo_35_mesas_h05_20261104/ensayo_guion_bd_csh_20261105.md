# Ensayo del guion de despliegue de 0095 — copia de `bd_csh` (2026-11-05)

**Alcance**: ejecución completa del guion `guion_despliegue_0095_bd_csh.md` sobre una réplica de `bd_csh` en base aislada. **`bd_csh` no recibió ninguna escritura** (solo `pg_dump`).
**Resultado general**: el guion es ejecutable punta a punta;el upgrade 0094→0095 pasó **exit 0** sobre datos reales completos, la guardia censal verificó el censo canónico y la idempotencia re-ejecutable quedó demostrada.


## Evolución del entorno (hallazgo de tanto contexto)

| Aspecto | Estado al cerrar el encargo 280 (2026-11-04) | Estado al ensayar (2026-11-05) |
| --- | --- | --- |
| `bd_csh` revisión alembic | pendiente de 0095 (solo lectura) | **ya en `0095_sembrar_censo_35_mesas`** — la ventana de coordinación ya se ejecutó o el despliegue ocurrió fuera de esta jornada |
| Censo en `bd_csh` | — | ya canónico: 35/36/35-35, tipos 3/11/9/12, `sum(total_asistentes)=0`, pc-001 sin mesa, 0 sin catálogo |

Por eso el ensayo ejercita la ruta más severa: copia fiel de producción marcada **artificialmente en `0094_herald_salud_resumen`** (solo `UPDATE alembic_version`; ninguna reversión de datos) para ejecutar el upgrade real de 0095 sobre el dataset completo.

## Secuencia ejecutada y resultados

| Paso del guion | Ejecución real | Resultado |
| --- | --- | --- |
| 1. Cheques solo lectura | `alembic heads` (repo) = única `0095`; `alembic_version` de `bd_csh` = `0095...`; inventario de extensiones (postgis, postgis_raster, postgis_topology, postgis_sfcgal, ltree, pgcrypto, pg_trgm, pgRouting, pg_stat_statements, address_standardizer) | ✔ |
| 2–3. Respaldo | `pg_dump -Fc -O -x bd_csh` → 54 MB, resto custom; **sha256 `b9b5651f8e34361a28a73c6fd2ee63060ab9796dcf08ca708aee71f3efb11ecd`** | ✔ |
| Restauración | `createdb polis_test_ensayo_despliegue_0095`; `pg_restore --exit-on-error` | exit 0, sin errores |
| Propiedad | `REASSIGN OWNED` falla por objetos de sistema; alternativa usada: bucle `ALTER ... OWNER TO polis` acotado a los 13 esquemas de negocio | 100 % propiedad `polis` en esquemas de negocio (mesas_trabajo, participacion_ciudadana, seguimiento, geodatos, motor_politicas, auditoria, …) |
| 4. Upgrade condicional | marcador a `0094` → `alembic current` = `0094_herald_salud_resumen` → `upgrade head` | **exit 0** → `current` = `0095_sembrar_censo_35_mesas (head)` |
| 5. Guardia censal | misma batería del guion | 35 mesas / 36 agendas / 35 vinculadas / 35 distintas / 35 códigos canónicos exactos / distribución 3-11-9-12 / 0 sin territorio o dimensión / pc-001 sin mesa |
| 5. `alembic check` | — | "No new upgrade operations detected." |
| 5. Idempotencia | re-ejecución de `upgrade head` en cabeza | exit 0, no-op; conteos idénticos y `total_asistentes` intacto |
| 6. Prueba H-05 | `pytest tests/test_mesas_seguridad_auditoria.py -k h05` contra la copia | **1 passed** en 11.02 s |
| Limpieza | `dropdb` de la copia; eliminación del dump y temporales | solo el hash queda en evidencia |

## Cautelas operativas que el ensayo hizo visibles (a incorporar en la ventana real)

1. **Propiedad del rol en la restauración**: `REASSIGN OWNED BY postgres TO polis` aborta por objetos de sistema; el traspaso debe hacerse con `ALTER ... OWNER` por objeto/esquema de negocio (el bucle usado aquí) o `pg_restore --role=polis`. En un entorno real el despliegue corre con la propiedad ya resuelta, pero un restore desde dump en frío tropieza con esto.
2. **Variables de entorno del lab**: el fichero de ensayo acumulado tiene una línea sin citar (`POLIS_SMTP_REMITENTE=... <...>`) que rompe el `source()` de pydantic-settings; en ventana, preferir `.env` del servidor (0600) o citar los valores con espacios/paréntesis.
3. **`pg_dump`/`pg_restore` ahora mismo ya no son necesarios** para 0095 (ya aplicado en `bd_csh`); el guion queda reutilizable para la siguiente revisión el día que toque, y el ensayo demuestra que la cadena upgrade→guardia→idempotencia→check→H-05 funciona sobre el dataset real y está lista para cualquier revisión futura.

Este ensayo **no equivale** al respaldo ni a la ventana real de producción; es evidencia técnica del implementador.

## Verificación en vivo de bd_csh (2026-11-05, post-ensayo)

| Control | Resultado |
| --- | --- |
| Censo en vivo (`bd_csh`, solo lectura) | 35 mesas / 36 agendas / 35-35 vinculadas, tipos 3/11/9/12, pc-001 sin mesa, 0 sin catálogo ✔ |
| `health/live` | `{"status":"ok","service":"polis-api"}` ✔ |
| `health/ready` | Primera pasada: **503 `migrations":"pending"`** — el proceso de `polis-backend` había arrancado con código previo a 0095 (`EXPECTED_REVISION` se fija al importar, `alembic` head cargado 0094 vs base 0095) |
| Remedio | `sudo systemctl restart polis-backend` (runbook paso 8; el mismo caso documentado como H1 en el encargo 251: migración aplicada sin reinicio) |
| Tras el reinicio | `ready` **200** `{status: ready, database: ok, migrations: ok, extensions: ok}`; frontend `/plataforma/seguimiento` 200; `/api/v1/mesas/agendas` 200 ✔ |

**Cierre del despliegue de 0095 en `bd_csh`: confirmado en vivo.** El único pendiente operativo (reinicio del backend) ya no está pendiente. Resta a cargo del equipo: completar el manifiesto de ventana con estos valores si la ventana ocurrió sin registro.
