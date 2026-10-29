# Plan de consolidación del scaffold y la arquitectura de POLIS

**Fecha de elaboración:** 14 de octubre de 2026
**Snapshot de referencia de la propuesta:** rama local `main`, HEAD `ae917ce` (`docs(bridge): dictamen favorable [PA-TRANSPARENCIA-03]...`). **Snapshot de ejecución EAF:** base `0ed3e66f2a67fdd9aac25d86b4f0b3f1265492ed`, rama `main`.
**Estado:** cambios de alcance implementados y frontend validado; cierre integral pendiente de resolver 840 hallazgos Ruff preexistentes del backend y de dictamen EAF. Resultados y límites en `bridge/02_entrega_codex.md`. No implica despliegue.

**Revisión EAF:** aprobado con cinco ajustes obligatorios por la asignación `[ARCH-CONSOLIDACION-01]` (`bridge/01_tarea_codex.md`). Los ajustes gobiernan las fases descritas abajo.

## 1. Propósito

Consolidar la estructura actual de POLIS para que sus módulos puedan evolucionar con límites claros, una fuente de persistencia verificable y documentación coherente. El trabajo parte de la arquitectura existente: aplicación Next.js y React, API FastAPI, PostgreSQL/PostGIS y migraciones Alembic. Se busca reforzar esa arquitectura modular en un solo producto, no dividirla en microservicios ni rehacer la plataforma.

El plan responde a cuatro asuntos observados en el snapshot de referencia:

1. El scaffold de frontend separa `app`, `core`, `shared` y `features`, pero el store global de paneles ubicado en `core` contiene tipos y contratos de props específicos de múltiples dominios.
2. Permanecen dependencias y comandos heredados de Prisma, aunque la arquitectura documentada establece la API FastAPI y PostgreSQL/Alembic como fuente de persistencia para los módulos nuevos.
3. La existencia de una vista o módulo no demuestra que su recorrido completo persista datos y aplique permisos de extremo a extremo.
4. Hay documentación de estado que no coincide entre sí. Por ejemplo, el plan de trabajo conserva una nota sobre CSP pendiente mientras existen entregas posteriores que describen su implementación.

## 2. Estado inicial observado

- El frontend contiene rutas App Router, funcionalidades bajo `src/features`, infraestructura bajo `src/core` y componentes reutilizables bajo `src/shared/ui`.
- La composición de paneles está centralizada en `src/app/_composition`; el contrato global y el store están en `src/core/panels/panel-store.ts`.
- El backend agrupa routers y módulos por dominio bajo `backend/app/modules`, con ensamblaje en `backend/app/api/router.py`.
- Alembic informa una única cabeza: `0062_motor_plan_accion_dnp` (estado inicial del 2026-10-14; cabeza vigente verificada el 2026-10-27 por el encargo 244: `0084_aportes_colas_y_apoyos`, evolución 0063–0084 en [arquitectura.md](arquitectura.md)).
- En la línea base, `package.json` conservaba `@prisma/client`, `prisma` y scripts `db:*`; `src/core/database/legacy-prisma.ts` instanciaba un cliente Prisma. La búsqueda inicial omitió `.zscripts`, donde `dev.sh` y `build.sh` invocaban `db:push`; durante la ejecución se retiró también ese flujo SQLite para completar el retiro del starter.
- CI contiene trabajos separados para frontend y backend, con PostgreSQL/PostGIS para sus pruebas.
- ESLint excluye actualmente `src/features/noticias/**` y `src/features/testimonios/**`; esas exclusiones se retirarán y se corregirán los hallazgos.
- Prisma contiene una plantilla SQLite sin relación con PostgreSQL/PostGIS. EAF confirma que no existen consumidores en `src/`, `backend/`, `scripts/` o `.github/`; su retiro es inmediato.
- El catálogo de paneles aplica casts generales que no validan la compatibilidad de props de cada componente.
- La asignación EAF solicita un censo de 23 features y 23 routers. La verificación inicial de esta ejecución encuentra 21 directorios bajo `src/features/`, 25 módulos con `router.py` y 22 routers montados en `backend/app/api/router.py`; la matriz documentará el conteo observado y cada diferencia, sin completar cantidades por inferencia.
- En el checkout consultado existe una modificación local en `bridge/02_resultado_agy2.md`. Debe preservarse y excluirse de cualquier limpieza automática.

Esta sección es una fotografía de estructura y configuración. No es un inventario funcional exhaustivo ni una afirmación de que todos los módulos se hayan probado en este plan.

