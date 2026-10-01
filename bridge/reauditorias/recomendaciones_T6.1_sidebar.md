# Revisión pericial estática de `deploy/` y recomendaciones de arquitectura T6.1

**Fecha:** 2026-10-01  
**Alcance:** artefactos versionados bajo `deploy/` y arquitectura frontend/permisos relevante para T6.1 — Sidebar Institucional y Navegación PBAC.  
**Modalidad:** inspección estática de solo lectura.  
**Resultado:** recomendaciones de diseño; no es dictamen de puesta en producción ni certificación de T6.1.

## 1. Resumen ejecutivo

Se confirma que el repositorio contiene dos unidades systemd y una configuración Nginx. En las unidades, ambos procesos se declaran ejecutados como `root`; la configuración Nginx enruta HTTP por el puerto 80 hacia servicios de loopback. Los archivos documentan configuración prevista, pero no acreditan instalación, habilitación, vigencia ni operación en ningún host.

Para T6.1, la base reutilizable ya existe: `src/shared/ui/sidebar.tsx`, el `Topbar`, el store de sesión, el store de navegación y el punto único `PanelHost`/`PANEL_REGISTRY`. La integración debe ensamblarse en `app`, conservar la biblioteca compartida y el contrato de paneles, y no ampliar `shared` con lógica de negocio.

Hay una condición previa de arquitectura y autorización: la sesión frontend actual modela participación ciudadana/anónima y no contiene rol institucional ni permisos; además, el plan y catálogo piden ocho módulos sin enumerar un catálogo definitivo ni la matriz de acceso de cada uno. La matriz API existente diferencia los permisos de `autoridad_distrital`, `facilitador_mesa` y `auditor_forense`. Por tanto, el menú debe derivarse de capacidades/permisos aprobados, no de una lista uniforme por rol. La visibilidad es una ayuda de navegación, nunca una barrera de seguridad.

## 2. Alcance y límites de evidencia

Se revisaron los tres archivos declarativos:

- `deploy/systemd/polis-backend.service`
- `deploy/systemd/polis-frontend.service`
- `deploy/nginx/polis.conf`

Para T6.1 se contrastaron `docs/plan-trabajo.md`, `bridge/01_tarea_activa.md`, `bridge/catalogo_tareas.json`, `docs/arquitectura.md`, `docs/permisos-api.md`, `docs/kit-ui-rules.md`, `docs/design-system.md`, los componentes/store de navegación y sesión, el host/registro de paneles, dependencias de identidad y migraciones de permisos.

No se accedió a `/etc/systemd`, a un servidor, a PostgreSQL ni a una instalación activa. No se ejecutaron servicios, solicitudes HTTP, builds, pruebas, comandos de despliegue o validadores. Tampoco se modificó código ni configuración. La mención de archivos ausentes en una auditoría anterior corresponde a su snapshot y no contradice que hoy estén versionados; este informe no reemite ni actualiza el dictamen T5.4.

## 3. Revisión estática de artefactos de despliegue

### 3.1 systemd

**Backend (`polis-backend.service`)**

- Ejecuta Uvicorn con dos workers en `127.0.0.1:8000`, desde `/root/polis/backend`, usando `.venv` y `/root/polis/backend/.env`.
- Declara `User=root` y `Group=root`. Esto da al proceso de aplicación privilegios de superusuario en el host: si el proceso o una dependencia se compromete, el impacto potencial es mayor que con una cuenta de servicio confinada.
- Tiene `Restart=always`, pero no expresa política de espera/reintentos, límites de recursos o descriptores, política de parada, `umask` ni directivas de aislamiento/hardening (`NoNewPrivileges`, protección de sistema de archivos, capacidades, etc.). Su omisión en este archivo no prueba que no haya controles externos del host.
- `After=network.target` expresa orden de unidades; no prueba disponibilidad de la base de datos ni readiness del backend al arrancar.

**Frontend (`polis-frontend.service`)**

- Ejecuta `node server.js` desde `/root/polis/.next/standalone`, en `127.0.0.1:3000`, con `NODE_ENV=production`.
- También declara `User=root` y `Group=root`, `Restart=always` y no explicita hardening, límites, política de reinicio/espera ni gestión de parada.
- `After=network.target polis-backend.service` ordena el inicio respecto del backend; no espera ni comprueba que su API esté lista. El frontend puede necesitar reintentos de dependencias de aplicación, no solo orden de arranque.

