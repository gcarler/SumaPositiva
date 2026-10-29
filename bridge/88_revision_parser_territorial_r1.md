# OL-TERR-01-R1 · Cierre de revisión estática

24 de octubre de 2026. **Sin hallazgos bloqueantes en esta revisión estática.** Los cuatro hallazgos de 87 están corregidos en el código examinado. Esto habilita preparar la validación funcional; no acredita funcionamiento, integración, cobertura territorial ni dictamen EAF.

## Correcciones comprobadas por lectura

- Estados reinicializados en cada fila; ancho incorrecto queda rechazado con estado numérico no evaluable, sin heredar el de la fila anterior.
- Año/mes no conformes, mes 0, ausencia de ambos valores y pendientes de identidad retienen la fila; rechazo estructural conserva prioridad. Avisos informativos se separan de esas causas. Un dato cualitativo no exige por sí mismo un número.
- Celdas excedidas no pasan a conversión numérica. Errores CSV de encabezado y cuerpo se traducen a errores de entrada con línea disponible. El parser no modifica el límite global de CSV y declara esa dependencia ambiental.
- Identidad no contrastable y no evaluable se separan de concordancia/discordancia declarada; no hay certificación DIVIPOLA implícita.

## Comprobaciones de coordinación

- Ruff check: exit 0.
- Ruff format --check: exit 0.
- AST: válido.
- Contrato: JSON válido y su `model_schema` es un esquema válido Draft 2020-12. Esto comprueba la validez del esquema, no la equivalencia funcional de todas sus reglas con el código.
- Hashes del parser y contrato coinciden con el informe 84.
- Hay 22 casos previstos documentados: **ninguno ejecutado por coordinación**.

No se ejecutaron parser, corpus real, pruebas sintéticas, pytest, SQL ni red. No integración, commit/push o despliegue.

## Pendientes para aceptación funcional

Verificar con casos dirigidos la clasificación fila a fila, conservación de originales, reconciliación de conteos, exactitud Decimal y serialización; incluir secuencias válidas/inválidas para detectar herencia accidental de estados. Comprobar límites, JSON de salida, errores CSV y dependencia del límite ambiental. Después, ejecutar un piloto explícitamente autorizado sobre la captura territorial conservada, sin promover al banco hasta evaluar resultados. El catálogo oficial de identidades y las reglas temporales del proveedor siguen pendientes.

Detalle documental menor: el informe 84 enumera cuatro estados temporales, pero código y esquema incluyen además `no_evaluable_por_estructura`; prevalece la enumeración completa del contrato. Corregir esa lista cuando se actualice el informe, sin reinterpretarla como omisión de la implementación.

Los tres archivos de entrega quedan congelados. Evidencia y hashes en `88_evidencia_parser_territorial_r1.json`.
