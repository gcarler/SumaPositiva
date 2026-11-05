# Encargo 277 — Capacidad medida de POLIS Herald

**Fecha:** 2026-10-31. **Estado:** mediciones completas; exportación final verificada.
**Ámbito:** ejecutor y aceptación SMTP local, PostgreSQL aislado y código congelado.

## 1. Cifra que corresponde comunicar

**La afirmación general «3.000–10.000 correos/minuto» era incorrecta y debe retirarse.**
Con los valores predeterminados del CLI —4 consumidores, lote 200 y pausa de
10 segundos— se midieron estas capacidades sostenidas con cola llena:

| Demora añadida por mensaje SMTP | Mediana de correos/minuto | Rango observado, tres repeticiones |
|---:|---:|---:|
| 0 ms | **952** | **951–986** |
| 50 ms | **835** | **813–835** |
| 200 ms | **542** | **533–544** |

La mayor mediana del drenaje de un lote, sin las pausas del daemon, fue
**5.132/minuto [4.343–5.220]**, con 4 consumidores, 5.000 mensajes y 0 ms
añadidos por el sumidero. La corrida individual más rápida alcanzó 5.402/minuto.
**Ninguna corrida del ejecutor alcanzó 10.000/minuto.**

Estas cifras describen aceptación por el SMTP local y posterior estado `enviado`
en la base. El límite de un relé externo no se midió: Postfix, reputación del
dominio, Gmail/Outlook, red WAN, autenticación y TLS remoto pueden imponer otros
límites. No se midió llegada a la bandeja del destinatario.

Fuentes: [perfil predeterminado](277_evidencia_capacidad/daemon_defecto.jsonl),
[matriz CSV](277_evidencia_capacidad/capacidad.csv) y
[resultados completos](277_evidencia_capacidad/resumen.json).

## 2. Método, versión y aislamiento

- **108 corridas principales:** 3 demoras × 6 concurrencias × 2 lotes × 3 repeticiones;
  **324.000 mensajes medidos**, además de los calentamientos. Orden aleatorio
  reproducible con semilla 277; corridas secuenciales.
- Base nueva `polis_test_cap_277`, creada desde `template0` y migrada hasta
  `0093_herald_gestion`, en `polis-database-1`, `127.0.0.1:5433`.
- Código de `backend/app` y dependencias copiados antes de medir. Referencia
  Git: `2aad798c6d49db04777999e29484f7e1f77092c8`. Python 3.12.14,
  PostgreSQL 16.9/PostGIS 3.5.2, SQLAlchemy 2.0.54 y asyncpg 0.31.0.
- Host AMD EPYC 9354P con **8 CPU lógicas disponibles**. Ejecutores, PostgreSQL,
  productor, sumidero y muestreadores compartieron máquina. Se registró carga
  del host; el entorno no garantiza aislamiento de trabajos ajenos.
- Sumidero derivado del `e2e_smtp_local.py` indicado en el encargo, exclusivamente
  en `127.0.0.1` y puerto efímero. Remitentes/destinatarios `.invalid`. Sin TLS ni
  autenticación SMTP en este laboratorio. La demora se aplica una vez al terminar
  `DATA`, antes del ACK `250`; los demás intercambios tienen latencia local.
- Plantilla real `generar_html_constancia_radicacion`: **7.788 bytes HTML**;
  mensaje MIME con texto plano y HTML de aproximadamente 11,1 KB.
- Cada proceso de la matriz se calentó con 32 mensajes, o 64 para concurrencia 32. El reloj
  de la matriz abarca la llamada real a `drenar`, con `NotificacionWorker` y
  `despachar_correo`, sin transporte ficticio. Incluye las dos transacciones por
  correo. Excluye creación de datos, importación y calentamiento.
- `fsync` y `synchronous_commit` permanecieron activados. Pool real: **5 conexiones
  retenidas + 10 de overflow**, máximo 15. Ejecutor de hilos real: **12 trabajadores**.
