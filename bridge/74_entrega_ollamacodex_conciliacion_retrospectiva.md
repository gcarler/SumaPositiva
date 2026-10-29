# OL-CONCILIA-01-R5 · Correccion H1 y notas de revision

Estado: `prototipo_pendiente_revision_e_integracion`.
No dictamen EAF. Sin datos reales, SQL, red, suite integral, pruebas sinteticas/funcionales, commit ni push.

## Archivos autorizados

- `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`
- `backend/scripts/contrastar_fuentes_por_periodo.py`
- `bridge/74_contrato_ollamacodex_conciliacion_retrospectiva.json`
- `bridge/74_entrega_ollamacodex_conciliacion_retrospectiva.md`

El CLI no requirió cambios funcionales en R5. Parser territorial y entregables 84/88 permanecen congelados.

## Correccion H1 · FechaReferencia

Se comparte una sola regla entre `_diferencias_metodicas` y `_celda_identica`:

- `tipo` sigue siendo esencial. Si falta en cualquiera de las observaciones,
  `fecha_referencia.tipo` es `pendiente` y la resta se abstiene.
- Tipos declarados distintos siguen bloqueando comparabilidad.
- Con mismo tipo y periodo de fenómeno completo/compatible, la ausencia
  unilateral o bilateral de `fecha` o `precision` produce diferencia
  `informativo` y no bloquea por sí sola.
- Cuando ambos declaran `fecha` o ambas declaran `precision` y difieren,
  la diferencia mantiene `bloquea_comparabilidad=true`
  y bloquea la resta.
- No se imputa fecha de extracción, corte o proceso como fecha del fenómeno,
  y no se confunde contexto informativo con dato coincidente.
- La salida conserva detalle por `fecha_referencia.tipo`,
  `fecha_referencia.fecha` y `fecha_referencia.precision` y su efecto
  bloqueante.

La misma regla se refleja en la celda de revision: ausencia de opcionales
no separa la celda; opcionales declarados distintos sí la separan.

## Notas de la revision 86

- **N1.** La incompatibilidad conocida tiene precedencia sobre incompletitud
  cuando coexisten. Se documentan todas las diferencias y razones.
- **N2.** Los `version_id` se interpretan dentro de la identidad
  fuente/producto. No se propagan conflictos de version entre espacios
  de identidad distintos.
- **N3.** `revision_identificada` acredita dos versiones identificadas de la
  misma celda. No valida definición ni habilita comparabilidad numerica
  por sí sola.
- **N4.** La resta se documenta como representacion exacta
  `coeficienteEexponente` de A menos B. No se promete notacion decimal
  normalizada ni redondeo.
- **N5.** El límite de salida sigue siendo guardia de recursos, no obligación
  de ser alcanzable por toda entrada. No se cambia aritmética por esta nota.

D1 queda como verificación funcional pendiente y no fue ejecutada.

## Avances conservados

- Solicitud tipada con límites de observaciones y pares solicitados.
- Captura unique del CLI, hash sobre bytes procesados y entradas locales.
- Decimal exacte, límites de dígitos y exponente, rechazo de `float`,
  `bool`, no finitos y marcas reservadas.
- Conflicto de version, version desconocida, cambio metodológico y nulos
  separados de cero.
- Origen explicito de explicaciones en el par.
- Serialización sin contexto Decimal y sin `default=str`.
- Parser estricto del CLI con claves únicas y sin `NaN/Infinity`.

## Trazabilidad previa

En R3 se hizo un chequeo manual in-memory puntual; no fue pytest ni
aceptación funcional y no fue reproducido por coordinación. En R4 y R5 no se
repitieron chequeos sintéticos ni funcionales.

## Validaciones realmente ejecutadas

- `backend/.venv/bin/ruff check backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py backend/scripts/contrastar_fuentes_por_periodo.py` → passed.
- `backend/.venv/bin/ruff format --check backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py backend/scripts/contrastar_fuentes_por_periodo.py` → passed.
- Análisis de sintaxis con `ast.parse` sobre el núcleo → passed.
- Validez JSON del contrato → passed.
- Sin pytest, suite integral, pruebas funcionales ni datos reales.
- Sin SQL, red, integración, commit, push ni despliegue.

## Hashes

- Núcleo: `236070c2489887be9e6cf966af70f18d5c6a89b2fbf050a3cb4bfc764482698c`
- CLI: `15634cdedec70b20a75a6349a104b63e1031b62008c87708f3bad06d888bdd5e`
- Contrato: `071d8bc79be61df64925c768485102890f771a6fca35371d4636b83df386b008`
- Informe: no incluye auto-referencia.

## Estado y límites

- Revision independiente posterior y aceptación funcional pendientes.
- No integra `65/70`, catálogo, planificador, adaptadores ni motores.
- No se analizó banco ni capturas reales.
- Cuatro archivos congelados tras esta entrega.
