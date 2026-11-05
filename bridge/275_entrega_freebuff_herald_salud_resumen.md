# ENTREGA 275: POLIS Herald — Salud de entregas y resumen diario de pendientes

**Para:** `agy:0.0` (Coordinación General Antigravity)
**De:** `freebuff` (`=freebuff:0.0`)
**Fecha:** 2026-10-31
**Estado:** ENTREGADO PARA AUDITORÍA — **sin commit, sin push** (HEAD sigue en `2aad798`)
**Base de pruebas:** `polis_test_herald_275` (+ `polis_test_herald_275_mig` para reconstrucciones), creadas, usadas y **eliminadas** al terminar. `bd_csh` (producción) no fue tocada.

---

## 1. Resumen de lo entregado

Dos módulos, tal como pide la tarea:

1. **Salud de entregas**: latido del ejecutor (tabla `herald_latido`), `GET /api/v1/notificaciones/salud` (contrato exacto de la sección 3), `POST /api/v1/notificaciones/{id}/reintentar` auditado, endpoint interno `GET /api/v1/health/herald` y chequeo enganchado a `scripts/monitor_sistema_polis.sh`.
2. **Resumen diario de pendientes**: tipo de evento `resumen_diario`, plantilla `generar_html_resumen_diario`, CLI `resumen_cli.py` (día calendario `America/Bogota`, idempotente, `--simular`), unidades systemd oneshot+timer (solo archivos) e interruptor `herald_resumen_activo`.

---

## 2. Archivos tocados

**Backend (mío):**

| Archivo | Cambio |
| --- | --- |
| `backend/alembic/versions/0094_herald_salud_resumen.py` | **Nuevo.** Tabla `participacion_ciudadana.herald_latido` (fila única `id=1` con CHECK), `chk_notificaciones_tipo_evento` ampliado con `resumen_diario`, índice único parcial `uq_notif_resumen_destinatario_dia (destinatario_correo, codigo_radicado) WHERE tipo_evento='resumen_diario'`. `downgrade` elimina las filas `resumen_diario` antes de restaurar el CHECK (criterio forense de 0092/0093) y borra la tabla. |
| `backend/app/modules/notificaciones/models.py` | `HeraldLatido` (JSONB `ultimo_ciclo`), tipo `resumen_diario` en el `CheckConstraint` del modelo e índice único parcial coincidente con la migración. |
| `backend/app/modules/notificaciones/salud.py` | **Nuevo.** `calcular_estado()` (función pura, testeable sin BD), `recolectar_salud()` (una consulta agregada por bloque: cola, 24 h con `percentile_cont` p50/p95, por tipo; sin N+1), `escribir_latido()` (upsert en transacción propia que **nunca propaga** el fallo). |
| `backend/app/modules/notificaciones/worker_cli.py` | Upsert del latido **al final de cada ciclo, aunque no haya procesado nada**, dentro de `try/except` propio (log + continuar). |
| `backend/app/modules/notificaciones/router.py` | `GET /salud` (permiso `auditoria:leer@declarada`, igual que `/historial`), `POST /{notificacion_id}/reintentar` (permiso `usuarios:gestionar@declarada`), filtro `estado_envio` en `/historial`. |
| `backend/app/modules/notificaciones/service.py` | `reintentar_manual()` (transacción, 404/409, auditoría `REINTENTO_MANUAL_HERALD` con actor), `enviar_resumen_diario()` (comprobación previa + índice único = doble red de idempotencia), filtro `estado_envio` en `listar_historial()`. |
| `backend/app/modules/notificaciones/schemas.py` | `SaludHerald` (contrato sección 3, campo por campo), `SaludHeraldMinima`, `ReintentoRespuesta`, bloques `EjecutorHerald`/`CicloHerald`/`ColaHerald`/`Metricas24h`/`SaludPorTipo`; `intentos` y `error_detalle` ya presentes en `NotificacionLectura`; **`MAX_INTENTOS` se importa de `worker.py` (no se duplica el 8)**. |
| `backend/app/modules/notificaciones/plantillas_eventos.py` | `generar_html_resumen_diario()`: misma paleta institucional (`_cuerpo_institucional`), `html.escape` en todo dato de usuario, acentos UTF-8 directos. |
| `backend/app/modules/notificaciones/resumen_cli.py` | **Nuevo.** CLI con `--fecha` y `--simular`; encola vía `NotificacionService` dentro de `transaction(session)`; **no envía SMTP** (la entrega la hace el ejecutor existente). |
| `backend/app/modules/health/router.py` / `schemas.py` | `GET /health/herald` sin auth (análogo a `/health/live`), respuesta `{"estado", "motivos"}` únicamente. |
| `backend/app/core/config.py` | `herald_resumen_activo: bool = True` (`POLIS_HERALD_RESUMEN_ACTIVO`). |
| `backend/tests/test_herald_salud_resumen.py` | **Nuevo.** 30 pruebas (8 grupos obligatorios de la sección 5). |

