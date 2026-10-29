# OL-FUENTES-SHA-02-R1 · Candidato revisado

## Congelación
- 213, 206, 207, 212 intactos.
- Banco activo, app, tests, scripts y backend sin cambios.
- Sin SQL, red, pytest, commit, push, deploy ni sincronizador.

## Artefactos 219
| Archivo | SHA-256 | Bytes |
| --- | --- | ---: |
| `bridge/219_candidato_ollamacodex_inventario_r1/candidato_inventario_r1_2026-10-26.sha-59e45cbe2dbd595297e5b31d1ac97e9a18eec86ed3e1cc5a5631ff2b6df896ce.json` | `59e45cbe2dbd595297e5b31d1ac97e9a18eec86ed3e1cc5a5631ff2b6df896ce` | 1641042 |
| `bridge/219_candidato_ollamacodex_inventario_r1/manifiesto_candidato_r1.json` | `e6597029787031a3084b51fda4e0990c385a0bc3fc5f1e71670ec5d6a3db2a94` | 2565 |
| `bridge/219_candidato_ollamacodex_inventario_r1/operaciones_futuras_r1.json` | `d23bbdb81a28cda8b30afbcfef0f76aeb75ec4ad86a44d5d5e95bd258376f8d4` | 4350 |
| `bridge/219_candidato_ollamacodex_inventario_r1/preparar_candidato_r1.py` | `3bb5ed505c5f79f378dd56404da843249703109d330925ffdd1c79704fcef685` | 6388 |

## Origen 213 verificado
| Archivo | SHA-256 | Bytes |
| --- | --- | ---: |
| `bridge/213_candidato_ollamacodex_inventario/inventario_pipeline_2026.sha-5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c.json` | `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c` | 1638638 |
| `bridge/213_candidato_ollamacodex_inventario/resumen_sincronizacion.sha-7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38.json` | `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38` | 4815 |
| `bridge/213_candidato_ollamacodex_inventario/candidato_inventario_2026-10-26.sha-0d67e858c4b535b36c5e6a6ac2df66fce9923d1f2d21bfcd8f907f5377d58082.json` | `0d67e858c4b535b36c5e6a6ac2df66fce9923d1f2d21bfcd8f907f5377d58082` | 1638713 |

## Candidato
- esquema: `polis.inventario_fuentes.v1`
- generado: `2026-10-26T06:05:52.550420+00:00`
- version: `polis.fuentes.candidato.v1`
- fuentes: 43
- paquetes: 8
- artefactos: 1829
- corte consolidado: `935d6d13a162466d1636a58dceacefb127db4bdf10eb25cbcce54a983fa4c9b9`
- entrada sustituida: índice 1648
- ruta futura:
  `data/planes_accion/drive_sector_seguridad/versiones/2026-10-26/resumen_sincronizacion.7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38.json`
- cargo: `derivado_control`
- evidencia origen: copia 213 con SHA `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`
- resultado: no cargable mientras la ruta futura no exista.

## Hallazgo historical
- original no localizado
- SHA esperado: `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`
- bytes esperados: 51693
- diferencia semantica: `no_comprobada`
- sin contenido original disponible.

## Operaciones futuras
`bridge/219_candidato_ollamacodex_inventario_r1/operaciones_futuras_r1.json`
- estado actual: `no_ejecutado`
- ruta futura: inexistente
- banco, codigo y SQL: no tocados
- precondiciones, orden y rechazos explicitos
- sin sobrescritura ni symlink
- solo publicación tras validar hashes/conteos/ruta

## Generador real
`scripts/inventariar_fuentes_polis.py`
- líneas 27–36: `RAICES` incluye `data/planes_accion`
- líneas 45–50: `EXCLUIR_MUTABLES` no incluye `resumen_sincronizacion.json`
- líneas 225–263: `_registro_artefactos()` recorre `RAICES`, calcula SHA y llama `_paquete()`
- líneas 239–241: excluye prefijos y rutas exactas mutables
- líneas 252–259: rol derivado solo cuando el nombre/camino entra en reglas concretas; el resumen entra como `insumo_o_evidencia`
- línea 266: `generar()`
- líneas 292–317: `escribir_inventario()` crea version inmutable con SHA y reemplaza la vista mutable
Ajuste mínimo sugerido: añadir la ruta exacta del resumen mutable a `EXCLUIR_MUTABLES` y que las capturas versionadas se inventarien como derivado control. No implementado.