## 3. Principios y límites

- Mantener una arquitectura modular en un solo despliegue de producto mientras los requisitos no justifiquen otro modelo.
- La API FastAPI y PostgreSQL son la ruta de persistencia para los módulos de producto; no añadir una segunda vía de escritura.
- `core` ofrece capacidades genéricas y no debe definir contratos de negocio de `features`.
- `app` ensambla funcionalidades y conserva un punto de composición de rutas, permisos visuales y paneles.
- Cada módulo debe declarar con precisión si está conectado, parcialmente conectado, es una demostración o está fuera del alcance productivo.
- Los datos de muestra no pueden aparentar que se guardaron en producción.
- Las escrituras se delimitan por caso de uso en el servicio; los repositorios no confirman transacciones.
- EDD implementa y aporta evidencia. Una evaluación EAF debe realizarla una persona o equipo independiente sobre un snapshot identificable.
- No se aplican cambios a la base de datos de trabajo ni se despliegan servicios como parte de este plan.

## 4. Resultado esperado

Al cerrar el plan:

1. Los límites `app` / `core` / `shared` / `features` se comprueban y los contratos de paneles de dominio dejan de vivir en el núcleo genérico.
2. Solo existe una vía vigente y documentada para persistir módulos de producto; los restos Prisma se eliminan o quedan aislados con una justificación y propietario explícitos.
3. Existe una matriz auditable de recorridos de producto desde pantalla hasta base de datos, con permisos, migraciones y pruebas asociadas.
4. El estado documentado de módulos, migraciones, CSP, CI y operación coincide con los artefactos y verificaciones actuales.
5. Los controles pertinentes pasan sobre bases y entornos de prueba exclusivos, y una revisión EAF independiente registra alcance, snapshot, hallazgos y límites.

## 5. Fases de trabajo

### Fase 0 — Fijar snapshot y establecer línea base

**Objetivo:** hacer que el trabajo sea reproducible y distinguir defectos existentes de regresiones nuevas.

**Tareas**

1. Registrar commit base, estado de `git status`, versiones de Bun/Node/Python/PostgreSQL/PostGIS y hash del lockfile.
2. Preservar `bridge/02_resultado_agy2.md`; no incorporarlo a los cambios de arquitectura salvo que su responsable solicite actualizarlo.
3. Ejecutar los checks vigentes sin modificar código y guardar comandos, salida, duración y variables de entorno relevantes, ocultando credenciales.
4. Confirmar la cabeza de Alembic y el estado de drift contra una base exclusiva `polis_test*`.
5. Anotar fallos preexistentes y qué suites no pudieron correr. No cambiar o reducir guardas para obtener un resultado verde.
6. Registrar versiones y hashes de frontend/backend, distinguir directorios frontend, módulos backend con router y routers efectivamente montados; verificar la cabeza Alembic vigente (`0084_aportes_colas_y_apoyos` desde 2026-10-27; el snapshot del 2026-10-14 citaba `0062_motor_plan_accion_dnp`).

**Entregables**

- Manifiesto de línea base con commit, entorno y resultados.
- Lista de riesgos y bloqueos técnicos reproducibles.

**Criterios de aceptación**

- El snapshot puede identificarse sin ambigüedad.
- Ninguna prueba usa `bd_csh`, la base de trabajo ni credenciales impresas en logs.
- Cada fallo se clasifica como reproducible, ambiental o no verificado, con evidencia.

### Fase 1 — Inventario de módulos y contratos de producto

**Objetivo:** saber qué existe y qué significa “listo” para cada recorrido.

**Tareas**

1. Crear un inventario de páginas/rutas y mapear cada una a su `feature`, servicio frontend, endpoint, permiso y módulo backend.
2. Para cada módulo backend, registrar router, servicio, repositorio, modelos, migración Alembic, permisos en `docs/permisos-api.md` y pruebas existentes.
3. Marcar cada recorrido de escritura como `persistente verificado`, `parcial`, `demo`, `solo lectura` o `sin conexión`.
4. Detectar estado de negocio duplicado en Zustand, fixtures o constantes y decidir si son caché/presentación, datos demostrativos o una fuente de datos indebida.
5. Cubrir todos los directorios de `src/features/`, todos los módulos backend con `router.py` y todos los routers montados. La asignación espera 23/23; si el conteo del snapshot difiere, registrar la diferencia y revisar módulos no montados en vez de omitirlos.
6. Priorizar primero los módulos visibles para ciudadanos y operadores institucionales, incluyendo Noticias, Testimonios, Formularios, Mesas, Participación, Actores, Comunicaciones y Seguimiento; después cubrir el resto de módulos expuestos.
7. Relacionar endpoints y funcionalidades con su estado de accesibilidad: autorizado, 401, 403, condición de recurso y exposición pública justificada.

