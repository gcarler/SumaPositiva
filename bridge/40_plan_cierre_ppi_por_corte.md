# Plan de cierre · Comparador y consulta PPI por corte

Fecha: 2026-10-23. Responsables: Codex (coordinación, integración y revisión)
y Ollamacodex (comparador y pruebas propias). Autorizado por el usuario.

## Objetivo

Cerrar las brechas reales de OL03, comparar los ocho planes del corte y
conectar la consulta PPI al mismo corte que su catálogo. Conservar importes
exactos, evidencia verificable y límites de comparabilidad financiera.

## Referencia de partida

- Corte: e5aea3ea-86e8-486e-9c56-2dfe6e250455.
- Inventario: 5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c.
- PPI: ae3352f1a69577c5ed6e48d5443796194b08125e52177aa1c246bd59e3ec157e.
- Catálogo: 0ccf1867a4dedb045a627a5da0e9b3cd553f9b1d8819e74f92daaf1f1ace5c11.
- Última puerta histórica: 1043 passed, 16 skipped; no acredita nuevos cambios.
- Sin frontend, escrituras SQL productivas, despliegue, commit o push.

## Tareas y aceptación

| ID | Responsable | Tarea | Dependencia | Evidencia de aceptación | Estado actual |
| --- | --- | --- | --- | --- | --- |
| PPI-01 | Ollamacodex | Corregir comparador y cubrir todos los criterios 38, sin pruebas tautológicas | — | Casos con datos distintos, aserciones útiles, tipos anidados, protección de archivos; Ruff y pytest dirigido | Completado con correcciones de coordinación; entregas39/42 |
| PPI-02 | Codex | Revisar código y aserciones, reproducir pruebas y corregir defectos restantes | PPI-01 | Matriz criterio/test/resultado y SHA; sin aceptación por número de tests | Aceptado técnicamente con evidencia42 y revisión43 |
| PPI-03 | Codex | Ejecutar comparador en los ocho planes del corte sin SQL | PPI-02 | JSON inmutable con cobertura completa, diferencias y precisión no verificable separadas | Completado: 8 planes /1573 nodos /4637 metas, sin SQL |
| PPI-04 | Codex | Añadir referencia PPI opcional al contexto y al grafo; tool financiera por corte | PPI-02 | Lectura por SHA/inventario, coherencia con catálogo, sin SQL ni float en esa ruta, sin modificar ruta viva existente | Integrado como referencia opcional y consulta local, sin activar endpoint/supervisor |
| PPI-05 | Codex | Probar integración y ejecución local de Agent financiero sin SQL/proveedor externo | PPI-04 | Pruebas de importes, filtros, referencias alteradas/ajenas, 2020, IPC, clasificación ausente y cobertura | Dirigidas y suite integral pasan; ejecución local repetible |
| PPI-06 | Codex | Repetir Ruff y backend:check con ambos agentes congelados | PPI-03/PPI-05 | Código sin cambios durante suite, solo polis_test*, SHA de artefactos íntegros, skips con causa | Exit0:1077 passed /16 skipped /0 failed; hashes íntegros |
| PPI-07 | Codex | Actualizar seguimiento, dictamen de coordinación y siguiente tarea | PPI-06 | Informe con alcance aceptado, límites, referencias y pendientes | Completado: informe42 y seguimiento11 actualizados |

## Contrato de integración

- Si se proporciona PPI, requiere corte y catálogo del mismo inventario.
- Se comprueban base, planes, IDs, padres, niveles y cobertura de metas/nodos.
- Una referencia inválida falla; no recurre silenciosamente a SQL vivo.
- La tool PPI congelada conserva los Numeric como cadenas decimales exactas
  y JSONB como texto crudo, diferenciando SQL NULL y JSON null.
- No agrega presupuestos de distintos niveles jerárquicos, ni deriva pesos
  7D, ni produce rankings financieros. Los totales constantes crudos no
  acreditan IPC versionado ni comparabilidad.
- Conserva el bloqueo del PPI 2020 y de IPC incompleto 2024–2027/PDL. Valores
  crudos y valores utilizables se distinguen expresamente.
- La consulta PPI offline se podrá ejecutar con Agent local; el grafo completo
  declara qué otras herramientas continúan usando SQL. Sin endpoint nuevo.

## Coordinación

Ollamacodex modifica exclusivamente sus tres Python del comparador. Codex
modifica agentes_inteligentes_pdd.py y pruebas de integración separadas.
Pruebas dirigidas por turnos en polis_test_orq_v5_20261022. No compartir
ventana con otra suite ni cambiar código durante backend:check. Notificación
tmux solo se considera enviada al confirmar que el destinatario la recibió.

## Pendientes que no se cierran mediante pruebas

Conciliación oficial de los tres totales PPI 2020; IPC anual completo y
versionado; homologación de clasificación SH legada; acreditación documental
de vínculos y revisión humana/licencias. Todo continúa no_publicable.

## Cierre técnico

Las siete tareas se completaron en el alcance de este plan. La entrega39
fue ampliada/corregida por Codex; la aceptación corresponde a la instantánea
validada en42, no a declaraciones previas de cobertura. El corte sigue
ámbar/no_publicable por pendientes financieros/documentales externos.
La consulta PPI por corte es opcional y la función offline se ejecutó; no
se activó un endpoint ni un nodo del supervisor. No se cierra el plan global.
