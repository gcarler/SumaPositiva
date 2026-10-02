# TAREA agy2 — Nuevo Módulo y Menú: "Dimensiones y Dependencias" (POLIS)

## Objetivo
Implementar un sistema integral, interactivo y de alta calidad visual para explorar las **7 Dimensiones de Seguridad Humana (Decreto 037 de 2026 del Ministerio del Interior)** y la participación de las **27 dependencias oficiales del Distrito de Cartagena**, accesible directamente desde un **nuevo ítem en el menú principal** de la barra de navegación.

---

## 1. Integración en el Menú y Navegación
1. **`src/core/navigation/navigation-store.ts`**:
   - Ampliar el tipo `VistaApp` para incluir `"dimensiones"`:
     `export type VistaApp = "inicio" | "explorar" | "mesas" | "geovisor" | "noticias" | "testimonios" | "dimensiones";`
2. **`src/app/_components/topbar.tsx`**:
   - Agregar la nueva opción al arreglo `NAV`:
     `{ id: "dimensiones", label: "Dimensiones y Entidades", labelCorto: "Dimensiones" }`
   - Mantener el diseño responsivo, mobile drawer y selector de vistas.
3. **`src/app/page.tsx`**:
   - Importar y renderizar `<DimensionesView />` cuando `vista === "dimensiones"`.

---

## 2. Nueva Vista: `src/features/politicas/views/dimensiones-view.tsx`
Diseñar una vista interactiva de alto nivel ("Super Pro") con las siguientes capacidades:

### A. Cabecera y Selector de Modos de Exploración
- Título institucional: **"Dimensiones de Seguridad Humana y Estructura Distrital"**.
- Subtítulo explicativo: Marco normativo bajo el **Decreto 037 de 2026 del Ministerio del Interior** y el **Plan de Desarrollo 2024–2027 'Cartagena Ciudad de Derechos'**.
- Conmutador de 2 modos de visualización:
  1. 🧭 **"Por Dimensiones ONU"** (Enfoque por problemática y derecho).
  2. 🏛️ **"Por Dependencias Distritales"** (Enfoque por secretaría / institución).
- Buscador rápido en vivo (filtra por tema, palabra clave o entidad).

### B. Modo 1: "Por Dimensiones ONU" (Las 7 Dimensiones)
- Barra o carrusel de pestañas con las 7 Dimensiones + Eje Transversal de Crisis:
  1. 💼 Económica
  2. 🍲 Alimentaria
  3. 🩺 Salud
  4. 🌿 Ambiental
  5. 🛡️ Personal
  6. 🤝 Comunitaria
  7. ⚖️ Política
  8. 🚨 Alertas Tempranas / Crisis
- Al seleccionar una dimensión, mostrar:
  1. **Ficha de la Entidad Líder (🏛️)**:
     - Tarjeta destacada con insignia dorada/oficial.
     - Nombre, sigla, titular, misión institucional en el Plan de Acción 2026.
     - Canales de atención (dirección, PBX, correo electrónico).
     - Presupuesto 2026 asignado y fuentes (FONSET, SGP, ICLD, Regalías).
  2. **Entidades Corresponsables (🤝)**:
     - Mosaico de tarjetas de todas las dependencias que co-ejecutan programas en esa dimensión.
     - Detalle específico de qué rol o proyecto ejecuta cada una dentro de esa dimensión.
  3. **Programas y Metas 2026 Vinculadas**:
     - Metas cuatrienales de la dimensión.
     - Botón de acción: *"Crear reporte formal sobre esta dimensión"* ➔ abre `/f/reporte-inseguridad` precargando la dimensión correspondiente.

### C. Modo 2: "Por Dependencias Distritales" (Las 27 Entidades)
- Filtros por tipología: *Todas*, *Secretarías de Despacho (8)*, *Entidades Descentralizadas (10)*, *Oficinas Asesoras (4)*, *Alcaldías Locales (3)*.
- Tarjeta individual para cada una de las 27 entidades:
  - Nombre, sigla y tipo.
  - **Matriz de participación en Dimensiones**: Muestra badges de cada dimensión en la que participa la entidad:
    - Badge especial con corona/icono para la(s) dimensión(es) donde es **Líder**.
    - Badges para las dimensiones donde es **Corresponsable**.
  - Porcentaje oficial auditado de avance del Plan de Acción a 30 de junio de 2026.
  - Botón *"Ver detalles y rendición"* ➔ abre el panel lateral Zero-Modals de rendición de cuentas (`openPanel("rendicion-cuentas", { entidadId: entidad.id })`).

---

## 3. Fuentes de Datos y Reutilización
- Utilizar exclusivamente el catálogo oficial en:
  `src/features/politicas/data/entidades-cartagena.data.ts` (`DEPENDENCIAS_CARTAGENA_2026`, `AVANCE_PROMEDIO_PDD_2026`).
- Estructurar el mapeo de corresponsabilidad y programas por dimensión de manera limpia y tipada (TypeScript estricto, sin `any`).

---

## 4. Estándares Técnicos Obligatorios
- **Zero-Modals**: Toda interacción expandida ocurre en la vista o en paneles laterales (`panel-store.ts`), nunca en diálogos modales flotantes o popups intrusivos.
- **Tokens Semánticos CSS**: Usar estrictamente las variables de diseño de POLIS (`var(--surface-1)`, `var(--surface-2)`, `var(--border)`, `var(--border-strong)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--ember)`, etc.).
- **Accesibilidad**: Botones con `aria-label`, contraste WCAG AAA, estructura semántica (`<section>`, `<article>`, `<header>`).
- **Verificación**:
  - `node scripts/ui-policy.mjs` (0 infracciones).
  - `bun run check` (0 errores de tipos y linting).
  - `bun run build` (build Turbopack exitoso).
  - `sudo systemctl restart polis-frontend.service` y verificar HTTP 200 en `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000`.

---

## 5. Entrega
Documentar el trabajo completo en `bridge/02_entrega_agy2.md` y realizar el commit en `main`.
