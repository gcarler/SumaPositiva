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

# Optimización de verosimilitud y caché DEA — seguimiento 07C

**Fecha:** 2026-10-15. Se reemplazó la evaluación `norm.logpdf`/`norm.logcdf` en `_regression_truncated` por la expresión cerrada con `scipy.special.log_ndtr`, configurando L-BFGS-B con `ftol=1e-6`, `maxiter=60` y 200 réplicas cluster bootstrap. Se añadieron resultados con TTL de una hora a `_RESULT` para `econometria_segunda_etapa`, `auditoria_saneamiento` y `malmquist`; `resumen_integral` reutiliza esos resultados.

## Evidencia en vivo posterior al reinicio

| Ruta | Primer resultado observado | Repetición con caché |
| --- | --- | --- |
| `/api/v1/compromisos/triada/dea/econometria-segunda-etapa` | HTTP 200, **21,73 s** en frío, incluyendo la carga de 2020–2025. | HTTP 200, **0,021 s**. |
| `/api/v1/compromisos/triada/dea/resumen-integral` | HTTP 200, **4,50 s** después de poblar la caché de la segunda etapa. | HTTP 200, **0,053 s**. |
| `/api/v1/health/ready` | HTTP 200, base, migraciones y extensiones listas. | — |

El ajuste regresó el panel observado con **129 DMU-años**, **26 clusters** y **112 observaciones completas**. Se obtuvieron 199 réplicas válidas de las 200 solicitadas. La especificación reportó pseudo-R² **0,02342**, Wald **2,2990** y p-value conjunto **0,68094**; los cinco coeficientes y sus intervalos se incluyen en la respuesta de la API. El primer acceso sigue pagando la carga histórica fría; el resultado repetido queda prácticamente instantáneo mientras el proceso conserve la caché.

La verificación de calidad de código fue `ruff format`, `ruff check` y `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py`: **10 pruebas aprobadas**. Servicio reiniciado; commit local asociado, sin push.

# Entrega backend PDD DEA — [TRIADA-BACKEND-DEA-PDD-08]

**Fecha:** 2026-10-15. **Rama:** `main`. Se implementaron las cinco rutas PDD DEA y se verificaron contra el servicio productivo y `bd_csh`.

## Cambios

- Nuevo `backend/app/modules/compromisos/pdd_dea_service.py`: catálogo de fuentes, series IPC, PPI 2020/2024 y conciliación; deduplicación de metas por entidad/año/código; verificación conservadora de escalas de avance; agregados por plan, línea, entidad y localidad; DEA BCC/CCR/SBM por entidad con proyección, pares y slacks; contraste pareado, ajuste BH y estadística descriptiva interplan. Los cálculos se cachean en `_RESULT` con el TTL compartido de 3.600 s y los registros se leen con cursor asíncrono por lotes.
- `router.py` agrega `catalogo-y-conciliacion-ppi`, `cumplimiento-metas`, `frontera-dea-pdd`, `econometria-comparada-pdd` y `resumen-ejecutivo`. `plan=TODOS` está soportado. Las cinco rutas quedan registradas como públicas en `docs/permisos-api.md`.
- `backend/tests/test_pdd_dea_triada.py` cubre conciliación de PPI, formatos monetarios, normalización de metas, deduplicación, escalas de avance, cotas DEA, FDR, productividad descriptiva y registro de rutas.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `ruff format` + `ruff check` sobre servicio, router y pruebas | Aprobados. |
| `pytest -q tests/test_pdd_dea_triada.py tests/test_access_policy.py` | **120 aprobadas**. |
| Reinicio de `polis-backend.service` | Servicio activo; el warmup existente de la aplicación tomó alrededor de 35 s por worker. |
| Cinco rutas `/api/v1/compromisos/triada/pdd-dea/*` | **HTTP 200** en las cinco solicitudes en vivo. |
| Catálogo vivo, registros PDD después de excluir clones | 2016–19: **3.013**; 2020–23: **24.328**; 2024–27: **70.609**; PDL locales: **5.900** filas asociadas. |
| Latencia observada en la verificación final | Catálogo: **14,05 s**; cumplimiento: **11,24 s**; frontera: **2,86 s**; econometría: **0,19 s**; resumen: **2,94 s**. El frío de datos en cada worker supera 3 s; las rutas cacheadas dependen de qué worker reciba la solicitud y no acreditan consistentemente <50 ms. |

## Límites que quedan visibles

- La respuesta DEA marca `bootstrap_replicas: 0` e intervalos pendientes: no se simuló el bootstrap de 200 réplicas. Los scores BCC/CCR/SBM entregados son deterministas.
- `malmquist_inter_planes` está reportado explícitamente como proxy geométrico de cambios del avance medio; no estima `EFFCH × TECHCH` mediante fronteras temporales Malmquist completas.
- La econometría implementa asociación PPI/avance y Wilcoxon/Friedman sobre observaciones disponibles; la matriz solicitada con todas las variables de articulación PA/BPIM y los índices de desigualdad por línea no está completa. Las salidas y advertencias no presentan estos proxies como inferencia causal.
- El total oficial 2020–23 es COP **6.022.982.600.000** constantes de dic-2019; las cuatro cifras anuales publicadas suman COP **6.022.982.500.000**. La API informa la diferencia de redondeo de COP 100 millones. Para 2016–19 está disponible el PDF escaneado de 363 páginas, pero no fue posible extraer OCR; el PPI histórico se conserva como no extraído en vez de inventar montos.

El commit se limita a los cinco archivos backend/documentación asignados. No se añadieron cambios de `src/` ni se ejecutó `git push`.

# Entrega backend Data PDD — [TRIADA-BACKEND-DATA-PDD-09]

**Fecha:** 2026-10-15. **Rama:** `main`. Sin `git push` ni cambios en `src/`.

## Implementación

- Se creó Alembic `0065_catalogo_planes_desarrollo` y se añadieron los modelos ORM para `seguimiento.planes_desarrollo_distrital`, `pdd_lineas_y_programas` y `pdd_metas_oficiales`. La migración quedó aplicada tanto en `bd_csh` como en `polis_test`; `alembic check` no detectó divergencias en ninguna.
- `backend/scripts/sincronizar_catalogo_pdd.py` realiza una extracción repetible e idempotente de los documentos Markdown disponibles. Poblé `bd_csh` con **8 planes (5 PDD + 3 PDL), 478 nodos de jerarquía y 2.068 filas tabulares candidatas a metas oficiales**. El PDD 2024 quedó con exactamente 6 líneas, 42 filas fuente de impulsores (incluye códigos repetidos por asignación presupuestal) y 172 filas fuente de programas, con sus importes anuales 2024–2027. Se relacionaron 49 metas tabulares a una línea por nombre exacto. Las filas PPI oficiales 2024 se conservan individualmente y las anualidades duplicadas quedan trazables.
- Se preservaron las **217.740** filas canónicas de `registros_triada_normalizados`.
- `pdd_dea_service.py` descarta nombres de línea puramente numéricos/decimales, rescata etiquetas desde `datos_origen` y `hoja_origen`, y expone avance directo, avance imputado desde PA, avance consolidado y soporte financiero al cruzar entidad, vigencia y código BPIM/meta. El presupuesto se suma por fila financiera única para evitar duplicar un importe cuando BPIM y código de meta apuntan a la misma fila.
- La frontera incorpora BCC con **200 remuestreos bootstrap** e IC 95% donde hay muestra suficiente, frontera por línea y evaluación financiera de las tres localidades PDL. La transición interplanes usa distancias CRS output-oriented por LP HiGHS y reporta `MPI = EFFCH × TECHCH` cuando hay DMU comunes.
- Se añadió `/explorador-programas-y-seguridad-humana`, se integró su salida a `resumen-ejecutivo` y se registró en `docs/permisos-api.md`. El monitor lee las dimensiones, 33 mesas, 10 compromisos PAS y 12.280 filas de hurtos de sus tablas fuente.

## Validación en vivo y pruebas

| Verificación | Resultado |
| --- | --- |
| Migración y `alembic check` | `0065_catalogo_planes_desarrollo`; limpio en `bd_csh` y `polis_test`. |
| Ruff en los seis archivos backend y la prueba | `ruff format` y `ruff check` aprobados. |
| Pytest requerido | **123 passed**: `test_pdd_dea_triada.py` y `test_access_policy.py`. |
| Conteo en `bd_csh` | 8 planes, 478 nodos, 2.068 metas tabulares, 217.740 registros Triada. |
| Reinicio `polis-backend.service` | Activo; warmup de aplicación ~36 s. |
| Seis rutas PDD DEA | HTTP 200 en catálogo, cumplimiento, frontera, econometría, explorador y resumen. |
| Tiempos en frío observados | Catálogo 29 s; cumplimiento 27 s en worker frío; frontera 89 s; econometría 1,2 s; explorador 0,2 s; resumen 97 s cuando cayó en worker sin caché. |
| Monitor de Línea 1 | 8 dimensiones mostradas (7 persistidas activas + Seguridad Cultural complementaria, marcada inactiva/no persistida), 33 mesas, 10 compromisos PAS, 12.280 filas de hurtos y 36 códigos distintos de programas leídos bajo Línea 1. |

## Límites documentales y operativos

La extracción deja visibles diferencias entre el conteo esperado del plan maestro y los Markdown legibles: para PDD 2020–2023 se obtuvieron 21 títulos de línea y 87 encabezados de programa; no se completaron artificialmente los conteos esperados de 33 y 172. PDD 2012–2015 y PDD 2016–2019 no tienen PPI digital completo en las fuentes leídas (el PDF 2016 es escaneado), por lo que esos totales permanecen nulos en catálogo en vez de inventarse. La tabla de metas conserva filas candidatas con encabezados de meta/indicador/resultado/producto; no se afirma que las 2.068 sean una cobertura exhaustiva de todas las tablas publicadas.

La fuente reporta 26 programas para el cruce de Seguridad Humana, mientras que la tabla PPI disponible produce 36 códigos de programa distintos bajo códigos 1.x. Se devuelven los códigos y filas oficiales disponibles; no se reduce la lista sin una regla documental que justifique qué 10 excluir. El cruce de programas con dimensiones PNUD, mesas y PAS tampoco se presenta como vínculo individual cuando la base no contiene una clave común.

