# Plan maestro v2 — Indicadores de Seguridad Humana para Cartagena (ejecutable desde el puente)

- **Reemplaza a:** `bridge/000_plan_maestro_indicadores_seguridad_humana_20261105.md` (v1, conservado como visión).
- **Fecha:** 2026-11-05 · **Estado:** LISTO PARA EJECUCIÓN POR PAQUETES, sujeto a las decisiones D1–D5 (§3).
- **Regla general del puente:** cero `git commit`/`git push`; QA independiente posterior por `opencode`; evidencia en `bridge/`.
- **Cómo usarlo:** cada agente toma UN paquete (WP), lee solo su sección + §1, §2 y §4, y entrega en `bridge/000_WP<n>_entrega_<agente>.md`. Un WP no inicia si sus dependencias no tienen entrega aceptada.

---

## 0. Qué cambió respecto a v1 (hallazgos de calidad)

| # | Severidad | Defecto en v1 | Corrección en v2 |
|---|---|---|---|
| 1 | **Alta** | Las 7 dimensiones de v1 (Personal, Comunitaria, Económica, Ambiental, Alimentaria, Salud, Política) **no coinciden** con la taxonomía canónica del backend `seguridad_humana_7d_v6` (`PERS, COM, AMB, ECON, SALUD, POL, SAT`; SALUD = "Alimentaria y Sanitaria"; SAT = "Alertas Tempranas"). Alimentaria y Salud van juntas y falta SAT. | §1 fija el código canónico; v1 habría generado `dimension_id` incompatibles. |
| 2 | **Alta** | Ignora que **ya existe** gran parte de la Fase 0/1: banco de fuentes, parsers, series 7D, tabla `indicadores_territorio`, fichas técnicas e ingesta (ver §2). Riesgo de duplicar o chocar. | §2 inventario real; WPs extienden, no reconstruyen. |
| 3 | **Alta** | Supone pintar barrio/UCG, pero las fuentes públicas ingeridas son **municipales** (sin coordenadas ni UCG). Fases 3–4 eran inviables a esa escala. | §1-R3 y WP4/WP5: escala se decide por indicador; lo municipal se muestra como Distrito, sin ranking entre barrios. |
| 4 | Alta | "Cruces" (p. ej. pobreza × inseguridad alimentaria) sin advertir que a escala municipal son ~10 puntos anuales: correlaciones no defendibles. | WP4: cruces solo descriptivos/yuxtapuestos salvo escala común sub-municipal; prohibido lenguaje causal. |
| 5 | Media | Sin criterios de aceptación, comandos, archivos, dependencias, dueños ni formato de entrega. | Cada WP los trae. |
| 6 | Media | Meta "50–80 indicadores" sin criterio de factibilidad. | Tiers A/B/C (WP2); la meta se mide en indicadores *certificados*, no listados. |
| 7 | Media | Nada sobre honestidad de datos (no inventar valores, 0 vs nulo, provisionales). | §1-R1..R8 reglas duras. |
| 8 | Baja | Typo "Fuencia"; "Cobertura PAE por barrio" e "Índice de densidad institucional" sin fuente identificada. | Corregido; esos indicadores entran como Tier C (sin fuente verificada) hasta WP0 los resuelva. |
| 9 | Media | Tres conteos distintos del banco en el repo (ver §2) sin conciliar. | Tarea explícita en WP0. |

---

## 1. Reglas duras (aplican a todos los WPs)

- **R1 — Cero datos inventados.** Todo valor tiene `fuente_datos`, URL/archivo origen y SHA-256 de la extracción. Sin fuente verificable → no se inserta. Cifras ilustrativas están prohibidas en cualquier salida pública.
- **R2 — Nulo ≠ cero.** Dato ausente se guarda como ausencia (p. ej. IRV 2016 ya es "ausencia de dato"), nunca como `0`.
- **R3 — Escala honesta.** El `tipo_territorio` de cada observación es el de la **fuente**. Un valor municipal se asocia al territorio `distrito`; no se replica a barrios/UCG ni se usa para rankear territorios internos.
- **R4 — Taxonomía canónica.** `dimension` ∈ {`PERS`,`COM`,`AMB`,`ECON`,`SALUD`,`POL`,`SAT`} de `backend/app/modules/compromisos/taxonomia_7d_polis.py` (versión `seguridad_humana_7d_v6`). Prohibido crear códigos nuevos. Estados válidos de clasificación: `exacta`, `sin_clasificar`, `no_medible_con_esta_fuente`, `respuesta_publica`, `total_multidimensional`.
- **R5 — No comparar lo no comparable.** Universos distintos (p. ej. Policía vs Medicina Legal), trimestres móviles vs anual, o series con cambio de definición no se suman ni se grafican en el mismo eje sin nota.
- **R6 — Riesgo no evaluado.** Toda ingesta fija `nivel_riesgo='sin_evaluar'` (valor añadido en migración 0096). El default del modelo es `'medio'`: **no** confiar en él.
- **R7 — Sin causalidad.** Textos de UI/documentos usan "se observa", "coincide con", "yuxtapone". Prohibido "causa", "explica", "genera".
- **R8 — Publicación condicionada.** El estado por defecto es `no_publicable`. Solo pasa a publicable un indicador que apruebe el certificador (WP6). Esto reemplaza la "regla de oro" de v1 y la hace verificable.

