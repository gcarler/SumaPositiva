# EAF-AP-GOLIVE-03 · Reinspección de AP-03/R01

**Estado: APROBADO para el cierre acotado de AP-03/R01 sobre los bytes finales de215.** Los seis fallos históricos de lectura legada ya no se reproducen y las regresiones ejecutadas son conformes. El dictamen203 permanece intacto como antecedente; esta evaluación complementa su bloqueo con evidencia nueva, sin reescribirlo.

26 de octubre de 2026. Evaluador independiente de la implementación214/215. Encargo [225](225_encargo_eaf_legado_aportes.md), con AGENTS, arquitectura, transacciones, permisos y skill `polis-eaf-transactions`. Este cierre no autoriza GO-LIVE global, commit, push o despliegue, ni constituye garantía jurídica.

## 1. Objeto y autorización

La preparación se limitó a lectura, casos y entorno. Las comprobaciones funcionales empezaron después de `REINSPECCION_LEGADO_215`, cotejando los tres hashes finales y la entrega/manifiesto indicados por coordinación:

| Archivo probado | SHA256 |
| --- | --- |
| `backend/app/modules/aportes/schemas.py` | `df558b2951f4f194c8028d291c62de922f11c042decbb2d6a1e0f8e21a4120e1` |
| `backend/app/modules/aportes/service.py` | `2a413c9d53d3a8fdb5c9dc4170655e5cf45ef8a251ed2688d227da3785469244` |
| `backend/tests/test_aportes_legado_publico.py` | `093df70a381bc16efa89d25c4e495b3e630c449af8e6e2a145a064218b5e8753` |

Entrega215 SHA `35cddfb93ff50904de8368eb4784090894bfe38adbf33cdf9a6258b24357fd43`; manifiesto de43 artefactos SHA `9d5d843b285b512a549f9189ba1dc423241b49fd525119958db6187f72568273`. Las cifras de EDD fueron evidencia de entrada; la conclusión se fundamenta en ejecuciones propias.

HEAD `07096bcd73531415d8b8329a8aba0ad64fa5d23c`, rama `remediacion/aud-2026-10-21`, árbol compartido sucio. Los507 archivos del snapshot inicial y final son idénticos. De las20 fuentes183,18 permanecen iguales y solo schemas/service difieren conforme al encargo.0084 conserva `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`.

Se cotejaron sin divergencias los68 artefactos183,87 de203 y43 de215. Informe203 intacto, SHA `34e841385f91493364271f08e5f20ecbb78f44ffe04f6fdec64b30173b33f2bc`. Las únicas escrituras del evaluador fueron este informe y [evidencia226](226_evidencia_eaf_legado_aportes/); no hubo correcciones de aplicación, tests de producto, datos activos, documentos o evidencias históricas.

Trazas: [autorización](226_evidencia_eaf_legado_aportes/autorizacion_inicio.json), [snapshot inicial](226_evidencia_eaf_legado_aportes/snapshot_inicio.json), [final](226_evidencia_eaf_legado_aportes/snapshot_final.json), [cotejo histórico](226_evidencia_eaf_legado_aportes/cotejo_historicos_final.json) y [diff revisado contra183/203](226_evidencia_eaf_legado_aportes/diferencias_producto_revisadas.patch).

## 2. Entorno propio y límites de aislamiento

Base nueva `polis_test_eaf_legado_r3_20261026_8b4a11fc`, creada desde `template0`, con extensiones provisionadas solo allí. No se reutilizaron bases215,203 u otros encargos. No se ejecutaron downgrade/reconstrucción y no fue necesaria una segunda base. Instalación nueva a0084 y `alembic check` conformes.

