# FB-TERR-FORMATO-01 · Acreditar sintaxis de números del piloto real

25 de octubre de 2026. Leer piloto106, evidencia75, parser84/98 y datos originales locales. Trabajo de perfilado de formato, no cambio de parser ni validación semántica de indicadores. Ollamacodex implementa catálogo–planificador en109/110, no interferir.

## Objetivo verificable

El piloto produjo 12077 valores no vacíos sin regla compatible, cero Decimal convertidos. Inspección de coordinación encontró `598,10`, `773.653,00`, etc. Determinar distribución completa de sintaxis y si una regla explícita, acotada y versionada de coma decimal/punto de agrupación puede procesarlos sin ambigüedad. No atribuir a DNP una regla documentada oficialmente si solo se observa en esta captura.

Verificar SHA de ZIP/TXT/JSONL y reconciliar conteos106. Leer registros con límites, sin extracción arbitraria ni red. Contar categorías excluyentes de texto: vacío, signo, decimal con coma, agrupación de miles válida (grupos de tres), entero, punto decimal, exponente, símbolos, espacios, ambiguo/desconocido. Conservar ejemplos limitados con fila/campo exactos. No tratar punto único ambiguo sin evidencia suficiente de la regla del archivo. Comprobar número de decimales, signo, posibles menos Unicode y espacios no separables. No asumir que 12077 casos son iguales por mirar ejemplos.

Proponer gramática exacta y nombres de regla, límites de coeficiente/escala, conversión por Decimal sin float y sin depender de contexto, conservación de texto y casos que deben seguir retenidos. Distinguir regla de lectura sintáctica de validez del indicador, población/proyección, unidades, temporalidad o publicación del proveedor. Identificar campos obligatorios vacíos de las dos filas rechazadas sin llamarlo corrupción automáticamente: puede faltar ajustar el contrato para ese producto.

## Escrituras exclusivas

- `bridge/112_revision_freebuff_formato_numerico_terridata.md`.
- `bridge/112_evidencia_freebuff_formato_numerico_terridata.json`.

No modificar parser, pruebas,106, originales, aplicación, catálogos o fuentes. Sin SQL, red, descargas, instalaciones, pruebas de aplicación, commit/push ni despliegue. Se permiten lectura y perfilado determinista local del corpus ya capturado, hashes/JSON/conteos, sin promover datos al banco. Registrar guion reproducible en evidencia o su contenido y SHA; no depender solo de un /tmp que pueda desaparecer.

No dictamen EAF ni aprobación de ingesta. Congelar y notificar `FB-TERR-FORMATO-01 entregado` a `=codex:0.0`, texto literal y Enter separados.
