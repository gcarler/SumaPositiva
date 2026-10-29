# OL-TERR-FICHA-01-R1 · Corrección dirigida de ficha

Estado: `correccion_dirigida_pendiente_revision`.
No dictamen EAF. Sin SQL, red, banco activo, commit, push ni despliegue.

## Archivos

- `backend/app/modules/compromisos/ficha_territorial_polis.py`
- `backend/scripts/construir_ficha_territorial_polis.py`
- `backend/tests/test_ficha_territorial_polis.py`

126 se conserva como historial.

## Correcciones aplicadas

1. Serie usa campos tipados fila/serie y contexto incluye territorio declarado, fuente exacta, unidad medida y atribución exacta.
2. Selección aplicada antes de agrupar. Filtros vacios no excluyen; filtros activos excluyen y retienen traza y razones.
3. Núcleo y ficha conservan textos crudos. Filas cortas/rechazadas se conservan con estado no evaluable si corresponde y con traza completa.
4. Contexto documental incluye estados, valor, traza y advertencias. Se conservan descripciones generales retenidas/rechazadas.
5. `parser_codigo_sha256` separado de `resultado_parser_sha256`; manifiesto registra ZIP, TXT, parser, ficha, selección y salida.
6. Identidad evidencia es solo declaración; no se certifica con estado libre.
7. ZIP/TXT leen captura única acotada, CRC y guardias antes de descomprimir; salida evita symlink.
8. Selección recibe JSON tipado; `--version-ficha` se valida y usa en manifiesto.

## Validaciones

- Ruff check: passed
- Ruff format --check: passed
- `pytest --noconftest -q backend/tests/test_ficha_territorial_polis.py`
  - corrida 1: 10 passed / 0 failed
  - corrida 2: 10 passed / 0 failed

## Piloto real local

Insumo 75, regla coma explícita, seleccion sin filtros.
- `filas_total`: 12899
- `filas_contexto_general`: 102
- `observaciones`: 12797
- `filas_excluidas_seleccion`: 0
- `observaciones_aceptadas`: 12133
- `observaciones_retenidas`: 662
- `observaciones_rechazadas`: 2
- `series`: 1423

Evidencia:
- `bridge/132_validacion_ficha_r1/pytest_ficha_r1.xml`
- `bridge/132_validacion_ficha_r1/pytest_ficha_r1_corrida2.xml`
- `bridge/132_validacion_ficha_r1/piloto_local`
- `bridge/132_validacion_ficha_r1/piloto_local.seleccion.json`

## Hashes

- ficha núcleo: `fc8c7842a7ec7a8a5d2e12bb0eda5daa0d0f02b9c252cca04023b9767f5baa89`
- CLI: `724e6c4dcb6bc83a4ce523b1b4b68d15b4a6b3e34059b837c4edac0f213c7738`
- tests: `2bb0cb7b1a5663a7ce615258d8bd0696e18dadd0e248fff5b95737c1de3209d9`
- ficha piloto: `0e53aa04d690b5e6fa53cca781926d5a87480ee5eb2168445a90a473618699e9`
- manifiesto piloto: `f91f73a2132be5eb5426bac7c2364ad76472aea19e3ba2ea3dd69f169273a3b4`

## Limites

- No certifica DIVIPOLA ni semántica.
- No se promueve al banco.
- No se ejecutan descargas o motores.
- No hay commit/push/deploy.
