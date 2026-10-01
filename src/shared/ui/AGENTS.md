# Biblioteca POLIS UI

Aplica las reglas de `docs/kit-ui-rules.md` relativas a la raíz del repositorio y
las instrucciones de `AGENTS.md` de la raíz. Esta biblioteca es independiente del
negocio; sus consumidores son la aplicación y Storybook.

Antes de añadir un componente, busca uno existente y sus historias. Los componentes
nuevos tienen props tipadas, tokens semánticos, import explícito por archivo,
entrada `ready` en `src/shared/design-system/catalog.ts` e historias de sus estados
relevantes. La compatibilidad está reservada a componentes heredados documentados.

Usa el skill `.agents/skills/polis-ui-build/SKILL.md` para implementar y
`.agents/skills/polis-ui-review/SKILL.md` para revisar; las rutas parten de la raíz.
Verifica `bun run check`, `bun run ui:test` y los builds afectados. No debilites
los checks para solucionar un fallo.
