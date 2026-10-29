# COORD-FUENTES-INVENTARIO-01 · Preservar capturas y versiones del inventario

26 de octubre de2026. El usuario autorizó consolidar y sanear el flujo de fuentes. El global205 conserva tres fallos por un único resumen mutable;207/216 identificaron la brecha histórica. Preparar la corrección de generación/publicación del inventario; coordinación revisará y hará posteriormente la actualización local con precondiciones. No declarar recuperación del original perdido ni promoción semántica.

## Alcance y aislamiento

Editar solo `scripts/inventariar_fuentes_polis.py` y `backend/tests/test_inventario_fuentes_polis.py`; entrega `bridge/228_entrega_versionado_inventario_fuentes.md` y `bridge/228_evidencia_versionado_inventario/`. Sin frontend, otros backend, fixtures/config, diagnósticos, banco/datos activos, SQL, red, sincronizadores, commit/push/deploy. Usar fixtures sintéticas temporales para comprobaciones. Root227 autoriza tests dirigidos y Ruff de esos dos archivos; no global concurrente ni ingesta real. No más delegación.

Leer AGENTS,205/207/216,212/213/218/219, y223/resultado_compatibilidad. Dato actual: inventario SHA5fa69c6d... y resumen7dfb91e3..., esperado históricoa7443aa1...51693bytes. Archivo histórico no localizado: no se fabrica ni se reemplaza por el actual.213 y219 son propuestas; preserve todo ese material.

## Contrato de corrección

1. `EXCLUIR_MUTABLES`: excluir la ruta exacta del resumen mutable `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`. No excluir indiscriminadamente los datos oficiales ni reducir asserts para aprobar la suite.
2. Capturas futuras bajo `data/planes_accion/drive_sector_seguridad/versiones/` se clasifican como `derivado_control`; no como fuente oficial ni aprobada. El resto de clasificación,43 fuentes y estado de promoción permanecen iguales. El generador debe inventariar bytes congelados cuando existan, nunca crear/sobrescribir esa captura por efecto de una lectura.
3. Preservar trazabilidad al regenerar: el inventario puede conservar metadata explícita de `captura_control`/`hallazgo_historico` de la versión anterior si siguen siendo aplicables a la captura inventariada, y referencia verificable al SHA exacto de esa versión anterior. No copiar ciegamente una asociación a una captura que ya no esté presente ni inventar una base censal/certificación. Documentar las reglas.
4. `generar()` es lectura: no publica/archiva. `escribir_inventario()` conserva los bytes exactos de la vista anterior bajo SHA antes de reemplazarla, además de guardar la nueva versión inmutable. No reserializar la vista anterior y llamarla original. Verificar versiones existentes; rechazar symlinks/sobrescritura divergente. Mantener publicación atómica de la vista y guardas de entradas/destinos.
5. Importador real `backend/scripts/cargar_catalogo_fuentes.py` interpreta `evidencia_origen` no vacío exclusivamente como asociación Drive con catalogo_ruta/catalogo_sha256.219 puso metadata genérica y falló con KeyError;223 conservó esa procedencia en metadata explícita de la captura y dejó evidencia_origen vacío. No cambiar importador ni inventar asociación Drive. Respetar ese contrato en el generador.

## Evidencia de aceptación

- Fixtures muestran que el resumen mutable queda fuera y una captura congelada entra con rol correcto, SHA/bytes exactos y prefijo de paquete válido; ninguna fuente gana aprobación.
- Regeneración conserva la brecha histórica y vínculo a versión anterior solo cuando correspondan; probar presencia/ausencia/cambio de captura, JSON anterior ilegible y rutas/hash inconsistentes. Ante inconsistencia, fallar con causa explícita antes de publicar.
- Escritura conserva versión anterior byte a byte aunque su espaciado/orden no sean canónicos; versión nueva y vista coinciden. Repetición de contenido no corrompe versiones y contenido divergente/symlink se rechaza antes de sustituir la vista.
- `generar()` no escribe; tests de staging existentes mantienen su significado. Comprobar idempotencia de contenido donde corresponda y fechas de captura/inventario separadas de publicación oficial.
- Tests nuevos y existentes del archivo, Ruff/formato de los dos archivos. Las tres pruebas integrales del inventario activo seguirán sujetas a la actualización real posterior; no declararlas verdes por mocks. Se puede ejecutar el subconjunto sintético con --noconftest, sinSQL.

Entregar código pequeño, reglas y límites con comandos/resultados y hashes iniciales/finales. Preservar errores y no modificar las otras fuentes congeladas por EDD/EAF de identidad/aportes. Al congelar228 notificar a coordinación; root revisará el diff y staging antes de realizar publicaciones locales.
