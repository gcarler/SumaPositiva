# OL-FUENTES-SHA-02-R1 · Precisar candidato sin modificar213

26 de octubre de2026.213 conserva correctamente las dos copias, pero aún no es una propuesta coherente para publicación. Corregir únicamente con archivos nuevos: `bridge/219_entrega_ollamacodex_candidato_inventario_r1.md` y `bridge/219_candidato_ollamacodex_inventario_r1/`.213 queda intacto.

Defectos comprobados por coordinación:

1. `operaciones_futuras.json` y README apuntan a `candidato_inventario_20261026T20261026T055656...`, que no existe; el candidato físico se llama `candidato_inventario_2026-10-26...`. Todos los punteros internos deben existir y coincidir en SHA/bytes. Usa el nombre exacto creado en219.
2. El candidato solo cambia `archivos` y sigue con `generado_utc` del23 de octubre. No contiene referencia al inventario anterior ni la pérdida histórica; están solo en un manifiesto separado. La nueva versión debe declarar dentro de sí misma fecha real de construcción, SHA del inventario anterior y hallazgo de original no localizado, con SHA/tamaño históricos y semántica no comprobada. Conservar el corte y los datos de las43 fuentes sin inventar una nueva extracción oficial. Mantener esquema v1 que consume el backend; metadata aditiva explícita de esta captura, sin autohash circular.
3. Separar en manifiesto bytes/hash del archivo candidato de bytes/hash del resumen capturado. En213 `candidato.bytes/sha256` describen el resumen, mientras `sha_candidato` describe otro archivo; evitar esa ambigüedad.
4. El orden futuro termina diciendo que la ruta aún no existe después de indicar que se crea. Explicar estado actual no ejecutado y resultado/precondiciones de cada operación futura sin esa contradicción. No publicar nada en datos activos.
5. Revisar generador real `scripts/inventariar_fuentes_polis.py`: RAICES y EXCLUIR_MUTABLES, clasificación rol y función `_publicar_inventario`/nombre real. Citar líneas y proponer el cambio mínimo correcto para no perder trazabilidad al regenerar; no implementarlo. La exclusión del resumen solo evita que vuelva a inventariarse lo mutable; no archiva automáticamente la captura ni conserva por sí sola el hallazgo histórico.

Requisitos conservados:43 fuentes, ocho paquetes y1829 entradas, solo una entrada sustituida; ningún cambio de fuente/calidad/promoción ni de los otros1828 artefactos. Ruta futura bajo prefijo válido; captura etiquetada como control derivado sin valor de fuente oficial. No confirmar cargabilidad mientras no exista su ruta futura.

Validar el JSON del candidato, referencias locales de manifiesto/operaciones, unicidad de rutas, prefijos, cuentas y SHA de copias. El informe debe enumerar qué se comprobó realmente. Sin app/tests/docs, banco activo, red/SQL/pytest, sincronizadores, commit/push/deploy. No editar213 ni206/207/212. Notificar por tmux a `=codex:0.0` y congelar219.