**Entregable**

- Matriz de trazabilidad en un documento versionado, con una fila por recorrido de lectura o escritura y propietario técnico.

**Criterios de aceptación**

- Todas las rutas públicas e institucionales tienen un destino y responsable identificable.
- No se etiqueta un módulo como productivo solo por tener pantalla, endpoint, tabla o migración.
- Toda ruta nueva o existente tiene clasificación de acceso conforme a `docs/permisos-api.md`.

### Fase 2 — Desacoplar el núcleo de paneles de los dominios

**Objetivo:** conservar la pila global de paneles y retirar del núcleo los tipos de negocio.

**Hallazgo de partida:** `src/core/panels/panel-store.ts` define `PanelType` y `PanelPropsMap` con contratos de políticas, mesas, formularios, noticias, testimonios, seguimiento y otros dominios. La composición de componentes está correctamente reunida en `src/app/_composition`, pero el store genérico carga conocimiento de producto.

**Tareas**

1. Escribir una decisión corta de arquitectura (ADR) antes del cambio, comparando opciones de tipado e inversión de dependencias. Debe definir cómo conserva TypeScript la correspondencia `tipo → props` sin importar `features` desde `core`.
2. Definir el contrato genérico del núcleo: pila, clave, apertura/cierre, breadcrumb y maximización; sin nombres de funcionalidades ni DTOs de negocio.
3. Ubicar las declaraciones de paneles de dominio en un contrato de composición que respete las reglas de importación del proyecto.
4. Mantener `app` como ensamblador único del catálogo global de componentes y anchos.
5. Migrar primero un recorrido simple y uno con props complejas; luego migrar los demás paneles en grupos por dominio.
6. Mantener compatibilidad de `openPanel`, navegación anidada, accesibilidad, controles de cierre y maximización durante cada grupo.
7. Añadir una guarda de arquitectura que detecte imports prohibidos y compruebe que cada tipo de panel tenga contrato y componente registrado.
8. Retirar las exclusiones ESLint de Noticias y Testimonios; corregir sus errores sin agregar nuevas exclusiones ni directivas para silenciarlos.

**Entregables**

- ADR aprobado internamente por arquitectura/EDD.
- Store genérico, contratos de paneles por dominio y composición raíz tipada.
- Pruebas del store, del catálogo y de los flujos de navegación con Storybook.

**Criterios de aceptación**

- `core` y `shared` no conocen nombres, props ni modelos de negocio.
- No hay panel declarado sin implementación ni implementación accesible solo mediante cast inseguro.
- Se conservan el apilamiento, breadcrumbs, `closeToKey`, cinco paneles máximos y maximización en tamaños móviles y de escritorio.
- TypeScript, lint, política UI y las historias afectadas pasan sin omitir checks.

### Fase 3 — Una sola ruta de persistencia y retiro controlado de Prisma

**Objetivo:** retirar el camino Prisma de plantilla confirmado como inactivo por la auditoría EAF y dejar una sola ruta de persistencia de producto.

**Tareas**

1. Eliminar `src/core/database/legacy-prisma.ts`, `prisma/schema.prisma`, el empaquetador `.zscripts/database-runtime-build.sh` y sus pruebas, y retirar el `db:push` de `.zscripts/dev.sh`, junto con el directorio `prisma/`.
2. Retirar `@prisma/client`, `prisma` y los scripts `db:push`, `db:generate`, `db:migrate` y `db:reset` de `package.json`; actualizar `bun.lock` con Bun.
3. Actualizar `docs/arquitectura.md` para establecer FastAPI/SQLAlchemy y PostgreSQL/Alembic como las rutas vigentes de producto y registrar la retirada del scaffold y el flujo SQLite de `.zscripts`.
4. Añadir a `scripts/ui-policy.mjs` una regla que prohíba importar `@prisma/client`, reintroducir `legacy-prisma` o volver a instalar/ejecutar Prisma en el manifiesto o scripts de despliegue, con pruebas en `scripts/ui-policy.test.mjs`.
5. Revisar scripts, CI y documentación por referencias activas restantes, sin tocar PostgreSQL ni ejecutar comandos destructivos.

