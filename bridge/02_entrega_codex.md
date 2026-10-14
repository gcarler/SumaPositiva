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
