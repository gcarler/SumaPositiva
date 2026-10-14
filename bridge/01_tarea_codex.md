# ORDEN DE EJECUCIÓN BACKEND (`codex`) — `[TRIADA-BACKEND-INTELIGENCIA-6M-06]`

- **Fecha:** 2026-10-14
- **Coordinador / Auditor Forense EAF:** `agy` (`=agy:0.0`)
- **Ejecutor Backend:** `codex` (`=codex:0.0`)
- **Plan Maestro de referencia:** `bridge/00_plan_maestro_inteligencia_triada.md`
- **Rama:** `main` (commit local exclusivo de tus archivos; **PROHIBIDO `git push`**; **NO tocar archivos en `src/` ni `bridge/01_tarea_activa.md` ni `bridge/02_resultado_agy2.md` porque `agy2` trabaja en paralelo en el frontend**).

---

## 1. Objetivo

Implementar en el Backend el **Motor de Inteligencia Forense de 6 Lecturas Analíticas** (`backend/app/modules/compromisos/inteligencia_triada_service.py`) operando en vivo sobre los **`217.740` registros saneados** en `seguimiento.registros_triada_normalizados`, los **`616` archivos** en `seguimiento.archivos_plan_ingeridos`, los **`12.280` hurtos** en `geodatos.estadisticas_hurtos` y las **`33` mesas** en `mesas_trabajo.mesas` (base canónica `bd_csh`), y exponer sus endpoints REST en `backend/app/modules/compromisos/router.py`.

---

## 2. Archivos de tu Dominio Exclusivo

1. `backend/app/modules/compromisos/inteligencia_triada_service.py` *(nuevo — clase `InteligenciaTriadaService(session: AsyncSession)`)*
2. `backend/app/modules/compromisos/router.py` *(agregar los 7 endpoints bajo `/triada/inteligencia/...`)*
3. `backend/app/modules/compromisos/schemas.py` *(opcional si requieres esquemas auxiliares)*
4. `backend/tests/test_inteligencia_triada.py` *(nuevo — pruebas integrales de los 6 motores y sus endpoints)*
5. `bridge/02_entrega_codex.md` *(reporte de entrega con hallazgos reales extraídos de `bd_csh`)*

---

## 3. Especificación Exacta de los 6 Motores y sus Endpoints en `router.py`

> **IMPORTANTE:** Todos los cálculos agregados sobre `seguimiento.registros_triada_normalizados` deben excluir por defecto los 5 archivos marcados con `alerta_calidad == "CONTENIDO_IDENTICO_OTRO_CORTE"` (salvo en el Motor 3 donde justamente se reportan como hallazgo de auditoría).

