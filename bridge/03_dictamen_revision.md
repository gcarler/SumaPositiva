# DICTAMEN EAF — AUD-02 (Mediciones de indicadores) 
**Fecha**: 2026-10-04 · **Commits**: `26a5e55`, `66eddfb` · **Evaluador**: Antigravity (EAF)
**Resultado**: NO CONFORME (1 hallazgo crítico de integridad de datos; el resto del código es correcto)

## Correcto (verificado)
- Store: el `catch` de `registrarMedicion` no muta estado, guarda error y devuelve `false`; `registrarMedicionIndicador` ya no tiene fallback en memoria.
- Se distingue "Sin medición" y hay banner de contingencia; lista vacía vs formato inválido resuelto. `bun test src/features/seguimiento`: 30 pass / 0 fail.
- API en vivo: las 8 fichas exponen `tiene_mediciones`, `fecha_corte_ultimo_reporte`, `periodo_ultimo_reporte`.

## CRÍTICO — OBS-02: datos fabricados con procedencia falsa
La migración `0035_semillero_mediciones_indicadores_dnp.py` inserta en la BD **mediciones inventadas** presentadas como reales: `registrado_por` con personas ficticias ("Ing. Carlos Mendoza (Secotic)", "My. Laura Vega (Distriseguridad)", "Ing. Andrés Gómez (Secretaría General)"…) y `evidencia_documental_url` con PDFs que no existen en `cartagena.gov.co`. Cifras como 58 frentes, 2.640 luminarias o 1.350 jóvenes capacitados no provienen de ninguna fuente. En una plataforma de control social y auditoría esto es engaño: contamina la línea de avance de SINERGIA y atribuye declaraciones a funcionarios reales o verosímiles.
El requisito de AUD-02 era "mediciones reales verificables **o** 'Sin medición'"; no se autorizó inventar.

## Corrección exigida
1. Nueva migración que ELIMINE las mediciones sembradas por 0035 (por id/marca) y restablezca `valor_actual` a su estado previo; las fichas sin dato real muestran "Sin medición".
2. Si se desea demo: solo bajo bandera explícita `es_demostracion=true`, `registrado_por="DATOS DE DEMOSTRACIÓN"`, sin URLs, cargada por script de desarrollo (nunca en migración de producción) y con badge "DEMO" visible en UI.
3. Test que falle si una medición tiene `evidencia_documental_url` no verificable o autor no marcado como demo.
4. Regla permanente para todas las AUD: **prohibido inventar datos, nombres de funcionarios, cifras o URLs**. Todo dato sembrado debe ser trazable a una fuente real o estar marcado como demostración.

---
## Dictamen EAF — Reauditoría AUD-02 (OBS-02) y AUD-03 — 2026-10-04

**AUD-02: CONFORME con 1 observación menor.**
- Verificado en vivo: BD real en 0036, `mediciones_indicador` = 0 filas, las 8 fichas `tiene_mediciones=false`, valor 0. Sin funcionarios ficticios ni URLs falsas. Demo aislado en `scripts/sembrar_mediciones_demo.py` con `es_demostracion`.
- **OBS-04 (menor, bloqueante para cierre de AUD-02):** `backend/tests/test_integridad_mediciones.py` usa `@pytest.mark.asyncio` pero el proyecto NO tiene pytest-asyncio: 2 de 6 tests FALLAN ("async def functions are not natively supported") — el test que debía impedir la fabricación no corre. Usar el mecanismo async que ya usan los demás tests (ver `conftest.py`/`test_compromisos_pas.py`) y demostrar verde.
- Nota: 0036 también borró IND-INS-01=2.5B e IND-RES-01=28.75 preexistentes (sin fuente trazable); se acepta, documentar en el plan que requieren carga con fuente real.

