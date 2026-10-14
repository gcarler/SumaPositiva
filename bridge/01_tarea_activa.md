# TAREA ACTIVA PARA `agy2`: `[PA-PROCESADOR-PUBLICO-02]`
## ACTIVIDAD 2 DEL BLOQUE DNP: MOTOR PROCESADOR POR LOTES (CRUCE AUTOMÁTICO HOJA 2 `PLAN_INDICATIVO` → HOJA 1 `PLAN_ACCION`, AUDITORÍA METODOLÓGICA DNP Y TRANSPARENCIA LEY 1474 DE 2011)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** ALTA — EJECUCIÓN INMEDIATA

---

## 1. Contexto y Objetivo de la Actividad 2

La Actividad 1 (`[PA-BANCO-MOTOR-01]`) quedó **APROBADA SIN RESERVAS** en `bridge/03_dictamen_revision.md`.
Siguiendo el flujo secuencial acordado con el propietario y las reglas de las páginas 8, 9, 11, 12 y 13 del [Instructivo oficial del Plan de Acción DNP](file:///root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch/Instructivo_PlandeAccion_DNP.pdf), pasamos a la **Actividad 2 (`[PA-PROCESADOR-PUBLICO-02]`)** para completar el motor de procesamiento masivo, el cruce automático Hoja 2 → Hoja 1 del formato DNP y la certificación E2E en Storybook.

### Fundamento en el Instructivo Oficial del DNP:
1. **Cruce Automático Hoja 2 (`Plan_Indicativo`) → Hoja 1 (`Plan_Accion`) (Pág. 11):**
   - *"Las metas de gestión y de producto del Plan de Acción tendrán la opción de ser asociadas con el código de la meta de producto y el formato traerá automáticamente el Programa (Columna D) y la Meta de Producto (Columna E) de la Hoja 2 `Plan_indicativo`."*
   - *"En el caso de seleccionar como tipo de meta `ACTIVIDAD`, no será obligatorio diligenciar la programación de metas de producto o gestión, pasando directamente al Paso 4 (Programación de actividades)."*
2. **Consolidación y Revisión por la Oficina de Planeación y Consejo de Gobierno (Pasos 2, 5 y 6 — Págs. 8, 9 y 13):**
   - Cada dependencia remite su matriz del Plan de Acción a la Secretaría de Planeación (dependencia consolidadora), quien revisa la coherencia metodológica, presupuestal y lingüística antes de someterla a aprobación del **Consejo de Gobierno** (Art. 41 Ley 152 de 1994).
3. **Publicación Web Ley 1474 de 2011 Art. 74 y Decreto 2482 de 2012 (Págs. 4, 9 y 13):**
   - A más tardar el **31 de enero de cada año**, la entidad debe publicar el Plan de Acción especificando objetivos, estrategias, proyectos, metas, responsables, distribución presupuestal e indicadores, junto con el balance de ejecución.

---

## 2. Especificación Técnica Paso a Paso

### Paso 1: Endpoint Backend de Procesamiento y Auditoría Metodológica de Lotes DNP (`POST /api/v1/compromisos/plan-accion/procesar-lote`)
En `backend/app/modules/compromisos/schemas.py`, `service.py` y `router.py` (registrándolo en `docs/permisos-api.md` como `publico` para permitir simulación/validación abierta sin barreras):
- Recibe un payload `ProcesarLotePlanAccionSolicitud`:
  ```python
  class ItemLotePlanAccion(BaseModel):
      codigo: str | None = None
      entidad_responsable: str
      lider_responsable: str = "Líder Funcional"
      tipo_meta: str = "META_PRODUCTO"  # META_PRODUCTO | META_GESTION | ACTIVIDAD
      compromiso_pas_codigo: str | None = None  # Código en Hoja 2 Plan_Indicativo (Columna D/E)
      codigo_bpim: str = ""
      proyecto_nombre: str = ""
      objetivo_proyecto: str = ""
      tipo_actividad: str = "DE_GESTION"  # NORMATIVA | ADMINISTRATIVA | DE_GESTION | LOGISTICA
      descripcion_actividad: str
      fecha_inicio: str = "2026-01-15"
      fecha_terminacion: str = "2026-12-15"
      avance_t1: float = 0.0
      avance_t2: float = 0.0
      avance_t3: float = 0.0
      avance_t4: float = 0.0
      categoria_recursos: str = "INVERSION"  # INVERSION | FUNCIONAMIENTO | RECURSOS_GESTION
      fuente_financiacion: str = "RECURSOS_PROPIOS"
      monto_programado_cop: float = 0.0
      monto_ejecutado_cop: float = 0.0
  ```
- **Lógica del Motor de Procesamiento (`procesar_lote_plan_accion`):**
  Para cada fila del lote:
  1. **Cruce Automático Hoja 2 (`Plan_Indicativo`) → Hoja 1 (`Plan_Accion`) (Regla Pág. 11 DNP):**
     - Si `tipo_meta` es `META_PRODUCTO` o `META_GESTION` y trae `compromiso_pas_codigo`, el motor busca en `seguimiento.compromisos_pas` (o catálogo canónico) y **autocompleta automáticamente**:
       - `columna_d_programa`: Línea estratégica / programa del Plan Indicativo.
       - `columna_e_meta_producto`: Descripción y meta cuatrienal del Plan Indicativo.
     - Si `tipo_meta == "ACTIVIDAD"`, aplica la exención de la Pág. 11 del Instructivo DNP (*"En el caso de seleccionar como tipo de meta actividad no será obligatorio diligenciar programación de metas de producto o gestión, se pasa al paso 4"*).
  2. **Validación Lingüística de Verbos Fuertes DNP (Regla Pág. 12):**
     - Verifica que `descripcion_actividad` inicie con verbo fuerte en infinitivo (`-ar`, `-er`, `-ir`) y no use ninguno de los 16 verbos débiles prohibidos. Si detecta un verbo débil, propone automáticamente la **redacción corregida sugerida** reemplazando el verbo débil por el primer verbo fuerte recomendado según `tipo_actividad`!
  3. **Validación Presupuestal y de Fuentes (Regla Pág. 13):**
     - Verifica coherencia entre `categoria_recursos` y `fuente_financiacion`:
       - `INVERSION` ↔ `RECURSOS_PROPIOS`, `SGP`, `REGALIAS`, `CREDITO`, `COFINANCIACION`, `OTROS`.
       - `FUNCIONAMIENTO` ↔ `GASTOS_PERSONAL`, `GASTOS_GENERALES`, `TRANSFERENCIAS`.
       - `RECURSOS_GESTION` ↔ `GESTION_NO_PRESUPUESTAL` (donde `monto_programado_cop` puede ser `0`).
  4. **Cálculo de Avance Físico, Ejecución Financiera y Semáforo de Desfase:**
     - Calcula `avance_fisico = round((avance_t1 + avance_t2 + avance_t3 + avance_t4) / 4, 2)` (o promedio de trimestres reportados).
     - Calcula `ejecucion_financiera = round((monto_ejecutado_cop / monto_programado_cop) * 100, 2)` si `monto_programado_cop > 0` else `100.0`.
     - Detecta **Alerta de Desfase Físico-Financiero** si la diferencia entre `avance_fisico` y `ejecucion_financiera` supera 25 puntos porcentuales.
  5. **Puntaje y Dictamen Global para Consejo de Gobierno (Art. 41 Ley 152/94):**
     - Devuelve `ProcesarLotePlanAccionRespuesta` con:
       - `total_filas_procesadas`, `filas_conformes_dnp`, `filas_con_observaciones`, `puntaje_calidad_dnp` (`0–100%`), `estado_dictamen_planeacion` (`APTO_CONSEJO_GOBIERNO` si 100% conformes, o `REQUIERE_SUBSANACION_PREVIA` si hay verbos débiles o incoherencias), `monto_total_programado_cop`, `monto_total_ejecutado_cop` y el arreglo detallado `filas_procesadas` (con `hallazgos`, `redaccion_corregida_sugerida`, `columna_d_programa`, `columna_e_meta_producto`, `avance_fisico`, `ejecucion_financiera`, `alerta_desfase`).

### Paso 2: Nueva Vista Interactiva en `MotorPlanAccionTab` (`src/features/seguimiento/components/motor-plan-accion-tab.tsx`)
Añadir en el conmutador de vistas de `MotorPlanAccionTab` una cuarta vista protagonista:
- **`procesador_lote`: «Procesador Masivo y Auditor DNP (Hoja 2 PI → Hoja 1 PA)»**:
  1. **Botón «Cargar Lote de Prueba con Casos Reales y Hallazgos DNP»** + soporte para subir archivo `.csv` / `.json` o editar el lote en vivo:
     - El lote de demostración precargado debe incluir **6 filas mixtas** (4 actividades 100% conformes y 2 actividades con errores típicos que el DNP rechaza en la vida real: por ejemplo, una que empieza con el verbo débil prohibido *"Fortalecer los frentes de seguridad..."* y otra con *"Garantizar la convivencia..."* o incoherencia de fuente de financiación), para que el usuario vea en acción cómo el **Motor de Procesamiento DNP**:
       - Cruza automáticamente el código `PAS-*` con la **Hoja 2 (`Plan_Indicativo`)** trayendo `Columna D (Programa)` y `Columna E (Meta de Producto)`.
       - Detecta en rojo los verbos débiles prohibidos (*"Fortalecer"*, *"Garantizar"*) y ofrece un botón **«Aplicar Corrección Automática DNP»** que transforma en 1 clic los verbos débiles en verbos fuertes en infinitivo (*"Ejecutar..."*, *"Verificar..."*) y vuelve a procesar el lote hasta alcanzar **100% Puntaje de Calidad DNP — `APTO_CONSEJO_GOBIERNO`**.
  2. **Ficha Oficial de Publicación Web Ley 1474 de 2011 (Art. 74 — Corte 31 de Enero):**
     - En `MotorPlanAccionTab`, incluir una tarjeta/sección desplegable o vista de **Certificado de Publicación Anual Ley 1474 de 2011 (Art. 74) y Decreto 2482 de 2012** que consolida por Dependencia Responsable: Objetivos, Estrategias, Proyectos BPIM, Metas de Producto/Gestión, Distribución Presupuestal por Fuente e Indicadores de Gestión, con botón de descarga inmediata.

### Paso 3: Cobertura en Storybook (`src/app/_stories/plataforma-interna.stories.tsx`) y Pruebas Unitarias
1. En `src/app/_stories/plataforma-interna.stories.tsx`:
   - Verificar que la historia existente de `Seguimiento` (o una nueva historia `SeguimientoMotorPlanAccionDNP`) renderice `/plataforma/seguimiento`, permita navegar a las pestañas **«Motor Plan de Acción (DNP / SisPT)»** y **«Banco de Conocimiento DNP»** y pase la auditoría de accesibilidad `axe-core` con **0 violaciones**.
2. En `backend/tests/test_motor_plan_accion_dnp.py` y `src/features/seguimiento/components/motor-plan-accion.test.tsx`:
   - Añadir pruebas para `POST /api/v1/compromisos/plan-accion/procesar-lote`, verificando:
     - El autocompletado automático de `Columna D (Programa)` y `Columna E (Meta de Producto)` desde la Hoja 2 `Plan_Indicativo`.
     - La exención de Paso 3 cuando `tipo_meta == "ACTIVIDAD"`.
     - La detección de verbos débiles en un lote y la generación de `redaccion_corregida_sugerida`.
     - La transición de `REQUIERE_SUBSANACION_PREVIA` a `APTO_CONSEJO_GOBIERNO` cuando se corrigen los hallazgos.

---

## 3. Puertas de Calidad Obligatorias (Quality Gates)

1. `pytest`: `/root/polis/venv/bin/pytest backend/tests/test_motor_plan_accion_dnp.py backend/tests/test_access_policy.py` (100% en verde).
2. `bun test`: Todas las pruebas unitarias del frontend en verde (`0 fail`).
3. `bun run check`: `ui:check`, `tsc --noEmit` y `eslint .` con **0 errores**.
4. `bun run ui:test`: Todas las historias de Storybook (incluyendo la nueva cobertura de Motor Plan de Acción DNP) al **100% en verde** con `axe-core`.
5. `bun run build`, copia de assets a `.next/standalone`, reinicio de `polis-backend` y `polis-frontend`.
6. Censo de `bd_csh` intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12.280` hurtos y `12` actividades en `seguimiento.actividades_plan_accion`).
7. Commit local en `main` (Zero-Push) y reporte en `bridge/02_resultado_agy2.md`.
