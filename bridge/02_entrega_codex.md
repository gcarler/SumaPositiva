# Entrega EDD — `[ARCH-CONSOLIDACION-01]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main`
- **Base de la asignación:** `0ed3e66f2a67fdd9aac25d86b4f0b3f1265492ed`
- **Commit de implementación:** `6b956ab67808cf2b051fe3133755ad29252fab61` (`refactor(architecture): consolidate POLIS scaffold`)
- **Dictamen EAF de esta entrega:** pendiente; este informe es evidencia EDD, no certificación independiente.

## Resultado

Se actualizaron las cinco correcciones obligatorias y se ejecutaron las fases estructurales/documentales del plan. La arquitectura de paneles quedó desacoplada, se retiró el scaffold Prisma —incluido el uso que seguía oculto en `.zscripts`—, se habilitó el lint de Noticias/Testimonios, se añadió `bun test` a CI y se incorporó la matriz real de módulos.

La ruta de cierre no se declara completa: `ruff check` reporta 840 hallazgos y `ruff format --check` detecta 110 archivos backend por formatear. El código backend de esos hallazgos no se cambió en esta tarea. Los recorridos de módulos sin pruebas end-to-end identificadas se clasifican como parciales o pendientes en la matriz.

## Cambios por ajuste EAF

1. **Lint frontend:** se retiraron las exclusiones globales de `noticias` y `testimonios`; se eliminaron imports sin uso. ESLint global y `bun run check` pasan.
2. **Retiro Prisma:** se eliminaron `prisma/schema.prisma`, `src/core/database/legacy-prisma.ts`, paquetes y comandos `db:*` del manifiesto. También se retiró el generador SQLite de `.zscripts/dev.sh`, `.zscripts/build.sh`, `.zscripts/start.sh`, `.zscripts/database-runtime-build.sh` y su prueba obsoleta, que habían quedado fuera del censo EAF inicial.
3. **Store de paneles:** `src/core/panels/panel-store.ts` conserva infraestructura genérica y una interfaz abierta. Los contratos viven en `src/app/_composition/panel-contracts.d.ts`. `PANEL_REGISTRY` usa un tipo mapeado exhaustivo con `satisfies`; el único cast dinámico se encapsula en `resolvePanelComponent`, después de comprobar la tabla completa. Se añadió [ADR 0001](../docs/adr/0001-desacople-panel-store.md), se ajustaron contratos discrepantes —incluido `vistaInicial`— y se añadieron pruebas de pila.
4. **CI y EDD:** `.github/workflows/check.yml` ejecuta `bun test`; `docs/plan-consolidacion-arquitectura.md` lo incluye en sus validaciones.
5. **Inventario y persistencia:** arquitectura y plan de trabajo reflejan Alembic `0062_motor_plan_accion_dnp`, los routers actuales y el modo CSP de código (`Report-Only` por defecto, enforcement configurable). La matriz distingue censo estructural de persistencia verificada y define reglas diferentes para fallos de lecturas y mutaciones.

## Censo verificado

- `src/features/`: **21** directorios directos, frente a los 23 esperados por la asignación.
- `backend/app/api/router.py`: **22** llamadas `include_router`.
- `backend/app/modules/`: **25** módulos con `router.py`; `actores`, `alternativas` y `fuentes` no están montados por el router raíz.
- Alembic devuelve una cabeza: **`0062_motor_plan_accion_dnp`**.
- La matriz [docs/matriz-trazabilidad-modulos.md](../docs/matriz-trazabilidad-modulos.md) registra las entradas y la discrepancia 23/23 sin inventar módulos. La presencia de UI, router o migración no se toma como prueba de preparación productiva.

## Validaciones ejecutadas

