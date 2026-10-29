# 165 · Revisión freebuff — linaje demográfico (FB-DEMO-LINAJE-01)

26 de octubre de 2026. Entrega de evidencia primaria (tarea 164): dos páginas oficiales DANE capturadas en HTTPS público acotado, más candidaturas de correspondencia familia↔producto (orden 165). **No se asignaron bases censales a las 354 series de 141; no se cambió catálogo, código, banco ni otros entregables; no se abrieron lotes, PDF u hojas.**

## 1. Evidencia primaria capturada

Directorio: `bridge/165_evidencia_linaje_demografico/` (originales HTML, `manifiesto.json`, `extraccion_vinculos_165.json`, guion reproducible `guion_captura_165.py`).

| Página | URL | HTTP | Bytes | SHA-256 |
|---|---|---|---|---|
| Proyecciones de población | `https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion` | 200 | 92.399 | en `manifiesto.json` |
| Censo general 2005 | `https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/censo-general-2005-1` | 200 | 103.047 | en `manifiesto.json` |

- Momento de captura: `2026-10-26T03:52:31Z` (UTC) y consecutivo; sin redirección, `text/html; charset=utf-8`.
- Límites respetados: ≤8 MiB, timeout 20 s, un reintento (no se necesitó), solo host `www.dane.gov.co`, sin credenciales, sin descargar material listado.
- **Fecha/edición de publicación: NO declarada** en el HTML de ninguna de las dos páginas (no hay `datePublished`/`dateModified`/meta `article:*`). Lo único fechado procede de nombres de archivo (Nota técnica PPED jul 2025, `…_30_Jun_2011/2012.xls`, `mar21`) — eso es **indicio del archivo, no edición del producto**. La fecha de captura es hoy; el año de observación depende de cada producto; la edición queda NO DETERMINADA para estos portales.

## 2. Productos municipales/departamentales identificados en el portal (títulos y vínculos literales; no descargados)

**En «Proyecciones de población» (edición activa CNPV2018):**
- `PPED-AreaMun-2018-2042_VP.xlsx` y `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx` — municipales 2018..2042.
- `PPED-AreaDep-2018-2050_VP.xlsx` y `PPED-AreaSexoEdadDep-2018-2050_VP.xlsx` — departamentales 2018..2050.
- **Retroproyecciones de la misma edición 2018, años < 2018, municipales:** `DCD-area-proypoblacion-Mun-2005-2017_VP.xlsx` (+ sexo/edad); `DCD-area-proypoblacion-Mun-1995-2004.xlsx`; `DCD-area-proypoblacion-Mun-1985-1994.xlsx`. Departamentales: `DCD-area-proypoblacion-dep-2005-2017 / 1993-2004 / 1985-1992`.
- `NotaTecnica-PPED-jul2025.pdf` — nota técnica de la actualización «PPED» (indicio de vintage 2025 de esta edición).
- Documentación: `Documento-metodologico-proyecciones.pdf`, `Ficha-metodologica-proyecciones.pdf`, `Metadato-proyecciones-ActPostCOVID.pdf`, `comunicado-estimaciones-de-poblacion-con-base en-conciliacion-censos-08-10-2020.pdf`, `presentacion-estimaciones-retroproyecciones-de-poblacion-1985-2017.pdf`, `presentacion-Proyecciones-Demograficas_baseCNPV-2018_mar21.pdf`.
- `anexo-poblacion_certificada_decreto1652_2021.xls` + `DECRETO-1652-DE-2021.pdf` — población certificada, producto distinto de las proyecciones (NO descargar todavía).

**En «Censo general 2005» (productos de la generación base CNPV2005):**
- Proyecciones antiguas: `proyepobla06_20/Edades_Simples_1985-2020.xls`, `proyepobla06_20/Municipal_area_1985-2020.xls` («Estimación y proyección de población nacional, departamental y municipal total por área 1985-2020»), `9ProyeccionesMunicipalesedadsexo.pdf` («Proyecciones municipales según edad y sexo 2006-2020»), `seriesp85_20/EstimacionesProyecciones1985__020.xls`.
- Marco de la generación: `7_Proyecciones_poblacion.pdf` («Proyecciones de Población Nacionales y Departamentales 2006-2020») y la **Conciliación censal 1985-2005** (documentos 1–8 de `conciliacenso/`).
- Resultados censales y afines: `cuadros_censo_2005.xls`, NBI municipal (`NBI_total_municipios_30_Jun_2011/2012.xls`), déficit de vivienda 1993/2005, ficha metodológica, formulario, libro del censo.

## 3. Candidaturas familia↔producto (todas las familias literales de 141; sin asignar)

