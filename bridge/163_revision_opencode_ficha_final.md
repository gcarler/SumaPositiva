# OP-TERR-FINAL-01 · Validación independiente del núcleo corregido

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Conservados 143/146/153 y precisiones. Sin modificar aplicación/tests/datos. Sin ejecución de tests CLI de Freebuff ni suite general.

## 1) Pruebas dirigidas
**Comando:** `cd backend && PYTHONPATH=. .venv/bin/python -m pytest --noconftest tests/test_ficha_territorial_polis.py -q --junitxml=/root/polis/bridge/163_validacion_opencode_ficha_final/pytest_ficha.xml`  
**Resultado:** **42 passed in 2.13s** (coincide con lo esperado).

## 2) Ruff
- `app/modules/compromisos/ficha_territorial_polis.py`, `tests/test_ficha_territorial_polis.py`, `scripts/construir_ficha_territorial_polis.py`: **check All checks passed!**, **format --check 3 files already formatted**.

## 3) Hashes actuales (bytes locales)
| Archivo | SHA256 |
|---|---|
| `backend/app/modules/compromisos/ficha_territorial_polis.py` | `7c3dd7207755dfcf78ba51e8c982b00912079effa9276742148ea68dadf3c874` |
| `backend/app/modules/compromisos/parser_terridata_polis.py` | `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100` |
| `backend/scripts/construir_ficha_territorial_polis.py` | `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570` |
| `backend/tests/test_ficha_territorial_polis.py` | `9272b76e972583f43ea549c4845ec0bf937673c62e35aeb829f303aa15949e50` |

Coinciden con `codigo_sha256` registrados en `bridge/157_validacion_coordinacion_ficha_final/validacion.json`.

## 4) Cotejo pilotos 157
Cotejados contra manifiestos/selecciones de `bridge/157_validacion_coordinacion_ficha_final/`.

| Piloto | exit | ficha_sha256 | manifiesto_sha256 | selección archivo / canónica | conteos | identidad | estado ficha |
|---|---|---|---|---|---|---|---|
| completo | 0 | `19e06b41...d41f80` | `67644648...cd8947e` | `aee97879...f7b93a2` / `36265dcf...fbca5a0` | 12899 filas, 102 ctx, 12797 obs, 0 excluidas, 1423 series, dup_celda 2, acc/ret/rec obs 12133/662/2, ctx 97/5/0 | encontrado | provisional_pendiente_validacion_semantica |
| filtro-2020 | 0 | `1fc1e986...e572915` | `f052b80a...7644d9e` | `9925e783...568a33b30` / `cebf3140...f41be0` | 12899 filas, 102 ctx, 900 obs, 11897 excluidas, 889 series, dup_celda 0, acc/ret/rec obs 852/48/0, excl acc/ret/rec 11281/614/2 | encontrado | provisional_pendiente_validacion_semantica |

- `ordenes_exactos_sin_perdidas: true` en ambos.
- Código sin cambios durante pilotos (`codigo_sin_cambios_durante_pilotos: true`).
- Discrepancia histórica CLI piloto completo 151 vs 157 es ejecución distinta (CLI corregido en 154); no se trata como cambio de 157.

## 5) Verificación puntual (revisión estática)
| Aspecto | Estado | Observación |
|---|---|---|
| Pertenencia `o.serie_id == serie.serie_id` | OK | Núcleo valida pertenencia por `serie_id` con verificación de unicidad global de órdenes. |
| Duplicados derivados del contenido | OK | Conteo de `duplicados_celda` presente; validadores aplican reglas de contadores fuertes. |
| Filtro con año no evaluable | OK | `SeleccionTerritorial` rechaza años no enteros/float/bool/texto no entero; fila con año no legible marcada como `criterios_no_evaluables=("anio",)` y no como satisfecha. Filtros vacíos no excluyen. |
| Conservación de estados | OK | Estados de identidad parciales/conservados; sin aceptar estado externo como acreditación. |
| Identidad parcial / nivel declarado | OK | CLI pasa identidad esperada; núcleo/catalogo opcional; evidencia declarativa separada. |
| Fuente/unidad separados | OK | Metadatos fuente/unidad se mantienen separados, no fusionados. |
| Patrón YYYY | OK | Parser usa patrón `\\d{4}` (no se confunde con ASCII). |
| Fixture sintético vs real | OK | Sin asumir evidencia real de fixtures sintéticos. |
| Selección SHA | OK | CLI distingue SHA archivo vs SHA canónico `model_dump()` (precisado en 153). |

## Conclusión
Núcleo corregido pasa **42/42** pruebas con `--noconftest`. Ruff limpio. Pilotos 157 íntegros, hashes código coincidentes, contadores e identidad coherentes, órdenes sin pérdidas. Sin defectos concretos detectados. Sin dictamen EAF/aprobación de despliegue.
