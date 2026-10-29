# OL-FUENTES-04 · Implementar catálogo clasificado → planificador

25 de octubre de 2026. Leer AGENTS.md, arquitectura, tarea 91, entregables 92 y revisión 108. Se autoriza implementar el adaptador con consumidor CLI, sin adquirir datos ni acceder a SQL/red. El piloto 106 y parser quedan congelados.

## Escrituras exclusivas

- Nuevo `backend/app/modules/compromisos/adaptador_catalogo_fuentes_polis.py`.
- `backend/scripts/planificar_fuentes_politica.py`: añadir subcomando `catalogar-clasificado`, conservar comandos existentes.
- Nuevo `backend/tests/test_adaptador_catalogo_fuentes_polis.py`.
- `bridge/110_entrega_ollamacodex_adaptador_catalogo.md`.
- Directorio nuevo `bridge/110_validacion_adaptador_catalogo/` para evidencia, prueba CLI y artefactos.

No modificar planificador, registro, adquisición, catálogo65, 70/72/92/108, parser/conciliador ni otros tests/frontend/configuración/dependencias. Freebuff trabaja por separado en formato numérico del piloto.

## Interfaz concreta y preservación

API pura `convertir_catalogo_clasificado(bytes_catalogo, *, version, procedencia_catalogo, candidatos_adquisicion, registro_autorizado)` devuelve modelo tipado con `CatalogoProductos`, contexto versionado sin pérdida, advertencias y hashes. Definir modelos de candidatos y de contexto explícitos, sin ejecutar funciones/adaptadores por nombres recibidos.

La captura bytes del catálogo se lee una sola vez en el CLI y se entrega al adaptador; límite real, UTF-8/JSON estricto, sin claves duplicadas/NaN/extras ambiguos ni IDs de ficha/producto duplicados. Conservar documento original completo y ficha completa por identificador/puntero en el contexto, incluidos todos sus campos y estructuras sin destino. SHA calculado sobre bytes recibidos es documental, nunca versión analítica validada.

Productos y procedencia usan IDs originales separados (`id_ficha`, `producto_id`); PR y clases institución/sistema/portal/indicador/encuesta siguen como referencias hasta definir producto, sin inventar observaciones. Series explícitas pueden ser insumo_local; copiar listas solo con valores exactamente declarados, nunca inferir conceptos, poblaciones, unidades, años o combinaciones. No convertir vacío deliberado en acreditación ni rechazarlo por defecto. Registrar formato desconocido como pendiente sin ocultar originales.

No reutilizar `incorporar_inventario_local`: copia hash declarado como si fuera versión local. Aquí `version_local_sha256`, evidencia analítica y condiciones verificadas permanecen sin acreditar. Las coberturas no se forman por producto cartesiano; no habilitar reutilización analítica por pasar el esquema. Vigencia nula sigue siendo desconocida. Conservar identidad territorial separada de roles/alias institucionales, canal de productor y URLs completas en contexto.

## Adquisición como candidato, sin ejecución

Parámetro de candidatos explícitos: producto_id, acceso api/descarga y evidencia/justificación de candidatura. Validar registro cerrado por ID con datos proporcionados por consumidor, sin URL libre ni despacho dinámico. Un candidato que no está registrado se rechaza; una referencia no se transforma automáticamente en dataset. El CLI puede consultar `registro_descargas()` para validar IDs, pero nunca invocar descarga. `adaptador` puede identificar el ID de despacho registrado, documentándolo como tal.

Ningún producto es candidato por el simple hecho de tener URL/hash o estar en el registro: activación explícita y revisable. Se admite catálogo completo sin candidatos (con pendientes), y candidato registrado puede programar adquisición para validación sin acreditar aún cobertura. Documentar que filtros de adquisición siguen específicos del producto/Cartagena y que este cambio no los vuelve universales.

## Consumidor y artefactos

Nuevo subcomando recibe catálogo clasificado local, versión, salida bajo bridge y candidatos JSON opcionales. Produce en directorio nuevo `catalogo.json`, `contexto.json`, `manifiesto.json` (esquemas versionados, SHA del original y artefactos, vínculos por IDs/punteros). Validar rutas/symlinks y no sobrescribir; publicación completa mediante carpeta temporal/renombrado. No perder el contexto entre artefactos: el manifiesto vincula la pareja y la procedencia del producto conserva referencia documental verificable.

El comando existente `planificar --perfil --catalogo` debe poder consumir realmente el catálogo generado. Ejecutar ese flujo con perfil sintético etiquetado, candidato explícito registrado cuando aplique, sin descarga ni ejecución analítica. Esto prueba conexión al grafo de selección, no ingestión ni orquestación completa.

## Validación autorizada

Ruff check/format y SOLO `pytest --noconftest tests/test_adaptador_catalogo_fuentes_polis.py`. Pruebas de conversión fiel de referencias/series, 63 fichas preservadas, nulos sin inventar aptitud, candidatos no registrados rechazados, no confianza en SHA declarado, formatos inválidos, sidecar sin pérdida y CLI real + planificar existente. Usar datos sintéticos para necesidades; catálogo oficial documental65 en modo lectura para cotejo real. Registrar hashes/artefactos/logs y resultados honestos. No ejecutar suite general ni conftest que migra base.

Sin SQL, red, nuevas dependencias, fuentes oficiales descargadas, promociones al banco, commit/push o despliegue. No modificar código ajeno para forzar aprobación. Si hay bloqueo informar ruta/causa y conservar avances. Congelar al cerrar y notificar `OL-FUENTES-04 entregado: bridge/110_entrega_ollamacodex_adaptador_catalogo.md` a `=codex:0.0`, texto y Enter separados.