**Criterios de aceptación**

- No existe ambigüedad sobre cuál sistema modifica el esquema y cuál guarda datos de producto.
- Prisma se retiró: no quedan imports, scripts ni dependencias activas; `bun install --frozen-lockfile` termina correctamente y la guarda UI bloquea su reintroducción.
- Las migraciones mantienen una cabeza única y las pruebas de backend usan exclusivamente una base aislada.

### Fase 4 — Cerrar la trazabilidad frontend → API → PostgreSQL

**Objetivo:** comprobar que cada módulo ofrecido como funcional persiste y lee los datos correctos con los permisos esperados.

**Tareas por módulo**

1. Verificar las consultas y mutaciones del frontend; usar TanStack Query para datos remotos y dejar Zustand para estado de presentación.
2. Seguir la operación desde router hasta servicio y repositorio, revisando esquemas de entrada/salida, control de errores y respuesta HTTP.
3. Verificar que cada tabla/índice/restricción tenga migración Alembic y metadata registrada.
4. Revisar la transacción como unidad de caso de uso: validación de salida dentro del límite, un commit, rollback tras fallo posterior a `flush` y compensación de archivos cuando corresponda.
5. Comprobar desde una sesión nueva que los cambios sobreviven a recarga; verificar que listados y detalles leen persistencia real.
6. Comprobar éxito autorizado, 401, 403, propietario/estado del recurso y reglas de acceso público.
7. Quitar fallback silencioso a demo en `production`; ofrecer estados claros de carga/error/vacío y reservar fixtures a historias o modo de demostración identificado.
9. Distinguir fallbacks de mutaciones y consultas. Un fallo de escritura API nunca puede anunciar éxito ni persistir solo en estado local. Lecturas pueden usar catálogos semilla canónicos para SSG/Storybook, siempre identificados como contenido inicial y revalidados por API en uso interactivo; no pueden ocultar fallos de carga ni presentar datos ficticios como persistidos.
10. Completar la matriz de todos los routers/features observados y documentar diferencias frente a las 23/23 esperadas; bloquear el rótulo “listo para producción” para cualquier módulo con persistencia, permiso o prueba crítica pendiente.

**Orden propuesto**

1. Contenido institucional: Noticias y Testimonios.
2. Participación ciudadana: Formularios, Aportes, Mesas, Asistencia, Evidencia y Escenarios.
3. Gestión de política: Diagnóstico, Actores, Alternativas, Fuentes, Presupuesto, Indicadores y Seguimiento.
4. Capacidades transversales: Identidad, Sesión, Auditoría, Comunicaciones, Notificaciones, Canales, Seguridad, Geodatos e IA.

El orden es una propuesta de ejecución; la Fase 1 debe ajustar dependencias y prioridades observadas. No se deben abrir escrituras privilegiadas para completar una vista pública.

**Criterios de aceptación por recorrido**

- Una operación autorizada queda almacenada y se refleja al consultar desde sesión independiente.
- Un error después de la primera escritura no deja filas parciales ni archivos huérfanos.
- Los permisos y respuestas coinciden con la matriz API.
- El frontend no anuncia éxito si la API falla ni sustituye la persistencia por estado local.
- La prueba corre en una base exclusiva `polis_test*`.

### Fase 5 — Alinear arquitectura, operación y evidencia

**Objetivo:** que la documentación describa el snapshot real y diferencie implementación local de operación desplegada.

**Tareas**

1. Revisar `docs/arquitectura.md`, `docs/plan-trabajo.md`, `docs/operacion.md`, `docs/permisos-api.md`, README y runbooks.
2. Resolver discrepancias CSP usando evidencia del código, configuración real del servidor y estado del despliegue: distinguir implementada en código, configurada para despliegue, activa en producción y validada en navegador.
3. Actualizar la cabeza Alembic y mapa de módulos solo después de verificar el snapshot con comandos.
4. Mover afirmaciones históricas de pruebas/certificación a la sección histórica cuando ya no correspondan al HEAD actual; mantener fecha, hash y entorno.
5. Registrar lo que no se verificó, incluidos servicios externos, infraestructura productiva, proveedores de correo y activación de CSP en Nginx.
6. Preservar documentos o informes con trabajo activo de otras personas; solicitar revisión del responsable antes de cambiar esos artefactos.

**Criterios de aceptación**