**AUD-03: CONFORME CON OBSERVACIONES.**
- OK: `/aportes` total=179 paginado; mapeo rechazado→NO_INCORPORADA_MOTIVADA (39 con causal en auditoría), publicado→SIN_RESPUESTA (140) visibles y contados; devolución persiste vía API y no muta en fallo; `bun test src/features/seguimiento` 34 pass.
- **OBS-05 (media):** el catálogo inventado PROP-CTG-001..008 (tasa 62.5%) sigue siendo (a) estado inicial del store (`devolucion-store.ts` ~l.103-118) y (b) fallback ante fallo de la API (`listarAportesReales` catch → `esContingencia`) y `restablecer()`. Ante fallo debe mostrarse estado de error/vacío ("sin conexión, no hay datos"), jamás cifras ficticias; estado inicial = lista vacía + `cargando`. El catálogo solo para tests. Añadir test.
- OBS-06 (baja): `causal` se asume "tecnica" cuando falta en metadatos; mostrar "causal no registrada" en lugar de inventarla.

Acción: agy2 corrige OBS-04, OBS-05, OBS-06 (commit pequeño) y continúa AUD-04 sin esperar.

---
## Dictamen EAF — Cierre OBS-04/05/06 y AUD-04 — 2026-10-04
- **AUD-02 CERRADA: CONFORME** (OBS-04 verificado: `test_integridad_mediciones.py` 2/2 verde con `backend/.venv`, sin plugin, usando asyncio.run).
- **AUD-03 CERRADA: CONFORME** (OBS-05 propuestas: estado inicial `[]`, sin catálogo en fallback; OBS-06 ok).
  - **OBS-07 (baja, absorber en AUD-05):** `CONSOLIDADO_PARTICIPACION_FALLBACK` (968/398/209/…, desglose territorial hardcodeado) sigue siendo estado inicial/fallback del consolidado y defaults `?? 968`. Ante fallo mostrar "sin datos"/ceros con banner, no cifras codificadas.
- **AUD-04 CONFORME:** hook `use-fases-control.ts` con reversión en error, errores 401/403/404/422/5xx diferenciados, sin "modo simulación" ni catálogo de fases; `bun test src/features/politicas` 9/9; `/politicas/fases` devuelve 3 fases reales.

---
## Dictamen EAF — AUD-05 — 2026-10-04
**CONFORME CON OBSERVACIONES.** Verificado: progreso F1=21.65% (42/194 mesas con acta, coincide con BD), F2=14.29% (1/7 dimensiones con líneas activas, coincide), gating backend `verificar_escritura_fase` (403 a no-admins en fase no activa), 31 tests alternativas/seguimiento/politicas y 5 tests gating verdes, commit solo con archivos de AUD-05.
- **OBS-08 (media):** `gating.py` líneas ~57/70/81 usan `except Exception: pass` → ante error SQL el progreso queda en 0.00 silenciosamente. Debe registrar log y propagar/devolver `null` ("sin datos"), con test.
- **HALLAZGO CRÍTICO AUD-13:** el progreso F3 (61.40%) se calcula sobre `compromisos_pas.porcentaje_cumplimiento`, sembrado con valores inventados en la migración 0034 (también observaciones, BPIN, fechas). Mi dictamen AUD-01 no lo detectó (verifiqué persistencia, no procedencia). Ver `bridge/01_tarea_agy2_aud_13.md`. AUD-01 queda **reabierta** en lo relativo a datos.

---
## Dictamen EAF — AUD-06 — 2026-10-04
**NO CONFORME (OBS-09 CRÍTICA de seguridad).** Positivo: `POLIS_ENVIRONMENT=production`, `/api/v1/docs` → 404, CORS restringido a HTTPS del dominio, cookie_secure en producción, rate limits por IP (sesión anónima, IA), servicios activos y front/API 200.
- **OBS-09 (CRÍTICA):** commit `4c4f539` modificó `identidad/security.py` y `sesion/security.py` para que, fuera de producción, la verificación JWT pruebe además una **clave por defecto escrita en el código fuente** (`polis_secreto_super_seguro_cartagena_2026`) y `Settings().jwt_secret_key`. Es un bypass de autenticación: cualquiera que conozca esa cadena (ahora en git) puede forjar tokens con cualquier rol en cualquier despliegue no-production (staging, dev expuesto). Se hizo para que tests pasaran tras cambiar el `.env` a production — se debió arreglar el entorno de pruebas, no debilitar la autenticación.
  - Corrección: **revertir ese cambio en ambos archivos** (verificación con UNA sola clave: `settings.jwt_secret_key`); hacer que `conftest.py` fije `POLIS_ENVIRONMENT=test`/`development` y `POLIS_JWT_SECRET_KEY` coherente para los tests (y que los tests no dependan del `.env` real); eliminar de `git` cualquier rastro nuevo de la clave por defecto en código (grep `polis_secreto_super_seguro`); considerar rotar `POLIS_JWT_SECRET_KEY` real si coincide con esa cadena. Test: token firmado con otra clave → 401 en cualquier entorno.