### Motor 1: Detector Forense de Efecto Espejismo y Patologías DNP
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/patologias-dnp`
- **Query params opcionales:** `vigencia: int | None = None`, `periodo: str | None = None`, `dimension: str | None = None`, `entidad: str | None = None`
- **Contrato JSON de respuesta:**
  - `resumen_global`:
    - `total_actividades_evaluadas`: int
    - `actividades_verbo_fuerte`: int
    - `actividades_verbo_debil`: int
    - `porcentaje_formulacion_fuerte_dnp`: float
    - `total_alertas_espejismo`: int *(entidades/líneas donde el promedio de `avance_fisico_pct` en `PLAN_ACCION` >= 75% o predominan verbos débiles >= 60%, mientras el `avance_estrategico_pct` en `PLAN_DESARROLLO` <= 35%)*
    - `total_alertas_sobreejecucion_financiera`: int *(registros o proyectos BPIM donde ejecución financiera `obligaciones_cop / apropiacion_definitiva_cop` o `pagos_tesoreria_cop / apropiacion_definitiva_cop` >= 75% pero avance físico/estratégico <= 35%)*
    - `total_alertas_cuello_botella_contractual`: int *(registros en `INVERSION_PRESUPUESTAL` con `apropiacion_definitiva_cop > 0` y `obligaciones_cop == 0` y `pagos_tesoreria_cop == 0`)*
  - `ranking_entidades_dnp`: lista ordenada de las 30 entidades canónicas con:
    - `entidad`: str
    - `indice_calidad_dnp_100`: float *(score 0..100 ponderando % de verbos fuertes DNP en `PLAN_ACCION`, % de registros con código BPIM o meta PDD trazable y coherencia físico-financiera)*
    - `actividades_verbo_fuerte`: int
    - `actividades_verbo_debil`: int
    - `porcentaje_verbo_fuerte`: float
    - `avance_estrategico_promedio_pct`: float
    - `avance_operativo_promedio_pct`: float
    - `apropiacion_total_cop`: float
    - `pagos_total_cop`: float
    - `patologia_predominante`: `"SALUDABLE"` | `"ESPEJISMO_OPERATIVO"` | `"FORMULACION_DEBIL_DNP"` | `"CUELLO_BOTELLA_PRESUPUESTAL"` | `"DESACOPLE_FISICO_FINANCIERO"`
  - `casos_criticos`: lista (top 25) de hallazgos concretos con `tipo_patologia`, `entidad`, `vigencia`, `codigo_bpim`, `codigo_meta_pdd`, `descripcion`, `avance_estrategico_pct`, `avance_fisico_pct`, `apropiacion_cop`, `pagos_cop`.

### Motor 2: ADN de Continuidad vs. Ruptura entre los 3 Gobiernos (`2016–2026`)
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/continuidad-gobiernos`
- **Query params opcionales:** `dimension: str | None = None`, `entidad: str | None = None`
- **Contrato JSON de respuesta:**
  - `comparativa_periodos`: diccionario o lista para `ANTES_2020`, `2020_2023`, `2024_2027` con `archivos_unicos`, `total_registros`, `entidades_activas`, `bpims_unicos`, `metas_unicas`, `apropiacion_total_cop`, `registros_por_motor`.
  - `continuidad_bpim`:
    - `total_bpims_historicos`: int
    - `bpims_en_multiples_periodos`: int *(proyectos BPIM que sobreviven en >= 2 periodos de gobierno)*
    - `bpims_huerfanos_un_solo_periodo`: int
    - `tasa_continuidad_institucional_pct`: float
    - `proyectos_continuos_destacados`: lista (top 20) con `codigo_bpim`, `entidades`, `periodos`, `vigencias`, `total_registros`, `apropiacion_acumulada_cop`.
  - `migracion_dimensiones_seguridad`: lista de las 8 Dimensiones de Seguridad Humana con su peso (`registros` y `participacion_pct` dentro de cada periodo `ANTES_2020`, `2020_2023`, `2024_2027`) y `tendencia` (`"CRECIENTE"`, `"ESTABLE"`, `"DECRECIENTE"`).
  - `metas_recicladas`: lista (top 20) de indicadores/metas que aparecen en distintos periodos de gobierno para la misma entidad con texto normalizado idéntico o muy similar (`entidad`, `texto_meta_o_indicador`, `periodos_detectados`, `vigencias`, `avance_promedio_por_periodo`).

