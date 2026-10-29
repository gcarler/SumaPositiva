# Plan Maestro EAF — Sprint `[35A]` + `[35B]`: Diagnóstico Multidimensional de Seguridad Humana V2 (Edición Monográfica Exhaustiva de +100 Páginas en Google Docs)

## 1. Objetivo de Gobierno y Escala Editorial (V2)
El usuario revisó la versión V1 (37 páginas en Google Docs) y solicitó una **Versión 2 (`V2`) de al menos 100 a 130 páginas en Google Docs**, estructurada con rigor técnico y profundidad analítica de nivel gubernamental:
- **~30 a 35 páginas de Generalidades, Marco Teórico/Normativo/Metodológico y Diagnóstico Macro Longitudinal (`Capítulos I, II y III`)**.
- **~10 a 12 páginas POR CADA UNA de las 7 Dimensiones de la Seguridad Humana (`Capítulo IV: Subcapítulos 4.1 a 4.7` = ~75 a 85 páginas)**.
- **~20 a 25 páginas de Econometría Avanzada (`DEA-BCC`, `PySAL LISA` en 3 Localidades y 15 UCGs, `ARIMA/ISRI`) y Hoja de Ruta Estratégica (`Capítulos V y VI`)**.
- **Meta cuantitativa de volumen real (sin relleno vacío, 100% fundamentado en `bd_csh` y doctrina oficial)**:
  - Longitud del Markdown ejecutivo (`markdown_ejecutivo`): **`>= 340,000` caracteres (`>= 48,000` palabras)**.
  - Longitud del HTML nativo para Google Docs (`html_google_doc`): **`>= 460,000` caracteres**, que al importarse como `application/vnd.google-apps.document` produce **entre `110` y `135` páginas reales en Google Docs**.

## 2. Restricción Estricta de Alcance
- **100% BACKEND ONLY (`backend/**`, `bridge/**`)**.
- **PROHIBIDO TOCAR `src/**` (Frontend) o `polis-frontend.service`**.

## 3. División de Responsabilidades (`[35B]` `agy2` + `[35A]` `codex`)

### Fase `[35B]` — `agy2` (`=agy2:0.0`): Ampliación Profunda del Motor Analítico en `backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py`
`agy2` debe enriquecer `construir_diagnostico_seguridad_humana_8planes` en `backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py` para extraer de `bd_csh` (`seguimiento.pdd_metas_oficiales`, `seguimiento.pdd_vinculos_meta_pa_triada`, `seguimiento.registros_triada_normalizados`, `geodatos.territorios`) todos los desgloses granulares necesarios para sustentar 30 páginas macro y 10+ páginas por cada dimensión:
1. **En `diagnostico_macro_8_planes`**:
   - **`monografias_por_plan`**: Para cada uno de los **8 planes** (`PDD_2012_2015`, `PDD_2013_2015`, `PDD_2016_2019`, `PDD_2020_2023`, `PDD_2024_2027`, `PDL_1_2024_2027`, `PDL_2_2024_2027`, `PDL_3_2024_2027`), incluir:
     - `desglose_lineas_estrategicas`: lista de todas las líneas estratégicas reales del plan con `metas_totales`, `metas_nucleo_sh`, `metas_con_pa`, `apropiacion_cop`, `compromisos_rp_cop`, `pagos_cop`, `avance_fisico_medio_pct`, `p25_avance_pct`, `p50_avance_pct`, `p75_avance_pct`.
     - `distribucion_7_dimensiones_en_plan`: cómo se reparten las metas y el presupuesto de ese plan entre las 7 dimensiones de Seguridad Humana.
     - `analisis_doctrinal_e_institucional_extenso`: 4 párrafos analíticos profundos sobre el diseño, ejecución, cuellos de botella y legado del plan.
   - **`matriz_secretarias_y_entidades_distritales`**: Tabla completa de las **entidades/dependencias responsables** en `seguimiento.pdd_vinculos_meta_pa_triada` (`Top 30 dependencias`) con `metas_totales`, `metas_derechos_sociales`, `metas_nucleo_sh`, `metas_con_presupuesto`, `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`, `tasa_compromiso_pct`, `tasa_pago_pct`, `avance_fisico_medio_pct`, `brecha_financiero_fisica_pct` y `dimension_predominante`.
   - **`matriz_embudo_por_plan_y_tipo_vinculo`**: Cruce del embudo de 3 etapas (`Universo 4,637 -> Derechos Sociales 3,663 -> Núcleo Directo 2,718`) por cada uno de los 8 planes y por `tipo_vinculo` (`DIRECTO_CODIGO`, `HIBRIDO_LINEA_SEMANTICO`, `SEMANTICO_PA`, `SOLO_META_PDT`).
