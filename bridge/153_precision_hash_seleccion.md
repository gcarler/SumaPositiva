# OP-TERR-CLI-01 · Precisión hash de selección

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Corrección puntual a 153.

## Hecho
En el CLI/manifiesto R2, `insumos_sha256["seleccion"]` proviene de `ficha.seleccion_sha256`. Según `backend/app/modules/compromisos/ficha_territorial_polis.py`, ese valor es el SHA-256 del **JSON canónico de `seleccion.model_dump()`** (proyección canónica del modelo). **No** es el SHA-256 de los bytes crudos del archivo de selección.

Este documento describe el **CLI histórico 139**; el **CLI actual fue corregido en 154**.

## Comprobación sobre manifiestos 139
| Piloto | `insumos_sha256["seleccion"]` (manifiesto 139) |
|---|---|
| `piloto-completo-identidad128` | `daf3dfe5041f86d0479c6779426f4f2a7900d4d6328ca9ea08620a79cbff8930` |
| `piloto-filtro-2020` | `5d75ca23f799e5f2569fe87db03d225c02f0909edff9922a3a8a5f0c5f1a8db1` |

## Nota sobre canonización
La canonización exacta usada por el núcleo es la que produce `model_dump()` con serialización canónica (según implementación del núcleo). Los valores anteriores provienen directamente de los manifiestos 139 y son los correctos para ese CLI histórico. Cualquier cálculo con un orden/serialización genérico distinto puede divergir; por ello se coteja **directamente contra manifiestos 139**, no contra una re-serialización arbitraria.

## Corrección a 153
La sección 4 de `bridge/153_revision_opencode_cli_ficha.md` debe leerse con la precisión: **`ficha.seleccion_sha256` = SHA-256 de la serialización canónica de `SeleccionTerritorial.model_dump()` (proyección canónica del modelo)**. No es el hash de los bytes del archivo leído.

## Conclusión
Corrección documental únicamente. No modifica CLI, núcleo ni pruebas.
