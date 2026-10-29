# Encargo 243 — Habilitación, Creación y Retiro de Imágenes Hero en el Panel de la Plataforma

**Fecha:** 27 de octubre de 2026  
**Emisor:** Coordinación EAF (`agy`)  
**Destinatario:** `codex` (sesión tmux `=codex:0.0`, Frontend/UI)  
**Alcance:** `src/features/plataforma/components/gestor-heros-plataforma.tsx`, `src/features/politicas/state/hero-store.ts`, componentes asociados y persistencia.

---

## 1. Problema Reportado por el Usuario
En el panel de gestión de la plataforma (`gestor-heros-plataforma.tsx`), las imágenes del hero presentan las siguientes limitaciones críticas:
1. **No se pueden habilitar ni deshabilitar:** No existe un switch/toggle por imagen en el catálogo para activar o desactivar su disponibilidad en la rotación o en la biblioteca de espacios.
2. **No se pueden crear nuevas:** El catálogo `HERO_IMAGE_OPTIONS` está estático en código. El campo actual de URL sólo aplica una cadena como override local a la página seleccionada, sin registrar la nueva fotografía en el catálogo/biblioteca con título, descripción, enfoque y thumbnail.
3. **No se pueden quitar las que están:** No hay acción para eliminar imágenes del catálogo (ni las predefinidas ni las personalizadas agregadas por el usuario).

---

## 2. Requerimientos de Implementación

### A. Estado y Almacenamiento (`hero-store.ts`)
- Convertir la lista de imágenes disponibles en un estado mutable y persistente:
  - Inicializar con las imágenes por defecto oficiales (`HERO_IMAGE_OPTIONS`), pero permitir que el estado contenga un array dinámico de imágenes (`imagenesCatalogo: HeroImageItem[]`).
  - Agregar campo `habilitada: boolean` a cada imagen.
  - Implementar acciones en el store:
    - `toggleHabilitarImagen(id: string)`: habilita/deshabilita una imagen del catálogo. Las imágenes deshabilitadas no deben aparecer en el carrusel de la portada ni como opción seleccionable activa en los espacios públicos.
    - `agregarImagen(nuevaImagen: Omit<HeroImageOption, 'id'> & { id?: string })`: permite incorporar nuevas imágenes (vía URL o ruta `/images/...`) con título, descripción, enfoque y estado habilitado.
    - `eliminarImagen(id: string)`: permite retirar una imagen del catálogo (si la imagen eliminada estaba activa en un espacio o en portada, reasignar a la imagen oficial por defecto).
    - `restaurarCatalogoOficial()`: restablece el catálogo a las 6 opciones iniciales.

### B. Interfaz de Usuario en el Panel (`gestor-heros-plataforma.tsx`)
1. **Controles por tarjeta de imagen en la biblioteca:**
   - **Switch o botón Habilitar/Deshabilitar:** Mostrar claramente badge "Habilitada" / "Deshabilitada". Si está deshabilitada, mostrar atenuada y excluirla de los carruseles.
   - **Botón Eliminar:** Con confirmación para quitar del catálogo.
2. **Formulario / Modal "Nueva Imagen Hero":**
   - Campos: Título, Descripción, Enfoque/Tema territorial, URL de la imagen y URL de miniatura (opcional).
   - Botón de guardado que valide URL/formato y la agregue de inmediato a la biblioteca con feedback sonner (`toast.success`).
3. **Resiliencia y Pruebas:**
   - Actualizar o añadir pruebas en `hero-store.test.ts` y `gestor-heros-plataforma.test.tsx` que verifiquen habilitación, deshabilitación, adición y retiro.
   - Ejecutar verificación de tipos y suite UI dirigida (`bun run typecheck` o `bun run test`).

---

## 3. Protocolo de Notificación
Al finalizar la implementación y las pruebas en verde, emitir remisión técnica en `bridge/243_resultado_codex_gestion_heros.md` y notificar a coordinación.
