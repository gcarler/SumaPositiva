# Validación funcional dirigida del parser territorial

25 de octubre de 2026. Coordinación Codex. **35 pruebas aprobadas, 0 fallidas**, sin cambios en el código del parser. No integración, certificación DIVIPOLA, procesamiento de corpus oficial ni dictamen EAF.

Se añadió `backend/tests/test_parser_terridata_polis.py` con datos sintéticos explícitos. Se ejecutó desde backend con `--noconftest`, evitando la preparación automática de base del conftest general, que este módulo puro no necesita:

```bash
.venv/bin/python -m pytest --noconftest tests/test_parser_terridata_polis.py -q --junitxml=/root/polis/bridge/97_pytest_parser_territorial.xml
```

Resultado: **35 passed in 0.14s**, exit 0. Ruff check y format --check del parser y pruebas pasan. Una línea extensa del archivo de pruebas se resolvió con el formateador antes del check final; no se modificó la configuración.

## Verificado por ejecución

- Originales de las 13 columnas, posición, SHA de bytes recibidos, captura declarada y Decimal serializado como cadena.
- Filas de ancho incorrecto al inicio y después de una válida: rechazo sin herencia del estado numérico, originales retenidos.
- Año/mes no conformes y mes cero: retención, con texto original.
- Datos cualitativos sin número y descripción general: aviso sin conversión a serie histórica.
- Formatos numéricos no acreditados: retención sin parseo arbitrario; ausencia de ambos valores separada de cero.
- Identidad declarada discordante o no contrastable: retención sin certificación implícita. Conteos de estados e identidad reconciliados.
- Todos los campos obligatorios vacíos: rechazo; celda numérica sobrelímite conservada sin conversión.
- Decimal exacto bajo contexto ambiental reducido; errores de SHA/codificación/encabezado, límites de bytes/filas e identidad esperada vacía.

## Límites de este cierre

Estas pruebas verifican el comportamiento del parser sobre entradas sintéticas y un esquema constatado previamente; no acreditan que toda entrada del proveedor cumpla ese formato, reglas temporales completas, cobertura nacional, reglas complementarias de números ni el catálogo de identidades. El límite ambiental de CSV y el piloto sobre originales oficiales conservados siguen siendo condiciones de la validación de ingesta real.

No se abrió red, SQL ni ZIP real con el parser nuevo; no se modificaron datos oficiales, frontend, dependencias o servicios. No commit/push ni despliegue. La revisión estática 88 conserva vigencia para el código del parser: no cambió su SHA `747ff3443ce03812ad3ce0ea31c35a322eddaaa7114345911aee7dbf04583de3`.

También se ejecuta la selección conjunta de conciliador y parser, con resultado y hashes registrados en `98_evidencia_validacion_parser_territorial.json` y JUnit `99_pytest_conciliador_parser.xml`. La especificación catálogo–planificador sigue siendo un trabajo separado; no queda integrada por estas pruebas.
