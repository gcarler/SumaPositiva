# OL-CONCILIA-01-R3 · Revisión estática de R2

24 de octubre de 2026. **R2 no aceptada para integración.** Ruff check y format --check pasan en ambos Python. Se leyeron código y contrato; no se ejecutó el núcleo, CLI ni pruebas funcionales. No dictamen EAF.

## Correcciones obligatorias y acotadas

1. **Regresión crítica de compatibilidad.** `CAMPOS_CRITERIO = ("producto_id",) + CAMPOS_CELDA`, combinado con `_diferencias_metodicas`, exige ahora igualdad de producto y omite `definicion_metodologica`. Restituir la definición como criterio semántico obligatorio. El producto debe mantenerse como procedencia informativa sin bloquear comparabilidad. Dos productos distintos con todos los criterios semánticos completos e idénticos deben poder contrastarse. Una definición distinta debe bloquear la resta, incluso en una revisión interna con cambio metodológico. El informe 74 afirma lo contrario de lo que implementa R2: sincronizarlo.
2. **Bloqueo del CLI.** `_escritura_valida` invoca `all(bool_a, bool_b)`. `all` recibe un único iterable: esta llamada falla antes de publicar cualquier carpeta. Corregir usando un iterable o una conjunción explícita. Mantener preparación temporal y renombrado final; no publicar resultados incompletos. Registrar las carpetas temporales como incompletas por convención documentada; no afirmar que ya incluyen un estado persistido que no se escribe.
3. **Conteos contradicen los estados emitidos.** En el bucle público, si los metadatos son comparables pero hay conflicto o desconocimiento de versión, la condición de cálculo falla y el `else` aumenta `pares_no_comparables`, aunque el par conserva `estado_comparabilidad=comparable_segun_metadatos_declarados`. Contar cada estado semántico exclusivamente según `estado`, separadamente de la autorización para calcular y de los contadores de versiones. La suma de estados debe corresponder exactamente a los estados de los pares emitidos. Mantener la abstención numérica por conflicto/desconocimiento según el contrato actual.
4. **Atribución de explicaciones aún ambigua.** `explicaciones=list(a.explicaciones)+list(b.explicaciones)` pierde el origen en el par. Los IDs solo son únicos dentro de cada observación. Dos observaciones pueden tener la misma explicación/evidencia ID local con contenidos diferentes: no se puede resolver su referencia sin el origen. Emitir cada explicación del par con `observacion_id` explícito y contenido tipado, o agruparlas por observación de forma inequívoca. No exigir artificialmente IDs globales ni modificar las declaraciones originales. Actualizar el esquema y documentar el alcance de referencias.

## Conservar lo corregido

La resta ya no consulta el atributo inexistente de Decimal. Hay máximos declarativos de listas, fechas inválidas con ValueError, contenido obligatorio de explicaciones sustantivas, versiones nulas separadas de revisiones identificadas y bloqueo numérico ante conflictos. Conservar esos avances y la captura única de bytes con SHA.

## Alcance y entrega

Exclusivamente los mismos cuatro archivos de 73: núcleo, CLI, informe 74 y contrato 74. No tocar esta revisión ni otros archivos. Sin SQL, red, datos reales, pruebas de aplicación, integración, dependencias, frontend, commit/push o despliegue. Ruff check/format y análisis de sintaxis permitidos. Actualizar hashes y casos documentados sin acreditarlos como pruebas ejecutadas.

Leer el diff completo antes de congelar, en particular las constantes de criterios y el bucle de conteos, para evitar nuevas regresiones. Notificar `OL-CONCILIA-01-R3 entregado` a `=codex:0.0`; aceptación funcional pendiente de coordinación.