- No hay estados contradictorios entre plan, runbook, código y evidencia.
- Cada afirmación de producción identifica entorno y prueba; documentación local no se presenta como despliegue.
- El plan maestro enlaza la matriz de módulos y los resultados del cierre.

### Fase 6 — Validación integral y revisión independiente

**Objetivo:** demostrar el estado del snapshot consolidado y obtener revisión independiente antes de declararlo cerrado.

**Validación EDD**

- `bun run check` y `bun run ui:policy:test`.
- `bun test` para la suite unitaria frontend; este comando también debe ejecutarse en CI.
- `bun install --frozen-lockfile` para comprobar la sincronía entre manifiesto y `bun.lock` tras retirar Prisma.
- `bun run build` y `bun run storybook:build`.
- Suite Storybook/Chromium para los flujos afectados; smoke E2E de recorridos de producto.
- `bun run backend:check` con `POLIS_TEST_DATABASE_URL` apuntando a una base exclusiva `polis_test*`.
- `alembic check`, instalación desde base vacía, `downgrade base`, reconstrucción a `head` y actualización de datos previos cuando el entorno de prueba lo permita.
- Revisión de estado Git, referencias Prisma, import boundaries, matriz API y paneles huérfanos.

**Revisión EAF independiente**

- Entregar commit/hash, alcance, matriz, comandos, resultados, limitaciones y evidencia de persistencia/rollback.
- Revisar límites de módulos, contratos, seguridad, migraciones, transacciones, datos de prueba y claims de operación.
- Registrar severidades, hallazgos y dictamen en artefacto separado del informe EDD.
- Si hay hallazgos, resolverlos y volver a revisar solo el alcance afectado; no marcar el plan completo como cerrado mientras queden hallazgos bloqueantes.

**Criterios de cierre**

- Checks ejecutados desde un entorno reproducible, con resultados vinculados a un hash concreto.
- Ninguna prueba de base de datos toca la base de trabajo.
- Las suites no aprobadas o no ejecutadas aparecen explícitamente como pendientes, nunca como conformes.
- El dictamen EAF lo firma un evaluador independiente y no se infiere del paso de pruebas.

## Ajustes obligatorios del dictamen EAF `[ARCH-CONSOLIDACION-01]`

1. Retirar las exclusiones ESLint de Noticias y Testimonios y reparar todos sus hallazgos.
2. Retirar Prisma de plantilla, sus scripts/dependencias y bloquear su reintroducción en la política UI.
3. Desacoplar el store de paneles; agregar ADR, contratos de dominio fuera de `core` y eliminar casts inseguros del registro.
4. Incorporar `bun test` a CI y a la validación EDD.
5. Inventariar el censo real de features, módulos con router y routers montados, explicar diferencias frente a 23/23, reflejar Alembic `0062` y tratar fallbacks de consulta y mutación con reglas distintas.

Los entregables de la asignación incluyen `docs/matriz-trazabilidad-modulos.md`, el ADR y la evidencia en `bridge/02_entrega_codex.md`. Este último archivo debe identificar el snapshot, los comandos y los límites; no equivale a un dictamen EAF independiente.

## 6. Secuencia, dependencias y prioridades

| Prioridad | Trabajo | Depende de | Resultado que desbloquea |
|---|---|---|---|
| P0 | Fase 0: snapshot y línea base | Ninguna | Evidencia confiable y límites de seguridad para el resto |
| P1 | Fase 1: inventario de módulos | Fase 0 | Alcance real de persistencia y prioridades |
| P1 | Fase 2: ADR y desacople paneles | Fase 0; inventario de paneles | Cambios UI seguros y contratos sostenibles |
| P1 | Fase 3: decidir y retirar/aislar Prisma | Fase 0; búsqueda de consumidores | Fuente de esquema y persistencia sin ambigüedad |
| P1 | Fase 4: conexión por verticales | Fases 0–1; bloques UI/API independientes | Módulos respaldados por evidencia de persistencia |
| P2 | Fase 5: documentación alineada | Fases 2–4 | Estado del proyecto confiable y auditable |
| P2 | Fase 6: validación y EAF | Fases 2–5 | Cierre del snapshot revisado |

Las Fases 2 y 3 pueden avanzar en paralelo una vez fijada la línea base. La Fase 4 debe ejecutarse por módulos y puede avanzar en paralelo entre dominios solo si no comparte tablas, migraciones o archivos. La documentación final depende de decisiones y resultados ya comprobados.

## 7. Estimación orientativa

