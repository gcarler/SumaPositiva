# Entrega agy2 — Módulos Noticias y Testimonios Pro (Auditoría Administrativa y Multimedia)
Fecha: 2026-10-02T04:27:53Z
Commit: 3e5fc2b90019c8beb11c743b67b4fb1c8a811536
Estado: CONFORME

## Módulos y Mejoras Implementadas

### 1. Modelo Extendido (`src/features/noticias/models/noticia.ts`)
- Estados de publicación: `"publicada" | "borrador" | "archivada"` (`EstadoNoticia`).
- Orden de prioridad numérico: `ordenPrioridad: number` (1 = máxima prioridad).
- Multimedia completo: `galeria?: string[]` y `videoUrl?: string` (YouTube, Vimeo o MP4).
- Tipo `NoticiaInput` para creación y edición.

### 2. Store con Ciclo de Vida Editorial (`src/features/noticias/state/noticias-store.ts`)
- CRUD reactivo: `crearNoticia`, `actualizarNoticia`, `eliminarNoticia`.
- Control de visibilidad: `cambiarEstado` (`publicada`, `borrador`, `archivada`).
- Priorización: `reordenarPrioridad`.
- Selector determinista: `noticiasPublicadasOrdenadas(s)` (filtra `estado === "publicada"` y ordena por `ordenPrioridad ASC`, luego fecha DESC).

### 3. Panel Editor Zero-Modals L4 (`src/features/noticias/panels/noticia-editor-panel.tsx`)
- Modos creación (`noticiaId === undefined`) y edición.
- Campos: Título, resumen, contenido en Markdown, categoría, autor, estado, orden de prioridad y switch de destacada en Home.
- Portada: URL o carga directa de imagen con previsualización.
- Galería: subida múltiple de fotos de soporte con miniaturas y eliminación instantánea.
- Video: URL con previsualización reactiva embebida.
- Etiquetas temáticas dinámicas.
- Registrado como `"noticia-editor"` en `panel-store.ts` y `panel-registry.tsx`.

### 4. Soporte Multimedia y Acceso Editorial
- `NoticiaVideoPlayer` (`src/features/noticias/components/noticia-video-player.tsx`): reproductor responsivo para YouTube nocookie, Vimeo y direct MP4.
- `NoticiaPanel` (`src/features/noticias/panels/noticia-panel.tsx`): visualización de video, galería fotográfica con lightbox/zoom y botón de edición directa para roles autorizados.
- `NoticiasView` (`src/features/noticias/views/noticias-view.tsx`): badges multimedia (`Play` para video, `Layers` para galería), botón `+ Crear Noticia` para editores y filtrado según permisos.

### 5. Gestión Administrativa en Plataforma (`src/features/plataforma/views/contenido-view.tsx`)
- Pestaña "Noticias y Comunicados" en `/plataforma/contenido`:
  - Métricas ejecutivas (total, publicadas, borradores, con multimedia).
  - Tabla con miniatura, título, categoría, estado con alternancia rápida, prioridad, fecha y acciones (ver, editar, eliminar).
  - Botón `+ Nueva Noticia` que abre el panel editor.

### 6. Home Inteligente (`src/features/politicas/views/inicio-view.tsx`)
- Filtrado estricto por `estado === "publicada"` mediante `noticiasPublicadasOrdenadas`.
- Ordenación por `ordenPrioridad ASC` asegurando las noticias más importantes de primero.
- Badges visuales de prioridad y multimedia en cada card del Home.

## Verificación de Calidad (QA)
- `bun run check`: 0 errores TypeScript, 0 advertencias críticas, 0 violaciones a UI policy.
- `bun run build`: Build de producción exitoso en Turbopack (14 rutas estáticas/dinámicas).
- `polis-frontend.service`: Servicio reiniciado y respondiendo HTTP 200 en http://127.0.0.1:3000.
