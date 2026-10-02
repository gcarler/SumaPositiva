# TAREA DE EJECUCIÓN — Matriz de Árbol de Problemas y Soluciones + Análisis de Datos

## Objetivo Aprobado
Implementar la matriz interactiva del Árbol de Problemas y Soluciones tanto para **mesas principales** como para **submesas**, con un requisito fundamental: **la información debe quedar 100% estructurada para analítica de datos** (conteo de causas recurrentes por dimensión ONU, análisis territorial y exportación de datos).

---

## 1. Modelo de Datos para Analítica (`src/features/mesas/models/mesas.ts`)

Cada nodo del árbol debe estar estructurado con metadatos que permitan cruces de datos:

```ts
export interface NodoArbolEstructurado {
  id: string;
  texto: string;
  tipo: "problema_central" | "causa_directa" | "causa_indirecta" | "efecto_directo" | "efecto_indirecto" | "medio" | "fin" | "objetivo_central";
  dimensionOnu?: string;          // Ej: "Seguridad Personal", "Seguridad Ambiental", etc.
  criticidad?: "alta" | "media" | "baja";
  actorResponsable?: string;      // Dependencia o entidad sugerida
  parentId?: string;              // Para trazabilidad causa raíz -> causa directa -> problema
  mesaId?: string;
  subMesaId?: string;
}

export interface MatrizMesaData {
  problemaCentral: string;
  dimensionPrincipal?: string;
  causas: NodoArbolEstructurado[];
  efectos: NodoArbolEstructurado[];
  objetivoCentral: string;
  medios: NodoArbolEstructurado[];
  fines: NodoArbolEstructurado[];
  resumenTabular?: Array<{
    causaId: string;
    causaTexto: string;
    efectoTexto: string;
    medioTexto: string;
    finTexto: string;
    dimensionOnu: string;
  }>;
}
```

Extender `MesaDeTrabajo` para incluir:
- `matrizArbol?: MatrizMesaData;` (o compatibilidad con `arbolProblemas` y `arbolSoluciones`).

---

## 2. Componente de Matriz Interactiva (`src/features/mesas/components/matriz-arbol-relatoria.tsx`)

Crear componente modular con:
1. **Pestaña Diagnóstico (Árbol de Problemas):**
   - Problema central (con selector de Dimensión ONU).
   - Lista de causas con clasificación de criticidad (Alta / Media / Baja) y selector de dimensión.
   - Lista de efectos asociados.
2. **Pestaña Propuestas (Árbol de Soluciones):**
   - Objetivo central transformador.
   - Medios / Acciones con actor institucional responsable.
   - Fines e impactos previstos.
3. **Pestaña Matriz Tabular (Marco Lógico MML):**
   - Tabla interactiva que correlaciona: `Causa` ➔ `Efecto` ➔ `Medio (Solución)` ➔ `Fin Esperado` ➔ `Dimensión ONU`.
4. **Herramientas de Analítica y Datos:**
   - **Botón 📊 "Exportar datos (CSV)":** Descarga directa de la matriz en CSV normalizado para análisis en Excel, PowerBI, Python o R (columnas: `mesa_id`, `mesa_nombre`, `localidad`, `tipo_nodo`, `descripcion`, `dimension_onu`, `criticidad`, `responsable`).
   - **Botón 📋 "Copiar JSON estructurado":** Para procesamiento en pipelines de IA o analítica territorial.
   - **Botón ⚡ "Generar síntesis narrativa":** Redacta el borrador técnico para el campo de relatoría a partir de los datos de la matriz.

---

## 3. Integración en `MesaPanel` (`src/features/mesas/panels/mesa-panel.tsx`)
En la sección "Informe y relatoría de la mesa":
- Añadir selector con pestañas o toggle:
  - 📝 **Acta / Relatoría narrativa** (el editor de texto existente).
  - 🌳 **Matriz de Diagnóstico y Soluciones** (renderiza `<MatrizArbolRelatoria />`).
- **Botón 📥 "Importar y consolidar desde submesas":**
  - Si la mesa tiene submesas con árboles diligenciados, permite unificarlos automáticamente en la matriz principal con un clic.

---

## 4. Integración en `PapelografoPanel` (`src/features/mesas/panels/papelografo-panel.tsx`)
- Añadir botón en el papelógrafo de cada submesa: **"Ver en Matriz Tabular / Exportar datos"**.

---

## 5. Control de Calidad Obligatorio
```bash
bun run check
bun run build
sudo systemctl restart polis-frontend.service
```

## 6. Entrega
- Hacer commit descriptivo.
- Documentar en `/root/polis/bridge/02_entrega_agy2.md`.
