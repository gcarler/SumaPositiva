# Plan Maestro Sprint `[34A]` + `[34B]`: Diagnóstico Multidimensional de la Seguridad Humana en los 8 Planes de Desarrollo de Cartagena (`2012–2027`) + Publicación Nativa en Google Docs y Google Sheets (`PSHC_Diagnostico`)

## 1. Objetivo General
Construir de extremo a extremo la arquitectura analítica y documental **"EVALUACIÓN MULTIDIMENSIONAL DE LA SEGURIDAD HUMANA EN 8 PLANES DE DESARROLLO DE CARTAGENA"**, desde el universo macro de las **`4,637` metas oficiales** en `bd_csh` (`PDD_2012_2015` a `PDD_2024_2027` + `PDL 1..3`) hasta la minería micro-sectorial en las **7 Dimensiones de la Seguridad Humana** (PNUD 1994 / Resolución ONU 66/290 / Amartya Sen / Ley 2294 de 2022 PND / Acuerdo 139 de 2024), integrando:
1. **Embudo Analítico de 3 Etapas (`Data Funnel Analytics` + `NLP`)**:
   - **Etapa 1 — Universo Total (8 Planes en `bd_csh`)**: `4,637` metas totales (desglosadas en Metas de Producto vs Metas de Resultado/Bienestar y las 4 tipologías `SisPT`).
   - **Etapa 2 — Metas Asociadas a Derechos Sociales, Bienestar y Seguridad**: Filtrado semántico NLP sobre las `4,637` metas.
   - **Etapa 3 — Núcleo Directo de Seguridad Humana (7 Dimensiones)**: Clasificación en las 7 dimensiones (`Seguridad Económica`, `Seguridad Alimentaria`, `Seguridad en Salud`, `Seguridad Ambiental`, `Seguridad Personal`, `Seguridad Comunitaria`, `Seguridad Política`), con presupuesto `PPI`/`CUIPO`, eficacia `SisPT` truncada al `100%` y semáforo `MDM`.
2. **Minería Micro-Sectorial en las 7 Dimensiones (Sección IV: 4.1 a 4.7)**:
   - Tablas dinámicas con metas reales de `bd_csh` para cada dimensión (Centro de Oportunidades, PES Pedro Romero, PAE, Comedores, ACFC, Aseguramiento Salud, CRUED, 43 Centros ESE, Drenajes Pluviales, Protección Costera, Ciénaga de la Virgen, Plan Titán 24, PISCC, SIES/123, Capítulo Étnico, Titulación Colectiva, ITA, Presupuestos Participativos, Inspecciones y Comisarías).
3. **Econometría No Paramétrica (`DEA-BCC VRS` y Slacks $S^-, S^+$), Econometría Espacial (`Moran's I` y `LISA` en 3 Localidades y 15 UCGs con Trampas de Vulnerabilidad) y Series Temporales (`ARIMA` / `ISRI` 2024–2027) (Sección V: 5.1 a 5.3)**.
4. **Generación y Publicación Nativa en Google Drive (`PSHC_Diagnostico`, `1g3wXPujYCZfJVB77_iZOrdfBZNfTkVVS`)**:
   - Creación de **Google Doc nativo** (`application/vnd.google-apps.document`) con la maquetación exacta solicitada (`#0B2545` títulos 24pt, `#134074` H1 16pt, `#8DA9C4` H2 13pt, Callout Boxes `#F4F6F8` con borde izquierdo `4.5pt #134074`, tablas con encabezado `#0B2545` y filas alternadas `#FFFFFF`/`#FAFAFA`), más **Google Sheet nativo** (`application/vnd.google-apps.spreadsheet`) y archivo Markdown auditable.

## 2. División de Trabajo Sin Colisiones (`100% Backend`, `0% Frontend`)
- **`agy2` (`=agy2:0.0`) — Fase `[34B]`**:
  - Archivos exclusivos:
    - `backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py` (nuevo)
    - `backend/tests/test_pdt_diagnostico_seguridad_humana_8planes.py` (nuevo)
- **`codex` (`=codex:0.0`) — Fase `[34A]`**:
  - Archivos exclusivos:
    - `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py` (nuevo)
    - `backend/app/modules/compromisos/router.py`
    - `backend/app/modules/compromisos/schemas.py`
    - `backend/app/core/security/access_policy.py`
    - `docs/permisos-api.md`
    - `backend/tests/test_pdt_ai_evaluator.py`
    - `backend/tests/test_access_policy.py`
