# EAF-FUENTES-INVENTARIO-01 · Revisión previa a publicación local

**Estado: APROBADO en el alcance acotado de código228 y candidato final de coordinación.** No se reprodujo un defecto que impida esta sustitución local bajo las precondiciones comprobadas. La conclusión funcional se comunicó antes de que coordinación iniciara la publicación; este informe conserva ese corte y no acredita la ejecución posterior sobre archivos activos.

26 de octubre de 2026. Evaluador independiente de227/228 y de la preparación/publicación de coordinación. Encargo [234](234_encargo_revision_inventario_versionado.md), AGENTS y skill EAF aplicados. Únicas escrituras propias: este informe y [evidencia235](235_evidencia_revision_inventario/). Sin cambios de producto, banco, datos activos, documentos o evidencia histórica;226 permanece congelado.

## 1. Objeto comprobado

Se esperó `REVISAR_INVENTARIO_228`. Antes del primer subprocess funcional se cotejaron:

| Objeto | SHA256 |
| --- | --- |
| `scripts/inventariar_fuentes_polis.py` | `202956eaf155fa6cd2e58d4b6804fefb9390b10de2cbb84cc55b60ddded8460e` |
| `backend/tests/test_inventario_fuentes_polis.py` | `bf66f99dd0e93af5bfc288d7efbc8fb6bf9691e59e79e08aae868db1f882d3fa` |
| Informe228 | `b3d1fc96cc6def4ddc14ae6267c369dfd13b1774e77ff3d14cccaf286e87852a` |
| Candidato final217 | `ec1b06f4f255791561308ade00bf4dd7b60b1d3856d1d0ce5fe3f6d5ef5b2823` |

Se leyeron205/207/216/217,223/224,227/228 y el importador. Las45 entradas del snapshot cotejaron idénticas al cerrar el objeto funcional, **antes de liberar la publicación de coordinación**. Los dos archivos de código e importador permanecen fijados; los documentos de coordinación pueden registrar después aquella actuación autorizada. Se conservó una copia física del informe217 leído antes de publicar.

Las siete funciones de prueba preexistentes conservaron su AST y aserciones. El importador no cambió. [Autorización](235_evidencia_revision_inventario/autorizacion_inicio.json), [snapshot del corte](235_evidencia_revision_inventario/snapshot_final_objeto.json) y [cotejo AST/fuentes](235_evidencia_revision_inventario/cotejo_AST_y_fuentes.json).

## 2. Aislamiento y resultados propios

No se provisionó ni usó base de datos. La revisión evalúa escritura de archivos; las pruebas de transacción SQL no aplican al cambio y no se suplieron con una carga productiva. Una guarda propia negó toda conexión SQL/red, lectura de datos activos y escrituras fuera de235. Pasaron diez rechazos anteriores a I/O y un temporal positivo propio. Es una guarda Python, no sandbox universal de procesos nativos. [Resultado](235_evidencia_revision_inventario/guardas_verificadas.json).

| Ejecución | Resultado |
| --- | --- |
| Casos independientes propios | **17 aprobados**, cero fallos/omisiones. |
| Sintéticas del archivo de producto | **36 aprobadas**, cero fallos/omisiones; tres funciones integrales deliberadamente deseleccionadas para no recorrer datos activos. |
| Cotejo documental de candidatos/224 | Conforme; sin ejecutar SQL ni revisar nuevamente los1829 archivos de datos. |

Comandos, tiempos y retornos: [02 propios](235_evidencia_revision_inventario/02_propias.log), [03 producto](235_evidencia_revision_inventario/03_sinteticas_producto.log), [04 cotejo](235_evidencia_revision_inventario/04_cotejo_documental.log), con metadatos/JUnit. No se duplicó el global. Ruff/formato conformes de228 se leyeron como evidencia del implementador; no se presentan como ejecución propia235.

Se conservan las correcciones internas de preparación/empaquetado en [ajustes](235_evidencia_revision_inventario/ajustes_preparacion.json): una referencia asumida a un manifiesto228 inexistente y un patrón de búsqueda de temporales. No fueron fallos del producto ni cambiaron sus bytes/aserciones. El gate ya había cotejado fuentes/informe antes de ejecutar; el snapshot de preparación comprobó cero diferencias.

## 3. Criterios comprobados

