# Entrega agy2 — Acta Oficial en PDF, Registro de Asistencia con QR y Capa Geovisor de Mesas
Fecha: 2026-10-02T13:57:00Z
Estado: CONFORME

## Resumen Ejecutivo
Se implementaron con éxito los 3 módulos fundamentales para la operatividad gubernamental y comunitaria de las 36 mesas territoriales de Cartagena en la plataforma POLIS:
1. **Acta Oficial en PDF / Impresión Institucional**: En cumplimiento estricto del Decreto 037 de 2026, la Ley Estatutaria 1757 de 2015 y la Sentencia C-150 de 2015, con 7 secciones numeradas, tabla de Marco Lógico MML, cuadro de 4 firmas institucionales y comunitarias, botón de impresión `@media print` en formato Carta y panel `mesa-acta` registrado en el stack Zero-Modals.
2. **Registro de Asistencia Digital en Puerta**: Modelo de datos con 12 enfoques diferenciales normativos, store reactivo con persistencia local y exportación de planilla CSV legal con encabezado institucional y BOM UTF-8, ruta pública móvil ultra-liviana (`/asistencia/[mesaId]`), módulo administrativo en `MesaPanel` con código QR oficial, proyección de cartel en pantalla y registro manual rápido.
3. **Capa Interactiva de Mesas en el Geovisor**: Coordenadas geográficas reales en Cartagena para las 36 mesas de trabajo de la agenda oficial, semáforo visual de 3 estados (🟡 Programada, 🔵 En curso, 🟢 Realizada), popup flotante con metadatos territoriales y botón de acceso directo *"Ver Detalle / Acta"* que abre `MesaPanel`.

---

## 1. Módulo de Acta Oficial en PDF (`src/features/mesas/panels/mesa-acta-panel.tsx`)
- **Panel y Navegación Zero-Modals**:
  - Registrado como `"mesa-acta"` en `src/core/panels/panel-store.ts` y montado en `src/app/_composition/panel-registry.tsx`.
  - Integración en `MesaPanel`: botones destacados *"📄 Ver Acta Oficial en PDF"* en cabecera y en el footer de acciones.
- **Encabezado Institucional**:
  - Membrete oficial: *"Alcaldía Mayor de Cartagena de Indias — Secretaría de Planeación Distrital"*.
  - Título oficial: *"ACTA DE CONSULTA CIUDADANA — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (2026–2036)"*.
  - Fundamento jurídico: *"En cumplimiento del Decreto 037 de 2026, la Ley Estatutaria 1757 de 2015 y la Sentencia C-150 de 2015"*.
- **Estructura Técnica (7 Secciones Obligatorias)**:
  1. *Datos Administrativos*: Código de mesa, territorio, fecha y horario, lugar exacto, facilitadores líderes, entidades convocantes y aforo.
  2. *Participación y Quórum*: Cómputo total de asistentes, desglose plenaria vs. submesas y métricas tabuladas por enfoque diferencial.
  3. *Acuerdos de la Plenaria de Apertura*: Compromisos concertados con la comunidad durante la instalación.
  4. *Matriz de Marco Lógico (MML)*: Tabla comparativa de diagnóstico y transformación (Causas, Problema Central, Efectos vs. Medios, Objetivo Central, Fines).
  5. *Informe y Relatoría Comunitaria*: Memoria técnica de las intervenciones y discusiones temáticas.
  6. *Compromisos y Devolución Ciudadana*: Hoja de ruta para el seguimiento de acuerdos con la comunidad.
  7. *Cuadro de Firmas Oficiales*:
     - Facilitador Líder (Planeación Distrital)
     - Relator Técnico (Equipo de Sistematización)
     - Representante Comunitario / JAC
     - Delegado Enfoque Diferencial
- **Impresión y Exportación PDF**:
  - Disparador directo `window.print()` con soporte de reglas `@media print` en tamaño Carta (`letter`).
  - Ocultamiento automático de navegación, breadcrumbs y barras de herramientas durante la impresión.
  - Botón interactivo para copiar y compartir el enlace directo al acta.

---

