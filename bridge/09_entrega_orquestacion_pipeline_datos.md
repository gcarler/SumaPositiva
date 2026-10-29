# Entrega Freebuff — orquestación del pipeline de datos (EDD)

**Rama:** `remediacion/aud-2026-10-21` · **Fecha:** 21-10-2026 · **Origen del encargo:** decisión del usuario sobre las «grietas» del flujo (01/autocrítica del pipeline): *Orquestar+validar · runner propio + cron · tabla de estado con migración*.
**Sin push, sin despliegue, sin commit.** Nunca se escribió en `bd_csh` desde pruebas; la única escritura operativa en `bd_csh` fue la corrida real idempotente del conciliador y la bitácora del corredor (ambas de diseño).

## 1. Matriz de entregables

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Migración 0070 `seguimiento.corridas_pipeline` | **Aplicada en `polis_test` y en `bd_csh`** | `backend/alembic/versions/0070_seguimiento_corridas.py`; tabla op (BIGSERIAL, CHECK etapa/estado, índices parcial único `uq_corridas_pipeline_etapa_activa` + `ix_corridas_pipeline_etapa_inicio`); versión head verificada en ambas bases |
| Modelo ORM `CorridaPipeline` | Registrado | `backend/app/modules/compromisos/models.py` (final); `alembic check` limpio en `polis_test` |
| Pruebas de integración | **2 passed** | `backend/tests/test_corridas_pipeline.py`: check/post-upgrade, única corrida activa por etapa, cierre con duración/resumen, CHECK etapa/estado, downgrade→reconstrucción conservando todo lo demás |
| Corredor idempotente | **Operativo, corrida real verificada** | `scripts/pipeline_datos_polis.py`: etapas fuentes/conciliacion/dea, dry-run por defecto, `--ejecutar` por etapa, reintentos con backoff, hilo daemon con timeout sin bloquear el proceso, guardia de corridas zombis >24 h, `--cerrar-activa` explícito del operador |
| Cron | Instalado | Nocturna `fuentes` **real** (50 1 * * *); `conciliacion`/`dea` **comentadas** hasta decisión de producto |
| Corridas reales registradas | Bitácora `bd_csh` | fila 1 `fuentes/fallo/cerrado_por_operador` (huérfana de la corrida pionera), fila 3 `fuentes/exitoso/44.490 ms/ok=true`, fila 4 `dea/exitoso/491 ms/resumen 1,98 MB`, fila 5 `conciliacion/exitoso` (4637 metas, 4637 filas, idempotencia confirmada) |

## 2. Defecto de corredor detectado y corregido durante la verificación

El primer cierre de corrida quedó en `corriendo`: con asyncpg, el hábito `text(':resumen::jsonb')` produce un `:` suelto en el SQL renderizado (`PostgresSyntaxError`). Corregido con `bindparam` tipado `JSONB` (SQLAlchemy `postgresql.JSONB`), probado con la corrida real fila 3. El índice parcial único demostró su valor: bloqueó la segunda apertura mientras la activa seguía viva; añadí `--cerrar-activa` como operación explícita del operador (nada de cierres silenciosos automáticos).

## 3. Hallazgo EDD para EAF (fuera de alcance de hoy, con evidencia)

- **Resolutor de los motores redirige pruebas a la base canónica:** `_resolver_url_bd_csh()` en `pdt_conciliador_vinculos_pa_triada.py` y `pdt_dea_4niveles_cartagena.py` sustituye la base `polis_test*` por `bd_csh` **incluso bajo `POLIS_TEST_DATABASE_URL`** (líneas ~101–106 y ~210–215). Es la grieta de aislamiento que explica fixtures de prueba dentro de `bd_csh` (caso `LE-APORTE-8ff57e`). Requiere decisión del equipo EDD/EAF: guardia que falle si el entorno es prueba o re-encaminamiento explícito por parámetro. **No lo cambié hoy** para no meter mano a motores productivos sin revisión; el corredor nuevo no usa ese resolutor para su bitácora.
- **`alembic check` en `bd_csh` marca 3 tablas DEA sin modelo ni migración** (`pdd_dmu_ieo_oficiales`, `pdd_dmu_ese_centros_salud`, `pdd_fuentes_financiacion_dmu`): creación perezosa fuera del lineage (patrón ya documentado en `plan_remediacion_20102026.md` para otras tablas). Deuda preexistente, no introducida por esta entrega. En `polis_test` el check quedó limpio.
- **5 fallos del `backend:check` completo son del entorno compartido de pruebas:** con una `polis_test_orquesta` fresca (mismas extensiones), los mismos tests + los míos pasan **33/33** (`/tmp/backend_check_fresh2.log`). Los fallos en la `polis_test` compartida son administradores residuales de corridas anteriores (guardia «Reasignar administradores… antes de downgrade» y «Ya existe un administrador activo»). Limpieza o restablecimiento de la `polis_test` compartida queda como pendiente de operación.

