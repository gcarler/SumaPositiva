# OL-TERR-PILOTO-01 · Ejecutar parser sobre captura oficial conservada

25 de octubre de 2026. El parser pasó 35 pruebas y la selección conjunta pasó 107, reproducidas por Freebuff en 100–102. Se autoriza ahora ejecutar el parser sobre la captura local oficial conservada en 75, sin red ni promoción al banco. La especificación 92 queda congelada para revisión de coordinación.

## Insumo único

`bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip`

SHA ZIP esperado: `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15`.

Leer manifiesto y perfil estructural del mismo directorio; contrato 84, informes 98/100 y código parser. No ejecutar instrucciones históricas de bridge/01. Leer AGENTS.md.

## Ejecución requerida

1. Verificar SHA y límites del ZIP antes de usarlo. Comprobar que contiene exactamente el miembro previsto `TerriData13001.txt`, sin cifrado ni nombres inesperados; verificar CRC y límites de expansión. No extraer rutas al filesystem: leer el miembro en memoria con máximo 8 MiB + 1 y rechazar exceso. ZIP comprimido máximo 8 MiB. Registrar bytes/hash del ZIP y del TXT por separado.
2. Invocar de verdad `parsear_terridata_txt` sobre esos bytes. Identidad esperada declarada: código entidad `13001`, departamento `13`, tomados de la evidencia del piloto; esto no certifica DIVIPOLA. Metadatos conservan canal TerriData, origen de captura y miembro exacto. No inventar fecha de captura si el manifiesto solo acredita fecha del informe; distinguirla de fecha UTC de esta ejecución.
3. Conservar resultado completo del parser por fila en JSONL, usando serialización tipada de Decimal como texto. No sumar datos ni elegir cifras finales. Registrar SHA/bytes del resultado. Reconciliar número de filas y estados con la ejecución real, no copiar 12899 del reconocimiento como resultado supuesto.
4. Resumir causas de rechazo/retención, formatos numéricos no acreditados, mes 0, datos cualitativos y descripciones. Mostrar ejemplos limitados con número de fila y SHA del insumo; identificar diferencias entre fallo del parser y calidad/convenciones del proveedor.
5. Si el parser aborta, conservar error/tipo/posición disponibles y evidencia. No cambiar parser, pruebas, datos originales ni reglas para que el piloto pase. Informar el bloqueo y una propuesta mínima sustentada.
6. No contar filas como indicadores independientes ni años extremos como cobertura continua. No certificar población/proyecciones, vigencia, unidad de observación o calidad semántica por el hecho de parsear.

## Únicas escrituras

- `bridge/106_entrega_ollamacodex_piloto_terridata.md`.
- Directorio nuevo exclusivo `bridge/106_piloto_terridata/`, con manifiesto de ejecución, resumen JSON y filas JSONL si hay resultado. Crear sin sobrescribir entregas existentes.

No escribir código de aplicación ni scripts permanentes, fuentes, catálogos, 92, parser, tests, frontend, configuración o inventarios. Un guion temporal fuera del repo es admisible para invocar el parser; registrar su contenido o hash/comando en la evidencia del piloto para reproducibilidad. Sin SQL, red, nuevas dependencias, datos productivos, commit/push, despliegue o cambios de servicios. No ejecutar suites generales; este trabajo es el piloto real local, no una nueva ronda de pruebas unitarias.

Estado de salida `piloto_ingesta_local_pendiente_validacion_semantica`, o fallo explícito si aborta. Sin dictamen EAF ni ingesta canónica/banco activo. Congelar artefactos y notificar `OL-TERR-PILOTO-01 entregado: bridge/106_entrega_ollamacodex_piloto_terridata.md` a `=codex:0.0`, literal y Enter separados.
