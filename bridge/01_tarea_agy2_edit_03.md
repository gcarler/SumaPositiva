# Tarea EDIT-03
: Persistencia Backend para Solicitudes Oficiales a Fuentes de Información
- **Prioridad**: **MEDIA**
- **Clasificación**: Backend API & Trazabilidad Forense
- **Diagnóstico del Hueco**:
  - En [`src/features/fuentes/panels/fuente-editor-panel.tsx:32`](file:///root/polis/src/features/fuentes/panels/fuente-editor-panel.tsx#L32), los operadores pueden radicar requerimientos de información formal a entidades distritales (Medicina Legal, Policía Nacional, CCV).
  - Sin embargo, el almacenamiento opera de forma puramente efímera en el store Zustand ([`src/features/fuentes/state/fuentes-store.ts:39`](file:///root/polis/src/features/fuentes/state/fuentes-store.ts#L39)), sin persistencia en base de datos PostgreSQL.
- **Alcance Propuesto**:
  1. *Base de Datos & Backend*:
     - Crear tabla `auditoria.fuentes_informacion` con campos: `id`, `radicado_solicitud`, `entidad`, `fecha_solicitud`, `fecha_limite_respuesta`, `estado_entrega`, `resumen_datos`, `observaciones_calidad`, `actualizado_por`.
     - Endpoints CRUD bajo `/api/v1/fuentes` con control de permisos `fuentes:gestionar`.
  2. *Frontend*:
     - Migrar `fuentes-store.ts` a consumo de React Query / backend real.
- **Criterios de Aceptación**:
  - Las solicitudes oficiales de información y sus radicados se almacenan con auditoría inmutable en PostgreSQL.


## Reglas permanentes
No inventar datos; Zero-Modals; tokens semanticos; tests (pytest en polis_test, bun test); no tocar archivos de codex; commit con rutas explicitas; al terminar: tmux send-keys -t agy "He terminado EDIT-03. Documentado en 02_entrega_agy2.md y listo para auditar." Enter
