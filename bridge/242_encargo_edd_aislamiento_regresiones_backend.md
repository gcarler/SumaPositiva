# EDD-TEST-AISLAMIENTO-03 · Dos fallos restantes del global 236

27 de octubre de 2026. Continuar el saneamiento autorizado. Global 236: 1.615 aprobadas, dos fallidas y 16 omitidas; 554 fuentes idénticas. Preservar 236 y todas las entregas 183/215/226. Sin modificaciones de aplicación, esquemas, migraciones o corpus para ocultar un error.

Investigar los dos fallos reales de `bridge/236_verificacion_backend_final/resultado.json`: auditoría general encuentra `metadatos=['legado']`; ingesta de indicadores encuentra Q1 en lugar de 2024-ANUAL para IND-INS-01. Determinar sus fixtures de origen y si es contaminación entre pruebas. Primero notificar causa reproducida a coordinación.

Si se confirma contaminación, corregir exclusivamente el aislamiento/teardown de los tests responsables, conservando todos sus asserts y los datos originales mientras se comprueban. No cambiar la semántica de endpoints, tolerar formatos inválidos mediante mocks, borrar filas indiscriminadamente ni relajar la aserción del reporte anual. Si es un defecto de producto, informar reproducción y propuesta antes de editar aplicación.

Únicos candidatos iniciales de edición: `backend/tests/test_aportes_legado_publico.py`, `backend/tests/test_ingesta_indicadores.py` y la fixture de indicadores responsable si se identifica (avisar archivo antes de cambiarlo). Entregar `bridge/243_entrega_edd_aislamiento_regresiones_backend.md` y `bridge/243_evidencia_edd_aislamiento_regresiones/`. No tocar evidencias 215/226 ni source schemas/service, src, data, docs o guardas compartidas. Sin commit/push/deploy/proveedores/red.

Probar reproducción antes/después con PostgreSQL real exclusivamente en una nueva base propia polis_test* y guarda anterior a I/O. Ninguna conexión a bd_csh ni a la base de coordinación u otros equipos. Conservar valores crudos en los asserts de legado; teardown debe actuar solo sobre fixtures identificadas después de las comprobaciones, también ante fallo. Ejecutar paquetes dirigidos que demuestren independencia del orden/repetición y Ruff/formato. No global concurrente; coordinación hará el global final posterior.

Congelar y entregar hashes/parche real, comandos/retornos y límites. Revisión propia EDD, no dictamen independiente.
