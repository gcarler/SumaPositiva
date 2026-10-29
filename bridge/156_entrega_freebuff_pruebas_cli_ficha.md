# 156 · Entrega Freebuff pruebas CLI ficha (FB-TERR-CLI-01)

26 de octubre de 2026. Alcance 155 cumplido: nuevo test de CLI únicamente, sin editar el CLI, el núcleo, el parser, el resolver ni los tests/corridas de Ollamacodex (150/151 intactos). Sin SQL/red/banco/src/commit/push/deploy/EAF, sin conftest ni suite general, sin migraciones activadas.

## Escrituras

- `backend/tests/test_cli_ficha_territorial_polis.py` — SHA-256 `782fd9ed445aa1d6753d054fb0df47ee43a897b15d44e0252c5525f1a708a13c` (11 pruebas).
- `bridge/156_validacion_cli_ficha/junit_corrida1.xml` — SHA `de59a890a9f405a61ff0cdaf7172f8fada0d3ef1ed624635e6c26d07bce00e90`.
- `bridge/156_validacion_cli_ficha/junit_corrida2.xml` — SHA `e8dc4181c9b12347ae48e6a9b9e0db1fe68fee62e36adef98bfb44c48781330d`.
- Este archivo 156.

## SHAs del CLI antes/después

- Antes de tocar nada: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570` (igual al declarado en el encargo 155).
- Después de las dos corridas y de ruff: **idéntico**, `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`. El CLI no fue modificado.

## Contenido de las pruebas (helpers, no pilotos)

El CLI se importa como módulo local (importlib, `main` sigue inactivo); los datos son sintéticos en `tmp_path` aislado; la regla `SeleccionTerritorial` se conserva con su firma actual (R3).

1. **`parsear_seleccion` devuelve modelo y SHA de bytes exactos** (capturados en una lectura): SHA calculado == SHA-256 de `json` con espacios internos + salto final escrito en disco; segunda lectura del mismo archivo da el mismo SHA y modelo igual.
2. **Formatos distintos → SHA de archivo distinto y modelo equivalente**: dos archivos con misma semántica y distinta presentación difieren en SHA `sha_archivo` pero `SelecciónTerritorial == SelecciónTerritorial`; además el SHA de archivo crudo no coincide con la proyección canónica del `model_dump` (precisión 153: los dos conceptos son distintos).
3. **JSON estricto sin relajación**: claves duplicadas (`Clave JSON duplicada`), float (`2020.5`), `NaN`, entrada vacía y bytes superando el límite declarado de 2 MiB de selección → todos `ValueError` con el mensaje contractual; ninguna entrada reescrita.
4. **`_escribir_publicacion` publica bytes exactos + manifiesto legible** en directorio nuevo (parent creado por la función), con exactamente `ficha.json` + `manifiesto.json`; rechaza salida **ya existente** (`FileExistsError`) conservando el contenido previo; rechaza **symlink** (`ValueError`) conservando el objetivo.
5. **Fallo de serialización no deja publicación parcial**: manifiesto no serializable (`set`) → `TypeError`, no queda carpeta final ni temporal `.publicacion.tmp-*` en el parent. Sin tocar archivos reales.

## Contadores reales (leídos de los XML)

- Corrida 1 (`junit_corrida1.xml`, `-v`): **11 tests, 0 fallos, 0 errores, 0 skipped; 0.11 s**.
- Corrida 2 (`junit_corrida2.xml`, `-p no:cacheprovider`): **11 tests, 0 fallos, 0 errores, 0 skipped; 0.09 s**.
- ID de salida de pytest: no se tocó ningún otro test de la suite ni el conftest; `--noconftest` en ambas corridas; no hay migraciones activadas (ninguna conexión/SQL).

## Ruff (invocado vía `.venv` de backend)

- `ruff check tests/test_cli_ficha_territorial_polis.py scripts/construir_ficha_territorial_polis.py` — All checks passed (test + CLI).
- `ruff format --check` ídem — 2 files already formatted (una línea del test se reformató en el primer pase antes del primer commit, queda con el formato que pide ruff).

## Límites de alcance

- No se editó el CLI `construir_ficha_territorial_polis.py` ni núcleo/parser/resolver.
- No se ejecutó la suite general ni se corrió `pytest` sin `--noconftest`.

## Congelación y notificación

Los 3 entregables declarados arriba quedan congelados con sus SHAs. Aviso `FB-TERR-CLI-01 entregado` enviado a `codex:0.0`.