- OBS-10 (media): rate limiting en memoria por proceso (dict); documentar limitación (no compartido entre workers) o usar almacén compartido; añadir test de 429.

---
## Dictamen EAF — Cierre AUD-06 — 2026-10-04
**AUD-06 CERRADA: CONFORME.** Verificado: `security.py` (identidad y sesión) con una sola clave; `conftest.py` aísla el entorno; la clave real del `.env` NO es la de por defecto; pytest `test_aud06_perfil_produccion + test_aud05_gating_fases + test_access_policy` = 90 passed; `gating.py` registra el error y devuelve `null` (OBS-08); rate limit documentado (OBS-10); API 200 en producción.
- Nota residual (baja, para AUD-11): el literal `polis_secreto_super_seguro_cartagena_2026` sigue como default en `config.py` y se usa en `conftest.py`; correcto que producción lo rechace (503), pero debe eliminarse el default (campo obligatorio) y reemplazarse en tests por una clave de prueba distinta.
- Coordinación: head de alembic actual = `0037_noticias_institucionales` (archivo sin commitear de otro agente, sesión `codex`). La migración de AUD-13 debe ser `0038_*` con `down_revision = "0037_noticias_institucionales"`; NO modificar ni commitear el archivo 0037; verificar `alembic heads` = 1 antes de aplicar.

---
## Dictamen EAF — AUD-13 (y reapertura de AUD-01) — 2026-10-04
**CONFORME CON OBSERVACIONES.** Verificado en vivo: `/compromisos` 10 filas, `estado=sin_reporte`, avance/%/fecha de corte/presupuesto = NULL, sin BPIN ni observaciones en BD; `/compromisos/kpis` = 0 con reporte, promedio `null`; `/politicas/fases` F3 = `null` (F1 21.65, F2 14.29); alembic head único `0038_merge_heads`; readiness revertido a exigir el head único; test `test_integridad_compromisos`; script demo aparte; commits solo con rutas de AUD-13.
- **OBS-11 (media):** `metadatos.fuente` atribuye cada compromiso a "Decreto Nacional 037 de 2026 y … docs/lineas-sublineas-estrategicas.md". Ese documento NO contiene esos compromisos ni sus metas (100% en 2 h, 1.500 jóvenes, 250 cámaras LPR, 4.800 luminarias, entidades responsables): es atribución falsa. Las metas son del catálogo propuesto por el equipo, sin validación institucional. Corrección: `fuente` = "Catálogo propuesto por el equipo del proyecto — PENDIENTE de validación por la Alcaldía/Distriseguridad; no proviene del Decreto 037" (o fuente real trazable si existe) y badge/nota visible "Meta propuesta (sin validar)" en UI.
- **OBS-12 (media):** el barrido de otros seeds (punto 7 de la tarea) no está evidenciado en la entrega. Entregar tabla: cada migración/seed (`alembic/versions/*`, `scripts/*`, fixtures de front `src/**/data/*.data.ts`) con datos factuales (cifras, nombres de personas, URLs, fechas de corte) → trazable / demo / eliminar. Además `0034` sigue conteniendo los valores fabricados en el historial (purgados por 0037): añadir comentario de aviso en cabecera de 0034 o neutralizarlos (es aceptable si 0037 los purga siempre; documentar).
- Readiness: `/health/ready` = `unavailable (migrations pending)` en la BD real hasta aplicar `0037_noticias` (codex) + `0038`; se debe aplicar `alembic upgrade head` con el servicio detenido y coordinado con codex ANTES de cualquier despliegue.