Estimación de esfuerzo de ingeniería, no compromiso de calendario:

- Fase 0: 0.5–1 día.
- Fase 1: 2–4 días, según profundidad de recorridos y pruebas existentes.
- Fase 2: 2–5 días; más si TypeScript requiere una nueva estrategia de registro tipado.
- Fase 3: 0.5–2 días si Prisma está inactivo; 2–4 días si hay herramientas consumidoras que migrar.
- Fase 4: 1–3 días por grupo funcional; los defectos detectados pueden requerir trabajo adicional.
- Fase 5: 1–2 días.
- Fase 6: 1–3 días de validación EDD, más disponibilidad del evaluador EAF.

La estimación de la Fase 4 se ajusta después del inventario. No es responsable prometer una duración total antes de conocer cuántos recorridos son realmente parciales o demo.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambiar el store global rompe flujos de paneles o tipado de props | ADR, migración por grupos, pruebas de store y Storybook en cada incremento |
| Prisma todavía alimenta una herramienta no descubierta | Inventario de referencias/CI/despliegue; retirar solo tras comprobar consumidores |
| Fixtures aparentan persistencia exitosa | Clasificar demos, separar fixtures y prohibir fallback silencioso en producción |
| Pruebas alteran datos o linaje de migraciones compartido | Base dedicada `polis_test*` por ejecución riesgosa; restaurar y verificar su cabeza |
| Migración nueva tiene cabeza múltiple o pierde datos previos | `alembic heads`, `alembic check`, downgrade/reconstrucción y escenario con datos previos |
| Documentos de auditoría activos pertenecen a otro responsable | Preservar cambios y coordinar revisión antes de editar informes activos |
| Pasar tests se interpreta como certificación total | Limitar conclusiones al hash, alcance, entorno y pruebas ejecutadas; EAF independiente |

## 9. Gestión de cambios y seguimiento

- Abrir una tarea por fase y subtareas por dominio para la Fase 4.
- Cada entrega registra objetivo, archivos, pruebas, riesgos y hash de revisión.
- No combinar una limpieza de scaffold con cambios funcionales de dominio que dificulten atribuir regresiones.
- No actualizar migraciones ya aplicadas para corregir entregas; añadir revisiones compatibles y preservar una sola cabeza.
- Registrar las decisiones irreversibles o de compatibilidad en ADR antes de codificarlas.
- Actualizar este documento únicamente con fechas, responsables y estados respaldados por evidencia.

### Registro de ejecución `[ARCH-CONSOLIDACION-01]` — 2026-10-14

- Fase 0: snapshot de ejecución fijado en `0ed3e66f2a67fdd9aac25d86b4f0b3f1265492ed`; conservar los cambios simultáneos de agy2.
- Fase 1: inventario documentado en `docs/matriz-trazabilidad-modulos.md`; se observan 21 features, 22 routers montados y 25 módulos con router.
- Fase 2: store desacoplado y ADR escrito; resultado de typecheck y compatibilidad del registro queda en `bridge/02_entrega_codex.md`.
- Fase 3: restos Prisma y empaquetado SQLite heredado retirados; dependencias, lockfile, scripts de build/start y guarda UI actualizados.
- Fase 4: clasificaciones de conexión y política sobre fallbacks registradas en la matriz; la certificación de cada recorrido está fuera de lo que demuestra el censo.
- Fase 5: documentación de arquitectura, CSP, Alembic y plan de trabajo alineada al snapshot inspeccionado.
- Fase 6: `bun run check`, `bun test`, `bun run build`, Storybook y `pytest` en `polis_test` pasaron; `ruff check` reporta 840 hallazgos y `ruff format --check` encuentra 110 archivos por formatear. `bun run backend:check` se detiene en `ruff check` antes de format/pytest; ambos controles se ejecutaron por separado. El detalle y el bloqueo se consignan en `bridge/02_entrega_codex.md`; el plan no se marca cerrado mientras quede ese gate y el dictamen EAF pendiente.

## 10. Referencias del repositorio

- `AGENTS.md`
- `docs/arquitectura.md`
- `docs/transacciones.md`
- `docs/permisos-api.md`
- `docs/plan-trabajo.md`
- `.github/workflows/check.yml`
- `src/core/panels/panel-store.ts`
- `src/app/_composition/`
- `backend/app/api/router.py`
- `backend/alembic/versions/`
- `package.json`
- `docs/matriz-trazabilidad-modulos.md`
- `docs/adr/0001-desacople-panel-store.md`
