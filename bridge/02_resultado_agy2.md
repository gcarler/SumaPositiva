# INFORME DE RESULTADO: TAREA [A11Y-WIDGET-01b]
## BARRA VERTICAL DE ACCESIBILIDAD ESTILO FUNCIÓN PÚBLICA / GOV.CO CON ENLACE OFICIAL A CENTRO DE RELEVO

**Para:** Coordinador General / Auditor Forense EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 15 de Octubre de 2026  
**Tarea Reportada:** `[A11Y-WIDGET-01b] Ajuste de barra vertical de accesibilidad estilo Función Pública (https://www.funcionpublica.gov.co/web/mipg/resultados-medicion) con 6 botones interactivos`  
**Referencia de Diseño:** Portal Oficial de Función Pública Colombia / MIPG · Marco de Accesibilidad Ley 1712 de 2014 y Resolución MinTIC 1519 de 2020 (WCAG 2.1 Nivel AA/AAA)  
**Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`)  
**Concurrencia:** `codex` trabaja en paralelo sobre `backend/`. `agy2` modifica y confirma **únicamente** archivos de su dominio frontend y `bridge/02_resultado_agy2.md`.

---

## 🎯 1. Resumen Ejecutivo de la Entrega

En estricta atención a las directrices del propietario y a la referencia institucional del widget de **Función Pública** (`https://www.funcionpublica.gov.co/web/mipg/resultados-medicion`), se actualizó y armonizó la barra lateral vertical fija de accesibilidad de la plataforma POLIS:

1. **Geometría y Posicionamiento:**
   - Barra vertical adosada al borde lateral derecho (`fixed top-1/2 right-0 -translate-y-1/2 z-40 select-none`).
   - Ancho compacto de reposo de **52px** (`w-[52px]`) con bordes redondeados a la izquierda (`rounded-l-xl`).
   - Enfoque visual y elevación con variables de diseño corporativas (`bg-[var(--surface-1)]`, `border-[var(--border-strong)]`, `shadow-raised`).

2. **Expansión Lateral hacia la Izquierda:**
   - En estado `:hover`, `:focus-within` y `:focus-visible`, cada botón se expande de manera fluida y accesible hacia la izquierda alcanzando **196px de ancho** (`hover:w-[196px] focus-within:w-[196px] focus-visible:w-[196px]`) revelando la etiqueta textual de la acción.
   - Duración de transición optimizada de `250ms ease-out` respetando la directiva de usuarios con preferencia de movimiento reducido (`motion-reduce:transition-none`).
   - Supresión de expansión cuando el subpanel de "Más opciones" se encuentra abierto para evitar solapamientos visuales.

3. **Los 6 Botones Interactivos de la Barra:**
   - **Botón 1 (Contraste Directo):** Alterna inmediatamente entre Contraste Normal y Alto Contraste AAA ($\ge 7:1$), actualizando `aria-pressed` y etiqueta (`Contrast` icon).
   - **Botón 2 (Aumentar A+):** Incrementa el tamaño de texto (`100% -> 125% -> 150% -> 200%`), deshabilitándose visual y programáticamente al llegar al tope de 200%.
   - **Botón 3 (Reducir A−):** Reduce el tamaño de texto (`200% -> 150% -> 125% -> 100%`), deshabilitándose al 100%.
   - **Botón 4 (Restablecer):** Restablece todas las preferencias a valores iniciales seguros (`RotateCcw` icon).
   - **Botón 5 (Más Opciones):** Abre el subpanel flotante a la izquierda (`Sliders` icon) con controles de color/tema (Modo Claro/Oscuro, Escala de Grises), lectura/movimiento (Interlineado amplio, Espaciado de letras, Subrayar enlaces, Reducir movimiento).
   - **Botón 6 (Centro de Relevo):** Enlace directo oficial a **Centro de Relevo Colombia** (`https://centroderelevo.gov.co/`), con apertura segura en nueva pestaña (`target="_blank"`, `rel="noopener noreferrer"`), icono `Volume2`, indicador de enlace externo `ExternalLink` y texto accesible.

4. **Modo Geovisor Resiliente:**
   - En rutas `/geovisor`, incluye la capacidad de colapsar la barra a una pestaña mínima discreta (`isCollapsed: true`) para no obstruir los paneles de capas ni el mapa interactivo.

---

## 🧪 2. Verificación y Quality Gates

| Control de Calidad | Comando Ejecutado | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Política de UI** | `node scripts/ui-policy.mjs` | **SUPERADO** | 0 violaciones de tokens, controles y capas. |
| **Pruebas Accesibilidad** | `bun test src/features/accesibilidad/` | **SUPERADO** | 13 pruebas pasadas (0 fallas, 84 aserciones). |
| **Pruebas Seguimiento** | `bun test src/features/seguimiento/` | **SUPERADO** | 129 pruebas pasadas (0 fallas). |
| **Verificación de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **SUPERADO** | 0 errores de tipado TypeScript. |
| **Linter Oficial** | `bun run lint` (`eslint .`) | **SUPERADO** | 0 errores y 0 advertencias de ESLint. |
| **Compilación de Producción** | `bun run build` (`next build`) | **SUPERADO** | Compilación exitosa en 8.7s (192 rutas estáticas SSG). |
| **Servicio de Producción** | `systemctl status polis-frontend` | **ACTIVO** | Proceso PID 798321 activo respondiendo HTTP 200 OK. |

---

## 📂 3. Archivos Modificados en el Entorno Frontend

1. `src/shared/ui/accesibilidad-widget.tsx`: Incorporación del 6º botón para Centro de Relevo (`https://centroderelevo.gov.co/`) con iconos `Volume2` y `ExternalLink`, expansión lateral (`hover:w-[196px]`) y atributos a11y.
2. `src/shared/ui/accesibilidad-widget.stories.tsx`: Actualización de la historia Storybook `BarraLateral` para validar la presencia del enlace oficial al Centro de Relevo.
3. `src/features/accesibilidad/accesibilidad-widget.test.tsx`: Actualización de aserciones de prueba unitaria verificando el enlace accesible al Centro de Relevo.
4. `src/features/seguimiento/__tests__/dea-econometria-panel.test.tsx`: Depuración de importación no utilizada para satisfacer el linting estricto.
5. `bridge/02_resultado_agy2.md`: Informe técnico de ejecución y entrega.

---
*Reporte de desarrollo y verificación de calidad emitido por agy2 para el Coordinador General y el Propietario de la Plataforma POLIS.*