**Infraestructura / documentación (mío):**

| Archivo | Cambio |
| --- | --- |
| `deploy/systemd/polis-herald-resumen.service` | Oneshot. **Solo creado, no instalado ni habilitado.** |
| `deploy/systemd/polis-herald-resumen.timer` | `OnCalendar=*-*-* 07:00:00 America/Bogota`, `Persistent=true`. **Solo creado.** |
| `scripts/monitor_sistema_polis.sh` | Sección 2.5: consulta `/health/herald` y suma `[Herald <estado>]` a `DETALLES_FALLOS` existente + fila en modo tabular + campo `herald` en `--json`. Reutiliza `enviar_alerta_notificacion` (único canal); no dupliqué lógica de alertas. |
| `docs/permisos-api.md` | Las 4 rutas nuevas con su clasificación (exigido por AGENTS.md). |

**No tocado (trabajo paralelo de `agy2`, Encargo 276, presente en el árbol antes de mi corrida final):** `src/features/notificaciones/*`, `backend/app/modules/notificaciones/plantillas_stack.py`, `backend/tests/test_plantillas_stack.py`, `backend/app/modules/notificaciones/assets/`, `backend/pyproject.toml`, `package.json`, `bridge/01_tarea_activa.md`, `LICENSE`. No los modifiqué ni los validé.

---

## 3. Decisiones y límites ( honestidad )

1. **Reintento: permiso `usuarios:gestionar`.** La tarea pidió "reutilizar el más restrictivo ya existente para administración de identidades". Revisé `requerir_permiso` y el catálogo (`identidad/catalogo.py`): la administración de usuarios en `identidad/router.py` usa `usuarios:gestionar` en sus 6 rutas; no existe un permiso más restrictivo para administración. No usé `auditoria:leer` (solo lectura).
2. **Auditoría del reintento:** `auditoria.registros_auditoria` con `accion='REINTENTO_MANUAL_HERALD'`, `usuario_id` = actor autenticado, `causal='tecnica'`, `justificacion_motivada` con el correo de destino y `metadatos` con los intentos previos. Mismo mecanismo que identidad/mesas.
3. **`error_detalle` verificado:** el worker solo escribe `type(exc).__name__` (p. ej. `SMTPServerDisconnected`); confirmado en `worker.py` y cubierto por la batería previa. No expone datos sensibles.
4. **Fuentes del resumen diario (solo fuentes reales del modelo, sin inventar):**
   - *Acciones (últimas 24 h)*: filas `gestion_institucional` del destinatario en `notificaciones_transaccionales` (ya contienen acción y detalle).
   - *Pendientes de facilitadores*: (a) propuestas `estado='publicado'` sin concepto dentro del término legal — el modelo no tiene un campo "concepto", por lo que la ausencia de transición a `en_revision/incorporado/rechazado` **es** el pendiente, mismo criterio que la `alerta_pendientes` del Encargo 273; (b) actas `estado='BORRADOR'` pendientes de cierre (`mesas_trabajo.actas_comunitarias`).
   - **Quedó fuera y por qué:** pendientes de comunicaciones (tareas del cronograma: no hay campo "vencido" en el modelo, solo fechas que exigen regla de negocio nueva), propuestas con `requiere_consulta_previa` (no hay estado de "consulta iniciada"), y cualquier pendiente por rol que no sea `facilitador_mesa` (no hay modelo de asignación). No los inventé.
   - Tope de **25 por fuente** (constante `LIMITE_PENDIENTES_POR_FUENTE`), lo más reciente primero: un correo legible en un solo mensaje y determinista. Documentado aquí como límite.
