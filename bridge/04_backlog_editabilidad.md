# Backlog de Editabilidad y Configurabilidad — Plataforma POLIS

**Plataforma POLIS — Política Pública de Seguridad y Convivencia Ciudadana de Cartagena de Indias (2026–2036)**  
**Fecha de emisión**: Octubre 2026  
**Clasificación**: Planificación de Producto y Arquitectura de Software (AUD-18)  
**Referencia**: Dictamen EAF AUD-17 / Tarea AUD-18

---

## 1. Principios de Editabilidad y Gobernanza de Datos

En la plataforma POLIS, el principio rector de diseño establece que **la configurabilidad debe equilibrarse estrictamente con la seguridad jurídica, la integridad metodológica y la fe pública institucional**:

1. **Entidades plenamente editables y configurables**: Diseñadas para la gestión operativa continua de facilitadores y autoridades distritales (líneas estratégicas, compromisos PAS, avances cuatrienales, actores estratégicos, mediciones de indicadores, asignaciones presupuestales).
2. **Entidades normativamente protegidas (Sólo Lectura por diseño)**: Aquellas que emanan de marcos constitucionales o metodológicos internacionales cerrados (las 7 dimensiones de Seguridad Humana ONU Res. 66/290, el catálogo legal de fuentes de financiación de la Ley 819/2003 y las fórmulas canónicas de los 8 indicadores SINERGIA DNP). No son editables libremente desde la UI para prevenir la desnaturalización técnica de la política pública.
3. **Huecos técnicos identificados (Backlog)**: Capacidades operativas donde la interfaz gráfica ofrece controles de edición pero la persistencia es local/efímera en memoria Zustand, o donde falta un endpoint backend REST para completar el ciclo de persistencia en PostgreSQL.

---

## 2. Matriz Resumen de Editabilidad por Capacidad

| # | Capacidad / Entidad | ¿Editable desde UI? | Persistencia Backend | Rol Autorizado | Estado Arquitectónico |
|:---:|:---|:---:|:---:|:---|:---:|
| **1** | **Activar / Apagar Fases DNP** | **SÍ** | PostgreSQL (`motor_politicas.fases_politica`) | `autoridad_distrital` (`politicas:gestionar`) | **Completo y Conforme** |
| **2** | **Mesas de Trabajo** | **PARCIAL** | Solo Creación en PostgreSQL; Edición en Zustand | `facilitador_mesa`, `autoridad_distrital` | **Hueco Backend (EDIT-01)** |
| **3** | **Agendas de Mesas** | **NO** | Código estático (`agenda.data.ts`) | Solo Lectura | **Hueco Arquitectura (EDIT-02)** |
| **4** | **Líneas Estratégicas** | **SÍ** | PostgreSQL (`motor_politicas.lineas_estrategicas`) | `autoridad_distrital` (`politicas:gestionar`) | **Completo y Conforme** |
| **5** | **Ejes / Dimensiones ONU** | **NO** | Solo Lectura (`dimensiones_seguridad_humana`) | Solo Lectura | **Protegido por Metodología ONU** |
| **6** | **Actores Estratégicos** | **SÍ** | PostgreSQL (`participacion.actores_estrategicos`) | `autoridad_distrital`, `facilitador_mesa` | **Completo y Conforme** |
| **7** | **Mediciones de Indicadores** | **SÍ** | PostgreSQL (`indicadores.mediciones`) | `autoridad_distrital` (`indicadores:gestionar`) | **Completo y Conforme** |
| **8** | **Fichas de Indicadores** | **NO** | Solo Lectura (`indicadores.fichas_tecnicas`) | Solo Lectura | **Protegido por Metodología DNP** |
| **9** | **Compromisos PAS** | **SÍ** | PostgreSQL (`seguimiento.compromisos_pas`) | `autoridad_distrital` (`compromisos:gestionar`) | **Completo y Conforme** |
| **10**| **Fuentes de Financiación** | **PARCIAL** | Catálogo Solo Lectura; Asignaciones en PostgreSQL | `autoridad_distrital` (`presupuesto:gestionar`) | **Protegido por Ley 819/03** |
| **11**| **Fuentes de Información** | **PARCIAL** | Edición en UI; Persistencia sólo en Zustand | `autoridad_distrital` (`fuentes:gestionar`) | **Hueco Backend (EDIT-03)** |
| **12**| **Noticias y Testimonios** | **EN CURSO** | PostgreSQL (`comunicacion.noticias` / `testimonios`) | `autoridad_distrital`, `facilitador_mesa` | **En desarrollo por Codex (EDIT-05)** |

---

## 3. Backlog de Tareas Propuestas

A continuación se formalizan los huecos de editabilidad identificados, priorizados según su impacto en la operación distrital:

---

