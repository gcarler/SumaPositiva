# TAREA ACTIVA PARA `agy2`: `[PA-BANCO-MOTOR-01]`
## BANCO DE CONOCIMIENTO DNP / SISPT Y MOTOR DE PROCESAMIENTO DE PLANES DE ACCIÓN (INSTRUCTIVO KIT FINANCIERO DNP / MHCP · LEY 152/1994 · LEY 1474/2011)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** ALTA — EJECUCIÓN INMEDIATA

---

## 1. Contexto y Fuentes Oficiales del DNP

El propietario del proyecto solicitó construir el **Banco de Conocimiento DNP** y el **Motor de Procesamiento de Planes de Acción**, tomando como base metodológica oficial del **Departamento Nacional de Planeación (DNP)** y del **Ministerio de Hacienda y Crédito Público (MHCP)**:
1. **Instructivo Oficial del Plan de Acción (Kit Financiero / Portal Territorial DNP):** Descargado y disponible localmente en `/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch/Instructivo_PlandeAccion_DNP.pdf` (13 páginas).
2. **Sistema de Planeación Territorial (SisPT — `https://sispt.dnp.gov.co/`):** Plataforma oficial del DNP para el cargue, programación y seguimiento del Plan Indicativo (PI) y los Planes de Acción (PA) territoriales.
3. **Plan Maestro del Bloque:** Documentado en `/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/PLAN_MAESTRO_MOTOR_PLAN_ACCION_DNP.md`.

---

## 2. Reglas Metodológicas Oficiales del DNP que Deben Quedar Codificadas

Del Instructivo Oficial del DNP (`Instructivo_PlandeAccion_DNP.pdf`, págs. 4–13) se extraen las siguientes reglas obligatorias:

1. **Marco Normativo Obligatorio (Págs. 4, 8, 9 y 13):**
   - **Ley 152 de 1994, Art. 41:** Con base en los planes generales aprobados por el Concejo, cada secretaría y departamento administrativo preparará, con la coordinación de la Oficina de Planeación, su correspondiente **Plan de Acción (PA)** y lo someterá a la aprobación del **Consejo de Gobierno** distrital.
   - **Ley 152 de 1994, Art. 29:** Articulación del **Plan Indicativo (PI) cuatrienal** con los **Planes de Acción (PA) anuales** como base para la evaluación de resultados.
   - **Ley 1474 de 2011, Art. 74 (Estatuto Anticorrupción) y Decreto 2482 de 2012:** Todas las entidades del Estado, **a más tardar el 31 de enero de cada año**, deberán publicar en su página web el Plan de Acción para la vigencia (especificando objetivos, estrategias, proyectos, metas, responsables, planes generales de compras, distribución presupuestal e indicadores de gestión) y el informe de gestión del año anterior.

2. **Encadenamiento de Instrumentos de Planeación y Presupuesto (Págs. 6–7):**
   - **Insumos:**
     1. `PDT y Plan Indicativo (PI)` → Actividad: Identificación de metas de producto y gestión incorporadas en el PDT → Producto: Metas de gestión y de producto sujetas a seguimiento en el PA.
     2. `POAI (Plan Operativo Anual de Inversiones)` → Actividad: Articulación de actividades con cada proyecto de inversión de la vigencia → Producto: Actividades necesarias con indicadores, recursos, fecha de inicio y fecha de terminación.
     3. `MFMP (Marco Fiscal de Mediano Plazo)` → Actividad: Definición de la cuota global de inversión para la vigencia fiscal (Hacienda y Planeación) → Producto: Cuota global de inversión distribuida entre sectores.
     4. `Presupuesto Anual y PAC` → Actividad: Definición de recursos destinados a inversión y funcionamiento → Producto: Disponibilidad de recursos para financiar actividades del PA.

