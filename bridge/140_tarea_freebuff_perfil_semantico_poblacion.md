# FB-TERR-SEM-01 · Perfil de evidencia demográfica del corpus local

26 de octubre de2026. Resolver134 se conserva congelado para revisión de coordinación/OpenCode. Nueva tarea útil para validación semántica pendiente de la ficha, sin editar código ni datos.

Leer JSONL118 (hash cotejado en119), resumen/contrato118, plan76 y criterios131/138 sobre naturaleza observada/proyectada, base censal y vintage. Perfilar las series con dimensión/indicador/fuente explícitamente demográficos, manteniendo regla de selección literal y documentada. Incluir la dimensión original Censo2005 cuando exista; no inferir que todo dato DANE usa la misma base ni que un año futuro basta para declarar proyección.

## Salida concreta

Únicas escrituras `bridge/141_perfil_freebuff_evidencia_demografica.md` y `bridge/141_evidencia_demografica.json` (guion reproducible incluido). Por serie exacta: identidad territorial, dimensión/subcategoría/indicador/unidad/fuente original, filas/periodos explícitos, estados, valores presentes/nulos, referencias fila/sha y expresiones del origen que mencionen censo/base/proyección. Identificar duplicados de celda sin escoger/sumar dato ni convertir rango en continuidad.

Separar tres niveles: literal publicado, candidato de interpretación y evidencia primaria todavía necesaria. Base censal, naturaleza y vintage quedan no determinados cuando no estén acreditados por el producto; no asignar fecha/base porque coincide con una preferencia del usuario. Registrar requisito solicitado: base2005 antes de2018 y CNPV2018 desde2018 para el uso previsto, con conflictos y series que aún requieren documentación. No calcular población2026 por extrapolación.

Proponer verificaciones mínimas por cada familia para autorizar su uso posterior en ficha/mapa: denominador, periodo, unidad, observación/proyección, base/vintage y fuente. No es documento diagnóstico ni publicación; es matriz de pendientes trazables para no confundir lectura numérica con dato apto.

Solo lectura local y perfilado determinista del corpus ya conservado. Sin red/SQL/pruebas de aplicación/descargas/cambios de código/tests/ficha/JSONL/originales/banco/commit/push/deploy. Ollamacodex corrige ficha138/139; no tocar sus archivos. Congelar y avisar `FB-TERR-SEM-01 entregado` a =codex:0.0 con literal y Enter separados.
