# TAREA ACTIVA: [AUD-GAP-01] AUDITORÍA EXHAUSTIVA DE FUNCIONALIDADES FRONTEND VS BACKEND, ENDPOINTS, SCHEMAS Y CRUDS FALTANTES

**Fecha de Asignación:** 2026-10-09  
**Asignado a:** `agy2` (Desarrollador / Investigador EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Solicitud Expresa del Usuario:**  
> *"hay cosas que aun no esan siendo funcionales en la paltafomra, y quería pedirte el favor que por favor lo revisaras.... pidele a agy2 que haga una revisión exhaustiva de las funcioalidades que estan en el forntend que no estan en el backen ni en la base de datos, o no tienen endpoints, sp o CRUD. necesito que sea rigurosos y los resutlados los consignes com oun plan de trabajo en el puente para que tu lo adutites, y luego d eque compruebes los errores o poblemas, o bug, los conviertas en un plan de trabajo para AGY2 que le vas a ir auditando"*

---

## 🎯 1. Objetivo Pericial y Alcance de la Tarea

`agy2` debe ejecutar una revisión exhaustiva, metódica y pericial de todo el código de POLIS (`src/features/`, `src/app/`, `backend/app/`, `alembic/` y esquemas de PostgreSQL `bd_csh`) con el objetivo de identificar y categorizar todas las desconexiones, brechas (gaps), elementos mockeados, CRUDs incompletos y botones inertes en la plataforma.

Debe analizar rigurosamente cinco (5) ejes de investigación:

### Eje 1: Funcionalidades Mockeadas o Desconectadas del Backend Real
- Componentes o stores que usan datos fijos/demo en memoria o `localStorage` teniendo tablas y endpoints en el backend.
- *Ejemplo detectado por auditoría:* `src/features/usuarios/state/usuarios-store.ts` mantiene 8 usuarios mock en memoria (`usuariosDemo`), mientras el backend FastAPI dispone de un módulo completo en `backend/app/modules/identidad/` (`GET,POST /api/v1/identidad/usuarios`, `PATCH /usuarios/{id}`, `POST /usuarios/{id}/revocar`) y tabla `autenticacion.usuarios`. En `/plataforma/usuarios` se muestra el mock y la administración real queda relegada a un panel secundario.

### Eje 2: CRUDs Parciales o Incompletos en el Frontend
- Vistas donde solo se implementó lectura (`GET`), pero carecen de botones/paneles de creación (`POST`), edición (`PATCH/PUT`) o eliminación (`DELETE`), aun cuando el backend dispone de los endpoints o la base de datos lo soporta.
- *Ejemplos para inspeccionar:*
  - **Diagnóstico / Línea Base (`src/features/diagnostico/`):** La tabla lista indicadores (`GET /indicadores/fichas`), pero no existe botón ni formulario para registrar nueva ficha (`POST /indicadores/fichas`) o editar ficha (`PATCH /indicadores/fichas/{id}`).
  - **Árbol de Problemas MGA (`arbol-problemas-view.tsx`):** Vista de solo lectura. El backend dispone de endpoints para nodos (`POST /instrumentos/{id}/nodos`, `PUT/DELETE`), pero el usuario no puede modificarlos desde la vista principal de diagnóstico.
  - **Formularios (`formularios-api.ts`):** `obtenerFormulario(id)` lee del store local de Zustand en lugar de consultar `GET /formularios/{id}`, generando desincronización si el store está frío.

### Eje 3: Enlaces Inertes, Placeholders y Acciones con Toasts Informativos
- Botones, menús o accesos directos en el menú institucional (`sidebar-institucional.tsx`), cabeceras o paneles que al hacer clic solo disparan un `toast.info(...)` o `console.log` sin ejecutar acción de negocio ni abrir la vista correspondiente.
- *Ejemplos detectados en `sidebar-institucional.tsx`:*
  - *"Presupuesto FONSET"* -> Dispara `toast.info` en vez de enlazar a `/plataforma/alternativas` (costeo) o panel de fuentes.
  - *"Indicadores DNP"* -> Dispara `toast.info` en vez de enlazar a `/plataforma/diagnostico` o seguimiento de cadena de valor.
  - *"Actas Inmutables (C-150)"* -> Dispara `toast.info`.
  - *"Analítica y Métricas de Formularios"* -> Dispara `toast.info`.

### Eje 4: Brechas de Permisos y Roles en Base de Datos (`autenticacion.roles`)
- Endpoints del backend protegidos con `Depends(requerir_permiso(...))` donde los roles administrativos carecen del permiso en `autenticacion.roles`, causando errores 403 Forbidden silenciosos o bloqueos de UI.
- *Ejemplo detectado:* `administrador_identidades` carece de `indicadores:gestionar`, `instrumentos:gestionar`, `presupuesto:gestionar`, `mesas:abrir`, `mesas:acuerdos` y `asistencia:verificar`.

### Eje 5: Discrepancias Normativas y de Configuración
- Parámetros de configuración en `/plataforma/configuracion` que se almacenan en `useState` efímero y no persisten en base de datos.
- Referencias anacrónicas erradicadas (ej. mención residual de "Decreto 037 de 2026" en `configuracion-view.tsx`).

---

## 📋 2. Formato Requerido del Informe en `bridge/02_resultado_agy2.md`

`agy2` debe estructurar su informe en `bridge/02_resultado_agy2.md` con:

1. **Tabla de Hallazgos y Matriz de Gaps:**
   - ID del Hallazgo (ej. `GAP-01`, `GAP-02`, ...).
   - Módulo afectado (Usuarios, Diagnóstico, Presupuesto, Configuración, etc.).
   - Descripción técnica precisa (archivo frontend, línea, endpoint backend, tabla PostgreSQL).
   - Severidad (Crítica / Alta / Media / Baja).
   - Estado actual (Mock / CRUD Incompleto / Toast Inerte / Permiso 403 / Incoherencia).

2. **Detalle Técnico por Módulo:**
   - Análisis pormenorizado con evidencia de código y comportamiento verificado.

3. **Propuesta del Plan de Trabajo Estructurado en Fases para Auditoría:**
   - Desglose de tareas atómicas de implementación (`GAP-FIX-01`, `GAP-FIX-02`, etc.) priorizadas para que `agy` las contra-audite una a una.

---

## ⚡ 3. Instrucción Operativa para `agy2`

Una vez recibida esta tarea, procede a realizar las inspecciones sobre el repositorio y consigna de inmediato tus resultados en `bridge/02_resultado_agy2.md`.  
Al finalizar la redacción de la bitácora, notifica formalmente a `agy` para iniciar la contra-auditoría pericial.
