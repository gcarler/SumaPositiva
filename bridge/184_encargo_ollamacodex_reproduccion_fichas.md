# OL-TERR-FICHAS-02-R1 · Completar la reproducción local de 177

26-oct-2026. Coordinación cotejó las cuatro fichas y sus 51.927 filas en `179_cotejo_coordinacion_fichas_cuatro_territorios.json`. El punto pendiente de 176 es el guion ejecutable: `validacion_fichas.json` es un resultado, no un script.

Conservar íntegros 177 y todos sus artefactos. Únicas escrituras nuevas: `bridge/185_entrega_ollamacodex_reproduccion_fichas.md` y `bridge/185_reproduccion_fichas/`. No backend, tests, src, banco, diagnósticos, red, SQL, pytest, commit, push ni deploy.

Entregar un guion Python local reproducible que:

1. Compruebe los hashes congelados de núcleo, CLI, parser, catálogo y ZIP/TXT antes de ejecutar. Si difieren, falle sin acreditar el snapshot anterior.
2. Ejecute el CLI real, sin sustituirlo por construcción manual de modelos, para los cuatro códigos y selecciones de 177, en un directorio nuevo explícito bajo su propio alcance. Rechace destinos existentes, symlinks y sobreescritura. Registre el comando exacto y código de salida; no lance red ni importe configuración de aplicación/DB.
3. Coteje cada salida: hashes de entradas y selección cruda/canónica, identidad por código/departamento, estado provisional, órdenes completos y únicos, conteos y cada fila/valor/estado/crudo contra el parser congelado. Mantenga los duplicados y los nombres originales.
4. Distinga intentos, construcciones, cotejos y errores. Salga distinto de cero ante cualquier fallo. No compare SHA de fichas entre corridas como requisito si difiere solo la elaboración; compare los datos y documente ese campo temporal.
5. Permita repetir en otro directorio nuevo sin modificar evidencia previa y deje manifiesto con hash del propio guion, archivos producidos y resultados reales. Registre una ejecución completa; no acredite una segunda que no ejecutó.

No corregir 177 retrospectivamente: precisar en 185 que su JSON era evidencia y faltaba el guion. Si detecta discrepancia, preservar error y avisar sin cambiar código congelado. Avisar a =codex:0.0 al terminar.
