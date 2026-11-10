# Expediente de reinspección EAF — SM Core (Encargo 310)

**Preparado por:** `freebuff:0.0` (implementador de la remediación)
**Fecha:** 2026-11-08 (UTC)
**Snapshot:** HEAD `78cd08e80252b82c7c903030a6bf79fdf9d8fa67` + árbol de trabajo sin commitear
**Dictamen base:** [`../310_dictamen_eaf_independiente_freebuff.md`](../310_dictamen_eaf_independiente_freebuff.md) — `RECHAZADO`
**Seguimiento:** [`../310_dictamen_seguimiento_freebuff.md`](../310_dictamen_seguimiento_freebuff.md) — `OBSERVADO`
**Estado de esta entrega:** evidencia preparada; **no es un dictamen EAF ni autoriza despliegue**.

> **Independencia.** Este expediente lo prepara quien implementó las correcciones.
> No sustituye la reinspección por un evaluador distinto ni firma como dictamen
> independiente. El veredicto del dictamen base sigue vigente hasta que EAF
> emita su propia conclusión.

---

## 1. Alcance

- Núcleo SM persistente: `backend/app/modules/sm/**`.
- Migraciones `0097_sm_core`, `0098_sm_contactos_boveda`, `0099_sm_worker_backoff`,
  `0100_sm_auditoria_operador`.
- Pruebas backend `test_sm_core.py`, `test_sm_full.py`, `test_sm_310.py`
  (y demás `test_sm_*.py`).
- Integración frontend del panel SM y acciones de Mesas (Encargo 308):
  `src/features/sm/**`, `mesa-logistica-panel.tsx`, `mesa-compromisos-tabla.tsx`.
- Rutas `/api/v1/sm/*`, permisos declarados y operación documentada en
  `docs/sm-worker.md`.

**Fuera de alcance:** activación de worker, envío real por proveedores, rotación
en producción, Herald legacy, migración de datos productivos y cualquier cambio
en `bd_csh`.

---

## 2. Estado de hallazgos

| ID | Estado declarado | Evidencia principal |
| --- | --- | --- |
| HAL-01 | Cerrado técnicamente | `backend/tests/conftest.py` fija bóveda y worker de prueba; suites pasan sin exportar secretos |
| HAL-02 | Cerrado técnicamente | Cliente SM sin fallbacks simulados; store limpia estado y panel muestra error real |
| HAL-03 | Cerrado técnicamente, con residual | Mesas usa cuenta autenticada y su correo; sin sesión no habilita envío; texto libre sigue limitado por validación y consentimiento |
| MED-01 | Cerrado técnicamente | `sm_auditorias.operador` (migración 0100) recibe `sujeto_id`; entra en `hash_traza`; prueba HTTP |
| MED-02 | Cerrado técnicamente | HMAC-SHA256 con subclave HKDF de bóveda; lectura dual con claves anteriores; rotación recalcula hashes y referencias |
| MED-03 | Cerrado técnicamente | Techo `sm_worker_max_espera_segundos`; prueba de backoff acotado |
| MED-04 | Cerrado técnicamente | `/sm/health` exige `auditoria:leer@declarada`; prueba anónima 401/403 y autenticada 200 |
| MED-05 | Cerrado técnicamente | Reclamación vencida no aborta el lote; prueba con dos mensajes |
| MED-06 | Cerrado técnicamente | Tipos y panel alineados con `simulado`, latido, antigüedad y canales degradados |
| BAJ-01 | Cerrado técnicamente | Plantilla general exige `entidad` |
| BAJ-02 | Cerrado técnicamente | Transición final del worker valida con `transicion_estado` |
| BAJ-03 | Cerrado por diseño documentado | `SMCoreService` es librería en memoria; `docs/sm-worker.md` declara que la ruta persistente es `SMServicioDB` → `SMRepository` → `SMWorker` |
| BAJ-04 | Cerrado técnicamente | Falta de bóveda responde 503; prueba HTTP |
| BAJ-05 | Cerrado técnicamente | La verificación ya no repite el `contacto_hash`; responde `actor`, `canal` y `consentido`, con prueba de contrato |
| BAJ-06 | Cerrado técnicamente | Idempotencia estable por usuario en Mesas |

Los estados «cerrado técnicamente» significan que existe corrección y prueba en
este árbol; **no** equivalen a aceptación EAF.

---

## 3. Cambios relevantes de la remediación (tercera y cuarta pasada)

### 3.1 MED-01 — atribución del operador

- `backend/alembic/versions/0100_sm_auditoria_operador.py`: columna
  `sm_auditorias.operador` (`varchar(120)`, nullable, check no vacío) y downgrade.
- `models.py`: campo `operador`.
- `repository.py`: `registrar_consentimiento(..., operador=)` y
  `procesar_evento(..., operador=)` lo persisten y lo incluyen en el payload de
  `hash_traza`.
