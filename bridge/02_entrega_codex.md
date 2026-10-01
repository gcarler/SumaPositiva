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