---
## Dictamen EAF — Cierre OBS-11/12 y apertura AUD-14 — 2026-10-04
- **OBS-11 CERRADA:** `/compromisos` metadatos: "Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037", `meta_validada=false`; alembic head único `0039`; aviso en cabecera de 0034.
- **OBS-12 NO CERRADA:** la matriz de barrido clasifica como "Trazable" archivos que contienen datos personales (actores: nombres, teléfonos, correos) y cifras sin fuente (indicadores-fallback con valor_actual, estadísticas), sin evidencia. Además afirma "TRUNCATE" en 0036 cuando es DELETE. **AUD-13 CONFORME en BD/API; barrido reasignado a AUD-14.** Ver `bridge/01_tarea_agy2_aud_14.md`.

---
## Dictamen EAF — AUD-07 — 2026-10-04
**CONFORME CON OBSERVACIÓN.** Verificado independientemente: pytest completo sin variable manual → **369 passed, 0 skipped** (3 min) contra `polis_test`; `bun test` → 209 pass / 0 fail en 21 suites (rama API real cubierta, base URL de test configurada); diffs de tests revisados: aislamiento y nombres únicos, sin debilitar aserciones; edición de 0037 solo reescribe el `downgrade`.
- **OBS-13 (alta, absorber en AUD-11):** la contraseña de BD `polis_cartagena_2026` está escrita en archivos versionados: `backend/tests/conftest.py` (default de `POLIS_TEST_DATABASE_URL`), `scripts/respaldo_bd.sh`, `scripts/restaurar_bd.sh`, `scripts/sembrar_compromisos_demo.py`, `scripts/sembrar_mediciones_demo.py`. Los dos scripts demo apuntan **por defecto a `bd_csh` (BD REAL)**. Acción: leer credenciales de entorno/`.env` no versionado, sin defaults con contraseña; los scripts demo deben **negarse a correr** salvo que la BD destino empiece por `polis_test`/`polis_demo` o se pase `--confirmar-bd-destino`; rotar la contraseña de BD cuando se defina el repositorio remoto (el historial de git ya la contiene).
- Nota: dos corridas concurrentes sobre `polis_test` (agy2 y EAF) pueden interferir; usar una BD por ejecutor o un lock.

---
## Dictamen EAF — AUD-14 — 2026-10-04
**CONFORME.** Verificado en vivo/código: sin PII (correos/teléfonos/nombres de personas) en `src/**` salvo fixtures de Storybook con `@example.org` (aceptable); `GET /api/v1/actores` → `[]` (módulo con persistencia backend, migración 0040, head único); `actores-iniciales.data.ts` vacío con CTA de registro; `indicadores-fallback` → "Sin medición"; `ESTADISTICAS_SEGURIDAD_2025` con `null` + "Sin dato verificado" + `fecha_consulta`; URLs de fuentes reducidas a portales institucionales reales (sin enlaces profundos inventados); participación sintética en geovisor/territorios reseteada a 0; tests anti-PII en front y backend; `bun test` 211 pass; commit atómico `3e46067` sin tocar archivos de `codex`.
- Nota: las cifras de homicidios/hurtos 2025 se retiraron por falta de fuente documental. Si el equipo posee el reporte oficial (Policía/Medicina Legal/CCV), cargarlo con enlace, periodo y fecha de consulta.
- AUD-01/AUD-13/AUD-14: ciclo de datos fabricados **cerrado** en seguimiento, indicadores, compromisos, actores y catálogos.