- `router.py`: las rutas de consentimiento y eventos reciben
  `SujetoAutenticadoDep` y envían `str(sujeto.sujeto_id)`.
- `test_sm_full.py`: prueba que el operador queda registrado, no es el actor y
  es un UUID válido.

### 3.2 MED-02 — hash de contacto con secreto y rotación

- `core.hash_contacto` exige `secreto: bytes` y calcula **HMAC-SHA256**; el
  SHA-256 desnudo ya no es una ruta válida.
- `boveda.py`: deriva una subclave por clave de bóveda con HKDF-SHA256
  (`info="sm-contacto-hash-v1"`); expone `huella` (clave activa) y `huellas`
  (activa + anteriores). La validación AAD acepta cualquiera de las huellas
  vigentes y la rotación recalcula el hash de la fila.
- `boveda.rotar` actualiza en la misma transacción `sm_contactos_boveda`,
  `sm_consentimientos`, `sm_mensajes` y `sm_eventos` cuando cambia la huella.
- Repositorio, puente y worker consultan por el conjunto de huellas candidatas;
  la revocación purga todas las huellas del contacto.
- `SMCoreService`/`SMClient` exigen `secreto_contacto` explícito (≥16
  caracteres); no existe valor por defecto embebido.
- Pruebas: secreto distinto produce hash distinto; rotación conserva lectura,
  migra la huella y la clave anterior ya no descifra.

### 3.3 MED-04 y BAJ-05 — cuarta pasada

- `router.py`: `/sm/health` pasa de público a
  `permiso:auditoria:leer@declarada`; deja de ser una excepción pública y no
  expone reconocimiento operativo a anónimos. El panel SM ya consultaba el
  outbox con ese permiso y `apiFetch` adjunta el token de sesión.
- `router.py`: `SMRespuestaVerificacionConsentimiento` elimina `contacto_hash`.
  La verificación de consentimiento devuelve solo `actor`, `canal` y
  `consentido`; no repite la huella suministrada.
- `docs/permisos-api.md` y `docs/sm-worker.md` reflejan ambos cambios; la matriz
  de acceso sigue siendo la fuente verificada por `test_access_policy.py`.
- BAJ-03 no se convierte en una transacción artificial: se documenta que el
  núcleo portable en memoria no es la ruta persistente ni fuente de verdad en
  producción. La ruta `SMServicioDB`/`SMRepository`/`SMWorker` conserva la
  delimitación transaccional verificada.

### 3.4 Otras correcciones de la segunda pasada

- Techo de backoff y continuación del lote ante reclamación vencida.
- Transición terminal del worker validada con `transicion_estado`.
- Respuesta 503 cuando falta la bóveda, en lugar de 400.
- Tipos del panel y metadatos de salud alineados con el contrato real.

---

## 4. Evidencia ejecutada

Ver [`checks.json`](checks.json) para el detalle máquina-legible.

| Comprobación | Resultado |
| --- | --- |
| `ruff check` / `ruff format --check` sobre SM y pruebas | Limpio |
| `pytest tests/test_sm_*.py` sobre base `polis_test_sm_med3_20261108` | **101 passed, 0 failed** |
| Matriz de permisos (`pytest tests/test_access_policy.py`) | **130 passed, 1 skipped** |
| Regresión backend completa (`bun run backend:check`) | **2.001 passed, 16 skipped, 0 failed** |
| Frontend: `bun run check` | exit 0 |
| Pruebas frontend SM + Mesas | **172 passed, 0 failed** |
| Migración 0100: upgrade / downgrade 0099 / upgrade | exit 0 en los tres pasos |
| Inventario SHA-256 de 34 archivos | [`inventario_archivos.sha256`](inventario_archivos.sha256) |
| Cabeza de migraciones | `0100_sm_auditoria_operador (head)` |

### 4.1 Regresión backend

Comando:

```bash
POLIS_TEST_DATABASE_URL='postgresql+asyncpg://.../polis_test_sm_med3_20261108' \
POLIS_TEST_MIGRATIONS_DATABASE_URL='postgresql+asyncpg://.../polis_test_sm_med3_mig_20261108' \
bun run backend:check
```

Resultado: **2.001 passed, 16 skipped, 0 failed** en 960,89 s, exit 0, con
`postgis` y `pgrouting` creados antes de la corrida. La suite se ejecutó sin
exportar `POLIS_SM_BOVEDA_KEY` ni `POLIS_SM_WORKER_HABILITADO`. No hay fallos en
SM ni en módulos que consuman sus cambios.

La repetición de la migración 0100 sobre una base desechable
(`alembic upgrade head` → `downgrade 0099_sm_worker_backoff` → `upgrade head`)
terminó con exit 0 en los tres pasos; `alembic heads` confirma
`0100_sm_auditoria_operador`.

