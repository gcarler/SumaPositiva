# Revisión de mecanismos de descarga de información

Fecha: 2026-10-23 UTC. Prioridad indicada por el usuario: comprobar cómo obtener
los datos antes de continuar la activación de la orquestación.

## Resultado

Hay mecanismos utilizables de descarga directa, API y consulta geográfica;
también tableros públicos que requieren extracción supervisada. No existe una
descarga uniforme para las 168 menciones de la guía, y varias son directorios,
referencias o instrumentos financieros.

Se realizaron **92 consultas HTTP controladas y una inspección del tablero de
Fiscalía en Chromium**, sin iniciar sesión ni usar credenciales. Las peticiones
HTTP incluyen metadatos, conteos agregados, portales, archivos y consultas
municipales. No son 92 fuentes independientes ni una descarga completa del banco.

Evidencia en [53_evidencias_descarga](53_evidencias_descarga/manifest.json), con
URL, parámetros, fecha UTC, respuesta y SHA. Matriz de **211 entradas candidatas**
(168 menciones más 43 series locales):
[CSV](54_matriz_metodos_descarga_fuentes.csv) y
[JSON](54_matriz_metodos_descarga_fuentes.json).
Cada fila distingue comprobación realizada de método todavía pendiente.

## 1. Mecanismos comprobados

| Familia / producto | Cómo obtenerlo | Evidencia de este ciclo | Condición para automatizar |
| --- | --- | --- | --- |
| Medicina Legal: siete conjuntos ya inventariados | API Socrata, `/api/views/{id}.json` y `/resource/{id}.json` | Metadatos y conteos filtrados de Cartagena accesibles sin login; consulta anual de filas de homicidios 2015–2024 | Cotejar procedencia; definir métrica; no presentar esta serie como cobertura 2025–2026 |
| Policía: siete conjuntos ya inventariados | Misma API, con filtro específico por conjunto | Metadatos y conteos municipales accesibles; un timeout de metadatos resuelto al reintentar | Distinguir código de cinco/ocho dígitos; sumar `cantidad` cuando corresponda, no contar filas indiscriminadamente |
| ICBF: RPC, primera infancia, prevención, UDS y bienestarina | API Socrata; agregaciones en servidor para oferta | Cinco consultas filtradas accesibles; RPC tiene 230 registros y años 2017–2023 en la respuesta agrupada | Mantener indicadores/unidades/ciclo vital; resolver conflictos existentes; no equiparar filas, personas y oferta |
| IDEAM: calidad del aire | API Socrata `kekd-7v7h` | Metadatos y 156 filas filtradas por municipio | Conservar estación, variable, unidad y representatividad; no sustituye bosques/deforestación |
| INS: calidad del agua | API Socrata `nxt2-39c3` | Metadatos y 17 filas filtradas por municipio | Verificar periodicidad y definición IRCA; no equivale al conjunto de eventos de SIVIGILA |
| Procuraduría: PQRSDF | API Socrata `s226-fj9i` | Metadatos y 323 filas con municipio/departamento filtrados | Son radicaciones administrativas, no condenas o hechos de violencia |
| DANE: ECSC | Enlace XLSX desde página oficial | Descarga completa de 543.732 bytes; estructura ZIP/XLSX legible | Resolver edición y periodos de referencia por variable; revisar muestra y cobertura de Cartagena |
| DNP: TerriData Cartagena | ZIP municipal con Excel | Descarga completa de 305.031 bytes; contiene `TerriData13001.xlsx` | Conservar custodio original, unidad, año y limitaciones de cada indicador |
| Unidad para las Víctimas: IRV | ArcGIS REST, descubrir capas y consultar `/query` | Servicio accesible; capa IRV2025 devuelve una entidad de Cartagena | Verificar campos/año, cambios del servicio y alcance municipal |
| Unidad para las Víctimas: indemnizaciones | ArcGIS REST `/MapServer/1/query` | Consulta filtrada devuelve 14 entidades, sin indicador de límite excedido | Conservar vigencia; separar personas, giros y valor; verificar cobertura/corte |
| Unidad para las Víctimas: RUV | Servicio RNI, lista de cortes y consulta `api/Cifras/DatosAbiertos` | Lista de 11 cortes accesible; incluye 30/09/2026 | En este ciclo no se repitió la extracción completa del reporte5; validar corte y filtro antes de guardar |
| Fiscalía: procesos | Tablero público Power BI, extractor Playwright existente | Portada cargada en navegador; corte visible **30/09/2026** | Extracción municipal/anual nueva aún no ejecutada; validar filtros, etiquetas y reconciliación |

