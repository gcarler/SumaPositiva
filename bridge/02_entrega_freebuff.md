# Entrega — Geovisor de Seguridad Humana

Fecha: 2026-10-01

## Estado por tarea

| Tarea | Estado | Resultado |
| --- | --- | --- |
| T1 — Dependencias | ✅ CONFORME | `ol` y `@types/ol` incorporados al proyecto. |
| T2 — Mapa | ✅ CONFORME | OpenLayers con base OSM, centrado en Cartagena, puntos de referencia territoriales, capas diferenciadas, selección/hover y filtros por localidad. Se usan puntos porque el catálogo de barrios no incluye geometrías; no se dibujan límites ficticios. |
| T3 — Panel territorial | ✅ CONFORME | Panel lateral integrado al registro existente, con datos de referencia, cifras estáticas de criminalidad 2025, fuente, alcance y buscador del catálogo oficial por localidad. |
| T4 — Vista | ✅ CONFORME | Vista dinámica sin SSR, encabezado solicitado, leyenda y selección que abre el panel. El catálogo oficial de 205 barrios también está disponible en el buscador/filtro del mapa. |
| T5 — Backend opcional | ✅ CONFORME (OPCIONAL DIFERIDO) | No se crearon endpoints; la tarea permite la entrega inicial con datos estáticos tipados en frontend. |
| T6 — Calidad y despliegue | ⚠️ PARCIAL | `bun run check`, `bun run build` y `bun run storybook:build` terminaron correctamente. Las historias reportan 149/150 pruebas aprobadas; la historia del mapa y barrios pasó. Falló `Editor Nuevo` del área Formularios al no encontrar el diálogo esperado. No se reiniciaron servicios ni se hizo una solicitud al servidor: no se ejecutaron operaciones de despliegue. |

## Validaciones

- `bun run check`: código 0; guardas UI, TypeScript y ESLint aprobados. ESLint reportó una advertencia preexistente en `src/features/formularios/components/pregunta-respuesta.tsx`.
- `bun run build`: código 0; compilación de Next.js y TypeScript aprobada. La optimización CSS emitió una advertencia de token CSS en un selector existente.
- `bun run storybook:build`: código 0.
- `bun run ui:test`: 149 aprobadas, 1 fallida de 150. La historia `MapaYBarrios` aprobó; falló `Editor Nuevo` en `src/app/_stories/formularios.stories.tsx` (panel sin diálogo accesible).
- `git diff --check` en los archivos de la entrega: sin errores de whitespace.
- Búsqueda de menciones de MIDAS dentro de `src`: sin coincidencias.

## Datos y decisiones

- Se utiliza el catálogo oficial TypeScript `BARRIOS_CARTAGENA` / `BARRIOS_POR_LOCALIDAD` (205 barrios: LH 84, LV 53, LI 68) tanto en el filtro/búsqueda del mapa como en el panel territorial. Se muestran UCG y estrato.
- El catálogo no tiene coordenadas ni polígonos. Al elegir un barrio, la interfaz filtra/abre su localidad asociada y explica que no puede situar el barrio individualmente en el mapa; no se inventan polígonos ni cifras por barrio.
- Los datos estáticos incluyen los totales indicados (410 homicidios y 6.493 hurtos a personas), corte septiembre 2025 y fuente Policía Nacional / Cartagena Cómo Vamos; el desglose por localidad se identifica como agregado de referencia, no geocodificación barrial.
- No se inventó una cifra de percepción ciudadana: se explica que no se dispone de serie y metodología verificables.
- No se añadió persistencia ni integración backend; se conservan los datos de demostración separados de datos persistidos.

## Commit

Hash: no generado (no se creó commit). El árbol de trabajo contiene cambios paralelos ajenos a esta entrega; se evitó `git add -A` para no incluir ni comprometer esos cambios.
