# Reglas de POLIS UI

Estas reglas aplican al frontend, Storybook y cualquier cambio en la biblioteca.
La guía de composición está en [design-system.md](design-system.md); este documento
es la fuente de las restricciones y criterios de aceptación.

## Reglas obligatorias

1. **Reutilizar antes de crear.** Buscar en `src/shared/ui` y Storybook. Los controles
   de producto usan `Button`, `Input`, `Textarea`, `Label`, `Select`, `FormField` y
   los patrones existentes. Los elementos HTML de esos controles se implementan
   dentro de la biblioteca. No crear otra biblioteca paralela ni copiar un primitivo
   a una feature. `motion.button` se reserva para tarjetas con `ui-interactive-card`;
   el botón de fondo de `PanelHost` es infraestructura del cierre.
2. **Una fuente de tokens.** Colores literales solo en
   `src/shared/design-system/tokens.css`; consumir clases semánticas o `var(--token)`.
   No introducir paletas Tailwind literales ni colores arbitrarios por pantalla.
   Usar las escalas de espaciado, tipografía, radios, controles, elevación y movimiento.
   Los dos colores de metadatos `viewport` en `app/layout.tsx` y selectores que
   identifican markup externo de gráficos tienen un uso distinto al estilo visual.
3. **Biblioteca independiente.** `shared` no importa `features`, `core` ni `app`.
   `core` no importa `features` ni `app`. Estas reglas también aplican a imports
   relativos, exports y carga dinámica. Encapsular Radix, Vaul y cmdk en `shared/ui`.
   Los adaptadores de dominio viven en su feature; el ensamblaje global vive en `app`.
4. **Paneles laterales como patrón de producto.** Usar `SidePanel` mediante
   `PanelShell` y `PanelHost`. No montar un host paralelo ni sustituirlo por overlays
   centrados. `Dialog`, `AlertDialog`, `Drawer` y `Sheet` se conservan para compatibilidad
   y ejemplos del kit; las features no los importan para nuevos flujos.
   Mantener foco inicial, fondo inactivo, Tab dentro del panel, Escape, retorno del
   foco y exclusión de paneles inferiores y salientes del árbol accesible.
5. **Accesibilidad conservada.** Etiquetas asociadas a controles, ayuda/error con IDs,
   nombres accesibles para iconos, foco visible y semántica HTML correcta.
   Conservar valores ante errores. Respetar movimiento reducido y áreas seguras.
   No usar `outline-none` para suprimir el foco sin un reemplazo visible.
   No desactivar reglas axe ni rebajar `a11y.test: "error"` para hacer pasar una historia.
6. **Ambos temas y móvil.** Revisar claro y oscuro, ancho de 320 px y escritorio.
   El significado de un estado siempre incluye texto; no depender solo del color.
   Ninguna pantalla puede introducir desbordamiento horizontal involuntario.
7. **Contrato e historias.** Props tipadas y exports explícitos por archivo, sin barrel
   global del kit. Cada componente nuevo se registra en `design-system/catalog.ts`
   con `status: "ready"` y tiene al menos una historia que lo importa directamente.
   Los ejemplos cubren los estados relevantes: vacío, error, carga, disabled,
   selección o interacción según corresponda. Solo Toast/Toaster heredados utilizan
   `status: "compatibility"`; no es una salida para omitir documentación.
8. **Una implementación, dos consumidores.** App y Storybook comparten componentes,
   tokens y estilos; no mantener una versión especial de la UI para el catálogo.
   Los mocks de pantallas se reinician entre historias y no escriben a servicios reales.
   Conservar Sonner como sistema de notificaciones de producto.
9. **Cambios verificables.** Ejecutar los checks afectados y documentar resultados.
   No ocultar errores de TypeScript ni modificar el validador, las pruebas o la
   configuración de accesibilidad para eludir una restricción.

## Tipado de contratos y entradas

