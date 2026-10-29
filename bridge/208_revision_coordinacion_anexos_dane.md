# Revisión de coordinación · Anexos DANE y fichas territoriales

26 de octubre de 2026. Revisión de 195 y del cierre técnico 201. Se verificó el contenido local y se ejecutaron nuevas reproducciones. No se modificaron el diagnóstico, los originales, el banco activo ni los motores. Este documento es evidencia de coordinación, no un dictamen EAF ni aprobación de integración productiva.

## Resultado sobre 195

Se acepta la precisión del XLS: `Municipal_area_1985-2020.xls` tiene **1.910.272 bytes** y SHA `5d6ae35f5bbde7c0163cee10ebda344a21993ece0f9b9f66f2ff186010335e84`. Los tres originales 189 coinciden con sus bytes y hashes declarados.

El guion de 195 no implementaba la adquisición descrita conceptualmente ni demostraba sus rechazos. Su SHA real es `7663b264612a5e07101d87130a2d6fba90f798b5ba298e53de55387653534053`; el `4fc01c6b...` mencionado corresponde al guion histórico 189. Se conserva esa entrega; no se presenta como descargador funcional aprobado.

El encargo 200 produjo la implementación local 201, con transporte inyectable y CLI de red desactivada. Se contrastaron sus archivos/código y se reejecutaron las comprobaciones en destinos nuevos, sin nuevas descargas ni sustitución de las capturas 189.

## Reproducción nueva de coordinación

Los comandos y retornos se conservan bajo `201_cierre_pilotos_fuentes/coordinacion209_*`, separados de las corridas del implementador. El [cotejo del manifiesto](209_revision_coordinacion_fuentes/cotejo_manifiesto_201.json) confirmó **456 artefactos 201, 116 históricos y el informe**, sin divergencias. El manifiesto congelado 201 tiene SHA `b9569debf5a7658164480d821eb726f5567656862f1e014342ce0210e1317e17`; añadir las nuevas corridas no altera los archivos incluidos en aquel snapshot.

| Comprobación ejecutada por coordinación | Resultado |
| --- | --- |
| Cuatro ejecuciones del CLI territorial congelado |4 construcciones y 4 cotejos, retorno 0;51.927 filas, incluidas 408 de contexto.|
| Validación de los tres originales 189 |Retorno 0; tamaños, hashes y validación según formato conservados.|
| Arnés local 201 |Retorno 0; cinco controles de fichas y 23 de adquisición. Los objetivos negativos conservan sus retornos 1/2 esperados.|
| Extracción demográfica |1.116 registros; extracción 0, comparabilidad 1 y comando estricto 1 por discrepancias de fuente, sin errores de extracción.|
| Cotejo adicional sin importar el extractor 201 |7.812 celdas, con tipo y valor originales, sobre los 1.116 registros; cero diferencias.|

Evidencias: [fichas](201_cierre_pilotos_fuentes/coordinacion209_fichas/manifiesto.json), [originales](201_cierre_pilotos_fuentes/coordinacion209_originales/manifiesto.json), [comprobaciones](201_cierre_pilotos_fuentes/coordinacion209_comprobaciones/resultado_comprobaciones.json), [demografía](201_cierre_pilotos_fuentes/coordinacion209_demografia/manifiesto.json) y [celdas cotejadas](209_revision_coordinacion_fuentes/cotejo_celdas_201.json).

El runner referencia TXT, parser, selección, catálogo y constructor puro congelados; no toma conteos del resultado para afirmar igualdad. Reutiliza el constructor del motor: prueba reproducción y consumo del CLI, sin constituir validación independiente de ese algoritmo. El enlace inexistente a 167 de 177/193 quedó corregido únicamente en las nuevas fichas, preservando las anteriores.

El adquiridor 201 comprueba HTTPS/host, estados HTTP, redirecciones, firmas, lecturas/escrituras, publicación exclusiva y presupuestos de 64 MiB por objetivo y 128 MiB por lote, incluidos cuerpos descartados. El arnés demuestra esos controles con dobles locales. **No hubo transporte HTTPS real en 201 ni en esta reproducción**; no se acredita su comportamiento de red, entrega operativa o un deadline absoluto en todas las operaciones internas del transporte. XLS/PDF reciben firma preliminar en ese adquiridor; el XLSX recibe además el validador estructural congelado. Esto no equivale a validación semántica de todos los archivos.

## Datos demográficos disponibles y diferencias

Los 1.116 registros se distribuyen en 300 del XLSX municipal y 816 del XLS antiguo. Los tres grupos de área suman correctamente en 372 casos. Entre `Mpios` y cada hoja `Municipios` hay 51 diferencias:102 comparaciones discrepantes contando las dos hojas. Se conservan valores y coordenadas; no se suman personas ni se elige una hoja como verdadera.

Ejemplo de Cartagena,2005: `Mpios!Y160` registra 893.033 y `Municipios!E156`892.545. Sahagún,2005:87.556 y 87.635 respectivamente. La edición interna y base específica del XLS quedan desconocidas donde no se declaran; el nombre del archivo o Last-Modified no las resuelven.

El XLSX `PobMunicipalxÁrea` contiene 2018–2042 por tres áreas. `PPED!A5` declara actualización del 30 de julio de 2025; la página conservada presenta el enlace con fecha 8 de agosto de 2025; la adquisición ocurrió el 26 de octubre de 2026. Se mantienen las tres fechas separadas.

Los totales publicados para 2026 se cotejaron en el libro original: Cartagena 1.010.995; Santa Catalina 15.427; Sahagún 121.174; Bogotá 7.945.996. **Son proyecciones del producto publicado, no conteos censales observados ni cifras TerriData cuyo linaje se haya acreditado.** No se usaron como denominadores de barrios, UCG o localidades.

La nota técnica 2025 explica la reconstrucción de población de partida con censos 2005/2018 y estadísticas vitales. La regla de vigencia censal solicitada por el usuario sigue siendo un criterio de selección; no autoriza asignar retrospectivamente una edición/base a las 354 series TerriData por su año o coincidencia numérica.

## Pendientes que se mantienen visibles

- Anexo municipal por edad/sexo: no se obtuvo completo; el intento 189 excedió el límite. No se declara descargado.
- Linaje, naturaleza, base censal y vintage específicos de las series TerriData; condiciones de uso y atribución aún por comprobar.
- Armonización de las hojas XLS discrepantes y selección justificada de denominadores; no se calculan tasas ni efectos causales aquí.
- Integración en catálogo, persistencia y consumidores del banco: no ejecutada en este cierre local.
- El cotejo 207 encontró 1828 de 1829 artefactos del inventario coincidentes y un resumen mutable de sincronización discrepante. No se localizó el original con el hash anterior. Se debe conservar ese inventario histórico y preparar una captura versionada nueva; cambiar el hash esperado por sí solo no recupera la evidencia perdida.

La primera versión del colector propio de celdas falló al acceder a `coordinate` de una `EmptyCell` de openpyxl. Se conservaron código y registro fallidos en 209; se corrigió solo el colector y la comprobación posterior pasó. No fue un fallo del extractor 201 ni una modificación del original.

Sin SQL, proveedores reales, commit, push o despliegue en estas comprobaciones de fuentes. Los trabajos de identidad/aportes tienen sus informes y evaluadores separados.
