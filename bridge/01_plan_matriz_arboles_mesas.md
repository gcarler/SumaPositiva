# PLAN DE DISEÑO — Matriz de Árbol de Problemas y Soluciones para Relatoría de Mesas y Submesas

## 1. Diagnóstico y Necesidad
Actualmente en POLIS:
- La relatoría de la mesa en `MesaPanel` se reduce a un simple campo de texto (`<Textarea>` de "Informe y relatoría"), sin estructura metodológica.
- Los árboles de problemas y soluciones existen únicamente dentro del modelo `SubMesa` y se manipulan en un panel aislado (`papelografo-panel.tsx`).
- Si una mesa se realiza sin submesas (en plenaria única), **no existe árbol ni matriz disponible**.
- No existe una **Matriz de Marco Lógico / Relatoría Estructurada** que permita a los relatores y facilitadores tabular causas, efectos, problema central, medios, objetivos y fines, ni consolidar los árboles de las submesas en la relatoría general de la mesa.

---

## 2. Alcance Propuesto

### A. Modelo de Datos Unificado (`src/features/mesas/models/mesas.ts`)
1. **Árbol a nivel de Mesa Principal:**
   - Extender `MesaDeTrabajo` para incluir opcionalmente `arbolProblemas?: ArbolProblemas` y `arbolSoluciones?: ArbolSoluciones`.
   - Permitir que una mesa sin submesas trabaje su propio árbol, o que una mesa con submesas tenga un árbol consolidado.
2. **Estructura de Matriz Tabular (MML - Metodología de Marco Lógico):**
   - Cada nodo (Causa, Efecto, Medio, Fin) podrá tener metadatos opcionales para la relatoría:
     - `dimensionOnu?: string` (Seguridad Personal, Ambiental, etc.)
     - `criticidad?: "alta" | "media" | "baja"`
     - `actorResponsable?: string` (para medios/soluciones)

### B. Componente Reutilizable: `<MatrizArbolRelatoria />`
Crear `src/features/mesas/components/matriz-arbol-relatoria.tsx`:
- **Pestaña 1: Matriz de Problemas (Diagnóstico)**
  - 3 bloques interconectados:
    - **Causas** (Directas / Raíz) con botón `+ Agregar Causa`
    - **Problema Central** (Frase priorizada por la mesa)
    - **Efectos** (Consecuencias directas e indirectas) con botón `+ Agregar Efecto`
- **Pestaña 2: Matriz de Soluciones (Propuestas de Política Pública)**
  - 3 bloques correspondientes:
    - **Medios / Acciones** (Cómo resolver las causas)
    - **Objetivo Central** (Transformación del problema)
    - **Fines / Resultados** (Impacto positivo en el territorio)
- **Pestaña 3: Vista Tabular Comparativa (Matriz Integrada)**
  - Tabla de 4 columnas: `Causa Identificada` → `Efecto Asociado` → `Medio Propuesto` → `Fin Esperado`.
  - Permite edición rápida en cuadrícula tipo hoja de cálculo ligera.

### C. Integración en `MesaPanel` (Mesa Principal)
En la sección "Informe y relatoría de la mesa":
- Selector de modo:
  - 📝 **Modo Narrativo:** El textarea actual para la redacción final del relator.
  - 📊 **Modo Matriz de Árbol:** Renderiza la `<MatrizArbolRelatoria />`.
- Botón **⚡ Generar borrador de relatoría desde la matriz**:
  - Transforma automáticamente los problemas, causas y soluciones de la matriz en párrafos estructurados de relatoría técnica (conforme a metodología DNP).
- Botón **📥 Importar desde submesas**:
  - Si la mesa tiene submesas, permite copiar o consolidar los árboles de las submesas en la matriz principal de la mesa con un solo clic.

### D. Integración en `PapelografoPanel` (Submesas)
- Añadir la misma vista tabular de matriz como alternativa visual al lienzo gráfico de ramas.

---

## 3. Criterios de Aceptación
1. Funciona tanto en mesas principales (con o sin submesas) como en cada submesa individual.
2. Zero-Modals: Toda la adición y edición de nodos/filas ocurre inline dentro del panel.
3. Tokens CSS semánticos (`var(--surface-1)`, `var(--ember)`, `var(--border)`).
4. Persistencia inmediata en el store Zustand y en los endpoints remotos de mesas.
5. Generación asistida de texto narrativo a partir de los datos tabulados.

---

## 4. Estado
Propuesta técnica formulada para revisión y aprobación previa del usuario.
