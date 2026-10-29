# Revisión de coordinación del inventario de fuentes

26 de octubre de 2026. Estado de esta revisión: **vista local actualizada después de staging y revisión independiente acotada**. El inventario anterior permanece conservado byte a byte. Este informe documenta comprobaciones técnicas del coordinador; el dictamen independiente corresponde a 235 y su alcance propio.

## 1. Brecha conservada

El cotejo completo 207 detectó una discrepancia entre 1.829 entradas: el resumen operativo `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`. El inventario anterior esperaba 51.693 bytes y SHA `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a`; el archivo actual tiene 4.815 bytes y SHA `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38`.

La búsqueda 216 revisó por tamaño 31.424 archivos regulares actuales del checkout dentro del alcance declarado y no encontró el original esperado. No incluyó archivos internos de comprimidos, dependencias, enlaces ni ubicaciones externas. **No se ha recuperado el original, explicado la causa del cambio ni comprobado una diferencia semántica.** El resumen es control derivado de sincronización; no es una nueva estadística institucional.

213 conserva los bytes del inventario anterior y del resumen actual. 219 propuso cambiar únicamente esa entrada por una captura bajo `versiones/`, dejando visible el hallazgo. Todos esos antecedentes permanecen intactos.

## 2. Corrección del contrato del candidato

La comprobación 223 materializó la captura en staging y ejecutó el verificador real. El candidato 219 falló con `KeyError: catalogo_ruta`: había puesto procedencia genérica en `evidencia_origen`, que el importador interpreta exclusivamente como asociación al catálogo Drive.

El candidato corregido conserva esa procedencia en `captura_control.procedencia_captura` y deja `evidencia_origen` vacío. Su SHA es `369e55b7643352ff37909c0b6cd8be45b6781ab7d4db0c953738a7f4629f18d1`. La comparación propia confirma:

- Las 43 claves de series, ocho paquetes y el SHA del consolidado permanecen iguales al inventario anterior.
- Las 1.829 entradas cambian solamente en la entrada del resumen: nueva ruta congelada, rol `derivado_control` y sus bytes reales.
- La referencia al inventario anterior y el original no localizado permanecen explícitos. No se modifica una fuente para declararla aprobada.

Evidencia: [cotejo propio](217_evidencia_revision_inventario/cotejo_candidato223.json), [reproducción del error y corrección](223_validacion_candidato_inventario/resultado_compatibilidad.json).

## 3. Validación integral en staging y PostgreSQL de prueba

El guion [224](224_comprobar_inventario_staging.py) se ejecutó con la guarda estricta de 205 y DSN explícito, exclusivamente en la base propia `polis_test_edd_coord_20261026_d4afb7fa`. El verificador examinó las **1.829 entradas completas**. Staging usa 1.828 enlaces de lectura a los originales y una copia física del resumen capturado: no se presenta como copia inmutable del banco.

El importador real se ejecutó dos veces. Ambas devolvieron 43 claves, ocho paquetes, 1.829 artefactos y cero promociones. Las seis tablas del catálogo conservaron exactamente conteos y hashes de contenido entre las dos cargas. Se registraron 39 artefactos vinculados y 1.790 pendientes de asignación; esto continúa siendo una brecha de vinculación. La evaluación estructural de 39 verdes y cuatro ámbar no constituye validación semántica o licencia aprobada.

Se añadió al candidato de prueba un primer artefacto válido y otro con formato deliberadamente demasiado largo. PostgreSQL produjo un `DBAPIError` tardío. La observación desde una nueva conexión física comprobó que las seis tablas completas conservaron sus contenidos anteriores: **rollback íntegro**, sin persistencia parcial del primer artefacto.

Retorno del guion: 0. [Resultado detallado y hashes de tablas](205_evidencia_temporales_pruebas/224_staging_inventario/resultado.json). Esta ejecución no publicó el inventario activo ni escribió en una base productiva.

## 4. Generación y publicación local ejecutadas

El encargo 227 limita la corrección de código al generador y su archivo de pruebas. Exige excluir el resumen mutable exacto, conservar las capturas como controles derivados, archivar los bytes exactos del inventario anterior y los de la nueva versión, mantener el hallazgo al regenerar cuando sea aplicable y rechazar referencias inconsistentes antes de publicar.

228 quedó congelado con 36 pruebas sintéticas y Ruff/formato correctos. Coordinación cotejó los 275 archivos del manifiesto, sin divergencias. La primera comprobación propia resolvió equivocadamente las rutas relativas contra la raíz del repo; se corrigió a la carpeta del manifiesto y se conservó la nota del error del comprobador. Ese error no es un defecto de 228.

El candidato definitivo conserva las 1.829 entradas de 223 y cambia solo metadata operativa: referencia al archivo inmutable previo, ruta/estado explícitos de captura y retiro del aviso obsoleto de ruta futura no existente. SHA definitivo: `ec1b06f4f255791561308ade00bf4dd7b60b1d3856d1d0ce5fe3f6d5ef5b2823`. [Preparación y cambios](217_evidencia_revision_inventario/preparacion_candidato_publicacion.json).

El guion [217 de publicación](217_publicar_inventario_controlado.py) comprobó primero una transición física en un directorio temporal, incluyendo repetición y las dos versiones byte a byte. La evaluación independiente 235 comunicó su conclusión funcional aprobada, limitada a estos bytes, antes de la publicación: 17 casos propios y las 36 sintéticas de producto conformes; sin duplicar SQL de 224 ni aceptar calidad semántica. Su informe conserva el corte previo a la publicación.

A las **06:56:04 UTC del 26 de octubre de 2026**, coordinación materializó la captura mediante archivo temporal sincronizado y enlace exclusivo, comprobó las entradas con el generador real y sustituyó la vista local mediante el publicador evaluado. El SHA activo es el definitivo `ec1b06f4…`. El archivo previo completo se conserva bajo `data/fuentes_versiones/inventarios/5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c.json`; la versión nueva bajo su SHA. El resumen mutable actual conserva sus bytes, pero deja de formar parte de este inventario de capturas.

La lectura real posterior del generador devuelve las mismas 43 series, ocho paquetes y 1.829 entradas, conserva el hallazgo y referencia exactamente el nuevo SHA previo para la siguiente generación. No se publicó una segunda versión por esa lectura. [Staging físico](217_evidencia_revision_inventario/publicacion_staging.json) y [ejecución local](217_evidencia_revision_inventario/publicacion_publicar.json).

Las tres pruebas bloqueadas en el global 205 se están reejecutando sobre los archivos realmente publicados. Su resultado y el check global final se registran separadamente; no se altera 205 ni se atribuye a aquella corrida el éxito de staging.

## 5. Límites

Este saneamiento no recupera el resumen perdido, no certifica los datos de todas las fuentes, no crea denominadores demográficos y no resuelve la integración de todos los motores. No cambia diagnósticos ni documentos Google, no activa sincronizadores y no constituye autorización de despliegue. Los informes anteriores permanecen como evidencia de su estado original.