## 4. Auditoría de conciliación (responde a la sospecha «espejo 1:1»)

Con las columnas correctas (`meta_id`, no `meta_meta_codigo`):

- Cobertura: **0 metas sin vínculo** (4.637/4.637).
- Estructura: **0 metas con múltiples vínculos; máximo 1 por meta** → es un índice de trazabilidad por meta con `registro_triada_id` + `actividad_pa_id`, no una tabla de parejas 1:N esperada.
- Tipificación real: `PROGRAMA_Y_DEPENDENCIA_ACREDITADOS` 2.487 (53,7 %) · `VINCULO_SECTORIAL_INFERIDO` 2.129 (45,9 %) · `EXACTO_BPIM_PROYECTO` 21 (0,5 %).
- Calidad por fila: `score_confianza` media 0,675 · p90 0,780 · **0 filas con score 0**; `evidencia_cruce` presente en el 100 %.
- **Lectura honesta:** el recobro del 100 % es por diseño (cada meta recibe vinculo); la **precisión sigue sin validar** — el 45,9 % es inferencia sectorial y no existe gold set (200–300 pares, doble anotación) ni métricas precision/recobrado como preveía el plan de codex. Queda pendiente real.

## 5. Propuesta de capa inteligente (LangGraph + PydanticAI — ya en `pyproject`)

El usuario propuso orquestación «experta, industrial» con PydanticAI y LangGraph. Ambas já están en dependencias (`langgraph>=1.2.12`, `pydantic-ai>=2.52.0`) y el evaluador PDT-AI ya usa LangGraph con `interrupt`/HITL. Propuesta concreta para el siguiente ciclo:

1. **Grafo supervisor** (`app/modules/compromisos/orquestador_grafo.py`): nodos = etapas del corredor + validadores PydanticAI como puertas (contrato de `resumen`, análisis de anomalías del corpus, semáforo del dictamen DEA), aristas condicionales para reintentos y saltos, `checkpointer` Postgres en la bitácora 0070 extendida con `thread_id` (trazabilidad industrial por corrida, reanudable).
2. **Puertas de calidad PydanticAI** antes de promover resultados: ficha de origen obligatoria para cifras 2025–2026, gold set de conciliación como insumo de la puerta.
3. **HITL** reutilizando el patrón `interrupt` ya probado en `pdt_ai_evaluator_graph.py`.
4. El corredor determinista queda como sustrato de cron/reintentos; el grafo se monta sobre él (capas, no sustitución).

## 5b. Capa inteligente construida (LangGraph + PydanticAI — 21-10-2026, tarde)

