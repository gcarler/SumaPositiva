---
name: polis-ui-build
description: Construir o modificar componentes, pantallas, formularios, paneles, tokens y ejemplos de Storybook del proyecto POLIS respetando su kit UI. Usar para implementación de frontend POLIS; no para backend o UI de otros proyectos.
---

# Construir UI en POLIS

Localiza la raíz de POLIS mediante el directorio de trabajo o la ubicación real de
este skill. Lee `AGENTS.md`, `docs/kit-ui-rules.md` y la parte pertinente de
`docs/design-system.md`. Las reglas se mantienen en el repositorio; no las dupliques
ni uses una copia global desactualizada.

Antes de implementar, busca el componente y sus historias en `src/shared/ui`.
Compón con los patrones existentes. Ubica estado y datos en la feature o en core
según su responsabilidad; la biblioteca no lee stores de negocio.

Para un componente faltante, créalo en el kit con props tipadas, tokens semánticos,
estados relevantes e historia que lo importe. Regístralo en
`src/shared/design-system/catalog.ts` como `ready`. Usa la misma implementación en
producto y en Storybook. No uses compatibilidad para evitar una historia.

Para navegación y edición, conecta `SidePanel` al host existente. Conserva foco,
teclado, fondo inactivo y comportamiento de la pila. En formularios, compón
`FormField` con controles del kit y asocia ayuda y errores. Revisa ambos temas,
320 px, escritorio y movimiento reducido cuando cambies animaciones.

Ejecuta `bun run check`. Para UI, ejecuta las historias con `bun run ui:test` y los
builds afectados (`storybook:build`, `build`). Si falta Chromium, instala el navegador
con `bunx playwright install chromium`. Si modificas las guardas, ejecuta también
`bun run ui:policy:test`. Para ajustes solo de texto, escala la verificación al alcance.

Corrige los incumplimientos; no rebajes checks ni añadas exclusiones para pasar.
Una petición explícita del usuario puede cambiar una regla: aplica el procedimiento
de evolución de `docs/kit-ui-rules.md` sin pedir de nuevo autorización ya concedida.
No amplíes una tarea UI a cambios de backend, despliegue o comunicaciones externas.

Entrega los cambios concretos, su validación y cualquier limitación pendiente.
