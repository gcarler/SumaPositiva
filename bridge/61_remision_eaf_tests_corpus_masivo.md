# Remisión a EAF — Tests dependientes del corpus masivo (24-10-2026)

**Origen:** EDD (provisionamiento del corpus fresco, `bridge/60`) remite para
**decisión de producto + dictamen independiente** el estatus de 3 pruebas que
fallan o quedan sin ceros cuando la base `polis_test*` se provisiona de nuevo,
aunque el corpus masivo del repositorio de Drive del sector seguridad ya esté
provisionado.
**Alcance:** clasificar esas pruebas (unitarias vs integración exclusiva del
flujo canónico desalineado) y la cobertura sustituta que se exige mientras la
base `polis_test*` no reproduzca el estado de bd_csh. No se modifica ni
reescribe ningún assert en esta sesión.

## 1. Las 3 pruebas y su estado medido hoy en `polis_test_verd_20261024`

| # | Prueba | Assert en cuestión | Estado en la re-corrida del 24-10 (corpus masivo ya reprovisionado por Drive) |
| --- | --- | --- | --- |
| 1 | `test_preservacion_estricta_ceros_observados_vs_none_en_8_planes` (`test_pdt_normalizador_y_vinculos_8planes.py`) | `ceros_observados_preservados_count > 0` en `seguimiento.pdd_vinculos_meta_pa_triada` | **FAILED** (0 filas con ceros preservados) |
| 2 | `test_conciliar_y_poblar_vinculos_meta_pa_triada_bd_csh` (`test_pdt_revision_por_meta.py`) | mismo motivo: `ceros_observados_preservados_count > 0` | **FAILED** (la conciliación sí llenó las 4.637 metas con la distribución por plan exacta; solo la banda de ceros y cifras cae a 0) |
| 3 | `test_evaluar_universo_sispt_dnp_bd_csh_4637_metas_8_planes` (`test_pdt_sispt_dnp_evaluador.py`) | evaluar 4.637 metas sobre el universo triada | **PASSED** (tras el reprovisionamiento por Drive; solo había fallado con la base a mitad de provisioning) |

**Contexto de la medición:** el reprovisionamiento por Drive corrió completo
(`bridge/60` §4): 1.305 Excel del catálogo (621 libros únicos por sha256),
211.387 registros triada persistidos en la base fresca, con cifras presentes
(61.894 filas con apropiación, 82.087 con avance).

**Hipótesis EDD (a validar) — REFUTADA por medición del mismo día:** los ceros
observados preservados no nacen del corpus masivo. Con el corpus masivo en la
base fresca, el conciliador dejó `ceros_observados_preservados_count = 0` y
`metas_con_apropiacion_cop = 0`, mientras bd_csh conserva 1.645 vínculos con
ceros y 3.539 con apropiación (estado histórico del flujo canónico
desalineado). El corpus y las cifras están; el eslabón que los traslada a
`pdd_vinculos_meta_pa_triada` no es reproducible hoy con los motores
actuales: `poblar_motor_plan_accion_real.py` exige exactamente 29 entidades
de su mapeo curado (la base bd_csh quedó con 181 filas PA históricas) y el
vínculo con cifras de bd_csh proviene de ese flujo, no del corpus Drive
ingerido por el motor masivo.

## 2. Preguntas al dictamen EAF

1. ¿Se declaran los tests 1 y 2 **integración exclusiva del flujo canónico
   desalineado**, con skip declarado y causa explícita ("requiere el estado
   bd_csh construido históricamente; el flujo masivo no lo reproduce"), de
   modo que corran solo contra base con estado canónico y queden
   documentados como no reproducibles en `polis_test*` fresca?
2. ¿Qué guardia adicional piden antes de asertar ceros, para distinguir
   "corpus ausente" de "pérdida regresiva de ceros"? (p. ej. pre-condición
   `count(registros_triada) >= N` o salto explícito cuando el provisioning
   sea solo-local.)
3. ¿El test 3 (SisPT, PASSED hoy sobre corpus masivo fresco) se consolida
   como el test reproducible del universo triada, y la cobertura de
   "el código preserva ceros cuando existen" queda en las pruebas unitarias
   existentes (que sí reciben ceros) hasta que el flujo desalineado se
   alinee con el motor masivo?

## 3. Independencia

Remisión preventiva de EDD, que además ejecutó el provisioning y el
reprovisionamiento por Drive; los checks verdes (21 passed del gold set,
450/450 pares del CSV a ciegas, escalon con `ruff` limpio) son evidencia
técnica, no dictamen EAF ni autorización de despliegue. La clasificación de
estas 3 pruebas y la decisión de declararlas integración exclusiva
corresponden a EAF.

## 4. Actualización del mismo día — motor del conciliador corregido (EDD)

Tras la remisión, la revisión del motor encontró y corrigió dos defectos
(detalles en `bridge/60` §5): (a) las cifras del registro pareado solo
llegaban a vínculos EXACTO, y (b) el corte `LIMIT 9000` del índice
`triada_dedup` excluía íntegro el corpus ANTES_2020.

**Estado re-medido en la base fresca:** tests 1 y 2 PASSED (ceros observados
preservados = 110; apropiación = 248; avance = 415 vínculos de 4.637).
Ya no se cumplen las premisas de las preguntas 1 y 2 (no hay banda de ceros a
0 en la base fresca): la clasificación como "integración exclusiva del flujo
canónico" pierde terreno, y el dictamen EAF puede orientarse a validar la
guardia de provenancia redeclarada del test 4637 (`bridge/60` §5) en lugar del
salto/skip que se pedía. La pregunta 3 (test SisPT como prueba reproducible
del universo triada) queda intacta. La Pills 24-10 y suite completa: 49 passed,
ruff limpio.

Los gaps que quedan (pre-condiciones de las preguntas 1–2, validación de la
guardia de provenancia, paridad bd_csh) tienen pasos, criterios de aceptación
y responsables en `bridge/62_plan_cierre_gaps_corpus_masivo.md`.

**Remitente:** EDD · **Base de pruebas:** `polis_test_verd_20261024`
**Sin commit, sin push, sin despliegue en la sesión.**