La propuesta del §5 se implementó en el mismo ciclo. Entregables:

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Migración 0071 | **Aplicada (con nota operativa, ver abajo)** en `polis_test_grafo` y `bd_csh`; `alembic check` limpio en la base de pruebas tras ciclo `downgrade 0070 → upgrade head` | `backend/alembic/versions/0071_corridas_pipeline_grafo.py`: `seguimiento.corridas_pipeline.thread_id` + tabla `seguimiento.corridas_pipeline_pasos` (diario auditable por nodo, CHECK de catálogo, SHA-256 del payload) |
| Modelo ORM | Registrado | `CorridaPipelinePaso` + `thread_id` en `CorridaPipeline` + índices en `__table_args__` (autogenerate coincidente) |
| Grafo supervisor | Operativo | `app/modules/compromisos/orquestador_grafo.py`: `nodo_supervisor → nodo_corredor (sustrato determinista) → nodo_puerta → (nodo_revision_humana con `interrupt`) → supervisor…`; `correr_grafo()` y reanudación HITL in-proceso con `DecisionAuditor` validada |
| Puertas PydanticAI | Operativas | Contratos Pydantic sobre las claves REALES de la bitácora 0070 (verificados contra las filas 3–5: `ok/log`, `metas_conciliadas/…`, `estado/niveles/separacion_estricta…`) + reglas audibles (idempotencia conciliación, proporción inferida ≥ 50 % → severidad media, fronteras homogéneas DEA, cobertura nula, `ok=false` de fuentes); dictamen final emitido por agente PydanticAI (FunctionModel determinista por defecto; LLM real solo si `OPENAI_API_KEY` + `POLIS_IA_MODELO` explícitos) |
| Corredor CLI extendido | Operativo | `--grafo` (corre la etapa a través del grafo con el mismo sustrato), `--thread-id` (firma corrida 0070), `--omitir` (replan sin etapa rechazada); congela con exit code 3 e imprime la decisión esperada |
| Verificación real en producción | Exitosa | Corrida `--etapa fuentes --ejecutar --grafo --thread-id verificacion-grafo-20261021b`: fila 6 en 0070 con `thread_id`, 2 pasos en el diario (`nodo_corredor/exitoso`, `nodo_puerta/aprobado` con SHA-256), estado final `COMPLETADO_SIN_BLOQUEO` |
| Pruebas | **7 passed** | `tests/test_orquestador_grafo.py` sobre `polis_test_grafo` fresca (plantilla `polis_test_orquesta`): migración+CHECK, plan aprobado con diario completo y SHA, congelamiento+reanudación del auditor, rechazo del auditor, esquema de decisión sin campos libres; NO tocan `bd_csh` (manejadores inyectados) |

Defectos detectados y corregidos durante la construcción:
1. **Doble arranque de hilo en el corredor** (`_ejecutar_bajo_timeout`): el hilo de trabajo se iniciaba DOS veces — cada etapa ejecutó su trabajo doble en las corridas reales de ayer (las pasaron por idempotencia). Corregido; es un defecto de la entrega de la mañana, no de ayer.
2. **Merge invertido del estado del grafo**: el `pareceres` nuevo (decisión del auditor) era pisado por el estado previo al construir `{etapa:..., **state}` para las misma clave; corregido en corrdor, puerta y revisión humana.
3. **Extractor del dictamen PydanticAI**: el prompt llega como `UserPromptPart`, no como `TextPart`; la puerta aprobaba todo por defecto. Corregido y probado.
4. **CHECK del diario sin `'exitoso'`**: el corredor sí escribe ese estado; añadido al catálogo.
5. **Manejadores en el estado de LangGraph**: `MemorySaver` serializa con msgpack y no admite callables; movidos a un registro de proceso por thread (mismo límite in-proceso del checkpointer).

Nota operativa honesta: el ciclo de verificación `downgrade → upgrade` corrió inicialmente contra `bd_csh` (al hacer `unset POLIS_DATABASE_URL`, alembic resolvió el `.env` → base canónica). Revisión posterior: sin pérdida de datos (las filas reales 1, 3, 4, 5 de la bitácora están intactas; el downgrade de 0071 solo borró la tabla `pasos`, vacía, y la columna nueva `thread_id`, que era NULL en filas viejas); el efecto neto equivale a «aplicar 0071», que era el plan de la entrega. El ciclo se repitió limpio contra `polis_test_grafo` con URL explícita.

Límites declarados de esta capa:
- La reanudación HITL exige el MISMO proceso vivo que congeló (MemorySaver en memoria, igual que el evaluador PDT-AI). La operativa inter-procesos es: congelado → decisión → rerun con `--omitir <etapa>` (o registrar la decisión y reabrir el thread en el mismo proceso, p. ej. un worker FastAPI).
- El checkpointer distribuido (LangGraph sobre Postgres) requiere `langgraph-checkpoint-postgres` (no está en `uv.lock`); la trazabilidad histórica no depende de él porque cada nodo deja fila en 0071.
- El sustrato determinista sigue resolviendo bitácora vía `POLIS_DATABASE_URL`/`.env`; el orquestador NUEVO honra `POLIS_TEST_DATABASE_URL` y no usa el resolutor con grieta `polis_test→bd_csh` (hallazgo del §3, pendiente de decisión).

