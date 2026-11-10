# Expediente congelado — Revisión EAF independiente del cierre de POLIS

**Expediente:** EAF-307
**Preparado por:** Buffy (implementador del cierre), por instrucción del responsable del proyecto.
**Fecha de congelación:** 2026-11-07.
**Naturaleza:** expediente de evidencia. **No es un dictamen EAF**, no acredita aceptación y
no autoriza despliegue. El dictamen corresponde a un evaluador distinto del implementador,
conforme a `docs/equipo_auditores_forenses.md`.

Manifiesto legible por máquina: [`manifiesto.json`](307_expediente_eaf_cierre_polis/manifiesto.json)
SHA-256 del manifiesto entregado: `921651302d49064627543b35a1d8f93c193910c4912413406d510e6dffecd120`

---

## 1. Snapshot congelado

| Dato | Valor |
| --- | --- |
| Commit | `da4c54f2b565709fe46d599dc9270f00324db026` |
| Árbol | `018bc11f9ac10418369a97e0ee68641a13f0f036` |
| Rama/origen | `main` = `origin/main` en el momento de la congelación |
| Mensaje | `feat: implementar nucleo portable SM` |
| Estado del árbol al congelar | **no limpio**: trabajo del encargo 304 sin versionar (15 archivos modificados y 16 sin seguimiento, entre ellos `backend/alembic/versions/0097_sm_core.py`) |

Verificación: `git rev-parse da4c54f2^{tree}` debe devolver `018bc11f…`. El commit puro se
revisó en un worktree aislado (`git worktree add <ruta> da4c54f2`), de modo que las
modificaciones del árbol de trabajo no contaminan las conclusiones sobre el snapshot.
El detalle del estado se capturó en `evidencia/00_snapshot.txt`.

> **Nota de congelación:** después de la captura, `main` avanzó a `43321fc4`
> (`fix: sanear ingesta Office, ceros y evaluación humana de POLIS`). Ese commit y sus
> sucesores **quedan fuera de este expediente**; si se desea revisar el estado actual,
> debe emitirse un snapshot nuevo.

---

## 2. Alcance

**Dentro del alcance**

1. Cierre técnico del encargo 303 (release publicada).
2. Pendientes R1–R8 del encargo 304.
3. Contrato de transacciones (`docs/transacciones.md`), matriz de permisos
   (`docs/permisos-api.md`) y reglas del kit UI (`docs/kit-ui-rules.md`).
4. Operación observada: salud, respaldos, CSP y estado de la base.

**Fuera del alcance**

- Encargo 305/306 (SM Core): aparece en el snapshot porque ya estaba en `main`, pero es un
  entregable distinto y no forma parte de la matriz de aceptación del cierre.
- La migración `0097_sm_core`, que **no está versionada**.
- Aprobación institucional de las fichas de indicadores, insumos de PAE y densidad
  institucional.
- Autorización de despliegue o publicación.

---

## 3. Matriz de requisitos

### 3.1 Cierre técnico 303

| Requisito | Estado en el expediente | Evidencia |
| --- | --- | --- |
| Release publicada y verificada | Cumplido | `bridge/303_entrega_codex_cierre_integral.md`; commit `9b6ce794`; `/health/live` 200 |
| Frontend sin errores de tipos, lint ni política UI | Cumplido | `evidencia/31_bun_check.txt` (`EXIT=0`) |
| Suite frontend (árbol de trabajo) | Cumplido | `evidencia/32_bun_test.txt`: **1707 pass / 0 fail / 174 archivos** |
| Suite backend con base `polis_test*` (árbol de trabajo) | **Parcial** | `evidencia/20_pytest.txt`: 1889 pass, 16 skip, **11 fail** (los 11 invocan `alembic check`; causa única: migración 0097 no versionada, ver §5) |
| Suite backend sobre el commit congelado aislado | **Parcial por entorno** | `evidencia/23_commit_congelado_pytest.txt`: 1802 pass, 16 skip, **29 fail**: 28 por el corpus `data/` no versionado (`no existe el banco SQLite…`, cartografía, catálogos) y 1 por pgRouting en la base nueva |
| Migraciones y deriva sobre el commit congelado | Cumplido | `evidencia/14_commit_congelado_migraciones.txt`: head 0096, `upgrade` OK, `alembic check` OK |
| Contrato de transacciones | Cumplido | `evidencia/21_pytest_transacciones.txt`: **21 pass** |
| Paridad RBAC de todas las rutas | Cumplido | `tests/test_access_policy.py` (122 pass, 1 skip) contra 282 operaciones |
| Respaldos GFS + offsite | Cumplido | `evidencia/42_respaldos.txt`: dump y réplica del 2026-11-07 02:01/02:30, ciclo exitoso |
| Salud de producción | Cumplido en el release desplegado | `evidencia/40_salud_y_cabeceras.txt` (503 transitorio a las 18:29 en el proceso anterior) y `evidencia/43_estado_posterior_reinicio.txt`: **200 ready** desde el reinicio de las 18:36, con release 0096 montado en solo lectura |

