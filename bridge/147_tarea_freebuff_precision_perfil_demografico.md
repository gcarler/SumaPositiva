# FB-TERR-SEM-01-R1 · Precisar causas y reproducción del perfil 141

26 de octubre de 2026. Coordinación cotejó las 354 series y 5.835 filas del perfil contra JSONL 118: sin series omitidas ni diferencias en años, contadores de filas/estados/valores o rangos de orden. Los 19 grupos son etiquetas literales de atribución, no 19 instituciones independientes. Conservar 141 y todos los insumos anteriores.

Escrituras autorizadas únicamente:

- `bridge/148_fe_erratas_freebuff_perfil_demografico.md`
- `bridge/148_evidencia_freebuff_perfil_demografico.json`
- `bridge/148_reproducir_perfil_demografico.py`

Corregir atribuciones del informe y dejar reproducción exacta de los hechos, sin modificar datos o código de aplicación:

1. Las **74 filas retenidas** tienen `estado_valor_numerico=no_presente`, ambos campos de valor vacíos y advertencia `sin_valor_declarado`. No son fallos de formato decimal. Son 68 filas de permisos especiales y 6 de resguardos; verificar series y órdenes y documentar. En el texto literal de las series de migración aparece **PEP**, no sustituirlo por PPT. No cambiar la regla del parser ni rellenar vacíos con cero.
2. Variantes de la etiqueta fuente («DNP»/«DNP ») se conservan como claves literales distintas; eso no acredita que sean instituciones o productos diferentes. Precisar esta frase del informe 141.
3. El código incluido en 141 es una reproducción parcial: omite campos del JSON final. Proporcionar un script local ejecutable que coteje el JSON 141 contra JSONL 118 de forma íntegra para los agregados por serie/fuente, años, estados, valores, órdenes y duplicados. Preferir modo verificación sin reescribir 141; registrar SHA de ambos insumos y las verificaciones reales. No afirmar identidad byte a byte del generador incompleto. Guardar resultados de la ejecución real en 148 evidencia, con salida no sobrescribible si el script genera un archivo.
4. Mantener la base/naturaleza/vintage desconocida cuando falta evidencia primaria. La expresión de dimensión «Censo 2005» es evidencia literal contextual; no equivale a certificar la base de cada serie. No calcular población 2026 ni cambiar la regla solicitada por el usuario.

Solo archivos locales ya disponibles. Sin red/SQL/pytest/código de aplicación/ficha/resolver/catálogos/banco/commit/push/deploy. No reabrir auditorías 134/143. Tras escribir y verificar, congelar y avisar `FB-TERR-SEM-01-R1 entregado` a =codex:0.0. Si terminas antes que Ollamacodex, queda disponible para revisión acotada de ficha R2 cuando coordinación la asigne.