**Certificación (los 7 criterios de v1, hechos medibles):** (1) fuente verificable con URL y SHA; (2) `tipo_territorio` explícito; (3) periodo/corte explícito y tipo (anual / trimestre móvil / acumulado); (4) unidad definida; (5) fórmula reproducible con script y denominador; (6) justificación metodológica y riesgo; (7) linaje: fila ↔ archivo ↔ extracción.

---

## 2. Línea base real del repositorio (verificada 2026-11-05; no reconstruir)

| Activo | Ubicación | Notas relevantes |
|---|---|---|
| Banco de fuentes oficiales | `data/banco_fuentes_oficiales/` (`README.md`, `catalogo.csv`, `MATRIZ_ECOSISTEMA_FUENTES_CARTAGENA_2026.md`, `cartagena_seguridad_humana.sqlite`) | 28 fuentes. DANE (NBI, GEIH, SAE, IPC), Medicina Legal, Policía vía datos.gov.co, TerriData, RUV, IRV, ICBF, Procuraduría PQRSDF, SAT Defensoría. Fiscalía SPOA: HTTP 403 desde este entorno. **Casi todo a escala municipal.** |
| Series 7D | `data/capas_analiticas/indicadores_7d/` (jsonl + manifest) | Esquema `polis.indicador_7d.v1`; 2.340 filas; `estado_publicacion: no_publicable`; 522 `sin_dimension`; manifiesta colisiones (1 con valores contradictorios). |
| Ingesta a BD | `backend/scripts/ingestar_fuentes_geovisor.py` (ENCARGO-249) | Idempotente (`ON CONFLICT DO UPDATE`) sobre `geodatos.indicadores_territorio`; registra 6 capas. |
| Tabla de indicadores | `geodatos.indicadores_territorio` (`backend/app/modules/geodatos/models.py`) | Único `(territorio_id, codigo_indicador, anio_corte)`; `metadatos` JSONB; **no tiene** columna de periodo/escala/estado. |
| Fichas técnicas | `indicadores.fichas_tecnicas_indicadores` (`backend/app/modules/indicadores/models.py`) | `linea_base_valor`, `linea_base_anio`, `meta_cuatrienio` son **NOT NULL**: no admiten indicadores sin meta. |
| Territorios | `geodatos.territorios` | `tipo_territorio` ∈ distrito, localidad, unidad_actuacion_comunera, barrio, corregimiento, zona_insular. |
| Sub-municipal existente | `geodatos.poligonos_analitica_hurtos`, `geodatos.estadisticas_hurtos` | Único activo sub-municipal detectado (hurtos); WP0 debe verificar su origen y licencia. |
| Parsers TerriData/ficha | `backend/app/modules/compromisos/parser_terridata_polis.py`, `ficha_territorial_polis.py` | Reutilizar. |
| Catálogo identidad territorial | `bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json`, `knowledge-base/barrios_cartagena.json` (205 unidades POT) | Base para normalizar `territorio_id`. |
| Migraciones | `backend/alembic/versions/` — cabeza actual **0096** | Próxima: **0097**. |
| Pruebas relacionadas | `backend/tests/test_geodatos_fuentes.py`, `test_taxonomia_7d_polis.py` | Extender, no reemplazar. |

**Inconsistencia a resolver en WP0:** el README dice "28 fuentes y 1.488 observaciones"; el docstring de la ingesta dice "28 datasets, 2.340 observaciones"; el manifiesto 7D dice 2.340 filas. Pueden ser capas distintas (SQLite vs series 7D) pero no está documentado.

---

