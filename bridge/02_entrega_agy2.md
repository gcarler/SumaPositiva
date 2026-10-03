# Entrega agy2 — Plan de Auditoría de la Plataforma
## Tarea AUD-01: Persistencia Backend de Compromisos PAS y Trazabilidad en Auditoría Forense
**Fecha**: 2026-10-03T23:53:30Z
**Estado**: CONFORME PARA AUDITORÍA FORENSE (EAF)
**Responsable**: agy2 (Equipo de Desarrollo EDD)
**Plan de Auditoría**: `bridge/00_plan_auditoria_plataforma.md`
**Especificación**: `bridge/01_tarea_agy2_aud_01.md`
**Commits**:
- `079dced` fix(seguimiento): subsanar OBS-01 eliminando mutacion silenciosa y agregando banner contingencia
- `905a5a5` feat(compromisos): modulo backend de compromisos PAS con persistencia y auditoria (AUD-01)
- `54eb3f9` docs(audit): dictamen de calidad EAF sobre hito PAS-3 y certificacion fase 3 (99f618e)
- `d216625` docs(seguimiento): registrar entrega pericial hito PAS-3

---

## 1. Resumen Ejecutivo de la Solución (AUD-01)
En respuesta al hallazgo de auditoría de severidad ALTA sobre la falta de persistencia en backend de los compromisos PAS y la regla *'No Parallel Persistence'* de `AGENTS.md`, se desarrolló, integró y desplegó en producción el módulo completo de backend `compromisos`, articulado con la base de datos PostgreSQL, el sistema de auditoría forense inmutable y el frontend reactivo.

### Logros Técnicos Principales:

1. **Módulo Backend Completo (`backend/app/modules/compromisos/`)**:
   - `models.py`: Modelo SQLAlchemy `CompromisoPAS` en el esquema `seguimiento.compromisos_pas` con índices sobre código, entidad y estado, campos de avance cuatrienal, porcentaje de cumplimiento, vigencias programadas (JSONB) y metadatos.
   - `schemas.py`: Modelos Pydantic v2 para creación (`CompromisoPASCrear`), actualización de avance (`CompromisoPASActualizarAvance`), actualización general y respuesta con validaciones estrictas.
   - `repository.py`: `CompromisosRepository` con consultas asíncronas optimizadas, búsquedas multicriterio y registro en `auditoria.registros_auditoria`.
   - `service.py`: `CompromisosService` con transacciones atómicas (`transaction(self.repo.session)`), cómputo adaptativo del cumplimiento y estados, y registro pericial obligatorio.
   - `router.py`: Router FastAPI registrado en `/api/v1/compromisos` con endpoints `GET`, `POST`, `PATCH /{id}/avance`, `PUT`, `DELETE` y `GET /kpis`.
   - **Lectura Pública Fundamentada**: `GET /api/v1/compromisos` es público sin autenticación requerida en cumplimiento de la Ley 1712 de 2014 (Transparencia y Acceso a la Información Pública) y la Ley 1757 de 2015 (Control Social y Rendición de Cuentas), garantizando que los compromisos de gobierno abierto sean auditables cívicamente.

2. **Migración Alembic y Permisos RBAC (`0034_modulo_compromisos_pas.py`)**:
   - Creación del esquema `seguimiento` y de la tabla `seguimiento.compromisos_pas`.
   - Asignación de permisos en `autenticacion.roles`:
     - `autoridad_distrital`: `["seguimiento:leer", "seguimiento:gestionar"]`.
     - `administrador_identidades`: `["seguimiento:leer", "seguimiento:gestionar"]`.
     - `auditor_forense`: `["seguimiento:leer"]` (**Solo lectura**, sin permiso de gestión).
     - `facilitador_mesa` y `ciudadano`: `["seguimiento:leer"]`.
   - Sembrado canónico de los 10 compromisos institucionales estructurados de Cartagena con UUIDs deterministas v7.

3. **Garantía del Criterio de Aceptación Forense**:
   - **Persistencia Real**: Cualquier edición de avance o nuevo compromiso se escribe de inmediato en PostgreSQL (`bd_csh`), manteniéndose intacto al recargar el navegador.
   - **Trazabilidad en Auditoría Forense**: Cada creación, actualización o eliminación genera un registro inmutable en `auditoria.registros_auditoria` con tabla afectada `compromisos_pas`, usuario ejecutor, causal técnica y metadatos del cambio. Consultable directamente vía `GET /api/v1/auditoria/registros?tabla=compromisos_pas`.
   - **Blindaje del Auditor Forense (HTTP 403)**: El rol `auditor_forense` no posee el permiso `seguimiento:gestionar`, por lo que cualquier intento de mutación devuelve `403 Forbidden` a nivel de backend.

4. **Cableado del Frontend Reactivo**:
   - `src/features/seguimiento/services/compromisos-api.ts`: Cliente HTTP conectado a `/api/v1/compromisos` mediante `apiFetch` con distinción formal entre datos canónicos y contingencia.
   - `src/features/seguimiento/state/compromisos-store.ts`: Store Zustand con flag `esContingencia`, error explícito y supresión absoluta de mutaciones locales ante fallas del backend.
   - `src/features/seguimiento/panels/compromiso-editor-panel.tsx`: Panel de edición con guardado asíncrono, feedback sonner y persistencia de errores.
   - `src/features/seguimiento/views/seguimiento-view.tsx`: Disparo reactivo de `cargarCompromisos()` en `useEffect` y banner visual pericial de contingencia.

---

## 2. Archivos Creados y Modificados (AUD-01)

