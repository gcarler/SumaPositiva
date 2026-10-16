# SOLICITUD DE REVISIÓN CRÍTICA Y SUGERENCIAS METODOLÓGICAS PARA `codex`: `[REVISION-RUTA-PDD-SEGURIDAD-HUMANA-15A]`

- **De:** `agy` (Coordinador General y Auditor Forense EAF)
- **Para:** `codex` (Arquitecto Principal Backend / Econometría / Análisis de Políticas Públicas)
- **Fecha:** 2026-10-16
- **Prioridad:** CRÍTICA INMEDIATA
- **Modo:** SOLO REVISIÓN CRÍTICA, AUDITORÍA DE DATOS Y PROPUESTA DE MEJORAS (No modificar código productivo aún; escribir dictamen y sugerencias en `bridge/02_entrega_codex.md`).

---

## 1. Contexto y Directriz Estratégica del Usuario

El usuario ha hecho una crítica metodológica profunda y totalmente acertada sobre el trabajo previo:

1. **Prohibición absoluta de analizar resultados de Mesas de Trabajo:**
   - En este momento **no se ha realizado ninguna de las 37 mesas de trabajo** con las comunidades (todas están en estado `PROGRAMADA`). Por tanto, el documento diagnóstico preliminar **NO puede contener análisis de resultados de mesas**.
2. **Congelamiento total del análisis de Planes de Acción (PA):**
   - El usuario señala con razón que aún **no tenemos una hoja de ruta ni un motor de procedimiento riguroso** que permita extraer y leer con certeza los avances y el cumplimiento de los Planes de Acción sin caer en cruces dudosos, incompletos o ruidosos. Por ende, **dejamos quietos los Planes de Acción por ahora**.
3. **Foco exclusivo en un Análisis Riguroso, Exhaustivo y Estratégico de los Planes de Desarrollo del Distrito (`5 PDD 2012–2027` + `3 PDL 2024–2027`) a la luz de la Política de Seguridad Humana:**
   El usuario pide construir primero una **Hoja de Ruta y Motor de Procedimiento** para procesar, ingerir y analizar los Planes de Desarrollo que tenemos en `/root/polis/data/planes_desarrollo/` y responder con rigor científico estas **4 grandes preguntas**:
   - **Pregunta 1:** ¿Qué contemplaba cada Plan de Desarrollo? (Arquitectura estratégica, visión, ejes/objetivos/pilares/líneas, programas y problemas priorizados).
   - **Pregunta 2:** ¿Cuál fue la apuesta a nivel de **Metas** y a nivel **Financiero / Presupuestal (PPI)** desde cada Plan de Desarrollo hacia la Política de Seguridad Humana (o hacia lo que hoy entendemos como Seguridad Humana en sus 7 dimensiones PNUD / Decreto 037 de 2026)?
   - **Pregunta 3:** ¿Qué Plan de Desarrollo fue **más frontal y más estratégico** en clave de la Política de Seguridad Humana?
   - **Pregunta 4:** Desde la **Planeación Estratégica**, ¿cómo ha sido el abordaje de los problemas de la Seguridad Humana dentro de los Planes de Desarrollo de Cartagena (`2012–2027`)?

---

## 2. Diagnóstico Preliminar que `agy` encontró en `bd_csh` y en `/root/polis/data/planes_desarrollo/`

Al inspeccionar `seguimiento.planes_desarrollo_distrital`, `seguimiento.pdd_lineas_y_programas` y `seguimiento.pdd_metas_oficiales` frente a los archivos fuente de `/root/polis/data/planes_desarrollo/`, `agy` detectó estas debilidades graves que hoy impiden un análisis riguroso:
- En **`PDD_2012_2015`** (*Campo para Todos*): solo hay `7` metas en `pdd_metas_oficiales`, `8` filas en `pdd_lineas_y_programas` (`5` ejes y `3` componentes genéricos `"Objetivos"`, `"Objetivo general"`, `"Objetivos específicos"`) y `ppi_anual_cop = {}` vacío por eje/programa, a pesar de que tenemos `/root/polis/data/planes_desarrollo/pdd_2012_2015_campo_para_todos_cdim.md` (`258 KB`) y `pdd_2012_2015_acuerdo_001_campo_para_todos.md` (`76 KB`).
- En **`PDD_2013_2015`** (*Ahora Sí Cartagena*): hay `195` metas, pero en `pdd_lineas_y_programas` solo hay `4` objetivos y `7` programas sueltos con `ppi_anual_cop = {}` vacío, a pesar de tener `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md` (`416 KB`).
- En **`PDD_2016_2019`** (*Primero la Gente*): solo hay `3` metas en `pdd_metas_oficiales` y en `pdd_lineas_y_programas` hay `59` filas donde la mayoría son basura de encabezados OCR (`"Página 1 (OCR Oficial Acuerdo 006 de 2016)"` ... `"Página 50"`), con `ppi_anual_cop = {}` vacío por línea/programa, a pesar de tener `pdd_2016_2019_acuerdo_006_primero_la_gente.pdf` (`12 MB`) y `.md` (`70 KB`).
- En **`PDD_2020_2023`** (*Salvemos Juntos a Cartagena*): hay `4` pilares, `21` líneas, `87` programas y `226` metas, y el archivo fuente `pdd_2020_2023_salvemos_juntos_cartagena.md` (`735 KB`) tiene aún más riqueza programática y tablas plurianuales.
- En **`PDD_2024_2027`** (*Cartagena, Ciudad de Derechos*): hay `6` líneas, `42` impulsores, `172` programas y `1.246` metas brutas (`973` únicas), más `pdd_2024_2027_bases_tecnicas.md` (`1 MB`) y `pdd_2024_2027_ponencia_2do_debate_pa013.md` (`1.1 MB`).
- **Falta una Taxonomía/Homologación Rigurosa hacia Seguridad Humana:** Ni las líneas/programas (`pdd_lineas_y_programas`) ni las metas (`pdd_metas_oficiales`) tienen hoy una clasificación auditada que permita distinguir entre:
  1. **Seguridad Humana Frontal / Explícita (Núcleo Directo):** Programas y metas concebidos explícitamente como Seguridad Ciudadana, Convivencia, Justicia, Derechos Humanos, Paz, Víctimas y Gestión del Riesgo.
  2. **Seguridad Humana Multidimensional / Implícita (Las 7 Dimensiones PNUD / Decreto 037 de 2026):** Cómo cada programa y meta de los 8 planes tributa a *Seguridad Personal, Comunitaria, Económica, Alimentaria, en Salud, Ambiental y Política*.

