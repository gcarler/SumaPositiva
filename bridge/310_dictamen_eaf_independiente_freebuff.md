# DICTAMEN EAF INDEPENDIENTE — ENCARGO 310 (SM Core)

**Evaluador:** `freebuff:0.0` (Equipo de Auditoría Forense, perfil forense-backend/BD con revisión de frontend)
**Implementadores evaluados:** `codex:0.0` (310-BK) y `agy2:0.0` (310-UI)
**Encargo:** [`310_tarea_freebuff_auditoria_eaf_sm_core.md`](310_tarea_freebuff_auditoria_eaf_sm_core.md)
**Fecha del dictamen:** 2026-11-08 (UTC)
**Snapshot evaluado:** HEAD `78cd08e80252b82c7c903030a6bf79fdf9d8fa67`, árbol de trabajo congelado con 309+310 sin commitear.

**Veredicto: `RECHAZADO` (BLOQUEADO) — remediación y reinspección obligatorias.**

---

## 1. Declaración de independencia y método

No implementé el SM Core. El candidato evaluado (`backend/app/modules/sm/**`, migraciones `0098`–`0099`, hook de `notificaciones`, CLI, pruebas y frontend `src/features/sm/**` + Mesas 310) fue producido por `codex` y `agy2`. Mis únicos cambios en el árbol, previos a esta auditoría, están fuera del alcance SM: ficha pública de `actores`, montaje de `actores/alternativas/fuentes` en `api/router.py` y documentación de conteos. Ninguno toca archivos de la entrega 310, y el hash de los 27 archivos del sello coincide con el estado actual (ver 1.1), por lo que el objeto auditado es exactamente el artefacto de Codex.

Antes de evaluar se identificó que el árbol no está versionado; esta auditoría **no hizo commit, push, migración productiva, reinicio de servicios ni escritura en `bd_csh`**. La sonda a producción fue una lectura HTTP (`/api/v1/health/ready`, 200).

### 1.1 Fijación del snapshot

| Comprobación | Resultado |
| --- | --- |
| HEAD | `78cd08e80252b82c7c903030a6bf79fdf9d8fa67`, igual a `head_base` del sello |
| Archivos del candidato en `snapshot_codigo.json` | **27/27 con SHA-256 coincidente**, 0 distintos, 0 faltantes |
| Sello `sello_entrega.json` | `codigo_congelado=true`, `dictamen_EAF=false`, `commit_codex_310=false`, `push_codex_310=false`, `bd_csh_migrada=false`, `despliegue_realizado=false`, `restarts=0` |
| Producción (solo lectura) | `/api/v1/health/ready` → HTTP **200**, `database=ok`, `migrations=ok`, `extensions=ok` |
| Alembic en el checkout | cabeza única `0099_sm_worker_backoff`, `alembic check` → *No new upgrade operations detected* |

### 1.2 Métodos y entorno

- Lectura adversarial de los 15 módulos SM, dos migraciones, el hook de `NotificacionService`, la CLI, las cinco suites SM y los componentes/API/store del panel.
- Base aislada **`polis_test_routers_310`** y **`polis_test_routers_mig_310`** creadas para esta auditoría (PostgreSQL/PostGIS local, rol de laboratorio). Ninguna consulta a `bd_csh`.
- Script forense independiente `/tmp/eaf310_verificacion.py` (bóveda, fuga en seis tablas, simulación, revocación).
- `pytest` con y sin las variables de entorno que exige la suite; `alembic upgrade/downgrade/check`; reconstrucción completa.
- Frontend: `bun run check`, `bun run ui:check`, `bun test src/features/sm src/features/mesas`.
- **Límites:** no se probaron credenciales reales de Telegram/WhatsApp/SMS ni entrega SMTP fuera de loopback; no se ejecutó el ensayo sobre la copia de `bd_csh` (el laboratorio 15433 exige credenciales que no poseo). El `ensayo_migracion_clon_bd_csh.json` de Codex se toma como evidencia de entrada, no como verificación propia. La base de prueba requirió habilitar manualmente pgRouting 4.0.1; sin ella falla una prueba preexistente de geodatos, ajena al 310 (§3.1). No se evaluaron P5 (paridad/corte de Herald) ni P7 (despliegue), que el plan declara pendientes.

---

## 2. Matriz de hallazgos

