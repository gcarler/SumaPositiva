# 100 · Revisión independiente de Freebuff sobre la validación funcional del parser territorial

25 de octubre de 2026. Freebuff. Revisión dirigida con ejecución real, siguiendo el mismo libro de la tarea FB-CONCILIA-02 (tarea 95); **la coordinación no emitió archivo de tarea designado** para esta revisión (no existe `99_tarea_...`), por lo que Freebuff eligió los números 100/101/102, aún libres, al momento de escribir. Notificado a `=codex:0.0` al cierre. Sin dictamen EAF, sin integración productiva, sin procesamiento de corpus oficial.

## Objeto revisado

- Parser `backend/app/modules/compromisos/parser_terridata_polis.py` SHA-256 `747ff3443ce03812ad3ce0ea31c35a322eddaaa7114345911aee7dbf04583de3`, **idéntico al de la revisión estática 88**: el código del parser no cambió; lo revisado aquí es su validación funcional (98) y el archivo nuevo de pruebas.
- Pruebas `backend/tests/test_parser_terridata_polis.py` (nuevo) SHA `28e4e56d1b91b3fa900d9147bdeb900e911fb5b9de592790e9de7917b485db66`, 7602 bytes, mismo hash declarado en `98_evidencia_validacion_parser_territorial.json`.
- Contrato 84 SHA `afff629b65948919a01fec0716e459096c6e5dedef7f14ba2498b63610678039` intacto; XML 97 (`443dde…7fae7c`) y 99 (`e504aadb…55a1c`) coinciden con los hashes de la evidencia 98. Informes 98 y su evidencia no fueron modificados.

## Corrida de coordinación (98) cotejada

- XML 97: 35 tests, 0 fallos/errores/skips. XML 99: 107 tests (72 conciliador + 35 parser), 0 fallos. Ambos declarados como alcanzados en 98 y consistentes con el contenido de los archivos.
- Límite declarado correcto: el 98 no afirma más de lo que sus corridas muestran (datos sintéticos, sin corpus oficial, sin certificación DIVIPOLA).

## Reproducción de Freebuff (real, sin base ni red)

Desde `backend/`:

```bash
.venv/bin/python -m pytest --noconftest tests/test_parser_terridata_polis.py -q --junitxml=/root/polis/bridge/101_pytest_freebuff_parser_territorial.xml
.venv/bin/python -m pytest --noconftest tests/test_conciliacion_retrospectiva_fuentes_polis.py tests/test_parser_terridata_polis.py -q --junitxml=/root/polis/bridge/102_pytest_freebuff_conciliador_parser.xml
```

Resultados: **35 passed in 0.07 s**, exit 0 (`101_pytest_freebuff_parser_territorial.xml`, SHA `44291c85…89c04`) y **107 passed in 1.28 s**, exit 0 (`102_pytest_freebuff_conciliador_parser.xml`, SHA `62fcd2db…7003b8`). `--noconftest` en ambas, sin SQL, sin migraciones, sin suite general.

## Revisión del archivo de pruebas

Cubierto y verificado contra el código (`parser_terridata_polis.py`) y el contrato 84:

- 13 columnas originales conservadas, orden/línea, SHA de bytes recibidos verificado contra el declarado (y error `sha256` si no corresponde), Decimal serializado como cadena en `model_dump(mode="json")`, `certificacion_divipola = "no_certificada"`.
- Ancho incorrecto al inicio y tras fila válida: rechazada con `no_evaluable_por_estructura`, sin heredar estado numérico ni identidad; originales retenidos.
- Año/mes no conformes y mes 0: `retiene` con estados temporales específicos y original intacto.
- Cualitativa sin número y "Descripción general": aceptada sin serie automática, aviso `descripcion_general_no_serie_estadistica_automatica`, contador `filas_descripcion_general` reconciliado.
- Formatos no acreditados (coma, exponente, NaN, `%`, espacios): retención con `formato_no_regla` y texto original; ambos valores vacíos ≠ cero (cero sí es valor y acepta).
- Identidad discordante declarada vs no contrastable; todos los campos obligatorios vacíos rechazan (12 campos parametrizados contra `CAMPOS_CELDA_OBLIGATORIOS` del propio código).
- Celda numérica sobrelímite (2048+1) rechazada sin conversión ni truncamiento; Decimal exacto bajo `localcontext(prec=2)` sin alterar el contexto externo.
- Encabezado duplicado/desconocido/incompleto → rechazo; límites de bytes y filas probados inyectando contravalores con `monkeypatch`; identidad esperada vacía inválida.

Reconciliación de conteos verificada en cada caso (`filas_datos = aceptadas + retenidas + rechazadas` y desglose de identidad). 35 casos bien contados en el XML; sin doble conteo.

Carencias declaradas (coherentes con los límites del 98, no defectos de ejecución): la suite no cubre codificaciones válidas alternativas (`utf-8-sig` sin BOM explícito solo en un caso), no pilotea sobre la captura oficial conservada del ZIP 75, no cubre `csv_field_size_limit` ambiental real ni reglas temporales del proveedor; esas verificaciones siguen siendo condiciones de la ingesta real, como declara el informe.

## Ruff y hashes finales

- `ruff check` parser + pruebas: **exit 0**. `ruff format --check`: **exit 0** («2 files already formatted»).
- Parser re-hasheado tras ejecuciones: sin cambios (`747ff344…83de3`). Pruebas sin cambios (`28e4e56d…485db66`).

## Límites y aislamiento

Escrituras únicamente: `bridge/100_revision_freebuff_validacion_parser_territorial.md`, `bridge/100_evidencia_freebuff_validacion_parser_territorial.json`, `bridge/101_pytest_freebuff_parser_territorial.xml`, `bridge/102_pytest_freebuff_conciliador_parser.xml`. Sin cambios de aplicación, pruebas, 74–98, contratos, fuentes, datos oficiales, dependencias ni configuración. Sin SQL, red, instalaciones, commit/push, reinicios ni despliegue. Sin dictamen EAF ni integración productiva.

Estado: **validación funcional del parser territorial reproducida e independiente**, con la especificación catálogo–planificador (92) y el piloto sobre captura oficial conservada como trabajos pendientes separados.
