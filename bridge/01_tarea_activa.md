# Tareas Activas — Coordinación Antigravity

## POLIS Herald — Observabilidad, resumen diario y capacidad (EN EJECUCIÓN, 2026-10-31)
> [!IMPORTANT]
> **Recomendación de Seguridad (Ventana de Mantenimiento):** Durante una sonda de verificación local se expuso el DSN de la BD en el log de terminal; programar rotación de credenciales de PostgreSQL en la próxima ventana técnica.

**Origen:** se descubrió que ningún correo salía de producción (nada ejecutaba el worker y no había SMTP). Corregido en `2aad798` (ejecutor `worker_cli.py`, guardia de producción, MIME y reintentos). Correo propio: Postfix + OpenDKIM instalados (solo envío, loopback). **`polis-herald.service` deshabilitado hasta que el usuario publique DNS** (ver `registros_dns_correo.md`).

| Encargo | Agente | Alcance | Entrega esperada |
| --- | --- | --- | --- |
| 275 | `freebuff` | Backend: latido del ejecutor, `/notificaciones/salud`, `/health/herald`, reintento manual, resumen diario, migración `0094_herald_salud_resumen` | `bridge/275_entrega_freebuff_herald_salud_resumen.md` (DESPLEGADO EN PROD: timer activo 07:00 COT) |
| 275-EAF | `codex` | Auditoría Forense Independiente (EAF) Encargo 275: perfiles backend, bd y cicd | `bridge/275_dictamen_eaf_independiente_codex.md` (COMPLETADO: APROBADO) |
| 276 | `agy2` | Frontend: panel de salud + reintento. Test de `notificaciones-api` pasando. | `bridge/276_entrega_agy2_herald_panel_salud.md` (COMPLETADO Y DESPLEGADO) |
| 277 | `codex` | Medir la capacidad REAL del ejecutor (la cifra 3.000-10.000/min fue estimación sin medir). Solo lectura sobre `backend/app` | `bridge/277_entrega_codex_capacidad_herald.md` (COMPLETADO Y ENTREGADO: 324k entregas) |
| 278 | `ollamacodex` | Documento `docs/herald_catalogo_eventos.md` con obligatoriedad propuesta por evento | `bridge/278_entrega_ollamacodex_catalogo_eventos.md` (COMPLETADO Y AUDITADO) |
| 279 | `ollamacodex` | Stack de 17 plantillas HTML transaccionales con logo oficial SVG y código QR HTTPS | `bridge/279_entrega_ollamacodex_stack_plantillas.md` (COMPLETADO Y AUDITADO) |
| 280 | `agy2` | Control accesible de visibilidad de contraseña (mostrar/ocultar) en registro, login y administración | `bridge/280_entrega_agy2_mostrar_contrasena_ux.md` (COMPLETADO Y DESPLEGADO) |
| 281 | `coordinador` | Rediseño pedagógico del flujo y aviso de registro ciudadano (activación por correo + aviso anti-spam) | Integrado y desplegado en `sesion-panel.tsx` |
| 282 | `agy2` | Legibilidad logo ("olis" blanco en fondo oscuro), titularidad Ples SAS (/acerca), validación pública del QR (/aportes/[codigo]) | `bridge/282_entrega_ux_branding_validacion_qr.md` (COMPLETADO Y DESPLEGADO) |
| 283 | `coordinador` | Encabezado (`polis | plataforma para la construccion de politicas publicas`) y orden estricto del cuerpo: Entidad, Política, Dimensión, Propuesta, Autor, Fecha y hora legal | Integrado, probado y desplegado en plantillas de correo |
| 284 | `agy2` | Integración profesional del logo oficial POLIS en sitio público (topbar, navbar, etc.) y favicon/iconos PWA | `bridge/284_entrega_agy2_logo_publico_favicon.md` (COMPLETADO Y DESPLEGADO) |
| 285 | `ollamacodex` | Conexión de eventos transaccionales reales (radicación, cambio estado, registro) al motor Herald y plantillas oficiales | `bridge/285_entrega_ollamacodex_conexion_eventos_herald.md` (COMPLETADO Y AUDITADO) | 
| 286 | `agy2` | Integración del logo e isotipo oficial en el footer del sitio público y vistas públicas | `bridge/286_entrega_agy2_logo_footer.md` (COMPLETADO Y DESPLEGADO) |
| 287 | `agy2` | Revisión directrices, ciclo metodológico (Decreto 1070/2021) y catálogo de políticas públicas de la Secretaría de Planeación Distrital (`planeacion.cartagena.gov.co/politicas-publicas`) | `bridge/287_entrega_agy2_revision_politicas_publicas_planeacion.md` (COMPLETADO Y ENTREGADO) |
| 288 | `agy2` | Ingesta masiva, descarga y conversión a Markdown (AnyDoc) de instructivos, documentos, normativa y tablero de seguimiento (`planeacion.cartagena.gov.co/instructivo` y `/pp-documentos`) | `bridge/288_tarea_agy2_descarga_ingesta_anydoc_planeacion.md` (EN PAUSA / TRANSFERIDO) |
| 289 | `agy2` | Manual metodológico y playbook operativo de estructuración con base en la Ficha de Estructuración de la Secretaría de Planeación Distrital (Fase 1: Alistamiento) | `bridge/289_playbook_agy2_estructuracion_ficha_planeacion_cartagena.md` (COMPLETADO Y TRANSFERIDO) |
| 290 | `agy2` | Expansión de Suite E2E y Smoke Testing para Cobertura Exhaustiva de Endpoints, CRUDs y Vistas en POLIS (Playwright) | `bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md` (COMPLETADO Y ENTREGADO: 4/4 EXPANDIDOS + 9/9 CANÓNICOS) |
| 291 | `ollamacodex` | Tríada de Estabilización y Expansión: Geovisor Dinámico, Censo 35 Mesas (0095) e Ingesta de Planeación Distrital | `bridge/291_tarea_ollamacodex_geovisor_censo35_planeacion.md` (ASIGNADO EN EJECUCIÓN) |
| 292 | `agy2` | Reordenación de Navegación: Mover menú del Geovisor después de Testimonios en Topbar | `bridge/292_entrega_agy2_reordenar_menu_geovisor.md` (COMPLETADO Y ENTREGADO) |
| 293 | `agy2` | Página Pedagógica e Interactiva de Seguridad Humana Integral, Infografía Dinámica y Caja de Herramientas (ABC Documental) | `bridge/293_entrega_agy2_pagina_seguridad_humana_caja_herramientas.md` (COMPLETADO Y ENTREGADO: 8/8 tests, 4 PDFs) |
| 294 | `agy2` | Rediseño Integral de la Presentación de Seguridad Humana (Formato Diapositivas Ejecutivas de Alto Impacto con Cards, KPIs y Diagramas) | `bridge/294_entrega_agy2_presentacion_ejecutiva_slides_visual.md` (COMPLETADO Y ENTREGADO: 10 diapositivas, 9/9 tests) |
| 295 | `ollamacodex` | Indicadores de Seguridad Humana, plan maestro v2, Etapa 1: WP0 + WP2 (catálogo y validador) | `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` (ENTREGADO; auditado en 296) |
| 296 | `agy` | Auditoría del catálogo, endpoint `/catalogo` y página `/indicadores` | `bridge/296_entrega_agy_auditoria_catalogo_indicadores.md` (APROBADO catálogo+backend para commit; página NO aprobada para despliegue, ver B-1..B-4) |
| 298 | `agy2` | Corrección de la página `/indicadores` según los hallazgos B-2, B-3, B-4 y N-1..N-9 del dictamen 296 (sin tocar menú, backend ni despliegue) | `bridge/298_entrega_agy2_correccion_pagina_indicadores.md` (COMPLETADO Y ENTREGADO: 18/18 tests, gates limpios) |
| 299 | `ollamacodex` | Cierre de pendientes del catálogo (M-1..M-3, N-5, N-8): registro y validador de cifras publicadas, ampliación de cobertura, pruebas del backend `/catalogo` | `bridge/299_entrega_ollamacodex_cierre_catalogo.md` (ASIGNADO) |
| 297 | `codex` | QA independiente sobre 295 y 296 | `bridge/297_entrega_codex_qa_independiente_indicadores.md` (ENTREGADO: **RECHAZA el cierre integral**; 9 hallazgos H297-01..09 y 3 observaciones) |
| 300 | `ollamacodex` | Correcciones del catálogo y validador según QA 297 (H297-01, 02, 07, 09), después del 299 | `bridge/300_entrega_ollamacodex_correcciones_qa297.md` (EN COLA) |
| 301 | `agy2` | Accesibilidad y estados de `/indicadores` según QA 297 (H297-05, 06, O297-01, 02) | `bridge/301_entrega_agy2_accesibilidad_indicadores.md` (COMPLETADO Y ENTREGADO: 28/28 tests, axe 0 violaciones, gates limpios) |
| 302 | `agy2` | Diferenciación estructural del Marco de la Política Pública de Seguridad Humana vs. Marco Legal de la Plataforma POLIS en `/marco-legal` | `bridge/302_entrega_agy2_diferenciacion_marcos_legales.md` (COMPLETADO Y ENTREGADO: 9/9 tests, gates limpios) |
Especificaciones: `bridge/275_tarea_*` a `302_tarea_*`. QA independiente posterior: `opencode`.