El bootstrap sí se ejecuta en la solicitud fría y entrega HTTP 200, pero la frontera tarda ~89 s y el resumen ~97 s si llegan a un worker sin caché. `_RESULT` es caché por proceso; el segundo worker puede recalcular. Por tanto, la funcionalidad quedó implementada y verificada, pero no se acredita latencia fría adecuada para interacción de producción.

El commit local incluye únicamente migración, modelos, sincronizador, servicio PDD DEA, router, prueba, permisos y este reporte. `src/` y `.archify/` quedan fuera del commit.

# Entrega backend cierre total PDD — [TRIADA-BACKEND-CIERRE-TOTAL-10]

**Fecha:** 2026-10-15. **Rama:** `main`. Sin `git push`; sin cambios en `src/`.

## Implementación y datos

- Se incorporó el PPI oficial extraído por OCR para `PDD_2012_2015`: **COP 3.049.788.268.000**, con anualidades 2012–2015 y cinco ejes con sus techos. Para `PDD_2016_2019` se incorporó **COP 4.331.941.000.000**, con anualidades 2016–2019 y tres objetivos estratégicos con sus montos. Ambos planes usan el Markdown OCR como fuente.
- `sincronizar_catalogo_pdd.py` persiste el estado `OFICIAL_EXTRAIDO` y los totales corrientes/constantes de 2025 de los **8 planes**. Verificación de lectura en `bd_csh`: los 8 tienen ambos importes mayores que cero y estado oficial.
- El vínculo de cada meta se persiste en el JSONB existente `pdd_metas_oficiales.datos_oficiales._vinculo_triada`, porque el modelo/tabla no dispone de una columna `metadatos` ni `registro_triada_id`. El cruce exige el mismo periodo, compara código cuando la fuente provee uno, y usa entidad, indicadores y líneas como respaldo determinístico. El endpoint del explorador informa el total y el desglose por método.
- Resultado actual sobre 2.068 metas oficiales: **1.267 vinculadas** (582 `INDICADOR_ENTIDAD`, 685 `SEMANTICO_PROGRAMA`) y 801 `SIN_VINCULO`. El catálogo OCR sincronizado no proporcionó un código legible para las filas evaluadas, de modo que no se acreditaron vínculos `CODIGO_EXACTO`; no se les asignó ese método por similitud textual.
- El clasificador de `linea_estrategica` ya no devuelve el valor original arbitrario: asigna una de las líneas canónicas por periodo, incluyendo las seis líneas 2024–2027, cinco grupos oficiales 2020–2023 y ocho líneas 2016–2019; filas sin pista pasan al grupo transversal/institucional del plan. Se añadieron las ocho líneas de 2016 al catálogo.
- Se implementó caché persistente versionada en `/tmp/polis_pdd_dea_cache_v10.json`. El sincronizador recalcula los seis payloads, los escribe atómicamente y el servicio los carga durante el inicio de cada worker además de guardarlos en `_RESULT`. El archivo final contiene seis claves y ocupa aproximadamente 3 MB.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `ruff check` en sincronizador, servicio y pruebas | Aprobado. |
| `pytest -q tests/test_pdd_dea_triada.py` | **20 aprobadas**. |
| `pytest -q tests/test_pdd_dea_triada.py tests/test_access_policy.py` | **124 aprobadas**. |
| Catálogo sincronizado | 8 planes, 538 líneas/programas y 2.068 metas oficiales. |
| `polis-backend.service` | Reiniciado y activo; ambos workers completaron startup. |
| Seis rutas `/api/v1/compromisos/triada/pdd-dea/*` | HTTP 200 en las seis tras reinicio. |
| Latencia total medida en la primera pasada | Catálogo 196 ms; cumplimiento 12 ms; frontera 28 ms; econometría 7 ms; explorador 326 ms; resumen 143 ms. La segunda pasada previa al último warmup dio 13, 13, 37, 9, 118 y 148 ms, respectivamente. |

**Límite de rendimiento:** el caché elimina los recálculos caros, pero no se alcanzaron menos de 50 ms en todas las rutas. Explorador y resumen devuelven 2,08 MB y 2,58 MB; FastAPI aún codifica esos objetos y la medición HTTP excede 50 ms. Cumplimiento y explorador también incluyen filas completas de metas oficiales. Para cumplir ese umbral de extremo a extremo hará falta una respuesta HTTP pre-serializada/compactada o reducir el contrato de respuesta; los archivos autorizados para esta tarea no incluyen el router ni middleware de respuesta. La inicialización general de la aplicación también ejecuta su warmup existente, alrededor de 32 s por worker.

El commit local contiene exclusivamente `backend/scripts/sincronizar_catalogo_pdd.py`, `backend/app/modules/compromisos/pdd_dea_service.py`, `backend/tests/test_pdd_dea_triada.py` y este reporte.

# Revisión Crítica y Aportes al Laboratorio Prescriptivo PDD — [TRIADA-PDD-REVISION-LAB-11A]

**Fecha:** 2026-10-15. **Tipo:** auditoría metodológica y empírica de solo lectura. Consulté `bd_csh` dentro de transacciones `READ ONLY`, inspeccioné modelos y servicios existentes, y revisé el catálogo documental. No se modificó código productivo, no se escribió en la base y no se hizo commit para esta revisión. El archivo `bridge/01_tarea_codex.md` ya estaba modificado al iniciar la sesión; ese cambio ajeno se preservó.

## Dictamen ejecutivo

La propuesta es una agenda sólida de investigación y control, pero **los datos actuales no sustentan todavía un Network DEA de resultados sociales, un optimizador fiscal listo para decidir ni inferencia espacial por localidad**. Sí permiten construir diagnósticos exploratorios de operación, calidad de formulación y distribución descriptiva. Los bloqueos empíricos principales son: metas oficiales de solo seis de los ocho planes, 801 metas sin vínculo (incluidas 195 del PDD 2013–2015 sin corpus operativo de sus años), cero códigos explícitos entre las 2.068 filas de metas, cero reportes de los 10 compromisos PAS, solo 11 fichas de indicadores, y hurtos distribuidos en dos polígonos urbanos/rurales sin población en los territorios.

Una meta sin vínculo no equivale a una meta incumplida. En especial, la base observada de registros Triada empieza en 2017, por lo que la ausencia de filas para periodos previos es una limitación de corpus, no evidencia de incumplimiento administrativo.

## 1. Auditoría empírica de `bd_csh`

### Metas y vínculo con ejecución

| Plan/fuente de las filas `SIN_VINCULO` | Total huérfanas | Con línea declarada | Con indicador | Observación de periodo |
| --- | ---: | ---: | ---: | --- |
| PDD 2013–2015 | 195 | 190 | 192 | No hay filas Triada de 2013–2015; el corpus de ejecución consultado empieza en 2017. Estas 195 son principalmente `SIN_CORPUS_HISTORICO`, no huérfanas reales. |
| PDD 2020–2023 | 67 | 41 | 42 | Sí hay volumen de ejecución en esos años; falta evaluar una segunda pasada con concordancias validadas. |
| PDD 2024–2027, bases técnicas | 164 | 152 | 156 | Corpus de ejecución amplio, pero la coincidencia no prueba que el indicador esté operacionalizado. |
| PDD 2024–2027, ponencia | 202 | 172 | 193 | Posible solapamiento documental con bases técnicas; deduplicar versiones antes de tratarlo como 366 metas independientes. |
| PDL 1 2024–2027 | 21 | 20 | 20 | Hay filas locales; se requiere conservar el identificador de localidad en la vinculación. |
| PDL 2 2024–2027 | 3 | 3 | 3 | Muestra demasiado pequeña para generalizar desempeño. |
| PDL 3 2024–2027 | 149 | 117 | 146 | Hay 1.279 filas locales 2024–2027; revisar alias de entidad, cobertura de línea y diferencias de estructura del PDL. |
| **Total** | **801** | — | — | 801/2.068 = 38,8% sin vínculo persistido. |

Los otros conteos por plan son: PDD 2020–2023, 226 metas (67 sin vínculo); PDD 2024–2027, 1.246 (366 sin vínculo); PDL 1, 110 (21); PDL 2, 89 (3); PDL 3, 202 (149). **PDD 2012–2015 y PDD 2016–2019 tienen cero filas en `pdd_metas_oficiales`**, aunque los planes y estructuras estén en el catálogo. Por tanto, los 2.068 registros no representan todavía una extracción de metas de los ocho planes ni una serie completa 2012–2027.

En las 2.068 metas, la auditoría encontró 0 con `codigo` explícito, 1.893 con `linea_nombre`, 1.928 con `indicador` y 831 con la llave OCR `Meta del cuatrienio`. La presencia de `linea_nombre` o `indicador` no demuestra calidad o validez semántica. El método `CODIGO_EXACTO` no puede tener cobertura positiva hasta que el extractor recupere un código comparable o el catálogo oficial proporcione una llave estable. En los documentos PDD 2024, las 366 filas huérfanas se reparten entre 164 de bases técnicas y 202 de ponencia; esas fuentes pueden duplicar productos y no deben sumarse sin una huella de meta/versionado.

La tabla de ejecución ofrece cobertura temporal desigual: por año hay 5 DMU entidad-año PDD en 2017, 18 en 2018, 21 en 2019, 24–27 entre 2020–2023, 29 en 2024–2025, 30 en 2026 y solo 1 en 2027. No aparece 2016 ni 2012–2015. El año 2027 es futuro/planificado al corte de esta revisión y debe tratarse como censura temporal, no como rezago. En 2017–2027 se observan 237 combinaciones distintas entidad-año para `PLAN_DESARROLLO`, 224 para presupuesto y 229 para plan de acción; hay aproximadamente 1.515 códigos BPIM distintos por motor. Esos conteos aún contienen cortes/versiones y no equivalen a contratos adjudicados.

### Cobertura de outcomes y articulación institucional

