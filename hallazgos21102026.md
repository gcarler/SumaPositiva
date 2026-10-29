# Hallazgos — Motores de procesamiento de datos de POLIS

**Proyecto:** POLIS — plataforma de planeación y seguimiento de Cartagena
**Fecha del documento:** 2026-10-21
**Referencia Git del código inspeccionado:** `cc221308b31dcae9e130766cb4b787ea7e70340e`
(`test(pshc): clasificador y tendencias del estudio de planes`, 2026-10-19 16:56:26 +0000)
**Alcance:** los motores de procesamiento de datos del backend, con énfasis en los
motores de tríada, ingesta, orquestación por grafo, agentes, y el ecosistema
DEA / estadístico / espacial-predictivo.
**Documentos relacionados:**
[revision_motores_18_10_2026.md](revision_motores_18_10_2026.md) ·
[plan_remediacion_20102026.md](plan_remediacion_20102026.md) ·
[resutados20102026.md](resutados20102026.md)
**Estado:** informe técnico interno de revisión. No es una certificación EAF
independiente ni una autorización de despliegue.

---

## 1. Resumen ejecutivo

POLIS tiene una base de código amplia, consistente en su estructura (28 módulos
FastAPI, 78 migraciones Alembic, 439 archivos Python) y con una bitácora
transaccional bien pensada (`seguimiento.corridas_pipeline`,
`seguimiento.corridas_pipeline_pasos`, hashes SHA-256 canónicos). El problema no
es la ausencia de capacidades: es que **varios de los modos de falla activos
producen salidas que parecen correctas**. Un diagnóstico construido sobre las
salidas actuales puede afirmar, con apariencia de solidez, cosas que el código
no sustenta.

Los 20 hallazgos P0/P1 de este documento se concentran en cuatro familias:

1. **Pérdida silenciosa de identidad temporal.** La ruta de ingesta no propaga
   `vigencia` ni `corte` al motor de tríada. Las vigencias distintas colapsan en
   un único grupo de cruce y la deduplicación por corte nunca se ejecuta. El
   test existente que valida esa deduplicación ejercita el motor con datos
   construidos a mano, no la ruta de producción, por lo que el defecto queda
   tapado. *(HALL-01)*

2. **Mezcla de generaciones de datos.** El archivo de caché del evaluador PDT
   contiene dos corridas y **los lectores del mismo archivo eligen corridas
   distintas**: una respuesta única del agente consultivo mezcla el contenido
   vacío de la corrida nueva con el contenido rico de la corrida vieja. Un
   consumidor ve "cero alertas" mientras otra sección de la misma respuesta
   afirma "250 alertas". Verificado empíricamente sobre el archivo real.
   *(HALL-02)*

3. **Imputación de eficiencia y de datos inexistentes.** Tres defectos
   independientes convierten "no estimable" en "eficiente" (`.get("eficiencia",
   1.0)`), "θ = 0" en "θ = 1" (`or 1.0` sobre un float falsy) y "no produjo
   nada" en "produjo 0.0001". El ranking DEA resultante premia el bajo gasto y
   a las DMU improductivas. *(HALL-09, HALL-10, HALL-11)*