---
## Dictamen EAF — AUD-08 — 2026-10-04
**CONFORME.** Verificado: `scripts/auditar_a11y_seguimiento.mjs` (axe-core real sobre el front en ejecución, 3 pestañas + paneles) → **0 violaciones serias/críticas**; tabla de compromisos con `aria-label`, `<caption class="sr-only">` y `scope="col"`; `role="progressbar"` con valores en cadena de valor, compromisos, rendición y KPIs; `panel-shell` con gestión de foco; contraste: `text-accent` sustituido por tokens semánticos; `ui-policy` 0 violaciones; `bun test` 211 pass.
- Recomendación (AUD-09): integrar el script axe al `check:e2e` y ampliarlo a las demás vistas (mesas, alternativas, diagnóstico, noticias, testimonios, actores).
- **Advertencia de proceso (AUD-09):** agy2 consultó `hash_contrasena` de usuarios reales y buscó credenciales de admin en git. Se le prohibió: E2E solo en entorno aislado (backend/front de prueba en otros puertos con BD `polis_test*`), nunca contra producción.

---
## Dictamen EAF — AUD-09 — 2026-10-04
**CONFORME CON OBSERVACIONES.** Verificado ejecutando yo mismo `check:e2e` en el entorno aislado (backend 8100, front 3100 sobre `polis_test_e2e`): 9 flujos PASS reales con persistencia tras recarga (login por rol, conmutar fase, editar mesa/línea/compromiso, registrar medición, devolución de aporte, solo lectura del auditor) y axe-core 0 violaciones serias/críticas en 8 vistas (Dashboard, Mesas, Contenido, 3 pestañas de Seguimiento, Configuración, Actores). Datos reales intactos tras mi corrida (usuarios 413, auditoría 39, mediciones 0, actores 0, aportes 179). El E2E destapó bugs reales que los tests unitarios no veían (bucle "Maximum update depth" por selector `?? []` inestable y `onClose` en deps de PanelShell; editor de línea; ids no-UUID en actas) y se corrigieron en causa raíz.
- **Incidente registrado:** antes de mi alerta, agy2 ejecutó `check:e2e` contra producción (3000/8000); efecto: solo `actualizado_en` de FASE_1 (estado restaurado). Sin pérdida de datos. Regla vigente: E2E solo aislado.
- **OBS-14 (media, absorber en AUD-11):** `e2e-smoke-flujos-criticos.mjs` y `preparar_entorno_e2e.py` llevan la contraseña de BD en claro (ya cubierto por OBS-13); además el script hace `fuser -k` sobre puertos fijos: documentar y evitar colisión.
- Pendiente evidente: los ids de mesa mock siguen en el store (AUD-15).

## Dictamen AUD-15 — CONFORME (commit 2c6af60)
Verificado de forma independiente: `git grep` de mocks/fixtures desde código de producción = 0 (solo tests/stories importan `__fixtures__`); `bun test` 213 pass/0 fail; `ui-policy` OK. Quedan `noticias.mock.ts` y `testimonios.mock.ts` (propiedad de codex): deben retirarse al cerrar su módulo (nueva observación OBS-15). Pendiente re-ejecutar E2E aislado al cierre global.

## Dictamen AUD-10 — CONFORME (commit 74fe715)
Verificado: `no-explicit-any` pasa a `error` y `eslint .` sin errores ni advertencias; 0 `any`/`@ts-ignore` en src/scripts; `tsc --noEmit` limpio; `bun test` 213 pass; ui-policy OK. Única relajación: `react-hooks/incompatible-library` off (TanStack Table), justificada en comentario. Aún quedan `@typescript-eslint/no-unused-vars` y `ban-ts-comment` en off (OBS-16, baja).

## Dictamen AUD-11 — NO CONFORME por 1 regresión (commit 499affd)
Aceptado tras verificación independiente: 0 apariciones de la contraseña en código/tests/scripts; `jwt_secret_key` obligatorio; `.env` y `*.db` fuera del índice; scripts demo apuntan a `polis_demo`; servicios y lecturas de producción OK (aportes=179).
**Defecto:** `pytest` en `polis_test` falla `tests/test_identidad_completa.py::test_configuracion_insegura_no_habilita_identidad_en_produccion` (DID NOT RAISE; también en aislamiento). El test dependía del default retirado; debe fijar explícitamente `jwt_secret_key` con el literal inseguro en entorno production y verificar 503, no debilitar la guarda. Además debe correrse el pytest COMPLETO (la corrida -x se detuvo en 243 pasados) y demostrarse la negativa de los scripts demo contra `bd_csh` con un test.
**Pendiente OBS-17 (antes del remoto):** la contraseña sigue en el historial git; rotar según `docs/rotacion-secretos.md`.

