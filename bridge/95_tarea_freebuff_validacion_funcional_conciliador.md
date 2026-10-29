# FB-CONCILIA-02 · Revisión del cambio funcional de coordinación

Coordinación ejecutó la aceptación dirigida autorizada al continuar el usuario tras el pendiente funcional. Leer informe 94 y evidencia 94. La primera corrida sobre R5 detectó seis fallos; la corrección de coordinación habilita bloqueo de metadatos esenciales pendientes. Suite ampliada: 72 passed. D1 comprobado por ejecución, sin base ni fuentes oficiales.

## Trabajo

1. Revisar el código actual del conciliador y comparar con el objeto R5 de 90 y el fallo registrado en 93/94. Verificar que `bloquea_comparabilidad` de los obligatorios incluye pendiente sin alterar los opcionales de FechaReferencia.
2. Revisar el archivo nuevo de pruebas; señalar carencias reales y errores en expectativas si existen. No declarar cobertura exhaustiva por contar pruebas.
3. Reproducir solo la suite dirigida desde backend:

```bash
.venv/bin/python -m pytest --noconftest tests/test_conciliacion_retrospectiva_fuentes_polis.py -q --junitxml=/root/polis/bridge/96_pytest_freebuff_conciliador.xml
```

No cargar el conftest general porque aplica migraciones a través de una fixture autouse. El archivo puro no requiere esos fixtures. No ejecutar backend:check ni otras suites ni SQL. Este comando sí queda autorizado para esta tarea funcional; reemplaza el límite solo estático de la revisión anterior exclusivamente para este archivo.

4. Cotejar D1 con pruebas ejecutadas y artefactos sintéticos 93; distinguir pruebas de cálculo, contrato y CLI de validación semántica de fuentes oficiales.
5. Ruff check/format --check de núcleo, CLI y pruebas; hashes finales y resultado real.

## Aislamiento

Únicas escrituras: `bridge/96_revision_freebuff_validacion_funcional.md`, `bridge/96_evidencia_freebuff_validacion_funcional.json`, `bridge/96_pytest_freebuff_conciliador.xml`. La suite crea/elimina solo su carpeta temporal sintética bajo bridge para probar el CLI. No modificar aplicación, pruebas, 74/84/86/90/94, parser, fuentes, datos oficiales ni configuración. Sin red, SQL, instalaciones, commit/push, reinicios o despliegue.

El núcleo actual tiene SHA `1ee5bb76eb2913c8318b5802040e64232ac451ab72bc8f0ab4357a8cadde8acd`. No reutilizar como aprobación de este código los hashes anteriores de 90. Si cambian archivos durante revisión, informar y no firmar sobre objeto distinto.

Concluir sobre la aceptación dirigida, sin dictamen EAF ni integración productiva. Notificar `FB-CONCILIA-02 entregado` a `=codex:0.0`, texto literal y Enter separados.
