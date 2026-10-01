# INFORME DE RE-AUDITORÍA DE CALIDAD: E2 — Primer Flujo Persistente y Anclaje Territorial

**Fecha**: 2026-10-01  
**Auditor**: freebuff (GPT-6 Luna)  
**Entrega Vinculada**: E2  
**Dictamen**: CON_OBSERVACIONES  
**Puntuación de Calidad**: 55/100  
**Tareas cubiertas**: T2.1–T2.5  
**Modalidad**: Inspección estática de contratos, modelos, migraciones, servicios, frontend y pruebas; no se ejecutaron pruebas.

---

### 1. Resumen Pericial

La migración inicial crea catálogos de dimensiones/fases/territorios, y los modelos representan UUID con default SQL UUIDv7, JSONB y relaciones con líneas estratégicas. La suite incluye aserciones para 7 dimensiones, 15 territorios y el flujo de aportes. El frontend de aportes usa `apiFetch` y TanStack Query y obtiene una sesión antes de publicar.

No obstante, la huella HMAC depende de secretos predeterminados y la API devuelve `huella_hash` en contratos públicos. La extracción de IP confía directamente en `X-Forwarded-For`; fuera de un proxy confiable ese dato es falsificable. Además, el plan promete catálogo de políticas, mientras `backend/app/modules/politicas/router.py` expone dimensiones, fases y líneas, pero no un recurso/catálogo de políticas. Las pruebas de integración no se ejecutaron y varios tests históricos contienen fallback explícito a `bd_csh`, por lo que no deben lanzarse sin `POLIS_TEST_DATABASE_URL`.

### 2. Cumplimiento de Contratos y Estándares

- **T2.1**: `backend/alembic/versions/0002_motor_politicas_y_geodatos.py` crea las tablas con `public.generar_uuid_v7()`; `backend/tests/test_politicas_y_geodatos.py` expresa las comprobaciones de dimensiones, territorios y centroides. Se revisó código, no el estado real de datos ni la procedencia oficial.
- **T2.2**: `participacion_ciudadana.propuestas_ciudadanas` tiene JSONB para enfoque, FK a línea y relaciones opcionales de dimensión/territorio; `AporteService` envuelve escrituras en `transaction()`.
- **T2.3**: se calcula una huella HMAC-SHA256 y se emite JWT; la IP no se persiste en claro en el modelo de sesión revisado.
- **T2.4**: servicios de aportes conectan `/sesion/anonima` y `/aportes`; hooks TanStack Query invalidan datos y la edición vive en panel lateral.
- **T2.5**: existe `backend/tests/test_e2e_persistencia.py`, que pretende comprobar lectura tras reinicializar conexiones y un apoyo; la existencia del test no acredita ejecución ni persistencia comprobada aquí.

### 3. Hallazgos y Observaciones No Bloqueantes

1. **ALTA — Huella seudónima expuesta y secreto de HMAC predeterminado** (`backend/app/core/config.py`, `backend/app/modules/aportes/schemas.py`, `backend/app/modules/sesion/service.py`). La respuesta de sesión incluye `huella_hash`; `PropuestaCiudadanaRead` también incluye `huella_hash` y los endpoints de lectura/listado no requieren autenticación. La huella es determinista por IP/salt y, con el salt predeterminado del repositorio, no debe tratarse como anónima ni publicarse. **Recomendación**: quitarla de respuestas públicas, reducir su uso a trazabilidad interna con permisos, usar secreto externo fuerte y definir retención/acceso.
2. **ALTA — Confianza incondicional en `X-Forwarded-For`** (`backend/app/modules/sesion/router.py`, `extraer_ip_cliente`). Se toma el primer valor del encabezado sin verificar que la solicitud provenga de un proxy confiable. Un cliente puede elegir la IP que se convierte en la huella y debilitar controles de abuso/atribución. **Recomendación**: configurar lista de proxies confiables y obtener el peer IP validado por infraestructura; no confiar en encabezados arbitrarios.
3. **MEDIA — Contrato del catálogo de políticas incompleto** (`docs/plan-trabajo.md`, `backend/app/modules/politicas/router.py`). El plan declara `/api/v1/politicas`, pero el router revisado no define listado/detalle de políticas; los datos persistidos cubren fases y líneas. Esto deja incompleto el recorrido “consultar una política” comprometido para E2. **Recomendación**: aclarar alcance/estado y añadir entidad/endpoint si forma parte de la aceptación.
4. **MEDIA — “15 territorios oficiales” y exactitud de semilla no quedan acreditados por pruebas** (`backend/alembic/versions/0002_motor_politicas_y_geodatos.py`, `backend/tests/test_politicas_y_geodatos.py`). Las pruebas estáticas verifican recuento/códigos/coordenadas en rangos, no fuente oficial, validez topológica ni revisión de límites territoriales. Las coordenadas iniciales son puntos cargados en la migración sin metadatos de fuente. **Recomendación**: registrar fuente, fecha, sistema de referencia y validaciones GIS del conjunto.
5. **MEDIA — Pruebas legacy con fallback a base activa** (`backend/tests/test_aportes.py`, `test_politicas_y_geodatos.py`, `test_e2e_persistencia.py`, entre otras). Algunas fixtures usan `POLIS_DATABASE_URL` o una URL `bd_csh` si falta `POLIS_TEST_DATABASE_URL`. `backend/tests/conftest.py` protege tests que solicitan fixtures `database_url`/`sessions`, pero la suite no se ejecutó; no se certifica que todas las rutas queden aisladas. **Recomendación**: eliminar fallbacks productivos y exigir explícitamente una URL `polis_test*` en cualquier test con acceso a BD.

### 4. Conclusión y Dictamen Oficial

**CON_OBSERVACIONES (55/100).** Existe una base persistente y una integración frontend real para aportes, pero la salida de hashes con un secreto predeterminado y la confianza en cabeceras de proxy impiden certificar el tratamiento seguro de la identidad anónima. T2.5 no queda probada en esta sesión; el endpoint de catálogo de políticas y la procedencia de los datos territoriales requieren cierre o aclaración.

**Pruebas no ejecutadas por la regla de solo lectura y seguridad de BD**: `test_e2e_persistencia.py`, tests de persistencia y `bun run backend:check`. El código de algunos tests contiene fallback a `bd_csh`; no se ejecutaron sin una URL de pruebas explícita. No se alteró ninguna base de datos.