# ENTREGA ENCARGO 302: Diferenciación Estructural del Marco de la Política Pública de Seguridad Humana vs. Marco Legal de la Plataforma POLIS en `/marco-legal`

- **Destinatario:** Coordinación General Antigravity (`agy:0.0`) y Agente Auditor (`codex:0.0`)
- **Emisor:** Agente Frontend & A11y (`agy2`)
- **Fecha:** 2026-11-05 · **Estado:** COMPLETADO
- **Referencia de origen:** `bridge/302_tarea_agy2_diferenciacion_marcos_legales.md`
- **Dictamen de usuario atendido:**
  > *"el https://seguridadhumanaintegral.org/marco-legal#distrital (Marco legal y doctrinal de POLIS) no es el mismo de marvo de la politica d eseguridad humana, deben existir los dos marcos, eso esta claro, pero n son lo mismo. iuno es el marco legal de lplataforma y otro es el de la politica de seguridad humana integral"*

---

## 1. Resumen Ejecutivo de la Solución Implementada

Se realizó una reestructuración integral y modular de la ruta pública `/marco-legal`, erradicando la confusión conceptual previa donde se agrupaban indistintamente elementos sustantivos de la política pública distrital con normas técnicas y de comercio electrónico de la plataforma de software.

La nueva arquitectura establece con máxima solemnidad y rigor dos pilares jurídicos e institucionales diferenciados pero armónicamente integrados:

```
                                  MARCOS JURÍDICOS Y DOCTRINALES
                                       (/marco-legal)
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       PILAR 1: POLÍTICA PÚBLICA                           PILAR 2: PLATAFORMA POLIS
     SEGURIDAD HUMANA INTEGRAL                             ECOSISTEMA DE DATOS Y FE PÚBLICA
  (Distrito de Cartagena de Indias)                                   (Ples SAS)
  ─────────────────────────────────                         ─────────────────────────────────
  • Mandato Distrital Cartagena:                            • Fe Pública y Validez Probatoria:
    - Acuerdo Distrital 139/2024 (Plan de Desarrollo)         - Ley 527 de 1999 (Mensajes de datos)
    - Decreto Distrital 037/2026 (PSHC en 35 mesas)           - Sellado criptográfico SHA-256 de actas
    - Decreto Distrital 1070/2021 (Planeación Distrital)      - Decreto 2364 de 2012 (Firma digital)
  • Fundamento Superior Constitucional:                     • Habeas Data y Privacidad Reforzada:
    - Arts. 1, 2, 11 y 22 Constitución Política 1991          - Ley Estatutaria 1581 de 2012 / Dcto 1377
  • Marco Nacional de Política:                               - Protocolo pericial despojo EXIF/GPS
    - Ley 2294 de 2023 (PND Seguridad Humana)               • Gobernanza y Control Social:
  • Doctrina Internacional:                                   - Ley 1712 de 2014 (Transparencia / Datos)
    - Resolución 66/290 ONU (2012)                            - Ley 1757 de 2015 (Sentencia C-150/2015)
    - Informe PNUD 1994 (7 Dimensiones)                       - Art. 209 C.P. (Función administrativa)
    - Agenda 2030 y ODS (16, 11, 10, etc.)                  • Ordenamiento Territorial y Finanzas:
  • Salvaguardas Éticas Distritales:                          - Ley 388/1997 y LOOT Ley 1454/2011 (OGC)
    - Acción sin daño y no revictimización                    - Convenio 169 OIT (Consulta previa étnica)
    - Enfoque diferencial e interseccional                    - FONSET (Ley 418/1997) y Ley 1483/2011
```

---

## 2. Detalle de Archivos Creados y Modificados

### 2.1. `src/features/marco-legal/data/marcos-legales-data.ts` (Nuevo)
- Define los tipos fuertemente tipados (`AmbitoMarco`, `NormaLegal`, `SeccionMarcoLegal`, `PilarMarcoInfo`).
- Estructura y cataloga las 9 secciones normativas con 24 normas y protocolos detallados, incluyendo articulados, citas oficiales de expedición y badges semánticos.
- Especifica la metadata comparativa de ambos pilares (`PILARES_INFO`) con sus entidades responsables, alcances jurídicos y KPIs de caracterización.