3. **Los 7 Pasos Oficiales de Elaboración del Plan de Acción (Págs. 8–9):**
   - **Paso 1:** Orientaciones metodológicas de la Oficina de Planeación a los líderes por dependencia y revisión de misión/competencias.
   - **Paso 2:** Consolidación y revisión de insumos (PDT, PI, POAI, MFMP, Presupuesto) entregados a la dependencia consolidadora.
   - **Paso 3:** Incorporación de metas de gestión y/o administrativas sujetas a seguimiento en el PA (incluyendo gestión de recursos ante fuentes externas/nacionales y acciones recurrentes).
   - **Paso 4:** Revisión por dependencia de actividades requeridas para cumplir metas de producto y proyectos por vigencia, identificando articulación interinstitucional entre dos o más dependencias.
   - **Paso 5:** Diligenciamiento de la matriz del Plan de Acción (Hoja 1 `Plan_Accion` vinculada a Hoja 2 `Plan_Indicativo`) por cada dependencia o entidad descentralizada.
   - **Paso 6:** Presentación y aprobación del Plan de Acción ante el **Consejo de Gobierno** (Art. 41 Ley 152 de 1994).
   - **Paso 7:** Publicación web del Plan de Acción a más tardar el **31 de enero** (Art. 74 Ley 1474 de 2011) para control social y fiscal.

4. **Estructura de la Matriz del Plan de Acción DNP (Págs. 10–13 — Pasos 4.1 a 4.6):**
   - **4.1 Paso 1 — Responsables:** Dependencia ejecutora (`entidad_responsable`), líder responsable (`lider_responsable`, `cargo_responsable`) y dependencias articuladas (`dependencias_articuladas`).
   - **4.2 Paso 2 — Clasificación de la Meta (`tipo_meta`):**
     - `META_PRODUCTO`: Cuantifica los bienes y/o servicios necesarios para alcanzar los objetivos específicos de una política, programa y/o proyecto.
     - `META_GESTION`: Cuantifica el nivel de cumplimiento de actividades y/o procesos requeridos para lograr la entrega de los productos asociados a una política, programa y/o proyecto.
     - `ACTIVIDAD`: Define algún tipo de acción a cumplir para metas recurrentes de la administración y/o actividades de proyectos durante la vigencia.
   - **4.3 Paso 3 — Articulación con Hoja 2 `Plan_Indicativo`:**
     - `codigo_meta_pi`: Código de la meta en el Plan Indicativo (`compromisos_pas.codigo`).
     - `programa_pi`: Programa asociado (`linea_estrategica_codigo` + nombre).
     - `meta_producto_vigencia`: Meta cuantitativa programada para la vigencia fiscal.
   - **4.4 Paso 4 — Proyectos de Inversión (`BPIM`):**
     - `codigo_bpim`: Código único asignado al proyecto en el Banco de Proyectos de Inversión Municipal/Distrital (BPIM / MGA).
     - `proyecto_nombre`: Nombre del proyecto de inversión priorizado en el POAI.
     - `objetivo_proyecto`: Acción o acciones que se realizan para enfrentar el problema.
   - **4.5 Paso 5 — Programación de Actividades y Regla de Verbos Fuertes DNP (Pág. 12):**
     - `tipo_actividad`:
       - `NORMATIVA` (ej.: *Adecuar el estatuto, Modificar tarifas, Fijar calendario, Adoptar formularios, Eliminar exenciones*)
       - `ADMINISTRATIVA` (ej.: *Firmar convenios, Diseñar software, Ajustar procesos, Analizar procesos contractuales*)
       - `DE_GESTION` (ej.: *Crear registros, Identificar saldos, Expedir actos, Ejecutar programas de control*)
       - `LOGISTICA` (ej.: *Notificar actuaciones, Colocar áreas de atención, Verificar terminales y equipos*)
     - **REGLA LINGÜÍSTICA DNP (Pág. 12):**
       - La actividad **DEBE** iniciar con un **verbo fuerte en infinitivo** terminado en `-ar`, `-er` o `-ir`.
       - **Lista negra oficial de 16 verbos débiles/generales prohibidos por el DNP (Pág. 12):**
         `["apropiar", "asegurar", "colaborar", "consolidar", "contribuir", "desarrollar", "integrar", "fomentar", "fortalecer", "garantizar", "implementar", "impulsar", "mejorar", "movilizar", "proponer", "promover"]`
     - Fechas y avance: `fecha_inicio` (`YYYY-MM-DD`, mostrada en UI como `DD/MM/AAAA`), `fecha_terminacion` (`YYYY-MM-DD`), `porcentaje_avance` (`0` a `100`), avances trimestrales (`avance_t1`, `avance_t2`, `avance_t3`, `avance_t4`) y `evidencia_soporte`.
   - **4.6 Paso 6 — Fuente de Financiación por Vigencia (Pág. 13):**
     - `categoria_recursos`: `INVERSION` | `FUNCIONAMIENTO` | `RECURSOS_GESTION`
     - `fuente_financiacion`:
       - En `INVERSION`: `RECURSOS_PROPIOS`, `SGP` (Sistema General de Participaciones), `REGALIAS` (SGR), `CREDITO`, `COFINANCIACION`, `OTROS`.
       - En `FUNCIONAMIENTO`: `GASTOS_PERSONAL` (servicios personales), `GASTOS_GENERALES` (adquisición de bienes y servicios), `TRANSFERENCIAS`.
       - En `RECURSOS_GESTION`: `GESTION_NO_PRESUPUESTAL` (gestiones directas que no ingresan al presupuesto de la ET).
     - `monto_programado_cop` y `monto_ejecutado_cop`.