Candidato = correspondencia plausible documentada por los títulos/vínculos de estos portales; **ninguno está acreditado todavía** porque falta la verificación contra la fila TerriData de origen (diccionario/linaje del proveedor).

| # | Dimensión ∥ Fuente (literal) | Series / Filas | Años | Candidato(s) y evidencia | Pendiente exacto |
|---|---|---|---|---|---|
| 1 | «Censo 2005 y proyecciones DANE ∥ DANE» | 35 / 1.189 | 1985..2020 | Proyecciones y estimaciones base CNPV2005: `Municipal_area_1985-2020.xls`, `Edades_Simples_1985-2020.xls`, `EstimacionesProyecciones1985__020.xls`; marco en `7_Proyecciones_poblacion.pdf` y conciliación censal 1985-2005. Los títulos dan años y desagregación compatibles. | Acreditar «base Censo 2005» por serie: el título del conjunto lo declara, la fila TerriData no. Requiere diccionario indicador→anexo y denominador de los porcentajes. |
| 2 | «… ∥ DANE - Censo» | 12 / 12 | 2005 único | Resultados censales CNPV2005 (población étnica). Los cuadros viejos de la página no muestran pantalla de población étnica por municipio; el producto probable es otro cuadro del mismo censo. | Ubicar el cuadro exacto del censo 2005 con población étnica municipal; la edición (carga 2005 vs actualización) no la declara el HTML. |
| 3 | «… ∥ DANE - Proyecciones de población» | 76 / 830 | 2010..2020 | Misma generación base CNPV2005 (proyepobla06_20), tramo 2006–2020. | Igual que fila 1 + justificar el corte 2010/2020 de TerriData (no lo decide el portal). |
| 4 | «… ∥ DNP con información del DANE» | 12 / 192 | 2005..2020 | Transformación DNP (rótulo literal): los dos portales DANE no la cubren. | Linaje DNP: qué producto DANE usó cada serie (año/edición). Rótulo compartido no prueba mismo producto. |
| 5 | «… ∥ DNP con información del IGAC y el DANE» | 1 / 11 | 2010..2020 | Igual que fila 4. | Igual que fila 4. |
| 6 | «Demografía y población ∥ DANE - Proyecciones de población con base en el Censo 2018. Elaboración DNP» | 124 / 2.996 | 2018..2042 | **Candidato fuerte:** `PPED-AreaMun-2018-2042_VP.xlsx` / `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx`; el intervalo 2018..2042 coincide exactamente con el producto municipal. | Abrir el anexo y cotejar cada indicador/unidad contra los bloques del Excel; denominador de los porcentajes. |
| 7 | «… ∥ DANE - Proyecciones de población 2025 con base en el Censo 2018…» | 17 / 425 | 2018..2042 | Actualización PPED 2025 (`NotaTecnica-PPED-jul2025.pdf`). | Identificar el anexo de la actualización 2025 para Cartagena y leer la nota para distinguir vintage/edición. |
| 8 | «… ∥ DNP» (sin espacio final) | 8 / 22 | 2021..2024 | Transformación DNP; fuera de los dos portales (los dos DANE no la cubren). | Linaje DNP (igual fila 4). |
| 9 | «… ∥ DNP » (con espacio final, literal distinto) | 18 / 39 | 2010..2017 | Transformación DNP; años **< 2018** — pieza clave para la regla. | Linaje DNP + qué edición DANE sirvió de insumo (base 2005 vs retroproyección 2018), porque el año no lo determina. |
| 10 | «… ∥ DNP (Observatorio Nacional de Migraciones)» — dos literales | 2 / 2 | 2022 | Administrativa; fuera de los dos portales. | Verificación en su propia fuente. |
| 11 | «… ∥ DNP a partir de información del DANE y del Ministerio del Interior» | 3 / 24 | 2017..2024 | Transformación DNP; el tramo **cruza el corte 2018** (series con años a ambos lados). | Linaje DNP + decidir qué edición aplica en cada lado del corte. |
| 12 | «… ∥ DNP y Observatorio Colombiano de Migración desde Venezuela» | 5 / 15 | 2020..2022 | Administrativa; fuera de los dos portales. | Verificación en su propia fuente. |
| 13 | «… ∥ DNP, con datos del DANE» | 1 / 1 | 2021 | Transformación DNP. | Linaje DNP (igual fila 4). |
| 14 | «… ∥ DNP, con datos del MEN y DANE» | 1 / 1 | 2021 | Transformación DNP. | Linaje DNP (igual fila 4). |
| 15 | «… ∥ Departamento Administrativo Nacional de EstadÃ­stica - DANE Censo Naci…» | 1 / 1 | 2018 | Resultados CNPV2018; cadena con artefacto de codificación (literal preservado). | Decidir si se corrige la cadena del proveedor; acreditar contra un cuadro del censo 2018. |
| 16 | «… ∥ UNFPA a partir de información…» | 1 / 2 | 2020..2021 | Administrativa; fuera de los dos portales. | Verificación en su propia fuente. |
| 17 | «… ∥ MinSalud» | 1 / 1 | 2022 | Administrativa; fuera de los dos portales. | Verificación en su propia fuente. |
| 18 | «… ∥ Unidad Administrativa de MigraciÃ³n Colombia - UAMC» | 36 / 72 | 2020..2021 | Administrativa; fuera de los dos portales. | Verificación en su propia fuente. |