**Recomendaciones operativas:** definir una cuenta de servicio no privilegiada con permisos mínimos sobre el checkout/artefacto y el archivo de entorno; revisar permisos/propietario de secretos sin imprimir sus valores; agregar controles systemd de aislamiento, límites y cierre/reinicio conforme al entorno; y documentar una comprobación explícita de readiness/dependencias. Validar las unidades con el equipo de operaciones y en un entorno controlado antes de activarlas. No cambiar ni recargar servicios como parte de esta revisión.

### 3.2 Nginx

`deploy/nginx/polis.conf` declara un servidor HTTP en `listen 80` con `server_name localhost 127.0.0.1`. Envía `/api/` a `127.0.0.1:8000/api/` y el resto al frontend en `127.0.0.1:3000`.

- Este archivo no muestra terminación TLS, redirección HTTP→HTTPS, headers de seguridad, límites de tamaño/solicitud, timeouts, buffering ni límites de tasa. Esto significa que **no están declarados en este artefacto**, no que estén necesariamente ausentes en otra capa de infraestructura.
- No reenvía explícitamente `X-Forwarded-For`, `X-Forwarded-Proto` o `X-Real-IP`. Si la aplicación requiere esos valores, hay que establecerlos y configurar confianza únicamente en el proxy conocido; no aceptar headers de cliente como identidad de origen. Evitar que un cambio en el proxy legitime `X-Forwarded-For` no confiable.
- `Upgrade` y `Connection 'upgrade'` se fijan incondicionalmente en ambas ubicaciones. Revisar si se necesitan WebSockets en cada upstream y aplicar la política condicional adecuada a la configuración real; el patrón actual es innecesario para solicitudes HTTP ordinarias, pero esta lectura no demuestra una vulnerabilidad explotable.
- `server_name localhost 127.0.0.1` aparenta un uso local/de ejemplo. Confirmar dominio y modelo de TLS autorizados antes de considerar este artefacto apto para exposición externa.

**Límite:** la configuración declarada no acredita que Nginx la acepte, que esté instalada o que una petición atraviese esos upstreams. No se probaron rutas, headers ni TLS.

## 4. Evidencia arquitectónica relevante para T6.1

- `src/shared/ui/sidebar.tsx` ya ofrece `SidebarProvider`, `Sidebar`, grupos, menú, botón, trigger y soporte adaptativo. Es un primitivo de presentación, no debe conocer roles, permisos, stores de sesión ni módulos de producto.
- `src/app/_components/topbar.tsx` presenta navegación principal actualmente limitada a `inicio`, `explorar`, `mesas` y `geovisor`, mediante `useNavigationStore`. La página raíz ensambla esas vistas en `src/app/page.tsx`.
- `src/core/navigation/navigation-store.ts` contiene estado de presentación para esa navegación; `core` no debe incorporar imports de `features` o `app` ni convertirse en un catálogo con reglas PBAC.
- `src/features/sesion/state/session-store.ts` persiste el objeto de sesión en `localStorage`. `src/features/sesion/models/sesion.ts` solo tipa modo, identidad ciudadana, token y expiración; no modela rol o permisos institucionales. Los métodos de identidad existentes son de demostración según sus comentarios. No se puede inferir autenticación institucional real desde `sesion !== null`.
- Backend: login emite un JWT con `rol`, `nivel_identidad` y `permisos`; permisos se copian al token al iniciar sesión. La respuesta de login expone rol/nivel, mientras los claims llevan permisos. La matriz documenta que los permisos del JWT son una instantánea y no hay revocación inmediata; cambios pueden requerir un nuevo login.
- `src/app/layout.tsx` monta un único `PanelHost`; `src/app/_components/panel-host.tsx` gestiona pila, foco, teclado, fondo inerte y cierre; `src/app/_composition/panel-registry.tsx` registra paneles de dominio. Estos son los contratos de composición para nuevos contenidos contextuales.
- Reglas vigentes: `app` ensambla; `features/<dominio>` agrupa funcionalidad; `shared` permanece independiente. `docs/kit-ui-rules.md` prescribe tokens semánticos, accesibilidad, 320 px y ambos temas, y establece usar `SidePanel` mediante `PanelShell`/`PanelHost` para paneles de producto. El Sidebar compartido usa su implementación responsive existente; validar ese modo como navegación, sin usar `Sheet` u otro overlay para sustituir los paneles contextuales de producto.

## 5. Recomendaciones de arquitectura para T6.1

