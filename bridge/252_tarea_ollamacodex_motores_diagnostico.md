# Encargo 252 — Articulación y Alimentación Real de los Motores de Diagnóstico Territorial con el Banco Multifuente

**De:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Para:** Motores Analíticos y Modelado Matemático (`ollamacodex`)  
**Fecha:** 27 de octubre de 2026  
**Prioridad:** ALTA  
**Entregable Requerido:** `bridge/252_resultado_ollamacodex_motores_diagnostico.md`  

---

### 1. Contexto y Diagnóstico
En las fases preliminares, el generador y los motores de diagnóstico (`pdt_generador_google_doc_pshc.py`, `pdt_diagnostico_seguridad_humana_8planes.py`, etc.) contenían advertencias operativas (como `AVISO_CAP_V`) indicando que ciertos valores de DEA, autocorrelación espacial de Moran y series de tiempo por UCG eran ilustrativos o estáticos porque la base de datos no disponía de las series territoriales oficiales consolidadas.

Tras la culminación exitosa de los Encargos 249 y 250:
- **Base de Datos PostGIS (`bd_csh`):** Dispone ahora de **2.449 observaciones reales** en `geodatos.indicadores_territorio` vinculadas a los 30 territorios oficiales (`DISTRITO-CTG`, `LOC-1`, `LOC-2`, `LOC-3`, UCGs, barrios y corregimientos).
- **Fuentes Oficiales Integradas:** DANE (Pobreza GEIH, Empleo, FIES Inseguridad Alimentaria, Demografía), Medicina Legal (Homicidios y Violencia Forensis), Policía Nacional (SIEDCO 12.280 hurtos), DNP TerriData (Dengue, Salud, Vacunación), Unidad para las Víctimas (RUV / IRV 34.000+ víctimas), ICBF (Primera Infancia y Nutrición), INS SIVICAP (Calidad de Agua Potable IRCA) y Defensoría (SAT Alertas Tempranas).
- **Catálogo de 13 Capas Geográficas Activas** en `geodatos.capas_geovisor`.

---

### 2. Alcance del Trabajo con OllamaCodex

1. **Auditoría Técnica de los Motores de Diagnóstico:**
   - Inspeccionar `backend/app/modules/compromisos/pdt_diagnostico_seguridad_humana_8planes.py`.
   - Inspeccionar `backend/app/modules/compromisos/pdt_generador_google_doc_pshc.py`.
   - Inspeccionar `backend/app/modules/compromisos/pdt_analisis_planes_tendencias.py`.
   - Inspeccionar `backend/app/modules/ia/agentes/agente_diagnostico.py`.

2. **Diseño de la Ingesta de Datos Reales en los Motores:**
   - Mapear las funciones de cálculo de brechas, árbol de problemas MGA, DEA (eficiencia técnica de gasto e inversión) e indicadores espaciales (Moran / LISA) para que consuman directamente:
     - `geodatos.indicadores_territorio` (los 2.449 indicadores por territorio y dimensión).
     - `geodatos.estadisticas_hurtos` (12.280 registros).
     - `seguimiento.pdd_metas_oficiales` (4.637 metas de los 8 planes).
   - Eliminar dependencias de variables cableadas (hardcoded) en el capítulo V y en los cálculos de brecha diagnóstica.

3. **Formulación del Contrato de Conexión:**
   - Definir las firmas de métodos, consultas SQL asíncronas (`SQLAlchemy 2.0`) y estructuras Pydantic necesarias para alimentar la suite de diagnóstico con datos 100% calculados sobre `bd_csh`.

---

### 3. Entregable
Documentar los hallazgos, propuesta matemática/arquitectónica y código de integración en:
`bridge/252_resultado_ollamacodex_motores_diagnostico.md`

Notificar a la sesión `agy:0.0` vía tmux al culminar.
