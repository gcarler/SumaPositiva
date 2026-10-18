# Tarea Activa — Fase `[31B]` (`agy2` — `=agy2:0.0`)

- **Fecha:** 2026-10-18
- **Coordinador EAF:** `agy` (`=agy:0.0`)
- **Alcance:** **100% BACKEND y PostgreSQL `bd_csh` (`PROHIBIDO tocar src/**`, `router.py`, `schemas.py` o `test_pdt_ai_evaluator.py`).**

---

## 1. Archivos Autorizados para `agy2` en `[31B]`
1. `backend/scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py` *(NUEVO)*
2. `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py`
3. `backend/tests/test_pdt_dea_4niveles_cartagena.py`
4. `bridge/02_resultado_agy2.md`

*(PROHIBIDO modificar `src/**`, `router.py`, `schemas.py`, `pdt_informe_integral_spd.py` o `test_pdt_ai_evaluator.py`, que pertenecen a `codex` en `[31A]`).*
*(NOTA TÉCNICA: Para editar `pdt_dea_4niveles_cartagena.py`, usa scripts cortos de Python mediante `run_command` o ediciones puntuales y pasa `ruff check` al final para evitar bloqueos de la herramienta de edición en archivos de >2,000 líneas).*

---

## 2. Especificación Técnica Detallada

### 2.1 Nuevo Script `backend/scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py` y Poblamiento en `bd_csh`
Crear y ejecutar contra `bd_csh` (esquema `seguimiento`) un script idempotente (`CREATE TABLE IF NOT EXISTS` + `TRUNCATE` / `ON CONFLICT DO UPDATE`) que cree y pueble 3 tablas canónicas:

1. **`seguimiento.pdd_dmu_ieo_oficiales` (`105` filas exactas: `IEO-001` a `IEO-105`):**
   - Representa el universo completo de las **105 Instituciones Educativas Oficiales (`IEO`) del Distrito de Cartagena de Indias** (incluyendo las emblemáticas ya presentes en el módulo como `IEO-001` Institución Educativa Soledad Acosta de Samper, `IEO-002` INEM José Manuel Rodríguez Torices, `IEO-003` IE Nuestra Señora del Carmen, `IEO-004` IE John F. Kennedy, `IEO-005` IE San Felipe Neri, `IEO-006` IE Ambientalista de Cartagena, `IEO-007` IE Oficial de Pontezuela, `IEO-008` IE Olga González Arraut, `IEO-009` IE Técnica Industrial Pedro de Heredia, `IEO-010` IE Clemente Manuel Zabala, `IEO-011` IE Santa María, `IEO-012` IE Islas del Rosario / Zona Insular, más las restantes `IEO-013` a `IEO-105` distribuidas en las 3 Localidades y las 15 UCGs `UCG-01`..`UCG-15` y zona rural/insular).
   - Columnas:
     - `dmu_codigo VARCHAR(32) PRIMARY KEY` (`IEO-001`..`IEO-105`)
     - `nombre_ieo VARCHAR(220) NOT NULL`
     - `localidad_codigo VARCHAR(32) NOT NULL` (`LOC-1`, `LOC-2`, `LOC-3`)
     - `ucg_codigo VARCHAR(32) NOT NULL` (`UCG-01`..`UCG-15`)
     - `presupuesto_total_cop DOUBLE PRECISION NOT NULL`
     - `recursos_sgr_pae_cop DOUBLE PRECISION NOT NULL`
     - `planta_docente DOUBLE PRECISION NOT NULL`
     - `numero_aulas DOUBLE PRECISION NOT NULL`
     - `cupos_matricula_simat DOUBLE PRECISION NOT NULL`
     - `estudiantes_beneficiados_pae DOUBLE PRECISION NOT NULL`
     - `docentes_capacitados DOUBLE PRECISION NOT NULL`
     - `puntaje_saber11 DOUBLE PRECISION NOT NULL`
     - `categoria_saber11 VARCHAR(16) NOT NULL` (`A+`, `A`, `B`, `C`, `D`)
     - `reduccion_desercion_pp DOUBLE PRECISION NOT NULL`
     - `cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL`

2. **`seguimiento.pdd_dmu_ese_centros_salud` (`43` filas exactas: `ESE-001` a `ESE-043`):**
   - Representa la red operativa completa de la **`ESE Hospital Local Cartagena de Indias`** (Hospitales Locales Canapote, El Pozón, Arroz Barato, Nuevo Bosque, más los `CAP` y Puestos de Salud urbanos, rurales e insulares `ESE-001` a `ESE-043` en las 3 Localidades y 15 UCGs).
   - Columnas:
     - `dmu_codigo VARCHAR(32) PRIMARY KEY` (`ESE-001`..`ESE-043`)
     - `nombre_centro_salud VARCHAR(220) NOT NULL`
     - `tipo_establecimiento VARCHAR(64) NOT NULL` (`HOSPITAL_LOCAL`, `CAP_24H`, `CAP_12H`, `PUESTO_SALUD_RURAL_INSULAR`)
     - `localidad_codigo VARCHAR(32) NOT NULL`
     - `ucg_codigo VARCHAR(32) NOT NULL`
     - `presupuesto_ese_cop DOUBLE PRECISION NOT NULL`
     - `inversion_pts_cop DOUBLE PRECISION NOT NULL`
     - `personal_medico_asistencial DOUBLE PRECISION NOT NULL`
     - `consultorios_camas DOUBLE PRECISION NOT NULL`
     - `personas_vulnerables_capacitadas DOUBLE PRECISION NOT NULL`
     - `valoraciones_discapacidad DOUBLE PRECISION NOT NULL`
     - `cobertura_vacunacion_pct DOUBLE PRECISION NOT NULL`
     - `atencion_preferencial_eapb_pct DOUBLE PRECISION NOT NULL`
     - `cumplimiento_nominal_pct DOUBLE PRECISION NOT NULL`

