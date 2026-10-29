# Revisión de coordinación: adaptador R1 y parser numérico v2

26 de octubre de 2026. Se leyeron116/118, implementación y pruebas; se reprodujeron pruebas dirigidas y piloto local. Sin SQL/red, cambios de banco, dictamen EAF ni despliegue.

## Adaptador catálogo–planificador

La R1 pasó inicialmente sus 15 pruebas. Registro real cerrado consultado por el CLI; restricciones externas no pueden ampliarlo. Candidaturas tipadas conservan evidencia/procedencia, duplicados y discrepancias se rechazan. Lectura acotada y comandos previos conservan su ámbito de salida. La suite ejecuta catálogo y planificar reales, sin adquirir.

Coordinación añadió un ajuste de preservación: el objeto `documento_original` usa Decimal exacto en memoria, pero al serializarse a JSON esos decimales se convierten en cadenas. Se añadió `documento_original_json`, con el texto original UTF-8 exacto; se desactivó específicamente su recorte de espacios heredado del modelo. Así se puede recuperar el documento original con números JSON y comprobar su SHA, mientras la proyección tipada sigue usando Decimal. Una prueba nueva verifica ida y vuelta, salto de línea, tipos y hash.

Primera ejecución de esa prueba nueva detectó el recorte del salto de línea final; se corrigió antes del resultado final. El informe116 conserva el SHA anterior como entrega histórica; la evidencia120 fija los archivos posteriores al ajuste de coordinación.

Resultado actual: 16 pruebas de adaptador dentro de la selección conjunta y segunda corrida separada para comprobar repetibilidad. Flujo real catálogo clasificado→artefactos catalogo/contexto/manifiesto→planificar: comprobado en pruebas, con candidato registrado y perfil sintético. Programar adquisición no equivale a ejecutarla ni a acreditar aptitud analítica.

## Parser v2 y piloto real

Se conserva la elección explícita de regla. La omisión sigue usando decimal_simple_v1. decimal_coma_miles_terridata.v1 no se autodetecta; conserva texto original y usa Decimal exacto. Las guardias18/20 son decisión explícita mayor que lo observado13/15, no una certificación DNP.

Coordinación volvió a leer el ZIP original, verificó SHA/CRC/miembro/límites y ejecutó el parser con la regla nueva. Comparó **las 12.899 filas campo a campo** contra JSONL118, incluido el campo adicional de exportación version_parser. Los conteos coinciden exactamente:

| Resultado | Filas |
|---|---:|
| Aceptadas por parser | 12.230 |
| Retenidas | 667 |
| Rechazadas | 2 |
| Total | 12.899 |

Se interpretaron 12.077 valores numéricos: 12.072 en filas aceptadas, 3 en retenidas y 2 en rechazadas. Las dos sin Unidad de Medida siguen rechazadas. Se verificaron los originales; no se promovieron al banco. Aceptación por parser es conformidad con reglas de lectura y validación declarada, no calidad semántica de todos los indicadores.

## Pruebas y comprobaciones

Selección conjunta de los tres archivos, con --noconftest para evitar migraciones no necesarias: **149 passed, 0 failed** (72 conciliador +61 parser +16 adaptador). JUnit `119_pytest_tres_componentes.xml`. Segunda corrida de adaptador en `119_pytest_adaptador_corrida2.xml`. Ruff check y format --check sobre los cinco archivos afectados pasan.

Cotejo de piloto: `119_cotejo_piloto_numerico.json`. La primera comparación literal omitía version_parser agregado por el guion118; se ajustó el cotejo para verificarlo además de todos los campos del modelo, sin alterar datos ni código del parser.

## Pendientes

Se asignó revisión cruzada de esta versión: Freebuff revisa adaptador y ajuste de preservación; Ollamacodex revisa regla numérica y piloto. Sigue pendiente la ficha territorial canónica, identidad con catálogo oficial, semántica de observaciones/proyecciones, licencias/coberturas y consumidor de ingesta validada. La selección no certifica orquestación completa ni uso de cifras en diagnóstico.

No cambios de frontend, nuevas dependencias, promociones de banco, commit/push, servicios o despliegue. Los hashes y XML finales se registran en `120_evidencia_revision_adaptador_parser.json`.