### 3.2 Pendientes 304

| ID | Requisito | Estado | Observación del implementador |
| --- | --- | --- | --- |
| R1 | Resolver 14 XLSX de planes de acción | Avance de otro actor, **no auditado aquí** | `bridge/304_evidencia_cierre/` registra aislamiento (`polis_test_304_corpus`), idempotencia y rollback; falta verificación independiente |
| R2 | Validar ingesta recuperada y suite con corpus | Pendiente | Depende de R1 |
| R3 | Cerrar dependencia del guion Workspace | Pendiente externo | Requiere el guion auténtico del usuario |
| R4 | Completar 29 fichas de indicadores | Pendiente externo | `bridge/303_evidencia_cierre/fichas_pendientes_publicacion.md`: 29 fichas en `no_publicable` |
| R5 | Candidatos PAE y densidad institucional | Pendiente externo | Sin insumos oficiales; no evaluable no debe convertirse en cero |
| R6 | Ensayo y decisión de CSP Enforce | **Abierto** | Producción envía `Content-Security-Policy-Report-Only` (verificado en cabeceras) |
| R7 | Revisión EAF independiente | **Este expediente la habilita; no la sustituye** | — |
| R8 | Publicar y verificar el cierre | Pendiente | Depende de R7 y de resolver §5 |

---

## 4. Evidencia por perfil EAF

### 4.1 Forense de base de datos

| Comprobación | Resultado | Archivo |
| --- | --- | --- |
| Instalación completa en base vacía | `upgrade head` hasta 0097, `EXIT=0` | `evidencia/10_instalacion_base_vacia.txt` |
| Reconstrucción downgrade → upgrade | 0097 → 0096 (`EXIT=0`) → 0097 (`EXIT=0`) | `evidencia/12_reconstruccion.txt` |
| Deriva modelo↔BD en el árbol de trabajo | **FAILED**: 5 tablas `sm_*` detectadas como `remove_table` | `evidencia/11_alembic_check.txt` |
| Deriva en el commit puro `da4c54f2` | **OK**: `No new upgrade operations detected` (head 0096) | `evidencia/13_commit_puro_alembic.txt` · `evidencia/14_commit_congelado_migraciones.txt` |
| Estado de producción (solo lectura) | BD en 0096; 873 MB; 35 mesas; **0 actas**; 7 propuestas; 45 usuarios; 2505 indicadores | `evidencia/41_bd_produccion_lectura.txt` |

### 4.2 Forense de backend

- Ruff sobre el árbol versionado: **All checks passed** (`evidencia/30_ruff.txt`,
  `EXIT_TRACKED=0`).
- Ruff canónico: **falla** por `0097_sm_core.py` (I001) y formato; el archivo no está en el
  commit (`EXIT_CANONICO=1`, `EXIT_FORMATO=1`).
- Suite completa: 11 fallos, todos en pruebas que invocan `alembic check`; ver §5.
- Ensamblaje de API: 282 operaciones en 225 rutas; `api/router.py` monta 23 routers y
  `main.py` monta tres más (`actores`, `alternativas`, `fuentes`) fuera del punto único de
  ensamblaje que declara `docs/arquitectura.md`. La matriz RBAC sí los cubre (17 filas) y
  responden 200/401 correctamente, pero la documentación afirma que no están montados.

### 4.3 Forense de frontend

- `bun run check` (ui-policy + `tsc` + ESLint): **verde**.
- `bun test`: 1707 pass, 0 fail, 13.410 aserciones.
- Storybook y Playwright: no se ejecutaron en este expediente; el CI los cubre parcialmente
  (`ui:test` sí, los guiones `check:e2e*` no están en `.github/workflows/check.yml`).

