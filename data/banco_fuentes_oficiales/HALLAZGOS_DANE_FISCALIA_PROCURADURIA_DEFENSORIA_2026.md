# Búsqueda de fuentes oficiales: DANE, Fiscalía, Procuraduría y Defensoría

**Consulta:** 21-10-2026. **Territorio:** Cartagena de Indias, Bolívar (DIVIPOLA 13001). Las cifras de registros administrativos, encuestas y modelos se conservan como universos distintos.

## DANE: estimaciones municipales SAE incorporadas

El [visor SAE del DANE](https://sitios.dane.gov.co/EstimacionesModeloSAE/) publica un [XLSX oficial](https://sitios.dane.gov.co/EstimacionesModeloSAE/documentos/estimaciones-pobreza-alimentaria-fies-modelo-sae-2022-y-2024.xlsx) con seis hojas relevantes: FIES, pobreza monetaria e IPM en 2022 y 2024. La [nota metodológica](https://sitios.dane.gov.co/EstimacionesModeloSAE/documentos/metodologia-estimaciones-pobreza-alimentaria-fies-modelo-sae-2022-y-2024.pdf) explica que son estimaciones en áreas pequeñas mediante el modelo Fay-Herriot, no observaciones directas de la muestra municipal.

| Indicador municipal, % | 2022 | 2024 | Lectura |
| --- | ---: | ---: | --- |
| Inseguridad alimentaria moderada o grave (FIES) | 22,15 | 28,10 | Estimación modelada; los intervalos de confianza están en `dane_sae_cartagena.csv`. |
| Pobreza monetaria | 43,60 | 41,10 | La cifra SAE de 2024 coincide aproximadamente con el valor municipal directo publicado por DANE; no se suma a él. |
| Pobreza multidimensional (IPM) | 7,12 | 8,19 | Estimación modelada municipal, diferente del IPM censal de 2018 y del IPM departamental anual. |

El archivo original, su SHA-256, hoja y fila 151 de Cartagena, error estándar e intervalo quedan conservados. Las seis observaciones ya están en SQLite. **Una diferencia entre dos años no demuestra un efecto de un PDD**: se debe atender a la incertidumbre, comparabilidad metodológica y calendario de intervención.

## Fiscalía: acceso al SPOA y producto derivado DANE

La [guía oficial de la Fiscalía](https://www.fiscalia.gov.co/colombia/wp-content/uploads/GUIA-PARA-LA-CONSULTA-DE-CIFRAS-ESTADISTICAS-A-TRAVES-DE-DATOS-ABIERTOS-1.pdf) remite a Conteo de Procesos V2, Conteo de Víctimas V2, Indiciados V2 y Actuaciones V2. Se reintentaron el 21-10-2026 los endpoints públicos de [Procesos V2](https://www.datos.gov.co/Justicia-y-Derecho/Conteo-de-Procesos-V2/6d52-qyqg) y [Víctimas V2](https://www.datos.gov.co/Justicia-y-Derecho/Conteo-de-V-ctimas-V2/4mnf-va5w) mediante Socrata JSON, metadatos y exportación CSV: las seis solicitudes devolvieron HTTP 403 desde este entorno. No se incorporó una serie municipal SPOA sin poder consultar sus filas y corte.

El [DANE publicó una caracterización experimental ESCNNA](https://www.dane.gov.co/index.php/estadisticas-por-tema/estadisticas-experimentales) basada en las bases de víctimas e indiciados de Fiscalía, con corte de hechos a 31-12-2025. Su [anexo](https://www.dane.gov.co/files/operaciones/CEESCNNA/anex-CEESCNNA-2025.xlsx), cuadro 3.2, fila 13, muestra **600 víctimas registradas** para CARTAGENA, BOLÍVAR, y el cuadro 6.2, fila 12, muestra **885 indiciados** para el periodo acumulado 2015–2025 provisional. El anexo tiene una fila distinta para **Cartagena del Chairá, Caquetá**, que se excluyó. Las dos cifras son acumuladas y no se insertaron como año 2025 en la tabla anual. El DANE advierte que el fenómeno no denunciado queda fuera y que las bases se revisan mensualmente. El dato de víctimas incluye 278 registros con edad sin información en el desglose publicado; hay que revisar la regla de inclusión antes de llamarlo conteo de menores con edad verificada.

## Procuraduría: agregado PQRSDF incorporado

La [página oficial de datos abiertos de Procuraduría](https://www.procuraduria.gov.co/Pages/datos-abiertos.aspx) enlaza el conjunto de [PQRSDF de la sede electrónica](https://www.datos.gov.co/d/s226-fj9i). Una consulta agregada al origen, filtrando `departamento='BOLIVAR'` y `municipio='CARTAGENA'`, devuelve **323 radicaciones de 2024** en cinco tipos. El resultado está en `procuraduria_pqrsdf_cartagena.csv` y SQLite; no se descargaron remitentes ni expedientes. El municipio es el declarado en el registro y no localiza un incidente. La consulta sirve para observar demanda ante Procuraduría, no para medir criminalidad o desempeño distrital por sí sola.

El [Índice INTEGRA](https://www.datos.gov.co/d/i594-3uqz) también es accesible, pero sus 29 filas rotuladas «Cartagena» son de 2017–2018 y mezclan órdenes departamental, distrital, municipal y nacional sin identificador de entidad suficientemente claro en la extracción. No se produjo un promedio de «legalidad de Cartagena». El conjunto de conciliación extrajudicial disponible en la misma página se organiza por procuraduría judicial/departamento, no por municipio del hecho.

## Defensoría del Pueblo: dos fichas territoriales y ocho candidatas

El [buscador oficial SAT](https://alertastempranas.defensoria.gov.co/) devuelve diez resultados al buscar «Cartagena de Indias». Las fichas [001-17](https://alertastempranas.defensoria.gov.co/Alerta/Details/91689) y [002-20](https://alertastempranas.defensoria.gov.co/Alerta/Details/91767) ya están verificadas para Cartagena y constan en `sat_alertas_cartagena.csv`. Otras ocho son de alcance multimunicipal o nacional y están en `sat_alertas_candidatas_cartagena.csv`, **pendientes de comprobar la tabla de municipios de cada ficha**; el sitio dio tiempos de espera al intentar abrirlas en este recorrido. La búsqueda general «Cartagena» también trae **Cartagena del Chairá (Caquetá)**, que no corresponde al distrito. Ninguna alerta se convierte en un conteo de incidentes o en coordenada de casos.

## Próximas verificaciones específicas

1. Reintentar descarga de SPOA V2 desde un canal oficial accesible o solicitar exportación oficial con fecha de corte, unidad estadística y variables de municipio/año/delito.
2. Verificar directamente las ocho fichas SAT candidatas y separar alertas territoriales de advertencias nacionales aplicables.
3. Ampliar la serie ECSC del DANE con ediciones anteriores, conservando periodo del hecho, ciudad/cabecera e intervalos para cada edición.
4. Para Procuraduría, identificar conjuntos de vigilancia preventiva o disciplinaria con entidad y territorio inequívocos antes de estimar desempeño institucional de Cartagena.