### Motor 3: Radar de Inercia, Copy-Paste Trimestral y Matriz de Transparencia
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/radar-transparencia`
- **Query params opcionales:** `entidad: str | None = None`, `vigencia: int | None = None`
- **Contrato JSON de respuesta:**
  - `archivos_corte_clonado`: lista detallada de los archivos con `alerta_calidad == "CONTENIDO_IDENTICO_OTRO_CORTE"` (`nombre_archivo`, `entidad`, `vigencia`, `corte_periodo`, `corte_clonado_de`, `filas_extraidas`, `huella_tabular_sha256`).
  - `clones_tabulares_mismo_corte`: lista de archivos que absorbieron `clones_tabulares_fusionados`.
  - `metas_congeladas_zombies`: lista (top 25) de metas/actividades que en una misma vigencia tienen >= 2 cortes trimestrales distintos (`T1`, `T2`, `T3`, `T4`) con exactamente el mismo valor de avance `> 0` o `== 0` sin variación.
  - `efecto_diciembre_magico`: lista (top 25) de entidades/vigencias donde el avance promedio en `T4`/`ANUAL` salta abruptamente (`>= 50` puntos porcentuales) respecto a `T1..T3`.
  - `matriz_completitud_entidades`: lista de las 30 entidades oficiales con su cobertura año por año (`2016` a `2026`: número de archivos y cortes reportados por año, `anios_con_reporte`, `anios_sin_reporte`, `indice_transparencia_pct`).

### Motor 4: Cruce Geoespacial — Inversión Pública vs. Delito y Demanda Ciudadana en Territorio
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/alineacion-territorial`
- **Lógica:**
  - Analizar los `217.740` registros de `seguimiento.registros_triada_normalizados` para asociar cada registro territorializable a las **3 Localidades oficiales de Cartagena**:
    1. `Localidad 1 - Histórica y del Caribe Norte` *(incluye registros cuya `entidad_normalizada == 'Alcaldía Local Histórica y del Caribe Norte'` + registros cuyo texto en `descripcion_actividad`, `indicador`, `linea_estrategica` menciona `"localidad 1"`, `"historica y del caribe norte"`, `"lhcn"`, `"bocagrande"`, `"getsemani"`, `"centro historico"`, `"manga"`, `"crespo"`, `"pie de la popa"`, `"santa rita"`, `"canapote"`, `"daniel lemaitre"`, `"torices"`, `"el bosque"`, `"barrio chino"`, `"martinez martelo"`, `"tierra bomba"`, `"barú"`, `"baru"`, `"islas del rosario"`, `"bocachica"`)*
    2. `Localidad 2 - De la Virgen y Turística` *(incluye `entidad_normalizada == 'Alcaldía Local de la Virgen y Turística'` + menciones a `"localidad 2"`, `"virgen y turistica"`, `"olaya"`, `"olaya herrera"`, `"la boquilla"`, `"chiquinquira"`, `"el pozon"`, `"pozon"`, `"boston"`, `"la candelaria"`, `"la esperanza"`, `"alcibia"`, `"tesca"`, `"villa estrella"`, `"bayunca"`, `"pontezuela"`, `"punta canoa"`, `"arroyo de piedra"`, `"arroyo grande"`, `"las palmeras"`, `"fredonia"`, `"nuevo paraiso"`)*
    3. `Localidad 3 - Industrial y de la Bahía` *(incluye `entidad_normalizada == 'Alcaldía Local Industrial y de la Bahía'` + menciones a `"localidad 3"`, `"industrial y de la bahia"`, `"mamonal"`, `"pasacaballos"`, `"albornoz"`, `"arroz barato"`, `"puerta de hierro"`, `"policarpa"`, `"nelson mandela"`, `"el recreo"`, `"la concepcion"`, `"ternenera"`, `"san jose de los campanos"`, `"providencia"`, `"blas de lezo"`, `"el carmelo"`, `"el socorro"`, `"vista hermosa"`, `"santa clara"`, `"ceballos"`, `"bellavista"`, `"membrillal"`)*
  - Cruzar contra:
    - `geodatos.estadisticas_hurtos` (`12.280` filas / `SUM(cantidad)` hurtos reales en `bd_csh`) y `geodatos.territorios` / `mesas_trabajo.mesas` (`33` mesas ciudadanas reales en `bd_csh`).
  - **Contrato JSON de respuesta:**
    - `resumen_territorial`: `total_hurtos_bd`, `total_mesas_trabajo_bd`, `total_registros_triada_territorializados`, `apropiacion_territorializada_cop`.
    - `localidades`: lista de las 3 Localidades con `localidad`, `registros_triada`, `actividades_plan_accion`, `metas_pdd`, `apropiacion_cop`, `pagos_cop`, `mesas_ciudadanas`, `asistentes_mesas`, `proporcion_inversion_pct`, `proporcion_demanda_ciudadana_pct`, `brecha_desalineacion_pct`, `estado_alineacion` (`"ALINEADO"`, `"SUBINVERSION_MODERADA"`, `"DEFICIT_CRITICO_ATENCION"`), `barrios_mencionados_top`.
    - `barrios_foco`: lista (top 20) de barrios/corregimientos detectados en los Planes de Acción con su conteo de actividades, entidades que intervienen y presupuesto asociado.