| ID | Severidad | Tipo | Hallazgo | Evidencia |
| --- | --- | --- | --- | --- |
| HAL-01 | **Alta** | Reproducido | La suite SM depende de variables de entorno no declaradas (`POLIS_SM_BOVEDA_KEY`, `POLIS_SM_WORKER_HABILITADO`); en entorno limpio fallan 14 pruebas y el gate `bun run backend:check` queda rojo en CI | 81 passed / **14 failed** sin variables; **95 passed** al definirlas (§3.1) |
| HAL-02 | **Alta** | Estático (reproducible en build no productivo) | El cliente frontend fabrica éxito cuando la API falla: salud "saludable" con 12 enviados, mensajes falsos "enviado", ronda de worker con `enviados: 2` y evento aceptado con `estado: "enviado"` inventado | `src/features/sm/api/sm-api.ts:16,66-67,91,114-117,134-146` |
| HAL-03 | **Alta** | Estático (con consecuencia material al usarse) | Mesas inventa el correo del responsable (`nombre.apellido@cartagena.gov.co`) y envía el **nombre de la persona** como `actor`; la convocatoria usa una dirección institucional fija como destinatario. Contradice «cero PII» y el actor opaco | `src/features/mesas/components/mesa-compromisos-tabla.tsx:134-144`; `mesa-logistica-panel.tsx:94-99` |
| MED-01 | Media | Estático | Las operaciones institucionales de SM no registran al operador autenticado: la auditoría guarda el `actor` ciudadano, no quién otorgó el consentimiento o disparó el worker. El «no repudio» queda incompleto | `backend/app/modules/sm/router.py:93-115,244-266`; `service_db.py:20-39` |
| MED-02 | Media | Estático | El hash de contacto es SHA-256 sin secreto (`tenant\|actor\|canal\|sm-v1\|contacto`); es enumerable por diccionario para teléfonos/correos desde la BD o la propia API. La UI lo presenta como «hash irreversible» y «Habeas Data verificado» | `backend/app/modules/sm/core.py:31-36`; `sm-panel-operativo.tsx:171,474` |
| MED-03 | Media | Estático | Backoff sin techo: `base * 2^intento`; con `MAX_REINTENTOS=20` configurable, el intento 19 programa ~182 días y el 20 ~364 días | `backend/app/modules/sm/worker.py:236-239`; `config.py` (rango 1–20) |
| MED-04 | Media | Estático | `GET /api/v1/sm/health` es público y expone volumen de mensajería, simulaciones, latido del worker y canales degradados; útil para un atacante como reconocimiento operativo | `router.py:265-276`; `docs/permisos-api.md:431` |
| MED-05 | Media | Estático | Una reclamación vencida lanza `SMError` y **aborta el lote completo**; la CLI termina con código 1 y el daemon depende de `Restart=on-failure`. Un mensaje obsoleto detiene la ronda y retrasa al resto | `worker.py:222-225`; `scripts/sm_worker_cli.py:70-81`; `docs/sm-worker.md` |
| MED-06 | Media | Estático | El panel no refleja los estados nuevos: `SMEstadoMensaje` omite `simulado`; `SMSalud` omite `simulados`, `worker_ultimo_latido`, `canales_degradados` y `antiguedad_pendiente_segundos`; «Agotados» se calcula sobre la página visible (≤50), no sobre la salud | `src/features/sm/models/sm-types.ts:9-18,28-38`; `sm-panel-operativo.tsx:137-141` |
| BAJ-01 | Baja | Estático | `sm.notificacion.general` usa `{entidad}` sin declararla requerida: puede quedar el marcador literal | `backend/app/modules/sm/templates.py:95-96` |
| BAJ-02 | Baja | Estático | La máquina de estados `transicion_estado` no se aplica en el worker; las transiciones se escriben como cadenas directas | `core.py:80-99`; `worker.py:196-250` |
| BAJ-03 | Baja | Estático | `SMRepository.despachar_mensaje` abre `WITH FOR UPDATE` sin delimitar transacción; hoy no lo usa la API, pero un llamador futuro dejaría un bloqueo abierto hasta el cierre de sesión | `repository.py:356-395` |
| BAJ-04 | Baja | Estático | `POST /sm/consent` convierte cualquier excepción (incluida clave de bóveda ausente o fallo SQL) en **400**, ocultando un fallo de servidor/configuración | `router.py:106-112` |
| BAJ-05 | Baja | Estático | `POST /sm/consent` devuelve `contacto_hash` al cliente institucional; amplía la exposición del pseudónimo | `router.py:93-104`; `contracts.py:130-143` |
| BAJ-06 | Baja | Estático | La convocatoria usa `Date.now()` en la idempotencia: dos clics generan dos eventos; la asignación de compromiso sí es idempotente | `mesa-logistica-panel.tsx:100`; `mesa-compromisos-tabla.tsx:145` |

