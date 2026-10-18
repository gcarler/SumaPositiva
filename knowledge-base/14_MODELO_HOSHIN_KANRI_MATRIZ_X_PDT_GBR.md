# 14. Modelo Hoshin Kanri (Despliegue de Políticas, Matriz X, Catchball y Bowling Charts) Aplicado a Planes de Desarrollo Territorial (PDT)

---

## 1. Principios y Arquitectura Fundamental (El Marco FAIR en Gestión Pública GBR)

El modelo **Hoshin Kanri** (*Policy Deployment* o **Despliegue de Políticas**), originado en la Gestión de Calidad Total (TQM) y el pensamiento *Lean*, cierra la brecha estructural entre la formulación estratégica cuatrienal del **Plan de Desarrollo Territorial (PDT / Plan Indicativo)** y la operación anual/mensual en las **Matrices de Plan de Acción y Proyectos BPIM**.

Se articula en torno a las cuatro dimensiones del marco **FAIR**:

1. **Enfoque (*Focus*):** Concentrar la administración territorial en los **Objetivos de Ruptura** (*vital few breakthrough objectives*) a 3–5 años (cuatrienio constitucional), priorizando las metas de resultado con **Grado de Frontalidad A (Núcleo Frontal de Seguridad Humana)** y los **5 Sectores Prioritarios GBR** (*Educación Pública, Salud Pública, Infraestructura Vial, Desarrollo Agrícola y Medio Ambiente*).
2. **Alineación (*Alignment*):** Desplegar las políticas anuales de manera **vertical** (desde las Líneas Estratégicas del PDD hasta las actividades contratadas en el Plan de Acción de cada Secretaría) y **horizontal** (coordinación intersectorial entre las 38 dependencias ejecutoras y las 3 Localidades / 15 UCGs / Corregimientos).
3. **Integración (*Integration*):** Incorporar las metas de producto y resultado dentro de la rutina operativa mediante el ciclo continuo **PDCA** (*Planificar–Hacer–Verificar–Actuar*), vinculando cada apropiación y compromiso presupuestal (`apropiacion_definitiva_cop`, `compromisos_rp_cop`) a entregables verificables.
4. **Revisión (*Review*):** Ejecutar diagnósticos periódicos en el territorio (*Gemba*: las 29 unidades sub-distritales en PostGIS y las Mesas de Trabajo ciudadanas) para auditar el progreso real, eliminar cuellos de botella (*Trampas Territoriales de Gestión Pública*) y activar planes de contención.

---

## 2. El Instrumento Central: La Matriz X (*X-Matrix*) en `PDT-AI-EVALUATOR`

La **Matriz X** interconecta bidireccionalmente los cuatro niveles de la planificación pública territorial:

```
                     [ NORTE ]
              Prioridades de Alto Nivel
              e Iniciativas / Proyectos
            (Plan de Acción + BPIM / MGA)
                         │
  [ OESTE ]              │             [ ESTE ]
Objetivos Anuales ───────┼─────── Métricas / KPIs &
(Metas Vigencia t        │         Responsables (DMUs,
 + PPI Anual COP)        │         MIR, DEA, ISRI)
                         │
                     [ SUR ]
               Objetivos de Ruptura
                   (3-5 Años)
           (Plan Indicativo Cuatrienal)
```

1. **Cuadrante Sur (Inferior) — Objetivos de Ruptura (3–5 años):**
   - Metas estratégicas cuatrienales del Plan Indicativo (`seguimiento.pdd_metas_oficiales`, `seguimiento.pdd_lineas_y_programas`) y transformaciones estructurales de los 5 Sectores GBR.
2. **Cuadrante Oeste (Izquierdo) — Objetivos Anuales:**
   - Metas programadas y ejecutadas por ejercicio fiscal (`vigencia`, `meta_programada_anual`, `meta_ejecutada_anual`, `ppi_anual_cop` en `seguimiento.registros_triada_normalizados`).
3. **Cuadrante Norte (Superior) — Prioridades de Alto Nivel / Proyectos Clave:**
   - Proyectos de inversión BPIM y actividades operativas de las Matrices de Plan de Acción (`seguimiento.actividades_plan_accion`).
