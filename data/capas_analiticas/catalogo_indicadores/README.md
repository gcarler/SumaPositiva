# Catálogo, cifras publicadas y referencias territoriales

El catálogo describe indicadores y sus contratos metodológicos. No contiene sus
valores observados. El banco de origen se abre en modo de solo lectura. Los 29
indicadores conservan `estado=no_publicable`; la existencia de una serie no
resuelve por sí sola licencia, revisión metodológica o disponibilidad territorial.

## Referencias a series

En Tier A, `numerador` identifica `fuente.indicador`. Puede incluir un selector
de subtipo entre corchetes:

```text
fuente.indicador[subtipo literal]
ideam_calidad_aire.concentracion_media_estacion[PM2.5 | 24 h | estación *]
```

El selector literal exige igualdad exacta. Solo se admite un `*` final, precedido
por un prefijo explícito. Seleccionar varias estaciones conserva sus series
individuales: no produce automáticamente un promedio municipal.

`anio_base` debe existir en la serie seleccionada. La unidad debe coincidir con
la observación original; «habitantes en riesgo» y «habitantes» son universos
distintos. GEIH mantiene cabecera, trimestre móvil y denominador específico:
la tasa de desocupación usa fuerza de trabajo. No se convierte un corte parcial
en una anualidad completa.

Los indicadores `PERS_007` y `COM_003` describen conteos originales. Las tasas
derivadas presentes en los documentos se registran por separado en
`cifras_publicadas.csv`, con numerador, población del mismo año, factor 100.000
y SHA de ambas fuentes. No se imputan denominadores para años sin población
compatible. Antes de 2018 corresponde comprobar la base censal 2005; desde
2018, la base CNPV 2018. Una tasa publicada por una entidad se conserva como
tal y no se reemplaza por una tasa reconstruida con otro denominador.

## Documentos y referencias territoriales

`cifras_publicadas.csv` registra cada aparición por documento. Una cifra presente
en otro PDF no respalda su aparición en el documento actual. Las tasas derivadas
se recalculan contra el banco; una expresión aritmética aislada no basta para
acreditarlas. La comprobación automática detecta números y unidades reconocidos;
la interpretación del contexto completo requiere revisión editorial.

`linaje_territorial_documentos.json` fija archivo, SHA, conteo y limitaciones de
las capas utilizadas. Tres localidades, 15 códigos UCG urbanos y 217 geometrías
de la capa de barrios describen esos archivos recibidos. No certifican fecha de
vigencia administrativa ni un número oficial de barrios del POT. La decisión
analítica de usar 17 polígonos se mantiene separada del universo administrativo.
Las 35 mesas proceden de programación local: no acreditan reuniones realizadas.

El generador verifica los SHA y conteos antes de emitir sus cuatro PDF. Cada PDF
incluye las referencias territoriales. Para revisar sin reemplazar los archivos
locales de `public/docs`, puede indicarse otro directorio:

```bash
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py
backend/.venv/bin/python scripts/generar_toolbox_completa_pdf.py --directorio-salida /tmp/polis-toolbox-revision
backend/.venv/bin/python scripts/validar_cifras_publicadas.py --directorio-documentos /tmp/polis-toolbox-revision
```

El último comando también revisa las cifras del archivo de contenido de
seguridad humana en `src/`. Las pruebas de regresión usan archivos temporales y
SQLite aislado, sin PostgreSQL productivo.