| Fuente | Cobertura observada | Qué sí permite afirmar | Qué no permite afirmar |
| --- | --- | --- | --- |
| `indicadores.fichas_tecnicas_indicadores` | 11 fichas; 11 con avance no nulo/cero; 11 mediciones, todas con `es_demostracion=false` | Existe un pequeño set con observaciones reportadas en la BD. | No representa cobertura suficiente ni se verificó enlace a las metas oficiales, comparabilidad temporal o fuente independiente. |
| `seguimiento.compromisos_pas` | 10 filas, 8 entidades; **0 con estado distinto de `sin_reporte`** | Hay estructura programática y responsables identificados. | No hay outcomes de cumplimiento PAS observados en la tabla. Cobertura PAS no puede usarse hoy como producto efectivo medido. |
| `seguimiento.actividades_plan_accion` | 12 filas, 12 con algún avance, una vigencia y 10 códigos PAS cubiertos | Hay un núcleo operativo pequeño y articulado. | Doce filas de una vigencia no son muestra longitudinal representativa de los 217.740 registros Triada ni una serie distrital completa. |
| `mesas_trabajo.mesas` | 33 mesas; las 33 tienen fecha y `territorio_id`; las 33 enlazan a un territorio con geometría | El enlace de mesa a territorio permite agregación descriptiva por territorio identificado. | La mesa no es automáticamente una medida de demanda atendida; faltan asistencia, acuerdos ejecutados y regla de atribución. |
| `mesas_trabajo.agendas` | 36 agendas; 35 asociadas a una mesa, 36 con fecha | Se puede vincular la mayoría agenda→mesa→territorio. | La agenda es actividad programada, no resultado ni demanda resuelta. |

### Geografía y hurtos

PostGIS tiene geometrías EPSG:4326 en `geodatos.territorios` (geometría multipolígono y centroide), `geodatos.geometrias_capas`, y `geodatos.poligonos_analitica_hurtos` (multipolígono y centroide). `geodatos.geometrias_capas` solo tiene 4 geometrías, una por categoría (ALERTA_SAT, CONFLICTIVIDAD_ICS, RECURSO_HIDRICO y ZONA_FONSET); `geodatos.capas_geovisor` tiene 7 capas activas. El catálogo `geodatos.territorios` contiene 15 elementos: 1 distrito, 3 localidades, 5 barrios, 3 corregimientos y 3 zonas insulares; todos los registros de ese catálogo tienen geometría y centroide, pero **los 15 tienen `poblacion_estimada` nula**. No hay cobertura barrial exhaustiva: solo cinco barrios cargados. No existe una tabla `cuadrantes` en los esquemas consultados. `mesas_trabajo.mesas` no almacena geometría propia: sus 33 filas apuntan a `territorio_id`, y la geometría se hereda mediante `geodatos.territorios`.

`geodatos.estadisticas_hurtos` contiene 12.280 filas y 18.242 casos entre 2018 y 2026, pero se asignan a solo **dos polígonos**: perímetro urbano (75,28 km²) y zona rural/insular (597,38 km²). Hay únicamente dos zonas espaciales para el outcome; el registro detallado por fecha/delito no equivale a resolución espacial fina. Las 33 mesas sí enlazan a territorios, pero `registros_triada_normalizados` no tiene FK ni geometría territorial; la asignación local depende de texto/entidad. Para un cruce local reproducible se necesita una llave geográfica normalizada.

## 2. Crítica metodológica y propuesta por módulo

### Módulo 1 — Network DEA de dos etapas

**Lo aprovechable:** `registros_triada_normalizados` ofrece apropiación definitiva, pagos, avances físicos/estratégicos, metas ejecutadas/programadas, entidad, vigencia, códigos BPIM y dimensiones. Se pueden formar paneles exploratorios entidad-año y calcular por separado eficiencia operativa y brechas de resultados cuando haya outcome observable.

**Límites:** BPIM es identificador de proyecto, no número de contratos; los registros contienen cortes y duplicados y deben deduplicarse antes de agregar. La PPI plurianual es un techo de plan, no apropiación ejecutada por entidad. `avance físico` y `porcentaje de producto` son outputs de operación, no outcomes de seguridad humana. En la segunda etapa, PAS no tiene reporte, las fichas son 11 y los hurtos solo varían en dos zonas; mesas/agendas son actividades, no outcomes. Usarlos juntos inflaría dimensiones y dejaría una frontera dominada por ceros, proxies y escala de reporte.

**Propuesta matemática:** definir DMU como entidad×vigencia con un único corte anual consolidado y elegibilidad de datos previamente fijada. Etapa 1, un input financiero deflactado (apropiación ejecutada o pagos, con una definición fija) y, solo si se valida cobertura, un insumo físico de proyectos activos; enlace `Z` como productos de meta con ejecución y meta ejecutada/esperada en unidades comparables. Etapa 2: `Z` entra una sola vez como input intermedio; outcome positivo solo cuando exista indicador social válido (por ejemplo, tasa de hurto por población y geografía coincidente, con la dirección invertida como output deseable o modelado explícitamente como output indeseable). Mantener modelos de red VRS/SBM por etapa y score global; reportar `Etapa 2 = no estimable` ante falta de Y, nunca “baja efectividad”. Aplicar bootstrap por entidad/cluster, sensibilidad a cortes y exclusión de valores imputados.

Con 30 entidades en años recientes y 237 entidad-año irregulares, un modelo mínimo de una X, una Z y una Y podría explorarse si las DMU completas son suficientes; no agregaría variables de contratos, mesas, PAS, hurtos y fichas hasta tener cobertura. Las reglas usuales de tamaño DEA son heurísticas, no garantía de identificabilidad ni de inferencia. Para el Network DEA propuesto no hay hoy una Y social con N territorial y temporal adecuado.

### Módulo 2 — Inverse DEA / reasignación presupuestal

**Riesgo central:** DEA identifica posiciones relativas frente a una frontera observada, no retornos causales de mover COP. Clasificar IRS/DRS y convertirlo automáticamente en reasignación confunde eficiencia técnica relativa con elasticidad causal de gasto. El PPI de $12,80 billones es un techo agregado 2024–2027; no hay desglose íntegro por entidad y apropiación legalmente reprogramable en una sola tabla.

**Propuesta:** formularlo como simulador de escenarios, no recomendación fiscal automática. Resolver un inverse DEA con outputs meta fijados y cambios mínimos de input sujeto a balance presupuestal, límites de variación, montos protegidos y límites de competencia validados como datos normativos versionados. Si esas restricciones no tienen fuente y responsable, mantenerlas como parámetros de escenario visibles y no como “restricciones legales”. Usar conjunto eficiente y regiones de incertidumbre (bootstrap/intervalos) más frontera Pareto con `ε`-constraint; mostrar costo de oportunidad y sensibilidad ±5/10/15%. Nunca ejecutar cambios de presupuesto ni presentar `ΔX→ΔY` como efecto causal. El outcome prescriptivo debe ser “escenario matemáticamente factible bajo supuestos A”, no “reasignación que reduce delitos”.

### Módulo 3 — NLP, rigor de formulación y metas sin vínculo

**Lo aprovechable:** hay texto de indicador en 1.928/2.068 metas y línea declarada en 1.893. El JSON de origen conserva campos de tabla útiles para recuperar unidad, meta de cuatrienio, indicador de producto y responsable. La cobertura de metas meta-cuantificadas cae a 831; esa ausencia es en sí misma una señal de formulación, condicionada por la calidad OCR/extractor.

**Riesgos:** las categorías “gestión/proceso”, “producto/cobertura” y “resultado/impacto” no se deben inferir por una palabra aislada. “Documento”, “atendido”, “fortalecido” o “implementado” dependen de unidad, magnitud, población y definición de indicador. Los 2024 bases/ponencia contienen riesgo de duplicados; para el 2012 y 2016 no hay filas de metas en la tabla. El 38,8% sin vínculo mezcla falta de historia (2013), falta de identificador, discrepancia OCR, entidad/línea mal extraída y posible falta de reporte; solo esta última categoría podría acercarse a una “meta huérfana real”.

**Propuesta de segundo pase y medición:** conservar `SIN_VINCULO` como estado técnico y descomponerlo en `SIN_CORPUS_PERIODO`, `SIN_CODIGO`, `SIN_ENTIDAD`, `SIN_INDICADOR`, `CANDIDATO_BAJA_CONFIANZA`, `SIN_REPORTE_EN_CORPUS_CUBIERTO`. Construir índice por periodo, entidad y tokens normalizados con lematización/reglas de abreviatura; candidatos de plan de acción/PAS se sugieren, pero no se consideran ejecución verificada hasta revisión de evidencia. Guardar score, reglas activadas y fila fuente. Preparar un gold set estratificado de 200–300 pares, con doble anotación y adjudicación; publicar precisión/recobrado por plan y por tipo. Taxonomía MGA/Sinergia como clasificación humana supervisada o reglas auditables con abstención (`REVISIÓN`), unidad, línea base, meta numérica, población y periodicidad. Índice de rigor separado de avance/desempeño y acompañado por intervalos de confianza del clasificador.

No estimo un número “recuperable” de las 801 sin ese gold set: la base actual no tiene una llave verdadera para distinguir un falso negativo semántico de una meta realmente sin reporte. Para 2013, las 195 se deben marcar como fuera de cobertura histórica. Para 2020–2026, la existencia de filas a nivel de año solo demuestra disponibilidad de corpus, no que cada meta tuviera que reportarse por cada entidad. Para 2027, tratar los datos como planificados/censurados.

### Módulo 4 — Econometría espacial y justicia territorial

**Conclusión empírica:** no hay N espacial suficiente para Moran’s I, regresión espacial, autocorrelación o clúster de hurtos: las estadísticas de delito se asignan a dos polígonos. Las 3 localidades oficiales sí tienen geometría, pero no población (`poblacion_estimada IS NULL`); hay cinco barrios, no todos los barrios. No se puede construir inversión per cápita fiable ni tasa de delito local con estas tablas. La cobertura 33 mesas→territorio está completa, pero los conteos por mesa no representan por sí solos demanda resuelta.

**Propuesta por etapas:** primero consolidar fuente oficial población anual, barrios/localidades y código DANE/territorial; geocodificar delitos a una unidad pública suficientemente fina y auditable; y persistir `territorio_id` en asignaciones/corpus. Hasta entonces, publicar solo comparativos urbano/rural descriptivos (n=2, sin inferencia), tres PDL como tabla de localidad con gasto nominal/deflactado y etiqueta `sin denominador poblacional`, y mapas de cobertura de datos. Cuando existan ≥30 unidades espaciales comparables con tasas y matriz de pesos W documentada, evaluar Moran global/local con permutaciones, corrección de multiplicidad y sensibilidad de W. Para Theil/Gini, fijar población/beneficiarios como ponderador; sin ese denominador el índice mide concentración de montos, no equidad territorial.

