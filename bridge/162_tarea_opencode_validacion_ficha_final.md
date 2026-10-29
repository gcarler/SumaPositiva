# OP-TERR-FINAL-01 · Validación independiente del núcleo corregido

26 de octubre de 2026. Conservar143/146/153 y sus precisiones. Coordinación ajustó pertenencia exacta de observación a serie y uso del patrón YYYY del parser; CLI ya distingue SHA de archivo de selección y SHA canónico (154). Aplicación congelada, pruebas CLI de Freebuff158/159 en su archivo separado.

## Revisión concreta

Leer solo núcleo `backend/app/modules/compromisos/ficha_territorial_polis.py`, su test `backend/tests/test_ficha_territorial_polis.py`, CLI para contexto y `bridge/157_validacion_coordinacion_ficha_final/validacion.json`. No modificar ningún archivo de aplicación/tests/datos. No abrir filas masivas en el contexto: usar cálculo local para agregados/cotejos puntuales.

Verificar pertenencia `o.serie_id == serie.serie_id`, unicidad global de órdenes, duplicados derivados del contenido, filtro con año no evaluable, conservación de estados, identidad parcial y nivel declarado. No confundir el fixture sintético con evidencia real ni asumir ASCII donde el patrón del parser es `\\d{4}`. Fuente/unidad y metadatos deben permanecer separados.

Ejecutar SOLO desde backend `.venv/bin/python -m pytest --noconftest tests/test_ficha_territorial_polis.py -q --junitxml=/root/polis/bridge/163_validacion_opencode_ficha_final/pytest_ficha.xml`. Se esperan42 casos del archivo, registrar el resultado real. Ruff check/format --check de núcleo, su test y CLI. No correr tests CLI que Freebuff está terminando ni suite general/conftest/SQL/red.

Cotejar los dos pilotos157 con sus manifiestos y SHA actuales del núcleo/CLI/parser (leer bytes locales); comprobar selecciones, contadores e identidad sin atribuir aptitud semántica. Registrar hashes antes/después; no tratar la discrepancia histórica de CLI del piloto completo151 como cambio del157, son ejecuciones diferentes.

## Únicas escrituras

- `bridge/163_revision_opencode_ficha_final.md`.
- Directorio `bridge/163_validacion_opencode_ficha_final/` para XML y evidencia JSON.

Generar JSON con `json.dump`/herramienta estructurada y volver a leerlo con `json.loads` para exigir que sea un objeto; no escapes literales ni fechas inventadas. Informar cualquier defecto concreto con entrada/salida; no emitir dictamen EAF ni aprobación de despliegue. Usar Big Pickle gratuito, sin commit/push/banco. Congelar y avisar `OP-TERR-FINAL-01 entregado` a =codex:0.0.
