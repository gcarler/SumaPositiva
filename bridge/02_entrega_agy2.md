# Entrega agy2 — Módulos Noticias y Testimonios
Fecha: 2026-10-02T04:17:28Z
Commit: 2aa263b65f57402ef4b1f811a6be3ba9cdf403ee
Estado: CONFORME

## Módulos Implementados
1. **Modelos de datos**:
   - `Noticia` y `CategoriaNoticia` en `src/features/noticias/models/noticia.ts`
   - `Testimonio` y `TipoTestimonio` en `src/features/testimonios/models/testimonio.ts`
2. **Mocks contextualizados para Cartagena**:
   - 6 noticias en `src/features/noticias/data/noticias.mock.ts`
   - 6 testimonios en `src/features/testimonios/data/testimonios.mock.ts`
3. **Zustand Stores**:
   - `useNoticiasStore` en `src/features/noticias/state/noticias-store.ts`
   - `useTestimoniosStore` en `src/features/testimonios/state/testimonios-store.ts`
4. **Vistas Pro**:
   - `NoticiasView` en `src/features/noticias/views/noticias-view.tsx` (Hero destacado, filtros, buscador, cards animadas)
   - `TestimoniosView` en `src/features/testimonios/views/testimonios-view.tsx` (Masonry Pinterest quotes, filtros por actor, CTA)
5. **Paneles L4 Zero-Modals**:
   - `NoticiaPanel` en `src/features/noticias/panels/noticia-panel.tsx` (Markdown, autor, fecha, compartir con portapapeles)
   - `TestimonioNuevoPanel` en `src/features/testimonios/panels/testimonio-nuevo-panel.tsx` (Toggle anonimato, contador 500 chars, dimensiones ONU, toast)
   - Registrados en `panel-store.ts` y `panel-registry.tsx`
6. **Navegación e Integración Home**:
   - Vistas `noticias` y `testimonios` agregadas a `navigation-store.ts`
   - Topbar actualizada con 6 accesos directos
   - AnimatePresence en `page.tsx`
   - Sección de doble CTA (Últimas noticias y testimonios destacados) en `inicio-view.tsx`

## Verificación de Calidad (QA)
- `bun run check`: 0 errores TypeScript, 0 infracciones a ui-policy.
- `bun run build`: Build de producción exitoso.
- `polis-frontend.service`: Servicio activo y respondiendo HTTP 200 en http://127.0.0.1:3000.
