# Banco inicial de información oficial sobre seguridad humana en Cartagena

**Corte de extracción:** 21 de octubre de 2026. **Ámbito:** municipio DIVIPOLA 13001 (en algunos conjuntos de Policía, 13001000). El banco combina conjuntos de [Datos Abiertos Colombia](https://www.datos.gov.co/) con anexos descargados del [catálogo oficial del DANE](https://www.dane.gov.co/index.php/estadisticas-por-tema). Es una primera capa de resultados oficiales para cruzar con los PDD y PA de POLIS; todavía no es una evaluación causal ni un índice único de seguridad humana.

## Archivos

- `cartagena_seguridad_humana.sqlite`: tablas `fuentes` y `observaciones` con **28 fuentes y 1.488 observaciones agregadas** (26/1.477 del banco previo, 1/6 de DANE SAE y 1/5 de Procuraduría PQRSDF).
- `catalogo.csv`: identificador, institución, enlace, filtro, fecha de extracción, SHA-256, número de filas y años de cada fuente.
- `extracciones/*.json`: resultados **agregados**, idénticos a los cargados en SQLite. Los archivos `*.metadata.json` conservan la atribución y las columnas de la publicación de origen.
- `sincronizar.py`: consulta reproducible de la API de Datos Abiertos y descarga los anexos DANE. Ejecutar desde la raíz con `uv run --project backend python data/banco_fuentes_oficiales/sincronizar.py`.
- `extraer_dane_cartagena.py` y `dane_indicadores_cartagena.csv`: extracción de anexos ya descargados, con hoja, celda, SHA-256, escala, periodo e incertidumbre muestral. Puede repetirse sin descargar: `uv run --project backend python data/banco_fuentes_oficiales/extraer_dane_cartagena.py`.
- `extraer_geih_cartagena.py` y `dane_geih_cartagena.csv`: 51 tasas de Cartagena con corte octubre–diciembre de 2012–2025 (GEIH) y 2021–2025 (informalidad), más el último trimestre móvil junio–agosto de 2026. Ejecutar con `uv run --project backend python data/banco_fuentes_oficiales/extraer_geih_cartagena.py`. El CSV conserva celda, hoja, archivo, hash y periodo; **octubre–diciembre no es promedio anual**.
- `extraer_terridata_cartagena.py` y `dnp_terridata_cartagena.csv`: 82 valores de 10 indicadores seleccionados del [archivo oficial municipal de TerriData](https://terridata.dnp.gov.co/assets/docs/excel/entidades/TerriData13001.xlsx.zip); conserva fila, unidad, custodio original y SHA-256 del ZIP. Ejecutar con `uv run --project backend python data/banco_fuentes_oficiales/extraer_terridata_cartagena.py`.
- `documentos_oficiales/`: documentos DANE descargados; su identificación y hash están en `documentos_oficiales/manifest.json`.
- `MATRIZ_ECOSISTEMA_FUENTES_CARTAGENA_2026.md`: qué fuentes están conectadas, cuáles son consultables y cuáles requieren cartografía o acceso institucional.
- `sat_alertas_cartagena.csv` y `catalogar_sat_cartagena.py`: dos fichas territoriales de Defensoría verificadas para Cartagena de Indias, Bolívar; son un catálogo documental no exhaustivo, separado de las observaciones numéricas.
- `extraer_ruv_cartagena.py`, `ruv_cartagena.csv` y `EVALUACION_UNIDAD_VICTIMAS_CARTAGENA.md`: datos agregados del RUV por hecho y año, con corte y unidad explícitos; evaluación separada del Mapa de Victimización.
- `catalogo_geovisores_unidad_victimas.csv`: diez visores del Geoportal oficial, con tema, estado de incorporación y escala territorial confirmada.
- `extraer_irv_cartagena.py` e `irv_cartagena.csv`: índice de riesgo municipal 2012–2025; 2016 se conserva como ausencia de dato.
- `extraer_indemnizaciones_cartagena.py` e `indemnizaciones_cartagena.csv`: giros, personas y millones de COP por vigencia 2012–2023. La discrepancia oficial de 2024 queda registrada en metadatos y excluida de los indicadores.
- `extraer_dane_sae_cartagena.py` y `dane_sae_cartagena.csv`: seis estimaciones municipales experimentales de FIES, pobreza monetaria e IPM para 2022 y 2024, con incertidumbre y archivo original.
- `extraer_procuraduria_pqrsdf_cartagena.py` y `procuraduria_pqrsdf_cartagena.csv`: cinco agregados públicos de solicitudes por tipo y año; no contienen remitentes.
- `sat_alertas_candidatas_cartagena.csv` y `HALLAZGOS_DANE_FISCALIA_PROCURADURIA_DEFENSORIA_2026.md`: búsqueda ampliada y límites de acceso a Fiscalía y fichas SAT.
- `extraer_icbf_cartagena.py`, `icbf_rpc_cartagena.csv`, `icbf_oferta_cartagena.csv` y `EVALUACION_ICBF_CARTAGENA_2026.md`: paquete ICBF/SUIN recién extraído para Cartagena, mantenido separado de las 28 fuentes del SQLite hasta resolver duplicados y equivalencias con los custodios originales.

No se guardan filas individuales de víctimas, fechas exactas ni coordenadas de incidentes. Se conserva el número de registros consultados para auditar cada agregación. Los archivos de origen pueden cambiar por depuración retrospectiva; el SHA y la fecha permiten detectar revisiones al volver a sincronizar.

## Fuentes ya incorporadas

| Custodio | Conjuntos | Cobertura de Cartagena | Lectura correcta |
| --- | --- | --- | --- |
| [Medicina Legal](https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2) | Homicidios, violencia intrafamiliar, exámenes por presunto delito sexual, violencia interpersonal, suicidios, lesiones accidentales y por transporte | 2015–2024, cifras definitivas | Hechos conocidos por el sistema médico legal; categorías y criterios de inclusión propios. |
| [Policía Nacional](https://www.datos.gov.co/Seguridad-y-Defensa/Reporte-Delito-Violencia-Intrafamiliar-Polic%C3%ADa-Nac/vuyt-mqpw) | Homicidios, lesiones, amenazas, violencia intrafamiliar, delitos sexuales y hurtos de vehículos, viviendas y comercio | 2010–2026; 2026 es corte parcial | Registros policiales y denuncias; `cantidad` se suma dentro de cada conjunto. No equivalen a valoraciones médico legales. |
| [IDEAM / SISAIRE](https://www.datos.gov.co/Ambiente-y-Desarrollo-Sostenible/Calidad-Del-Aire-En-Colombia-Promedio-Anual-/kekd-7v7h) | Calidad del aire anual por estación, contaminante y tiempo de exposición | 2014–2025 | Promedio de una estación, **no promedio distrital**; revisar representatividad temporal. |
| [INS / SIVICAP](https://www.datos.gov.co/Salud-y-Protecci-n-Social/Calidad-del-Agua-para-Consumo-Humano-en-Colombia/nxt2-39c3) | IRCA total, urbano y rural | 2010–2024 | Índice anual de calidad del agua; no indica por sí solo número de personas expuestas. |
| [DANE, pobreza monetaria](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf) | Incidencia de pobreza monetaria de Cartagena | 2023–2025 | Tres porcentajes de la tabla municipal oficial; es una serie de resultado, no una medida de impacto de los PDD. |
| [DANE, proyecciones municipales](https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion) | Población total, cabecera y centros poblados/rural de Cartagena | 2012–2027; 48 observaciones | Denominador oficial de tasas municipales. La versión 2018–2042 se actualizó en 2025; no es población por UCG. |
| [DANE, ECSC](https://www.dane.gov.co/index.php/estadisticas-por-tema/seguridad-y-defensa/encuesta-de-convivencia-y-seguridad-ciudadana-ecsc) | Siete estimaciones de victimización, denuncia y percepción | Hechos 2023 y percepción 2024; cabecera de Cartagena | Encuesta de personas de 15 años o más. Se conservan CVE e intervalos; no son conteos de denuncias ni datos por barrio. |
| [DANE, NBI CNPV 2018](https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/necesidades-basicas-insatisfechas-nbi) | NBI, miseria y cinco componentes; total, cabecera y resto | 2018; 21 observaciones | Línea base censal municipal. No es una serie anual ni debe confundirse con IPM. |
| [DANE, GEIH](https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIH-ago2026.xlsx) | Participación, ocupación y desocupación | Cortes octubre–diciembre 2012–2025 y junio–agosto 2026; 45 observaciones | Trimestres móviles para Cartagena, no promedios anuales ni cifras de UCG. |
| [DANE, informalidad GEIH](https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIHEISS-jun-ago2026.xlsx) | Proporción de empleo informal | Cortes octubre–diciembre 2021–2025 y junio–agosto 2026; 6 observaciones | Denominador: población ocupada del dominio urbano publicado. No se compara con metodología previa sin empalme. |
| [DNP, TerriData 13001](https://terridata.dnp.gov.co/assets/docs/excel/entidades/TerriData13001.xlsx.zip) | Diez indicadores: homicidio, violencia intrafamiliar, dengue, desnutrición, inundaciones, deforestación, pobreza, víctimas de desplazamiento ubicadas, participación y transparencia institucional | 82 observaciones, vigencias variables 2012–2025 | Compilación municipal de varias entidades: mirar custodio y unidad en cada fila. Las víctimas ubicadas no son alertas SAT; los índices institucionales solo tienen 2022. |
| [Unidad para las Víctimas, RUV](https://datospaz.unidadvictimas.gov.co/registro-unico-de-victimas/) | Personas por ocurrencia, personas por declaración y eventos por hecho victimizante y año | 522 agregados de Cartagena 2012–2026; corte del registro 30-09-2026 | Registro de víctimas incluidas; no es censo de todos los delitos ni mapa de puntos de hechos. No sumar personas entre hechos o años como víctimas únicas. |
| [Unidad para las Víctimas, IRV](https://datospaz.unidadvictimas.gov.co/indice-de-riesgo-de-victimizacion/) | Índice estimado y categoría de riesgo municipal | 13 valores 2012–2025; 2016 sin información | Indicador preventivo de riesgo 0–1, no número de víctimas ni tasa de delitos. |
| [Unidad para las Víctimas, indemnizaciones](https://datospaz.unidadvictimas.gov.co/mapa-indemnizacion/) | Giros, personas atendidas y valor | 36 observaciones 2012–2023; 2024 excluido por discordancia entre capas | Medida de reparación. El valor está en millones de COP; no es gasto de los PDD de Cartagena. |
| [DANE, estimaciones municipales SAE](https://sitios.dane.gov.co/EstimacionesModeloSAE/) | FIES, pobreza monetaria e IPM | 6 estimaciones de 2022 y 2024 con intervalos | Modelos de áreas pequeñas; no sustituir las mediciones directas ni inferir causalidad de los PDD. |
| [Procuraduría, PQRSDF](https://www.procuraduria.gov.co/Pages/datos-abiertos.aspx) | Radicaciones de sede electrónica por tipo | 5 agregados de 2024, 323 solicitudes | Demanda institucional; no cuenta incidentes de inseguridad. |

En Medicina Legal, violencia intrafamiliar y violencia de pareja pueden estar en **conjuntos separados**. Por ejemplo, la serie `ers2-kerr` cargada aquí no debe presentarse como la totalidad de la violencia de pareja. Los exámenes por presunto delito sexual tampoco son equivalentes a delitos sexuales denunciados ante Policía. En 2024 la extracción actual da **411 homicidios** en Medicina Legal; este valor coincide con [Forensis 2024](https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf). Las series de delitos se mantienen separadas por custodio y definición.

Los conjuntos policiales de hurto usados son **solo** [motocicletas y automotores](https://www.datos.gov.co/Seguridad-y-Defensa/Reporte-Hurto-por-Modalidades-Polic%C3%ADa-Nacional/9vha-vh9n) y [residencias y comercio](https://www.datos.gov.co/Seguridad-y-Defensa/Reporte-Hurto-por-Modalidades-Polic%C3%ADa-Nacional/6sqw-8cg5). Existe además un conjunto de abigeato, pero no representa el total de hurtos. Estos registros policiales pueden coincidir parcialmente con los tres GeoJSON de hurtos previamente recuperados; **no se suman** entre sí hasta conocer procedencia, corte y regla de deduplicación.

TerriData es un **agregador**, no una nueva fuente de hechos independiente: algunas series proceden de MinDefensa, Medicina Legal o DANE y pueden coincidir con otras del banco. Se usan para tasas, unidades y dominios publicados, nunca para sumar casos con el conjunto original. La serie municipal de pobreza TerriData llega a 2024; la presentación DANE 2025 aporta el año siguiente y el valor 2024 coincide (41,1 %).

## Fuentes oficiales identificadas para ampliar el banco

- **Seguridad económica:** ya se incorporó la tabla de Cartagena 2023–2025 del [DANE](https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/pobreza-monetaria). El anexo descargado se titula «Total Nacional» y no debe tratarse como serie municipal. Para ampliar a más años puede usarse el [catálogo de microdatos de pobreza](https://microdatos.dane.gov.co/index.php/catalog/908), respetando factores de expansión y cambios metodológicos.
- **Mercado laboral:** GEIH e informalidad ya tienen extracción municipal del [anexo laboral](https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIH-ago2026.xlsx) y el [anexo de informalidad](https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIHEISS-jun-ago2026.xlsx). Para ampliar análisis de estacionalidad deben usarse todos los trimestres móviles, con cuidado por su solapamiento; la serie de informalidad 2021–2026 no debe empalmarse automáticamente con la medición anterior.
- **Seguridad alimentaria:** [DANE, FIES 2025](https://www.dane.gov.co/index.php/estadisticas-por-tema/salud/escala-de-experiencia-de-inseguridad-alimentaria-fies). El anexo regular de 2025 no contiene una fila rotulada Cartagena. Se integraron por separado las estimaciones municipales experimentales [SAE 2022 y 2024](https://sitios.dane.gov.co/EstimacionesModeloSAE/), con sus intervalos; no existe en este archivo una estimación municipal de 2025.
- **Seguridad sanitaria:** [boletines epidemiológicos del INS](https://www.ins.gov.co/buscador-eventos/Paginas/Info-Evento.aspx) y anuario de [salud distrital](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/salud-788). Se requiere extraer series homogéneas de dengue, desnutrición y mortalidad por evento con sus cortes.
- **Seguridad política:** [histórico de resultados electorales de Registraduría](https://observatorio.registraduria.gov.co/anexos/Guia_de_consulta_Historico_resultados_electorales.pdf) y registros de participación y respuesta institucional de Cartagena. Participación electoral mide una parte del eje; no sustituye incidencia real de propuestas ciudadanas ni protección de derechos.
- **Ambiente y riesgo:** [catálogo de estaciones IDEAM](https://www.datos.gov.co/Ambiente-y-Desarrollo-Sostenible/Cat-logo-Nacional-de-Estaciones-del-IDEAM/hp9r-jxuu) y fuentes de EPA/gestión del riesgo para lluvia, inundación y exposición. La estación y su cobertura deben validarse antes de mapear un valor a toda Cartagena.

## Criterios de integración con los planes

Cada gráfico debe usar una sola definición de evento por línea y conservar fuente, versión, unidad, periodo, corte, denominador y geografía. Para comparar periodos de gobierno hacen falta tasas de población expuesta y la fecha real de entrega de los productos de cada plan. Los datos públicos aquí extraídos son municipales o por estación; **no traen puntos de casos por UCG**, de modo que no reemplazan el GeoJSON multifuente ni autorizan mapas de calor barriales. Las variaciones en denuncias pueden reflejar cambios de acceso al sistema además de cambios en ocurrencia.

Consulta básica:

```sh
sqlite3 cartagena_seguridad_humana.sqlite "SELECT anio, valor FROM observaciones WHERE fuente_clave='medicina_homicidios' ORDER BY anio;"
```

La siguiente etapa es enlazar estas series con indicadores de producto, territorios y fechas de los PDD/PA, documentar denominadores DANE y producir gráficos por fuente. Una caída simultánea a un plan no se atribuye a ese plan sin evaluar exposición y comparadores.

El [cruce inicial de planes y resultados](CRUCE_PLANES_RESULTADOS_CARTAGENA.md) sitúa las series verificadas en los periodos PDD y detalla la evidencia que falta para estimar contribución y comparar financieramente los planes.

La ECSC 2024 estima para la **cabecera** de Cartagena 9,527 % de personas de 15 años o más victimizadas en 2023 (IC publicado 8,170–10,883), 74,603 % de víctimas que no denunciaron (IC 69,656–79,550) y 75,113 % que se sentían inseguras en la ciudad en 2024 (IC 72,462–77,765). Estos porcentajes tienen denominadores y periodos distintos. El NBI censal municipal de 2018 fue 12,4895 %; solo sirve como línea base estructural. Todos los valores se reproducen desde las celdas del CSV curado y sus anexos oficiales.


## Actualización del portal oficial de Policía — 2026-11-05

Se descargaron los nueve anexos de https://www.policia.gov.co/estadistica-delictiva: dos publicaciones de cuadros y siete archivos anuales de registros 2020–2026. Los originales y sus hashes están en `policia_portal/capturas/20261105/`. La extracción completa está en `policia_portal/procesados/20261105_v2/`.

El ZIP compartido es idéntico al oficial y sus 77 valores coinciden. En el consolidado se sustituye la clave recibida por `portal_policia_cuadros_cartagena`, con 133 observaciones anuales: 18 delitos/modalidades más el subtotal de hurtos. Se conservan aparte 1.539 observaciones mensuales y 7.290 desgloses mensuales por armas, sin forzarlos al contrato anual del corredor. El corte de 2026 llega a septiembre.

Los registros y los cuadros difieren en ocho meses de lesiones de 2021 (24 casos adicionales en registros). La causa no está determinada; se conservan ambos valores y se usa como referencia la publicación de cuadros recomendada por la entidad. Sexo y edad tienen advertencias de completitud del publicador. No sumar cuadros, registros y ediciones Socrata.

El SQLite anterior conserva su contenido. La nueva clave tiene 19 cruces explícitos en el catálogo 7D v6; la revisión de licencia y comparabilidad sigue pendiente; la incorporación local no es autorización de publicación ni una evaluación causal. Ver `policia_portal/activo.json` y el informe del puente `bridge/20261105_cotejo_fuente_oficial_policia.md`.
