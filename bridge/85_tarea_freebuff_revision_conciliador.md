# FB-CONCILIA-01 · Revisión preventiva independiente de R4

## Objetivo

Revisar de manera independiente el núcleo puro y CLI de conciliación retrospectiva OL-CONCILIA-01-R4. Trabajo distinto del motor espacial anterior; no continuar instrucciones antiguas de ese ciclo ni hacer su commit. La aceptación funcional y la integración del conciliador siguen pendientes.

## Lectura

- AGENTS.md.
- `bridge/73_tarea_ollamacodex_conciliacion_retrospectiva.md`.
- Revisiones 79, 80, 81 y 82 para comprender los criterios; contrastar siempre con el código actual, no repetir hallazgos antiguos ya corregidos.
- `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`.
- `backend/scripts/contrastar_fuentes_por_periodo.py`.
- Informe y contrato 74 actuales.

## Escrituras exclusivas

- `bridge/86_revision_freebuff_conciliacion_retrospectiva.md`.
- `bridge/86_evidencia_freebuff_conciliacion_retrospectiva.json`.

Solo informe y evidencia. No modificar aplicación, fuentes, inventarios, otros entregables ni configuración. Los cuatro archivos de R4 están congelados. Ollamacodex trabaja ahora en el parser territorial y OpenCode en 72; no interferir.

## Aspectos a revisar

1. Compatibilidad semántica completa: definición, unidades, universo/población, identidad territorial, localización y periodo; producto diferente no es incompatibilidad por sí mismo. Campos temporales imprescindibles separados de opcionales. Nulos iguales no acreditan información ausente.
2. Diferenciar comparación interfuentes, productos, revisiones internas identificadas, desconocimiento y conflictos. Separar estado semántico, permiso de resta y contadores. Cambio metodológico no habilita una resta engañosa.
3. Exactitud y límites Decimal mediante lectura de algoritmos; signos, escalas, exponentes, magnitudes, tipos y serialización. Comprobar qué promete el esquema frente a validadores personalizados.
4. Explicaciones y evidencias atribuibles por observación, sin promover declaraciones a hechos verificados. Tipado, IDs y referencias.
5. CLI acotado: JSON estricto, captura única/hash, restricciones de rutas, no sobrescritura, preparación temporal, publicación completa, errores visibles y restos reconocibles. Distinguir defectos efectivos de endurecimientos adicionales ante carreras de filesystem.
6. Coherencia entre código, contrato, casos esperados e informe; límites de inferencia y estado de prototipo.

Cada hallazgo debe señalar archivo/línea, camino de código concreto, consecuencia, severidad y propuesta mínima. Distinguir defecto demostrado por lectura, riesgo condicionado y duda pendiente de verificación funcional. No inventar resultados de ejecución. Registrar SHA de los cuatro archivos revisados para fijar el objeto de revisión.

## Comprobaciones y límites

Solo lectura, hashes, AST/JSON y Ruff check/format --check sobre los dos archivos. **No ejecutar pytest, backend:check, pruebas sintéticas, núcleo o CLI.** No SQL, red, dependencias, frontend, reinicios, commit/push ni despliegue. No hay revisión de persistencia en esta tarea: no acceder a bases.

El resultado es revisión preventiva independiente de implementación, no dictamen EAF ni aprobación productiva. Si no encuentra un defecto, declarar únicamente «sin hallazgos bloqueantes en la revisión estática» y enumerar qué comprobaciones funcionales faltan.

Al terminar congelar entregables y notificar `FB-CONCILIA-01 entregado: bridge/86_revision_freebuff_conciliacion_retrospectiva.md` a `=codex:0.0` usando texto literal y Enter en llamadas separadas.
