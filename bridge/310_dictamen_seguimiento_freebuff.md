# DICTAMEN DE SEGUIMIENTO — REMEDIACIÓN 310 (HAL-01, HAL-02, HAL-03)

**Evaluador:** `freebuff:0.0`
**Carácter:** **verificación interna de remediación (EDD), no dictamen EAF independiente.**
**Dictamen base:** [`310_dictamen_eaf_independiente_freebuff.md`](310_dictamen_eaf_independiente_freebuff.md) — veredicto `RECHAZADO` (BLOQUEADO).
**Fecha:** 2026-11-08 (UTC)
**Snapshot:** HEAD `78cd08e80252b82c7c903030a6bf79fdf9d8fa67` + remediación sin commitear.

> **Independencia.** Quien suscribe implementó estas correcciones. Por
> `AGENTS.md` y `docs/equipo_auditores_forenses.md`, el implementador no firma
> como evaluador independiente de su propio cambio: este documento acredita la
> remediación y sus pruebas, **no sustituye** la reinspección EAF por otro
> evaluador. El veredicto del dictamen base permanece vigente hasta esa
> reinspección.

---

## 1. Cambios aplicados

| Hallazgo | Archivo | Cambio |
| --- | --- | --- |
| HAL-01 | `backend/tests/conftest.py:12-17` | `setdefault` de `POLIS_SM_BOVEDA_KEY` (32 bytes fijos de prueba) y `POLIS_SM_WORKER_HABILITADO=true`; la suite deja de depender de secretos locales |
| HAL-01 | `docs/sm-worker.md:32-45` | Sección «Pruebas y CI»: valores deterministas, alcance exclusivo de pruebas y obligación de fijar `False` explícito para el camino apagado |
| HAL-02 | `src/features/sm/api/sm-api.ts` | Eliminados `MOCK_SALUD_INICIAL`, `MOCK_MENSAJES_INICIALES` y los cuatro fallbacks que devolvían salud, mensajes, resumen de worker y evento «enviado» inventados; ahora el error de la API se propaga |
| HAL-02 | `src/features/sm/state/sm-store.ts:63-100` | Ante fallo, limpia `salud`/`mensajes` en vez de conservar un estado que ya no se puede acreditar |
| HAL-02 | `src/features/sm/components/sm-panel-operativo.tsx:137-180` | Sin salud muestra «Sin datos» y un `Notice` de error; no hay valor por defecto «saludable» ni canales vivos inventados. Se retiran las leyendas «hash irreversible» y «Habeas Data verificado» |
| HAL-03 | `src/features/mesas/components/mesa-logistica-panel.tsx:86-106,260-270` | `actor = sesion.usuarioId`, `contacto = sesion.usuario.correo`; sin sesión el botón queda deshabilitado con explicación. Se elimina el destinatario fijo `convocatoria.mesas@cartagena.gov.co` |
| HAL-03 | `src/features/mesas/components/mesa-compromisos-tabla.tsx:58-62,139-147,586-600` | Se elimina el correo deducido del nombre (`nombre.apellido@cartagena.gov.co`) y el nombre como `actor`; se usa la cuenta autenticada y su correo registrado |
| HAL-03 | Ambos componentes | Idempotencia estable por usuario (`…-${usuarioId}`), sin `Date.now()` en la convocatoria |
| Pruebas | `src/features/sm/components/sm-panel-operativo.test.tsx` | Se mockea `apiFetch`; se prueban éxito, propagación de error, panel sin datos y Mesas con/sin sesión. Ya no se validan datos fabricados |

**Búsqueda de residuos:** `grep` de `cartagena.gov.co` y de `actor: "<nombre>"` en ambos componentes → sin resultados.

---

## 2. Verificación ejecutada

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Suites SM en entorno limpio (sin variables SM exportadas) | `env -u POLIS_SM_BOVEDA_KEY -u POLIS_SM_WORKER_HABILITADO pytest tests/test_sm_*.py` | **95 passed** (antes: 14 failed / 81 passed) |
| Regresión backend completa en entorno limpio | `env -u POLIS_SM_* pytest tests` sobre `polis_test_routers_310` | **1.994 passed, 16 skipped, 0 failed**, exit 0 (809 s) |
| Ruff y formato | `ruff check` / `ruff format --check` sobre `conftest.py` | Limpios |
| Frontend: kit, tipos y lint | `bun run check` | exit 0 (`ui:check`, `tsc --noEmit`, `eslint`) |
| Pruebas SM | `bun test src/features/sm` | **14 passed / 0 failed** |
| Pruebas SM + Mesas | `bun test src/features/mesas src/features/sm` | **172 passed / 0 failed** |

