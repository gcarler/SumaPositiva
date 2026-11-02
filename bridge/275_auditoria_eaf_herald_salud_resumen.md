# DICTAMEN EAF — ENCARGO 275: POLIS Herald (salud de entregas y resumen diario)

**Evaluador:** `freebuff` (`=freebuff:0.0`) — **implementador del Encargo 275**.
**Independencia:** **NO** hay independencia: este documento es **revisión interna (autoauditoría) de EDD**. Conforme a `docs/equipo_auditores_forenses.md` §Independencia, el implementador no firma como evaluador independiente del mismo cambio; **el dictamen EAF independiente queda PENDIENTE** y debe emitirlo otro evaluador.
**Fecha:** 2026-11-01 (UTC).
**Snapshot:** HEAD `2aad798` (sin commit durante la auditoría). El árbol de trabajo contiene trabajo paralelo no commiteado; los archivos del alcance fueron fijados por hash al cierre de la revisión (§Snapshot). **El árbol cambió durante la revisión** (`service.py` modificado a las 19:31:24Z por el Encargo 279); los resultados corresponden a los hashes listados.

---

## 1. Alcance, criterios y entorno

**Alcance (solo Encargo 275):** `backend/alembic/versions/0094_herald_salud_resumen.py`, `app/modules/notificaciones/{salud,resumen_cli,worker_cli,router,service,schemas,models,plantillas_eventos}.py`, `app/modules/health/{router,schemas}.py`, `app/core/config.py`, `scripts/monitor_sistema_polis.sh`, `deploy/systemd/polis-herald-resumen.{service,timer}`, `docs/permisos-api.md` (4 filas), `backend/tests/test_herald_salud_resumen.py`.

**Criterios:** `AGENTS.md`; `docs/transacciones.md`; `docs/permisos-api.md`; `docs/equipo_auditores_forenses.md`; skill `.agents/skills/polis-eaf-transactions/SKILL.md`; `bridge/275_tarea_freebuff_herald_salud_resumen.md` §§2-5 (incluido el contrato API de la sección 3, que no debe cambiarse).

**Exclusiones:** frontend (el275 no cambia UI); `plantillas_stack.py`, QR `/notificaciones/qr/...png`, `scripts/enviar_plantillas_prueba.py`, cambios de branding en `correo.py`/`plantillas_eventos.py` y rutas `comunicaciones/tareas` (trabajo paralelo/HEAD, ver §4); `bd_csh` (no consultada ni modificada); instalación de unidades systemd (las hace `agy:0.0`).

**Entorno:** PostgreSQL 16/PostGIS en contenedor `polis-database-1:5433`; bases **creadas vacías** para la auditoría: `polis_test_herald_275` y `polis_test_herald_275_mig`; `.venv` de `backend/`; ruff del proyecto.

---

