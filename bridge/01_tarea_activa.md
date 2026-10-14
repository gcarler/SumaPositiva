# ORDEN DE EJECUCIÓN FRONTEND E INTELIGENCIA ANALÍTICA (`agy2`) — `[TRIADA-FRONTEND-INTELIGENCIA-6M-06]`

- **Fecha:** 2026-10-14
- **Coordinador / Auditor Forense EAF:** `agy` (`=agy:0.0`)
- **Ejecutor Frontend y Analítica Interactiva:** `agy2` (`=agy2:0.0`)
- **Plan Maestro de referencia:** `bridge/00_plan_maestro_inteligencia_triada.md`
- **Rama:** `main` (commit local exclusivo de tus archivos en `src/features/seguimiento/` y `bridge/02_resultado_agy2.md`; **PROHIBIDO `git push`**; **NO tocar archivos en `backend/` ni `bridge/01_tarea_codex.md` ni `bridge/02_entrega_codex.md` porque `codex` trabaja en paralelo en el backend**).

---

## 1. Contexto y Objetivo

El backend ya procesó, deduplicó (`SHA-256` binario + `huella_tabular_sha256` semántica) y saneó al **`99,97%`** el universo real de Planes de Acción de Cartagena en `bd_csh`:
- **`217.740` registros normalizados** (`99.583` en `PLAN_DESARROLLO`, `63.023` en `PLAN_ACCION`, `55.134` en `INVERSION_PRESUPUESTAL`).
- **`609` hashes binarios únicos** (`608` libros activos + `1` clon tabular de `DADIS 2021` fusionado con `477` filas eliminadas + `5` archivos alertados con `CONTENIDO_IDENTICO_OTRO_CORTE` en `Transcaribe`, `LHCN`, `Localidad Industrial y de la Bahía` e `IDER`).
- **`30` entidades públicas oficiales canónicas** del Distrito de Cartagena (`0` nombres de funcionarios, `0` valores numéricos, `0` placeholders).
- **`8` Dimensiones de Seguridad Humana** (`1. Seguridad Personal` a `8. Crisis`) y **`3` Periodos de Gobierno** (`ANTES_2020`, `2020_2023`, `2024_2027` entre `2016` y `2026`).
- **`1.516` códigos BPIM**, **`4.600` metas PDD**, **`27.182` actividades con verbo débil DNP (`57,8%`)** vs. **`19.869` con verbo fuerte DNP (`42,2%`)**.

Tu misión es construir en el Frontend el **Laboratorio de Inteligencia Forense de 6 Motores (`InteligenciaForense6MPanel`)** conectado a los nuevos endpoints del backend (`/api/v1/compromisos/triada/inteligencia/...`) y dotado de un dataset semilla forense real de Cartagena (`inteligencia-triada-6m.data.ts`) con las cifras reales auditadas de `bd_csh` para carga instantánea y resiliencia total.

---

## 2. Archivos de tu Dominio Exclusivo

1. `src/features/seguimiento/data/inteligencia-triada-6m.data.ts` *(nuevo — tipos TypeScript, las 8 Dimensiones de Seguridad Humana, los 3 Periodos de Gobierno, las 30 Entidades Oficiales con sus conteos reales de `bd_csh`, y los datos semilla auditados para los 6 motores)*
2. `src/features/seguimiento/services/plan-accion-dnp-api.ts` *(ampliar con los clientes tipados para los 7 endpoints `/api/v1/compromisos/triada/inteligencia/...` y soporte de filtros `dimension`, `periodo`, `corte` en comparativa/resumen)*
3. `src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx` *(nuevo — componente interactivo con las 6 vistas/motores forenses)*
4. `src/features/seguimiento/components/triada-motores-tab.tsx` *(integrar `InteligenciaForense6MPanel`, la insignia de Calidad Forense `99,97%` sobre `217.740` registros y los filtros por las 8 Dimensiones de Seguridad Humana y 3 Periodos de Gobierno)*
5. `src/features/seguimiento/__tests__/inteligencia-forense-6m.test.tsx` *(nuevo — suite de pruebas con `bun test` verificando los 6 motores, filtros, buscador y simulador)*
6. `bridge/02_resultado_agy2.md` *(reporte de entrega)*

---

## 3. Especificación de los 6 Motores en `InteligenciaForense6MPanel`

El panel debe ofrecer un selector de **6 Motores Analíticos** (con `data-testid` claros) + filtros globales (`dimension`, `periodo`, `entidad`):

1. **Motor 1 (`patologias-dnp`): Detector Forense de «Efecto Espejismo» y Patologías DNP**
   - Muestra el balance real de formulación: **`27.182` actividades con verbo débil (`57,8%`, reunionitis)** vs. **`19.869` con verbo fuerte DNP (`42,2%`)**.
   - Tarjetas de patologías: `ESPEJISMO_OPERATIVO`, `DESACOPLE_FISICO_FINANCIERO` (sobreejecución financiera sin obra física), `CUELLO_BOTELLA_PRESUPUESTAL` (apropiación con RP/obligación en `$0`).
   - Tabla interactiva con el **Ranking 0–100 de Calidad Técnica DNP de las 30 Entidades Oficiales** y lista de casos críticos.