| Comando/validación | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` | Aprobado; 1037 instalaciones comprobadas, sin cambios de lockfile. |
| `bun run check` | Aprobado: UI policy, TypeScript y ESLint global. |
| `bun run ui:policy:test` | Aprobado: 10 pruebas. |
| `bun test` | Aprobado: 607 pruebas en 71 archivos, 0 fallos. |
| `bun run build` | Aprobado; Next.js prerenderizó 192 rutas. Reportó una advertencia CSS de un selector Tailwind con `stroke='#fff'`. |
| `bun run storybook:build` | Aprobado; 4756 módulos transformados. Storybook/Vite emitieron advertencias de CSS y directivas `use client`, sin impedir la compilación. |
| `bun run ui:test` | Aprobado en la corrida final: 213 pruebas en 17 archivos, 0 fallos. La corrida inicial ocurrió junto a otro Chromium de agy2 y fue inestable; la historia de paneles que falló entonces pasó aislada y toda la suite pasó al repetirla sin runners concurrentes. |
| `uv run --project backend alembic -c backend/alembic.ini heads` | Aprobado: una cabeza, `0062_motor_plan_accion_dnp`. |
| `alembic check` con `POLIS_DATABASE_URL` en `polis_test` | Aprobado: `No new upgrade operations detected.` |
| `pytest backend/tests` con `POLIS_TEST_DATABASE_URL` en `polis_test` | Aprobado: 538 pruebas, 0 fallos, una advertencia deprecada de Starlette. La base tenía PostGIS y pgRouting. |
| `uv run --project backend ruff check backend` | **Falló:** 840 hallazgos. Por esto `bun run backend:check` se detiene en Ruff antes de ejecutar sus siguientes pasos. |
| `uv run --project backend ruff format --check backend` | **Falló:** 110 archivos requerirían formato. No se aplicó una reformateada masiva ajena al alcance. |
| `bash -n .zscripts/dev.sh .zscripts/build.sh .zscripts/start.sh` | Aprobado. `rg` confirmó que esos scripts, manifiesto, CI, `scripts/` y `tests/` ya no contienen comandos de sincronización SQLite/Prisma. |
| `git diff --cached --check` | Aprobado para el commit de implementación. |

### Nota sobre la base de pruebas

Una primera base aislada (`polis_test_reparacion_tres_fallos_20261004b`) no tenía la extensión pgRouting y produjo seis fallos geoespaciales. Se verificaron los siete casos geoespaciales en `polis_test` con pgRouting (7/7) y luego se ejecutó allí la suite completa (538/538). Ambas son bases `polis_test*`; `bd_csh` no se usó ni modificó.

## Coexistencia y límites

- Se preservaron los archivos asignados a agy2. Los cambios de geovisor y los documentos `bridge/01_tarea_activa.md`, `bridge/02_resultado_agy2.md` y `bridge/03_dictamen_revision.md` no se incluyeron en el commit de Codex. El commit concurrente de geovisor quedó como ancestro independiente.
- No se hizo `push`, reset ni checkout.
- No se validaron infraestructura productiva, datos de servicios externos ni enforcement real de CSP en proxy/navegador. La matriz no declara 100% de módulos listos para producción.
- El gate Ruff continúa pendiente; por tanto, el plan queda abierto hasta resolverlo y recibir dictamen EAF independiente.

## Referencias

- [Plan ejecutado](../docs/plan-consolidacion-arquitectura.md)
- [Matriz de trazabilidad](../docs/matriz-trazabilidad-modulos.md)
- [ADR del store](../docs/adr/0001-desacople-panel-store.md)
- [Arquitectura](../docs/arquitectura.md)

---

# Entrega EDD — `[TRIADA-BACKEND-01]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main` (commit local; sin push)
- **Alcance:** archivos del módulo `backend/app/modules/compromisos/`, pruebas y este informe.

## Resultado

Se añadieron los contratos, detector polimórfico, tres motores de cálculo, cruce
tripartito y tres rutas bajo `/api/v1/compromisos/triada/*`. El detector normaliza
filas a un esquema común y clasifica libros monohoja 2016–2019, híbridos
2020–2023, multihoja 2024–2026 y la plantilla dual DNP/POLIS. Los datos de muestra
se identifican como sintéticos.

El motor operativo lee las actividades ya persistidas en
`seguimiento.actividades_plan_accion`. No hay almacenamiento estructurado
conectado para las metas del Plan de Desarrollo ni para la cascada CDP/RP/
obligaciones/pagos. El resumen declara esos orígenes como no cargados y no inventa
avances distritales; `cruzar-lecturas` evalúa los tres conjuntos que recibe en la
petición.

El catálogo lista las 23 denominaciones de archivo provistas en la asignación,
los formatos estimados por extensión, las cuatro categorías y los cortes de marzo
y junio de 2026. La [página oficial de Planes de Acción 2026](https://www.cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-institucionales-2026)
publica los adjuntos, pero el entorno no tiene instalada la dependencia Playwright.
El conector devuelve la estrategia documentada para resolver el challenge y
descubrir adjuntos; esta entrega no ejecuta una descarga ni persiste esos libros.

## Validaciones

| Validación | Resultado |
| --- | --- |
| Ruff `check` sobre los seis archivos asignados | Aprobado, 0 errores. |
| Ruff `format --check` sobre los seis archivos asignados | Aprobado, 0 archivos pendientes. |
| `pytest backend/tests/test_triada_motores.py backend/tests/test_compromisos_pas.py` | Aprobado: 21 pruebas. |
| `pytest backend/tests/test_triada_motores.py backend/tests/test_compromisos_api.py` | No ejecutable: `backend/tests/test_compromisos_api.py` no existe en este checkout. La regresión PAS existente pasó. |
| Guarda `test_matriz_cubre_todas_las_rutas_y_sus_controles` | Falla porque `docs/permisos-api.md` no contiene filas para las tres rutas nuevas. Esa documentación no está dentro de los archivos autorizados por esta asignación. |
| Reinicio de `polis-backend.service` y consulta de `/api/v1/compromisos/triada/resumen` | Servicio activo; `curl` obtuvo HTTP 200. |

## Pendientes de integración

- Registrar las tres rutas públicas y su motivo de acceso en `docs/permisos-api.md`,
  y volver a ejecutar la guarda de autorización antes de integrar esta entrega.
- Instalar y fijar Playwright en el entorno backend para activar el descubrimiento
  y descarga de adjuntos desde la página protegida por Cloudflare.
- Incorporar fuentes persistentes verificables para los indicadores PDD y la
  cascada presupuestal; hasta entonces el cruce en vivo usa datos suministrados en
  la petición y el resumen marca esas fuentes como ausentes.

La implementación está en backend, pero estos pendientes impiden declarar
completada la conexión de las tres fuentes o la preparación integral para
producción. No se modificaron archivos de `src/` ni los documentos de trabajo de
agy2.

---

# Entrega — `[TRIADA-BACKEND-INGESTA-MASIVA-03]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main` (commit local; sin push)
- **Alcance:** ingesta binaria masiva, normalización tripartita, persistencia PostgreSQL, corpus fuente, endpoints y controles de acceso.

## Resultado

Se incorporó lectura binaria real de `.xlsx` con `openpyxl`, BIFF8 `.xls` con `xlrd`, `.csv` con autodetección de codificación/delimitador y `.zip` con límites de miembros, tamaño expandido, hojas y filas. El escáner elige la fila de encabezado más semántica entre las primeras 25 filas no vacías; descarta subtotales/pies, infiere vigencia/corte, entidad y enruta los datos a Plan de Desarrollo, Plan de Acción y Ejecución Presupuestal. Los formatos 2016–2019, 2020–2023, 2024–2026, la matriz PDD y los consolidados trimestrales reciben perfiles detectados.

La persistencia transaccional usa las tablas `seguimiento.lotes_ingesta_planes`, `seguimiento.archivos_plan_ingeridos` y `seguimiento.registros_triada_normalizados`, creadas por Alembic `0063_motor_ingesta_masiva_triada`. La deduplicación de reenvíos se basa en SHA-256. El cruce ocurre antes de confirmar la transacción y exige entidad, línea estratégica y BPIM completos, para no emitir coincidencias sobre llaves vacías.

Se añadieron estos endpoints bajo `/api/v1/compromisos/triada/`:

- `POST ingerir-archivos`: multipart para libros sueltos o ZIP, con permiso `seguimiento:gestionar`, fase de escritura 3, límites de carga y persistencia opcional.
- `POST ingerir-directorio`: procesamiento de archivos en `data/planes_accion`, limitado a esa raíz y con defensa contra traversal y symlinks externos.
- `GET lotes` y `GET comparativa-interanual`: consulta pública de lotes, cobertura, filas y cruces persistidos.
- `GET resumen`: incorpora los registros persistidos y los perfiles detectados al resumen de los motores.

Las dos escrituras y las consultas públicas están documentadas en `docs/permisos-api.md` y en la guarda de acceso.

## Corpus y persistencia en `bd_csh`

El generador reproducible es [generar_muestras_triada.py](../backend/scripts/generar_muestras_triada.py). Deja el corpus y los hashes en [muestras_reales_cartagena](../data/planes_accion/muestras_reales_cartagena/MANIFIESTO.md): 10 libros binarios descargados del portal oficial para 2018, 2019, 2020, 2024 y cortes de junio de 2026 de DADIS, Hacienda, Infraestructura, Planeación y Distriseguridad, además de la matriz PDD 2024–2027. Incluye un CSV derivado de una hoja pública y un ZIP determinístico con los libros. El fixture BIFF8 desplazado de 2016 está separado en pruebas; no se presenta como fuente histórica oficial.

`bd_csh` quedó en `0063_motor_ingesta_masiva_triada` con un lote `SEMILLA_TRANSPARENCIA` de 10 libros y 6.830 registros normalizados: 3.587 estratégicos, 2.052 operativos y 1.191 presupuestales. El cruce arrojó 1 coincidencia que cumple la llave completa; las demás filas carecen de una combinación común suficiente y quedan sin emparejar. La consulta HTTP de `/resumen` devolvió 200 y reflejó los 10 archivos persistidos.

Conteos canónicos antes y después de la migración y la semilla:

| Tabla/dato | Antes | Después |
| --- | ---: | ---: |
| Mesas | 33 | 33 |
| Agendas | 36 | 36 |
| Fichas de indicadores | 11 | 11 |
| Actores | 17 | 17 |
| Compromisos PAS | 10 | 10 |
| Actividades PA | 12 | 12 |
| Filas de hurtos | 12.280 | 12.280 |

La muestra descargada cubre años representativos, no todos los adjuntos publicados entre 2016 y 2026. El catálogo incorpora el inventario de Transparencia de 2018–2026; la extensión a libros adicionales usa la misma ruta de ingesta.

## Validaciones

| Validación | Resultado |
| --- | --- |
| Binarios `.xlsx`, `.xls`, CSV y ZIP; encabezados desplazados; deduplicación, persistencia, HTTP multipart para `.xlsx` y `.zip`, directorio restringido | Aprobado: 133 pruebas focales, 0 fallos. |
| Suite completa `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests` | Aprobada: 569 pruebas, 0 fallos y 2 advertencias. Una advierte que openpyxl no conserva extensiones de validación de un archivo fuente; la otra es un status HTTP deprecado en un endpoint previo. |
| `bun test` | Aprobado: 628 pruebas, 0 fallos y 3.443 aserciones. |
| Ruff `check` y `format --check` en los 11 archivos de esta entrega | Aprobados; 0 errores y 0 archivos por formatear. |
| `/root/polis/venv/bin/ruff check backend` | 726 hallazgos en el backend completo; los archivos modificados para esta entrega pasan el chequeo enfocado. |
| Alembic en `polis_test` y `bd_csh` | Migración 0063 aplicada; `alembic check`: `No new upgrade operations detected.` |
| Consulta HTTP real de `/api/v1/compromisos/triada/resumen` contra `bd_csh` | HTTP 200; refleja 10 archivos y 6.830 registros. |
| Integridad de datos canónicos en `bd_csh` | 7/7 conteos preservados exactamente. |

## Commit

- **Commit:** registrado localmente en `main`; el SHA se informa en la respuesta de entrega.
- **Push:** no realizado, conforme a Zero-Push.
- Se excluyó `bridge/01_tarea_codex.md`, que tiene cambios concurrentes de AGY.

---

# Entrega — `[TRIADA-BACKEND-DRIVE-8DIM-04]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main` (commit local; sin push)
- **Orden:** sincronización del catálogo de Google Drive, clasificación por las 8 dimensiones y 3 periodos, ingesta en `bd_csh` y filtros de la Triada.

## Implementación y corpus

Se incorporó el sincronizador reproducible [sincronizar_drive_planes_accion.py](../backend/scripts/sincronizar_drive_planes_accion.py), con ocho descargas concurrentes, reintentos, caché local excluida de Git, hashes SHA-256, deduplicación por contenido y reconocimiento de `.xls`/`.xlsx` por bytes y estructura OOXML, incluso sin extensión en el nombre. Se versiona el catálogo enriquecido [catalogo_drive_1383.json](../data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json), con los 1.383 IDs, rutas, hashes, estados y etiquetas de clasificación.

La clasificación por dimensión exige coincidencia con las carpetas canónicas para evitar inferencias desde nombres de archivo o carpetas de trimestre. Los archivos repetidos combinan sus IDs, rutas y dimensiones; las etiquetas se persisten en `ArchivoPlanIngerido` y en cada `RegistroTriadaNormalizado`. La migración `0064_drive_seguridad_humana` añade columnas e índices para dimensión y periodo. Los filtros `dimension` y `periodo` están disponibles en `lotes`, `comparativa-interanual` y `resumen`; el resumen agrega archivos, filas, motores, entidades y vigencias por dimensión y periodo.

La descarga registró **1.305 libros Excel** y **78 elementos no Excel**. Los 1.305 Excel corresponden a **621 hashes binarios únicos**; los duplicados conservan todas sus rutas e IDs. Trece libros Excel sin extensión se identificaron por sus bytes. En `bd_csh` quedaron **607 hashes de archivo asociados al origen Drive y 216.168 registros normalizados**: 98.003 de Plan de Desarrollo, 63.031 de Plan de Acción y 55.134 de Ejecución Presupuestal.

| Periodo | Archivos únicos | Registros normalizados |
| --- | ---: | ---: |
| Antes de 2020 | 43 | 6.441 |
| 2020–2023 | 257 | 71.898 |
| 2024–2027 | 307 | 137.829 |

La asociación final entre cada fila y las etiquetas de su archivo quedó sin discrepancias. Hay **18 libros únicos ubicados en carpetas de periodo sin carpeta de dimensión**; se etiquetaron con periodo y se dejaron sin dimensión en vez de inventar una clasificación. Permanecen **14 hashes Excel no ingeridos** por 7 archivos con hojas de estilo ilegibles, 4 que exceden el límite de expansión de seguridad y 3 con partes OOXML inválidas; el catálogo registra el estado y el motivo.

## API, integridad y validación

Después del reinicio de `polis-backend.service`, `/api/v1/health/ready`, `/triada/lotes` y `/triada/comparativa-interanual` respondieron HTTP 200. La comparativa filtrada por `1. Seguridad Personal` y `2024_2027` contó **13.130 registros** y comunicó que entrega una muestra de 5.000, con truncamiento explícito.

Los siete conteos canónicos de `bd_csh` permanecen intactos: mesas 33, agendas 36, fichas 11, actores 17, compromisos PAS 10, actividades PA 12 y hurtos 12.280. La migración aplicada es `0064_drive_seguridad_humana`; `alembic check` no detecta operaciones pendientes.

| Validación | Resultado |
| --- | --- |
| Pruebas focales `test_ingesta_masiva_triada.py` | 16 aprobadas; una advertencia de OpenPyXL sobre extensiones de validación del libro fuente. |
| Suite backend completa | 573 aprobadas, 0 fallos y 2 advertencias. |
| `bun test` | 628 aprobadas, 0 fallos y 3.443 expectativas. |
| Ruff sobre archivos modificados | Aprobado, sin errores. El chequeo global del backend reporta 723 hallazgos fuera de este cambio. |
| Integridad del parche (`git diff --check`) | Aprobada. |

El directorio de binarios descargados y el resumen operativo quedan ignorados por Git. El commit local incluirá únicamente el catálogo, su `.gitignore`, los módulos backend, la migración, las pruebas y este reporte; no se ejecutará `git push`.

---

# Entrega — `[TRIADA-BACKEND-QA-FORENSE-05]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main` (commit local; sin push)
- **Orden:** normalización cerrada de entidades oficiales; huella tabular para clones binarios; saneamiento de `bd_csh`; alerta y exclusión de cortes clonados; validación de claves de cruce.

## Cambios realizados

1. **Catálogo institucional cerrado.** `normalizar_entidad` solo devuelve una de las 30 entidades oficiales del catálogo de Cartagena o `None`. Alias y siglas se buscan con límites de palabra y se selecciona la coincidencia institucional más larga; por ejemplo, `VALORIZACION` se normaliza a Valorización y no se confunde con EPA. Los nombres libres de funcionarios, números y marcadores como `----` nunca se promueven a entidad. Al ingerir libros, se detecta la entidad desde el nombre del archivo y las primeras diez filas; una fila solo reemplaza esa clasificación si contiene otra entidad oficial, conservando el texto no reconocido como `_responsable_celda`.
2. **Huella tabular independiente del binario.** Cada libro lleva `huella_tabular_sha256`, calculada sobre hojas y campos normalizados. Los libros con idéntica entidad, vigencia, corte y contenido se fusionan aunque difiera su SHA-256 binario; sus hashes, rutas e IDs de origen se conservan en metadatos y no se duplican filas. Si el contenido coincide entre cortes distintos, el archivo más reciente queda marcado con `CONTENIDO_IDENTICO_OTRO_CORTE`. Las series por defecto excluyen esas copias y `corte` permite consultar expresamente una de ellas.
3. **Cruces limpios.** `_clave` maneja valores no textuales; `_clave_valida` descarta valores vacíos, guiones, números, `n/a`, `na`, `nd`, `ninguno`, `0` y `sin codigo`, además de entidades numéricas. Los cruces tripartitos no asocian registros por claves basura.
4. **Saneamiento transaccional de `bd_csh`.** El script [sanear_calidad_triada.py](../backend/scripts/sanear_calidad_triada.py) solo permite como destino la base `bd_csh`; resolvió entidades de archivo y filas desde el catálogo, el nombre y los libros fuente, recalculó huellas y fusionó clones en una transacción. Se corrigieron 220 entidades de archivo y 88.995 entidades de fila; se fusionó el par binariamente distinto de DADIS 2021, retirando 477 filas repetidas. No se cambiaron las siete tablas canónicas de negocio.
5. **Indicadores en API.** `/api/v1/compromisos/triada/resumen` incluye `ingesta_masiva.calidad_datos` con hashes binarios únicos, copias binarias, clones tabulares fusionados, alertas de corte, entidades oficiales reconocidas y porcentaje de registros con entidad canónica.

## Resultado del saneamiento

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Archivos archivados | 617 | 616 |
| Hashes binarios distintos en archivos activos | 609 | 608 |
| Registros normalizados | 218.217 | 217.740 |
| Filas con entidad nula / numérica / marcador | 4.516 / 57 / 555 | 62 / 0 / 0 |
| Entidades oficiales reconocidas | 22 | 30 |
| Registros con entidad canónica | 65,92% | 99,97% |
| Clones tabulares de mismo corte fusionados | — | 1 |
| Archivos señalados por corte idéntico | — | 5 |

Los cinco archivos alertados cubren cuatro grupos de contenido idéntico: LHCN (T1 frente a junio), Industrial de la Bahía (2025 anual y marzo de 2026 frente al anual 2026), IDER (T3 frente al anual) y Transcaribe (junio frente a marzo). Se dejaron sin entidad los 62 registros cuyo origen no permite atribuirlos de forma segura. Los indicadores HTTP reportan 609 hashes únicos contando el hash fuente preservado en el manifiesto del clon fusionado, 8 copias binarias descartadas y 1 clon tabular fusionado.

Los siete conteos canónicos se conservaron: mesas 33, agendas 36, fichas 11, actores 17, compromisos PAS 10, actividades PA 12 y hurtos 12.280.

## Validaciones

| Validación | Resultado |
| --- | --- |
| `ruff format` y `ruff check` en los siete archivos de código/prueba de esta tarea | Aprobados; sin cambios de formato pendientes ni hallazgos. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_ingesta_masiva_triada.py` | 20 aprobadas; 1 advertencia de OpenPyXL sobre extensiones de validación del archivo de muestra. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests` | 579 aprobadas, 0 fallos, 2 advertencias, en 351,46 s. La segunda advertencia es el alias HTTP 422 deprecado en un endpoint existente. |
| `bun test` | 628 aprobadas, 0 fallos y 3.443 aserciones. |
| `polis-backend.service`, `/api/v1/health/ready` | Reinicio realizado; readiness HTTP 200 con base de datos, migraciones y extensiones en estado `ok`. |
| `/api/v1/compromisos/triada/resumen` | HTTP 200; contiene las seis métricas de `calidad_datos` (609 hashes únicos, 8 copias binarias, 1 clon fusionado, 5 archivos alertados, 30 entidades y 99,97%). |
| Comparativa Transcaribe 2026 | Sin filtro de corte: 240 filas; `corte=T2`: 114 filas. El corte clonado no infla la serie predeterminada y sigue consultable con el filtro explícito. La respuesta no tiene cruces para esa entidad; las pruebas unitarias comprueban el rechazo de claves inválidas. |
| `git diff --check` | Aprobado. |

Se excluye `bridge/01_tarea_codex.md` del commit porque contiene la asignación concurrente de AGY. El commit incluye únicamente archivos de backend de esta orden, sus pruebas y este reporte; no se ejecuta `git push`.

---

# Entrega — `[TRIADA-BACKEND-INTELIGENCIA-6M-06]`

- **Fecha:** 2026-10-15
- **Responsable:** Codex
- **Rama:** `main` (commit local; sin push)
- **Orden:** seis motores analíticos de solo lectura y siete endpoints sobre el corpus de la Triada.

## Implementación

Se añadió [inteligencia_triada_service.py](../backend/app/modules/compromisos/inteligencia_triada_service.py), con los motores de patologías DNP, continuidad entre gobiernos, radar de cortes y transparencia, alineación territorial, búsqueda/duplicidad institucional y simulación del cierre 2027. Las siete rutas están en [router.py](../backend/app/modules/compromisos/router.py); se añadió [test_inteligencia_triada.py](../backend/tests/test_inteligencia_triada.py) para los contratos y la validación de filtros.

Los motores leen los 217.740 registros y 616 archivos de `bd_csh`. Todos los análisis excluyen por defecto los cinco archivos con `CONTENIDO_IDENTICO_OTRO_CORTE`; el radar de transparencia los incluye como hallazgo. La consulta de búsqueda acepta texto, dimensión, periodo, vigencia y motor. Los identificadores BPIM vacíos o de relleno no se consideran proyectos continuos ni duplicidades. No se escribieron datos en las tablas canónicas.

Para mantener las respuestas predeterminadas por debajo de dos segundos, cada worker precalcula el resumen consolidado en el lifespan de producción y cachea las lecturas durante cinco minutos. El último arranque tardó aproximadamente un minuto hasta readiness; durante la precarga el servicio consume alrededor de 1,1 GiB. Con la caché caliente, las siete rutas respondieron HTTP 200 entre **0,002 y 0,192 s** en el corpus real. La prueba de rendimiento corresponde a los filtros predeterminados; filtros distintos se calculan bajo demanda.

## Hallazgos reales en `bd_csh`

| Motor | Resultado observado |
| --- | --- |
| M0 — Resumen ejecutivo | 217.740 registros; 616 archivos; 30 entidades canónicas; 99,97% de cobertura de entidad; 4.600 metas PDD y 1.501 códigos BPIM utilizables. El inventario contiene 1.516 valores BPIM distintos antes de excluir 15 claves de relleno. |
| M1 — Patologías DNP | 62.807 actividades evaluadas; 19.800 con verbo fuerte y 27.005 con verbo débil (42,30% de formulación fuerte entre las actividades clasificadas); 15 alertas de espejismo, 3.201 de sobreejecución financiera y 14.370 cuellos contractuales. |
| M2 — Continuidad | 1.501 códigos BPIM utilizables; 400 aparecen en más de un periodo (26,65%); 1.101 quedan en un solo periodo. Filas analíticas por periodo: 6.441 antes de 2020, 72.027 para 2020–2023 y 136.845 para 2024–2027. |
| M3 — Transparencia | Cinco archivos con corte clonado; 5.512 metas/actividades clasificadas como congeladas; ningún salto de diciembre de 50 puntos o más; matriz de completitud con 30 entidades y años 2016–2026. |
| M4 — Territorio | 21.018 registros territorializados; apropiación asociada de COP 2.863.914.405.257,46; 33 mesas. `estadisticas_hurtos` tiene 12.280 filas cuya suma de `cantidad` es 18.242 hurtos. |
| M5 — Buscador | La consulta destacada `seguridad` encontró 8.758 registros y 244 casos de duplicidad institucional. |
| M6 — Simulador | 29 entidades con registros en 2024–2026; el cálculo actual clasifica 29 en incumplimiento inminente y proyecta 1,90% de avance ponderado actual frente a 2,71% al cierre de 2027. Es una proyección heurística basada en el cambio anual histórico observado. |

Los conteos canónicos permanecen intactos: **33 mesas, 36 agendas, 11 fichas, 17 actores, 10 compromisos PAS, 12 actividades PA y 12.280 filas de hurtos**. Las lecturas cruzadas contra `bd_csh` fueron de solo lectura.

## Validación

| Validación | Resultado |
| --- | --- |
| Ruff `format` y `check` sobre servicio, router y prueba nuevos/modificados | Aprobados, sin hallazgos. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_inteligencia_triada.py backend/tests/test_ingesta_masiva_triada.py` | 22 aprobadas, 0 fallos; una advertencia existente de OpenPyXL sobre extensiones de validación. |
| `/api/v1/health/ready` después del reinicio | HTTP 200; base de datos, migraciones y extensiones listas. |
| Siete rutas `/api/v1/compromisos/triada/inteligencia/*` | HTTP 200; 0,002–0,192 s con filtros predeterminados tras la precarga. |
| Conteos SQL de verificación en `bd_csh` | 217.740 registros, 616 archivos, mesas 33, agendas 36, fichas 11, actores 17, compromisos 10, actividades 12 y hurtos 12.280. |
| `git diff --check` | Aprobado. |

Commit local exclusivamente de `backend/app/modules/compromisos/inteligencia_triada_service.py`, `backend/app/modules/compromisos/router.py`, `backend/tests/test_inteligencia_triada.py` y este reporte. No se modificó `src/` ni se ejecutó `git push`.

# Revisión Crítica del Plan DEA — [TRIADA-DEA-REVISION-PLAN-07A]

**Fecha:** 2026-10-15. **Método:** consultas SQL en transacción de solo lectura sobre `bd_csh`, inspección de modelos y entornos Python. No se modificaron `backend/`, `src/` ni la base. Las cifras siguientes describen el corpus ingerido, no una conciliación contable externa.

## Veredicto

La arquitectura de cinco fases es razonable como programa de investigación: evita sumar cortes y motores repetidos, separa 2026 parcial y propone LP, diagnósticos y trazabilidad. **Aún no admite resultados DEA publicables.** La selección de cortes perdería libros posiblemente complementarios, las escalas de avance son mixtas, la apropiación no se reconcilió con presupuesto oficial, y `avance_estrategico_pct` está vacío en **217.740/217.740 registros**. El tamaño útil para las fronteras y la segunda etapa es menor que el nominal. Los totales anuales de $2,415–$6,330 billones del plan son estimaciones reconstruidas: la coincidencia de magnitud no demuestra exactitud ni ausencia de doble cuenta.

## Fase 0: reglas 0.1–0.4

**0.1 Corte canónico.** Hay **162 pares entidad-año** en 2020–2025 según registros. En el catálogo de archivos, **120 pares** poseen huellas tabulares distintas fuera del corte de mayor prioridad; escoger solo `ANUAL>T4>T3>T2>T1>FORMULADO` excluiría **209 archivos**. Huella distinta no prueba complementariedad. En registros, **252 códigos BPIM numéricos de al menos ocho dígitos**, distribuidos en **24 pares**, aparecen solo en cortes anteriores al máximo: pueden ser proyectos omitidos, discontinuados o complementarios. Alcaldía Mayor 2025 aporta 50. Hay además **15.614 registros de 191 archivos** cuya entidad de fila difiere de la entidad del archivo; varias matrices PDD son interinstitucionales y otras etiquetas merecen adjudicación. La unidad de selección debe ser `(entidad responsable verificada, vigencia, familia documental, proyecto/meta/actividad, variable, fecha real de corte)`. Para la misma variable **acumulativa** y la misma unidad, conservar el valor válido más reciente sin sumarlo; incorporar libros de programas disjuntos aunque su corte sea anterior. Si el mismo proyecto figura en dos libros, reconciliarlo y registrar `reemplazado_por`, `complementario` o `conflicto`. La etiqueta `ANUAL` no acredita por sí sola cierre ejecutado; los 252 BPIM requieren revisión, no inclusión automática.

**0.2 Escala porcentual.** En `avance_fisico_pct` hay **1.466 combinaciones archivo-hoja-motor** con valores positivos; **373** combinan `(0,1]` y `>1..100`, **247** con diez o más observaciones. Se cuentan motores, por lo que una hoja física puede repetirse. Hay **18 valores >100** en seis combinaciones. Ejemplos reales incluyen una hoja con `0,25` y `94`, y otra con `0,048` y `1,009`. El máximo y P95 por hoja no identifican una escala única; `0,5` puede ser 50 % o 0,5 %. Inferirla por **columna fuente, encabezado semántico y formato de celda Excel**, contrastando denominador y distribución de valores inequívocos. Marcar `ESCALA_AMBIGUA` y excluir del DEA las observaciones sin prueba de escala, conservando bruto y transformación. Verificar los 18 valores >100 antes de clasificarlos como cantidades o sobrecumplimiento; truncar solo en métricas expresamente acotadas.

**0.3 Finanzas.** De **105.962 filas físicas** identificadas por archivo, hoja y número de fila, **58.719** aparecen en varios motores y **53.059** en los tres. En `INVERSION_PRESUPUESTAL`, **1.004 grupos** `(archivo, hoja, clave disponible, apropiación)` repiten importe en **3.036 registros**; **674 grupos repetidos carecen de BPIM, meta y línea útiles**. Secretaría General 2024 tiene 55 registros con COP 1.500.000.001 bajo un BPIM. Un importe repetido con clave nula no demuestra *forward-fill*: exigir evidencia de celda/rango combinado, jerarquía padre-hijo y procedencia. Hay **80 filas** financieras positivas con `TOTAL`, `SUBTOTAL` o `CONSOLIDADO` en algún texto, pero ninguna empieza así en línea o descripción; una búsqueda textual amplia puede eliminar actividades legítimas y omitir sumatorios reales. Reconocer sumatorios con fila de título, fórmula, nivel jerárquico y conciliación con hijos, preservando evidencia.

En **14/634 hojas** con apropiación positiva la mediana está entre COP 10 y 500.000; **cuatro** combinan esa mediana con máximos de al menos COP 100 millones. Hacienda 2020/2021 tiene mediana 1.738,43; varias hojas 2025 mezclan 325.000,5 con 58.960 millones. Detectar unidad por encabezado de **columna/bloque** y formato original; no multiplicar toda una hoja por mil/millón a partir de su mediana. Mantener apropiación, RP, obligaciones y pagos como **etapas distintas**: en el motor financiero hay 18.589 filas con apropiación positiva, 5.062 con pagos y 1.286 con obligaciones, y filas donde pagos exceden la apropiación reportada. `MAX(pagos, obligaciones, RP)` no representa una etapa contable homogénea. Elegir una definición observada de `X1` y documentar cobertura; prohibir el factor de ejecución sectorial supuesto.

**0.4 IPC.** El plan usa 4,50 % para 2025; el [DANE publicó 5,10 % para diciembre de 2025](https://www.dane.gov.co/files/operaciones/IPC/dic2025/cp-IPC-dic2025.pdf). Al 15-10-2026 no hay cierre anual 2026, por lo que pesos constantes anuales de 2026 con factor definitivo son prematuros. Usar serie IPC DANE versionada, base cerrada **2025** para comparaciones de años completos y, si se muestra 2026, indicador mensual provisional con fecha de corte. No mezclar flujos anuales y stocks de un corte.

## Fase 1: DMUs, grupos, inputs y outputs

En 2020–2025 se observan **29 entidades y 162 pares**. Solo **24** tienen los seis años (**144 DMU-años** antes de filtrar); **20** tienen apropiación positiva en el motor financiero los seis años, y **15** tienen además algún avance físico PDD positivo cada año. Las localidades son una en 2020 y tres desde 2021. Por tanto, el panel `N≈150–162` no es balanceado y las 30 entidades canónicas no están presentes en cada frontera anual. Con `m=2,s=3`, la regla heurística de Cooper exige al menos 15 DMUs: los grupos propuestos de **13, 14 y 3** no alcanzan ese mínimo en cortes transversales; la metafrontera de tres grupos no se debe publicar bajo esta especificación.

**X1:** hay **seis pares** sin apropiación positiva del motor financiero: tres de 2020, dos de 2022 y uno de 2025. Localidad Industrial 2022 y Escuela Taller 2025 solo tienen `PLAN_DESARROLLO`; otros tienen motor financiero, pero sin monto positivo. NULL/ausencia no es cero; `epsilon` fabricaría eficiencia extrema. Excluir de la frontera financiera de ese año y reportar cobertura, salvo conciliación individual con otra fuente oficial. **X2:** el número de proyectos es tamaño/composición de cartera, no una medida independiente de capacidad operativa; verificar BPIM activos y ejecutar sensibilidad sin `X2`, o usar un insumo real de personal/capacidad con fuente verificable.

**Y1:** imposible con la columna prevista: `avance_estrategico_pct` tiene **cero valores no nulos** en los tres motores. **Y2:** **46/162 pares** no tienen actividad de verbo fuerte con avance físico positivo (25 sin filas fuertes; 21 con filas fuertes pero sin avance positivo). **Y3:** el umbral crudo `>=70` deja **138/162 pares** sin proyecto, incluidos **29/29 en 2025**, en parte por escala 0–1. Distinguir cero observado de dato ausente, normalizar escala antes del umbral, deduplicar metas/actividades y probar comparabilidad de las unidades equivalentes antes de activar DEA de cinco variables. Para las ocho dimensiones, **66.639 registros** no tienen etiqueta y **76.734** tienen varias; asignar presupuesto con pesos que sumen uno por proyecto o reportar dimensión multietiqueta sin sumar como partición, mostrando no asignados.

## Fase 2: CCR, BCC, SBM, supereficiencia, bootstrap y Malmquist

En `/root/polis/venv` hay **NumPy 2.5.3** y **SciPy 1.18.1**; una instancia mínima de `linprog(method='highs')` resolvió. En `/root/polis/backend/.venv` hay NumPy 2.5.3, pero **falta SciPy**. HiGHS resuelve LP **numéricos** con tolerancias, no aritmética exacta: especificar formulación, escalamiento COP/conteos, tolerancias, estado del solver y degeneración.

**CCR/BCC:** estimar por año cerrado con DMUs elegibles; no tratar años repetidos como DMUs independientes de una misma frontera transversal sin justificar modelo panel. Clasificar CRS/IRS/DRS mediante modelos apropiados y sensibilidad a soluciones múltiples. **SBM:** fijar variante y orientación, transformación fraccional, tratamiento de ceros y targets completos a partir de holguras. **Supereficiencia:** bajo VRS o grupos pequeños puede ser infactible al excluir la unidad; devolver `no_estimable`; `>2,5` es umbral heurístico, no prueba de outlier. **Metafrontera:** diferir hasta lograr grupos suficientemente poblados y homogéneos o reducir variables con justificación y repetir la regla de tamaño efectivo. Validar orientación y rango del MTR.

**Bootstrap:** `B=200` deja aproximadamente cinco réplicas en cada cola de un IC bilateral 95 %; usar al menos 1.000–2.000, comprobar estabilidad y respetar dependencia por entidad. Un remuestreo ordinario de filas no implementa automáticamente Simar–Wilson. **Malmquist:** exigir mismos inputs/outputs observados en pares de años, distancias cruzadas frente a ambas fronteras y convención de retornos explícita (habitualmente CRS para la descomposición estándar); informar `n` elegible por transición. Excluir 2026 parcial. Los cambios de frontera no identifican por sí solos efecto de gobierno.

## Fase 3: segunda etapa y pruebas

Una sección transversal de **máximo 29–30 entidades**, antes de exclusiones, es demasiado pequeña para intercepto, cuatro covariables continuas, dos dummies de grupo y bootstrap truncado estable. Los **162 pares brutos** tampoco son independientes; el panel de seis años con presupuesto positivo tiene como techo **20 entidades × 6 = 120 observaciones**, antes de reparar outputs; con cobertura física PDD mínima son **15 entidades**. Definir ineficiencia y truncamiento compatibles con la orientación, reducir covariables *antes* de estimar, examinar colinealidad y endogeneidad (presupuesto ya es input DEA) y usar inferencia que respete dependencia por entidad. No llamar “exactos” a `p` estimados por bootstrap finito. Si la muestra final no sostiene el método Simar–Wilson 2007, publicar diagnóstico descriptivo, no coeficientes aparentes.

**Spearman/Pearson + BH:** fijar familias de hipótesis, unidad de análisis, muestra `n`, valores faltantes y `q` por familia antes de calcular; evitar ratios que comparten numerador/denominador. **Gini/HHI:** conciliar `X1`, mantener universo de entidades comparable y resolver dimensiones multietiqueta y sin etiqueta. **Kruskal–Wallis/Mann–Whitney:** las mismas entidades aparecen en gobiernos sucesivos, violando independencia; preferir comparación pareada o modelo longitudinal con incertidumbre por entidad. El periodo 2020–2023 tiene cuatro años y 2024–2025 dos: homogeneizar ventanas y no interpretar diferencia como causal.

## Fase 4: API y laboratorio visual

Los cinco contratos y cuatro vistas son útiles **si exponen la incertidumbre y ausencia de estimación**. Cada respuesta debe incluir `calculado/no_estimable/provisional`, universo, vigencia y fecha de corte, `n` elegible, exclusiones y motivos, unidad y base COP, versión de IPC/reglas/solver, procedencia de archivos, alertas de calidad y método del intervalo. La cascada separará suma bruta, deduplicación inter-motor, corte, des-propagación, unidades y conciliación externa; no rotulará el resultado como presupuesto oficial sin fuente externa. Invalidar caché al cambiar corpus, filtros o reglas; paginar desgloses, mostrar faltantes y estados de solver en gráficos de frontera, pares, holguras y Malmquist.

**Condiciones previas para codificar puntajes:** adjudicar libros/cortes/entidades; verificar escalas y unidades contra celdas fuente con cuarentena de casos ambiguos; conciliar montos y fijar IPC cerrado; redefinir outputs calculables y publicar elegibilidad por año/grupo; escoger modelos compatibles con el tamaño efectivo y revisar su formulación matemática. Mientras tanto, solo son defendibles diagnósticos de calidad y respuestas `no_estimable`, sin puntuaciones DEA presentadas como hallazgo académico.

# Entrega Backend DEA y Econometría — [TRIADA-BACKEND-DEA-ECONOMETRIA-07B]

**Fecha:** 2026-10-15. **Alcance:** implementación analítica de solo lectura en `backend/app/modules/compromisos/dea_econometria_service.py`; declaración de `scipy>=1.14.0,<2` en `backend/pyproject.toml`; cinco rutas `/api/v1/compromisos/triada/dea/*` en `router.py`; pruebas específicas en `backend/tests/test_dea_econometria_triada.py`. No se alteró `src/`, las tablas de `bd_csh` ni la configuración del servicio.

## Implementación y trazabilidad

- **Fase 0.** Consulta solo archivos sin alerta `CONTENIDO_IDENTICO_OTRO_CORTE`, conserva la entidad de cada registro aunque difiera de la entidad del archivo, y selecciona el corte por ítem (meta, BPIM o actividad), no por entidad-año completa. Pondera las dimensiones múltiples en partes iguales, con `SIN_ASIGNAR` separado. Contrasta porcentajes con cocientes en campos normalizados y números de `datos_origen`; marca `ESCALA_AMBIGUA` y valores `>100` sin sumarlos a outputs. Separa apropiación, RP, obligaciones y pagos; excluye como pagos los encabezados que realmente dicen “compromisos”. Reescala únicamente encabezados que declaran miles o millones. Despropaga importes repetidos con clave presupuestal y señala casos sin clave o multilibro. La deflactación usa IPC DANE con base cerrada 2025 y 5,10 % de cierre 2025; 2026 se expone como parcial, sin inventar IPC anual.
- **Fases 1 y 2.** El modelo núcleo `1×2` usa apropiación positiva y metas/actividades equivalentes con avance normalizado; la sensibilidad permite pagos. El extendido `2×3` exige 15 DMUs y productos observables. Los pares sin input positivo tienen `no_estimable_sin_insumo_financiero`, sin reemplazo por epsilon. Se implementaron LP HiGHS para CCR, BCC, SBM no radial, supereficiencia VRS y peers/holguras/targets; grupos con menos de nueve DMUs devuelven estado de muestra insuficiente. La ventana panel local se ofrece separada y marcada exploratoria. El bootstrap usa 1.000 remuestreos, semilla 20261015, IC percentil y estado **EXPLORATORIO**. Malmquist calcula distancias cruzadas CRS y EFFCH/TECHCH sobre pares de años cerrados; agrega con media geométrica e informa extremos.
- **Fase 3.** Se implementó MLE de normal truncada en cero con bootstrap por entidad para la segunda etapa, activado solo si existen al menos 30 entidades independientes y 100 observaciones completas; con el corpus presente devuelve `NO_ESTIMABLE_MUESTRA_INSUFICIENTE`, sin coeficientes inventados. La API sí calcula correlaciones Spearman/Pearson con ajuste BH, Gini/HHI con dimensiones multietiqueta ponderadas y comparación pareada Wilcoxon. Ninguno de estos resultados prueba causalidad.
- **Fase 4.** Los cinco endpoints incluyen los campos consumidos por el laboratorio visual, más estados metodológicos, elegibilidad, exclusiones y detalle de auditoría. El primer cálculo de la frontera ejecuta las 1.000 réplicas; respuestas posteriores se cachean cinco minutos por worker. El servicio divide la lectura SQL anual por motor para respetar el `command_timeout=3 s` del pool de la API.

## Evidencia en `bd_csh` y límites del resultado

La auditoría HTTP confirmó **217.740 registros** y **seis pares entidad-año 2020–2025 sin apropiación positiva**. Con la exclusión de archivos clonados y el alcance 2020–2026, se observaron **11.286 avances de escala ambigua**, **18 valores >100**, **15.108 filas con entidad de archivo distinta a la de registro** y **356 BPIM presentes solo en cortes anteriores al máximo de su entidad-año**. Estos dos últimos números tienen alcance distinto de los 15.614 y 252 del dictamen 07A; no indican pérdida automática de esas filas/proyectos. En 2025 la frontera núcleo de apropiación tuvo **26 DMUs elegibles**, **tres excluidas** y dos grupos institucionales con al menos nueve DMUs; la frontera anual de alcaldías locales no alcanza el mínimo. La segunda etapa reunió **129 DMU-años**, pero solo **26 entidades/112 observaciones** tienen todas sus covariables; por eso no se emiten coeficientes. Wilcoxon se calculó sobre **27 entidades pareadas**.

**Reserva forense material:** la reconstrucción de apropiación 2025 aún suma aproximadamente **COP 15,8 billones** y la suma 2020–2026 aproximadamente **COP 65,7 billones** en el corpus. No están conciliadas con ejecución oficial y pueden contener importes de diferentes niveles, unidades o proyectos sin clave. Por tanto, los puntajes DEA, intervalos del remuestreo, Gini/HHI y Malmquist se etiquetan como **exploratorios**; no se certifica una frontera académica ni una cifra de presupuesto distrital. El remuestreo de fronteras implementado no equivale al bootstrap suavizado de Simar–Wilson 1998; la regresión truncada de 2007 permanece correctamente no estimable con la muestra actual. Los índices Malmquist individuales contienen extremos y el agregado usa media geométrica, con alerta explícita.

En la verificación final, Malmquist global por media geométrica fue **1,298** y se marcaron **37 índices extremos** (`>5` o `<0,2`); esto confirma la sensibilidad a importes y escalas todavía no conciliados.

El contrato frontend existente todavía conserva un conjunto de ejemplo como fallback y presenta casillas numéricas para estadísticas no estimables. El backend entrega los campos para que la API real no active ese fallback en condiciones normales, pero la presentación de estados `NO_ESTIMABLE` y la retirada de cifras de ejemplo corresponden al trabajo paralelo de frontend. `backend/uv.lock` y `docs/permisos-api.md` no se modificaron por la partición estricta de archivos de la orden 07B; el lock necesitará sincronización antes de una instalación con `uv sync --locked`, y la matriz de permisos deberá reflejar las cinco rutas públicas antes del cierre de despliegue.

La comprobación de solo lectura `uv lock --check --project backend` confirmó que **el lock actual requiere actualización** tras añadir SciPy. Esta reserva no afecta el `.venv` ya instalado, pero impide reproducir el despliegue con `--locked` hasta que el coordinador autorice incluir `backend/uv.lock` en una entrega posterior.

## Validación y operación

| Comprobación | Resultado |
| --- | --- |
| `ruff format` y `ruff check` de servicio, router y prueba | Aprobados, sin errores. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py` | **8 aprobadas, 0 fallos**. |
| Entorno de producción | SciPy **1.18.1** y NumPy **2.5.3** presentes en `backend/.venv`. |
| `/api/v1/health/ready` tras reiniciar `polis-backend.service` | HTTP 200; base, migraciones y extensiones listas. |
| Cinco rutas DEA sobre `bd_csh` | HTTP 200: auditoría ~24 s en frío; frontera con bootstrap ~47 s en frío; Malmquist ~1,1 s; segunda etapa ~0,3 s; resumen ~1,6 s con caché caliente. |
| Conteos canónicos tras la ejecución | 217.740 registros; 616 archivos; 33 mesas; 36 agendas; 11 fichas; 17 actores; 10 compromisos PAS; 12 actividades PA; 12.280 filas de hurtos. |

El commit local incluye **solo** los cinco archivos asignados en la orden 07B, sin `git push`.

# Cierre Backend DEA — [TRIADA-BACKEND-DEA-CIERRE-07C]

**Fecha:** 2026-10-15. **Rama:** `main`. Sin cambios en `src/` ni escritura en `bd_csh`.

## Cambios

- `_regression_truncated` ahora admite `>=20` entidades y `>=60` observaciones completas; el estado del ajuste es `EXPLORATORIO_PANEL_CLUSTER`. Se calcula el pseudo-R² por correlación al cuadrado, el pseudo-R² ajustado, el estadístico Wald conjunto y su p-value, además de los coeficientes e intervalos bootstrap por cluster.
- Las filas de apropiación/RP/obligaciones/pagos sin BPIM ni meta ahora se agrupan mediante `SIN_CLAVE:{hoja}:{monto}` dentro del archivo, entidad y etapa. La auditoría cuenta `repeticiones_sin_clave_{etapa}` y los grupos despropagados.
- TTL del servicio subió de 300 a 3.600 segundos. La ruta de frontera entrega primero el ranking DEA sin bootstrap y encola 400 réplicas con prefiltrado de referencias dominadas; durante ese cálculo muestra `bootstrap_estado: PENDIENTE`. El panel territorial también se completa en segundo plano.
- `backend/uv.lock` quedó sincronizado con SciPy 1.18.1 y `docs/permisos-api.md` registra las siete rutas de inteligencia y las cinco rutas DEA como públicas, de acuerdo con las dependencias actuales del router.

## Evidencia y límites operativos

La auditoría en vivo respondió 200 con 217.740 registros. Para 2025 informó COP **15.544.009.098.127,95** de apropiación reconstruida y 403 repeticiones de apropiación sin clave despropagadas; el agregado 2020–2026 informó 1.457 repeticiones sin clave podadas. Estos montos siguen siendo **estimaciones del corpus no conciliadas**, no presupuesto oficial.

La revisión de rendimiento en el servicio con dos workers encontró lo siguiente:

| Ruta / comprobación | Resultado observado tras reinicio |
| --- | --- |
| `/health/ready` | HTTP 200; 0,06 s en el chequeo final. |
| `dea/auditoria-saneamiento` | HTTP 200; 24,39 s en frío. **No cumple** el objetivo de 5 s. |
| `dea/frontera-eficiencia` | HTTP 200; 0,27 s en un worker con datos ya preparados y 8,42 s al llegar a un worker frío. **No se acredita** <5 s en frío. |
| `dea/malmquist` | HTTP 200; 2,16 s y 2,08 s en las solicitudes registradas. |
| `dea/econometria-segunda-etapa` | No concluyó en más de 3 minutos; el worker ejecutaba carga histórica más 1.000 ajustes bootstrap. Se reinició el servicio para detener ese cálculo prolongado. |
| `dea/resumen-integral` | No verificado en vivo en esta corrida. |

La respuesta de la segunda etapa en frío y las cinco rutas por debajo de cinco segundos **quedan pendientes**. Para satisfacer ambas condiciones habrá que resolver la carga histórica previa y el costo del bootstrap mediante precálculo/precalentamiento compartido, sin etiquetar como calculados los coeficientes antes de terminar el ajuste. El último `polis-backend.service` está activo y `/health/ready` devuelve 200. Los endpoints sí quedaron cubiertos por pruebas HTTP con dependencias simuladas; esto no sustituye la verificación integral contra la base real.

## Validaciones

| Validación | Resultado |
| --- | --- |
| `ruff format` y `ruff check` en servicio y prueba DEA | Aprobados. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py` | 10 aprobadas. |
| `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py backend/tests/test_access_policy.py` | 114 aprobadas. |
| `uv lock --check --project backend` | Aprobado. |
| `git diff --check` | Aprobado. |

El commit local incluye solo `backend/app/modules/compromisos/dea_econometria_service.py`, `backend/tests/test_dea_econometria_triada.py`, `backend/uv.lock`, `docs/permisos-api.md` y este reporte. No se ejecutó `git push`.