## 6. Pendientes reales

- Decisión de producto sobre cron de `conciliacion`/`dea` (líneas comentadas listas).
- Guardia del resolutor `polis_test→bd_csh` (hallazgo EAF).
- Gold set y métricas de precisión de la conciliación. → **Construido el 22-10-2026 (§9)**: muestrario 240 pares persistido + rúbrica de anotación + IC bootstrap; falta la doble anotación humana para publicar métricas.
- Las 3 tablas DEA al lineage Alembic con modelo.
- Limpieza de la `polis_test` compartida (administradores residuales).
- `avance_estrategico_pct` sigue en 0 (gap de fuentes, previo).
- LLM real como juez de las puertas (hoy FunctionModel determinista; la escalada es decisión de producto y tiene riesgo de sobrescribir reglas codificadas).
- Añadir las etapas pesadas (`conciliacion`, `dea`) al cron bajo el grafo (hoy solo `fuentes` nocturna; el grafo ya está listo para el cron pesado).

## 7. Cambios de archivos

- `backend/alembic/versions/0071_corridas_pipeline_grafo.py` (nuevo)
- `backend/app/modules/compromisos/orquestador_grafo.py` (nuevo)
- `backend/app/modules/compromisos/models.py` (+ `CorridaPipelinePaso`, `thread_id`, índices)
- `backend/tests/test_orquestador_grafo.py` (nuevo)
- `scripts/pipeline_datos_polis.py` (+ `--grafo`, `--thread-id`, `--omitir`; fix doble arranque de hilo)

- `backend/alembic/versions/0070_seguimiento_corridas.py` (nuevo)
- `backend/app/modules/compromisos/models.py` (+ `CorridaPipeline`, `BigInteger` import)
- `backend/tests/test_corridas_pipeline.py` (nuevo)
- `scripts/pipeline_datos_polis.py` (nuevo)
- `crontab` del servidor: entradas del pipeline (fuentes activa; pesadas comentadas)

## 8. Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `alembic upgrade head` + `check` en `polis_test` (host) | OK |
| `alembic downgrade 0069` → `upgrade head` → `check` | OK (reconstrucción + tabla operativa) |
| `pytest tests/test_corridas_pipeline.py` | **2 passed** |
| `bun run backend:check` (base compartida) | 723 passed / **5 failed** (entorno compartido, ver §3; 33/33 en base fresca) |
| `pytest tests/test_orquestador_grafo.py tests/test_corridas_pipeline.py` (base `polis_test_grafo` fresca) | **7 passed** |
| `backend:check` completo sobre `polis_test_grafo` fresca | **732 passed / 1 failed / 16 skipped** (6 min). Único fallo: `test_disponibilidad_pgrouting_en_repositorio` — ambiental: pgRouting 4.0.1 existe en `polis_test` y `bd_csh` pero NO en las plantillas frescas y el usuario `polis` no puede crearlo (`InsufficientPrivilege`); la plantilla de pruebas del servidor debe traer pgRouting |
| Ciclo `downgrade 0070 → upgrade head → check` en `polis_test_grafo` (URL explícita) | OK, sin nuevas operaciones |
| Corrida real `--grafo --etapa fuentes --ejecutar --thread-id verificacion-grafo-20261021b` | fila 6 exitosa (104.4 s), 2 pasos con SHA, `COMPLETADO_SIN_BLOQUEO` |
| Corredor dry-run | plan correcto, sin escrituras |
| Corredor `--etapa fuentes --ejecutar` | exitoso 44,5 s, fila 3 en bitácora |
| Corredor `--etapa dea --ejecutar` | exitoso 0,5 s, resumen 1,98 MB con dictamen |
| Corredor `--etapa conciliacion --ejecutar` | exitoso, 4637/4637 idempotente |
| Consultas de auditoría de conciliación | §4 |