## 3. Decisiones previas — **RESUELTAS 2026-11-05 (D1a, D2a, D3 Sí, D4 Sí, D5 Planeación revisor / Coordinación custodio). Ver `bridge/000_WP1_decisiones.md`.** La tabla se conserva como contexto.

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | ¿Cómo representar periodo y escala si el índice único es `(territorio, código, año)`? | (a) migración 0097 con columnas `periodo`, `tipo_periodo`, `estado_publicacion`; (b) codificar en `codigo_indicador` y `metadatos` sin migrar | (a) — evita colisiones (trimestre móvil vs anual) y hace auditable R8. |
| D2 | Indicadores sin línea base/meta, ¿dónde viven? | (a) tabla nueva `catalogo_indicadores`; (b) relajar NOT NULL en fichas | (a) — no contaminar el seguimiento de metas del PDD. |
| D3 | ¿Se publicarán series municipales en el Geovisor? | Sí como capa "Distrito" / No hasta tener UCG | Sí, rotuladas "dato municipal", sin coropleta por barrio (R3). |
| D4 | ¿Se solicita acceso institucional (Policía/Fiscalía) para desagregación UCG? | Sí / No | Sí: es la única vía a mapas sub-municipales de delito. Tarea humana, fuera del alcance de agentes. |
| D5 | Dueño del catálogo tras la entrega | Coordinación / Planeación Distrital | Definir para revisión metodológica (WP6). |

---

## 4. Paquetes de trabajo

```mermaid
flowchart LR
  WP0[WP0 Línea base y conciliación] --> WP1[WP1 Decisiones D1-D5]
  WP0 --> WP2[WP2 Catálogo de indicadores]
  WP1 --> WP3[WP3 Migración e ingesta]
  WP2 --> WP3
  WP3 --> WP4[WP4 Cruces descriptivos]
  WP3 --> WP5[WP5 Geovisor]
  WP4 --> WP6[WP6 Certificación y QA]
  WP5 --> WP6
```

> **Dependencia externa:** WP5 depende del Encargo 291 (frente 1, capas dinámicas en `use-mapa.ts`, `ollamacodex`). No iniciar WP5 hasta que 291 entregue, para no pisar los mismos archivos.

### WP0 — Línea base y conciliación (solo lectura; perfil: analista de datos)
- **Entradas:** §2.
- **Pasos:**
  1. Contar filas reales: `sqlite3 data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite "select count(*) from fuentes; select count(*) from observaciones;"` y filas de `geodatos.indicadores_territorio` (consulta de solo lectura, por `codigo_indicador` y `anio_corte`).
  2. Documentar la diferencia 1.488 / 2.340 y qué capa es cada una.
  3. Tabla de cobertura: por fuente → `tipo_territorio` real, años, dimensión, estado, licencia, custodio.
  4. Verificar origen y licencia de `poligonos_analitica_hurtos` / `estadisticas_hurtos`.
  5. Resolver las 522 filas `sin_dimension` y la colisión con valores contradictorios (listar; no corregir sin R1).
- **Salida:** `data/capas_analiticas/catalogo_indicadores/00_linea_base.md` + CSV de cobertura.
- **Aceptación:** conteos reproducibles con el comando anotado; cada fuente del catálogo tiene fila de cobertura; ningún dato modificado (verificar `git status` sin cambios en `data/banco_fuentes_oficiales/`).

### WP1 — Decisiones D1–D5 (perfil: coordinación)
- Registrar respuesta de cada decisión en `bridge/000_WP1_decisiones.md`. Sin esto WP3 no inicia.

### WP2 — Catálogo de indicadores (perfil: analista metodológico)
- **Entradas:** WP0, `knowledge-base/08_SISTEMA_INDICADORES_MONITOREO_Y_EVALUACION.md`, taxonomía 7D.
- **Pasos:**
  1. Crear `data/capas_analiticas/catalogo_indicadores/catalogo.csv` con columnas: `codigo, nombre, dimension, definicion, formula, numerador, denominador, unidad, tipo_territorio_fuente, periodicidad, tipo_periodo, fuente, url_fuente, custodio, licencia, anio_base, interpretacion, riesgo_metodologico, tier, estado`.
  2. `tier`: **A** = fuente ya ingerida y verificable; **B** = fuente pública identificada, no ingerida; **C** = sin fuente verificada (p. ej. cobertura PAE por barrio, densidad institucional). Los de v1 se clasifican, no se descartan.
  3. Fórmulas con denominador explícito (población DANE por año y su proyección); tasas por 100.000 hab. citan la serie de población usada.
  4. Escribir `scripts/validar_catalogo_indicadores.py` que falle si: dimensión ∉ taxonomía, falta fuente/URL/unidad/fórmula, `tier=A` sin dato en banco, o código duplicado.
- **Aceptación:** `backend/.venv/bin/python scripts/validar_catalogo_indicadores.py` sale con código 0; todo `tier A` mapea a filas reales del banco; cobertura por dimensión reportada (no se exige 50–80 indicadores: se reporta cuántos A/B/C hay por dimensión y se marcan las dimensiones sin Tier A).

