# OL-TERR-ADQ-02-R1 · Explicar discrepancias de identidad de161

26 de octubre de2026. Se recibieron las4 capturas161. Preservarlas completas y no repetir red. El script declaró nombres DANE en mayúsculas junto con códigos; TerriData presenta otros literales. El parser estricto marcó todas las filas `discordante_declarada`, que no equivale por sí solo a conflicto de códigos ni invalida el ZIP.

Solo escribir `bridge/167_cotejo_ollamacodex_identidad_capturas.md` y nuevo directorio `bridge/167_cotejo_identidad_capturas/`. No modificar161, aplicación, tests, parser/resolver, catálogos, banco o diagnósticos. Sin red/SQL/pytest/commit/push/deploy.

1. Verificar SHA originales ZIP/TXT/CRC y código parser contra manifiestos161. Registrar4 objetivos/respuestas/ZIP/TXT/parseos por separado.
2. Desglosar por campo la declaración estricta original: código departamento, código entidad, nombre departamento, nombre entidad. Contar discrepancias y listar pares de nombres literales; no normalizar, juntar ni inferir equivalencia oficial por parecido. Conservar los contadores originales.
3. Segunda lectura local del mismo TXT con identidad esperada de **solo los códigos** conocidos del catálogo128. Registrar contadores y diferencias con el primer contrato, especificando qué se comprobó en cada uno. No presentar esta comparación como corrección de datos ni validación de nombres/censos/semántica.
4. `anio_conforme` del guion161 cuenta únicamente `estado_temporalidad=declarada_sin_regla_proveedor`; excluye los meses0 aunque el año cumplaYYYY. Precisar ese rótulo, informar estados temporales literales y, si se cuenta conformidad del año, usar el patrón del parser y separarlo del mes.
5. Explicar por qué se obtienen0 filas aceptadas bajo la declaración completa original y qué cambia al verificar códigos. No esconder discrepancias ni rebajar controles para anunciar éxito. Si queda un conflicto de códigos, documentarlo explícitamente.

Congelar y avisar `OL-TERR-ADQ-02-R1 entregado` a =codex:0.0. Este trabajo de fuentes continúa mientras agentes independientes auditan GO-LIVE.