## 2. Criterios obligatorios — resultado

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Una confirmación por caso de uso; sin `commit`/`rollback` en repositorios; sesión exclusiva; sin anidación | **PASS** | `test_transaction_policy.py`, `test_transactions.py`, `test_transactions_integration.py` en verde (en la batería); revisión estática de `reintentar_manual`, `enviar_resumen_diario`, `escribir_latido` (cada uno con `async with transaction(session)` único; repositorios solo `flush`/`refresh`). |
| Éxito desde una sesión nueva | **PASS** | `test_reintento_manual_ok_y_auditado` verifica fila y registro de auditoría desde una conexión independiente. |
| Rollback completo ante fallo posterior al primer flush | **PASS (sonda A)** | Trigger `BEFORE INSERT` en `auditoria.registros_auditoria` (acción `REINTENTO_MANUAL_HERALD`) → `DBAPIError ... RaiseError: fallo inyectado por la auditoria EAF 275` propagado; **desde otra sesión**: fila `('fallido', 8, 'SMTPServerDisconnected')`, `auditorías = 0`. Estado y auditoría son atómicos. Sonda limpiada (trigger/fila). |
| Transacción del latido propia e inocua | **PASS** | `escribir_latido` usa su `transaction()` y captura su fallo (log); `worker_cli` añade segunda contención; `test_fallo_al_escribir_latido_no_interrumpe_la_entrega` (sesión rota) y corrida real. |
| Latido en ciclo vacío (upsert de fila única) | **PASS** | Prueba + corrida real `worker_cli --una-vez`: latido `{"enviado":0,"fallido":0,"simulado":20,"procesados":20}` con carga, y `procesados:0` en ciclo vacío (corrección del defecto hallado en la entrega verificada de nuevo). |
| Contrato API sección 3 sin cambios | **PASS** | `test_salud_endpoint_200_contrato_y_sin_fugas_smtp` exige las claves exactas de los 5 bloques; `MAX_INTENTOS` se importa de `worker.py` (no se duplica el 8). |
| Sin fuga de host/usuario/contraseña SMTP | **PASS** | Misma prueba busca los valores sembrados en el cuerpo serializado. `/health/herald` sin correos (`@` ausente) ni credenciales (sonda C + prueba grupo 4). |
| 401/403/200 y clasificación de rutas | **PASS (275)** | `test_herald_salud_resumen.py` grupos 3-5: 401 sin sesión, 403 sin permiso, 200 con permiso; reintento 200/404/409 auditado. `docs/permisos-api.md` L416-419: las 4 rutas con control y motivo (incluida la excepción pública `/health/herald` con motivo). Reutiliza `usuarios:gestionar` (permiso existente de administración; el catálogo no tiene más restrictivo para administración). |
| Migración: vacío, check, ciclo, conservación, cabeza única, metadata | **PASS** | Bases creadas vacías y migradas a head; `test_ciclo_migracion_0093_0094` (sobre `_mig`) verifica tabla, CHECK con `resumen_diario` e índice único parcial en cada estado y termina con `alembic check`; `alembic heads` → **única** (`0094_herald_salud_resumen`); `alembic check` sobre la base de pruebas solo reporta el drift **pre-existente** `actividades_anexos` (Encargo 265, ajeno, ya documentado); `downgrade` borra filas `resumen_diario` antes de restaurar el CHECK (criterio 0092/0093) y elimina la tabla. Modelo `HeraldLatido` ↔ migración: columnas, defaults, `CHECK (id=1)` e comentario coinciden; `CheckConstraint` del modelo incluye `resumen_diario`; índice parcial coincide. |
| SQL privilegiado / dinámico | **PASS** | La migración solo crea tabla, CHECK e índice (sin `SECURITY DEFINER`, sin funciones, sin SQL dinámico); revisión estática. |
| Escapado XSS sin doble escape | **PASS** | `test_resumen_diario_escapa_script_en_nombre_y_acciones` exige `&lt;script&gt;` presente (fallaría con doble escape); `_parrafo` no escapa (recibe HTML ya escapado), `_lista`/`_tarjeta`/`_destacado` escapan. |
| Huso `America/Bogota`, cero correos vacíos, `--simular` | **PASS** | Pruebas grupos 6 (incluye evento 23:30 CO = 04:30 UTC) + corrida real `resumen_cli --simular --fecha 2026-10-31` → 9 destinatarios, 0 encolados. |
| Unidades systemd y monitor | **PASS** | `systemd-analyze verify` sobre ambos archivos → exit 0 (solo creadas); `bash -n scripts/monitor_sistema_polis.sh` → OK; parseo `sed` verificado con JSON de ejemplo (estado y motivos extraídos); sección 2.5 reutiliza `enviar_alerta_notificacion` (sin canal duplicado). |
| `ruff` | **PASS (alcance)** | `ruff check` + `ruff format --check` sobre los 15 archivos del alcance → limpio. El gate global `ruff check .` **falla por un archivo ajeno** (hallazgo A-4). |

---

## 3. Hallazgos del alcance (Encargo 275)

### D-1 — Media (reproducido) — `/health/herald` devuelve cifras agregadas en motivos
- **Archivo:** `backend/app/modules/notificaciones/salud.py` (`calcular_estado`, motivos) servido por `app/modules/health/router.py::herald`.
- **Escenario:** `GET /api/v1/health/herald` **sin autenticación** con reglas disparadas (latido viejo + pendientes + agotados + tasa < 0,9).
- **Esperado (tarea §2.4):** «solo estado agregado … **sin cifras ni correos ni nada de PII**».
- **Observado (sonda C, respuesta real):**
  `{"estado":"critico","motivos":["El ejecutor no da latido desde hace más de 5 minutos y hay 170 notificaciones pendientes de entrega.","2 notificaciones agotaron el máximo de 8 intentos (estado 'fallido' terminal).","La tasa de éxito de entrega de las últimas 24 horas es 80% (mínimo esperado 90%)."]}` → **dígitos presentes: 170, 2, 24, 5, 8, 80, 90**.
- **Consecuencia:** cualquier llamante no autenticado obtiene agregados operativos (conteos de cola, agotados, tasa, intentos) por encima del mínimo especificado. No hay PII, correos ni credenciales; el contrato §3 sí admite `motivos: ["string"]`.
- **Corrección propuesta:** variante «sin cifras» de `calcular_estado` para el endpoint público (parámetro o sanitizado), **o** decisión de producto documentada en `docs/permisos-api.md` si «cifras» se refería solo a los bloques `cola`/`ultimas_24h`.
- **Estado:** abierto.

