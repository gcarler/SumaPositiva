# FB-TERR-CLI-01-R1 · Comprobar lectura única y canónico exacto

26 de octubre de 2026. Recibida156; sus 11 pruebas se reprodujeron dentro de la corrida conjunta233 de coordinación. Conservar156, sus XML y todas las evidencias anteriores.

Editar exclusivamente tu archivo `backend/tests/test_cli_ficha_territorial_polis.py`. Dos precisiones puntuales para cerrar el contrato155:

1. La primera prueba comprueba igualdad entre dos invocaciones, pero todavía no cuenta lecturas dentro de cada invocación. Añadir un spy sobre apertura/lectura del archivo de selección y comprobar exactamente una captura por llamada; instalarlo después de cargar el módulo y escribir el fixture, sin registrar otros archivos.
2. El JSON canónico real usa `model_dump(mode="json")`, `ensure_ascii=False`, `sort_keys=True`, **`separators=(",", ":")`**. Usar esa misma definición en el test. No afirmar que los dos hashes nunca pueden coincidir: si el archivo ya contiene exactamente ese JSON canónico, pueden ser iguales. Añadir el caso de archivo canónico con igualdad de hashes y modelo conservado.

No editar CLI, núcleo, otros tests, fuentes o datos. Coordinación terminó sus ajustes del núcleo; no se requieren cambios de aplicación de tu parte. Ruff/test dirigido de tu único archivo, dos corridas con XML nuevos bajo `bridge/159_validacion_pruebas_cli_r1/`. Entrega `bridge/159_entrega_freebuff_precision_pruebas_cli.md`, SHA antes/después y comprobaciones exactas.

Sin red/SQL/banco/src/commit/push/deploy/EAF. Congelar y avisar `FB-TERR-CLI-01-R1 entregado` a =codex:0.0. No añadir más alcance.