2. **En `diagnostico_micro_sectorial_7_dimensiones["analisis_por_dimension"]` (Para CADA UNA de las 7 Dimensiones `SH_01` a `SH_07`)**:
   Además de los campos actuales (que deben preservarse por compatibilidad con tests), agregar en cada dimensión los 10 bloques analíticos completos:
   - `monografia_doctrinal_y_estructural`: lista de 6 párrafos extensos y rigurosos (`marco_internacional_pnud_onu`, `recepcion_constitucional_pnd_y_acuerdo_139`, `problematica_estructural_cartagena`, `anatomia_de_la_oferta_publica_2012_2027`, `patologias_de_formulacion_mga_sispt`, `tensiones_presupuestales_y_territoriales`).
   - `evolucion_8_planes`: lista de los **8 planes** para esa dimensión específica (`codigo_plan`, `nombre_plan`, `periodo`, `metas_totales_dim`, `metas_nucleo_dim`, `metas_con_pa_dim`, `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`, `avance_fisico_medio_pct`, `mediana_avance_pct`, `metas_cumplidas_80_mas`, `metas_rezagadas_40_menos`, `evaluacion_cuatrienial`).
   - `desempeno_secretarias_dimension`: lista de todas las dependencias/secretarías que ejecutan metas en esa dimensión (`dependencia`, `metas_totales`, `metas_nucleo`, `metas_con_pa`, `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `pagos_tesoreria_cop`, `ejecucion_financiera_pct`, `avance_fisico_medio_pct`, `brecha_financiero_fisica_pct`, `dictamen_entidad`).
   - `lineas_estrategicas_y_programas_dimension`: lista de las `Top 18` líneas estratégicas / programas oficiales en `bd_csh` dentro de esa dimensión (`codigo_plan`, `linea_estrategica`, `metas_totales`, `metas_nucleo`, `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `avance_fisico_medio_pct`, `cluster_bertopic`).
   - `evaluacion_sispt_dnp_dimension`: desglose de las metas de la dimensión en:
     - `por_formula_indicador`: (`INCREMENTO`, `MANTENIMIENTO`, `REDUCCION`, `CREACION`) con conteo, presupuesto, eficacia media sin truncar, eficacia media truncada `[0%, 100%]` y metas con sobreejecución truncada.
     - `por_tipo_actividad_pa`: (`TIPO_1_INVERSION_PROYECTO_MGA`, `TIPO_2_FUNCIONAMIENTO_ASOCIADO`, `TIPO_3_GESTION_INSTITUCIONAL`, `TIPO_4_REGULATORIA_SIN_PRESUPUESTO`) con conteo, presupuesto y avance físico.
     - `por_rango_semaforo_sispt`: (`SOBRESALIENTE_85_100`, `ACEPTABLE_70_84`, `VULNERABLE_40_69`, `CRITICO_0_39`).
   - `catalogo_metas_mayor_presupuesto` (**Top 25 metas reales de la dimensión con mayor apropiación/impacto** en `bd_csh`) y `catalogo_metas_criticas_rezagadas` (**Top 15 metas reales de la dimensión con rezago crítico o brecha financiero-física** en `bd_csh`), cada una con: `codigo_plan`, `codigo_meta`, `tipo_meta`, `dependencia_responsable`, `linea_estrategica`, `meta_texto_canonico`, `indicador`, `unidad_medida`, `meta_programada_anual`, `meta_ejecutada_anual`, `avance_fisico_pct`, `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `pagos_tesoreria_cop`, `tipo_vinculo`, `dictamen_meta`.
   - `eficiencia_dea_intradimension`: comparativa DEA-BCC de los planes y secretarías dentro de la dimensión (`theta_bcc`, `holgura_presupuesto_cop`, `holgura_avance_pct`, `retorno_escala`, `diagnostico_microeconometrico`).
   - `territorializacion_lisa_y_riesgo_isri_dimension`: impacto específico de la dimensión en las **3 Localidades** y **15 UCGs** de Cartagena, y descomposición detallada del `ISRI` (`rezago_fisico`, `brecha_financiera`, `inercia_arima`, `penalidad_dea`, `proyeccion_cierre_2027_pct`).
   - `hoja_de_ruta_sectorial_dimension`: lista de `6` recomendaciones estructurales y operativas específicas para la dimensión (`horizonte`, `entidad_lider`, `accion_estrategica`, `meta_asociada`, `impacto_esperado_isri_dea`).
3. **En `analisis_avanzado_dea_espacial_series`**:
   - Añadir en `econometria_espacial_lisa` un análisis monográfico individual extendido para cada una de las **3 Localidades** y cada una de las **15 UCGs** (`perfiles_monograficos_18_territorios`), relacionando sus indicadores geométricos/demográficos de `geodatos.territorios` con las brechas de las 7 dimensiones de Seguridad Humana.

### Fase `[35A]` — `codex` (`=codex:0.0`): Generador Editorial Monográfico V2 (+100 Páginas) en `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`
`codex` debe expandir `_build_document` en `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py` para renderizar en **HTML nativo de Google Docs (con saltos de página estilizados, tablas completas, Callout Boxes `#F4F6F8` con borde `#134074` y tipografía `#0B2545`/`#134074`/`#8DA9C4`)** y en **Markdown Ejecutivo** la totalidad de esta arquitectura V2:
- **Capítulos I, II y III (~30–35 páginas)**:
  - Renderizar todas las tablas macro, las **8 monografías completas de los Planes de Desarrollo (`3.1.1` a `3.1.8`)** con sus tablas de líneas estratégicas y distribución en las 7 dimensiones, la **tabla completa de las 30 Secretarías y Entidades Ejecutoras (`3.2`)**, y la **matriz completa del Embudo de 3 Etapas por Plan y Tipo de Vínculo (`3.3`)**, acompañadas de análisis doctrinal, normativo, metodológico (`SisPT`, `CUIPO/PIIP`, `DEA`, `LISA`, `ARIMA/ISRI`) y de política pública en profundidad.