Los DSN explícitos se fijaron antes de importar aplicación, con credenciales solo en memoria y sin fallback a la base de trabajo. Guarda SHA `704053e21fe70c8de4aed238343082eca531311c51d59bcd69400821eb2012e8`: nombre exacto/host/puerto, drivers asyncpg/psycopg/SQLAlchemy, SMTP y sockets/DNS externos, escrituras Python limitadas a evidencia propia y temporales/cachés propios. Antes de cargar app pasaron16 rechazos anteriores a I/O, consulta positiva al destino y temporal propio. Es una guarda Python, no sandbox universal de procesos nativos.

Sin proveedores SMTP/Meta/Google reales, modificaciones de roles/servicios del clúster o acceso a `bd_csh`. Las autoridades sintéticas se provisionaron mediante SQL controlado exclusivamente en la base propia; el autorregistro siguió creando ciudadanos. [Guardas](226_evidencia_eaf_legado_aportes/guardas_verificadas_v2.json).

## 3. Resultados ejecutados

| Ejecución propia | Resultado |
| --- | --- |
| Cuatro archivos203 copiados byte a byte, mismas aserciones | **94 aprobadas**, cero fallos/omisiones. Incluye los seis casos R01, atomicidad, cancelación, validación, commit real, permisos y concurrencia pertinentes. |
| Variantes independientes226 | **40 aprobadas**, cero fallos/omisiones:39 escenarios de lectura y un control de gestión autorizada/datos nuevos. |
|17 archivos dirigidos de producto, incluidos151 casos nuevos215 | **388 aprobadas**, cero fallos/omisiones. Son ejecución nueva en la base226, no una aceptación de la cifra EDD. |
| Dos casos HTTP/outbox183 | **2 aprobadas**:409 de commit PostgreSQL real seguido de201; intención invisible al worker antes del commit. Solo se adaptaron nombre de env y prefijo de base en una copia propia. |
| Instalación nueva, Alembic check y catálogo | Conformes; ocho tablas inventariadas, sin índices ORM faltantes. |
| Ruff y formato de los tres archivos finales215 | Conformes. |

No se agregan repeticiones ni151 casos ya incluidos en388. Comandos exactos, tiempos y retornos en los `.json/.log` de cada corrida; [resumen estructurado](226_evidencia_eaf_legado_aportes/resultados_resumidos.json). Evidencia principal: [03 históricos](226_evidencia_eaf_legado_aportes/03_casos203_sin_cambiar.log), [04 variantes propias](226_evidencia_eaf_legado_aportes/04_variantes_propias.log), [05 dirigidas](226_evidencia_eaf_legado_aportes/05_dirigidas_producto.log) y [06 HTTP/outbox](226_evidencia_eaf_legado_aportes/06_http_outbox183.log), con sus JUnit.

### Cierre de los seis fallos R01

| Fixture legada | Resultado observado ahora |
| --- | --- |
| `metadata_enfoque={"etnia":true}` | Detalle/listado200, contrato válido; texto incompatible omitido y representado por su default previo `null`. |
| Bandera con texto heredado o JSONnull | Detalle/listado200, contrato válido; no se coacciona a una condición demográfica. Aplica el default técnico previo `false`. |
| Auditoría con metadatos JSONnull, false o lista | Historial200; decisión presente, sin omisión, con metadatos públicos vacíos. |

Las mismas aserciones que fallaban en203 pasan en226. Las copias mantienen su limpieza de fixture posterior a las comprobaciones; los casos propios nuevos conservan registros activos y comprueban explícitamente los elementos devueltos. No se retiraron registros para conseguir200.

Las39 variantes de lectura propias comparan snapshots SQL completos desde conexiones físicas nuevas `NullPool` antes/después: propuesta, JSON y auditoría permanecen idénticos. La variante de gestión cambia estado y añade la auditoría solicitada, manteniendo intactos los JSON privados existentes. No se hace UPDATE correctivo de legados al consultar. [Escenarios y hashes SQL](226_evidencia_eaf_legado_aportes/R01_resultados_compactos.json).

### Tipos, límites y decisiones