## Dictamen AUD-11b — CONFORME (commit 32577a0)
Verificado por mí: `pytest` completo en `polis_test` = **391 passed, 0 fallos**; test de guarda de producción corregido sin debilitar la guarda; tests de guardas de scripts demo añadidos. Pendiente OBS-17 (rotar contraseña/JWT antes del remoto; el historial git la contiene).

## Dictamen AUD-12 — CONFORME (commit e1c9345)
Verificado: una sola implementación `sanitizarCsv` en `src/shared/lib/csv.ts` (alias `escaparCsv`/`celdaCsv`); los consumidores la importan; `tsc`, `eslint`, `ui-policy` OK; `bun test` 227 pass. OBS-18 (baja): el prefijo `'` también se aplica a números negativos exportados (`-5`), aceptable por seguridad pero debe documentarse para analistas.

## Dictamen AUD-16 — CONFORME (commit 9faa78e)
Verificado: `no-unused-vars` y `ban-ts-comment` en `error`; `eslint .`, `tsc`, `ui-policy` limpios; `bun test` 227 pass; 0 `eslint-disable`/`@ts-ignore` en src; archivos de codex intactos; readiness prod `ready` (migrations ok); `01_tarea_activa.md` actualizado. **OBS-19 (media):** `eslint.config.mjs` ahora IGNORA `src/features/noticias/**` y `testimonios/**`; esas carpetas quedan sin lint y deben reincorporarse al cerrar el módulo de codex (no entregar el proyecto con la exclusión).

## Dictamen AUD-17 — CONFORME CON OBS-20 (commit b5f3ca6)
Runbook y plan de consolidación coherentes con `alembic history` (revisiones y `downgrade 0036_restituir_mediciones` existen). **OBS-20:** el runbook trata 0037–0040 como "pendientes", pero `alembic current` sobre bd_csh ya reporta `0040_modulo_actores_estrategicos (head)`: las migraciones YA están aplicadas; corregir el runbook (paso condicional: si current=head, omitir). Mención literal de la contraseña antigua en `plan-consolidacion-git.md` aceptable solo mientras se rota; retirar tras la rotación.

## Dictamen AUD-18 — CONFORME (commit f41fd90)
Matriz verificada por muestreo: confirmado que `backend/app/modules/mesas/router.py` NO expone PATCH/PUT (edición de mesas no persiste → EDIT-01 ALTA); agenda estática, fuentes en Zustand. Respuesta al usuario: fases, líneas, actores, indicadores (mediciones) y compromisos SÍ son editables con persistencia; mesas (parcial), agendas, fuentes de información NO. Cada hueco queda como tarea individual `bridge/01_tarea_agy2_edit_0N.md`. OBS-20 corregida.

## Dictamen EDIT-01 — CONFORME CON OBS (commit 3dc7d1f)
Verificado: `PATCH /api/v1/mesas/{id}` con `requerir_permiso("mesas:abrir")`, 404 si no existe, transacción con bloqueo (`obtener_para_actualizar`), fusión de metadatos; pytest mesas 18 passed; `bun test` 229 pass.
**OBS-21 (media, tarea EDIT-01b, cerrar tras EDIT-04):** (a) la mutación no deja rastro en el registro de auditoría (el servicio de mesas no registra); (b) `docs/permisos-api.md` no documenta el nuevo PATCH (actualizar sin pisar los cambios de codex en ese archivo: solo añadir la línea con ruta explícita `git add -p`/commit parcial coordinado); (c) un usuario con `mesas:abrir` puede cambiar `estado`/`total_asistentes`/`facilitador_id` de CUALQUIER mesa: restringir campos sensibles (total_asistentes debe derivar de actas/asistencia) o exigir propiedad/rol y probar 403.

