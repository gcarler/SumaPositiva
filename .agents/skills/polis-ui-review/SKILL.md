---
name: polis-ui-review
description: Revisar diffs, componentes y pantallas de POLIS para detectar incumplimientos del kit UI, dependencias de capas, regresiones de accesibilidad y falta de historias. Usar para revisiones de frontend POLIS; no para auditorías de backend o revisiones genéricas de otros proyectos.
---

# Revisar POLIS UI

Localiza la raíz de POLIS y lee `AGENTS.md` y `docs/kit-ui-rules.md`, la fuente de
las restricciones. Consulta `docs/design-system.md` cuando haga falta contrastar
el patrón previsto. Delimita el diff solicitado y conserva cambios ajenos.

Ejecuta `bun run ui:check` y revisa los archivos afectados. Comprueba reutilización
del kit, tokens, independencia de shared, historias e inventario. Busca también
lo que el análisis estático no demuestra: controles recreados con aliases, clases
dinámicas, estados omitidos, estilos duplicados, componente importado pero no
renderizado, foco invisible y resultados visuales distintos entre app y Storybook.

Para paneles, comprueba foco inicial, Tab, Escape, devolución del foco, apilado y
paneles salientes inactivos. Para formularios, comprueba etiquetas, nombres accesibles,
ayuda/error, valores conservados y estados de espera. Revisa claro/oscuro, 320 px,
escritorio y movimiento reducido en los cambios que corresponda.

Ejecuta `bun run check`, las historias afectadas y los builds que el cambio requiera.
Si cambian tokens o patrones compartidos, ejecuta `bun run ui:test` completo. Si
cambia el validador, ejecuta `bun run ui:policy:test`. No desactives axe ni rebajes
pruebas para resolver un hallazgo.

Reporta hallazgos con archivo/línea, regla, consecuencia observable y corrección
concreta, priorizados por impacto. Distingue incumplimientos de sugerencias.
No inventes hallazgos cuando los checks pasan y el diff conserva los contratos.
Indica qué se probó y qué no pudo verificarse; axe no acredita por sí solo WCAG.

Si el usuario pidió revisión, entrega el resultado. Si también autorizó corregir,
aplica los ajustes dentro del alcance y compruébalos. No publiques comentarios,
merges ni despliegues por el solo hecho de revisar.
