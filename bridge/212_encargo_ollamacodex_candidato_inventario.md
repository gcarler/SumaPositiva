# OL-FUENTES-SHA-02 · Preparar una captura versionada revisable

26 de octubre de2026. Continuación del cotejo206/207. Las tres pruebas de inventario siguen fallando por el mismo resumen mutable. Preparar una solución concreta preservando la pérdida histórica identificada, sin modificar el inventario activo ni sus tests.

Únicas escrituras: `bridge/213_candidato_ollamacodex_inventario.md` y `bridge/213_candidato_ollamacodex_inventario/`. No app/tests/src/docs, datos activos, SQL, red, pytest, sincronizadores, commit o push. Leer207, el inventario actual, el resumen actual, `inventariar_fuentes.py` si existe (localizar nombre real), `cargar_catalogo_fuentes.py` y restricciones de paquete/ruta. No editar esos programas.

## Entregable concreto

1. Congelar en213 una copia exacta del inventario activo y otra del resumen actual, con nombres por SHA, creación exclusiva, bytes y fecha UTC de captura. Verificar hashes antes/después. No confundir mtime ni fecha de captura con fecha oficial de publicación.
2. Preparar un candidato de nueva versión del inventario: mantener las43 fuentes, ocho paquetes y1829 entradas; sustituir únicamente la entrada mutable por una referencia propuesta a una captura inmutable futura bajo el prefijo válido del paquete `planes_accion`. Mantener SHA/tamaño actuales solo para esa captura nueva, sin afirmar que reconstruye el original perdido. Clasificarla como derivado de control, sin cambiar calidad/promoción de fuentes oficiales.
3. Conservar referencia explícita al SHA del inventario anterior, SHA/tamaño esperados del original perdido y SHA/tamaño de la nueva captura. La nueva versión debe declarar que el original histórico no se localizó y que no se comprobó una diferencia semántica entre ambos contenidos. No borrar esa brecha.
4. Archivo de operaciones propuestas con rutas relativas exactas, precondiciones de SHA/ausencia, origen local congelado, destino futuro y orden de publicación. Debe permitir revisar la operación sin ejecutarla ni copiar todo el banco. Rechazar sobrescrituras y symlinks en la especificación.
5. Diagnosticar cómo el generador de inventario vuelve a incluir resúmenes mutables y proponer el ajuste mínimo que necesitaría para inventariar capturas. No implementarlo ni afirmar que el candidato ya es cargable: sus rutas futuras aún no existen.

El informe debe separar: copias creadas realmente en213, candidato validado estructuralmente en memoria, operaciones futuras no ejecutadas y pérdida histórica no resuelta. No modificar un hash esperado para aprobar el inventario anterior. Notificar a `=codex:0.0` y congelar la entrega.