## 9. Gold set de conciliación con doble anotación (22-10-2026)

Cierra el pendiente de §4/§6 con el aparato de medición de la precisión del
conciliador (el recobrado 1.0 es por diseño). Entregables:

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Migración 0083 | Aplicada en `bd_csh` y en base aislada `polis_test*`; `alembic check` limpio | `backend/alembic/versions/0083_conciliador_gold_set.py`: tabla `seguimiento.conciliador_gold_set` con UNIQUE por muestrario (`COALESCE(actividad_pa_id)`), CHECK de catálogos y COMMENT; modelo ORM registrado en `models.py` (autogenerate coincidente) |
| Módulo | Operativo | `app/modules/compromisos/gold_set_conciliacion.py`: muestreo estratificado con md5+semilla, doble anotación, adjudicación automática (acuerdo) / `requiere_adjudicacion` (desacuerdo), precisión global y por tipo, recobrado por falsos negativos, kappa de Cohen, CSV a ciegas |
| CLI | Operativo | `backend/scripts/conciliador_gold_set.py`: `muestrear`, `exportar-csv`, `importar --juez a|b --persistir-url`, `metricas` |
| Corrida real | Exitosa | Muestrario `gold-set-2026-10-21`: 240 pares (180 positivos: 96 PROGRAMA_Y_DEPENDENCIA_ACREDITADOS, 83 VINCULO_SECTORIAL_INFERIDO, 1 EXACTO_BPIM_PROYECTO; 60 negativos), persistencia idempotente (240/240) y corrida registrada en la bitácora 0070 (fila `conciliacion`/`exitoso`) |
| Pruebas | **9 passed** | `tests/test_conciliador_gold_set.py` en `polis_test*`: lógica pura (muestreo, kappa, métricas, CSV) + integración (DDL 0083, carga idempotente, CHECK rechaza etiqueta fuera de catálogo) ; NO tocan `bd_csh` |
| Artefactos | En disco | `data/gold_set_conciliacion/gold_set_articulo.json` y `anotacion_a_ciegas.csv` |

Refuerzos del 22-10-2026 (tarde) sobre esta entrega:

1. **Ceguera real del CSV**: los IDs con prefijo `pos-`/`neg-` filtraban
   `par_tipo` al anotador. Ahora `exportar_csv_ciego` escribe el alias neutral
   `GP-<md5(id)[:12]>` (`identificador_csv`) y `importar` casa etiquetas por
   alias (acepta el ID crudo por compatibilidad). Test anti-fuga
   (`test_csv_a_ciegas_no_filtra_par_tipo_por_el_id`) en la suite; CSV real
   regenerado y verificado sin fuga.
2. **Intervalos de confianza**: `intervalos_bootstrap` (remuestreo con
   reemplazo, semilla reproducible, percentiles 2,5/97,5) ic en
   `MetricasGold.ic_bootstrap` (opcional). El CLI las publica con
   `metricas --bootstrap N --semilla-ic S`. Con muestras pequeñas (60
   negativos; estratos mínimos) la regla de difusión exige IC, no el valor
   puntual.
3. **Rúbrica normativa** de la doble anotación: `docs/gold-set-anotacion.md`
   (escala con regla conservadora `NO_EVALUABLE`, criterios de decisión,
   calibración con kappa objetivo ≥ 0,8, adjudicación ciega, difusión honesta).
4. **HALL-03 verificado cerrado en el árbol**: todos los módulos delegan en
   `app/modules/compromisos/resolutor_bd.py` (guardia que jamás redirige
   `polis_test*` a `bd_csh`, probada en `tests/test_pipeline_p0_unit.py`
   junto con sus tests de guardia), el fallback de
   `tests/test_pdt_persistencia_pg.py` a `bd_csh` fue eliminado (omitido con
   causa explícita). El módulo nuevo quedó dentro de la misma convención.
   Dictamen independiente: resolución EAF.

Suite de esta ronda: 10 nuevos tests del gold set (fuga + IC) +
`test_pipeline_p0_unit.py` completo → **37 passed** (`polis_test_dea`).