### Motor 5: Buscador Semántico Transversal e Inspector de Duplicidad Institucional
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/buscador`
- **Query params:** `q: str = Query(default="seguridad", min_length=2)`, `vigencia: int | None = None`, `periodo: str | None = None`, `dimension: str | None = None`, `motor: str | None = None`, `limite: int = Query(default=50, ge=1, le=200)`
- **Contrato JSON de respuesta:**
  - `consulta`: `q`, filtros aplicados.
  - `total_coincidencias`: int *(total real en `bd_csh` donde `descripcion_actividad`, `indicador`, `linea_estrategica`, `programa` o `codigo_bpim` coinciden con los términos de `q`)*
  - `presupuesto_asociado`: `apropiacion_total_cop`, `obligaciones_total_cop`, `pagos_total_cop`.
  - `entidades_involucradas`: lista con `entidad`, `registros`, `apropiacion_cop`, `pagos_cop`, `motores`.
  - `evolucion_anual`: diccionario `2016..2026` con conteo de registros y presupuesto para ese tema.
  - `alertas_duplicidad_institucional`: lista de casos donde **>= 2 entidades distintas** en la **misma vigencia** tienen metas/actividades sobre el tema buscado con alta superposición de términos o el mismo `codigo_bpim` / `codigo_meta_pdd` (`vigencia`, `entidades`, `tema_superpuesto`, `registros_involucrados`, `apropiacion_conjunta_cop`).
  - `muestra_registros`: lista (hasta `limite`) de registros coincidentes.

### Motor 6: Simulador Predictivo de Cierre de Gobierno (`2024–2027`)
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/simulador-cierre`
- **Query params opcionales:** `entidad: str | None = None`, `dimension: str | None = None`
- **Contrato JSON de respuesta:**
  - `horizonte`: `periodo` (`"2024_2027"`), `anios_evaluados` (`[2024, 2025, 2026]`), `anio_cierre` (`2027`), `fraccion_tiempo_transcurrido_pct` (`62.5`).
  - `resumen_prediccion`: `entidades_cumpliran`, `entidades_riesgo_moderado`, `entidades_incumplimiento_inminente`, `avance_actual_ponderado_pct`, `avance_proyectado_2027_pct`.
  - `proyecciones_por_entidad`: lista de las entidades con datos en `2024_2027` incluyendo:
    - `entidad`: str
    - `registros_2024_2027`: int
    - `avance_actual_pct`: float *(combinando avance estratégico/operativo reportado en 2024–2026 y velocidad histórica de la entidad en 2016–2023)*
    - `velocidad_anual_historica_pct`: float
    - `proyeccion_cierre_2027_pct`: float *(acotado 0..100)*
    - `probabilidad_cumplimiento_pct`: float
    - `semaforo_predictivo`: `"CUMPLIRA"` (`>= 80%`) | `"RIESGO_MODERADO"` (`50%..79.9%`) | `"INCUMPLIMIENTO_INMINENTE"` (`< 50%`)
    - `aceleracion_trimestral_requerida_pct`: float *(cuántos puntos por trimestre debe ganar en los trimestres restantes hasta dic-2027 para llegar al 100%)*
    - `apropiacion_periodo_cop`: float
  - `proyecciones_por_dimension`: lista para las 8 Dimensiones de Seguridad Humana con `dimension`, `registros_2024_2027`, `avance_actual_pct`, `proyeccion_cierre_2027_pct`, `semaforo_predictivo`.

### Endpoint Consolidado M0: Resumen Ejecutivo de los 6 Motores
- **Endpoint:** `GET /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo`
- **Contrato JSON de respuesta:** Devuelve en una sola llamada un objeto con:
  - `universo`: `total_registros_saneados`, `total_archivos_activos`, `entidades_canonicas`, `cobertura_entidad_canonica_pct`, `bpims_unicos`, `metas_pdd_unicas`.
  - `motor_1_patologias`: `resumen_global` + top 10 de `ranking_entidades_dnp` + top 10 de `casos_criticos`.
  - `motor_2_continuidad`: `comparativa_periodos` + `continuidad_bpim` + `migracion_dimensiones_seguridad` + top 10 de `metas_recicladas`.
  - `motor_3_transparencia`: `archivos_corte_clonado` + `clones_tabulares_mismo_corte` + top 10 de `matriz_completitud_entidades` + conteos de zombies y diciembre mágico.
  - `motor_4_territorial`: `resumen_territorial` + `localidades` + top 10 de `barrios_foco`.
  - `motor_5_buscador_destacado`: resultado precalculado para `q="seguridad"`.
  - `motor_6_simulador_2027`: `horizonte` + `resumen_prediccion` + top 15 de `proyecciones_por_entidad` + `proyecciones_por_dimension`.

---

## 4. Validación y Criterios de Cierre

1. Ejecutar `ruff format` y `ruff check` sobre los archivos tocados (`0` errores).
2. Crear y correr `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_inteligencia_triada.py backend/tests/test_ingesta_masiva_triada.py` (`0` fallos).
3. Reiniciar `polis-backend.service` y verificar con un script Python o `TestClient` / sesión real contra `bd_csh` que los 7 endpoints responden en `< 2` segundos con datos reales de `bd_csh`.
4. Verificar que los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos) y los `217.740` registros normalizados sigan intactos.
5. Documentar los hallazgos reales en `bridge/02_entrega_codex.md` y hacer **commit local** únicamente de tus archivos (`backend/app/modules/compromisos/inteligencia_triada_service.py`, `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/tests/test_inteligencia_triada.py`, `bridge/02_entrega_codex.md`). **PROHIBIDO `git push`.**