- No se conectó a `bd_csh`, no se utilizó Postfix real, no se reiniciaron servicios
  y no se editó `backend/app` ni `src`. No se hicieron commits ni push.

**Ediciones concurrentes:** al cierre, el CLI del árbol compartido incorporaba
`escribir_latido`, añadido por otro trabajo. `drenar`, el worker de entrega y el
transporte del snapshot sustentan estas mediciones. El costo del nuevo latido
por ciclo **no está incluido** en el perfil del CLI publicado aquí. Los resultados
no constituyen una medición de esa versión posterior completa.

Manifiestos: [preparación](277_evidencia_capacidad/preparacion.json),
[entorno](277_evidencia_capacidad/entorno_matriz.json),
[hardware y scripts originales](277_evidencia_capacidad/hardware_y_scripts_matriz.json),
[configuración PostgreSQL](277_evidencia_capacidad/configuracion_postgres.json).

## 3. Matriz de drenaje

Cada celda es **mediana [mínimo–máximo]**, en correos/minuto, de tres repeticiones.
El rango es dispersión observada; no es un intervalo de confianza ni un SLA.

| SMTP ms | Lote | C=1 | C=2 | C=4 | C=8 | C=16 | C=32 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 1.000 | 2.595 [2.382–3.206] | 4.096 [4.038–4.703] | 4.558 [3.968–5.402] | 4.185 [3.932–4.457] | 3.014 [2.870–3.625] | 3.500 [2.915–4.117] |
| 0 | 5.000 | 2.632 [2.415–2.762] | 3.763 [3.705–3.770] | 5.132 [4.343–5.220] | 4.111 [3.414–4.310] | 3.582 [3.373–3.871] | 4.173 [4.143–4.762] |
| 50 | 1.000 | 816 [728–820] | 1.626 [1.545–1.647] | 2.859 [2.234–2.983] | 4.262 [4.012–4.464] | 3.280 [3.123–3.297] | 4.446 [4.003–4.491] |
| 50 | 5.000 | 764 [751–776] | 1.484 [1.437–1.494] | 2.636 [2.384–2.651] | 4.320 [3.657–4.749] | 3.001 [2.746–3.449] | 4.479 [3.285–4.858] |
| 200 | 1.000 | 263 [261–266] | 501 [498–534] | 1.036 [1.030–1.046] | 1.989 [1.908–2.054] | 2.986 [2.851–3.273] | 3.118 [2.691–3.258] |
| 200 | 5.000 | 260 [257–263] | 519 [518–519] | 1.024 [1.013–1.035] | 1.920 [1.803–1.989] | 3.062 [2.969–3.103] | 3.113 [3.094–3.146] |

![Capacidad de drenaje de Herald: medianas y rangos observados](277_evidencia_capacidad/capacidad.png)

También se entrega [SVG exportable](277_evidencia_capacidad/capacidad.svg).
Las duraciones, desviaciones estándar y recursos de cada punto están en
`capacidad.csv`, `resumen.json` y `corridas/*/resultado.json`.

## 4. Encolado continuo: latencia real

El daemon ya estaba corriendo y había enviado 16 mensajes de calentamiento.
Se alimentaron 300 mensajes por réplica de manera periódica, con tres fases
de inicio diferentes. Los calentamientos quedan excluidos de los percentiles.

- **Predeterminado:** C=4, lote 200, intervalo 10 s.
- **Pausa corta:** C=4, lote 1.000, intervalo 0,05 s; misma implementación.

La oferta se fijó al 55 % de la capacidad de referencia de cada perfil derivada
del drenaje. Esa referencia no garantiza una carga inferior a la capacidad
efectiva con entrada continua, como muestran los resultados.

**Percentiles agrupados de 900 observaciones por fila**, en segundos,
`creado_en` → `enviado_en`. El segundo timestamp corresponde al éxito del
transporte antes del commit final; la integridad se verifica después del commit.