- **Capítulo IV (~75–85 páginas — 10 a 12 páginas por cada una de las 7 Dimensiones `4.1` a `4.7`)**:
  - Para **cada una de las 7 dimensiones (`4.1` a `4.7`)**, renderizar sus **10 subsecciones numeradas (`4.X.1` a `4.X.10`)** con:
    - Los 6 párrafos extensos de fundamentación doctrinal y diagnóstico estructural en Cartagena (`4.X.1`).
    - Tabla y análisis longitudinal de los **8 Planes de Desarrollo en la dimensión (`4.X.2`)**.
    - Tabla y evaluación institucional de todas las **Secretarías Responsables en la dimensión (`4.X.3`)**.
    - Tabla y análisis de las **Top 18 Líneas Estratégicas y Programas de la dimensión (`4.X.4`)**.
    - Tablas y evaluación metodológica **`SisPT DNP` (4 fórmulas + 4 tipos de actividad PA + rangos semáforo) (`4.X.5`)**.
    - Auditoría de la **Cadena Presupuestal `CUIPO / PIIP` (`B_i -> C_i -> O_i -> P_i`) (`4.X.6`)**.
    - **Catálogo Auditado de las `25 Metas de Mayor Presupuesto`** + **Catálogo Auditado de las `15 Metas Críticas/Rezagadas`** de la dimensión (`40 metas reales detalladas por dimensión = 280 metas en total en el Cap. IV`) con su análisis técnico (`4.X.7`).
    - Evaluación micro-econométrica **`DEA-BCC` y Holguras (`Slacks`) intra-dimensión (`4.X.8`)**.
    - Territorialización en las **3 Localidades y 15 UCGs + Descomposición `ISRI 2024–2027` (`4.X.9`)**.
    - Callout Box de Alerta Sectorial y **Hoja de Ruta de 6 Acciones Estratégicas de la Dimensión (`4.X.10`)**.
- **Capítulos V y VI (~20–25 páginas)**:
  - Renderizar el desarrollo econométrico completo (`5.1 DEA-BCC`, `5.2 Moran's I + LISA` con perfiles monográficos de las **3 Localidades y 15 UCGs**, `5.3 ARIMA + ISRI`) y el **Capítulo VI** con la matriz integral de brechas, plan de choque `2025–2027` y protocolo de gobernanza.
- **Publicación en Google Drive (`1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS`)**:
  - Actualizar el documento `01_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA_2012_2027` (y también crear/actualizar `04_DIAGNOSTICO_V2_MONOGRAFIA_100P_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA` como Google Doc nativo + `03_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA.md`) garantizando que `len(markdown_ejecutivo) >= 340000` y `len(html_google_doc) >= 460000` (**>100 páginas reales en Google Docs**).
