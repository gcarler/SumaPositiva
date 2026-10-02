# Calidad de registro del formulario geoespacial

Fecha: 2026-10-02, UTC. Revisión preventiva de EDD mediante los checklists de transacciones EDD/EAF. El dictamen independiente de EAF queda pendiente: este documento presenta comprobaciones, correcciones y límites, no una garantía absoluta.

## Resultado y alcance

Se revisó el recorrido HTTP → esquema de entrada → servicio/transacción → repositorio → PostgreSQL → lectura/analítica del módulo `backend/app/modules/formularios`, incluyendo constructor y contrato legado. El formulario institucional es `reporte-inseguridad`, UUID persistido `4ecd649a-6764-4d62-8ddb-1bcecd342031`. Se verificaron las siete dimensiones, respuestas condicionales, frecuencia, descripción, coordenadas y fotos.

Resultado: 96 pruebas aprobadas en 69,21 segundos y una prueba adicional de migraciones desde una base exclusiva. Check y build del frontend aprobados; lint y formato del módulo backend aprobados. El comando global `bun run backend:check` se detiene por 45 errores Ruff fuera de este módulo; por ello no se afirma que la suite global haya pasado.

Las escrituras sintéticas se ejecutaron únicamente en `polis_test_form_calidad_20261002`. El ciclo completo de migraciones se hizo en `polis_test_form_calidad_migraciones_20261002`, PostgreSQL local de pruebas. En producción se consultaron metadatos y restricciones sin introducir respuestas de QA. Se aplicaron las migraciones 32 y 33 y se reinició el servicio backend con las correcciones finales.

## Hallazgos corregidos

| Hallazgo | Corrección y evidencia |
| --- | --- |
| La analítica usaba opciones del constructor como claves de diccionario y podía devolver 500. | Tabulación compatible con opciones legadas y objetos id/texto; conteos y etiquetas correctos. |
| Porcentajes de subcategorías condicionadas usaban respuestas de otras dimensiones como denominador. | Denominador por pregunta efectivamente respondida: dos dimensiones dan 50 % en categoría y 100 % en su subcategoría. |
| Borrar un formulario podía borrar también sus respuestas por CASCADE. | API devuelve 409; FK `ON DELETE RESTRICT`; ORM deja actuar la restricción. Un DELETE SQL directo falla si tiene respuestas. |
| Cambiar preguntas podía dejar respuestas históricas sin interpretación. | Bloquear cambios de preguntas/secciones con respuestas, tanto en constructor como contrato legado. Título, descripción, cierre y estado siguen editables. |
| Comprobaciones de límite y escritura no estaban serializadas en todas las rutas. | Bloqueo de la misma fila del formulario con `FOR UPDATE`. Dos envíos simultáneos con límite uno producen una aceptación y un 409. |
| Entradas legadas admitían escalas inválidas y campos desconocidos. | Validación compartida de opciones, tipos y escalas; descarte de preguntas ajenas. Preserva el número del contrato legado cuando es válido. |
| La bolsa antigua de evidencias podía eludir los límites del constructor. | Rechazar evidencias fuera de las preguntas autorizadas en formularios del constructor o con evidencias deshabilitadas. |
| Esquemas y configuraciones inválidos podían persistirse. | Identificadores/orden únicos, opciones válidas, rangos coherentes, referencias de ubicación existentes y configuración de autenticación consistente. |
| Campos derivados del cliente podían presentarse como datos autorizados. | Reconstruir identificadores, fechas, origen y contadores desde la fila y conteos de PostgreSQL. |
| Errores de claves foráneas se confundían con duplicados. | Clasificar SQLSTATE: unicidad 409; referencia o CHECK inválido 422; fallo inesperado 500 sin detalle SQL. |
| Formas JSONB y estados carecían de restricciones SQL específicas. | Seis CHECK adicionales, sin reescribir migraciones aplicadas. |

## CRUD y endpoints

| Operación | Acceso y comprobación |
| --- | --- |
| POST `/api/v1/formularios/constructor` | `formularios:gestionar`; creación completa, slug único, validación de preguntas. |
| GET `/api/v1/formularios/constructor` y `/constructor/slug/{slug}` | `formularios:leer`; lectura administrativa y vista previa de borradores. |
| PUT `/api/v1/formularios/constructor/{id}` | `formularios:gestionar`; mantiene slug, rechaza cambios estructurales con respuestas. |
| POST y PUT `/api/v1/formularios` y `/{id}` | Gestión autorizada; esquema legado validado, estado válido, fechas actualizadas y cierre anulable explícitamente. |
| DELETE `/api/v1/formularios/{id}` | Gestión autorizada; 200 solo sin respuestas, 409 con respuestas, 404 inexistente. |
| GET `/api/v1/formularios/publicos/{slug}` | Público; publicado accesible, borrador protegido, inexistente 404. |
| POST `/api/v1/formularios/{id}/respuestas` | Sesión técnica; reporte institucional exige sesión anónima. 201 válido, 422 inválido, 409 duplicado/límite, 400 cerrado. |
| GET `/api/v1/formularios/{id}/respuestas` y `/analitica` | `formularios:leer`; 401 sin token y 403 para sesión anónima. |

