# TAREA ACTIVA — AUD-20: AUDITORÍA DE CONFORMIDAD PLATAFORMA POLIS VS. BANCO DE CONOCIMIENTO

**Asignada a**: agy2  
**Supervisor / Auditor**: agy  
**Objetivo**: Auditar exhaustivamente la plataforma POLIS (código frontend, backend FastAPI y base de datos `bd_csh`) contrastándola contra los estándares, metodologías y taxonomías establecidos en el **Banco de Conocimiento** (`knowledge-base/` y `docs/banco-conocimiento-politica-publica.md`).

---

## Ejes Obligatorios de la Auditoría

1. **Metodología DNP / CONPES / MGA (`03_METODOLOGIA_DNP_CONPES_MGA.md`)**:
   - Verificar si las 3 fases (Diagnóstico, Alternativas, PAS/Inversión) cumplen la cadena de valor (insumos, actividades, productos, resultados e impactos).
   - Verificar si la matriz de árboles (problemas/soluciones en submesas) y el banco de alternativas cumplen el estándar MGA.
2. **Las 7 Dimensiones de Seguridad Humana ONU (`06_ARQUITECTURA_FUNCIONAL_PLATAFORMA_POLIS.md`)**:
   - Verificar en `motor_politicas.dimensiones_seguridad_humana` y en los módulos de Diagnóstico, Mesas y Aportes que las 7 dimensiones canónicas estén completas, bien tipificadas y articuladas con las metas e indicadores.
3. **Enfoques Diferenciales y Consulta Previa (`05_HERRAMIENTAS_PARTICIPATIVAS_Y_ENFOQUES_DIFERENCIALES.md`)**:
   - Verificar cómo la plataforma captura y procesa enfoques de género, étnico/afro/palenquero/indígena, niñez/adolescencia, víctimas y discapacidad en mesas, propuestas y testimonios.
   - Verificar si la bandera `es_consulta_previa` en las 12 mesas rurales/insulares activa las salvaguardas requeridas.
4. **Anclaje Territorial e Institucional de Cartagena (`11_MAPEO_DEPENDENCIAS_ALCALDIA_CARTAGENA_2026.md`, `barrios_cartagena.json`)**:
   - Verificar si los territorios en `geodatos.territorios` y los barrios cubren la división oficial de las 3 Localidades urbanas y corregimientos.
   - Verificar si las entidades responsables en mesas, metas y alternativas coinciden con las dependencias distritales oficiales de Cartagena 2026.
5. **Cadena de Custodia, Integridad e Inmutabilidad (`01_MARCO_CONSTITUCIONAL_Y_LEGAL.md`, `02_LINEA_JURISPRUDENCIAL_CORTE_CONSTITUCIONAL.md`)**:
   - Verificar que las actas comunitarias y firmas/hashes SHA-256 cumplan la inmutabilidad exigida por la Sentencia C-150 de 2015.
   - Verificar que el total de asistentes no sea manipulable manualmente y provenga exclusivamente de listas de asistencia.
6. **Sistema Presupuestal y Financiación (`07_SISTEMA_PRESUPUESTAL_Y_FINANCIACION.md`)**:
   - Verificar si las fuentes de financiamiento en `presupuesto.fuentes_financiacion` y las asignaciones presupuestales soportan FONSET, SGP y vigencias de la política 2026–2036.

---

## Formato del Entregable
Documentar los resultados en `bridge/02_resultado_agy2.md` (sección AUD-20):
- **Matriz de Conformidad**: Tabla con Eje, Referente del Banco de Conocimiento, Estado en POLIS (Cumple 100% / Parcial / Brecha), Evidencia en código/BD.
- **Hallazgos y Oportunidades de Mejora**: Detalle de vacíos metodológicos o normativos identificados con propuesta concreta de solución.
- Al terminar, comitear el informe en Git y notificar a `agy`.

## Reglas
- Auditoría de **SOLO LECTURA** (no alterar código ni base de datos durante esta fase).
- Cero `git push`.
- Respaldar cada afirmación con comandos y consultas directas en `bd_csh` o código.
