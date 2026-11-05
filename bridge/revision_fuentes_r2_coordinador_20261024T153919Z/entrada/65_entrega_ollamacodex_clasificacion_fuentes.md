# OL-FUENTES-02-R2 · Clasificación y ciclo de fuentes

Fecha: 2026-10-24. Agente: Ollamacodex. Coordinador: Codex.
Alcance: inventario/documento. Sin dictamen EAF, sin análisis de datos, sin SQL, sin red, sin pytest y sin despliegue.

## Entregables

- `bridge/65_schema_clasificacion_fuentes_ollamacodex.json`
- `bridge/65_catalogo_clasificado_fuentes_ollamacodex.json`
- `bridge/65_contrato_ciclo_fuentes_ollamacodex.md`
- `bridge/65_entrega_ollamacodex_clasificacion_fuentes.md`

## Resultado de conteos

| Concepto | Conteo |
|---|---|
| Fichas totales | 63 |
| Fichas PR | 20 |
| Fichas locales | 43 |
| Enlaces PR conservados | 21 |
| Series locales 48 | 43 |
| Capturas 58 referenciadas | 28 |
| Locales sin captura nueva | 15 |
| Relaciones arbitrarias en catálogo | 0 |

## Validación documental

- `Draft202012Validator.check_schema(schema)` pasa.
- El catálogo completo valida con 0 errores contra el schema completo.
- Los 20 PR conservan `anios: []`: la fecha de revisión no se declara ahora como año de dato.
- Las 43 series locales no usan `institucion_territorial` como ámbito del dato; se separa custodio, producto y cobertura declarada.
- Los hashes de `bridge/fuentes_nacionales_aportadas_20.json`, `bridge/48_inventario_fuentes_multipolitica.json`, `bridge/58_evidencia_adquisicion_fuentes.json` y `bridge/58_resultados_descargas.csv` se registran en las fichas/contrato.
- Las 28 capturas tienen trace documental a la evidencia 58 y CSV. La verificación es de metadatos, no lectura de bytes analíticos.
- El cotejo directo contra 48 muestra 0 diferencias en `unidades_originales`, `ambitos_originales`, `indicadores` y años normalizados de las 43 series.
- `capturas_58_verificadas: false` significa que no se leyeron/acreditaron bytes analíticos; el nivel exacto se declara además en `capturas_58_nivel_verificacion`.

## Cambios R2

- Schema añade misión declarada, producto/definición, temporalidad diferenciada, revisiones, atribución y referencias de captura.
- Las fichas PR conservan hash y puntero JSON/ID del archivo local de referencia, sin convertir URL en origen de bytes.
- Las fichas locales conservan hash y puntero JSON de inventario 48, además del SHA de contenido declarado por 48 como campo separado.
- Custodio declarado y nombre de producto quedan separados: SMByC→IDEAM, SAT→Defensoría, SIEDCO→Policía Nacional y SisPT→DNP como declaraciones no verificadas; OCA→UNAL.
- Se preservan íntegres las unidades y ámbitos originales de 48: TerriData, ICBF RPC, IDEAM, indemnizaciones y RUV incluidos. ECSC conserva `cabecera`; IDEAM conserva `estacion`.
- Se retira `capturas_53` huérfano. Se corrige `restingido`→`restringido` y `cyclo_reutilizable`→`ciclo_reutilizable`.
- El contrato usa `PerfilFuentesPolitica` y retira el nombre inexistente `PoliticaFuentes`.
- El contrato reescribe la matriz del ciclo por etapas con entradas, salidas, responsables/función, condición de avance, evidencia, ramas y estado.
- Se integran 66, 67 y 68 en un mismo contrato y el informe queda recalculado.

## Conciliación, temporalidad e inferencia

- Las fichas tienen `temporalidad` con periodos observados y campos separados para ocurrencia, deceso, registro, pericia, reclasificación, publicación, corte y extracción. No se imponen desfases.
- La fecha de run final de captura en 58 se usa solo como extracción, no como fecha del dato.
- Estados de explicación documentan separación entre discrepancia, desfase documentado, cobertura distinta y ausencia de comparabilidad.
- El catálogo declara dos salidas conceptuales (`diagnosticos.fenomeno` y `diagnosticos.fuentes`) como `contrato_definido_no_ejecutado`. Este paquete no ejecuta conciliación ni diagnóstico de datos.
- La trazabilidad no garantiza reducción real ni causalidad. Una diferencia menor no prueba subregistro. Se permite la conclusión “no identificable con la evidencia disponible”.

## Ciclo compartido

El ciclo completo está en `bridge/65_contrato_ciclo_fuentes_ollamacodex.md`, con rama documental/normativa, cuarentena/revisión, corte/versiones, dos salidas y límites. Se conservan estados separados entre implementado, implementado como contrato y propuesto. No se declara universalidad ni resolución automática de roles.

## Compatibilidad por motor

| Tipo de producto | Motor sugerido | Estado |
|---|---|---|
| Serie numérica/indicador | Series 7D y paneles o analítica estadística | Reutilizable solo si hay cobertura y precondiciones |
| Dato territorial/espacial | PostGIS, análisis espacial y matriz correspondencias | Requiere cobertura y precondiciones |
| Documento/normativa | Agente jurídico o clasificador documental | Sin evidencia o sin dictamen de competencia |
| Planeación/presupuesto | PPI, matriz de correspondencias, planificador | Requiere corte y catálogo con SHA |
| Eficiencia/DEA | DEA 4 niveles o DEA econometría | Requiere calidad y frontera homogénea |
| Ciclo de políticas | Grafo de ciclo por política | Contrato propuesto; no se extrae del código PDD | 

## Límites y no acreditar

- Sin dictamen EAF, licencia, calidad ni cobertura universal.
- Sin análisis estadístico, causalidad o subregistro.
- Sin fusionar fuentes por nombre, promediar ni elegir cifra única.
- Sin acceso operativo actual a referencias oficiales.
- No se integra el planificador, adaptadores ni motores.
- No se altera código/Python/datos ni inventarios activos.
- Sin commit, push, deploy, test suite ni SQL.

## Hashes de salidas

- Schema: `d82d90ac438a5b428ad681c1a79849ffe3e77a36a57963a47fd4469c1c1c7430`
- Catálogo: `61c082bcbb9bc48ffa77a8d0d253efa9e7472e65e30a7fd1a391e081eeb34ba2`
- Contrato: `74ac4b02fdd7af2f78dc94137e1201791821f8a60f0bbf16cd1564ed5887331f`
- Entrega: hash calculado después de escritura para evitar recursión; el coordinador puede cotejar por ruta.
