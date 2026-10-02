# Reportes ciudadanos: recepción interna y publicación autorizada

Revisión de EDD, 2026-10-02. Este documento distingue el comportamiento comprobado del flujo que todavía debe implementarse; no constituye un dictamen independiente del EAF.

## Estado comprobado

- El portal `/` tiene un geovisor ciudadano (`features/geovisor/views/geovisor-view.tsx`). `/plataforma/geovisor` tiene una vista administrativa protegida por sesión y rol (`features/plataforma/views/geovisor-view.tsx`). Son vistas distintas.
- Ninguna vista incorpora automáticamente las respuestas del formulario `reporte-inseguridad`. La capa «Reportes Ciudadanos» sigue pendiente, según el alcance de la tarea geoespacial.
- El formulario publicado admite respuesta ciudadana sin cuenta; la API utiliza una sesión técnica anónima. El reporte guarda las coordenadas y fotos en PostgreSQL, no en un store de demostración. La sesión técnica no acredita anonimato absoluto frente a registros de infraestructura o metadatos de imágenes.
- Las respuestas y la analítica requieren `formularios:leer`, validado por el backend. Actualmente tienen ese permiso `autoridad_distrital`, `facilitador_mesa`, `administrador_identidades` y `auditor_forense`. No existe todavía asignación individual de revisores ni una bandeja de moderación.
- Publicar un **formulario** permite abrir sus preguntas; no publica sus **respuestas**, fotos o puntos. No existe una ruta pública de respuestas ni un botón operativo para aprobar su publicación.

## Flujo recomendado para implementar

1. **Recibido, interno:** toda respuesta entra privada, con identificador y fecha del servidor. Ningún formulario debe permitir que el navegador declare pública una respuesta.
2. **En revisión:** un revisor designado verifica clasificación, duplicados, localización y evidencia. Puede solicitar correcciones o rechazar el reporte con motivo. El auditor consulta y fiscaliza; no sustituye la aprobación administrativa.
3. **Validado, interno:** el revisor deja constancia de lo comprobado. Validar no equivale a publicar.
4. **Publicado:** exclusivamente un administrador autorizado decide «Publicar», después de revisar la versión ciudadana. Se registran usuario, fecha, motivo y campos autorizados en la misma transacción.
5. **Retirado:** el administrador puede retirar una publicación; el registro original y el historial se conservan.

Mientras no exista autorización explícita, el reporte permanece interno. El equipo de revisión necesita permisos propios (`reportes:leer`, `reportes:revisar`); la autorización de publicación necesita `reportes:publicar`, restringido al administrador. No debe deducirse de `formularios:gestionar` ni de esconder botones. La matriz normativa y las pruebas 401/403 deben acompañar esa implementación.

## Persistencia y separación de vistas

Conservar la respuesta original de `participacion_ciudadana.respuestas_formulario`. Añadir un expediente de revisión vinculado por clave foránea: estado, responsable, motivo, versión y fechas; un historial de transiciones; y una proyección pública aprobada. Evitar un simple booleano mutable sin historial.

La transición a publicado debe bloquear el expediente, verificar permiso y versión, insertar el historial y actualizar la proyección en una transacción. La API ciudadana consultará exclusivamente esa proyección y exigirá estado publicado. Retirar una publicación debe impedir su lectura pública e invalidar cualquier caché.

El geovisor interno podrá mostrar puntos exactos y evidencias a los revisores autorizados. El público mostrará únicamente los campos aprobados: categoría, fecha y ubicación con precisión definida por el administrador. Fotos, narraciones y coordenadas originales no se expondrán por defecto. La precisión y eventual agregación deben ser una decisión explícita del producto.

## Criterios de aceptación de la siguiente entrega

- Un reporte recién recibido no aparece en ninguna respuesta de la API pública.
- Ciudadano y usuario sin permiso no pueden leer originales ni publicar; revisores pueden revisar, pero no publicar.
- Solo el administrador puede aprobar o retirar; la operación queda registrada y revierte completa ante fallo.
- Publicación concurrente, actualización de la respuesta y autorización caducada no sobrescriben una decisión más reciente.
- El mapa ciudadano se alimenta exclusivamente de la proyección aprobada; el interno aplica permisos del servidor.
- Revisar y publicar son acciones distintas en una bandeja interna, con filtros por estado y responsable. No se presenta esta bandeja como construida hasta verificarla.