## 2. Registro de Asistencia Digital en Puerta (QR + Enfoque Diferencial + CSV)
- **Modelo de Datos (`src/features/mesas/models/asistencia.ts`)**:
  - Enfoques diferenciales (12 categorías): afrodescendiente, palenquero, raizal, indígena, rrom, víctima del conflicto, discapacidad, adulto mayor, juventud, mujeres, LGBTIQ+, ninguno.
  - Documentos soportados: CC, TI, CE, PAS, OTRO.
  - Géneros: mujer, hombre, no binario, otro.
  - Badges semánticos conformes a la política estricta de tokens CSS (`--token`).
- **Store Persistente (`src/features/mesas/state/asistencia-store.ts`)**:
  - Almacenamiento indexado por `mesaId` con persistencia en localStorage (`polis_asistencia_v1`).
  - Semilla inicial con registros de demostración realistas para Cartagena.
  - Acciones: `registrarAsistente`, `eliminarRegistro`, `exportarPlanillaCSV`.
  - Exportador CSV profesional con BOM UTF-8, encabezado legal, desglose estadístico por enfoque diferencial y columnas tabulares estandarizadas.
- **Ruta Pública Móvil (`src/app/asistencia/[mesaId]/page.tsx` y `asistencia-cliente.tsx`)**:
  - Generación estática SSG (`generateStaticParams`) para todas las mesas de la agenda.
  - Optimización mobile-first (< 30 segundos de diligenciamiento en teléfonos desde 320px).
  - Cumplimiento estricto de Habeas Data bajo la Ley Estatutaria 1581 de 2012.
  - Comprobante digital de registro con número de radicado único y confirmación comunitaria.
- **Gestión Administrativa en `MesaPanel`**:
  - Visualización del código QR generado dinámicamente apuntando a la URL pública de la mesa.
  - Modal Zero-Modals para **"📱 Proyectar QR en Pantalla / Imprimir Cartel"** listo para colocar en la entrada de las mesas.
  - Tabla de asistentes registrados en tiempo real con buscador multi-campo y filtro por enfoque diferencial.
  - Formulario de registro manual ágil para asistentes sin dispositivo móvil o con dificultades de conectividad.
  - Botón de descarga de planilla oficial en formato CSV para legalización institucional.

---

## 3. Capa Interactiva de las 33 Mesas en el Geovisor
- **Dataset Georreferenciado Oficial (`src/features/geovisor/data/mesas-geovisor.data.ts`)**:
  - Coordenadas geográficas de alta precisión para las 36 mesas territoriales de la agenda en las 3 Localidades, corregimientos e islas de Cartagena (Tierra Bomba, Barú, Islas del Rosario, Santa Ana, La Boquilla, Bayunca, Pasacaballos, etc.).
- **Semáforo Visual de 3 Estados**:
  - 🟡 **Amarillo / Ember (`#e85d04`)**: Mesa Programada.
  - 🔵 **Azul (`#2563eb`)**: Mesa en Curso.
  - 🟢 **Verde (`#16a34a`)**: Mesa Realizada / Cerrada.
- **Interactividad y Experiencia de Usuario**:
  - Detección precisa de clic y hover sobre puntos de mesa en `use-mapa.ts`.
  - Popup flotante estilizado en `mapa-cartagena.tsx` con fecha, horario, aforo, asistentes registrados y badge de estado semafórico.
  - Botón integrado en el popup: *"Ver Detalle / Acta"*, que invoca directamente `openPanel("mesa", { mesaId })` conectando el mapa con el flujo completo de relatoría y acta.

---

## 4. Control de Calidad y Verificación
- **UI Policy y Linters**:
  - `node scripts/ui-policy.mjs`: Superado con 0 infracciones (estricto cumplimiento de tokens, capas y Zero-Modals).
  - `tsc --noEmit`: Superado con 0 errores TypeScript.
  - `eslint .`: 0 errores.
- **Build de Producción**:
  - `bun run build`: Compilación exitosa en Turbopack con 50 páginas y rutas SSG generadas (`/asistencia/[mesaId]` para todas las 36 mesas). Copia automática de assets a `.next/standalone/`.
- **Servicio y Verificación HTTP**:
  - `sudo systemctl restart polis-frontend.service`: Activo y en ejecución (`active (running)`).
  - Verificación `curl http://127.0.0.1:3000`: Código HTTP `200` OK.
  - Verificación `curl http://127.0.0.1:3000/asistencia/mt-001`: Código HTTP `200` OK.
