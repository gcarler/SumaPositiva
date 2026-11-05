# Encargo 297 — QA independiente del catálogo de indicadores y sus publicaciones

**Auditor:** Codex · **Fecha:** 5 de noviembre de 2026 · **Modalidad:** revisión de solo lectura.  
**Referencias:** encargos/entregas 295, 296 y corrección 298.  
**Dictamen: RECHAZA el cierre integral del paquete en el estado revisado.**

**Nota de versión:** los §§2–9 conservan la auditoría del corte original de 24 filas, fijado a las 08:15:16 UTC. Durante la redacción entró una corrección concurrente identificada como Encargo 299. **El Anexo D prevalece para el estado final**, revalidado desde las 08:25 UTC: hay **29 filas, 27 Tier A y 2 Tier C**, y Ruff ya pasa.

Se confirman respaldo referencial, funcionamiento del GET y corrección de pobreza monetaria a **34,6 % en 2025**. Persisten errores metodológicos, afirmaciones desactualizadas en los PDF y defectos reproducibles de HTML/accesibilidad; además se encontraron problemas en los metadatos recién añadidos. El cierre integral continúa **RECHAZADO**.

Este dictamen no prescribe detener servicios ni retirar automáticamente información: identifica qué debe corregirse y revalidarse antes de declarar el cierre.

## 1. Independencia, alcance y cortes de lectura

- No implementé el catálogo, el lector `/indicadores/catalogo`, la página `/indicadores`, sus pruebas ni el generador de estos cuatro PDF. Sí participé previamente en el módulo adyacente Datos/Geovisor y en ajustes de sus rótulos. **La revisión de esos rótulos es una constatación, no una auditoría independiente de mi trabajo anterior.**
- Se leyó el encargo 297 completo y los documentos 295, 296, 298, sus tareas, la línea base, cobertura y catálogo. Se aplicaron `polis-ui-review`, las reglas del kit y `convert-documents-to-markdown` para la extracción documental.
- La ruta nueva del catálogo lee un CSV y no usa sesión SQL. La revisión transaccional EAF no exige una transacción de escritura para ese GET. Los otros CRUD del módulo conservan permisos y límites `transaction()` en servicio, comprobados por lectura; las tres pruebas de persistencia de metadatos se omitieron por ausencia deliberada de una base de pruebas. **No se certifica aquí su persistencia.**
- En el repositorio se escribe únicamente esta entrega. Los guiones, conversiones y resultados auxiliares se guardaron en `/tmp/polis_297_*`. No se ejecutó el generador de PDF, ninguna migración, ingesta, despliegue ni comando de servicio. No se accedió a `/root/polis-releases` ni a la configuración/unidad `polis-frontend`. No se hizo commit ni push.
- Para pytest se vaciaron `POLIS_TEST_DATABASE_URL` y `POLIS_TEST_MIGRATIONS_DATABASE_URL`; la configuración SQL del proceso se sustituyó por una dirección inalcanzable de nombre `polis_test_297_inaccesible` en `127.0.0.1:1`. No se conectó a PostgreSQL. SQLite se consultó con URI `mode=ro&immutable=1`; el validador existente usa `mode=ro`.

### 1.1 Horas de revisión y concurrencia

| Momento | UTC, 2026-11-05 | Hora de Colombia, UTC−5 |
| --- | --- | --- |
| Lectura de 296 | 07:51:58 | 02:51:58 |
| Primera captura SHA del backend, `/indicadores`, menú y PDF | 07:52:30 | 02:52:30 |
| Verificaciones UI, TypeScript, ESLint y 18 pruebas de indicadores | 07:55:00–07:55:54 | 02:55:00–02:55:54 |
| Reproducción válida del TestClient | 07:58:35 | 02:58:35 |
| Consulta HTTPS del PDF primario DANE | 08:08:59 | 03:08:59 |
| Chromium, componente real en laboratorio temporal | 08:09:35–08:09:44 | 03:09:35–03:09:44 |
| Nueva inspección de PDF después del cambio concurrente | 08:10–08:11 | 03:10–03:11 |
| Captura final de código y documentos | 08:15:16 | 03:15:16 |

Los archivos de `src/features/indicadores/**`, `src/app/indicadores/page.tsx`, backend del catálogo y validador conservaron el SHA entre la primera captura y el corte de 08:15:16. Los cambios posteriores se registran en el Anexo D. La entrega 298 ya estaba presente al iniciar; la vista tiene mtime **07:19:33 UTC** y su prueba **07:21:02 UTC**. Se auditó esa corrección, no una versión anterior.

A las **08:07:32 UTC**, durante esta QA, cambiaron el generador y los cuatro PDF por una edición concurrente de membretes y atribuciones. Se extrajeron nuevamente: las secuencias numéricas del texto se conservaron, con 167, 166, 81 y 93 tokens numéricos respectivamente en ABC, presentación, guía y matriz. Los hallazgos sobre cifras y cobertura permanecen. El membrete anterior no se presenta como defecto vigente.

`HEAD` observado al inicio: `51d985bb41db400e45b3239c414057f622623b15`.  
`HEAD` observado a las 08:15:16 UTC: `4c525e133955a9285090686f6700c4baaad24058`.  
El cambio de HEAD ocurrió durante la revisión; Codex no ejecutó comandos de commit. El árbol ya contenía 4.622 eliminaciones y otros cambios al iniciar. Esta auditoría no restauró ni depuró ese estado y no afirma que el árbol estuviera limpio.

## 2. Reproducción de los siete comandos de 296, §7 — corte original

Los comandos abreviados del informe 296 se concretaron a rutas existentes. `test_indicadores_canonicos` corresponde a `backend/tests/test_indicadores_canonicos_polis.py`; el footer real es `src/shared/layout/footer.tsx`.

| # | Comando reproducido | Salida observada | Clasificación de la afirmación de 296 |
| --- | --- | --- | --- |
| V1 | `PYTHONDONTWRITEBYTECODE=1 backend/.venv/bin/python scripts/validar_catalogo_indicadores.py` | exit 0; 24 códigos únicos; PERS A5/C1, COM A2, AMB A3, ECON A4, SALUD A4, POL A2/C1, SAT A2; `VALIDACION_OK` | **CONFIRMADA** como validación estática mínima; no demuestra corrección semántica, H297-01/02/07. |
| V2 | `sha256sum data/capas_analiticas/catalogo_indicadores/catalogo.csv` | `65dfaa44e12e3557db934543b28eab331396aac1049bdf319471fcb88d4f10b1` | **CONFIRMADA**. |
| V3 | TestClient de `create_app(Settings(_env_file=None, environment="test", ...))`, GET, filtros y POST de `/api/v1/indicadores/catalogo` | GET 200/24; PERS 6; C 2; SALUD+A 4; búsqueda Homicidio 2; POST 405 | **CONFIRMADA**. Se prohibió usar `get_session` mediante override que lanza una excepción si se invoca. |
| V4 | `backend/.venv/bin/python -m pytest -p no:cacheprovider --basetemp=/tmp/polis_297_pytest backend/tests/test_access_policy.py backend/tests/test_indicadores_metadatos.py backend/tests/test_indicadores_canonicos_polis.py -q -rs` | exit 0; **127 passed, 4 skipped**; resumen pytest: 43,03 s | **CONFIRMADA**, con las mismas cuatro omisiones y sin acreditar persistencia omitida. |
| V5 | Componentes de `bun run check`: `bun run ui:check`; `bun run typecheck --incremental false`; `bun run lint` | tres exit 0; UI sin infracciones, TypeScript y ESLint sin errores | **CONFIRMADA mediante ejecución equivalente de sus tres componentes**. No se ejecutó literalmente el agregado: `tsconfig.json` habilita incremental y su `tsc --noEmit` puede escribir `.tsbuildinfo`, incompatible con solo lectura. Se desactivó exclusivamente esa escritura. |
| V6 | `curl -sS --max-time 20 -o /tmp/polis_297_catalogo_vivo.json -w 'HTTP_VIVO=%{http_code}\n' http://127.0.0.1:8000/api/v1/indicadores/catalogo` | **200**, total 24, mismo SHA del CSV, todos `no_publicable` | **REFUTADA como descripción del estado actual** la respuesta 404/no desplegado. El 404 histórico a la hora de 296 no puede refutarse con esta consulta posterior. |
| V7 | `grep -n '/indicadores' src/shared/layout/footer.tsx` | exit 0; línea 65, `href="/indicadores"` | **REFUTADA como estado actual** la ausencia de enlace. La corrección 298 sí lo incorporó. |

### 2.1 Resultados adicionales