### 2.1 Hallazgos conformes (verificados en esta auditoría)

| Comprobación | Evidencia |
| --- | --- |
| AES-256-GCM con nonce aleatorio de 12 bytes y AAD ligada a versión/tenant/actor/canal/hash/key_id | `boveda.py:52-90`; manipulación de ciphertext → `SMBovedaError` (suite y script propio) |
| Cero contacto en claro en las seis tablas SM | Volcado `row_to_json` de mi tenant de prueba: `False` en todas (§3.2) |
| Revocación purga la bóveda en la misma transacción y cancela el mensaje encolado | 0 filas de bóveda, consentimiento `revocado`, mensaje `cancelado`, sin despacho (§3.2) |
| Rotación recifra con clave nueva y la clave vieja no abre | `test_rotacion_recifra_sin_perdida_y_clave_vieja_no_abre` (95/95) |
| Rollback real tras `flush` (alta y revocación) y sin clave | `test_rollback_real_despues_de_flush_consentimiento_y_boveda`, `test_consentimiento_sin_clave_no_confirma` |
| Ningún transporte de fábrica en `environment=test` sale a red ni usa credenciales | `test_entorno_test_nunca_usa_red_aunque_haya_credenciales`; transporte inyectado en mis pruebas |
| `simulado` es terminal y distinto de `enviado` | Mi corrida: `simulados=1, enviados=0`, entrega `simulado`, estado `simulado` (§3.2) |
| Reclamación confirmada antes de red; dos workers no duplican | `test_dos_workers_sin_duplicados_sin_transaccion_durante_envio` |
| Lease vencido → `incierto`; intento antiguo no confirma | `test_recupera_lease_vencido_y_no_admite_finalizacion_antigua`; `test_caida_en_ultimo_intento_agota_sin_repetir_despacho` |
| Fallo de persistencia final revierte sin atribuir rechazo al proveedor | `test_fallo_persistencia_final_revierte_sin_fingir_fallo_del_proveedor` |
| Hook Herald en la misma transacción, sombra, apagado por defecto, sin duplicar | `test_puente_real_herald_transaccion_misma_sombra_sin_duplicar`; `test_modo_sombra_no_invoca_transporte_ni_con_credenciales` |
| Rechazo de correo/teléfono/destino en campos libres | `test_pii_en_campos_libres_rechazada_antes_de_persistir` (4 casos) |
| Matriz de permisos completa para las 7 rutas SM, 401/403 y ciudadano sin acceso | `test_access_policy` **130 passed**; `test_sm_ciudadano_no_puede_gestionar_ni_leer_outbox`; `test_router_exige_autenticacion` |
| Migraciones: cabeza única 0099, upgrade con datos 0097, downgrade 0098 con preservación de estado, reconstrucción y `alembic check` | §3.3 |
| Frontend: tipos, kit y pruebas | `bun run check` OK, `ui:check` OK, 167 pruebas de `sm`+`mesas` OK |
| Regresión backend completa | **1.993 passed / 1 fallo ambiental / 16 skipped**; el fallo pasa al habilitar pgRouting, de modo que el total equivale al sello (1.994/16/0) (§3.1) |
| Producción intacta | Probing 200; sello de Codex declara 0 commits/push/migraciones/reinicios |

---

## 3. Evidencia ejecutada

### 3.1 Dependencia no declarada de la suite (HAL-01)

```
# Base aislada, sin variables SM:
pytest tests/test_sm_310.py tests/test_sm_full.py tests/test_sm_transports_310.py \
       tests/test_sm_cli_310.py tests/test_sm_core.py
→ 14 failed, 81 passed

# Mismas suites con POLIS_SM_BOVEDA_KEY=<32 bytes> y POLIS_SM_WORKER_HABILITADO=true:
→ 95 passed
```

Causa: `boveda.desde_settings()` exige la clave y los fixtures construyen `Settings(_env_file=None, environment="test", ...)` que siguen leyendo `os.environ`; `sm_worker_habilitado` determina el 409 de `/sm/worker/run-once`. El workflow `.github/workflows/check.yml` solo exporta `POLIS_TEST_DATABASE_URL`/`POLIS_TEST_MIGRATIONS_DATABASE_URL`, por lo que **aplicar el candidato deja el job backend en rojo**. El conftest ya provee valores por defecto para JWT y salt; la corrección es del mismo orden: clave determinista de pruebas en `conftest.py` (o fixture) y flag explícito, sin depender de secretos locales.

