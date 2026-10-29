# Vistas en lista y tarjetas en la plataforma

Solicitud: disponer de al menos dos presentaciones en todos los módulos.

## Implementación

Las colecciones principales de los 16 módulos internos de `/plataforma` disponen
de **Lista** y **Tarjetas**. Cada presentación usa los mismos registros, filtros,
ordenación y acciones de su colección. Los modos especializados siguen accesibles
en sus controles: matriz de actores, árbol causal, mapa, Gantt, Kanban y calendario.

| Módulo | Colección con ambas presentaciones |
| --- | --- |
| Dashboard | Indicadores de resumen, accesos, alertas y agenda próxima |
| Formularios | Catálogo de formularios, con sus acciones y confirmación de eliminación |
| Geovisor | Catálogo territorial visible junto al explorador geográfico |
| Mesas | Mesas filtradas, detalle y edición según permisos |
| Usuarios | Directorio paginado, perfil y edición según permisos |
| Contenido | Dimensiones de la arquitectura, noticias, fases, líneas y aportes |
| Noticias | Artículos ordenados por prioridad, estados y acciones editoriales |
| Testimonios | Cola de moderación según estado, con su justificación de rechazo |
| Fuentes | Fuentes filtradas, estados, radicación y recursos adjuntos |
| Actores | Directorio filtrado, clasificación, territorio y gestión |
| Diagnóstico | Fichas de indicadores de línea base y acceso a mediciones |
| Alternativas | Banco de alternativas, costo, plazo y evaluación de viabilidad |
| Seguimiento PAS | Compromisos, metas, avance, presupuesto y gestión |
| Proyectos | Actividades agregadas filtradas y apertura en su módulo de origen |
| Comunicaciones | Tareas filtradas, edición y cambio de estado |
| Configuración | Secciones de preferencias y parámetros |

El selector cambia la presentación de las colecciones descritas. Los informes,
editores y motores analíticos de las pestañas especializadas conservan sus propias
interfaces.

## Componentes y preferencias

- `src/shared/ui/collection-view.tsx`: selector accesible con `ToggleGroup` del kit
  y contenedor adaptable para ambas presentaciones.
- `src/core/preferences/collection-view-store.ts`: preferencia independiente por
  módulo en el navegador, clave `polis-vistas-colecciones-v1`. Solo almacena el tipo
  de vista. Recupera valores válidos y mantiene la elección durante la sesión si
  el almacenamiento local está bloqueado o lleno.
- `src/app/_stories/collection-view.stories.tsx`: ejemplos interactivos de Lista
  y Tarjetas usando el componente de producto.
- Registro del componente en `src/shared/design-system/catalog.ts`.

Las tarjetas muestran identidad, estado y campos propios de cada registro.
Las acciones utilizan los mismos paneles y manejadores que la lista. El cambio
de vista conserva los filtros y la página actual del directorio de usuarios.

## Validación y evidencia

Evidencias en `bridge/evidencia_vistas_lista_tarjetas_20261029/`.
Los resultados finales y hashes de los archivos de implementación se registran
en `resumen.json`, dentro de ese directorio.

- Reglas estáticas del kit UI: correctas.
- ESLint dirigido a los 24 archivos de implementación: correcto.
- Revisión de espacios de los archivos de la entrega: correcta.
- TypeScript: correcto.
- Compilación final de Next y ensamblado standalone: correctos.
- Compilación final de Storybook: correcta. Ambos builds emitieron ocho avisos
  de optimización CSS, conservados en sus logs.
- El primer `bun run check` pasó kit UI y TypeScript; su fase de ESLint encontró
  una variable `html` sin uso en `.tmp-vivo-debug.mjs:16`, archivo temporal ajeno
  a esta implementación. La repetición final confirma el mismo bloqueo;
  `check-global.log` conserva la salida completa.

Esta entrega aporta revisión de código, análisis estático y compilación.
No se ejecutaron suites de pruebas ni recorridos funcionales en navegador;
no acredita una auditoría independiente de accesibilidad o EAF.

## Estado de entrega

Implementación en el árbol de trabajo compartido. Publicación en producción
pendiente. El build se genera en un directorio independiente del artefacto
activo. Las modificaciones automáticas de rutas de tipos de ese build se retiran
al terminar, preservando la configuración previa del proyecto.
