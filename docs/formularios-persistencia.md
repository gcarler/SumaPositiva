# Formularios: una fuente persistente

Desde esta entrega el catálogo administrativo y las rutas `/f/[slug]` se obtienen exclusivamente de FastAPI y PostgreSQL. Zustand es caché de lectura y almacenamiento de borradores para vista previa; inicia vacío y no confirma escrituras ni respuestas por sí mismo.

Crear y editar usan `/api/v1/formularios/constructor`; responder usa `/{id}/respuestas`; eliminar espera confirmación de la API antes de quitar el registro de la caché. Un error se comunica al usuario y conserva el estado anterior; nunca activa un respaldo en memoria. Slug, identificador persistido, estado y contadores devueltos por el servidor son los valores autorizados.

`formularios.mock.ts` y `formularios-demo-store.ts` se reservan a pruebas e historias y no se importan desde código de producto. Las antiguas URLs de ejemplos ya no generan páginas: devuelven 404 si no hay un registro publicado con ese slug en PostgreSQL. No se convierten respuestas ficticias en información ciudadana ni se eliminan registros existentes de la base.

La migración `0031_reporte_inseguridad` inserta el instrumento institucional solicitado, con sus 7 categorías, 53 casos y 12 preguntas configuradas (6 visibles por categoría). Es configuración real persistida, sin respuestas precargadas. Su id de negocio es `reporte-ciudadano-geoespacial`; `idPersistido` conserva el UUID usado por las claves foráneas y endpoints.

La ubicación con fotos se guarda como `{tipo: "ubicacion_geografica", valor: {lat, lng, barrio?, fotos}}`. Hasta cinco fotos JPEG/PNG/WebP de 5 MB cada una: el servidor verifica contenido y tamaño antes de escribir. Las fotos se conservan en JSONB como base64; los thumbnails en memoria solo representan el borrador antes de enviar. Un almacenamiento de objetos puede sustituir ese formato mediante una entrega específica con autorización, referencias persistentes y compensación de cargas fallidas; esta entrega no simula que exista MinIO/S3.

Publicar las preguntas no publica las respuestas. La revisión y aprobación de reportes se describe en [reportes-revision-publicacion.md](reportes-revision-publicacion.md).

## Operación

Aplicar las migraciones con `bun run backend:migrate`; reiniciar backend y frontend después de comprobar compilación. La página SSG necesita el catálogo real durante el build. Si la API no está disponible, el build falla: no sustituye datos por ejemplos.

El cuerpo JSON de cinco fotos puede alcanzar aproximadamente 35 MB por base64. Next usa `proxyClientMaxBodySize: "40mb"`; en Nginx el límite se aplica únicamente al prefijo de formularios, manteniendo el límite general de las demás rutas:

```nginx
location /api/v1/formularios/ {
    client_max_body_size 40m;
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

La configuración exacta del proxy pertenece al entorno operativo; el límite de cinco fotos y 5 MB por foto se valida también en la API.

## Integridad y conservación del registro — revisión 2026-10-02

Las migraciones `0032_integridad_formularios` y `0033_conservar_respuestas` agregan seis restricciones CHECK para estados y formas JSONB, y sustituyen la eliminación en cascada por una clave foránea `ON DELETE RESTRICT`. La API devuelve 409 al intentar borrar un formulario con respuestas; debe cerrarse para conservar el registro. Una vez recibidas respuestas, tampoco admite cambios de preguntas ni secciones, aunque permite actualizar título, descripción y estado.

Crear, modificar, responder y eliminar usan la transacción del servicio. Las operaciones que modifican un formulario existente bloquean su fila con `FOR UPDATE`, incluyendo las rutas legadas. Esto serializa las comprobaciones del límite de respuestas, cierre y eliminación. La respuesta HTTP de éxito se prepara antes del commit; un fallo revierte la operación.

Los metadatos de identidad, origen, fechas y contadores del DTO se reconstruyen desde PostgreSQL; no se aceptan como autoridad los enviados por el cliente. Las rutas legadas también validan opciones y escalas. Coordenadas, límites de fotos y preguntas condicionales se comprueban antes de escribir. Los detalles de prueba y límites están en [calidad-formulario-geoespacial.md](calidad-formulario-geoespacial.md).
