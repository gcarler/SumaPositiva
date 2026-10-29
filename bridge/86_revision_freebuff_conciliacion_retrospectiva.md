# FB-CONCILIA-01 · Revisión preventiva independiente de OL-CONCILIA-01-R4

24 de octubre de 2026. Revisión estática independiente del núcleo puro y CLI de
conciliación retrospectiva (R4). **No dictamen EAF, no aceptación funcional, no
integración.** Aceptación funcional e integración siguen pendientes de
coordinación, conforme a `bridge/85`.

## Objeto de revisión (SHA fijados)

- Núcleo `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`
  → `79001ee3ceee9699541ec1bb9284a7d419faa8f630dca2ed30bda47f46e75e15` (coincide con informe 74).
- CLI `backend/scripts/contrastar_fuentes_por_periodo.py`
  → `15634cdedec70b20a75a6349a104b63e1031b62008c87708f3bad06d888bdd5e` (coincide con informe 74).
- Contrato `bridge/74_contrato_ollamacodex_conciliacion_retrospectiva.json`
  → `11599382afd61a5170642fa25bef808c60ca08eba08612a27c2796d572feca95` (coincide con informe 74).
- Informe `bridge/74_entrega_ollamacodex_conciliacion_retrospectiva.md`
  → `04699525b394569d8900354f88dcc7a0ac404ce14a224997a2c23d85877a516f` (sin auto-referencia, coherente).

Los cuatro archivos de R4 permanecen congelados; esta revisión no los modificó.

## Métodos y comprobaciones ejecutadas

Solo lectura (núcleo, CLI, contrato 74, informe 74, tareas 73 y revisiones 79/80/81/82),
hashes SHA-256 y Ruff. No se ejecutó pytest, backend:check, núcleo, CLI, pruebas
sintéticas, SQL, network ni movimiento de dependencias. Comandos registrados en la
evidencia `bridge/86_evidencia_freebuff_conciliacion_retrospectiva.json`:

- `backend/.venv/bin/ruff check` sobre ambos archivos → **passed** (rc=0).
- `backend/.venv/bin/ruff format --check` sobre ambos archivos → **2 files already formatted** (rc=0).

## Contraste con lo corregido en 79→82 (verificado por lectura, no repetido)

Las reglas exigidas por las revisiones previas están presentes en el código actual:

- `producto_id` solo en `CAMPOS_PROCEDENCIA` con estado `informativo` y
  `bloquea_comparabilidad=False`; `definicion_metodologica` reincorporada a
  `CAMPOS_CRITERIO` (79/81-R1).
- `_escritura_valida` usa `all([...])` con iterable correcto (81-R2).
- Conteos por `estado_comparabilidad` separados del permiso de resta; conflicto y
  versión desconocida no alteran `pares_comparables` y bloquean solo la resta (81-R3).
- `ExplicacionDelPar` con `observacion_id` explícito; alcance local de IDs documentado
  en el contrato (81-R4).
- Captura única del CLI con hash sobre los bytes leídos y límite aplicado a la
  lectura real (`MAXIMO_BYTES_ENTRADA + 1`) (79-R9, 80-R4).
- `Decimal` con límites de dígitos/exponente, rechazo de `bool`/`float`/no finitos
  y marcas reservadas; resta por coeficientes enteros con exponente mínimo común
  (79-R4, 80-R1).
- Fechas ISO estrictas via `_fecha_declarada` con `ValueError` y sin coerción
  numérica (80-R5, 79-R3); periodo invertido rechazado por validador de modelo.
- `Field(max_length=256/5000)` declarativo en la solicitud (80-R5).
- Publicación por renombrado con carpeta temporal `.concilia-tmp-*` y ambos
  archivos obligatorios (80-R4).
- `conflicto_hash` y `version_desconocida` del contrato alineados cinco por cinco
  con la política efectiva del código, más los casos `periodo_parcial_identico` y
  `periodo_completo_opcionales_ausentes` exigidos por 82.

## Hallazgo H1 — defecto demostrado por lectura (severidad media)

**Título:** los opcionales de `fecha_referencia` bloquean la comparabilidad por
mera presencia/ausencia desigual, en contradicción con el caso contractual
`periodo_completo_opcionales_ausentes`.

**Camino de código concreto:**
- `_incompleto_comparativo` (núcleo, L459-465) considera incompleta una
  `FechaReferencia` solo cuando `tipo` es nulo (`CAMPOS_OBLIGATORIOS_FECHA_REFERENCIA = ("tipo",)`).