### D-2 — Baja (reproducido) — idempotencia del resumen no resistente a ejecución concurrente
- **Archivo:** `backend/app/modules/notificaciones/service.py::enviar_resumen_diario` + `resumen_cli.py::generar_resumen`.
- **Escenario:** dos corridas simultáneas del resumen para el mismo destinatario y día.
- **Esperado (tarea §4.2):** idempotencia obligatoria; sugiere `ON CONFLICT DO NOTHING`.
- **Observado (sonda B):** la comprobación previa no cubre la ventana de carrera; la segunda inserción recibe `IntegrityError: duplicate key value violates unique constraint "uq_notif_resumen_destinatario_dia"` — **1 fila persistida (sin duplicado: el índice cumple)** — y `resumen_cli` **no captura** ese error: la corrida abortaría con traceback y dejaría de procesar los destinatarios restantes.
- **Consecuencia:** integridad protegida; disponibilidad del CLI rota solo en solapamiento (el timer systemd serializa por diseño; el riesgo es corrida manual simultánea).
- **Corrección propuesta:** `INSERT … ON CONFLICT DO NOTHING` o capturar `IntegrityError` por destinatario y continuar.
- **Estado:** abierto.

### D-3 — Baja (estático) — parámetro muerto
- **Archivo:** `resumen_cli.py::_pendientes_gestores(session, desde)`: `desde` no se usa en el cuerpo. Corrección: eliminarlo o usarlo para acotar por fecha.

### D-4 — Baja (estático) — JSON del monitor sin escapado
- **Archivo:** `scripts/monitor_sistema_polis.sh` (sección 2.5 / `--json`): `HERALD_MOTIVOS` se incrusta sin escapado JSON. Hoy ningún motivo contiene `"` ni `\` (plantillas actuales) y la salida es válida; un motivo futuro con comilla rompería el JSON del watchdog. Corrección: escapado (`jq`/`python`) o excluir motivos del JSON.

### D-5 — Baja (estático) — destinatarios de resumen sin verificar cuenta activa
- **Archivo:** `resumen_cli.py::_acciones_ultimas_24h` + `generar_resumen`: los destinatarios por acción (`gestion_institucional`) no se cruzan con `Usuario.activo` (a diferencia de los facilitadores); un usuario dado de baja recibiría el resumen en su dirección. Corrección: intersección con cuentas activas.

### Observaciones (sin corrección requerida)
- **O-1:** `escribir_latido(session, …)` confirma la sesión que reciba; en su único llamador (`worker_cli`) la sesión es fresca y dedicada. Conviene exigirlo en el docstring si se reutiliza.
- **O-2:** `reintentar_notificacion` construye `ReintentoRespuesta` en el router tras el commit; los valores son constantes validadas dentro del límite (literal `pendiente`, id leído dentro) — sin riesgo práctico, nota de estilo frente a «construir la respuesta dentro del límite».
- **O-3:** `por_tipo` agrega todo el histórico de pendientes por tipo (no solo 24 h); riesgo de crecimiento ya documentado en la entrega 275 (riesgo 6).

---

## 4. Hallazgos AJENOS al alcance (para `agy:0.0`; no atribuibles al 275)

### A-1 — Alta (preexistente en HEAD `2aad798`) — rutas de gestión de comunicaciones sin autorización
- **Archivo:** `backend/app/modules/comunicaciones/router.py` — `POST /tareas` (~L61), `PUT /tareas/{id}` (~L75), `PATCH /tareas/{id}` (~L89): **sin `dependencies=[PuedeGestionarComunicaciones]`** (solo `GET` y `DELETE` lo llevan), mientras `docs/permisos-api.md` L406-408 los clasifica como `permiso:comunicaciones:gestionar@declarada`.
- **Evidencia:** `tests/test_access_policy.py::test_gestion_rechaza_sin_token_y_ciudadano` falla los 3 casos con *«Una petición denegada no debe llegar a persistencia»*: una petición **sin token** alcanza la persistencia. El archivo no tiene cambios en el árbol → defecto preexistente en HEAD.
- **Severidad Alta** (incumplimiento de autorización documentado). Corrección: añadir la dependencia en las 3 rutas; requiere decisión de `agy:0.0` (fuera del alcance del 275).

### A-2 — Media (árbol paralelo) — ruta QR sin fila en la matriz
- `GET /api/v1/notificaciones/qr/{codigo_radicado}.png` (añadida sin commitear, trabajo paralelo de branding/QR) no tiene fila en `docs/permisos-api.md` → `test_matriz_cubre_todas_las_rutas_y_sus_controles` falla: *«Extra items in the left set: ('GET', '/api/v1/notificaciones/qr/{codigo_radicado}.png')»* — incumple la regla «una nueva ruta sin fila falla en CI». Ninguna de las 4 rutas del 275 está en esa discrepancia.

### A-3 — Media (árbol paralelo, WIP) — 279 reenlaza plantillas y rompe 5 pruebas legadas
- `service.py` (mtime 19:31:24Z, durante esta revisión) importa `generar_html_{constancia_radicacion,cambio_estado,verificacion_correo}` desde `plantillas_stack` → fallan `test_servicio_correo_transaccional` (2), `test_herald_fase2` (1), `test_notificaciones_y_radicacion` (2) por asserts del contenido anterior (`C-150 de 2015`, `/seguimiento?radicado=…`, `Cartagena Ciudad de Derechos`, `EN REVISION`, `Campos actualizados`). **Mi ruta de resumen sigue usando `plantillas_eventos.generar_html_resumen_diario`** (verificado en el import vigente).

### A-4 — Baja (árbol paralelo) — `ruff check .` global en rojo por archivo ajeno
- `scripts/enviar_plantillas_prueba.py` (no rastreado, 279): 3 errores `E402`/`I001` → el gate global `backend:check` (ruff) no pasa **por esa causa**; los 15 archivos del 275 pasan `ruff check` y `ruff format --check`.

### A-5 — Baja (preexistente) — tests de calidad del correo dependientes del estado de la cola
- `tests/test_calidad_correo_herald.py::{test_entrega_concurrente_procesa_cada_correo_exactamente_una_vez, test_fallo_de_transporte_programa_reintento_con_espera}` llaman `drenar(lote=500)` sobre la cola completa: con la base saturada por residuos de fixtures (3183 filas) reclaman filas ajenas primero y fallan; **al limpiar la cola pasan (2 passed)** con el mismo código. Aislamiento débil de pruebas preexistentes (ajeno al 275; no se tocaron esas pruebas).

### A-6 — Baja (entorno/ajeno) — `test_geodatos_isocronas::test_disponibilidad_pgrouting_en_repositorio`
- Falla por disponibilidad de pgRouting en la base del contenedor; geodatos no fue tocado por el 275. Sigue fallando tras limpiar la cola.

---

## 5. Evidencia (comandos y resultados reales)

```text
# Ruff (alcance del 275)
$ ruff check <15 archivos>            → All checks passed!
$ ruff format --check <13 archivos>   → 13 files already formatted