3. **`seguimiento.pdd_fuentes_financiacion_dmu` (mínimo `27` filas: las 3 Localidades + 15 UCGs + 9 Secretarías/Entes Descentralizados):**
   - Desagrega los insumos financieros ($X$) por fuente de financiación conforme al Plan Plurianual de Inversiones (`PPI`) y Sistema General de Regalías (`SGR`):
     - `dmu_codigo VARCHAR(64) PRIMARY KEY`
     - `nombre_dmu VARCHAR(220) NOT NULL`
     - `nivel_dmu VARCHAR(64) NOT NULL` (`NIVEL_1_LOCALIDAD`, `NIVEL_1_UCG`, `NIVEL_2_SECRETARIA_ENTE`)
     - `sgr_regalias_cop DOUBLE PRECISION NOT NULL`
     - `credito_publico_cop DOUBLE PRECISION NOT NULL`
     - `sgp_transferencias_cop DOUBLE PRECISION NOT NULL`
     - `icld_recursos_propios_cop DOUBLE PRECISION NOT NULL`
     - `cofinanciacion_nacion_cop DOUBLE PRECISION NOT NULL`
     - `total_fuentes_cop DOUBLE PRECISION NOT NULL`

### 2.2 Actualización de `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py`
1. En `_extraer_insumos_bd_cartagena`:
   - Consultar `seguimiento.pdd_dmu_ieo_oficiales` (`105` filas), `seguimiento.pdd_dmu_ese_centros_salud` (`43` filas) y `seguimiento.pdd_fuentes_financiacion_dmu` desde `bd_csh` (con fallback determinista si la BD no está disponible).
2. En `_construir_nivel_3_operativo`:
   - Ejecutar el solver `calcular_dea_ccr_y_escala` sobre el padrón completo de las **`105` IEO oficiales** en la Sub-frontera A (`instituciones_educativas_oficiales_ieo`) y los **`43` Centros/Hospitales ESE** en la Sub-frontera B (`centros_salud_ese_cartagena`) extraídos de `bd_csh`.
   - Incluir en el resultado de Nivel 3 `padron_censal_bd_csh`: `{"ieo_evaluadas_en_frontera": len(ieos_eval), "centros_ese_evaluados_en_frontera": len(ese_eval), "fuente_datos": "seguimiento.pdd_dmu_ieo_oficiales + seguimiento.pdd_dmu_ese_centros_salud"}`.
3. En `_construir_nivel_1_territorial` y `_construir_nivel_2_institucional`:
   - Enriquecer cada DMU con `desagregacion_fuentes_financiacion` (`sgr_regalias_cop`, `credito_publico_cop`, `sgp_transferencias_cop`, `icld_recursos_propios_cop`, `cofinanciacion_nacion_cop`, `total_fuentes_cop`) y `holgura_s_minus_por_fuente_cop` (distribuyendo proporcionalmente la holgura presupuestal $S^-$ en COP entre `sgr_regalias_cop`, `credito_publico_cop`, `sgp_transferencias_cop`, `icld_recursos_propios_cop` y `cofinanciacion_nacion_cop`).
   - Agregar un bloque `resumen_fuentes_financiacion_y_holguras` en el diccionario de retorno de Nivel 1, Nivel 2 y en la raíz de `evaluar_dea_4_niveles_cartagena`.

### 2.3 Ampliación de `backend/tests/test_pdt_dea_4niveles_cartagena.py`
Añadir 2 pruebas nuevas (para un total de `>= 8` pruebas):
1. `test_nivel_3_padron_censal_105_ieo_y_43_ese_en_bd_csh`: verifica que `evaluar_dea_4_niveles_cartagena(nivel="nivel_3_operativo_ieo_ese")` evalúe las **`105` IEO oficiales** en la Sub-frontera A y los **`43` Centros/Hospitales ESE** en la Sub-frontera B sin mezclarlas.
2. `test_desagregacion_fuentes_financiacion_sgr_credito_y_holguras_por_fuente`: verifica que las DMUs de Nivel 1 y Nivel 2 incluyan `desagregacion_fuentes_financiacion` (`sgr_regalias_cop`, `credito_publico_cop`, `sgp_transferencias_cop`, `icld_recursos_propios_cop`) y `holgura_s_minus_por_fuente_cop`, y que la suma de holguras por fuente coincida con la holgura presupuestal $S^-$ total de la DMU.

---

## 3. Verificación y Reporte
1. Ejecutar el script de poblamiento y las pruebas:
   ```bash
   cd /root/polis/backend && ./.venv/bin/python scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py
   cd /root/polis/backend && ./.venv/bin/ruff check scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py app/modules/compromisos/pdt_dea_4niveles_cartagena.py tests/test_pdt_dea_4niveles_cartagena.py
   cd /root/polis/backend && ./.venv/bin/pytest tests/test_pdt_dea_4niveles_cartagena.py -q
   ```
2. Escribir reporte en `/root/polis/bridge/02_resultado_agy2.md`.
3. Notificar a `=agy:0.0`:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [31B]: Padron censal 105 IEO + 43 ESE y fuentes SGR/Credito/SGP/ICLD en bd_csh + pdt_dea_4niveles_cartagena.py completados y probados. Solicito auditoria EAF." Enter
   ```