- En `_diferencias_metodicas` (L495-501) la comparación es igualdad completa del
  modelo (`valor_a == valor_b`, pydantic comparan todos los campos): `FechaReferencia(tipo="X")`
  frente a `FechaReferencia(tipo="X", fecha=..., precision=...)` no son iguales → estado `distinto`.
- `_estado_por_diferencias` (L516-520) traduce `distinto` con `bloquea_comparabilidad=True`
  → el par queda `no_comparable` y la resta no se calcula.

**Consecuencia:** un par legítimo con referencia temporal inequívoca (mismo `tipo`)
pero con `fecha`/`precision` declaradas en una observación y ausentes en la otra
queda etiquetado `no_comparable` con razón `metadato_distinto:fecha_referencia`.
El contrato 74 exigía para ese escenario «la comparabilidad depende de los demás
criterios». El error es sobreconservador — **no posibilita una resta engañosa**
— pero degrada silenciosamente pares válidos y sesga los conteos
(`pares_no_comparables` infla abstenciones reales de cobertura incompleta).

**Propuesta mínima:** en la comparación de `FechaReferencia`, tratar `fecha` y
`precision` como contexto opcional: presencia/ausencia desigual → `informativo` o
`coincidente_parcial`; solo `distinto` (y bloqueo) cuando **ambos** lados declaran
el campo y difieren. Ajustar el caso contractual y el informe en la misma ronda.
Alternativa aún más acotada: mantener `distinto` pero con
`bloquea_comparabilidad=False` para esos campos opcionales.

## Notas menores (no bloqueantes, por registroaver)

- **N1.** `_estado_por_diferencias` prioriza `no_comparable` sobre `pendiente`
  cuando coexisten un campo distinto y uno incompleto. Política válida pero sin
  especificar en el contrato; documentarla.
- **N2.** La precedencia de `_tipo_par` (L546-561) devuelve `contraste_entre_productos`
  antes de evaluar conflicto de versión o versión desconocida: un mismo conflicto
  de hash entre productos de una misma fuente queda clasificado como
  `contraste_entre_productos/estado_revision=no_revision` y el contador
  `pares_revision_conflicto_version` no aumenta. Mantener o documentar la precedencia.
- **N3.** `_estado_revision` (L562-588) puede etiquetar `revision_identificada`
  cuando `definicion_metodologica` es pendiente/incompleta: `_diferencia_metodica`
  devuelve `pendiente` y la condición `== "distinto"` no se cumple. La resta sigue
  bloqueada por el estado general `pendiente`, pero la etiqueta de revisión sobre-
  acredita. Ajuste de etiqueta, no de seguridad.
- **N4.** El formato del texto de `DiferenciaValor` (`±CEE±exp` con exponente
  mínimo común de las entradas, L595) no está documentado en el contrato;
  trazaibilidad futura del consumidor.
- **N5.** `MAXIMO_DIGITOS_DIFERENCIA (256)` es hoy límite inerte: con 48 dígitos y
  shift de exponente ≤ 200 el coeficiente máximamente 248 dígitos. Inocuo; dejarlo
  documentado o recalcularlo.

## Duda pendiente de verificación funcional (no ejecutada por límites de la tarea)

- **D1.** La serialización JSON de `Decimal` en `model_dump(mode="json")` (pydantic
  v2, documento del proveedor) como texto. El CLI depende de ella para la
  «serialización decimal como texto» (79-R4). No la reproducí funcionalmente; que
  la aceptación de coordinación lo compruebe en la corrida funcional pendiente.

## Pendientes funcionales de aceptación (fuera del alcance de esta revisión)

1. Corrida del CLI con archivo JSON de muestra y verificación de manifiesto,
   hashes y carpeta publicada.
2. Reproducción de los casos nominales del contrato 74 (al menos
   `productos_distintos_compatibles`, `conflicto_hash`, `periodo_parcial_identico`,
   `periodo_completo_opcionales_ausentes`, `sobrelimite`, fallback `definicion_distinta_bloquea`).
3. Verificación D1 de serialización Decimal.

## Estado final

Revisión preventiva independiente de implementación; no dictamen EAF, no
aprobación productiva, no integración. Ruff no acredita comportamiento. La
compatibilidad y la semanticidad del R4 respecto del contrato se considera razonable
salvo H1 y las notas. Los archivos de R4 siguen congelados; entregables de esta
revisión únicamente en `bridge/86_revision_freebuff_conciliacion_retrospectiva.md`
y `bridge/86_evidencia_freebuff_conciliacion_retrospectiva.json`.