### 2.2. `src/features/marco-legal/views/marco-legal-view.tsx` (Nuevo)
- **Componente cliente de alta gama (`"use client"`):**
  - **Encabezado institucional:** Titulado `"Marcos Jurídicos, Doctrinales y Normativos"`, exponiendo el doble marco institucional diferenciado y tarjetas comparativas con badges de ámbito (`Cartagena de Indias` vs `Ples SAS · Fe Pública`).
  - **Conmutador interactivo accesible (Segmented Switcher / Tabs):** Implementado con controles UI Kit (`Button variant="unstyled"`), `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, y navegación fluida por teclado con teclas `ArrowLeft`, `ArrowRight`, `Home`, `End`.
  - **Retrocompatibilidad de anclas URL:** Hook `useEffect` que escucha `hashchange` y carga inicial. Al recibir `https://seguridadhumanaintegral.org/marco-legal#distrital` (o cualquier otra ancla histórica), selecciona de forma reactiva la pestaña correspondiente y ejecuta scroll suave al elemento destino.
  - **Índice sticky en desktop (4 columnas):** Organizado por pilares con contadores independientes, badges de ámbito y tarjetas de contexto institucional para el Mandato Distrital y la Titularidad de Ples SAS.
  - **Secciones y fichas normativas (8 columnas):** Layout en rejilla con badges de nivel normativo, citas oficiales, articulados específicos y lista de puntos jurídicos y operativos.

### 2.3. `src/app/marco-legal/page.tsx` (Refactorizado)
- Transforma la página en Server Component limpio con metadata completa, OpenGraph y palabras clave orientadas a ambos marcos.
- Renderiza `<MarcoLegalView />` con `<main id="main-content">` accesible y `<Footer />` formal fuera del área principal.

### 2.4. `src/app/marco-legal/page.test.tsx` (Nuevo)
- Batería de 9 pruebas unitarias y de integración:
  1. Metadata con diferenciación explícita de ambos marcos.
  2. Estructura general con `main#main-content` y pie fuera de main.
  3. Título principal institucional y tarjetas comparativas de los dos pilares.
  4. Conmutador interactivo accesible (`role="tablist"`, `role="tab"`, `role="tabpanel"`).
  5. Preservación estricta de anclas históricas y retrocompatibilidad URL (`#distrital`, `#constitucional`, `#nacional`, `#internacional`, `#salvaguardas`, `#plataforma`, `#fe-publica`, `#datos-privacidad`, `#gobernanza-tecnologica`, `#ordenamiento-territorial`).
  6. Presencia íntegra de normas distritales y de política pública.
  7. Presencia íntegra de normas de la plataforma cívica POLIS y fe pública.
  8. Verificación del catálogo de 9 secciones (5 de política pública + 4 de plataforma).
  9. Ausencia de enlaces `http://` inseguros.

### 2.5. `eslint.config.mjs` (Ajuste de ignorados para build artifacts)
- Se añadió `".next-*/**"` a la lista de `ignores` para evitar que directorios de artefactos de compilación temporales (como `.next-release-r4`) bloqueen la ejecución de `bun run lint`.

---

## 3. Preservación Estricta de Anclas Históricas y Retrocompatibilidad

El enlace señalado expresamente por el usuario en su solicitud:
`https://seguridadhumanaintegral.org/marco-legal#distrital`

**Queda 100% operativo y funcional:**
- El ID `id="distrital"` está asignado al contenedor `<section id="distrital">` correspondiente al Acuerdo Distrital 139/2024, Decreto 037/2026 y Decreto 1070/2021.
- Todas las anclas preexistentes se mantuvieron idénticas:
  * `#distrital` -> Marco Distrital de Cartagena de Indias.
  * `#constitucional` -> Constitución Política de Colombia (1991).
  * `#nacional` -> Ley 2294 de 2023 (Plan Nacional de Desarrollo).
  * `#internacional` -> Doctrina ONU (Res. 66/290) y PNUD (1994).
  * `#salvaguardas` -> Protocolos éticos de no revictimización y acción sin daño.
