# Plan de capacidades y fuentes para múltiples políticas

Fecha: 2026-10-23. Proceso acordado con el usuario. Complementa el plan10 y
el cierre PPI40/42; no sustituye ni vuelve a declarar terminadas sus tareas.

## Objetivo

Reutilizar fuentes y capacidades comprobadas, añadir los insumos sectoriales
necesarios y desacoplar el núcleo de seguridad humana. La aceptación requiere
procesar dos políticas distintas con separación de configuración/resultados.
Una fuente compartida conserva su significado y procedencia; cada política
selecciona su interpretación. No se duplica el banco por sector ni se impone
una taxonomía SH a toda observación al ingresar.

## Decisiones vigentes

- Inventariar y verificar primero lo existente. No esperar todas las fuentes
  posibles de todos los sectores para poder generalizar.
- Diferenciar fuente conocida, archivo recibido, extracción, normalización,
  disponibilidad para una pregunta y publicación autorizada.
- Un módulo existente o una suite verde no prueba capacidad multipolítica.
- Seguridad humana permanece como primer caso. Segundo caso pendiente de
  elección del usuario: primera infancia, POT o minas y energía. El inventario
  común y el análisis de restricciones avanzan sin depender de esa elección.
- PISCC2024 es referencia especializada; sus reglas no se vuelven universales.
- Sin frontend, cambios de esquema/datos productivos, deploy, commit o push
  durante la fase inicial. No se ejecutan tests por cambios solo documentales.

## Fases y tareas

| ID | Responsable | Tarea | Depende de | Aceptación | Estado |
| --- | --- | --- | --- | --- | --- |
| MP-01 | Codex | Inventario verificable de fuentes, capas y documentos | — | Rutas/SHA, unidades, territorio, años, calidad, licencia y estados separados; faltantes no supuestos | Inventario inicial48 completado; revisión de aptitud pendiente de MP-04/05 |
| MP-02 | Ollamacodex | Inventario de motores y acoplamientos reales | — | Entradas/salidas, llamadas reales, tests identificados, restricciones, evidencia por archivo/línea | Entregado en47; revisión de coordinación pendiente |
| MP-03 | Codex | Revisar inventarios y matriz capacidad/fuente/necesidad | MP-01/02 | Clasificar reutilizable/parametrizable/especializado/faltante/sin evidencia; sin certificar por nombre | Pendiente |
| MP-04 | Usuario/Codex | Elegir y delimitar segunda política | — | Preguntas, población, territorio, horizonte, instrumentos y productos concretos | Consulta pendiente |
| MP-05 | Codex + Ollamacodex | Identificar datos compartidos y específicos del segundo caso | MP-03/04 | Cobertura real, fuentes por gestionar, adaptadores requeridos y criterios de calidad | Pendiente |
| MP-06 | Codex | Definir contratos/perfiles y plan de migración preservando funciones actuales | MP-03/05 | Dimensiones, indicadores, fuentes, reglas y herramientas versionadas por política; revisión de aislamiento | Pendiente |
| MP-07 | Codex + Ollamacodex | Desacoplar componentes compartidos con entregas acotadas | MP-06 | Validaciones de compatibilidad, contratos y persistencia; sin pérdida de evidencias | Pendiente |
| MP-08 | Codex + Ollamacodex | Añadir adaptadores/análisis sectoriales necesarios | MP-05/07 | Datos de referencia y casos positivos/negativos sin inventar fuentes o indicadores | Pendiente |
| MP-09 | Codex | Ejecutar ambos casos de extremo a extremo | MP-07/08 | Mismo núcleo, perfiles distintos, cortes reproducibles, aislamiento de cachés/checkpoints/permisos/resultados | Pendiente |
| MP-10 | Codex | Evaluar capacidad y preparar aceptación/revisión independiente | MP-09 | Evidencia medible de calidad/cobertura, límites y suite estable; publicación separada | Pendiente |

## Contrato del inventario de motores

Para cada capacidad: objetivo, archivos/funciones reales, consumidores,
entradas/unidades, salidas, precondiciones, tipo de procesamiento, fuentes,
clasificación temática implícita, reglas sectoriales, dependencias, pruebas
y última evidencia ejecutada cuando exista. Distinguir capacidad de leer un
formato de capacidad de interpretar sus datos correctamente.

Familias iniciales: adquisición/documentos; normalización/unidades; tiempo y
demografía; territorio/cartografía; indicadores/series; calidad/trazabilidad;
planeación y vínculos; finanzas/IPC; estadística/DEA; análisis espacial y
predictivo; agentes/supervisor; ciclo de política y gobernanza.

## Contrato del inventario de fuentes

No llamar a 43 claves de serie 43 instituciones independientes. Registrar
la cobertura disponible y sus límites; el inventario numérico no representa
por sí solo la totalidad de documentos, capas o bases disponibles. Una ruta
incluida debe conservar SHA o registrarse como alterada/ausente. Una URL
conocida no se acredita descargada ni actualizable sin evidencia.

Los posibles usos en otras políticas son hipótesis de reutilización sujetas
a revisión de significado, unidad y cobertura; no equivalencias automáticas.
Los faltantes de minas/energía o POT son por pregunta y dato específico,
no se infieren exclusivamente de nombres de archivo o institución.

## Puntos de atención ya observados

- Constructor de líneas: dimensión SH obligatoria.
- ObservacionAgregada: clasificación7D incorporada al contrato de ingreso.
- Ciclo de política: estructura reutilizable con supuestos/defaults SH.
- Agente fiscal: canastas/porcentajes por reglas de sector que requieren revisión.
- Motor PPI por corte: verificado para planes de desarrollo, no para cualquier
  instrumento ni para atribución causal o comparabilidad financiera.
- SAT operativo y siete dimensiones PNUD/PISCC no son taxonomías idénticas.

## Coordinación

Ollamacodex trabaja ahora solo en informe47, sin modificar Python ni datos.
Codex revisa fuentes y consolida resultados48. Nuevos cambios de aplicación
se delimitan después de los inventarios y del caso de prueba. Las suites se
coordinarán en bases polis_test* y con código congelado; conservar cambios
ajenos y evidencia histórica. Este plan no declara listo el banco global ni
la plataforma multipolítica.

## Avance MP-01 · primera revisión local

Informe y JSON: `bridge/48_inventario_fuentes_multipolitica.md` y `.json`.
43 claves de serie /2.340 filas, 1.829 artefactos íntegros, 14 capas en el
inventario cartográfico consultado. Los 43 registros conservan licencia
por verificar y promoción pendiente; no se acredita actualización de APIs
en este ciclo ni aptitud de todas las fuentes para otro sector.

Ejemplo concreto de reutilización a evaluar: ICBF RPC registra 230 filas y
un conjunto de indicadores de salud, educación, protección y servicios;
ICBF primera infancia aporta seis filas del año2025. Eso no equivale a una
serie completa ni permite mezclar beneficiarios/oferta con resultados. Los
datos municipales/estaciones no se desagregan automáticamente por UCG.

No se ejecutaron pruebas ni se modificó aplicación o banco de datos. La
selección del segundo caso sigue pendiente; no se interpreta el silencio
como elección ni se inicia una migración sectorial por suposición.

## Continuación autorizada: fuentes por política

El usuario autorizó avanzar en la selección del banco y fuentes adicionales
para cada política. Ver `bridge/50_plan_fuentes_por_politica.md`, tareas FP-01
a FP-10. Se implementó un planificador independiente de 7D y una CLI explícita;
los resultados iniciales están en51 y la entrega en52. Este avance no cierra
MP-03/04/09 ni activa automáticamente adquisiciones o motores.