### Módulo 5 — Dictamen, exportación y latencia

Las consultas previas del cierre 10 midieron HTTP 200 en las seis rutas; el explorador y resumen actuales son aproximadamente 2,08 MB y 2,58 MB, y superaron 50 ms en lectura completa pese al caché. El archivo JSON persistente reduce recomputación, pero el endpoint vuelve a codificar el objeto en FastAPI. **No es honesto prometer `<25 ms` de extremo a extremo para respuestas multi-megabyte** sin acotar transferencia, compresión y hardware.

Un pliego automático puede agrupar evidencia: entidad, periodo, meta/indicador, corte fuente, alerta, monto, avance validado, reglas y enlaces. Debe llamarse borrador de hallazgo, con confianza y datos faltantes; no acusación, dictamen legal ni causalidad. “Sobre-ejecución sin avance” exige alinear vigencia, entidad, BPIM/meta y mismo corte financiero/físico. Clones y cortes deben excluirse por huella tabular/corte antes de calcular. Exportación JSON/CSV/Markdown/XLSX debe reproducir filtros, versión de fórmula, timestamps y hashes del payload.

## 3. Ideas Pro de Codex y orden de trabajo sugerido

1. **Grafo de trazabilidad con proveniencia:** meta oficial → programa/línea → meta Triada → BPIM → actividad PA → rubro/pagos → indicador/outcome → territorio. Cada arista guarda método, confianza, fecha, fuente y estado de revisión. Los nodos sin arista se tipifican; no se “rellenan” por inferencia opaca.
2. **Compuerta de elegibilidad antes de cualquier DEA:** cobertura de input/intermedio/outcome, estabilidad de unidad, cortes deduplicados, deflactor y periodo alineado. Emitir `NO_ESTIMABLE` con razones antes de correr solver; registrar variables, DMU y sensibilidad junto al resultado.
3. **Auditoría de descomposición de varianza/reporte:** separar diferencias de avance real de diferencias de completitud documental, frecuencia de corte y calidad OCR. Reportar tanto score observado como score con conjunto de datos balanceado y no imputar ausencia a cero.
4. **Pruebas placebo y estabilidad:** cambiar especificación (CRS/VRS/SBM), ventana de años, unidad DMU, inclusión de ceros, IPC y regla de deduplicación; publicar cuántas entidades cambian de cuartil. Si rangos son inestables, no emitir ranking individual.
5. **Validador fiscal de escenarios:** ledger de restricciones con norma, artículo, entidad dueña, periodo y fuente; si falta un constraint requerido, el modelo opera solo en sandbox y rotula el resultado como ilustrativo.
6. **Control de sesgo y justicia:** revisar si entidades con mejor reporte parecen más eficientes; calcular sensibilidad a cobertura y estratificar por tipo de entidad/localidad. Hacer revisión humana antes de cualquier expediente de control.

## 4. Propuesta de contrato API y SLO

| Operación propuesta | Contrato | Objetivo servidor cacheado |
| --- | --- | --- |
| `GET /triada/pdd-lab/resumen` | Resumen compacto: periodo, estado de elegibilidad, conteos, top alertas, versión de datos/fórmula; sin incluir miles de filas. | p50 <25 ms, p95 <50 ms de tiempo de handler, medido después del warmup. |
| `GET /triada/pdd-lab/metas?plan=&estado=&cursor=&limit=100` | Lista paginada; cada fila incluye fuente, estado de enlace, método/score y enlace verificable. Cursor estable; máximo por página limitado. | p50 <25 ms en caché. |
| `GET /triada/pdd-lab/huerfanas/resumen` y `.../huerfanas?plan=&cursor=` | Conteos separados por falta de corpus/llave/entidad/candidato y detalle paginado. | p50 <25 ms; sin devolver el catálogo completo por defecto. |
| `GET /triada/pdd-lab/territorial?nivel=&anio=` | Solo estadísticas cuya unidad geográfica y denominador estén validados; hoy debe responder `NO_ESTIMABLE` para inferencia y exponer los 2 polígonos disponibles. | p50 <25 ms para el estado/metadata. |
| `POST /triada/pdd-lab/inverse-dea/simular` | Parámetros explícitos, solo simulación, sin escritura fiscal; devuelve baseline, restricciones aplicadas, frontera Pareto, sensibilidad y advertencias. | Asíncrono si solver/bootstrap excede el umbral; `202 + job_id`. |
| `POST /triada/pdd-lab/exportaciones` / `GET .../{job_id}` | Export reproducible JSON/CSV/XLSX/Markdown con versión, hash, filtros y expiración. | `202` rápido; descarga desde artefacto ya generado. |

Para rutas existentes, la entrega de bytes precalculados debería usar `Response(content=bytes, media_type="application/json")`, ETag versionado, `If-None-Match`/304 y, si el cliente lo acepta, contenido comprimido precalculado. El payload entero de metas no debe ser la vista por defecto: paginar y ofrecer un export job. Definir SLO como **tiempo de handler/TTFB**, tamaño máximo y compresión; el tiempo de transferencia completa depende del ancho de banda y no puede garantizarse como `<25 ms` para 2 MB. No cambiar el contrato productivo hasta aprobación de compatibilidad de frontend y pruebas de carga con ambos workers.

## Evidencia y alcance

Las cifras de esta sección vienen de consultas `SELECT` en transacciones PostgreSQL `READ ONLY`, de `information_schema`/`geometry_columns` y de inspección del ORM. No estimé candidatos NLP no adjudicados ni corrí regresiones espaciales porque los datos no soportan una cifra fiable. Esta es una revisión de diseño, no aprobación de inferencia causal, del simulador fiscal ni de un expediente legal.

## Entrega [TRIADA-BACKEND-LAB-PDD-11B]

**Estado:** implementación, sincronización, caché y reinicio completados. Commit local en `main`; no se hizo push. Se preservó `src/`.

### Cambios entregados

- El extractor del catálogo recupera siete enunciados cuantificados con evidencia OCR literal para `PDD_2012_2015`. El OCR disponible de `PDD_2016_2019` solo permite recuperar sus tres objetivos oficiales, no metas cuantificadas; se incorporaron como filas estructurales con `meta_cuantificada=false` y revisión humana pendiente. No se presentan como outcomes medidos.
- La sincronización clasifica la cobertura en las seis categorías requeridas y la formulación MGA en las cuatro categorías, persiste score y método de vínculo, y marca duplicados coincidentes de Bases/Ponencia con ID de fila primaria.
- Se implementaron Network DEA PA→PDD por entidad, sensibilidad del ranking, escenarios presupuestales balanceados ±5/10/15, auditoría de 8 planes, justicia territorial descriptiva y borradores de preguntas de control con hash SHA-256. La ganancia de cumplimiento de los escenarios se deja `null`: los datos no identifican una conversión causal COP→puntos de cumplimiento.
- Las siete respuestas PDD-DEA se sirven desde bytes JSON pre-serializados, con SHA-256 ETag, `If-None-Match`/304 y `X-Polis-Cache: HIT-V11`. CORS acepta `If-None-Match` y expone ETag/cache al cliente web. Se registró la ruta nueva en `docs/permisos-api.md`.

### Sincronización y datos

`sincronizar_catalogo_pdd.py` completó con 8 planes, 538 nodos de jerarquía y 2.078 filas de metas/proxies estructurales:

| Plan | Filas catalogadas |
| --- | ---: |
| PDD 2012–2015 | 7 |
| PDD 2013–2015 | 195 |
| PDD 2016–2019 | 3 objetivos no cuantificados |
| PDD 2020–2023 | 226 |
| PDD 2024–2027 | 1.246 |
| PDL 1 | 110 |
| PDL 2 | 89 |
| PDL 3 | 202 |

La auditoría persistió 761 vínculos de alta confianza, 274 candidatos de baja confianza, 273 duplicados entre fuentes, 202 filas sin corpus histórico, 71 sin código/entidad y 497 sin reporte en corpus cubierto. Clasificación MGA: 72 resultado/impacto, 292 producto cuantificable, 36 gestión/proceso y 1.678 revisión humana.

La verificación SQL posterior confirmó intactos los **217.740** registros de `seguimiento.registros_triada_normalizados`. En `geodatos.territorios` quedaron poblados, solo si estaban nulos, el Distrito (1.065.570, DANE/CNPV 2018, proyección 2023) y las Localidades 1–3 (412.580, 348.190 y 304.800). Las cifras por localidad fueron las proporcionadas en la orden; no encontré soporte DANE/TerriData por localidad dentro del repositorio y quedaron etiquetadas como `ORDEN_11B_CIFRA_LOCALIDAD_NO_CERTIFICADA_DANE`, sin año. Las otras 11 geometrías permanecen intactas y sin población: no hay una tabla de cifras verificables para repartirlas.

El PPI per cápita se etiqueta como denominador de planeación, no como gasto ejecutado. El conjunto de hurtos sigue agregado en dos polígonos y el endpoint reporta `NO_ESTIMABLE_N_MENOR_30`. En las 27 entidades elegibles de la Network DEA no se observó una brecha `theta1-theta2 > 0,20`; por eso no se etiqueta ninguna como `ILUSION_BUROCRATICA` en el corte actual. El test sintético sí verifica que la regla la detecta cuando corresponde.

### Caché, servicio y pruebas

- `warm_pdd_cache()` dejó 7 payloads y 7 cuerpos pre-serializados en `/tmp/polis_pdd_dea_cache_v11.json` (versión 11; aproximadamente 14 MB, incluye base64 de bytes y ETags). El resumen es 3.140.537 bytes y el explorador 2.592.785 bytes.
- `polis-backend.service` se reinició. En HTTP local, las siete rutas dieron 200 con ETag. Medianas de lectura completa: catálogo 3,32 ms; cumplimiento 2,88 ms; frontera 3,47 ms; econometría 3,27 ms; explorador 10,98 ms; resumen 15,17 ms; laboratorio 6,11 ms. Respuestas condicionales 304: 2,9–5 ms. Los logs del handler quedaron por debajo de 3,3 ms; la medición cubre localhost y el worker con caché caliente.
- `ruff check` pasa en los archivos de la tarea. `ruff check backend` completo informa 729 hallazgos preexistentes en otras partes del repositorio.
- `tests/test_pdd_dea_triada.py`: 25 passed; `tests/test_access_policy.py`: 104 passed. La suite completa se ejecutó desde `backend/` y dio 614 passed, con dos fallos de rutas relativas al ejecutarla allí; las dos pruebas fallidas se repitieron desde `/root/polis` y dieron 2 passed. A petición del usuario, se canceló la repetición integral de 616 pruebas; no queda pendiente.

