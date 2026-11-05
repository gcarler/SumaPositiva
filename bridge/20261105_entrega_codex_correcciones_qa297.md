# Cierre técnico de las correcciones QA 297

Fecha: 2026-11-05. Responsable de integración y correcciones adicionales: Codex.

**Estado: correcciones aplicadas y verificadas localmente.** Este documento registra
la verificación del implementador; no constituye un nuevo dictamen EAF independiente.
Se integran las entregas 300 de Ollamacodex y 301 de agy2 con las correcciones
adicionales descritas aquí.

El usuario autorizó expresamente registrar este cierre y ejecutar **git commit y
git push** de los cambios verificados. La autorización es posterior al resumen de
evidencia de las 11:54 UTC, cuyos campos `commit=false` y `push=false` describen
el estado que existía al tomar esa captura.

## 1. Resultado por hallazgo

| Hallazgo | Corrección aplicada | Comprobación |
| --- | --- | --- |
| H297-01 | GEIH identifica cabecera, trimestre móvil y ventanas publicadas. Desocupación usa fuerza de trabajo; informalidad, población ocupada. | Catálogo real válido y negativas de denominador, ámbito, periodo y ventana. |
| H297-02 | PM2.5 selecciona `PM2.5 \| 24 h \| estación *`, conserva cada estación y no fabrica promedio municipal. Dengue conserva «habitantes en riesgo». | Selección y unidades contrastadas con las observaciones reales; pruebas negativas de contaminante, exposición y selector vacío. |
| H297-03 | Los PDF incluyen dengue 713,24 e IRCA total 2,8 de 2024; la matriz separa urbano 2,9 y rural 2,4. | Extracción de los PDF y registro de cifras contrastado con SQLite de solo lectura. |
| H297-04 | Informalidad incluye 47,5 % de junio–agosto de 2026 como corte parcial, separado del trimestre de 2025. | Registro por documento y conservación explícita de la ventana temporal. |
| H297-05 | Fragmentos React sustituyen los `div` bajo `tbody`; los detalles usan listas de definición válidas. | Chromium: cero `tbody > div`, cero infracciones axe y cero errores de hidratación. |
| H297-06 | Error, carga y vacío tienen anuncios accesibles; el error termina «Consultando…». Los controles reciben los identificadores de `FormField`. | Interacción, teclado, filtros, debounce y error HTTP 503 en navegador. |
| H297-07 | Se exige prefijo/dimensión coherente, referencia primaria real, identidad de URL con query, selector, año base, unidad y periodos compatibles. | Las negativas originales y las regresiones nuevas rechazan contratos incompatibles. |
| H297-08 | Se retiraron las afirmaciones de 205 barrios oficiales y de 35 reuniones ejecutadas. Los cuatro PDF incluyen un anexo de fuentes territoriales con archivo, SHA, conteo y límites. | Se verifican tres capas y 35 códigos de programación; las alteraciones de SHA o conteo se rechazan. La vigencia administrativa desconocida se declara como tal. |
| H297-09 | Imports del router ordenados. | Ruff check y formato dirigidos con salida 0. |
| H297-10 | El código de convivencia es `COM_003`; las percepciones ECSC usan base 2024. `PERS_007` y `COM_003` describen conteos, sin mezclar tasas ni imputar poblaciones de 2010/2011. | Año base y unidad se contrastan con la serie seleccionada; tasas derivadas de los documentos tienen denominador anual y factor 100.000 registrados aparte. |

Las correcciones de PDF de coordinación ya presentes y las entregas 300/301 se
conservaron y verificaron. El informe independiente original
`297_entrega_codex_qa_independiente_indicadores.md` conserva exactamente su SHA:
`23d98e0a55f5a118ab617d1868dd329d2fb9e773e2d0dff8096f15986e8aa744`.

## 2. Correcciones adicionales de Codex

- El lector del catálogo devuelve copias independientes y conserva una sola versión
  en caché. Los consumidores ya no pueden alterar las respuestas posteriores.
- Archivos ausentes, ilegibles, UTF-8 inválido, cabeceras incompletas/duplicadas,
  filas incompletas y estados de publicación inválidos producen una respuesta 503
  controlada, sin rutas internas en la respuesta.
- La validación de cifras exige respaldo **por documento**. La aparición de un
  número en otro PDF ya no cubre el documento que se está revisando.
- Los valores directos se comparan con el banco. Las tasas se recalculan usando
  numerador, población del mismo año, escala 100.000 y SHA de ambas fuentes.
  No basta una expresión aritmética con literales sin respaldo.
- Se rechazan observaciones ambiguas en el banco, expresiones no aritméticas,
  denominadores incompatibles y discrepancias en los importes registrados.
- El registro pasó de 56 a **61 referencias** al detectar cinco apariciones sin
  entrada propia en la presentación. Son 55 directas y seis derivadas.
- Se añadió `main` a `src/app/indicadores/page.tsx`, manteniendo el pie fuera de
  la región principal. La prueba con Next real había detectado dos avisos
  moderados de regiones; la repetición final devuelve cero infracciones axe.

Los tres archivos frontend congelados de la entrega 301 se mantuvieron intactos.
La adición de `main` y su prueba están en `src/app/indicadores/`.

## 3. Productos y trazabilidad