---

## Encargo 294 (COMPLETADO Y ENTREGADO): `agy2` — Rediseño Ejecutivo Visual de Diapositivas de Seguridad Humana
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/294_tarea_agy2_presentacion_ejecutiva_slides_visual.md`](file:///root/polis/bridge/294_tarea_agy2_presentacion_ejecutiva_slides_visual.md)
- **Informe de entrega:** [`/root/polis/bridge/294_entrega_agy2_presentacion_ejecutiva_slides_visual.md`](file:///root/polis/bridge/294_entrega_agy2_presentacion_ejecutiva_slides_visual.md)
- **Alcance ejecutado y verificado:**
  - Rediseño completo de `generar_doc_presentacion()` en `scripts/generar_toolbox_completa_pdf.py` sustituyendo textos planos por un Slide Deck ejecutivo de 10 láminas en formato horizontal (`landscape(letter)`).
  - Portada (Lámina 01) y Cierre (Lámina 10) en estilo oscuro ejecutivo (`#0B132B` / `#0F172A`) con acentos ámbar y cian.
  - Diagramación basada en tarjetas (*cards* con bordes superiores coloreados), títulos de conclusión (*Action Titles*), y cero paredes de texto.
  - Dashboard de KPIs de impacto con números de 28pt (Desempleo Juvenil 28.4%, Inseguridad Alimentaria 38.0%, Tasa Homicidios 32.1, Puntos Inundación 68, Barrios POT 205).
  - Pipeline de proceso del taller comunitario (chevrons 01 a 04) y ciclo de trazabilidad con fe pública y código QR.
  - Validado con Python del venv de backend: archivo generado en `public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` (exactamente 10 páginas, 25.2 KB).
  - Verificado endpoint HTTP: `HTTP/1.1 200 OK` (25.203 bytes).
  - Quality gates aprobados: `ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores), `bun test` en seguridad-humana (9/9 pruebas pasando).
  - Cero git commit, cero git push.

---

## Encargo 293 (COMPLETADO Y ENTREGADO): `agy2` — Página Pedagógica de Seguridad Humana, Infografía y Caja de Herramientas
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/293_tarea_agy2_pagina_seguridad_humana_caja_herramientas.md`](file:///root/polis/bridge/293_tarea_agy2_pagina_seguridad_humana_caja_herramientas.md)
- **Informe de entrega:** [`/root/polis/bridge/293_entrega_agy2_pagina_seguridad_humana_caja_herramientas.md`](file:///root/polis/bridge/293_entrega_agy2_pagina_seguridad_humana_caja_herramientas.md)
- **Alcance ejecutado y verificado:**
  - Página interactiva `/seguridad-humana` (`src/app/seguridad-humana/page.tsx` y `src/features/seguridad-humana/views/seguridad-humana-view.tsx`).
  - Infografía dinámica interactiva de los 3 pilares de las Naciones Unidas (Res. 66/290) y selector con fichas técnicas de las 7 dimensiones distritales de Cartagena con entidades líderes.
  - Matriz comparativa de paradigma "¿Qué NO es vs. ¿Qué SÍ es la Seguridad Humana?".
  - Caja de herramientas con 4 documentos PDF listos para descarga en `public/docs/` (ABC Maestro, Diapositivas de Diagnóstico, Matriz de Metas e Indicadores DNP y Guía para Facilitadores de Mesas).
  - Acordeón interactivo accesible (Radix UI) con las 10 preguntas clave del ABC ciudadano.
  - CTAs accesibles en barra de navegación superior (`topbar.tsx`), hero showcase de portada (`hero-home-showcase.tsx`), sección de dimensiones (`inicio-view.tsx`) y enlace en footer (`footer.tsx`).
  - Pruebas unitarias en `src/app/seguridad-humana/seguridad-humana.test.tsx` (8/8 pasando, 83 aserciones).
  - Quality gates aprobados: `ui-policy.mjs` (0 infracciones), `bun run typecheck` (0 errores), `bun test` (1.617 tests pasando en 163 archivos), build Next.js (209/209 rutas generadas estáticamente).
  - Cero colores Tailwind literales. Sin commit ni push.

---

## Encargo 292 (COMPLETADO Y ENTREGADO): `agy2` — Reordenación de Navegación Geovisor tras Testimonios
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/292_tarea_agy2_reordenar_menu_geovisor.md`](file:///root/polis/bridge/292_tarea_agy2_reordenar_menu_geovisor.md)
- **Informe de entrega:** [`/root/polis/bridge/292_entrega_agy2_reordenar_menu_geovisor.md`](file:///root/polis/bridge/292_entrega_agy2_reordenar_menu_geovisor.md)
- **Alcance cumplido:**
  - Reordenada la constante `NAV` en [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx) para ubicar "Geovisor Territorial" inmediatamente después de "Testimonios" (Inicio -> Líneas -> Dimensiones -> Mesas -> Noticias -> Testimonios -> Geovisor Territorial).
  - Verificación estricta: `ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores), `bun test` (1609/1609 pruebas pasando) y build standalone verificado. Sin commit ni push.

---

## Encargo 291 (EN EJECUCIÓN): `ollamacodex` — Geovisor Dinámico, Censo 35 Mesas e Ingesta de Planeación
- **Asignado a:** `ollamacodex` (`=ollamacodex:0.0`)
- **Especificación completa:** [`/root/polis/bridge/291_tarea_ollamacodex_geovisor_censo35_planeacion.md`](file:///root/polis/bridge/291_tarea_ollamacodex_geovisor_censo35_planeacion.md)
- **Informe de entrega esperado:** `bridge/291_entrega_ollamacodex_geovisor_censo35_planeacion.md`
- **Frentes asignados:**
  1. Conectar renderizado dinámico de capas de `/geodatos/capas` en `use-mapa.ts` y filtro dinámico en Banco Multifuente.
  2. Verificar y ejecutar migración `0095_sembrar_censo_35_mesas.py` para asentar el censo oficial de mesas de Cartagena.
  3. Continuar la ingesta y conversión a Markdown de fuentes documentales de `planeacion.cartagena.gov.co`.

---

## Encargo 290 (COMPLETADO Y ENTREGADO): `agy2` — Expansión de Suite E2E y Smoke Testing para Cobertura Exhaustiva
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/290_tarea_agy2_expansion_cobertura_e2e_smoke.md`](file:///root/polis/bridge/290_tarea_agy2_expansion_cobertura_e2e_smoke.md)
- **Informe de entrega:** [`/root/polis/bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md`](file:///root/polis/bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md)
- **Alcance cumplido:**
  - Ampliación de la suite E2E / Smoke con Playwright certificando de punta a punta en Chromium los 4 módulos funcionales críticos pendientes:
    1. Alternativas MGA y dictamen de viabilidad jurídica (LOOT/OIT 169) y fiscal (FONSET/Vigencias Futuras Ley 1483/11) con persistencia en BD.
    2. Radicación Ciudadana Pública con emisión atómica de radicado `POL-2026-XXXX`, comprobante forense y verificación de fe pública en `/aportes/[codigo]`.
    3. Geovisor Territorial (`/plataforma/geovisor` y `/geovisor`) con filtros por Localidades 1, 2, 3 y validación de ausencia de excepciones de consola.
    4. Gestión de Usuarios, Roles, PBAC y control accesible de visibilidad de contraseña (Password UX del Encargo 280) con persistencia en BD.
  - Aislamiento estricto de puertos (`8100`, `3105`, `3100`) y base de datos efímera (`polis_test_e2e`).
  - Verificación de Quality Gates: `ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores), `bun test` (1609/1609 pruebas pasando). Sin commit ni push.

---

## Encargo 286 (COMPLETADO PARA AUDITORÍA): `agy2` — Integración de Logo e Isotipo Oficial en Footer y Vistas Públicas
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/286_tarea_agy2_actualizar_logo_footer.md`](file:///root/polis/bridge/286_tarea_agy2_actualizar_logo_footer.md)
- **Informe de entrega:** [`/root/polis/bridge/286_entrega_agy2_logo_footer.md`](file:///root/polis/bridge/286_entrega_agy2_logo_footer.md)
- **Alcance cumplido:**
  - Sustituido `<Landmark>` en el pie de página institucional ([`src/shared/layout/footer.tsx`](file:///root/polis/src/shared/layout/footer.tsx)) por el componente `IsotipoPolis` en contenedor squircle institucional `size-7` adaptado a temas claro/oscuro.
  - Actualizada la cabecera del formulario público de aportes ([`src/features/formularios/views/formulario-publico-view.tsx`](file:///root/polis/src/features/formularios/views/formulario-publico-view.tsx)) con el isotipo oficial `IsotipoPolis` en contenedor `size-10 sm:size-11`.
  - Verificación estricta con `node scripts/ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores) y `bun test` (1609/1609 pruebas pasando). Sin commit ni push.
 
