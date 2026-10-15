# ORDEN DE EJECUCIÓN MAESTRA: `[TRIADA-PDD-LAB-PRESCRIPTIVO-11B]`
## LABORATORIO PRESCRIPTIVO PDD: NETWORK DEA BI-ETAPA (OPERACIÓN → ESTRATEGIA), SIMULADOR INVERSE DEA PARETO, GRAFO DE PROVENIENCIA DE METAS (8 PLANES), DENOMINADORES DEMOGRÁFICOS DANE Y BYTES PRE-SERIALIZADOS (`< 25 ms`)

- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Para:**
  - `codex` — Desarrollador Principal Backend y Econometría (`[TRIADA-BACKEND-LAB-PDD-11B]`)
  - `agy2` — Desarrollador Principal Frontend (`[TRIADA-FRONTEND-LAB-PDD-11B]`)
- **Fecha:** 15 de octubre de 2026
- **Política de Control de Versiones:** **Zero-Push Estricta** (Solo commits locales en `main`).
- **Inviolabilidad de `bd_csh`:** Preservar intactos los `217.740` registros de `seguimiento.registros_triada_normalizados` y los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).

---

## 1. Los 6 Pilares Técnicos Aprobados (Aportes de `codex` + Diseño Integrado)

### Pilar 1: Cobertura 8/8 Planes en `seguimiento.pdd_metas_oficiales` + Deduplicación `Bases vs. Ponencia 2024`
- Extraer desde los Markdown OCR de `PDD_2012_2015` (`pdd_2012_2015_acuerdo_001_campo_para_todos.md`) y `PDD_2016_2019` (`pdd_2016_2019_acuerdo_006_primero_la_gente.md`) las metas/programas cuantificados con patrón regex de líneas/objetivos/porcentajes/indicadores para que **los 8 planes (`5 PDD + 3 PDL`) tengan filas reales en `seguimiento.pdd_metas_oficiales`**.
- Detectar y marcar en `datos_oficiales._vinculo_triada` las metas de `PDD_2024_2027` que están repetidas entre el *Documento Técnico de Bases* y la *Ponencia de 2do Debate* (`estado_cobertura = "DUPLICADA_ENTRE_FUENTES_PDD"` con referencia a la fila primaria), evitando doble conteo al evaluar orfandad.

### Pilar 2: Grafo de Proveniencia, Taxonomía de Rigor MGA/Sinergia y Descomposición Forense de Orfandad
- Clasificar cada meta de `seguimiento.pdd_metas_oficiales` en dos dimensiones auditables dentro de `datos_oficiales._auditoria_forense`:
  1. **`estado_cobertura` (6 categorías exhaustivas):**
     - `VINCULADA_ALTA_CONFIANZA` (score $\ge 0.55$ o match de indicador+entidad),
     - `CANDIDATO_BAJA_CONFIANZA` ($0.30 \le \text{score} < 0.55$, requiere revisión humana),
     - `DUPLICADA_ENTRE_FUENTES_PDD` (solapamiento Bases vs. Ponencia 2024),
     - `SIN_CORPUS_HISTORICO` (`PDD_2012_2015` y `PDD_2013_2015`, dado que el corpus Triada inicia en `2017`),
     - `SIN_CODIGO_O_ENTIDAD` (meta sin entidad ni línea atribuible),
     - `SIN_REPORTE_EN_CORPUS_CUBIERTO` (**verdadera alerta de control político/fiscal en `2018–2026`**).
  2. **`taxonomia_mga` (Rigor de Formulación DNP):**
     - `RESULTADO_IMPACTO` (tasas, índices, reducción de brechas/mortalidad/pobreza/delito),
     - `PRODUCTO_CUANTIFICABLE` (obras, km, viviendas, cupos, subsidios, unidades físicas),
     - `GESTION_PROCESO_BLANDO` (documentos, campañas, reuniones, capacitaciones, diagnósticos),
     - `REVISION_HUMANA` (cuando falta unidad o línea base).

