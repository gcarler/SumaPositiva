# Corrección de rutas temporales en pruebas backend

26 de octubre de 2026. Coordinación corrigió las ocho restricciones de archivos observadas en 183/global 18. Es implementación y verificación EDD; no dictamen independiente ni autorización GO-LIVE.

## Cambios

Se conservaron las aserciones de los seis archivos afectados: adaptador de catálogo, conciliación retrospectiva, ficha territorial, gold set, ingesta de directorio e IPC. Las pruebas ya no publican sus temporales en bridge 116/93/139, el banco activo o un nombre fijo de `/tmp`.

Los CLI mantienen su política de rutas de producto: el helper de pruebas `tests/cli_workspace.py` copia sus bytes exactos a un checkout temporal, agrega copias exactas de módulos requeridos para las huellas y ejecuta ese programa con imports del backend real. No modifica las validaciones del CLI ni enlaza archivos mutables al repositorio. Las pruebas verifican igualdad de bytes, rechazo de rutas ajenas y conservación del programa al rechazar una sobrescritura.

El ensayo HTTP de directorio cambia únicamente el directorio autorizado del router mediante fixture, conservando la comprobación de recorrido `../`. El deflactor escribe a un destino temporal explícito, conservando origen y factores reales. El gold set usa una ruta única por prueba.

## Verificación

-138 pruebas dirigidas puras pasan;41 pruebas en los otros dos archivos pasan. Son 179 casos en archivos disjuntos, sin omisiones. Se conserva una advertencia de openpyxl sobre extensión de validación no soportada.
- Ruff y formato de ocho archivos conformes. El primer check detectó un import Path ausente y orden de imports; se corrigieron antes de las pruebas y se registró esa iteración.
- Esas dirigidas usan las dos bases propias de coordinación 190 cuando necesitan SQL; no se reutilizan destinos de otros agentes.
- Para el check final se copió a 205 la guarda estricta de 183, SHA `91613084a5e6a6659d4580e7f12db07a24328d7a1ff544d55b2540d22b8898ce`. Comprobadas 16 negativas anteriores a I/O, conexión positiva a cada base y temporal dentro de evidencia. No es sandbox universal para procesos nativos.

Los comandos dirigidos y JUnit están en 190 con prefijo `205_temporales_*`; logs de lint, guardas y snapshots del check final en [205](205_evidencia_temporales_pruebas/).

El check global final terminó con **1.431 pruebas aprobadas, tres fallidas y 16 omitidas**; Ruff y formato pasan. Retorno global 1, duración total 517,097 s y pytest 507,93 s. Los 548 archivos del snapshot inicial/final son idénticos. Los ocho fallos de temporales ya no se reproducen bajo la guarda estricta.

Los tres fallos restantes son `test_carga_real_no_duplica_y_no_promueve`, `test_fallo_tardio_revierte_artefacto_insertado_desde_otra_sesion` y `test_inventario_publicado_coincide_con_archivos_actuales`. Comparten la discrepancia de `resumen_sincronizacion.json`; el caso de fallo tardío no alcanza su inyección SQL porque la validación previa de inventario lo rechaza. No se lo declara comprobado por esa corrida. Las causas individuales de omisión y trazas están en [resultado clasificado](205_evidencia_temporales_pruebas/resultado_global_clasificado.json). **No se aprueba la suite global ni GO-LIVE.**

El único desajuste de inventario se investiga separadamente en 207. No se cambió el corpus, inventario ni sus hashes para hacer pasar esos tres casos. Los contratos/documentación de aportes se integraron en permisos-api, operación y transacciones antes del snapshot 205; la reinspección independiente 203 los evalúa por separado.

Sin cambios de aplicación en esta corrección de temporales, sin commit, push o despliegue. Las fuentes 20 de 183 permanecen congeladas para EAF.