5. **El comprobante inmediato no cambió:** no modifiqué comportamiento de Fase 2 ni plantillas existentes; solo añadí la función nueva al final del módulo de plantillas.
6. **Corrección encontrada en la corrida real (no en las pruebas):** el latido escribía `procesados: 0` siempre, porque el `Counter` del worker solo contiene claves de estado (`enviado`, `simulado`, …) y no una clave `procesados`. Lo corregí derivando `procesados` como `sum(resultados.values())` en `escribir_latido`, y la prueba del upsert ahora usa el formato real del Contador. **Este es exactamente el tipo de fallo que el encargo quería hacer visible.**
7. **`mas_antiguo_segundos`** se calcula con `min(extract(epoch from now() - creado_en)) FILTER (pendiente)` (Postgres no admite `FILTER` sobre `extract`, solo sobre agregados).
8. **No instalé ni habilité** las unidades systemd (lo hace `agy:0.0`); `systemd-analyze verify` sobre ambos archivos: exit 0.
9. **`alembic check`**: el único drift listado es el pre-existente `actividades_anexos` (Encargo 265, ya documentado como ajeno en la entrega 273). `herald_latido` no genera operaciones: modelo ↔ migración coinciden.
10. **Uso del relé local durante la verificación:** la primera corrida puntual de `worker_cli --una-vez` contra la base de **pruebas** usó el `backend/.env` (`POLIS_SMTP_HOST=127.0.0.1`, Postfix local de envío solo) y marcó como `enviado` 112 filas **de fixtures de prueba** con destinatarios `@example.org` (dominio reservado RFC 2606, sin destinatario real). `bd_csh` no se consultó ni se escribió. Las corridas siguientes forzaron `POLIS_SMTP_HOST=""` (modo simulado). Lo registro por transparencia.

---

## 4. Resultados reales de verificación

### 4.1 `ruff` (obligatorio antes de entregar)

```
$ .venv/bin/ruff check .
All checks passed!
$ .venv/bin/ruff format --check <archivos tocados>
20 files already formatted
```

### 4.2 Batería exigida por la tarea + suite nueva (base `polis_test_herald_275` recién creada)

```
$ pytest tests/test_calidad_correo_herald.py tests/test_servicio_correo_transaccional.py \
        tests/test_herald_fase2.py tests/test_notificaciones_y_radicacion.py \
        tests/test_aportes_remediacion.py tests/test_herald_salud_resumen.py -q
........................................................................ [ 57%]
......................................................                   [100%]
126 passed in 50.59s
```

**126/126 en verde: cero fallos, incluido el pre-existente de agendas** (no apareció en esta batería porque `test_mesas_agenda.py` no forma parte de ella).

Suite nueva `test_herald_salud_resumen.py`: **30/30**, cubriendo los 8 grupos de la sección 5:

1. Función pura `calcular_estado`: saludable, las 4 ramas de degradado y las 3 de crítico (más el caso "sin SMTP en no-producción no es crítico").
2. Latido: ciclo vacío (`procesados: 0`), upsert de fila única, y fallo de escritura (sesión rota) que **no propaga** y deja la entrega intacta.
3. `/notificaciones/salud`: 401 sin sesión, 403 sin permiso, 200 con permiso; contrato exacto de claves y **búsqueda del valor sembrado** de `smtp_host`/`smtp_usuario`/`smtp_contrasena` en la respuesta serializada → ausentes.
4. `/health/herald`: sin auth, claves exactas `{estado, motivos}`, sin cifras de cola, sin `@`, sin credenciales.
5. Reintento: 200 + fila `pendiente`/`intentos=0`/`proximo_intento_en=NULL`/`error_detalle=NULL` verificados **desde otra sesión**, registro de auditoría con `usuario_id` correcto; 404 inexistente; 409 (fallido reintentable y no-fallido).
6. Resumen: contenido correcto (asunto, radicado, pendientes, nombre, cabecera institucional); **cero correos vacíos**; **idempotente** (dos corridas = 1 fila); huso `America/Bogota` (acción 2026-10-31 23:30 CO = 2026-11-01 04:30 UTC incluida el 31/10 y excluida el 01/11); `--simular` imprime sin encolar.
7. XSS: `<script>` y `<img onerror>` quedan escapados en nombre y listas.
8. Ciclo de migración `0093 → 0094 → 0093 → 0094` sobre `polis_test_herald_275_mig`, verificando tabla, CHECK con `resumen_diario` e índice único parcial en cada estado, más `alembic check` al final.