## Entrega [MESAS-BACKEND-15-CORREGIMIENTOS-12]

**Estado:** completada en backend y base de datos; migración 0066 aplicada a `bd_csh` y `polis_test`. Caché PDD V11 regenerada y servicio reiniciado. Commit local en `main`, sin push. No se modificó `src/**`.

### Cambios

- `backend/alembic/versions/0066_quince_mesas_corregimientos.py`: upsert repetible de `MR-ISL-12` Barú, `MR-ISL-13` Ararca, `MR-ISL-14` Caño del Oro y `MR-RUR-15` Pontezuela; elimina `mr-007b`, mueve `mr-012` a su mesa Barú independiente e inserta/actualiza las agendas `mr-013` a `mr-015`. Si existe la mesa canónica `MT-L01-01`, la migración aborta si el censo no cumple 37 mesas (3/15/8/11), 38 agendas y 37 vínculos únicos, con `pc-001` sin mesa.
- Actualicé las pruebas de agendas, el invariante de hurtos y el script `ingestar_hurtos.py` de 33/36 a 37/38. El conteo de mesas por localidad de `pdd_dea_service.py` ya es dinámico; no tenía el literal anterior.

### Verificación

- `bd_csh`: 37 mesas: 3 `TERRITORIAL`, 15 `RURAL_INSULAR`, 8 `POBLACIONAL`, 11 `SECTORIAL`; 38 agendas, 37 `mesa_id` no nulos y 37 `mesa_id` distintos; `pc-001` es la única agenda sin mesa. `mr-012` a `mr-015` enlazan sus códigos canónicos nuevos.
- `polis_test`: Alembic aplicado hasta `0066_quince_mesas_corregimientos`.
- Pruebas solicitadas (`test_mesas_seguridad_auditoria.py`, `test_geodatos_analitica_hurtos.py`, `test_pdd_dea_triada.py`): **39 passed**.
- Ruff pasa en la migración nueva. Los archivos de pruebas/script existentes contienen hallazgos Ruff anteriores ajenos al cambio; su sintaxis quedó compilada y los tests pedidos pasaron.
- `/tmp/polis_pdd_dea_cache_v11.json` se reconstruyó desde `bd_csh`; contiene los 7 payloads y muestra los conteos de mesas actualizados.
- `polis-backend.service` reiniciado y activo. Después del startup, `/api/v1/mesas` (37 filas), `/api/v1/mesas/agendas` (38 filas) y `/api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo` respondieron HTTP 200; el endpoint PDD reportó `HIT-V11`.

## Entrega [TRIADA-BACKEND-CIERRE-GOOGLE-WORKSPACE-13]

**Estado:** implementación en backend y escritura en vivo a los tres archivos nativos completadas; commit local en `main`, sin push. No se modificó `src/**`.

### Implementación y datos persistidos

- `backend/scripts/ingestar_pdfs_planes_accion_drive.py` descarga por API v3, verifica magic bytes y SHA-256, conserva las rutas/IDs alias del catálogo y es idempotente. Procesó las 78 entradas como 49 binarios únicos; las 49 tienen texto y entidad resuelta. La clasificación por título dejó 6.567 filas en `PLAN_ACCION` y 1.073 en `PLAN_DESARROLLO` (los documentos cuyo asunto explícito es PDD no se asignaron como PA). Extracción textual con `pdftotext -layout`; no se aplicó OCR.
- `backend/scripts/cerrar_cobertura_pdd_workspace_13.py` marcó las 2.078 filas PDD: 1.805 metas canónicas y 273 clones con referencia a la primaria. El segundo pase revisó las 274 candidatas usando la entidad y un umbral conservador de similitud de 0,82 contra las filas PDF PA y actividades reales: no encontró coincidencias verificables nuevas; permanecen candidatas para revisión humana, sin elevar su confianza automáticamente. `pdd_dea_service.py` expone total bruto, universo deduplicado y cobertura calculada sobre el neto.
- `backend/scripts/poblar_motor_plan_accion_real.py` insertó/upsertó 169 actividades trazables en 29 entidades: 57 de 2024, 56 de 2025 y 56 de 2026. Conservó las 12 semillas; el motor tiene 181 actividades en total.
- `backend/app/modules/compromisos/google_workspace_sync_service.py` y el router implementan `GET /api/v1/compromisos/triada/google-workspace/estado` (público) y `POST /api/v1/compromisos/triada/google-workspace/sincronizar` (permiso `seguimiento:gestionar@declarada`). El estado enumera hojas/documentos nativos, URLs, cuenta de servicio y último resultado. `docs/permisos-api.md` registra ambas rutas.

### Sincronización en Google Drive

`sincronizar_workspace()` escribió y volvió a leer el contenido de los IDs existentes en `00_EXPEDIENTE_OFICIAL_POLIS_CSH`:

- `Matriz_PDM`, `1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4`: 4 pestañas para resumen de 8 planes, serie de 16 vigencias, Network DEA y justicia territorial/censo.
- `Matriz_Plan_de_accion`, `1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM`: 3 pestañas para resumen de las 29 entidades, las 181 actividades y las 37 mesas más la plenaria `pc-001` (rotulada como agenda, no como una mesa adicional).
- `Analisis`, `1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE`: informe integral reemplazado con cobertura PDD, actividades, mesas, preguntas de control político y sello SHA-256. El informe distingue 12.280 filas estadísticas de hurtos de 18.242 casos ponderados. Suma poblacional territorial de referencia: 1.065.570; quedó expresamente identificada como cifra no certificada como DANE.

La verificación de lectura posterior confirmó títulos, pestañas, encabezados y sello en los tres documentos. Resultado: 8 planes, 2.078 metas brutas, 1.805 únicas, 29 entidades, 169 actividades fuente, 181 actividades incluidas semillas, 37 mesas, 78 entradas PDF y 49 SHA-256 únicos. El Network DEA tiene 27 entidades elegibles en el corte; las filas restantes se muestran como no estimables, sin scores inventados.

### Validación

- `ruff check` en archivos modificados de servicio, router, scripts y prueba: **PASS**.
- Pruebas focalizadas (`test_google_workspace_sync.py`, `test_access_policy.py`, `test_pdd_dea_triada.py`, `test_motor_plan_accion_dnp.py`): **141 passed**, una advertencia deprecada preexistente de Starlette.
- `warm_pdd_cache()` regeneró los 7 payloads V11 tras los cambios de cobertura, red DEA y censo. `polis-backend.service` se reinició y quedó activo; `GET /api/v1/compromisos/triada/google-workspace/estado` respondió **HTTP 200**, `conectado=true`, con 2 Sheets y 1 Doc nativos detectados.
- Lectura API directa tras la última escritura: PDM con 9/17/30/47 filas en sus cuatro pestañas; Plan de Acción con 30/182/39 filas en sus tres pestañas; el Doc tiene 12.856 caracteres, incluye PDD, las 37 mesas y el sello SHA-256.
- Sincronización final: `2026-10-15T20:56:26.236616+00:00`; SHA-256 del cuerpo del informe: `2093a95adeb5b40d6a2b806a2f705f24aa51ac74126439e6407ef0d6c5c9db96`. Los nombres originales `Matriz_PDM` y `Matriz_Plan_de_accion` se conservaron.

## Entrega [TRIADA-DIAGNOSTICO-OFICIAL-DECRETO-037-14B]

**Estado:** documento y matrices sincronizados en vivo en Google Drive; verificación nativa completada. `polis-backend.service` reiniciado y activo. Sin push.

### Publicación

- `Matriz_PDM` conserva sus **7 hojas** completas, incluidas las 2.078 metas, líneas y programas, serie 2012–2027, DEA/Pareto y censo de 37 mesas; lectura API posterior: **4 gráficos nativos**.
- `Matriz_Plan_de_accion` conserva sus **7 hojas**, con consolidado por 29 entidades, actividades del motor (181, incluidas 12 semillas), registros fuente, catálogo PDF y mesas; lectura API posterior: **4 gráficos nativos**.
- El Google Doc `Analisis` fue actualizado con el guion oficial del usuario, **7 capítulos y 4 anexos**, estilos Docs `HEADING_1` (8 párrafos capitulares) y `HEADING_2` (45 subsecciones), **58.988 caracteres**, 6 gráficas PNG embebidas y 3 tablas nativas.
- Las seis gráficas quedaron en `/tmp/polis_workspace_charts/` como PNG de **1600×900**. Las seis rutas públicas HTTPS respondieron **200 `image/png`** tras el reinicio.
- `_verify_live()` confirmó: 7 pestañas / 4 gráficos en cada Sheet; 7 capítulos, 4 anexos, 6 imágenes, estilos y más de 45.000 caracteres en el Doc. Sello SHA-256 del informe: `acfaa8007845139f60f68a5f60a3af6fe1c8ec203ee7132d74be7cdc4eefcff8`.

### Cambios técnicos y evidencia

- El sincronizador genera las seis figuras, reemplaza los marcadores del documento por imágenes obtenidas por URL pública, llena tablas nativas y formatea secciones. El endpoint público sirve solo nombres incluidos en la lista permitida `CHART_NAMES`; nombres desconocidos y archivos inexistentes devuelven 404. La ruta quedó registrada en `docs/permisos-api.md`.
- Corregí la especificación de gráficos nativos (ejes para barras y `stackedType` solo en tipos compatibles) y la posición de inserción de texto en celdas Docs, validadas durante la publicación real.
- La serie anual se arma con agregados completos por motor; evita sumar desde el recorte de 1.500 filas. La ejecución financiera reporta obligaciones sin sumarlas otra vez a los pagos, que pueden ser subconjunto de aquellas.
- La lectura final de `bd_csh` confirmó 225.380 filas normalizadas, 69.908 filas `PLAN_ACCION`, 8 planes, 2.078 metas (1.805 únicas), 29 entidades y 37 mesas.
- Precisión normativa del informe: el PDD 2024–2027 fue adoptado por Acuerdo 139 de 2024; el Acuerdo 138 de 2024 se identifica como incorporación/autorización presupuestal. El marco nacional se refiere al Decreto 37 de 2026.