La corrida completa se hizo sin exportar `POLIS_SM_BOVEDA_KEY` ni `POLIS_SM_WORKER_HABILITADO`, que es la condición exacta del workflow de CI; el resultado coincide con el sello de Codex (1.994/16/0) sin depender de secretos locales.

### Segunda pasada de remediación (MED-03, MED-05, MED-06, BAJ-01/02/04)

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Ruff | `ruff check` / `ruff format --check` sobre los archivos tocados | Limpios |
| Suites SM completas | `pytest tests/test_sm_*.py` sobre `polis_test_sm_med_20261108` | **98 passed, 0 failed** (95 previas + 3 nuevas) |
| Regresión backend completa | `bun run backend:check` sobre la misma base | **1.996 passed, 16 skipped**; único fallo `test_geodatos_isocronas.py::test_disponibilidad_pgrouting_en_repositorio`, por extensión `pgrouting` ausente en la base nueva. Tras `CREATE EXTENSION pgrouting`, ese módulo pasa **7/7** |

Las tres pruebas nuevas cubren: techo del backoff (`test_backoff_respeta_techo_configurado`), continuación del lote ante reclamación vencida (`test_reclamacion_vencida_no_aborta_el_lote`) y respuesta 503 sin bóveda (`test_router_consentimiento_sin_boveda_devuelve_503`). Además, el worker valida la transición terminal con `transicion_estado`, de modo que un estado no permitido falla en vez de persistirse.

### Tercera pasada (MED-01 y MED-02)

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Ruff | `ruff check backend` / `ruff format --check backend` | **exit 0**, 621 archivos formateados |
| Suites SM completas | `pytest tests/test_sm_*.py` | **101 passed, 0 failed** |
| Regresión backend completa | `bun run backend:check` | **1.999 passed, 16 skipped**, 1 fallo ambiental de `pgrouting`; módulo rerun **7/7** tras crear la extensión |
| Migración 0100 | `upgrade head` / `downgrade 0099` / `upgrade head` | **exit 0** en los tres pasos |
| Frontend | `bun run check` y `bun test src/features/sm src/features/mesas` | **exit 0**; **172 passed** |

MED-01 agrega `sm_auditorias.operador` y lo incluye en `hash_traza`; las rutas de
consentimiento y eventos lo alimentan con `sujeto_id`. MED-02 reemplaza el
SHA-256 desnudo por HMAC-SHA256 con subclave HKDF de la bóveda, acepta huellas de
claves anteriores durante la rotación y hace que `rotar_boveda` recalcule la
huella y actualice consentimientos, mensajes y eventos en la misma transacción.
`SMCoreService` y `SMClient` exigen un secreto explícito, sin valor embebido.

El expediente reproducible para EAF está en
`bridge/311_reinspeccion_eaf_sm_core_20261108/` (expediente, resumen, checks e
inventario SHA-256). Ese paquete lo preparó el implementador y **no** es un
dictamen independiente.

### Cuarta pasada (MED-04, BAJ-03 y BAJ-05)

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Suites SM en entorno limpio | `env -u POLIS_SM_* pytest tests/test_sm_*.py` sobre `polis_test_sm_med3_20261108` | **101 passed, 0 failed** |
| Matriz de permisos | `pytest tests/test_access_policy.py` | **130 passed, 1 skipped** |
| Regresión backend completa | `bun run backend:check` con `pgrouting` instalado | **2.001 passed, 16 skipped, 0 failed** |
| Frontend | `bun run check` y `bun test src/features/sm src/features/mesas` | **exit 0**; **172 passed** |

MED-04 se cierra retirando la excepción pública: `/sm/health` exige
`auditoria:leer@declarada`, el panel conserva el acceso mediante `apiFetch` con
token y la prueba anónima verifica 401/403. BAJ-05 se cierra retirando
`contacto_hash` de la respuesta de verificación, que ahora solo informa el
booleano de consentimiento. BAJ-03 se documenta como límite de diseño: el núcleo
portable en memoria no es la ruta persistente ni fuente de verdad en producción.