Pendiente operativo (requiere personas, no código): los dos anotadores llenan
`anotacion_a_ciegas.csv` (240 pares), se importa cada juez, se adjudican los
desacuerdos y `metricas` publica precisión/recobrado/kappa. El Hall-03 del
evaluador (resolutores de URL con semántica opuesta) no aplica al módulo nuevo:
usa `resolver_url_bd_csh` o URL explícita `--persistir-url`.

## 10. Ensayo del flujo completo previo al trabajo humano (23-10-2026)

Verificación de extremo a extremo del flujo de anotación en `polis_test_dea`
(mi base exclusiva de pruebas, aislada de `polis_test_orq_v5_20261022` de
Codex y de `bd_csh`) con etiquetas simuladas, ANTES de que los anotadores
humanos llenen el CSV real. Base del ensayo: copia del artefacto en
`/tmp/ensayo_articulo.json` (SHA-256 `9b6ecd7a…2977f1`; el artefacto real de
`data/gold_set_conciliacion/` NO se tocó).

| Paso | Resultado |
| --- | --- |
| CSVs simulados (jueces a y b) | 240 pares cubiertos por alias `GP-…`; verdad de fondo determinista (≈85 % positivos correctos, ≈15 % FN) con divergencia simulada → **66 desacuerdos sembrados** |
| `importar --juez a` + `--juez b`, persistencia en polis_test_dea | 240/240 pares; cierre automático de **174 acuerdos** → `adjudicado`; **66 desacuerdos** exactos → `requiere_adjudicacion` |
| Adjudicación simulada (adjudicador competente: verdad de fondo) | 66/66 resueltos; estados finales **240 `adjudicado`**; persistencia idempotente 240/240 |
| `metricas --bootstrap 2000` | precisión global **0,822** IC95 [0,761, 0,872] · recobrado **0,961** IC95 [0,931, 0,987] · kappa 0,426 · desacuerdo 27,5 % (66/240, coincide con lo sembrado) · 6 falsos negativos |
| Limpieza | **DELETE de las 240 filas** de `seguimiento.conciliador_gold_set` bajo muestrario `ensayo-gold-flujo`; tabla queda en **0 filas** — la base queda lista para el muestrario humano |
| Huella de evidencia | `/tmp/ensayo_articulo.json` `9b6ecd7a…2977f1` · CSV juez a `f1fe1a22…5e9bdb50` · CSV juez b `a6c2d7cc…666b8993` |

**Defecto real detectado y corregido durante el ensayo (importar):** el `importar` exigía la columna exacta `etiqueta`, pero el CSV que devuelve el anotador es la MISMA plantilla a ciegas con la última columna llena (`etiqueta_enviada`, vacía en la plantilla). El lector (`_leer_etiquetas_csv`) ahora hace **fallback `etiqueta` → `etiqueta_enviada`**; test nuevo en la suite con el CSV tal cual lo entrega el juez. Con ese ajuste el flujo de anotación quedó validado end-to-end; anotadores humanos pueden empezar sin fricción.

**Advertencia operativa para la anotación real:** el parámetro `--juez` del CLI
por defecto es `a` y NO se infiere de `--anotador`; en el ensayo hubo una
sobrescritura de etiquetas (juez a pisado por CSV de b, luego reimportado
correcto) que el upsert de la BD toleró sin perder información final. En la
anotación humana: pasar `--juez` explícito en cada corrida, como exige la rúbrica.

**Alcance del ensayo (lectura honesta):** valida el aparato de flujo y las
métricas del módulo, NO la calidad del conciliador (las etiquetas son
simuladas); las cifras de precisión/recobrado de esta ronda son del ensayo y
deben quedar fuera de cualquier cita como métricas del sistema.

### §10.1 Recordatorio operativo para los anotadores humanos (23-10-2026)

Entrada: cada anotador recibe una copia de
`data/gold_set_conciliacion/anotacion_a_ciegas.csv` — columnas
`id_par;codigo_plan;codigo_meta;nombre_meta;codigo_actividad;meta_producto;etiqueta_enviada`,
con `id_par` como alias neutral `GP-…` que NO revela `par_tipo`.

