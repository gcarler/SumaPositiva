# FB-TERR-CLI-01 · Pruebas de la captura y publicación del CLI

26 de octubre de 2026. Recibida148 y reproducida por coordinación: 6.018 comparaciones por serie sin diferencias, 74 valores ausentes confirmados. Nuevo trabajo concreto independiente de los archivos de Ollamacodex.

Leer154 y el CLI actual `backend/scripts/construir_ficha_territorial_polis.py` (SHA `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`). Coordinación corrigió SHA archivo de selección frente a SHA del modelo. Ollamacodex modifica núcleo y su test en150/151; no editar esos archivos ni ejecutar su suite mientras trabaja.

## Únicas escrituras

- Nuevo `backend/tests/test_cli_ficha_territorial_polis.py`.
- `bridge/156_entrega_freebuff_pruebas_cli_ficha.md`.
- Nuevo directorio `bridge/156_validacion_cli_ficha/` para XML/evidencia.

No editar el CLI, parser, núcleo, resolver ni tests de otros agentes. Sin SQL/red/banco/src/commit/push/deploy/EAF.

## Pruebas concretas

Importar el CLI como módulo local sin ejecutar main automáticamente; usar temporales aislados y datos sintéticos. La clase de selección conserva su firma actual durante R3. Probar:

1. `parsear_seleccion` devuelve modelo y SHA de **bytes exactos** (JSON con espacios/salto final), capturados una sola vez. El hash canónico del modelo es otro concepto; dos archivos equivalentes con formato diferente deben tener SHA de archivo distinto y modelo equivalente.
2. JSON con claves duplicadas/float/NaN, entrada vacía y bytes que exceden el límite se rechazan según contrato. No relajar selección ni reescribir entradas.
3. `_escribir_publicacion` publica exactamente los bytes de ficha suministrados y un manifiesto legible, en directorio nuevo. Rechaza salida existente o symlink conservando su contenido.
4. Fallo al serializar manifiesto no deja una carpeta final con publicación parcial; verificar limpieza del temporal correspondiente. No provocar fallo en archivos reales.

No presentar estos tests de helpers como corrida real de main con TerriData: los pilotos completos los hace Ollamacodex151 sobre archivos congelados. Si observas un defecto real adicional, informar entrada/salida sin tocar implementación ajena.

Ruff check/format --check del nuevo test y CLI, más dos corridas de SOLO `pytest --noconftest tests/test_cli_ficha_territorial_polis.py` con XML separados bajo156. Usar `.venv/bin/python` desde backend; no suite general ni conftest que active migraciones. Registrar SHA CLI antes/después y del test final, contadores reales y límites. Congelar y notificar `FB-TERR-CLI-01 entregado` a =codex:0.0.