---

## 3. Estado de hallazgos

| ID | Estado tras la remediación | Nota |
| --- | --- | --- |
| HAL-01 | **Cerrado técnicamente** | Suite autoabastecida y documentada; CI ya no requiere exportar secretos |
| HAL-02 | **Cerrado técnicamente** | Sin datos simulados; el panel muestra error real y «Sin datos» |
| HAL-03 | **Cerrado técnicamente, con residual** | Ya no se inventan correos ni se usan nombres como actor. Residual: `cuerpo`/`payload` siguen admitiendo texto libre (descripciones, nombres de mesa) y el backend solo bloquea correos/teléfonos; el envío exige consentimiento SM de la cuenta y falla con 403 si no existe |
| MED-01 | **Cerrado técnicamente** | Migración `0100_sm_auditoria_operador`; `sm_auditorias.operador` recibe el `sujeto_id` autenticado y entra en el hash de traza; prueba HTTP lo verifica |
| MED-02 | **Cerrado técnicamente** | `contacto_hash` pasa a HMAC-SHA256 con subclave HKDF de la bóveda activa; lectura dual con claves anteriores y rotación que recalcula hashes y referencias; pruebas de secreto distinto y rotación |
| MED-03 | **Cerrado técnicamente** | `sm_worker_max_espera_segundos` acota `base * 2^intento`; nueva prueba verifica el techo |
| MED-04 | **Cerrado técnicamente** | `/sm/health` exige `auditoria:leer`; sin sesión responde 401/403 y ya no es excepción pública |
| MED-05 | **Cerrado técnicamente** | `SMError` de reclamación vencida ya no aborta el lote; nueva prueba procesa dos mensajes y continúa |
| MED-06 | **Cerrado técnicamente** | `sm-types.ts` incluye `simulado`, `simulados`, latido, antigüedad y canales degradados; el panel usa esos campos |
| BAJ-01 | **Cerrado técnicamente** | La plantilla general declara `entidad` como variable requerida |
| BAJ-02 | **Cerrado técnicamente** | La transición final del worker pasa por `transicion_estado` |
| BAJ-03 | Cerrado por diseño documentado | El núcleo portable en memoria no es la ruta persistente; `docs/sm-worker.md` lo declara y remite a `SMServicioDB`/`SMRepository`/`SMWorker` |
| BAJ-04 | **Cerrado técnicamente** | Falta de bóveda responde 503, no 400; nueva prueba lo verifica |
| BAJ-05 | **Cerrado técnicamente** | La verificación ya no repite la huella; solo devuelve `actor`, `canal` y `consentido` |
| BAJ-06 | Corregido | La convocatoria usa idempotencia estable por usuario, sin `Date.now()` |

---

## 4. Condiciones y límites

- No se ejecutó commit, push, migración productiva ni reinicio; `bd_csh` no se tocó.
- No se probaron credenciales reales de proveedores ni entrega SMTP externa.
- La remediación de Mesas cambia el destinatario a la cuenta autenticada: la notificación ya no pretende llegar a un responsable sin cuenta registrada. Si el producto requiere notificar a terceros, hace falta un flujo de selección de usuario registrado con consentimiento, fuera de este alcance.
- La verificación se hizo sobre bases `polis_test*` desechables; el rol de laboratorio se retiró al terminar.

---

## 5. Conclusión

**Remediación verificada internamente: `OBSERVADO`.**

No se emite `APROBADO`: la independencia EAF exige otro evaluador. Tras la cuarta
pasada no quedan hallazgos abiertos de severidad media o baja: MED-04 y BAJ-05 se
cerraron con cambio de contrato y prueba, y BAJ-03 quedó documentado como límite
de diseño del núcleo portable. Todos los hallazgos tienen evidencia en este árbol;
la aceptación sigue correspondiendo a la reinspección EAF independiente.

La reinspección independiente debe repetir, como mínimo: suite SM en CI limpio,
regresión backend, flujos de error del panel (incluido el 503 sin bóveda) y
revisión de los componentes de Mesas con sesión y sin ella.

Este documento no autoriza merge, despliegue ni activación de servicios.

**Fin del dictamen de seguimiento.**
