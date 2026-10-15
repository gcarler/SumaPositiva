# Orden de Ejecución Frontend — `[TRIADA-FRONTEND-CIERRE-TOTAL-10]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Ejecutor:** `agy2`
- **Rama:** `main` (commit local al finalizar; **prohibido `git push`**)
- **Plan Maestro de referencia:** Lee obligatoriamente `bridge/00_plan_cierre_total_pdd_10.md`.

## Objetivo
Cerrar al 100% la serie histórica y el Centro de Mando de Planes de Desarrollo en `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`, `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` y `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`:

1. **Completar el 100% de los Techos Oficiales del Plan Plurianual de Inversiones (`OFICIAL_EXTRAIDO` en los 8 Planes: `5 PDD + 3 PDL`):**
   - Ya extrajimos por OCR con `tesseract` las tablas oficiales de los dos Acuerdos que faltaban:
     - **`PDD_2012_2015` («En Cartagena Hay Campo para Todos» — Acuerdo 001 del 4 de julio de 2012, pág. 157):**
       - **Total Cuatrienio:** **`$3.049.788.268.000` COP** (`2012: $718.910.382.000`, `2013: $712.219.309.000`, `2014: $787.872.147.000`, `2015: $830.786.430.000`), `ppi_estado: 'OFICIAL_EXTRAIDO'`, con sus **5 Ejes Oficiales**:
         1. `Eje 1. Transversal: Atención a Grupos de Población Diferenciada y por Ciclo Vital`: `$196.661.713.000` COP
         2. `Eje 2. Desarrollo Humano`: `$2.068.532.775.000` COP
         3. `Eje 3. Desarrollo Económico Incluyente`: `$179.995.114.000` COP
         4. `Eje 4. Hábitat, Infraestructura y Sustentabilidad`: `$434.185.669.000` COP
         5. `Eje 5. Seguridad Ciudadana y Buen Gobierno`: `$170.412.997.000` COP
     - **`PDD_2016_2019` («Primero la Gente para una Cartagena Sostenible y Competitiva» — Acuerdo 006 del 13 de junio de 2016, Tabla 209 pág. 357):**
       - **Total Cuatrienio:** **`$4.331.941.000.000` COP** (`2016: $976.114.000.000`, `2017: $1.033.268.000.000`, `2018: $1.115.477.000.000`, `2019: $1.207.081.000.000`), `ppi_estado: 'OFICIAL_EXTRAIDO'`, con sus **3 Objetivos Estratégicos Oficiales**:
         1. `Objetivo Estratégico 1: Superar la Desigualdad`: `$3.183.163.000.000` COP (`73%`)
         2. `Objetivo Estratégico 2: Adaptar el Territorio para la Gente`: `$852.631.000.000` COP (`20%`)
         3. `Objetivo Estratégico 3: Construir Ciudadanía y Fortalecimiento Institucional`: `$296.147.000.000` COP (`7%`)
       - Además, con el techo oficial de `$4.331.941.000.000` COP frente a los `$4.603.448.539.806` COP reconstruidos en `bd_csh`, calcula y muestra su factor de conciliación exacta (**`1,06x` / `+6,27%`**).

2. **Visualización de Emparejamiento Semántico de las `2.068` Metas Oficiales y Líneas Estratégicas 100% Canónicas:**
   - En `pdd-dea-evaluacion-panel.tsx`, muestra en la sub-pestaña **Explorador (`pdd-tab-explorador`)** y **Cumplimiento (`pdd-tab-cumplimiento`)** el desglose de metas oficiales extraídas de los Acuerdos (`2.068` metas tabulares en `seguimiento.pdd_metas_oficiales`) y su vinculación semántica/exacta con las filas operativas de `bd_csh`, garantizando que las Líneas Estratégicas sean 100% las canónicas del Acuerdo.

3. **Ampliar `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` a `>= 36` pruebas:**
   - Añade tests explícitos para verificar:
     - El PPI OCR de `PDD_2012_2015` (`$3.049.788.268.000` COP) y sus 5 Ejes.
     - El PPI OCR de `PDD_2016_2019` (`$4.331.941.000.000` COP), sus 3 Objetivos Estratégicos y su factor de conciliación `1,06x`.
     - Que los 8 planes (`5 PDD + 3 PDL`) tengan `ppi_estado === 'OFICIAL_EXTRAIDO'` y `ppiTotalCorrienteCop > 0`.

## Archivos Autorizados
- `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`
- `src/features/seguimiento/services/plan-accion-dnp-api.ts`
- `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`
- `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`
- `bridge/02_resultado_agy2.md`
*(Prohibido tocar `backend/` o hacer `git push`).*
