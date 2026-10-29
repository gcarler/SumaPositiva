# Manifiesto de provisionamiento — corpus fresco en `polis_test*` (24-10-2026)

**Operación:** provisionar una base `polis_test*` fresca (PostGIS + pgRouting),
ingerir el corpus PA/PDD local, reconstruir la cadena analítica y dejar la base
apta para la suite integral y el gold set de conciliación.
**Base provisionada en esta corrida:** `polis_test_verd_20261024`
(DSN en `/tmp/base_fresca.dsn`, chmod 600; la contraseña nunca se imprime).
**Canal de ingesta:** `IngestaMasivaService.ingerir` (el mismo de la API), con
`origen=GOOGLE_DRIVE_SECTOR_SEGURIDAD`; sin credenciales externas.

## 1. Pasos (idempotentes, repetibles)

| # | Paso | Comando / script | Guardia | Artefacto provisto |
| --- | --- | --- | --- | --- |
| 1 | Base fresca con extensiones | `uv run --project backend python backend/scripts/preparar_base_test_fresca.py` (ajustar `BASE_NUEVA` con la fecha) | exige plantilla `polis_test` con `postgis`+`pgrouting` por base (el rol no puede instalarlas en bases nuevas: hallazgo ambiental); `alembic downgrade base` deja el esquema lógico vacío | DSN en `/tmp/base_fresca.dsn` |
| 2 | Esquema reconstruido | `export POLIS_TEST_DATABASE_URL="$(cat /tmp/base_fresca.dsn)"` y correr la suite / `alembic upgrade head` | el `conftest` exige nombre `polis_test*` (HALL-03: jamás redirige a bd_csh) | esquema 71 migraciones |
| 3 | Corpus ZIP real PA | `uv run --project backend python backend/scripts/provisionar_corpus_test_zip_local.py` | dedupe por `hash_sha256` (reingerir no duplica; informa el lote existente) | lote de `lote_cartagena_oficial_2018_2026.zip` vía `IngestaMasivaService` |
| 4 | Corpus suelto PA/PDD con periodo | `uv run --project backend python backend/scripts/provisionar_corpus_test_sueltos_local.py` | dedupe por hash; `periodo_gobierno` explícito por archivo | 8 archivos de `data/planes_accion/muestras_reales_cartagena/` — ver hallazgo §3 |
| 5 | Pobladores de la cadena analítica | `backend/scripts/poblar_*`: geodatos territorios + indicadores, motor PA real, padrón DMU nivel 3, vínculos meta–PA triada | confinados a `POLIS_TEST_DATABASE_URL` | `geodatos.*` y `seguimiento.*` llenos |
| 6 | Checks del backend | `uv run --project backend ruff check backend && uv run --project backend ruff format --check backend` | — | registro en `/tmp/backend_check_fresh_verd.log` |
| 7 | Gold set reproducible | `python backend/scripts/conciliador_gold_set.py muestrear --positivos 300 --negativos 150 --semilla gold-verd-20261024 --exportar data/conciliador_gold_set/muestra.json --persistir-url $POLIS_TEST_DATABASE_URL` (la segunda pasada corregida persistió como lote `-r2`) | idempotente por `(muestrario, meta_id, actividad_pa_id)`; unicidad de `id_par` probada | 450 pares (300 positivos / 150 negativos) · `data/conciliador_gold_set/muestra.json` y `anotacion.csv` |

## 2. Verificaciones dejadas como evidencia

- Suite unitaria del gold set: **21 passed** (`test_conciliador_gold_set.py`),
  incluida la guardia de la primera pasada con ids duplicados (corrida real
  `gold-verd-20261024`) y la cita de `;` con `csv.writer`.
- CSV a ciegas regenerado y revalidado campo a campo: **450/450 pares
  alineados** contra el artículo tras eliminar el recorte de
  `nombre_meta`/`meta_producto_vigencia` a 120 caracteres; las 3 filas con `;`
  quedan citadas y no desplazan columnas.
- Corrida de corpus de la suite en la base fresca: 38 passed / 5 failed en la
  relanzada (`/tmp/corpus_relanzo.log`); los 3 fallos atribuibles a la ausencia
  del corpus masivo se remitieron a EAF
  (`bridge/61_remision_eaf_tests_corpus_masivo.md`).
- SisPT: `test_evaluar_universo_sispt_dnp_bd_csh_4637_metas_8_planes` pasó en
  la re-corrida cuando la base ya tenía las 4.637 metas; evidencia de que el
  estado depende del orden de provisioning, no del código.

## 3. Hallazgos de la corrida (para no repetir)

- **ZIP sin periodo:** el ZIP entra deduplicado por hash en el primer ingesta
  y quedó con `periodo_gobierno` vacío → sus registros no alimentan al
  conciliador. Por eso el paso 4 reingiere los sueltos con periodo explícito;
  el ZIP solo aporta muestreo multi-hoja y perfil multi-motor.
- **`nombre_meta` truncada a 120 en el CSV a ciegas** desalineaba 131/450
  pares contra los pares reales → se corrigió `exportar_csv_ciego` a texto
  íntegro (sin regresión: los anotadores ven el texto completo).