---

## 3. Especificación de Implementación en Backend y Frontend

### 3.1. Backend (`backend/app/modules/compromisos/` + Migración Aditiva `0062_motor_plan_accion_dnp.py`)

1. **Migración Alembic Aditiva `backend/alembic/versions/0062_motor_plan_accion_dnp.py`:**
   - Crear la tabla `seguimiento.actividades_plan_accion` (sin alterar ni borrar ninguna de las 10 filas de `seguimiento.compromisos_pas` ni el censo de `bd_csh`):
     - `id`: `UUID` PK (`public.generar_uuid_v7()`)
     - `codigo`: `VARCHAR(50)` UNIQUE NOT NULL (ej. `PA-2026-L01-01`)
     - `vigencia`: `INTEGER` NOT NULL DEFAULT `2026`
     - `compromiso_pas_codigo`: `VARCHAR(50)` NOT NULL (vinculado a Hoja 2 `Plan_Indicativo`, ej. `PAS-L1-01`)
     - `linea_estrategica_codigo`: `VARCHAR(50)` NOT NULL (ej. `L1`)
     - `programa_nombre`: `VARCHAR(250)` NOT NULL
     - `entidad_responsable`: `VARCHAR(150)` NOT NULL (Paso 1 DNP)
     - `lider_responsable`: `VARCHAR(150)` NOT NULL (Paso 1 DNP)
     - `dependencias_articuladas`: `JSONB` NOT NULL DEFAULT `'[]'::jsonb` (Paso 4 DNP)
     - `tipo_meta`: `VARCHAR(30)` NOT NULL (`META_PRODUCTO` | `META_GESTION` | `ACTIVIDAD` — Paso 2 DNP)
     - `meta_producto_vigencia`: `VARCHAR(300)` NOT NULL (Paso 3 DNP)
     - `meta_valor_vigencia`: `NUMERIC(14, 2)` NOT NULL DEFAULT `1`
     - `unidad_medida`: `VARCHAR(50)` NOT NULL
     - `codigo_bpim`: `VARCHAR(50)` NOT NULL (Paso 4 DNP — ej. `2026130010001`)
     - `proyecto_nombre`: `VARCHAR(300)` NOT NULL
     - `objetivo_proyecto`: `TEXT` NOT NULL
     - `tipo_actividad`: `VARCHAR(30)` NOT NULL (`NORMATIVA` | `ADMINISTRATIVA` | `DE_GESTION` | `LOGISTICA` — Paso 5 DNP)
     - `descripcion_actividad`: `TEXT` NOT NULL (redactada con verbo fuerte en infinitivo)
     - `verbo_infinitivo`: `VARCHAR(50)` NOT NULL
     - `fecha_inicio`: `DATE` NOT NULL
     - `fecha_terminacion`: `DATE` NOT NULL
     - `periodicidad_seguimiento`: `VARCHAR(20)` NOT NULL DEFAULT `'TRIMESTRAL'`
     - `avance_t1`: `NUMERIC(5, 2)` NOT NULL DEFAULT `0`
     - `avance_t2`: `NUMERIC(5, 2)` NOT NULL DEFAULT `0`
     - `avance_t3`: `NUMERIC(5, 2)` NOT NULL DEFAULT `0`
     - `avance_t4`: `NUMERIC(5, 2)` NOT NULL DEFAULT `0`
     - `porcentaje_avance_fisico`: `NUMERIC(5, 2)` NOT NULL DEFAULT `0`
     - `categoria_recursos`: `VARCHAR(30)` NOT NULL (`INVERSION` | `FUNCIONAMIENTO` | `RECURSOS_GESTION` — Paso 6 DNP)
     - `fuente_financiacion`: `VARCHAR(50)` NOT NULL (`RECURSOS_PROPIOS`, `SGP`, `REGALIAS`, `CREDITO`, `COFINANCIACION`, `GASTOS_PERSONAL`, `GASTOS_GENERALES`, `TRANSFERENCIAS`, `GESTION_NO_PRESUPUESTAL`)
     - `monto_programado_cop`: `NUMERIC(16, 2)` NOT NULL DEFAULT `0`
     - `monto_ejecutado_cop`: `NUMERIC(16, 2)` NOT NULL DEFAULT `0`
     - `estado_aprobacion`: `VARCHAR(40)` NOT NULL DEFAULT `'APROBADO_CONSEJO_GOBIERNO'` (`EN_ELABORACION` | `REVISION_PLANEACION` | `APROBADO_CONSEJO_GOBIERNO` | `PUBLICADO_LEY_1474`)
     - `evidencia_soporte`: `TEXT` NULL
     - `metadatos`: `JSONB` NOT NULL DEFAULT `'{}'::jsonb`
     - `creado_en`, `actualizado_en`
   - **Semilla Canónica en la migración `0062`:**
     - Sembrar **12 actividades ejemplares del Plan de Acción 2026 de Seguridad Humana Integral de Cartagena** (cubriendo las 8 Líneas Estratégicas `L1` a `L8`, articuladas a los compromisos `PAS-L1-01`..`PAS-L8-01` y códigos `BPIM` de las alternativas MGA, usando exclusivamente **verbos fuertes en infinitivo aprobados por el DNP** como *Expedir, Diseñar, Ejecutar, Instalar, Adecuar, Firmar, Crear, Identificar, Verificar, Adoptar, Colocar, Notificar*, cubriendo los 4 tipos de actividad y las distintas fuentes `SGP`, `REGALIAS`, `RECURSOS_PROPIOS`, `COFINANCIACION`, `GASTOS_GENERALES`, `GESTION_NO_PRESUPUESTAL`).

