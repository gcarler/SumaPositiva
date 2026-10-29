# OP-DANE-ADQ-01-R1 · Precisar189 y corregir guion sin nueva red

26-oct-2026. Coordinación verificó SHA y bytes de los tres originales189: coinciden con el manifiesto. El XLS tiene **1.910.272 bytes**, no3.268.096 como afirma el informe. La descarga grande no dejó archivo completo. Los originales siguen siendo candidatos, no datos semánticamente acreditados.

Conservar íntegros189, su manifiesto, reporte y guion histórico. Únicas escrituras nuevas: `bridge/195_precision_opencode_anexos_dane.md` y `bridge/195_reproduccion_anexos_dane/`. **Sin nueva red**, sin app/tests/src/SQL/banco/diagnósticos/pytest/commit/push. No corregir evidencia histórica retrospectivamente.

El guion189 no respalda varias guardas declaradas: MAX_TOTAL no se usa; redirecciones recursivas sin límite/historial y url_final declarada igual a original; no rechaza explícitamente HTTP no200; devuelve todas las cabeceras; manifiesto usa escritura sobrescribible; os.write una sola vez no garantiza bytes completos; no registra validación XLSX en manifiesto; no acepta destino nuevo reproducible; y quedó fuera del directorio permitido de188. Documentar la desviación de ruta sin borrar el guion anterior.

Entregar un guion corregido dentro195 y comprobación local sin red:

- Destino nuevo obligatorio, sin symlinks/sobreescritura; solo crea artefactos en195. SHA del original/objetivos/punteros de165 comprobados; URL publicada distinta de solicitada si se eleva HTTP aHTTPS.
- HTTPS/host exactos permitidos, máximo3redirecciones con historial y URL final real; no bucles ni downgrade. HTTP200 obligatorio para tratar como anexo.
- Presupuesto total128MiB realmente descontado de todos los bytes recibidos, incluso objetivos descartados, y64MiB por archivo. Corte en límite sin buffer ilimitado; timeout/deadline. Comprobar Content-Length si existe sin confiar en él.
- Escritura completa mediante archivo binario exclusivo; no guardar parciales como originales completos. Manifiesto exclusivo por corrida, fecha UTC por intento, MIME y whitelist de cabeceras sin cookies, errores/objetivos/intentados/descargados/validados separados. Estado global parcial/error cuando falte un objetivo; nunca anunciar lote completo por exit0 constante.
- Integrar la función congelada validar_anexo_oficial para XLSX con su hash/evidencia. XLS/PDF solo firma preliminar declarada, no validación completa. Rechazar HTML/magic incompatible. No aflojar el límite de descompresión del validador.
- Demostrar sin red, con dobles locales acotados, rechazo deHTTP404, redirección fuera dehost/bucle, límite por archivo y total, y destino existente; además, cotejar los tres archivos reales189 con sus hashes y tamaños. Guardar resultados reales y fallar si una negativa no se cumple.

No ejecutar otra descarga para fingir que el nuevo guion produjo189: declarar que189se adquirió con el guion histórico. No acreditar propiedades nuevas retrospectivamente ni afirmar que un header Last-Modified identifica la edición de una serie. Entregar precisión/tamaño corregido, guion reproducible, comandos y resultados de comprobaciones locales. Avisar a =codex:0.0.