**Regresión completa (misma base aislada, con variables SM y extensión pgRouting instalada):**

```
pytest tests → 1 failed, 1.993 passed, 16 skipped en 750 s
tests/test_geodatos_isocronas.py::test_disponibilidad_pgrouting_en_repositorio → 1 failed
# tras CREATE EXTENSION pgrouting 4.0.1 en la base de prueba:
pytest tests/test_geodatos_isocronas.py → 7 passed
```

El único fallo es **ambiental y ajeno al 310**: la base nueva no incluía pgRouting (la migración `0001` no la crea) y la prueba preexistente exige `4.x`. Al habilitarla, ese archivo pasa (7/7), por lo que el agregado equivale al declarado por Codex (**1.994 passed / 16 skipped / 0 failed**) — 1.993 + el test subsanado —; no volví a ejecutar la suite completa tras instalar la extensión. Observación fuera del alcance 310: la imagen `postgis/postgis` del workflow tampoco provisiona pgRouting, por lo que ese test preexistente puede fallar en CI con independencia de este encargo.

### 3.2 Verificación criptográfica y anti-PII independiente

Script propio sobre tenant único, una base `polis_test*`, contacto ficticio `eaf310-…@example.invalid`:

```
1. ciphertext_contiene_contacto: False
3. boveda_resuelve: True
4. hash_no_es_contacto: True (64 hex)
5. fuga_contacto_por_tabla: sm_eventos, sm_mensajes, sm_entregas,
   sm_auditorias, sm_consentimientos, sm_contactos_boveda → todos False
6. resumen_worker: procesados=1 enviados=0 fallidos=0 agotados=0 simulados=1
7. estado_mensaje: simulado
8. estados_entrega: ['simulado']
9. entrega.detalle: entorno_test; payload: {'codigo': ..., 'payload_sha256': ...}
10. boveda_tras_revocar: 0
11. consentimiento: revocado
12. worker_tras_revocar: cancelados=1
13. mensaje2_estado: cancelado
```

Conclusión criptográfica: el diseño AEAD, la AAD vinculante, la rotación y la purga están implementados y se comportan como se declara. Las debilidades son de **minimización y trazabilidad**, no del cifrado: hash sin secreto (MED-02), PII en `actor` por decisión del llamador (HAL-03) y ausencia del operador en auditoría (MED-01).

### 3.3 Migraciones en base aislada (reproducido)

| Paso | Resultado |
| --- | --- |
| `upgrade 0097_sm_core` en base vacía + alta de evento/mensaje `pendiente` | OK |
| `upgrade head` (0098, 0099) | Mensaje previo conserva `pendiente`, `reintentable=true`, sin fecha de reintento |
| Alta de mensaje `simulado`, mensaje `encolado` con `reclamacion_token`, entregas `simulado`/`incierto` | OK dentro del contrato 0099 |
| `downgrade 0098_sm_contactos_boveda` | `simulado` y reclamado → `cancelado`, estado original en `metadatos.sm_estado_pre_downgrade`; entregas → `fallido` con marcador; 4 columnas nuevas eliminadas |
| `upgrade head` → `downgrade base` → `upgrade head` | Reconstrucción completa; 0 tablas tras `base`; `alembic check` sin drift; cabeza `0099` |
| `alembic check` en ambos entornos | *No new upgrade operations detected* |

No se modificó ninguna base compartida ni `bd_csh`; el ensayo de Codex sobre `bd_csh_ensayo_sm_310` (873 MB) no fue replicado por falta de acceso al laboratorio 15433.

### 3.4 Frontend

```
bun run check      → exit 0 (ui:check + tsc --noEmit + eslint, sin salida de error)
bun run ui:check   → "POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos."
bun test src/features/sm src/features/mesas → 167 pass / 0 fail (14 archivos)
```

Los gates pasan, pero las pruebas del panel no cubren los caminos de error: el mock de `sm-api.ts` impide observar que la UI informa éxito sin backend (HAL-02).

---

## 4. Consecuencias y correcciones exigidas