2. **Motor 2 (`continuidad-gobiernos`): «ADN de Continuidad vs. Ruptura» entre 3 Gobiernos (`2016–2026`)**
   - Comparativa entre **`Antes de 2020`** (`43` archivos, `6.441` filas), **`2020–2023`** (`257` archivos, `71.898` filas) y **`2024–2027`** (`307` archivos, `137.829` filas).
   - Indicadores de **Continuidad BPIM** (sobrevivientes en múltiples gobiernos vs. proyectos huérfanos de un solo gobierno).
   - Matriz de **Migración de Prioridades en las 8 Dimensiones de Seguridad Humana** (`1. Seguridad Personal`, `2. Seguridad Económica`, `3. Seguridad Alimentaria`, `4. Seguridad en la Salud`, `5. Seguridad Ambiental`, `6. Seguridad Comunitaria`, `7. Seguridad Política`, `8. Crisis`) y detector de **Metas Recicladas**.
3. **Motor 3 (`radar-transparencia`): Radar de Inercia, Copy-Paste Trimestral y Transparencia**
   - Expone los **5 archivos reales marcados con `CONTENIDO_IDENTICO_OTRO_CORTE`** (`Transcaribe` Junio=Marzo 2026, `Alcaldía Local Histórica y del Caribe Norte` Marzo=Junio 2026, `Alcaldía Local Industrial y de la Bahía` Diciembre 2025 y Marzo 2026 = Anual 2026, e `IDER` Septiembre 2023 = Anual) y el clon fusionado de `DADIS 2021` (`477` filas).
   - Lista de **Metas Zombies Congeladas** (`T1..T4` sin cambio), **Efecto Diciembre Mágico** (*hockey-stick* en `T4`) y **Matriz de Completitud de Transparencia (`30 Entidades × 11 Años 2016–2026`)**.
4. **Motor 4 (`alineacion-territorial`): Cruce Geoespacial «Inversión Pública vs. Delito y Demanda Ciudadana»**
   - Cruza para las **3 Localidades de Cartagena (`Localidad 1 - Histórica y del Caribe Norte`, `Localidad 2 - De la Virgen y Turística`, `Localidad 3 - Industrial y de la Bahía`)** y los **Barrios Foco** (Olaya Herrera, El Pozón, Nelson Mandela, Bocagrande, Centro Histórico, Pasacaballos, La Boquilla, Torices, etc.):
     - Volumen de actividades y presupuesto en `registros_triada_normalizados` vs. concentración de los **`12.280` hurtos** y las **`33` Mesas Ciudadanas**, mostrando la **Brecha de Desalineación Territorial (%)** y el estado (`ALINEADO`, `SUBINVERSION_MODERADA`, `DEFICIT_CRITICO_ATENCION`).
5. **Motor 5 (`buscador`): Buscador Semántico Transversal e Inspector de Duplicidad Institucional**
   - Barra de búsqueda interactiva con chips rápidos (*«Primera infancia»*, *«Cámaras de seguridad»*, *«Caños y lagos»*, *«Habitante de calle»*, *«Embarazo adolescente»*, *«Vendedores informales»*) que consulta `/api/v1/compromisos/triada/inteligencia/buscador?q=...` (con filtrado reactivo local de respaldo) y muestra:
     - Entidades que intervienen en el mismo tema, serie `2016–2026`, presupuesto asignado y **Alertas de Duplicidad Interinstitucional** (cuando `>= 2` secretarías ejecutan actividades superpuestas sin articulación).
6. **Motor 6 (`simulador-cierre`): Simulador Predictivo de Cierre de Gobierno (`2024–2027`)**
   - Proyección al `31 de diciembre de 2027` por entidad y por cada una de las `8` Dimensiones de Seguridad Humana, con **Semáforo Predictivo** (`CUMPLIRA`, `RIESGO_MODERADO`, `INCUMPLIMIENTO_INMINENTE`), velocidad histórica anual y un control deslizable o selector interactivo de aceleración trimestral para simular cuántos puntos sube el cumplimiento distrital si se corrigen los cuellos de botella.

---

## 4. Validación y Criterios de Cierre

1. Ejecutar `bun test src/features/seguimiento/__tests__/inteligencia-forense-6m.test.tsx src/features/seguimiento/__tests__/triada-motores-tab.test.tsx` y luego la suite completa `bun test` (`0` fallos).
2. Verificar que TypeScript compile sin errores en tus archivos (`bunx tsc --noEmit`).
3. Documentar el resultado en `bridge/02_resultado_agy2.md`.
4. Hacer **commit local en `main`** incluyendo **únicamente tus archivos de frontend y `bridge/02_resultado_agy2.md`** (`git add src/features/seguimiento/... bridge/02_resultado_agy2.md`). **PROHIBIDO `git push`** y prohibido incluir archivos de `backend/`.
5. Notificar al coordinador en `=agy:0.0` al finalizar.
