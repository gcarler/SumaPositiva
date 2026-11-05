# ENCARGO 284: POLIS UX & Branding — Integración Profesional del Logo Institucional en el Sitio Público y Favicon

- **Destinatario:** `agy2`
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-01
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:**
  > *"mientras trabajamos en el sistema de mensajería, asignale a alguno de los agente que incorpore el logo de la plataforma el sitio publico no tiene el logo.... y en el favicon. dale un un uso super profesional a ese logo"*

---

## 1. Contexto y Diagnóstico Actual

1. **Sitio Público (`src/app/_components/topbar.tsx`):**
   - Actualmente, la cabecera principal (`Topbar`) utiliza un ícono genérico `<Landmark>` dentro de un cuadrado negro plano junto al texto *"Seguridad Humana · Cartagena 2026–2036"*. No exhibe el logo oficial de la plataforma POLIS.
2. **Favicon y PWA (`src/app/layout.tsx`, `public/manifest.json`):**
   - No existe un favicon oficial POLIS configurado en `src/app/layout.tsx` (ni `icon.svg` o `favicon.ico` en `src/app/`). Los navegadores muestran el ícono predeterminado genérico o quedan vacíos.
   - El archivo `public/manifest.json` y los metadatos de iconos deben sincronizarse con el isotipo de fe pública de POLIS.
3. **Activo Oficial de Marca (`public/logo-polis.svg`):**
   - Contiene el **Isotipo "P" (Ágora Concéntrica)** con los gradientes/tonos cian y azul distrital (`#0369A1`, `#38BDF8`, `#0284C7`, `#7DD3FC`, centro blanco) y el wordmark tipográfico de Ples SAS.
   - Debe tratarse con excelencia técnica: asegurar legibilidad impecable tanto en **modo claro** (`light`) como en **modo oscuro** (`dark`), evitando textos blancos sobre fondos claros o textos negros sobre fondos oscuros.

---

## 2. Requerimientos Técnicos y de Diseño (Estrictos)

### Requerimiento 1: Favicon e Iconografía Web de Alto Rendimiento
1. **Isotipo Vectorial para Favicon (`public/favicon.svg` y `src/app/icon.svg`):**
   - Extraer y optimizar el isotipo "P" (Ágora Concéntrica de POLIS) en un SVG de proporción cuadrada (viewBox `0 0 128 128` o `0 0 64 64`).
   - El isotipo debe ser nítido, perfectamente centrado y con alto contraste para pestañas de navegador tanto en tema claro como oscuro (incluyendo borde o halo sutil si es necesario para destacar en fondos negros o blancos).
   - Generar/configurar `favicon.ico` o soporte multi-resolución en `public/` y `src/app/`.
2. **Metadatos en `src/app/layout.tsx`:**
   - Declarar en el objeto `metadata` la clave `icons`:
     ```ts
     icons: {
       icon: [
         { url: "/favicon.svg", type: "image/svg+xml" },
         { url: "/favicon.ico", sizes: "any" }
       ],
       apple: [
         { url: "/apple-touch-icon.png", sizes: "180x180" } // o svg adaptado
       ]
     }
     ```
3. **PWA Manifest (`public/manifest.json`):**
   - Actualizar las entradas de `icons` para referenciar los recursos del logo/isotipo oficial de POLIS.

### Requerimiento 2: Integración Profesional en la Cabecera del Sitio Público (`Topbar`)
1. **Ubicación:** [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx).
2. **Reemplazo del ícono genérico:**
   - Sustituir el bloque `<Landmark />` por un componente visual de marca de alto nivel.
   - Opciones recomendadas:
     - Componente reutilizable `LogoPolis` o `IsotipoPolis` que renderice el isotipo con precisión SVG vectorial.
     - Preservar la coexistencia armónica entre la identidad de la plataforma **POLIS** y la iniciativa distrital **Seguridad Humana · Cartagena 2026–2036**.
     - Brindar un acabado profesional: proporción áurea, alineación vertical exacta, micro-interacción hover sutil (ej. ligero realce de luminosidad o escala controlada con `framer-motion` o CSS transition).
3. **Compatibilidad Modo Claro / Modo Oscuro:**
   - El isotipo mantiene sus tonos de identidad institucional (azules/cian).
   - Si se incluye la tipografía "POLIS" junto al isotipo, las letras deben adaptarse dinámicamente:
     - Usar `fill="currentColor"` o tokens semánticos POLIS (`text-[var(--text-primary)]`), de modo que en tema claro sean oscuras y en tema oscuro sean claras automáticamente.

### Requerimiento 3: Coherencia en Otros Puntos de Contacto
1. **Plataforma Header (`src/features/plataforma/components/plataforma-header.tsx`):**
   - Incluir el isotipo/logo en la cabecera del entorno autenticado de funcionarios y ciudadanos activos.
2. **Modo Barrio (`src/app/barrio/page.tsx`):**
   - Verificar que en la cabecera ligera de datos prepago se presente el isotipo/logo en formato SVG ligero y optimizado.
3. **Página Acerca (`src/app/acerca/page.tsx`):**
   - Asegurar que la presentación del sistema cuente con el logo oficial desplegado con máxima calidad y resolución.

---

## 3. Criterios de Aceptación y Calidad

1. **Favicon visible:** Al abrir el sitio en cualquier navegador, la pestaña muestra el isotipo oficial POLIS con nitidez.
2. **Cabecera pública impecable:** La barra de navegación superior exhibe el logo/isotipo POLIS integrado con elegancia junto al título institucional.
3. **Temas claros y oscuros:** Verificado en ambos temas sin pérdida de contraste ni elementos invisibles.
4. **Accesibilidad (WCAG AA):** Textos alternativos, `aria-label`, foco interactivo sin trampas.
5. **Verificaciones obligatorias:**
   - `node scripts/ui-policy.mjs` sin errores.
   - `bun run typecheck` en verde (0 errores).
   - Pruebas unitarias de componentes afectadas pasando.
6. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Entregar informe detallado en `bridge/284_entrega_agy2_logo_publico_favicon.md`.
   - Notificar a coordinación general.
