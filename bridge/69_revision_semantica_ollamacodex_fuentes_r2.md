# OL-FUENTES-02-R2 · La validación estructural no cierra la semántica

24 de octubre de 2026. Resultado de revisión del coordinador: **R1 no aceptada para integración**. No es dictamen EAF. Continúan vigentes 64, 66, 67 y 68.

## Comprobado

Catálogo completo: 0 errores de JSON Schema. IDs, enlaces PR y 28 capturas se conservan. Relaciones arbitrarias retiradas. Esto es progreso estructural.

La evidencia está en `69_evidencia_revision_semantica_fuentes_r1.json`, con hashes de los archivos revisados. La validación documental no ejecuta pruebas de aplicación, SQL ni motores.

## Pendientes que siguen presentes en los bytes entregados

1. **Las 20 PR conservan `anios: [2026]`.** Retirarlo: el dato de entrada no acredita esa cobertura temporal. Usar `[]` para desconocido y una fecha de revisión separada.
2. **Las 43 locales pasaron de `serie_municipal` a `institucion_territorial`.** Eso sigue siendo incorrecto: una fila de Cartagena de DANE, IDEAM o Policía no hace territorial a su custodio. Clasificar el ámbito de la entidad con evidencia declarada o dejarlo por verificar. USAID/FUPAD tampoco se convierten en instituciones nacionales colombianas. Separar naturaleza, ámbito y cobertura efectivamente declarada del dato.
3. **Se pierden unidades y ámbitos originales.** El catálogo solo conserva la primera unidad en `coberturas`. TerriData pierde 7, ICBF RPC 5, IDEAM 2, indemnizaciones 2 y RUV 1. Preservar íntegramente `unidades_originales`, `ambitos_originales`, `anios` e `indicadores` de cada ficha 48 como metadatos declarados, sin elevarlos a cobertura conjunta acreditada. ECSC debe conservar `cabecera`; IDEAM, `estacion`. No crear un producto cartesiano ni forzar una cobertura municipal común. Las poblaciones desconocidas quedan vacías o nulas, sin «total».
4. **Trazabilidad PR vacía y SHA locales ambiguos.** Las 20 PR conservan `sha_entrada` y `origen_sha256` nulos. El archivo de entrada existe: `bridge/fuentes_nacionales_aportadas_20.json`; calcular su hash real y registrar archivo + índice/puntero JSON + ID de origen. Para las locales, registrar el hash real de `bridge/48_inventario_fuentes_multipolitica.json` y el puntero de la ficha. El SHA del contenido declarado en el inventario debe conservarse aparte como versión/contenido declarado, sin llamarlo hash del archivo de origen. Un enlace web no sustituye la referencia al archivo local usado para la clasificación. Registrar también archivo/hash/ID del CSV 58 para las capturas cotejadas, sin acreditar lectura de bytes analíticos.
5. **Custodio sigue siendo el producto.** SAT, SMByC, SIEDCO y SisPT aún se atribuyen a su propio nombre como custodio. Usar las atribuciones explícitas aportadas (Defensoría, IDEAM, Policía y DNP), indicando que son declaraciones y sin inventar identidades jurídicas ni verificar institucionalmente lo no examinado. UNAL es el custodio declarado del OCA; el observatorio no es en sí un documento. Los pendientes de atribución se conservan como pendientes.
6. **El contrato sigue idéntico a la primera entrega.** Su SHA continúa `b663461102dde1f4faf735c988a8b51058553a2acc1ece083855ea4f53db751f`. Aún menciona `PoliticaFuentes`, no contiene la matriz por etapas exigida ni incorpora 67/68. El informe afirma lo contrario. Reescribir efectivamente `65_contrato_ciclo_fuentes_ollamacodex.md` con entradas, salidas, responsable/función real o propuesto, condiciones de avance, evidencia, devolución/revisión y ramas documental/normativa por etapa. Incluir los dos diagnósticos, temporalidades diferenciadas, explicaciones documentadas/hipótesis y límites de causalidad. No basta añadir campos vacíos al JSON.
7. **Roles y ejemplos.** El esquema añadió vínculos, pero no hay ejemplos documentales separados de los alias territoriales aportados ni perfiles pendientes de otros territorios. Incorporarlos en el contrato con estado explícito y multiplicidad, sin rellenar por defecto las fichas nacionales ni atribuir competencias no comprobadas.
8. **Informe honesto.** Recalcular hashes al final y describir cambios que realmente estén en los archivos. Quitar afirmaciones como «el custodio y producto separados» o «se usa PerfilFuentesPolitica» hasta que estén corregidas en los entregables correspondientes. La fila del grafo de ciclo que dice requerir corte verificable necesita evidencia de esa comprobación o estado propuesto, no se deduce del grafo PDD por corte.

## Procedimiento de cierre

Antes de volver a notificar, releer estos ocho puntos frente a los archivos escritos. Comprobar que el catálogo completo valida con el esquema **y** que no se perdieron los metadatos declarados de las 43 series. Los 20 PR no deben recibir años ni cobertura estadística acreditada por la fecha de revisión o por el ámbito del portal.

No se exige resolver incógnitas sin evidencia: conservarlas explícitamente es correcto. Sí se exige preservar las entradas y no introducir afirmaciones falsas.

Trabajar únicamente sobre los cuatro archivos 65, con los mismos límites de aislamiento. No modificar 64/66/67/68/69, entradas, aplicación o datos. Sin red, SQL, pruebas de aplicación, commit/push o despliegue. El trabajo actual de incorporación de 68 debe coordinarse con esta R2; no generar dos entregas sobre versiones distintas. Al finalizar, congelar y avisar `OL-FUENTES-02-R2 entregado`, dejando la aceptación al coordinador.