| SMTP ms | Perfil | Oferta, mensajes/s | p50 s | p95 s | p99 s | Rango de p99 por réplica |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Predeterminado | 8,708 | 5,333 | 9,614 | 9,985 | 9,907–10,047 |
| 0 | Pausa corta | 41,628 | 0,230 | 2,572 | 2,856 | 0,369–2,862 |
| 50 | Predeterminado | 7,748 | 5,117 | 9,687 | 10,101 | 9,940–10,228 |
| 50 | Pausa corta | 26,149 | 1,274 | 12,804 | 14,328 | 0,748–14,590 |
| 200 | Predeterminado | 5,097 | 3,592 | 13,012 | 15,142 | 13,409–15,868 |
| 200 | Pausa corta | 9,491 | 18,319 | 34,490 | 36,252 | 35,317–36,937 |

El desfase host/base observado durante la matriz fue como máximo aproximadamente
3,2 ms. Se conservan además los commits observados y los ACK monotónicos.

**Hallazgo funcional de capacidad:** al devolver `None`, un consumidor de
`drenar` termina. Los consumidores que continúan trabajando no recrean los que
salieron; el siguiente grupo se forma cuando acaba el ciclo. En tres sondas
adicionales de entrada continua, con C=4, 50 ms y 150 mensajes, **tres tareas
terminaron en 9,8–12,3 ms y una continuó durante 11,3–13,2 s**. La concurrencia
configurada dejó de ser la efectiva. Esto explica por qué la capacidad con
cola inicialmente llena no permite prometer los mismos resultados en un flujo
continuo, y por qué acortar la pausa por sí solo no resolvió la espera.

Evidencia: [corridas continuas](277_evidencia_capacidad/continuidad.jsonl),
[trazas resumidas de consumidores](277_evidencia_capacidad/resumen.json) y
`cohortes/*/cohortes_tareas.json`. `resumen_automatico.md` publica también la
mediana de los percentiles individuales; usa una agregación diferente a esta tabla.

## 5. Qué limita la capacidad

### Operación con los valores predeterminados

La pausa de **10 s después de cada lote**, incluso con cola pendiente, limita
el ritmo sostenido. Las nueve corridas del daemon midieron dos ciclos completos
posteriores al primero, 400 entregas por repetición, con la cola inicialmente
llena de 600 mensajes. Las pausas están incluidas en las cifras de la sección 1.

### Pool y concurrencia alta

Sondas separadas de 100 mensajes, tres repeticiones por punto, instrumentaron
adquisición y eventos reales de SQLAlchemy. La adquisición incluye espera y
creación de conexión física; no representa exclusivamente espera de cola.

| Concurrencia, SMTP 0 ms | Máximo simultáneo del pool | Nuevas conexiones físicas/100, mediana | p95 de adquisición, mediana ms |
|---:|---:|---:|---:|
| 4 | 4 | 0 | 0,013 |
| 8 | 8 | 17 | 46,184 |
| 16 | 15 | 36 | 188,790 |
| 32 | 15 | 14 | 317,170 |

A partir de C=8 aparecen aperturas y cierres de overflow porque se retienen
cinco conexiones. En C=16/32 se alcanza el máximo de 15 y crece la espera.
El rendimiento con 0 ms alcanza su mejor mediana en C=4 y no mejora al añadir
consumidores. La CPU del ejecutor en los lotes de 5.000 se estabilizó alrededor
de 1,06–1,12 núcleos en C=4–32; no se agotaron las ocho CPU disponibles del host.

### Hilos de SMTP

El ejecutor real tuvo **12 hilos disponibles**, aunque se pidieran 16 o 32
consumidores. Con 200 ms se observaron como máximo 12 conexiones SMTP
simultáneas. El p95 de espera hasta empezar en un hilo, mediana entre réplicas,
pasó de **80,9 ms en C=16 a 315,4 ms en C=32**. En lotes de 5.000, pasar de
C=16 a C=32 solo elevó la mediana de 3.062 a 3.113/minuto, aproximadamente 1,7 %.
La sola demora de 200 ms con 12 hilos impone una cota teórica de 3.600/minuto,
antes de los demás costos; no es una capacidad adicional medida.

### PostgreSQL y sumidero

