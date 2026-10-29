# OL-CODEX-01 · Revisión e integración técnica por Codex

**Estado:** aceptada técnicamente como evidencia auxiliar de curación; validación
integral aprobada. Esta revisión de coordinación no es un dictamen EAF ni
revisión semántica independiente de los indicadores.

## Entregas y corrección de coordinación

Se revisaron la entrega original 20, el requerimiento de correcciones 21 y la
entrega corregida 22. Las salidas 20 y 22 se conservan sin alteraciones como
historial. El informe 22 corresponde a la implementación del agente; esta
revisión registra el contraste realizado por el coordinador.

R1 corrigió la lectura de bytes verificados, el confinamiento de rutas, la
validación de entradas y la protección de salidas existentes. Sin embargo,
introdujo un cambio no aceptable en la búsqueda: exigir tokens completos dejó
112 metas como `SIN_COINCIDENCIA` al no reconocer texto contiguo a delimitadores
de tablas Markdown. La búsqueda anterior ya era literal normalizada, no
aproximada. Esa reducción no era evidencia de ausencia documental.

Codex corrigió directamente el trazador y sus pruebas. La búsqueda vuelve a ser
por **subcadena literal NFC/casefold y espacios normalizados**, con comprobación
de que cada rango original reconstruye exactamente la consulta normalizada.
Los tokens solo ayudan a recuperar coordenadas; no imponen fronteras de palabra
ni eliminan puntuación. No se utiliza similitud aproximada.

## Resguardos verificados

- Los fragmentos se extraen de la coincidencia real; los contextos tienen hasta
  240 caracteres, incluidos los casos con prefijos largos y nombres extensos.
  Si la coincidencia completa excede el límite, se marca el recorte y quedan
  sus offsets completos para reconstruirla desde el documento verificado.
- NFC, caracteres combinantes y expansiones de casefold no se usan como si sus
  índices fueran índices del original. Los cortes no reconstruibles se
  descartan. Las posiciones de fin de línea se refieren a la última línea de la
  coincidencia, también cuando el nombre cruza un salto de línea.
- Se verifican symlinks tanto al resolver como al leer el documento. Una
  sustitución posterior de archivo no puede producir contexto bajo un SHA
  anterior.
- Las celdas CSV entrecomilladas conservan sus saltos de línea. Se preservan
  nulos de código, nodo, nombre de línea, fila e indicador desde el catálogo.
- Se rechazan salidas que apunten a entradas, dos salidas con la misma ruta,
  contenido preexistente diferente, directorios y symlinks rotos. Ambos
  destinos se comprueban antes de escribir por conflictos preexistentes.
  La creación usa modo exclusivo y no sobrescribe un archivo creado por otro
  proceso. Esto no declara una transacción atómica entre dos archivos ante
  fallos de disco o carreras posteriores a la comprobación.

## Resultado sobre los datos reales

El catálogo y los documentos originales permanecen sin cambios. Se procesaron
**140 IDs únicos** de cinco planes con seis documentos de origen y copias
idénticas verificadas por SHA. La nueva salida recupera:

| Resultado | Metas |
| --- | ---: |
| Coincidencia única | 56 |
| Coincidencias múltiples | 84 |
| Sin coincidencia | 0 |
| Indicadores acreditados | 0 |

Se reconstruyeron desde los bytes originales **3.827 coincidencias**, comprobando
para cada una su nombre normalizado, offsets originales, fragmento y contexto.
La coincidencia del nombre **no identifica ni acredita el indicador**. Los 140
registros mantienen `indicador=null` y `PENDIENTE_COTEJO_HUMANO`.

La salida corregida usa esquema `polis.trazador_indicadores_planeacion.v2` y
herramienta `OL-CODEX-01-R2_CODEX`. Los archivos vigentes se versionan aparte como v4, ligados al inventario corregido:

- `bridge/23_evidencia_codex_indicadores_v4.jsonl`, SHA
  `09a80a964b84db995d6f9e33f3b29cd7390915e7c2d84915005d222c21939318`.
- `bridge/23_resumen_codex_indicadores_v4.json`, SHA
  `6f9911844f2062fb4d6539658e6bda60ed0a35a0d5c2628cacfb9b905f924e29`.

Una segunda ejecución de la CLI conservó tanto los SHA como los tiempos de
modificación de ambas salidas. No reescribió las versiones 20 ni 22.

## Pruebas y alcance de integración

Ruff check y formato pasan en los tres archivos del trazador. **70 pruebas
dirigidas pasan**: 48 del trazador, 15 del catálogo por corte y siete del inventario. Incluyen la
regresión de delimitadores Markdown y las protecciones incorporadas por la
coordinación. La suite integral y su evidencia se detallan al cierre.