2. **Endpoints Backend en `backend/app/modules/compromisos/router.py` (y registrados en `docs/permisos-api.md`):**
   - `GET /api/v1/compromisos/plan-accion/banco-conocimiento` (`publico`):
     - Devuelve la estructura completa del **Banco de Conocimiento DNP / SisPT**:
       - Marco normativo (`Ley 152/1994 Art. 29 y 41`, `Ley 1474/2011 Art. 74`, `Decreto 2482/2012`).
       - Cadena de articulación de instrumentos (`PDT y Plan Indicativo`, `POAI`, `MFMP`, `Presupuesto Anual y PAC`).
       - Los 7 pasos sugeridos por el DNP para elaborar el Plan de Acción.
       - Los 6 pasos de diligenciamiento de la Matriz del Plan de Acción (Hoja 1 PA + Hoja 2 Plan Indicativo).
       - Taxonomía de metas (`META_PRODUCTO`, `META_GESTION`, `ACTIVIDAD`) y de actividades (`NORMATIVA`, `ADMINISTRATIVA`, `DE_GESTION`, `LOGISTICA`).
       - Regla lingüística DNP: lista de **16 verbos débiles prohibidos** y catálogo de **verbos fuertes en infinitivo recomendados** por tipo de actividad.
       - Catálogo de fuentes de financiación (`INVERSION`, `FUNCIONAMIENTO`, `RECURSOS_GESTION`).
       - Enlaces oficiales (`https://sispt.dnp.gov.co/`, instructivo PDF DNP).
   - `POST /api/v1/compromisos/plan-accion/validar-redaccion` (`publico`):
     - Recibe `{ "descripcion_actividad": "...", "tipo_actividad": "NORMATIVA" | ... }` y ejecuta el **Motor Validador Lingüístico DNP**:
       - Extrae la primera palabra (normalizada en minúsculas sin tildes).
       - Verifica si termina en `-ar`, `-er`, `-ir` (infinitivo).
       - Verifica si pertenece a la lista negra de los **16 verbos débiles prohibidos por el DNP** (`apropiar, asegurar, colaborar, consolidar, contribuir, desarrollar, integrar, fomentar, fortalecer, garantizar, implementar, impulsar, mejorar, movilizar, proponer, promover`).
       - Devuelve `{ "es_valida": bool, "verbo_detectado": str, "es_infinitivo": bool, "es_verbo_debil_prohibido": bool, "mensaje_dnp": str, "verbos_fuertes_sugeridos": list[str] }`.
   - `GET /api/v1/compromisos/plan-accion/matriz` (`publico`):
     - Filtros opcionales: `vigencia`, `entidad`, `linea_codigo`, `tipo_meta`, `tipo_actividad`, `categoria_recursos`, `fuente_financiacion`, `busqueda`.
     - Devuelve:
       - `resumen_ejecutivo`: total actividades, total metas producto/gestión/actividad, avance físico promedio ponderado, presupuesto total programado COP, presupuesto ejecutado COP, `%` ejecución financiera, desglose por fuente (`SGP`, `REGALIAS`, `RECURSOS_PROPIOS`, `FUNCIONAMIENTO`, etc.), desglose por tipo de actividad y semáforo de alertas (`EN_ META >= 80%`, `ALERTA_PREVENTIVA 50–79%`, `REZAGO_CRITICO < 50%`).
       - `hoja_1_plan_accion`: lista de actividades programadas en el Plan de Acción.
       - `hoja_2_plan_indicativo`: lista de compromisos del Plan Indicativo (`seguimiento.compromisos_pas`) articulados a las actividades de la Hoja 1.
   - `POST /api/v1/compromisos/plan-accion/actividades` (protegido con `seguimiento:gestionar`):
     - Crea una nueva actividad en el Plan de Acción tras validar automáticamente su redacción con el Motor Validador DNP.
   - `PATCH /api/v1/compromisos/plan-accion/actividades/{id_o_codigo}/seguimiento` (protegido con `seguimiento:gestionar`):
     - Actualiza el avance trimestral (`avance_t1..t4`), `monto_ejecutado_cop` y `evidencia_soporte`, recalculando automáticamente `porcentaje_avance_fisico`.