- En 1.356 observaciones adicionales no hubo esperas de tipo `Lock` registradas
  ni deadlocks. Se registraron 17 observaciones `WALWrite`, una `ProcArray` y una
  `BufferContent`, todas de tipo `LWLock`. El muestreo no descarta esperas breves.
- El reclamo puede recorrer historia ya enviada: en una sonda con 99 % de 5.000
  filas enviadas, `idx_notif_creado_en` descartó **4.950 filas**. Con estadísticas
  frescas, el tiempo mediano pasó de **0,085 ms** con todo pendiente a **7,761 ms**
  en ese escenario. Son sondas separadas, con actualizaciones repetidas y control
  de autovacuum; sus tiempos no se extrapolan como costo exacto de producción.
- El sumidero demostró, con cliente mínimo separado, medianas de **63.144/minuto
  a 0 ms** y **8.929/minuto a 200 ms**, con 32 conexiones. Ese cliente excluye
  ORM, construcción MIME e hilos de Herald: sus cifras miden la holgura del
  sumidero, no capacidad del ejecutor.
- Crear el contexto SSL consumió aproximadamente **2,3–4,8 % de la CPU** en las
  sondas. Se crea incluso sin TLS, pero no fue el cuello principal observado.
- Los rollbacks de `pg_stat_database` incluyen el ping de conexiones del driver:
  `pool_pre_ping=True` y `_async_ping` de asyncpg/SQLAlchemy abren y revierten una
  transacción de comprobación. No se interpretaron esos contadores como correos
  fallidos; la verificación usa estados e identificadores de cada notificación.

Evidencia agregada: [diagnóstico de saturación](277_evidencia_capacidad/diagnostico_saturacion.json).
Los planes completos están en `planes_sql/`; las sondas de hilos, pool y CPU,
en `corridas/diag_*/resultado.json`.

## 6. Integridad y recuperación con SIGKILL

Las **108 corridas principales** compararon cada UUID y Message-ID, número de
ACK, filas `enviado`, intentos y timestamps. Resultado: **324.000 entregas,
0 duplicados, 0 ausencias y 0 filas fallidas**. También pasaron las comprobaciones
de los 18 puntos continuos, 9 del daemon, 30 instrumentados y 3 de tareas.
Esto demuestra lo observado durante estas corridas, no una garantía universal
de entrega exactamente una vez.

Para la recuperación se mató realmente el proceso con SIGKILL cerca de la
aceptación número 500, en la ventana DATA→ACK: 1.000 mensajes, C=8, SMTP 200 ms,
**lease original de 60 s**. Se relanzó el CLI con intervalo 0,1 s, declarado
para esta prueba. No se acortó ni se forzó el vencimiento.

| Réplica | `enviado` al matar | `pendiente` | `procesando` | Filas recuperadas por lease | Duplicados SMTP | Enviadas finales | Fin desde SIGKILL |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 493 | 499 | 8 | 8 | 7 | 1.000 | 60,908 s |
| 2 | 492 | 500 | 8 | 8 | 8 | 1.000 | 61,842 s |
| 3 | 492 | 500 | 8 | 8 | 8 | 1.000 | 60,858 s |

Al matar quedaban aproximadamente **59,737–59,968 s** de lease para esas filas.
Se recuperaron las ocho en cada réplica y no se perdieron notificaciones. El
sumidero recibió 1.007, 1.008 y 1.008 mensajes; los UUID repetidos conservaron
el mismo Message-ID. El diseño entrega **al menos una vez**. El Message-ID
permite correlacionar; no obliga al proveedor a deduplicar.

Son caídas provocadas en una ventana elegida para observar el reenvío; estos
conteos no estiman la frecuencia de duplicados en operación normal.

Evidencia: [recuperación](277_evidencia_capacidad/recuperacion.jsonl), estados
inmediatos, filas reclamadas y líneas de tiempo en `recuperacion/*/`.

## 7. Recomendaciones concretas

