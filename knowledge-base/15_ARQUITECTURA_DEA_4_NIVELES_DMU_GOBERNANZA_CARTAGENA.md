# 15. Arquitectura DEA Jerárquica de 4 Niveles de DMUs y Gobernanza del Seguimiento Institucional de Cartagena (`MGA-DNP` / `MIR` / `Tablero Alcalde`)

**Identificador:** `KB-15-DEA-4-NIVELES-DMU-CARTAGENA`
**Estado:** `CANÓNICO / ACTIVO`
**Integración:** `PDT-AI-EVALUATOR` (`pdt_dea_4niveles_cartagena.py`, `pdt_ai_evaluator_graph.py`, `pdt_hoshin_kanri.py`, `pdt_revision_por_meta.py`)

---

## 1. Definición de los 4 Niveles Jerárquicos Homogéneos de DMUs en Cartagena

Para garantizar la validez econométrica del Análisis Envolvente de Datos (`DEA`), las Unidades Tomadoras de Decisiones (`DMUs`) **deben ser estrictamente homogéneas en sus funciones y escala de producción**. Por tanto, jamás se mezclan en una misma frontera lineal una Localidad con una institución educativa individual; se estiman **cuatro fronteras DEA separadas**:

| Nivel | Nombre del Nivel | Unidades Tomadoras de Decisiones (`DMUs`) | Propósito de Evaluación |
| :--- | :--- | :--- | :--- |
| **Nivel 1** | **Territorial Descentralizado** | Las **3 Localidades Distritales** (`Localidad 1: Histórica y del Caribe Norte`, `Localidad 2: De la Virgen y Turística`, `Localidad 3: Industrial y de la Bahía` con sus `PDL_1..3_2024_2027`) y las **15 Unidades Comuneras de Gobierno (`UCG-01`..`UCG-15`)**. | Evaluar la equidad territorial y la eficiencia con la que la inversión pública regionalizada se transforma en metas físicas urbanas y rurales. |
| **Nivel 2** | **Institucional (Secretarías y Entes Descentralizados)** | `SED` (Educación), `DADIS` (Salud), `Secretaría de Infraestructura`, `Transcaribe S.A.`, `PES Pedro Romero`, `Gerencia de Espacio Público`, `EPA Cartagena`, y demás unidades ejecutoras del Distrito. | Comparar la gestión intra-sectorial e inter-agencial del gasto público. |
| **Nivel 3** | **Operativo de Prestación Directa (Micro-DMUs)** | Las **Instituciones Educativas Oficiales (`IEO`, 105 instituciones)** y los **Centros de Salud / CAP de la `ESE Hospital Local Cartagena de Indias`**. | Determinar qué sedes educativas o centros asistenciales obtienen mejores coberturas y logros de calidad (`SABER 11`, retención escolar, atención integral) dado el presupuesto y personal docente/médico asignado. |
| **Nivel 4** | **Temporal / Inter-Cuatrienial** | Vigencias fiscales anuales (`2020–2027`) y comparación global entre Planes de Desarrollo (`PDD 2020–2023 "Salvemos Juntos a Cartagena"` $\$6.02\text{B}$ vs. `PDD 2024–2027 "Cartagena, Ciudad de Derechos"` $\$12.80\text{B}$ PPI, y serie `2012–2027` en pesos corrientes y constantes). | Evaluar el cambio estructural inter-vigencia e inter-cuatrienio mediante el Índice de Productividad de Malmquist (`Catch-up` $\times$ `Frontier-shift`). |

---

## 2. Mapeo de Insumos ($X$), Productos ($Y_{\text{out}}$) y Resultados ($Y_{\text{outc}}$) bajo la Cadena de Valor (`MGA-DNP` / `SisPT`)

```text
┌──────────────────────────────────────────────────────────┐
│                       INSUMOS (X)                        │
│  • Presupuesto Ejecutado ($) por Programa                │
│  • Recursos SGR / Crédito Público / Cofinanciación       │
│  • Infraestructura / Personal Docente-Médico Asignado    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼  [ MODELO DEA: Optimización Lineal PuLP (CCR / BCC) ]
                             │
┌────────────────────────────┴─────────────────────────────┐
│                PRODUCTOS Y RESULTADOS (Y)                │
│  • Y_out (MGA): Metas Físicas Entregadas                 │
│  • Y_outc (MIR): Indicadores de Resultado Social         │
└──────────────────────────────────────────────────────────┘
```

### Catálogo Sectorial Canónico de Cartagena
1. **Sector Educación Pública (`SED` / `105 IEO`):**
   - **Insumos ($X$):** Presupuesto ejecutado en *"Modernización de la Infraestructura Educativa"*, *"Me Quedo Porque Me Quedo"* (Transporte Escolar y PAE), recursos SGR, número de aulas y planta docente.
   - **Productos ($Y_{\text{out}}$):** Aulas/sedes dotadas e intervenidas, cupos en educación inicial, docentes capacitados, niños beneficiados con el PAE.
   - **Resultados ($Y_{\text{outc}}$):** Número de IEO que mejoran categoría en Pruebas `SABER 11`, reducción de tasa de deserción y extraedad, incremento de tasa de absorción en educación superior.
