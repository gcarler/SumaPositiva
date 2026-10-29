# OL-TERR-ADQ-02 · Piloto acotado de fuentes para cuatro municipios

26 de octubre de 2026. Recibida151. Coordinación completa el cotejo y pruebas finales del núcleo; conservarlo congelado, sin más cambios de aplicación. Siguiente avance del plan76, MT-03/MT-10: comprobar que la adquisición puede obtener evidencia de varios territorios, antes de diseñar un lote nacional.

## Alcance y escrituras

Solo `bridge/161_entrega_ollamacodex_pilotos_adquisicion.md` y nuevo directorio `bridge/161_pilotos_adquisicion_territorial/`. No editar backend, frontend, catálogos, banco, diagnósticos ni evidencias congeladas. Sin SQL/pruebas de aplicación/commit/push/deploy. Se autoriza **lectura pública HTTPS acotada** del portal oficial TerriData para esta tarea.

Leer la sección de rutas de la guía75 y catálogo128; el patrón de la guía ya se comprobó para13001 en75/106. Comprobar exactamente cuatro entidades por sus códigos del catálogo: Cartagena13001, Santa Catalina13673, Sahagún23660 y Bogotá11001. Esto no acredita cobertura nacional ni estatus jurídico diferente del declarado por el catálogo.

Patrón candidato documentado: `https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData{codigo}.txt.zip`. Es ruta de archivo, no API certificada. No probar identificadores departamentales artificiales XX000 en esta tarea: el departamento13 es un nivel distinto y esa convención necesita contrato separado.

## Ejecución concreta

1. Script reproducible dentro161. Solicitudes secuenciales, timeout20s, a lo sumo un reintento por error transitorio y 8MiB reales por ZIP. No rastreo general ni autenticación. Validar destino final HTTPS oficial; si aparece otro host, documentar sin seguirlo automáticamente.
2. Capturar original por entidad, URL solicitada/final, UTC, estado HTTP, Content-Type, bytes, ETag/Last-Modified cuando existan, SHA-256 y error concreto. Datos ausentes se quedan ausentes. No ocultar HTML/error con estado200 ni convertir fallo en datos sintéticos. Mantener archivo original incluso si es respuesta de error, identificado como tal y dentro del límite.
3. ZIP se inspecciona en memoria, sin extraer rutas: miembro esperado único `TerriData{codigo}.txt`, tamaño declarado y real acotado a64MiB, sin cifrado y CRC válido. Registrar SHA TXT y encabezado literal de13columnas; cualquier discrepancia queda como hallazgo, sin adaptar esquemas silenciosamente.
4. Solo si estructura/identidad lo permiten, invocar el parser congelado actual (sin editarlo), regla numérica explícita `decimal_coma_miles_terridata.v1`, identidad del código objetivo. Registrar contadores y estados, códigos/nombres realmente presentes, coincidencias/discordancias y límites. Un TXT descargado o un valor parseado no acreditan validación semántica ni condiciones de uso.
5. Comparar la captura nueva de13001 con ZIP75, conservando ambas versiones si difieren. Registrar **objetivos, intentos HTTP, respuestas, ZIP válidos, TXT válidos, parseos y discrepancias** por separado; nunca llamar a todo ello entidades ingeridas o fichas certificadas.

No usar funciones de escritura productiva ni incorporar las filas a la base. No forzar que otros municipios repitan los12899 registros de Cartagena. Si el portal no responde, entregar límites y errores reales, sin anunciar éxito.

Congelar y notificar `OL-TERR-ADQ-02 entregado` a =codex:0.0, literal y Enter separados. Esta tarea puede avanzar mientras coordinación valida el bloque anterior; no depende de modificar sus módulos.
