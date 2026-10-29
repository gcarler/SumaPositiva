# OP-DEMO-QA-01 · Precisión verificable del linaje DANE (165)

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Alcance exclusivamente documental, sin modificar 165 ni interrumpirlo. Sin red/SQL/pytest/app/tests/frontend/banco/commit/push. Conservados 141/165.

## 1) Fechas en el HTML vs metadatos
- **Manifiesto 165:** `proyecciones_de_poblacion` tiene `Last-Modified: Mon, 26 Oct 2026 03:43:16 GMT` (y `Date` de captura). No hay `datePublished` ni `dateModified` en meta/JSON-LD visibles.
- **Búsqueda en original:** `grep -n "julio\|agosto|datePublished|dateModified"` en `bridge/165_evidencia_linaje_demografico/originales/proyecciones_de_poblacion.html` **sin resultados**. Solo aparece `<div class="fecha-lenguaje" ...>` (widget de idioma/fecha UI), no fecha de publicación/actualización del producto.
- **Hallazgo del coordinador:** se mencionan `18-julio-2025` y `8-agosto-2025` en la página de proyecciones consultada por coordinación. **No se localizan esos literales en el HTML capturado por 165** (`originales/proyecciones_de_poblacion.html`). Solo afirmar lo constatable: en el original capturado **no hay `datePublished/dateModified`**; las fechas de UI no prueban edición del producto. El literal `2025` en nombres de archivo (ej. `NotaTecnica-PPED-jul2025.pdf`) es **indicio del archivo**, distinto a fecha de edición/publicación de la página o de todas las series TerriData.
- **Conclusión:** **Distinguir** ausencia de metadatos de publicación/modificación de ausencia de fechas en cuerpo. Cualquier fecha por producto debe localizarse con fragmento/puntero en el **original capturado 165**; no generalizar a toda la página o a todas las series.

## 2) Etiquetas de fuente: 19 vs 18 filas
- **Perfil 141 (`bridge/141_evidencia_demografica.json`):** 
  - `agregado_por_fuente` tiene **19 entradas**.
  - Valores de `fuente` distintos en series: **19**.
  - Las dos variantes son: `"DNP (Observatorio Nacional de Migraciones)"` y `"DNP (Observatorio Nacional de Migraciones) "` (diferencia por espacio final).
- **Tabla 165:** muestra **18 filas** porque **agrupa** esas dos variantes del Observatorio Nacional de Migraciones en una sola fila de agrupamiento.
- **Universo:** **354 series / 5.835 filas** permanecen tal como en 141. **No** perder la segunda etiqueta: son literales distintos en el corpus.
- **Corrección:** No afirmar "18 etiquetas literales". Lo correcto: **19 etiquetas/fuentes literales distintas**, **19 pares dimensión/fuente**; la tabla presenta **18 filas** por **agrupamiento deliberado** de las dos variantes ONM.

## 3) Coincidencia de valor no basta para cerrar linaje
La afirmación "coincidir un valor basta para cerrar qué edición sirvió" es **insuficiente**. Una coincidencia es **corroboración candidata**, no prueba completa.

**Verificaciones adicionales mínimas (enumeradas):**
1. **Identidad territorial** (código/departamento/municipio/nivel) — debe coincidir exactamente con el registro TerriData.
2. **Indicador/definición/unidad/universo** — descripción, unidad de medida, universo/población objetivo.
3. **Periodo** — años cubiertos y si son estimados/proyectados/retroproyectados.
4. **Base/edición** — base censal (CNPV2005 vs CNPV2018), vintage/actualización (ej. PPED 2025), año de edición.
5. **Transformaciones DNP** — si la fuente es "DNP..." identificar qué producto DANE usó y transformaciones aplicadas.
6. **Evidencia de vínculo con el producto** — localizar la celda exacta en el anexo oficial (Excel/PDF), ficha/metodología, concatenación de claves (familia+indicador+territorio+periodo), y trazabilidad al archivo nombrado en el portal.
7. **Coherencia con retroproyecciones** — para años < 2018 considerar ambas generaciones (base 2005 o retroproyección edición 2018); el año **no** determina la edición por sí solo.

**Conclusión:** Sin estas verificaciones, una coincidencia numérica es solo indicio. 165 identifica **candidatos**, no acredita linaje para ninguna fila.

## Verificación de manifiesto/archivos
- Manifiesto 165 verificado: `proyecciones_de_poblacion` 200 OK, `censo_general_2005` 200 OK. SHA registrados en manifiesto. Originales HTML presentes: `proyecciones_de_poblacion.html`, `censo_general_2005_1.html`.
- Comandos ejecutados: `grep` en originales 165, conteos sobre `141_evidencia_demografica.json`.