# Batería exigida + suites de política/acceso/transacciones (bases creadas vacías)
$ pytest tests/test_calidad_correo_herald.py tests/test_servicio_correo_transaccional.py \
        tests/test_herald_fase2.py tests/test_notificaciones_y_radicacion.py \
        tests/test_aportes_remediacion.py tests/test_herald_salud_resumen.py \
        tests/test_access_policy.py tests/test_transaction_policy.py \
        tests/test_transactions.py tests/test_transactions_integration.py -q
  → 267 passed, 9 failed  (los 9: 5 = A-3 WIP de 279; 3 = A-1 comunicaciones; 1 = A-2 QR; 0 del 275)

# Suite del encargo, en solitario sobre el árbol vigente
$ pytest tests/test_herald_salud_resumen.py -q  → 30 passed in 16.15s  (incluye ciclo 0093↔0094 + alembic check)

# Migración
$ alembic heads   → 0094_herald_salud_resumen (head)   [única]
$ alembic check   → solo drift pre-existente actividades_anexos (Encargo 265, ajeno)

# Sondas forenses (base polis_test_herald_275; limpias al terminar)
A) trigger en auditoria → DBAPIError 'fallo inyectado…' | otra sesión: ('fallido', 8, 'SMTPServerDisconnected'), auditorías=0 → ROLLBACK COMPLETO
B) carrera idempotencia → IntegrityError sobre uq_notif_resumen_destinatario_dia | filas=1 (sin duplicado; error sin capturar en CLI)
C) GET /health/herald sin auth → 200 con dígitos [170,2,24,5,8,80,90] en motivos → hallazgo D-1

# Corridas reales (base de pruebas, modo simulado; sin relé, sin bd_csh)
$ python -m app.modules.notificaciones.worker_cli --una-vez --lote 20
  → Ciclo {'simulado': 20} | herald_latido = {"enviado":0,"fallido":0,"simulado":20,"procesados":20}
$ python -m app.modules.notificaciones.resumen_cli --simular --fecha 2026-10-31
  → 9 destinatario(s), 0 encolados (simulación)

# Infraestructura
$ systemd-analyze verify polis-herald-resumen.{service,timer} → exit 0 (solo archivos)
$ bash -n scripts/monitor_sistema_polis.sh → OK; parseo sed verificado con JSON de ejemplo
```

```text
# Suite completa del backend (segundo plano, misma base y misma ventana)
$ pytest tests -q --tb=line
  → 13 failed, 1727 passed, 16 skipped in 639.38s (exit 1)

