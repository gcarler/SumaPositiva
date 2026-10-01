# Área de gestión interna de POLIS

`/` conserva el portal ciudadano. `/plataforma` es el área interna; usa el host
único de paneles laterales y los mismos controles y tokens del kit.

## Rutas y roles

| Rol | Dashboard | Formularios | Mesas | Geovisor | Contenido | Usuarios y Roles | Configuración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ciudadano / anónimo | — | — | — | — | — | — | — |
| autoridad_distrital | Consulta | Gestión* | Gestión* | Consulta | Gestión* | — | — |
| facilitador_mesa | Consulta | Lectura | Gestión* | — | — | — | — |
| auditor_forense | Consulta | Lectura | Lectura | Lectura | Lectura | — | Lectura |
| administrador_identidades | Consulta | Gestión* | Gestión* | Consulta | Gestión* | Gestión* | Gestión |

`*` Las acciones requieren además el permiso correspondiente de la sesión:
`formularios:gestionar`, `mesas:abrir`, `mesas:acuerdos`, `politicas:gestionar` o
permisos de identidad. Entrar a un módulo no concede permisos nuevos a la API.
Los roles personalizados no acceden a esta navegación hasta contar con una
clasificación explícita; mantienen sus permisos de API y su cuenta en el portal.

La ruta de usuarios se limita al administrador por la instrucción de producto,
aunque el auditor mantiene lectura de identidad en la API. Configuración es
consultable por el auditor, sin controles de escritura. El modo lectura también
se aplica a paneles abiertos: no basta ocultar el enlace del sidebar.

## Sesión y navegación

- Login de usuario interno por correo o Google: `/plataforma` y cierre del panel.
- Login ciudadano: `/`, sin acceso a gestión interna.
- Ruta privada sin sesión válida: `/?login=1`, apertura del panel de sesión.
- Ciudadano, anónimo identificado como ciudadano o rol desconocido: sin acceso;
  una cuenta ciudadana activa vuelve al portal.
- Ruta interna fuera del rol: dashboard, sin montar el contenido no autorizado.
- Una sesión restaurada espera verificación del perfil remoto. 401, caducidad o
  cuenta inactiva limpian acceso; error de servicio bloquea y permite reintentar.
- Cerrar sesión revoca en la API, limpia estado/caché y vuelve al portal.
- Volver al portal conserva sesión sin redirección automática. El acceso interno
  se ofrece con «Ir a la Plataforma» cuando corresponde.

El guard es de cliente, acorde al contrato solicitado de `sessionStorage`.
La respuesta HTML de Next.js puede ser 200 antes de que el cliente redirija;
esto no sustituye la autorización de datos y escrituras en FastAPI. No se afirma
un guard de servidor ni cookies HttpOnly.

## Fuentes de datos y alcance de las pantallas

- Dashboard: formularios activos y agenda de los stores existentes; territorio
  más activo como referencia de demostración. Alertas ciudadanas consultadas en
  la API. Usuarios registrados conserva el placeholder solicitado.
- Formularios: renderer/listado compartido con el módulo entregado; construcción,
  vista previa y analítica. Datos de demostración en memoria.
- Mesas: agenda/editor existentes en memoria, identificados como demostración;
  panel de acuerdos existente y protección de lectura.
- Usuarios y Roles: directorio real de identidad y panel existente de administración.
- Geovisor: geometrías y territorios reales de `/api/v1/geodatos/*`, validados con
  Zod; mapa OpenLayers y lista accesible. Sin fallback a datos ficticios ante error.
- Contenido: fases, líneas y aportes reales; control existente de fases para
  quienes poseen permisos. No añade un CRUD de líneas/aportes nuevo.
- Configuración: tema del navegador, actualización de consultas y enlace al control
  de fases. No existe integración de parámetros globales persistidos en esta versión.

Google requiere cliente y orígenes configurados, según [identidad](identidad.md).
No se introducen credenciales, elevaciones de rol ni persistencia paralela.

## Verificación

`bun run check`, `bun run build`, `bun run ui:test`, `bun run storybook:build` y
`bunx vitest run --project plataforma --project formularios`.
Las historias y pruebas simulan servicios sin escribir en la base de trabajo.
Las pruebas de identidad requieren una base `polis_test*` y verificador Google
controlado dentro del test; el servicio no admite tokens ficticios en ejecución.

### Evidencia de entrega — 2026-10-01

[Evidencias](evidencias/plataforma-2026-10-01/) conserva resultados de check,
compilaciones, 173 historias, 55 pruebas de dominio y 14 pruebas Google/transacciones
contra PostgreSQL temporal (puerto 55439), exclusivo de pruebas.

El navegador comprueba 42 casos sobre Next.js compilado: siete rutas y cuatro
roles, login email, salida, navegación opt-in, rechazo ciudadano/anónimo, perfil
revocado o distinto al persistido, axe WCAG 2.1 AA y reflujo en claro/oscuro a
320 y 1440 px. La API se intercepta para esta matriz; no acredita datos reales.
Repetir con `POLIS_E2E_FRONTEND_URL=http://127.0.0.1:3000 node scripts/plataforma-e2e.mjs`.

También se comprobó el flujo real de identidad con FastAPI y PostgreSQL aislados:
login, alta, rol, asignación, logout y rechazo del token revocado. La API usada
fue un snapshot de `c0cfcf1` con los cambios de Google; en ese snapshot pasan 38
pruebas de identidad. No equivale a aprobar todo el backend del árbol compartido.

El callback Google se verifica usando los componentes reales y un SDK interceptado:
`bunx vite --config scripts/fixtures/plataforma-google/vite.config.mjs`, seguido de
`node scripts/plataforma-google-e2e.mjs`. La API real verifica tokens firmados;
esta prueba del navegador no autentica una cuenta Google en vivo.

`bun run backend:check` global encuentra 45 incidencias Ruff en archivos ajenos a
esta entrega; los cinco archivos backend de esta entrega pasan Ruff.
La incompatibilidad del permiso nuevo `mesas:fotos:subir` con el catálogo de roles
fue corregida: las 38 pruebas de identidad también pasan en el árbol compartido
contra la base temporal. El catálogo reconoce el permiso existente; no concede
privilegios nuevos ni ejecuta migraciones de producción.
No se han desactivado controles para aprobarlos; EAF conserva la revisión independiente.

Los servicios frontend/backend fueron reiniciados. Portal HTTP 200 y API liveness
200; readiness de API devuelve 503 por migraciones pendientes de cambios paralelos
(database y extensions `ok`). No se ejecutaron migraciones en la base de producción.

## Constructor geográfico y acceso administrativo

La revisión `0028_formularios_admin` concede al administrador los permisos reales
`formularios:leer` y `formularios:gestionar`, con eventos de auditoría en la misma
transacción. La navegación continúa comprobando permisos vigentes. No concede
permisos de mesas ni de presupuesto por extensión.

El constructor permite añadir una pregunta **Ubicación geográfica** junto a las
preguntas existentes; ver [captura y exportación geográfica](formularios-geograficos.md).
