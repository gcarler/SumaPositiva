# Entrega Encargo 294: Rediseño Integral de la Presentación de Seguridad Humana (Diapositivas Ejecutivas de Alto Impacto)

**Fecha:** 2026-11-05  
**Agente Responsable:** `agy2`  
**Destinatario:** Coordinación (`agy:0.0`)  
**Tarea de Origen:** [`bridge/294_tarea_agy2_presentacion_ejecutiva_slides_visual.md`](file:///root/polis/bridge/294_tarea_agy2_presentacion_ejecutiva_slides_visual.md)  
**Registro Central:** [`bridge/01_tarea_activa.md`](file:///root/polis/bridge/01_tarea_activa.md)  
**Estado:** **COMPLETADO Y ENTREGADO (Sin commit ni push)**  

---

## 1. Resumen Ejecutivo del Rediseño

Atendiendo la retroalimentación directa del usuario:
> *«la presentación no me gustó... no parece una presentación, pídele a agy2 que haga una presentación que parezca presentación, no una copia del texto pegada en un slider»*

Se rediseñó desde cero la función `generar_doc_presentacion()` en [`scripts/generar_toolbox_completa_pdf.py`](file:///root/polis/scripts/generar_toolbox_completa_pdf.py), transformando el documento en una **auténtica presentación ejecutiva visual (estilo Slide Deck gubernamental / consultoría estratégica de alto nivel)** en formato horizontal (`landscape(letter)`).

El nuevo documento contiene **exactamente 10 diapositivas** perfectamente presupuestadas en altura (1 página por diapositiva, sin desbordamientos), con diagramación basada en tarjetas (*cards* con bordes superiores coloreados), números gigantescos de impacto (*KPIs de 26-28pt*), diagramas de flujo de proceso (*chevrons 01 a 04*) y **cero paredes planas de texto continuo**.

---

## 2. Estructura y Características Visuales de las 10 Diapositivas

| Diapositiva | Título Ejecutivo (Action Title) | Tipo de Diagramación Visual | Elementos Gráficos y Destacados |
| :---: | :--- | :--- | :--- |
| **01** | **DIAGNÓSTICO MULTIDIMENSIONAL DE SEGURIDAD HUMANA INTEGRAL** | **Portada Ejecutiva (Dark Theme)** | Fondo `#0F172A`, borde oro `#F59E0B`, caja de lema dorado, 3 tarjetas inferiores flotantes (Marco ONU, Cobertura 3 Localidades, Fe Pública QR). |
| **02** | **Del Control Punitivo Reactivo a la Protección Integral de la Vida y el Territorio** | **Comparativa de Gran Escala (2 Columnas)** | 2 grandes tarjetas de 355pt: *❌ Modelo Tradicional (Rojo/Rosa `#FFF5F5`)* vs. *✔ Doctrina POLIS (Esmeralda/Verde `#F0FDF4`)*. Banner de hallazgo central: 72% de la violencia nace de exclusión. |
| **03** | **Tres Libertades Universales que Rigen la Inversión Pública en Cartagena** | **3 Columnas de Pilares ONU (Cards)** | 3 tarjetas verticales de 236pt con borde superior coloreado: *Pilar 01 Libre de Temor (Rojo)*, *Pilar 02 Libre de Necesidad (Ámbar)*, *Pilar 03 Vivir con Dignidad (Cian)*. Metas 2027 integradas. |
| **04** | **Cartagena en Cifras: Diagnóstico Crítico que Justifica la Intervención** | **Dashboard de KPIs (Big Numbers)** | **Cifras gigantes de 28pt:**<br/>• **28.4%** Desempleo Juvenil (Comunas Críticas)<br/>• **38.0%** Inseguridad Alimentaria en Hogares Populares<br/>• **32.1** Homicidios por 100k hab.<br/>• **68 Puntos Críticos** de Inundación Pluvial<br/>• **205 Barrios y Corregimientos** del POT |
| **05** | **Las Siete (7) Dimensiones Integrales: Corresponsabilidad Distrital** | **Matriz Estructurada de 7 Dimensiones** | 7 tarjetas con badges de color, línea base, meta a 2027 y secretaría distrital líder corresponsable (Interior, IDER, Hacienda, OAGRD, PES, DADIS, Planeación). |
| **06** | **Focalización Territorial del Gasto: Microterritorios de Intervención Urgente** | **Focos Territoriales (Cuadrícula 2x2)** | 4 tarjetas territoriales con badges de prioridad: Olaya Herrera (~90k hab.), El Pozón (~80k hab.), Nelson Mandela (~60k hab.) y Zona Rural e Islas (~45k hab.), con riesgos concurrentes e intervención POLIS. |
| **07** | **Metodología Participativa: La Ruta de Co-Diseño Barrial en 4 Momentos** | **Pipeline Secuencial (Chevrons 01-04)** | 4 tarjetas secuenciales horizontales del taller de 120 minutos: `01 Instalación` (0-15m) ➔ `02 Geo-Diagnóstico` (15-45m) ➔ `03 Co-Diseño` (45-85m) ➔ `04 Radicado QR` (85-120m). Banner de salvaguarda de no revictimización. |
| **08** | **Fe Pública y Control Social: El Ciclo de Transparencia Inviolable** | **Flujo de Trazabilidad (3 Pasos)** | 3 tarjetas horizontales de proceso: `Paso 1: Radicado Atómico Inmutable (POL-2026-XXXX)` ➔ `Paso 2: Devolución Motivada en 15 Días (Sentencia C-150)` ➔ `Paso 3: Auditoría Social con Código QR 24/7`. |
| **09** | **Hoja de Ruta Plurianual y Fuentes Presupuestales Ciertas** | **Línea de Tiempo + Matriz de Fuentes** | 3 tarjetas cronológicas (Fase 1 Diagnóstico 2026-I, Fase 2 Ejecución 2026-II, Fase 3 Rendición 2027+) + 4 píldoras de fuentes financieras: FONSET, SGP, Regalías y Recursos Propios. |
| **10** | **¡Cartagena se Transforma con la Fuerza de sus Barrios!** | **Cierre y Llamado a la Acción (Dark Theme)** | Fondo ejecutivo `#0F172A`, cita inspiradora, 3 tarjetas de canales de participación directa (Portal Web POLIS, Modo Barrio Ligero, Asambleas y Mesas de Paz) y pie institucional distrital. |

---

## 3. Especificaciones Técnicas y Visuales de `SlideCanvas`

- **Canvas Decorator (`SlideCanvas`):**
  - **Diapositivas 1 y 10 (Portada y Cierre):** Identificadas automáticamente por `_pageNumber in (1, page_count)`. Renderizan cintas decorativas ejecutivas superior (ámbar + cian) e inferior (ámbar), suprimiendo barras de contenido estándar para mantener un contraste inmersivo.
  - **Diapositivas 2 a 9:** Cinta superior institucional en `#0F172A` con franja ámbar `#D97706`, textos institucionales en blanco y subtítulo del taller. Línea inferior en `#CBD5E1` con mención a las secretarías líderes y contador dinámico de diapositivas: *«Diapositiva X de 10»*.
- **Presupuesto Estricto de Altura:** Todas las diapositivas calculan sus márgenes (`topMargin=36, bottomMargin=36`, usable height: 540 pt) garantizando que cada lámina se mantenga exactamente en una página, generando un total de **10 páginas exactas**.

---

## 4. Verificación de Quality Gates

| Quality Gate | Comando de Validación | Resultado | Evidencia |
| :--- | :--- | :---: | :--- |
| **Generación con Python Venv** | `/root/polis/backend/.venv/bin/python /root/polis/scripts/generar_toolbox_completa_pdf.py` | **EXITOSO** | Documento generado en `/root/polis/public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` (25.203 bytes). |
| **Verificación de Páginas (`pdfinfo`)** | `pdfinfo /root/polis/public/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` | **EXITOSO** | `Pages: 10`, `Page size: 792 x 612 pts (letter)`. |
| **Endpoint HTTP Público** | `curl -sI http://localhost:3000/docs/PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` | **EXITOSO** | `HTTP/1.1 200 OK`, `Content-Length: 25203`. |
| **Política de UI** | `node scripts/ui-policy.mjs` | **EXITOSO** | 0 infracciones en todo el proyecto. |
| **Chequeo de Tipos** | `bun run typecheck` | **EXITOSO** | `tsc --noEmit` completó con 0 errores. |
| **Suite de Pruebas** | `bun test src/app/seguridad-humana/seguridad-humana.test.tsx` | **EXITOSO** | **9 de 9 pruebas pasando** (95 aserciones). |

---

## 5. Compromisos y Restricciones Cumplidas

- [x] **Diseño Visual de Diapositiva Real:** Cards con bordes coloreados, KPIs de 28pt, pipeline de pasos y cero párrafos continuos descontextualizados.
- [x] **Exactamente 10 Láminas Temáticas:** Todas las temáticas solicitadas incorporadas respetando la estructura requerida.
- [x] **Sincronización en Producción:** Archivo sincronizado tanto en `public/docs/` como en `.next/standalone/public/docs/`.
- [x] **CERO GIT COMMIT / CERO GIT PUSH:** Modificaciones realizadas estrictamente en el working tree local conforme a la directriz.