| ID | Consecuencia | Corrección mínima |
| --- | --- | --- |
| HAL-01 | Imposible aceptar el candidato con CI verde; el resultado 1994/16 del sello no es reproducible sin un secreto local | Añadir clave de pruebas determinista y flag en `conftest.py`/fixtures; documentar variables en `docs/sm-worker.md` y `.env.example`; dejar la suite autoabastecida |
| HAL-02 | En desarrollo/demostración se muestran mensajes «enviados», salud verde y rondas exitosas sin backend; viola la prohibición de simulación engañosa y la regla de no anunciar éxito ante fallo | Eliminar los fallbacks de mutación; para lectura, mostrar estado de error explícito. Si se desea demo, usar datos de demostración separados y etiquetados, nunca en el cliente de producción ni en el flujo de mesas |
| HAL-03 | Se inventa un correo personal, se persiste el nombre en columnas declaradas sin PII y se arriesga envío a una dirección inexistente o de tercero | Enviar solo a contactos registrados por consentimiento (bóveda); usar `usuario.id` como `actor`; bloquear nombres/destinos en el backend; deshabilitar la acción mientras no exista consentimiento |
| MED-01 | Sin atribución del operador no hay no repudio de consentimientos ni de rondas disparadas | Registrar el sujeto autenticado en auditoría (campo de operador o acción con sujeto) y probarlo |
| MED-02 | El hash es reversible por diccionario; la UI afirma irreversibilidad y cumplimiento sin sustento | HMAC-SHA-256 con pepper de servidor para el hash de contacto (mantiene búsqueda) y sustituir las leyendas por texto exacto («seudónimo», no «irreversible») |
| MED-03 | Reintentos diferidos casi indefinidamente | Tope de espera configurable (p. ej. 1 h) además del máximo de intentos |
| MED-04 | Reconocimiento operativo anónimo | Evaluar mover la sonda a `sesion`/permiso interno o agregar limitación; si se mantiene pública, documentar la decisión de producto actualizada |
| MED-05 | Un lease vencido detiene la ronda y el daemon | Aislar el error por mensaje, continuar el lote y registrar la incidencia |
| MED-06 | El panel oculta simulaciones y muestra KPIs parciales | Completar los tipos y usar la salud agregada para todos los contadores |

---

## 5. Veredicto

**`RECHAZADO` (BLOQUEADO)** para los criterios obligatorios del Encargo 310.

Fundamento:

1. **HAL-01** incumple el gate de verificación exigido por `AGENTS.md`/`docs/transacciones.md`: el candidato no pasa la suite en un entorno limpio y la evidencia de 1994/16 depende de un secreto no declarado.
2. **HAL-02** incumple la salvaguarda expresa del encargo contra la simulación engañosa y la regla del proyecto de no anunciar éxito cuando falla la API.
3. **HAL-03** contradice el objetivo de cero PII: fabrica un contacto personal y persiste nombres en `actor`, además de arriesgar envíos a direcciones inexistentes.

El núcleo backend (bóveda, transportes, worker, migraciones, permisos y hook en sombra) se comporta conforme a lo declarado en las pruebas que sí pude ejecutar; la remediación puede ser acotada. La reinspección debe repetir como mínimo: suite SM en entorno limpio de CI, migraciones `0097→0099` con datos y downgrade 0098, verificación de fuga en las seis tablas, y los flujos de error del panel y de Mesas.

Este dictamen **no autoriza** merge, commit, migración, despliegue ni activación de servicios. `bd_csh` sigue en `0096`; la release productiva no se tocó. Los pendientes P5 (paridad/reversa de Herald) y P7 (commit, ensayo sobre copia, despliegue) permanecen abiertos por diseño del plan 310.

---

## 6. Anexo — comandos reproducibles

```bash
# Snapshot y sello
git rev-parse HEAD
python3 - <<'PY'  # comparación SHA-256 de snapshot_codigo.json contra el árbol
...
PY

# Migraciones (base exclusiva)
POLIS_DATABASE_URL=...alembic upgrade 0097_sm_core
POLIS_DATABASE_URL=...alembic upgrade head
POLIS_DATABASE_URL=...alembic check
POLIS_DATABASE_URL=...alembic downgrade 0098_sm_contactos_boveda
POLIS_DATABASE_URL=...alembic downgrade base && alembic upgrade head

# Suites
pytest tests/test_sm_*.py            # 81 passed / 14 failed sin variables
POLIS_SM_BOVEDA_KEY=<32B> POLIS_SM_WORKER_HABILITADO=true pytest tests/test_sm_*.py  # 95 passed
pytest tests/test_access_policy.py   # 130 passed

# Frontend
bun run check && bun test src/features/sm src/features/mesas

# Producción (solo lectura)
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/v1/health/ready
```

**Fin del dictamen.**