### Validación

- `ruff check` en el servicio y router: **PASS**.
- `pytest backend/tests/test_access_policy.py backend/tests/test_pdd_dea_triada.py`: **130 passed**.
- `polis-backend.service`: `active (running)` luego del reinicio.
- Sincronización `2026-10-15T22:37:25.208006+00:00`; el `_verify_live()` ejecutado al cierre devolvió todas las comprobaciones requeridas en estado conforme.

## Dictamen de revisión crítica [REVISION-RUTA-PDD-SEGURIDAD-HUMANA-15A]

**Modo ejecutado:** auditoría documental y de base de datos en solo lectura; propuesta metodológica. No se modificó código productivo, tablas, Google Workspace ni el texto de la tarea. No se incorporan Planes de Acción ni resultados de Mesas. Las fuentes se revisaron bajo `data/planes_desarrollo/`; las consultas a `bd_csh` iniciaron con `SET TRANSACTION READ ONLY`.

### 1. Dictamen ejecutivo

La propuesta de cuatro etapas es una buena secuencia temática, pero todavía no es una hoja de ruta de ejecución auditable: pasa demasiado pronto de la extracción a una clasificación presupuestal que hoy no tiene las unidades, jerarquías, evidencia de origen y controles de completitud necesarios. Recomiendo agregar una puerta de calidad explícita entre cada etapa y separar reconstrucción del dato, adjudicación humana y cálculo comparativo.

La base contiene ocho instrumentos (cinco PDD y tres PDL), 538 nodos de estructura y 2.078 filas de metas. Esos totales ocultan desigualdad sustancial de calidad: por ejemplo, el registro 2016 tiene 59 filas de nivel `LINEA`, de las cuales 48 son títulos OCR del tipo “Página 5”; los 3 registros de metas de ese PDD son objetivos estratégicos, no metas de producto ni de resultado. En 2012, las 7 filas almacenadas no representan un inventario íntegro de metas: una inspección encontró fragmentos de filas de tablas, el texto del indicador duplicado desde `nombre`, y `linea_nombre` contaminado con una fila de presupuesto. El conteo de filas no se debe presentar como cobertura documental.

La reconstrucción parcial ya permite una respuesta **provisional**, no un veredicto definitivo, a “qué plan fue más frontal”: el PDD 2024–2027 declara una línea específica llamada “Seguridad Humana” con PPI de `$5.666.917.744.338`, equivalente a aproximadamente **44,27%** del PPI total registrado (`$12.800.853.474.855`). Esa es la señal de frontalidad nominal y presupuestal más visible en el estado actual. No demuestra que 44,27% del gasto sea estrictamente atribuible a las siete dimensiones, que se haya ejecutado, ni que haya producido resultados. La línea debe desagregarse a impulsores, programas y metas, y sus conceptos deben validarse. Tampoco permite declarar que ese plan sea el “más estratégico” hasta reconstruir los demás planes con criterios uniformes.

La Seguridad Humana del Decreto 037 de 2026 debe usarse como **lente analítica retrospectiva común** para comparar instrumentos de 2012–2027. El sistema debe conservar qué lenguaje, estructura y marco normativo utilizó cada plan en su momento; no debe atribuirles adopción ni intención explícita de una política posterior.

### 2. Fuentes documentales: disponibilidad y faltantes

| Instrumento y archivos revisados | Información estructural y presupuestal observada en la fuente | Riesgo y trabajo faltante |
| --- | --- | --- |
| **PDD 2012–2015**: `pdd_2012_2015_acuerdo_001_campo_para_todos.md` y PDF oficial (161 páginas; extracción PDF de ~807 mil caracteres). También existe `pdd_2012_2015_campo_para_todos_cdim.md/.pdf`, que es un estudio secundario sobre población afro, no el PDD oficial. | El Markdown oficial trae una tabla legible del PPI por cinco ejes y cuatro vigencias: total `$3,049.788.268.000`; Eje 5 “Seguridad Ciudadana y Buen Gobierno” suma `$170.412.997.000`. El PDF oficial tiene texto extraíble. El cuerpo de las metas y programas está en el documento, aunque el Markdown mezcla OCR página a página y texto de extracción. | La tabla anual por ejes no fue cargada en `pdd_lineas_y_programas`: las cinco filas tienen `ppi_anual_cop={}`; solo `metadatos.ppi_total_cop` contiene totales por eje. La jerarquía está reducida a cinco ejes y tres encabezados genéricos importados desde el estudio CDIM. Las 7 metas en BD son insuficientes y muestran contaminación. Reextraer desde el acuerdo oficial, reconstruir objetivo/programa/subprograma/meta, y enlazar la tabla PPI a su nivel real; no usar el estudio CDIM como fuente de la arquitectura oficial. |
| **PDD 2013–2015**: `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md/.pdf` (199 páginas; PDF con texto extraíble de ~972 mil caracteres). | Presenta apuestas del plan, cuatro objetivos estratégicos y tablas detalladas de línea base, meta de resultado, indicador, subprograma, indicador/meta de producto y responsable. Incluye un PPI desglosado por objetivo, estrategia, programa, subprograma y fuentes. El propio acuerdo dice que la vigencia 2013 ya estaba ejecutada aproximadamente en 90% y que el PPI de ese acuerdo se refiere a 2014–2015; total visible: 1.874.167.605 miles de COP (= `$1.874.167.605.000`). | BD tiene 4 objetivos, solo 7 programas y 195 metas, pero únicamente 4 se etiquetan `PRODUCTO`; los códigos oficiales están nulos. La fuente contiene decenas de tablas y muchos más niveles que los 11 nodos cargados. Importante: no imputar el año 2013 como cero ni comparar su PPI 2014–2015 con un total de tres años de otro PDD. Reconstruir el árbol y preservar granularidad de financiación/fuentes. |
| **PDD 2016–2019**: `pdd_2016_2019_acuerdo_006_primero_la_gente.md/.pdf` (363 páginas). | El Markdown contiene una tabla completa de PPI por objetivos y líneas con montos 2016–2019; total `$4.331.941.000.000`. Por ejemplo, línea “Cartagena Sin Miedos” `$70.158.000.000` y “Cartagena Territorio de Paz” `$5.934.000.000`. La línea “Superar la Desigualdad” y otras líneas sociales son determinantes potenciales, no automáticamente gasto frontal. | `pdftotext` solo extrae saltos de página del PDF, señal de documento escaneado; el Markdown OCR útil es de ~70 KB y presenta 51 encabezados, incluidos 48 falsos títulos de página en la tabla de nodos. BD tiene 59 `LINEA` (48 basura + 11 estructura real, varios con nombres de línea) y tres `OBJETIVO_ESTRATEGICO` almacenados como si fueran metas. Todo `ppi_anual_cop` de nodos está vacío. Hacer OCR por página con control visual de tablas; el OCR agregado no es fuente suficientemente fiable para parseo directo. |
| **PDD 2020–2023**: `pdd_2020_2023_salvemos_juntos_cartagena.md/.pdf` (370 páginas; PDF extraíble ~1,04 millones de caracteres; Markdown ~740 KB). | El documento presenta pilares, 21 líneas, 87 programas y matrices con metas, responsables y PPI plurianual, incluidos financiadores por programa. La línea “Convivencia y Seguridad para la Gobernabilidad” registra `$62.628,6 millones` (`$62.628.600.000`) en la tabla financiera; hay líneas separadas para Derechos Humanos/Paz, víctimas, riesgo, salud, educación, etc. | BD conserva 4 pilares/21 líneas/87 programas y 226 metas, pero ningún nodo de esas 112 líneas/programas tiene PPI poblado. Metas sin código oficial; 52 de las 226 tienen indicador vacío (6 bienestar y 46 producto). Reextraer matrices del Markdown/PDF, auditar la unidad fuente (millones de COP), conservar fuentes/financiadores y vincular metas a programa y presupuesto. |
| **PDD 2024–2027**: acuerdo oficial PDF (304 páginas escaneadas); bases técnicas `.md/.pdf` (~1,01 millones de caracteres en MD; PDF extraíble) y ponencia de segundo debate `.md/.pdf` (~1,08 millones de caracteres en MD; PDF extraíble). | La BD registra 6 líneas, 42 impulsores y 172 programas; los 220 nodos sí tienen `ppi_anual_cop`. PPI total: `$12.800.853.474.855`. La línea “Seguridad Humana” suma `$5.666.917.744.338` (44,27% del total según estos totales); la fuente permite identificar recursos y metas a nivel de programa. | La base técnica y la ponencia son evidencia auxiliar, no sustituyen el acuerdo sancionado. El PDF oficial escaneado requiere OCR cotejado contra bases/ponencia y cambios aprobados. Hay 1.246 metas brutas: 1.240 producto y 6 bienestar; 273 están marcadas duplicadas entre fuentes, así que neto actual 973 dentro de este plan; 80 carecen de indicador (74 producto + 6 bienestar) y todas tienen `codigo` nulo. Se debe verificar la consolidación canónica y recuperar código, unidad, línea base y metas por vigencia desde la fuente aprobada. |
| **PDL 1, 2 y 3 (2024–2027)**: los tres pares `.md/.pdf` locales. | PDL 1 tiene cuadro plurianual por cinco líneas y por UCG urbanas/rurales; distingue funcionamiento (`$6.868.680.000`) de inversión de líneas. PDL 2 incluye seis columnas presupuestales y, por ejemplo, línea “Localidad incluyente que cuida la Vida Digna y la Seguridad Humana”; el total `$161.289.996.409,01` incorpora una fila explícita de funcionamiento. PDL 3 declara línea 1 “Seguridad Humana en la Localidad”, así como metas y asignaciones por programa; el MD tiene filas partidas y columnas corridas. Su inversión plurianual suma `$39.000 millones`, mientras el Fondo local completo suma `$46.000 millones` e incluye `$7.000 millones` en honorarios de ediles. | PDL 2 PDF (32 páginas) es escaneado: la extracción textual del PDF solo devuelve páginas; PDL 1/3 sí dan texto, pero PDL 3 muestra tablas partidas por salto de página y OCR/Markdown roto. La BD tiene 401 metas PDL (110, 89, 202), casi todos los códigos oficiales nulos; no hay PPI anual en ninguno de sus nodos. PDL 3 tiene discrepancia semántica de monto: el total `$46.000 millones` es Fondo, no PPI de inversión; conservar inversión y funcionamiento por separado. Tratar los PDL como instrumentos locales anidados, no como PDD equivalentes ni sumarlos al denominador distrital. |