### 5.1 Catálogo de navegación y límite de capas

1. Integrar el Sidebar institucional desde `app` (por ejemplo, un componente de composición en `src/app/_components/` y su montaje en la shell de aplicación), junto al shell/navegación existente. No moverlo a `shared` con lógica de dominio ni duplicar el host global.
2. Mantener el catálogo de entradas institucionales tipado y expresado como datos de presentación: identificador, etiqueta, destino/acción, icono y capacidad requerida. Las decisiones de elegibilidad se resuelven con un adaptador/selector de sesión tipado; no escribir condiciones repetidas de nombres de rol dentro del primitivo visual.
3. Evitar que `core/navigation` importe roles, features o servicios. Si se amplía navegación, mantener allí solo el estado/contrato neutral. `app` resuelve identificadores hacia una vista/ruta o hacia una acción contextual; cada feature implementa su pantalla y panel.
4. Preservar navegación pública actual del Topbar. Definir cómo conviven las vistas públicas y el espacio institucional, cómo se marca la selección actual y cómo se conserva el contexto al volver/cerrar paneles. No reemplazar navegación ya existente sin criterio de migración.
5. Si un módulo tiene contenido navegable de larga duración o necesita URL compartible/recarga, preferir una ruta de aplicación; reservar `PanelHost` para lectura/edición contextual. No crear tipos de panel vacíos para módulos futuros. Cuando un módulo efectivamente requiera panel, declararlo en su feature, tiparlo en el contrato del panel y registrarlo en `app/_composition/panel-registry.tsx`.

### 5.2 Resolver antes de implementar la matriz de los ocho accesos

El plan y catálogo describen ocho módulos pero no proporcionan ocho nombres ni una tabla módulo→permiso→rol. La lista de abajo es una **taxonomía de trabajo derivada de E6, no una decisión de producto ni concesión de permisos**; debe validarse con responsables de EDD antes de cerrar el menú:

| Acceso candidato de navegación | Evidencia E6 | Permiso/API identificable hoy | Recomendación de visibilidad inicial |
| --- | --- | --- | --- |
| Formularios y consultas | T6.2 | No hay permiso Forms definido en la matriz actual | Ocultar/pendiente hasta aprobar permiso y contrato. |
| Participación web y analítica | T6.3, canal web | Lecturas de varios recursos son públicas, pero no existe permiso explícito para analítica institucional consolidada | No equiparar lectura pública con acceso a tablero/PII; definir alcance y permiso. |
| Mesas territoriales | T6.3, canal mesas | `mesas:abrir`, `mesas:acuerdos`, `asistencia:verificar` | Mostrar funciones diferenciadas por permiso; asistencia nominal especialmente restringida. |
| Escenarios especiales | T6.3, canal especial | No hay permiso específico registrado | Pendiente de contrato y clasificación de datos. |
| Testimonios y memoria social | T6.4 | No hay permisos de moderación/testimonios registrados | No habilitar curaduría por inferencia de otro rol. |
| Control de fases | T6.5 | No hay permiso de fases en la matriz actual | Reservar hasta definir autorización y API. |
| Administración PBAC/RBAC | T6.5 | No hay permiso de administración de roles en la matriz actual | No exponer gestión a facilitador o auditor por defecto; definir rol/capacidad explícitos. |
| Auditoría e integridad | T6.5 | `auditoria:leer` existe para `auditor_forense` en semilla; la API también incluye una ruta restringida a autoridad/auditor | Separar consulta de auditoría de acciones de gestión; determinar alcance y evidencia antes de añadir pantallas. |

La taxonomía no afirma que las futuras pantallas, endpoints o servicios ya existan; T6.2–T6.5 están planificadas. Si el negocio pretende otra agrupación de ocho elementos, sustituir esta lista antes de desarrollar, conservando el principio de no asignar capacidades implícitamente.

### 5.3 PBAC y perfiles

La navegación debe evaluar **sesión autenticada + permiso/capacidad aplicable + disponibilidad de la función**, no solo una igualdad de rol. Es razonable usar rol institucional para determinar si se presenta la shell institucional; los permisos aprobados determinan las entradas y acciones visibles.

