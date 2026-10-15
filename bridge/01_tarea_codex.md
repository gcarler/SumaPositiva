# ORDEN DE TAREA BACKEND: `[TRIADA-BACKEND-DEA-PDD-08]`
## MOTOR DE EVALUACIÓN DE METAS, CONCILIACIÓN DEL PLAN PLURIANUAL DE INVERSIONES (PPI) Y DEA / ECONOMETRÍA DE LOS PLANES DE DESARROLLO DE CARTAGENA (2012–2027)

- **Para:** Desarrollador Principal Backend y Econometría (`codex`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-15
- **Referencia:** `bridge/00_plan_maestro_dea_planes_desarrollo_08.md`
- **Rama:** `main` (**Política Zero-Push Estricta**: solo commit local, prohibido `git push`)

---

## 1. Objetivo de la Tarea

Implementar en `backend/app/modules/compromisos/pdd_dea_service.py` (y exponer en `backend/app/modules/compromisos/router.py` bajo `/api/v1/compromisos/triada/pdd-dea/*`) el **Motor de Evaluación de Metas, Conciliación del Plan Plurianual de Inversiones (PPI) y DEA / Econometría de los Planes de Desarrollo de Cartagena (2012–2027)**, combinando:
1. Los documentos normativos oficiales descargados y convertidos a Markdown en `/root/polis/data/planes_desarrollo/*.md` (`PDD 2012–2015 Campo para Todos`, `PDD 2013–2015 Ahora Sí Cartagena`, `PDD 2016–2019 Primero la Gente`, `PDD 2020–2023 Salvemos Juntos a Cartagena`, `PDD 2024–2027 Cartagena, Ciudad de Derechos` y los `3` Planes de Desarrollo Local `2024–2027`).
2. Los **`99.424` registros** de `seguimiento.registros_triada_normalizados` con `motor_destino = 'PLAN_DESARROLLO'` (`2017–2027`) y su cruce por entidad/vigencia con `INVERSION_PRESUPUESTAL` y `PLAN_ACCION` en `bd_csh`.

---

## 2. Especificación de los 5 Endpoints y Contratos JSON (`/api/v1/compromisos/triada/pdd-dea/*`)

### 2.1. `GET /api/v1/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi`
Debe devolver:
- `estado`: `"CALCULADO"`
- `base_ipc`: `2025` (con la serie IPC DANE extendida `2012..2025`: `2012: 2.44`, `2013: 1.94`, `2014: 3.66`, `2015: 6.77`, `2016: 5.75`, `2017: 4.09`, `2018: 3.18`, `2019: 3.80`, `2020: 1.61`, `2021: 5.62`, `2022: 13.12`, `2023: 9.28`, `2024: 5.20`, `2025: 5.10`)
- `planes_desarrollo`: lista de los 5 Planes Distritales (`PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`) + `PDL_2024_2027` (3 Localidades), con:
  - `codigo_plan`, `periodo`, `nombre_oficial`, `norma_adopcion`, `archivos_fuente` (verificando existencia y tamaño en `/root/polis/data/planes_desarrollo/`), `registros_bd_csh`, `entidades_cubiertas`, `metas_pdd_unicas`, `indicadores_unicos`, `lineas_estrategicas_unicas`, `ppi_total_corriente_cop`, `ppi_total_constante_2025_cop`.
- `ppi_oficial_2024_2027`: desglose oficial del Plan Plurianual de Inversiones del Acuerdo 139 de 2024 (`2024: 3270509322394`, `2025: 2953975540173`, `2026: 3194140433906`, `2027: 3382228178382`, `total_cuatrienio: 12800853474855`) y por sus 5 Líneas Estratégicas (`Seguridad Humana`, `Vida Digna`, `Desarrollo Económico Equitativo`, `Ciudad Conectada y Sostenible`, `Innovación Pública y Participación Ciudadana`) + `Capítulo Étnico`.
- `ppi_oficial_2020_2023`: desglose oficial del PPI de *Salvemos Juntos a Cartagena* (`total_cuatrienio_cop: 6022982600000` en pesos constantes dic-2019, desglosado en los 4 Pilares: `Cartagena Resiliente`, `Cartagena Incluyente`, `Cartagena Contingente`, `Cartagena Transparente` y Eje Transversal).
- `conciliacion_anual_ppi_vs_bd`: lista para `2020..2025` comparando `techo_ppi_oficial_cop`, `apropiacion_reconstruida_bd_cop`, `pagos_reconstruidos_bd_cop`, `ratio_reconstruido_vs_ppi` y `factor_calibracion_ppi`.

### 2.2. `GET /api/v1/compromisos/triada/pdd-dea/cumplimiento-metas`
Parámetro opcional: `plan: str = "TODOS"` (`PDD_2024_2027`, `PDD_2020_2023`, `PDD_2016_2019`, `TODOS`).
Sobre los registros de `motor_destino = 'PLAN_DESARROLLO'` en `bd_csh` (descartando archivos clonados y seleccionando el corte más reciente por `(entidad_normalizada, vigencia, codigo_meta_pdd/indicador)`):
- `resumen_por_plan`: para cada Plan (`PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`):
  - `codigo_plan`, `nombre_plan`, `total_registros_pdd`, `metas_unicas_evaluadas`, `metas_con_avance_verificado`, `metas_huerfanas_sin_avance`, `avance_fisico_promedio_pct`, `metas_cumplidas_o_en_ruta` (`>= 75%`), `metas_alerta_media` (`40%..74.9%`), `metas_rezago_critico` (`< 40%`).
- `desglose_lineas_estrategicas`: agrupación por Plan y Línea Estratégica / Pilar homologada (`Seguridad Humana`, `Vida Digna`, `Desarrollo Económico Equitativo`, `Ciudad Conectada y Sostenible`, `Innovación Pública y Participación`, `Capítulo Étnico`, etc.) con número de metas, avance medio `%`, entidades participantes y estado semafórico.
- `foco_linea_seguridad_humana_2024_2027`: detalle de los 5 Componentes Impulsores de la Línea Estratégica 1 («Seguridad Humana») del Acuerdo 139 de 2024 y los 19 Macroproyectos Estratégicos.
- `planes_desarrollo_local_2024_2027`: métricas de las 3 Localidades (`Localidad 1 Histórica y del Caribe Norte`, `Localidad 2 De la Virgen y Turística`, `Localidad 3 Industrial y de la Bahía`) a partir de los Markdowns en `/root/polis/data/planes_desarrollo/pdl_2024_2027_*.md` y sus registros en `bd_csh`.
- `cumplimiento_por_entidad`: ranking de las entidades responsables con sus metas PDD asignadas, avance medio `%`, metas en rezago y metas huérfanas.

### 2.3. `GET /api/v1/compromisos/triada/pdd-dea/frontera-dea-pdd`
Parámetros opcionales: `plan: str = "PDD_2024_2027"` (`PDD_2024_2027`, `PDD_2020_2023`, `PDD_2016_2019`), `insumo: str = "conciliado_ppi"` (`conciliado_ppi` | `reportado`).
Resuelve con `scipy.optimize.linprog(method='highs')` el **DEA específico de cumplimiento del Plan de Desarrollo**:
- **DMUs:** Entidades del Distrito con presencia en `PLAN_DESARROLLO` en el periodo seleccionado ($n \ge 9$, Regla de Cooper para $m=1, s=2$).
  - **Input $X_1$:** Presupuesto en millones de COP constantes Base 2025 asignado/calibrado al techo del PPI (`conciliado_ppi`, escalando la participación presupuestal de la entidad al techo oficial anual del PPI para eliminar la distorsión de filas repetidas sin llave) o `reportado`. (Si en `PDD_2016_2019` una entidad carece de columna monetaria pero tiene metas programadas/registros de plan, usar esfuerzo programático de metas formuladas como insumo o marcar explícitamente el insumo utilizado).
  - **Output $Y_1$ (`y1_metas_pdd_cumplidas_eq`):** Suma de avances normalizados ($\sum \text{avance}_k / 100$) de las metas únicas del Plan de Desarrollo a cargo de la entidad.
  - **Output $Y_2$ (`y2_indicadores_eficaces_ge75`):** Número (o volumen equivalente) de indicadores únicos del Plan de Desarrollo donde la entidad alcanza avance eficaz $\ge 75\%$ (con piso $>0$ cuando $Y_1 > 0$).
- Devuelve:
  - `plan`, `insumo`, `dmus_evaluadas`, `cumple_regla_cooper`, `eficiencia_media_bcc`, `eficiencia_media_ccr`, `eficiencia_media_sbm`, `dmus_en_frontera_bcc`
  - `ranking_entidades_pdd`: lista ordenada con `entidad`, `sigla`, `grupo_institucional`, `x1_ppi_mcop_2025`, `y1_metas_pdd_cumplidas_eq`, `y2_indicadores_eficaces_ge75`, `avance_medio_pdd_pct`, `theta_ccr`, `theta_bcc`, `escala_eficiencia_se`, `retornos_escala_rts`, `theta_sbm`, `theta_bootstrap_corregido`, `ic95_inf`, `ic95_sup`, `peers`, `holguras_slacks` (`slack_x1_mcop`, `slack_y1_metas_pdd`, `slack_y2_indicadores`), `metas_target_frontera` (`target_x1_mcop`, `target_y1_metas_pdd`, `target_y2_indicadores`).
  - `frontera_lineas_estrategicas`: evaluación de eficiencia relativa entre las Líneas Estratégicas / Pilares del Plan seleccionado.

### 2.4. `GET /api/v1/compromisos/triada/pdd-dea/econometria-comparada-pdd`
Debe devolver:
- `malmquist_inter_planes`: Índice de Productividad de Malmquist con media geométrica (`_geomean`) comparando el cambio de eficiencia en la ejecución de Planes de Desarrollo entre periodos (`PDD_2016_2019 -> PDD_2020_2023` y `PDD_2020_2023 -> PDD_2024_2027`), con `mpi_global`, `effch_global`, `techch_global` y desglose por entidad.
- `matriz_correlaciones_pdd`: Correlaciones de Spearman ($\rho$) y Pearson ($r$) con ajuste **Benjamini–Hochberg FDR (`q_value_fdr`)** entre: presupuesto PPI ($X_1$), metas PDD cumplidas ($Y_1$), indicadores eficaces ($Y_2$), avance medio PDD (`%`), eficiencia $\theta_{\text{BCC}}$ PDD y articulación con Plan de Acción.
- `desigualdad_ppi_gini_hhi`: Coeficiente de Gini y HHI de la inversión por entidad y por Línea Estratégica / Dimensión de Seguridad Humana en los Planes de Desarrollo.
- `prueba_cambio_estructural_planes`: Prueba pareada de Wilcoxon (`PDD_2020_2023` vs `PDD_2024_2027`) y prueba de Friedman/Kruskal sobre las entidades continuas entre Planes de Desarrollo.

### 2.5. `GET /api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo`
Consolida en una sola respuesta cacheada (`TTL = 3600s` en `_RESULT`) los bloques anteriores para carga rápida del laboratorio visual.

---

## 3. Requisitos de Rendimiento y Calidad

1. **Velocidad (`< 3s` en frío, `< 50ms` en caché):**
   - Consulta SQL optimizada con agregación o proyección ligera y caché en memoria `_RESULT` con `TTL = 3600.0`.
   - Bootstrap vectorizado/ligero (`replicas = 200` con pre-filtrado de referencias del casco convexo) para que ningún endpoint supere los `3` segundos en frío.
2. **Archivos Permitidos para `codex`:**
   - `backend/app/modules/compromisos/pdd_dea_service.py` *(nuevo)*
   - `backend/app/modules/compromisos/router.py` *(modificado)*
   - `backend/tests/test_pdd_dea_triada.py` *(nuevo — mínimo 8 pruebas verificando los 5 endpoints, conciliación PPI, cotas DEA $0 < \theta \le 1$, Malmquist inter-planes y FDR)*
   - `docs/permisos-api.md` *(modificado — registrar las 5 rutas `/api/v1/compromisos/triada/pdd-dea/*`)*
   - `bridge/02_entrega_codex.md` *(actualizado)*
3. **Verificación y Cierre:**
   - Ejecutar `ruff format` y `ruff check` (`0` errores).
   - Ejecutar `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_pdd_dea_triada.py backend/tests/test_access_policy.py`.
   - Reiniciar `polis-backend.service` y verificar `HTTP 200 OK` en las 5 rutas `/api/v1/compromisos/triada/pdd-dea/*`.
   - Hacer **commit local en `main`** (sin `git push`).
