# EDD-AP-GOLIVE-02 · Proyección pública de JSON legado

26 de octubre de 2026. **Corrección EDD terminada y congelada para reinspección independiente.** Encargo [214](214_encargo_edd_proyeccion_legado_aportes.md), señal `MODIFICAR_APORTES_LEGADO` recibida tras congelación de203. Se aplicó el skill `polis-edd-transactions`, AGENTS, arquitectura, transacciones y permisos vigentes. Esta entrega no emite dictamen EAF ni autoriza despliegue.

## 1. Cambio acotado

Solo se modificaron dos archivos de aplicación y se añadió un test:

- [schemas.py](../backend/app/modules/aportes/schemas.py): cada campo de enfoque se proyecta con `TypeAdapter` de su propio `Field`, `strict=True`. Se respetan sus tipos y restricciones reales; `organizacion_social` conserva su límite 250. Bool, números o estructuras no se convierten en texto; texto/números/null no se convierten en banderas.
- [service.py](../backend/app/modules/aportes/service.py): alta e historial de devolución validan un objeto de lectura cuyas columnas institucionales se copian exactamente y cuyos metadatos ya están proyectados. No se modifica el ORM ni el JSON privado. Se mantiene el filtro por tabla, ID de propuesta y acción `DEVOLUCION_MOTIVADA`, con el mismo orden descendente.
- [test_aportes_legado_publico.py](../backend/tests/test_aportes_legado_publico.py):151 casos nuevos con los seis defectos 203, tipos por campo, límites, no divulgación, detalle/lista, gestión autorizada y denegada, historial mixto y preservación SQL.

El [parche propio](215_evidencia_edd_proyeccion_legado/cambios_propios.patch) se generó contra copias reconstruidas que cotejan exactamente los SHA183/203 iniciales, conservadas en `fuentes_iniciales/`. No incluye cambios previos del árbol sucio. No se editó migración0084, auditoría, router, identidad, frontend, configuración, fixtures compartidas ni documentación compartida.

## 2. Contrato de lectura

| Entrada privada legada | Representación pública |
| --- | --- |
| Raíz de enfoque distinta de objeto | Modelo con sus defaults previos. |
| Valor incompatible con el tipo de su campo o con su límite real | Se omite ese campo de la proyección. |
| Texto opcional ausente/inutilizable | `null`, default previo del contrato. |
| Bandera ausente/inutilizable | `false`, default técnico previo. No es una conclusión sobre la condición demográfica real. |
| Texto/bool válidos para el campo declarado | Valor conservado, sujeto al filtro de contacto ya vigente. No se inventan enums ni límites nuevos. |
| Datos adicionales, claves desconocidas y texto con correo/teléfono detectado | No se publica su contenido. `datos_adicionales` conserva el objeto vacío del contrato. |
| Metadatos de devolución con raíz null, bool, número, texto o lista | Objeto público vacío. Las columnas originales de la decisión se conservan. |
| Metadatos de devolución con objeto | Solo `canal`/`tipo_mensaje` con los valores cerrados ya permitidos. |

No hay saneamiento SQL al consultar, truncación, actualización correctiva ni inferencia desde valores engañosos. Los JSONB originales, contacto privado, huella y sesión permanecen almacenados y fuera de estas respuestas públicas. Los casos se construyeron como fixtures; no se afirma que existan en datos productivos.

## 3. Persistencia y permisos

El límite de escritura sigue en `transaction()`. Alta/edición validan `PropuestaCiudadanaRead` dentro del límite. Devolución mantiene lock de propuesta, cambio de estado, inserción de auditoría, flush/refresh y validación de respuesta dentro de una sola transacción; la proyección anterior a la validación también queda dentro. No hay commits nuevos, repositorios cambiados ni efectos de proveedor.

Las dirigidas conservan rollback después de SQL efectivo, fallo de validación, cancelación y fallo real del commit PostgreSQL. Otra conexión física comprueba estado y ausencia de filas parciales. Las pruebas nuevas verifican 401 sin token, 403 para sesión anónima y 200/201 para autoridad real; no se alteró el autorregistro ni permisos. También interceptan `model_validate` para comprobar que recibe los metadatos cerrados en alta e historial, sin perder columnas originales.

La captura [SQL/HTTP](215_evidencia_edd_proyeccion_legado/lecturas_sql_http.json) registra seis fixtures nuevas con PID de observadores distintos, SHA del snapshot SQL completo antes/después iguales, HTTP200 y fechas/columnas institucionales conservadas. Usa otro engine `NullPool`; no el pool de aplicación. Las pruebas de gestión comparan los JSON privados antes/después de la edición permitida; la edición solicitada preserva el JSON privado.

## 4. Entorno propio

Dos bases nuevas desde `template0`, sin copiar datos de trabajo ni reutilizar bases183/203 u otros agentes:

| Uso | Base |
| --- | --- |
| Funcional | `polis_test_edd_legado_20261026_877ccc94` |
| Secundaria nueva | `polis_test_edd_legado_20261026_mig_f32ec3a5` |

