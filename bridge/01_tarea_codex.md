# ORDEN DE TRABAJO EAF — `[TRIADA-BACKEND-QA-FORENSE-05]`

- **Para:** `codex` (Desarrollador Backend / Arquitectura)
- **De:** `agy` (Coordinador General / Auditor Forense EAF)
- **Prioridad:** CRÍTICA — SANEAMIENTO FORENSE DE CALIDAD DE DATOS Y DEDUPLICACIÓN SEMÁNTICA EN `bd_csh`
- **Rama:** `main` (Política Zero-Push: solo commits locales, nunca `git push`)
- **Inviolabilidad de `bd_csh`:** PROHIBIDO truncar o alterar los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos).

---

## 1. Hallazgos de la Auditoría de Calidad de Datos Ejecutada por `agy`

El usuario pidió explícitamente:
> *«por favor de todas maneras hazle calidad»*

Acabo de correr una auditoría forense SQL directa contra `seguimiento.archivos_plan_ingeridos` y `seguimiento.registros_triada_normalizados` en `bd_csh` y encontré **4 problemas reales de calidad de datos** que debemos corregir y blindar tanto en el código del parser/servicio como en los datos persistidos en `bd_csh`:

### Hallazgo 1 — Contaminación de `entidad_normalizada` con nombres de funcionarios, subdependencias, números o descripciones (`79` valores distintos en vez de las ~30 entidades oficiales del Distrito)
En muchos libros Excel de la Alcaldía, la columna `"Responsable"` o `"Dependencia Responsable"` no trae el nombre de la Secretaría sino el **nombre propio del funcionario líder** (ej. `"ROBINSON LUIS CASARRUBIA CARDONA"`, `"TANNIS ROCIO PUELLO MIRANDA"`, `"DANIEL ANTONIO VARGAS DIAZ"`, `"JULIO DE VOZ"`, `"GUILLERMO PEÑA"`, `"Clara Calderón"`, `"Frank Ricaurte Sossa"`), o el nombre de un grupo interno (`"COBERTURA"`, `"SERVIDORES"`, `"ASUNTOS PARA LA MUJER"`), o incluso números (`"100"`, `"21"`, `"34569289.33"`, `"----"`, `"N/A"`) por desplazamiento de columnas en filas específicas.
- Además, hay variantes de la misma entidad que quedaron separadas:
  - `"GEPM"` vs `"GERENCIA DE ESPACIO PÚBLICO Y MOVILIDAD"` vs `"Gerencia de Espacio Público y Movilidad"`
  - `"Secretaria del Interior y Convivencia Ciudadana"` vs `"Secretaría del Interior y Convivencia Ciudadana"`
  - `"Oficina Asesora para la Gestión del Riesgo de Desastres"` vs `"OFICINA ASESORA PARA LA GESTION DEL RIESGO DE DESASTRES"`
  - `"ALCALDÍA LOCAL DE LA VIRGEN Y TURÍSTICA"` vs `"ALCALDIA LOCAL 2 DE LA VIRGEN Y TURISTICA"`
  - `"LOCALIDAD HISTORICA Y DEL CARIBE NORTE"` vs `"Localidad Histórica y del Caribe Norte"` vs `"ALCALDÍA LHYCN"`
  - `"Alcaldia Local"` / `"UNALDE"` -> `"Alcaldía Local Industrial y de la Bahía"`
  - `"DAVD"` -> `"Departamento Administrativo de Valorización Distrital"`
- Y hay un falso positivo grave en `_inferir_entidad`: el archivo `PLAN DE ACCION 2020 VALORIZACION - AJUSTADO.xlsx` quedó con `entidad_normalizada = "Establecimiento Público Ambiental"` porque la subcadena `"epa"` hizo match dentro de `"d**epa**rtamento"` o similar (¡jamás debe buscarse `"epa"` como subcadena suelta sin límites de palabra `\bepa\b`!).

