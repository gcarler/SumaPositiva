# FB-TERR-NUM-01 · Regla numérica explícita implementada y piloto repetido

25 de octubre de 2026. Agente: Freebuff. Solo se tocaron `backend/app/modules/compromisos/parser_terridata_polis.py`, `backend/tests/test_parser_terridata_polis.py`, este informe y el directorio `bridge/118_validacion_parser_numerico/`. 84/98/100/106/112 y originales se preservan como antecedentes. Sin SQL, red, commit/push ni despliegue. Estado final: `regla_numerica_implementada_piloto_pendiente_revision`. Sin dictamen EAF ni aprobación de ingesta.

## 1. Errata de 112 confirmada (no se sobrescribió 112)

Cotejo directo contra `filas.jsonl` de 106: máximo de dígitos enteros **13** (no 17; p.ej. `1.192.200.042.072,00`) y coeficiente observado máximo **15** (no 19). La longitud de texto (hasta 20 caracteres) se confundía con dígitos. Documentado aquí y en el contrato v2.

## 2. Implementación en el parser (`terridata_txt.v2`, esquema `polis.parser_terridata.v2`)

- **Selección explícita, sin autodetección**: `MetadatosCapturaTerridata.regla_numerica` admite `decimal_simple_v1` (predeterminado: comportamiento previo intacto y compatibilidad sin parámetro nuevo) o `decimal_coma_miles_terridata.v1`. La firma de `parsear_terridata_txt` no cambia.
- **Regla y versión registradas** en `ResultadoParserTerridata` (campos `regla_numerica`, `version_parser`, `esquema`), en cada `FilaTerridata.regla_numerica` y en cada línea del JSONL del piloto (procedencia).
- **Gramática ASCII fullmatch**: `[+-]?[0-9]+,[0-9]{2}` o `[+-]?[0-9]{1,3}(\.[0-9]{3})+,[0-9]{2}`; escala fija de exactamente 2 decimales.
- **Conversión exacta**: texto→`Decimal` quitando exclusivamente los puntos de la parte entera y cambiando la coma; sin `float` ni redondeo ambiental (verificado con `context.prec = 2`).
- **Guardias conservadoras antes de conversión**: enteros ≤ 18 dígitos y coeficiente ≤ 20 dígitos; mayores que lo observado (13/15); documentadas como decisión de implementación, **no** formato certificado por DNP. Excederlas retiene con texto intacto.
- **Fuera de regla**: fila retenida, texto intacto, sin reemplazos heurísticos ni relleno de ceros; advertencia `numerico_formato_no_compatible:<regla>`.
- No se cambian reglas temporales, campos obligatorios, identidad ni estados de rechazo/retención; `estado_valor_numerico` `decimal_validado` no equivale a fila apta ni a dato semánticamente verificado.

## 3. Pruebas dirigidas (solo suites autorizadas, con `--noconftest`)

- Suite parser: **61 passed** (35 previas intactas + 26 nuevas: gramáticas válidas/inválidas, signos, escala fija 2, agrupaciones, ceros, límites 18/20, contexto reducido, compatibilidad por omisión, coma inactiva sin seleccionar regla). JUnit: `bridge/118_validacion_parser_numerico/pytest_parser_118.xml`.
- Conjunta conciliador+parser: **133 passed** (72 conciliador sin cambios + 61 parser). JUnit: `bridge/118_validacion_parser_numerico/pytest_conjunta_118.xml`.
- `ruff check` y `ruff format --check` en verde para ambos archivos.

## 4. Piloto real local 118 (misma captura de 75)

Ejecución real de `parsear_terridata_txt` con `regla_numerica="decimal_coma_miles_terridata.v1"`:

- ZIP `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` (114090 B) verificado con CRC, único miembro `TerriData13001.txt`, límites 8 MiB, lectura en memoria sin extracción de rutas; TXT `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2` (2853390 B).
- **12899 filas**: 12230 aceptadas, 667 retenidas, 2 rechazadas.
- **Conversiones contadas por separado del estado de fila**: `decimal_validado` 12077 → 12072 en aceptadas, 3 en retenidas (orden 5953/5954/5955, mes 0), 2 en rechazadas (7583/7584 y 7591/7592, Unidad de Medida vacía: **siguen rechazadas** aunque el número se interprete). `formato_no_regla` 0. No se prometen 12077 filas aptas por haber convertido números: convertir ≠ apta ≠ verificado.
- **Reconciliación con 106** (sin modificarlo): total de filas, cualitativas, sin valor, mes 0, descripción general e identidad idénticos; aceptadas 158→12230 y retenidas 12739→667 por las filas cuyo único motivo de retención era el formato numérico; rechazadas 2 en ambas. Detalle: `comparacion_106.json`.
- Artefactos (SHA-256 verificados): `filas.jsonl` `a6f30f18…02e4c`, `manifiesto_ejecucion.json` `874e6936…a749f2`, `resumen.json` `5d8909ba…4a308e`, `contrato_parser_terridata_v2.json` `2af5ade9…977c619`, `comparacion_106.json` `2772788d…51049e`, guion `guion_piloto_118.py` `f2939b80…8d6a36` (conservado en evidencia 118, no solo /tmp). Código final: parser `731ce8db…62c100`, tests `dd58ec76…433ef8`.

## 5. Límites

Regla optativa aún pendiente de aprobación de coordinación/EDD; las guardias 18/20 son decisión conservadora de implementación sin certificación del proveedor. Convertir un número no acredita indicador, población/proyección, unidades, temporalidad ni publicación; no hay análisis ni ingesta canónica ni promoción al banco.