1. **Publicar la cifra del perfil probado y sus condiciones.** Con los valores
   predeterminados del snapshot: 952 [951–986]/minuto en SMTP local sin demora
   añadida. Con 200 ms: 542 [533–544]/minuto. No prometer 10.000/minuto.
2. **Corregir la retirada de consumidores en modo continuo y la pausa tras lote
   ocupado.** Preservar el modo de una sola pasada, la parada y las transacciones.
   El perfil de pausa corta probado muestra que cambiar solo `--intervalo` no basta.
3. **Para drenaje de una cola llena**, candidatos del código medido: C=4 con
   SMTP cercano al local, C=8 con 50 ms y C=16 con 200 ms. C=8 quedó a menos del
   5 % de la mejor mediana con 50 ms; C=16 quedó a menos del 2 % de C=32 con 200 ms
   en lotes de 5.000. C=32 añade espera sin una mejora consistente.
4. **Lote:** usar 1.000 como tamaño de ensayo para drenaje; mantener 200 como
   referencia operativa actual hasta validar el nuevo daemon. El lote es un
   presupuesto de llamadas individuales, no una inserción/envío SQL masivo.
   Lotes de 5.000 prolongan el ciclo y no eliminan las dos transacciones por correo.
5. **Pool:** el actual 5+10 alcanza para C=4, que no abrió conexiones adicionales
   tras calentar. Para un ejecutor dedicado con C=8, comparar como siguiente
   ensayo `pool_size=8, max_overflow=0` frente al baseline, para evitar la
   apertura/cierre repetidos. Esa variante **no se midió** y no se atribuye una
   ganancia. No trasladar ese cambio al pool compartido de la API sin evaluarlo.
6. **Revisar el índice de filas activas y la selección cronológica**, conservando
   `FOR UPDATE SKIP LOCKED`. Comparar planes y costo de escritura antes de migrar.
7. **Conservar la semántica de al menos una vez.** Si un caso exige deduplicación
   efectiva del envío, validar una capacidad idempotente en la capa de entrega;
   el header Message-ID por sí solo no la garantiza.

Se entrega [propuesta de cambios como texto](277_evidencia_capacidad/propuesta_no_aplicada.patch.txt):
consumidores persistentes, pausa condicional, candidato de índice/pool y mejora
menor de SSL. **No se aplicó ninguno de esos cambios ni se midió una versión
optimizada.** El parche debe adaptarse al latido incorporado concurrentemente.

## 8. Reproducción y cierre

Procedimiento completo, desde un directorio de evidencia nuevo en una copia
de trabajo, sin sobrescribir esta corrida:

```bash
PYTHONDONTWRITEBYTECODE=1 backend/.venv/bin/python bridge/277_evidencia_capacidad/ejecutar_todo.py
```

El [README del banco](277_evidencia_capacidad/README.md) describe fases, límites,
configuración y snapshots. La matriz original y cada fase posterior conservan
sus versiones de scripts. Los datos crudos por mensaje y por fila se guardan
comprimidos, junto con CPU, hilos, RSS y actividad PostgreSQL por corrida.

**Incidencia de exportación resuelta:** el primer cierre devolvió exit 1 al
ordenar claves que mezclaban `None` y texto de `pg_stat_activity`. Todas las
mediciones ya habían terminado. Se corrigió la agregación y se regeneró el
resumen desde los mismos datos con exit 0; no se repitieron ni reemplazaron
mediciones. Se conservan `ejecucion.json` y `fases_restantes.log` originales,
además de `resumen_revalidado.log` y el cierre verificado posterior.

Verificación final: [cierre verificado](277_evidencia_capacidad/cierre_verificado.json)
y [manifiesto SHA-256](277_evidencia_capacidad/manifest_sha256.json).

La base fue eliminada y su ausencia verificada el **2026-10-31 21:32:41 UTC**.
No quedaron conexiones a terminar y se retiraron las credenciales temporales.
Véase [recibo de limpieza](277_evidencia_capacidad/limpieza.json).

Esta entrega mide el snapshot declarado. No acredita capacidad de un relé
externo ni constituye un dictamen EAF o una autorización de despliegue.