### Hallazgo 2 — Archivos Clonados con Distinto `SHA-256` pero Exactamente el Mismo Contenido Tabular (`full_content_signature`)
Aunque `hash_sha256` eliminó los `684` duplicados binarios exactos, la auditoría SQL demostró que existen **5 grupos de archivos con distinto `SHA-256`** (porque alguien en la Alcaldía abrió el Excel y lo volvió a guardar cambiando metadatos internos de Excel, o porque en `2026-T2` subieron exactamente el mismo archivo de `2026-T1` sin cambiar ni un solo número en `T1..T4` ni en pagos):
1. `SEGUIMENTO Y EVALUACI+ôN PLAN DE ACCION DADIS A 31 DE DICIEMBRE DE 2021.xls` (`hash 4a941a84` y `hash e2643403`): **mismo nombre, misma vigencia `2021`, mismo corte `ANUAL`, y las `477` filas son 100% idénticas** (solo cambió un metadato binario del `.xls`).
2. `Seguimiento y Evaluación del Plan de Accion LHCN_corte junio 2026 (1).xlsx` y `... corte Marzo 2026.xlsx` (`1.401` filas 100% idénticas en `T1..T4`).
3. `IDER-2023 MATRIZ SEGUIMIENTO DIC 31 2023 (1).xlsx` y `SEGUIENTO PLAN DE ACCIÓN IDER SEPTIEMBRE 30 2023 (1).xlsx` (`332` filas 100% idénticas).
4. `Seguimiento Alcaldía Local INDUSTRIAL DE LA BAHIA.xlsx`, `... LOCALIDAD I.B (3) con corte a Diciembre 2025 (1).xlsx` y `... corte 31 Marzo de 2026.xlsx` (`270` filas 100% idénticas).
5. `Seguimiento y Evaluación del Plan de Accion de TRANSCARIBEcon Corte a Marzo 2026 def (1).xlsx` y `... Corte a JUNIO 2026.xlsx` (`154` filas 100% idénticas).

### Hallazgo 3 — Nombres Cortos DOS 8.3 (`5SEGUI~1.xlsx`, `SEE6BE~1.xlsx`, `SEGUIM~1.xlsx`, `SE5AAC~1.xlsx`) y Mojibake (`ACCI+ôN`, `SECRETAR+ìA`)
En el Drive original hay archivos que fueron comprimidos en Windows con nombres cortos DOS (`5SEGUI~1.xlsx`, `SEE6BE~1.xlsx`, `SEGUIM~1.xlsx`, `SE5AAC~1.xlsx`) o con mojibake (`+ô`, `+ì`). Como el nombre del archivo está truncado (`5SEGUI~1.xlsx`), la entidad no se pudo inferir del nombre del archivo y terminó tomando el nombre de un funcionario (`"Clara Calderón"`). Sin embargo, el membrete del libro o su contenido sí permite identificar la entidad real.

### Hallazgo 4 — Cruces Tripartitos Contaminados por Claves Basura (`"----"`, `"100"`, `"21"`, `"34569289.33"`)
En `GET /api/v1/compromisos/triada/resumen`, el bloque `comparativa_interanual.cruces` estaba devolviendo cruces donde `entidad` era `"----"`, `"100"`, `"21"` o `"34569289.33"` y `codigo_bpim` era `"----"`.

---

## 2. Instrucciones de Saneamiento Obligatorio

### A. Blindar el Normalizador de Entidades (`ingesta_masiva_excel.py`)
1. **Regla de oro para `entidad_normalizada`:**
   - Crea un catálogo cerrado y exhaustivo de las **Entidades Oficiales del Distrito de Cartagena** (`ENTIDADES_CANONICAS_CARTAGENA`, incluyendo las 27 secretarías/institutos/departamentos administrativos + las 3 Alcaldías Locales: `Alcaldía Local Histórica y del Caribe Norte`, `Alcaldía Local de la Virgen y Turística`, `Alcaldía Local Industrial y de la Bahía`, + `Escuela Taller Cartagena de Indias`, + `Alcaldía Mayor de Cartagena`).
   - Usa expresiones regulares con **límites de palabra (`\b`)** para siglas cortas (`\bepa\b`, `\bider\b`, `\bipcc\b`, `\bdatt\b`, `\bdadis\b`, `\bsicc\b`, `\boagrd?\b`, `\bgepm\b`, `\bdavd\b`, `\begl\b`, `\bsed\b`, `\bspd\b`, `\bumata\b`, `\blhcn\b`, `\blhycn\b`) para que `"epa"` **NUNCA** haga match dentro de `"departamento"` o `"reparación"`.
   - **Prioridad de inferencia de entidad:**
     1. Si el **nombre del archivo** (o las celdas de membrete superior de la hoja, filas 1 a 10) identifica claramente una de las Entidades Oficiales del Distrito (ej. `ESCUELA DE GOBIERNO`, `GESTION DE RIESGO`, `SECRETARIA DE PARTICIPACION`, `TURISMO`, `EDUCACION`, `VALORIZACION`, `ESPACIO PUBLICO`, `SICC`), esa **Entidad Oficial del libro** es la entidad titular (`entidad_libro`).
     2. Cuando leas la columna `entidad` de cada fila: si el valor de la celda coincide con una Entidad Oficial (como ocurre en la `Matriz de seguimiento PDD 2024 - 2027.xlsx`, donde cada fila tiene `DADIS`, `DISTRITO`, `SECRETARÍA DE EDUCACIÓN`, etc.), usa esa Entidad Oficial normalizada.
     3. **Si el valor de la celda NO es una Entidad Oficial** (por ejemplo, es el nombre de un funcionario como `"ROBINSON LUIS CASARRUBIA CARDONA"`, una dependencia interna como `"COBERTURA"` o `"SERVIDORES"`, un número `"100"`, `"34569289.33"`, o un placeholder `"----"`, `"N/A"`, `"ND"`): **NO uses ese texto como `entidad_normalizada`**; usa `entidad_libro` (y guarda el texto del funcionario/área en `datos_origen["_responsable_celda"]`). Si ni la fila ni el libro tienen una entidad válida reconocida, deja `entidad_normalizada = None`.