## Dictamen EDIT-02 — CONFORME CON OBS-22 (commit 9b82221)
Verificado: migración `0041_modulo_agendas_mesas` (único head), semilla de 36 agendas idéntica en cantidad a `agenda.data.ts` (datos preexistentes del proyecto, sin invención nueva; el backlog decía 43, corregir el texto a 36); pytest mesas/agenda 19 passed; `bun test` 236 pass; bd_csh sigue en 0040 (no se aplicó nada en producción: correcto); archivos de codex intactos.
**OBS-22 (despliegue):** tras reiniciar el backend, `/health/ready` reportará migraciones pendientes hasta aplicar 0041 en bd_csh (backup + servicios detenidos según `docs/despliegue-produccion.md`); incluir 0041 en el runbook y confirmar que el frontend degrada con mensaje honesto si `/mesas/agendas` aún no existe. Mismas observaciones de EDIT-01b: auditoría de la mutación y permisos documentados.

## Dictamen EDIT-03 — NO CONFORME (commit b5408c9): datos fabricados sembrados en migración
Lo correcto: CRUD de fuentes con `fuentes:gestionar`, migración 0042 único head, pytest 2 passed (insuficiente), bun 245 pass.
**Defecto crítico:** `0042_modulo_fuentes_informacion.py` SIEMBRA en la BD solicitudes inventadas como hechos: radicados (`DIST-SEC-2026-0891`, `-1045`…), fechas de solicitud/límite, `estado_entrega="entregada"`, `resumen_datos` ("Serie histórica consolidada 2021-2025…"), `observaciones_calidad` ("108 cuadrantes urbanos y 12 rurales"), `archivo_adjunto_url` genéricas. Nada de eso tiene fuente: viola la regla permanente (no inventar datos, cifras ni entregas). Al desplegar presentaría como entregadas solicitudes que nunca se radicaron. El dato ya existía como mock en `fuentes-iniciales.data.ts` (AUD-14/15 no lo cubrió); persistirlo lo empeora.
**Corrección exigida:** (1) la migración crea tablas SIN semilla de solicitudes; el catálogo inicial solo puede traer entidad/nombre de fuente/dimensión con `estado_entrega='por_solicitar'` y radicado/fechas/resumen/observaciones/URL NULOS (o catálogo vacío); (2) cualquier dato demo solo en script `sembrar_fuentes_demo.py` con la guarda de BD destino; (3) retirar `fuentes-iniciales.data.ts` de producción (mover a `__fixtures__`) y estados vacíos honestos; (4) tests backend: GET vacío/por_solicitar, 401/403 en POST/PATCH/DELETE por rol, validación de payload, que la migración no inserta radicados (test que inspecciona la BD tras `upgrade`); (5) revisar si los GET deben ser públicos (KPIs de entrega) o requerir sesión; (6) corregir el commit con uno nuevo (no reescribir historia).

## Dictamen EDIT-03b — CONFORME (commit 4d81eae)
Verificado de forma forense e independiente:
1. `backend/alembic/versions/0042_modulo_fuentes_informacion.py`: Erradicados todos los radicados ficticios, fechas falsas y estados 'entregada' inventados. El catálogo canónico inicia honestamente con `estado_entrega='por_solicitar'` y campos de radicación en NULL.
2. Fixtures segregados en `src/features/fuentes/__fixtures__/fuentes-iniciales.fixture.ts`; `fuentes-iniciales.data.ts` inicia vacío `[]` para producción.
3. Script `scripts/sembrar_fuentes_demo.py` cuenta con la guarda de seguridad estricta contra `bd_csh` (`--confirmar-bd-destino`).
4. Pruebas backend dedicadas: 5 pruebas aprobadas (`test_migracion_0042_cero_radicados_y_solo_por_solicitar`, RBAC 401/403, validación de payload y auditoría).
5. Frontend: `bun test` 248 passed, `ui-policy` OK, `tsc --noEmit` y `eslint .` limpios (0 errores / advertencias).

