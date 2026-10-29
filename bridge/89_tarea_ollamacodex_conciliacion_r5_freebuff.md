# OL-CONCILIA-01-R5 · Corregir H1 de revisión independiente

24 de octubre de 2026. Coordinación leyó la revisión 86 y confirmó por lectura la igualdad total de FechaReferencia que origina H1. La corrección se limita al núcleo/CLI/contrato/informe de conciliación ya autorizados por 73; el parser territorial y sus entregables permanecen congelados.

## H1: comparación de fecha de referencia

Leer 86 y el código actual. FechaReferencia requiere tipo; fecha y precision son opcionales conforme al contrato actual. Compararlas de forma explícita:

- Falta tipo esencial en cualquiera de los lados: pendiente, sin resta.
- Ambos tipos conocidos distintos: incompatibilidad, sin resta.
- Mismo tipo y periodo del fenómeno completo/compatible: ausencia unilateral o bilateral de fecha/precision no constituye diferencia semántica demostrada. Conservar ambos originales y emitir diferencias informativas para esos opcionales, sin imputar equivalencia de valores no conocidos.
- Cuando ambos declaran fecha o precision y difieren: conservar bloqueo conservador y razón explícita. No quitar simplemente el bloqueo de toda FechaReferencia.
- Mantener separados periodo del fenómeno y fechas de proceso; no usar extracción/corte como sustitutos.

Compartir la regla semántica entre `_diferencias_metodicas`, `_diferencia_metodica` y `_celda_identica` para evitar aceptar el contraste pero perder la identificación de la misma celda en una revisión. No confundir contexto informativo con dato coincidente. Las salidas deben conservar el detalle por campo y su efecto bloqueante.

## Aclaraciones de las notas 86

- N1: documentar precedencia de incompatibilidad conocida sobre incompletitud cuando coexisten, conservando todas las razones.
- N2: los IDs de versión se interpretan dentro de la identidad fuente/producto. Productos distintos no demuestran conflicto por reutilizar un texto version_id. Documentar la precedencia actual; no propagar conflictos de versión entre espacios de identidad distintos.
- N3: `revision_identificada` acredita dos versiones identificadas de la misma celda, no validación de la definición ni comparabilidad numérica. Documentarlo; una definición pendiente mantiene estado general pendiente y resta nula. No añadir un nuevo estado sin necesidad.
- N4: documentar representación exacta `coeficienteEexponente` de la resta A menos B; no prometer notación decimal normalizada ni redondear.
- N5: mantener el límite conservador de salida; es guardia de recursos, no obligación de ser alcanzable por toda entrada. No modificar aritmética por esta nota.
- D1: sigue siendo verificación funcional pendiente. No ejecutarla ni acreditarla en esta entrega.

## Escrituras exclusivas y comprobaciones

Solo:
1. `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`.
2. `backend/scripts/contrastar_fuentes_por_periodo.py` si fuera necesario; evitar modificaciones innecesarias.
3. `bridge/74_contrato_ollamacodex_conciliacion_retrospectiva.json`.
4. `bridge/74_entrega_ollamacodex_conciliacion_retrospectiva.md`.

No tocar 86, esta tarea, parser, entregables 84/88, catálogo, fuentes, frontend, dependencias o configuración. Sin SQL, red, datos reales, pruebas sintéticas/funcionales, pytest, commit/push o despliegue. Solo Ruff check/format y AST/JSON. Mantener trazabilidad honesta del chequeo manual de R3.

Actualizar contrato y casos previstos inequívocos: opcionales ausentes en ambos; ausentes solo en un lado; valores iguales en ambos; valores declarados distintos; tipo ausente/distinto; mismas variantes en revisión interna; demás criterios incompatibles siguen bloqueando. Son casos previstos, no ejecutados.

Registrar hashes, congelar al cierre y notificar `OL-CONCILIA-01-R5 entregado` a `=codex:0.0`, literal y Enter separados. Revisión independiente posterior y aceptación funcional permanecen pendientes.
