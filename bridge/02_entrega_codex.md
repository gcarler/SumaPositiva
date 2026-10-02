# Entrega Codex — Constructor de líneas y sublíneas estratégicas

Fecha: 2026-10-02T14:10:29.074399+00:00
Commit de implementación: `841ce7de2be69e37f6571cddeebb7d13afa07024`
Estado: IMPLEMENTADO, VERIFICADO Y DESPLEGADO EN EL ALCANCE. Dictamen independiente EAF/agy pendiente.

## Resultado

- Jerarquía dimensión canónica → línea estratégica → sublínea/proyecto. Nuevas escrituras exigen una de las siete dimensiones activas y una fase DNP existente.
- Backend: `SublineaSchema`, Create/Update/Read, JSONB `metadatos["sublineas"]`, service/repository transaccionales; sin modificar migraciones aplicadas ni crear otra persistencia.
- POST/PUT/DELETE con `politicas:gestionar`; lectura administrativa completa por roles autorizados. Código único por fase y códigos hijos coherentes. Metadatos y campos opcionales omitidos del editor se conservan.
- Eliminación bloqueada con 409 si hay aportes, mesas, indicadores, presupuesto o instrumentos vinculados; alternativa de desactivar sin borrar el expediente.
- Panel lateral `linea-editor`, React Hook Form + Zod + useFieldArray. Dimensión visual con iconos/tokens; fase, problema, objetivo, entidad, financiación, costo y sublíneas dinámicas.
- **Entidad Líder usa `DEPENDENCIAS_CARTAGENA_2026` de `src/features/politicas/data/entidades-cartagena.data.ts`**, según la nota del usuario. Se conserva una entidad histórica como opción al editar.
- `/plataforma/contenido`: pestaña principal Dimensiones, Líneas y Sublíneas; siete tarjetas, acordeones y tabla de hijos. Creación/edición por panel; eliminación con confirmación contextual Zero-Modals.
- Exportación CSV con protección anti-fórmulas y JSON jerárquico, incluyendo líneas inactivas y registros históricos sin dimensión.
- Registro del panel, ancho y guard de acceso integrados. El auditor tiene lectura y carece de botones de escritura.

## Validación

| Comprobación | Resultado |
| --- | --- |
| Backend constructor, permisos y transacciones | **99 aprobadas**, 32,24 s; persistencia leída desde una conexión nueva. |
| Integración PostgreSQL/migraciones | **1 aprobada**, 7,08 s, base aislada `polis_test_lineas_migraciones_20261002`. |
| Historias del módulo y accesibilidad | **8/8 aprobadas**; incluye 320 px claro/oscuro, panel, Tab, Escape y retorno del foco. |
| Lint y formato específicos | Aprobados, 7 archivos backend. |
| `bun run check` | Aprobado, 0 errores TS/UI/ESLint; warning previo TanStack/React Compiler. |
| `bun run build` | Aprobado; incluye `/plataforma/contenido`. Warning CSS previo. |
| `bun run storybook:build` | Aprobado; advertencias de empaquetado documentadas. |
| `bun run ui:test` global | 196/199 aprobadas en esa ejecución; tres fallos fuera del módulo en `platform.stories.tsx`. |
| `bun run backend:check` global | Detenido por **44 errores Ruff fuera del módulo de políticas**; no se declara aprobación global. |

Los tres fallos globales de historias corresponden a Crear Mesa Completa, Formulario Accesible y Territorios Con Teclado. La prueba global se ejecutó antes de añadir las últimas historias de móvil y navegación, verificadas después en las 8 del módulo. No se deshabilitaron checks ni se modificaron historias ajenas para simular éxito.

Pruebas negativas: dimensión/fase inexistente, títulos/códigos/costo inválidos, códigos hijos duplicados o ajenos, fuentes vacías y metadatos alternativos de sublíneas. Atomicidad: fallo tras flush en alta/edición/borrado, fallo de commit y cancelación; sin cambios residuales. Dos creaciones simultáneas con igual código producen 201/409 y una sola fila. Cuenta real de auditor en `polis_test`: GET 200 y POST/PUT/DELETE 403.

Las escrituras sintéticas se limitaron a `polis_test*`; no se introdujeron líneas o proyectos de ejemplo en producción.

## Despliegue comprobado

Frontend y backend reiniciados y activos. HTTPS con validación TLS:

- `/` → 200.
- `/plataforma/contenido` → 200 (cascarón Next sujeto a guard de sesión del cliente).
- `/api/v1/politicas/lineas` → 200, contrato con `sublineas` como array.
- `/api/v1/politicas/lineas/gestion` sin token → 401.
- POST `/api/v1/politicas/lineas` sin token → 401.

Informe: [docs/lineas-sublineas-estrategicas.md](../docs/lineas-sublineas-estrategicas.md).
Evidencias: `docs/evidencias/lineas-estrategicas-2026-10-02/`.
Matriz: `docs/permisos-api.md`.

## Límites metodológicos

No se afirma que la jerarquía de tres niveles o los códigos LE sean texto literal del Decreto 037: se documenta como diseño solicitado para POLIS, articulado con la norma y las siete áreas PNUD. Meta e indicador son campos de planificación, no una ficha técnica validada del banco de indicadores ni registro BPIN. El costo es estimado, no ejecución presupuestal. La relación con árboles de objetivos es metodológica; no se crea automáticamente un vínculo a nodos del árbol.

La tabla histórica mantiene dimensión nullable por compatibilidad; las rutas nuevas la exigen. La unicidad de código por fase se serializa en el servicio, sin nueva restricción que rompa históricos. La lectura administrativa completa se reserva a los tres roles documentados. La entrega no autoriza publicar respuestas ciudadanas ni añade la moderación de reportes pendientes.
