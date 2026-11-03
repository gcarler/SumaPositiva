# Entrega OL-278 — Catálogo de eventos POLIS Herald

**Estado:** terminado, solo documentación. Sin commit ni push.

## Salida

- `docs/herald_catalogo_eventos.md`, con matriz resumen, 12 fichas y preguntas abiertas para revisión jurídica.

## Base leída del código real

- Migraciones:
  - `backend/alembic/versions/0092_notif_eventos.py`
  - `backend/alembic/versions/0093_herald_gestion.py`
- Modelo y constraint:
  - `backend/app/modules/notificaciones/models.py`
- Encolado y servicio:
  - `backend/app/modules/notificaciones/service.py`
- Plantillas:
  - `backend/app/modules/notificaciones/correo.py`
  - `backend/app/modules/notificaciones/plantillas_eventos.py`
- Rutas de negocio:
  - `backend/app/modules/aportes/service.py`
  - `backend/app/modules/identidad/service.py`
  - `backend/app/modules/canales/service.py`
  - `backend/app/modules/comunicaciones/service.py`
  - `backend/app/modules/mesas/service.py`
- Consulta complementaria de audiencia: `backend/app/modules/identidad/router.py`.

## Resultado principal

- El CHECK actual contiene 12 tipos exactos.
- Se clasificaron como **OBLIGATORIO** (propuesta técnica):
  - `radicacion`
  - `cambio_estado`
  - `priorizacion`
  - `registro_bienvenida`
  - `recuperacion_contrasena`
  - `perfil_actualizado`
  - `contrasena_cambiada`
  - `alerta_pendientes`
  - `propuesta_actualizada`
- Se clasificaron como **INFORMATIVO** (propuesta técnica):
  - `apoyo_propuesta`
  - `actividad_ciudadana`
  - `gestion_institucional`

## Elementos marcados `NO VERIFICADO`

1. `resumen_diario`: no aparece en la CHECK actual, el ORM ni los servicios leídos. Se documentó como no implementado y no se inventó ficha.
2. En `radicacion` WhatsApp: se reportó el cuerpo real, pero se marcó `NO VERIFICADO` si `wa_id` u otras metadatas se muestran fuera del cuerpo; en el código leído no se interpola ese metadato en el HTML.
3. En `recuperacion_contrasena`: se marcó `NO VERIFICADO` cualquier dato de IP o ubicación, porque las plantillas leídas no los contienen.
4. En `gestion_institucional`: se limitó la ficha a las rutas actuales revisadas y se señaló como no verificable el contenido de futuras llamadas que puedan agregar otros datos al detalle.
5. En `apoyo_propuesta`: se dejó registro de que `apoyos_totales` es parámetro del generador, pero no aparece interpolado en el HTML leído.

## Reglas cumplidas

- No se modificó ningún archivo bajo `backend/` ni `src/`.
- No hay SQL, red, pytest, commit ni push.
- La obligatoriedad queda explícitamente como propuesta técnica, no dictamen legal.
