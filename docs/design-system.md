# POLIS UI — sistema de diseño y biblioteca

La aplicación y Storybook consumen el mismo código. Conservamos una biblioteca
local, tipada y organizada por responsabilidades; publicar un paquete npm separado
no es necesario para esta etapa.

## Estructura

- `src/shared/design-system/tokens.css`: colores semánticos en ambos temas,
  tipografía, espaciado, radios, alturas de controles, elevación y movimiento.
- `src/shared/design-system/styles.css`: integración con Tailwind, fuentes locales
  Geist/Geist Mono, utilidades y reglas de foco y movimiento reducido.
- `src/shared/ui/`: primitivos y patrones reutilizables sin dependencias de negocio.
- `src/shared/design-system/catalog.ts`: inventario público de componentes.
- `src/features/*/components`: adaptadores de dominio, como estados de políticas.
- `src/core/panels`: navegación y pila de paneles; `SidePanel` solo presenta contenido.
- `.storybook/`: catálogo, documentación, temas y pruebas.
- `src/app/_stories/`: pantallas reales con datos de demostración reiniciados por historia.

Se importan componentes por archivo (`@/shared/ui/button`), con props tipadas y
exports explícitos. Los componentes compartidos no importan stores ni servicios
de `features`. Las reglas de capas siguen `docs/arquitectura.md`.

## Fundamentos y composición

La identidad mantiene superficies cálidas, texto de alto contraste y naranja
`ember` para participación. Los estados usan roles semánticos `success`, `warning`,
`danger` e `info`; el significado se acompaña siempre de texto.

| Necesidad | Componente |
| --- | --- |
| Acción y espera | Button: variantes, tamaños, disabled, loading |
| Campo con ayuda o error | FormField + Input / Textarea / Select |
| Búsqueda y filtros | SearchField, FilterChip |
| Opciones excluyentes | ChoiceGroup con navegación por flechas |
| Cabecera | PageHeader |
| Ausencia de datos | EmptyState |
| Estado o aviso | StatusBadge, Badge, Notice |
| Carga y progreso | Skeleton, Progress |
| Lectura y edición contextual | SidePanel conectado a PanelHost |
| Notificaciones | Sonner; Toast/Toaster se conservan por compatibilidad |

Los primitivos restantes incluyen navegación, calendario, tablas, gráficos,
menús, tabs, ayudas y controles Radix. El catálogo muestra ejemplos utilizables;
Button, FormField y SidePanel también ofrecen documentación de props y controles.

Las alturas base son 36, 44 y 48 px. Los campos usan 44 px y los paneles respetan
el área segura inferior del dispositivo. Geist se sirve desde dependencias locales,
sin solicitar fuentes externas durante la compilación.

## Desarrollo

```bash
bun install --frozen-lockfile
bun run storybook             # http://localhost:6006
bun run storybook:build       # artefacto: storybook-static/
bunx playwright install chromium
bun run ui:test              # historias e interacciones en Chromium + axe
bun run ui:test:watch
bun run check
bun run build
```

El selector Tema del catálogo permite claro y oscuro. Hay historias explícitas
oscuras de pantallas y patrones. Las pantallas utilizan mocks aislados; no realizan
peticiones a la API y no acreditan persistencia en servidor.

CI ejecuta TypeScript, ESLint, builds de Next y Storybook y pruebas de historias.
Publica el catálogo estático como artefacto descargable de la ejecución.

## Accesibilidad y contribuciones

Los campos asocian etiquetas, ayuda y errores con IDs. Las acciones muestran foco;
las opciones usan radios reales. El host coloca el foco en el panel activo,
inactiva el fondo y los paneles inferiores, limita Tab al panel y devuelve el foco
al cerrarlo. Escape respeta los controles anidados y restaura un panel maximizado
antes de cerrar. Las regiones con scroll admiten navegación por teclado.

Al agregar un componente:

1. Ubicarlo en `shared/ui` si es independiente del dominio; de otro modo, en su feature.
2. Reutilizar tokens, variantes y patrones existentes.
3. Añadir historias con uso real, estados relevantes y nombres accesibles.
4. Verificar teclado, ambos temas y ancho de 320 px.
5. Actualizar el inventario y ejecutar los checks afectados.

Axe detecta problemas automáticos; estas pruebas no equivalen a una certificación
WCAG. La revisión con lectores de pantalla, usuarios y dispositivos reales sigue
siendo parte del trabajo de producto. Evitamos desactivar reglas para ocultar fallos.

Referencias: [Storybook con Next.js y Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite),
[pruebas con Vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon),
[pruebas de accesibilidad](https://storybook.js.org/docs/writing-tests/accessibility-testing).

## Validación de esta entrega

El 2026-10-01 se verificaron:

- 57 componentes inventariados, 104 historias y 8 páginas de documentación.
- 104 pruebas de historias aprobadas en Chromium, incluidas interacción, axe,
  foco de paneles y creación completa de una mesa con los mocks.
- TypeScript, ESLint y compilaciones de Next.js y Storybook aprobados.
- Sin desbordamiento horizontal en inicio a 320, 390, 768 y 1440 px.
- Revisión adicional con axe en inicio, exploración, mesas y sesión, en ambos
  temas, sin infracciones automáticas detectadas en esas pantallas.

Estas verificaciones corresponden a la UI de demostración y no validan contratos
ni persistencia de los futuros endpoints de negocio.

## Reglas y skills

Las restricciones y sus guardas automáticas están en [kit-ui-rules.md](kit-ui-rules.md).
Los skills versionados `polis-ui-build` y `polis-ui-review` guían implementación y
revisión. `bun run check` incluye la comprobación de políticas del kit.


### Select dentro de paneles apilados

`SelectContent` utiliza el token `--layer-dropdown` para que su portal quede encima
de la pila de paneles. La historia de identidad `SelectEnPanelApilado` comprueba
que una opción recibe interacción en su posición real; conservar esta prueba al
cambiar capas o geometría de paneles. El fondo institucional completo pertenece a
`#polis-application` y queda inactivo mientras se opera un panel.