### 3.2. Frontend (`src/features/seguimiento/` — Integración en `/plataforma/seguimiento`)

1. **Servicio y Store Tipado (`src/features/seguimiento/services/plan-accion-dnp-api.ts`):**
   - Cliente tipado con fallback resiliente en cliente (con los mismos datos canónicos de las 12 actividades, el Banco de Conocimiento DNP y el validador lingüístico local/remoto para que funcione tanto conectado al backend como en Storybook/contingencia).
2. **Componente 1: `src/features/seguimiento/components/banco-conocimiento-dnp-tab.tsx` («Banco de Conocimiento DNP / SisPT»):**
   - **Sección 1 — Encadenamiento de Instrumentos (Kit Financiero DNP):** Tarjetas interactivas de `PDT & Plan Indicativo (PI)`, `POAI`, `MFMP` y `Presupuesto Anual & PAC` mostrando para cada uno: *Insumo → Actividad → Producto*.
   - **Sección 2 — Ruta Metodológica de 7 Pasos DNP (Ley 152/94 y Ley 1474/11):** Línea de tiempo interactiva de los 7 pasos (desde las orientaciones de Planeación hasta la aprobación en Consejo de Gobierno y la publicación web del **31 de enero**).
   - **Sección 3 — Simulador y Validador Lingüístico DNP de Actividades (Regla Pág. 12 Instructivo DNP):**
     - Caja interactiva donde el formulador escribe o prueba la redacción de una actividad, selecciona el tipo (`Normativa`, `Administrativa`, `De Gestión`, `Logística`) y el motor le indica en tiempo real si cumple con el estándar DNP (verbo fuerte en infinitivo) o si incurre en alguno de los **16 verbos débiles prohibidos por el DNP**, mostrándole sugerencias clicables de verbos fuertes.
   - **Sección 4 — Diccionario de Clasificación de Metas y Fuentes de Financiación DNP:** Referencia rápida de `Meta de Producto` vs `Meta de Gestión` vs `Actividad`, y de `Inversión (SGP, Regalías, Propios, Crédito, Cofinanciación)` vs `Funcionamiento (Personal, Generales, Transferencias)` vs `Recursos de Gestión`.