El catálogo conserva **29 indicadores: 27 Tier A y dos Tier C**, todos con
`estado=no_publicable`. No se añadieron valores inventados ni se promovieron
indicadores a certificados.

`data/capas_analiticas/catalogo_indicadores/` incorpora:

- `cifras_publicadas.csv`: las 61 referencias, con procedencia y denominadores.
- `linaje_territorial_documentos.json`: archivos territoriales y programación.
- `README.md`: contrato de selección, unidades, temporalidad y reproducción.

El linaje describe **tres objetos de localidades, 15 códigos UCG urbanos y 217
geometrías de la capa de barrios recibida**. El número de geometrías no equivale
a un censo oficial de barrios del POT. La selección analítica de 17 polígonos
se distingue del universo administrativo. Los 35 códigos corresponden a mesas
configuradas como programadas; no acreditan reuniones realizadas.

Los cuatro PDF locales fueron regenerados y revisados:

| Documento en `public/docs/` | Páginas |
| --- | ---: |
| `ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf` | 9 |
| `PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` | 11 |
| `MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf` | 6 |
| `GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf` | 6 |

El generador admite `--directorio-salida` y valida primero el linaje. El validador
de cifras admite `--directorio-documentos` para comprobar documentos temporales.

## 4. Verificación final

| Comprobación | Resultado |
| --- | --- |
| Pytest dirigido: lector, validadores, catálogo, indicadores canónicos, política de acceso y linaje | **190 passed, 1 skipped, 0 failed**; corrida final 50,37 s |
| Bun: feature indicadores y página | **29 pass, 0 fail**, cuatro archivos |
| `bun run check` | exit 0: política UI, TypeScript y ESLint |
| Ruff check dirigido | exit 0 |
| Ruff format dirigido | exit 0, 12 archivos |
| Validador del catálogo real | `VALIDACION_OK`, 29 códigos únicos |
| Validador de cifras real | `VALIDACION_CIFRAS_OK`, 61 referencias, 13 códigos y cuatro documentos registrados |
| Next 16.3.8, build webpack en copia aislada | exit 0, 207 páginas estáticas |
| Storybook en copia aislada | exit 0 |
| Chromium con componente real y CSS compilado, 320/1440 px, claro/oscuro y movimiento reducido | Cero infracciones axe reportadas; sin desbordamiento del documento; tabla con desplazamiento horizontal local |
| Chromium con Next standalone real, 11:52:09–11:52:11 UTC | HTTP 200, 29 fichas, cero infracciones axe, cero errores de consola y cero errores de página |
| `git diff --cached --check` de backend, frontend, scripts y datos | exit 0 |

La única omisión de pytest requiere una `POLIS_TEST_DATABASE_URL` exclusiva
`polis_test*`. No se configuró PostgreSQL ni se conectó `bd_csh`. Las pruebas con
escrituras utilizan SQLite y archivos temporales aislados.

La compilación usa una respuesta HTTP local de formularios vacíos. En el navegador
las respuestas API se interceptan localmente. Estas comprobaciones no acreditan
integración operativa de formularios ni de la sesión con producción.

El primer intento Next falló por configurar el laboratorio en un puerto que Fetch
rechaza; se repitió correctamente con un servidor HTTP local. La primera invocación
de Storybook usó una ruta de ejecutable inexistente; la ejecución con su binario
real terminó correctamente. Las advertencias CSS de Recharts pertenecen al archivo
compartido idéntico a HEAD; los builds terminan con salida 0.

Se declara `*.pdf binary` en `.gitattributes` para que Git preserve el formato de
los PDF y no interprete sus tablas internas como cambios de código de texto.

Comandos y salidas completos:
`bridge/20261105_evidencia_correcciones_qa297/`. Incluye `resumen.json`,
`archivos.json`, logs, capturas y guiones del navegador. El manifiesto coteja el
código realmente revisado; no acredita otros cambios del árbol de trabajo.

## 5. Límites y publicación Git

- La vigencia administrativa de las capas no está acreditada. Se eliminó la
  afirmación de un conteo oficial sin soporte y se declara ese límite.
- Las licencias y las certificaciones pendientes conservan su estado. Los SHA de
  fuentes registrados en SQLite no sustituyen una autorización de uso.
- Axe no certifica WCAG. En la prueba del componente hubo verificaciones de
  contraste que axe dejó como incompletas; se conserva ese resultado en el JSON.
- El SQLite original conserva SHA
  `e0c8ba376e45dd08a64034560b8c19a6d3e2ffe99fabaf950395c5ef0f87074d`.
- Los servidores HTTP temporales de esta verificación fueron detenidos. No se
  ejecutaron despliegues, migraciones ni reinicios de servicios productivos.
- El commit autorizado comprende código, pruebas, catálogo, PDF y evidencia
  revisados. Los borrados previos de artefactos de compilación y otros cambios
  operativos ajenos al alcance quedan registrados por separado en
  `20261105_evidencia_correcciones_qa297/fuera_del_commit.json`.

Antes de publicar, `main` está cinco commits por delante de `origin/main` y cero
por detrás. El push normal incluye esos antecedentes locales y este cierre; no
requiere reescribir historia. El hash final y la confirmación remota se comunicarán
al terminar la operación.
