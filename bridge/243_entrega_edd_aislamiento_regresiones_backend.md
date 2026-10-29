# EDD-TEST-AISLAMIENTO-03 · Aislamiento de dos regresiones backend

27 de octubre de 2026. Encargo [242](242_encargo_edd_aislamiento_regresiones_backend.md). **Estado: terminado y congelado para coordinación.** Revisión propia EDD con skill `polis-edd-transactions`, AGENTS y contrato de transacciones. Salidas exclusivas de este encargo: este documento y `243_evidencia_edd_aislamiento_regresiones/`; distintas del trabajo concurrente de heros.

## Causa reproducida antes de editar

En una base nueva propia, los consumidores de auditoría e ingesta pasaron 3/3. Después se ejecutaron dos escenarios originales de legado y el caso original de avance de indicadores; pasaron 3/3, pero dejaron los residuos siguientes. Al repetir los mismos consumidores se reprodujeron exactamente los dos fallos de 236, más un caso aprobado.

| Origen | Residuo y fallo reproducido |
| --- | --- |
| `test_aportes_legado_publico.py` | Inserta raíces JSON null/false/lista en auditoría institucional inmutable, sin aislamiento posterior. Quedaron cinco filas, incluidas `['legado']`. La consulta general de auditoría, cuyo contrato requiere objeto, falla al validar esa lista. |
| `test_presupuesto_e_indicadores.py::test_indicadores_cadena_valor_y_avance` | El teardown anterior borraba solo las dos mediciones, sin restaurar sus fichas; tampoco era `finally`. Ambas mediciones de prueba desaparecían, pero IND-INS-01 quedaba en Q1 e IND-RES-01 en Mes1, con valor/avance/metadatos sintéticos. El consumidor anual seguía exigiendo 2024-ANUAL y fallaba. |

[Diagnóstico y datos crudos](243_evidencia_edd_aislamiento_regresiones/diagnostico_origen.json), snapshots [limpio](243_evidencia_edd_aislamiento_regresiones/estado_antes_limpio.json) y [contaminado](243_evidencia_edd_aislamiento_regresiones/estado_antes_contaminado.json), y logs 02/04/06. Se notificó la reproducción a coordinación antes de editar. La base anterior se conserva con esos residuos, sin sanearla para obtener verde.

## Corrección limitada a fixtures

- **Legado:** un esquema UUID privado por caso copia la tabla real con `LIKE INCLUDING ALL`, añade las FK originales y recrea sus triggers no internos con las mismas funciones. Se cotejan columnas/defaults, constraints y trigger/OID/activación contra el catálogo institucional. `schema_translate_map` se aplica solo al engine de `cliente_legado`; las observaciones SQL usan esa misma tabla privada desde conexiones físicas distintas. Todos los asserts de JSON crudo y lectura pública siguen ejecutándose antes del teardown. `finally` elimina únicamente la tabla/esquema UUID propios con RESTRICT, sin CASCADE, DELETE/UPDATE de auditoría institucional ni desactivar triggers. El snapshot institucional completo debe quedar idéntico. Este aislamiento fue propuesto y autorizado expresamente por coordinación; no se cambió conftest.
- **Indicadores:** una fixture captura las dos fichas afectadas y sus mediciones existentes. En `finally` identifica como máximo dos UUID nuevos, ajenos al snapshot y con ficha/periodo/autor exactos del caso; rechaza residuos desconocidos o ambiguos. Borra únicamente esos UUID y restaura los cuatro campos mutables desde el snapshot original, sin escribir 2024-ANUAL como valor fijo. Verifica desde otra conexión que filas completas y mediciones previas quedaron idénticas. La transacción de restauración incluye ambos destinos.

Únicos archivos de tests editados: [legado](../backend/tests/test_aportes_legado_publico.py) y [presupuesto/indicadores](../backend/tests/test_presupuesto_e_indicadores.py). El archivo adicional fue avisado y autorizado antes de editar. `test_ingesta_indicadores.py` permanece idéntico y mantiene su aserción anual. [Cotejo AST](243_evidencia_edd_aislamiento_regresiones/asserts_originales_conservados.json): los 91 asserts originales de las 14 funciones de test se conservaron idénticos, incluidos los valores crudos y el avance 50. [Parche real contra los bytes iniciales](243_evidencia_edd_aislamiento_regresiones/cambios_aislamiento.patch).

## Comprobaciones propias

| Corrida | Resultado |
| --- | --- |
| 02 consumidores limpios | 3 aprobadas. |
| 04 productores originales | 3 aprobadas; residuos capturados. |
| 06 consumidores tras residuos | Dos fallos 236 reproducidos, una aprobada. Se conserva el fallo. |
| 07 misma secuencia corregida | 6 aprobadas. |
| 09 productores→consumidores, paquetes completos | 157 aprobadas,39,15s. |
| 11 consumidores→productores, repetición en la misma base | 157 aprobadas,58,40s. Es la misma matriz repetida, no 314 casos distintos. |
| 14 inmutabilidad y constraints | Una aprobada: UPDATE/DELETE rechazados, FK inexistente y causal inválida rechazadas; JSON crudo preservado y proyección pública válida. |
| 15 fallo deliberado después de todos los asserts del legado | Una fallida intencional y tres consumidores posteriores aprobados. Teardown ejecutado; auditoría principal intacta y esquema privado retirado. |
| 17 fallo deliberado después del primer POST 201 real | Una fallida intencional y dos consumidoras posteriores aprobadas. La medición estaba confirmada y observada por otra conexión antes de inyectar el error, incluso antes de entregar su UUID al test. `finally` retiró solo esa fila y restituyó las fichas. |
| 19 consumidores, control de fases/OAuth y guardas transaccionales | 14 aprobadas. |
| 12/13 Ruff y formato | Ruff conforme; 543 archivos con formato conforme en ese momento de captura. |
| 21 última pasada tras detectar concurrencia | 157 aprobadas, 47,80s; los 554 hashes de fuentes inicial/final son idénticos. |
| 22/23 Ruff y formato finales de los dos tests editados | Ambos conformes; sin cambios posteriores de esas fuentes. |

