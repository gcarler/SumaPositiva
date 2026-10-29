# Encargo 247 — Auditoría de QA y Pruebas del Gestor Dinámico de Heros

**Fecha:** 27 de octubre de 2026  
**Emisor:** Coordinación EAF (`agy`)  
**Destinatario:** `freebuff` (sesión tmux `=freebuff:0.0`, EDD / Frontend QA)  
**Objetivo:** Asegurar la cobertura de pruebas y validación funcional del nuevo sistema de gestión dinámica de imágenes Hero implementado por `codex` (Encargo 243).

---

## 1. Alcance
- `src/features/politicas/state/hero-store.ts` y su suite `hero-store.test.ts`.
- `src/features/plataforma/components/gestor-heros-plataforma.tsx` y su suite `gestor-heros-plataforma.test.tsx`.
- Componentes consumidores: `hero-home-showcase.tsx` y `hero-page-banner.tsx`.

---

## 2. Tareas Obligatorias
1. **Auditoría de Implementación:**
   - Inspeccionar los cambios realizados por `codex` en `hero-store.ts` y `gestor-heros-plataforma.tsx`.
   - Comprobar que no queden catálogos estáticos no sincronizados.
2. **Cobertura de Pruebas de Comportamiento:**
   - Verificar y complementar las pruebas automáticas para los siguientes 4 casos de uso críticos:
     a) **Crear nueva imagen:** Agregar imagen al catálogo vía formulario/store con título, descripción y URL, comprobando su persistencia en el array dinámico.
     b) **Habilitar / Deshabilitar:** Toggle de disponibilidad; comprobar que una imagen deshabilitada queda excluida del carrusel de portada (`obtenerOpcionesCarrusel`) y de la selección activa.
     c) **Eliminar imagen:** Retirar una imagen del catálogo; comprobar que si estaba asignada a una página, se aplique el fallback limpio (imagen oficial por defecto o retícula institucional sin foto).
     d) **Restablecer catálogo oficial:** Comprobar que la acción de restauración devuelva el catálogo a las 6 opciones oficiales.
3. **Ejecución y Verificación de Tipos:**
   - Ejecutar la suite de pruebas del módulo:
     ```bash
     bun test src/features/politicas/state/hero-store.test.ts src/features/plataforma/components/gestor-heros-plataforma.test.tsx
     ```
   - Ejecutar `bun run typecheck` en el frontend para asegurar cero regresiones de TypeScript.

---

## 3. Entregable
Generar el informe de validación con logs y evidencias en `bridge/247_validacion_freebuff_heros.md` y notificar a coordinación.
