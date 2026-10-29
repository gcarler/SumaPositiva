# Validación funcional dirigida del conciliador y CLI

25 de octubre de 2026. Coordinación Codex. Estado: **72 pruebas dirigidas aprobadas, 0 fallidas**, más un piloto CLI sintético con artefactos conservados. No integración productiva ni dictamen EAF.

## Defecto encontrado durante la ejecución

La primera corrida sobre la R5 congelada produjo **51 passed / 6 failed**. Aunque los metadatos esenciales ausentes se clasificaban como `pendiente`, R5 ponía `bloquea_comparabilidad=False` para ese estado. `_estado_por_diferencias` ignoraba así la incompletitud, dejando calcular diferencias con periodos o tipo de referencia incompletos. La revisión estática previa no detectó este defecto.

Coordinación corrigió las dos construcciones de diferencias: los criterios esenciales participan en el control de comparabilidad tanto si son distintos como si están pendientes; en FechaReferencia, tipo es obligatorio y fecha/precision conservan su regla opcional. No cambió el algoritmo Decimal ni el CLI. Se añadieron casos de regresión para todos los campos esenciales.

La revisión independiente 90 corresponde al SHA anterior de R5. Se conserva intacta como antecedente y **no acredita esta modificación posterior**. Los hashes finales están en `94_evidencia_validacion_conciliador.json`. Informe/contrato 74 se conservan como entrega histórica R5; este documento registra la corrección de coordinación y el cierre de D1.

## Qué se verificó

- Contraste entre productos distintos y bloqueo por definiciones/unidades/universos/poblaciones/territorios/localización incompatibles.
- Metadatos esenciales y periodos incompletos: pendiente con abstención numérica; marcadores desconocidos no se convierten en información acreditada.
- Opcionales de FechaReferencia ausentes en uno/ambos lados, iguales o incompatibles; misma regla en comparación interfuentes y revisión interna.
- Versiones desconocidas y en conflicto; revisión interna con cambio metodológico; coherencia de estados y conteos; nulo distinto de cero.
- Resta exacta con signos, escalas y exponentes extremos dentro del contrato, con contexto Decimal exterior reducido.
- **D1 resuelto por ejecución:** `model_dump(mode="json")`, `model_dump_json()` y salida del CLI serializan Decimal como texto. Se conserva representación original aportada como cadena.
- Rechazo de bool/float/no finitos/sobrelímites, fechas numéricas o inválidas, periodos invertidos, IDs/pares duplicados y modos de pareo incompatibles.
- Límites de observaciones, pares explícitos/combinatorios y lectura; sin inventar comparaciones cuando no se solicitan.
- Explicaciones con IDs locales y origen; referencia inexistente rechazada.
- CLI con JSON de claves únicas y sin NaN/Infinity; lectura única y hash de los bytes procesados aunque cambie después el archivo.
- CLI ejecutado en proceso real dos veces con salida UUID diferente, hashes verificados y sin restos temporales tras éxito.
- Fallo simulado al escribir manifiesto: error visible, solo carpeta temporal y ningún resultado final publicado. Rutas externas y symlink rechazados.

## Ejecución y evidencia

Archivo nuevo: `backend/tests/test_conciliacion_retrospectiva_fuentes_polis.py`.

Desde `backend/`:

```bash
.venv/bin/python -m pytest --noconftest tests/test_conciliacion_retrospectiva_fuentes_polis.py -q --junitxml=/root/polis/bridge/93_pytest_conciliacion_retrospectiva.xml
```

Resultado final: **72 passed in 1.31s**, exit 0. Una corrida intermedia de 66 casos también pasó; después se amplió cobertura y se eliminó una parametrización duplicada. La corrida inicial fallida se conserva en `93_pytest_conciliacion_antes_correccion.xml`.

`--noconftest` evita el conftest general, cuya dependencia autouse prepara/migra una base aunque el caso puro no la necesite. Este archivo no usa esas fixtures ni pruebas de persistencia: no se accedió a SQL, no se aplicaron migraciones ni se ejecutó la suite general.

Ruff check y format --check pasan para núcleo, CLI y archivo de pruebas. Piloto sintético adicional y manifiesto/hash reproducible conservados en `93_piloto_sintetico_conciliacion/`, identificados expresamente como datos de prueba.

## Alcance que sigue pendiente

Esta validación corresponde a la selección de casos descrita y al núcleo/CLI aislados, no a cobertura exhaustiva ni aceptación del sistema completo. No acredita conciliación de datos oficiales, licencias, cobertura geográfica, semántica de fuentes reales, trazabilidad de series históricas ausentes ni impacto causal. Catálogo–planificador, parser territorial y futuros consumidores se validan por separado.

Se solicitó a Freebuff revisar la corrección y reproducir únicamente esta suite dirigida. Sin cambios de frontend, datos oficiales, servicios, dependencias, commit/push o despliegue.
