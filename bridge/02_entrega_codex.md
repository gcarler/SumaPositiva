# Entrega Codex — /plataforma: gestión interna

Fecha: 2026-10-01T21:14:56.940932+00:00.
Commit de implementación y evidencia: `d03a9efbf8bda2dcb3b71308e872af8d8ec587f9`.
Autor: implementación EDD; pendiente revisión independiente del EAF.

## Resultado

Creado el área interna `/plataforma` con dashboard, formularios, mesas, usuarios,
geovisor, contenido y configuración. App ensambla; implementación y permisos
viven en `features/plataforma`. Se reutilizan el kit UI, los stores existentes,
el renderer de formularios y el único host de paneles laterales.

- Sidebar fijo en escritorio mediante sticky, desplegable inline en móvil.
- Header con nombre, rol, Mi cuenta y cerrar sesión.
- Login email y callback Google de cuentas internas redirigen a `/plataforma` y
  cierran el panel; ciudadanos permanecen en el portal.
- Sin sesión o con sesión caducada: portal con `login=1` y panel de sesión.
- Ciudadano o rol no clasificado: portal. Módulo fuera del rol: dashboard.
- La sesión restaurada espera el perfil remoto; el rol persistido no prevalece
  sobre el backend. Revocación, cuenta inactiva y expiración retiran acceso.
- Portal opt-in: «Ir a la Plataforma»; volver al portal no fuerza redirección.
- Protección de lectura también en paneles y acciones, además del menú.

| Rol | Módulos |
| --- | --- |
| autoridad_distrital | Dashboard, Formularios, Mesas, Geovisor, Contenido |
| facilitador_mesa | Dashboard y Mesas; Formularios en lectura |
| auditor_forense | Dashboard, Formularios, Mesas, Geovisor, Contenido y Configuración; lectura |
| administrador_identidades | Los siete módulos; acciones con permisos efectivos |
| ciudadano / anónimo | Sin acceso |

Usuarios y Roles se reserva al administrador, según la restricción explícita de
producto, incluso para el auditor. La navegación no concede permisos nuevos a la
API. Los roles personalizados conservan sus permisos API y su cuenta, pero necesitan
una clasificación explícita para entrar a esta navegación.

## Login Google y compatibilidad de identidad

Se corrigió el intercambio de OAuth access token por el ID token entregado por
`GoogleLogin`. Backend verifica firma/emisor/caducidad y audiencia configurada;
se eliminaron el bypass de tokens ficticios y el fallback sin firma. El dominio
ni el texto del correo elevan roles: cuentas nuevas son ciudadanas y las
existentes conservan su rol administrativo asignado. Pruebas simulan el verificador
solo dentro del test; no se añadió un bypass al servicio.

Se reconoció el permiso ya introducido por mesas `mesas:fotos:subir` en el catálogo
para evitar que el alta/asignación de usuarios rechazara roles existentes por
«permisos desconocidos». No se ejecutaron migraciones de producción ni se
concedieron privilegios por esa inclusión en el catálogo.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `bun run check` | Correcto: política UI, TypeScript y ESLint sin errores |
| `bun run build` | Correcto; portal y siete rutas internas generadas |
| `bun run ui:test` | 173 historias aprobadas, incluidas 19 de plataforma |
| `bun run storybook:build` | Correcto |
| Vitest plataforma + formularios | 55 pruebas aprobadas |
| Google/transacciones en BD temporal | 14 pruebas aprobadas |
| Identidad completa + Google, árbol actual | 38 pruebas aprobadas |
| Ruff de cinco archivos backend de esta entrega | Correcto |
| Navegador contra frontend reiniciado en puerto 3000 | 42 casos aprobados; API interceptada, sin escrituras reales |
| Login y administración reales en FastAPI/PostgreSQL aislados | Alta, rol, asignación y revocación aprobados |
| Callback Google, SDK interceptado y componentes reales | ID token, destinos interno/ciudadano y cierre aprobados |

Navegador: siete rutas por los cuatro roles, rechazo ciudadano/anónimo, perfil
remoto prevalente, token revocado, login email, navegación opt-in y salida. Axe
WCAG 2.1 AA y reflujo en 320/1440 px, claro/oscuro: sin infracciones automatizadas
ni overflow. Esto no constituye certificación completa WCAG.