2. **Sector Salud Pública (`DADIS` / `ESE Hospital Local Cartagena`):**
   - **Insumos ($X$):** Inversión financiera en el Plan Territorial de Salud (`PTS`) y presupuesto asignado a la `ESE Hospital Local`.
   - **Productos ($Y_{\text{out}}$):** Personas vulnerables capacitadas en salud integral, valoraciones de condición de discapacidad elaboradas, puestos/centros de salud construidos y dotados.
   - **Resultados ($Y_{\text{outc}}$):** % de población vulnerable con atención preferencial en EAPB subsidiadas/contributivas, cobertura de vacunación e indicadores de salud materna e infantil.
3. **Sector Infraestructura Vial y Movilidad (`Secretaría de Infraestructura` / `Transcaribe S.A.`):**
   - **Insumos ($X$):** Presupuesto de asignaciones directas SGR e inversión distrital para malla vial por localidad y operación del SITM.
   - **Productos ($Y_{\text{out}}$):** Kilómetros-carril de vías rehabilitadas o pavimentadas, estudios y operación de flota eléctrica/acuática de `Transcaribe`.
   - **Resultados ($Y_{\text{outc}}$):** Pasajeros movilizados en el sistema masivo `Transcaribe`, % de puntos críticos de movilidad intervenidos.

---

## 3. Formulación Matemática y Modelos Econométricos (`PuLP` Two-Stage DEA)

### 3.1 Doble Orientación (`Input-Oriented` vs. `Output-Oriented`)
1. **Orientación a Insumos (`Input-Oriented`):** Determina el mínimo consumo de recursos ($X$) necesario para garantizar el cumplimiento de las metas físicas y de resultado ($Y$).
2. **Orientación a Productos (`Output-Oriented`):** En escenario de presupuesto fijo (fijado por el Plan Plurianual de Inversiones `PPI`), maximiza la expansión radial $\phi \ge 1$ de entrega de bienes y servicios sociales ($Y$), donde $\theta_{\text{out}} = 1 / \phi \in (0, 1]$.

### 3.2 Modelo BCC (`Banker, Charnes, Cooper` — `VRS`) con Cálculo de Holguras ($S_i^-, S_r^+$)
$$\min_{\theta, \lambda, s^-, s^+} \quad \theta - \varepsilon \left( \sum_{i=1}^{m} s_i^- + \sum_{r=1}^{s} s_r^+ \right)$$
$$\text{s.a.} \quad \sum_{j=1}^{n} \lambda_j X_{ij} + s_i^- = \theta X_{io}, \quad \forall i = 1,\dots,m$$
$$\sum_{j=1}^{n} \lambda_j Y_{rj} - s_r^+ = Y_{ro}, \quad \forall r = 1,\dots,s$$
$$\sum_{j=1}^{n} \lambda_j = 1, \quad \lambda_j \ge 0, \quad s_i^- \ge 0, \quad s_r^+ \ge 0$$

- **Holgura de Insumo ($s_i^-$):** Exceso presupuestal o de recurso físico susceptible de reasignación sin reducir productos.
- **Holgura de Producto ($s_r^+$):** Déficit de entrega física o de resultado social exigible frente a los pares eficientes ($\lambda_j > 0$).
- **Pares de Referencia (`Benchmarks`):** Conjunto $\{j : \lambda_j > 0, \theta_j = 1.0\}$ que sirve de referencia operativa durante la Armonización Presupuestal.

### 3.3 Eficiencia de Escala ($SE_o$) e Índice Dinámico de Malmquist (`MPI`)
$$SE_o = \frac{\theta_o^{\text{CCR}}}{\theta_o^{\text{BCC}}}$$
- Si $SE_o < 1$: se clasifica en **Rendimientos Crecientes a Escala (`IRS`, subinversión)** cuando $\sum \lambda_j^{\text{CCR}} < 1$, o **Rendimientos Decrecientes a Escala (`DRS`, saturación presupuestal sin capacidad de absorción)** cuando $\sum \lambda_j^{\text{CCR}} > 1$.
- **Índice de Malmquist (`MPI`):**
  $$\text{MPI}_o^{t, t+1} = \underbrace{\text{Pech}_o}_{\text{Catch-up (Eficiencia Interna)}} \times \underbrace{\text{Techch}_o}_{\text{Frontier-shift (Cambio Tecnológico Institucional)}}$$

---

## 4. Reglas de Gobernanza del Seguimiento Institucional de Cartagena (`Secretaría de Planeación Distrital`)

1. **Retroalimentación de la Matriz de Resultados (`SPD`):**
   - Cada fila de la Matriz de Resultados incorpora $\theta^{\text{CCR}}$, $\theta^{\text{BCC}}$, $SE_o$, holgura presupuestal $S^-$ (en COP), déficit de producto $S^+$ y sus `benchmarks` ($\lambda_j$).
2. **Recalificación Vinculante del Tablero por Programa y Tablero Alcalde:**
   - Una dependencia o programa con **alto cumplimiento físico nominal ($\ge 90\%$ o $100\%$) pero con eficiencia técnica $\theta^{\text{BCC}} \le 0.70$** (ej. $\theta = 0.65$) **NO** se clasifica en `"MUY_ALTO_SOBRESALIENTE"`, sino en **`"ALERTA_INEFICIENCIA_FINANCIERA_DESPERDICIO"`**, exigiendo sesión de contención PDCA/Catchball.
3. **Sostenibilidad del Plan Plurianual (`PPI`) y Armonización Presupuestal:**
   - Las DMUs sobre la frontera eficiente ($\theta^{\text{BCC}} = 1.0, S^- = 0, S^+ = 0$) actúan como **Benchmarks Oficiales** para reestructurar los presupuestos de las Unidades Ejecutoras ineficientes en los ejercicios anuales de Armonización Presupuestal.