La integración consiste en disponer de una CLI offline reproducible y de
evidencia auxiliar de curación enlazada desde el seguimiento del plan. No se
añadieron rutas HTTP, tools a los agentes en producción ni nodos al supervisor.
No se modificaron el catálogo, los documentos originales, la base productiva,
el frontend ni el diagnóstico. No hubo commit, push ni despliegue.

El nuevo corte `1c162aa0-68a9-42db-baad-cd3a551bdd02` continúa ámbar/no publicable.
La evidencia del puente no es una nueva fuente oficial ni una acreditación
humana. Los restantes pendientes P2/P3 y de custodia/licencias siguen abiertos.

## Incidente de inventario operativo detectado en la validación integral

La primera pasada oficial terminó con **285 pruebas aprobadas y un fallo**:
`test_carga_real_no_duplica_y_no_promueve` rechazó el inventario porque el SHA
actual de `data/planes_desarrollo/checkpoints_pdt_ai_evaluator.json` difería
del registrado. La verificación actuó correctamente y no se desactivó. El
archivo tiene estado operativo mutable; no se restauró ni reescribió para
forzar una coincidencia con el pasado. No se atribuye el cambio a un actor
sin evidencia.

Se corrigió `scripts/inventariar_fuentes_polis.py` para excluir las rutas
operativas `data/planes_desarrollo/cache_*` y `checkpoints_*`. Una regresión en
`backend/tests/test_inventario_fuentes_polis.py` comprueba que cambiar un
checkpoint y un caché futuro no altera las entradas inventariadas.

El nuevo inventario inmutable **`f494ccdf035b6021914bd9f04d6d08cce836df72a8b69c77779798d9b6982b2c`**
contiene **1.820 artefactos y las mismas 43 claves/versiones de fuente**. Frente
al inventario `19e5b890…` solo se retiraron dos entradas operativas:
`cache_pdd_dea_v11.json` y `checkpoints_pdt_ai_evaluator.json`; no se eliminaron
los archivos ni se perdieron observaciones. El caché posterior v12 también
queda fuera por la regla de prefijos, sin convertirse en otra fuente.

El corte sustituto **`1c162aa0-68a9-42db-baad-cd3a551bdd02`**, SHA
**`5c2736617923ba7ed66235bd66f522d2b4b3f41837f7c25fa0419941b4ebaee7`**,
conserva sus recibos de cadena 7D y matriz PDD–PA. Se reprodujeron los 454
paneles y 3.241 expedientes desde la serie de 2.340 observaciones/43 versiones;
la matriz y el catálogo de 4.637 metas mantienen sus identidades coincidentes.

El corte 99923927 y sus artefactos se conservan como históricos. Su inventario
completo ya no coincide con el estado operativo actual y no debe presentarse
como verificación integral vigente. Las versiones 20, 22 y 23-v3 del cotejo
usaron ese índice anterior para los documentos seleccionados; sus SHA
documentales siguen siendo verificables, pero la referencia vigente es v4.
La JSONL v4 coincide byte por byte con v3 porque no cambiaron documentos ni
coincidencias; cambia el SHA del resumen al enlazar el inventario corregido.

No se corrigió el incidente rebajando las guardas ni promocionando datos. La
segunda validación integral y su mapa de SHA se detallan a continuación.

## Aceptación técnica final

`bun run backend:check` terminó **exit 0: 976 passed, 16 skipped, 0 failed**,
tres advertencias preexistentes, en **430,19 segundos de pytest** y
**437.81 segundos del comando completo**. Ruff y formato aprueban
**498 archivos backend**; el script externo del inventario se comprobó además
con Ruff y format --check. No cambió ningún archivo de código durante la
pasada. Huella conjunta de backend y script externo:
`ff478cae9ea0c5c2468f13cfc30f1b1cbbb6ce6d4169014a972a660aa32b2a5c`.

Las omisiones corresponden a 15 pruebas sin corpus analítico en la base
aislada y una sin el guion oficial de Google Docs. Los **1.820 SHA** se volvieron
a comprobar después de la suite, sin discrepancias. No se rebajaron las
guardas para superar el fallo previo.

Evidencia y SHA por archivo:
`bridge/23_validacion_integracion_indicadores_20261022.json`; log homónimo.
La primera pasada fallida conserva su log separado. Se acepta la utilidad
offline y se incorpora su evidencia al seguimiento del plan, **sin acreditar
indicadores ni promover datos**. Las revisiones humanas, el cierre general
P2/P3 y la aprobación independiente EAF siguen pendientes.