### Pilar 3: Network DEA Bi-Etapa (`Operación PA → Estrategia PDD`) + Prueba de Estabilidad de Ranking (`Ranking Robustness`)
- En `pdd_dea_service.py`, implementar el modelo **Network DEA Bi-Etapa con Compuerta de Elegibilidad**:
  - **Etapa 1 (Eficiencia Operativa / Plan de Acción $\theta_1$):**
    - *Input $X$:* Apropiación / Pagos deflactados (`base 2025`).
    - *Intermedio $Z$:* Actividades de Plan de Acción ejecutadas ponderadas por verbo fuerte y proyectos BPIM activos.
  - **Etapa 2 (Efectividad Estratégica / Plan de Desarrollo $\theta_2$):**
    - *Input Intermedio $Z$:* Productos operativos entregados en Etapa 1.
    - *Output Final $Y$:* Avance físico ponderado de metas PDD verificadas.
  - **Diagnóstico de Ilusión Burocrática:** $\text{Brecha} = \theta_1 - \theta_2 > 0.20$ identifica secretarías con **Alta Ejecución Operativa de Actividades pero Bajo Impacto en Metas del PDD** (`ILUSION_BUROCRATICA`).
  - **Estabilidad de Ranking (`ranking_robustness`):** comparar la posición de cada DMU bajo 4 especificaciones (`BCC_VRS`, `CCR_CRS`, `SBM_NO_RADIAL`, `VENTANA_PANEL`) y calcular el rango de variación de cuartiles (`ESTABLE`, `MODERADO`, `VOLATIL`).

### Pilar 4: Simulador de Escenarios *Inverse DEA / Frontera de Pareto* con Ledger de Restricciones (`±5%`, `±10%`, `±15%`)
- Implementar un motor de simulación de escenarios (`simular_escenario_inverse_dea`) que calcule bajo 3 niveles de flexibilidad presupuestal ($\alpha \in \{0.05, 0.10, 0.15\}$):
  - Cuánto presupuesto ocioso en DMUs con retornos decrecientes (`DRS`) o baja efectividad estratégica ($\theta_2$) podría reasignarse en un escenario normativo hacia DMUs/Líneas con retornos crecientes (`IRS`) y alta conversión a metas PDD, manteniendo $\sum \Delta X_j = 0$.
  - Incluir siempre el **Ledger de Restricciones y Advertencia Metodológica** (escenario matemático sobre frontera observada, no efecto causal automático).

### Pilar 5: Denominadores Demográficos DANE en `geodatos.territorios` + Balance Territorial Auditado (`3 PDL + 2 Zonas Hurtos + 33 Mesas`)
- Actualizar en `geodatos.territorios` (sin alterar geometrías ni IDs) la `poblacion_estimada` oficial DANE/TerriData para el Distrito (`1.065.570` hab.) y las 3 Localidades (`Localidad 1 Histórica y del Caribe Norte: 412.580`, `Localidad 2 De la Virgen y Turística: 348.190`, `Localidad 3 Industrial y de la Bahía: 304.800`), permitiendo calcular:
  - **Inversión PDL per cápita real (COP constantes 2025 / habitante)** en las 3 localidades,
  - **Densidad de Mesas Ciudadanas por cada 100.000 habitantes**, y
  - **Comparativo Urbano vs. Rural/Insular de Hurtos (`n=2` polígonos)** con compuerta explícita `inferencia_espacial_moran = "NO_ESTIMABLE_N_MENOR_30"`.

### Pilar 6: Bytes Pre-Serializados (`Response(content=bytes)` + `ETag`) y Nuevo Endpoint Consolidado `/api/v1/compromisos/triada/pdd-dea/laboratorio-prescriptivo`
- Cachear en memoria y en `/tmp/polis_pdd_dea_cache_v11.json` los bytes JSON pre-serializados para que las rutas existentes y la nueva ruta `/api/v1/compromisos/triada/pdd-dea/laboratorio-prescriptivo` respondan en **`< 25 ms` de tiempo de handler** con soporte de `ETag` / `If-None-Match` (`304 Not Modified`), además de incluir el **Generador de Pliegos de Control Político/Fiscal por Entidad** y resumen exportable con hash SHA-256.