- Todos los campos de texto se probaron con bool, número, lista y objeto anidado. No se convierten a strings. Las cuatro banderas se probaron con null, números, estructuras y cadenas como `true`, `FALSE`, `1` y contenido engañoso: no se infieren booleanos.
- `organizacion_social` conserva249/250 caracteres y omite251/4096, sin truncar ni modificar SQL. Otro texto sin ese límite conserva501 caracteres; no se inventó una restricción nueva. Texto/bool válidos se mantienen.
- Correo, teléfonos sintéticos, contenido anidado, claves desconocidas y datos adicionales no aparecen en las respuestas probadas. Adjuntos conservan solo el UUID público permitido. Se preservan contacto privado, huella, sesión y originales JSON SQL.
- Historial con dos decisiones legadas y un registro privado ajeno al filtro devuelve ambas decisiones esperadas: mismos ID, tabla, propuesta, acción, usuario, causal, justificación y fecha. Conserva el filtro vigente; no publica el registro privado ni oculta una decisión para validar la salida.
- Controles positivos: alta nueva201 con enfoque válido; edición autorizada200, devolución201 e historial200. Sin token401 y anónimo403 en gestión. `False`/`None` son defaults contractuales previos al omitir un valor inválido, no hechos demográficos demostrados.

Casos propios: [test_variantes_propias.py](226_evidencia_eaf_legado_aportes/test_variantes_propias.py). Origen de las copias: [203](226_evidencia_eaf_legado_aportes/origen_casos_guardas.json) y [adaptación183](226_evidencia_eaf_legado_aportes/adaptacion183.json).

## 4. Transacciones y revisión del cambio

`schemas.py` usa el tipo y restricciones del `Field` de destino con validación estricta antes de construir la salida. `service.py` construye una lectura separada de la devolución con metadatos ya proyectados; copia las columnas institucionales y valida dentro del límite de escritura. No muta el JSON del ORM para conseguir una respuesta válida.

Se reejecutaron éxito y rollback tras SQL efectivo, validación, cancelación y fallo PostgreSQL real de commit. Otra conexión física verifica que estado y auditoría revierten juntos. Las pruebas de validación ahora pasan por la nueva lectura de devolución y siguen demostrando ausencia de persistencia parcial. Las dirigidas conservan locks, permisos y controles de apoyo/colas. No se añadieron commits ni se modificaron repositorios, router, identidad o migración.

El [inventario real](226_evidencia_eaf_legado_aportes/inventario_bd.json) y [check](226_evidencia_eaf_legado_aportes/07_catalogo_check.log) corresponden a la base nueva226. Son comprobación de instalación/catálogo; no equivalen a repetir la batería de migración de203.

## 5. Conclusión y exclusiones

**AP-03/R01 queda cerrado para este snapshot215 y las regresiones ejecutadas. No se identificó otro defecto bloqueante en el alcance comprobado.** Las demás conclusiones de203 se citan como evidencia histórica, complementadas por las regresiones nuevas indicadas;203 y sus seis fallos anteriores permanecen conservados.

No se repitieron las migraciones destructivas, CLI ni terminación de consumidor de203 y no se presentan como resultados nuevos. Tampoco se duplicó el global por instrucción225:205 es evidencia histórica anterior al parche, con1431 aprobadas, tres fallos inventario/corpus y16 omisiones. Ese resultado no acredita estos bytes ni una aprobación global posterior.

Fuera de alcance: UI/frontend221, datos productivos y su prevalencia de legados, universalidad del banco/inventario que se trabaja por separado, proveedores y scheduler desplegados, restauración productiva o garantías jurídicas. La ausencia de divulgación se limita a estructuras y valores examinados; no se afirma una clasificación universal de todo texto libre.

El manifiesto propio y [sello de cierre](226_evidencia_eaf_legado_aportes/sello_cierre.json) congelan informe, casos y evidencia226. Coordinación integra este cierre acotado con los demás dictámenes para su decisión global.
