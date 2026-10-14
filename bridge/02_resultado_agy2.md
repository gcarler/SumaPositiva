# INFORME DE RESULTADO: TAREA [TRIADA-FRONTEND-INTELIGENCIA-6M-06]
## LABORATORIO DE INTELIGENCIA FORENSE DE 6 MOTORES (REUNISMO DNP, ADN 3 GOBIERNOS, RADAR TRANSPARENCIA, ALINEACIÓN TERRITORIAL, BUSCADOR TRANSVERSAL Y SIMULADOR CIERRE 2027)

**Para:** Coordinador General / Auditor Forense EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 14 de Octubre de 2026  
**Tarea Reportada:** `[TRIADA-FRONTEND-INTELIGENCIA-6M-06] Laboratorio de Inteligencia Forense de 6 Motores en Frontend`  
**Referencia Metodológica y Normativa:** Plan Maestro `bridge/00_plan_maestro_inteligencia_triada.md` · Ley 152/94 · Ley 1474/11 · Metodología DNP SisPT · Cifras reales saneadas de `bd_csh` (217.740 registros, 30 entidades al 99,97%, 12.280 hurtos, 33 mesas ciudadanas)  
**Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`)  
**Concurrencia:** `codex` ejecutó `[TRIADA-BACKEND-INTELIGENCIA-6M-06]` en `backend/`. `agy2` modificó y añade al commit **únicamente** archivos en `src/features/seguimiento/` y `bridge/02_resultado_agy2.md`.

---

## 🎯 1. Resumen Ejecutivo de la Entrega

Dando cumplimiento exacto a las especificaciones de `bridge/01_tarea_activa.md`, se construyó e integró con éxito en el Frontend de POLIS (`/plataforma/seguimiento`) el **Laboratorio de Inteligencia Forense de 6 Motores (`InteligenciaForense6MPanel`)**, complementado con el dataset semilla canónico (`inteligencia-triada-6m.data.ts`) y clientes API tipados en `plan-accion-dnp-api.ts` con fallback local resiliente:

### 1.1. Motor 1 (`patologias-dnp`): Detector Forense de Efecto Espejismo y Patologías DNP
- **Balance Lingüístico:** Expone la tasa real de *«reunionitis»* en formulación: **`27.182` actividades con verbo débil prohibido (`57,8%`)** vs. **`19.869` con verbo fuerte en infinitivo (`42,2%`)**.
- **Alertas de Patologías Críticas:**
  - `ESPEJISMO_OPERATIVO` (`184` alertas): avance en Plan de Acción $\ge 75\%$ con metas estratégicas del PDD congeladas en $\le 35\%$.
  - `DESACOPLE_FISICO_FINANCIERO` (`67` alertas): giro en tesorería $\ge 75\%$ con avance físico de obra $\le 35\%$.
  - `CUELLO_BOTELLA_PRESUPUESTAL` (`92` alertas): apropiación presupuestal vigente con compromisos RP y obligaciones en $\$0$.
- **Ranking 0–100 de Calidad Técnica DNP:** Tabla interactiva clasificando las 30 entidades canónicas distritales (`Secretaría de Planeación` 92.1, `Hacienda` 88.4, `Educación` 84.6 hasta `Alcaldía Local Industrial` 43.1 y `Escuela de Gobierno` 41.2).
- **Casos Críticos:** Fichas de detalle con BPIM, PDD, avance físico vs. financiero y dictamen pericial forense.

### 1.2. Motor 2 (`continuidad-gobiernos`): ADN de Continuidad vs. Ruptura entre 3 Gobiernos (2016–2026)
- **Comparativa 3 Administraciones:**
  - `Antes de 2020` (Primero la Gente): 43 archivos, 6.441 filas, 21 entidades, \$3.45B.
  - `2020–2023` (Salvemos Juntos): 257 archivos, 71.421 filas, 28 entidades, \$11.2B.
  - `2024–2027` (Ciudad de Derechos): 307 archivos, 137.829 filas, 30 entidades, \$16.8B.
- **Tasa de Continuidad Institucional BPIM (`16,7%`):** De 1.516 proyectos históricos, solo 253 sobreviven a cambios de administración; 1.263 fenecen como "proyectos huérfanos". Destaca proyectos continuos como *Plan Maestro de Drenajes Pluviales* (BPIM 2016130010045).
- **Migración de Prioridades en las 8 Dimensiones de Seguridad Humana:** Tabla comparativa con participación porcentual por periodo y tendencias (`CRECIENTE`, `ESTABLE`, `DECRECIENTE`).
- **Detector de Metas Recicladas:** Detección de indicadores/metas recicladas con similitud textual $\ge 88\%$.

### 1.3. Motor 3 (`radar-transparencia`): Radar de Inercia, Copy-Paste y Matriz 30×11
- **5 Archivos con Corte Clonado (`CONTENIDO_IDENTICO_OTRO_CORTE`):** Panel de alerta detallando los 5 archivos que reutilizan matrices y celdas sin actualización (`Transcaribe`, `LHCN`, `Localidad Industrial y de la Bahía`, `IDER`).
- **Saneamiento de Clon Tabular DADIS 2021:** Registro de la fusión de 477 filas duplicadas.
- **Metas Zombies Congeladas:** Identificación de actividades con 4 trimestres consecutivos reportando el mismo avance sin variación.
- **Efecto «Diciembre Mágico»:** Registro de saltos abruptos $\ge 50$ puntos porcentuales en el último corte o cierre anual (*hockey-stick*).
- **Matriz de Completitud 30×11:** Trazabilidad anual 2016–2026 del cumplimiento de publicación.

### 1.4. Motor 4 (`alineacion-territorial`): Inversión Pública vs. Delito y Mesas
- **Cruce Tripartito en las 3 Localidades:** Cruce de 84.620 registros territorializados (\$2.45B) contra 12.280 hurtos (18.242 casos) y 33 Mesas Ciudadanas.
- **Cálculo del Índice de Desalineación Territorial (%):**
  - `Localidad 1`: 52.2% inversión vs. 52.3% delito (`ALINEADO`).
  - `Localidad 2`: 27.4% inversión vs. 31.1% delito y 36.4% demanda ciudadana (`SUBINVERSION_MODERADA`, brecha de -9.01%).
  - `Localidad 3`: 20.4% inversión vs. 16.6% delito (`ALINEADO`).
- **Barrios Foco:** Priorización de Olaya Herrera, El Pozón, Nelson Mandela, Centro Histórico y Pasacaballos con conteo de actividades, entidades y presupuesto.

### 1.5. Motor 5 (`buscador`): Buscador Semántico Transversal y Duplicidad
- **Buscador Reactivo:** Búsqueda en tiempo real con chips sugeridos (*«Primera infancia»*, *«Cámaras de seguridad»*, *«Caños y lagos»*, *«Habitante de calle»*, *«Embarazo adolescente»*, *«Vendedores informales»*).
- **Alertas de Duplicidad Interinstitucional:** Detección de casos donde $\ge 2$ entidades en la misma vigencia ejecutan actividades superpuestas (ej. Distriseguridad y Secretaría del Interior en alarmas comunitarias barriales con \$2.850M conjuntos).

### 1.6. Motor 6 (`simulador-cierre`): Simulador Predictivo Cierre de Gobierno (2024–2027)
- **Horizonte 2027:** Evaluación a 6 trimestres del cierre (62.5% del tiempo transcurrido).
- **Semáforo Predictivo:** 11 entidades `CUMPLIRA`, 14 `RIESGO_MODERADO`, 5 `INCUMPLIMIENTO_INMINENTE`.
- **Aceleración Trimestral Requerida:** Cálculo de la velocidad trimestral indispensable para alcanzar el 100%.
- **Simulador Interactivo de Corrección de Cuellos de Botella:** Botones interactivos (+0%, +3%, +5%, +10%, +15%) que recalculan dinámicamente el cumplimiento proyectado de las 30 entidades y 8 dimensiones.

---

## 🛠️ 2. Archivos Desarrollados e Integrados

1. **`src/features/seguimiento/data/inteligencia-triada-6m.data.ts` (Nuevo)**
   - Tipos TypeScript para los 6 motores y M0.
   - Metadatos de las 8 Dimensiones de Seguridad Humana y 3 Periodos de Gobierno.
   - Catálogo auditado de las 30 Entidades Oficiales con conteos exactos de `bd_csh`.
   - Datasets semilla `SEED_M0` a `SEED_M6`.
2. **`src/features/seguimiento/services/plan-accion-dnp-api.ts` (Ampliación)**
   - Clientes API tipados para los 7 endpoints de inteligencia forense.
   - Funciones de fallback local resilientes para cada motor.
3. **`src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx` (Nuevo)**
   - Componente interactivo completo con selector de 6 motores, filtros globales, tablas, tarjetas y simulador dinámico.
4. **`src/features/seguimiento/components/triada-motores-tab.tsx` (Actualización)**
   - Integración de Sub-vista 4: `4. Laboratorio de Inteligencia Forense (6 Motores · 217k)` con botón `data-testid="tab-nav-inteligencia-forense-6m"`.
   - Insignia de Calidad Forense `99,97% (217.740 registros saneados en bd_csh)`.
   - Filtros de Dimensión de Seguridad Humana y Periodo Histórico.
5. **`src/features/seguimiento/__tests__/inteligencia-forense-6m.test.tsx` (Nuevo)**
   - 24 pruebas unitarias exhaustivas con 199 expect assertions cubriendo todos los motores, cálculos y renderizado SSR.

---

## 🚦 3. Resultados de los Quality Gates

| Quality Gate | Comando | Resultado | Estado |
|---|---|---|:---:|
| **1. Política UI/A11y** | `node scripts/ui-policy.mjs` | **0 violaciones** (tokens semánticos CSS puros) | ✅ APROBADO |
| **2. Tipado Estático** | `bun run typecheck` | **0 errores** (`tsc --noEmit` completado en 8s) | ✅ APROBADO |
| **3. Análisis de Código** | `bun run lint` | **0 errores** (`eslint .` limpio) | ✅ APROBADO |
| **4. Pruebas Unitarias** | `bun test src/features/seguimiento/` | **105 / 105 tests pasados** (100% éxito, 817 expect calls) | ✅ APROBADO |
| **5. Compilación Standalone** | `bun run build` | **192 / 192 rutas compiladas exitosamente** | ✅ APROBADO |
| **6. Servicio de Producción** | `systemctl restart polis-frontend.service` | Activo en puerto 3000 | ✅ APROBADO |
| **7. E2E Playwright Headless** | `bun scratch/verify_triada.mjs` | **0 errores de consola**, todas las 4 sub-vistas operativas | ✅ APROBADO |

---

## 📋 4. Archivos para Commit Local (Zero-Push)

```text
src/features/seguimiento/data/inteligencia-triada-6m.data.ts
src/features/seguimiento/services/plan-accion-dnp-api.ts
src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx
src/features/seguimiento/components/triada-motores-tab.tsx
src/features/seguimiento/__tests__/inteligencia-forense-6m.test.tsx
bridge/02_resultado_agy2.md
```
*(Archivos de backend y bridge de codex ignorados y preservados sin alteraciones)*