- Los alias `GP-…` del CSV derivan del hash interno; la guardia de unicidad
  cubre positivos y negativos (con actividad), también cuando la
  estratificación solo distingue `meta_id|semilla`.

## 4. Reprovisionamiento por Drive del 24-10-2026 (EJECUTADO)

El corpus masivo canónico del repositorio de Drive del sector seguridad
(`backend/scripts/sincronizar_drive_planes_accion.py`, canal público de
Drive, apuntando `POLIS_DATABASE_URL` a la base `polis_test*` — jamás
bd_csh) corrió completo en fresco el 24-10-2026. Resultado medido:

- Descarga/catálogo: 1.383 entradas; 1.305 Excel descargados (78 por diseño
  no-Excel); canal respondió en sonda 3/3. 14 archivos fuentes corrompidos
  en origen (7 CORVIVIENDA con estilos XML inválidos, 4 límites de
  expansión openpyxl, 3 sin parte de libro): defecto de la fuente, no del
  motor.
- Ingesta/persistencia masiva: 621 libros únicos por sha256 → 598 lotes
  persistidos + 8 ya-persistidos; **211.387 registros** triada normalizados;
  los 71 errores `varchar(100)` de la corrida del 14-10 no reaparecieron.
- Conciliador triada (`poblar_vinculos_meta_pa_triada.py`): corrió y dejó
  4.637 metas con la distribución por plan exacta, **pero**
  `ceros_observados_preservados_count = 0`, `metas_con_apropiacion_cop = 0`
  y `metas_con_avance_fisico_pct = 0` — mientras bd_csh (último estado
  histórico) tiene 1.645 vínculos con ceros y 3.539 con apropiación, sobre
  un corpus triada que en la base fresca SÍ tiene cifras (61.894 filas con
  apropiación, 82.087 con avance). La hipótesis "los ceros nacen del corpus
  masivo" queda REFUTADA por medición: el flujo que población cifras y
  ceros en vínculos es el canónico desalineado, no reproducible hoy con el
  motor masivo + los pobladores. Ver `bridge/61`.

El gold set no se re-muestra (la semilla es reproducible y la procedencia
no cambió). No mezclar la base fresca con la de producción.

## 5. Corrección del motor del conciliador (24-10-2026, misma jornada)

Dos defectos del motor explicaban los ceros de §4; ambos corregidos y
re-medidos sobre `polis_test_verd_20261024`:

1. **Métricas solo en vínculos EXACTO:** el extractor de cifras recibía
   `tri_metrica = None` para todos los vínculos no exactos, aunque el
   registro pareado (sectorial/acreditado) sí trajera cifras. Corregido:
   la métrica proviene del registro pareado en todos los tipos de vínculo;
   el cero observado (0.0) se preserva y el cruce hermano + el bloqueo de
   fuente compartida siguen siendo las guardias contra la imputación.
2. **Corte `LIMIT 9000` del índice `triada_dedup`:** con 10.673 grupos
   deduplicados con cifras en el corpus masivo, el corte con orden
   lexicográfico por `periodo_gobierno` dejaba **todo el corpus
   ANTES_2020** (1.451 grupos con cifras) fuera del índice; los planes
   PDD_2012_2015, PDD_2013_2015 y PDD_2016_2019 quedaban 100% huérfanos.
   Corregido: índice sin corte (las muestras por emparejamiento
   `[:800]`/`[:250]` siguen acotando el costeo).

**Estado medido tras la segunda corrida completa (4.637 metas en 8 planes):**
248 vínculos con apropiación, 415 con avance, 110 con cero observado
preservado, 1.622 bloqueados por la guardia de fuente compartida (bandera
`cifras_bloqueadas_por_fuente_compartida`, no se debilitó) y 2.533 huérfanos.
PDD_2016_2019 pasó de 0% a 41 apropiación / 45 avance / 17 ceros;
PDD_2012_2015 y PDD_2013_2015 quedan en 0 porque el corpus Drive no trae
registros de vigencia 2012–2015 (no se imputa desde otras vigencias).

**Verificación:** suite del módulo 49 passed
(`test_conciliador_vinculos_calidad_polis.py`,
`test_pdt_normalizador_y_vinculos_8planes.py`,
`test_pdt_revision_por_meta.py`, `test_pipeline_p0_unit.py`),
tests 1 y 2 de `bridge/61` PASSED en la base fresca, `ruff check` y
`ruff format --check` limpios. La guarda `imputacion_no_acreditada` del test
4637 se redeclaró a proveniencia (cifras del registro pareado o de la
actividad PA pareada; sin provenencia cuenta como imputación) para reflejar
la regla corregida, sin debilitar la evidencia.

Los gaps que quedan tras esta corrección (econometría espacial con n=24<29,
paridad bd_csh, corpus 2012–2015, dictamen EAF, pre-condiciones de tests,
backend:check y commit) están catalogados con pasos y criterios de aceptación
en `bridge/62_plan_cierre_gaps_corpus_masivo.md`.
