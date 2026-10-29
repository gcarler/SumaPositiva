# ENCARGO 270: Vista Adaptativa y Diseño Responsivo para el Marco Legal

**Destinatario:** `agy2` (`=agy2:0.0`)  
**Emisor:** Coordinación General Antigravity (`agy:0.0`)  
**Fecha:** 2026-10-29  
**Estado:** ASIGNADO / EN EJECUCIÓN  

---

## 1. Problema Reportado por el Usuario

El usuario administrador reporta:
> *"asiganle esta tarea a agy2, el marco legal https://seguridadhumanaintegral.org/marco-legal no tiene una vista adaptativa al tamño de la pantalla"*

En la implementación actual ([`src/app/marco-legal/page.tsx`](file:///root/polis/src/app/marco-legal/page.tsx)):
1. **En pantallas de escritorio grandes (Desktop `lg`, `xl`, `2xl`):**
   - El contenido se encuentra encerrado en un bloque rígido `max-w-3xl` alineado a la izquierda sin centrar (`mx-auto` ausente), desaprovechando el ancho de la pantalla y dejando un vacío asimétrico en monitores panorámicos.
   - La navegación superior es una lista plana de botones que obliga al usuario a scrollear arriba y abajo constantemente en lugar de tener un índice lateral accesible y persistente.
2. **En pantallas medianas y móviles (`sm`, `< 640px`):**
   - Los títulos largos de la botonera (`Constitución Política de Colombia (1991)`, `Cartagena de Indias, Distrito Turístico y Cultural`) se apilan torpemente o generan saltos visualmente desordenados.
   - Los títulos de las tarjetas `<h3 className="text-sm font-semibold"> {norma.nombre} <span className="ml-2 font-normal">— {norma.enfasis}</span></h3>` colapsan horizontalmente en pantallas estrechas con nombres extensos (ej. *Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013*).
   - El espaciado no escala adecuadamente entre móviles compactos (360px) y pantallas amplias.

---

## 2. Requerimientos de Diseño y Adaptabilidad Responsiva

Se debe refactorizar [`src/app/marco-legal/page.tsx`](file:///root/polis/src/app/marco-legal/page.tsx) para lograr una experiencia adaptativa de primer nivel:

### A. Layout Responsivo Multi-Dispositivo
1. **Contenedor Principal Adaptativo:**
   - Usar un contenedor centrado con márgenes y paddings fluidos: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12`.
2. **Arquitectura Desktop (`lg` y superior, >= 1024px):**
   - Estructura en cuadrícula de 12 columnas: `lg:grid lg:grid-cols-12 lg:gap-10`.
   - **Columna Lateral de Navegación Sticky (`lg:col-span-3` o `lg:col-span-4`):**
     - Índice / tabla de contenido fija con `sticky top-24 self-start space-y-4`.
     - Enlaces a las 5 secciones (`#constitucional`, `#nacional`, `#distrital`, `#internacional`, `#salvaguardas`) con indicador visual sutil, conteo de normas por sección y tipografía legible.
     - Resumen ejecutivo o tarjeta de contexto institucional distrital (Decreto 037/2026, 35 mesas territoriales).
   - **Columna Principal de Contenido (`lg:col-span-8` o `lg:col-span-9`):**
     - Encabezado institucional con jerarquía tipográfica fluida (`text-2xl sm:text-3xl lg:text-4xl`).
     - Secciones con `scroll-mt-24` para que al saltar desde el índice no queden tapadas.
     - Las normas dentro de cada sección pueden distribuirse en una cuadrícula responsiva (`grid grid-cols-1 md:grid-cols-2 gap-4` en secciones con varias normas breves como constitucional/nacional, o `grid-cols-1` para las extensas con múltiples puntos).
3. **Arquitectura Móvil y Tablet (`< 1024px`):**
   - Ocultar la barra lateral sticky y mostrar una **barra de navegación horizontal fluida / scrollable** con `flex gap-2 overflow-x-auto pb-2 scrollbar-none` para que el usuario pueda saltar entre secciones con un toque suave.
   - En móviles, los títulos de las tarjetas deben ser flexibles (`flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2`), evitando desbordes horizontales.
   - Listas de puntos con viñetas contenidas y márgenes seguros (`pl-4 sm:pl-5 text-xs sm:text-sm`).

### B. Micro-diseño y Fichas Normativas
- Cada norma debe presentarse como una tarjeta accesible con borde semántico `border border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)] transition-all rounded-xl p-4 sm:p-6`.
- Incorporar chips/badges discretos para identificar el nivel normativo (ej. `Constitución`, `Ley Estatutaria`, `Acuerdo Distrital`, `Tratado ONU`, `Salvaguarda Ética`).
- Mantener navegación accesible (`aria-label`, landmarks semánticos, `role="region"`, `id` descriptivos).

---

## 3. Restricciones y Reglas Técnicas
1. **Tokens y UI-Policy:**
   - Usar exclusivamente tokens semánticos del sistema (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`).
   - Validar con `node scripts/ui-policy.mjs`.
2. **Server Component y Rendimiento:**
   - La página debe seguir siendo un Server Component estático rápido con metadatos completos.
3. **Validación de Compilación y Tipos:**
   - `bun run check` (typecheck y eslint limpios).
   - Para probar el build sin colisionar con `.next` en producción:
     `POLIS_NEXT_DIST_DIR=.build-test-270 bun run build` (eliminar `.build-test-270` tras verificar).
4. **REGLA DE FLUJO DE COORDINACIÓN:**
   - **NO HACER COMMIT DIRECTO.**
   - Al terminar, redactar informe en `bridge/270_entrega_agy2_marco_legal_responsive.md`.
   - Notificar a coordinación (`agy:0.0`) vía:
     `tmux send-keys -t agy:0.0 'AGY2-270 terminado: vista adaptativa responsive para /marco-legal implementada y verificada. Listo para revisión de calidad.' Enter`
   - Esperar la auditoría de calidad y aprobación de `agy:0.0` antes de hacer commit.
