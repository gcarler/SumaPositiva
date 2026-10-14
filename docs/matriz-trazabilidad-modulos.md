# Matriz de trazabilidad de módulos POLIS

**Snapshot censado:** 2026-10-14, rama `main`, base de la tarea `0ed3e66f2a67fdd9aac25d86b4f0b3f1265492ed` más cambios locales de `[ARCH-CONSOLIDACION-01]`.
**Alembic:** `0062_motor_plan_accion_dnp` (head único consultado con `uv run --project backend alembic -c backend/alembic.ini heads`).
**Permisos:** la clasificación de método, ruta y acceso está en [permisos-api.md](permisos-api.md); la matriz siguiente no reemplaza ese contrato.

## Criterio de estado

- **Persistente verificado:** recorrido de escritura probado de extremo a extremo contra base de pruebas aislada para este snapshot.
- **Parcial:** hay implementación frontend/API o evidencia histórica, pero no se verificó en esta ejecución la persistencia y autorización del recorrido completo.
- **Solo lectura:** el alcance observado consulta datos; no afirma escritura.
- **Pendiente de verificación:** el censo por sí solo no prueba integración ni funcionamiento.

No se asigna “persistente verificado” a un módulo solo por tener router, servicio, repositorio, modelo o migración. Las lecturas pueden usar catálogos semilla canónicos para SSG y Storybook si se revalidan con API en uso interactivo y el error se comunica. Una mutación nunca debe anunciar éxito ni modificar solo estado local cuando la API falla.

## Censo frontend

Se encontraron **21 directorios** directos bajo `src/features/`; la asignación EAF esperaba 23. No se inventan dos entradas para completar el conteo. El estado funcional individual no se certificó durante el censo.

| Feature | Estado de integración de este snapshot | Observación/alcance |
| --- | --- | --- |
| accesibilidad | Pendiente de verificación | Inventariada en el frontend; recorrido de persistencia no acreditado. |
| actores | Parcial | Corresponde al módulo backend `actores`, cuyo router existe pero no está montado. |
| alternativas | Parcial | Router backend existente y no montado en el ensamblador API. |
| aportes | Parcial | Router montado; la cobertura histórica no sustituye verificación E2E actual. |
| auditoria | Parcial | Router montado; alcance de lectura/escritura sujeto a permisos API. |
| barrio | Pendiente de verificación | No se identificó router backend homónimo en el censo. |
| comunicaciones | Parcial | Router montado. |
| diagnostico | Pendiente de verificación | No se identificó router backend homónimo; verificar integración con instrumentos/IA. |
| evidencias | Parcial | Corresponde a `evidencia`; router montado. |
| formularios | Parcial | Router montado; no se verificaron aquí todos los recorridos de escritura. |
| fuentes | Parcial | Router backend existente y no montado. |
| geovisor | Parcial | Corresponde a `geodatos`; router montado. Hay cambios simultáneos de agy2 fuera del alcance de esta asignación. |
| mesas | Parcial | Router montado; cobertura histórica de mesas no certifica todos los flujos actuales. |
| noticias | Parcial | Router montado; lecturas y mutaciones requieren validación por recorrido. ESLint vuelve a incluir el feature. |
| participacion | Parcial | Router montado. |
| plataforma | Pendiente de verificación | Superficie de administración compuesta; no es un módulo API homónimo. |
| politicas | Parcial | Se compone con `politicas`, `presupuesto` e `indicadores`; routers montados. |
| seguimiento | Parcial | Se compone principalmente con `compromisos`; router montado. |
| sesion | Parcial | Se compone con `sesion` e `identidad`; ambos routers montados. |
| testimonios | Parcial | Router montado; las mutaciones deben fallar en la interfaz si falla API. ESLint vuelve a incluir el feature. |
| usuarios | Parcial | Se compone con identidad/sesión y los permisos administrativos definidos en la matriz API. |

## Routers montados en `backend/app/api/router.py`

El archivo contiene **22 llamadas `include_router`**. Incluye el router de canales WhatsApp con prefijo local `/canales/whatsapp`.

| Router/módulo montado | Estado en esta ejecución |
| --- | --- |
| health | Pendiente de verificación funcional |
| aportes | Parcial; ver permisos-api.md |
| sesion | Parcial; ver permisos-api.md |
| politicas | Parcial; ver permisos-api.md |
| identidad | Parcial; ver permisos-api.md |
| evidencia | Parcial; ver permisos-api.md |
| mesas | Parcial; ver permisos-api.md |
| instrumentos | Parcial; ver permisos-api.md |
| ia | Parcial; ver permisos-api.md |
| geodatos | Parcial; ver permisos-api.md |
| presupuesto | Parcial; ver permisos-api.md |
| indicadores | Parcial; ver permisos-api.md |
| formularios | Parcial; ver permisos-api.md |
| participacion | Parcial; ver permisos-api.md |
| testimonios | Parcial; ver permisos-api.md |
| auditoria | Parcial; ver permisos-api.md |
| compromisos | Parcial; ver permisos-api.md |
| noticias | Parcial; ver permisos-api.md |
| comunicaciones | Parcial; ver permisos-api.md |
| notificaciones | Parcial; ver permisos-api.md |
| canales (WhatsApp) | Parcial; ver permisos-api.md |
| seguridad | Parcial; ver permisos-api.md |

## Módulos con `router.py` no montados

El filesystem contiene **25 módulos** con `router.py`; tres no aparecen en el ensamblador API actual: `actores`, `alternativas` y `fuentes`. Su existencia no los hace accesibles por HTTP. Revisar y decidir montaje, retiro o documentación como internos en una tarea de alcance funcional.

## Límites de la evidencia

- El conteo inspeccionado no coincide con los “23 features / 23 routers” de la asignación; se reporta el hallazgo para que EAF valide si esperaba otra rama o definición de “módulo”.
- Esta matriz es inventario estructural con clasificación conservadora, no certificación de conexión total ni de preparación de producción.
- No se verificaron despliegue, CSP activo en producción, proveedores externos ni todos los recorridos de escritura. Las pruebas de esta tarea se reportan aparte en `bridge/02_entrega_codex.md`.
