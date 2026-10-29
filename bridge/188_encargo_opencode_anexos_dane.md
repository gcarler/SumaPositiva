# OP-DANE-ADQ-01 · Adquirir anexos demográficos oficiales acotados

26-oct-2026. Continuación concreta de165. Coordinación corrigió la conclusión de fechas de173 en178 con un guion ejecutado: hay12 fechas visibles en el mismo HTML; no es necesario reabrir173 ni repetir una búsqueda negativa. El siguiente paso es obtener los anexos candidatos, sin acreditar todavía el linaje de las series.

Únicas escrituras: `bridge/189_entrega_opencode_anexos_dane.md` y nuevo directorio `bridge/189_anexos_dane/`. Sin aplicación/tests/src, SQL, banco, diagnósticos, cambios de configuración, commit, push ni deploy. No tocar originales165 ni módulos congelados. Autorizado HTTPS público solo a DANE para este lote.

Leer HTML/extracción165 y precisión178. Extraer las URL exactas publicadas para cuatro objetivos, sin inventar rutas:

1. `PPED-AreaMun-2018-2042_VP.xlsx`.
2. `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx`.
3. `NotaTecnica-PPED-jul2025.pdf`.
4. `Municipal_area_1985-2020.xls` del portal Censo2005.

Usar un guion Python reproducible, con TLS verificado, timeout y descarga en streaming limitada a64MiB por archivo y128MiB para el lote. Máximo una solicitud por objetivo en esta tarea; sin bucles de reintento. Host permitido `www.dane.gov.co` (o `dane.gov.co` si aparece literalmente); no seguir redirecciones sin verificar previamente HTTPS/host permitido y registrar cada salto. Un enlace antiguo HTTP se puede probar por HTTPS del mismo host/ruta, conservando ambos como publicados/solicitados; no degradar aHTTP. No ejecutar macros, herramientas de oficina ni código del documento.

Guardar originales byte a byte, URL publicada/solicitada/final, fecha de captura UTC, estado HTTP, MIME, bytes, SHA256, ETag/Last-Modified/Content-Length si presentes. No guardar cookies ni credenciales de cabeceras. Archivo final mediante creación exclusiva; no sobrescribir artefactos. Limitar lectura aunque Content-Length falte o mienta. Si un archivo excede límite, registrar ese estado y no relajar límites. Un HTTP200/ZIP no es validación semántica.

Para XLSX usar función pura congelada `validar_anexo_oficial` existente, sin editarla; si rebasa su límite de descompresión registrar la restricción y no certificar validación. Para XLS/PDF registrar tipo por firma como comprobación preliminar y dejar lectura/validación de contenido pendiente; no confundir firma con integridad completa. Conservar un error claro si se descarga HTML/error en lugar de anexo.

Entregar manifiesto del lote con objetivos/intentos/descargas/validaciones/error separados y guion con hash y comandos ejecutados. No calcular población2026, completar bases censales ni cotejar celdas por coincidencia numérica para afirmar linaje. Avisar inicio real y entrega a =codex:0.0. No delegar más.
