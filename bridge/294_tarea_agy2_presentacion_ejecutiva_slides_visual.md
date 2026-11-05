# Encargo 294: Rediseño Integral de la Presentación de Seguridad Humana (Formato Diapositivas Ejecutivas de Alto Impacto)

## 1. Contexto y Requerimiento del Usuario
El usuario ha manifestado expresamente:
> *"la presentación no me gustó... no parece una presentación, pídele a agy2 que haga una presentación que parezca presentación, no una copia del texto pegada en un slider"*

La versión anterior se percibía como párrafos de texto continuo insertados en una página horizontal. El objetivo es sustituirla por una **verdadera presentación ejecutiva visual (estilo Slide Deck gubernamental / consultoría de alto nivel)** en PDF apaisado (`pagesizes.landscape(letter)`), donde cada diapositiva tenga diseño gráfico, tarjetas, números de impacto (KPIs), diagramas de flujo y diagramación visual propia de diapositivas modernas.

---

## 2. Archivo Objetivo
* Ruta de salida del PDF: `/root/polis/public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf`
* Script de generación: `/root/polis/scripts/generar_toolbox_completa_pdf.py` (función `generar_doc_presentacion()`)
* Python con ReportLab: `/root/polis/backend/.venv/bin/python`

---

## 3. Especificaciones Visuales y de Diseño Gráfico de Diapositiva

Cada diapositiva debe tener la apariencia de una lámina de presentación profesional (PowerPoint / Canva / Pitch Deck):

1. **Canvas y Fondo de Diapositiva:**
   - Diapositiva 1 (Portada) y Diapositiva 10 (Cierre): Fondos oscuros ejecutivos (`#0B132B` / `#0F172A`), texto blanco de gran escala, cinta de acento en ámbar (`#F59E0B`) y cian (`#0284C7`), insignias oficiales tipo pill.
   - Diapositivas de contenido (2 a 9): Fondo limpio `#F8FAFC`, encabezado de diapositiva con `Action Title` (conclusión primero, no título aburrido), subtítulo contextual, barra lateral o superior de contexto y pie de lámina con contador *«Lámina X de Y»*.

2. **Diagramación basada en Tarjetas y Contenedores (Cards):**
   - Cero paredes de texto continuo. La información debe organizarse en cuadrículas de 2, 3 o 4 tarjetas visuales con bordes redondeados, bordes superiores coloreados (`border-t-4`), fondos diferenciados (`#FFFFFF` sobre `#F1F5F9`) y padding adecuado.

3. **Cifras de Gran Escala (Big Numbers / KPIs Callouts):**
   - Una diapositiva dedicada a métricas de impacto territorial con números gigantescos en negrita (`fontSize=26-30`), por ejemplo:
     - **28.4%** Desempleo Juvenil (Comunas Críticas)
     - **38.0%** Inseguridad Alimentaria en Hogares Populares
     - **68** Puntos Críticos de Inundación Pluvial
     - **32.1** Tasa de Homicidios por 100k hab.
     - **205** Barrios y Corregimientos del POT

4. **Flujos y Diagramas de Proceso (Chevron / Pipeline Steps):**
   - Para la metodología de las 35 mesas y la radicación con fe pública:
     `[Paso 1: Convocatoria] ➔ [Paso 2: Geovisor] ➔ [Paso 3: Co-Diseño] ➔ [Paso 4: Radicación QR]`
     representado como bloques secuenciales con números de paso grandes (01, 02, 03, 04) y colores progresivos.

5. **Estructura Temática de las 10 Diapositivas:**
   - **Diapositiva 1 (Portada Ejecutiva):** Título de gran impacto, subtítulo distrital, logos institucionales y badges.
   - **Diapositiva 2 (El Gran Giro Doctrinal):** Comparativa visual en 2 grandes columnas: *Modelo Punitivo Tradicional (Rojo/Gris)* vs. *Seguridad Humana Integral (Verde/Azul)*.
   - **Diapositiva 3 (Los 3 Pilares Universales ONU):** 3 columnas verticales de igual ancho con tarjetas coloreadas: *Libre de Temor*, *Libre de Necesidad*, *Vivir con Dignidad*.
   - **Diapositiva 4 (El Territorio en Cifras - Dashboard de KPIs):** Cuadrícula de 4 tarjetas con números de 28pt y diagnósticos concisos de las 3 localidades de Cartagena.
   - **Diapositiva 5 (Las 7 Dimensiones en Acción):** Matriz visual de 7 tarjetas con badges, metas de cuatrienio y secretaría líder.
   - **Diapositiva 6 (Cartografía de Alertas en Geovisor):** Focos críticos territoriales con viñetas destacadas (Olaya, Pozón, Mandela, Bayunca, Tierrabomba).
   - **Diapositiva 7 (Ruta Metodológica de las 35 Mesas):** Pipeline de 4 etapas cronometradas del taller comunitario de 120 minutos.
   - **Diapositiva 8 (Sistema de Trazabilidad y Fe Pública):** Diagrama de 3 pasos: Radicado Oficial ➔ Devolución Motivada (15 días) ➔ Veeduría Social con QR.
   - **Diapositiva 9 (Hoja de Ruta y Financiación):** Línea de tiempo 2026-I, 2026-II y 2027 con fuentes presupuestales (FONSET, SGP, Regalías).
   - **Diapositiva 10 (Llamado a la Acción y Cierre):** Diapositiva de impacto final con canales de acceso y participación.

---

## 4. Quality Gates Obligatorios
1. Ejecutar la generación mediante:
   `/root/polis/backend/.venv/bin/python /root/polis/scripts/generar_toolbox_completa_pdf.py`
2. Verificar que el archivo generado en `/root/polis/public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` tenga entre 9 y 10 páginas y se renderice sin errores.
3. Verificar que `curl -sI http://localhost:3000/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` retorne `HTTP/1.1 200 OK`.
4. Ejecutar validaciones:
   - `node scripts/ui-policy.mjs` (0 violaciones)
   - `bun run typecheck` (0 errores)
   - `bun test src/app/seguridad-humana/seguridad-humana.test.tsx` (todas pasan)
5. Documentar la entrega en `bridge/294_entrega_agy2_presentacion_ejecutiva_slides_visual.md`.
6. **Regla estricta:** NO hacer `git commit` ni `git push`. Preservar cambios en el working tree.