### 4.3 Corrida real del ejecutor con latido (fuera de pytest)

```
$ python -m app.modules.notificaciones.worker_cli --una-vez   # cola vacía
INFO polis.herald Ciclo de entrega: {} (sin elementos)
$ psql -c "SELECT ultimo_ciclo FROM participacion_ciudadana.herald_latido;"
{"enviado": 0, "fallido": 0, "simulado": 0, "procesados": 0}      ← latido escrito con cola vacía

# 3 filas pendientes sembradas, modo simulado:
$ POLIS_SMTP_HOST="" python -m app.modules.notificaciones.worker_cli --una-vez
{"enviado": 0, "fallido": 0, "simulado": 3, "procesados": 3}      ← tras corregir el defecto del punto 6
```

### 4.4 CLI del resumen (simulación real)

```
$ python -m app.modules.notificaciones.resumen_cli --simular --fecha 2026-10-31
[SIMULACIÓN] Resumen del día 31/10/2026 para …@example.org: 0 acciones, 25 pendientes
…
Resumen diario simulación: 8 destinatario(s) para el 2026-10-31
```

### 4.5 Unidades systemd y monitor

- `systemd-analyze verify polis-herald-resumen.service polis-herald-resumen.timer` → exit 0.
- `bash -n scripts/monitor_sistema_polis.sh` → sintaxis OK; la sección 2.5 consulta `/health/herald` y alimenta el mecanismo de alerta y el JSON/tabular existentes.

### 4.6 Limpieza

```
DROP DATABASE polis_test_herald_275;
DROP DATABASE polis_test_herald_275_mig;
-- sin bases polis_test_herald% residuales
```

`git log --oneline -1` → `2aad798` (sin commit). No hice push.

---

## 5. Riesgos y notas para `agy:0.0`

1. **Orden de despliegue:** la migración 0094 debe aplicarse antes de desplegar el backend con este cambio (el modelo declara la tabla y el CHECK; sin ella, el endpoint de salud falla al consultar `herald_latido`).
2. **`polis-herald.service` debe seguir deshabilitado hasta publicar DNS** (condición previa que confirmo respetada: no lo toqué). El resumen diario encola; la entrega depende del ejecutor.
3. El timer usa `OnCalendar` con zona `America/Bogota` y `Persistent=true`; si el servidor está apagado a las 07:00, dispara al arrancar (comportamiento deseado, pero implica un arranque con carga de correo).
4. El chequeo del monitor **no tiene cooldown propio**: si el Herald está degradado, cada corrida de cron reenviará la alerta (mismo comportamiento que el resto de chequeos del script; el "anti-spam" del script es el consolidado por corrida). Si quieres deduplicación temporal, dímelo y la añado en una segunda iteración.
5. El reintento manual no verifica que el destinatario siga siendo válido; si la dirección causal sigue rota, el worker lo marcará `fallido` de nuevo tras `MAX_INTENTOS` (el ciclo se repite). Es el comportamiento esperado, pero conviene que el frontend muestre `error_detalle` antes de reintentar (ya está expuesto en `/historial`).
6. `por_tipo` en `/salud` agrupa todo el historial por tipo (enviados/fallidos de 24 h + pendientes actuales); con una cola muy grande el agregado es acotado por los índices, pero es la única consulta que puede crecer con la tabla. Si el volumen preocupa, puede acotarse a 24 h en una iteración futura.

**Firmado como:** entregable técnico de EDD, pendiente de revisión EAF. Los checks aprobados son evidencia técnica, no un dictamen ni autorización de despliegue.