Los 22 conjuntos Socrata del banco tienen metadatos accesibles tras el reintento
y un conteo municipal consultado. **Los conteos son filas del conjunto, no nuevos
indicadores aceptados ni totales comparables entre instituciones.**

Los dos archivos completos descargados —ECSC y TerriData— tienen exactamente el
mismo SHA que sus copias en el banco. Se comprobó el mecanismo; no se encontró
una edición nueva de esos dos archivos en las URL utilizadas.

### Identificadores y filtros para Socrata

| Conjunto | ID | Filtro municipal usado |
| --- | --- | --- |
| Medicina Legal: homicidios | `vtub-3de2` | `codigo_dane_municipio='13001'` |
| Medicina Legal: violencia intrafamiliar | `ers2-kerr` | Igual al anterior |
| Medicina Legal: exámenes sexuales | `hyqu-diue` | Igual al anterior |
| Medicina Legal: violencia interpersonal | `e3xi-4zq5` | Igual al anterior |
| Medicina Legal: suicidios | `f75u-mirk` | Igual al anterior |
| Medicina Legal: lesiones accidentales | `6cjn-eevd` | Igual al anterior |
| Medicina Legal: lesiones de transporte | `ezhf-hscf` | Igual al anterior |
| Policía: homicidios | `m8fd-ahd9` | `cod_muni='13001'` |
| Policía: lesiones | `72sg-cybi` | `codigo_dane='13001000'` |
| Policía: amenazas | `meew-mguv` | Igual al anterior |
| Policía: violencia intrafamiliar | `vuyt-mqpw` | Igual al anterior |
| Policía: delitos sexuales | `fpe5-yrmw` | Igual al anterior |
| Policía: hurto vehículos | `9vha-vh9n` | Igual al anterior |
| Policía: hurtos vivienda/comercio | `6sqw-8cg5` | Igual al anterior |
| ICBF: RPC | `v9qk-hdcc` | `divipola_municipio='13001'` |
| ICBF: primera infancia | `5akr-u7t8` | `codigo_municipio_uds='13001'` |
| ICBF: prevención | `g58z-k6f6` | `codigo_municipio_atenci_n='13001'` |
| ICBF: UDS | `i8ww-5mcf` | `codigo_dane_municipio='13001'` |
| ICBF: bienestarina | `crxh-as6c` | Igual al anterior |
| IDEAM: aire | `kekd-7v7h` | `c_digo_del_municipio='13001'` |
| INS: agua | `nxt2-39c3` | `municipiocodigo='13001'` |
| Procuraduría: PQRSDF | `s226-fj9i` | `departamento='BOLIVAR' AND municipio='CARTAGENA' AND fecha_de_radicaci_n IS NOT NULL` |

Ejemplo de consulta **realmente ejecutada**, que devuelve conteos de filas por
año, sin extraer registros individuales:

```text
GET https://www.datos.gov.co/resource/vtub-3de2.json
$select=a_o_del_hecho,count(*) as filas
$where=codigo_dane_municipio='13001'
$group=a_o_del_hecho
$order=a_o_del_hecho
$limit=100
```