| Perfil | Evidencia de permisos actual | Implicación de UX; no concede más acceso |
| --- | --- | --- |
| `autoridad_distrital` | La matriz `docs/permisos-api.md` asigna gestión de presupuesto e indicadores, instrumentos, IA, mesas, asistencia y ciertos permisos de aportes. | Mostrar solo entradas respaldadas por capacidades confirmadas; no asumir permiso para todos los módulos nuevos. |
| `facilitador_mesa` | La matriz permite instrumentos/IA, abrir mesas/acuerdos y verificar asistencia; no le atribuye las capacidades de presupuesto, indicadores o gestión de aportes de autoridad. | Limitar cada acción a la capacidad indicada y al contrato de recurso que aplique. |
| `auditor_forense` | `auditoria:leer` y `aportes:leer` en semilla; no recibe permisos de gestión institucional según matriz. | Presentar vistas de lectura autorizadas; no ofrecer controles de edición/aprobación/gestión por su condición de auditor. |

**Discrepancia que requiere cierre de arquitectura:** `docs/permisos-api.md` describe para facilitador permisos de mesas y asistencia además de instrumentos/IA; la migración `0005_control_acceso_y_roles.py` siembra parte de esos permisos, y `0019_permisos_gestion.py` añade instrumentos/IA. Para `autoridad_distrital`, la migración inicial y la migración 0019 distribuyen los permisos en distintas versiones. Antes de codificar filtros, reconciliar la matriz documental, semillas/migraciones, tokens emitidos y pruebas HTTP para cada rol. No corregir esta discrepancia desde la UI ni asumir que el JWT de un usuario histórico refleja el catálogo vigente.

El servidor sigue siendo autoridad para cada solicitud. Ocultar un enlace reduce confusión, no protege endpoint, datos, descargas ni acciones; API debe producir 401/403 según su contrato. Tras 401/403, conservar contexto no sensible, explicar acceso denegado y permitir renovar sesión/volver, sin reintentos ciegos ni simular éxito. La expiración o revocación limitada de los claims debe reflejarse como estado de sesión obsoleto.

### 5.4 Contrato de sesión y estado

- Antes de considerar institucional a un usuario, sustituir la inferencia basada en el store demo por estado de autenticación tipado y respaldado por el flujo real. Distinguir sin ambigüedad: hidratación pendiente, sin sesión, ciudadano/participación anónima, identidad autenticada, rol no institucional, rol institucional con permisos y sesión expirada.
- Centralizar la adaptación de datos de identidad/permisos en el módulo de sesión/autenticación. Validar la forma de claims como datos no confiables para presentación; no decodificar ni aceptar un valor local editable como prueba de autorización.
- Decidir y documentar el manejo/almacenamiento de credenciales JWT: el store actual usa persistencia local; tratar el token como secreto, minimizar exposición y evitar mostrarlo, registrarlo o incluirlo en telemetría. La decisión de almacenamiento debe ser coherente con la arquitectura real de autenticación, no resolverse mediante una segunda sesión paralela para T6.1.
- Derivar estado de carga/error del perfil/permisos explícitamente. No renderizar por defecto todos los accesos durante hidratación ni ocultar errores de autenticación bajo un estado vacío. Mostrar fallback accesible al usuario no autenticado y conservar la navegación pública.
- Considerar que los permisos del JWT son snapshot: UI debe tolerar permisos actualizados, expiración y 403 del backend, y comunicar cuándo hace falta renovar autenticación; nunca prometer revocación inmediata que la API no implementa.

### 5.5 Contexto, indicadores y Zero-Modals

- Sidebar ofrece selección/navegación; el clic no debe lanzar un modal centrado ni una secuencia de drawers indiscriminada. Abrir únicamente vistas/paneles ya implementados y autorizados, mediante el `PanelHost` existente.
- Definir “indicadores de estado” antes de mostrar contadores: fuente API, frecuencia/actualización, permiso, alcance territorial, estados vacío/cargando/error y tratamiento de datos sensibles. No fabricar actividad ni presentar mocks como estado persistido.
- No exponer en badges nombres de participantes, contenido de testimonios no publicados, asistencia nominal, cifras sensibles o existencia de recursos restringidos. Los agregados requieren su propio contrato de acceso/privacidad.
- Conservar semántica de regreso, panel apilado y foco: selección accesible, `aria-current`/estado equivalente, foco visible, Tab/Shift+Tab, Escape conforme al host, restauración de foco, fondo inerte y panel superior activo. Evitar doble apertura o perder el contexto al cerrar.
- En móvil, verificar ancho 320 px, área de toque, nombre accesible del trigger, cierre después de navegación y retorno de foco. El Sidebar puede responder como navegación; formularios y contenido contextual siguen el patrón `SidePanel`/`PanelShell`/`PanelHost` prescrito por el kit.

