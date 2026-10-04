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
| rol personalizado | Según permisos asignados | Según permisos asignados | Según permisos asignados | `geovisor:leer` | Según permisos asignados | `usuarios:leer` | Según permisos asignados |

`*` Las acciones requieren además el permiso correspondiente de la sesión:
`formularios:gestionar`, `mesas:abrir`, `mesas:acuerdos`, `politicas:gestionar` o
permisos de identidad. Los roles personalizados obtienen enlaces y edición según
su catálogo de permisos vigente. Los permisos de gestión de la API siguen siendo
la autoridad para cada escritura; la navegación no los amplía. Por ejemplo,
`formularios:leer` y `formularios:gestionar` conceden acceso de gestión a Formularios
sin conceder acceso a Mesas, Usuarios o Geovisor.

Usuarios y Roles requiere `usuarios:leer`; invitar, editar y revocar requieren
`usuarios:gestionar`, y administrar perfiles requiere `roles:gestionar`. La API
evita que un delegado conceda permisos que no posee o se asigne permisos
administrativos. Configuración es consultable por el auditor, sin controles de
escritura. El modo lectura también se aplica a paneles abiertos: no basta ocultar
el enlace del sidebar.

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
  vista previa y analítica. Los nuevos formularios y respuestas se persisten en la
  API y tienen enlace público; los dos ejemplos conservan el modo de demostración.
  Véase [Formularios públicos](formularios-publicos.md).
- Mesas: agenda/editor existentes en memoria, identificados como demostración;
  panel de acuerdos existente y protección de lectura.
- Usuarios y Roles: directorio real de identidad y panel existente de administración.
- Geovisor: geometrías y territorios reales de `/api/v1/geodatos/*`, validados con
  Zod; mapa OpenLayers y lista accesible. Sin fallback a datos ficticios ante error.
- Contenido: fases, líneas y aportes reales; control existente de fases para
  quienes poseen permisos. No añade un CRUD de líneas/aportes nuevo.
- Configuración: tema del navegador, actualización de consultas y enlace al control
  de fases. No existe integración de parámetros globales persistidos en esta versión.

Los perfiles reutilizables se crean y asignan desde Usuarios y Roles. Los permisos
de Lectura habilitan la vista; permisos como `formularios:gestionar`,
`mesas:abrir` y `politicas:gestionar` habilitan acciones concretas. Geovisor y las
preferencias de Configuración solo ofrecen lectura o comportamiento local en esta
versión; no representan escrituras protegidas en API.

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

## Gobernanza de Fases DNP, Gating de Módulos y Recálculo Dinámico de Progreso (AUD-05)

### 1. Correspondencia Módulos ↔ Ciclo de Fases DNP

El ciclo de planeación participativa de la Política Pública de Seguridad Humana de Cartagena de Indias articula tres fases canónicas con módulos específicos de la plataforma:

| Fase DNP | Código | Módulos Gobernados | Entidades y Datos de Respaldo |
| --- | --- | --- | --- |
| **Fase 1: Alistamiento y Diagnóstico Participativo** | `FASE_1_DIAGNOSTICO` | `/plataforma/mesas`, `/plataforma/geovisor`, aportes ciudadanos multicanal | `mesas_trabajo.mesas`, `participacion_ciudadana.propuestas_ciudadanas`, `geodatos.territorios` |
| **Fase 2: Formulación Estratégica (MGA)** | `FASE_2_FORMULACION` | `/plataforma/alternativas` (Banco MGA y Costeo Presupuestal) | `motor_politicas.lineas_estrategicas`, `presupuesto.asignaciones_presupuestales` |
| **Fase 3: Plan de Acción e Inversión (PAS)** | `FASE_3_PLAN_ACCION` | `/plataforma/seguimiento` (Compromisos PAS, Cadena de Valor SINERGIA, Rendición Cuentas C-150) | `seguimiento.compromisos_pas`, `indicadores.fichas_tecnicas_indicadores`, `indicadores.mediciones_indicador` |

### 2. Reglas de Gating y Control de Acceso por Estado de Fase

El conmutador de fases DNP no es solo declarativo; gobierna de manera efectiva los permisos y la presentación en interfaz:

- **Etapa `preparatoria` (o no `activa`)**:
  - **Frontend**: Los módulos Alternativas (`/plataforma/alternativas`) y Seguimiento (`/plataforma/seguimiento`) despliegan un banner institucional en alerta (`AlertTriangle`), notificando que la fase se encuentra en alistamiento institucional y opera en **Modo Consulta / Solo Lectura** para usuarios no administradores.
  - **Permisos de Escritura**: Los botones de creación ("Nueva Alternativa", "Nueva Asignación", "Nuevo Compromiso") y controles de edición se ocultan o bloquean para usuarios que no sean administradores distritales (`autoridad_distrital` o `administrador_identidades`). Los administradores distritales conservan facultades de estructuración técnica previa a la apertura pública.
  - **Backend**: Los endpoints de mutación (`POST /politicas/lineas`, `PUT /politicas/lineas/{id}`, `DELETE /politicas/lineas/{id}`, `POST /presupuesto/asignaciones`, `POST /compromisos`, `PATCH /compromisos/{id}/avance`, `PUT /compromisos/{id}`, `DELETE /compromisos/{id}`) ejecutan `verificar_escritura_fase()`. Si la fase correspondiente no está en estado `activa`, rechazan la solicitud con `HTTP 403 Forbidden` indicando la causal taxativa de etapa preparatoria a cualquier sujeto no administrador.
- **Etapa `activa`**:
  - El módulo correspondiente se abre para todos los usuarios con el permiso operativo (`alternativas:gestionar`, `presupuesto:gestionar`, `seguimiento:gestionar`). No se despliega banner restrictivo y la interfaz refleja operatividad plena.
- **Etapas `en_revision`, `cerrada`, `archivada`**:
  - Los módulos pasan a modo congelado de auditoría forense, impidiendo alteraciones posteriores no autorizadas.

### 3. Recálculo Dinámico de Progreso Empírico (`progreso_porcentaje`)

En cumplimiento de los principios de transparencia activa (Ley 1712/14) e integridad forense, se proscribe el uso de porcentajes codificados o desacoplados de la evidencia empírica. `progreso_porcentaje` en `GET /politicas/fases` y `GET /politicas/fases/control` se recalcula en vivo desde la base de datos:

1. **Fase 1 (Diagnóstico Participativo)**:
   $$\text{Progreso} = \frac{\text{Total Mesas con Acta Concertada}}{\text{Total Mesas Distritales Programadas}} \times 100$$
   *(Ejemplo verificado: 42 mesas concertadas sobre 194 programadas = 21.65%)*.
2. **Fase 2 (Formulación Estratégica)**:
   $$\text{Progreso} = \frac{\text{Dimensiones de Seguridad Humana con Líneas Activas}}{7\text{ Dimensiones Canónicas ONU/DNP}} \times 100$$
   *(Ejemplo verificado: 1 dimensión formulada sobre 7 = 14.29%)*.
3. **Fase 3 (Plan de Acción y Seguimiento PAS)**:
   $$\text{Progreso} = \text{Promedio de Cumplimiento Cuatrienal de Compromisos PAS} = \text{AVG}(\text{porcentaje\_cumplimiento})$$
   *(Ejemplo verificado: 10 compromisos en ejecución con promedio de 61.40%)*.