Estos parámetros deben enviarse codificados por el cliente HTTP. Para una
descarga completa: seleccionar columnas necesarias, filtrar territorio, usar
orden estable y paginación, verificar el conteo y la revisión de filas antes y
después. La [documentación de Socrata](https://dev.socrata.com/docs/paging.html)
describe `$limit`/`$offset`. Las consultas SODA2 probadas aquí funcionan sin
credenciales; un [token de aplicación](https://dev.socrata.com/docs/app-tokens)
puede elevar límites de uso. Esto no garantiza acceso a recursos restringidos
ni se extiende automáticamente a otras versiones de la API.

## 2. Obstáculos concretos

### Fiscalía V2: no asumir API abierta por aparecer en buscadores

La [guía oficial de Fiscalía](https://www.fiscalia.gov.co/colombia/wp-content/uploads/GUIA-PARA-LA-CONSULTA-DE-CIFRAS-ESTADISTICAS-A-TRAVES-DE-DATOS-ABIERTOS-1.pdf)
remite a conjuntos de procesos, víctimas, indiciados y actuaciones. En este ciclo:

- `4mnf-va5w` (víctimas) y `9pc4-8nib` (actuaciones): tanto metadatos como
  consulta API devolvieron **403**, con mensaje que requiere iniciar sesión.
- Las páginas de esos conjuntos redirigen a login al abrirlas con el navegador
  de consulta web. Un resultado indexado anterior no prueba acceso actual.
- No se localizaron/acreditaron en este ciclo los ID nacionales vigentes de los
  otros dos productos. La búsqueda en el catálogo devolvió resultados que no
  correspondían al producto solicitado: se conservaron como evidencia negativa,
  sin incorporarlos como si fueran fuentes de Fiscalía.
- La alternativa pública comprobada es el tablero de procesos ya recibido.
  Se abrió la portada, se conservó su texto/captura y se identificó su corte.
  No se volvió a extraer la serie ni se certificó un endpoint público de datos.

Acción: mantener un adaptador supervisado de Power BI y gestionar acceso
autorizado a los productos V2 si se necesitan. Un 403 no prueba que una cuenta
cualquiera conceda acceso ni demuestra que el conjunto haya sido eliminado.
No se utilizaron las credenciales compartidas anteriormente.

### Medicina Legal: dos campos de procedencia se contradicen

En `e3xi-4zq5` y `ezhf-hscf`, `attribution` refiere a Sogamoso y Apía,
respectivamente; **el propietario del conjunto y los campos de entidad indican
Medicina Legal**. La descripción habla de cobertura nacional.

Es una inconsistencia de metadatos que debe cotejarse. No demuestra por sí sola
que los datos sean falsos ni que su propietario sea la alcaldía. No se eliminaron
series ni se corrigieron atribuciones por suposición.

El sitio web de boletines/lesiones devolvió 403 con pantalla de verificación
desde este entorno; las API históricas sí respondieron. Gestionar el producto
oficial más reciente por su canal habilitado cuando se necesiten años posteriores
a 2024; no completar 2025/2026 extrapolando la serie histórica.

### Enlaces de la guía y portales interactivos

De los 32 portales consultados: 18 devolvieron200, dos403, tres404 y nueve fallaron
por conexión/timeout. Un 200 puede ser la portada, un login o una aplicación;
no es prueba de archivo descargable. El detalle original está en `revision.json`.

- Las dos rutas antiguas de Policía y la ruta histórica de MinDefensa devolvieron
  404. Las API policiales del banco funcionan: actualizar referencias mediante
  sus fichas actuales antes de descartar la fuente.
- ICBF enlaza tableros Tableau y su catálogo de datos abiertos. Las cinco API
  probadas son una vía concreta; no acreditan que SRPA, PARD y todos los tableros
  estén descargados. La exportación de estos otros productos queda por verificar.
- Defensoría/SAT, JEP y ART enlazan Power BI. Detectar el enlace no acredita
  exportación. El catalogador SAT actual solo consulta dos fichas preseleccionadas;
  no descubre exhaustivamente todas las alertas nuevas de Cartagena.
- SIUCE muestra enlaces documentales y al menos un XLSX; no se descargó ni se
  acreditó su cobertura municipal en este ciclo.
- INS boletines, SISPRO, ODC, SNITP, SAGA y otros portales requieren resolver
  el producto concreto. No se inventaron API a partir de su URL institucional.
- Los fallos de conexión de OCA, observatorio de mujeres, OSC, MinTrabajo y
  otros solo describen esta consulta, no una indisponibilidad permanente.
- Registros de comisarías, inspecciones, personerías, CAD/123 y recolección
  comunitaria: localizar custodio/producto y comprobar acceso; cuando no haya
  publicación, tramitar entrega institucional. No se emitieron solicitudes.

## 3. Qué reutilizar del código existente y qué ajustar

| Componente | Capacidad encontrada | Ajuste antes de activarlo |
| --- | --- | --- |
| `data/banco_fuentes_oficiales/sincronizar.py` | Captura Socrata, selección de columnas, paginación, conteos y revisión del corte | Reutilizar captura/agregación; separar sus escrituras locales del nuevo consumidor por política |
| `backend/app/modules/compromisos/metadatos_socrata_polis.py` | Metadatos versionados, licencia, alertas de atribución y concurrencia | Incorporar cotejo de propietario/entidad, conservando conflictos de metadatos |
| `extraer_icbf_cartagena.py` | RPC y agregaciones de oferta con consultas concretas | Validar truncamiento de todas las consultas y cobertura por producto |
| `extraer_dane_cartagena.py`, `extraer_geih_cartagena.py`, `extraer_terridata_cartagena.py` | Descargas/anexos y extracción de hojas conocidas | Evitar tratar un archivo cacheado como verificación de novedad; descubrir ediciones y registrar fecha/ETag/SHA |
| `extraer_irv_cartagena.py` | Descubrimiento de capas y filtro13001 | El intervalo esperado está fijado a2012–2025; parametrizar horizonte y registrar capas nuevas |
| `extraer_ruv_cartagena.py` | Descubrimiento de cortes y consulta municipal | Usa `dates[0]`: validar/seleccionar fecha por valor y no depender solo del orden; horizonte actual fijado hasta2026 |
| `extraer_fiscalia_powerbi_cartagena.mjs` y extractores relacionados | Lectura de filtros y etiquetas accesibles del tablero | El primero espera exactamente23 puntos2004–2026; retirar horizonte fijo y reconciliar datos en staging |
| `scripts/sincronizar_fuentes_versionado.py` | Copia staging, validación y respaldo/compensación | Su función también promociona el banco; no usarla como simple explorador de descargas |

Algunos extractores escriben CSV, manifiestos y una base SQLite local. **No se
ejecutaron sus funciones completas ni sus comandos principales**: habrían alterado
el banco. Solo se reutilizó información de sus configuraciones para consultas
controladas, con salidas nuevas dentro del puente.

## 4. Orden recomendado de implementación, después de esta revisión

1. Adaptador Socrata común para los 22 productos identificados: metadatos,
   consultas filtradas/agregadas, revisión de versión, límites y staging inmutable.
   Mantener configuración específica por producto; no universalizar unidades.
2. Adaptador de anexos oficiales DANE/TerriData: descubrimiento de enlaces,
   edición, firma de archivo, descarga y registro de cambios reales.
3. Adaptador ArcGIS/RNI para la Unidad: capas/cortes dinámicos, filtro13001,
   paginación cuando aplique y validación de error JSON incluso con HTTP200.
4. Fiscalía supervisada: conservar corte/filtros/etiquetas y conciliación;
   gestión de acceso a API V2 como tarea independiente si se requiere.
5. Completar productos sectoriales pendientes: SIUCE, SRPA/PARD, SAT,
   ambiente y registros distritales, según necesidades de la política.
6. Conectar estas descargas al planificador50 **después** de acreditar fichas,
   validadores y pruebas de aceptación. La existencia de URLs no cierra esa etapa.

Cada entrega debe registrar producto, consulta/filtros, corte, fecha de acceso,
formato, SHA, revisión de fuente, cobertura y condiciones de uso. Versionar las
respuestas originales y las transformaciones por separado; el dato nuevo no
reemplaza el corte usado en un informe anterior.

## 5. Alcance de esta entrega

Solo revisión, consultas de lectura y evidencia en el puente. Sin cambios en
aplicación, frontend, base de datos, credenciales, banco activo o cortes vigentes.
Sin pytest, commit, push ni deploy. Se verificaron mecanismos concretos; no se
declara descarga total de fuentes ni plataforma multipolítica operativa.
