# OL-TERR-ADQ-02-R1 · Cotejo local de identidad de 161

## Estado
Cotejo local sin red, sin SQL, sin pytest, sin aplicación, sin commit, push ni deploy. Se conservan 161 intactos. Se usó el parser local congelado y el catálogo 128 solo como referencia de códigos. No se modificó parser, resolver, catálogo, banco ni diagnóstico.

## Verificación inicial
- Parser local SHA-256: `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100`
- Catálogo 128 SHA-256: `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`
- ZIP 75 de 13001 SHA-256: `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15`
- Captura 161 de 13001 coincide byte a byte con ZIP75 y no divergencia entre las dos versiones.
- 4 objetivos, 4 respuestas, 4 ZIP válidos, 4 TXT válidos, 4 parseos.

## Cotejo de identidad con contrato completo
Contrato original: código departamento, nombre departamento, código entidad y nombre entidad con literales DANE del catálogo 128.

| Codigo | Filas | Código departamento distinto | Código entidad distinto | Nombre departamento distinto | Nombre entidad distinto |
| --- | ---: | ---: | ---: | ---: | ---: |
| 13001 | 12899 | 0 | 0 | 12899 | 12899 |
| 13673 | 12733 | 0 | 0 | 12733 | 12733 |
| 23660 | 12885 | 0 | 0 | 12885 | 12885 |
| 11001 | 13410 | 0 | 0 | 13410 | 13410 |

Pares literales:
- 13001: `Cartagena` vs `CARTAGENA DE INDIAS`
- 13673: `Santa Catalina` vs `SANTA CATALINA`
- 23660: `Sahagún` vs `SAHAGÚN`
- 11001: `Bogotá` vs `BOGOTÁ, D.C.`
- Departamento 13001/13673: `Bolívar` vs `BOLÍVAR`
- Departamento 23660: `Córdoba` vs `CÓRDOBA`

## Segunda lectura codes-only
Mismo TXT y mismo parser. Identidad esperada solo con `codigo_departamento` y `codigo_entidad` del catálogo 128. Sin comparación de nombres.

| Codigo | Filas | Código departamento distinto | Código entidad distinto | Estado identidad |
| --- | ---: | ---: | ---: | --- |
| 13001 | 12899 | 0 | 0 | 12899 concordante_declarada |
| 13673 | 12733 | 0 | 0 | 12733 concordante_declarada |
| 23660 | 12885 | 0 | 0 | 12885 concordante_declarada |
| 11001 | 13410 | 0 | 0 | 13410 concordante_declarada |

No se presenta como corrección de datos ni como validación de nombres, censos ni semántica. Solo verifica los códigos.

## Por qué 0 aceptadas en la primera lectura
Bajo el contrato completo el parser compara exactamente los 4 campos. Los literales de TerriData no son idénticos a los literales DANE del catálogo. Por eso las filas quedaron `discordante_declarada`, aunque los códigos departamento y entidad coincidieran. La segunda lectura reduce el contrato a códigos, y el mismo TXT queda concordante porque no hay discrepancias de códigos. Se conserva la discrepancia de nombres.

## Temporalidad
El rótulo `anio_conforme` de 161 cuenta únicamente `declarada_sin_regla_proveedor`, que es una combinación temporal válida para año y mes distinto de 0. Excluye los meses 0 aunque el año cumpla el patrón. Por eso 13001 muestra 12891, no 12899.

Con patrón YYYY separado de mes:
| Codigo | Año conforme YYYY | Año no conforme | Mes 0 | Mes 1 a 12 | Mes no conforme |
| --- | ---: | ---: | ---: | ---: | ---: |
| 13001 | 12899 | 0 | 8 | 12891 | 0 |
| 13673 | 12733 | 0 | 8 | 12725 | 0 |
| 23660 | 12885 | 0 | 8 | 12877 | 0 |
| 11001 | 13410 | 0 | 8 | 13402 | 0 |

No hay años de 5 dígitos ni años no conformes en estos TXT. No se ha modificado la semántica ni el patrón del parser.

## Evidencia
- `bridge/167_cotejo_identidad_capturas/cotejar_capturas.py`
- `bridge/167_cotejo_identidad_capturas/cotejo_identidad.json`
