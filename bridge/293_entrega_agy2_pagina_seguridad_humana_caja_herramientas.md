# Entrega Encargo 293: Página Interactiva de Seguridad Humana Integral y Caja de Herramientas Pedagógica

**Fecha:** 2026-11-05  
**Agente Responsable:** `agy2`  
**Destinatario:** Coordinación (`agy:0.0`)  
**Tarea de Origen:** [`bridge/293_tarea_agy2_pagina_seguridad_humana_caja_herramientas.md`](file:///root/polis/bridge/293_tarea_agy2_pagina_seguridad_humana_caja_herramientas.md)  
**Registro Central:** [`bridge/01_tarea_activa.md`](file:///root/polis/bridge/01_tarea_activa.md)  
**Estado:** **COMPLETADO Y ENTREGADO (Sin commit ni push)**  

---

## 1. Resumen Ejecutivo de la Intervención

Se implementó de manera integral la página pedagógica e interactiva pública **`/seguridad-humana`**, concebida como el portal cívico de alfabetización territorial y apropiación ciudadana del nuevo paradigma de la Política Pública de Seguridad Humana de Cartagena de Indias 2026–2036.

La implementación materializa el lema oficial:
> *«Poner la vida y la dignidad en el centro del territorio»*

cumpliendo rigurosamente los mandatos de la **Resolución 66/290 de la Asamblea General de las Naciones Unidas**, la doctrina de derechos humanos del PNUD, la **Ley Estatutaria 1757 de 2015** y la **Sentencia C-150 de 2015 de la Corte Constitucional**.

---

## 2. Componentes y Arquitectura Desarrollada

### 2.1. Ruta Pública y Vista Interactiva
- **Página de Entrada (Server Component):** [`src/app/seguridad-humana/page.tsx`](file:///root/polis/src/app/seguridad-humana/page.tsx)
  - Configuración completa de metadatos SEO (`title`, `description`, `keywords`) y OpenGraph para indexación distrital y compartición en redes sociales.
  - Integración del layout con `<SeguridadHumanaView />` y `<Footer />`.
- **Vista Interactiva (Client Component):** [`src/features/seguridad-humana/views/seguridad-humana-view.tsx`](file:///root/polis/src/features/seguridad-humana/views/seguridad-humana-view.tsx)
  - **Topbar de Acceso Rápido:** Brand oficial POLIS con Isotipo concéntrico, migas contextuales y enlaces a *Modo Barrio*, *Geovisor* y *Acceso Institucional*.
  - **Hero de Impacto:** Titular solemne, lema institucional y badges de contextualización (Res. 66/290 ONU).
  - **Infografía de los 3 Pilares Universales:**
    1. *Libertad frente al miedo* (violencia, desarme, protección vital).
    2. *Libertad frente a la necesidad* (condiciones materiales, hambre, salud, hábitat).
    3. *Libertad para vivir con dignidad* (derechos humanos, voz y fe pública).
  - **Selector Dinámico de las 7 Dimensiones Territoriales:** Pestañas interactivas accesibles (`role="tab"`) que despliegan en tiempo real:
    - Desafío crítico específico para Cartagena (Localidades 1, 2, 3 y zonas insulares).
    - Solución territorial concreta en POLIS.
    - Entidades líderes responsables del Distrito (MECAR, Interior, PES, DADIS, EPA, etc.).
    - Marco normativo habilitante.
  - **Matriz Comparativa de Paradigma:** "¿Qué NO es vs. ¿Qué SÍ es?", desmitificando el reduccionismo punitivo frente a la garantía integral de derechos.
  - **Caja de Herramientas Pedagógica y Documental (Toolbox):** Tarjetas con enlaces de descarga directa y atributos `download` hacia los documentos normativos y metodológicos oficiales.
  - **Acordeón Interactivo de las 10 Preguntas Clave del ABC:** Componente accesible basado en `@/shared/ui/accordion` (Radix UI) que resuelve las dudas de ciudadanos y funcionarios.
  - **CTA de Participación Territorial:** Enlaces guiados para radicar aportes barriales (`/barrio`) y acceder a la plataforma institucional (`/plataforma`).

### 2.2. Modelo de Datos Centralizado
- **Catálogo de Contenido:** [`src/features/seguridad-humana/data/seguridad-humana.data.ts`](file:///root/polis/src/features/seguridad-humana/data/seguridad-humana.data.ts)
  - Interfaces tipadas con TypeScript estricto: `DimensionInfo`, `PilarOnu`, `ComparativaParadigma`, `DocumentoDescargable`, `PreguntaFrecuente`.
  - Desacoplamiento total entre datos analíticos y presentación visual.

### 2.3. Generación Programática de PDFs en `public/docs/`
Se diseñaron scripts reproducibles con ReportLab (`backend/.venv/bin/python`) para estructurar los 4 documentos oficiales de estudio:
1. **`public/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf`** (9.2 KB):
   - Documento maestro de 4 páginas con portada solemne, marco de la ONU, tabla sinóptica de las 7 dimensiones distritales, comparativa de paradigma y las 10 preguntas clave del ABC.
2. **`public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf`** (2.9 KB):
   - Láminas ejecutivas para talleres comunitarios, presidentes de JAC y facilitadores de mesa.
3. **`public/docs/MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf`** (2.9 KB):
   - Ficha técnica para auditoría ciudadana, indicadores DNP y seguimiento de inversión.
4. **`public/docs/GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf`** (2.9 KB):
   - Protocolo metodológico para deliberaciones barriales sin revictimización y cierre de actas con fe pública.

### 2.4. Integración en Navegación, Home y Footer
- **Botón en Navegación Principal (Topbar):** [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx)
  - Botón accesible con icono `BookOpen`: *"Saber más sobre Seguridad Humana"* en la barra superior.
- **CTA Prominente en el Home Showcase:** [`src/features/politicas/components/hero-home-showcase.tsx`](file:///root/polis/src/features/politicas/components/hero-home-showcase.tsx)
  - Botón directo de acción: *"Saber más sobre Seguridad Humana Integral"* en el hero cinematográfico de portada.
- **Sección Pedagógica de Dimensiones en Home:** [`src/features/politicas/views/inicio-view.tsx`](file:///root/polis/src/features/politicas/views/inicio-view.tsx)
  - Botón de alfabetización cívica: *"Saber más sobre la Política de Seguridad Humana"* junto a las 7 dimensiones ONU.
- **Footer del Sitio Público:** [`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx)
  - Se agregó el enlace permanente y accesible:
    ```tsx
    <Link
      href="/seguridad-humana"
      className="label-micro text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:underline"
    >
      ¿Qué es Seguridad Humana?
    </Link>
    ```

---

## 3. Pruebas Unitarias y Automatizadas

Se elaboró el archivo de pruebas exhaustivas [`src/app/seguridad-humana/seguridad-humana.test.tsx`](file:///root/polis/src/app/seguridad-humana/seguridad-humana.test.tsx) cubriendo 8 escenarios críticos con 83 aserciones:
- **Test 1:** Verificación de metadatos SEO y etiquetas OpenGraph.
- **Test 2:** Renderizado de lema oficial, titular y los 3 pilares de la ONU.
- **Test 3:** Integridad y renderizado de las 7 dimensiones temáticas y entidades líderes.
- **Test 4:** Matriz comparativa de paradigma "¿Qué NO es vs. ¿Qué SÍ es?".
- **Test 5:** Caja de herramientas: validación de enlaces de descarga y existencia física de los 4 PDFs en `public/docs/` con peso superior a 1 KB.
- **Test 6:** Renderizado del acordeón de 10 preguntas clave del ABC ciudadano.
- **Test 7:** Renderizado integral de la página completa con footer institucional.
- **Test 8:** Presencia y texto del enlace en el footer público del sistema.

Resultado de la ejecución:
```bash
bun test src/app/seguridad-humana/seguridad-humana.test.tsx
# ✓ 8 pass, 0 fail, 83 expect() calls [603ms]
```

---

## 4. Verificación de Quality Gates

| Gate de Calidad | Comando | Resultado | Evidencia |
| :--- | :--- | :---: | :--- |
| **Política de UI** | `node scripts/ui-policy.mjs` | **EXITOSO** | 0 infracciones; cumplimiento 100% de tokens `var(--...)`, controles `@/shared/ui` y accesibilidad. |
| **Chequeo de Tipos** | `bun run typecheck` | **EXITOSO** | `tsc --noEmit` finalizó con 0 errores. |
| **Suite de Tests** | `bun test` | **EXITOSO** | **1,617 tests pasando en 163 archivos** (0 fallos). |
| **Build de Producción** | `node scripts/build-polis.mjs` | **EXITOSO** | Compilación Next.js standalone exitosa; **209/209 rutas generadas estáticamente** incluyendo `○ /seguridad-humana`. |

---

## 5. Compromisos y Restricciones Cumplidas

- [x] **Cero colores Tailwind literales:** Todo el diseño utiliza exclusivamente variables semánticas del sistema (`var(--surface-0)`, `var(--text-primary)`, `var(--ember)`, `var(--danger)`, etc.).
- [x] **Compatibilidad de temas:** Compatible nativamente con modos claro y oscuro.
- [x] **Accesibilidad WCAG:** Jerarquía semántica estricta (`main`, `header`, `section`, `h1`-`h3`), `aria-labelledby`, `role="tablist"` y componentes Radix interactivos por teclado.
- [x] **Archivos PDF compilados:** 4 documentos PDF listos para descarga en `public/docs/`.
- [x] **CERO GIT COMMIT / CERO GIT PUSH:** Modificaciones realizadas estrictamente en working tree local conforme a la directriz.