Extensiones locales provisionadas solo en ellas; no se modificaron roles ni servicios del clúster. Credenciales solo en memoria. El acceso local se resuelve y valida antes de importar configuración; se reemplaza el nombre de base y se fijan DSN explícitos. Nunca se conectó a `bd_csh`, bases ajenas ni proveedores reales.

Guarda215 derivada de183, SHA `91613084a5e6a6659d4580e7f12db07a24328d7a1ff544d55b2540d22b8898ce`: dos nombres exactos, host loopback/puerto5432 y validación en asyncpg/psycopg/SQLAlchemy; SMTP y sockets externos rechazados; escrituras Python limitadas a evidencia propia, temporales y cachés propios. Pasaron 16 negativas antes de I/O, consulta positiva en cada base y temporal propio. Es una guarda Python, no un sandbox universal de procesos nativos. [Resultado](215_evidencia_edd_proyeccion_legado/guardas_verificadas_v2.json).

## 5. Comprobaciones conservadas

Los comandos exactos, tiempos y retornos están en los logs y JUnit de [evidencia215](215_evidencia_edd_proyeccion_legado/); [resumen estructurado](215_evidencia_edd_proyeccion_legado/resultados_resumidos.json).

| Ejecución | Resultado |
| --- | --- |
| `02_regresiones_antes` sobre aplicación183/203 | Seis fallos propios reprodujeron los seis 500; evidencia conservada. |
| `03_nuevas_pruebas` | 136 aprobadas/13 fallidas por una aserción propia de fecha: UTC `Z` y `+00:00` representan el mismo instante. Se conserva completa. |
| `05_nuevas_pruebas` | 151/151,31,52s. Se corrigió solo la comparación a `datetime` con zona y microsegundos; ninguna app se cambió para ese ajuste. |
| `06_dirigidas_y_transacciones` | 388/388,100,37s, sin omisiones. Incluye las 151 nuevas y 237 casos de aportes/apoyos/devolución/enfoque/colas/evidencias/transacciones y políticas. |
| `07_http_outbox183` | 2/2 adicionales,9,09s:409 real y recuperación201; intención invisible al worker antes de commit. Copia183 adaptada exclusivamente al prefijo de las bases215; original183 intacto. |
| `08_ruff_backend`, `09_formato_backend` | Ruff conforme; 542 archivos con formato conforme. |
| `10_sql_lecturas` | Seis escenarios HTTP200 y snapshots SQL idénticos antes/después. Son repeticiones diagnósticas, no seis casos nuevos a sumar. |
| `11_catalogo` | `alembic check` sin operaciones nuevas en ambas bases; instalación a head de la secundaria nueva. No se ejecutó downgrade ni se cambió esquema de producto. |

Resultado final sin duplicar iteraciones: **388 casos de la corrida dirigida más dos comprobaciones adicionales de183, todos aprobados.** Los seis fallos originales y el error propio de comparación de fecha no se eliminaron de la evidencia.

No se repitió `backend:check` global por la instrucción expresa 214. La global205 previa sigue siendo evidencia compartida examinada por 203: 1431 aprobadas, tres fallidas por inventario/corpus y 16 omitidas. No acredita estos bytes215 ni se presenta como ejecución propia o global aprobada. La corrección actual requiere reinspección EAF acotada.

## 6. Congelación y hashes

[Snapshot inicial/autorización](215_evidencia_edd_proyeccion_legado/autorizacion_inicio.json), [tres fuentes finales](215_evidencia_edd_proyeccion_legado/fuentes_finales.json), [cotejo de históricos](215_evidencia_edd_proyeccion_legado/cotejo_historicos_final.json) y [manifiesto](215_evidencia_edd_proyeccion_legado/manifest_evidencia.json). Las tres fuentes finales no cambiaron desde las corridas05/06. De las 20 fuentes183, las otras 18 permanecen idénticas. Los 68 artefactos183 y 87 artefactos203 cotejan sus manifiestos sin divergencias; informe203 intacto.

| Fuente final | SHA256 |
| --- | --- |
| `backend/app/modules/aportes/schemas.py` | `df558b2951f4f194c8028d291c62de922f11c042decbb2d6a1e0f8e21a4120e1` |
| `backend/app/modules/aportes/service.py` | `2a413c9d53d3a8fdb5c9dc4170655e5cf45ef8a251ed2688d227da3785469244` |
| `backend/tests/test_aportes_legado_publico.py` | `093df70a381bc16efa89d25c4e495b3e630c449af8e6e2a145a064218b5e8753` |

0084 permanece `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`. Informe203 permanece `34e841385f91493364271f08e5f20ecbb78f44ffe04f6fdec64b30173b33f2bc`.

Árbol sucio conservado. Sin commit, push, deploy, corrección de datos activos ni activación de proveedores. Producto y entrega215 congelados para coordinación y evaluación independiente.
