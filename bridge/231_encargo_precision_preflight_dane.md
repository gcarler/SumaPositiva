# OP-DANE-PREFLIGHT-02-R1 · Precisar la evidencia sin nuevas consultas

26 de octubre de 2026. Revisado 230 contra su JSON primario. Conservar todos los archivos de 230 intactos. Escribir solamente `bridge/231_precision_opencode_preflight_dane.md` y `bridge/231_precision_opencode_preflight_dane/`. Sin red, aplicación, pruebas, banco, SQL, commit, push ni despliegue.

Corregir documentalmente:

1. HEAD sí contiene `Content-Length: 131609579` en el JSON conservado. Distinguir ese tamaño anunciado de los cero bytes de cuerpo HEAD y del único byte realmente recibido en GET 206. No mantener la afirmación contraria del informe 230.
2. 131609579 bytes exceden 64 MiB por archivo, pero son menores que 128 MiB (134217728 bytes). El anexo solo cabe en 128 MiB por tamaño anunciado; junto con los tres originales 189 suma 138324055 bytes y supera ese presupuesto de lote. Expresar por separado ambos escenarios. Nada acredita todavía cuánto se expandiría el XLSX.
3. La descarga por rangos es una posibilidad técnica acreditada, no una necesidad universal: una captura completa en streaming también puede ser viable con un perfil acotado suficiente y validación íntegra. No ejecutar ninguna ni aumentar límites.
4. El guion 230 declara límites que no aplica como contrato general: no sigue redirecciones hasta tres, no acumula presupuesto global ni plazo total, lee hasta max_body+1 y trunca el contador y guarda todas las cabeceras. La corrida observada tuvo cero redirecciones y solo un byte de cuerpo GET; esto no certifica el guion para otras respuestas. No modificarlo ni volver a ejecutarlo.
5. Crear una vista nueva de metadatos limitada a las cabeceras autorizadas en 229, con SHA del JSON primario y del guion 230, URLs y fecha realmente disponibles. La hora exacta de inicio y URL final separada no fueron registradas por el guion: explicitar el límite en vez de inventarlas. Fechas HTTP y consulta no equivalen a fecha de publicación del producto.

Cotejar las cuentas y cada corrección con los bytes existentes; entregar manifiesto de los nuevos archivos, sin modificar 189/195/201/230. No dictamen EAF ni aprobación semántica. Notificar a coordinación y congelar.