### 4.4 Forense de CI/CD

- `.github/workflows/check.yml` sí provisiona `POLIS_TEST_DATABASE_URL` y
  `POLIS_TEST_MIGRATIONS_DATABASE_URL` en una base `polis_test*`.
- No ejecuta los guiones E2E (`bun run check:e2e*`).
- No publica artefactos de backend ni exige `alembic check` como paso propio.

### 4.5 Forense de IA y legal

- Informes de IA: `docs/arquitectura_ia_neurosimbolica.md` y `bridge/297_entrega_codex_qa_independiente_indicadores.md`
  (el QA 297 **rechaza** el cierre integral del catálogo; sus hallazgos H297-01..09 siguen
  siendo materia de revisión).
- Licencias y condiciones de fuentes: documentadas parcialmente; 10 fichas con CC BY-SA 4.0,
  condiciones DANE como referencia institucional.
- CSP: `report-uri /api/v1/seguridad/csp-report` activo; enforcement no activado.

---

## 5. Hallazgo bloqueante (causa única de los 11 fallos)

**Descripción.** `backend/alembic/env.py` no importa `app.modules.sm.models`. La migración
`backend/alembic/versions/0097_sm_core.py` (no versionada) crea cinco tablas en
`participacion_ciudadana` (`sm_eventos`, `sm_mensajes`, `sm_entregas`, `sm_auditorias`,
`sm_consentimientos`). Al no estar los modelos en `Base.metadata`, `alembic check` interpreta
esas tablas como sobrantes y **falla**:

```
FAILED: New upgrade operations detected: [('remove_table', Table('sm_eventos', ...)), ...]
```

**Consecuencias verificadas.**

1. `alembic check` en el árbol de trabajo: FAILED (`evidencia/11_alembic_check.txt`).
2. 11 pruebas de migración fallan con la misma causa (`evidencia/20_pytest.txt`).
3. El head de Alembic pasó a `0097_sm_core` sin aplicarse en `bd_csh` (0096). El proceso
   anterior, cuyo worker se reimportó el 2026-11-07 a las 18:07:45 desde el árbol en edición,
   respondió **503** con `migrations: pending` (`evidencia/40_salud_y_cabeceras.txt`). Tras el
   reinicio de las 18:36 el servicio monta en solo lectura el release 0096 y responde 200;
   el riesgo se traslada a cualquier despliegue que tome el árbol actual
   (`evidencia/43_estado_posterior_reinicio.txt`).
4. Sobre el commit puro `da4c54f2` no hay deriva: head 0096 y `alembic check` OK
   (`evidencia/13_commit_puro_alembic.txt`). Es decir, **el commit publica modelos sin
   migración ni registro en la metadata**; el daño operativo lo produce la migración suelta.

**Corrección sugerida (no aplicada).** Añadir en `backend/alembic/env.py`:

```python
from app.modules.sm import models as sm_models  # noqa: F401
```

y versionar `0097_sm_core.py` junto con esa línea en un solo cambio. Después: `alembic check`
en base `polis_test*`, suite completa y, con autorización explícita, aplicación en `bd_csh`.

---

## 6. Límites de esta evidencia

1. **No es dictamen.** Lo preparó quien implementó; la independencia exige otro evaluador.
2. La suite backend tiene dos lecturas: sobre el árbol de trabajo (1889/16/11, con la
   migración 0097 dentro) y sobre el commit aislado (1802/16/29). Los 29 fallos del commit
   aislado no se atribuyen al código: 28 exigen el corpus local `data/`, que **no está
   versionado**, y 1 depende de pgRouting en la base de prueba. Ninguno toca la deriva de
   esquema, que sí quedó acreditada como limpia en el commit (evidencia 14).
3. La base de pruebas (`polis_test_eaf_307`) se creó para el expediente y **se eliminó** al
   terminar; el rol de prueba también. Los comandos de reproducción están en §7.
4. No se probó envío real de correo ni se activó CSP Enforce.
5. No se ejecutó `bun run build` para no sobrescribir `.next/standalone`, que sirve producción.
6. Los datos de producción se consultaron en **solo lectura**.
7. Las cifras de `bd_csh` corresponden al corte del 2026-11-07 18:29 UTC.
8. La suite frontend no se reejecutó sobre el commit aislado; la cifra 1707 corresponde al
   árbol de trabajo, que incluye pruebas de trabajo en curso.
