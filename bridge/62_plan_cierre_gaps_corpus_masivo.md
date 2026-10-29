# Plan de cierre de gaps — corpus masivo y motores del P0 de datos (24-10-2026)

**Origen:** cierre de la jornada del conciliador (`bridge/60` §5, `bridge/61` §4).
Este plan cataloga **todos los gaps conocidos** al 24-10-2026 con su
diagnóstico real, pasos, criterios de aceptación y responsable. No se ejecuta
nada en esta sesión de redacción: cada ítem se arranca por decisión de
producto.
**Base de referencia:** `polis_test_verd_20261024` (DSN en `/tmp/base_fresca.dsn`).
**Estado de partida:** suite del módulo del conciliador 49 passed; tests 1 y 2
de la remisión EAF PASSED; otros 2 fallos de la relanzada catalogados abajo
(gap A pendiente, metas 4637 ya verde).

## 1. Gaps catalogados

| Gap | Diagnóstico real (24-10) | Impacto para formular política | Severidad | Responsable |
| --- | --- | --- | --- | --- |
| A. Econometría espacial sobre territorios | Test `test_postgis_bd_csh_29_territorios_multipolygon_y_116_indicadores` FAILED: `spatial_res["n"] = 24 < 29`. La econometría espacial solo procesa 24 territorios sobre la base fresca (el resto del entrenamiento: `assert estado == "ESTIMADO_GEOPANDAS_LISA"` SÍ pasa, es el conteo el que cae) | El nodo espacial predictivo queda sub-cubierto: 5 territorios o UCGs fuera del LISA/DEA; cualquier recomendación territorial se calcula con mapa incompleto | media-alta | EDD |
| B. Paridad de cifras con bd_csh | Fresco: 248 apropiación / 415 avance / 110 ceros / 1.622 bloqueados por guardia / 2.533 huérfanos. bd_csh (histórico): 3.539 apropiación / 1.645 ceros | Formular política sobre planes 2020+ quedó servible; la guardia (del test congelado) anula Both a cifra y cero en vínculos que comparten BPIM|vigencia — pérdida visible que exige dossier cuantitativo antes de decidir reparto | media | EDD → EAF (decisión) |
| C. Corpus observacional 2012–2015 inexistente | PDD_2012_2015 (469 metas) y PDD_2013_2015 (676 metas) 100% huérfanos: el corpus masivo Drive no trae registros de esas vigencias; posible en corpus local (paso 4 de `bridge/60` §1) sin cifras | El motor no imputa (correcto), pero planear políticas para ese cinturón de planes no tiene base observacional | media (decisión de producto) | Producto (¿nuevas fuentes?) |
| D. Dictamen EAF de `bridge/61` remitido | Tests 1 y 2 hoy PASSED; preguntas 1–2 perden premisa; queda validar la guardia de provenancia redeclarada del test 4637 | Sin dictamen no hay autorización de despliegue del módulo corregido; los checks verdes no sustituyen al dictamen (independencia de roles) | alta (blk de proceso) | EAF |
| E. Guardia de pre-condición en tests 1 y 2 | Los tests 1 y 2 pasan cuando el corpus está provisionado; sin pre-condición `count(registros_triada) >= N` no distinguen "corpus ausente" de "pérdida regresiva de ceros" | Fragilidad de regresión: un reprovision a mitad de camino puede volver a pintar FAILED engañoso | baja-media | EDD |
| F. Check integral backend + commit | Sin `bun run backend:check` corrida en esta jornada; sin commit del cambio del motor (el workdir queda con cambios sin commitear; sin push ni despliegue) | Riesgo de divergencia del workdir frente a main; el dictamen EAF puede pedir el artefacto commiteado | media | EDD |

## 2. Orden de arranque propuesto (V1 determinista primero)

**Paso 1 (gap A):** en la base fresca, medir `geodatos.territorios` (conteo de
territorios sub-distritales, UCGs, validación `ST_MultiPolygon`) y el listado
de `geodatos.indicadores_territorio` (>= 116); contra el resumen del
poblador `poblar_geodatos_territorios_pdt.py`. Distinguir: (a) faltan
territorios en la base → reprovisionar geodatos; (b) están pero la consulta
de la econometría los filtra → corregir el filtro del nodo.
**Criterio de aceptación:** el test de territorios verde en la base fresca con
`n >= 29`, polígonos reales >= 29, 4 indicadores evaluados.

**Paso 2 (gap E):** añadir fixture de pre-condición a los tests 1 y 2
(`count(registros_triada_normalizados) >= umbral` documentado) antes de
asertar ceros; el umbral se fija con la medición real (110 ceros hoy) y el
test falla con mensaje explícito si el corpus no está.
**Criterio:** los dos tests fallan con causa legible en base vacía, y verdes
con corpus completo; ninguna aserción se debilita.

**Paso 3 (gap F):** `bun run backend:check` y la suite de corpus completa
(/tmp/corpus_relanzo.log refs) en la base fresca; bitácora limpia; preparar
commit único del motor corregido (solo backend/app/modules/compromisos/ +
tests) cuando producto lo apruebe. Sin push ni despliegue.
**Criterio:** `backend:check` verde, suite de corpus 0 failed sobre base
fresca, y commit listo a esperar el dictamen.

**Paso 4 (gap B):** dossier cuantitativo para EAF: por plan, metas con cifras
válidas / bloqueadas por fuente compartida (con la lista de grupos de BPIM
repetidos y su departamento de origen) / huérfanas; propuesta alternativa de
**reparto acreditado** ( conserva la observación apenas una vez por BPIM|vigencia y
asigna el resto con cero preservado) frente a la anulación integral vigente.
**Criterio:** la decisión de producto queda documentada en el expediente EAF y
el motor implementado la alteración acordada (con test que la congele).

**Paso 5 (gap C):** decisión de producto sobre fuentes observacionales
2012–2015 (nuevas carpetas de Drive, corpus local, o aceptar el gap
documentado en el manifiesto); si hay corpus, correr pipeline reprovision +
conciliador y actualizar `bridge/60` §5.
**Criterio:** o PDD_2012/2015 con cifras y ceros preservados verificables, o
gap aceptado por escrito con impacto declarado.

## 3. Fuera de alcance de este plan

- No se tocan bd_csh ni producción; todas las corridas son en `polis_test*`.
- No se reescribe ninguna guardia de imputación sin dictamen EAF (gap B y D
  van juntos: decisión independiente antes de implementar).
- El gold set no se re-muestrea (semilla reproducible; procedencia inalterada).