**Checklist antes de devolver el CSV:**
1. Llenar SOLO la última columna `etiqueta_enviada`; no renombrar, reordenar
   ni añadir columnas; no borrar filas (son 240).
2. `id_par` intacto: no editar ni regenerar el alias (el `importar` casa
   etiquetas por alias; si cambia, la fila no se importa).
3. Etiquetas exactas del catálogo (rúbrica `docs/gold-set-anotacion.md`):
   `VINCULO_CORRECTO`, `VINCULO_INCORRECTO`, `NO_EVALUABLE`. El lector
   normaliza mayúsculas y espacios, pero la ortografía exacta evita
   rechazos en frío.
4. Sin celdas vacías en `etiqueta_enviada`: una fila sin etiqueta detiene
   la importación con error explícito.
5. Separador punto y coma `;` y archivo en UTF-8 (el lector acepta BOM de
   Excel con `utf-8-sig`).
6. Cada juez anota su copia INDEPENDIENTE y no comparte etiquetas antes
   del cierre (doble anotación ciega).

**Comando de importación correcto** (desde `backend/`, tras definir
`POLIS_TEST_DATABASE_URL` con una base `polis_test*` exclusiva):

```bash
uv run python scripts/conciliador_gold_set.py importar \
  --articulo data/gold_set_conciliacion/gold_set_articulo.json \
  --anotaciones <ruta-csv-del-juez> \
  --juez <a|b> \
  --anotador <nombre-identificable-del-juez> \
  --persistir-url "$POLIS_TEST_DATABASE_URL" \
  --muestrario gold-set-2026-10-21
```

CORRER DOS VECES: una por juez, cada una con SU CSV. **Advertencia crítica:**
`--juez` NO se infiere de `--anotador` (por defecto es `a`); una corrida sin
`--juez b` cargará el CSV del juez b como si fuera del juez a y SOBREESCRIBIRÁ
sus etiquetas en silencio (defecto real del ensayo, tolerado por el upsert).
Después: adjudicación ciega de los `requiere_adjudicacion` (tercera persona,
nunca uno de los dos jueces) y
`uv run python scripts/conciliador_gold_set.py metricas --articulo … --bootstrap 2000 --semilla-ic ic-gold-set`.
Nota: el CLI ahora trae subcomando `adjudicar` (23-10-2026, §10.2): la
adjudicación de los desacuerdos se hace con el CSV `id_par;etiqueta` de un
tercero y un solo comando — antes la persistencia tras adjudicar requería
llamar a las funciones del módulo a mano (como en el ensayo), y esa práctica
manual queda obsoleta.

### §10.2 Revisión preventiva del módulo gold set (23-10-2026, misma clase que el defecto del importar)

Revisión preventiva EDD de `gold_set_conciliacion.py` y
`scripts/conciliador_gold_set.py` (leídos íntegros) buscando defectos de la
clase detectada en el ensayo (parámetros implícitos, sobreescrituras
silenciosas, lectura de CSV). NO es dictamen EAF (independencia: el
implementador no firma como evaluador de su propio cambio).