4. **Vínculos acreditados sin respaldo.** Las trampas territoriales se generan
   por coincidencia de subcadena ("salud" casa con "Centro de Salud La
   Victoria") y se etiquetan `VINCULO_ACREDITADO` — condición que, según la
   metodología normativa, **congela el grafo HITL**. En paralelo, los datos
   territoriales de las 15 UCG son inventados con una fórmula cuyos pesos suman
   1.15 y cuyo tercer término correlaciona mecánicamente con el índice de la
   UCG, generando correlación espuria perfecta justo en la variable que el
   Moran bivariado mide. *(HALL-06, HALL-12)*

Adicionalmente, la revisión del 18/10/2026 contiene **tres hallazgos refutados
o corregidos** (CORR-1, CORR-2, CORR-3), uno de los cuales —H1— es
condicionante: la premisa de que un indicador de Salud puede aparecer como
riesgo propio de Infraestructura **no se sostiene en el código actual**. Esta
documentación corrige esa lectura para evitar remediaciones innecesarias.

### Distribución por severidad

| Severidad | Cantidad | Naturaleza |
| --- | ---: | --- |
| **P0 — Crítico** | 6 | Invalida conclusiones o arriesga escritura en producción |
| **P1 — Alto** | 14 | Distorsiona magnitudes, resultados y atribuciones |
| **P2 — Medio** | 34 | Afectan observabilidad, robustez y costo |
| **P3 — Bajo / higiene** | 12 | Mantenimiento, determinismo y consistencia |
| **Total** | **66** | |

---

## 2. Alcance, método y límites

### 2.1 Qué se inspeccionó

- `backend/app/modules/compromisos/` — 41 archivos Python, 41 447 líneas, 3.9 MB.
  Concentra los motores de tríada, ingesta, grafo, agentes, DEA, espacial y
  predictivo.
- `backend/app/modules/ia/` — grafo de ciclo de política, 4 agentes, router.
- `backend/alembic/versions/` — migraciones 0062–0078 (motores, pipeline,
  checkpoints, idempotencia).
- `backend/tests/` — suites de tríada, agentes, DEA, espacial, pipeline y grafo.
- `docs/transacciones.md`, `AGENTS.md`, `knowledge-base/13_*.md` y `15_*.md`
  (normativa metodológica de referencia).

### 2.2 Método

Cada hallazgo de este documento está clasificado según cómo fue verificado:

| Marca | Significado |
| --- | --- |
| **[V]** | **Verificado directamente.** Leí la línea de código citada y/o ejecuté el fragmento de forma aislada para observar el comportamiento. |
| **[L]** | **Lectura directa.** Evidencia textual en el archivo y línea citados. |
| **[S]** | **Reportado por exploración asistida.** Hallazgo con referencia archivo:línea plausible, **no re-verificado de forma independiente**. Debe confirmarse antes de remediar. |

El 100 % de los hallazgos P0 y P1 (los 20) son [V] o [L]. En P2 y P3 hay
**1 solo hallazgo numerado [S]** (HALL-47) y 2 [V]; el resto son [L]. Fuera de
la tabla numerada, §10.2 registra una observación adicional marcada [S] (la
ausencia de un benchmark DEA publicado), que por definición no es un hallazgo
numerable.

### 2.3 Límites explícitos

- **No se ejecutó ninguna suite de pruebas.** Las que requieren
  `POLIS_TEST_DATABASE_URL` no se corrieron.
- **No se hizo ninguna escritura en base de datos.** No se ejecutaron los
  motores contra datos productivos ni se calcularon resultados nuevos.
- **No se verificó la atomicidad de las transacciones** por vía de prueba de
  integración; el cumplimiento del contrato de `docs/transacciones.md` se
  evaluó por lectura de código.
- Los hallazgos [S] no deben usarse como base de una decisión de remediación
  sin confirmación previa.
- El árbol de trabajo presenta **cambios sin commit** en migraciones Alembic
  (incluido `backend/alembic/env.py`, que añade las tablas de checkpoint de
  LangGraph al conjunto de exclusiones de PostGIS). El hash de `main` no
  reproduce por sí solo el código observado.

---

## 3. Mapa de los motores de procesamiento

### 3.1 Inventario por grupo

| Grupo | Archivos principales | Función |
| --- | --- | --- |
| **A. Tríada e ingesta** | `triada_motores.py` (314 L), `ingesta_masiva_excel.py` (828 L), `ingesta_masiva_service.py` (812 L), `inteligencia_triada_service.py` (1 202 L) | Cruce de lectura **estratégica** (PDD) × **física** (PA) × **financiera** (ejecución); parsing binario XLSX/XLS/CSV/ZIP; 6 motores analíticos de solo lectura |
| **B. Orquestación por grafo** | `orquestador_grafo.py`, `ia/grafo/{estado,nodos,orquestador,transiciones}.py`, `corte_datos_polis.py`, `grafo_validacion_fuentes_polis.py` | Supervisor LangGraph de 4 nodos con HITL y `AsyncPostgresSaver`; grafo de ciclo de política de 6 nodos; congelación de corte de datos con manifiesto SHA-256 |
| **C. Agentes** | `motor_multiagente_pdd.py` (50 KB), `agentes_inteligentes_pdd.py` (53 KB) | M1: 5 agentes deterministas + 6 puertas de calidad, 11 PDF/2 783 páginas esperadas. M2: 6 agentes PydanticAI + 6 tools SQL |
| **D. DEA / estadístico / espacial** | `pdt_ai_evaluator_graph.py` (107 KB), `pdd_dea_service.py` (131 KB), `pdt_dea_4niveles_cartagena.py` (98 KB), `pdt_nodos_espacial_predictivo.py` (66 KB), `dea_econometria_service.py` (62 KB), `pdt_dictamen_ejecutivo.py`, `pdt_hoshin_kanri.py` | Grafo evaluador de 6 nodos; DEA CCR/BCC/SBM, Malmquist, NLP (TF-IDF/SVD/HDBSCAN), Moran/LISA, ARIMA/VAR, Chow, ISRI; dictamen ejecutivo; matriz X de Hoshin Kanri |
| **E. Normalización y vinculación** | `pdt_normalizador_canonico_metas.py`, `pdt_conciliador_vinculos_pa_triada.py` | OCR y normalización canónica de 4 637 metas; emparejador PDD↔PA↔Tríada con 5 señales y taxonomía de fuerza de vínculo |

### 3.2 Modelo de datos de la tríada

Clave de cruce (`triada_motores.py:204-210`):

```python
_clave(fila) = (
    str(fila.entidad).strip().casefold(),
    str(fila.linea_estrategica).strip().casefold(),
    str(fila.codigo_bpim).strip().casefold(),
    str(getattr(fila, "vigencia", None) or "").strip().casefold(),
)
```

Observaciones estructurales:

- **`codigo_meta_pdd` no forma parte de la clave.** Dos metas distintas con el
  mismo BPIM y la misma línea colisionan y se fusionan silenciosamente.
- **`corte` no forma parte de la clave.** Es un mecanismo de *selección*
  posterior (`triada_motores.py:243-245`), no de identidad.
- `_clave_valida` (`:213-219`) valida **solo las 3 primeras** componentes y usa
  un conjunto cerrado y literal de 8 marcadores inválidos
  (`{"-", "----", "n/a", "na", "nd", "ninguno", "0", "sin codigo"}`). No cubre
  `"n.d."`, `"no aplica"`, `"s/d"`, `"sin dato"`, `"null"`.
- El ranking de corte `_corte_rank` (`:222-225`) reconoce `T1`–`T4` y
  `TRIMESTRE n`, pero **no** reconoce `1T`. Todo lo no recognized devuelve 0.

### 3.3 Nodos del grafo evaluador PDT

`pdt_ai_evaluator_graph.py:2183-2208` — grafo **cíclico** de 6 nodos:

```
START → nodo_supervisor ──cond──▶ nodo_nlp → nodo_dea → nodo_espacial → nodo_predictivo → nodo_supervisor
                             └──▶ nodo_human_in_loop → END
```

El control de terminación depende de `state["next_node"]` y `cycle_count`
(`:181`, `:955`). No hay `recursion_limit` explícito en el `ainvoke`
(`:2339-2342`): el corte depende exclusivamente del contador interno.

### 3.4 Nodos del grafo supervisor

`orquestador_grafo.py:723-744` — grafo **acíclico con reentrada** de 4 nodos:

```
START → nodo_supervisor ──cond(ruta_supervisor)──▶ nodo_corredor | nodo_revision_humana | END
nodo_corredor → nodo_puerta ──cond(requiere_revision_humana)──▶ nodo_revision_humana | nodo_supervisor
nodo_revision_humana → nodo_supervisor
```

Etapas: `("fuentes", "conciliacion", "dea")` (`:59`). Severidad que congela:
`"alta"` (`:60`).

### 3.5 Grafo de ciclo de política (`ia/grafo`)

6 nodos: `diagnostico → viabilidad_juridica → viabilidad_fiscal →
deliberacion_consulta → devolucion_motivada → consolidacion_adopcion → END`
(`ia/grafo/orquestador.py:49-54`, `:91-93`). Auto-loops acotados en los tres
primeros con `max_iteraciones` por defecto 3 (`ia/schemas.py:502`, rango 1–5).
**Compilado sin checkpointer** (`ia/grafo/orquestador.py:42`) y **sin ninguna
sesión de base de datos** en todo el módulo `ia`.

### 3.6 Mecanismos de deduplicación de la ingesta

| Nivel | Condición | Resultado | Ubicación |
| --- | --- | --- | --- |
| 1 · Binario | `hash_sha256` igual | Se fusionan etiquetas; se registra `deduplicado=True` | `ingesta_masiva_service.py:243-248` |
| 2 · Tabular, mismo corte | huella igual + vigencia igual + corte igual | `CLON_TABULAR_MISMO_CORTE`, se fusiona el clon | `:264-266`, `:303-345` |
| 3 · Tabular, otro corte | huella igual + vigencia igual + corte distinto | `CONTENIDO_IDENTICO_OTRO_CORTE`, **se excluye de toda la analítica** | `:267`, `:344-353` |

El nivel 3 se materializa como `not_in` sobre `metadatos["alerta_calidad"]` en
`comparativa` (`:594-600`), `resumen_dimensiones` (`:714-719`, `:733-737`),
`service.py:434-439` e `inteligencia_triada_service.py:43,366`.

**Consecuencia de orden (HALL-24):** si el archivo T2 clonado se sube antes que
el canónico T1, es el T2 el que queda marcado como clonado y el T1 permanece.
El resultado analítico depende del **orden de llegada**, no del contenido.

### 3.7 Contrato transaccional — estado de cumplimiento

El contrato de `docs/transacciones.md` exige: el servicio delimita con
`async with transaction(session)`; los repositorios usan `flush`/`refresh` y
**nunca** `commit`/`rollback`; una sesión por petición; sin anidamiento.

| Componente | Cumplimiento | Evidencia |
| --- | --- | --- |
| `pdt_persistencia_pg.py` | Conforme | Usa el helper `transaction()` (`:267`, `:720`, `:729`, `:767`); sin `commit`/`rollback` propios |
| `orquestador_grafo.py` | **Desviación de forma** | `engine.begin()` crudos (`:344`, `:392`); justificable por la autonomía de la bitácora, pero no usa el helper |
| `scripts/pipeline_datos_polis.py` | **Desviación de forma** | `engine.begin()` directos (`:84`, `:114`, `:143`, `:372`) |
| `pdt_ai_evaluator_graph.py` | Conforme en el límite, **defectuoso en semántica** | Delega en `pdt_persistencia_pg` (`:2365`), pero traga la excepción (ver HALL-21) |
| `ia/*` | N/A | Sin persistencia |

**Hueco de la guarda automática (HALL-26):** `test_transaction_policy.py:10`
escanea **únicamente** archivos llamados `repository.py`. Quedan fuera del
perímetro automático precisamente los dos módulos de mayor riesgo
transaccional: `pdt_persistencia_pg.py` y `orquestador_grafo.py`.

---

## 4. Hallazgos P0 — Críticos

### HALL-01 · La ingesta descarta `vigencia` y `corte`, colapsando vigencias y desactivando la deduplicación por corte

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_service.py:455-459`
**También:** `backend/app/modules/compromisos/service.py:457-493`
**Verificación:** [V] lectura directa

**Evidencia.** El diccionario `base` que se expande hacia los tres modelos de
tríada no contiene `vigencia` ni `corte`:

```python
base = {
    "entidad": row.get("entidad_normalizada") or "",
    "linea_estrategica": str(row.get("linea_estrategica") or ""),
    "codigo_bpim": str(row.get("codigo_bpim") or ""),
}
```

Como los tres modelos (`schemas.py:361-397`) declaran `vigencia: int | None =
None` y `corte: str | None = None`, ambos quedan en `None` en todas las filas.

**Cadena de consecuencias.**

1. `_clave` (`triada_motores.py:204-210`) construye su cuarta componente con
   `getattr(fila, "vigencia", None) or ""` → `""` para todas las filas.
2. La clave efectiva degenera a `(entidad, línea, bpim, "")` → **la ingesta
   multi-vigencia colapsa años distintos en un único grupo**.
3. El bloque de deduplicación por corte (`triada_motores.py:243-245`) se
   condiciona a `any(getattr(row, "corte", None) for row in keyed_rows)` → todos
   `None` → **la rama nunca se ejecuta**.
4. `triada_motores.py:299` → `"".isdigit()` es `False` → `vigencia: None` en
   **todas** las salidas del cruce de ingesta.

El mismo defecto existe en `service.py:457-493`, donde se construyen
`MetaEstrategicaTriada`, `ActividadOperativaTriada` y
`EjecucionPresupuestalTriada` desde `RegistroTriadaNormalizado` sin pasar
`vigencia` ni `corte`, pese a que el modelo de BD (`models.py:311+`) sí los
tiene.

**Por qué no lo detectó la suite.** `tests/test_triada_motores.py:162`
(`test_cruce_triadas_deduplica_cortes_y_separa_vigencias`) valida el motor
**con archivos puros**, donde sí se pasan `vigencia` y `corte`. Ningún test
ejercita `_cruzar_filas`. Es el hueco de cobertura más grave del subsistema.

**Criterio de aceptación.** Ingerir filas de dos vigencias con el mismo
`(entidad, línea, bpim)` debe producir `len(cruces) == 2` con `vigencia`
distinta en cada cruce; dos cortes de la misma vigencia deben colapsar al más
reciente sin duplicar avances.

**Corrección.** Propagar `vigencia` y `corte` desde la fila de origen a `base`,
y añadir el test de regresión descrito.

---

### HALL-02 · Contaminación de caché del evaluador PDT: una respuesta mezcla dos generaciones de datos

**Ubicación:**
- `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:103-114` (`_read_pdt_cache`)
- `backend/app/modules/compromisos/pdt_hoshin_kanri.py:65-85` (`_cargar_diagnostico_cache`)
- `backend/app/modules/compromisos/pdt_revision_por_meta.py:816-827` (`_cargar_cache_evaluador`)
- `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:2333-2339` (selección canónica)

**Archivo afectado:** `data/planes_desarrollo/cache_pdt_ai_evaluator.json` (1.19 MB)
**Verificación:** [V] lectura del archivo real + comparación de los tresCriteria de selección

**Evidencia empírica.** El archivo contiene **2 runs**:

| Clave | `generado_en` | `version_metodologica` | `fingerprint` | `dea_scores` | `unidades_dmu` | `alertas_mission_creep` | `series` |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `0d597ff639c3a6d4…` | 2026-10-18T15:47:48Z | `None` | `None` | 13 | 34 | **250** | **120** |
| `29602b654f4801e8…` | 2026-10-21T19:01:31Z | `25A-2026.10.18.1` | `7f5c58b8…` | 13 | **0** | **0** | **0** |

Los **tres lectores del mismo archivo eligen runs distintos**:

| Lector | Criterio | Run que obtiene | Resultado |
| --- | --- | --- | --- |
| `_read_pdt_cache` | `max(generado_en)` | 2026-10-21 (nuevo) | **vacío**: 0 alertas, 0 series, 0 unidades_dmu |
| `_cargar_diagnostico_cache` | `runs[0]` | 2026-10-18 (viejo) | **rico**: 250 alertas, 120 series |
| `_cargar_cache_evaluador` | `runs[0]` | 2026-10-18 (viejo) | **rico**: 250 alertas, 120 series |

**Efecto observable.** `tool_consultar_evaluador_pdt_gbr`
(`agentes_inteligentes_pdd.py:799`) construye una respuesta única con
`evaluacion_pdt_gbr` (líneas `:161-236`, sourced del run **vacío**),
`hoshin_kanri_fair` (`:215`, sourced del run **rico**) y `revision_10d_resumen`
(`:216`, sourced del run **rico**).

Un consumidor que lea `dmu_dea == []` y `alertas_mission_creep == []` concluirá
"no hay hallazgos", mientras otra sección de la misma respuesta sostiene que hay
250 alertas y 34 DMUs. **Conclusión falsa por construcción.**

**Defecto raíz adicional.** `_read_pdt_cache` **no valida**
`version_metodologica` ni `fingerprint_fuentes_sha256`, a diferencia de la
selección canónica del propio evaluador:

```python
if (cached
    and cached.get("version_metodologica") == VERSION_METODOLOGICA_PDT
    and cached.get("fingerprint_fuentes_sha256") == state["fingerprint_sources_sha256"]):
```
(`pdt_ai_evaluator_graph.py:2333-2339`)

**Efecto secundario.** El caso `"estado": "PENDIENTE"`
(`agentes_inteligentes_pdd.py:146-157`) es **inalcanzable** mientras exista
cualquier run en el archivo: con el run vacío, `diagnostic` no es `None`, así
que la respuesta aparenta estar `DISPONIBLE` con contenido vacío.

**Criterio de aceptación.** Un único lector (`_cargar_run_pdt`) valida
`version_metodologica` **y** `fingerprint_fuentes_sha256`; los tres módulos lo
usan; ninguna respuesta mezcla runs.

**Corrección.** Unificar la selección en una función única; eliminar `runs[0]`
y `max(generado_en)` como criterios; añadir test de regresión con 2 runs en el
archivo.

---

### HALL-03 · La suite de pruebas puede escribir en la base de datos de producción

**Ubicación:**
- `backend/app/modules/compromisos/pdt_normalizador_canonico_metas.py:312-317`
- `backend/tests/test_pdt_persistencia_pg.py:32-45`
- `backend/tests/test_pdt_nodos_espacial_predictivo.py:512-518` [S]

**Verificación:** [V] lectura directa

**Evidencia.** El normalizador canónico **reescribe explícitamente** la base de
pruebas hacia la de producción:

```python
def _resolver_url_bd_csh() -> str:
    raw_url = Settings().async_database_url
    parsed = make_url(raw_url)
    if (parsed.database or "").startswith("polis_test"):
        return parsed.set(database="bd_csh").render_as_string(hide_password=False)
    return raw_url
```

El reconciliador de vínculos, en otro archivo del mismo módulo, hace lo
correcto:

```python
def _resolver_url_bd_csh() -> str:
    return os.environ.get("POLIS_TEST_DATABASE_URL") or Settings().async_database_url
```
(`pdt_conciliador_vinculos_pa_triada.py:111-112`)

**Dos resolvers de URL con semántica opuesta en el mismo módulo.** El test
suite apunta a `polis_test` (`tests/conftest.py:13-46`), por lo que este
resolver envía las escrituras a `bd_csh` (producción).

Además, `tests/test_pdt_persistencia_pg.py:32` define `_bd_csh_url()` que cae a
`bd_csh` si `POLIS_TEST_DATABASE_URL` no está definida — contraviendo
`docs/transacciones.md:76-78` ("Nunca recurrir a `bd_csh` o a la base de trabajo
para las pruebas").

**Criterio de aceptación.** Con `POLIS_TEST_DATABASE_URL` apuntando a
`polis_test*`, ninguna ruta de código ni de test escribe en `bd_csh`. Un test de
una línea que afirme la resolución del URL detecta esta condición.

**Corrección.** Unificar los resolvers; eliminar el fallback a `bd_csh` en
`tests/`.

---

### HALL-04 · El filtro de plan de los agentes consultivos es inoperante: PDD y PDL son indistinguibles

**Ubicación:** `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:129-141`
**Verificación:** [V] ejecución aislada de la función con el formato real de DMU

**Evidencia.** El formato real de los DMUs es `"<Dependencia>|<año>"` (por
ejemplo `"Secretaría de Salud|2024"`) y **no contiene el código de plan** — lo
confirma el propio test del proyecto
(`tests/test_agentes_inteligentes_pdd.py:258`:
`assert evaluation["dmu_dea"][0]["dmu"] == "Secretaría de Salud|2024"`).

La función de filtrado solo puede satisfacerse por rango de años:

```python
plan_matches = plan in haystack          # nunca se activa para DMUs
row_year = re.search(r"20\d{2}", haystack)
plan_matches = plan_matches or bool(
    years and row_year and int(years[0]) <= int(row_year.group()) <= int(years[-1])
)
```

Ejecución medida:

```
plan=PDD_2024_2027  -> 1 DMU: ['Secretaría de Salud|2024']
plan=PDL_2024_2027  -> 1 DMU: ['Secretaría de Salud|2024']   <-- idéntico
plan=PDD_2020_2023  -> 0 DMU: []
plan=Secretaría de Salud (sin año) -> 1 DMU  (filtro absoluto contradictorio)
```

**Consecuencias.**

1. `PDD_2024_2027` y `PDL_2024_2027` producen **exactamente el mismo conjunto**:
   el plan de localidad no está aislado del plan distrital.
2. Un `codigo_plan` sin año es un filtro absoluto que anula todo salvo
   `"TODOS"`.
3. `terms_match` es un **OR** entre términos (`any`, `:140`): basta un token.

**Dos rutas que bypasean el filtro del usuario (HALL-05, misma familia):**
- `coldspots_lisa` pasa `"TODOS"` **hardcodeado** (`:242`) → los coldspots se
  devuelven siempre, sin filtrar por el plan solicitado.
- `dictamenes_dependencias` (`:206-213`) salta por completo `_matches_pdt_filter`
  cuando hay dependencias relevantes → se filtra por DMU-dependencia, no por
  plan.

**Contraprueba existente.** `tests/test_agentes_inteligentes_pdd.py:386-390`
verifica el filtro con un valor que **sí contiene el código de plan literal**
(`"PDD_2024_2027 Secretaría de Salud"`), formato que nunca ocurre en
producción. La rama del rango de años **nunca se prueba con datos reales**.

**Criterio de aceptación.** `PDD_2024_2027` y `PDL_2024_2027` producen conjuntos
disjuntos; el filtro excluye explícitamente las entidades irrelevantes del
plan; los tests cubren inclusiones **y** exclusiones con el formato real
`"Dependencia|año"`.

---

### HALL-05 · El bootstrap "Simar–Wilson" del evaluador no re-estima la frontera DEA

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:1285-1337`
**Verificación:** [L] lectura directa

**Evidencia.**

```python
residuals = values - values.mean()                                   # :1293
bandwidth = 1.06 * float(values.std(ddof=1)) * len(values) ** (-0.2)  # :1294
rng = np.random.default_rng(20261018)                                # :1295
noise = rng.choice(residuals, size=(replicates, len(values)), replace=True)  # :1296
if bandwidth > 0:
    noise = noise + rng.normal(0.0, bandwidth, size=noise.shape)      # :1297-1298
sample = values[None, :] + noise                                     # :1300
sample = np.where(sample > 1.0, 2.0 - sample, sample)                # :1302 reflexión θ=1
sample = np.where(sample <= 0.0, -sample, sample)                    # :1303 reflexión θ=0
```

Simar & Wilson (1998) exige **re-optimizar el DEA** sobre cada conjunto
bootstrap para obtener `θ̂*` y luego aplicar `E[θ̂]/E[θ̂*]`. Aquí el conjunto
bootstrap **nunca se re-resuelve**: `sample` es `θ_observado + residuo + ruido`.

**Consecuencias.**

1. Los `ic_95_pct` (`:1316`) son intervalos de la distribución de θ perturbado,
   **no** intervalos de confianza del estimador DEA.
2. Como `residuals` tienen media cero por construcción (`:1293`),
   `mean_boot ≈ observed` → **`sesgo_estimado ≈ 0`** y
   `theta_corregida_sesgo = clip(2*observed - mean_boot, 0, 1)` (`:1314`) es un
   **no-op sobre el punto**. En el bootstrap correcto el sesgo es
   sistemáticamente positivo (el DEA sobreestima eficiencia).
3. El propio código lo admite: `"metodo": "bootstrap suavizado con reflexión de
   Silverman en theta=1; estimación aproximada"` (`:1333`).

**Contraste con los otros dos bootstraps del propio repositorio, que sí son
correctos:**

| Bootstrap | Ubicación | Réplicas | Re-resuelve el LP |
| --- | --- | ---: | --- |
| `_simar_wilson_bootstrap` (evaluador) | `pdt_ai_evaluator_graph.py:1296` | 1 000 | **No** |
| `_frontier_sync` | `dea_econometria_service.py:1017-1053` | 400 (mín. 360 válidas) | **Sí** — declara `"estado": "EXPLORATORIO"` |
| `_bootstrap_bcc` | `pdd_dea_service.py:2855-2871` | 200 | **Sí** |

**Defecto adicional (HALL-06, misma familia):** los tres bootstraps usan semillas
distintas (`20261018`, `20261015`, `202409`) y no son consistentes entre sí. Un
mismo DMU evaluada por el evaluador y por `dea_econometria_service` produce
intervalos **no comparables**.

**Criterio de aceptación.** El procedimiento de incertidumbre reproduce un
ejemplo publicado de Simar–Wilson y documenta sus supuestos; o bien se
declara explícitamente como exploratorio en el payload, como ya hace
`_frontier_sync`.

---

### HALL-06 · `matched_coldspot` vincula por coincidencia de subcadena y etiqueta el vínculo como acreditado

**Ubicación:** `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py:888-903`
**Verificación:** [V] lectura directa

**Evidencia.**

```python
for unit in sorted(set(inefficient_units)):
    matched_coldspot = next(
        (cs for cs in coldspots if cs.casefold() in unit.casefold() or unit.casefold() in cs.casefold()),
        None,
    )
    if matched_coldspot is not None:
        traps.append(unit)
        trap_details.append({
            ...
            "estado_vinculo": "VINCULO_ACREDITADO",
            ...
            "diagnostico": (
                f"DMU ineficiente ({unit}) opera sobre territorio en rezago espacial ({matched_coldspot})."
            ),
        })
```

**Coincidencia de subcadena pura, bidireccional, sin tokenización**, sin
normalización de acentos y sin palabras vacías. Falsos positivos derivados:

- `"Secretaría de Salud"` ↔ `"Centro de Salud La Victoria"` → match por "salud".
- `"Localidad 1"` ↔ cualquier coldspot que contenga "localidad 1".
- `"Secretaría de Infraestructura"` ↔ `"Infraestructura vial zona norte"`.

**El módulo ya dispone de las utilidades correctas y no las usa:**
`_normalize_text` (`:202-207`, NFKD + eliminación de diacríticos) y `_tokenize`
(`:223-225`).

**Impacto funcional.** El `estado_vinculo = "VINCULO_ACREDITADO"` alimenta
`trampas_territoriales_gestion_publica`, que es la condición que la metodología
normativa (`knowledge-base/13_SISTEMA_AGENTICO_PDT_GBR_DEA_NLP_LISA_ISRI.md:232`)
define para **congelar el estado del grafo** (Checkpointer HITL). Una
coincidencia por subcadena puede **detener el proceso de evaluación** por un
motivo no fundamentado.

**Regla adyacente con el mismo patrón (ver HALL-54):** `:929-937` produce
hipótesis cuando el nombre de la unidad contiene cualquiera de
`("educacion", "salud", "infraestructura", "social", "localidad")`, con **todos**
los coldspots como candidatos (`:935`). Cualquier dependencia cuyo nombre
contenga una de esas cinco palabras genera hipótesis espacial en el 100 % de los
escenarios con coldspots.

**Cobertura de tests.** `test_pdt_nodos_espacial_predictivo.py:139-142` y `:193`
comprueban que las trampas reportadas **tengan** `estado_vinculo ==
"VINCULO_ACREDITADO"` — el test **consagra el comportamiento permisivo**. No
existe ningún test que verifique la ausencia de falsos positivos.

**Criterio de aceptación.** "Secretaría de Salud" **no** vincula con "Centro de
Salud La Victoria"; cada trampa territorial puede abrir el proyecto o actividad
que prueba el vínculo; sin ese soporte se publica como hipótesis pendiente.

---

## 5. Hallazgos P1 — Altos

### HALL-07 · `None` colapsado a `0.0` vuelve inalcanzable el estado `DATOS_INCOMPLETOS`

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_service.py:802-809`, `:56-68`
**Verificación:** [V]

```python
"avance_estrategico_pct": float(row.avance_estrategico_pct or 0),
"apropiacion_definitiva_cop": float(row.apropiacion_definitiva_cop or 0),
```

Un registro sin apropiación (`None`) se reporta como `0.0`, indistinguible de
una apropiación genuinamente nula. En `triada_motores.py:261-263`,
`appropriation == 0` produce `financial_pct = None`; y `:296` exige
`financial_pct is not None` para el estado `DATOS_INCOMPLETOS` → **ese estado
solo es alcanzable si falta una lectura completa, nunca por datos nulos**. Los
gaps se comparan contra `0` en lugar de contra `None`.

### HALL-08 · El operador `or` oculta ceros legítimos e invierte el sentido económico del dato

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_service.py:135`, `:466-467`, `:487-488`
**Verificación:** [V]

```python
apropiacion_definitiva_cop=_numero_no_negativo(
    row.get("apropiacion_definitiva_cop") or row.get("apropiacion_inicial_cop")
),
```

`0.0 or X` → `X`. **Una apropiación definitiva de 0 se reemplaza
silenciosamente por la inicial.** Idéntico patrón en
`row.get("avance_estrategico_pct") or row.get("avance_fisico_pct")`
(`:466-467`): un avance estratégico de 0 se sustituye por el físico.

### HALL-09 · Eficiencia 1.0 imputada cuando el solver DEA falla

**Ubicación:** `backend/app/modules/compromisos/pdd_dea_service.py:662-670`
**Verificación:** [V]

```python
theta1 = [
    float(np.clip(_lp(x, z, x[i], z[i], vrs=True).get("eficiencia", 1.0), 1e-9, 1)) for i in range(len(eligible))
]
```

Si `_lp` retorna `{"estado": "NO_ESTIMABLE"}` (sin clave `eficiencia`), el
`.get(..., 1.0)` **imputa eficiencia 1.0** — frontera eficiente — a una DMU cuyo
LP fue inviable. Ocurre en las cinco series (`theta1`, `theta2`, `ccr`, `sbm`,
`window`). Una DMU con presupuesto 0 o producto 0 queda declarada "eficiente".

### HALL-10 · `or 1.0` convierte θ = 0 en eficiencia perfecta

**Ubicación:** `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py:387`, `:391`
**Verificación:** [V]

```python
theta_star = float(np.clip(pulp.value(theta_var) or 1.0, 1e-9, 1.0))
phi_star = 1.0 / theta_star
```

`pulp.value(theta_var)` devuelve `0.0` cuando θ = 0 (DMU con insumo positivo y
producto nulo ⇒ eficiente 0). El `or 1.0` convierte el `0.0` **falsy** en
`1.0`. **θ = 0 se reporta como eficiencia perfecta.**

### HALL-11 · El producto nulo se eleva a `0.0001`, sesgando el ranking hacia las DMU improductivas

**Ubicación:** `backend/app/modules/compromisos/pdd_dea_service.py:1975`, `:2850`, `:2904`, `:2908`, `:2960-2961`
**Verificación:** [V]

```python
Y.append([max(achieved, 0.0001), max(float(y2), 0.0001)])
```

Una DMU que **no produjo nada** (avance 0, ninguna meta cumplida) recibe
producto `0.0001`. Con insumos en millones (`:1974`), su eficiencia θ se
acerca a 1 → **sesgo sistemático a favor de las DMU improductivas**.

### HALL-12 · Los datos territoriales de las 15 UCG son inventados y generan correlación espuria

**Ubicación:** `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py:241-321`
**Verificación:** [V]

**Valores derivados (todos heurísticos):**

| Magnitud | Fórmula | Línea | Problema |
| --- | --- | ---: | --- |
| Peso de estrato | P1=52.0, P2=38.0, P3=24.0, P4=14.0, P5=7.5, P6=4.2, default 26.0 | `:229-238` | Escala arbitraria sin fuente |
| Ancla de localidad | loc-1=21.8, loc-2=44.6, loc-3=33.4 | `:260-264` | Hardcodeado |
| Valor derivado | `round(0.55*estrato_mean + 0.45*loc_anchor + 0.15*int(ucg_key), 4)` | **`:302`** | Ver abajo |
| Población | `len(items) * 4850` | `:310` | Población inventada |
| Inversión per cápita | `round(1850000.0 / max(derived_value, 5.0), 2)` | `:314` | Inversión inventada |
| Año de corte | `2025` | `:315` | Hardcodeado |

**Defecto en la fórmula (`:302`).** Los pesos suman **1.15** (`0.55 + 0.45 +
0.15`), no 1.0. Más grave: el tercer término `0.15 * int(ucg_key)` **no es un
factor de vulnerabilidad sino un artefacto del índice de la UCG** (1..15): la
UCG 15 recibe +2.25 y la UCG 1 +0.15 respecto de un valor "neutro". El valor
derivado **correlaciona mecánicamente con el número de UCG**, que no tiene
relación con la pobreza del territorio.

**Correlación espuria por construcción.** Como el mismo `derived_value` alimenta
el indicador **y** la inversión per cápita (`:314` es una función decreciente del
propio indicador), se genera una **correlación espuria perfecta** entre "IPM
UCG" e "inversión per cápita" — precisamente la relación que el módulo mide con
Moran **bivariado** (`_bivariate_moran_xy`, `:545-562`). El estadístico espacial
queda contaminado por su propio generador de datos.

**Efecto adicional.** `max(derived_value, 5.0)` (`:314`) clava la inversión en
**370 000 COP** para toda UCG con indicador ≤ 5 → varianza nula → el Moran
bivariado contra ese campo es degenerado.

**Procedencia declarada vs. real.** `:317-318` declara
`"fuente_datos": "knowledge-base/barrios_cartagena.json + geodatos.territorios"`
(invocando PostGIS como fuente) mientras
`"naturaleza_dato": "DERIVADO_HEURISTICO"`. Ninguno de los valores numéricos
proviene de PostGIS.

**Disparador heurístico por texto.** `_should_enrich_cartagena` (`:324-341`)
entra al enriquecimiento si el texto normalizado contiene `"cartagena"`,
`"localidad"` o `"13001"`, no por `jurisdiction`.

**Cobertura de tests.** `test_pdt_nodos_espacial_predictivo.py:190-193` verifica
únicamente que exista al menos una fila con `naturaleza_dato ==
"DERIVADO_HEURISTICO"` — **ninguna aserción sobre los valores numéricos**. La
fórmula de `:302` puede cambiar sin romper ningún test.

### HALL-13 · `meta_programada_anual` (SUM físico) se usa como meta porcentual en el cálculo del ISRI

**Ubicación:**
- `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:582`, `:1897-1904`
- `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py:1254-1260`
**Verificación:** [L]

```sql
SUM(COALESCE(meta_programada_anual, 0)) AS meta_programada_anual   -- :582
```

```python
target_pct = record.get("meta_cuatrienio_pct")
annual_target = record.get("meta_programada_anual")
if target_pct is None and annual_target is not None and 0 < float(annual_target) <= 100:
    target_pct = annual_target
```

`meta_programada_anual` es la **suma de metas físicas** del grupo
(entidad, año, meta). El guard `0 < valor <= 100` filtra la mayoría de los
casos, pero cuando la suma cae en ese rango se usa como **meta porcentual**
contra una serie de **avances porcentuales** (`:1892-1894`).

### HALL-14 · Equivalencia de solvers DEA declarada válida cuando **ambos** fallan

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:1450-1463`
**Verificación:** [L]

```python
"ccr_equivalente": ccr is None and pulp_ccr is None
 or ccr is not None and pulp_ccr is not None and math.isclose(...)
```

Si ambos solvers fallan (`None`), se declara **equivalente**. Un bug común a
ambos pasa inadvertido. La comprobación se vuelve además **tautológica** cuando
PuLP cae al fallback SciPy/HiGHS (`:1232-1244`): en ese caso la "equivalencia"
compara SciPy contra SciPy.

### HALL-15 · El escalado del insumo DEA mide dispersión presupuestal, no eficiencia técnica

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:1424-1426`
**Verificación:** [V]

```python
raw_inputs = [max(0.0, float(item.get("insumo_cop") or 0)) for item in dmus]
input_scale = max(float(np.mean(raw_inputs)) if raw_inputs else 0.0, 1.0)
inputs = [val / input_scale for val in raw_inputs]
```

El escalado es **división por la media global de insumos**: no homogeneiza por
DMU, no normaliza per cápita, no aplica z-score. Como el producto está acotado
a [0, 100] (`:1437`) y el insumo no, el DEA mide esencialmente *"cuánto insumo
relativo al promedio produce el producto máximo posible"*. **El ranking queda
dominado por la dispersión presupuestal.**

### HALL-16 · La dependable ruta PPI declara como "producto" el conteo de metas del plan

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:860-874`
**Verificación:** [V]

```python
dmu_id = f"PPI_OFICIAL:{code}"
...
"producto_programado": float(len(plan_goals)),
"producto_ejecutado": float(len(plan_goals)),
"grupo_comparabilidad_dea": "CAPACIDAD_PROGRAMADA_PPI",
"nota_producto": "conteo_lineas_programaticas_con_PPI; proxy de estructura, no producto ejecutado",
```

La "productividad" implícita es *metas / PPI*, que no es interpretable como
eficiencia. La propia nota lo reconoce. El bloque **sí** está protegido por test
(`test_pdt_dictamen_ejecutivo.py:60-64`), pero nadie comprueba que produzca θ
sensatos.

### HALL-17 · Mezcla de magnitudes en el acumulador de producto del evaluador

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:839-842`
**Verificación:** [V]

```python
executed = row.get("meta_ejecutada_anual")
if executed is None:
    executed = row.get("avance_fisico_pct")
dmu["producto_ejecutado"] += float(executed or 0)
```

El control `is None` es correcto (un 0 legítimo se preserva), pero
`dmu["producto_ejecutado"]` **acumula en el mismo total** una cantidad física
(`meta_ejecutada_anual`, un `SUM` en COP o unidades) y un porcentaje
(`avance_fisico_pct`) según la fila. Sumar kilómetros, personas y porcentajes en
el mismo producto es exactamente lo que la revisión del 18/10 señalaba — pero
**en otra línea**: la observación es válida, la ubicación citada en la revisión
(`or` encadenado) no lo es.

### HALL-18 · El filtro de nivel del DEA de 4 niveles no reduce el cómputo

**Ubicación:** `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py:2036-2054`
**Verificación:** [L]

```python
datos_bd = _ejecutar_corutina_sync(_consultar_insumos_bd_csh())   # :2036 (sin caché)
n1 = _construir_nivel_1_territorial(...)                          # :2038
n2 = _construir_nivel_2_institucional(...)                        # :2039
n3 = _construir_nivel_3_operativo(...)                            # :2040
n4 = _construir_nivel_4_temporal_inter_cuatrienial(...)            # :2041
...
if nivel_canonico and nivel_canonico in catalogo_niveles:
    niveles_activos = {nivel_canonico: catalogo_niveles[nivel_canonico]}  # :2052
```

Los **4 niveles se construyen siempre**, con sus LP de dos etapas PuLP→HiGHS.
El filtro solo actúa sobre el diccionario de salida. Un usuario que pide
`nivel="nivel_3_operativo_ieo_ese"` paga el coste completo de los niveles 1, 2
y 4. Además `_consultar_insumos_bd_csh()` se ejecuta en cada invocación sin
caché de datos.

### HALL-19 · La caché del Nivel 3 se invalida por cardinal, no por contenido

**Ubicación:** `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py:1557-1558`, `:1612`, `:1663`
**Verificación:** [L]

`_CACHE_NIVEL3_IEO` / `_CACHE_NIVEL3_ESE` usan la clave
`(orientacion, len(dmus))`. Si cambian los datos de la BD pero no el número de
DMUs, se devuelve un resultado obsoleto **silenciosamente**.

### HALL-20 · El bootstrap de frontera y el de BCC usan semillas distintas: sus intervalos no son comparables

**Ubicación:**
`dea_econometria_service.py:1019` (seed `20261015`),
`pdd_dea_service.py:2860` (seed `202409`),
`pdt_ai_evaluator_graph.py:1295` (seed `20261018`)
**Verificación:** [L]

Tres procedimientos de incertidumbre con tres semillas y tres unidades de
comparación. Un mismo DMU evaluada por el evaluador y por
`dea_econometria_service` produce intervalos que no son comparables, lo que
impide cualquier contraste entre motores.

---

## 6. Hallazgos P2 — Medios

### HALL-21 · La persistencia PG del evaluador falla en silencio: HTTP 200 sin registro persistido

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:2381-2385`, `:2488-2492`
**Verificación:** [L]

```python
except Exception:
    logger.warning(...)
```

El `transaction()` interno ya hizo rollback y propagó; el `except` lo absorbe.
**El endpoint responde 200 con el resultado del análisis pero sin
`persistencia_pg` ni `sha256_checkpoint`.** El cliente no puede distinguir
"persistido" de "no persistido" salvo por la ausencia de la clave.

### HALL-22 · La caché en disco de inteligencia tríada nunca se invalida

**Ubicación:** `backend/app/modules/compromisos/inteligencia_triada_service.py:243-316`
**Verificación:** [L]

El payload se escribe con `stored_at` (`:296`) pero **`stored_at` nunca se lee
para decidir vigencia**. La clave persistente solo incluye el hash de
`_cache_key` + el nombre del método (`:245-250`), sin versión del corpus. Solo
se usa cuando `_uses_default_arguments(...)` es `True` (`:243`), lo que agrava
el problema: un resultado cacheado con parámetros por defecto se sirve aunque
los datos hayan cambiado. La escritura es atómica (`os.replace`, `:308`) — lo
que garantiza que un resultado obsoleto sobreviva a reinicios.

### HALL-23 · El estado del multiagente PDD se escribe de forma no atómica y se lee sin manejo de error

**Ubicación:** `backend/app/modules/compromisos/motor_multiagente_pdd.py:872-877`, `:882`
**Verificación:** [L]

`_save_state` usa `mkdir` + `write_text` sin atomicidad. Una interrupción a
mitad de escritura deja JSON truncado; `obtener_estado_sistema_multiagente_pdd`
hace `json.loads(...)` **sin `try/except`** → `JSONDecodeError` no manejado →
**500 en `GET /triada/pdd-dea/estado-sistema-multiagente`**
(`compromisos/router.py:269-283`).

### HALL-24 · El marcado de contenido clonado depende del orden de llegada de los archivos

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_service.py:267`, `:344-353`
**Verificación:** [L]

Si el archivo T2 (contenido idéntico a T1) se sube **antes** que el canónico
T1, es el T2 el que se marca como clonado y el T1 permanece. El resultado
analítico depende del **orden de arrival**, no del contenido.

### HALL-25 · La huella tabular no es invariante ante reordenamiento de filas

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_excel.py:340`, `:347-356`
**Verificación:** [L]

`fila_origen_num` entra en el payload del hash y en la clave de ordenación. Si
el mismo contenido se reordena (p. ej. re-exportado por otra herramienta), la
huella cambia y el clon tabular **no se detecta** — lo que contradice la
intención declarada en el docstring ("excluding workbook metadata and
formatting", `:307`).

### HALL-26 · La guarda automática del contrato transaccional no cubre los módulos de mayor riesgo

**Ubicación:** `backend/tests/test_transaction_policy.py:7-19`
**Verificación:** [L]

El test escanea **únicamente** archivos llamados `repository.py` (`:10`) buscando
`commit|rollback|begin|begin_nested` (`:16`). Quedan fuera precisamente
`pdt_persistencia_pg.py` y `orquestador_grafo.py`. `pdt_persistencia_pg.py` no
contiene `commit`/`rollback` (conforme de facto), pero está fuera del perímetro
automático.

### HALL-27 · La sincronización de caché a PG es *fail-silent* y consolida parcialmente

**Ubicación:** `backend/app/modules/compromisos/pdt_persistencia_pg.py:928-929`, `:972-973`
**Verificación:** [L]

```python
except (OSError, json.JSONDecodeError):
    pass
```

`_run_with_session` (`:248-270`) hace commit de lo sincronizado hasta ese punto
y devuelve conteos parciales **sin señalar error**.

### HALL-28 · Los errores de motor se traducen en `NO_DISPONIBLE`, indistinguible de "no hay datos"

**Ubicación:** `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:273-274`, `:311-312`, `:346-347`, `:125-126`
**Verificación:** [L]

```python
except Exception:
    return {"estado": "NO_DISPONIBLE", "detalle": type(exc).__name__}
```

El usuario recibe un JSON aparentemente válido que no distingue "no hay datos"
de "la BD se cayó". La pérdida de información es jerárquica y acumulativa a lo
largo de la cadena.

### HALL-29 · No hay timeouts en las llamadas costosas

**Ubicación:**
- `backend/app/modules/compromisos/orquestador_grafo.py:411-427` — `subprocess.run(...)` **sin `timeout=`**: un pipeline colgado bloquea el worker indefinidamente.
- `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:119`, `:279`, `:337` — `asyncio.to_thread(...)` **sin timeout**.
**Verificación:** [L]

Ninguna de las 6 tools SQL (`agentes_inteligentes_pdd.py:745-830`) fija
`statement_timeout`; un `ILIKE '%…%'` sobre `pdd_evidencia_paginas` puede
consumir la conexión indefinidamente.

### HALL-30 · El grafo del ciclo de política no tiene checkpointer ni persistencia

**Ubicación:** `backend/app/modules/ia/grafo/orquestador.py:42`
**Verificación:** [L]

`StateGraph(...).compile()` sin checkpointer, y el módulo `ia` **no tiene
ninguna sesión de BD** (0 coincidencias de `AsyncSession|create_async_engine|
transaction(` en `app/modules/ia`). Una excepción en cualquier nodo pierde el
ciclo completo: no hay reanudación, ni `historial_estados` persistido, ni
`evaluacion_id` real (UUIDv7 generado en memoria, `ia/schemas.py:156-158`).

### HALL-31 · El "LLM" nunca se invoca: `self.agent` es código muerto en los 4 agentes de `ia`

**Ubicación:**
`ia/agentes/agente_diagnostico.py:100-116`,
`ia/agentes/agente_juridico.py:83-97`,
`ia/agentes/agente_fiscal.py:32-46`,
`ia/agentes/agente_devolucion.py:32-46`
**Verificación:** [V] — grep de `self\.agent\.run|await self\.agent|\.agent\.run(` en `app/modules/ia/` y `agentes_inteligentes_pdd.py` → **0 coincidencias**

Cada agente instancia un `Agent` de PydanticAI en `__init__`, pero
`analizar()` es lógica determinista pura (regex sobre el texto) y **nunca
invoca `self.agent`**. Consecuencias:

- El `TestModel()` de la rama simulada es **decorativo**.
- Si mañana se configura `OPENAI_API_KEY`, **el comportamiento no cambiaría**.
- Los `system_prompt` de `ia/prompts.py` (4 prompts) nunca llegan a un modelo.

**Estado del entorno:** no hay `OPENAI_API_KEY` ni `POLIS_IA_MODELO` en
`/root/polis/.env`, `/root/polis/.env.local`, `/root/polis/backend/.env` ni
`backend/.env.example` → las cuatro ramas de fallback están siempre activas.

**Exposición engañosa:** `compromisos/router.py:278` declara
`"framework_agentes": "PydanticAI", "agentes_cognitivos": 6` en el endpoint de
estado de **M1** (`motor_multiagente_pdd.py`), que es 100 % determinista y
**no importa `pydantic_ai` en absoluto**.

### HALL-32 · Tres políticas de degradación de modelo divergentes entre módulos

**Ubicación:**
- `agentes_inteligentes_pdd.py:712-713` — requiere `OPENAI_API_KEY` **y** `POLIS_IA_MODELO != "test"`
- `orquestador_grafo.py:275-278` — requiere además `externo is not None`
- `ia/agentes/agente_fiscal.py:34` — `os.getenv("POLIS_IA_MODELO", "test")` (default `"test"`)

**Verificación:** [L]

Sin `POLIS_IA_MODELO` pero con `OPENAI_API_KEY`, el agente fiscal intentaría un
LLM real mientras el resto del sistema no. Un interruptor explícito
`POLIS_IA_MODO = real|simulado` unificaría las tres.

### HALL-33 · El nodo crítico verifica la longitud del hash, no el digest, y aprueba sin evidencia

**Ubicación:** `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:1051-1077`
**Verificación:** [L]

```python
if len(item.get("sha256_contenido","")) == 64:   # :1053  longitud, no digest
...
approved = bool(valid) or not _terms(consulta.pregunta)   # :1056
```

Si la pregunta no produce términos (p. ej. `"1234"`), el crítico **aprueba
siempre**, sin verificación. La verificación criptográfica real sí ocurre en
`_query_evidencias` (`:392-394`), pero solo si el nodo 1 corrió.

### HALL-34 · Truncamientos silenciosos con conteo no truncado

**Ubicaciones:**
- `pdt_ai_evaluator_graph.py:2019-2020` — `"series": series_results[:120]` junto a `"series_evaluadas": len(series_results)`.
- `agentes_inteligentes_pdd.py:182`, `:188`, `:202`, `:236` — `[:100]`
- `ingesta_masiva_service.py:627`, `:647-649` — `limit(5000)` en `comparativa`
- `agentes_inteligentes_pdd.py:1194-1195` — `[:20]`
**Verificación:** [L]

En todos los casos el payload reporta el total y entrega una lista recortada
**sin marca explícita** en el propio elemento. Un agente posterior que consume
la lista recortada creerá haber visto el universo completo.

### HALL-35 · `_corte` clasifica "diciembre" como `ANUAL`, dejando muerta la rama T4 por mes

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_excel.py:449-459`
**Verificación:** [L]

```python
if any(x in normal for x in ("anual", "diciembre", "cierre")):
    return "ANUAL"
...
if any(month in normal for month in ("octubre", "noviembre", "diciembre")):
    return "T4"
```

La primera condición se evalúa antes y contiene `"diciembre"` → **la rama que
devuelve `"T4"` por mes es código muerto** para cualquier texto con
"diciembre". Un corte de diciembre se clasifica `ANUAL`, y `ANUAL` rankea como
0 en `_corte_rank` (`triada_motores.py:222-225`), por debajo de cualquier
trimestre.

### HALL-36 · `_vigencia` decide por orden posicional, no por contexto semántico

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_excel.py:428-433`
**Verificación:** [L]

```python
matches = re.findall(r"(?:20)?(1[6-9]|2[0-7])", texto)
year = int(matches[-1]) + 2000 if matches else defecto
```

En "Ejecución 2024 presupuesto 2021" toma 2021. El regex tampoco exige límites
de palabra: `"12024"` matchea `20` → 2020.

### HALL-37 · Tres parsers numéricos con umbrales de coma decimal divergentes

**Ubicaciones:**

| Módulo | Regla | `"1.234"` | `"12,345"` |
| --- | --- | --- | --- |
| `ingesta_masiva_excel._numero` (`:369-370`) | siempre coma decimal | error/None | `1.234` |
| `pdt_normalizador_canonico_metas._parsear_token_numerico_es` (`:336-340`) | coma decimal si `len(frac) <= 4` | `1.234` | `12.345` |
| `pdt_conciliador_vinculos_pa_triada._to_float_preserve_zero` (`:229-234`) | coma decimal si `len(frac) <= 2` | `1.234` | `12345` |

**Verificación:** [L]

**Valores presupuestarios pueden diferir en un factor 1 000 entre rutas.** El
umbral es ≤4 en el normalizador y ≤2 en el conciliador.

### HALL-38 · `_mapear` descarta columnas duplicadas sin registrar la pérdida

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_excel.py:379-400`
**Verificación:** [L]

Cada campo canónico se resuelve con `max(candidatos)[-1]` (`:398-400`): gana el
índice de columna más alto entre los alias que matchean. Si un libro tiene dos
columnas "Avance físico" (p. ej. una por trimestre), se conserva una y **la
otra se pierde sin ningún registro**.

### HALL-39 · `_es_pie_o_subtotal` descarta filas de negocio legítimas

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_excel.py:514-526`
**Verificación:** [L]

Si el texto concatenado de la fila contiene `"total general"`, `"subtotal"`,
`"elaborado por"`, `"revisado por"`, `"aprobado por"` o `"firma responsable"`,
la fila se descarta. Una actividad llamada *"Reestructurar total general de la
sede"* se pierde, porque el filtro no distingue pie de plantilla de contenido
de negocio.

### HALL-40 · El emparejador de vínculos no es determinista

**Ubicación:** `backend/app/modules/compromisos/pdt_conciliador_vinculos_pa_triada.py:132-141`
**Verificación:** [L]

```python
for candidato in candidatos or []:
    if _vigencia_compatible(candidato, codigo_plan):
        return candidato
```

Devuelve el **primer** candidato compatible, sin `ORDER BY`. Si la consulta SQL
que produce `candidatos` no tiene orden determinista, el emparejamiento varía
entre ejecuciones sobre los mismos datos.

### HALL-41 · `listar_lotes` filtra `archivos` pero no `lotes`

**Ubicación:** `backend/app/modules/compromisos/ingesta_masiva_service.py:516`, `:520-521`
**Verificación:** [L]

Los filtros `vigencia` y `entidad` se aplican al query de archivos pero no al
de lotes, salvo que se pase `dimension` o `periodo`. El `LIMIT 2000` del query
de archivos (`:516`) es hardcoded y no sigue al parámetro `limite` (`:499`).

### HALL-42 · La caché en memoria de inteligencia tríada crece sin límite y nunca purga

**Ubicación:** `backend/app/modules/compromisos/inteligencia_triada_service.py:29`, `:238-257`
**Verificación:** [L]

`_RESULTS: dict[tuple, tuple[float, Any]]` con TTL de 300 s. La clave incluye
`repr(args)` y `repr(sorted(kwargs.items()))`, por lo que **cada combinación
distinta de filtros crea una entrada permanente**. Las entradas expiradas nunca
se purgan: solo se sobrescriben al recalcular la misma clave.

### HALL-43 · `s0 == 0` produce un Moran I de 0 con p = 1.0 sin marca de no-estimabilidad

**Ubicación:** `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:1655`, `:1670`, `:1676-1677`
**Verificación:** [L]

```python
if float(np.var(values)) == 0:      # :1655  igualdad exacta con float
```

Si `s0 == 0` (ningún vecino con peso), `global_i` devuelve `0.0` (`:1670`) en
lugar de marcar no-estimable. Con `observed = 0`, la línea `:1676` cuenta
`abs(global_i(perm)) >= 0` → **999/999 True** → `p_value = 1.0`. Se reporta un
resultado "válido" con p = 1.0 sin advertencia de degeneración.

El módulo enriquecido sí aplica guardas estrictas (`pdt_nodos_espacial_predictivo.py:539`,
`:551`, `:722`, `:821`, `:833`).

### HALL-44 · σ = 0 produce un ISRI exactamente 0.0 o 1.0

**Ubicación:**
- `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py:1956`, `:1968-1971`
- `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py:1301-1304`
**Verificación:** [L]

Con `forecast_sigma == 0` (serie perfectamente plana, o ≤2 residuos), se cae
al branch determinista `forecast <= target` → `probability_meet ∈ {0,1}` → **ISRI
exactamente 0.0 o 1.0**. Un indicador estancado recibe ISRI = 1.0 (riesgo
máximo) sin ninguna componente probabilística.

**Efecto adicional.** `ci_low = forecast - 1.96*sigma`
(`pdt_nodos_espacial_predictivo.py:1305-1306`) puede ser negativo para un
porcentaje acotado a [0, 100].

### HALL-45 · La traza de los agentes declara `"COMPLETADO"` constante y un razonamiento estático

**Ubicación:** `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:1026-1039`
**Verificación:** [L]

```python
{
  "orden": int,
  "nodo_langgraph": str,
  "agente": spec["nombre_agente"],
  "razonamiento": str,          # motivo FIJO del código, no razonamiento del modelo
  "herramientas_invocadas": calls,
  "duracion_ms": float,
  "estado": "COMPLETADO",       # constante literal
}
```

La traza escribe `"COMPLETADO"` incluso cuando la tool subyacente devolvió
`{"estado": "NO_DISPONIBLE"}` o cuando el nodo crítico rechazó las evidencias.
**La traza nunca refleja un fallo**, lo que la vuelve inservible como evidencia
de auditoría.

### HALL-46 · La línea base reproducible de la revisión del 18/10 no está fijada

**Ubicación:** árbol de trabajo con cambios sin commit en
`backend/alembic/versions/*.py` y `backend/alembic/env.py`
**Verificación:** [V]

`git status --short` muestra múltiples migraciones modificadas, entre ellas
`env.py` (que añade `LANGGRAPH_CHECKPOINT_TABLES` y las tablas de
`address_standardizer_data_us` a las exclusiones de PostGIS). El hash
`cc221308…` **no reproduce por sí solo el código observado**, porque el árbol
tenía cambios sin commit. Toda remediación debe partir de una línea base
fijada explícitamente.

### HALL-47 · `evaluar_dea_4_niveles_cartagena` ejecuta los 4 niveles y la consulta BD en cada invocación de test

**Ubicación:** `backend/tests/test_pdt_dea_4niveles_cartagena.py` (7 invocaciones: `:81`, `:119`, `:152`, `:164`, `:184`, `:208`, más la interna de `:2123`)
**Verificación:** [S]

Es la razón de que esta suite sea la más lenta del conjunto. Combinado con
HALL-18 (filtro inoperante) y la ausencia de caché de `_consultar_insumos_bd_csh()`
(`pdt_dea_4niveles_cartagena.py:2036`), el costo por invocación es
desproporcionado.

### HALL-48 · El `DELETE` total de `pdd_evidencia_paginas` no es atómico respecto al `INSERT`

**Ubicación:** `backend/app/modules/compromisos/motor_multiagente_pdd.py:556`
**Verificación:** [L]

```python
DELETE FROM seguimiento.pdd_evidencia_paginas
```

Seguido de un `INSERT` de todas las páginas. Si el `INSERT` falla a mitad, la
tabla queda vacía. Además crea un `create_async_engine` nuevo (`:553`) en lugar
de reutilizar la sesión de la app → pool duplicado y posible divergencia de
configuración.

### HALL-49 · `nodo_viabilidad_juridica` y `nodo_viabilidad_fiscal` no realimentan el estado

**Ubicación:** `backend/app/modules/ia/grafo/nodos.py:69-103`, `:106-136`
**Verificación:** [L]

Re-ejecutarlos produce un resultado idéntico → el auto-loop consume las 3
iteraciones (`transiciones.py:39-45`, `:55-61`) y converge al mismo desenlace.
Solo `nodo_diagnostico` realimenta (`problema_central` ←
`problema_central_optimizado`, `nodos.py:58-59`).

### HALL-50 · El costo por defecto de 1,5 billones de COP se inyecta silenciosamente

**Ubicación:** `backend/app/modules/ia/grafo/nodos.py:115`, `backend/app/modules/ia/schemas.py:498`
**Verificación:** [L]

```python
costo = state.get("costo_estimado", "1500000000.00")
```

Un ciclo de política que omita el campo de costo se evalúa **como si costara
1.500.000.000 COP** y el agente fiscal lo compara contra el MFPM. Es un default
de negocio incrustado en el framework.

### HALL-51 · El rate limiter de IA es por proceso, con `actor_id` falsificable

**Ubicación:** `backend/app/modules/ia/router.py:30-58`
**Verificación:** [L]

`_ia_limite_memoria` es un `defaultdict(list)` **por proceso**: con N workers el
límite efectivo es **N × 30 req/min**. El `actor_id` se deriva de los **últimos
16 caracteres** del header `Authorization` (`:57`) → colisión trivial y
trivialmente falsificable.

### HALL-52 · `historial_estados` y `bitacora_mensajes` no tienen cota de tamaño

**Ubicación:** `backend/app/modules/ia/grafo/estado.py:63-64`
**Verificación:** [L]

Crecimiento no acotado a lo largo del ciclo, sin límite ni purga. El grafo de
`compromisos` sí persiste duraciones en BD (`0071:61`); el de `ia` solo guarda
nombres de fase, sin duración, sin herramientas invocadas, sin resultado.

### HALL-53 · El grafo supervisor no está expuesto por REST: el HITL solo se activa por CLI

**Ubicación:** `backend/app/modules/compromisos/orquestador_grafo.py:759-828`
**Verificación:** [L]

`correr_grafo` solo se invoca desde `scripts/pipeline_datos_polis.py:313,319`
(flag `--grafo`) y desde tests. El router de `compromisos` expone únicamente el
evaluador PDT-AI (`router.py:964-1009`). Consecuencia operativa: **el operador
debe reiniciar el proceso con `--grafo` y el mismo `thread_id`** para despachar
una revisión humana.

### HALL-54 · La generación de hipótesis espaciales se dispara por palabra genérica y lista todos los coldspots como candidatos

**Ubicación:** `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py:928-939`
**Verificación:** [L]

```python
generic_terms = ("educacion", "salud", "infraestructura", "social", "localidad")
if any(token in normalized_unit for token in generic_terms) and (coldspots or coldspots_exploratorios):
    trap_hypotheses.append({
        "unidad_dmu": unit,
        "estado_vinculo": "HIPOTESIS_PENDIENTE_REVISION",
        "coldspots_candidatos": sorted(set(coldspots + coldspots_exploratorios)),
        "senal_generica": [token for token in generic_terms if token in normalized_unit],
        "requiere_soporte_proyecto_territorio": True,
    })
```

Dos problemas:

1. **Disparador no discriminante.** La condición es la presencia de una
   subcadena genérica en el nombre de la unidad. En un portafolio de salud,
   educación o infraestructura —que es el caso normal de estos motores— la
   proporción de dependencias que activa el disparador es cercana al 100 %. La
   hipótesis resultante no aporta información diferencial.
2. **Candidatos no discriminados.** `coldspots_candidatos` es la **totalidad**
   de los coldspots (exploratorios incluidos), con independencia de cualquier
   relación con la unidad. La hipótesis no acota nada; traslada el trabajo de
   desambiguación íntegro al revisor humano.

A diferencia de HALL-06, aquí el estado es `HIPOTESIS_PENDIENTE_REVISION` y
`requiere_soporte_proyecto_territorio` es `True`, por lo que **no** congela el
grafo HITL: el defecto es de volumen y señal, no de congelamiento.

**Criterio de aceptación.** Solo se genera hipótesis cuando existe una
relación territorial o programática comprobable entre la unidad y el coldspot
candidato; la lista de candidatos es un subconjunto acotado y justificado, no
el conjunto completo.

---

## 7. Hallazgos P3 — Bajos / higiene

| ID | Hallazgo | Ubicación |
| --- | --- | --- |
| HALL-P3-01 | `_clave_valida` usa un conjunto cerrado de 8 marcadores inválidos; no cubre `"n.d."`, `"no aplica"`, `"s/d"`, `"sin dato"`, `"null"` | `triada_motores.py:214` |
| HALL-P3-02 | `codigo_meta_pdd` excluido de `_clave` → dos metas distintas con el mismo BPIM se fusionan silenciosamente | `triada_motores.py:204-210` |
| HALL-P3-03 | Deduplicación binaria por `hash_sha256` sin `corte` → imposible re-ingestar el mismo archivo para otro corte | `ingesta_masiva_service.py:243-248` |
| HALL-P3-04 | `_corte_rank` no reconoce el formato `1T` (exige `T` o `TRIMESTRE` antes del dígito) | `triada_motores.py:222-225` |
| HALL-P3-05 | `_RESULTS` no purga entradas expiradas; el `thread_index` de la caché PDT tampoco se poda | `inteligencia_triada_service.py:29`; `pdt_ai_evaluator_graph.py:2275` |
| HALL-P3-06 | `_save_cached` poda por orden de inserción, no por `generado_en`; el `thread_index` resultante puede apuntar a claves eliminadas | `pdt_ai_evaluator_graph.py:2276-2279` |
| HALL-P3-07 | El umbral ISRI 0.40 está **duplicado como literal** en el dictamen en vez de importarse de la constante | `pdt_dictamen_ejecutivo.py:124` vs `pdt_ai_evaluator_graph.py:57` |
| HALL-P3-08 | `_normalizar` en el dictamen debe producir la misma cadena para `None` y `""`; con un nombre de dependencia vacío habría coincidencia espuria | `pdt_dictamen_ejecutivo.py:19-23`, `:127-137` |
| HALL-P3-09 | El prefijo aceptado es exactamente `"entidad ejecutora:"`; variantes con guion no casan (acoplamiento fuerte entre productor y consumidor) | `pdt_dictamen_ejecutivo.py:130-136` |
| HALL-P3-10 | `np.polyfit` en el holdout predictivo se ejecuta fuera de todo `warnings.catch_warnings` → `RankWarning` visible en logs de producción | `pdt_ai_evaluator_graph.py:1985` |
| HALL-P3-11 | En `dea_econometria_service._lp` falta una guarda global `np.any(X <= 0)`: una columna de X toda ceros con target positivo escala por `1e-9` | `dea_econometria_service.py:392`, `:397-398` |
| HALL-P3-12 | `stop_iteration` no capturado en `_trace_entry` si un nodo no está en `AGENT_SPECS` → 500 | `agentes_inteligentes_pdd.py:1027` |

---

## 8. Correcciones a la revisión del 18/10/2026

Tres hallazgos de `revision_motores_18_10_2026.md` fueron reevaluados contra
el código: **CORR-1** es un falso positivo pleno, **CORR-2** es un falso
positivo en su ubicación (el defecto real es otro y está registrado
aparte), y **CORR-3** es parcialmente falso y parcialmente confirmado. Se
documentan aquí para evitar remediaciones innecesarias o —peor— para no
"corregir" comportamiento que ya es correcto.

### CORR-1 · La condición `or item.get("entidad") is None` no existe

**Estado:** **Falso positivo.**
**Verificación:** [V] — `grep -rn 'entidad") is None' backend/app/ backend/tests/` → **0 coincidencias**.

El código real (`pdt_dictamen_ejecutivo.py:127-141`) es **más estricto** que lo
que la revisión supone:

```python
def _explicitly_attributed(item: dict[str, Any], dependency: str) -> bool:
    if _normalizar(item.get("entidad")) == _normalizar(dependency):
        return True
    prefix = "entidad ejecutora:"
    for field in ("indicador", "serie", "nombre", "identificador"):
        value = str(item.get(field) or "").strip()
        if _normalizar(value).startswith(prefix):
            credited = value.split(":", maxsplit=1)[1].strip()
            if _normalizar(credited) == _normalizar(dependency):
                return True
    return False
```

Una serie sin `entidad` **no** se atribuye a ninguna dependencia; cae en
`unattributed_critical` (`:139-141`) y se reporta en
`total_indicadores_isri_sin_atribucion`. **El criterio de aceptación que la
revisión propone ya se cumple**, y está cubierto por
`tests/test_pdt_dictamen_ejecutivo.py:138-161` y
`tests/test_pdt_revision_por_meta.py:250-271`.

Riesgo residual real: el umbral 0.40 duplicado (HALL-P3-07) y el acoplamiento
del prefijo (HALL-P3-09).

### CORR-2 · `log1p` no existe en el nodo DEA

**Estado:** **Falso positivo en la ubicación; el problema real es otro.**
**Verificación:** [V] — `grep -n "log1p" pdt_ai_evaluator_graph.py` → **una sola
coincidencia, `:499`**, dentro de `_ctfidf_by_class` (TF-IDF del NLP), **no** en
`_dea_node`.

Las conclusiones derivadas de esa premisa tampoco se sostienen:

- *"los insumos menores de un millón se convierten en cero"* → **falso**: el
  nodo DEA escala por **división de la media global** (`:1424-1426`), sin log y
  sin colapso a cero. El problema real es que esa escala no homogeneiza (ver
  **HALL-15**).
- *"un cero de ejecución puede sustituirse por un porcentaje positivo"* → **falso
  en esa línea**: el código usa `is None` (`:839-841`), por lo que un 0 legítimo
  se preserva. La mezcla de magnitudes **sí** existe, pero en el acumulador
  (`:839-842`, ver **HALL-17**).

### CORR-3 · La transformación DEA y el bootstrap

**Estado:** **Parcialmente falso / parcialmente confirmado.**

- La rama `log1p` **no existe** (ver CORR-2).
- El bootstrap **sí** es problemático, pero no por re-transformar pesos: por
  **no re-estimar la frontera** (**HALL-05**), lo que hace el sesgo estimado
  aproximadamente nulo.
- *"cambiar conjuntamente la unidad monetaria no cambia la eficiencia"* — el
  test de invariancia existe (`tests/test_pdt_ai_evaluator.py:457-480`), pero
  solo frente a la escala global, no frente a homogeneización por DMU.

### Confirmaciones

Los siguientes hallazgos de la revisión del 18/10 **se confirman literalmente**:

| Hallazgo previo | Confirmado en |
| --- | --- |
| **H2** trampas territoriales por nombre de la dependencia | `pdt_nodos_espacial_predictivo.py:888-903` → **HALL-06** |
| **H6** datos territoriales derivados con anclas por localidad | `pdt_nodos_espacial_predictivo.py:241-321` → **HALL-12** |
| **H5** ISRI con unidades y sentidos incompatibles | `pdt_ai_evaluator_graph.py:582`, `:1897-1904` → **HALL-13**, **HALL-44** |
| **H8** clave de cruce sin vigencia ni corte suficiente | `triada_motores.py:204-210` → **HALL-01** |
| **H7** filtros de agentes que no combinan pregunta y plan | `agentes_inteligentes_pdd.py:129-141` → **HALL-04** |
| **H9** coherencia textual sin validación humana de referencia | `pdt_ai_evaluator_graph.py:973` (nodo `_nlp_node`), umbral coseno 0.45 → §9.1 (`COSINE_ALERT_THRESHOLD`, `pdt_ai_evaluator_graph.py:56`) |

---

## 9. Inventario de umbrales, constantes y pesos

Concentrado para diagnóstico: cualquier cambio en estos valores altera
resultados **sin que ningún test lo detecte** salvo indicación contraria.

### 9.1 Constantes normativas (verificadas contra `knowledge-base/13_*.md`)

| Constante | Valor | Ubicación | KB |
| --- | --- | --- | --- |
| `BOOTSTRAP_REPLICATES` | 1 000 | `pdt_ai_evaluator_graph.py:54` | `:105` ✔ |
| `SPATIAL_PERMUTATIONS` | 999 | `pdt_ai_evaluator_graph.py:55`; `pdt_nodos_espacial_predictivo.py:36` | no especificado ⚠ |
| `COSINE_ALERT_THRESHOLD` | 0.45 | `pdt_ai_evaluator_graph.py:56` | `:130` ✔ |
| `ISRI_ALERT_THRESHOLD` | 0.40 | `pdt_ai_evaluator_graph.py:57`; `pdt_nodos_espacial_predictivo.py:37` | `:172` ✔ |
| Literal duplicado | 0.40 | `pdt_dictamen_ejecutivo.py:124` | ⚠ no derivado (HALL-P3-07) |
| `VERSION_METODOLOGICA_PDT` | `25A-2026.10.18.1` | `pdt_ai_evaluator_graph.py:58` | ✔ |
| Corte Chow | 2024 | `pdt_ai_evaluator_graph.py:1848`; `pdt_nodos_espacial_predictivo.py:38` | no especificado ⚠ |

### 9.2 Tríada e inteligencia

| Regla | Valor | Ubicación |
| --- | --- | --- |
| Umbral suboperacionalización | ≥ 20 pts | `triada_motores.py:277` |
| Umbral desfase crítico | gap ≥ 20 | `triada_motores.py:281` |
| Umbral rezago contractual | gap ≤ −20 | `triada_motores.py:285` |
| Índice de coherencia | `100 − Σ\|dif\|/n` | `triada_motores.py:275` |
| Pesos de calidad de avance | 0.45 / 0.30 / 0.25 | `inteligencia_triada_service.py:482` |
| Mayoría débil DNP | `weak_n / denom >= 0.6` | `:441` |
| Espejismo (estratégico ≤ / operativo ≥) | 35 / 75 | `:444` |
| Sobreejecución (oblig/pagos) | ≥ 0.75 | `:453` |
| Coherencia (avance mín / ratio) | ≥ 50 / < 0.75 | `:471`, `:474` |
| Detección "zombie" | ≥ 2 cortes idénticos | `:741` |
| Salto de diciembre | ≥ 50 | `:768` |
| Índice de transparencia | / 11 checks | `:794` |
| Gap de alineación territorial | < 10 | `:873` |
| Factor de forecast | × 1.25 | `:1058` |
| Semáforo verde / ámbar | 80 / 50 | `:1088-1091` |
| TTL caché en memoria | 300 s | `:25` |
| Topes de casos | 100 (patologías) / 25 (radar) | `:512`, `:565` |

### 9.3 Ingesta

| Constante | Valor | Ubicación |
| --- | --- | --- |
| `MAX_ARCHIVOS` | 200 | `ingesta_masiva_excel.py:20` |
| `MAX_BYTES_ARCHIVO` | 25 MiB | `:21` |
| `MAX_BYTES_ZIP` | 150 MiB | `:22` |
| `MAX_FILAS` | 250 000 | `:23` |
| Hojas máx. por ZIP | 50 | `:649` |
| Miembros máx. por ZIP | 20 000 | `:653` |
| Columnas semánticas mín. | 2 | `:422` |
| Rango de vigencia | 2016–2027 | `:433` |
| Perfiles de formato | 2019 / 2023 / 2026 | `:795-800` |
| Truncamiento `comparativa` | 5 000 filas | `ingesta_masiva_service.py:627` |
| Límite de query de archivos | 2 000 (hardcoded) | `:516` |

### 9.4 Concilliación de vínculos

| Regla | Valor | Ubicación |
| --- | --- | --- |
| `TIPOS_VINCULO_CANONICOS` | 1.0 / 0.9 / 0.78 / 0.55 / 0.0 | `pdt_conciliador_vinculos_pa_triada.py:72-78` |
| Afinidad léxica | `0.55·overlap + 0.45·jaccard` | `:212` |
| Umbral de hermano | 0.45 | `:270` |
| Peso "hermano" | 0.35 | `:474` |
| Peso "sectorial" | 0.15 | `:501` |
| Score previo mínimo | 0.60 | `:491` |
| Tope `candidatos_tri_dep` | 250 | `:514` |
| Tope `triada_muestra_global` | 800 | `:962` |

### 9.5 DEA y Hoshin Kanri

| Regla | Valor | Ubicación |
| --- | --- | --- |
| Focus | `0.70·cobertura_sectorial + 0.30·densidad_estratégica` | `pdt_hoshin_kanri.py:450-453` |
| Alignment | `0.60·min(1, sim/0.70) + 0.40·(1 − mission_creep)` | `:460-463` |
| Integration | `0.65·mean_bcc + 0.35·cobertura_dea` | `:468-471` |
| Review | `0.45·cobertura_lisa + 0.35·cobertura_series + 0.20·trazabilidad_pg` | `:480-483` |
| `mean_bcc` / `sim_promedio` por defecto | 0.35 / 0.50 | `:466`, `:457` |
| Divisores cobertura_lisa / series | 29.0 / 10.0 | `:477-478` |
| DEA ineficiente | `theta_bcc < 0.80` | `:1028` |
| Meta eficiencia Catchball | 0.80 | `:1060` |
| `epsilon` DEA / piso θ | 1e-6 / `clip(1e-6, 1.0)` | `pdt_dea_4niveles_cartagena.py:474`, `:515-516` |
| Tolerancia frontera eficiente | 1e-5 | `:504`, `:650` |
| Piso producto Y | **0.0001** | `pdd_dea_service.py:1975` (ver HALL-11) |
| Bootstrap frontera | 400 reps, seed 20261015, mín. 360 | `dea_econometria_service.py:1022` |
| Bootstrap BCC | 200 reps, seed 202409 | `pdd_dea_service.py:2857` |

### 9.6 Agentes y ciclo de política

| Regla | Valor | Ubicación |
| --- | --- | --- |
| Penalizaciones diagnóstico | 25.0 / 20.0 / 8.0 / 5.0 | `agente_diagnostico.py:241,259,267,279` |
| Umbral de validez | `puntaje >= 65.0` | `:313` |
| Horizonte: Ley 1483 | `> 4` años | `agente_fiscal.py:50` |
| Canastas FONSET/ICLD | 60/40 | `agente_fiscal.py:107-108` |
| Motivación preliminar | ≥ 20 caracteres | `agente_devolucion.py:146` |
| `max_iteraciones` | 3 (rango 1–5) | `ia/schemas.py:502` |
| Costo por defecto | 1 500 000 000 COP | `ia/schemas.py:498` (ver HALL-50) |
| Rate limit IA | 30 req / 60 s por proceso | `ia/router.py:50,54` |
| `_terms` mínimo / truncado / reintento | 4 chars / 12 / **5** | `agentes_inteligentes_pdd.py:98-99`, `:353-354` |

---

## 10. Cobertura de pruebas y huecos

### 10.1 Inventario

| Suite | Líneas | Cubre |
| --- | ---: | --- |
| `test_triada_motores.py` | 353 | Motor puro: detección de formato, agrupación, cruce, dedup de cortes y separación de vigencias (`:162`), rechazo de claves incompletas |
| `test_ingesta_masiva_triada.py` | 737 | Normalización de entidad, huella tabular, parsing binario (XLSX/XLS/CSV/ZIP), detector de encabezado, persistencia y dedup por hash |
| `test_inteligencia_triada.py` | 87 | **Solo 2 tests**: que los 7 endpoints devuelvan las claves esperadas, y validación de parámetros. Ninguno verifica el **valor** de `score`, `estado_semaforo` ni `predominant` |
| `test_agentes_inteligentes_pdd.py` | 417 | 5 tests. El del filtro (`:386-390`) usa un valor con el **código de plan literal**, formato que nunca ocurre en producción |
| `test_motor_multiagente_pdd.py` | 194 | 7 tests. **Nunca ejecuta `ejecutar_sistema_multiagente_pdd`**: monkeypatchea el router y un agente. Las 6 puertas de calidad no se ejercitan jamás |
| `test_red_multiagente_ia.py` | 453 | 8 tests. Verifica que el fallback `TestModel` esté en uso, **nunca** que el LLM real se invoque |
| `test_corridas_pipeline.py` | 144 | Integración. Exige `POLIS_TEST_DATABASE_URL` en base `polis_test*` |
| `test_pipeline_p0_unit.py` | 347 | 17 escenarios. `registrar_paso` está monkeypatcheado en casi todos: el advisory lock y la `UNIQUE (thread_id, orden)` no se ejercitan en unitario |
| `test_pdt_ai_evaluator.py` | 546 | Grafo, `_dea_solve` vs `_dea_solve_pulp`, Chow, Moran/LISA, forecast, slacks/Malmquist, invariancia a escala monetaria, caché por fingerprint |
| `test_dea_econometria_triada.py` | 232 | IPC DANE, `_prepare`, regresión truncada, `_lp`/`_sbm`, `_bh`, `_frontier_sync` con 9 DMUs, 5 rutas HTTP |
| `test_pdd_dea_triada.py` | 570 | PPI 2024 oficial, cachés, `_malmquist_interplan`, `_gini`/`_hhi`, 19 rutas, serialización/ETag |
| `test_pdt_nodos_espacial_predictivo.py` | 635 | Moran Queen/k-NN, trampas, 15 UCG, ARIMA/ISRI, Chow, PostGIS real (29 polígonos / 116 indicadores) |
| `test_pdt_dea_4niveles_cartagena.py` | 273 | Benchmarks DEA con valores esperados, 4 fronteras, tablero alcalde, Malmquist N4, padrón 105 IEO / 43 ESE |
| `test_pdt_dictamen_ejecutivo.py` | 197 | PPI desagregado, PostGIS, dictamen + markdown, **ISRI sin atribución (H1)** |
| `test_pdt_hoshin_kanri.py` | 447 | Spec FAIR/Matriz X, 4 esquinas de simbolía, semáforo PDCA, caché real, filtros |
| `test_conciliador_vinculos_calidad_polis.py` | 204 | Hermano no elegido por posición ni por dinero, bloqueo de fuente compartida + rollback |

### 10.2 Ausencia crítica: no hay benchmark DEA publicado

**Verificación:** [S] — grep exhaustivo sobre `backend/tests/` y
`backend/app/modules/compromisos/` de `caso de referencia`, `referencia
publicada`, `published`, `benchmark.*(charnes|cooper|DEA)`, `cooper.*case`,
`charnes.*case`, `estandar.*dea`, `tabla.*dea.*referenc` → **1 única
coincidencia irrelevante** (`triada_motores.py:80`, sobre metadatos de Drupal).

**No existe** ninguna validación contra:

- el conjunto clásico de **Cooper et al.** (14 DMUs, 3 insumos, 2 productos);
- `DEAP`, `Benchmarking` (R) o `pyDEA`;
- ningún caso publicado de DEA input-oriented vs output-oriented con θ tabulados.

Lo más cercano es `test_pdt_dea_4niveles_cartagena.py:18-76`: un caso
**sintético de 3 DMUs** con valores esperados escritos a mano (θ_bcc ≈ 1.0,
θ_bcc ≈ 0.5, holguras, φ_bcc > 1.0). Es una **prueba de control de invariancia
útil** —detecta cambios en la formulación del LP, en las holguras y en la doble
etapa— pero **no es un benchmark citable**: dataset trivial, valores no
publicados, sin redundancia.

### 10.3 Huecos de cobertura priorizados

| # | Hueco | Test que lo cubriría |
| --- | --- | --- |
| 1 | **Propagación de `vigencia`/`corte` en `_cruzar_filas`** (HALL-01) | Ingerir filas de 2 vigencias con el mismo `(entidad, línea, bpim)`; afirmar `len(cruces) == 2` y `vigencia` distinta. **Ausente.** |
| 2 | **Caché con 2 runs y selección divergente** (HALL-02) | Construir un caché con 2 runs y afirmar que los 3 lectores eligen el mismo, validando versión y fingerprint. **Ausente.** |
| 3 | **Filtro de plan con el formato real `"Dependencia\|año"`** (HALL-04) | Afirmar que `PDD_2024_2027` ≠ `PDL_2024_2027` y que las entidades irrelevantes se excluyen. **Ausente.** |
| 4 | **Valores de los pesos de `inteligencia_triada_service`** (0.45/0.30/0.25, 35/75, 0.75, 50, 0.6) | `test_inteligencia_triada.py` solo comprueba claves y longitudes. **Ausente.** |
| 5 | **Falsos positivos de `matched_coldspot`** (HALL-06) | Afirmar que "Secretaría de Salud" **no** vincula con "Centro de Salud La Victoria". El test actual consagra el comportamiento permisivo. **Ausente.** |
| 6 | **Valores numéricos del enriquecimiento UCG** (HALL-12) | Afirmar `derived_value`, población e `inversion_per_capita_cop`. La fórmula de `:302` no está protegida. **Ausente.** |
| 7 | **Sesgo del bootstrap** (HALL-05) | Afirmar `sesgo_estimado != 0` con datos heterocedásticos. **Ausente.** |
| 8 | **Atomicidad de `persistir_evaluacion_y_checkpoint_pdt_pg`** | Solo hay prueba de atomicidad del dictamen de hallazgo (`test_transactions_integration.py:534`). **Ausente.** |
| 9 | **Rollback ante fallo de persistencia PG** (HALL-21) | El `except` que traga la excepción no está verificado por nadie. **Ausente.** |
| 10 | **Concurrencia real sobre `corridas_pipeline_pasos`** | Sin test del advisory lock ni de la `UNIQUE (thread_id, orden)` bajo dos hilos concurrentes. **Ausente.** |
| 11 | **Ejecución real de las 6 puertas del multiagente PDD** | El motor completo nunca se ejecuta en los tests. **Ausente.** |
| 12 | **Invalidez de caché por versión de corpus** (HALL-22) | Ningún test escribe en `CACHE_INTELIGENCIA` ni verifica que una segunda ingesta invalide. **Ausente.** |
| 13 | **Cota exacta de `iteraciones_totales`** | El test afirma `≤ 12` en vez del límite exacto; no discrimina 3 iteraciones de 2 + 2 nodos. |
| 14 | **Truncamiento de series a 120** (HALL-34) | Afirmar consistencia entre `series_evaluadas` y `series` entregadas, o que el truncamiento está marcado. **Ausente.** |
| 15 | **Invalidez de `_CACHE_NIVEL3_*`** (HALL-19) | Datos cambiados con el mismo cardinal de DMUs. **Ausente.** |
| 16 | **Resolución del URL de BD del normalizador** (HALL-03) | Test de una línea que detectaría escritura en producción. **Ausente.** |

### 10.4 Restricciones del entorno de pruebas

- Los tests que dependen del corpus oficial se **omiten** si `corpus_analitica`
  no está presente (`tests/conftest.py:251-262`): `test_ingesta_masiva_triada.py:381`,
  `test_pdt_normalizador_y_vinculos_8planes.py:98/147/207`.
- Los que requieren `database_url` dependen de `POLIS_TEST_DATABASE_URL`
  (`tests/conftest.py:13-46`).
- **Consecuencia:** en un entorno sin corpus y sin BD, la cobertura efectiva de
  la tríada se reduce a `test_triada_motores.py` (motor puro),
  `test_inteligencia_triada.py` (contratos de forma) y el parsing sin DB. **Ninguno
  de esos tres ejercita `_cruzar_filas`**, que es donde se pierde
  `vigencia`/`corte` (HALL-01).

---

## 11. Índice de trazabilidad

| Hallazgo | Archivo:línea principal | Severidad | Verificación |
| --- | --- | --- | --- |
| HALL-01 | `ingesta_masiva_service.py:455-459` | P0 | V |
| HALL-02 | `agentes_inteligentes_pdd.py:103-114` | P0 | V |
| HALL-03 | `pdt_normalizador_canonico_metas.py:312-317` | P0 | V |
| HALL-04 | `agentes_inteligentes_pdd.py:129-141` | P0 | V |
| HALL-05 | `pdt_ai_evaluator_graph.py:1296-1314` | P0 | L |
| HALL-06 | `pdt_nodos_espacial_predictivo.py:888-903` | P0 | V |
| HALL-07 | `ingesta_masiva_service.py:802-809` | P1 | V |
| HALL-08 | `ingesta_masiva_service.py:487-488` | P1 | V |
| HALL-09 | `pdd_dea_service.py:662-670` | P1 | V |
| HALL-10 | `pdt_dea_4niveles_cartagena.py:387` | P1 | V |
| HALL-11 | `pdd_dea_service.py:1975` | P1 | V |
| HALL-12 | `pdt_nodos_espacial_predictivo.py:302` | P1 | V |
| HALL-13 | `pdt_ai_evaluator_graph.py:1897-1904` | P1 | L |
| HALL-14 | `pdt_ai_evaluator_graph.py:1456-1462` | P1 | L |
| HALL-15 | `pdt_ai_evaluator_graph.py:1424-1426` | P1 | V |
| HALL-16 | `pdt_ai_evaluator_graph.py:860-874` | P1 | V |
| HALL-17 | `pdt_ai_evaluator_graph.py:839-842` | P1 | V |
| HALL-18 | `pdt_dea_4niveles_cartagena.py:2036-2054` | P1 | L |
| HALL-19 | `pdt_dea_4niveles_cartagena.py:1612` | P1 | L |
| HALL-20 | 3 bootstraps, 3 semillas | P1 | L |
| HALL-21 | `pdt_ai_evaluator_graph.py:2381-2385` | P2 | L |
| HALL-22 | `inteligencia_triada_service.py:243-316` | P2 | L |
| HALL-23 | `motor_multiagente_pdd.py:872-882` | P2 | L |
| HALL-24 | `ingesta_masiva_service.py:267` | P2 | L |
| HALL-25 | `ingesta_masiva_excel.py:340` | P2 | L |
| HALL-26 | `test_transaction_policy.py:10` | P2 | L |
| HALL-27 | `pdt_persistencia_pg.py:928-929` | P2 | L |
| HALL-28 | `agentes_inteligentes_pdd.py:273-274` | P2 | L |
| HALL-29 | `orquestador_grafo.py:411`; `agentes_inteligentes_pdd.py:119,279,337` | P2 | L |
| HALL-30 | `ia/grafo/orquestador.py:42` | P2 | L |
| HALL-31 | `ia/agentes/*.py` (4 archivos) | P2 | V |
| HALL-32 | 3 políticas de modelo | P2 | L |
| HALL-33 | `agentes_inteligentes_pdd.py:1053-1056` | P2 | L |
| HALL-34 | 5 truncamientos | P2 | L |
| HALL-35 | `ingesta_masiva_excel.py:449-459` | P2 | L |
| HALL-36 | `ingesta_masiva_excel.py:428-433` | P2 | L |
| HALL-37 | 3 parsers numéricos | P2 | L |
| HALL-38 | `ingesta_masiva_excel.py:398-400` | P2 | L |
| HALL-39 | `ingesta_masiva_excel.py:514-526` | P2 | L |
| HALL-40 | `pdt_conciliador_vinculos_pa_triada.py:132-141` | P2 | L |
| HALL-41 | `ingesta_masiva_service.py:516-521` | P2 | L |
| HALL-42 | `inteligencia_triada_service.py:29` | P2 | L |
| HALL-43 | `pdt_ai_evaluator_graph.py:1670` | P2 | L |
| HALL-44 | `pdt_ai_evaluator_graph.py:1956` | P2 | L |
| HALL-45 | `agentes_inteligentes_pdd.py:1032-1038` | P2 | L |
| HALL-46 | árbol de trabajo | P2 | V |
| HALL-47 | `test_pdt_dea_4niveles_cartagena.py` | P2 | S |
| HALL-48 | `motor_multiagente_pdd.py:556` | P2 | L |
| HALL-49 | `ia/grafo/nodos.py:69-136` | P2 | L |
| HALL-50 | `ia/grafo/nodos.py:115` | P2 | L |
| HALL-51 | `ia/router.py:30-58` | P2 | L |
| HALL-52 | `ia/grafo/estado.py:63-64` | P2 | L |
| HALL-53 | `orquestador_grafo.py:759-828` | P2 | L |
| HALL-54 | `pdt_nodos_espacial_predictivo.py:928-939` | P2 | L |
| HALL-P3-01..12 | ver §7 | P3 | L |
| CORR-1 (corr. H1) | `pdt_dictamen_ejecutivo.py:127-141` | — | V |
| CORR-2 (corr. H3) | `pdt_ai_evaluator_graph.py:499`, `:839-841` | — | V |
| CORR-3 (corr. H4) | `pdt_ai_evaluator_graph.py:1296-1314`, `:1424-1426` | — | V |

---

## 12. Orden de remediación propuesto

Secuencia ordenada por *capacidad de falsear conclusiones*. Cada bloque
independiente puede ejecutarse y verificarse por separado.

### Bloque 0 — Línea base y contención (antes de cualquier cambio)

| # | Acción | Hallazgo |
| --- | --- | --- |
| 0.1 | Fijar una línea base reproducible: worktree limpio desde `main`, incorporar solo los cambios pertinentes, guardar commit y SHA-256 de los archivos nuevos. El árbol original tiene cambios sin commit y el hash de `main` no lo reproduce | HALL-46 |
| 0.2 | Proveer `polis_test*` y exportar `POLIS_TEST_DATABASE_URL`; eliminar todo fallback a `bd_csh` en resolvers y en tests | HALL-03 |
| 0.3 | Congelar el archivo `cache_pdt_ai_evaluator.json` actual como evidencia (SHA-256) antes de cualquier reescritura | HALL-02 |

### Bloque 1 — Correcciones de una línea o pocas líneas (alto impacto)

| # | Acción | Hallazgo | CA |
| --- | --- | --- | --- |
| 1.1 | Propagar `vigencia` y `corte` a `base` en `_cruzar_filas` y en `service.py:457-493` | HALL-01 | 2 vigencias → 2 cruces; test de regresión |
| 1.2 | Unificar la selección del run PDT en un lector único que valide `version_metodologica` **y** `fingerprint_fuentes_sha256`; eliminar `runs[0]` y `max(generado_en)` | HALL-02 | 3 lectores → mismo run; test con 2 runs |
| 1.3 | Sustituir `.get("eficiencia", 1.0)` por un default explícito de "no estimable" (`None` + estado) | HALL-09 | Ningún θ con solver fallido es 1.0 |
| 1.4 | Sustituir `pulp.value(theta_var) or 1.0` por un chequeo de `is None` | HALL-10 | θ = 0 se reporta como 0 |
| 1.5 | Eliminar el piso `0.0001` del producto; propagar el nulo | HALL-11 | Producto nulo no genera θ ≈ 1 |
| 1.6 | Sustituir `or` por `is None` en los 3 puntos de ingesta con ceros legítimos | HALL-08 | Apropiación 0 se preserva |
| 1.7 | Propagar `None` en lugar de `0.0` en `_cruzar_persistidos` | HALL-07 | `DATOS_INCOMPLETOS` alcanzable |
| 1.8 | Importar `ISRI_ALERT_THRESHOLD` en `pdt_dictamen_ejecutivo.py` | HALL-P3-07 | Un solo valor normativo |

### Bloque 2 — Integridad de los vínculos y de la atribución

| # | Acción | Hallazgo | CA |
| --- | --- | --- | --- |
| 2.1 | Sustituir la coincidencia de subcadena de `matched_coldspot` por tokenización con `_normalize_text`/`_tokenize`; reclasificar como `HIPOTESIS_PENDIENTE_REVISION` mientras no haya evidencia de proyecto–actividad–territorio | HALL-06 | "Secretaría de Salud" no vincula con "Centro de Salud La Victoria" |
| 2.2 | Acotar el disparador de hipótesis espaciales a una relación territorial comprobable y limitar `coldspots_candidatos` a un subconjunto justificado | HALL-54 | La lista de candidatos no es el conjunto total de coldspots |
| 2.3 | Separar `coldspots_lisa` y `dictamenes_dependencias` del atajo `"TODOS"`; aplicar el filtro de plan del usuario | HALL-04 | Ambos respeitan `codigo_plan` |
| 2.4 | Añadir `codigo_plan` a la identidad de los DMUs y reescribir `_matches_pdt_filter` con comparación **exacta** del código, dejando el rango de años como criterio adicional y opcional | HALL-04 | `PDD_2024_2027` ≠ `PDL_2024_2027` |
| 2.5 | Marcar toda serie sin atribución con un estado explícito y exponerla en el dictamen | (H1 ya conforme — verificar) | `indicadores_isri_sin_atribucion` no vacío cuando corresponda |

### Bloque 3 — Procedencia del dato territorial

| # | Acción | Hallazgo | CA |
| --- | --- | --- | --- |
| 3.1 | Etiquetar cada atributo territorial como `observado` / `estimado` / `imputado` / `simulado`, con método y fuente; corregir `fuente_datos` para que no invoque PostGIS cuando el valor es heurístico | HALL-12 | Cada indicador de un dictamen se rastreable hasta su medición |
| 3.2 | Corregir la fórmula de `:302`: pesos que sumen 1.0 y sin el término `0.15·ucg_key`; o sustituirla por valores observados | HALL-12 | Sin correlación mecánica con el índice UCG |
| 3.3 | Romper la dependencia funcional entre `derived_value` e `inversion_per_capita_cop` | HALL-12 | Sin correlación espuria en el Moran bivariado |
| 3.4 | Impedir que datos `DERIVADO_HEURISTICO` entren en informes institucionales | HALL-12 | Bloqueo en el generador de dictamen |

### Bloque 4 — Metodología estadística

| # | Acción | Hallazgo | CA |
| --- | --- | --- | --- |
| 4.1 | Reestimar la frontera por réplica en el bootstrap, o declarar el resultado como `EXPLORATORIO` como ya hace `_frontier_sync` | HALL-05 | Sesgo estimado ≠ 0 con datos heterocedásticos |
| 4.2 | Unificar la semilla y el procedimiento de los tres bootstraps, o declarar la no comparabilidad en el payload | HALL-20 | Intervalos comparables o explícitamente no comparables |
| 4.3 | Homogeneizar el insumo por DMU (per cápita, por meta, por Outputs) en lugar de la media global | HALL-15 | El ranking no cambia al reescalar el presupuesto global |
| 4.4 | Separar el producto físico del porcentual en acumuladores separados; excluir `meta_programada_anual` (SUM físico) como meta porcentual del ISRI | HALL-13, HALL-17 | Ninguna magnitud se suma con otra heterogénea |
| 4.5 | Declarar `NO_ESTIMABLE` cuando `s0 == 0` o `σ == 0`, en vez de devolver `p = 1.0` / ISRI 0 o 1 | HALL-43, HALL-44 | Sin resultados degenerados presentados como válidos |
| 4.6 | Corregir la predicación de equivalencia de solvers para que ambos-nulos **no** se declaren equivalentes | HALL-14 | Ambos-fallan se reporta como fallo |
| 4.7 | Incorporar un benchmark DEA publicado (Cooper et al. o equivalente) como test de referencia | §10.2 | θ contra valores publicados |

### Bloque 5 — Observabilidad y robustez operativa

| # | Acción | Hallazgo | CA |
| --- | --- | --- | --- |
| 5.1 | Añadir `timeout=` al `subprocess.run` y envolver los `asyncio.to_thread` en `asyncio.wait_for` | HALL-29 | Ninguna petición puede colgarse indefinidamente |
| 5.2 | Sustituir los `except` que devuelven `NO_DISPONIBLE` por propagación o por un estado que distinga "sin datos" de "fallo" | HALL-28 | El consumidor puede distinguir los dos casos |
| 5.3 | No tragar el fallo de persistencia PG: devolver el estado de persistencia al cliente | HALL-21 | El cliente sabe si quedó persistido |
| 5.4 | Escribir el estado del multiagente de forma atómica (`tmp` + `os.replace`) y envolver la lectura en `try/except JSONDecodeError` | HALL-23 | Un JSON truncado no produce 500 |
| 5.5 | Marcar todo truncamiento en el payload (`truncado: true`, `total`, `entregados`) | HALL-34 | El consumidor sabe que ve una muestra |
| 5.6 | Corregir la traza: `estado` real del nodo, `razonamiento` real o renombrado a `motivo_de_salto` | HALL-45 | La traza refleja fallos |
| 5.7 | Añadir `version_metodologica` y `fingerprint` a la clave de la caché en disco de inteligencia tríada; invalidar por versión de corpus | HALL-22 | Una ingesta nueva invalida el resultado |
| 5.8 | Purgar `_RESULTS` expirados y acotar su tamaño | HALL-P3-05, HALL-42 | La caché no crece indefinidamente |
| 5.9 | Fijar `ORDER BY` en la consulta que alimenta `_candidato_vigente` | HALL-40 | El emparejamiento es determinista |
| 5.10 | Exponer el grafo supervisor por REST, o documentar explícitamente el flujo CLI como la única vía de HITL | HALL-53 | El operador sabe cómo despachar una revisión |
| 5.11 | Añadir `timeout` y `statement_timeout` a las 6 tools SQL | HALL-29 | Las consultas acotadas no bloquean la conexión |

### Bloque 6 — Higiene de datos y coherencia de contrato

| # | Acción | Hallazgo |
| --- | --- | --- |
| 6.1 | Unificar los 3 parsers numéricos en un módulo común con una sola regla de coma decimal | HALL-37 |
| 6.2 | Corregir `_corte` para que "diciembre" sea `T4` y no `ANUAL`; alinear `_corte_rank` con el formato `1T` | HALL-35, HALL-P3-04 |
| 6.3 | Usar límites de palabra en el regex de `_vigencia` y resolver por contexto, no por posición | HALL-36 |
| 6.4 | Registrar en el resultado del mapeo las columnas duplicadas descartadas | HALL-38 |
| 6.5 | Acotar `_es_pie_o_subtotal` a las filas de plantilla (posición, formato), no al contenido textual | HALL-39 |
| 6.6 | Hacer invariante la huella tabular ante reordenamiento de filas | HALL-25 |
| 6.7 | Corregir el dedup por contenido clonado para que no dependa del orden de llegada | HALL-24 |
| 6.8 | Aplicar los filtros de `vigencia`/`entidad` también al query de lotes; hacer `LIMIT` parametrizable | HALL-41 |
| 6.9 | Ampliar el conjunto de marcadores inválidos de `_clave_valida` e incluir `codigo_meta_pdd` en la clave | HALL-P3-01, HALL-P3-02 |
| 6.10 | Permitir re-ingesta del mismo archivo para otro corte | HALL-P3-03 |
| 6.11 | Unificar la política de degradación de modelo (`POLIS_IA_MODO = real\|simulado`) y remover o invocar `self.agent` | HALL-31, HALL-32 |
| 6.12 | Corregir la metadata `"framework_agentes": "PydanticAI"` del endpoint de estado de M1 | HALL-31 |
| 6.13 | Exigir `costo_estimado` (sin default de 1.5 billones) o marcar el default como tal | HALL-50 |
| 6.14 | Cota de tamaño para `historial_estados` y `bitacora_mensajes`; registrar duraciones | HALL-52 |
| 6.15 | Derivar `actor_id` del rate limiter de un token verificado, no de los últimos 16 caracteres del header | HALL-51 |
| 6.16 | Añadir `FOR UPDATE` o advisory lock al bind de corrida | §6.4 (F9) |
| 6.17 | Extender `test_transaction_policy.py` a `pdt_persistencia_pg.py` y `orquestador_grafo.py` | HALL-26 |
| 6.18 | Filtrar por nivel **antes** de construir los 4 niveles DEA; cachear `_consultar_insumos_bd_csh()` por fingerprint | HALL-18, HALL-47 |
| 6.19 | Invalidar `_CACHE_NIVEL3_*` por fingerprint de fuentes, no por cardinal de DMUs | HALL-19 |

---

## 13. Cierre

Este documento describe **comportamientos observables en el código** en la
referencia `cc221308b31dcae9e130766cb4b787ea7e70340e`, con un árbol de trabajo
que contiene cambios sin commit. Las propuestas son recomendaciones de diseño;
ninguna ha sido implementada ni verificada en ejecución salvo donde se marca
**[V]** con evidencia empírica.

Las divergencias entre este documento y
[revision_motores_18_10_2026.md](revision_motores_18_10_2026.md) están
documentadas en §8 con la evidencia que las sustenta, para que la remediación
no se dirija a defectos que no existen.

**No se ejecutó ninguna escritura en base de datos, ningún recálculo productivo
y ninguna suite de pruebas.** La certificación de atomicidad transaccional y
el dictamen EAF independiente quedan fuera del alcance de este documento.