| Comando / comprobación | Resultado |
| --- | --- |
| `bun test ./src/features/indicadores` | **18 pass, 0 fail**, 93 aserciones, dos archivos. Son nueve pruebas de cliente y nueve de vista. |
| `backend/.venv/bin/ruff check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py` | **exit 1**, un **I001** en `backend/app/modules/indicadores/router.py:1`. |
| `backend/.venv/bin/ruff format --check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py` | exit 0; siete archivos ya formateados. |
| Chromium 153.0.8010.12 + componente real + QueryClient real + API simulada con las 24 filas reales | 24 filas; detalle abre; Tier C deja dos filas sin enlace; COM deja dos filas; B presenta vacío; búsqueda emite 0 peticiones durante tecleo y 1 después del debounce. |
| axe-core sobre el detalle abierto, sin desactivar reglas | **`definition-list`: serious, 2 nodos; `dlitem`: serious, 16 nodos**. 39 reglas pasan; `th-has-data-cells` queda incompleta. |
| Simulación temporal de HTTP 503 | Error visible tras reintentos; 0 regiones `alert`, 0 regiones `status`; subsiste una etiqueta «Consultando catálogo…». |
| Tres candidatos negativos del validador, exclusivamente en `/tmp` | Los tres devuelven `VALIDACION_OK`; detalle en H297-07. |

Las omisiones pytest fueron: una prueba de roles contra PostgreSQL (`test_access_policy.py:180`) y tres pruebas de metadatos (`:21`, `:85`, `:111`). Configurar una base para ejecutarlas activaría preparación/migración y escrituras, lo que no corresponde a esta QA de solo lectura.

El laboratorio Chromium usa el código real de la vista y el hook, empaquetado con Bun en `/tmp`, sin arrancar Next ni leer una release. Su servidor temporal responde únicamente con una copia de las filas reales, filtradas, o con el 503 controlado. **No incluye el CSS de producción**: acredita interacción y defectos semánticos, no contraste, ancho de 320 px, temas o hidratación de Next en producción. Los primeros intentos requirieron corregir resolución de dependencias del guion temporal; no se atribuyen esos fallos al producto. La corrida válida es la del intervalo 08:09:35–08:09:44.

## 3. Afirmaciones de 296, §1: contraste completo del corte original

| # | Afirmación | Dictamen de QA al corte actual | Evidencia / precisión |
| --- | --- | --- | --- |
| 1 | 24 indicadores, 22 A y 2 C | **CONFIRMADA** | CSV, validador y GET coinciden. |
| 2 | 20 campos obligatorios, ninguno vacío | **CONFIRMADA** estructuralmente | La presencia de un texto no acredita su exactitud; H297-01/02. |
| 3 | Todos `no_publicable` | **CONFIRMADA** | 24/24 en archivo, TestClient y GET vivo. |
| 4 | No se calculan/divulgan valores de indicadores en este catálogo | **CONFIRMADA** | No hay columna de valor ni cálculo en lector/router. Años, códigos y constantes de unidad no son mediciones. |
| 5 | SHA del catálogo `65dfaa44…10b1` | **CONFIRMADA** | V2 y V3/V6. |
| 6 | GET 200 en proceso y filtros; vivo 404 | **CONFIRMADA** en proceso; **REFUTADA** la parte viva como estado actual | V3/V6. No se acredita retrospectivamente la respuesta histórica. |
| 7 | Los 22 A tienen respaldo real | **CONFIRMADA** como presencia fuente/indicador | 22 referencias existentes y 13 celdas originales cotejadas; no equivale a validar todos sus universos/denominadores. |
| 8 | URLs HTTPS de dominios oficiales | **CONFIRMADA** para las 22 filas A actuales | Las otras dos son `NO_VERIFICADO`. No se probó disponibilidad de todas las URLs ni licencia. |
| 9 | `bun run check` pasa | **CONFIRMADA** con la salvedad V5 | Los tres componentes pasan sin escritura incremental. |
| 10 | 127 pruebas backend y 4 omisiones | **CONFIRMADA** | V4; no cubre funcionalmente el CSV nuevo ni su semántica. |
| 11 | Topbar enlaza `/indicadores` | **CONFIRMADA** | `src/app/_components/topbar.tsx:101`. |
| 12 | Sidebar incluye Catálogo de indicadores | **CONFIRMADA** | `sidebar-institucional.tsx:270` y navegación de `:272`. |
| 13 | El footer no enlaza al catálogo | **REFUTADA** como estado actual | V7. La atribución de una afirmación falsa al informe 295 tampoco se localiza: ese informe no menciona el footer. Sí era una exigencia del encargo 296. |
| 14 | La metodología prometida no es visible | **REFUTADA** como estado actual | El detalle de 298 muestra los 15 campos. Su contenido y semántica siguen con hallazgos. |
| 15 | La ausencia de regresiones de accesibilidad no estaba demostrada | **CONFIRMADA** la cautela de 296; **REFUTADA** la garantía posterior de cierre en 298 | H297-05: errores HTML reproducidos y dos reglas axe con impacto serious. No se determina aquí si ya existían antes de 298. |

## 4. Estado de hallazgos y observaciones anteriores al corte original

| ID de 296 | Estado actual / clasificación | Cotejo |
| --- | --- | --- |
| B-1 | **REFUTADO como bloqueo vigente** | El usuario decidió «Datos»; topbar, sidebar, layout `/geovisor` y vista de plataforma ya lo dicen. No se editaron. |
| B-2 | **REFUTADA** la ausencia absoluta; **NO CONCLUYENTE** el cierre de cobertura | Hay 18 pruebas, pero las de vista usan `renderToString` y un hook simulado: no accionan filtros, temporizador, expansión ni teclado. La interacción se probó en este laboratorio temporal, no queda como regresión automatizada en el repo. |
| B-3 | **REFUTADA** la ausencia de metodología visible | Detalle funcional. No se aprueba su exactitud ni accesibilidad sin corregir H297-01/02/05. |
| B-4 | **REFUTADA** la ausencia de enlace | Footer actual correcto. La supuesta frase en 295 no aparece en su literal. |
| N-1 | **REFUTADA** la restricción `max-w-7xl` | Hay `container-fluid w-full`. El ancho efectivo con CSS y móvil es **NO CONCLUYENTE**. |
| N-2 | **REFUTADAS** las erratas visibles enumeradas | Etiquetas y `aria-label` revisados con tildes; no equivale a revisión lingüística de todo el banco. |
| N-3 | **REFUTADA** la falta de leyenda | A/B/C se explican; B vacío es un resultado soportado. |
| N-4 | **REFUTADA** la etiqueta SALUD incorrecta | Ahora «Alimentaria y sanitaria» y las siete etiquetas canónicas están presentes. |
| N-5 | **CONFIRMADA**, pendiente | Validador `:137` admite `http://`; las filas actuales A sí usan HTTPS. |
| N-6 | **REFUTADO** el href sin guarda en la vista actual | Los tres enlaces de fuente pasan por `esUrlHttpsSegura`; `javascript:`, `http:` y `NO_VERIFICADO` no producen enlace. No es validación de pertenencia a un dominio oficial. |
| N-7 | **REFUTADA** la ausencia de debounce | Efecto a 300 ms y corrida de tecleo: 0 peticiones durante, 1 después. |
| N-8 | **CONFIRMADA**, pendiente | Lectura por petición; faltantes/corrupción pueden producir 500. No se midió una necesidad de caché; no se declara por eso un fallo de capacidad. |
| N-9 | **REFUTADO** el literal 24 fijo | Usa `data.total`, que es el número filtrado; no un total global independiente. |
| M-1 | **CONFIRMADA** | Alias de valores ya publicados, no fórmulas propias reproducibles; licencias A siguen `publica_pendiente_verificacion`. No hay certificación final. |
| M-2 | **CONFIRMADA** la falta de correspondencia editorial | Faltan Policía homicidios/VIF, percepción ECSC e IRCA en el catálogo. El PDF sí incluye sus conceptos. La causa de la diferencia TerriData 35,5 frente a 35,4 calculado es **NO CONCLUYENTE**: no se reconstruyó el numerador/denominador original de TerriData; no debe atribuirse solo al denominador. |
| M-3 | **CONFIRMADA** la contradicción documental | 295 dice que no hubo conexión a producción, pero incluye el SELECT con `Settings().database_url`; `00_linea_base.md` identifica expresamente `bd_csh`. No se repitió esa conexión aquí. |
| M-4 | **NO CONCLUYENTE** como atribución de falta de autorización | 295 limita WP0/WP2; el encargo 296 posterior enumera expresamente backend/página/menú para auditar. Falta el historial de autorización de implementación para decidir a quién atribuir una desviación. No se deduce solo del diff. |

La autorización de commit/despliegue y el orden histórico de publicación descritos en 296, §6, son **NO CONCLUYENTES** en esta QA: no se inspeccionaron releases ni servicios. El GET vivo 200 sí confirma disponibilidad actual del backend. No se ratifica la identificación histórica `r2` ni se revalida la auditoría de producción como tal.

## 5. WP0: banco, versiones y cobertura