Se comprobó ausencia de token, token anónimo y administrador autorizado. Las suites existentes complementan la matriz de acceso. La autorización por recurso sigue el contrato vigente de permisos institucionales globales; no se agregó un alcance por territorio.

## PostgreSQL, funciones y procedimientos

Se inspeccionaron `participacion_ciudadana.formularios_consulta` y `respuestas_formulario`: PK UUID, códigos y slugs únicos, FK de formulario/territorio/dimensión y unicidad `(formulario_id, sujeto_id)`. Hay índices B-tree de estado, código, dimensión, territorio, formulario y sujeto compuesto. El índice de código adicional a su UNIQUE es redundante; no se eliminó sin medir el uso.

La migración `0032_integridad_formularios` impone estado BORRADOR/PUBLICADO/CERRADO, esquema de preguntas array, documento constructor objeto o NULL, datos de respuesta/enfoque objetos y evidencias array. `0033_conservar_respuestas` sustituye el CASCADE por RESTRICT. Ambas coinciden con metadatos ORM, admiten upgrade/downgrade y conservan una respuesta con coordenadas/fotos al migrar 31 → head. También se probó base vacía → head → base → head con `alembic check` sin diferencias.

No hay SP de negocio ni triggers de usuario de formularios en las tablas inspeccionadas: el CRUD reside en servicios FastAPI y SQLAlchemy. Los triggers internos de FK sí pertenecen a PostgreSQL. No se añadieron procedimientos para duplicar el contrato transaccional existente.

Se inspeccionó `public.generar_uuid_v7()`: PL/pgSQL, `SECURITY INVOKER` (`prosecdef=false`), fecha y bytes aleatorios con bits de versión y variante. Una muestra de 100 UUID fue distinta y versión 7; esa muestra no constituye una garantía matemática de unicidad. No se encontró una función SECURITY DEFINER de formularios ni se introdujo un `search_path` inseguro.

El inventario productivo posterior registra cero estados/formas JSONB incompatibles. Ese resultado verifica formas y estados, no toda posible modificación manual del contenido.

## Persistencia, atomicidad y pruebas negativas

Las pruebas HTTP leen después desde otra conexión a PostgreSQL: las respuestas válidas conservan coordenadas y fotos, los datos de preguntas ocultas/ajenas se excluyen y los inválidos no crean filas. Se probaron cinco fotos, una sexta, tamaño mayor a 5 MB, formatos/contenidos inválidos, coordenadas fuera de rango o booleanas, categoría inexistente y descripción de más de 500 caracteres.

Se forzó fallo después de flush en edición y borrado, fallo de commit y cancelación después de escribir. La nueva conexión confirmó rollback. Se probó edición permitida de una respuesta sin crear un segundo registro, y concurrencia con límite uno. El ciclo de vida del formulario con respuestas termina en cierre para conservación, no borrado.

## Verificación productiva y evidencias

HTTPS `/f/reporte-inseguridad` y API pública por slug: 200. Slug inexistente: 404. Respuestas y analítica sin token: 401. Backend, frontend y Nginx activos. La validación TLS se mantuvo habilitada.

Evidencias: [directorio de resultados](evidencias/calidad-formularios-2026-10-02/), con salida de 96 pruebas, migraciones, lint específico y global, check/build frontend, inventarios SQL antes/después y códigos HTTP. La suite nueva está en `backend/tests/test_calidad_formularios.py`.

Reproducción de regresión con una base exclusiva ya migrada:

```bash
POLIS_TEST_DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55439/polis_test_form_calidad_20261002 \
uv run --project backend pytest backend/tests/test_formularios_admin.py \
 backend/tests/test_formularios_consultas.py backend/tests/test_urls_formularios.py \
 backend/tests/test_reporte_geoespacial.py backend/tests/test_calidad_formularios.py \
 backend/tests/test_transactions.py backend/tests/test_transaction_policy.py -q
```

Para el ciclo completo de migraciones usar otra base exclusiva vacía; no ejecutar downgrade de todo el proyecto sobre datos productivos o una base compartida con pruebas de identidades.

## Límites del resultado

- Las coordenadas se almacenan en JSONB, no en una geometría PostGIS con índice espacial. Se valida rango geográfico, pero no pertenencia al polígono de Cartagena en el servidor.
- Fotos persistentes en JSONB; esta revisión no implementa almacenamiento de objetos ni eliminación de EXIF para estas fotos.
- Respuestas y analítica siguen internas. La bandeja de moderación, aprobación administrativa y capa ciudadana del geovisor están pendientes según `reportes-revision-publicacion.md`; publicar el formulario no publica sus respuestas.
- No existe CRUD administrativo completo de respuestas individuales. El contrato implementado permite enviar, editar si está autorizado en configuración, listar y analizar.
- Listado de respuestas y analítica cargan resultados sin paginación; no se ejecutó una prueba de carga ni se declara capacidad para grandes volúmenes.
- La protección de esquema y borrado no sustituye una bitácora inmutable de todas las modificaciones ni evita actuaciones directas de una cuenta privilegiada de PostgreSQL.
- El lint global de backend requiere corregir 45 errores fuera de formularios. La revisión independiente del equipo EAF todavía debe emitirse.
