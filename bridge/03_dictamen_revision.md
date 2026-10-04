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
