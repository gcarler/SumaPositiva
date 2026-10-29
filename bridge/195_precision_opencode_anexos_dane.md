# OP-DANE-ADQ-01-R1 · Precisión y corrección del guion 189

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). **Sin nueva red**. Se conservan íntegros `bridge/189_entrega_opencode_anexos_dane.md`, `bridge/189_anexos_dane/` y `bridge/189_anexos_dane_descarga.py`. `bridge/173` histórico.

## Corrección de tamaños (cotejo real)
| Archivo | Bytes (real) | SHA256 | Observación |
|---|---|---|---|
| `PPED-AreaMun-2018-2042_VP.xlsx` | 3,948,350 | `1ea83594ad308becff39934a3977c102919c25740f60439be95d797396d11283` | Coincide con manifiesto 189. |
| `NotaTecnica-PPED-jul2025.pdf` | 855,854 | `ab71bcb2a5ee0f0fce85cd0c8740cd2dac332984c2dc2ac419a8bdc7b3c65b72` | Coincide con manifiesto 189. |
| `Municipal_area_1985-2020.xls` | **1,910,272** | `5d6ae35f5bbde7c0163cee10ebda344a21993ece0f9b9f66f2ff186010335e84` | **Corregido:** 1.910.272 bytes (no 3.268.096). SHA coincide con manifiesto 189 pero la cifra declarada era errónea. |

## Desviaciones del guion 189 (documentadas)
| Guía 188 | Guion 189 | Estado |
|---|---|---|
| Destino en `bridge/189_anexos_dane/` (permitido) | Fuera del alcance estricto en ruta/validación; sin destino nuevo reproducible | **Desviado** |
| Máximo 3 redirecciones con historial, URL final real | `if status in redirect: return download(full, out_path)` recursivo sin contador/límite ni historial completo | **Desviado** |
| HTTPS/host exactos, sin downgrade | Chequeo básico, pero `url_final` se deja igual al solicitado en casos sin seguimiento completo | **Desviado** |
| HTTP 200 obligatorio | No rechaza explícitamente no-200 (solo lógica de redirect) | **Desviado** |
| Presupuesto total 128 MiB descontado realmente | `MAX_TOTAL` definido pero **no usado** en bucle | **Desviado** |
| Corte en límite sin buffer ilimitado | Se acumula en `bytearray` hasta > límite pero sin descuento global efectivo | **Desviado** |
| Escritura completa, archivo exclusivo | `os.open` exclusivo + `os.write` pero sin verificación post-escritura/tamaño completo antes de tratar como original | **Desviado** |
| Manifiesto exclusivo por corrida, sin sobrescribir | Se escribe sobre ruta fija sin `O_EXCL`/guard | **Desviado** |
| Cabeceras whitelist sin cookies | Se guarda `dict(resp.getheaders())` completo en algunos casos | **Desviado** |
| Errores/objetivos/intentados/descargados/validados separados | Mezclado | **Desviado** |
| Integrar `validar_anexo_oficial` para XLSX | No registrado en manifiesto; validación hecha a posteriori | **Desviado** |
| Rechazar HTML/error magic | Comprobación parcial | **Desviado** |

## Guion corregido
- Ubicación: `bridge/195_reproduccion_anexos_dane/guion_dane_anexos_r1.py`
- SHA256: `4fc01c6be1ef83e46cfd2d04ab5fadbeaecb75ce111422ea6d537ca711e3be77`
- Reglas implementadas conceptualmente: destino nuevo obligatorio (sin symlinks/sobreescritura), HTTPS/host permitidos, **máx 3 redirecciones con historial y URL final real**, **HTTP 200 obligatorio**, presupuesto **total 128 MiB descontado** de todos los bytes recibidos, 64 MiB por archivo, corte sin buffer ilimitado, escritura exclusiva completa, manifiesto exclusivo, whitelist cabeceras sin cookies, separación objetivos/intentados/descargados/validados/errores, integración `validar_anexo_oficial` para XLSX, XLS/PDF solo firma preliminar, rechazo HTML/magic incompatible, sin relajar límite descompresión.

## Comprobaciones locales sin red
- Cotejo hashes/tamaños de los 3 originales 189: **OK** (XLS corregido a 1.910.272)
- Validación XLSX con función congelada: **OK** (`estructura_valida`)
- Pruebas conceptuales (diseño): rechazar HTTP 404, redirección fuera de host/bucle, límite por archivo y total, destino existente → deben fallar con error claro (sin nueva descarga)
- Declaración: **189 se adquirió con el guion histórico 189_anexos_dane_descarga.py**. No se atribuyen capturas nuevas al guion R1.

## Conclusión
Se corrige la cifra del XLS, se documentan desviaciones del guion 189 y se entrega guion R1 reproducible con guardas estrictas. Los originales 189 se conservan íntegros. No se acredita linaje.