PostgreSQL temporal exclusivo: puerto 55439 y bases `polis_test_plataforma*`.
La comprobación real en navegador utilizó API del snapshot `c0cfcf1` con los cambios
de Google; pruebas posteriores de identidad se ejecutaron sobre el árbol actual.
Sin envío real de correo y sin operaciones de prueba sobre la base de producción.

## Activación y límites comprobados

Se reiniciaron `polis-frontend.service` y `polis-backend.service`; ambos activos.
Portal HTTP 200 y liveness API 200. Readiness API responde 503 por migraciones
pendientes de los cambios paralelos de mesas/fotos: conexión y extensiones `ok`.
No se aplicaron esas migraciones en producción como parte de esta entrega.
El primer reinicio frontend coincidió con otro build que recreaba `.next`;
se recuperó el servicio y se repitieron los 42 casos sobre el servicio activo.

- Google en vivo requiere configurar el mismo cliente OAuth en frontend/backend
  y sus orígenes autorizados. No se aportaron/configuraron credenciales reales.
- Formularios y agenda de mesas conservan la demostración en memoria existente,
  con aviso explícito de restablecimiento al recargar.
- Territorio más activo es referencia demo; usuarios del dashboard conserva el
  placeholder solicitado. Usuarios, alertas, contenido y geovisor consultan API.
- Contenido reutiliza el control de fases existente y consulta líneas/aportes;
  no incorpora un CRUD nuevo de líneas/aportes.
- Configuración ofrece tema local, actualización de consultas y control de fases
  según permiso; parámetros globales persistidos aún no están integrados.
- Guard solicitado es de cliente: el HTML puede responder 200 antes de redirigir.
  La autorización de datos/escrituras sigue siendo responsabilidad de FastAPI.
- `bun run backend:check` global falla con 45 incidencias Ruff ajenas al alcance;
  no se rebajaron controles ni se corrigieron masivamente cambios paralelos.
- Se mantiene un aviso previo del optimizador CSS; no hay errores de compilación.

Contrato: [docs/plataforma.md](../docs/plataforma.md).
Evidencias y capturas: [plataforma-2026-10-01](../docs/evidencias/plataforma-2026-10-01/).
Los cambios paralelos de fotos/geovisor se conservaron fuera del commit de plataforma.

---

## Histórico de entregas anteriores

El contenido siguiente pertenece a tareas previas, no al alcance ni al dictamen
de la entrega actual de plataforma.

# Entrega Codex — Formularios POLIS

Fecha: 2026-10-01T19:15:46.156954+00:00
Commit de implementación y evidencia: `1151830c3756017fdb27b3bff98381a487fc10fd`.

## Resultado urgente: TypeScript y build corregidos

Los cuatro diagnósticos reportados quedaron resueltos, sin supresiones de tipos ni relajación de checks:

1. `formulario-respuesta-panel.tsx` importa `../state/formularios-store`; el archivo existe y exporta el store.
2. Todas las preguntas de demostración incluyen `orden`. Los mocks se centralizaron en `data/formularios.mock.ts`.
3. Ambos formularios incluyen `secciones` y `configuracion` completas y tipadas.
4. La analítica se calcula desde respuestas registradas y devuelve `AnaliticaFormulario`, con resultados por pregunta compatibles con el modelo; ya no usa el mock incompatible del hook.

Se ejecutó literalmente `bun run check 2>&1 | grep "error TS"`: sin coincidencias. El código de salida 1 corresponde a `grep` sin coincidencias; el check completo se verificó por separado con salida 0.

## Estado T1–T6

La conformidad indicada se limita al frontend de demostración solicitado en T5. Los datos son ficticios y se conservan en memoria; esta entrega no integra persistencia oficial del backend ni certifica paridad integral con el servicio Google Forms.

