# FB-TERR-FORMATO-01 · Perfilado de sintaxis numérica del piloto real y gramática propuesta

25 de octubre de 2026. Agente: Freebuff. Tarea: acreditar sintaxis de números del piloto TerriData 13001 (`bridge/111_tarea_freebuff_formato_numerico_terridata.md`). Trabajo de perfilado de formato, sin cambio de parser, pruebas, 106, originales, aplicación, catálogos ni fuentes. Sin SQL, red, instalaciones, commit ni despliegue.

## 1. Objetivo verificable

El piloto 106 produjo 12077 valores no vacíos sin regla compatible (`decimal_simple_v1`) y cero `Decimal` convertidos. Determinar la distribución completa de sintaxis y si una regla explícita, acotada y versionada de coma decimal/punto de miles los procesa sin ambigüedad. No se atribuye a DNP una regla documentada oficialmente: lo observado corresponde solo a esta captura.

## 2. Insumos y SHA-256 verificados en esta ronda

| Insumo | SHA-256 | Bytes |
|---|---|---|
| ZIP `bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip` | `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` | 114090 |
| TXT miembro único `TerriData13001.txt` (leído en memoria, sin extracción al filesystem, sin cifrado) | `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2` | 2853390 |
| JSONL `bridge/106_piloto_terridata/filas.jsonl` | `77b358fcb06aa675cd4871eaed29acffac065d340236079b12689c3b4459ef4a` | 13191372 |

Los tres SHA coinciden con el manifiesto de ejecución de 106.

## 3. Conciliación de conteos 106 (reproducción determinista)

- Filas totales: **12899** = 158 `aceptada` + 12739 `retiene` + 2 `rechazada` ✓
- `estado_valor_numerico`: 12077 `formato_no_regla` + 822 `no_presente` ✓
- Los 822 sin valor: 158 en filas `aceptada` y 664 en `retiene`; 163 con `dato_cualitativo` (ejemplos fila 2/3/4: Código DANE `13001`, Región `Caribe`, Subregión (SGR) `Dique Bolivarense`).

## 4. Perfilado excluyente de los 12077 valores no vacíos

Regla actual del parser: `decimal_simple_v1` (punto decimal). Ningún valor de esta captura cumple esa forma con coma: de ahí el 100% `formato_no_regla`.

| Categoría excluyente | Casos |
|---|---:|
| decimal con coma, sin separadores de miles | 7582 |
| decimal con coma y miles con punto (grupos de tres) | 4495 |
| **total** | **12077** |

Cero casos en el resto de categorías excluyentes: entero de punto (`598.10`), exponente, símbolos `$`/`%`, espacios no separables, signo `+`, menos Unicode (U+2212), coma malformada, punto único de 3 ambiguo, punto desconocido, desconocido.

Detalles:

- Signo `-` ASCII en 32 valores (0 con `+`); ejemplos con fila exacta: orden 5584/línea 5585 `-58.011,00`, orden 5585/5586 `-86.529,00`, orden 5589/5590 `-128.705,00` (Déficit o superávit total, Millones de pesos corrientes).
- Valores únicos: 7913 de 12077 (34,1% duplicados).
- Longitud de texto: mín. 4, máx. 20 (`1.192.200.042.072,00`).
- Decimales tras la coma: **exactamente 2 en los 12077** (excluyente).
- Prefijo entero antes del primer separador: 1 dígito (4832), 2 (5574), 3 (1671).
- Dígitos enteros sin separadores: hasta 17 (histograma 1→4111, 2→2995, 3→476, 5→427, 6→2375, 7→1063, 9→137, 10→45, 11→37, 13→156, 14→159, 15→95, 17→1).
- Grupos de miles por parte entera: 0 grupos 7582, 1 grupo 3865, 2 grupos 219, 3 grupos 410, 4 grupos 1.
- Rasgos `Decimal`: mínimo `-328521.84`; máximo `1192200042072.00`.
- Ejemplos con fila/campo exactos: orden 13/línea 14 campo `dato_numerico` = `598,10` (Extensión, Kilómetros cuadrados); orden 15/línea 16 = `773.653,00` (Población total, Personas); orden 101/102 = `9,02` (Variación porcentual intercensal 2005-2018, Porcentaje).

