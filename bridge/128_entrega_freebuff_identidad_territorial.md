# FB-TERR-ID-01 · Catálogo oficial DIVIPOLA DANE capturado y versionado (MGN2025)

26 de octubre de 2026. Agente: Freebuff. Encargo: `bridge/127_tarea_freebuff_catalogo_divipola.md`. Continuación MT-02 del plan76. Consulta GET pública, sin credenciales, solo lectura; sin SQL, sin despliegue, sin escritura remota (el servicio ARCIMS no fue modificado por estas peticiones), sin promoción al banco, sin dictamen EAF, sin commit/push. No se tocó aplicación, parser, tests, ficha126, catálogos activos, inventarios, diagramas ni diagnósticos. Ollamacodex construye ficha provisional125/126 en paralelo.

## 1. Servicio y capas verificadas

- URL: `https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer?f=pjson`
- `currentVersion: 11.3`; `serviceDescription`: «Corresponde al servicio que representa los niveles geográficos de la División Político Administrativa según el Marco Geoestadístico Nacional **MGN, versión 2025**».
- Capas declaradas: **305 Centros Poblados**, **317 Municipio**, **319 Departamento** (los IDs de capa NO son códigos territoriales; solo nombres de capa).
- Metadatos consultados antes de extraer atributos y guardados en `originales/capa_317_metadata.json` y `originales/capa_319_metadata.json` (campos, tipos, alias).

## 2. Captura real sin geometría (FASE B)

Consulta de atributos con `where=1=1`, `returnGeometry=false`, `outFields` explícitos, `orderByFields=OBJECTID`, `f=json`, en una sola petición por capa:

| Capa | Esperado (returnCountOnly) | Recibido | exceededTransferLimit | OBJECTIDs únicos | Sin geometría |
|---|---:|---:|---|---|---|
| 317 Municipio | 1122 | **1122** | False | True | True |
| 319 Departamento | 33 | **33** | False | True | True |

- `maxRecordCount` del servicio: 2000 (ambas capas < 2000).
- SHA-256 de respuestas crudas: capa317 `8981dad787780ca72b77a25d6cb01323496996318fa59e6ecb8b869035e9db8c` (248745 bytes); capa319 `0400f54a93309c694590904ba02f9a50686560bf714886c33dd3c276210961b3` (6086 bytes). HTTP 200, `Date`/`ETag` congeladas en `originales/peticiones_http.json` (ETag: `W/"60201346"`, `W/"c4c44aa3"`, Date Mon 26 Oct 2026 00:49:27 GMT para ambas respuestas).
- Reproducibilidad a las 00:51:37Z: **byte-idéntica** (mismos SHA-256 dos peticiones aparte, misma ETag). El guion reproducible es `guion_captura_128.py`, y su segunda corrida produjo `atributos_crudos_verificacion.json` (hash igual a `originales/atributos_crudos.json`).

## 3. Intento de paginación documentado (FASE A)

Primer intento con `resultOffset`/`resultRecordCount=1000` devolvió ArcGIS error 400 «Unable to complete operation» (capa 317), guardado intacto en `originales/capa317_pagina_00.json` con sus cabeceras. Causa verificada en metadatos: `advancedQueryCapabilities.supportsPagination: False`. Se abandonó el paginado por no ser soportado, no como problema de datos. Dos clics sin truncamiento son suficientes ante el conteo previo exacto.

## 4. Catálogo derivado

`catalogo_identidad_territorial.json`: solo códigos/nombres/departamento/tipo según el aporte de la fuente, con puntero al servicio, SHA de las respuestas y vintage explícito relacionado. Cada municipio: código 5 dígitos (concatenado), código departamento, nombre, tipo en el campo `MPIO_TIPO`, año de cartografía DANE (`MPIO_NANO`), año/acto de creación textual (como el campo lo trae). Escala preservada exacta: concatenados de 5 caracteres en todos los 1122, departamentos de exactamente 2 en los 33. Sin relleno de ceros arbitrario, sin reescribir nombres ni quitar acentos (identidad de registros consultados). Cadena cero lista completa en `catalogo_identidad_territorial.json`.

## 5. Cotejos exigidos (resueltos contra la fuente capturada, no contra memoria externa)

| Entidad buscada | Resultado en origen 317 | Código DIVIPOLA | Departamento | `MPIO_TIPO` según campo de la fuente |
|---|---|---|---|---|
| Cartagena (Bolívar) | CARTAGENA DE INDIAS | 13001 | Bolívar | MUNICIPIO |
| Santa Catalina (Bolívar) | SANTA CATALINA | **13673** | Bolívar | MUNICIPIO |
| Sahagún (Córdoba) | SAHAGÚN (con acento) | **23660** | Córdoba | MUNICIPIO |
| Bogotá (Capital de la República) | BOGOTÁ, D.C. | 11001 | BOGOTÁ, D.C. (dpto también en 319) | MUNICIPIO (no «Distrito Capital» en el campo de la capa 317) |