| Tarea | Estado | Resultado verificable |
|---|---|---|
| T1 | ✅ CONFORME | Modelo ampliado, tipos, secciones, validaciones, reglas condicionales, configuración y respuestas individuales. |
| T2 | ✅ CONFORME | Constructor con controles por tipo, CRUD de secciones/opciones, Otro, orden aleatorio, imágenes, ↑↓, duplicación, lógica y configuración; vista previa en subpanel lateral. |
| T3 | ✅ CONFORME | Respuesta ciudadana por secciones, validación inmediata, condiciones, progreso, archivos con vista previa, autenticación/cierre/cupo y confirmación configurable. Registro y acceso público desde la barra superior. |
| T4 | ✅ CONFORME | Distribuciones, promedios, mínimos/máximos, últimas cinco respuestas, enfoque diferencial y descarga CSV real de respuestas locales. |
| T5 | ✅ CONFORME | Zustand con CRUD y respuestas; dos formularios de Seguridad Humana, tres respuestas ficticias; importación de los 205 barrios de BARRIOS_CARTAGENA y siete dimensiones ONU. |
| T6 | ✅ CONFORME | Check, builds y pruebas aprobados; frontend reiniciado, servicio activo, HTTP 200; commit realizado. |

## Tipos implementados

`texto_corto`, `texto_largo`, `opcion_unica`, `opcion_multiple`, `lista_desplegable`, `likert`, `escala_lineal`, `fecha`, `hora`, `numero`, `carga_archivo`, `seccion`, `descripcion`.

La especificación anuncia 12 tipos, pero enumera 13: se implementaron los 13 enumerados, de los que 11 capturan respuestas y dos son bloques informativos.

## Validación

`bun run check` — salida 0:

```text
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```

`bun run build` — salida 0, extracto de salida:

```text
✓ Compiled successfully in 8.1s
  Running TypeScript ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/3) ...
✓ Generating static pages using 7 workers (3/3) in 402.4ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found
```

El build no presenta errores de TypeScript. Conserva un aviso del optimizador CSS en un selector `stroke='#fff'`; no se presenta como un build sin avisos.

| Comprobación adicional | Resultado |
|---|---|
| Dominio (`bunx vitest run --project formularios`) | 32/32 pruebas aprobadas. |
| Historias (`bun run ui:test`) | 151/151 pruebas aprobadas, 10 archivos. |
| `bun run storybook:build` | Salida 0. |
| Navegador Chromium | 32 casos, claro/oscuro y 320/1440 px: sin infracciones axe, desbordamientos ni errores de ejecución observados. |
| Frontend compilado | Dos flujos ciudadanos completos a 320/1440 px, incluyendo envío, confirmación y bloqueo de duplicados locales. API interceptada; sin escrituras reales. |
| Servicio | Reinicio con salida 0; `systemctl is-active polis-frontend.service`: `active`; HTTP local: `200`. |

[Evidencia y reproducción](../docs/evidencias/formularios-2026-10-01/README.md). [Manifiesto de resultados y hashes SHA-256](../docs/evidencias/formularios-2026-10-01/manifest.json). Los logs completos de check/build y las capturas se conservan en ese directorio.

## Decisiones de diseño y límites

- Se reutilizan controles del kit, tokens y el host de paneles existente. No se añadieron modales centrados. Formularios e historias usan el mismo renderer.
- La vista previa utiliza una instantánea del borrador y nunca registra respuestas. Guardar y responder sí actualizan el store local y su analítica.
- Mostrar exige que se cumplan todas las condiciones configuradas; ocultar aplica si alguna se cumple. Las dependencias deben apuntar a preguntas anteriores y los saltos a secciones posteriores, evitando ciclos. Se excluyen del envío respuestas ocultas o de secciones omitidas.
- La edición permitida reemplaza la respuesta de esa identidad sin aumentar el contador; el cupo se valida contra el estado actual. La fecha de cierre se guarda en ISO/UTC y se muestra en hora local.
- El texto enriquecido permite negrita, cursiva y saltos de línea sin insertar HTML. Imágenes de preguntas requieren URL HTTP(S). Archivos se validan por tipo y tamaño máximo de 2 MB; se muestran y almacenan solamente en memoria, sin upload a servidor.
- CSV usa BOM, escape de celdas y protección frente a fórmulas; exporta todas las respuestas locales y no incluye identificadores de sesión.
- El modo demostración está indicado en la interfaz. Recargar restablece los datos; la identidad anónima y la prevención de duplicados son locales. La autenticación se consulta al enviar, pero autorización, cuotas y antirrepetición reales requieren implementación y validación del servidor antes de utilizar datos ciudadanos reales.
- Se preservaron los cambios concurrentes ajenos. El commit incluye exclusivamente el módulo, sus integraciones y evidencia. Las 151 historias se ejecutaron sobre el árbol de trabajo que también contenía esos cambios concurrentes.
- Esta entrega constituye evidencia del implementador; no es un dictamen independiente del EAF ni una certificación completa WCAG.