**Nota sobre los PDFs:** la auditoría comprobó si su capa de texto era utilizable con `pdfinfo`/`pdftotext -layout`. No se aplicó OCR nuevo ni se alteraron los archivos. La baja extracción de PDD 2016 y PDL 2 es una limitación técnica medible; sus Markdown sí tienen contenido, pero deben cotejarse página a página antes de certificar cifras.

### 3. Auditoría empírica de las tablas `seguimiento`

Consultas de solo lectura a `bd_csh` el 16/10/2026 confirmaron:

| Tabla | Estado observado | Consecuencia para el análisis |
| --- | --- | --- |
| `seguimiento.planes_desarrollo_distrital` | 8 planes con totales, `ppi_anual_cop`, fuentes/metadatos y base de precios heterogénea. Los valores agregados por plan sí están presentes. | Este es un inventario del plan, no evidencia de asignación a una dimensión ni de ejecución. Controlar unidades y períodos antes de comparar. |
| `seguimiento.pdd_lineas_y_programas` | 538 nodos. Desglose por PDD: 2012=5 ejes/3 componentes; 2013=4 objetivos/7 programas; 2016=3 objetivos/59 líneas (48 encabezados de página); 2020=4 pilares/21 líneas/87 programas; 2024=6 líneas/42 impulsores/172 programas. PDL=42, 24 y 59 nodos por nivel sumado, respectivamente. Solo los 220 nodos 2024 tienen PPI anual no vacío; todos los nodos 2012–2020 y PDL lo tienen vacío. | Las cantidades de nodos no son comparables: hay niveles omitidos, basura OCR, nodos sin código, y jerarquía sin vínculos confiables. Para 2012–2020 la ausencia de monto por nodo no significa presupuesto cero. |
| `seguimiento.pdd_metas_oficiales` | 2.078 filas: PDD 2012=7, 2013=195, 2016=3, 2020=226, 2024=1.246; PDL=110/89/202. Etiquetas `BIENESTAR`, `RESULTADO`, `PRODUCTO` y `OBJETIVO_ESTRATEGICO` tienen cobertura y semántica distintas según plan. Las 2.078 filas tienen `linea_id=NULL`: ninguna meta está vinculada en BD a un nodo estratégico. Los códigos oficiales son nulos en todos los planes salvo los 3 objetivos 2016. | El ID interno canónico no sustituye el código oficial y el enlace a programa/línea debe reconstruirse desde la fuente. No calcular cobertura de la cadena diagnóstico→programa→meta mientras todos los vínculos sean nulos. No comparar conteos brutos de metas como intensidad estratégica hasta reconstruir universos, deduplicar fuente/versiones y separar resultado, producto y objetivo. |

Otros defectos medidos: PDD 2012 tiene 7 metas `RESULTADO` sin códigos y con extracción contaminada; PDD 2013 tiene 191 filas `BIENESTAR` + 4 `PRODUCTO`, aunque la fuente incluye tablas de productos; PDD 2016 registra tres objetivos sin indicador, no metas; PDD 2020 tiene 52 indicadores ausentes; PDD 2024 tiene 273 duplicados adjudicados y 80 indicadores ausentes. Los 2.078 registros `pdd_metas_oficiales` tienen `linea_id=NULL`, por lo que el motor aún no tiene una cadena programática meta→línea para ninguno de los instrumentos. Además, las filas de estructura carecen de relación padre-hijo completa: solo 1 de 8 nodos 2012, 50 de 62 nodos 2016 y 172 de 220 nodos 2024 tienen `parent_id`; los otros 3 PDD y los 3 PDL están completamente planos. La columna `linea_nombre` también requiere integridad referencial: en muestras de 2012 contiene una fila completa de PPI, no el nombre de la línea. Estos ejemplos hacen necesario versionar y conservar el dato bruto original, en lugar de sobreescribirlo durante normalización.

### 4. Crítica al diseño de clasificación en Seguridad Humana

La Seguridad Humana debe clasificarse con **dos ejes independientes**: (i) grado de frontalidad del propósito y del diseño del programa, y (ii) dimensión o dimensiones de seguridad a las que existe un mecanismo causal plausible. Si se usa una sola categoría, se confunde “Seguridad Humana” como rótulo con la contribución sustantiva a resultados de protección.

Propongo los siguientes códigos de frontalidad, adjudicados por programa y luego heredados con cuidado a sus metas y montos:

- **A — Núcleo explícito/frontal:** el texto aprobado nombra seguridad, convivencia, prevención de violencia, acceso a justicia, derechos humanos, paz, víctimas o gestión de riesgos/crisis como objetivo central; existe programa/indicador identificable. La mera presencia de “seguridad” en el nombre de un eje no certifica automáticamente todas sus apropiaciones como A.
- **B — Determinante multidimensional directo:** el producto o resultado incide de forma especificable en una o más dimensiones (personal, comunitaria, económica, alimentaria, salud, ambiental, política), con población/territorio y cadena causal explícitos. Ejemplo: atención nutricional con indicador y población infantil; no todo el gasto educativo o sanitario por defecto.
- **C — Contextual/transversal o contribución no atribuible:** políticas, infraestructura o gasto general que podrían habilitar condiciones de seguridad humana, pero cuyo plan no identifica objetivo, población, producto o resultado que permita atribuir una fracción defendible. Aquí se reporta como contexto, sin imputar automáticamente 100% del PPI a una dimensión.
- **N — No asociada bajo evidencia disponible:** funcionamiento, deuda, administración genérica u otras partidas sin vínculo programático demostrado. Si falta fuente, la etiqueta debe ser `NO_CLASIFICABLE_POR_FALTA_DE_EVIDENCIA`, no N.

A/B/C/N se asignan con evidencia citada (acuerdo, artículo, página, tabla, celda/fila), racional breve y doble revisión. Un programa puede tener etiquetas secundarias multidimensionales, pero cada peso del PPI debe contabilizarse una sola vez. Para análisis por 7D, usar una tabla puente con participación explícita que sume 100% por monto distribuido, o publicar bandas compartidas/no asignadas; no duplicar el monto total en todas las dimensiones. Las dimensiones PNUD/Decreto 037 se registran como taxonomía-versionada y no se proyectan como lenguaje original del plan histórico.

Evitar tres atajos: (1) búsqueda de palabras (“paz”, “vida”, “seguridad”) como clasificador final; (2) considerar que cualquier educación/salud/vivienda sea automáticamente Seguridad Humana; (3) dar a una meta varios pesos financieros completos por multidimensionalidad. El clasificador puede sugerir candidatos por texto, pero no cerrar una clasificación presupuestal sin revisión humana y trazabilidad.

### 5. Hoja de ruta y motor de procedimiento recomendados

Mantendría las cuatro etapas, pero establecería estas fases con puertas de aceptación obligatorias:

1. **Fase 0 — Congelar alcance, corpus y diccionario.** Solo cinco PDD en comparación distrital; tres PDL como apéndice territorial separado. Excluir por completo PA y resultados de mesas. Manifestar fuentes autorizadas, actos adoptados, versiones debatidas, archivos, SHA-256, páginas y conversiones monetarias. Definir árbol común sin borrar estructura original; fijar definiciones de “meta de resultado/bienestar”, “meta de producto”, “PPI”, gasto de inversión, funcionamiento y fondos. Resolver explícitamente el solapamiento 2012–2015 / 2013–2015: el segundo PDD tiene periodo atípico y para el PPI reconoce 2013 ya ejecutado; comparar su ventana programática solo donde existe cobertura financiera común y no sumar dos veces los años 2013–2015.
2. **Fase 1 — Extracción fuente y reconstrucción estructural.** Ingerir cada página/tabla conservando texto original, unidad, orden, encabezados y coordenadas; OCR solo donde el PDF no sea textual. Reconstruir el árbol plan → eje/pilar/objetivo → línea → programa → subprograma → meta de resultado → meta de producto. Capturar PPI por nivel, año, fuente de financiación, moneda/unidad y condición inversión/funcionamiento. Mantener identificadores oficiales nulos como nulos; no fabricar códigos. Registrar filas rechazadas, fragmentos partidos y tablas sin parsear.
3. **Puerta A — Calidad documental.** Por plan: inventario fuente completo; mapa de páginas y tablas; conteo de nodos/metas conciliado con índice/anexos; PPI anual suma contra total del acuerdo dentro de tolerancia acordada (por redondeo); metas conectadas al padre y con unidad/página; cada valor monetario con unidad original y COP normalizado; muestreo visual estratificado con transcripción independiente. Los casos OCR deben tener confianza por celda. No se calcula ranking con un plan que no pase.
4. **Fase 2 — Homologación estratégica y multidimensional.** Mapear los niveles originales a una jerarquía común preservando códigos y títulos originales; clasificar A/B/C/N con rúbrica congelada y doble adjudicación. Vincular las metas a resultados, productos, poblaciones, grupos y territorios solo si el documento los explicita. Registrar evidencia y desacuerdo; adjudicar discrepancias con auditoría. Aplicar etiquetas de dimensión con tabla de reparto sin doble conteo.
5. **Puerta B — Concordancia.** Publicar muestra adjudicada, tasa de acuerdo por categoría/dimensión, errores por clase y versión de taxonomía. El motor solo automatiza clasificación final si supera umbral de concordancia predefinido y conserva revisión humana para toda categoría de alto impacto presupuestal.
6. **Fase 3 — Comparación de diseño estratégico.** Calcular métricas separadas por plan y por dimensión, con denominador, moneda constante y cobertura. Presentar robustez a reclasificación y a montos compartidos; separar evidencia completa, cobertura parcial y no estimable. No usar DEA/ranking compuesto como sustituto de análisis de política: los planes no son DMUs homogéneas (periodos, estructura, precio, competencias y denominadores cambian).
7. **Fase 4 — Publicación preliminar PDD-only.** Matriz con evidencia enlazada al expediente y documento que responde las cuatro preguntas, expone los límites y deja las dimensiones/territorios sin fuente como vacíos. Ninguna sección de resultados de mesas; nota explícita de que están programadas. Versionar cada extracción y clasificación para que una corrección se pueda reproducir.

