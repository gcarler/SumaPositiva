# Dictamen de Auditoría EAF (`agy`) — Sprint `[35A]` + `[35B]`: Diagnóstico Multidimensional de Seguridad Humana V2 (Edición Monográfica Exhaustiva de +100 Páginas en Google Docs)

- **Estado**: `APPROVED`
- **Alcance**: `100% BACKEND` (`backend/**`, `bridge/**`) — **CERO FRONTEND (`src/**` intacto)**
- **Objetivo**: Construcción, validación y publicación nativa en **Google Drive (`PSHC_Diagnostico`, folder `1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS`)** de la **Versión 2 (`V2`) de +100 páginas reales en Google Docs** (`>56,000 palabras`, `>375,000 caracteres Markdown`, `>477,000 caracteres HTML`) del Diagnóstico de Gobierno **"EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA (2012–2027)"**.

## 1. Verificación Técnica de Entregables (`[35B]` + `[35A]`)

1. **Fase `[35B]` (`agy2`) — [`backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py`](file:///root/polis/backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py) (`3,196 líneas`)**:
   - **Sección Macro (`diagnostico_macro_8_planes`)**:
     - `monografias_por_plan`: 8 monografías completas (`PDD_2012_2015` a `PDD_2024_2027` + `PDL_1..3_2024_2027`) con desglose de todas sus líneas estratégicas reales en `bd_csh`, percentiles `P25/P50/P75`, distribución en las 7 dimensiones de Seguridad Humana y 4 párrafos extensos de análisis doctrinal e institucional por plan.
     - `matriz_secretarias_y_entidades_distritales`: Top 30 dependencias/secretarías del Distrito con metas totales, metas de derechos sociales, metas en el núcleo de Seguridad Humana, cadena financiera (`Apropiación Definitiva -> Compromisos RP -> Obligaciones -> Pagos Tesorería`), avance físico medio, brecha financiero-física y dimensión predominante.
     - `matriz_embudo_por_plan_y_tipo_vinculo`: Cruce exacto de las `4,637` metas por plan y por tipología de vínculo (`DIRECTO_CODIGO`, `HIBRIDO_LINEA_SEMANTICO`, `SEMANTICO_PA`, `SOLO_META_PDT`).
   - **Sección Micro-Sectorial (`diagnostico_micro_sectorial_7_dimensiones` — 10 Subsecciones por cada una de las 7 Dimensiones = 70 Subsecciones `4.1.1` a `4.7.10`)**:
     - `monografia_doctrinal_y_estructural`: 6 bloques analíticos extensos por dimensión sobre el estándar ONU/PNUD, recepción constitucional/PND/Acuerdo 139/Decreto 037, problemática estructural en Cartagena, oferta pública `2012–2027`, patologías MGA/SisPT y tensiones DEA/ISRI.
     - `evolucion_8_planes`: Serie completa de los 8 planes en cada dimensión.
     - `desempeno_secretarias_dimension`: Evaluación de cada secretaría ejecutora dentro de la dimensión.
     - `lineas_estrategicas_y_programas_dimension`: Top 18 líneas estratégicas y programas oficiales con clústeres `BERTopic`.
     - `evaluacion_sispt_dnp_dimension`: Desglose exacto por las 4 fórmulas oficiales `SisPT`, las 4 tipologías de actividades del Plan de Acción y los 4 rangos de semáforo.
     - `catalogo_metas_mayor_presupuesto` (**25 metas reales por dimensión**) + `catalogo_metas_criticas_rezagadas` (**15 metas críticas reales por dimensión**) = **`280 fichas de metas reales de bd_csh`** auditadas individualmente en el Capítulo IV.
     - `eficiencia_dea_intradimension`, `territorializacion_lisa_y_riesgo_isri_dimension` y `hoja_de_ruta_sectorial_dimension` (6 acciones estratégicas por dimensión).
   - **Sección Econométrica y Espacial (`econometria_espacial_lisa`)**:
     - `perfiles_monograficos_18_territorios`: Monografías individuales de las **3 Localidades** (`LOC-1`, `LOC-2`, `LOC-3`) y las **15 Unidades Comuneras de Gobierno (`UCG-01` a `UCG-15`)** con población, barrios, vulnerabilidad multidimensional, tasa de homicidios, pobreza extrema, riesgo hidroclimático, inversión per cápita y clasificación `PySAL LISA` (`High-Low` Trampas de Vulnerabilidad).

2. **Fase `[35A]` (`codex`) — [`backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`](file:///root/polis/backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py) (`1,817 líneas`)**:
   - Renderizado completo de los Capítulos I a VI en HTML nativo de Google Docs (`>477,000 caracteres`) y Markdown (`>375,000 caracteres`, `>56,700 palabras`), superando las cotas de `+100 páginas reales` en Google Docs.
   - Publicación sincronizada en Google Drive (`1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS`) de `01_DIAGNOSTICO_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA_2012_2027` y `04_DIAGNOSTICO_V2_MONOGRAFIA_100P_SEGURIDAD_HUMANA_8_PLANES_CARTAGENA`.

## 2. Pruebas y Calidad (`ruff` + `pytest`)
- `ruff check`: `All checks passed!`.
- `pytest backend/tests/test_pdt_diagnostico_seguridad_humana_8planes.py backend/tests/test_pdt_ai_evaluator.py backend/tests/test_access_policy.py -q`: **`130 passed`**.