- Variación por acento detectada: `Sahagun` sin acento NO existe; solo `SAHAGÚN` 23660. `Bogotá DC` no coincide exactamente; la grafía exacta del dataset es `BOGOTÁ, D.C.` (Solución: resuelto por código verificado, conservando el original sin reconstrucciones).
- **Santa Catalina (Bolívar) es 13673** en este dataset (no 13058); razonamiento: nombre similar, no predecir código por homografía.
- La capa 317 no distingue «distrito» (Cartagena y Bogotá aparecen como MUNICIPIO en MPIO_TIPO): se registra el valor del campo tal como llega; el estatus jurídico de distrito NO se deduce ni se marca como acreditado desde este dataset.
- No se usó el municipio capital para representar el departamento: Bogotá aparece tanto en capa 319 (dpto `11`) como en capa 317 (`11001`), conservadas como entidades separadas.

## 6. Duplicados, homónimos y estatus de tipo

- **Códigos concatenados (5 dígitos): sin duplicados** en los 1122; los 33 departamentos con códigos únicos.
- **67 nombres de municipio homónimos** con códigos distintos (por ejemplo `ARGELIA` en 3 departamentos; `VILLANUEVA` en 4; `SUCRE` en 3). Sin normalización de acentos aplicada; resolución por código verificado.
- **MPIO_TIPO observado** tal como llega la fuente: 1103 `MUNICIPIO`, 1 `ISLA` (88001 SAN ANDRÉS, Archipiélago), 18 `ÁREA NO MUNICIPALIZADA`. Se registró el campo; no se reclasificó ni dedujo otro estatus jurídico.
- **DPTO_NANO del dataset es mixto: 2024 en 954 registros de municipios y 2025 en 168; departamentos también mezclados (21 con 2025, 12 con 2024)**. Vintage declarado del servicio = «MGN 2025», pero el dataset mismo deja ver que los correos de entrada son mezcla. No se declara corte 2026 completo ni vigencia histórica universal. Fecha de adquisición 2026 ≠ vintage 2025.

## 7. Códigos del piloto 118 — diferencia con el archivo final

- **El manifiesto de 118 declara `parser: 60eae40d516f14a0f619b8e571d564e9f3c215a64ac58aa3ff559154708177c4`, que NO es el SHA del archivo final revisado (código actual del parser excluido del 118 a revisión posterior, véase evidencia 120).** No se sabe si 118 usó código post-ajuste o pre-ajuste; el manifiesto refleja el estado del artefacto del momento y 120/119 verificaron campo a campo con el **parser final**. No se declara que ambos hashes sean iguales ni se inventa causa de la diferencia. 118 no fue modificado por esta tarea (se preservó como antecedente completo).
- La presente entrega (128) **no** se confunde con el histórico 118; son tareas separadas y con escrituras exclusivas sin intersección.

## 8. Límites (sin afirmar de más)

- Vintage = «MGN 2025» (fuente DANE declarada); no se acredita corte oficial 2026 en todos los niveles ni vigencia histórica universal salvo el propio dataset (`MPIO_NANO` y `DPTO_ACT_ADM` como de la fuente).
- Estados SIN cobertura consultada: 305 Centros Poblados no consultada; cobertura por centro poblado NO acreditada en esta entrega.
- No se afirmó un solo corte uniforme de datos de 2025: el mixto 2024/2025 queda como se capturó.
- La capa 317 no expone el estatus «distrito» de Cartagena/Bogotá; solo `MPIO_TIPO` = MUNICIPIO para ambas según la fuente; se declara como límite del dataset, no como una verificación de estatus jurídico.
- La tabla agg `DPTO_ACT_ADM`/`MPIO_CRSLCION` se transportó cruda; sin normalización de texto ni deducción de jurisdicciones adicionales.
- Sin atribución a Wikipedia; única fuente DANE consultada (página HTML no necesitada: servicio REST con metadatos completos y ETag dando alcance del vintage 2025).
- La captura cubre lo solicitado; nada se afirmó sobre orgánicos institucional, competencias, población, geometría de barrios ni de departamentos en detalle; solo lo capturado desde las capas 317/319 declaradas en 127.

## 9. Entregables (índice con SHA en `manifiesto_entrega_128.json`)

`bridge/128_entrega_freebuff_identidad_territorial.md` + directorio `bridge/128_catalogo_identidad_territorial/`: metadatos de servicio y capas, conteos, peticiones y cabeceras exactas, respuestas crudas SHA congeladas, catálogo derivado indexado, guion reproducible verificado, manifiesto índice. Historiales previos (75/106/112/117/118…120/127) intactos.

Estado: `catalogo_capturado_versionado_pendiente_revision`.
