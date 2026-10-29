# OL-FUENTES-SHA-01 · Cotejo de inventario (solo lectura)

## Estado
Se verificó el inventario activo local y el resumen discrepante sin tocar aplicacion, banko, datos ni caches. No se uso red, SQL, pytest, commit, push ni despliegue. No se corrigio el hash esperado ni se ejecutó ningún sincronizador.

## Archivos y hashes verificados

| Archivo | SHA-256 actual | Bytes | mtime UTC |
| --- | --- | ---: | --- |
| `data/banco_fuentes_oficiales/inventario_pipeline_2026.json` | `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c` | 1.638.638 | 2026-10-23T03:48:48.633811Z |
| `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json` | `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38` | 4.815 | 2026-10-24T01:05:21.999383+00:00 |

El inventario activo declara para `resumen_sincronizacion.json`:
- SHA esperado: `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`
- Bytes esperados: `51693`
- Paquete: `planes_accion`
- Rol: `insumo_o_evidencia`
- Linea: `36056`

## Cotejo completo del inventario
Recorrido lectura de los 1829 artefactos:
- Coinciden: 1828
- Discrepantes: 1
- Ausentes: 0

Única discrepancia comprobada:
- `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`
  - SHA esperado: `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`
  - SHA real: `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`
  - Bytes esperados: 51693
  - Bytes reales: 4815
  - mtime actual: 2026-10-24T01:05:21.999383Z

## Fuentes y evidencia
- `bridge/183_evidencia_edd_aportes/backend_check_fallos_clasificados.json`
  - `tests.test_catalogo_fuentes_versionado::test_carga_real_no_duplica_y_no_promueve`
  - `tests.test_catalogo_fuentes_versionado::test_fallo_tardio_revierte_artefacto_insertado_desde_otra_sesion`
  - `tests.test_inventario_fuentes_polis::test_inventario_publicado_coincide_con_archivos_actuales`
- `bridge/171_evidencia_eaf_persistencia_aportes/backend_check_fallos_clasificar.json`
  - `tests.test_catalogo_fuentes_versionado::test_carga_real_no_duplica_y_no_promueve`
  - `tests.test_catalogo_fuentes_versionado::test_fallo_tardio_revierte_artefacto_insertado_desde_otra_sesion`
  - `tests.test_inventario_fuentes_polis::test_inventario_publicado_coincide_con_archivos_actuales`
- `backend/scripts/cargar_catalogo_fuentes.py:85` es la linea que hace el cotejo de hash.
- `backend/tests/test_inventario_fuentes_polis.py:81` es la linea donde falla el test de inventario.
- `backend/scripts/sincronizar_drive_planes_accion.py:37,400,412,416,432,441` muestran que `resumen_sincronizacion.json` se actualiza como resumen mutable.
- `data/planes_accion/drive_sector_seguridad/.gitignore:2` tambien excluye ese resumen del repositorio.

## Diferencias semánticas
No se conserva un archivo con SHA `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`. Solo quedan:
- La declaración del SHA y tamaño en inventarios versionados.
- El archivo actual con otro SHA y tamaño.

Por eso no se puede demostrar el contenido previo ni una diferencia semántica. No se acredita que el resumen fuera o no un artefacto distinto, ni que el cambio sea definitivo.

No se prueba la causa exacta. Lo mas consistente con los timestamps es que el resumen mutable se sobreescibio después de generar el inventario, pero eso no se acredita con evidencia directa.

## Propuesta de versionado
- `resumen_sincronizacion.json` es archivo derivado de sincronización, no dato oficial.
- No deberia ir en el inventario como `insumo_o_evidencia` con hash mutable.
- Si se necesita evidencia del resumen, guardar una copia versionada en `data/fuentes_versiones/planes_accion/drive_sector_seguridad/<timestamp>-<sha>/resumen_sincronizacion.json` con su manifiesto.
- El inventario anterior no se reescribe. Se genera nueva version y se conserva el hash del inventario anterior como historia.
- El dato oficial debe continuar con SHA y ruta congeladas. El resumen mutable debe distinguirse del dato oficial.

## Verificación de no cambio
- `inventario_pipeline_2026.json` antes y durante: `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c`
- `resumen_sincronizacion.json` antes y durante: `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`
- `backend_check_fallos_clasificados.json` antes y durante: `c38ceb8e2f92d82dac7371271cdb9d5af577c7ee94e89ee50d54135d5d8aa38f`
- `backend_check_fallos_clasificar.json` antes y durante: `5b9ce57dd6cd7689f6da4a523e2d301cf030be7a656a5fccac42b1c57faa99c8`

## Sin cambios
No se modifico app, bank, SQL, caches, tests, inventarios, scripts ni originales. Ninguna escritura fuera de `bridge/207_cotejo_ollamacodex_hash_inventario.md` y `bridge/207_evidencia_ollamacodex_hash_inventario.json`.