4. **Cuadrante Este (Derecho) — Métricas Clave (KPIs) y Líderes Responsables (*Accountability*):**
   - Indicadores de la Matriz de Indicadores de Resultados (MIR), eficiencia relativa **DEA ($\theta^{\text{CCR}}, \theta^{\text{BCC}}, SE_o$)**, riesgo **$\text{ISRI}$** y asignación explícita a la **Secretaría / Dependencia Responsable (DMU)**.

### Matrices de Correlación de Esquina Cuantificadas Analíticamente
En lugar de marcas subjetivas, el motor calcula matemáticamente las 4 esquinas de correlación con simbología estándar Hoshin Kanri ($\bullet$ **Correlación Fuerte**, $\circ$ **Correlación Media**, $\triangle$ **Correlación Débil / Alerta**):

- **Esquina Sur–Oeste ($\text{SO}$: Ruptura $\leftrightarrow$ Anual):** Consistencia entre el Plan Indicativo Cuatrienal y el despliegue anual del PPI y metas anuales.
- **Esquina Oeste–Norte ($\text{ON}$: Anual $\leftrightarrow$ Proyectos BPIM):** **Similaridad Coseno NLP ($\text{Sim}(O_k, A_m)$)**:
  - $\text{Sim} \ge 0.65 \Rightarrow \bullet$ (**Fuerte**)
  - $0.45 \le \text{Sim} < 0.65 \Rightarrow \circ$ (**Media**)
  - $\text{Sim} < 0.45 \Rightarrow \triangle$ (**Débil / Alerta de *Mission Creep***)
- **Esquina Norte–Este ($\text{NE}$: Proyectos $\leftrightarrow$ KPIs y Responsables):** **Eficiencia Técnica Pura DEA ($\theta^{\text{BCC}}$)** y holguras $(s^-, s^+)$:
  - $\theta^{\text{BCC}} \ge 0.80 \Rightarrow \bullet$ (**Fuerte**)
  - $0.50 \le \theta^{\text{BCC}} < 0.80 \Rightarrow \circ$ (**Media**)
  - $\theta^{\text{BCC}} < 0.50 \Rightarrow \triangle$ (**Débil / Ineficiencia Operativa**)
- **Esquina Este–Sur ($\text{ES}$: KPIs y Responsables $\leftrightarrow$ Ruptura Territorial):** **Probabilidad de cumplimiento ($1 - \text{ISRI}_k$)** cruzada con autocorrelación espacial **LISA (`Coldspots`)**:
  - $\text{ISRI}_k \le 0.25$ y sin Coldspot $\Rightarrow \bullet$ (**Fuerte**)
  - $0.25 < \text{ISRI}_k \le 0.40 \Rightarrow \circ$ (**Media**)
  - $\text{ISRI}_k > 0.40$ o en Trampa Territorial $\Rightarrow \triangle$ (**Débil / Alto Riesgo de Incumplimiento**)

---

## 3. Gobernanza Operativa: *Catchball* (*Nemawashi*) y *Bowling Charts*

- **Catchball (*Nemawashi*):** Negociación estructurada bidireccional entre el nivel estratégico (**Top-Down**: Alcaldía Mayor / Secretaría de Planeación Distrital) y el nivel operativo/territorial (**Bottom-Up**: las 38 Dependencias Ejecutoras + prioridades ciudadanas de las Mesas Territoriales en los 29 polígonos sub-distritales), articulada con el **Checkpointer `Human-in-the-Loop`**.
- **Bowling Charts:** Tableros longitudinales y operativos que comparan meta programada vs. desempeño real y pronóstico `ARIMA/VAR` con semáforo **PDCA**:
  - `VERDE_EN_META`: Cumplimiento proyectado $\ge 85\%$ e $\text{ISRI} \le 0.25$.
  - `AMARILLO_PREVENTIVO`: Cumplimiento entre $60\%$ y $85\%$ o $0.25 < \text{ISRI} \le 0.40$.
  - `ROJO_CONTERCION_PDCA`: Cumplimiento $< 60\%$ o $\text{ISRI} > 0.40$ (activa análisis de causa raíz y plan de acción correctivo PDCA).

---