---

## 3. Propuesta de Hoja de Ruta de 4 Etapas (para tu Revisión Crítica)

`agy` propuso al usuario una Hoja de Ruta en 4 etapas:
1. **Etapa 1 — Extracción y Reconstrucción Estructural Completa de los 8 Planes de Desarrollo desde `/root/polis/data/planes_desarrollo/`:** Limpiar la basura OCR de `pdd_lineas_y_programas`, extraer la totalidad de ejes/objetivos/líneas/programas, sus presupuestos plurianuales (PPI por eje/línea/programa) y el universo completo de metas de resultado y producto de `PDD 2012–2015`, `PDD 2013–2015`, `PDD 2016–2019`, `PDD 2020–2023`, `PDD 2024–2027` y los `3 PDL`.
2. **Etapa 2 — Motor de Homologación Taxonómica hacia la Política de Seguridad Humana (Doble Nivel: Frontal vs. Multidimensional 7D):** Clasificar cada línea/programa y cada meta de los 8 planes tanto por su **Nivel de Frontalidad** (*Directa/Explícita*, *Estructural/Asociada*, *Transversal/Indirecta*, *No Asociada — Gasto Administrativos/Deuda*) como por las **7 Dimensiones PNUD / Decreto 037 de 2026**, cuantificando la apuesta en **Metas** y en **Pesos Corrientes / Constantes 2025 / % del PPI**.
3. **Etapa 3 — Evaluación de Planeación Estratégica y Respuesta a las 4 Preguntas del Usuario:** Construir métricas e indicadores de diseño estratégico (coherencia Diagnóstico → Objetivo → Meta de Resultado → Meta de Producto → Presupuesto PPI; Índice de Frontalidad y Profundidad Estratégica en Seguridad Humana por Plan; evolución del abordaje de los problemas 2012–2027).
4. **Etapa 4 — Consolidación en `Matriz_PDM` (Google Sheet) y `Analisis` (Google Doc):** Publicar un documento técnico y matriz 100% dedicados al análisis comparado de los Planes de Desarrollo en clave de Seguridad Humana (cero Planes de Acción y cero resultados de mesas).

---

## 4. Lo que necesitamos de ti (`codex`) en esta Revisión

Por favor inspecciona directamente los archivos fuente en `/root/polis/data/planes_desarrollo/` (tanto los `.md` como los `.pdf` de 2012–2015, 2013–2015, 2016–2019, 2020–2023, 2024–2027 y los 3 PDL) y el estado actual de las tablas `seguimiento.planes_desarrollo_distrital`, `seguimiento.pdd_lineas_y_programas` y `seguimiento.pdd_metas_oficiales`, y entrega en **`bridge/02_entrega_codex.md`** tu dictamen y sugerencias sobre:

1. **Diagnóstico Crítico de las Fuentes (`/root/polis/data/planes_desarrollo/`):**
   - ¿Qué información exacta (tablas de PPI por eje/línea/programa, metas de resultado/bienestar y metas de producto) está disponible en los `.md` y `.pdf` de cada uno de los 8 planes y qué nos falta extraer o volver a pasar por OCR/parser para que `PDD 2012–2015`, `PDD 2013–2015` y `PDD 2016–2019` tengan el mismo nivel de completitud que `2020–2023` y `2024–2027`?
2. **Crítica y Mejoras al Motor de Homologación en Clave de Seguridad Humana:**
   - ¿Cómo debemos diseñar la metodología de clasificación para no caer en la trampa de decir que "el 100% del Plan de Desarrollo es Seguridad Humana" (porque todo gasto social toca salud o educación), sino distinguir con rigor analítico entre:
     - **A) Apuesta Frontal / Núcleo Duro de Seguridad y Convivencia / Seguridad Humana explícita**,
     - **B) Apuesta Programática Directa en Factores Determinantes de las 7 Dimensiones (Decreto 037 de 2026)**, y
     - **C) Gasto Sectorial Inercial / Funcionamiento / Infraestructura General**?
3. **Metodología para responder las 4 Preguntas del Usuario con Rigor de Planeación Estratégica:**
   - ¿Qué dimensiones analíticas, matrices comparadas e indicadores (presupuestales, de estructura programática, de rigor de cadena de valor MGA y de enfoque territorial/poblacional) propones para evaluar **qué Plan de Desarrollo fue más frontal y más estratégico** y **cómo evolucionó el abordaje de los problemas de seguridad humana entre 2012 y 2027**?
4. **Arquitectura Propuesta para el Nuevo Esquema de Datos, `Matriz_PDM` (Google Sheet) y `Analisis` (Google Doc):**
   - ¿Qué columnas o tablas nuevas propones en `seguimiento` y qué pestañas/capítulos exactos deben tener `Matriz_PDM` y `Analisis` en esta fase enfocada 100% en Planes de Desarrollo?

Escribe tu revisión completa y propuestas en `bridge/02_entrega_codex.md`. No modifiques código de la aplicación todavía.
