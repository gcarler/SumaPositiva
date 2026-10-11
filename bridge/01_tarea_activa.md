# TAREA ACTIVA: [INGESTA-DATOS-01] INGESTA Y CERTIFICACIÓN DE INDICADORES REALES DE SEGURIDAD Y CONVIVENCIA

**Fecha:** 2026-10-11  
**Fase:** FASE 2 — Ingesta de Datos Vivos y Feedback Loop  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / RIGOR ANALÍTICO (Erradicación del estado "Sin medición", Transparencia, Rendición de Cuentas y Adopción Territorial)

---

## 🎯 1. Justificación y Alcance del Requerimiento

En la actualidad, las 11 fichas técnicas de indicadores de seguridad, convivencia y desarrollo territorial registradas en la base de datos distrital (`bd_csh`, esquema `indicadores`) presentan valores en cero (`valor_actual = 0.0000`, `porcentaje_avance = 0.00`) y la tabla `mediciones_indicador` carece de registros históricos certificados (`count = 0`). Como consecuencia, tanto en la interfaz pública como en el módulo de seguimiento y rendición de cuentas, la plataforma muestra la leyenda desmovilizadora **"Sin medición"**.

Para el éxito del despliegue comunitario en Cartagena de Indias y la credibilidad del Plan Distrital de Desarrollo, es indispensable:
1. **Poblar la serie histórica y de corte reciente (2024-2025)** con mediciones oficiales reales y trazables, provenientes de fuentes abiertas certificadas:
   - **Instituto Nacional de Medicina Legal y Ciencias Forenses (Forensis):** Homicidios por 100.000 hab.
   - **Policía Nacional de Colombia (SIEDCO / Policía Metropolitana de Cartagena - MECAR):** Hurtos a personas denunciados, Convivencia barrial y desescalamiento de violencias.
   - **Cartagena Cómo Vamos (CCV - Encuesta de Percepción Ciudadana 2024-2025):** Percepción de inseguridad en barrios priorizados.
   - **DANE (Encuesta Nacional de Calidad de Vida - ECV):** Pobreza Multidimensional (IPM) Cartagena.
   - **Alcaldía Mayor / Secotic / Fondo Territorial de Seguridad (FONSET):** Presupuesto asignado a programas de convivencia, cámaras en mantenimiento, jóvenes capacitados en tecnología.
   - **Concesión Alumbrado Público Cartagena:** Luminarias instaladas en puntos críticos.
   - **EPA Cartagena / Cardique / OAGRD:** Resiliencia climática y ambiental en la Ciénaga de la Virgen.
2. **Saneamiento Metodológico y Lingüístico Obligatorio:**
   - Erradicar de raíz cualquier mención remanente a acrónimos no autorizados (reemplazar "DNP" en `indicadores/service.py`, `schemas.py`, `router.py` y en la columna `fuente_datos` de `fichas_tecnicas_indicadores` por la denominación distrital correspondiente).
   - Corregir en la base de datos `fuente_datos` de `IND-PROD-01` de "Policía MEBAR" (Barranquilla) a "Policía MECAR" (Cartagena de Indias).

---

## 📋 2. Especificación Técnica de la Tarea

### A. Saneamiento de Código Backend (`backend/app/modules/indicadores/`)
1. **`service.py`**:
   - Reemplazar comentarios y mensajes de error que mencionan "DNP" por "metodología institucional de planeación distrital" o "parámetros oficiales de planeación distrital".
   - Preservar al 100% la regla de inmutabilidad de la fórmula matemática y la línea base histórica.
2. **`schemas.py` & `router.py`**:
   - Limpiar comentarios y docstrings eliminando referencias a "DNP".
3. **Tests (`backend/tests/test_indicadores_metadatos.py`)**:
   - Verificar que las pruebas sigan pasando al 100% con los mensajes saneados.

### B. Ingesta y Certificación de Datos en Base de Datos (`bd_csh`)
1. **Saneamiento en `indicadores.fichas_tecnicas_indicadores`**:
   - Actualizar `fuente_datos` en `IND-INS-01`: reemplazar `CHIP - DNP` por `CHIP - Secretaría de Hacienda Distrital`.
   - Actualizar `fuente_datos` en `IND-PROD-01`: reemplazar `Policía MEBAR` por `Policía MECAR (Cartagena)`.
2. **Script de Ingesta Oficial (`scripts/ingestar_indicadores_reales.py` o migración SQL)**:
   - Insertar mediciones oficiales en `indicadores.mediciones_indicador` para las 11 fichas técnicas con metadatos completos:
     * `periodo`: "2024-ANUAL" (y cortes 2024-S1/S2 según aplique).
     * `fecha_corte`: Fecha oficial del boletín (ej. 2024-12-31).
     * `valor_medido`: Cifra exacta reportada por la entidad oficial.
     * `avance_acumulado`: Porcentaje de avance calculado según el sentido esperado (ascendente o descendente) respecto a la línea base y la meta del cuatrienio.
     * `observaciones`: Cita de la fuente oficial, resolución, boletín estadístico o informe de calidad de vida.
     * `evidencia_documental_url`: Enlace público verificable institucional (Forensis, SIEDCO, CCV, DANE).
     * `registrado_por`: "Secretaría de Planeación Distrital - Observatorio del Delito / EAF".
     * `es_demostracion`: `false`.
3. **Actualización de Fichas Técnicas**:
   - Actualizar en `indicadores.fichas_tecnicas_indicadores`:
     * `valor_actual = valor_medido`
     * `porcentaje_avance = avance_acumulado`
     * `metadatos`: `{"tiene_mediciones": true, "fecha_corte_ultimo_reporte": "2024-12-31", "periodo_ultimo_reporte": "2024-ANUAL"}`
     * `actualizado_en = clock_timestamp()`

### C. Verificación de Semáforos y Endpoints
1. Verificar que `GET /api/v1/indicadores/fichas` retorne las 11 fichas con `valor_actual > 0` y `tiene_mediciones = true`.
2. Verificar que `GET /api/v1/indicadores/cadena-valor` retorne insumo, producto y resultado con sus avances calculados.
3. Verificar que en la interfaz web de seguimiento (`/plataforma/seguimiento`), las tarjetas de indicadores muestren sus semáforos de cumplimiento activos y ya no aparezca la leyenda "Sin medición".

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación BPIN:** No alterar identificadores BPIN presupuestales.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA en código, documentación o registros de base de datos.
3. **UI-Policy Estricta:** Uso exclusivo de `@/shared/ui/` (`Badge`, `Button`, tokens).
4. **Protocolo Zero-Push:** Exclusivamente commits locales en `main`.
5. **Integridad de Producción:** Las 33 mesas y 36 agendas en `bd_csh` deben permanecer 100% inalteradas y operativas.