3. **Componente 2: `src/features/seguimiento/components/motor-plan-accion-tab.tsx` («Motor de Plan de Acción DNP / SisPT»):**
   - **KPIs Ejecutivos del Plan de Acción 2026:** Total Actividades Programadas, Avance Físico Ponderado (`%`), Ejecución Financiera (`COP` y `%`), y Semáforo de Alertas Trimestrales.
   - **Conmutador de Vistas del Instrumento Oficial DNP:**
     - **Hoja 1: Matriz de Plan de Acción (`Plan_Accion` — Pasos 1 a 6 DNP):** Tabla interactiva con filtros multicriterio (Dependencia, Línea Estratégica, Tipo de Meta, Tipo de Actividad, Fuente de Financiación, Búsqueda), mostrando código, actividad (con badge de verbo fuerte), tipo de actividad, vínculo PI (`Hoja 2`), código `BPIM`, cronograma (`DD/MM/AAAA`), avance trimestral (`T1–T4` + barra de progreso), fuente de financiación, presupuesto programado vs. ejecutado y estado (`Publicado Ley 1474` / `Aprobado Consejo de Gobierno`).
     - **Hoja 2: Plan Indicativo Vinculado (`Plan_Indicativo`):** Cruce automático entre cada Meta del Plan Indicativo (`PAS`) y las actividades operativas de la Hoja 1 que la materializan.
     - **Asistente de Programación de Actividad DNP (6 Pasos):** Formulario guiado en línea para registrar/simular una nueva actividad con validación en vivo de verbos fuertes DNP y cálculo de fuentes de financiación.
   - **Exportación Oficial Ley 1474 de 2011 (Art. 74 — Publicación 31 de Enero):**
     - Botones **«Exportar Matriz DNP (CSV Excel)»** y **«Exportar Plan de Acción (JSON SisPT)»**.
4. **Integración en `src/features/seguimiento/views/seguimiento-view.tsx`:**
   - Añadir las 2 nuevas pestañas en `SeguimientoView` junto a las 3 existentes:
     - `motor_plan_accion`: **«Motor Plan de Acción (DNP / SisPT)»**
     - `banco_conocimiento_dnp`: **«Banco de Conocimiento DNP»**
   - Mantener intactas las 3 pestañas existentes (`matriz_compromisos`, `cadena_valor`, `rendicion_cuentas`) y todas sus pruebas.

---

## 4. Puertas de Calidad Obligatorias (Quality Gates)

1. Respaldo previo de `bd_csh` con `scripts/respaldo_bd.sh` antes de aplicar la migración `0062`.
2. `pytest`: Crear `backend/tests/test_motor_plan_accion_dnp.py` probando el Banco de Conocimiento DNP, el Validador de Verbos Fuertes/Débiles DNP, la Matriz Hoja 1 + Hoja 2, la creación/actualización de seguimiento trimestral y `backend/tests/test_access_policy.py` al 100% en verde.
3. `bun test`: Crear `src/features/seguimiento/components/motor-plan-accion.test.tsx` probando el Banco de Conocimiento DNP, el Validador Lingüístico DNP y el Motor de Plan de Acción; toda la suite `bun test` en verde (`0 fail`).
4. `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`): **0 errores**.
5. `bun run ui:test`: **212 / 212 historias de Storybook** en verde.
6. `bun run build`, copia de assets a `.next/standalone`, reinicio de `polis-backend` y `polis-frontend`.
7. Censo de `bd_csh` intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12.280` hurtos y `12` actividades en `seguimiento.actividades_plan_accion`).
8. Commit local en `main` (Zero-Push) y reporte en `bridge/02_resultado_agy2.md`.