## Encargo 285 (COMPLETADO Y AUDITADO): `ollamacodex` — Conexión de Eventos Reales a Herald y Plantillas Oficiales
- **Asignado a:** `ollamacodex` (`=ollamacodex:0.0`)
- **Especificación completa:** [`/root/polis/bridge/285_tarea_ollamacodex_conexion_eventos_herald.md`](file:///root/polis/bridge/285_tarea_ollamacodex_conexion_eventos_herald.md)
- **Informe de entrega:** [`bridge/285_entrega_ollamacodex_conexion_eventos_herald.md`](file:///root/polis/bridge/285_entrega_ollamacodex_conexion_eventos_herald.md)
- **Alcance asignado:**
  - Conectar radicación de propuestas ciudadanas a `generar_html_constancia_radicacion` de `plantillas_stack.py` con enlace oficial a `/aportes/{radicado}`.
  - Conectar cambio de estado y actividad ciudadana a las plantillas oficiales del stack.
  - Conectar registro/bienvenida con pedagogía clara y aviso anti-spam.
  - Verificación estricta con pytest y ruff.

---

## Encargo 284 (COMPLETADO Y DESPLEGADO): `agy2` — Integración Profesional de Logo POLIS en Sitio Público y Favicon
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/284_tarea_incorporacion_logo_publico_favicon.md`](file:///root/polis/bridge/284_tarea_incorporacion_logo_publico_favicon.md)
- **Informe de entrega:** [`/root/polis/bridge/284_entrega_agy2_logo_publico_favicon.md`](file:///root/polis/bridge/284_entrega_agy2_logo_publico_favicon.md)
- **Alcance cumplido:**
  - Extraído y optimizado el isotipo oficial "P" (Ágora Concéntrica de POLIS) como favicon SVG de alta fidelidad (`/favicon.svg`, `icon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) en `src/app/layout.tsx` y `public/manifest.json`.
  - Reemplazado ícono genérico `<Landmark>` en la barra superior pública ([`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx)) por el componente oficial del logo POLIS con adaptación perfecta a temas claro y oscuro (`var(--text-primary)`).
  - Coherencia visual en otros puntos de contacto: cabecera de plataforma autenticada (`plataforma-header.tsx`), modo barrio (`barrio-view.tsx`), y página acerca (`acerca/page.tsx`).
  - Validación con `ui-policy.mjs` (0 violaciones), `bun run typecheck` (0 errores) y suite unitaria de 6 pruebas en `logo-polis.test.tsx` (6/6 OK).

---

## Encargo 282 (COMPLETADO Y DESPLEGADO): `agy2` — UX, Branding Ples SAS y Validación QR
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/282_tarea_ux_branding_validacion_qr.md`](file:///root/polis/bridge/282_tarea_ux_branding_validacion_qr.md)
- **Informe de entrega:** [`/root/polis/bridge/282_entrega_ux_branding_validacion_qr.md`](file:///root/polis/bridge/282_entrega_ux_branding_validacion_qr.md)
- **Alcance cumplido:**
  - **Legibilidad de Logo (`public/logo-polis.svg`):** Letras "OLIS" con `stroke="#FFFFFF"` (blanco puro) garantizando contraste WCAG AAA en fondos oscuros y cabeceras de correos institucionales.
  - **Titularidad Ples SAS:** Footer enriquecido con leyenda oficial y enlace a `https://ples.com.co`, más enlace de navegación a `/acerca`.
  - **Página Institucional (`src/app/acerca/page.tsx`):** Explicación integral del sistema POLIS y atribución de autoría y propiedad exclusiva a Ples SAS.
  - **Validación Pública de Constancias QR (`src/app/aportes/[codigo]/page.tsx`):** Tarjeta solemne de fe pública distrital con radicado, metadatos, estado de tramitación y buscador contextual. Redirección de compatibilidad en `/verificar/[codigo]`.
  - **Pruebas y Calidad:** 6/6 tests pasando en `validacion-qr.test.tsx`, `ui-policy` y `typecheck` en verde. Compilado y desplegado en producción.

---

## Encargo 280 (COMPLETADO Y DESPLEGADO): `agy2` — Control Accesible de Visibilidad de Contraseñas
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/280_tarea_agy2_mostrar_contrasena_ux.md`](file:///root/polis/bridge/280_tarea_agy2_mostrar_contrasena_ux.md)
- **Informe de entrega:** [`/root/polis/bridge/280_entrega_agy2_mostrar_contrasena_ux.md`](file:///root/polis/bridge/280_entrega_agy2_mostrar_contrasena_ux.md)
- **Alcance cumplido:**
  - Componente accesible [`src/shared/ui/password-input.tsx`](file:///root/polis/src/shared/ui/password-input.tsx) con alternancia `Eye`/`EyeOff`, `aria-label="Mostrar/Ocultar contraseña"`, `aria-pressed`, `type="button"`, sin fugas en teclado y tokens semánticos POLIS.
  - Integración nativa en `CampoIdentidad` y `CampoContrasena` en [`sesion-panel.tsx`](file:///root/polis/src/features/sesion/panels/sesion-panel.tsx), [`usuarios-panel.tsx`](file:///root/polis/src/features/usuarios/panels/usuarios-panel.tsx), [`usuario-editor-panel.tsx`](file:///root/polis/src/features/usuarios/panels/usuario-editor-panel.tsx) y [`cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx).
  - Suite de pruebas unitarias [`src/features/sesion/components/campo-contrasena.test.tsx`](file:///root/polis/src/features/sesion/components/campo-contrasena.test.tsx) pasando al 100%. `ui-policy` y `typecheck` en verde. Compilado y activo en producción.

---

## Rediseño Pedagógico de Activación Ciudadana y Aviso Anti-Spam (DESPLEGADO)
- **Alcance cumplido:**
  - Reemplazado mensaje confuso por tarjeta destacada institucional: *«¡Cuenta creada! Estás a un paso de activarla»*.
  - Indica el correo exacto ingresado, pasos numerados (abrir correo, hacer clic en verificar cuenta) y orientación pedagógica sobre revisar Spam / Correo no deseado y marcar «No es spam».
  - Prellenado automático de correo al cambiar a la vista de login tras registrarse.
  - Test unitario [`src/features/sesion/panels/sesion-activacion.test.tsx`](file:///root/polis/src/features/sesion/panels/sesion-activacion.test.tsx) en verde. Compilado y activo en producción.

---

## Encargo 274 (COMPLETADO Y CERRADO): `agy2` — Integración Frontend de POLIS Herald: Visor de Fe Pública, Constancias y Avisos de Despacho
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/274_tarea_agy2_herald_frontend_visor.md`](file:///root/polis/bridge/274_tarea_agy2_herald_frontend_visor.md)
- **Informe de entrega:** [`/root/polis/bridge/274_entrega_agy2_herald_frontend_visor.md`](file:///root/polis/bridge/274_entrega_agy2_herald_frontend_visor.md)
- **Alcance cumplido:** Avisos de despacho de constancia en cuenta de usuario (actualización de perfil y clave), tarjeta institucional de fe pública (Sentencia C-150 de 2015), visor interactivo para supervisión forense de notificaciones (/api/v1/notificaciones/historial) para roles con permiso `auditoria:leer`, confirmaciones visuales al radicar propuestas en AporteEditorPanel y Modo Barrio. 100% de cumplimiento en `ui-policy`, `typecheck`, `eslint` y pruebas.

---

## Encargo 273 (COMPLETADO Y CERRADO): `freebuff` — POLIS Herald Fase 2: Trazabilidad y Fe Pública por Correo (Usuarios Internos y Externos)
- **Asignado a:** `freebuff` (`=freebuff:0.0`)
- **Especificación completa:** [`/root/polis/bridge/273_tarea_freebuff_polis_herald_fase2.md`](file:///root/polis/bridge/273_tarea_freebuff_polis_herald_fase2.md)
- **Informe de entrega:** [`/root/polis/bridge/273_entrega_freebuff_polis_herald_fase2.md`](file:///root/polis/bridge/273_entrega_freebuff_polis_herald_fase2.md)
- **Alcance cumplido:** Consolidación de POLIS Herald para usuarios externos (aviso inmediato de cambios en perfil, contraseña y actualización de propuestas con sello UTC y radicado) y usuarios internos (gestores de mesas, comunicadores, administradores con comprobante de acción y resumen de pendientes asociados). Patrón Transactional Outbox, migración Alembic 0093 con los 12 tipos de evento aplicada en base de datos de producción `bd_csh`, suite de 11 pruebas automatizadas nuevas (11/11 OK) y 0 errores en ruff.

---

## Encargo 272 (COMPLETADO Y CERRADO): `freebuff` — Servicio de Correo Transaccional (Registro, Clave, Propuesta, Me Gusta y Actividades)
- **Asignado a:** `freebuff` (`=freebuff:0.0`)
- **Especificación completa:** [`/root/polis/bridge/272_tarea_freebuff_servicio_correo_transaccional.md`](file:///root/polis/bridge/272_tarea_freebuff_servicio_correo_transaccional.md)
- **Informe de entrega:** [`/root/polis/bridge/272_entrega_freebuff_servicio_correo_transaccional.md`](file:///root/polis/bridge/272_entrega_freebuff_servicio_correo_transaccional.md)
- **Alcance cumplido:** Servicio de correo transaccional para los 4 flujos (registro+verificación, recuperación de contraseña, creación de propuesta, respaldo ciudadano/actividades sobre patrón Outbox existente), plantillas HTML institucionales nuevas (bienvenida, recuperación, actividad_apoyo), migración Alembic 0092 que amplía `chk_notificaciones_tipo_evento`, y suite nueva `backend/tests/test_servicio_correo_transaccional.py` (12/12 OK). Calidad 100% verificada, migración aplicada en `bd_csh`, backend reiniciado y en producción.

---

## Encargo 271 (COMPLETADO Y CERRADO): `freebuff` — Vista de Trazabilidad y Diagrama UML del Ciclo de Vida de una Política Pública
- **Asignado a:** `freebuff` (`=freebuff:0.0`)
- **Especificación completa:** [`/root/polis/bridge/271_tarea_freebuff_trazabilidad_uml_politica_publica.md`](file:///root/polis/bridge/271_tarea_freebuff_trazabilidad_uml_politica_publica.md)
- **Informe de entrega:** [`/root/polis/bridge/271_entrega_freebuff_trazabilidad_uml_politica_publica.md`](file:///root/polis/bridge/271_entrega_freebuff_trazabilidad_uml_politica_publica.md)
- **Commit en main:** `c5c99c9`
- **Alcance cumplido:** Enlace `/trazabilidad` activo en `src/shared/layout/footer.tsx`, nueva página institucional `src/app/trazabilidad/page.tsx` con diagrama UML interactivo de actividades y carriles (5 swimlanes de actores × 5 fases metodológicas DNP / Decreto Distrital 037/2026), matriz detallada con marco legal y data lineage de radicado único. Control de calidad 100% aprobado (ui-policy, typecheck, eslint y prerender estático). Desplegado en producción.

---

## Encargo 270 (COMPLETADO Y CERRADO): `agy2` — Vista Adaptativa Responsive para Marco Legal
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/270_tarea_agy2_marco_legal_responsive.md`](file:///root/polis/bridge/270_tarea_agy2_marco_legal_responsive.md)
- **Informe de entrega:** [`/root/polis/bridge/270_entrega_agy2_marco_legal_responsive.md`](file:///root/polis/bridge/270_entrega_agy2_marco_legal_responsive.md)
- **Commit en main:** `e0be3e8`
- **Alcance cumplido:** Layout centrado `max-w-7xl mx-auto`, cuadrícula 12 columnas con sidebar sticky de índice normativo y contexto institucional en desktop (`lg:`), navegación horizontal fluida por pestañas en móvil/tablet, tarjetas normativas con chips/badges de nivel y diseño tipográfico adaptativo. Calidad verificada al 100% (`ui-policy`, `typecheck`, `eslint` y build limpio). Desplegado en producción.

---

## Encargos Previos Cerrados y Publicados en Producción (`origin/main`)
- **Encargo 265 (`codex`):** Streaming y purga de actividades en proyectos. Commit `1539c7d` y `6a21cbc`.
- **Encargo 266 (`agy2`):** Capas multifuente en mapa y corrección insular. Commit `0c56362`.
- **Encargos 267 y 268 (`ollamacodex` y `freebuff`):** Enlace datos abiertos, páginas `/marco-legal` y `/contacto`. Commit `25654f4`.
- **Encargo 269 (`ollamacodex` y coordinación):** 21 líneas estratégicas por eje (`LE-08` a `LE-28`), migración 0091 y filtros dinámicos. Commits `157b2be` y `c561489`.
