# Entrega agy2 — Matriz de Árbol de Problemas y Soluciones + Analítica de Datos para Mesas de Trabajo
Fecha: 2026-10-02T13:25:00Z
Estado: CONFORME

## Resumen Ejecutivo
Se implementó exitosamente la matriz interactiva del Árbol de Problemas y Soluciones (Marco Lógico DNP / MGA / CONPES) con soporte de ciclo de vida completo tanto para **mesas principales** como para **submesas**, incorporando un motor de estructuración de información al 100% para **analítica de datos** (exportación CSV normalizado, esquema JSON estructurado y generación asistida de síntesis narrativa).

---

## 1. Modelo de Datos para Analítica (`src/features/mesas/models/mesas.ts`)
- **`NodoArbolEstructurado`**:
  - `id: string`
  - `texto: string`
  - `tipo: "problema_central" | "causa_directa" | "causa_indirecta" | "efecto_directo" | "efecto_indirecto" | "medio" | "fin" | "objetivo_central"`
  - `dimensionOnu?: string` (7 dimensiones ONU para cruce transversal)
  - `criticidad?: "alta" | "media" | "baja"`
  - `actorResponsable?: string` (dependencia distrital o comunitaria)
  - `parentId?: string` (trazabilidad jerárquica)
  - `mesaId?: string`, `subMesaId?: string`
- **`MatrizMesaData`**: Contenedor normalizado con `problemaCentral`, `dimensionPrincipal`, `causas`, `efectos`, `objetivoCentral`, `medios`, `fines`, y `resumenTabular`.
- **Compatibilidad**: Integración en `MesaDeTrabajo` y `SubMesa` mediante `arbolProblemas`, `arbolSoluciones` y `matrizArbol`.
- **Utilidades de analítica**:
  - `arbolesAMatrizEstructurada`: Convierte estructuras jerárquicas en modelos tabulares normalizados.
  - `generarCSVMatrizEstructurada`: Exportador RFC 4180 con columnas `mesa_id`, `mesa_nombre`, `localidad`, `tipo_nodo`, `descripcion`, `dimension_onu`, `criticidad`, `responsable`.

---

## 2. Componente de Matriz Interactiva (`src/features/mesas/components/matriz-arbol-relatoria.tsx`)
- **Pestaña Diagnóstico (Árbol de Problemas):**
  - Problema central territorial con selector de Dimensión ONU principal.
  - Causas raíz y directas con selector de criticidad (Alta / Media / Baja), selector de dimensión ONU y causas secundarias encadenadas.
  - Efectos e impactos territoriales observados con dimensión ONU.
- **Pestaña Propuestas (Árbol de Soluciones):**
  - Objetivo central de transformación positiva con botón "⚡ Proyectar desde diagnóstico".
  - Medios y líneas de acción con campo de actor institucional/comunitario responsable y dimensión ONU.
  - Fines y propósitos superiores de sostenibilidad territorial.
- **Pestaña Matriz Tabular (Marco Lógico MML):**
  - Cuadrícula de 6 columnas correlacionando: `#` ➔ `Causa Raíz` ➔ `Efecto Territorial` ➔ `Medio / Acción` ➔ `Fin Esperado` ➔ `Dimensión ONU`.
  - Resumen métrico superior: total causas, efectos, medios, fines y porcentaje de cobertura causal.
- **Barra de Analítica y Datos:**
  - 📊 **Botón "Exportar datos (CSV)"**: Descarga directa de la matriz en CSV para PowerBI, Excel, Python o R.
  - 📋 **Botón "Copiar JSON estructurado"**: Copia el payload estructurado al portapapeles para pipelines de IA (LangGraph/PydanticAI).
  - ⚡ **Botón "Generar síntesis narrativa"**: Dispara la síntesis técnica en formato DNP.

---

## 3. Integración en `MesaPanel` (`src/features/mesas/panels/mesa-panel.tsx`)
- Sección "Informe y relatoría de la mesa" enriquecida con selector segmentado de modo:
  - 📝 **Relatoría narrativa**: Textarea con redacción técnica.
  - 🌳 **Matriz de Diagnóstico y Soluciones**: Renderiza `<MatrizArbolRelatoria />`.
  - **Híbrido**: Vista simultánea con matriz y memoria técnica.
- **Botón 📥 "Importar y consolidar desde submesas"**: Unifica automáticamente causas, efectos, medios y fines de todas las submesas en la matriz de la mesa principal.
- **Botón ⚡ "Generar borrador DNP"**: Convierte los datos de la matriz en una relatoría técnica estructurada con formato DNP / CONPES.

---

## 4. Integración en `PapelografoPanel` (`src/features/mesas/panels/papelografo-panel.tsx`)
- Selector de formato en la barra superior de cada submesa:
  - 🖼️ **Lienzo interactivo**: Canvas con tarjetas estilo papelógrafo digital.
  - 📊 **Ver en Matriz Tabular / Exportar datos**: Despliega la matriz interactiva para la submesa con herramientas de exportación CSV/JSON.

---

## 5. Control de Calidad y Pruebas
1. **Verificación TypeScript y UI Policy**:
   - `bun run check`: 0 errores TypeScript, 0 violaciones a la estricta política Zero-Modals y de tokens CSS (`scripts/ui-policy.mjs`).
2. **Build de Producción**:
   - `bun run build`: Compilación exitosa en Turbopack (14 rutas estáticas y dinámicas compiladas).
3. **Servicio y Disponibilidad**:
   - `sudo systemctl restart polis-frontend.service`
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000`: Retorna código `200` OK.