- Nuevas anclas incorporadas para la plataforma:
  * `#plataforma` y `#fe-publica` -> Ley 527 de 1999 y firma electrónica.
  * `#datos-privacidad` -> Habeas Data (Ley 1581/2012) y despojo EXIF/GPS.
  * `#gobernanza-tecnologica` -> Ley 1712/2014, Ley 1757/2015 y Art. 209 C.P.
  * `#ordenamiento-territorial` -> Ley 388/1997, LOOT Ley 1454/2011, Convenio 169 OIT y FONSET.

---

## 4. Evidencia de Ejecución de Quality Gates

### 4.1. `node scripts/ui-policy.mjs`
```text
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```

### 4.2. `bun run typecheck`
```text
$ tsc --noEmit
(Salida limpia con código de retorno 0)
```

### 4.3. `bun run lint`
```text
$ eslint .
(Salida limpia con código de retorno 0)
```

### 4.4. `bun test src/app/marco-legal`
```text
bun test v1.4.2 (744846f84)

src/app/marco-legal/page.test.tsx:
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 1. Metadata configurada con diferenciación explícita de ambos marcos [0.12ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 2. Renderiza la estructura general con main accesible y pie fuera de main [59.29ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 3. Título principal institucional y tarjetas comparativas de los dos pilares [13.14ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 4. Conmutador interactivo accesible (role='tablist', 'tab', 'tabpanel') [9.82ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 5. Preservación estricta de anclas históricas y retrocompatibilidad URL (#distrital) [26.00ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 6. Presencia íntegra de normas distritales y de política pública [6.38ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 7. Presencia íntegra de normas de la plataforma cívica POLIS y fe pública [5.71ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 8. Catálogo completo de secciones verificado (9 secciones en total) [0.14ms]
✓ Página y Vista de Marcos Jurídicos, Doctrinales y Normativos [ENC-302] > 9. Ausencia de enlaces http inseguros [4.63ms]

 9 pass
 0 fail
 66 expect() calls
Ran 9 tests across 1 file. [916.00ms]
```

### 4.5. `bun test ./src/features/indicadores`
```text
bun test v1.4.2 (744846f84)

src/features/indicadores/views/indicadores-catalogo-view.test.tsx:
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 1. (N-1) Utiliza el contenedor fluido del sitio (container-fluid w-full) [45.02ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 2. (N-9) Elimina el total hardcodeado '24' y muestra total dinámico de la API [6.35ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 3. (N-3) Presenta la leyenda cívica de Tiers (A, B, C) y explica 'no publicable' [5.84ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 4. (N-4) Utiliza las etiquetas canónicas de taxonomia_7d_polis.py con códigos visibles [6.68ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 5. (N-2) Corrige ortografía y tildes en textos visibles y aria-label [9.58ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 6. (N-6 y B-2) Las filas Tier C con NO_VERIFICADO no tienen enlace href; Tier A sí [22.33ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 7. (B-3) IndicadorMetodologiaDetalle muestra exhaustivamente los 15 campos metodológicos [8.12ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 8. Quita el truncado rígido del nombre para permitir lectura completa y accesible [54.82ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 9. Renderiza estados de carga, error y vacío con roles accesibles (H297-06) [8.10ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 10. (H297-05) Estructura de tabla válida sin 'div' dentro de 'tbody' (0 nodos tbody > div) [3.15ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 11. (H297-05) Listas de definición estrictamente conformes a HTML5 en la ficha metodológica [1.28ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 12. (H297-06) FormField propaga id y aria-describedby a los controles vinculando las etiquetas [2.78ms]

src/features/indicadores/views/indicadores-interaccion.test.ts:
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 1. (H297-05) Render real en navegador: cero nodos tbody > div [695.95ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 2. (O297-02) Expansión y colapso interactivo con clic de ratón [318.12ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 3. (O297-02) Expansión y colapso interactivo con teclado (Enter y Espacio) [133.49ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 4. (O297-02) Filtrado interactivo por Tier y Dimensión [929.95ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 5. (O297-02) Búsqueda con debounce: 0 peticiones durante tecleo y 1 petición tras 300 ms [1196.96ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 6. (H297-06) Estado de error 503: role='alert', anuncio y sin atasco en 'Consultando catálogo…' [5471.51ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 7. (O297-02, H297-05) Auditoría axe-core: cero violaciones serious o critical en tabla y detalle abierto [951.61ms]

src/features/indicadores/services/indicadores-catalogo-api.test.ts:
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > esUrlHttpsSegura (N-6: Validación estricta de esquema seguro) > retorna true únicamente para URLs que inician con https:// [0.07ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > esUrlHttpsSegura (N-6: Validación estricta de esquema seguro) > retorna false para NO_VERIFICADO, http no seguro o entradas inválidas [0.05ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > retorna endpoint base sin parámetros cuando filtros no se proveen o están vacíos [0.52ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > omite comodines como 'todas', 'todos' y cadenas en blanco [0.04ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro dimension individual [0.44ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro tier individual [0.05ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro busqueda individual [0.04ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > combina múltiples parámetros simultáneos con codificación adecuada [0.04ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > obtenerCatalogoIndicadores (B-2: Consumo de cliente apiFetch) > invoca apiFetch con la URL construida a partir de los filtros [0.81ms]

 28 pass
 0 fail
 140 expect() calls
Ran 28 tests across 3 files. [12.39s]
```