- **Exclusión exacta:** el resumen mutable queda fuera; un documento vecino se conserva. No se excluye indiscriminadamente el directorio ni se ocultan insumos para aprobar una prueba.
- **Clasificación y Drive:** captura congelada con rol `derivado_control`, bytes/SHA y paquete correctos, `evidencia_origen={}`. Las43 claves sintéticas permanecen pendientes de promoción. Un archivo Drive mantiene asociación explícita al catálogo; el verificador real del importador acepta ese corpus sintético, sin SQL. No se inventó una asociación Drive para la captura.
- **Generar es lectura:** snapshots de archivos idénticos antes/después; no publica, archiva ni crea capturas/versiones. Mantiene fecha de lectura/captura y separa fecha de generación, sin afirmar publicación oficial.
- **Historia condicionada:** conserva hallazgo y referencia al SHA anterior cuando continúa la asociación exacta; ausencia no transfiere la historia a otra captura. Captura alterada, origen divergente, referencia inconsistente, JSON ilegible, asociación Drive genérica o promoción pretendida rechazan sin cambiar la vista.
- **Archivo y sustitución:** preserva bytes anteriores exactos, incluso espaciado/orden no canónicos, y bytes nuevos bajo sus SHA antes de reemplazar la vista. La repetición no altera versiones. Conflictos de versiones, symlinks y cambio de la vista desde la generación se rechazan. Un fallo inyectado de reemplazo conserva vista y ambas versiones y limpia temporales.

Estos controles no prueban exclusión universal de escritores nativos concurrentes ni recuperación frente a pérdida de energía. La conclusión corresponde a la actuación local controlada revisada y sus comprobaciones de precondición; no promete atomicidad de todo el banco.

## 4. Transición real con referencias físicas

Se ejecutaron por separado la transición del inventario histórico hacia223 y hacia el candidato final217, dentro de235. Todas las referencias necesarias se copiaron físicamente desde evidencia histórica, sin enlaces al banco ni materializar rutas en los datos activos. Se verificaron archivo anterior byte a byte, archivo nuevo/vista idénticos, repetición y ausencia de symlinks.

| Versión | SHA256 |
| --- | --- |
| Histórico213,1.638.638 bytes | `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c` |
| Candidato corregido223 | `369e55b7643352ff37909c0b6cd8be45b6781ab7d4db0c953738a7f4629f18d1` |
| Final217 probado | `ec1b06f4f255791561308ade00bf4dd7b60b1d3856d1d0ce5fe3f6d5ef5b2823` |
| Captura de control,4.815 bytes | `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38` |

El cotejo propio confirma que223 y el final mantienen idénticas las1829 entradas de metadata. Respecto al histórico,1828 son iguales y solo se sustituye el resumen mutable por la captura de control. Las43 claves, ocho paquetes y SHA del consolidado permanecen iguales, sin promociones. Se conserva la brecha histórica: SHA declarado `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`,51.693 bytes, original no localizado y diferencia semántica no comprobada.

En el final, la referencia anterior apunta a la futura instantánea bajo su SHA; la prueba comprobó que el writer la crea con los bytes exactos antes de sustituir. Las procedencias de captura permanecen fuera del contrato Drive.

Staging preservado y sellado: [223](235_evidencia_revision_inventario/staging_fisico_223/) y [final](235_evidencia_revision_inventario/staging_fisico_publicacion/). Son seis y cinco archivos físicos de la transición/referencias, respectivamente: **no son copias completas de los1829 datos del banco**. [Resultados y hashes](235_evidencia_revision_inventario/resultados_y_staging_preservado.json), [cotejo documental](235_evidencia_revision_inventario/cotejo_candidatos_y224.json).

## 5. Evidencia compartida y conclusión

224 aporta evidencia técnica de coordinación: verificación1829, dos cargas idempotentes y rollback íntegro de seis tablas en su base propia, sin promociones. Se leyeron sus resultados y hashes;235 no ejecutó ni se atribuye esas pruebas. No constituyen revisión universal de los motores, semántica, licencias o independencia institucional de las claves.

**No se encontró un defecto reproducible que impida esta publicación local acotada del candidato final probado.** Corresponde a coordinación ejecutar la sustitución autorizada con sus precondiciones y después comprobar los archivos realmente publicados y las integrales pendientes. El snapshot235 conserva el estado anterior a esa publicación, cuyo resultado queda fuera de este dictamen.

No se recuperó el original perdido ni se certifica su inexistencia universal o la causa de la discrepancia. No se acredita calidad semántica, base censal, sincronizadores, disponibilidad de todos los motores ni GO-LIVE global. Sin SQL, red, commit, push o despliegue propios. [Manifiesto](235_evidencia_revision_inventario/manifest_evidencia.json) y [sello](235_evidencia_revision_inventario/sello_cierre.json) congelan los entregables235.