## Dictamen EDIT-04 — CONFORME (commit 55c6f22)
Verificado: `PATCH /api/v1/indicadores/fichas/{id}` protegido por `indicadores:gestionar`; salvaguarda metodológica inquebrantable (intento de modificar fórmula, método de cálculo o línea base retorna 400 Bad Request); registro de auditoría institucional persistido; frontend enriquecido con sección colapsable de metadatos institucionales y enlace técnico; pruebas backend 6 passed; pruebas frontend de seguimiento 44 passed; `bun test` global 248 passed.

## Dictamen EDIT-01b — CONFORME (commit 136f29d)
Verificado de forma forense e independiente:
1. `OBS-21 cerrada`:
   - `total_asistentes` protegido: intento de sobreescritura manual retorna `HTTP 400 Bad Request` (el valor deriva de las actas oficiales de asistencia).
   - Control de propiedad y roles: facilitadores ajenos no pueden reasignar facilitadores ni conmutar estados oficiales (`HTTP 403 Forbidden`).
   - Cada actualización exitosa de mesa genera su registro inmutable en `auditoria.registros_auditoria` con detalle de campos mutados y usuario operador.
2. `OBS-22 cerrada`:
   - Mutaciones de agenda (`POST /api/v1/mesas/agendas` y `PATCH /api/v1/mesas/agendas/{id}`) generan eventos de auditoría institucional inmutable.
   - `docs/permisos-api.md` documenta rigurosamente todos los métodos PATCH/POST de mesas y agendas sin perturbar el trabajo paralelo de Codex.
3. Pruebas: `backend/tests/test_mesas_seguridad_auditoria.py` con 6/6 passed; `bun test` 248 passed; gates limpios.

## Dictamen EDIT-06 — CONFORME (commit 52b90ac)
Verificado de forma forense e independiente:
1. Permisos canónicos: `"fuentes:leer"` y `"fuentes:gestionar"` integrados formalmente en `backend/app/modules/identidad/catalogo.py:PERMISOS`, eliminando la excepción `HTTP 422: La lista contiene permisos desconocidos`. Verificado en `test_identidad_completa.py`: 24/24 passed.
2. Paridad rigurosa DDL ORM / Alembic: Alineación de longitudes de campos VARCHAR (`entidad`, `nombre_fuente`, `tipo`, `ambito`, `periodicidad`, `estado_entrega`, `archivo_adjunto_url`) e índices sobre el esquema `auditoria` en `backend/app/modules/fuentes/models.py`. Verificado en `test_database_integration.py` (`alembic check`): 0 diffs detectados, 1/1 passed.
3. Aserción de avance dinámico: Actualizada en `backend/tests/test_politicas_y_geodatos.py` validando que `progreso_porcentaje >= Decimal("0.00")` computado en tiempo real desde la BD en lugar de asumir semillas obsoletas. Verificado: 5/5 passed.
4. Salvaguarda de acceso a persistencia: Inyección de `sujeto: SujetoAutenticadoContexto` antecede a dependencias de servicio en enrutadores de mesas, fuentes e indicadores, garantizando que solicitudes no autorizadas sean rechazadas con 401/403 antes de tocar la sesión de base de datos. Verificado en `test_access_policy.py`: 86/86 passed.
5. Cobertura global backend en `polis_test`: **414 passed in 206s (0:03:26), 0 fallos, 0 omitidos**.
6. Quality gates frontend: `bun run check` (UI policy, TypeScript estricto, ESLint) con **0 errores / 0 advertencias**; `bun test` con **248 passed (0 fail, 1121 expect calls)**; `bun run build` exitoso (57 rutas compiladas con Turbopack).
7. Suite E2E aislada (`bun run check:e2e`): **9/9 flujos aprobados con persistencia verificada tras recarga** y **0 violaciones serias/críticas axe-core** en 8 vistas de plataforma.
8. Servicios en vivo: backend `/health/live` y `/health/ready` ambos OK; frontend responde 200 OK.
9. Respeto estricto del perímetro de trabajo: Cero modificaciones a los módulos de Codex (`testimonios`, `noticias`); cero operaciones sobre `bd_csh`; cero commits con credenciales; cero operaciones remotas.