### 4.6. `bun test ./src/app/_components`
```text
bun test v1.4.2 (744846f84)

src/app/_components/sidebar-institucional.test.ts:
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 1. Erradicación Absoluta de Botones Inertes con toast.info (GAP-03) > ningún módulo principal invoca toast.info al ser accionado [0.55ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 1. Erradicación Absoluta de Botones Inertes con toast.info (GAP-03) > ningún submódulo invoca toast.info al ser accionado [0.86ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 2. Analítica y Métricas de Formularios (forms_analitica — GAP-03) > despliega panel 'formulario-analitica' con ID real si existen formularios [0.98ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 2. Analítica y Métricas de Formularios (forms_analitica — GAP-03) > despliega selector 'formularios' si la lista está vacía [0.09ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 3. Resolución Dinámica de Mesas en Papelógrafo (mesas_papelografo — GAP-10) > resuelve dinámicamente ID de mesa y submesa real sin valores mockeados fijos [0.56ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 3. Resolución Dinámica de Mesas en Papelógrafo (mesas_papelografo — GAP-10) > abre panel 'mesa' si la mesa no cuenta aún con submesas configuradas [0.10ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 4. Actas Inmutables C-150 (mesas_actas — GAP-03) > abre 'mesa-acta' con mesa que tenga sha256Acta pericial registrado [0.08ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 4. Actas Inmutables C-150 (mesas_actas — GAP-03) > redirige a 'mesas' si no hay mesas en el sistema [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 5. Presupuesto FONSET y Cadena de Valor (presupuesto — GAP-03) > abre 'asignacion-presupuestal' operativamente en lugar de toast inerte [0.07ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 6. Fichas de Indicadores de Seguimiento (indicadores — GAP-03) > abre 'rendicion-cuentas' operativamente en lugar de toast inerte [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/usuarios [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/diagnostico [0.03ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/fuentes [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/actores [0.07ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma raíz [0.10ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > politicas_fases abre 'fases-control' [0.04ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > forms_creados abre 'formularios' [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > forms_builder abre 'formulario-editor' [0.06ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > asistencia_consolidado abre 'participacion-multicanal' [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > testimonios_curaduria abre 'testimonios-moderacion' [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > testimonios_nuevo abre 'testimonio-editor' [0.03ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > auditoria abre 'auditoria-consola' [0.03ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 9. Integridad y Cobertura de Permisos Institucionales > todos los módulos tienen permisos formalizados en PERMISOS_MODULO [0.10ms]

 23 pass
 0 fail
 95 expect() calls
Ran 23 tests across 1 file. [167.00ms]
```

---

## 5. Cumplimiento de Restricciones del Encargo

- [x] **Alcance estricto respetado:** `src/app/marco-legal/**`, `src/features/marco-legal/**`, `src/app/marco-legal/page.test.tsx` y exclusión de directorios temporales de compilación en `eslint.config.mjs`.
- [x] **Fuera de alcance respetado:** Backend, base de datos, `data/`, Geovisor, Catálogo de Indicadores (`src/features/indicadores`) permanecen inalterados.
- [x] **Cero git commit y cero git push ejecutados.**
- [x] **Cero despliegue y cero reinicios de servicios ejecutados.**
- [x] **Cero enlaces http:// inseguros:** Solo rutas relativas o HTTPS seguras.
- [x] **Cero estilos hardcoded:** Todos los colores, superficies y tipografías utilizan el sistema de diseño POLIS UI (`@/shared/ui/` y `var(--...)`).