| Objeto leído | Resultado independiente |
| --- | --- |
| SQLite `fuentes` | 28 |
| SQLite `observaciones` | 1.489 |
| SHA SQLite | `e0c8ba376e45dd08a64034560b8c19a6d3e2ffe99fabaf950395c5ef0f87074d`, coincide al cierre |
| JSONL 7D | 11 archivos: 9 × 2.340 y 2 × 2.396 = 25.852 líneas entre versiones |
| Corte `27957ea00972aefce1a850c4de998a698b311c9a5e3ec21240418d9b74c8d90b.jsonl` | 2.340 filas, 43 claves de fuente, 522 filas sin dimensión |
| CSV de cobertura | 43 filas; para las 28 claves SQLite coinciden conteo y SHA declarado con `fuentes` |
| Conteo operativo 2.505 de `bd_csh` | **NO CONCLUYENTE en esta ejecución**: documentado en 295/línea base, no consultado de nuevo |
| Ausencia de modificación histórica del banco por el implementador 295 | **NO CONCLUYENTE** a partir de `git status`: un banco no rastreado no permite probar su integridad histórica así. Se verificó el SHA actual de SQLite y los originales usados. |

Estas capas no se suman entre sí. Los SHA de `fuentes` pueden corresponder a una extracción lógica serializada; los SHA de originales XLSX/ZIP son distintos y se verifican separadamente a continuación. No se presenta esa diferencia esperable como corrupción.

## 6. Respaldo de los 22 Tier A y cotejo directo de 13 indicadores

Todos los pares `fuente.indicador` de los Tier A tienen filas reales. El conteo siguiente es **antes de aplicar subtipos**; no autoriza sumar esas filas ni atribuir a un indicador todos los registros de su fuente.

| Código | Fuente.indicador | Filas referenciadas |
| --- | --- | ---: |
| PERS_001 | `dnp_terridata_13001.homicidio_intencional_tasa` | 14 |
| PERS_002 | `medicina_homicidios.casos_registrados` | 10 |
| PERS_003 | `policia_lesiones.casos_registrados` | 93 |
| PERS_004 | `medicina_examenes_sexuales.casos_registrados` | 10 |
| PERS_005 | `dane_ecsc_2024.victimizacion_algun_delito` | 1 |
| COM_001 | `dnp_terridata_13001.violencia_intrafamiliar_tasa` | 14 |
| COM_002 | `medicina_violencia_intrafamiliar.casos_registrados` | 30 |
| ECON_001 | `dane_pobreza_monetaria.incidencia_pobreza_monetaria` | 3 |
| ECON_002 | `dane_geih_cartagena.tasa_desocupacion` | 15 |
| ECON_003 | `dane_geih_informalidad_cartagena.proporcion_informalidad` | 6 |
| ECON_004 | `dane_nbi_cnpv2018.nbi_personas_nbi` | 3 |
| AMB_001 | `ideam_calidad_aire.concentracion_media_estacion` | 156 |
| AMB_002 | `dnp_terridata_13001.area_deforestada` | 7 |
| AMB_003 | `dnp_terridata_13001.eventos_inundacion` | 5 |
| SALUD_001 | `medicina_suicidios.casos_registrados` | 10 |
| SALUD_002 | `dnp_terridata_13001.incidencia_dengue` | 6 |
| SALUD_003 | `dnp_terridata_13001.mortalidad_desnutricion_menores_5` | 13 |
| SALUD_004 | `dane_sae_fies_pobreza_cartagena.inseguridad_alimentaria_moderada_grave_sae` | 2 |
| POL_001 | `procuraduria_pqrsdf_cartagena.pqrsdf_radicadas` | 5 |
| POL_002 | `dane_ecsc_2024.victimas_que_denunciaron` | 1 |
| SAT_001 | `unidad_victimas_irv_cartagena.indice_riesgo_victimizacion` | 13 |
| SAT_002 | `dnp_terridata_13001.victimas_desplazamiento_ubicadas` | 8 |

### 6.1 Muestra primaria, superior al mínimo de seis

Se comprobaron código/indicador/año, valor extraído, celda del original, SHA del archivo y valor de SQLite. **13 de 13 coinciden**. La muestra cubre las siete dimensiones. Las diferencias metodológicas se informan aparte y no se confunden con errores de transcripción.

| Código | Año | Valor verificado | Original / hoja / celda | SQLite rowid | SHA de original |
| --- | ---: | ---: | --- | ---: | --- |
| SALUD_003 | 2024 | 3.79 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H4639` | 20070 | S1 |
| SALUD_002 | 2024 | 713.24 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H4776` | 20042 | S1 |
| PERS_001 | 2025 | 35.5 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H4984` | 20036 | S1 |
| COM_001 | 2025 | 310.1 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H5138` | 20092 | S1 |
| AMB_002 | 2018 | 0.0 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H7291` | 20017 | S1 |
| AMB_003 | 2017 | 1.0 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H7323` | 20018 | S1 |
| SAT_002 | 2024 | 347.0 | `TerriData13001.xlsx.zip!TerriData13001.xlsx` · Hoja01 · `H12486` | 20077 | S1 |
| ECON_002 | 2025 | 14.135793536030631 | `anex-GEIH-ago2026.xlsx` · Total 23 ciudades A.M. Trim · `HS245` | 20001 | S2 |
| ECON_003 | 2025 | 50.203112 | `anex-GEIHEISS-jun-ago2026.xlsx` · Prop informalidad · `BG27` | 20009 | S3 |
| ECON_004 | 2018 | 12.489537193298375 | `dane_nbi_cnpv2018.xlsx` · Municipios · `E160` | 19891 | S4 |
| PERS_005 | 2023 | 9.527 | `dane_ecsc_2024.xlsx` · Cuadro 5 · `C20` | 19884 | S5 |
| POL_002 | 2023 | 25.397 | `dane_ecsc_2024.xlsx` · Cuadro 7 · `C20` | 19885 | S5 |
| SALUD_004 | 2024 | 28.09648969275252 (E151 × 100) | `dane_sae_fies_pobreza_2022_2024.xlsx` · FIES 2024 · `E151` | 20665 | S6 |

**SHA-256 completos de los originales:**

- **S1** `TerriData13001.xlsx.zip!TerriData13001.xlsx`: `f89e2b5110347f1d7b59d0debe067ba915efcc5e373322169c5f675af10d50a6`.
- **S2** `anex-GEIH-ago2026.xlsx`: `ade9b213c799e967c121091438a53617f3a3ab8d85d311f5cada08e2461473d9`.
- **S3** `anex-GEIHEISS-jun-ago2026.xlsx`: `3da594e046a2c67deeeaaaed1bd0d0f81f243ea48429be6481ca426044d28ffc`.
- **S4** `dane_nbi_cnpv2018.xlsx`: `d850d740873a5c652dcb9487fd583b3d3497b03b1b17feb7561711cd162aed13`.
- **S5** `dane_ecsc_2024.xlsx`: `9bed1cd4e9d9fb4ee9e770f977ffec1adee48dfea4bc3ab2d2f882d635fab06e`.
- **S6** `dane_sae_fies_pobreza_2022_2024.xlsx`: `f544cca76e34ac005a867ac5c0c1e7860401df1ca53c581d8d91228ae6f42010`.

- XLSX interior de S1: `0ec21a33ad929a56dd911b9d743bb86fce64e93ddcdb1e1ce22c9c7052c7c3ed`; el SHA S1 anterior corresponde al ZIP, no al XLSX interior.
- Para TerriData, los originales emplean coma decimal y punto de miles. Se leyó el literal de la columna H con esa gramática explícita, sin autoimputación.
- El cero de AMB_002 se encuentra realmente en H7291; no se creó para cubrir un faltante.
- En SALUD_004 la celda E151 contiene la proporción `0.2809648969275252`; el porcentaje del banco conserva la conversión explícita ×100. No es una cifra inventada.

## 7. Auditoría de cifras en los cuatro PDF

Se extrajeron los cuatro archivos existentes, sin ejecutar `scripts/generar_toolbox_completa_pdf.py`. Tienen **8, 10, 5 y 5 páginas** respectivamente para ABC, presentación, matriz y guía. La descripción del generador que anuncia nueve láminas para la presentación quedó desactualizada; no se usa como evidencia del número de páginas.

### 7.1 Pobreza monetaria: corrección confirmada también en la fuente remota