### B. Deduplicación Tabular Semántica (`huella_contenido_sha256`) y Auditoría de Calidad
1. **Huella de contenido tabular (`huella_tabular_sha256`):**
   - Además del `hash_sha256` de los bytes del archivo, calcula en `ingesta_masiva_excel.py` una **huella SHA-256 del contenido tabular normalizado** del libro (`huella_tabular`: hash de las filas extraídas ordenadas por hoja, fila, motor, actividad, indicador y valores numéricos) y guárdala en `ArchivoPlanIngerido.metadatos["huella_tabular_sha256"]`.
   - Si entran dos archivos con distinto `hash_sha256` binario pero **idéntica `huella_tabular_sha256` y misma `(entidad_normalizada, vigencia, corte_periodo)`** (como los dos `.xls` de `DADIS 2021` `4a941a84` y `e2643403`), deduplica el segundo fusionando sus etiquetas de dimensión/rutas sobre el primero y eliminando las filas duplicadas.
   - Si dos archivos de **distinto corte** (p. ej. `Marzo 2026` y `Junio 2026` de `LHCN` o `Transcaribe`) tienen idéntica `huella_tabular_sha256` porque la entidad subió el mismo cuadro sin cambios, márcalos en `ArchivoPlanIngerido.metadatos["alerta_calidad"] = "CONTENIDO_IDENTICO_OTRO_CORTE"` para trazabilidad forense, y al consultar series anuales o cruces evita duplicar la misma foto cuando no se filtra por un corte específico.

### C. Blindar el Motor de Cruces Tripartitos (`triada_motores.py`)
1. En `_clave(fila)` y `cruzar_tres_lecturas`:
   - Rechaza cualquier clave donde `entidad`, `linea_estrategica` o `codigo_bpim` sea un placeholder inválido (`"-"` / `"----"` / `"n/a"` / `"na"` / `"nd"` / `"ninguno"` / `"0"` / `"sin codigo"`) o donde `entidad` sea puramente numérica (`100`, `21`, `34569289.33`).
   - Así garantizamos que **100% de los cruces tripartitos** correspondan a entidades reales, líneas estratégicas reales y códigos `BPIM/BPIN` reales.

### D. Saneamiento en Vivo de `bd_csh` y Endpoint de Reporte de Calidad
1. Ejecuta un script/comando de saneamiento sobre los registros ya cargados en `bd_csh` (o re-ejecuta la normalización/actualización sobre `seguimiento.archivos_plan_ingeridos` y `seguimiento.registros_triada_normalizados`) para que:
   - Todas las entidades en `bd_csh` queden limpias y mapeadas únicamente al catálogo oficial de entidades del Distrito (cero funcionarios, cero números, cero `"VALORIZACION -> EPA"`).
   - Se fusione y elimine cualquier duplicado exacto de `(entidad_normalizada, vigencia, corte_periodo, huella_tabular_sha256)`.
2. Incluye en `GET /api/v1/compromisos/triada/resumen` (dentro de `ingesta_masiva`) un bloque `"calidad_datos"` con las métricas reales auditadas:
   - `archivos_unicos_binarios_sha256`
   - `copias_binarias_descartadas`
   - `clones_tabulares_fusionados`
   - `archivos_con_alerta_corte_identico`
   - `entidades_oficiales_reconocidas`
   - `registros_con_entidad_canonica_pct`
3. Añade pruebas unitarias y de integración en `backend/tests/test_ingesta_masiva_triada.py` para estos 4 controles de calidad, reinicia `polis-backend.service`, verifica conteos canónicos de `bd_csh`, corre `ruff`, `pytest` y `bun test`, haz commit local en `main` y documenta el antes/después en `bridge/02_entrega_codex.md`.