Totales verificados contra `bridge/141_evidencia_demografica.json`: 354 series, 5.835 filas, ninguna familia fuera de la tabla.

**Regla del usuario (base 2005 < 2018, CNPV2018 ≥ 2018) vs productos retrospectivos — las dos dimensiones temporales, sin cambio de preferencia:**
1. **Año del dato:** en el corpus no hay ninguna serie declarada base CNPV2018 con años < 2018 (ya documentado en 148: la regla «2005 < 2018» no entra en conflicto con las filas hoy servidas).
2. **Edición disponible históricamente vs edición actual:** el portal 2018 publica **retroproyecciones de la edición CNPV2018 para 1985..2017** (`DCD…1985-1994/1995-2004/2005-2017`, y las presentaciones `retroproyecciones-de-poblacion-1985-2017.pdf`). Es decir, «año < 2018» **no** implica, por sí solo, que el dato servido vino de la generación base CNPV2005: puede ser retroproyección de la edición 2018, publicada después. Elegir entre las dos generaciones para los años < 2018 exige evidencia de linaje (qué archivo sirvió TerriData y cuándo), no se decide por el año ni por el título de la dimensión («Censo 2005 y proyecciones DANE» nombra la familia, no la edición de cada fila).

## 4. Lista pequeña del siguiente insumo (uno por familia principal, sin adquirir)

1. **Base 2018 (familia 6, 124 series):** abrir `PPED-AreaMun-2018-2042_VP.xlsx` (bloque 13001) y cotejar indicador/unidad/valor contra el cuerpo; eso acredita producto, base y denominador de la familia más grande.
2. **Vintage 2025 (familia 7, 17 series):** leer `NotaTecnica-PPED-jul2025.pdf` para saber qué cambió respecto al anexo base y de dónde salen las 17 series «Proyecciones 2025».
3. **Base 2005 (familias 1, 2, 3):** abrir `Municipal_area_1985-2020.xls` y `7_Proyecciones_poblacion.pdf` para acreditar «base Censo 2005» por indicador, y la conciliación censal para los años 1985..2005 («estimación», no proyección).
4. **Demografía, años < 2018 (regla vs retroproyección):** abrir `DCD-area-proypoblacion-Mun-2005-2017_VP.xlsx` y comparar contra la fila TerriData correspondiente — solo si el valor coincide se cierra cual edición sirvió la familia «Censo 2005 y proyecciones DANE» para 2005..2017.
5. **DNP (filas 4, 5, 8, 9, 11, 13, 14):** linaje DNP o nota metodológica que diga qué producto DANE usó cada serie; los portales revisados no lo declaran.
6. **Población étnica (fila 2):** cuadro del censo 2005 con población étnica municipal; el nombre del cuadro no aparece en los títulos de esta página.
7. **Administrativas (filas 10, 12, 16, 17, 18):** cada fuente propia; son pocas filas y ninguna se resuelve con estos dos portales.
8. **Certificada (transversal):** `anexo-poblacion_certificada_decreto1652_2021.xls` para validar cualquier serie de «población certificada» que aparezca en ficha (producto oficial distinto).

## 5. Alcance y límites declarados

- Lo capturado **no** demuestra el linaje exacto de ninguna fila TerriData; acredita que existen los productos candidatos, sus títulos y sus vínculos.
- Los SHA del manifiesto corresponden a los bytes hoy servidos; los HTML del portal son estáticos (Joomla, `Expires 1984`, cookies de sesión — irrelevantes para el contenido, anotado por trazabilidad).
- No se calculó población 2026 ni ninguna extrapolación; no se tocaron app/tests/banco/catálogo/141/148/diagnósticos ni entregables de otros agentes.
- Pendiente explícito: si se autoriza abrir anexos Excel/PDF, procedimiento recomendado — un anexo por familia (los cuatro numerados arriba), lectura programática y cotejo en solo-lectura contra `bridge/118_validacion_parser_numerico/filas.jsonl`, antes de cualquier asignación al catálogo.

**FB-DEMO-LINAJE-01 entregado** · Freebuff.