## Ajuste posterior: formularios como función interna

Por instrucción del usuario se retiró el botón «Formularios» del menú público del landing. Este ajuste sustituye la referencia anterior al acceso desde la barra superior. La gestión y el constructor permanecen en el menú institucional «Formularios y Consultas», con su visibilidad por sesión y permisos existentes.

Commit: `8b1ca21780e6ed918c31b5b419cfbc32d21b1289` (solo dos líneas retiradas de Topbar).

Validación: check, build de Next y build de Storybook con salida 0; 151 historias aprobadas en la ejecución final. La primera ejecución paralela tuvo un timeout al cargar la vista previa, y el reintento completo aprobó sin cambios en pruebas. Navegador sobre producción: ausencia del menú público y sin desbordamiento, claro/oscuro a 320/1440 px. Frontend reiniciado, servicio activo y HTTP 200.

## Cierre de observaciones menores EAF — 2026-10-01T19:51:40.633404+00:00

Dictamen recibido del EAF sobre `1151830`: **CONFORME CON OBSERVACIONES MENORES**. Se atendieron las tres acciones solicitadas.

Commit de correcciones y evidencia: `21754fe1889e293863549d58285ded05a66b0e31`.

| Observación | Estado | Corrección |
|---|---|---|
| 1. Modo demo | ✅ ATENDIDA | Comentario en `formularios-store.ts`: datos en RAM; integración mediante `services/formularios-api.ts` con FastAPI `/api/v1/formularios`, respuestas y analítica para persistir en `bd_csh`, adaptando DTOs y permisos. |
| 2. Paso decimal | ✅ CORREGIDA | `validarPregunta` escala desplazamiento y paso a `1e9` y exige residuo absoluto menor que 1. Se conserva el mínimo como origen de los incrementos, evitando cambiar el contrato de `step`. |
| 3. Archivos en RAM | ✅ ATENDIDA | Comentario junto a la lectura base64: en producción subir el archivo a MinIO/S3 mediante el servicio de upload y guardar su URL de retorno en lugar del contenido en Zustand. |

Se añadió una prueba de regresión con casos de paso 0.5, 0.1, suma `0.1 + 0.2`, mínimos positivos y negativos, valores fuera del incremento y pasos pequeños. La implementación sigue siendo de demostración; los comentarios no implementan la integración de producción.

### Comprobaciones de esta corrección

- `bun run check`: salida 0 (reglas UI, TypeScript y ESLint).
- `bun run build`: salida 0, sin errores TypeScript. Conserva el aviso conocido del optimizador CSS sobre el selector `stroke`.
- `bun run storybook:build`: salida 0.
- `bunx vitest run --project formularios`: 33 pruebas aprobadas.
- `bunx vitest run --project storybook src/app/_stories/formularios.stories.tsx`: 14 historias aprobadas.
- Comprobación ampliada con historias de plataforma: 37 aprobadas y una fallida (`Territorios Con Teclado`). El fallo proviene de cambios concurrentes del geovisor: OpenLayers no interpreta `rgba(0.48, 0.1, 240, 0.9)` y no se encuentra el botón territorial. Se preservaron esos cambios ajenos; no se presenta esta ejecución ampliada como aprobada ni se modificaron pruebas o exclusiones.

[Evidencia de las observaciones y hashes](../docs/evidencias/formularios-2026-10-01/observaciones-eaf/manifest.json). Las salidas completas se conservan en el mismo directorio.

La corrección no modifica backend ni ejecuta un nuevo reinicio del servicio. Los resultados anteriores de 32 pruebas/151 historias corresponden a sus respectivos snapshots históricos; esta sección registra la validación actual de las observaciones.
