# OL-TERR-PILOTO-01 · Piloto real local sobre ZIP oficial

Estado: `piloto_ingesta_local_pendiente_validacion_semantica`.
No dictamen EAF. Sin red, SQL, promoción al banco ni cambios de código.

## Insumo y verificación

- ZIP oficial conservado: `bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip`
- SHA-256 ZIP: `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` (coincide con 105).
- Tamaño ZIP: `114090` bytes.
- Miembro único: `TerriData13001.txt`.
- Sin cifrado, sin rutas inesperadas, sin symlink.
- CRC de ZIP validado y límite de expansión verificado antes de la lectura.
- TXT leído en memoria: `2.853.390` bytes.
- SHA-256 TXT: `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2`.
- No se extrajo el ZIP al filesystem.

## Ejecución real del parser

- Invocación: `backend/.venv/bin/python /tmp/ol_ter_piloto_01.py`
- Parser: `bridge/84` → parser actual, versión `terridata_txt.v1`.
- Metadatos conservados: canal `TerriData`, origen local, miembro exacto, codificación `utf-8-sig`, delimitador `|`.
- Identidad declarada (no certificación DIVIPOLA): código departamento `13`, código entidad `13001`.
- Fecha de captura no inventada; se deja nula por separar informe/captura de la ejecución local.
- `piloto` real, no suite de pruebas.

## Resultado estructurado y salida

- Directorio de evidencia: `bridge/106_piloto_terridata/`
- Manifiesto de ejecución: `bridge/106_piloto_terridata/manifiesto_ejecucion.json`
- Manifiesto de ejecución y resumen: `bridge/106_piloto_terridata/resumen.json`
- JSONL completo por fila: `bridge/106_piloto_terridata/filas.jsonl`
- `filas.jsonl` SHA-256: `77b358fcb06aa675cd4871eaed29acffac065d340236079b12689c3b4459ef4a` (13.191.372 bytes)
- Estado JSONL: 12.899 filas estructuradas, una por línea, con Decimal preservado como texto si existe.

## Estados reales observados

| Estado | Filas |
|---|---:|
| `aceptada` | 158 |
| `retiene` | 12739 |
| `rechazada` | 2 |
| `total` | 12899 |

Causas contadas por el parser:
- `numerico_formato_no_compatible:decimal_simple_v1`: 12077
- `sin_valor_declarado`: 659
- `campo_obligatorio_vacio`: 2
- `descripcion_general_no_serie_estadistica_automatica`: 102
- `mes_0_sin_regla_proveedor_acreditada`: 8
- `temporalidad_preservada_sin_regla_proveedor`: 12891

Identidad declarada:
- `concordante_declarada`: 12899
- `discordante_declarada`: 0
- `no_contrastable`: 0
- `no_evaluable`: 0

Temporalidad observada:
- `declarada_sin_regla_proveedor`: 12891
- `mes_0_sin_regla_proveedor`: 8

Valor numérico observado:
- `formato_no_regla`: 12077
- `no_presente`: 822
- `decimal_validado`: 0

## Ejemplos limitados

| Orden | Línea final | Estado | Causa principal |
|---:|---:|---|---|
| 7583 | 7584 | `rechazada` | `campo_obligatorio_vacio` + formato numérico no acreditado |
| 7591 | 7592 | `rechazada` | `campo_obligatorio_vacio` + formato numérico no acreditado |
| 1 | 2 | `retiene` | `mes_0_sin_regla_proveedor_acreditada` |
| 2 | 3 | `retiene` | `mes_0_sin_regla_proveedor_acreditada` |
| 12 | 13 | `retiene` | `mes_0_sin_regla_proveedor_acreditada` |
| 13 | 14 | `retiene` | `numerico_formato_no_compatible:decimal_simple_v1` |

## Interpretación honesta

- Las 2 filas rechazadas se deben a vacío en campo obligatorio del proveedor. No son fallo del parser.
- El formato numérico con coma decimal es convención del proveedor, no fallo del parser. El parser no la interpreta porque no hay regla acreditada.
- El mes `0` se conserva tal cual y no se convierte.
- Las descripciones generales no se convierten automáticamente en series históricas.
- No se suman datos ni se eligen cifras finales.
- No se atribuyen unidades estadísticas por nombre de institución.
- No se cuentan filas como indicadores independientes.
- No se acreditan proyecciones, poblaciones, vigencia ni cobertura continua.
- No se interpreta subregistro ni causalidad.

## Reproducibilidad local

- Script temporal fuera del repositorio: `/tmp/ol_ter_piloto_01.py`
- SHA-256 script: `c0e4ea3eede5d17cdb187a7743c0a9ad69397eef7b795395f8d3017fcd28a79f`
- Ejecución: `backend/.venv/bin/python /tmp/ol_ter_piloto_01.py`
- El script no modifica código de aplicación ni datos originales.
- No se ejecutaron suites generales ni pruebas funcionales/sintéticas adicionales.

## Evidencia y congelación

- `bridge/106_piloto_terridata/manifiesto_ejecucion.json`
- `bridge/106_piloto_terridata/resumen.json`
- `bridge/106_piloto_terridata/filas.jsonl`
- `bridge/106_entrega_ollamacodex_piloto_terridata.md`
- Sin `bridge/106_piloto_terridata/*.jsonl` permanente en otro lugar.
- Sin cambios de parser, tests, datos originales ni reglas.
- Sin SQL, red, commit, push, despliegue.