9. Un check verde no acredita disponibilidad, ausencia total de defectos ni cumplimiento
   jurídico.

---

## 7. Reproducción mínima

```bash
# 1. Snapshot
git fetch origin && git checkout da4c54f2
git rev-parse HEAD^{tree}          # 018bc11f9ac10418369a97e0ee68641a13f0f036

# 2. Base aislada (rol con SUPERUSER solo para crear extensiones; eliminar al final)
sudo -u postgres psql -c "CREATE ROLE polis_eaf_307 LOGIN SUPERUSER PASSWORD '…'"
sudo -u postgres psql -c "CREATE DATABASE polis_test_eaf_307 OWNER polis_eaf_307"
export POLIS_DATABASE_URL="postgresql+asyncpg://polis_eaf_307:…@127.0.0.1:5432/polis_test_eaf_307"
export POLIS_TEST_DATABASE_URL="$POLIS_DATABASE_URL"

# 3. Migraciones y deriva
cd backend
.venv/bin/python -m alembic -c alembic.ini upgrade head
.venv/bin/python -m alembic -c alembic.ini check

# 4. Suites
.venv/bin/python -m pytest tests -q
cd .. && bun run check && bun test
```

---

## 8. Criterios de aceptación o rechazo

El evaluador debería **rechazar** la aceptación integral si, al cierre de su revisión:

- `alembic check` no es limpio en una base `polis_test*` al head;
- `/api/v1/health/ready` no devuelve 200 con `migrations: ok`;
- la migración `0097` sigue sin versionar o sin registro en `alembic/env.py`;
- R3, R4 o R5 se declaran cerrados sin insumo oficial o aprobación competente;
- se activa CSP Enforce sin el ensayo y la decisión documentada;
- el dictamen lo firma quien implementó.

**Aceptación condicionada** es posible si los requisitos externos (R3–R5) quedan abiertos con
responsable y documento, y los bloqueantes técnicos de §5 se corrigen y se vuelven a verificar
con un snapshot nuevo.

---

## 9. Inventario de evidencia

| Archivo | Contenido |
| --- | --- |
| `evidencia/00_snapshot.txt` | Commit, árbol y estado del repositorio al congelar |
| `evidencia/01_alembic_cabeza.txt` | Cabeza y linaje de Alembic |
| `evidencia/10_instalacion_base_vacia.txt` | Instalación completa en base vacía |
| `evidencia/11_alembic_check.txt` | Deriva modelo↔BD en el árbol de trabajo |
| `evidencia/12_reconstruccion.txt` | Downgrade 0097→0096 y re-upgrade |
| `evidencia/13_commit_puro_alembic.txt` | Deriva en el commit sin la migración suelta |
| `evidencia/14_commit_congelado_migraciones.txt` | Migraciones y `alembic check` del commit aislado |
| `evidencia/20_pytest.txt` | Suite backend sobre el árbol de trabajo (1889/16/11) |
| `evidencia/23_commit_congelado_pytest.txt` | Suite backend sobre el commit aislado (1802/16/29) |
| `evidencia/21_pytest_transacciones.txt` | Suite del contrato de transacciones (21 pass) |
| `evidencia/30_ruff.txt` | Ruff versionado, canónico y formato |
| `evidencia/31_bun_check.txt` | ui-policy + tsc + ESLint |
| `evidencia/32_bun_test.txt` | Suite frontend (1707 pass) |
| `evidencia/40_salud_y_cabeceras.txt` | `/health/*` y cabeceras del proxy |
| `evidencia/41_bd_produccion_lectura.txt` | Estado de `bd_csh` en solo lectura |
| `evidencia/42_respaldos.txt` | Respaldos GFS, offsite y timers |
| `evidencia/43_estado_posterior_reinicio.txt` | Readiness, release en solo lectura y ausencia de 0097 en el namespace |
| `evidencia/50_hashes_artefactos.txt` | SHA-256 de artefactos normativos |
| `evidencia/99_cierre.txt` | Cierre de la captura |

Los SHA-256 de cada archivo están en `manifiesto.json` (`evidencia[].sha256`).