Mantener TypeScript estricto. Evitar `any`, `as any`, dobles conversiones
`as unknown as T` y otras conversiones usadas para eludir un contrato. Una
conversión justificada por una API externa requiere evidencia de su contrato y
validación cuando el dato provenga de entradas no confiables.

`unknown` es apropiado para datos aún no validados: estrechar con guardas o
validar con un esquema antes de usarlos como un tipo concreto. Se puede almacenar
o transportar un valor como `unknown` sin fingir que se conoce su estructura.
Estas reglas se verifican mediante tipos, lint y revisión del flujo de datos;
las guardas UI no acreditan por sí solas validación de entradas remotas.

Decisión de reglas — 2026-10-01: se aclara el uso de `unknown` y las conversiones
que eluden tipos, autorizado en la revisión de EDD/EAF. No cambia las excepciones
de overlays del kit ni desactiva checks existentes.

## Qué comprueba automáticamente el repositorio

`bun run ui:check` analiza TS/TSX y CSS de `src` y `.storybook` sin modificarlos.

| Código | Incumplimiento                                                                       |
| ------ | ------------------------------------------------------------------------------------ |
| UI001  | Controles HTML fuera del kit o acciones `motion.button` fuera del patrón de tarjeta. |
| UI002  | Importación directa de primitivos externos fuera de `shared/ui`.                     |
| UI003  | Paletas Tailwind, colores arbitrarios o literales fuera de tokens.                   |
| UI004  | Dependencias de capas indebidas, incluso relativas y dinámicas.                      |
| UI005  | Importar overlays de compatibilidad fuera del kit.                                   |
| UI006  | Inventario incorrecto, incompleto, duplicado o falsa compatibilidad.                 |
| UI007  | Componente sin una historia que lo importe.                                          |
| UI008  | Desactivar o rebajar pruebas de accesibilidad mediante configuración literal.        |

El análisis estático comprueba referencias que puede resolver; no demuestra
semántica, cobertura de estados, resultado visual ni clases construidas desde datos.
Tampoco una importación en una historia demuestra por sí sola que el componente
se renderice correctamente. Vitest/axe, TypeScript, ESLint y la revisión humana
completan la validación. Los checks automáticos no equivalen a una certificación WCAG.

```bash
bun run ui:check          # guardas de POLIS UI
bun run ui:policy:test    # pruebas del validador en proyectos temporales
bun run check            # guardas + TypeScript + ESLint
bun run ui:test          # historias, interacciones y axe en Chromium
bun run storybook:build
bun run build
```

Para un cambio solo de texto o documentación, ejecutar los checks correspondientes
al alcance. Para componentes, tokens, paneles o configuración visual, ejecutar
`check`, `ui:test` y los builds afectados. CI ejecuta todas estas validaciones.

## Evolución y excepciones

La biblioteca puede evolucionar: un patrón faltante se incorpora al kit con contrato,
ambos temas, historias y pruebas pertinentes, y luego se usa en producto.
Un ajuste dentro de estas reglas no necesita aprobación adicional.

Si una petición explícita cambia una regla, documentar la decisión y su alcance,
actualizar este documento y sus comprobaciones con pruebas de aceptación y rechazo.
Si la intención es ambigua y el cambio depende de una excepción, aclararla antes de
introducirla. No añadir listas de archivos ignorados, desactivaciones o deuda nueva
para simular cumplimiento. Conservar cambios ajenos.

## Uso por agentes y colaboradores

- Construcción: [.agents/skills/polis-ui-build/SKILL.md](../.agents/skills/polis-ui-build/SKILL.md).
- Revisión: [.agents/skills/polis-ui-review/SKILL.md](../.agents/skills/polis-ui-review/SKILL.md).
- Las instrucciones de `AGENTS.md` vinculan estas reglas con el trabajo de frontend.
- En GitHub, configurar el job `frontend` como check requerido de la rama protegida
  impide fusionar cambios que fallen CI. La protección de rama se administra fuera
  de estos archivos; esta entrega no modifica la configuración remota del repositorio.
