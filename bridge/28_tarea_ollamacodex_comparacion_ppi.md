# OL-CODEX-03 · Comparación offline PPI y catálogo por corte

Continúa inmediatamente. La coordinación reprodujo las 48 pruebas de R1 y
capturará PPI productiva exclusivamente en lectura. Tu siguiente tarea es una
utilidad offline para detectar divergencias entre captura PPI v2 y catálogo v1.

## Archivos exclusivos

- backend/app/modules/compromisos/comparacion_ppi_catalogo_polis.py
- backend/scripts/comparar_ppi_catalogo_polis.py
- backend/tests/test_comparacion_ppi_catalogo_polis.py
- bridge/29_entrega_ollamacodex_comparacion_ppi.md
- bridge/29_evidencia_ollamacodex_comparacion_ppi.json

No edites componentes existentes ni sus consumidores. No SQL productiva,
data/**, frontend, dependencias, commit, push, reinicio o despliegue.

## Contrato

Recibe ContextoCorte y ReferenciaPPIPlaneacion/ReferenciaCatalogoPlaneacion;
usa sus lectores existentes para verificar SHA y pertenencia al MISMO corte.
Compara base_origen, conjuntos de planes/nodos, cobertura nodos/metas por
plan, e identidad, codigo_plan, parent_id y nivel de cada nodo. Reporta
faltantes/sobrantes/cambios, con conteos completos y muestras acotadas y
ordenadas. Cero cambios no acredita ejecución, presupuesto comparable,
vínculo PA, indicador ni causalidad.

Compara por separado JSONB financiero (ppi_anual_cop/metadatos) y fuente
entre nodos compartidos. El catálogo legado ya puede contener floats: nunca
conviertas Decimal a float ni declares igualdad financiera exacta donde
haya float. Marca esas rutas como precisión no verificable; conserva
estructura, tipos, SQL NULL/JSON null y faltantes distintos de cero. No hay
totales de planes en el catálogo: declara comparación no disponible, sin
inventar equivalencias. Prioriza hallazgos estructurales deterministas.

CLI con argumentos explícitos de manifiesto, run_id, sha, inventario,
catálogo, captura y salida nueva. No sobrescribas salidas ni entradas.
Salida JSON con referencias SHA, resumen, hallazgos, límites y no_publicable;
resultado repetible para los mismos bytes. Validación negativa de corte
ajeno, alteración, planes/nodos/cobertura/parent/nivel divergentes y floats
legados; casos con centavos grandes, None/cero, orden estable y muestra.

## Coordinación de pruebas

Implementa y ejecuta Ruff check/format sobre tus tres archivos. NO ejecutes
pytest todavía: la coordinación hará la suite integral sobre la base compartida.
Avísame cuando esté listo para pruebas; te confirmaré la ventana de pytest.
No cambies ni interrumpas procesos de otros agentes. El informe debe separar
pruebas ejecutadas y pendientes. No invoques proveedores IA ni red.

Entrega a =codex:0.0 por tmux indicando OL-CODEX-03. Si faltan parámetros o
información, revisa archivos existentes y progresa con fixtures sintéticas.