### 5.6 Temas, tokens y accesibilidad

Reutilizar `src/shared/ui/sidebar.tsx`, Button/iconografía ya disponible y tokens semánticos definidos en `src/shared/design-system/tokens.css`; evitar colores literales y clases construidas desde permisos remotos. El significado de estado debe tener texto, no solo color o icono. Mantener contraste, foco visible, movimiento reducido y ambos temas. Los grupos colapsados deben conservar nombres accesibles/tooltip comprensible; no depender de hover para descubrir acciones.

No trasladar la taxonomía, íconos o permisos institucionales a `shared/ui`. Si se necesita un primitivo realmente compartido nuevo, seguir el contrato de inventario e historias del kit; no parece necesario crear otro Sidebar antes de evaluar el ya existente.

## 6. Criterios de aceptación recomendados para concretar T6.1

Antes de implementación, dejar aprobado un anexo con (a) ocho destinos canónicos, (b) para cada entrada el permiso/capacidad y roles efectivos, (c) la ruta/panel/feature responsable, (d) si muestra contador y su fuente/clasificación de datos y (e) conducta ante permiso ausente o expirado. La reconciliación debe cubrir la diferencia observada entre matriz, migraciones y permisos de tokens.

Para el cierre de implementación, pedir evidencia reproducible de estos escenarios:

1. Sin sesión, sesión anónima/ciudadana, sesión no institucional y carga/hidratación: no se revela Sidebar institucional ni entradas restringidas; navegación pública continúa funcionando.
2. Para cada uno de los tres roles, el conjunto visible coincide con la matriz aprobada; un usuario con el mismo rol pero capacidad ausente no ve la función correspondiente.
3. Acceso directo o solicitud al endpoint restringido sin permiso devuelve la denegación del backend; cambiar el estado visual/local del Sidebar no elude el control. Probar asimismo el acceso permitido.
4. Token expirado/permisos desactualizados, backend 401/403, error de red y datos sin autorización tienen estados comprensibles y no filtran contenido ni contadores.
5. Navegación a los ocho destinos aprobados, selección activa, regreso y reapertura de contexto sin conflicto con `Topbar` y `PanelHost`; no se abre overlay de producto fuera del patrón Zero-Modals.
6. Teclado y lector de pantalla básico: nombres de navegación/controles, orden y foco, cambio de destino, cierre móvil y estado actual; revisar claro/oscuro, movimiento reducido y anchos de 320 px y escritorio.
7. Cada estado de contador es verificable contra servicio y autorización; estados vacío, carga y fallo están cubiertos. Datos demo están aislados de persistencia/API.

En implementación frontend, aplicar `polis-ui-build` y `polis-ui-review`, ejecutar `bun run check` (incluye guardas de UI), historias/pruebas afectadas y builds indicados por `AGENTS.md`/kit. Los cambios de autorización requieren además pruebas backend 401/403 y acceso permitido que cubran los contratos; una prueba visual no acredita PBAC. Estas son recomendaciones para una futura implementación; no se ejecutaron en esta inspección.

## 7. Conclusión pericial

Los artefactos `deploy/` ya están presentes en el repositorio, pero las unidades declaran ejecución privilegiada como root y carecen en estos archivos de varias defensas explícitas de hardening. Nginx muestra una ruta HTTP básica a los servicios de loopback, no evidencia suficiente para certificar seguridad o disponibilidad en producción. Se recomienda tratar estos archivos como configuración declarativa pendiente de validación operativa y endurecimiento; no se ha establecido que estén instalados o activos.

T6.1 tiene componentes reutilizables y un ensamblaje de paneles adecuado como punto de partida, pero no está listo para implementar PBAC de manera segura solo con el store de sesión frontend actual. Son condiciones previas: integrar una fuente real y tipada de identidad institucional, reconciliar matriz y permisos efectivos, y acordar los ocho destinos y su mapeo permiso→acción. Con esas decisiones, mantener la política del lado servidor, derivar el menú de capacidades, preservar `PanelHost` y probar estados/roles/responsive según el kit.

**Límites del dictamen:** revisión estática de archivos versionados y contratos fuente; no hubo ejecución, prueba de host, evaluación de TLS, análisis de tráfico, prueba de autorización en vivo ni validación de componentes en navegador. No se emite certificación de despliegue, seguridad global ni cumplimiento WCAG.
