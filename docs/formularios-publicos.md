# Formularios públicos y enlaces compartibles

Desde `/plataforma/formularios`, una persona con `formularios:gestionar` crea el
formulario, selecciona **Activo** y guarda. El botón **Compartir** de su tarjeta
abre la analítica y la sección **Compartir formulario**: URL, copiar, WhatsApp,
Telegram, correo y QR. Los enlaces no envían mensajes automáticamente.

El enlace canónico es `https://seguridadhumanaintegral.org/f/<slug>`. El título
normalizado y un sufijo UUID de ocho caracteres generan el identificador;
PostgreSQL impone unicidad. Se conserva al editar el título. El sufijo evita las
colisiones del ejemplo basado exclusivamente en cuatro caracteres de la hora.
El identificador definitivo lo asigna la API, no el navegador.

**Condición del dominio en esta entrega:** HTTP responde correctamente; HTTPS
presenta un certificado autofirmado y `curl` rechaza su verificación (error 60).
Se conserva la URL HTTPS solicitada. Antes de difundir esos enlaces oficialmente,
se necesita un certificado público válido. No se desactivó la verificación TLS
ni se cambió el enlace a HTTP para ocultar el problema.

## Acceso y publicación

- Activo: página institucional, preguntas completas, botón **Enviar respuesta** y
  confirmación. No exige cuenta ni formulario de login. Al enviar, la aplicación
  obtiene silenciosamente una sesión anónima de la API si no hay sesión vigente.
- Borrador: la API pública no entrega sus preguntas; el navegador sin sesión vuelve
  a `/`. La vista previa requiere sesión y `formularios:leer` y no envía respuestas.
- Cerrado o con fecha vencida: se informa el cierre y el servidor rechaza el envío.
- Slug inexistente: HTTP 404.

La lectura pública queda clasificada en `docs/permisos-api.md`. Listar borradores,
respuestas y analítica requiere `formularios:leer`; escribir requiere
`formularios:gestionar`. Los permisos se comprueban en el backend. El registro
público de usuarios conserva exclusivamente el rol ciudadano.

Next.js genera las páginas publicadas durante el build (`generateStaticParams`),
permite nuevos slugs sin recompilar y revalida cada 60 segundos. Las escrituras
solicitan invalidación de `/f/<slug>` mediante el endpoint Next
`POST /api/formularios/revalidar`: valida el Bearer con `/identidad/perfil` y exige
`formularios:gestionar`. Es una caché derivada, no una escritura de negocio.
Un fallo de invalidación avisa al editor sin fingir que falló una escritura ya
confirmada; el enlace puede tardar hasta un minuto en reflejar cambios. La vista
ciudadana vuelve a comprobar la publicación y la API valida su estado al enviar.
OpenGraph incorpora título, descripción, URL e imagen local `/og-image.png`.

El build necesita la API y sus migraciones disponibles para consultar el catálogo
publicado. El job frontend de CI provisiona PostgreSQL/PostGIS 16 y una API sobre
`polis_test_frontend`, comprueba readiness y después compila. No consulta producción
ni oculta un fallo de API sustituyendo el catálogo por datos de demostración.

En despliegues con proxy inverso, `/api/formularios/revalidar` debe enviarse a
Next.js, mientras `/api/v1/*` va a FastAPI. En el servidor actual se añadió una
excepción exacta a la regla general de Nginx `/api/`, se verificó la configuración
y se recargó Nginx. Una petición sin sesión por el dominio devuelve 401 desde
el handler correcto; antes alcanzaba una ruta inexistente del backend.

## Persistencia y transacciones

La revisión `0030_url_formularios` agrega `slug`, su restricción única y
`documento_constructor` JSONB a `participacion_ciudadana.formularios_consulta`.
Conserva registros existentes asignándoles `consulta-<uuid>`, sin modificar
migraciones históricas. Los documentos contienen los 14 tipos, secciones,
validaciones, lógica y configuración. La API traduce el contrato anterior para
leer los formularios existentes; las modificaciones del constructor utilizan su
endpoint específico para evitar dos representaciones desincronizadas.

Crear o editar delimita una transacción de servicio, incluidos `flush`, `refresh`
y validación del DTO. Las respuestas se guardan en
`participacion_ciudadana.respuestas_formulario`. La transacción de envío valida
preguntas visibles y secciones alcanzables, excluye datos ocultos o desconocidos,
verifica tipos, opciones, fechas, números, archivos y coordenadas. Un bloqueo del
formulario serializa el límite de respuestas; se comprueba el estado vigente.
Las pruebas observan escrituras y rollback desde una conexión independiente.

La prevención de duplicados se aplica a la sesión/sujeto, no identifica de forma
infalible a una persona que cambia de navegador. Los nuevos formularios y sus
respuestas persisten entre navegadores. Los dos ejemplos históricos se identifican
como **demostración** y conservan respuestas únicamente en memoria:
`/f/diagnostico-barrio-2026` y `/f/priorizacion-dimensiones-2026`.

## Límites concretos

Los puntos son GeoJSON Point WGS84 `[longitud, latitud]`; se validan rangos,
referencia y precisión opcional. No se verifica pertenencia al polígono distrital
ni se sincronizan automáticamente con el geovisor. El GPS requiere contexto
seguro y permiso del navegador; mapa y coordenadas permanecen disponibles.

Los archivos admitidos mantienen el contrato del constructor: máximo 2 MB por
archivo, JSON con base64, MIME permitido y tamaño comprobado en servidor. En
formularios persistidos se almacenan dentro de la respuesta JSONB. La migración a
almacenamiento de objetos MinIO/S3 y URLs de descarga no forma parte de esta entrega.
No se acredita inspección antivirus ni detección del tipo por firma binaria.

QRServer recibe exclusivamente la URL pública cuando se abre el QR. Copiar usa
Clipboard API o selección y copia compatible con HTTP; si el navegador lo impide,
se ofrece copia manual y no se muestra una confirmación falsa.

La evidencia de implementación corresponde a EDD. Los checks no constituyen un
dictamen independiente del EAF ni una certificación integral WCAG.
