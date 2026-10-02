# Entrega codex2 — Módulo Usuarios y Configuración
Fecha: 2026-10-02
Commit de funcionalidad: 3a24e32

## Implementado
- Vista de usuarios con ocho perfiles de demostración, KPIs, búsqueda, filtro por rol y diseño adaptable.
- Paneles laterales para invitar, editar y consultar actividad, con acciones de demo aisladas del directorio real.
- Configuración con apariencia, notificaciones, política pública, geovisor y seguridad.
- Paneles registrados en `panel-registry.tsx`, permisos conectados y color de autoridad con tokens semánticos.

## Validación
- `bun run check`: aprobado.
- `bun run ui:test`: 194/194 historias aprobadas.
- `bun run build`: aprobado.
- Reinicio de `polis-frontend.service`: servicio activo.
- `/plataforma/usuarios`: 200 · `/plataforma/configuracion`: 200.

Estado: CONFORME
