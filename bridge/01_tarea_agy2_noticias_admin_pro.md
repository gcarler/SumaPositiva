# TAREA AUDITORÍA — Módulo Noticias Pro: Gestión Administrativa, Publicación, Prioridad y Multimedia

## Diagnóstico de la Auditoría Forense
El módulo público de noticias (`NoticiasView`, `NoticiaPanel` y el bloque CTA en `InicioView`) fue entregado con alta calidad visual. Sin embargo, **la entrega está incompleta en el ciclo de vida administrativo**:
1. ❌ No existe panel ni formulario para **crear** nuevas noticias.
2. ❌ No existe panel para **editar** ni **publicar/despublicar** (estados: `borrador` | `publicada` | `archivada`).
3. ❌ No existe campo de **orden de prioridad** numérico para controlar cuáles van primero.
4. ❌ No soporta **videos** (`videoUrl` YouTube/Vimeo/MP4) ni **múltiples imágenes de soporte/galería**.
5. ❌ En `/plataforma/contenido` no hay pestaña o vista para que el administrador gestione las noticias.
6. ❌ En el Home (`inicio-view.tsx`), el selector está hardcodeado a `slice(0, 3)` sin filtrar por `publicada` ni ordenar por `prioridad`.

---

## Lo que debes implementar:

### 1. Modelo Extendido (`src/features/noticias/models/noticia.ts`)
```ts
export type EstadoNoticia = "publicada" | "borrador" | "archivada";

export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido: string;            // Markdown
  imagenPortada?: string;       // URL o Base64
  galeria?: string[];           // Múltiples fotos de soporte
  videoUrl?: string;            // YouTube, Vimeo o MP4
  categoria: CategoriaNoticia;
  autor: string;
  publicadaEn: string;
  destacada: boolean;
  ordenPrioridad: number;       // 1 (máxima prioridad), 2, 3, etc.
  estado: EstadoNoticia;        // "publicada" | "borrador" | "archivada"
  etiquetas: string[];
}

export type NoticiaInput = Omit<Noticia, "id" | "slug" | "publicadaEn">;
```

### 2. Store con CRUD y Ordenación (`src/features/noticias/state/noticias-store.ts`)
Añadir acciones reactivas completas:
- `crearNoticia: (input: NoticiaInput) => Noticia` (genera id, slug y publicadaEn)
- `actualizarNoticia: (id: string, patch: Partial<Noticia>) => void`
- `eliminarNoticia: (id: string) => void`
- `cambiarEstado: (id: string, estado: EstadoNoticia) => void`
- `reordenarPrioridad: (id: string, nuevoOrden: number) => void`
- Selector helper: `noticiasPublicadasOrdenadas(s)` (filtra `estado === "publicada"` y ordena por `ordenPrioridad ASC`, luego fecha DESC).

### 3. Panel Editor de Noticias Zero-Modals (`src/features/noticias/panels/noticia-editor-panel.tsx`)
Crear panel de creación/edición con:
- Título, slug automático, resumen y contenido Markdown (con textarea amplio).
- Selector de Categoría y Autor institucional.
- **Selector de Estado**: `Publicada` | `Borrador` | `Archivada`.
- **Orden de Prioridad**: Campo numérico (ej. 1, 2, 3) y toggle `Destacada en Home`.
- **Carga de Portada y Galería**:
  - Input URL o carga de archivos de imagen (Drag & Drop con previsualización).
- **Video**: Input para URL de YouTube / Vimeo / MP4, con vista previa embebida si es válida.
- Guardar / Actualizar con notificación toast.

### 4. Soporte Multimedia en Vista y Detalle de Noticias
- En `NoticiaPanel` (`noticia-panel.tsx`):
  - Si tiene `videoUrl`: renderizar reproductor responsivo (iframe embebido de YouTube o `<video>` HTML5).
  - Si tiene `galeria`: carrusel o cuadrícula de fotos con modal/zoom de vista previa.
- En `NoticiasView` (`noticias-view.tsx`):
  - Mostrar badge de video (ícono Play) en las tarjetas que incluyan video.
  - Botón "+ Crear Noticia" en la cabecera (visible para roles con permiso de edición en plataforma).

### 5. Gestión en `/plataforma/contenido`
Actualizar `src/features/plataforma/views/contenido-view.tsx` para incluir la pestaña o sección **"Gestión de Noticias y Comunicados"**:
- Tabla/lista con: Título, Categoría, Estado (`Publicada`/`Borrador`), Prioridad, Fecha, Acciones (Editar, Cambiar estado, Eliminar).
- Botón "+ Nueva Noticia" que abre `openPanel("noticia-editor", {})`.

### 6. Home (`inicio-view.tsx`)
- Mostrar entre 2 y 4 noticias (configurable o las 3-4 con mayor prioridad que tengan `estado === "publicada"`).
- Ordenadas estrictamente por `ordenPrioridad ASC`.

### 7. Registrar panel en `panel-registry.tsx`
- Registrar `"noticia-editor"` apuntando a `NoticiaEditorPanel`.

---

## QA Obligatorio
```bash
bun run check
bun run build
sudo systemctl restart polis-frontend.service
```

## Entrega
Hacer commit y documentar en `/root/polis/bridge/02_entrega_agy2.md`.
EOF
