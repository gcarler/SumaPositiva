# Rúbrica de anotación del gold set de conciliación — 2026-10-22

Documento normativo del aparato de medición de precisión del conciliador de
vínculos meta–actividad (módulo
`backend/app/modules/compromisos/gold_set_conciliacion.py`, tabla
`seguimiento.conciliador_gold_set`). Regula la doble anotación humana, la
adjudicación y la lectura de las métricas. Emite instrucciones; es la fuente de
requisitos para las pruebas del flujo (como las fuentes normativas del AGENTS.md).

Alcance del muestrario vigente `gold-set-2026-10-21`: **240 pares** (180
positivos, 60 negativos). Cambiarlo exige nueva corrida con semilla documentada
y corrida en la bitácora 0070; no se recalcula el de otro lote.

---

## 1. Qué anota el anotador

El anotador juzga **una única pregunta por fila**: *¿esta actividad del Plan de
Acción es un vínculo correcto de esta meta del Plan de Desarrollo?* — leyendo
**solo** lo que trae el CSV a ciegas:

| Columna | Uso permitido |
| --- | --- |
| `id_par` | Identificador del par (alias `GP-…`); copiar tal cual |
| `codigo_plan`, `codigo_meta`, `nombre_meta` | Contenido de la meta |
| `codigo_actividad`, `meta_producto` | Contenido de la actividad |
| `etiqueta_enviada` | **Sí**: aquí escribe una etiqueta de la Escala (§2) |

Prohibiciones:
- No buscar ni consultar la base de datos de vínculos del conciliador ni el
  artefacto JSON del muestrario (contienen la clasificación del sistema): la
  anotación a ciegas pierde validez si el juez ve la etiqueta reclamada.
- No discutir casos con el otro anotador **durante** la anotación (el acuerdo
  posterior se mide con kappa; el debate previo lo infla artificialmente).
- No anotar sin la fuente oficial a la mano (PDD vigente y PA multiformato del
  mismo periodo en el banco de fuentes).

## 2. Escala de etiquetas (una sola por fila)

| Etiqueta | Qué significa | En caso de duda |
| --- | --- | --- |
| `VINCULO_CORRECTO` | La actividad contribuye **directamente** al indicador/propósito de la meta: trabajando sobre la actividad razonablemente se mueve el indicador de la meta | — |
| `VINCULO_INCORRECTO` | La actividad pertenece a otra meta, toca un tema distinto, o el aporte es inexistente | — |
| `NO_EVALUABLE` | No es posible emitir juicio con la información disponible: texto ambiguo, meta duplicada, actividad sin dimensión, vocabulario ilegible | **Usar `NO_EVALUABLE`; jamás adivinar.** Los NO_EVALUABLE se excluyen de la precisión y se reportan |

La duda conservadora (`NO_EVALUABLE`) es un hallazgo, no un fracaso: un
porcentaje alto de NO_EVALUABLE descubre dónde hay texto ilegible en los planes.

## 3. Criterios de decisión

Se juzga la **relación meta ↔ actividad**, no la calidad del documento ni la
bondad de la actividad (si una actividad es buena o factible es irrelevante;
solo importa si corresponde a esa meta).

1. **Objetivo del vínculo**: la actividad, con su producto/meta producto,
   apoya el indicador (no meramente el eje o el programa de la meta).
2. **Fuente de verdad**: si nombre_meta e indicador_meta divergen, decide el
   indicador.
3. **Aporte indirecto NO cuenta**: iniciativas de mejora general (capacidades
   institucionales, modernización, participación) o de toda la entidad
   **no** hacen un vínculo correcto salvo que el indicador las incorpore.
4. **Contraste cuantificable**: exigir que la meta producto de la actividad
   converse con el indicador de la meta en la **misma dirección y sea
   cuantificable** en la misma unidad de medida.
5. **Pares negativos** (no vinculados por el sistema) se juzgan con la MISMA
   regla: si la actividad sí corresponde a la meta, es `VINCULO_CORRECTO` —
   eso es un falso negativo del conciliador y es exactamente lo que buscamos
   detectar. No penalizar por no estar vinculado: lo que cuenta es la
   etiqueta emitida (correcta/incorrecta), no el estado previo del vínculo.

## 4. Flujo de doble anotación

1. **Calibración**: los dos anotadores (jueces a y b) anotan primero el mismo
   lote de calibración de 20 pares y contrastan su kappa. Si es < 0,8,
   la rúbrica está incompleta: consensuar criterio con el coordinador y
   reanotar el lote de calibración antes de continuar.
2. **Anotación individual**: cada juez llena su propia copia del CSV a ciegas
   (una etiqueta por fila en `etiqueta_enviada`).
3. **Importación** (operador): 
   `python backend/scripts/conciliador_gold_set.py importar --juez a|b --anotador NOMBRE --anotaciones CSV --persistir-url <URL>`
4. **Adjudicación**: los pares con desacuerdo quedan
   `requiere_adjudicacion`. Los resuelve el **adjudicador designado** — que
   puede leer la argumentación de los jueces pero **no** la etiqueta del
   sistema — registrando `etiqueta_adjudicada` y `adjudicador`.
5. **Métricas**: `metricas` publica precisión global y por tipo, recobrado
   estimado, kappa y desacuerdo. Se publican cuando los `requiere_adjudicacion`
   = 0 o se documentan los sin resolver.

## 5. Lectura honesta de resultados (regla de difusión)

- El **recobrado 1.0 del conciliador es por diseño** (una pareja por meta):
  las métricas del gold set no lo confirman; miden cuántos vínculos reales
  quedaron fuera (falsos negativos del muestreo negativo).
- Toda cifra difundida debe acompañar el tamaño de su muestra y, si la
  herramienta los publica, su intervalo de confianza; los estratos con pocos
  pares (p. ej. 1 solo par EXACTO_BPIM_PROYECTO) **no permiten comparar
  precisión por tipo**.
- El gold set no autoriza a cambiar el servicio en producción: la decisión de
  promover resultados es una puerta de calidad documentada que requiere el
  dictamen previo de las métricas; las reglas del servicio se cambian por el
  procedimiento de evolución, no por la anotación.

## 6. Integridad y huella de evidencia

- El artefacto JSON y la tabla `conciliador_gold_set` son registro primario:
  nadie edita las columnas `etiqueta_*` a mano en la BD; solo vía `importar`.
- Los artefactos de demostración o ensayo (etiquetas simuladas) viven en
  bases `polis_test*`, jamás mezclados con el muestrario vigente en `bd_csh`.
- El CSV entregable y las copias de los jueces se archivan como evidencia del
  muestrario; cualquier re-muestreo inicia un lote nuevo con otra semilla.

---

Fuentes normativas de este documento: `AGENTS.md` (reglas del proyecto),
`bridge/09_entrega_orquestacion_pipeline_datos.md` (§4/§9 del marco del
conciliador) y `docs/plan-trabajo.md` (sección «Gold set de conciliación con
doble anotación — 2026-10-22»).
