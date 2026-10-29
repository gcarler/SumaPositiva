# Acceso visible a los adjuntos de actividades

## Solicitud y hallazgo

El usuario indicó que no encontraba opciones para cargar Word, Excel, imágenes
y PDF en las actividades de Proyectos.

La implementación de carga, listado, descarga y eliminación ya existía en
`FichaActividadPanel` y en la API de Proyectos, documentada por AGY2 en la entrega
265. La ficha se abría desde el nombre de la actividad, pero Lista y Tarjetas
carecían de un acceso explícito a los adjuntos. El selector de archivos estaba
representado por un texto interactivo.

## Cambios de esta entrega

- Botón **Adjuntos** en cada fila de Lista y en cada tarjeta de Proyectos.
- El botón abre la ficha y desplaza su contenido hasta **Anexos y Archivos
  Adjuntos**, mediante la propiedad tipada `seccionInicial: "anexos"`.
- Botón nativo del kit **Seleccionar archivo**, con foco visible y soporte de
  teclado. Se conserva la opción de arrastrar el archivo.
- Descripción opcional con etiqueta asociada y nombres accesibles en las acciones
  de descarga, eliminación y cancelación.
- Validación de archivo vacío y bloqueo de reemplazo del archivo mientras se sube.
- La petición de subida dispone de 120 segundos y no se reintenta automáticamente,
  para reducir fallos por tiempo insuficiente y evitar duplicar escrituras.
- Texto de ayuda en Proyectos que explica dónde se gestionan los adjuntos.

Los formatos de la implementación existente incluyen `.doc`, `.docx`, `.xls`,
`.xlsx`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, presentaciones, texto,
CSV y ZIP. El límite existente es 25 MB por archivo. La disponibilidad de carga
y eliminación depende de la autorización de la sesión.

## Archivos de implementación

1. `src/features/proyectos/views/proyectos-view.tsx`
2. `src/features/proyectos/panels/ficha-actividad-panel.tsx`
3. `src/features/proyectos/services/proyectos-api.ts`
4. `src/app/_composition/panel-contracts.d.ts`

## Comprobaciones y publicación

Resultados, logs y hashes finales en
`bridge/evidencia_acceso_adjuntos_proyectos_20261029/`.

- `bun run check`: exit 0 (kit UI, TypeScript y ESLint).
- Revisión de espacios del diff: exit 0.
- Build aislado de Next y ensamblado standalone: exit 0.
- Build de Storybook: exit 0.
- Los builds conservan en sus logs los avisos de optimización CSS.
- `cambios.patch` delimita los cambios sobre la versión recibida de los cuatro
  archivos, preservando el trabajo previo de otros agentes.

Esta entrega usa análisis estático y compilación. No ejecuta nuevas suites de
pruebas ni operaciones de carga o eliminación contra producción. Las pruebas
reportadas por AGY2 en 265 pertenecen a esa entrega previa.

La carga existente se encuentra en **Proyectos → abrir actividad → Anexos y
Archivos Adjuntos**. Los nuevos accesos directos y ajustes de esta entrega quedan
en el árbol de trabajo, pendientes de publicación.
