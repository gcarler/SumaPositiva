# Encargo 249 — Carga del Banco Multifuente Oficial en el Geovisor Territorial (POLIS)

**Fecha de emisión:** 27 de octubre de 2026  
**Emisor:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Destinatario:** Backend / Ingesta Territorial (`agy2` en tmux `=agy2:0.0`)  
**Prioridad:** Alta  
**Estado:** ASIGNADO  

---

## 1. Diagnóstico del Estado Actual del Geovisor

Tras auditoría técnica sobre el esquema espacial `geodatos` en PostgreSQL / PostGIS y los endpoints de `backend/app/modules/geodatos/`, se constata lo siguiente:

1. **Lo que SÍ está cargado:**
   - `geodatos.territorios`: 30 territorios base (Distrito, 3 Localidades, 15 UCG, 5 Barrios, 3 Corregimientos, 3 Zonas Insulares) con geometrías y centroides.
   - `geodatos.estadisticas_hurtos`: 12.280 registros de hurtos de Policía Nacional con polígonos urbano/rural y endpoints de analítica (`/analitica/hurtos/*`).
   - `geodatos.capas_geovisor`: 7 capas iniciales (`SAT_DEFENSORIA`, `CONFLICTIVIDAD_ICS`, `FONSET_PROYECTOS`, `CIENAGA_VIRGEN`, `HURTO_MOTOCICLETAS`, `HURTO_RESIDENCIAS`, `HURTO_COMERCIO`).
   - Georreferenciación de las 37 mesas de diálogo territoriales.

2. **Lo que NO está cargado aún (Brecha a cubrir en este encargo):**
   - El banco multifuente oficial procesado de **28 conjuntos de datos y 2.340 observaciones** ubicado en `data/banco_fuentes_oficiales/` (con consolidado en `indicadores_consolidados_cartagena_2026.csv` y base `cartagena_seguridad_humana.sqlite`) **NO está poblado en `geodatos.indicadores_territorio`** (actualmente solo tiene 116 filas de seguimiento interno).
   - Las capas e indicadores oficiales de DANE, Medicina Legal, TerriData, Unidad de Víctimas, ICBF e INS no están registrados en el catálogo de capas activas del Geovisor ni expuestos para consulta territorial en la interfaz web.

---

## 2. Alcance y Requerimientos del Encargo

El agente `agy2` debe implementar el pipeline de carga, normalización y exposición de estas fuentes:

### A. Ingesta a la Base de Datos (`geodatos.indicadores_territorio`):
Poblar los indicadores de `data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv` vinculándolos al `territorio_id` correspondiente (`DISTRITO-CTG`, localidades `LOC-1`, `LOC-2`, `LOC-3` o UCGs según la granularidad de la fuente):
1. **Medicina Legal (Forensis 2015–2024):** Homicidios, violencia intrafamiliar, presuntos delitos sexuales, lesiones interpersonales, suicidios y accidentes de tránsito.
2. **Policía Nacional / MinDefensa:** Homicidios, lesiones, amenazas y extorsión (2018–2025).
3. **Fiscalía General (SPOA):** Noticias criminales y procesos penales ingresados anuales.
4. **DANE (Pobreza y Empleo):**
   - Pobreza monetaria municipal (2021–2025).
   - Mercado laboral GEIH: Desempleo, ocupación e informalidad en trimestres móviles.
   - Encuesta ECSC: Tasa de victimización (9,53%), tasa de no denuncia / cifra oculta (74,60%) y percepción de inseguridad (75,11%).
   - Estimación SAE de áreas pequeñas: Escala FIES de hambre / inseguridad alimentaria (28,10% en 2024 con intervalo de confianza) e IPM SAE.
5. **DNP / TerriData:** Incidencia de dengue (713/100k), violencia intrafamiliar, cobertura de acueducto y finanzas territoriales.
6. **Unidad para las Víctimas (RUV / IRV):** Hechos victimizantes históricos (desplazamiento forzado, amenazas, homicidios en conflicto), índice de riesgo IRV e indemnizaciones administrativas.
7. **ICBF / SUIN:** Oferta de primera infancia (centros CDI, hogares comunitarios) y puntos de Bienestarina.
8. **Ambientales (INS SIVICAP e IDEAM SISAIRE):** Calidad de agua potable (IRCA urbano y rural) y monitoreo de material particulado.
9. **Defensoría del Pueblo & Procuraduría:** Alertas Tempranas SAT (001-17, 002-20) y demandas ciudadanas PQRSDF.

### B. Registro en el Catálogo de Capas (`geodatos.capas_geovisor`):
Registrar las capas temáticas correspondientes para que aparezcan en el panel de capas del Geovisor:
- `DANE_POBREZA_EMPLEO`
- `MEDICINA_LEGAL_VIOLENCIA`
- `DNP_TERRIDATA_SALUD`
- `RUV_VICTIMAS_CONFLICTO`
- `ICBF_PRIMERA_INFANCIA`
- `INS_CALIDAD_AGUA_IRCA`

### C. Endpoints de Consulta:
Asegurar que los endpoints de geodatos permitan consultar estos indicadores filtrando por:
- `territorio_id` o `codigo_territorio`
- `dimension` (Personal, Comunitaria, Económica, Alimentaria, Salud, Ambiental, Política)
- `fuente_datos`
- `anio_corte`

---

## 3. Criterios de Aceptación y Entrega

1. **Idempotencia:** El script o migración de carga debe ser ejecutable múltiples veces sin duplicar registros (`ON CONFLICT DO UPDATE` o reemplazo por clave unívoca).
2. **Preservación de datos existentes:** No eliminar ni alterar los 12.280 registros de hurtos ni los 30 territorios existentes.
3. **Calidad de código:**
   - `uv run --project backend ruff check backend` exit 0.
   - `uv run --project backend ruff format --check backend` exit 0.
   - Pruebas automatizadas en `backend/tests/test_geodatos_fuentes.py` pasando al 100%.
4. **Informe de Entrega:**
   - Documentar el resultado en `bridge/249_resultado_agy_carga_fuentes_geovisor.md` con conteo exacto de filas insertadas, capas creadas y tiempo de respuesta de los endpoints.
   - Notificar por tmux al coordinador (`=agy:0.0`).
