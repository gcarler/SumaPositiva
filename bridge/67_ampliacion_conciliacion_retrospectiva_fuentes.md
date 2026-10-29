# OL-FUENTES-02-R1 · Conciliación retrospectiva entre fuentes

24 de octubre de 2026. Ampliación del usuario durante la revisión 66.

## Requerimiento

El mismo fenómeno puede aparecer en varias fuentes. El usuario propone comparar homicidios entre Medicina Legal, Fiscalía y Policía, estudiar coincidencias/diferencias y retroalimentar el conocimiento de cómo reporta cada fuente. Es un caso de diseño: no se han examinado nuevos datos aquí ni se afirman universos equivalentes.

Integrar este criterio en el contrato del ciclo de la entrega 65, manteniendo sus cuatro archivos como único ámbito de escritura. No cambiar capturas, datos o código ni ejecutar análisis reales.

## Condiciones de diseño

1. Mantener cada observación original con fuente, producto, versión, consulta, fechas de extracción/publicación/corte y referencias a evidencia. Separar fecha de ocurrencia, registro y actualización cuando existan. No sobrescribir valores originales con el conciliado.
2. Antes de comparar, comprobar definición del indicador, unidad de observación, universo, población, localización relevante (por ejemplo ocurrencia/registro), granularidad, cobertura, periodo, provisionalidad y revisiones. El nombre «homicidio» no prueba que tres tablas cuenten la misma cosa. «Procesos», «víctimas», «eventos» y «dictámenes» no se equiparan sin evidencia.
3. Construir correspondencias explícitas con estado: comparable, comparable con ajustes documentados, parcialmente comparable, no comparable o pendiente. Los ajustes deben ser reversibles, trazables y metodológicamente justificados. Una tabla agregada solo permite comparar agregados compatibles: no acredita coincidencia de casos individuales.
4. Generar series de contraste conservando las series originales separadas; calcular coincidencias, diferencias y cambios de revisión solo sobre celdas comparables. No inventar año, cero, población, correspondencia individual ni desagregación geográfica por ausencia de dato. La falta de cobertura no es discrepancia cuantitativa.
5. Clasificar explicaciones: documentada por la fuente, verificada en evidencia, hipótesis pendiente o sin explicación. El motor puede detectar patrones; el agente puede proponer hipótesis, pero no declarar que un desfase se debe a subregistro o a una causa institucional sin comprobarlo.
6. El resultado de armonización puede ser una serie común justificada o un diagnóstico de diferencias sin serie única. No promediar, elegir por mayoría, seleccionar el máximo o declarar «fuente verdadera» automáticamente. Si se elige una cifra de referencia para un indicador de política, registrar regla metodológica explícita, responsable y vigencia; preservar el contraste.
7. Permitir reconstrucción retrospectiva: qué se conocía en cada corte, qué cambió en una nueva versión y qué partes no pueden reconstruirse por falta de versiones históricas. Una descarga actual no recupera automáticamente el conocimiento disponible años atrás.
8. Retroalimentar el catálogo y el perfil de cada fuente con definiciones, cobertura, retrasos/revisiones observados, conflictos y cuestiones por gestionar. No convertir hallazgos de un producto o periodo en descalificación global de una institución.

## Productos conceptuales que debe describir el contrato

- Series originales por fuente, sin pérdida.
- Matriz de comparabilidad y correspondencias justificadas.
- Serie/panel de contraste por periodo compatible, con brechas y estados.
- Expediente de conciliación: diferencias, explicaciones y evidencia, regla de selección si procede y pendientes.
- Resultado final interpretable y trazable, incluida la opción «no conciliable con la evidencia actual».

La armonización tiene una fase de diseño previa a la limpieza, una comprobación posterior sobre los datos y una revisión retrospectiva/iterativa al aparecer nuevas versiones. Mantener esta distinción en el ciclo.

Esta ampliación no autoriza nuevos archivos de salida de Ollamacodex ni otra implementación. La revisión 66 sigue vigente; documentar el requisito y sus precondiciones como propuesto, sin acreditar un motor de conciliación universal existente.
