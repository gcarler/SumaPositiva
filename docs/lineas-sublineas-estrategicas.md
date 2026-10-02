# Constructor de líneas y sublíneas estratégicas

Fecha: 2026-10-02. Implementación y revisión preventiva EDD; dictamen independiente EAF pendiente.

## Modelo y metodología

La arquitectura solicitada distingue dimensión canónica → línea estratégica → sublínea/proyecto. Cada línea referencia una fase existente del ciclo DNP y una dimensión activa entre económica, alimentaria, salud, ambiental, personal, comunitaria y política. El selector usa el catálogo de PostgreSQL: no crea dimensiones ni mezcla salud/alimentación o alertas tempranas como sustitutos de las siete dimensiones canónicas.

El [Decreto 37 de 2026 del Ministerio del Interior](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=272036) adopta la Política Pública de Convivencia y Seguridad Humana y articula su implementación territorial. Las [siete áreas del marco de seguridad humana del PNUD](https://hdr.undp.org/system/files/documents/primercomplete.pdf) sustentan el catálogo de dimensiones. La jerarquía de tres niveles, los códigos LE y estos campos son el diseño metodológico solicitado para POLIS; no se presentan como una cita textual del decreto ni como certificación jurídica del PAS.

Las sublíneas se almacenan como objetos en `LineaEstrategica.metadatos["sublineas"]`. Incluyen código, título, descripción, meta cuatrienal, indicador y actor corresponsable. El campo de lectura `sublineas` se deriva de ese JSONB. No hay migración nueva ni tablas paralelas; se mantiene el esquema histórico y otros metadatos existentes. Los registros anteriores sin dimensión permanecen legibles en un bloque de pendientes; el editor exige completar la dimensión y el código válido al guardarlos.

## API y transacciones

- POST `/api/v1/politicas/lineas`: crear, 201, permiso `politicas:gestionar@declarada`.
- PUT `/api/v1/politicas/lineas/{id}`: sustituir campos editables, 200, mismo permiso; conservar metadatos ajenos al editor y campos opcionales omitidos (orden y entidades corresponsables).
- DELETE `/api/v1/politicas/lineas/{id}`: 200 sin vínculos; 409 con aportes, mesas, instrumentos, indicadores o asignaciones presupuestales; inexistente 404.
- GET `/api/v1/politicas/lineas/gestion`: lectura completa incluyendo inactivas para autoridad distrital, administrador de identidades y auditor forense. El listado público existente solo muestra activas.

La matriz se mantiene en `docs/permisos-api.md`. No se añadieron permisos ni se asignaron roles desde registro público. El auditor carece de acciones de escritura tanto en UI como en API.

`LineaService` delimita una transacción y valida el DTO antes de commit. `LineaRepository` consulta, flush y refresh, sin commit/rollback. Edición y eliminación bloquean la línea; creación/edición bloquean las fases en orden estable para serializar la comprobación de código único por fase. Se prueba concurrencia con dos solicitudes del mismo código: 201 + 409, una fila. La unicidad por fase se garantiza en estas rutas, sin agregar una restricción nueva que pueda romper datos históricos; una escritura SQL externa no está cubierta por esa guarda del servicio.

Validaciones: dimensión obligatoria canónica/activa, fase existente, código `LE-01`, título y descripción no vacíos, costo COP no negativo con precisión compatible con Numeric(18,2), al menos una fuente y hasta 200 sublíneas. Los códigos hijos deben ser únicos y pertenecer al padre (`LE-01.1`, `LE-01.2`). No se aceptan sublíneas alternativas ocultas dentro del metadato enviado.

No se introducen SP de negocio: se conserva el flujo router → servicio → repositorio → PostgreSQL.

## Administración y kit UI

En `/plataforma/contenido` la primera pestaña muestra “Dimensiones, Líneas y Sublíneas”. Hay una tarjeta por dimensión y acordeones de líneas con datos de fase, líder, objetivo, problema, financiación y costo. Cada línea expone su tabla de sublíneas, metas e indicadores. Las tablas tienen desplazamiento propio en móvil.

“Nueva Línea Estratégica” y “Editar” abren el panel `linea-editor`, registrado en el store y registro global. React Hook Form + Zod y `useFieldArray` gestionan el formulario y sus hijos. El selector de líder reutiliza `DEPENDENCIAS_CARTAGENA_2026`, censo del Banco de Conocimiento incorporado al repositorio. Si un registro histórico tiene otra entidad, se conserva como opción al editar.

La eliminación exige confirmación contextual dentro del acordeón, sin modal ni `window.confirm`. Un 409 conserva los datos visibles y comunica la razón. Las mutaciones esperan a la API; la caché TanStack se invalida después del éxito. No hay guardado simulado ni nuevos mocks de producto.

Se reutilizan ChoiceGroup, FormField, Select, Checkbox, Switch, Accordion y Table del kit. Iconos y textos identifican dimensiones usando tokens semánticos; no se usan los colores hex del catálogo como estilos literales. El panel se comprueba a 320 px en claro/oscuro y con nombres/etiquetas accesibles. La navegación desde la vista comprueba apertura, Tab, Escape y retorno de foco mediante PanelHost.

CSV y JSON exportan la jerarquía completa visible en administración, incluidas líneas inactivas y registros históricos sin dimensión. CSV escapa comillas, usa BOM UTF-8 y protege campos que puedan interpretarse como fórmulas. JSON conserva la estructura de dimensiones, líneas y sublíneas. Ambos se generan desde datos leídos de la API.

## Evidencia y límites

Los resultados están en `docs/evidencias/lineas-estrategicas-2026-10-02/` y la entrega en `bridge/02_entrega_codex.md`. Las escrituras de pruebas se realizan exclusivamente en `polis_test*`; no se crean proyectos ficticios en producción.

Se prueban CRUD real observado desde otra conexión, preservación de metadatos, exclusión pública de inactivas, validaciones negativas, las cinco clases de vínculos, concurrencia, fallo posterior a flush en creación/edición/borrado, fallo de commit y cancelación. La integración verifica instalación, comparación de metadatos y reconstrucción de migraciones sobre una base exclusiva.

El indicador es un nombre/metadato sugerido, no una ficha técnica del banco de indicadores ni un código BPIN validado. El presupuesto es estimación, no una apropiación o ejecución presupuestal. No se agregan vínculos automáticos al árbol de objetivos: se documenta su correspondencia metodológica y los campos requeridos. El esquema histórico admite dimensión NULL; las nuevas rutas exigen completarla. La clasificación de permisos y los límites de los checks globales se explican en la entrega, sin emitir conformidad independiente de EAF.

### Resultados de esta entrega

- 99 pruebas de constructor, permisos y transacciones: aprobadas en 32,24 s. Cuenta real de auditor: GET autorizado y POST/PUT/DELETE denegados.
- Integración de migraciones en `polis_test_lineas_migraciones_20261002`: 1 aprobada en 7,08 s; no se modifica el esquema físico de líneas.
- Historias nuevas del módulo: 8/8 aprobadas con accesibilidad, edición, jerarquía, error de API, lectura de auditor, 320 px claro/oscuro y navegación del panel.
- `bun run check`: aprobado, cero errores TS/UI/ESLint; una advertencia existente de React Compiler/TanStack Table.
- `bun run build` y `bun run storybook:build`: aprobados. Se conserva la advertencia CSS y advertencias de empaquetado preexistentes.
- `bun run ui:test` global: 196/199 aprobadas en esa ejecución, tres fallos en `platform.stories.tsx`: Crear Mesa Completa, Formulario Accesible y Territorios Con Teclado. Se documentan sin reducir checks ni atribuir aprobación global.
- `bun run backend:check`: detenido por 44 errores Ruff fuera del módulo de políticas. Lint/formato específico: aprobado.
- Servicios frontend y backend reiniciados y activos. HTTPS portal, `/plataforma/contenido` y listado público: 200; listado administrativo y POST sin token: 401. El 200 del cascarón Next no prueba una sesión: la navegación privada conserva su guard de cliente y la API aplica autenticación y autorización.

Las dos historias adicionales de móvil y la prueba de navegación se verificaron en el alcance del módulo después de la ejecución global; la cifra 199 describe esa ejecución concreta, no el número final de historias del repositorio.