### 4.2 Frontend

Comando: `bun run check` (incluye `ui:check`, `tsc --noEmit`, `eslint`).
Resultado: **exit 0**. Pruebas `bun test src/features/sm src/features/mesas`:
**172 passed, 0 failed**. La cuarta pasada ajusta la sesión simulada del panel
para incluir `auditoria:leer`, coherente con la salud y el outbox autenticados;
no cambia el comportamiento de UI.

---

## 5. Reproducción mínima para EAF

1. Crear una base exclusiva `polis_test_eaf_311*` y exportar
   `POLIS_TEST_DATABASE_URL`; opcionalmente
   `POLIS_TEST_MIGRATIONS_DATABASE_URL` para pruebas de migración.
2. No exportar `POLIS_SM_BOVEDA_KEY` ni `POLIS_SM_WORKER_HABILITADO`: la suite
   debe autoabastecerse con `conftest.py`.
3. Ejecutar:
   ```bash
   cd /root/polis
   backend/.venv/bin/ruff check backend
   backend/.venv/bin/ruff format --check backend
   POLIS_TEST_DATABASE_URL=... bun run backend:check
   bun run check
   bun test src/features/sm src/features/mesas
   ```
4. Verificar `alembic heads` = `0100_sm_auditoria_operador` y probar
   `upgrade head` / `downgrade 0099` / `upgrade head` en base desechable.
5. Leer el panel y las acciones de Mesas con sesión y sin sesión; comprobar que
   no aparecen datos simulados ni correos inventados.
6. Revisar que `sm_auditorias.operador` coincide con el sujeto autenticado y que
   el hash de traza incluye ese valor.
7. Revisar que el `contacto_hash` persistido no coincide con SHA-256 desnudo y
   que la rotación de bóveda migra las cuatro tablas.
8. Confirmar que `/sm/health` exige `auditoria:leer` (401/403 sin sesión), que
   la verificación de consentimiento no devuelve `contacto_hash` y que la matriz
   `docs/permisos-api.md` coincide con las dependencias reales.

---

## 6. Riesgos residuales y límites

- **MED-04 resuelto técnicamente:** `/sm/health` exige `auditoria:leer`; ya no
  existe excepción pública. El monitoreo debe autenticarse o usar la sonda
  pública `/health/herald` si el producto decide otra cosa.
- **BAJ-03 documentado:** el servicio portable en memoria no usa transacciones
  de BD; su garantía es de proceso, no persistente, y no es la ruta de
  producción. `docs/sm-worker.md` lo declara explícitamente.
- **BAJ-05 resuelto técnicamente:** la verificación ya no repite la huella;
  solo devuelve `actor`, `canal` y `consentido`.
- **Rotación:** las filas revocadas sin ciphertext conservan la huella histórica;
  retirar la clave anterior las trata como registro nuevo, nunca como
  autorización. La rotación debe ejecutarse por lotes y verificarse contra
  respaldos antes de retirar claves.
- **Operador:** se guarda el `sujeto_id`; no se duplica aquí el rol ni la decisión
  de autorización, que siguen en la política de acceso y en la sesión.
- **Proveedores:** no se probaron credenciales reales ni entrega SMTP/WhatsApp;
  los transportes de fábrica simulan en `environment=test`.
- **Sin commit, push ni despliegue:** el árbol queda congelado para revisión.

---

## 7. Criterios de aceptación sugeridos para EAF

- [ ] Reproducir 101/101 pruebas SM en base limpia y sin secretos exportados.
- [ ] Reproducir la regresión backend completa sin fallos atribuibles a SM.
- [ ] Verificar migración 0100 (upgrade, downgrade, upgrade) y ausencia de
      columnas obligatorias sin default.
- [ ] Confirmar HMAC y ausencia de SHA-256 desnudo en el camino persistente.
- [ ] Confirmar rotación de bóveda con doble clave y actualización de las cuatro
      tablas.
- [ ] Confirmar operador autenticado en consentimiento y evento.
- [ ] Confirmar 503 sin bóveda y 403 sin consentimiento.
- [ ] Confirmar 401/403 en `/sm/health` sin sesión y 200 con `auditoria:leer`.
- [ ] Confirmar que la verificación de consentimiento no devuelve la huella.
- [ ] Confirmar que el panel no inventa salud, mensajes ni destinatarios.
- [ ] Emitir veredicto independiente; este documento no lo sustituye.

---

## 8. Anexo

- Inventario y huellas: [`inventario_archivos.sha256`](inventario_archivos.sha256).
- Resumen máquina-legible: [`resumen.json`](resumen.json).
- Comandos y resultados: [`checks.json`](checks.json).
- Dictamen base y seguimiento: `../310_dictamen_eaf_independiente_freebuff.md`,
  `../310_dictamen_seguimiento_freebuff.md`.