## 5. Gramática propuesta: `decimal_coma_miles_terridata.v1`

Lectura sintáctica del campo `dato_numerico`, sin ambigüedad, con dos subformas excluyentes:

- **(a)** `^[+-]?\d+,\d{2}$` — sin separadores de miles.
- **(b)** `^[+-]?\d{1,3}(\.\d{3})+,\d{2}$` — com separadores de miles: grupos de exactamente tres dígitos, prefijo de 1 a 3 dígitos.

Cada texto cumple exactamente una subforma: la coma es siempre decimal y deja exactamente 2 cifras; el punto es siempre separador de miles. Sin ambigüedad.

- **Conversión exacta**: `Decimal(part_entera_sin_puntos + '.' + parte_decimal)` construida desde el texto original, sin `float()` y sin depender del contexto decimal.
- **Límites observados/propuestos**: escala fija 2; coeficiente total ≤ 19 dígitos (máx. observado 17 enteros + 2 decimales); longitud de celda máxima observada 20 caracteres. Fuera de estos límites o de las subformas: permanece retenido como `decimal_no_acreditado`.
- **Conservación de texto**: el texto original declarado de la celda se mantiene; la gramática es complemento de lectura, no reescritura.
- **Casos que siguen retenidos**: exponente, símbolos o espacios, menos Unicode, miles no agrupados de tres, decimales con coma distinta de dos cifras (ninguno observado en esta captura; los hipotéticos siguen fuera).
- **Coexistencia**: `decimal_simple_v1` (punto decimal del parser actual) sigue aplicando a textos con punto decimal sin coma; la regla propuesta solo cubriría los textos con coma si el contrato se versiona. No se cambia nada del parser en esta tarea.
- **No acreditación oficial**: la regla se observa en esta captura y es propuesta; no se atribuye a DNP una regla documentada oficialmente.

## 6. Distinción sintaxis vs. semántica

La regla acredita únicamente formato sintáctico del texto de la celda. No acredita validez del indicador, población/proyección, unidades de medida, temporalidad (año/mes sin regla del proveedor) ni calidad/publicación del proveedor. Sin dictamen EAF ni aprobación de ingesta.

## 7. Filas rechazadas y campo obligatorio vacío

| orden | linea_final | campo obligatorio vacío | dato_numerico | indicador |
|---:|---:|---|---|---|
| 7583 | 7584 | `Unidad de Medida` | `164,00` | Toneladas producidas por otros cultivos transitorios |
| 7591 | 7592 | `Unidad de Medida` | `455,00` | Toneladas producidas por otros cultivos permanentes |

Ambas rechazadas por `CAMPOS_CELDA_OBLIGATORIOS` con `Unidad de Medida` vacío. El texto numérico en ambas es compatible con la gramática propuesta. Puede requerirse ajustar el contrato para ese producto (admisible si la coordinación lo decide); no se declara automáticamente corrupción.

## 8. Reproducibilidad

- Guion: `/tmp/fb_terra_perfil.py` — SHA-256 `7311528b57407bbd82e649c4e0b235b439e0af758580639b3dd06c88c40be1fe`; contenido completo incrustado en `bridge/112_evidencia_freebuff_formato_numerico_terridata.json` (reproducible: `python3 /tmp/fb_terra_perfil.py > /tmp/fb_terra_perfil_salida.json`); no se depende solo del `/tmp`.
- Evidencia en congelación: `bridge/112_evidencia_freebuff_formato_numerico_terridata.json` (SHA-256 `73fc03a5159f6a7ea892922359761f75702cefed3ae656985e4c7e7d0a3171a9`).
- Categorías reproducidas esta ronda: idénticas (12899 filas; 12077 = 7582 + 4495).

## 9. Límites de esta tarea

Sin SQL, red, descargas, instalaciones, pruebas de aplicación, commit/push ni despliegue. Sin modificar parser, pruebas, 106, originales, aplicación, catálogos ni fuentes. Sin dictamen EAF ni aprobación de ingesta. Sin promover datos al banco.