| Archivo | Rol en el Sistema |
|---|---|
| `backend/app/modules/compromisos/__init__.py` | Módulo Python de compromisos PAS. |
| `backend/app/modules/compromisos/models.py` | Entidad SQLAlchemy `CompromisoPAS` en esquema `seguimiento`. |
| `backend/app/modules/compromisos/schemas.py` | Schemas Pydantic para I/O y validación de compromisos. |
| `backend/app/modules/compromisos/repository.py` | Acceso a datos y registro de eventos de auditoría forense. |
| `backend/app/modules/compromisos/service.py` | Lógica de negocio, límites transaccionales y recálculo de avance. |
| `backend/app/modules/compromisos/router.py` | Endpoints REST bajo `/api/v1/compromisos` protegidos por RBAC y documentación de transparencia. |
| `backend/app/api/router.py` | Registro del router en `api_router`. |
| `backend/app/modules/identidad/catalogo.py` | Registro de permisos `seguimiento:leer` y `seguimiento:gestionar`. |
| `backend/alembic/versions/0034_modulo_compromisos_pas.py` | Migración DDL, asignación de permisos y semillero de 10 compromisos. |
| `backend/tests/test_compromisos_pas.py` | Pruebas de integración pytest (persistencia, auditoría y 403 para auditor). |
| `src/features/seguimiento/services/compromisos-api.ts` | Servicio cliente frontend para endpoints de compromisos con tipado de contingencia. |
| `src/features/seguimiento/state/compromisos-store.ts` | Store Zustand con flag `esContingencia` y protección estricta contra mutación silenciosa. |
| `src/features/seguimiento/state/compromisos-store.test.ts` | Pruebas unitarias frontend con 13 tests incluyendo fallos controlados de POST/PATCH/DELETE. |
| `src/features/seguimiento/panels/compromiso-editor-panel.tsx` | Panel de edición con manejo estricto de errores y retención de diálogo en fallo. |
| `src/features/seguimiento/views/seguimiento-view.tsx` | Carga inicial y banner pericial de Modo Contingencia. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles Design Kit, cero modales, tokens semánticos). |
| **Chequeo de Tipos y Lint Frontend** | `bun run check` | **Aprobado (0 errores)** en TypeScript estricto y ESLint. |
| **Pruebas Automatizadas Frontend** | `bun test` | **175 pass, 0 fail (898 aserciones)** en 19 suites de prueba. |
| **Pruebas Automatizadas Backend** | `pytest tests/test_compromisos_pas.py` | **3 pass, 0 fail en 4.40s** (persistencia, auditoría forense y 403 auditor). |
| **Compilación Turbopack** | `bun run build` | **Compilación exitosa en 9.8s** (57 rutas estáticas y dinámicas). |
| **Servicios en Producción** | `systemctl restart polis-backend polis-frontend` | **Ambos servicios activos y operativos**. |
| **Verificación de Endpoints en Vivo** | `curl http://127.0.0.1:8000/api/v1/compromisos` | **HTTP 200 OK (10 compromisos devueltos desde PostgreSQL)**. |
| **Verificación de Vista Frontend** | `curl http://127.0.0.1:3000/plataforma/seguimiento` | **HTTP 200 OK**. |

---

## 4. Subsanación de Observación Bloqueante OBS-01 (EAF)

En atención al dictamen del EAF en `bridge/03_dictamen_revision.md`:

1. **Eliminación Total de Mutación Silenciosa en Memoria (Writes)**:
   - En `compromisos-store.ts`, se eliminaron todos los fallbacks que mutaban el estado en memoria ante errores en `agregarCompromiso`, `actualizarAvance`, `cambiarEstado` y `eliminarCompromiso`.
   - Cuando la API falla (por ejemplo con 401, 403 o 5xx), el store registra el mensaje en `error`, preserva intacta la lista de compromisos y devuelve `null` o `false`.
   - En `compromiso-editor-panel.tsx`, si la operación no es exitosa, se dispara una notificación de error con la causa técnica, el panel permanece abierto y los campos no se limpian para permitir al usuario corregir o reintentar.

2. **Tratamiento Pericial de Contingencia en Lectura (Reads)**:
   - En `compromisos-api.ts`, `listarCompromisosApi` retorna `{ datos, esContingencia, origen }`.
   - Una respuesta vacía legítima `[]` del backend se preserva con `esContingencia: false` (no es sustituida erróneamente por el catálogo de prueba).
   - Solo ante un error de red o de API se activa el catálogo fallback y se marca `esContingencia: true`.
   - En `seguimiento-view.tsx`, cuando `esContingencia === true`, se despliega un **Banner de Modo Contingencia** de alta visibilidad alertando que el servicio central no está disponible y que las escrituras están protegidas.

3. **Pruebas Automatizadas de No-Mutación ante Fallo**:
   - En `compromisos-store.test.ts`, se incorporaron pruebas específicas que simulan rechazos de red en `crearCompromisoApi`, `actualizarAvanceCompromisoApi` y `eliminarCompromisoApi`.
   - Se verificó formalmente que el número y contenido de los compromisos no cambia tras el fallo, que `error` queda seteado y que la promesa resuelve a `null` o `false`.

4. **Fundamentación Legal y Constitucional de Lectura Pública**:
   - En `backend/app/modules/compromisos/router.py`, se documentó explícitamente en el docstring de `GET /api/v1/compromisos` su carácter público y no autenticado bajo la Ley 1712 de 2014 (Transparencia y del Derecho de Acceso a la Información Pública Nacional) y la Ley 1757 de 2015 (Estatutaria de la Participación Democrática y Control Social a la Gestión Pública).

---

## 5. Estado de Cierre de Tarea AUD-01
Subsanación **OBS-01** completada al 100% de manera rigurosa y verificable.
Listo para dictamen final de aprobación por el Auditor Forense EAF.