## 4. Ciclo Metodológico de Implementación en 7 Pasos

1. **Definir la Visión Territorial:** Consolidar visión de Seguridad Humana Integral y GBR del Distrito.
2. **Identificar Objetivos de Ruptura (Sur):** Seleccionar las metas transformadoras cuatrienales a 3–5 años.
3. **Establecer Objetivos Anuales (Oeste):** Desglosar en metas físicas y presupuestales por vigencia fiscal.
4. **Desplegar los Objetivos vía *Catchball* (Norte/Este):** Conciliar proyectos BPIM, presupuestos y responsables entre Planeación, Secretarías y Mesas Territoriales.
5. **Ejecutar e Integrar en Rutina Operativa:** Monitoreo continuo de apropiaciones, compromisos RP y entregas físicas.
6. **Revisiones Periódicas (*Bowling Charts* + PDCA):** Detección temprana de desviaciones en rojo ($\text{ISRI} > 0.40$, *mission creep* $< 0.45$, holguras DEA).
7. **Diagnóstico Anual y Retroalimentación (*Gemba*):** Auditoría integral al cierre de vigencia con trazabilidad en PostgreSQL (`seguimiento.pdt_ai_evaluaciones`).

---

## 5. Arquitectura API REST, Revisión 10D por Meta y Persistencia Auditable (`H1–H12`)

### 5.1 Endpoints Canónicos del Subsistema Hoshin Kanri y Revisión 10D
1. **`GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/especificacion`**
   - Entrega la especificación formal del **Marco FAIR** (`Focus`, `Alignment`, `Integration`, `Review`), la estructura de los 4 cuadrantes y 4 esquinas de correlación (`●` Fuerte, `○` Media, `△` Débil), el ciclo de **7 pasos** y la matriz comparativa **`SMART vs OKR vs Hoshin Kanri`**.
2. **`GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/hoshin-kanri/matriz-x`**
   - Calcula en tiempo real la **Matriz X** del Plan de Desarrollo Distrital (`PDD 2024–2027`), los índices cuantitativos del **Marco FAIR** (`fair_global_index`, `focus_score`, `alignment_score`, `integration_score`, `review_score`), los **Bowling Charts** mensuales/anuales con semáforo **PDCA** (`VERDE_EN_META`, `AMARILLO_PREVENTIVO`, `ROJO_CONTENCION_PDCA`) y las sesiones activas de **Catchball (*Nemawashi*)**.
3. **`GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/revision-por-meta`**
   - Evalúa las metas del plan en la base de datos oficial `bd_csh` (`1246` metas de `PDD_2024_2027`) a través de la **Matriz Auditable de 10 Dimensiones** (`D1` a `D10`) y los **7 Roles Especializados de Revisión**, preservando la distinción estricta entre `0.0` observado y `None` (`BRECHA_DE_INFORMACION`) y conciliando contradicciones entre motores.

### 5.2 Integración en la Persistencia PostgreSQL (`seguimiento.pdt_ai_evaluaciones`)
En `backend/app/modules/compromisos/pdt_persistencia_pg.py`, la función `_construir_resumen_ejecutivo(run_data)` enriquece automáticamente el campo `JSONB` `payload_resumen` (expuesto también como `resumen_ejecutivo` en `/historial-auditoria`) con cuatro bloques de cierre de los hallazgos `H1–H12` (`revision_motores_18_10_2026.md`):
- **Trazabilidad Reproducible (`H11`):** `version_metodologica` y `fingerprint_fuentes_sha256`.
- **Atribución Ejecutora (`H1`):** `total_indicadores_isri_sin_atribucion` (garantizando que toda serie crítica $\text{ISRI} > 0.40$ tenga secretaría responsable e intervención en el *Catchball*).
- **Resumen Ejecutivo Hoshin Kanri (`hoshin_kanri_fair`):** puntajes `FAIR`, conteo de metas en `ROJO_CONTENCION_PDCA` y sesiones de *Catchball* activas.
- **Resumen Ejecutivo Revisión 10D (`revision_10d_resumen`):** `version_regla`, `total_metas_plan`, `con_contradicciones`, `con_brecha_informacion`, `con_ceros_observados` y `total_hallazgos_estructurados`.