### WP3 — Migración e ingesta (perfil: backend)
- **Depende de:** WP1, WP2.
- **Pasos:**
  1. Según D1/D2: `backend/alembic/versions/0097_<nombre>.py` con `upgrade()` y `downgrade()` limpios; sin borrar datos.
  2. Extender `backend/scripts/ingestar_fuentes_geovisor.py` (o script nuevo) para cargar catálogo + observaciones: idempotente, `nivel_riesgo='sin_evaluar'` (R6), territorio = `distrito` para fuentes municipales (R3), `estado_publicacion='no_publicable'` (R8).
  3. Pruebas en `backend/tests/` (extender `test_geodatos_fuentes.py`): idempotencia (correr 2 veces = mismas filas), rechazo de dimensión inválida, nulo no se vuelve 0, trimestre móvil no colisiona con anual.
- **Comandos:** `uv run --project backend alembic upgrade head` y `downgrade -1` y `upgrade head` otra vez; `uv run --project backend pytest backend/tests/test_geodatos_fuentes.py backend/tests/test_taxonomia_7d_polis.py -q`.
- **Aceptación:** upgrade/downgrade/upgrade sin error; pytest en verde; segunda ejecución de la ingesta no cambia el conteo; informe con conteos antes/después.

### WP4 — Cruces descriptivos (perfil: analista + backend)
- **Depende de:** WP3.
- **Regla:** un cruce solo existe si ambas variables comparten `tipo_territorio` y periodo. A escala municipal es **yuxtaposición de series** (sin coeficientes de correlación ni "hallazgos"); sub-municipal solo donde WP0 confirme escala común.
- **Pasos:** definir en `data/capas_analiticas/catalogo_indicadores/cruces.csv` cada cruce con: variables, escala, periodo común, n de observaciones, advertencia obligatoria. Implementar el cálculo con `n` visible; si `n < 8` marcar "insuficiente para inferencia".
- **Aceptación:** cada cruce lista `n` y escala; ningún texto generado contiene verbos causales (prueba automática con lista de términos prohibidos de R7).

### WP5 — Geovisor (perfil: frontend)
- **Depende de:** WP3 y Encargo 291.
- **Pasos:** exponer indicadores `publicable` vía API existente de `geodatos`; capa "Dato municipal" como tarjeta/serie temporal (no coropleta, R3); selector por dimensión con los 7 códigos canónicos; la ficha del indicador muestra fuente, corte, unidad, fórmula, escala y SHA.
- **Aceptación (frontend):** `node scripts/ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores), tests nuevos del selector y de la ficha, `node scripts/build-polis.mjs` OK, `systemctl restart polis-frontend`, y captura de pantalla de la capa en `/geovisor`.

### WP6 — Certificación y QA (perfil: auditor; `opencode`, independiente de quien implementó)
- **Pasos:**
  1. `scripts/certificar_indicadores.py`: evalúa los 7 criterios de §1 por indicador y emite `certificacion.csv` con `aprobado/rechazado` y motivo.
  2. Solo los aprobados pasan a `estado_publicacion='publicable'` (actualización explícita, no automática).
  3. Informe de linaje: muestra aleatoria de 20 filas rastreadas hasta archivo y SHA.
  4. Barrido de contenido: ningún documento/UI publicado contiene cifras sin fuente (incluidos los PDF de la caja de herramientas; ver §6).
- **Aceptación:** `certificacion.csv` reproducible; 0 indicadores publicables con criterio fallido; informe de linaje 20/20 rastreables.

---

## 5. Formato obligatorio de entrega por WP (`bridge/000_WP<n>_entrega_<agente>.md`)

1. Alcance ejecutado y **lo NO ejecutado** (con motivo).
2. Archivos creados/modificados (rutas).
3. Comandos ejecutados con salida resumida (aceptación, no solo "pasó").
4. Conteos antes/después cuando toque datos.
5. Riesgos y supuestos abiertos.
6. Confirmación: sin commit/push; sin modificar `data/banco_fuentes_oficiales/` salvo WP autorizado.

## 6. Riesgo conocido fuera de este plan

Los documentos de la caja de herramientas (`public/docs/*.pdf`, generados por `scripts/generar_toolbox_completa_pdf.py`) y la presentación contienen cifras ilustrativas **sin fuente** (p. ej. desempleo juvenil 28,4 %, inseguridad alimentaria 38 %, tasa de homicidios 32,1, 68 puntos de inundación, metas 2027). Incumplen R1/R8. Deben sustituirse por cifras certificadas de este plan o rotularse como ilustrativas antes de difundirse. Se registra aquí para que WP6 lo verifique.
