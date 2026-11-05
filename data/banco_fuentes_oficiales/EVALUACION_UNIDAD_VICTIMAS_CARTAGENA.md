# Unidad para las Víctimas: alcance de los visores para Cartagena

**Revisión:** 21-10-2026. Se compararon dos productos oficiales que tienen universos distintos.

| Producto | Resultado de la consulta | Uso en POLIS |
| --- | --- | --- |
| [Mapa de Victimización](https://datospaz.unidadvictimas.gov.co/mapa-de-victimizacion/) | El archivo público del visor contiene 8.266 filas nacionales. Al filtrar `CODIGO_DANE=13001` aparece **una** fila, ficha `FV249`, «Cartagena Villa Gloria», módulo III de sujetos colectivos, sin año de ocurrencia. La página del visor indica actualización de 12-11-2020. | Sirve como referencia documental histórica, **no** como serie municipal 2012–2026 ni como censo de hechos actuales. No se guardaron los atributos individuales del archivo. |
| [Registro Único de Víctimas (RUV)](https://datospaz.unidadvictimas.gov.co/registro-unico-de-victimas/) | El reporte público 5 permitió descargar 11.184 filas para Cartagena (13001), corte 30-09-2026. Se resumieron en **522 agregados** por año, hecho y métrica para 2012–2026. | Serie municipal de víctimas incluidas en el registro; tres medidas separadas: personas por ocurrencia, personas por declaración y eventos. No equivale al total de hechos de violencia en la ciudad. |

El Mapa de Victimización recoge hechos relacionados con el conflicto **fuera del universo registrable del RUV**. Sus marcas se construyen en el código del visor usando `LAT_MPIO` y `LONG_MPIO`, coordenadas municipales de referencia; **no representan la dirección o punto exacto del hecho**. No deben mezclarse con los casos georreferenciados del GeoJSON que está pendiente.

## Contrato de la extracción RUV

- **Filtro:** departamento 13, municipio 13001, nivel municipal 2, reporte 5 («Víctimas por hecho victimizante por año»), todas las vigencias; en el banco se conservan 2012–2026.
- **Corte del registro:** 30-09-2026. La respuesta original solo se procesa en memoria; se conserva su SHA-256, parámetros de consulta y número de filas en `extracciones/ruv_cartagena.metadata.json`.
- **Archivo curado:** `ruv_cartagena.csv`, también disponible en `cartagena_seguridad_humana.sqlite`. No contiene sexo, etnia, discapacidad, ciclo vital ni registros individuales.
- **Lectura:** `personas_por_ocurrencia`, `personas_por_declaracion` y `eventos_reportados` son medidas distintas. Sumar personas entre hechos o años no produce víctimas únicas. Las cifras pueden cambiar por nuevas declaraciones y depuración del RUV.
- **Geografía:** municipio 13001. No hay puntos de casos ni desagregación oficial por UCG en esta extracción.

**Siguiente fuente prioritaria:** el RUV puede complementar el análisis de conflicto, desplazamiento, amenazas y reparación; los hechos cotidianos de seguridad personal y convivencia deben seguir en las series de Policía, Medicina Legal, encuesta ECSC y las fuentes territoriales autorizadas. Una tendencia RUV tampoco demuestra por sí sola el efecto de un PDD.

## Geoportal y tablero de hechos

El [Geoportal oficial](https://www.unidadvictimas.gov.co/geoportal/) enlaza diez visores temáticos. Quedaron inventariados en [`catalogo_geovisores_unidad_victimas.csv`](catalogo_geovisores_unidad_victimas.csv), con estado de incorporación y escala comprobada. El catálogo es una lista de **productos disponibles**, no diez conexiones de datos activas. El Visor Geográfico de Víctimas permite consultar el RUV por municipio y exportar resultados; la opción de exportar Shape no demuestra que se publiquen coordenadas de cada hecho.

El [tablero público de hechos](https://cifras.unidadvictimas.gov.co/Cifras/#!/hechos) usa una aplicación web dinámica. Su servicio público de hechos por ubicación geográfica respondió con **16 categorías** al filtrar departamento 13 y municipio 13001 el 21-10-2026. La respuesta municipal consultada no expone una fecha de corte verificable. Por ello no se incorporaron sus totales acumulados como observaciones anuales ni se sumaron a la serie RUV de corte 30-09-2026. El tablero sí sirve para consultar definiciones y contrastar la taxonomía de hechos.

**Para conectar cada visor:** verificar año y corte, escala territorial y definición de la medida, y conservar el enlace y licencia. El IRV permite comparar riesgo entre municipios; no equivale a un recuento de casos. Rehabilitación, indemnización, proyectos y oferta describen respuesta institucional y se analizan aparte de la ocurrencia de hechos. Ningún punto dibujado debe tratarse como domicilio o sitio del incidente sin metadatos que acrediten esa precisión.

## Extracciones adicionales verificadas

| Producto | Resultado municipal | Decisión de calidad |
| --- | --- | --- |
| [IRV, servicio ArcGIS](https://vgv.unidadvictimas.gov.co/server/rest/services/IRV/IRV/MapServer) | Capas 2012–2025, 14 filas para Cartagena; **13 valores numéricos** en `irv_cartagena.csv` y SQLite. La capa 2016 devuelve «Sin Información» y valor nulo. | No interpolar 2016 ni tratar el índice como número de víctimas. El servicio indica año de medición, pero no fecha de corte de publicación. |
| [Indemnizaciones, capa municipal](https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/1) | Giros, personas y valor en millones de COP por vigencia. Se integraron **2012–2023**: 12 vigencias y 36 observaciones en `indemnizaciones_cartagena.csv` y SQLite. | Se contrastó con la [capa por tipo de hecho](https://vgv.unidadvictimas.gov.co/server/rest/services/UARIV/Indemnizaciones/MapServer/4). **2024 queda excluido**: la capa general muestra 367 giros, 316 personas y 3.794 millones; la desagregada suma 2.398 giros, 2.222 personas y 22.309 millones. En 2015 el valor difiere en un millón, probablemente por redondeo. Sin conciliación ni corte explícito, no se publica una cifra consolidada de 2024. |

Los scripts `extraer_irv_cartagena.py` y `extraer_indemnizaciones_cartagena.py` reproducen las consultas y guardan SHA-256 de la respuesta o de la serie, URL, fecha de extracción y decisiones de calidad. La indemnización mide **respuesta institucional**, no incidencia de violencia; sus personas atendidas no se agregan a las personas RUV.

## Estado del resto de los visores

- **Sujetos colectivos:** servicio ArcGIS municipal verificado. La consulta pública devolvió cuatro filas relacionadas con Cartagena y fecha de corte interna 30-09-2024; faltan reglas para evitar contar varias veces sujetos con presencia en más de un municipio. No se guardaron nombres ni identificadores individuales.
- **Proyectos de cooperación:** servicio municipal verificado con registros de entendimientos; la pertenencia territorial no demuestra entrega de un producto en Cartagena. Falta definir unidad y corte.
- **Oferta institucional y académica:** los servicios municipales devuelven identificadores de ofertas. Requieren la tabla de atributos de cada oferta, vigencia y cobertura efectiva antes de generar indicadores.
- **Rehabilitación:** el visor está accesible, pero no se verificó aún un servicio público de datos con contrato de corte y unidad para la consulta municipal.
- **Rutas Rrom:** se verificó la página del visor; requiere evaluar geometría, vigencia y pertinencia para Cartagena.
- **Visor Geográfico de Víctimas y Mapa de Victimización:** cubiertos por la extracción RUV y la evaluación documental anteriores; no se deben duplicar como fuentes independientes de casos.