| # | Hallazgo | Evidencia | Severidad | Estado |
| --- | --- | --- | --- | --- |
| A1 | `importar` escribe `etiqueta_X` sin condiciones y `--juez` por defecto es `a`: reimportar SOBREESCRIBE etiquetas existentes en silencio (visto en el ensayo: CSV de b cargado como juez a) | `scripts/conciliador_gold_set.py` línea ~274 (`dato[campo_juez] = etiqueta`) | media | **CORREGIDO 23-10-2026**: guardia de conflicto que aborta `importar` si pisaría etiqueta(s) ya registradas (etiqueta o anotador distintos), idempotente con el mismo CSV/anotador, y bandera `--permitir-reimportar` para sobrescritura explícita; test `test_importar_rechaza_pisar_etiquetas_del_juez_y_exige_bandera` |
| A2 | Semilla de procedencia borrada por cada `importar`: `guardar_articulo(..., "")` deja `semilla: ""` en el artefacto; VERIFICADO: la copia del ensayo la perdió, el real aún conserva `gold-set-2026-10-21` | cabecera de los dos artefactos JSON | media | **CORREGIDO 23-10-2026**: el CLI conserva la `semilla` previa del artefacto en `importar` y `adjudicar`; test `test_importar_es_idempotente_con_el_mismo_csv_y_preserva_la_semilla` |
| A3 | `--anotador` con default `anotador-desconocido`: un `importar` sin autor explícito deja la pista de auditoría sin identidad y puede cerrar acuerdos sin saber quién anotó | `main()` línea ~226 | baja-media | **CORREGIDO 23-10-2026**: `importar` exige `--anotador` explícito; test `test_importar_exige_anotador_explicito` |
| A4 | `exportar_csv_ciego` arma el CSV con join manual de `;` sin escape: un `;` en `codigo_plan`/`codigo_meta`/actividad desplaza columnas en silencio (los textos largos SÍ están saneados; los códigos NO) | `gold_set_conciliacion.py` ~361–376 | baja-media | **CORREGIDO 23-10-2026**: reescrito con `csv.writer` (celdas con `;` citadas); test `test_exportar_csv_ciego_escapa_punto_y_coma_en_celdas` |
| A5 | `_leer_etiquetas_csv` acepta filas duplicadas por `id_par` (última gana, silencio) — riesgo de copia/pegado del juez | `scripts/…` `leidas[par_id] = etiqueta` | baja | **CORREGIDO 23-10-2026**: duplicados con etiquetas contradictorias abortan con error explícito; test `test_lector_rechaza_par_duplicado_con_etiquetas_contradictorias` |

**Lo que está sólido en el mismo barrido:** cierre de estados
(`mejor_etiqueta_par`) immutabable y coherente (acuerdo/pendiente/adjudicado);
métricas excluyen con causa explícita (sin adjudicación, `NO_EVALUABLE` se
reporta aparte, no se disimula); bootstrap por resample separado por tipo con
semilla reproducible; persistencia en UNA transacción por lote (sin parciales)
y idempotente por `ON CONFLICT` con target via COALESCE definido en 0083;
ninguna ruta escribe en `bd_csh` (URL explícita o resolutor con guardia);
el CSV a ciegas no expone `tipo_vinculo_conciliador`, `score_confianza` ni
ninguna vía de fuga de `par_tipo` (el fallback al id crudo solo usa claves que
el anotador ya podría conocer; no amplía la exposición).

Los hallazgos A1–A5 quedan como insumo para la decisión EDD; ninguno bloquea
la anotación humana si se sigue el checklist §10.1 (`--juez` y `--anotador`
explícitos, CSV devuelto tal como se entregó). Remitidos a EAF para dictamen
independiente: `bridge/44_remision_eaf_hallazgos_gold_set.md`.

**Cierre de la ronda (23-10-2026, misma sesión):** los cinco hallazgos A1–A5
corregidos con tests, y el flujo completo con subcomando `adjudicar`:

```bash
uv run python scripts/conciliador_gold_set.py adjudicar \
  --articulo data/gold_set_conciliacion/gold_set_articulo.json \
  --adjudicaciones <ruta-csv-tercero.csv> \
  --adjudicador <tercero-independiente> \
  --persistir-url "$POLIS_TEST_DATABASE_URL" \
  --muestrario gold-set-2026-10-21
```

Guardias de `adjudicar`: exige `--adjudicador` explícito; el adjudicador NO
puede coincidir con ninguno de los dos jueces (doble anotación ciega); solo
toca pares en `requiere_adjudicacion` (las decisiones automáticas por acuerdo
quedan intactas, sin registrar adjudicador); conserva la semilla del artefacto
y persiste idempotente con `--persistir-url`. CSV de adjudicación: formato
`id_par;etiqueta` (acepta `etiqueta_enviada` también).

Suite del módulo tras la ronda: `tests/test_conciliador_gold_set.py` →
**20 passed** en `polis_test_dea` (incluye la integración 0083 y carga
idempotente en BD); `ruff check` y `ruff format` limpios en los tres archivos
tocados (`gold_set_conciliacion.py`, `conciliador_gold_set.py`,
`test_conciliador_gold_set.py`).
