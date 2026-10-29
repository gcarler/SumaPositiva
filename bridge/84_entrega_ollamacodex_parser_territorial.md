# OL-TERR-01 · Parser territorial aislado (MT-04)

Estado: `prototipo_parser_pendiente_revision_funcional`.
No dictamen funcional ni certificación de cobertura. Sin datos productivos, red, SQL, integración, commit ni push.

## Archivos escritos

- `backend/app/modules/compromisos/parser_terridata_polis.py`
- `bridge/84_entrega_ollamacodex_parser_territorial.md`
- `bridge/84_contrato_parser_territorial.json`

Los cuatro archivos de OL-CONCILIA-01-R4 permanecen congelados.

## Evidencia usada

Solo lectura local del proyecto y de la evidencia 75:

- `bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/manifiesto.json`
- `bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/perfil_estructural.json`
- `bridge/76_plan_motor_ficha_territorial_terridata.md`

Del esquema constatado se usan exactamente las 13 columnas:

`Código Departamento`, `Departamento`, `Código Entidad`, `Entidad`,
`Dimensión`, `Subcategoría`, `Indicador`, `Dato Numérico`,
`Dato Cualitativo`, `Año`, `Mes`, `Fuente`, `Unidad de Medida`.

Delimitador: `|`. Codificación admitida declarada: `utf-8-sig`. El corpus real no fue procesado por el nuevo parser.

## API

`parsear_terridata_txt(bytes_txt, captura, identidad_esperada) -> ResultadoParserTerridata`.

- Recibe bytes TXT ya capturados y metadatos explícitos de canal/origen/miembro/fecha/hash.
- Recibe identidad territorial declarada por quien invoca.
- No abre rutas, ZIP, URLs ni bases de datos.
- Calcula SHA-256 de los bytes TXT dentro del parser.
- Si se declara `sha256_captura_declarado`, rechaza cualquier discordancia con los bytes recibidos.
- No produce ficha, análisis, SQL ni persistencia.

## Límites y conservación

- `MAXIMO_BYTES_TXT = 67.108.864 bytes`; el límite se aplica antes de decodificar.
- `MAXIMO_FILAS_DATOS = 200.000`.
- `MAXIMO_CELDA = 2.048`.
- No hay truncamiento silencioso: excedentes generan error o rechazo/retención con causa.
- `csv.field_size_limit` no se modifica desde el parser; se documenta que el límite ambiental puede abortar la lectura.
- Conserva la fila como `campos_originales`, además de cada campo tipado.
- Código de departamento y entidad permanecen como texto.
- Fuente se conserva como texto original; no se reclasifica como productor ni se declara TerriData productor.
- No se infiere unidad de observación desde unidad de medida.

## Estados y reglas

- Estado de fila: `aceptada`, `retiene` o `rechazada`, con causas por fila.
- `retiene` para discordancia exacta con atributo declarado, identidad no contrastable, año/mes no conformes, mes 0 sin regla acreditada, numerico no compatible con `decimal_simple_v1` o ausencia absoluta de valor declarado.
- `rechaza` para ancho inconsistente, celda mayor al limite o campo obligatorio vacio.
- Descripción general y coincidencia con identidad declarada son avisos informativos, no retención ni certificación.
- Discordancia exacta entre contenido y identidad declarada no certifica DIVIPOLA.
- `Mes = "0"` se conserva y recibe estado temporal especifico no mensual, pendiente de regla acreditada del proveedor.
- Año se valida como cadena `YYYY` conservadora; si no cumple, retiene la fila sin imputar.
- Regla numerica `decimal_simple_v1`: entero o decimal con punto, sin separadores ni exponente; serializa a `Decimal`, sin float. Texto no compatible conserva el texto original y retiene la fila.
- Cualitativo y valor ausente no se tratan de manera predeterminada como error numerico; no se llena faltante con cero.

## Estados por fila

- `estado_valor_numerico`: `no_presente`, `decimal_validado`, `formato_no_regla` y nuevo estado `no_evaluable_por_estructura`.
- `estado_temporalidad`: `declarada_sin_regla_proveedor`, `mes_0_sin_regla_proveedor`, `anio_no_conforme`, `mes_no_conforme`.
- `estado_identidad`: `concordante_declarada`, `discordante_declarada`, `no_contrastable`, `no_evaluable_por_estructura`.
- Los contadores ya no mezclan discordancia efectiva con fila no evaluable. Se registran identidad concordante declarada, discordante declarada, no contrastable y no evaluable.

## Estructura de salida

`ResultadoParserTerridata` incluye:
- version, estado, SHA-256, tamaño, captura declarada, identidad esperada, encabezado constatado, limites aplicados, filas estructuradas, advertencias globales, pendientes y verificacion conservadora.
- Contadores reconciliables para filas aceptadas/retenidas/rechazadas y causas de retención/estructura.
- Sin ficha, análisis, SQL ni persistencia.

El esquema JSON de los modelos está en `bridge/84_contrato_parser_territorial.json`.

## Validaciones ejecutadas

- `backend/.venv/bin/ruff check backend/app/modules/compromisos/parser_terridata_polis.py` → passed.
- `backend/.venv/bin/ruff format --check backend/app/modules/compromisos/parser_terridata_polis.py` → passed.
- Análisis de sintaxis con `ast.parse` → passed.
- JSON del contrato → válido.
- Sin pruebas funcionales ni sintéticas, sin pytest, sin procesamiento del corpus real.

## Casos previstos

Los 22 casos previstos están en `bridge/84_contrato_parser_territorial.json` bajo `casos_aceptacion_previstos`. Esta entrega no los acredita ejecutados.

## Pendientes y límites

- Revisión funcional pendiente de coordinación.
- Regla temporal del proveedor pendiente de acreditación.
- Reglas complementarias del formato numérico del proveedor pendientes de verificación.
- No genera catálogo, ficha canónica, persistencia ni consumidores.
- Sin conexión a motores o agentes.

## Hashes

Se registran hashes reales:

- Parser: `747ff3443ce03812ad3ce0ea31c35a322eddaaa7114345911aee7dbf04583de3`
- Contrato: `afff629b65948919a01fec0716e459096c6e5dedef7f14ba2498b63610678039`
- Informe: no incluye auto-referencia.
