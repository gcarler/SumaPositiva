# OP-TERR-CLI-01 · Revisión del consumidor CLI de ficha R2

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). CLI `backend/scripts/construir_ficha_territorial_polis.py` revisado en estado congelado (139). Ollamacodex trabaja R3 en núcleo/tests; no se ha interferido.

## Alcance
Solo lectura estática y cálculos locales sobre artefactos ya disponibles. Ruff check ejecutado (OK). Sin pytest/red/SQL/modificaciones.

## 1) Lecturas acotadas y validación
| Comprobación | Estado | Observación |
|---|---|---|
| Lectura de ZIP con SHA y miembro único | OK | `_leer_zip_validado` comprueba SHA-256 del ZIP completo, `infolist` con un solo miembro igual a `--miembro`, rechaza cifrado, valida `compress_size`/`file_size` vs límites, `testzip()` CRC. |
| Límite de bytes | OK | `MAXIMO_ZIP_BYTES=8MB`, `MAXIMO_TXT_BYTES=64MB`, lecturas acotadas (`_leer_bytes_acotados`). |
| JSON estricto selección/catálogo | OK | `_parsear_json_estricto` con `object_pairs_hook` (claves duplicadas), `parse_float/constant` rechazados, `parse_int=int`. Selección validada por `SeleccionTerritorial.model_validate`. Catálogo carga vía `cargar_catalogo_identidad` con SHA real. |
| Mismos bytes / serialización | OK | Usa `ficha.model_dump_json().encode()` una vez para bytes publicados; manifiesto serializa con `sort_keys/indent`. Publicación atómica vía directorio temporal + `rename`, sin sobrescritura (falla si existe). |
| Separación de hashes | OK | Inyecta `ficha_codigo_sha256`, `parser_codigo_sha256` (hashes de archivos fuente). Distingue `insumos_sha256`, `codigo_sha256`, `hashes_resultado`, `artefactos_sha256["ficha.json"]`. Hash de ficha **no** es hash del parser. |

## 2) Uso de catálogo/identidad
| Comprobación | Estado | Observación |
|---|---|---|
| Catálogo opcional | OK | Si `--catalogo` ausente → `catalogo=None`. Sin catálogo, identidad resuelta queda `None` y núcleo maneja pendiente; CLI no fuerza resolución. |
| SHA catálogo | OK | Usa `--sha256-catalogo` o `SHA_CATALOGO` por defecto; delega verificación a `cargar_catalogo_identidad` (mismos bytes). |
| Evidencia declarada | OK | `--identidad-evidencia` solo se registra en manifiesto como `identidad_evidencia_declarada` (declaración), no usada como verificación. |
| Metadatos viajan | OK | `identidad_resolucion` volcada en manifiesto si existe. En pilotos 139, `nombre_declarado` null por CLI (no declarado) mientras nombre de catálogo se conserva. |

## 3) Guardas CLI
| Comprobación | Estado | Observación |
|---|---|---|
| Salida acotada a `bridge/` | OK | `salida.resolve()` debe ser relativo a `ROOT/bridge`. Rechaza symlink. |
| No sobrescritura | OK | Falla si `salida.exists()` (FileExistsError). Publicación atómica. |
| No symlinks | OK | Rechaza symlink en salida, selección, ZIP. |
| Validación versión | OK | `if args.version_ficha != ficha.version_ficha: raise ValueError(...)` |
| Código inyectado | OK | Calcula hashes de `ficha_territorial_polis.py`, `parser_terridata_polis.py`, propio CLI en tiempo de ejecución (metadatos). |

## 4) Precisión: hashes de selección vs proyección canónica
| Punto | Estado | Observación |
|---|---|---|
| SHA del archivo de selección | OK (distinguido) | `insumos_sha256["seleccion"]` proviene de `ficha.seleccion_sha256` (calculado por núcleo con bytes de selección consumidos). No es el SHA del archivo del manifest/CLI sino el hash asociado a la selección usada. |
| SHA de proyección canónica del modelo | OK (distinguido) | `hashes_resultado["ficha"]` / `artefactos_sha256["ficha.json"]` son hash de `ficha_bytes` (`model_dump_json()`). Son diferentes conceptos: hash del **archivo de selección** vs hash de la **ficha JSON serializada**. CLI los separa correctamente. |
| Metadatos declarados vs comprobados | OK | Manifiesto declara límites (`sin_sql/red/promocion_banco`), hashes, conteos/cortes; comprobaciones efectivas incluyen guardas, SHA ZIP/TXT, validación JSON/ZIP, límites de bytes. |

## 5) Comparación con 139 (histórico)
- Hash histórico núcleo en 139: reporte cita cambios; **no** se afirma que 139 fue alterado por R3 — tarea indica R3 cambia núcleo deliberadamente.
- CLI SHA actual (verificado): `65776615e2d32d985a8730b7f76664142e2ab9cb0f514b43a196f9da8c08070c`
- Sin pytest ejecutado (prohibido por tarea mientras Ollamacodex trabaja R3). Ruff check OK.

## Hallazgos
**Sin defectos concretos detectados.** Diseño coherente con restricciones: mismo-bytes/SHA estricto, publicación atómica sin sobrescritura, hashes separados, catálogo opcional con delegación, guardas de ruta/symlink, validación versión. Distingue correctamente selección-hash vs ficha-serializada-hash, y declaración vs verificación.

**Observaciones (no defectos):**
1. `datetime.now().astimezone()` para `fecha_elaboracion_utc` en llamada — se pasa además `fecha_elaboracion` declarado; núcleo usa ambos según firma.
2. Carga de módulos vía `sys.path` si `__package__` vacío — necesario para ejecución directa; sin efectos.
3. Defaults a `SHA_CATALOGO` si no se pasa `--sha256-catalogo` — conveniente pero delega a validador estricto.

## Conclusión
CLI R2 congelado cumple con lo requerido: lecturas acotadas, SHA/mismos bytes, JSON estricto, guardas, publicación completa sin sobrescritura, metadatos completos con hashes separados. Distingue SHA de archivo de selección de SHA de proyección canónica. Sin modificaciones a artefactos 139/143/146.