Los [hashes SQL antes/después](243_evidencia_edd_aislamiento_regresiones/cotejo_sql_restauracion.json) de auditoría institucional, dos fichas completas, sus mediciones, triggers principales y ausencia de esquemas privados coinciden tras el paquete, ambas inyecciones y la comprobación final. Los errores deliberados permanecen en logs/JUnit y no se presentan como aprobados. [Resultados estructurados](243_evidencia_edd_aislamiento_regresiones/resultados_resumidos.json); comandos y retornos exactos en cada log.

## Entorno y límites

Bases nuevas desde `template0`, propietario original y extensiones locales; sin copiar datos de trabajo ni reutilizar bases ajenas:

- `polis_test_edd_aislamiento_20261027_antes_8232579c`: reproducción original conservada.
- `polis_test_edd_aislamiento_20261027_despues_74fa3566`: corrección, repetición y fallos controlados.

DSN explícitos resueltos antes de importar aplicación; credenciales en memoria. Guarda propia adaptada de 215, sin cambiar guardas compartidas: nombres exactos de ambas bases, loopback/puerto 5432, validación asyncpg/psycopg/SQLAlchemy, bloqueo SMTP y sockets externos, escrituras Python limitadas a evidencia y temporales propios. [Dieciséis rechazos anteriores a I/O y positivos en ambas bases](243_evidencia_edd_aislamiento_regresiones/guardas_verificadas_v2.json). Es una guarda Python, sin afirmar sandbox universal de procesos nativos. No conexión a bd_csh, base de coordinación u otros agentes; no proveedores externos.

No se modificaron aplicación, esquemas/migraciones institucionales, contratos, corpus, datos activos, src, docs, configuración ni fixtures compartidas por parte de EDD243. No se repitió el global por orden 242: 236 sigue siendo evidencia previa, 1615/2/16. Corresponde a coordinación ejecutar un nuevo global posteriormente. Las 16 omisiones previas no se reevalúan aquí. Se acredita limpieza en éxito y excepciones controladas; no se afirma cleanup ante terminación del proceso.

## Cierre

Durante el sellado se detectaron cambios externos concurrentes en `backend/app/modules/politicas/router.py` y `schemas.py`, notificados a coordinación en [detección](243_evidencia_edd_aislamiento_regresiones/deteccion_concurrencia.json). No se revirtieron ni se atribuyeron a este encargo. La última corrida 157/157 capturó [554 fuentes iniciales](243_evidencia_edd_aislamiento_regresiones/snapshot_validacion_estable_inicio.json) y [finales](243_evidencia_edd_aislamiento_regresiones/snapshot_validacion_estable_fin.json) idénticas. Es evidencia dirigida sobre esos bytes, sin afirmar aprobación del trabajo concurrente.

Respecto a 236, el [cotejo](243_evidencia_edd_aislamiento_regresiones/cotejo_236.json) distingue dos tests propios autorizados, esos dos cambios externos y 550 fuentes idénticas. `conftest`, ingesta y módulos de aportes/indicadores/auditoría permanecen sin cambios por EDD243. La comprobación SQL posterior a la última corrida también coincide con el baseline. No se creó revisión migratoria ni se ejecutó downgrade.

[Cotejo histórico](243_evidencia_edd_aislamiento_regresiones/cotejo_historicos_final.json): 68 artefactos 183, 43 de 215 y 58 de 226 sin divergencias; resultado 236 intacto. [Fuentes finales](243_evidencia_edd_aislamiento_regresiones/fuentes_finales.json), [manifiesto](243_evidencia_edd_aislamiento_regresiones/manifest_evidencia.json) y [sello](243_evidencia_edd_aislamiento_regresiones/sello_cierre.json).

| Fuente | SHA256 |
| --- | --- |
| `backend/tests/test_aportes_legado_publico.py` | `d95635793a8acbcac78c122810b4e1a70559ce8b7c437dc4b5ea5b8f29fdaa65` |
| `backend/tests/test_presupuesto_e_indicadores.py` | `ad41d65144c303abac43fa3951565758204368992b5de2a5c309ba6bb2fe5c52` |
| `backend/tests/test_ingesta_indicadores.py` | `71aab3928b14608100c1293c21074dd401cd4d467771fff61be96019fafd3fcb` |

Se conservan 236, las entregas/evidencias183/215/226 y el árbol sucio. Sin commit, push, deploy ni dictamen EAF propio.