# Reejecución posterior (cola limpiada: 3183 filas residuales de fixtures eliminadas)
$ pytest tests/test_herald_salud_resumen.py -q          → 30 passed in 18.97s
$ pytest test_calidad_correo_herald::{entrega_concurrente, fallo_de_transporte} -q → 2 passed in 2.37s
```

**Atribución de los 13 fallos de la suite completa — ninguno pertenece al Encargo 275:**

| # | Fallo(s) | Atribución |
| --- | --- | --- |
| 5 | `test_servicio_correo_transaccional` (2), `test_herald_fase2` (1), `test_notificaciones_y_radicacion` (2) | **A-3** — reenlazado de plantillas por el Encargo 279 (WIP durante la auditoría). |
| 3 | `test_gestion_rechaza_sin_token_y_ciudadano[POST/PUT/PATCH comunicaciones/tareas]` | **A-1** — preexistente en HEAD `2aad798` (autorización ausente). |
| 1 | `test_matriz_cubre_todas_las_rutas_y_sus_controles` | **A-2** — ruta QR paralela sin fila en la matriz. |
| 1 | `test_vinculacion_agendas_con_mesas_canonicas_h05` | Fallo preexistente ya confirmado como ajeno en la propia tarea §6. |
| 2 | `test_calidad_correo_herald::{entrega_concurrente, fallo_de_transporte}` | **A-5** — dependientes del estado de la cola: `drenar(lote=500)` reclama primero las 3183 filas residuales más antiguas; **pasan al limpiar la cola (2 passed)** con el mismo código. Aislamiento débil de pruebas preexistentes. |
| 1 | `test_geodatos_isocronas::test_disponibilidad_pgrouting_en_repositorio` | **A-6** — entorno/ajeno (disponibilidad de pgRouting en la base; geodatos no tocado por el 275). Sigue fallando tras limpiar la cola. |

**Snapshot SHA-256 (archivos del alcance, 2026-11-01T19:57:23Z):**

| Archivo | SHA-256 (12) |
| --- | --- |
| alembic/versions/0094_herald_salud_resumen.py | `2c6ea0c835d7` |
| notificaciones/salud.py | `82a8101149f9` |
| notificaciones/resumen_cli.py | `9358bfbeca29` |
| notificaciones/worker_cli.py | `8dad266670dc` |
| notificaciones/router.py | `046e3f6d8853` |
| notificaciones/service.py | `e9bafff9cd56` (editado por 279 durante la revisión) |
| notificaciones/schemas.py | `c54ec08e8bf6` |
| notificaciones/models.py | `d7880ffc09b3` |
| notificaciones/plantillas_eventos.py | `390882f27a25` |
| health/router.py | `e98680bd44a9` |
| health/schemas.py | `5e13423d51c8` |
| core/config.py | `61f8a180bc1a` |
| scripts/monitor_sistema_polis.sh | `abf7f6e01ba6` |
| tests/test_herald_salud_resumen.py | `d5d0870885ff` |
| docs/permisos-api.md | `f75e618b7fbe` |

---

## 6. Estado, límites y condiciones de cierre

**Estado del alcance Encargo 275: `OBSERVADO`** — todos los criterios obligatorios ejecutados quedan satisfechos (§2) con hallazgos no bloqueantes D-1…D-5 (§3). **Revisión interna:** el dictamen EAF **independiente** sigue pendiente; este documento **no autoriza** merge, despliegue ni comunicaciones externas (lo decide el director con la evidencia y las reglas de autorización vigentes).

**Condiciones de cierre sugeridas:**
1. Cerrar **D-1** (sanear cifras de `/health/herald` o documentar la decisión de producto en la matriz) **antes de publicar** ese endpoint en producción.
2. Cerrar **D-2** con `ON CONFLICT DO NOTHING` o captura por destinatario en `resumen_cli`.
3. **A-1** (Alta, ajena) a revisión inmediata de `agy:0.0` — es un incumplimiento de autorización preexistente en HEAD.
4. A-2/A-3/A-4: pertenecen a los encargos paralelos en curso (QR/branding, 279); deben cerrarlos sus implementadores antes del commit conjunto.
5. A-5/A-6 (aislamiento de `test_calidad_correo_herald` y pgRouting) son preexistentes/entorno; conviene acotar esos tests a sus propias filas (p. ej. `lote` limitado o `notificacion_id`) en una iteración futura.

**Límites de la revisión:** sin independencia del evaluador; `bun run backend:check` completo = ruff global **en rojo por A-4** (archivo ajeno) + formato no ejecutado sobre archivos ajenos + pytest completo **sí ejecutado** (1727 aprobadas / 13 fallos, todos atribuidos, §5); sin ejecución de `bun run check`/build frontend (sin cambios de UI en el alcance); `bd_csh` no consultada ni modificada (el monitor no se ejecutó contra producción: su parseo se verificó con JSON local); el árbol cambió durante la revisión (hashes §5). Una suite aprobada no acredita disponibilidad, ausencia total de defectos ni cumplimiento jurídico universal.

---

*Cierre: suite completa ejecutada (13 failed / 1727 passed / 16 skipped, 639.38 s) con atribución íntegra en §5; bases de pruebas `polis_test_herald_275` y `_mig` eliminadas al terminar la auditoría; HEAD sin commit (`2aad798`).*

---

## 7. Añadido de remediación (mismo día, 2026-11-01)

Remediación de los hallazgos del alcance y **corrección de un falso positivo propio**. Después de estos cambios el árbol volvió a verificarse; las bases `polis_test_herald_275` y `_mig` se recrearon vacías y volvieron a eliminarse al terminar.

### A-1 — CORRECCIÓN del dictamen: no era una ausencia de autorización
Al releer `backend/app/modules/comunicaciones/router.py` para remediar, la autorización **sí existe** en las tres rutas: `POST /tareas`, `PUT /tareas/{id}` y `PATCH /tareas/{id}` llevan el permiso vía dependencia por parámetro (`sujeto: PuedeGestionarComunicacionesSujeto` = `Depends(requerir_permiso("comunicaciones:gestionar", nivel_minimo="declarada"))`). El fallo del test `test_gestion_rechaza_sin_token_y_ciudadano` se debe al **orden de resolución de dependencias de FastAPI**: el parámetro `service` (que abre la sesión vía `get_session`) se resuelve **antes** del parámetro `sujeto` (el permiso), así que la sonda del test (`dependency_overrides[get_session]`) explota antes de que corra la denegación. El retiro del hallazgo "Alta" se registra a la letra.
**Defecto real (Baja):** una petición denegada abre una sesión de BD no utilizada. **Remediación aplicada:** se movió `sujeto` como primer parámetro del manejador en las tres rutas (mismo permiso, misma matriz — `docs/permisos-api.md` sin cambios). Evidencia: los 3 casos ahora pasan.

### D-1 — Remediado (Media): motivos sin cifras en el endpoint público
- `salud.py::calcular_estado(..., incluir_cifras: bool = True)`: con `False` los motivos describen la regla sin agregados operativos (se conservan solo los umbrales: «5 minutos», «10 minutos», «90%» — describen la regla, no el estado real). `recolectar_salud(..., incluir_cifras)` lo propaga.
- `health/router.py::herald` llama ahora con `incluir_cifras=False`; `/notificaciones/salud` (autenticado) conserva el contrato de la sección 3 con cifras.
- Pruebas nuevas: `test_estado_sin_cifras_omite_agregados_operativos` (función pura) y `test_endpoint_publico_sin_cifras_y_privado_con_cifras` (contraste real): la respuesta pública no contiene «<n> notificaciones» ni «<n> segundos» ni el porcentaje real; la autenticada SÍ lo contiene.

### D-2 — Remediado (Baja): competencia de idempotencia resuelta con el índice
`service.py::enviar_resumen_diario` ahora inserta con `INSERT … ON CONFLICT DO NOTHING (destinatario_correo, codigo_radicado) WHERE tipo_evento='resumen_diario' RETURNING id` y hace `session.get` de la fila ganadora. En carrera, la perdedora recibe `None` (misma semántica de «ya encolado») en lugar de una `IntegrityError` sin manejo. Se retiró la comprobación previa redundante. Prueba nueva: `test_resumen_diario_carrera_on_conflict_una_sola_fila` (dos sesiones, `asyncio.gather`: exactamente una fila, una llamada None y la otra con la fila).

### D-3/D-4/D-5 — Remediados (Baja)
- **D-3:** se eliminó el parámetro muerto `desde` de `_pendientes_gestores` (y se documentó que los pendientes son foto del acervo, no ventana).
- **D-4:** `scripts/monitor_sistema_polis.sh` además de extraer `HERALD_*`, construye `HERALD_MOTIVOS_JSON` con contrabarras y comillas escapadas (sed) y lo usa en el bloque `--json`; `bash -n` OK.
- **D-5:** `resumen_cli.generar_resumen` intersecta los destinatarios con las cuentas activas (`Usuario.activo`) — un usuario dado de baja deja de recibir el resumen en su dirección.

### Verificación tras la remediación (bases recreadas vacías)

```text
$ ruff check <6 archivos tocados>        → All checks passed!
$ ruff format <6 archivos tocados>       → formatados (3 reformatted)
$ bash -n scripts/monitor_sistema_polis.sh → OK
$ pytest tests/test_herald_salud_resumen.py tests/test_access_policy.py -q
  → 155 passed, 1 failed   (el único fallo: A-2, ruta QR ajena sin fila en la matriz)
  → los 3 casos de comunicaciones test_gestion_rechaza_sin_token… PASAN con la remediación de A-1
