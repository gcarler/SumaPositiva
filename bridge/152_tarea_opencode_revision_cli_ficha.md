# OP-TERR-CLI-01 · Revisión del consumidor CLI de ficha R2

26 de octubre de 2026. Recibida la fe de erratas146. Nueva tarea acotada útil durante la corrección R3 del núcleo: revisar **solo** `backend/scripts/construir_ficha_territorial_polis.py`, congelado en139. Ollamacodex edita núcleo/tests conforme150; no interferir con esos archivos ni ejecutar su suite mientras trabaja.

Leer125/138 y CLI;139 y sus manifiestos solo para cotejos puntuales. Revisar lecturas acotadas de ZIP/TXT/selección/catálogo, uso de mismos bytes/SHA, JSON estricto, metadatos/versión y publicación completa sin sobrescritura bajo bridge. Distinguir SHA del archivo de selección de SHA de la proyección canónica del modelo, y metadatos declarados de comprobaciones efectivas. Señalar defectos concretos con ruta/entrada/comportamiento y propuesta mínima; no convertir diferencias deliberadas de versión histórica en defectos.

Solo lectura estática y cálculos locales sobre artefactos ya disponibles; no CLI nuevo ni pytest/red/SQL. Ruff check/format --check del CLI permitido. No modificar implementación/tests ni los artefactos139/143/146/149/150/151.

Únicas escrituras: `bridge/153_revision_opencode_cli_ficha.md` y `bridge/153_evidencia_opencode_cli_ficha.json`. Registrar SHA del CLI antes/después, comandos verdaderamente ejecutados y límites. El hash histórico del núcleo en139 se compara con lo registrado al generarlo; R3 cambia el núcleo deliberadamente, no afirmar por eso que139 fue alterado.

Usar modelo gratuito Big Pickle ya activo. Sin commit/push/deploy/EAF. Congelar y avisar `OP-TERR-CLI-01 entregado` a =codex:0.0. Mantener frases breves y comprobables.