La [página oficial de pobreza monetaria del DANE](https://www.dane.gov.co/index.php/estadisticas-por-tema/pobreza-y-condiciones-de-vida/pobreza-monetaria), consultada durante esta QA, presenta **2025** como año vigente de la publicación, actualizada el 12 de junio de 2026. La [presentación primaria de resultados 2025](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf), página 33, muestra Cartagena **42,8 / 41,1 / 34,6** para 2023/2024/2025. El GET remoto devolvió 200, 2.666.054 bytes, SHA `3b7b3e56e91e3c48c6efaf2acaf3adf86e2e0553614a78c2524ca170a13dfab9`, idéntico al original del banco.

SQLite `dane_pobreza_monetaria.incidencia_pobreza_monetaria`, rowid **19881/19882/19883**, conserva esos tres valores. **34,6 % (2025)** aparece en la matriz, p. 3, y presentación, p. 4. Se confirma que es la cifra de la serie oficial reciente, sin etiquetarla como estimación SAE. No debe intercambiarse con el producto experimental SAE que casualmente redondea a 41,1 en 2024.

### 7.2 Trazabilidad de las cifras estadísticas publicadas

Se agrupan cifras repetidas; «M» indica matriz, «P» presentación y «A» ABC. Los porcentajes se contrastaron con el valor sin redondear, no buscando solamente coincidencias de texto.

| Cifra / afirmación | Ubicación principal | Respaldo y resultado |
| --- | --- | --- |
| Policía, homicidio intencional: 358 en 2025; 378 en 2024 | M2, P4 | SQLite rowid 19299/19297; subtipo exacto `HOMICIDIO INTENCIONAL O CON DOLO`; extracción `policia_homicidios.json`, SHA `384e52ec95c1b2cc54f32c8034128c51292dcc2a88008e06321994fc3dd3a944`. **CONFIRMADA**; no sumar feminicidios como subtipo adicional sin regla explícita. |
| Población 1.011.520 (2025), 1.010.408 (2024) usada en tasas | M2/P4; segundo denominador en comentario del generador | `dane_poblacion_municipal.poblacion_total`, rowid 19953/19950; base CNPV 2018 declarada. **CONFIRMADA en banco**. |
| Tasas Policía 35,4 y 37,4 por 100.000 | M2, A5, P3–5 | Recalculadas: `358/1011520*100000=35.3922809`; `378/1010408*100000=37.4106302`; redondeo correcto. Son derivadas propias, no el literal TerriData 35,5. |
| Medicina Legal: 411 homicidios en 2024; tasa derivada 40,7 | M2, P4 | rowid 19195; extracción SHA `970241a02fb29507374ee41b0ed7338e83160ed5afd100b5f54bda987c9f471b`; `411/1010408*100000=40.6766376`. **CONFIRMADA**, con universo distinto. |
| VIF policial 3.047 (2025), 3.412 (2024), tasa 301,2 | M2 | rowid 19427/19426; extracción SHA `277a5cf3e3f4a1d91786b4f1c9a9ba2e874682f22fe41ce512cba84506a37bd4`; tasa 301.2298323. **CONFIRMADA**; no es la serie médico legal COM_001. |
| Victimización 9,5 % (2023) | M2 | ECSC Cuadro 5/C20 = 9,527; rowid 19884, S5. **CONFIRMADA**, población 15+ de cabecera. |
| Percepción 37,7 % barrio / 75,1 % ciudad (2024) | M2, A5, P2/P6 | ECSC Cuadro 34/C20 = 37,675; Cuadro 32/C20 = 75,113; rowid 19890/19889, S5. **CONFIRMADA**; no son tasas de delitos. |
| Desocupación 14,1 % (oct–dic 2025), 14,4 % (jun–ago 2026) | M3, A5, P4/P5 | S2, HS245 = 14,1357935360 e IA245 = 14,4313495280; rowid 20001/20004. **CONFIRMADA**, cortes distintos, 2026 parcial. |
| Informalidad 50,2 % (oct–dic 2025), 45,7 % (2024) | M3, A5, P4/P5 | S3 y rowid 20009/20008 = 50,203112 / 45,7263714895. **CONFIRMADA**, pero no es el dato más reciente disponible: 2026 jun–ago = 47,4613754879; H297-04. |
| Pobreza 34,6 / 41,1 / 42,8 | M3, P4 | Véase §7.1. **CONFIRMADA**. |
| NBI 12,5 % total / 11,6 % cabecera / 20,6 % rural (2018) | M3, P4/P6 | S4, Municipios E160/L160/S160 = 12,4895371933 / 11,6031939953 / 20,6269144844. **CONFIRMADA**, universos censales separados. |
| Miseria 1,7 % cabecera / 4,1 % rural (2018) | P6 | S4, M160/T160 = 1,6720058802 / 4,1191644211. **CONFIRMADA**. |
| Inseguridad alimentaria 28,1 % en 2024; IC 23,4–32,8; 22,2 % en 2022 | M3, A5, P3–5 | S6, FIES 2024 E/G/H151 ×100 = 28,09648969 / 23,41791452 / 32,77506486; FIES 2022 E151 ×100 = 22,15496834. **CONFIRMADA**. Los intervalos no autorizan por sí solos una conclusión causal. |
| Dos fichas SAT, 001-17 y 002-20 | M4 | `sat_alertas_candidatas_cartagena.csv`: dos `ficha_validada`, fechas 27/12/2017 y 16/01/2020; otras ocho candidatas no se cuentan como fichas validadas. SHA CSV `4b4c7e7dafdbd5c6e3c01d68f47e0a027cb32f69b4502bc2a313ba53754b3351`. **CONFIRMADA** como catálogo documental parcial. |
| «Sin línea base en el banco»: dengue e IRCA | M4 | **REFUTADA**: seis filas de incidencia de dengue 2019–2024; 38 observaciones IRCA y desagregación total/urbano/rural en 2024. H297-03. |
| 3 localidades, 15 UCG, 205 barrios/corregimientos; 35 mesas | Portadas y guía; P4 destaca 205 | **NO CONCLUYENTE respecto al linaje exigido**: son literales editoriales sin referencia versionada a una delimitación/conteo o programación oficial dentro del banco examinado. Debe distinguirse delimitación administrativa, unidades analíticas y mesas propuestas/realizadas; H297-08. No se declaran falsos solo por falta de ese soporte. |

Las cifras jurídicas (número/año de normas), páginas, numeración de capítulos, horizonte propuesto 2026–2036 y tiempos sugeridos para un taller son identificadores o decisiones de diseño, no observaciones estadísticas. Se separaron para no atribuirles un origen estadístico inexistente. **No se hizo una auditoría jurídica** de sus afirmaciones. La guía no incorpora otra serie de indicadores numéricos independiente de las anteriores.

## 8. Hallazgos nuevos u omitidos por el cierre anterior

### H297-01 — ALTA: denominador y cobertura GEIH incorrectos en el contrato

**Objeto:** `catalogo.csv:11` (ECON_002) y `:12` (ECON_003).

ECON_002 declara como denominador «Población en edad de trabajar». En el original S2, hoja `Total 23 ciudades A.M. Trim`, **HS252/HS250 ×100 = 14,1357935360**, es decir desocupados/fuerza de trabajo. Usar **HS249** (PET) produce **9,1730393145 %**, otra medida. El valor copiado es correcto, su explicación es incorrecta.

Además, ambos indicadores se rotulan `municipal`, mientras el CSV de extracción y el propio PDF los documentan para **cabecera de Cartagena**. ECON_002 se llama oct–dic y fija `trimestre_movil_octubre_diciembre`, pero su referencia sin filtro contiene también **2026 jun–ago** (IA245). El riesgo no queda resuelto diciendo solamente que el año actual es parcial.

**Efecto:** la ficha visible induce a reconstruir otro indicador o a extender el universo territorial/temporal. **Cierre exigible:** fuerza de trabajo como denominador, ámbito real y regla explícita para separar ventanas/seleccionar oct–dic. Conservar los originales, no recalcular cifras para acomodarlas al texto.

### H297-02 — MEDIA: contrato insuficiente para resolver contaminante y población en riesgo

**Objeto:** `catalogo.csv:14` (AMB_001) y `:18` (SALUD_002).

AMB_001 promete PM2.5 con exposición de 24 h, pero referencia solamente `ideam_calidad_aire.concentracion_media_estacion`. Esa clave devuelve **156 filas**, con O3, CO, NO2, PM10, PM2.5 y otras variables/exposiciones; solo **17** corresponden a `PM2.5 | 24 h | estación ...`. El texto no define un selector reproducible de contaminante/exposición/estación. No hay hoy un cálculo erróneo ejecutado por el catálogo, porque no calcula valores; sí falta un contrato inequívoco para su consumo posterior.

SALUD_002 reduce la unidad a habitantes generales; el original H4776 y SQLite especifican **100.000 habitantes en riesgo**. El denominador de una incidencia no debe intercambiarse con la población municipal total.

**Cierre exigible:** documentar selectores y universos originales como datos verificables; comprobarlos en el validador, conservando estaciones y exposiciones separadas.

### H297-03 — ALTA: los PDF declaran inexistentes datos que ya están disponibles

**Objeto:** generador `:1685`/`:1689`, matriz p. 4; afecta la conclusión editorial sobre cobertura sanitaria/ambiental.

La matriz mantiene dengue e IRCA como B con «Sin línea base en el banco». Sin embargo:

- `dnp_terridata_13001.incidencia_dengue`: **6 filas**, 2019–2024; 2024 = **713,24**, rowid 20042, original S1/H4776. Ya es SALUD_002 Tier A en el catálogo.
- `ins_calidad_agua.irca`: **38 filas**; en 2024, total **2,8 %**, urbano **2,9 %**, rural **2,4 %**, rowid 19878/19879/19880. La extracción tiene SHA `f07d784dc0e8b71f2f2cce89f6d2cf789e10f962c84f70e8d77de6071b106c7a`.

**Efecto:** se presenta un vacío de información que no corresponde al banco; esto puede sesgar el diagnóstico y las prioridades de adquisición. **Cierre exigible:** conciliar el estado de disponibilidad por fuente/indicador/producto; distinguir disponibilidad, licencia, validación y certificación. Incorporar evidencia o explicar una exclusión metodológica concreta, no afirmar ausencia.

### H297-04 — MEDIA: fecha de corte editorial desigual en informalidad

**Objeto:** generador `:1006`, `:1112`, `:1658`; matriz p. 3, presentación p. 4/5, ABC p. 5.

Se repite 50,2 % (oct–dic 2025), aunque el banco ya contiene **47,4613754879 % en jun–ago 2026**, rowid 20010, S3/`Prop informalidad!BO27`. La matriz sí incorpora ese trimestre de 2026 para desocupación. El literal de 2025 no es falso; la selección resulta incompleta para un diagnóstico con corte a octubre de 2026.

**Cierre exigible:** mostrar ambos cortes con su ventana y salvedad, o justificar una política editorial uniforme de años cerrados. No sustituir series de ventanas diferentes como si fueran equivalentes.

### H297-05 — ALTA: semántica HTML y accesibilidad no permiten aprobar el detalle

**Objeto:** `indicadores-catalogo-view.tsx:188`, `:224`, `:253`, `:601`.

- En cada indicador se introduce un `<div class="contents">` dentro de `<tbody>` y los `<tr>` quedan dentro de ese div. Chromium observa **24 `tbody > div`**; React emite errores de anidamiento `div/tbody` y `tr/div`. `display: contents` no corrige la estructura HTML. React advierte riesgo de hidratación; esta QA no acredita un fallo de hidratación en Next vivo.
- El detalle añade agrupadores dobles dentro de `<dl>` y términos `<dt>/<dd>` en el bloque de gobernanza sin `<dl>`. axe reproduce `definition-list` (**2 nodos**) y `dlitem` (**16 nodos**), ambos **serious**, al abrir PERS_001.

**Efecto:** relaciones tabulares y término/descripción inválidas para lectores/asistencias y posibles diferencias de parseo. **Cierre exigible:** agrupación sin nodo DOM entre tbody y tr; listas de definición válidas; repetir axe y navegación con teclado sobre la vista real. La aprobación de pruebas de cadena de texto no cubre este defecto.

### H297-06 — MEDIA: error visible, pero estado de consulta y anuncios incompletos

**Objeto:** vista `:526`, `:561` y `:566`.

Con un 503 controlado se muestra el error, pero el contador permanece **«Consultando catálogo…»** porque no hay `data.total`. El mensaje de error, carga y resultados carece de regiones de estado/anuncio: laboratorio con **0 `alert` y 0 `status`**. No se expone al usuario un estado final coherente de la consulta.

También se ignoran los props entregados por `FormField` (`:453`, `:472`, `:491`): los tres children son `() =>`, sin conectar el id generado al control. Hay `aria-label` y por eso no se afirma que los controles carezcan de nombre accesible; sí queda sin asociación la etiqueta visible generada por el kit.

**Cierre exigible:** estados finales y anuncios adecuados, y propagar los ids/relaciones de FormField. Conservar filtros ante errores, como ya hace la vista.

### H297-07 — MEDIA: `VALIDACION_OK` admite contratos que no respaldan sus afirmaciones

**Objeto:** `scripts/validar_catalogo_indicadores.py:120`, `:147`, `:156`; esquemas `schemas.py:87`.

Se construyeron tres copias de prueba en `/tmp`, sin cambiar el catálogo real:

| Candidato negativo | Resultado |
| --- | --- |
| PERS_001 conserva el código pero cambia `dimension` a AMB | exit 0 / `VALIDACION_OK` |
| PERS_001 conserva fuente/URL reales pero sustituye fórmula, numerador y denominador por texto sin ninguna referencia `fuente.indicador` | exit 0 / `VALIDACION_OK` |
| URL de PERS_001 agrega `?edicion=inexistente` | exit 0 / `VALIDACION_OK`; `_urls_iguales` ignora query |

El segundo caso pasa porque el bucle de referencias puede ejecutar cero iteraciones. El tercer caso muestra que igualdad normalizada de URL no prueba identidad de edición; la gravedad depende de si los parámetros identifican el producto. No es evidencia de que el catálogo actual use una edición inventada.

**Cierre exigible:** exigir al menos una referencia real y coherente por Tier A, correspondencia prefijo/dimensión, selector/unidad/periodo compatibles y una regla explícita de identidad de producto. La validación HTTP(S) y el esquema de strings no reemplazan estas comprobaciones. Mantener `no_publicable` hasta cerrar las brechas de certificación ya reconocidas en M-1.

### H297-08 — MEDIA: cifras de organización territorial y mesas sin referencia de corte

**Objeto:** generador `:358`, `:656`, `:761`, `:834`, `:1056`, `:1938` y PDF relacionados.

Se afirman 3 localidades, 15 UCG, 205 barrios/corregimientos y 35 mesas, con expresiones como «catálogo oficial» o «se formula y ejecuta». No se aporta el identificador/SHA del catálogo territorial ni una programación/corte verificable de mesas que respalde esos conteos dentro del banco examinado.

**Cierre exigible:** adjuntar fuente de delimitación y fecha, separar UCG administrativas de unidades analíticas —incluido el universo de 17 polígonos elegido previamente por el usuario— y diferenciar mesas previstas, convocadas y realizadas. **No se afirma que 15 ni los otros conteos sean falsos**: falta una cadena de evidencia para decidir qué universo describen.

### H297-09 — MEDIA: el gate Ruff del backend falla en el código entregado

**Objeto:** `backend/app/modules/indicadores/router.py:1`.

Un **I001**, orden de imports (`catalogo_polis`/`repository` y esquemas). `ruff format --check` pasa, pero `ruff check` devuelve **1**. No se ejecutó `--fix`.

**Efecto:** el gate backend se detendría en Ruff antes de pytest. La ausencia de fallos en TypeScript/ESLint no acredita limpieza de Python. **Cierre exigible:** ordenar imports y repetir el check por quien tiene autorización de edición.

### Observaciones de calidad y evidencia

- **O297-01, baja:** `indicadores-catalogo-view.test.tsx:133` usa `as unknown as UseQueryResult<...>`, una doble conversión expresamente desaconsejada por `docs/kit-ui-rules.md`. Conviene construir fixtures coherentes con la unión tipada de estados.
- **O297-02, media:** el informe 298 acredita cobertura de filtros/debounce/inspección por las 18 pruebas. Las nueve de vista son renderizados de texto con hook simulado y render del detalle por separado; no ejecutan esas interacciones ni efectos. La corrida temporal de esta QA confirma parte de la funcionalidad actual, pero no crea esa cobertura permanente. Agregar pruebas de usuario y axe sería un encargo de corrección, no se hizo aquí.
- **O297-03, documental:** la presentación tiene 10 páginas aunque la cabecera del generador anuncia 9. La atribución al informe 295 de una promesa sobre footer no está en su texto. Corregir la evidencia evita confundir una exigencia del encargo con una afirmación del implementador.

## 9. Condiciones concretas de cierre

1. Rectificar denominador y cobertura GEIH; fijar los selectores/ventanas y conservar la unidad de habitantes en riesgo de dengue.
2. Conciliar catálogo/banco/PDF para dengue, agua, Policía y percepción ECSC. Definir y aplicar una fecha de corte editorial explícita; documentar la selección de informalidad.
3. Corregir tabla y listas de definición; repetir la interacción y axe. Verificar después móvil/temas/hidratación en un entorno autorizado, sin darlo por demostrado por este laboratorio.
4. Corregir el I001 y añadir regresiones para validaciones negativas, interacción y estados finales/accesibles.
5. Vincular los conteos territoriales y de mesas a sus catálogos/programaciones y cortes. Mantener separadas disponibilidad de dato, licencia y certificación.
6. Someter la corrección a nueva QA sobre hashes fijados. La aprobación referencial de filas no debe reutilizarse como aprobación global de publicación.

**Relación con agy:** coincido con los conteos, SHA, funcionamiento básico, incertidumbre de licencias/certificación y necesidad de conciliar fuentes que señaló 296. Las correcciones de navegación/visibilidad de 298 se constatan. **No ratifico** la aprobación del catálogo/backend «sin bloqueantes» ni el cierre integral de la página: H297-01, H297-03, H297-05 y el gate fallido impiden ese cierre. El estado final es **RECHAZA**, con respaldo parcial confirmado y correcciones delimitadas.

## Anexo A. Huellas de los archivos revisados

Primera captura: **07:52:30 UTC**. Última captura de estos archivos: **08:15:16 UTC**. En los archivos sin cambio se muestra una sola huella. El footer se verificó por lectura de contenido y se fijó su SHA en el cierre. La columna de PDF/generador contiene dos versiones por la modificación concurrente documentada. Este anexo conserva el corte de 08:15:16; los SHA posteriores están en el Anexo D.

| Archivo | SHA-256 al cierre | ¿Cambió desde la captura inicial? |
| --- | --- | --- |
| `backend/app/modules/indicadores/catalogo_polis.py` | `1764ed53e91e4cdc672c2096c03a85f843375d07692a1b752f037ce4f0b938c7` | Sin cambio |
| `backend/app/modules/indicadores/models.py` | `7f0ac26364c636110a3e98453f0c971058106adc2656e58183df380e37bdba94` | Sin cambio |
| `backend/app/modules/indicadores/repository.py` | `426c8c626053375e4dbf190e21850b8177c33fae2681b38862246212f9be3676` | Sin cambio |
| `backend/app/modules/indicadores/router.py` | `afdc3c4e5711d8389638da0fad698d744617e8fa03f49201d4b19dea4f75d9e3` | Sin cambio |
| `backend/app/modules/indicadores/schemas.py` | `b34014b78bb97eca022c54f8b74d2287d465c209290e3ce932b1314075daf211` | Sin cambio |
| `backend/app/modules/indicadores/service.py` | `4040cb748e0d34feb502042d0cc533fdb20b0cd7c15333a960da95d57d6f9b91` | Sin cambio |
| `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` | `54ac265a8e9467ae8b1c2a040a0826ec994c523a1e92a6585e8c7fe529a79f44` | Sin cambio |
| `bridge/296_entrega_agy_auditoria_catalogo_indicadores.md` | `2a97b29fcebd6b2d3a2bfdb509ff32702c141b5ae02343a4a1e1d3ff0233183e` | Sin cambio |
| `bridge/298_entrega_agy2_correccion_pagina_indicadores.md` | `bb3b807f1176ad079b14ac5b4a3743e4c63db3276ba1f43f9fa910211a9017b3` | Sin cambio |
| `data/capas_analiticas/catalogo_indicadores/00_cobertura_fuentes.csv` | `70ea44310d465ed4a1046f9b073dcc564f4577ade8f780ea55ff611adad50000` | Sin cambio |
| `data/capas_analiticas/catalogo_indicadores/00_linea_base.md` | `6bebdd3060dd63b690bf58130700a29ca40b00ab897334cacf3477fb5e05e66e` | Sin cambio |
| `data/capas_analiticas/catalogo_indicadores/catalogo.csv` | `65dfaa44e12e3557db934543b28eab331396aac1049bdf319471fcb88d4f10b1` | Sin cambio |
| `public/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf` | `3a357a317c4787bbca777d591d40c823b9579537822321511410e3fceaa26231` | Sí, edición concurrente |
| `public/docs/GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf` | `6aa9cce3859bac3ad1eb3c6573f298721d75a961e84774d753d8cc9f175fa45d` | Sí, edición concurrente |
| `public/docs/MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf` | `8a91cb0f9579bd147c58c500c5edbebf22bc417357f751682c61ddd688af793a` | Sí, edición concurrente |
| `public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` | `3dcdd14ec608d757c3000b2bd3eed874e166976de9171b17222be0fc4e7a36eb` | Sí, edición concurrente |
| `scripts/generar_toolbox_completa_pdf.py` | `c51d5ec28c2524f3114a3b6bc79fb0ea944071063a86d82e1bec18e1203f1124` | Sí, edición concurrente |
| `scripts/validar_catalogo_indicadores.py` | `94e584a9fd417a1289f4b19b174fe80e5ae1c8f0e58ab7f7487b817291e4636a` | Sin cambio |
| `src/app/_components/sidebar-institucional.tsx` | `5b3972e8148491478e4a0155d39994ddd804f395698d39549dc6563a9cec3c40` | Sin cambio |
| `src/app/_components/topbar.tsx` | `f98b94e4d6bb0c809b78a5589320e13d083420941eb9e630d90de867a95188cf` | Sin cambio |
| `src/app/geovisor/layout.tsx` | `fde4f61cba92637d4d1e52e4931e7e8599fee30eb285659085321824983746ad` | Sin cambio |
| `src/app/indicadores/page.tsx` | `b7723251d2e85a1e8214922cc0feba3965009f65d54e6408156102935ed89a68` | Sin cambio |
| `src/features/indicadores/services/indicadores-catalogo-api.test.ts` | `f39ac9311112bd154fcc0078a52a7d12ec13709e6882389b19ed5f0ede8c5474` | Sin cambio |
| `src/features/indicadores/services/indicadores-catalogo-api.ts` | `8e534ddd06692f8f3d5dd7f3ee4b9c785edaebfea58d840147c36d1b5b4d5069` | Sin cambio |
| `src/features/indicadores/services/use-indicadores-catalogo.ts` | `e47b6ffcb27cdd647117d6a9a96824997cc387319b18b9db2a9ec1cafbbc8fb6` | Sin cambio |
| `src/features/indicadores/views/indicadores-catalogo-view.test.tsx` | `5e30a8d519afed22191a678ed8db1344bd4a63e7aa14eadc800fe7b48201c653` | Sin cambio |
| `src/features/indicadores/views/indicadores-catalogo-view.tsx` | `5b0b79622e2c4caf2879b431a9e639a0d8f019faa291c6eb5642e9172ff9247d` | Sin cambio |
| `src/features/plataforma/views/geovisor-view.tsx` | `7dde71b93c01c7fbef5d314545436f43b2c5f92750550043bf9d86cbfd88c8ce` | Sin cambio |
| `src/shared/layout/footer.tsx` | `d5a935f673987e4830a5c9153c352f6ce06bfea7c72c62074650df8977e4be75` | Primera huella registrada al cierre |

**Versiones iniciales de PDF/generador, 07:52:30 UTC:**

- `public/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf`: `e15526813668af0bf14f7d49d420efab354f00a1f5610ddb864f9af0e12a8215`.
- `public/docs/GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf`: `958656b9b54afc430c984ef4b23f7ece612b6d2b95a002f17ec3af9b7f589731`.
- `public/docs/MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf`: `4c794863c5895f5c15f246f83523ba012921b05eb5210e12b35080d0edc59647`.
- `public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf`: `7212457fe150e68b1e0451853d5ecedf4a340c92e7052a05f57c799bb98fbb53`.
- `scripts/generar_toolbox_completa_pdf.py`: `0d1e520e389de9ba06bf2a7094f4caae6f7b074db3859273c8ff9dabb5b25212`.

## Anexo B. Reproducción mínima de los contrastes de datos

Desde `/root/polis`, con Python del backend y `PYTHONDONTWRITEBYTECODE=1`:

```python
import csv, hashlib, io, sqlite3, zipfile
from pathlib import Path
from openpyxl import load_workbook

b = Path("data/banco_fuentes_oficiales")
con = sqlite3.connect(
    f"file:{b}/cartagena_seguridad_humana.sqlite?mode=ro&immutable=1", uri=True
)
# Presencia de cada referencia A: exactamente la condición referencial observada.
for row in csv.DictReader(Path("data/capas_analiticas/catalogo_indicadores/catalogo.csv").open()):
    if row["tier"] != "A":
        continue
    import re
    src, indicator = re.search(r"([a-z0-9_]+)\.([a-z0-9_]+)", row["numerador"]).groups()
    print(row["codigo"], con.execute(
        "SELECT COUNT(*) FROM observaciones WHERE fuente_clave=? AND indicador=?",
        (src, indicator),
    ).fetchone()[0])
# Ejemplo primario 1: TerriData, original de homicidio 2025.
raw = (b / "documentos_oficiales/TerriData13001.xlsx.zip").read_bytes()
print(hashlib.sha256(raw).hexdigest())
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    wb = load_workbook(io.BytesIO(archive.read("TerriData13001.xlsx")), read_only=True, data_only=True)
    print(wb["Hoja01"]["H4984"].value)  # literal 35,5
    wb.close()
# Ejemplo primario 2: denominadores GEIH y ventanas separadas.
wb = load_workbook(b / "documentos_oficiales/anex-GEIH-ago2026.xlsx", read_only=True, data_only=True)
sheet = wb["Total 23 ciudades A.M. Trim"]
print(sheet["HS245"].value, sheet["IA245"].value)
print(sheet["HS252"].value / sheet["HS250"].value * 100)
print(sheet["HS252"].value / sheet["HS249"].value * 100)
wb.close()
# Contraste de los falsos vacíos editoriales.
for src, indicator in [("dnp_terridata_13001", "incidencia_dengue"), ("ins_calidad_agua", "irca")]:
    print(src, con.execute(
        "SELECT rowid, anio, subtipo, valor, unidad FROM observaciones "
        "WHERE fuente_clave=? AND indicador=? ORDER BY anio, subtipo", (src, indicator)
    ).fetchall())
con.close()
```

Los otros once cotejos primarios se reproducen abriendo con `read_only=True, data_only=True` los archivos/hojas/celdas de §6.1, calculando su SHA y comparando el `rowid` indicado. Para FIES la unidad original es proporción y se multiplica por 100. Esta transformación se declara explícitamente.

Las tres negativas de H297-07 se reprodujeron importando el validador con `importlib.util`, creando copias CSV en `tempfile.TemporaryDirectory`, sustituyendo exclusivamente su global `CATALOGO` en memoria y ejecutando `main()`. La global `DB` conservó el SQLite de solo lectura; el archivo real nunca se abrió en escritura.

## Anexo C. Reproducción del laboratorio de interacción y axe

Para evitar modificar el repo o arrancar Next, la entrada temporal usa los módulos instalados y la vista real. Se empaquetó en `/tmp`:

```bash
bun build /tmp/polis_297_browser/entry.tsx --target browser \
  --outdir /tmp/polis_297_browser/dist \
  --define 'process.env.NODE_ENV="development"'
node /tmp/polis_297_browser/run.cjs
```

Entrada utilizada:

```tsx
import React from "/root/polis/node_modules/react";
import { createRoot } from "/root/polis/node_modules/react-dom/client";
import { QueryClient, QueryClientProvider } from "/root/polis/node_modules/@tanstack/react-query/build/modern/index.js";
import { IndicadoresCatalogoView } from "/root/polis/src/features/indicadores/views/indicadores-catalogo-view";
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById("root")!).render(React.createElement(QueryClientProvider,{client},React.createElement("main",null,React.createElement(IndicadoresCatalogoView))));
```

Guion utilizado (solo servidor temporal, sin endpoints de escritura):

```javascript
const fs = require('fs');
const http = require('http');
const { createRequire } = require('module');
const req = createRequire('/root/polis/package.json');
const { chromium } = req('playwright');
const catalog = JSON.parse(fs.readFileSync('/tmp/polis_297_catalogo_vivo.json','utf8'));
let modo='ok';
const requests=[];
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1');
 if(url.pathname==='/api/v1/indicadores/catalogo'){
  requests.push({utc:new Date().toISOString(),url:url.pathname+url.search,modo});
  response.setHeader('Content-Type','application/json');
  if(modo==='error'){response.statusCode=503;response.end(JSON.stringify({detail:'fallo simulado QA297'}));return;}
  const d=url.searchParams.get('dimension'),t=url.searchParams.get('tier'),b=(url.searchParams.get('busqueda')||'').toLowerCase();
  const indicadores=catalog.indicadores.filter(x=>(!d||x.dimension===d)&&(!t||x.tier===t)&&(!b||Object.values(x).join(' ').toLowerCase().includes(b)));
  response.end(JSON.stringify({...catalog,total:indicadores.length,indicadores}));return;
 }
 if(url.pathname==='/entry.js'){response.setHeader('Content-Type','application/javascript');response.end(fs.readFileSync('/tmp/polis_297_browser/dist/entry.js'));return;}
 if(url.pathname==='/favicon.ico'){response.statusCode=204;response.end();return;}
 response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Laboratorio temporal QA297</title></head><body><div id="root"></div><script>globalThis.process={env:{NODE_ENV:"development"}};</script><script src="/entry.js"></script></body></html>');
});
(async()=>{
 const begin=new Date().toISOString();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const consola=[],errores=[];
 page.on('console',m=>{if(['error','warning'].includes(m.type()))consola.push({tipo:m.type(),texto:m.text()});});
 page.on('pageerror',e=>errores.push(e.message));
 const results={begin,contexto:'React desarrollo, componente real, datos reales copiados del GET; API simulada exclusivamente en servidor temporal; sin CSS de producción ni Next real.'};
 try{
 await page.goto(address);
 await page.getByRole('button',{name:/^(Ver|Ocultar) metodología del indicador PERS_001$/}).waitFor();
 results.inicial={filas:await page.locator('tbody > div').count(),tbody_div:await page.locator('tbody > div').count(),h1:await page.locator('h1').textContent()};
 await page.getByRole('button',{name:'Ver metodología del indicador PERS_001',exact:true}).click();
 results.expandir={detalle_visible:await page.locator('#metodologia-fila-PERS_001').isVisible(),aria_expanded:await page.getByRole('button',{name:'Ocultar metodología del indicador PERS_001',exact:true}).getAttribute('aria-expanded'),formula_visible:await page.getByText('Valor original publicado: dnp_terridata_13001.homicidio_intencional_tasa; no se recalcula.',{exact:true}).isVisible()};
 await page.addScriptTag({path:req.resolve('axe-core/axe.min.js')});
 results.axe=await page.evaluate(async()=>{const a=await axe.run(document);return {violations:a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({html:n.html,failureSummary:n.failureSummary}))})),passes:a.passes.length,incomplete:a.incomplete.map(v=>v.id)};});
 await page.getByRole('combobox',{name:'Filtrar por nivel Tier'}).click();
 await page.getByRole('option',{name:'Tier C — Sin fuente',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('tbody')?.innerText.includes('POL_003')&&!document.querySelector('tbody')?.innerText.includes('PERS_001'));
 results.tierC={filas:await page.locator('tbody > div').count(),enlaces_fuente:await page.locator('tbody a').count(),codigos:await page.locator('tbody').innerText()};
 await page.getByRole('combobox',{name:'Filtrar por nivel Tier'}).click();await page.getByRole('option',{name:'Tier B — Pública',exact:true}).click();
 await page.getByText('Sin resultados en el catálogo para los filtros seleccionados',{exact:true}).waitFor();results.vacio=true;
 await page.getByRole('button',{name:'Restablecer filtros',exact:true}).click();await page.getByRole('button',{name:/^(Ver|Ocultar) metodología del indicador PERS_001$/}).waitFor();
 await page.getByRole('combobox',{name:'Filtrar por dimensión'}).click();await page.getByRole('option',{name:'COM — Convivencia y comunitaria',exact:true}).click();await page.waitForFunction(()=>document.querySelector('tbody')?.innerText.includes('COM_002')&&!document.querySelector('tbody')?.innerText.includes('PERS_001'));results.dimensionCOM={filas:await page.locator('tbody > div').count()};await page.getByRole('button',{name:'Restablecer filtros',exact:true}).click();await page.getByRole('button',{name:/^(Ver|Ocultar) metodología del indicador PERS_001$/}).waitFor();
 const start=requests.length;await page.getByRole('textbox').pressSequentially('homicidio',{delay:20});const inmediata=requests.length-start;
 await page.waitForFunction(()=>document.querySelector('tbody')?.innerText.includes('PERS_002')&&!document.querySelector('tbody')?.innerText.includes('SALUD_001'));
 results.debounce={peticiones_durante_tecleo:inmediata,peticiones_despues:requests.length-start,filas:await page.locator('tbody > div').count()};
 modo='error';await page.getByRole('textbox').fill('error-297');await page.getByText('No fue posible consultar el catálogo de indicadores. Intente de nuevo más tarde.',{exact:true}).waitFor({timeout:20000});
 results.error={visible:true,alertas:await page.getByRole('alert').count(),regiones_status:await page.getByRole('status').count(),texto_consultando:await page.getByText('Consultando catálogo…',{exact:true}).count()};
 results.consola=consola;results.errores=errores;results.requests=requests;results.end=new Date().toISOString();
 fs.writeFileSync('/tmp/polis_297_browser/resultados.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }catch(e){results.fallo=String(e);results.consola=consola;results.errores=errores;results.requests=requests;fs.writeFileSync("/tmp/polis_297_browser/resultados.json",JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
```

**Resumen de salida de la corrida válida:**

```json
{
  "inicio_utc": "2026-11-05T08:09:35.396Z",
  "fin_utc": "2026-11-05T08:09:44.162Z",
  "inicial": {
    "filas": 24,
    "tbody_div": 24,
    "h1": "Catálogo municipal de indicadores de seguridad humana"
  },
  "expandir": {
    "detalle_visible": true,
    "aria_expanded": "true",
    "formula_visible": true
  },
  "tierC": {
    "filas": 2,
    "enlaces_fuente": 0
  },
  "vacio": true,
  "dimensionCOM": {
    "filas": 2
  },
  "debounce": {
    "peticiones_durante_tecleo": 0,
    "peticiones_despues": 1,
    "filas": 2
  },
  "error": {
    "visible": true,
    "alertas": 0,
    "regiones_status": 0,
    "texto_consultando": 1
  },
  "axe_violations": [
    {
      "id": "definition-list",
      "impact": "serious",
      "nodos": 2
    },
    {
      "id": "dlitem",
      "impact": "serious",
      "nodos": 16
    }
  ],
  "errores_js": [],
  "advertencias_html": 4
}
```

Los HTTP 503 del log son inyectados por el laboratorio para probar el error; no se atribuyen al backend real. No se desactivó ninguna regla axe. Las huellas siguientes identifican auxiliares temporales; el único entregable persistente solicitado es este informe.

- `/tmp/polis_297_browser/entry.tsx`: `b45082b43f977aee86070233a3496ab0df9c3792651d362809af0d3ca2787e7f`.
- `/tmp/polis_297_browser/run.cjs`: `83d0cbee29d0d183bdfd8489dc4d3f24cced5bc32b53a26ba369f2acd8044787`.
- `/tmp/polis_297_browser/resultados.json`: `58d00c7da40ed45182eae021963cc66e0f7a40416b4f78ed33e80dffb8d41d1c`.
- `/tmp/polis_297_celdas.json`: `d1f14e18482c68aa9ac3edee4f4d9be8457a5ba85131f2eef984e2d8010b4d0d`.
- `/tmp/polis_297_negativas_validador.json`: `bb5176b1ce0e85233329c1f4e8e9a883d0dea563156b954b26fcedfb51c2c7aa`.
- `/tmp/polis_297_pytest.json`: `bed0a95ecf779db7ffbe1c68641994744e5444c974a75141996052f7255d3632`.

**Cierre:** QA entregada; correcciones no ejecutadas por restricción de solo lectura. La decisión de aceptación queda pendiente de remediación y nueva verificación.


## Anexo D. Revalidación concurrente del Encargo 299 — ESTADO QUE PREVALECE AL CIERRE

Al verificar la entrega antes de sellarla se detectaron cambios posteriores a las 08:15:16 UTC. Se leyó el diff y se repitieron comprobaciones dirigidas sin editar aplicación ni datos. La ampliación conservó las 24 filas previas y añadió cinco; los hallazgos de contenido de esas 24 filas no se corrigieron en esta ampliación.

### D.1 Resultado final y qué afirmaciones se sustituyen

| Elemento | Resultado final independiente | Efecto sobre el cuerpo histórico del informe |
| --- | --- | --- |
| CSV y validador, 08:25:31 UTC | **29 filas, 27 A y 2 C**, todas `no_publicable`; `VALIDACION_OK` | Los conteos 24/22 de V1 y §3.1 se confirman para el corte original, pero quedan **REFUTADOS como conteo actual**. |
| SHA actual del CSV | `1b2c78db4faeec72d4d79d66c088febd52cb851a5e5fa5015e0e374215595633` | El SHA `65dfaa44…` identifica únicamente el archivo original. |
| TestClient, 08:27:18 UTC | GET 200/29; PERS 9; COM 3; A 27; C 2; búsqueda Homicidio 3; POST 405 | V3 sigue funcional con el nuevo catálogo. |
| GET vivo, 08:25 UTC | 29 y mismo SHA `1b2c78db…`; todos `no_publicable` | El backend lee el archivo ampliado; se confirma correspondencia actual. |
| Ruff check y format dirigidos | Ambos **exit 0**; siete archivos formateados | **H297-09 subsanado** por edición concurrente del orden de imports. Ya no es bloqueante vigente. No hubo corrección por Codex. |
| Pruebas frontend repetidas, 08:27 UTC | **18 pass, 0 fail**, 93 aserciones | Se mantienen. Los archivos UI y sus hashes no cambiaron. |
| N-5 | **Subsanado:** el validador ahora admite solo el prefijo `https://` | La observación antigua de aceptación de HTTP deja de ser vigente. |
| N-8 | **Parcialmente atendido:** caché de parseo por SHA y verificación de columnas | Sigue ejecutando `read_bytes()` y calculando SHA en cada GET. Faltantes/archivo corrupto lanzan excepción; el router no la convierte en un estado de indisponibilidad específico. No se hizo un ensayo de capacidad. |
| M-2 | Se agregaron Policía homicidios, VIF, ambas percepciones ECSC e IRCA | Se atiende la ausencia de sus fichas en el catálogo. **No** se corrigen las falsas ausencias en PDF (H297-03), ni se prueba por qué TerriData difiere de la tasa derivada. |
| M-3 | 295 añade un párrafo «Corrección M-3 (Encargo 299)» identificando `bd_csh` y solo lectura | Se considera **aclarado mediante fe de erratas**. El literal anterior «sin conexión a producción» permanece; debe leerse junto a esta corrección, no aisladamente. |
| H297-01/02/03/04/05/06/08 | Los textos/metadatos y el frontend que los motivan siguen iguales | **Vigentes.** La revisión de los cinco nuevos registros detecta además D.2. |
| H297-07 | `VALIDACION_OK` sobre el catálogo ampliado aún admite inconsistencias | La brecha de validación ya tiene un caso concreto en el archivo vigente: `PERS_008` con `dimension=COM`. |

Para reproducir la verificación vigente se usan los mismos comandos V1, V2, V3, V6 y Ruff de §2; cambiará el resultado a 29/27 y SHA `1b2c78db…`. Las 127 pruebas backend/4 skips corresponden a la corrida previa; no se presenta esa ejecución como una nueva suite sobre el lector modificado. Tampoco se repitió todo `bun run check`: los archivos frontend no cambiaron y sí se repitieron sus 18 pruebas dirigidas.

### D.2 H297-10 — MEDIA: metadatos nuevos con año base y universo de tasa sin cerrar

Las cinco fichas nuevas tienen respaldo real en SQLite y conservan `no_publicable`; no se detectó invención de valores. Quedan estos errores verificables:

- **PERS_008** declara `dimension=COM` con código de prefijo PERS, sin regla documentada que permita esa diferencia. Es el caso real de la negativa de H297-07; el validador lo aprueba.
- **PERS_009 y PERS_010** fijan `anio_base=2023`, pero las dos series de percepción ECSC referenciadas tienen **una única observación de 2024**. El rango 2023–2024 de la fuente completa no convierte a 2023 en año base de cada indicador. El validador verifica el rango de la fuente, no la cobertura del indicador.
- **PERS_007/PERS_008** arrancan en 2010 y proponen tasas con `dane_poblacion_municipal.poblacion_total` del mismo año; ese denominador está en el banco solo para **2012–2027**. Hay conteos en 2010/2011, pero no denominadores en esa referencia para calcular sus tasas. Debe acotarse la cobertura de tasas o aportar denominadores válidos, sin imputarlos.
- La unidad «casos o casos por 100000 habitantes» reúne conteo y tasa en la misma ficha, y el texto «dividir entre población» no explicita el factor 100.000. Es preciso separar el producto o fijar la operación y escala. No se afirma que el GET esté calculando una tasa equivocada: continúa devolviendo solo metadatos.

Respaldo medido de las cinco fichas añadidas, antes de filtros de subtipo:

| Código | Referencias reales | Año base declarado / filas de ese indicador en ese año |
| --- | --- | --- |
| PERS_007 | Policía homicidios: 26 filas; población total: 16 | 2010: conteo presente, denominador ausente |
| PERS_008 | VIF Policía: 17 filas; población total: 16 | 2010: conteo presente, denominador ausente |
| PERS_009 | Percepción barrio ECSC: 1 fila | 2023: 0; la fila real es de 2024 |
| PERS_010 | Percepción ciudad ECSC: 1 fila | 2023: 0; la fila real es de 2024 |
| AMB_004 | IRCA: 38 filas con total/urbano/rural separados | 2010: 3 filas; requiere seleccionar el subtipo al consumir |

**Cierre exigible:** año base por indicador, correspondencia código/dimensión y cobertura temporal compartida entre numerador y denominador. La existencia de una clave de fuente no basta para aprobar la ficha metodológica.

### D.3 Huellas y decisión final

Las siguientes huellas corresponden a la captura posterior a la revalidación dirigida. Son la versión evaluada en este anexo, sin incorporar por presunción ediciones posteriores:

| Archivo | SHA-256 | mtime UTC |
| --- | --- | --- |
| `backend/app/modules/indicadores/catalogo_polis.py` | `d4dea1f97b6f7b409637b9ef22e2f3467d42803c44d92c730c11070ae33a6499` | 2026-11-05T08:24:48.906912+00:00 |
| `backend/app/modules/indicadores/router.py` | `c7fef0a30dc420d808a04d6e54ca3501ebd1774189d4981e0a3a64077d168003` | 2026-11-05T08:24:48.892912+00:00 |
| `scripts/validar_catalogo_indicadores.py` | `0d784dd54bee1fdc768e4b5ef4d5de56d4f58a9785a525a9f586503e23232949` | 2026-11-05T08:23:10.876127+00:00 |
| `data/capas_analiticas/catalogo_indicadores/catalogo.csv` | `1b2c78db4faeec72d4d79d66c088febd52cb851a5e5fa5015e0e374215595633` | 2026-11-05T08:16:17.588116+00:00 |
| `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` | `eee05a89de9bc01f2f88893fb46f2239e6590643beae74cb4649bca543b39023` | 2026-11-05T08:24:13.900218+00:00 |

**Captura de este anexo:** 2026-11-05T08:29:36.308373+00:00 UTC; Colombia: 2026-11-05 03:29:36 (UTC−5).

**Dictamen final: RECHAZA el cierre integral.** Se retira el bloqueo Ruff y se reconocen HTTPS, las fichas añadidas y la aclaración de base. Siguen pendientes denominador/cobertura GEIH, selectores/unidades, conciliación de PDF, semántica/accesibilidad, estados de consulta, linaje de conteos territoriales y validación de los metadatos añadidos. Para los 27 A se confirmó presencia de referencias; el cotejo primario de celdas sigue siendo de 13 indicadores, con fuentes de las nuevas fichas contrastadas también en §7.

La auditoría sigue siendo de solo lectura. Los cambios de aplicación descritos en este anexo son concurrentes; **Codex solo escribió `bridge/297_entrega_codex_qa_independiente_indicadores.md` en el repositorio**. No hay commit, push, despliegue ni reinicio realizados por esta QA.