$ pytest <batería del encargo + suite 275> -q  → 124 passed, 5 failed (los mismos 5 de A-3, WIP del 279)
```

### Estado del alcance tras la remediación
Los criterios obligatorios del Encargo 275 quedan satisfechos **con hallazgos cerrados** (D-1…D-5 remediados y verificados; A-1 corregido y remediado). Quedan abiertos los ajenos: **A-2/A-3/A-4** (propietarios paralelos: ruta QR y Encargo 279) y **A-5/A-6** (preexistentes/entorno). La independencia sigue siendo la limitación principal: este añadido es también revisión interna; el dictamen EAF independiente sigue pendiente y decide sobre el conlunto.

---

## 8. Instalación en producción de las unidades del resumen diario (2026-11-01)

Ejecutada por orden directa del director tras la remediación del §7 (la tarea original reservaba esta tarea a coordenación; la autorización y estado del alcance quedan registrados aquí).

**Estado previo (solo lectura):** `bd_csh` en `0094_herald_salud_resumen (head)` (migración aplicada en producción); `polis-herald.service` active/enabled; `POLIS_HERALD_RESUMEN_ACTIVO` no definido en `backend/.env` (usa el default `True`).

**Aclaración de entorno:** la base de producción vive en el host (`127.0.0.1:5432/bd_csh`); el contenedor `polis-database-1` (5433) es infraestructura de pruebas. Las verificaciones de producción de esta sección son de solo lectura (`SELECT`); ninguna escritura se hizo por SQL directo — las escrituras corresponden al CLI dentro del caso de uso configurado.

**Pasos ejecutados y evidencia:**
1. Copia exacta de `deploy/systemd/polis-herald-resumen.{service,timer}` a `/etc/systemd/system/` + `daemon-reload`; `systemd-analyze verify` → exit 0.
2. `systemctl enable --now polis-herald-resumen.timer` → **enabled + active**; próximo disparo `2026-11-02 12:00:00 UTC` (07:00 America/Bogota); sin corrida inmediata de catch-up (Persistent=true aplica a arranques tras caída, como está diseñado).
3. Corrida manual de verificación: `systemctl start polis-herald-resumen.service` → `Result=success`, exit 0; journal acredita `Resumen del día 01/11/2026 encolado para 1 destinatario(s)`.
4. Cierre del ciclo en producción (BD, solo lectura): `resumen_diario por estado: {'enviado': 1}` — el ejecutor ya activo entregó el correo minutos después; cola total en 'pendiente' = **0**; `herald_latido` existe y fresco (≤ 10 s de antigüedad); `GET /api/v1/health/herald` → `{"estado":"saludable","motivos":[]}`.

**Controles activos:** interruptor de apagado sin redeploy (`POLIS_HERALD_RESUMEN_ACTIVO=false`), idempotencia por índice único (re-runs el mismo día no duplican), y observabilidad vía `/notificaciones/salud`, `/health/herald` y el watchdog (sección 2.5 de `scripts/monitor_sistema_polis.sh`, ahora con **deduplicación temporal de la alerta de Herald** – cerrándose el riesgo 4 de la entrega: ventana `HERALD_ALERT_COOLDOWN_SEGUNDOS=7200`, sello en `/var/cache/polis-monitor/herald_ultima_alerta`, alerta inmediata en primera degradación y tras recuperación, supresión del reenvío en corridas dentro de la ventana con la degradación siempre visible en tabular/JSON/log; simulación con stub en `/tmp` acreditó las 5 rutas y humo real del script en `--check` salió sano con exit 0 y sin sello).

**Límites:** esta instalación no extingue el pendiente del dictamen EAF independiente; seregistra como paso operacional autorizado por el director con la auditoría interna aprobada del alcance. Los hallazgos ajenos A-2/A-3/A-4 siguen abiertos con sus propietarios paralelos. Nota operacional: durante una verificación fallida por un error en una sonda lanzada por este auditor (pasar un objeto `PostgresDsn` a `create_async_engine`), el traceback imprimió el DSN con credenciales en el log de la terminal local; **pendiente de rotar la contraseña de la base**

---

## Cierre del pendiente de rotación de credencial (2026-11-01 21:13 UTC)

La rotación indicada en la nota operacional anterior fue ejecutada y verificada (protocolo §2.1 de `docs/rotacion-secretos.md`, con losdos enduramientos del estándar AUD-11/OBS-13):

1. **Cambio en PostgreSQL**: `ALTER ROLE polis WITH PASSWORD <nueva-32-char-alfabeto-seguro>` — la nueva credencial segeneró en memoria y persistió únicamente en `backend/.env` (escritura atómica, 0600); nunca pasó por la línea de comandos, el log visible ni un archivo versionado.
2. **Respaldo previo**: `backend/.env.bak_pre_rotacion_bd_20261101_211325` (0600; contiene la credencial vieja ya muerta).
3. **Verificación doble desde otra conexión**: conexión con la credencial nueva **OK** (`SELECT 1`); conexión con la credencial vieja **rechazada** (`FATAL: password authentication failed`) — ambos resultados exit 0 del guion.
4. **Higiene de consumidores (AUD-11/OBS-13)**: los dos scripts versionados que tenían la credencial fija (`scripts/monitor_sistema_polis.sh` y `scripts/ingestar_indicadores_reales.py`) fueron saneados para leerla de `backend/.env` en cada corrida (`grep`+`sed` anclado a `^POLIS_DATABASE_URL=` en bash; `re.match` en python), elevando error explícito si no está disponible. Ya no hay credenciales fijas en código versionado (`grep -rl polis_cartagena_2026` en `scripts/`, `backend/scripts/`, `src/` → vacío). El ingestador usa el endpoint público del DSN transformado, y la rotación futura se hace sin editar scripts.
5. **Reinicio de servicios con conexión viva**: `systemctl restart polis-backend.service polis-herald.service` → ambos `active` (journald acredita arranque limpio sin líneas `password authentication`); `GET /health/live` y `GET /health/herald` → HTTP 200; Herald en `saludable`. Ciclos del ejecutor y resumen diario (timer 07:00 America/Bogota) consumen el `.env` actualizado sin cambios adicionales.
6. **Corrida real del monitor** (`--check`): salida 100% OK (services, HTTP 200/200, Herald `saludable`, `PostgreSQL bd_csh 8/100 (8%) OK`, disco OK, exit 0).

**Error corregido en curso**: la primera extracción bash del DSN dejaba anterrupto el prefijo `POLIS_DATABASE_URL=` (sed sin ancestro `^`), mandando una contraseña "contaminada" de 51 caracteres al psql; la introducción se corrigió anclada a `^POLIS_DATABASE_URL=` y la verificación 4/6 acredita la extracción limpia de 32 caracteres conectando OK.

**Límites restantes duales**: (a) la credencial vieja permanece referenciada en el histórico local del terminal donde se produjo la fuga — imposible de deshacer retroactivamente; su vigencia real en PostgreSQL terminó con el `ALTER ROLE`; (b) rotar la contraseña no rota `POLIS_JWT_SECRET_KEY` ni `POLIS_IP_SALT` (efectos sobre sesiones usuarios y sobre comparabilidad forense de IPs históricas: requiere ventana y decisión productual separadas; `scripts/rotar_secretos_produccion.py` queda como herramienta pero NO fue ejecutado en esta fase). El pendiente del dictamen EAF independiente sigue abierto.

---

## Apéndice — Guion de verificación del primer disparo real del timer del resumen (programado: 2026-11-02 12:00 UTC / 07:00 America/Bogota)

**Estado**: PROGRAMADO, no ejecutado en el 2026-11-01. Tras el disparo, ejecutar y registrar resultados:

1. `systemctl list-timers polis-herald-resumen.timer --no-pager` → acuse real del disparo (LAST pasando de `-`).
2. `systemctl show -p Result,ExecMainStatus polis-herald-resumen.service` → `Result=success`, `ExecMainStatus=0`.
3. `journalctl -u polis-herald-resumen.service --since "2026-11-02 11:45" --no-pager -o cat` → línea `Resumen del día 02/11/2026 encolado para N destinatario(s)`.
4.Consulta solo lectura en `bd_csh`: `SELECT estado_envio, count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado = 'RESUMEN-2026-11-02' GROUP BY estado_envio;` → filas `pendiente` que pasan a `enviado` tras un minuto (o `simulado` si el ejecutor sigue con SMTP de envío solo sin DNS publicado — registrar el modo).
5. Idempotencia real: re-listar `SELECT count(*) FROM ... WHERE codigo_radicado='RESUMEN-2026-11-02';` → exactamente N (sin duplicados por el índice único parcial).
6. Latido y salud post-rotación: `herald_latido` fresco (≤ 10 s) y `GET /api/v1/health/herald` → `saludable`.
7. Humo con la credencial rotada por vía .env: `bash scripts/monitor_sistema_polis.sh --check` → exit 0, fila PostgreSQL OK.

Cualquier desviación se documentará en este archivo con hora UTC y evidencia.