### Tarea EDIT-01: Persistencia Backend para Edición de Metadatos de Mesas de Trabajo
- **Prioridad**: **ALTA**
- **Clasificación**: Backend API & Frontend Data Binding
- **Diagnóstico del Hueco**:
  - En [`src/features/mesas/panels/mesa-editor-panel.tsx:291-302`](file:///root/polis/src/features/mesas/panels/mesa-editor-panel.tsx#L291-L302), cuando el usuario edita una mesa existente (`esEdicion === true`), el formulario invoca `actualizarMesa(...)` en el store Zustand del cliente.
  - La mutación actualiza la vista durante la sesión activa, pero no se transmite a la base de datos PostgreSQL porque **no existe un endpoint REST `PATCH` o `PUT` en `backend/app/modules/mesas/router.py`**.
  - Al recargar la página (`F5`), la mesa vuelve a sus valores originales de la base de datos.
- **Alcance Propuesto**:
  1. *Backend*:
     - Exponer endpoint `PATCH /api/v1/mesas/{mesa_id}` en `backend/app/modules/mesas/router.py` protegido con dependencia `requerir_permiso("mesas:abrir")`.
     - Definir schema Pydantic `MesaActualizar` con campos opcionales (`nombre`, `lugar`, `fecha`, `horario`, `aforo_esperado`, `entidad_responsable`, `facilitador_principal`).
     - Conectar con `MesaRepository.actualizar_mesa(mesa)` que ya existe implementado en [`backend/app/modules/mesas/repository.py:21`](file:///root/polis/backend/app/modules/mesas/repository.py#L21).
  2. *Frontend*:
     - Añadir función `actualizarMesaRemota(id, datos)` en `src/features/mesas/services/mesas-api.ts`.
     - Integrar la mutación asíncrona en `guardar()` dentro de `mesa-editor-panel.tsx`.
- **Criterios de Aceptación**:
  - Una edición de lugar, fecha o facilitador de una mesa persiste en la tabla `mesas_trabajo.mesas`.
  - La prueba E2E verifica que tras recargar el navegador los datos editados se conservan intactos.

---

### Tarea EDIT-02: Dinamización y Gestión de Cronograma de Agendas de Mesas
- **Prioridad**: **MEDIA**
- **Clasificación**: Modelo de Datos & UI Management
- **Diagnóstico del Hueco**:
  - El cronograma de 36 mesas territoriales, poblacionales y sectoriales reside en una constante estática de TypeScript ([`src/features/mesas/data/agenda.data.ts:50`](file:///root/polis/src/features/mesas/data/agenda.data.ts#L50)).
  - La interfaz no ofrece mecanismos para que los facilitadores puedan reprogramar fechas, actualizar sedes comunitarias o registrar nuevas mesas sectoriales sobrevenidas.
- **Alcance Propuesto**:
  1. *Base de Datos & Backend*:
     - Crear migración Alembic para la tabla `mesas_trabajo.agendas` (o añadir campos de agenda a `mesas_trabajo.mesas`: `tipo_mesa`, `estado_programacion`, `dimensiones_asociadas`, `fecha_programada`, `horario`).
     - Exponer endpoints `GET /api/v1/mesas/agendas`, `POST /api/v1/mesas/agendas`, `PATCH /api/v1/mesas/agendas/{id}`.
  2. *Frontend*:
     - Crear panel de gestión de cronograma `agenda-editor-panel.tsx` en `src/features/mesas/panels/`.
     - Conectar vistas del geovisor y asistencia comunitaria al endpoint dinámico con fallback transparente.
- **Criterios de Aceptación**:
  - Un facilitador o autoridad distrital puede cambiar el estado de una mesa de `programada` a `reprogramada` o `en_curso` desde la UI.

---

### Tarea EDIT-03: Persistencia Backend para Solicitudes Oficiales a Fuentes de Información
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

---

### Tarea EDIT-04: Configuración de Metadatos de Fichas de Indicadores Distritales
- **Prioridad**: **BAJA**
- **Clasificación**: Mejora Funcional de Seguimiento
- **Diagnóstico del Hueco**:
  - Las mediciones históricas y periódicas son 100% editables (`POST /api/v1/indicadores/fichas/{id}/mediciones`).
  - No obstante, los metadatos institucionales de la ficha (nombre de contacto técnico, dependencia distrital de enlace y fecha de actualización programada) no son editables desde la UI.
- **Alcance Propuesto**:
  1. *Backend*:
     - Exponer `PATCH /api/v1/indicadores/fichas/{id}` restringido a `autoridad_distrital`.
     - Salvaguarda: Prohibir expresamente la modificación de la fórmula matemática y la línea base histórica del DNP.
  2. *Frontend*:
     - Añadir sección colapsable "Metadatos institucionales" en `indicador-detalle-panel.tsx`.
- **Criterios de Aceptación**:
  - Se permite actualizar el enlace técnico institucional sin riesgo de alteración de fórmulas oficiales.

---

### Tarea EDIT-05: Integración Editorial y Retiro de Exclusiones de Lint en Noticias y Testimonios (Cierre Codex)
- **Prioridad**: **ALTA** (Bloqueante para el cierre de auditoría final)
- **Clasificación**: Integración de Módulos & Calidad de Código (OBS-19)
- **Diagnóstico del Hueco**:
  - Codex tiene en desarrollo activo la persistencia de noticias institucionales y testimonios comunitarios.
  - Para no interferir en su desarrollo, `eslint.config.mjs` tiene temporalmente excluidas las carpetas `src/features/noticias/**` y `src/features/testimonios/**` (OBS-19).
- **Alcance Propuesto**:
  1. Coordinar con Codex la entrega final de sus archivos.
  2. Retirar la exclusión en `eslint.config.mjs`.
  3. Ejecutar `bun run check` completo garantizando cero errores y cero advertencias.
  4. Certificar los flujos de creación y moderación de contenido en UI.
- **Criterios de Aceptación**:
  - Código editorial integrado en `main`, sin exclusiones en el linter y con quality gates en 100%.

---

### Tarea EDIT-07: Alineación de Rutas y Esquemas en Participación Multicanal
- **Prioridad**: **ALTA** (Corrección de Integración API / Erradicación de HTTP 404)
- **Clasificación**: Frontend Data Integration & API Alignment
- **Diagnóstico del Hueco**:
  - En `src/features/participacion/services/participacion-api.ts`, los métodos de consulta apuntan a rutas inexistentes (`/participacion/web`, `/participacion/mesas`, `/participacion/escenarios`) produciendo 404 Not Found.
  - Los tipos en `models/participacion.ts` y el panel `participacion-multicanal-panel.tsx` están desalineados con los contratos DTO reales de FastAPI (`/participacion/canal-web`, `/participacion/canal-mesas`, `/participacion/escenarios-especiales`).
- **Alcance Propuesto**:
  1. Alinear endpoints en `participacion-api.ts`.
  2. Normalizar modelos y DTOs en `src/features/participacion/models/participacion.ts`.
  3. Adaptar el panel reactivo `participacion-multicanal-panel.tsx` para consumir los datos reales de PostgreSQL.
  4. Suite de pruebas unitarias en `src/features/participacion/services/participacion-api.test.ts`.
- **Criterios de Aceptación**:
  - 0 errores 404 al consultar los canales de participación; renderizado fiel de los 179 aportes y métricas distritales; `bun test` y `bun run check` al 100%.

---

### Tarea EDIT-08: Cableado de Asistencia Pública Directa a PostgreSQL
- **Prioridad**: **ALTA** (Persistencia Real de Participación y Quórum)
- **Clasificación**: Fullstack Integration & Civic Registration
- **Diagnóstico del Hueco**:
  - La página pública `/asistencia/[mesaId]` en `src/app/asistencia/[mesaId]/asistencia-cliente.tsx` registra asistentes únicamente en `localStorage` (Zustand `useAsistenciaStore`).
  - El backend cuenta con la tabla `mesas_trabajo.participantes_mesa` y los endpoints `POST/GET /api/v1/mesas/{mesa_id}/participantes` listos para persistir.
- **Alcance Propuesto**:
  1. Implementar `src/features/mesas/services/asistencia-api.ts` con `registrarAsistenteMesa` y `listarAsistentesMesa`.
  2. Cablear `asistencia-cliente.tsx` para enviar el POST a la API con fallback offline en `localStorage` ante problemas de red.
  3. Pruebas automatizadas de persistencia y resiliencia offline.
- **Criterios de Aceptación**:
  - Asistencias registradas aterrizan en la tabla `mesas_trabajo.participantes_mesa` en PostgreSQL; quórum legal derivado de la base de datos; gates limpios.

---

### Tarea EDIT-09: Modelo Relacional y Persistencia del Banco de Alternativas MGA
- **Prioridad**: **MEDIA** (Cierre de Ciclo de Vida Metodológico MGA)
- **Clasificación**: Backend Architecture & Fullstack Data Persistence
- **Diagnóstico del Hueco**:
  - El catálogo de 8 iniciativas de solución del Banco de Alternativas MGA opera en memoria en `alternativas-store.ts` (`alternativas-canonicas.data.ts`).
  - No existe modelo ni tabla `banco_alternativas` en PostgreSQL, aunque sus asignaciones presupuestales y enlaces en compromisos PAS sí persisten.
- **Alcance Propuesto**:
  1. Crear modelo `AlternativaSolucion` y migración Alembic `0043_modulo_banco_alternativas.py`.
  2. Sembrar las 8 alternativas canónicas preexistentes de forma trazable.
  3. Exponer módulo backend `/api/v1/alternativas` con operaciones CRUD y RBAC (`alternativas:gestionar`).
  4. Cablear `alternativas-store.ts` y servicio frontend `alternativas-api.ts`.
  5. Pruebas backend (pytest) y frontend (bun test).
- **Criterios de Aceptación**:
  - Alternativas persistidas en PostgreSQL con paridad Alembic (0 diffs), persistencia tras recarga y gates 100% limpios.

