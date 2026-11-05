# OL-FUENTES-SHA-02 · Captura versionada y candidato de inventario

## Copias congeladas realmente creadas
- `inventario_pipeline_2026.sha-5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c.json`
  Bytes 1638638. SHA `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c`.
- `resumen_sincronizacion.sha-7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38.json`
  Bytes 4815. SHA `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`.

Ambas son copias byte a byte. No hay hash alterado ni fecha oficial inventada.

## Candidato validado en memoria
- `candidato_inventario_20261026T20261026T055656.sha-0d67e858c4b535b36c5e6a6ac2df66fce9923d1f2d21bfcd8f907f5377d58082.json`
- Conserva 43 fuentes, 8 paquetes, 1829 entradas.
- Sustituye solo la entrada mutable de `resumen_sincronizacion.json` por
  `data/planes_accion/drive_sector_seguridad/versiones/2026-10-26/resumen_sincronizacion.7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38.json`
- La ruta futura NO existe todavía. Por eso el candidato no es cargable aún y se marca `cargable_ahora=false`.

## Historia no resuelta
El inventario activo espera `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a` con 51693 bytes. No se localizó ese archivo. No se prueban diferencias semánticas.

## Operación futura no ejecutada
`operaciones_futuras.json` define precondiciones, rutas exactas, orden y rechazo de sobrescritura o symlink.

## Generador y ajuste mínimo propuesto
El generador local usa:
- `scripts/inventariar_fuentes_polis.py`
- `RAICES` incluye `data/planes_accion`
- `EXCLUIR_MUTABLES` no contiene la ruta del resumen actual.

Ajuste mínimo sugerido:
- agregar `"data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json"` a `EXCLUIR_MUTABLES`
- permitir explícitamente el subárbol de capturas versionadas, no el resumen mutable
- mantener el resto del generador sin tocar

## Límite
Los archivos de 213 son evidencia y propuesta. No hay SQL, red, pytest, commit ni push.
