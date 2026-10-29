# 159 · Entrega Freebuff precisión pruebas CLI (FB-TERR-CLI-01-R1)

26 de octubre de 2026. Precisión acotada 158 sobre el único archivo propio, conservando 156 y sus XML intactos. Coordinación terminó sus ajustes del núcleo; sin cambios de aplicación.

## Escrituras

- `backend/tests/test_cli_ficha_territorial_polis.py` — único archivo editable:
  - SHA **antes** (versión 156): `782fd9ed445aa1d6753d054fb0df47ee43a897b15d44e0252c5525f1a708a13c`.
  - SHA **después** (versión 159): `3d0b71722407ed1722f5c75eb474b8a52d4be0677450fccabd6dfb3bd0729942`.
- `bridge/159_validacion_pruebas_cli_r1/junit_corrida1.xml` — SHA `b682b3bf7e636b849cf93e45e83a56b7f69cb3909cff2c4d774547e43effb472`.
- `bridge/159_validacion_pruebas_cli_r1/junit_corrida2.xml` — SHA `410df1792194fbfe2a8add55c8d938b0084ad97ce92050467ee3f69af4728932`.
- Este archivo 159.

## Precisión 1: spy de lectura única

Fija `spy_lectura` (monkeypatch `Path.open`, instalado tras cargar el módulo y tras escribir el archivo): envuelve la apertura contando **solo** aperturas de la ruta dada, y cualquier otro archivo fluye sin registro.

- Primera prueba ahora comprueba: `contador == 1` tras la primera invocación y `contador == 2` tras la segunda — **exactamente una captura por llamada**, igualdad de SHA entre invocaciones.

## Precisión 2: canónico exacto y caso de igualdad

- El hash canónico usado en el test duplica exactamente la definición del núcleo: `model_dump(mode="json")` + `json.dumps(ensure_ascii=False, sort_keys=True, separators=(",", ":"))` (helper `_hash_canonico_seleccion`).
- La vieja frase «no puede coincidir» quedó eliminada. En el test de formatos distintos los dos SHA de archivo difieren del canónico **porque esos bytes no son la serialización canónica** — hecho puntual, no regla general.
- Nuevo test `test_archivo_canonico_con_shas_iguales_y_modelo_conservado`: archivo cuyo contenido son exactamente los bytes canónicos → `sha_archivo == hash_canonico` **y** el modelo validado conserva equivalencia con la selección origen.

## Corridas y ruff (`.venv` de backend, `--noconftest`)

- Corrida 1 (`junit_corrida1.xml`, `-v`): **12 tests, 0 fallos, 0 errores, 0 skipped; 0.12 s**.
- Corrida 2 (sin caché, `junit_corrida2.xml`): **12 tests, 0 fallos, 0 errores, 0 skipped; 0.10 s**.
- `ruff check` y `ruff format --check` del único archivo: **All checks passed** (una línea reformatada por ruff antes de la primera corrida).

## Integridad de otros archivos

- CLI `backend/scripts/construir_ficha_territorial_polis.py` intacto: SHA `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570` (idéntico antes y después de R1).
- 156 y sus dos XML, núcleo, parser, resolver y tests/corridas de otros agentes: sin tocar.

## Congelación y notificación

Los 4 entregables declarados arriba congelados con sus SHAs. Aviso `FB-TERR-CLI-01-R1 entregado` enviado a `codex:0.0` (literal y Enter separados).
