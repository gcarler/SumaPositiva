# FB-CONCILIA-01-R5 · Revalidación independiente de H1 y notas 86

25 de octubre de 2026. Revalidación estática de la entrega R5 (misma designación de
archivos 74) hecha contra la tarea 89 y la revisión 86. **No dictamen EAF, no
aceptación funcional, no integración.** Los entregables 86 permanecen congelados y
sin alterar; esta revisión escribe únicamente los archivos 90 designados por coordinación.

## Objeto de revalidación (SHA fijados)

- Núcleo `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`
  → `236070c2489887be9e6cf966af70f18d5c6a89b2fbf050a3cb4bfc764482698c`
  (coincide con el fijado por coordinación y con informe 74-R5).
- CLI `backend/scripts/contrastar_fuentes_por_periodo.py`
  → `15634cdedec70b20a75a6349a104b63e1031b62008c87708f3bad06d888bdd5e`
  (**sin cambios respecto de mi revisión 86**, coherente con «evitar modificaciones
  innecesarias» de la tarea 89).
- Contrato → `071d8bc79be61df64925c768485102890f771a6fca35371d4636b83df386b008`.
- Informe 74 → `36e05476efe0d7dacf517aaf4f3e50841fe86da918a7b5ee77fa5e4a47f95f92`
  (ya no incluye auto-referencia y declara los tres hashes anteriores).

## Comprobaciones ejecutadas (mismos límites de 85)

Solo lectura, hashes, Ruff y AST/JSON. **Sin ejecutar núcleo, CLI, pruebas
funcionales/sintéticas, SQL, red** ni cambios de aplicación:

- `backend/.venv/bin/ruff check` sobre ambos archivos → **passed** (rc=0).
- `backend/.venv/bin/ruff format --check` sobre ambos archivos → **2 files already formatted** (rc=0).
- Contracto 74 actualizado parseado por JSON → **válido**.
- `sha256sum` sobre los cuatro archivos → registrados arriba y en la evidencia.

## H1 — veredicto: RESUELTO

La regla pedida por la tarea 89 está implementada como una sola regla compartida:

- `_estado_fecha_referencia` (núcleo): si `tipo` falta en cualquiera → `pendiente`;
  tipos declarados distintos → `distinto`;
  con tipo igual, los opcionales (`fecha`, `precision`) se evalúan por campo con
  `_estado_comparacion_opcional`: ausente en cualquiera de los lados →
  `informativo` (sin bloqueo); ambos declarados y distintos → `distinto` (bloquea);
  ambos coincidentes → `coincidente`.
- `_estado_comparativo` despacha por campo: `fecha_referencia` usa la regla
  compartida; el resto de campos conserva `_incompleto_comparativo` + igualdad.
- `_diferencias_metodicas` ahora emite detalle por subcampo
  (`fecha_referencia.tipo`, `.fecha`, `.precision`) con
  `bloquea_comparabilidad = (estado == "distinto")` y
  `requiere_igualdad = (estado == "coincidente")` — el detalle queda en la salida,
  no se diluye en un solo campo.
- `_celda_identica` → `_diferencia_metodica”(…, campo)` comparte la misma regla:
  `informativo` se traduce a `coincidente` **solo para identificar la celda** de
  revisión interna; el estado semántico del par sigue fijado por los campos con
  bloqueo real. No hay imputación de fechas de proceso ni de equivalencias de
  valores no conocidos.

Semántica verificada contra los casos contractuales nuevos y preexistentes:
`fecha_referencia_tipo_ausente` (pendiente), `fecha_referencia_tipos_distintos`
(no_comparable), `…_opcionales_ausentes_bilateral` y `…_unilateral` (informativas,
comparable si los demás criterios lo permiten), `…_iguales` (coincidentes),
`…_distintas` (no_comparable, sin resta, sin imputación),
`revision_interna_fecha_referencia_informativa` (la ausencia no separa la celda;
puede haber `revision_identificada` y la resta depende de `valor_original`),
`revision_interna_fecha_referencia_distinta` (opcionales declarados distintos sí
separan la celda; sin resta), y `periodo_completo_opcionales_ausentes`.
**Conclusiones exigidas por coordinación:**

- Regla compartida entre contraste y revisión interna → **verificada por lectura**.
- Opcionales ausentes no bloquean → **verificado por lectura**.
- Ambos declarados y distintos sí bloquean → **verificado por lectura**.

## Notas de la revisión 86 — veredicto: DOCUMENTADAS

- **N1 (precedencia `no_comparable` > `pendiente`):** documentada en informe R5
  («incompatibilidad conocida precede a incompletitud») y el código conserva las
  razones de todos los campos coexistentes (`_razones` sin cambios).
- **N2 (conflicto acotado a identidad fuente/producto):** el contrato añadió
  `precedencia_tipo_par` con la regla exacta y el caso
  `version_id_reutilizado_entre_productos` («no se propaga conflicto fuera de la
  identidad fuente/producto»); el código `_tipo_par` no cambió y no propaga.
- **N3 (`revision_identificada` ≠ comparabilidad metodológica):** el contrato
  añadió `estado_revision_identificada` con la aclaración y los casos
  `revision_interna_fecha_referencia_*`; la resta sigue dada por
  `estado_comparabilidad` + permiso, nunca por la etiqueta de revisión.
- **N4 (formato de resta):** el contrato añadió `diferencia_numerica_texto`
  (representación exacta `coeficienteEexponente` de A menos B, sin notación
  normalizada ni redondeo); `_diferencia_valor_exacta` intacta.
- **N5 (límite de diferencia como guardia):** declarado en informe R5; la
  aritmética y los límites no se tocaron.
- **D1:** sigue **pendiente de verificación funcional** (serialización Decimal→
  texto en pydantic v2 `mode="json"`, en la que depende el CLI). No ejecutada por
  este agente ni acreditada por Ollamacodex; toca a la corrida funcional de
  aceptación de coordinación.

## Observación documentada (no defecto)

En `_diferencia_metodica`, `informativo` → `coincidente` para la identificación de
celda. La tarea 89 advierte «no confundir contexto informativo con dato
coincidente»: el código respeta la distinción porque el mapeo se usa solo para
determinar si la celda de revisión es la misma, y el estado semántico del par lo
fijan los `bloquea_comparabilidad` reales por campo. Queda documentado en informe
R5 y en los casos `revision_interna_fecha_referencia_*`. Ningún nuevo defecto
estático encontrado en R5.

## Pendientes que esta revalidación no cubre

1. Corrida funcional de aceptación (núcleo + CLI con JSON de muestra) para
   reproducir los casos del contrato 74, incluida **D1**.
2. Validación de rastro de auditoría y cambios de contrato/informe asociados a la
   corrida (si procedieran).
3. Integración y despliegue (fuera de alcance del ciclo).

Estado final: R5 queda **revalidada estáticamente sin defectos nuevos**; aceptación
funcional e integración siguen pendientes. Los archivos 86 y este informe quedan
congelados al cierre.