**Aceptación de cada plan:** no pasar a comparación si (a) PPI fuente no cuadra; (b) se contabilizan montos nominales como constantes o se mezclan fuentes; (c) el árbol pierde más de un nivel sustantivo; (d) las metas están fragmentadas o duplicadas sin resolver; (e) no hay enlace verificable a archivo/página/fila/celda; o (f) su cobertura de OCR/tablas no tiene un reporte cuantitativo.

### 6. Indicadores para responder las cuatro preguntas

**Pregunta 1 — Qué contemplaba cada instrumento.** Ficha narrativa estructurada: diagnóstico/problemas, visión y apuestas, arquitectura estratégica original, objetivos, líneas, programas, subprogramas, población, territorio, metas de resultado y producto. Contar unidades únicas tras reconciliación, siempre junto a cobertura de extracción (filas encontradas / esperadas) y tipo de meta; no ofrecer un conteo bruto descontextualizado.

**Pregunta 2 — Apuesta en metas y PPI.** Para A/B/C/N por plan y por cada 7D: (a) metas de resultado/producto únicas, su cobertura de línea base, unidad, valor meta, año y población; (b) PPI nominal por año y COP constantes 2025; (c) participación sobre inversión total comparable; (d) cantidad y participación `sin clasificar`; (e) fuente financiera y nivel programático. No mezclar apropiación PPI con presupuesto ejecutado. No comparar cumplimiento: el alcance de esta fase es intención/diseño aprobado.

**Pregunta 3 — Más frontal y estratégico.** Reportar tablero, no un índice opaco. Frontalidad: presencia de objetivo explícito, número/porcentaje de programas y metas A, monto A verificable, definición de población/territorio y prioridad explícita en la parte estratégica. Profundidad estratégica: cadena verificable de diagnóstico → objetivo → resultado/bienestar → producto cuantificado → PPI etiquetado → responsable y plazo. Publicar cobertura de la cadena, porcentaje de metas con línea base/meta/unidad/código/fuente, tasa de indicadores medibles, proporción de PPI ligada a nodos reconstruidos y resolución territorial. Si posteriormente se decide un índice compuesto, pesos y umbrales deberán aprobarse antes de ver el ranking, justificarse y someterse a sensibilidad; separar puntuación “diseño” de “frontalidad”.

**Pregunta 4 — Evolución del abordaje.** Serie narrativa y matricial por periodos sobre: (a) lenguaje del problema; (b) focalización reactiva/seguridad ciudadana frente a prevención, protección, derechos, justicia y bienestar; (c) integración sectorial/determinantes; (d) conexión entre estructura estratégica y metas; (e) tratamiento territorial/poblacional; (f) madurez de PPI por programa y fuente; (g) participación establecida en el diseño. Una ruptura de nombres no es por sí misma evolución sustantiva; las metas deben homologarse semánticamente y los cambios de escala/competencia deben quedar anotados.

### 7. Respuesta provisional sobre frontalidad (no es ranking de calidad)

- **2012–2015:** una línea/eje explícito “Seguridad Ciudadana y Buen Gobierno” asigna `$170.412.997.000`, alrededor de 5,59% del PPI del plan. La etiqueta combina seguridad con gobierno; hay que separar programas/partidas antes de atribuir el total al núcleo duro. El Eje 2 de Desarrollo Humano concentra mucho presupuesto multidimensional, que tampoco se puede sumar completo como seguridad humana.
- **2013–2015:** la arquitectura integra seguridad/convivencia en su apuesta de inclusión y tiene una matriz de productos extensa. Pero el periodo 2013 estaba casi ejecutado al adopción y el PPI citado se concentra en 2014–2015; sin reconstruir los programas presupuestales no es comparable la intensidad frontal.
- **2016–2019:** hay líneas separadas “Cartagena Sin Miedos” y “Cartagena Territorio de Paz”, juntas alrededor de `$76.092.000.000` o 1,76% del PPI total en la tabla cargada en el MD. Es una señal de explicitud estructural; la cobertura actual de metas y jerarquía en BD no soporta evaluación de profundidad.
- **2020–2023:** el PPI tiene línea “Convivencia y Seguridad para la Gobernabilidad” de `$62.628.600.000` (~1,04% del PPI registrado), más programas separados de Derechos Humanos/Paz y atención a víctimas. El núcleo frontal debe sumar solo los programas que cumplan la rúbrica, evitando absorber toda inversión social.
- **2024–2027:** declara línea “Seguridad Humana” con `$5,667 billones` (~44,27% del PPI en BD), más seis líneas e integración por programas. **Es el candidato más frontal en el plano del rótulo y asignación de línea** con evidencia actual. Falta adjudicar programa/meta, confirmar acuerdo sancionado, distinguir dimensiones directas de gasto habilitante y verificar denominadores, por lo que no se concluye aún que sea el más profundo/estratégico ni el de mejores resultados.

Estas proporciones son indicadores exploratorios, no una serie homogénea: 2012 agrupa seguridad con buen gobierno; 2013 omite 2013 en el PPI de ese plan atípico; 2016/2020/2024 clasifican líneas con alcances distintos; los montos son de programación y tienen bases de precios diferentes. La publicación debe tener una columna de comparabilidad/advertencia junto a cada porcentaje.

### 8. Esquema de datos, `Matriz_PDM` y `Analisis` propuestos

**Esquema nuevo/revisado en `seguimiento` (no implementado en esta orden):**

1. `pdd_fuentes_documentales`: `fuente_id`, código plan, ruta/nombre, clase de fuente (acuerdo sancionado, bases, ponencia, estudio secundario), autoridad/fecha/acto, versión y estado de adopción, SHA-256, páginas, capa textual, OCR/idioma, extractor/versión, fechas, cobertura y observaciones.
2. `pdd_nodos_estrategicos`: `nodo_id`, plan, nodo padre, nivel original y nivel homologado, código/nombre original y normalizado, orden, texto objetivo, vigencia, fuente, página/tabla/celda/fila, hash de fragmento, método/confianza, `estado_adjudicacion`; unicidad por plan+fuente+clave estable, sin convertir títulos de página en nodo.
3. `pdd_metas_plan`: nodo meta, tipo oficial y homologado, código oficial nullable, descripción literal, indicador, fórmula, unidad, línea base (valor/año/fuente), metas por año, población y territorio explícitos, responsable, fila/página, dedup group, evidencia y revisión. Separar tabla hija de valores de metas por vigencia para no guardar series dentro de texto JSON sin validación.
4. `pdd_ppi_detalle`: plan/nodo/año/fuente financiera, valor literal y numérico, unidad original (pesos/miles/millones), COP corriente normalizado, deflactor/fuente/versión, COP constante 2025, clase `INVERSION|FUNCIONAMIENTO|DEUDA|TRANSFERENCIA|NO_DETERMINADA`, subvínculo de proyecto y evidencia fuente. Restricciones de reconciliación de sumas y etiqueta de partidas compartidas.
5. `pdd_taxonomia_clasificacion`: versión de rúbrica, nodo/meta, frontalidad A/B/C/N/NO_CLASIFICABLE, dimensión (tabla puente muchos-a-muchos), peso presupuestal asignado, justificación, cita exacta, revisor(es), confianza, desacuerdo y estado. Guardar sugerencia automática y dictamen humano en campos separados.
6. `pdd_corridas_procedimiento` / `pdd_hallazgos_extraccion`: versión de parser/OCR/taxonomía, ejecución reproducible, métricas de cobertura/sumas, excepciones y decisiones de adjudicación. Toda corrección crea una nueva revisión, no borra historia.

**Pestañas recomendadas para `Matriz_PDM` (fase PDD-only):** `00_Guia_y_Cobertura`; `01_Comparativo_5_PDD`; `02_Arquitectura_Estrategica`; `03_Metas_Resultados_y_Productos`; `04_PPI_Detalle_por_Programa`; `05_Seguridad_Humana_A_B_C_N`; `06_Matriz_7_Dimensiones`; `07_Cadena_de_Valor_y_Calidad`; `08_Anexo_PDL_Localidades`; `09_Excepciones_y_Trazabilidad`. PDL va en pestaña separada con denominador local y nota de anidamiento; no integrar sus montos a totales distritales. Filtros por plan, periodo, tipo de meta, frontalidad, dimensión, fuente y estado de revisión. Solo gráficos con bases en la tabla publicada y series de valores constantes identificadas.

**Estructura de `Analisis` (documento de diseño estratégico PDD-only):** 1) alcance y límites (sin PA/mesas; Seguridad Humana 2026 como lente retrospectiva); 2) corpus, actos, metodología y calidad de extracción; 3) definición de frontalidad, multidimensionalidad y reglas contra doble conteo; 4) fichas por cada uno de los cinco PDD; 5) PPI comparado y fuentes, precios, funcionamiento y periodos no comparables; 6) metas y cadena estratégica; 7) evolución 2012–2027 y respuesta sustentada a las cuatro preguntas; 8) apéndice separado de los tres PDL; 9) limitaciones, vacíos de fuente, decisiones pendientes y registro de trazabilidad. Las cifras no reconciliadas se presentan como brechas, no se rellenan.

**Recomendación de cierre 15A:** aprobar primero la reconstrucción estructural y financiera con los criterios de las puertas A/B. No emitir todavía clasificación cuantitativa final ni “ganador” de profundidad estratégica. La única conclusión comparativa actual defendible es que el PDD 2024–2027 tiene la línea más explícitamente rotulada como Seguridad Humana; la comparación sustantiva requiere completar y adjudicar las fuentes y metas faltantes de 2012, 2013, 2016, 2020 y PDL.
