# Cierre técnico local · Ficha territorial y trazabilidad

26 de octubre de 2026. Coordinación revisó139/151, incorporó correcciones puntuales y reprodujo el conjunto dirigido. Estado: **validación técnica local superada; ficha provisional pendiente de semántica y condiciones de uso**. No equivale a integración productiva ni a dictamen EAF.

## Qué quedó corregido

- Fuente y unidad se conservan en sus campos correctos; los crudos mantienen espacios y trazas.
- El núcleo es puro; hashes de código se suministran como metadatos desde el CLI.
- Selección efectiva antes de resumir periodos; años no evaluables no satisfacen un filtro.
- Contadores cotejados contra contenido, órdenes únicos entre contexto/observaciones/excluidas, duplicados derivados de las observaciones y pertenencia a la serie contenedora exacta.
- Identidad parcial queda pendiente; se respetan niveles municipal/departamental declarados mediante el resolver134.
- Año fuera del patrón YYYY del parser se conserva sin convertirlo ni incluirlo en el resumen. Se reutiliza el patrón existente `\d{4}`, sin imponer una regla ASCII adicional.
- CLI distingue SHA de bytes del archivo de selección, SHA canónico del modelo y SHA de bytes finales de ficha; elaboración UTC explícita. Detalle154.

Se conservaron las versiones anteriores del CLI y núcleo/tests en149, además de139/151. Un primer test añadido por coordinación supuso que el año vacío quedaba retenido: el parser lo rechaza por campo obligatorio. Se corrigió la expectativa para verificar conservación del estado real del parser; no se relajó el parser. El XML de esa corrida fallida permanece en157.

## Verificación ejecutada

Dos corridas de los seis archivos dirigidos, con `--noconftest`, sin base de datos:

| Archivo de prueba | Casos |
| --- | ---: |
| conciliación retrospectiva | 72 |
| parser TerriData | 61 |
| adaptador catálogo | 16 |
| resolver territorial | 31 |
| ficha territorial | 42 |
| helpers CLI | 12 |
| **Total por corrida** | **234** |

Corrida final1:234 aprobadas,0 fallos/errores/skips,8,99s. Corrida final2:234 aprobadas,0 fallos/errores/skips,9,54s. XML `157_pytest_coordinacion_final_1.xml` y `157_pytest_coordinacion_final_2.xml`. Ruff check y format --check:exit0 en14 archivos del bloque. No se ejecutó la suite general del repositorio.

Freebuff reprodujo12 casos del CLI dos veces (159). OpenCode reprodujo42 casos de ficha y cotejó los pilotos finales (163). Son comprobaciones técnicas de alcance delimitado.

## Pilotos finales cotejados fila a fila

Captura ZIP75 y catálogo128, con código congelado. Cada piloto cotejó las12.899 filas contra JSONL118: cero diferencias en los campos contrastados, crudos/estados conservados y disposición sin pérdidas ni órdenes repetidos.

| Piloto | Contexto | Observaciones | Excluidas | Series | Identidad |
| --- | ---: | ---: | ---: | ---: | --- |
| Completo | 102 | 12.797 | 0 | 1.423 | encontrado13001 |
| Filtro2020 | 102 | 900 | 11.897 | 889 | encontrado13001 |

El completo conserva2 grupos de celdas duplicadas; no escoge ni promedia sus valores. El filtrado solo contiene observaciones2020; el contexto documental se conserva fuera de la serie temporal.

Artefactos en `157_validacion_coordinacion_ficha_final/`: ambos `ficha.json`, manifiestos, selecciones y `validacion.json`. SHA ficha completa:`19e06b4112ca576a25fa31d3deee55d2a5efccac2c2ca9ed43fc7fc407d41f80`; filtrada:`1fc1e9868a523d70b3f041cf066d1b12d493e107175e1ed0f2258c873e572915`.

El piloto completo151 registra un CLI intermedio con SHA44400495…; el filtrado151 registra7773e7a3…. Se conservaron ambas ejecuciones históricas. Los dos pilotos157 se regeneraron con el mismo CLI final7773e7a3… y núcleo7c3dd720…, comprobando que el código no cambiara durante la ejecución.

## Perfil demográfico y revisión territorial

Se reprodujeron354 series/5.835 filas y6.018 comparaciones de campos por serie sin diferencias, con0 duplicados en ese subconjunto (141/148 y `149_reproduccion_coordinacion_perfil_demografico.json`). Las74 filas retenidas carecen de valor; no son errores de formato decimal. El literal de migración es PEP. Etiquetas de fuente distintas no acreditan instituciones independientes. Base censal, naturaleza y edición quedan pendientes cuando no hay evidencia primaria.

134/143 revisan el resolver territorial. Sus31 pruebas y hashes se comprobaron, y las afirmaciones documentales se precisaron en146: el homónimo13601 es sintético, existe strip en los modelos, el estado se calcula por la función y no hay un JSON Pointer específico por registro. No aparece un defecto nuevo del resolver en las pruebas de integración de ficha. Esas revisiones no son dictámenes de usuarios/login.

## Alcance pendiente y siguiente trabajo

- Validación semántica de productos, bases/ediciones, denominadores y condiciones de uso.
- Adquisición y cotejo en otros territorios:160/161; requiere distinguir discrepancias de nombres y de códigos antes de aceptar los resultados.
- Integración real con planificador/motores/agentes, persistencia histórica PostgreSQL y exportadores conforme al plan76.
- Las nuevas revisiones EAF de GO-LIVE se asignan mediante encargos propios de identidad y persistencia/aportes; no se infiere su aprobación desde este bloque puro.

Evidencia consolidada y hashes completos de14 archivos: `157_evidencia_coordinacion_cierre.json`. Rama observada:`remediacion/aud-2026-10-21`, HEAD07096bcd73531415d8b8329a8aba0ad64fa5d23c, con árbol de trabajo compartido y cambios sin commit. No se cambió de rama ni se hizo commit/push/despliegue. Sin cambios de coordinación en src ni banco; las pruebas de este bloque no usaron SQL.
