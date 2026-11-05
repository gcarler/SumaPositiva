# Cotejo e incorporación del portal oficial de Policía — Cartagena

**Fecha:** 5 de noviembre de 2026, UTC. **Resultado:** captura, procesamiento, cotejo e integración en el banco local completados para Cartagena, DIVIPOLA **13001**, sobre las publicaciones actualmente enlazadas por el portal. Es una entrega técnica de datos, sin dictamen EAF ni despliegue de servicios.

## 1. Qué quedó incorporado

Se descargaron los **nueve anexos oficiales** de [Estadística delictiva de la Policía Nacional](https://www.policia.gov.co/estadistica-delictiva):

- Cuadros del último mes.
- Cuadros mensuales y anuales 2020–2026.
- Siete archivos de registros, uno por año de 2020 a 2026.

Se conservaron los originales, el HTML que enlaza los anexos, las URL efectivas, fecha de captura, ETag, Last-Modified, tamaño, SHA-256 y verificación CRC de los contenedores. En total se descargaron **296.367.756 bytes**. [Manifiesto de captura](../data/banco_fuentes_oficiales/policia_portal/capturas/20261105/manifest.json).

Se leyeron **5.618.150 filas** de los archivos nacionales y se seleccionaron **115.413 filas de Cartagena** mediante el código publicado. Esto no acredita personas ni incidentes únicos: sin identificador de caso no se eliminan filas repetidas ni se suman publicaciones distintas.

| Producto municipal | Cobertura | Observaciones |
| --- | --- | ---: |
| Serie anual | 2020–2025 completos; 2026 hasta septiembre | **133** |
| Serie mensual | Enero de 2020 a septiembre de 2026 | **1.539** |
| Desglose mensual por arma/medio | Mismo periodo, conservando las denominaciones del cuadro | **7.290** |
| Cuadros del último mes | Septiembre de 2026 | **19** |

Se cubren **18 delitos/modalidades**, más el **subtotal de hurtos**, que se conserva identificado y no se suma nuevamente con sus ocho modalidades. Comprende homicidio intencional, homicidio de tránsito, lesiones personales, lesiones de tránsito, violencia intrafamiliar, violencia sexual, extorsión, amenazas, secuestro, terrorismo y ocho modalidades de hurto: personas, residencias, comercio, automotores, motocicletas, piratería terrestre, entidades financieras y abigeato.

El **Cuadro 1 es nacional**, no una cifra de Cartagena: sus series anuales y mensuales se extrajeron por separado. Los cuadros **2–12** aportan el detalle municipal. Se procesaron las doce hojas de cada libro de cuadros; la validación aritmética descrita abajo corresponde al municipio objetivo, no al resto de municipios del país.

## 2. Qué se comprobó

### El Excel compartido queda acreditado

El ZIP recibido por Drive y el descargado directamente del dominio oficial son idénticos:

`42b367067d0f905f76192c23bfdd522cdf464960a77844beb535ac59795b9eca`

Sus **77 valores municipales coinciden** con la lectura del original oficial. Se conserva el archivo recibido y su extracción, y se sustituye su representación duplicada en el consolidado por el producto oficial ampliado. [Cotejo de los 77 valores](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cotejo_excel_compartido.csv).

### Consistencia interna de los cuadros

**1.672 controles, cero diferencias:**

- 133 totales anuales frente a la suma de sus meses.
- 81 subtotales mensuales de hurtos frente a sus ocho modalidades.
- 1.458 totales mensuales de delitos/modalidades frente a sus armas o medios.

Los **19 valores del último mes coinciden** con ese mes en el libro histórico. [Controles internos](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/controles_internos.csv), [cotejo del último mes](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cotejo_ultimo_mes_vs_historico.csv).

**Observación nacional separada:** en los siete años del Cuadro 1 histórico, la suma de las once categorías mostradas supera el renglón literal «Total» por un importe exactamente igual al subtotal de hurtos. Se conserva el literal y se señala la definición del agregado como pendiente de aclaración; no se atribuye una causa ni se corrige el archivo. Este agregado nacional **no se utiliza en las cifras de Cartagena**. [Control nacional del agregado](20261105_cotejo_policia_evidencia/control_nacional_cuadro1.csv).

### Registros frente a cuadros: ocho discrepancias conservadas

De **1.539 comparaciones municipales mensuales**, **1.531 coinciden** y **ocho difieren**. Todas las diferencias corresponden a lesiones personales de **2021**:

| Mes | Cuadro publicado | Registros agregados | Registros menos cuadro |
| --- | ---: | ---: | ---: |
| Enero | 151 | 153 | +2 |
| Marzo | 181 | 182 | +1 |
| Abril | 167 | 168 | +1 |
| Agosto | 192 | 193 | +1 |
| Septiembre | 177 | 179 | +2 |
| Octubre | 175 | 180 | +5 |
| Noviembre | 184 | 191 | +7 |
| Diciembre | 158 | 163 | +5 |
| **Diferencia total** | | | **+24** |

**La causa no está determinada.** No se reemplaza ninguno de los valores ni se presenta la diferencia como un cambio del delito o un error de una entidad. Se adopta como referencia analítica el libro de cuadros, conforme a la recomendación del publicador sobre sus cuadros validados. Los registros permanecen disponibles para trazabilidad. [Cotejo completo](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cotejo_registros_vs_cuadros.csv).

### Nuestras extracciones anteriores de Datos Abiertos

Se realizaron **59 comparaciones aritméticas**, con **49 valores distintos**. Esas diferencias **no acreditan errores**: los conjuntos anteriores tienen cortes, publicadores y categorías diferentes. Por ejemplo, el conjunto de lesiones agrupa artículos y eventos de tránsito, y el de homicidios procede de MinDefensa con caracterización SPOA.

Las siete extracciones anteriores, sus metadatos y el SQLite original se conservaron sin alterar. En el consolidado, sus filas desde 2020 quedan identificadas como **edición previa que no debe sumarse al portal**. No se fabrica un empalme con 2010–2019 ni una cifra única mediante suma de fuentes. [Cotejo retrospectivo](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cotejo_socrata_previo_vs_portal.csv).

## 3. Periodos y cambios de formato resueltos

- **Corte observado de 2026: 30 de septiembre.** Los archivos tienen publicación/entrega del 20 de octubre. El año 2026 permanece parcial; las comparaciones temporales deben usar enero–septiembre de los otros años, disponibles en la serie mensual.
- No se interpretan las celdas de plantilla de octubre–diciembre de 2026 ni los años futuros del Cuadro 1 como observaciones delictivas efectivamente publicadas. Se excluyeron **57 celdas municipales mensuales posteriores al corte**.
- **Hurtos de 2026:** el cuadro omite el total por modalidad y conserva cinco columnas de arma. Se suman exclusivamente esas cinco columnas completas, con sus referencias de celda, y se contrasta el resultado con el subtotal general. No se trata la ausencia de columna de total como ausencia de dato.
- **Registros de 2023:** no hay columna ICCS separada. Se usa únicamente el código explícito entre paréntesis en la etiqueta de delito; no se infiere una clasificación por similitud textual.
- Los códigos ICCS utilizados como clave de comparación eliminan ceros iniciales; las denominaciones y códigos originales permanecen en los XLSX, con libro, hoja y celda, y en el [diccionario extraído](20261105_cotejo_policia_evidencia/diccionario_iccs.csv). No se altera la clasificación institucional.
- En 2026 el encabezado de fecha dice **FECHA ISSO**. Se conserva esa particularidad y no se redefine automáticamente como fecha del hecho. Las observaciones del nuevo producto se tipan como año declarado por la fuente; conservan el intervalo publicado.
- El publicador advierte problemas de completitud/calidad de sexo y edad en los registros. Sus notas se conservan en los perfiles de los siete archivos; no se acredita con esta ingesta una caracterización demográfica completa.
- La fuente tiene escala municipal. No se generan puntos, barrios ni UCG de ocurrencia a partir de estos agregados.

## 4. Integración con el banco y los motores

Se usó el corredor existente `scripts/sincronizar_fuentes_versionado.py`: copia de staging, consolidación, inventario, validación estructural mediante LangGraph, nuevo inventario, planificación y sustitución con respaldo. Después se materializaron observaciones canónicas, contraste, series 7D, paneles y tablero de operación.

El consolidado pasa de **2.340 a 2.396 filas**: se retiran del consolidado las 77 filas recibidas que duplicaban el libro y se incorporan **133 filas oficiales**, sin eliminar los originales. Se mantienen **43 claves de serie**; una clave no representa por sí sola una institución independiente.

La clave nueva es **`portal_policia_cuadros_cartagena`**. El catálogo **7D v6** define 19 cruces explícitos: las categorías anteriores conservan su dimensión y las ocho modalidades de hurto se asignan a seguridad personal. En las 133 observaciones hay **119 PERS, 7 COM y 7 SAT**, todas clasificadas. No se usa el nombre del archivo para inferir dimensiones.

La referencia de versión del test existente se actualizó de v5 a v6; no se añadieron pruebas ni se ejecutó pytest. La verificación realizada aquí es del producto real y del corredor sobre los datos capturados, además del lint de los scripts nuevos y el catálogo.

El contrato canónico actual es anual: **las series mensuales y por armas se conservan como productos separados con su granularidad**, disponibles para análisis, y no se disfrazan como nuevos totales anuales. Los registros agregados se usan para control y no se añaden al consolidado como una segunda copia de los hechos.

El banco general conserva **144 observaciones preexistentes de otras fuentes sin dimensión** y, por ello, su puerta estructural global sigue **ámbar**. La fuente nueva no añade observaciones sin clasificar. La procedencia oficial no sustituye las revisiones de comparabilidad y licencia; el corredor conserva su estado de publicación `no_publicable` hasta completar esas revisiones.

### Archivos principales

- [Serie anual oficial](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cuadros_cartagena_anuales.csv).
- [Serie mensual oficial](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cuadros_cartagena_mensuales.csv).
- [Armas y medios por mes](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cuadros_cartagena_armas_mensuales.csv).
- [Resumen del cotejo](../data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/cotejo_resumen.json).
- [Puntero del producto incorporado](../data/banco_fuentes_oficiales/policia_portal/activo.json).
- [Consolidado del banco](../data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv).
- [Recibo de integración y clasificación](20261105_cotejo_policia_evidencia/integracion_final.json).

## 5. Custodia y límites de esta entrega

Se conservaron dos respaldos del banco: el anterior a la incorporación y el anterior a la actualización del catálogo 7D. Sus rutas y hashes figuran en los recibos de promoción. Los primeros intentos de extracción/cotejo se conservan como intermedios, identificados y excluidos del puntero activo. Las copias de los scripts realmente ejecutados se guardan con los procesados; algunos recibieron después ajustes de formato sin cambiar sus operaciones.

La evidencia técnica está en [20261105_cotejo_policia_evidencia](20261105_cotejo_policia_evidencia/): comandos del corredor, salidas, respaldo del consolidador y del catálogo anteriores, [verificación final](20261105_cotejo_policia_evidencia/verificacion_final.json) y [manifiesto SHA-256](20261105_cotejo_policia_evidencia/manifest_sha256.json). Se verificaron **1.928 artefactos por hash y tamaño**, la conservación de los valores y clasificaciones de las **2.263 filas preexistentes no sustituidas**, y la conservación de la dimensión de los 77 valores reemplazados por su edición oficial. Las diferencias de metadatos de las ediciones previas son deliberadas y quedan descritas arriba.

No se modificaron los documentos diagnósticos de Google, el frontend, permisos, migraciones ni servicios. **No se consultó ni escribió `bd_csh`, no se hizo despliegue, commit ni push.** La incorporación al banco local y sus capas analíticas no debe confundirse con una carga del catálogo PostgreSQL o una publicación en el Geovisor.
