# INFORME PERICIAL DE AUDITORÍA FORENSE — TAREA [AUD-GAP-01]
## AUDITORÍA EXHAUSTIVA DE FUNCIONALIDADES FRONTEND VS BACKEND, ENDPOINTS, SCHEMAS Y CRUDS FALTANTES

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / Investigador EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md`  
**Estado de la Auditoría:** Inspección Forense Concluida al 100% — Matriz de Hallazgos y Plan de Trabajo Consignados para Contra-Auditoría  

---

## 1. Declaración Pericial de Alcance y Metodología

En estricta observancia del requerimiento formulado por el usuario institucional y de las directrices metodológicas de `bridge/01_tarea_activa.md`, `agy2` ha ejecutado un barrido forense exhaustivo e integral sobre:
1. Las 16 vistas y 25 paneles del frontend Next.js 15 (`src/features/`, `src/app/`, `src/core/panels/`).
2. Los 21 módulos y routers de FastAPI (`backend/app/modules/`).
3. El catálogo relacional de PostgreSQL (`bd_csh`, esquemas `autenticacion`, `mga`, `informacion`, `participacion`, `presupuesto`, `sistema`, `evidencia`).
4. Las migraciones históricas de Alembic (`backend/alembic/versions/`).

El análisis se estructuró sobre cinco (5) ejes de investigación, contrastando la experiencia de usuario (UI), el estado en stores reactivos (Zustand/React Query), las firmas de los endpoints HTTP y las restricciones de autorización RBAC (`autenticacion.roles`).

---

## 2. Matriz Consolidada de Brechas y Hallazgos (GAP Matrix)

| ID | Módulo | Archivo(s) Frontend / Línea | Endpoint Backend | Tabla PostgreSQL | Severidad | Estado Actual / Naturaleza de la Brecha |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **GAP-01** | **Usuarios e Identidad** | `src/features/plataforma/views/usuarios-view.tsx` (L32, L60, L98)<br>`src/features/usuarios/panels/usuario-editor-panel.tsx` (L44, L56) | `GET /identidad/usuarios`<br>`POST /identidad/usuarios`<br>`PATCH /identidad/usuarios/{id}` | `autenticacion.usuarios`<br>`autenticacion.roles` | **CRÍTICA** | **Mock desconectado de la API.** La pantalla principal opera sobre 8 cuentas demo locales en Zustand (`usuariosDemo`), relegando la gestión real a un panel secundario. Las ediciones no persisten en BD. |
| **GAP-02** | **Permisos RBAC** | `src/features/plataforma/models/acceso.ts`<br>FastAPI `Depends(requerir_permiso(...))` | Múltiples routers:<br>`/indicadores`, `/instrumentos`, `/presupuesto`, `/mesas`, `/ia` | `autenticacion.roles` (`codigo = 'administrador_identidades'`) | **CRÍTICA** | **Bloqueos 403 Forbidden.** El rol `administrador_identidades` carece en BD de `indicadores:gestionar`, `instrumentos:gestionar`, `presupuesto:gestionar`, `mesas:abrir`, `mesas:acuerdos`, `asistencia:verificar` e `ia:analizar`. |
| **GAP-03** | **Menú Institucional** | `src/app/_components/sidebar-institucional.tsx` (L167, L199, L269, L275) | N/A (UI inerte) | N/A | **ALTA** | **Acciones inertes con Toasts informativos.** Los botones *"Presupuesto FONSET"*, *"Indicadores DNP"*, *"Actas Inmutables"* y *"Analítica y Métricas"* no navegan ni abren las vistas reales; solo disparan un mensaje `toast.info(...)`. |
| **GAP-04** | **Indicadores DNP** | `src/features/diagnostico/views/diagnostico-view.tsx` (L208-250)<br>`src/features/diagnostico/services/indicadores-api.ts` (L41-82) | `POST /indicadores/fichas`<br>`PATCH /indicadores/fichas/{id}` | `mga.fichas_indicador` | **ALTA** | **CRUD Incompleto en Frontend.** Backend dispone de creación y edición completa de fichas DNP, pero el frontend solo implementó lectura (`GET`) y registro de mediciones. No hay botones ni formularios de nueva ficha ni edición de metadatos. |
| **GAP-05** | **Árbol MGA** | `src/features/diagnostico/components/arbol-problemas-view.tsx` (L40-100)<br>`src/features/diagnostico/services/mga-api.ts` | `POST /instrumentos/{id}/nodos`<br>`PUT /instrumentos/{id}/nodos/{id}`<br>`DELETE /instrumentos/{id}/nodos/{id}`<br>`POST /convertir-a-objetivos` | `mga.instrumentos`<br>`mga.nodos_instrumento` | **ALTA** | **CRUD Incompleto en Frontend.** En la vista de Diagnóstico, el árbol es de solo lectura. El backend soporta gestión completa de nodos causales y conversión a objetivos que no están expuestos en la interfaz. |
| **GAP-06** | **Formularios** | `src/features/formularios/services/formularios-api.ts` (L15-21)<br>`src/features/formularios/services/formularios-remotos.ts` | `GET /formularios/constructor/{id}` | `participacion.formularios` | **ALTA** | **Desconexión y Fallo en Frío.** `obtenerFormulario(id)` busca exclusivamente en el store local de Zustand. Si se accede por URL directa o tras recarga sin store hidratado, falla con *"Formulario no encontrado"*. No hay fallback a API. |
| **GAP-07** | **Fuentes de Info** | `src/features/plataforma/views/fuentes-view.tsx` (L38-42)<br>`src/features/fuentes/panels/fuente-editor-panel.tsx` (L35-40) | `POST /fuentes` | `informacion.fuentes` | **MEDIA** | **CRUD Incompleto (Sin Creación en UI).** `POST /fuentes` y `crearFuenteRemota()` existen, pero `fuentes-view.tsx` carece de botón "+ Radicar Fuente" en el PageHeader y `fuente-editor-panel` exige obligatoriamente un `fuenteId` existente. |
| **GAP-08** | **Dashboard Plataforma** | `src/features/plataforma/views/dashboard-view.tsx` (L30-51) | `GET /identidad/usuarios`<br>`GET /mesas`<br>`GET /participacion/tablero/consolidado` | Varias | **MEDIA** | **Métricas mockeadas.** El dashboard muestra "Pendiente" en usuarios y textos como *"Datos de demostración de esta sesión"* en lugar de conectar con los endpoints de conteo ya existentes. |
| **GAP-09** | **Aportes Ciudadanos** | `src/features/plataforma/views/contenido-view.tsx` (L390-408) | `POST /aportes/{id}/priorizar`<br>`POST /aportes/{id}/responder`<br>`POST /aportes/{id}/moderar` | `participacion.aportes` | **MEDIA** | **Falta de Consola Administrativa.** Los aportes ciudadanos se listan pasivamente en una pestaña terciaria de Contenido, sin interfaz administrativa para priorizar, responder formalmente o moderar. |
| **GAP-10** | **Papelógrafo MGA** | `src/app/_components/sidebar-institucional.tsx` (L186-193) | `GET /mesas/{id}/submesas` | `mesas.mesas_trabajo` | **MEDIA** | **Hardcoding de IDs Demo.** El acceso rápido abre el panel con `mesaId: "mesa-001"` y `submesaId: "sm-001-1"`. Si no existen en la BD activa, el panel arroja *"Submesa no encontrada"*. |
| **GAP-11** | **Consola Auditoría** | `src/features/auditoria/panels/auditoria-consola-panel.tsx` (L84-88) | `POST /auditoria/respaldos/ejecutar` | `sistema.respaldos` | **MEDIA** | **Enmascaramiento de Errores.** Si el respaldo falla en backend, el bloque catch dispara un `toast.info("Respaldo ejecutado")`, encubriendo fallos reales al auditor forense. |
| **GAP-12** | **Eliminación Mesas/Testimonios** | `backend/app/modules/mesas/router.py`<br>`backend/app/modules/testimonios/router.py` | `DELETE /mesas/{id}` (inexistente)<br>`DELETE /testimonios/{id}` (inexistente) | `mesas.mesas_trabajo`<br>`participacion.testimonios` | **MEDIA** | **Carencia de Endpoints DELETE en Backend.** No existe capacidad de anular o eliminar mesas creadas erróneamente ni purgar testimonios espurios a nivel de API. |
| **GAP-13** | **Configuración** | `src/features/plataforma/views/configuracion-view.tsx` (L42-45, L82) | N/A (Estado de sesión) | N/A | **MEDIA** | **Estado volátil no persistido.** `resumenSemanal`, `latitud`, `longitud` y `zoom` residen en `useState` efímeros que se reinician al recargar la página. |
| **GAP-14** | **Discrepancia Normativa** | `src/features/plataforma/views/configuracion-view.tsx` (L253)<br>`src/features/plataforma/views/actores-view.tsx` (L64)<br>`src/features/plataforma/views/fuentes-view.tsx` (L39)<br>`src/features/mesas/views/mesas-view.tsx` (L146)<br>`src/features/formularios/components/timbrado-competencia-legal.tsx` | N/A | N/A | **MEDIA** | **Mención anacrónica erradicada.** Subsisten menciones residuales de "Decreto 037 de 2026" en textos institucionales, contrariando la directriz de saneamiento jurídico fijada en [QA-FIX-02]. |

---

## 3. Análisis Técnico Pormenorizado por Módulo

### 3.1. Módulo de Identidad y Usuarios (`/plataforma/usuarios`)
- **Evidencia Técnica:**  
  En `src/features/plataforma/views/usuarios-view.tsx`:
  ```tsx
  // Línea 32: Consume store local en memoria
  const usuarios = useUsuariosStore((state) => state.usuarios);
  // Línea 60: Aviso explícito al usuario
  <Notice tone="info" title="Vista de demostración">
    Estos ocho perfiles y las acciones de esta pantalla son datos locales de ejemplo. 
    La gestión institucional conectada a la API está disponible en el panel de usuarios.
  </Notice>
  // Línea 98: Conduce a un panel secundario
  <Button variant="outline" onClick={() => openPanel("usuarios", {})}>
    Abrir administración institucional
  </Button>
  ```
  En `src/features/usuarios/panels/usuario-editor-panel.tsx`:
  ```tsx
  // Línea 56: Guarda en memoria
  guardar({ nombre: nombre.trim(), correo: correo.trim(), rol, activo, modulos }, usuarioId);
  toast.success(mode === "invite" ? "Invitación enviada" : "Usuario actualizado");
  // Subtítulo del panel:
  subtitle="Define el rol y los módulos disponibles para esta cuenta. Los cambios de esta vista son demostrativos."
  ```
- **Contraste con Backend:**  
  El archivo `src/features/sesion/services/identidad-api.ts` cuenta con métodos completos tipados con Zod: `usuarios()`, `crearUsuario()`, `editarUsuario()`, `revocarUsuario()`, `roles()`, `permisos()` y `eventos()`. Todos conectan con `backend/app/modules/identidad/router.py` y persisten en `autenticacion.usuarios`. La pantalla principal debe nutrirse de `identidadApi` y permitir la gestión real directamente.

---

### 3.2. Brecha de Permisos RBAC en Base de Datos (`autenticacion.roles`)
- **Evidencia Técnica:**  
  Consulta pericial ejecutada sobre `autenticacion.roles` en `bd_csh`:
  ```sql
  SELECT codigo, permisos FROM autenticacion.roles WHERE codigo = 'administrador_identidades';
  ```
  **Resultado comprobado:**
  `["alternativas:gestionar", "alternativas:leer", "auditoria:leer", "comunicaciones:gestionar", "comunicaciones:leer", "contenido:leer", "formularios:gestionar", "formularios:leer", "fuentes:gestionar", "fuentes:leer", "identidad:auditar", "politicas:gestionar", "roles:gestionar", "seguimiento:gestionar", "seguimiento:leer", "testimonios:moderar", "usuarios:gestionar", "usuarios:leer"]`
- **Contraste con FastAPI:**  
  Los endpoints de los módulos exigen:
  - `POST /api/v1/indicadores/fichas` -> `Depends(requerir_permiso("indicadores:gestionar"))`
  - `POST /api/v1/instrumentos` -> `Depends(requerir_permiso("instrumentos:gestionar"))`
  - `POST /api/v1/presupuesto/asignaciones` -> `Depends(requerir_permiso("presupuesto:gestionar"))`
  - `POST /api/v1/mesas` -> `Depends(requerir_permiso("mesas:abrir"))`
  - `POST /api/v1/mesas/{id}/asistentes` -> `Depends(requerir_permiso("asistencia:verificar"))`
  - `POST /api/v1/ia/diagnostico` -> `Depends(requerir_permiso("ia:analizar"))`
- **Impacto:** Si un administrador institucional intenta operar estos módulos desde la interfaz, FastAPI rechaza la petición con `HTTP 403 Forbidden` (`detail: "Permiso insuficiente"`).

---

### 3.3. Enlaces Inertes y Toasts en `sidebar-institucional.tsx`
- **Evidencia Técnica:**  
  En `src/app/_components/sidebar-institucional.tsx`:
  ```tsx
  // Líneas 164-168: Analítica de formularios inerte
  {
    id: "forms_analitica",
    label: "Analítica y Métricas",
    icon: BarChart3,
    onClick: () => toast.info("Analítica global", { description: "Selecciona un formulario de la lista para ver su analítica." }),
  }
  // Líneas 196-200: Actas inmutables inertes
  {
    id: "mesas_actas",
    label: "Actas Inmutables (C-150)",
    icon: ShieldCheck,
    onClick: () => toast.info("Actas Comunitarias", { description: "Sellado pericial SHA-256 e inmutabilidad garantizada." }),
  }
  // Líneas 266-270: Presupuesto inerte
  {
    id: "presupuesto",
    label: "Presupuesto FONSET",
    icon: Landmark,
    onClick: () => toast.info("Presupuesto FONSET / SGP", { description: "Fuentes de financiación y vigencias futuras (Ley 1483/11)." }),
  }
  // Líneas 272-276: Indicadores inertes
  {
    id: "indicadores",
    label: "Indicadores DNP",
    icon: LineChart,
    onClick: () => toast.info("Indicadores DNP SINERGIA", { description: "Cadena de valor: Insumo → Producto → Resultado." }),
  }
  ```
- **Solución Requerida:**  
  - Presupuesto debe navegar a `/plataforma/alternativas` (conmutando a la vista `costeo_presupuesto`).
  - Indicadores debe navegar a `/plataforma/diagnostico` (pestaña `linea_base`).
  - Actas Inmutables debe navegar a `/plataforma/mesas?ver=actas` o abrir el panel selector de actas.
  - Analítica de Formularios debe abrir el panel `formularios-analitica` o navegar a `/plataforma/formularios`.

---

### 3.4. Indicadores DNP / Línea Base (`src/features/diagnostico/`)
- **Evidencia Técnica:**  
  En `src/features/diagnostico/views/diagnostico-view.tsx`, la barra de acciones solo contiene:
  ```tsx
  // Línea 210: Botón Actualizar
  <Button variant="outline" size="sm" onClick={cargarDatos}>Actualizar</Button>
  // Línea 224: Menú Exportar (CSV/JSON)
  <DropdownMenu><DropdownMenuTrigger>Exportar</DropdownMenuTrigger></DropdownMenu>
  ```
  En `src/features/diagnostico/components/linea-base-tabla.tsx`, cada fila solo tiene:
  ```tsx
  // Línea 185: Botón para registrar una medición puntual
  <Button variant="outline" size="sm" onClick={() => handleAbrirMedicion(ind)}>Medición</Button>
  ```
  En `src/features/diagnostico/services/indicadores-api.ts`: Solo existen `listarFichasIndicadores()`, `obtenerFichaIndicador()` y `registrarMedicionIndicador()`. No están exportadas las funciones de mutación de ficha (`crearFicha`, `actualizarFicha`).
- **Contraste con Backend:**  
  `backend/app/modules/indicadores/router.py` cuenta con `POST /fichas` (crea ficha con metas anualizadas, dimensiones y fórmula) y `PATCH /fichas/{id}` (modifica metadatos y responsables salvaguardando la serie histórica).

---

### 3.5. Instrumentos y Árbol MGA DNP (`src/features/diagnostico/`)
- **Evidencia Técnica:**  
  En `src/features/diagnostico/components/arbol-problemas-view.tsx`, el componente permite seleccionar un árbol y visualizar sus ramas de causas y efectos.
  Sin embargo:
  - No cuenta con botones de agregar causa, agregar efecto o editar redacción de problemas.
  - No expone el botón para disparar la conversión metodológica MGA DNP (`POST /instrumentos/{id}/convertir-a-objetivos`).
  - `src/features/diagnostico/services/mga-api.ts` solo implementa `obtenerInstrumentos()` y `obtenerArbol()`. No define llamadas para `/instrumentos/{id}/nodos` (creación, edición con If-Match ETag y eliminación).
- **Contraste con Backend:**  
  `backend/app/modules/instrumentos/router.py` cuenta con la suite completa de endpoints para manipular la jerarquía causal y generar el árbol espejo de objetivos y medios conforme a la MGA del DNP.

---

### 3.6. Resiliencia en Servicio de Formularios (`formularios-api.ts`)
- **Evidencia Técnica:**  
  En `src/features/formularios/services/formularios-api.ts`:
  ```ts
  // Líneas 15-21:
  export async function obtenerFormulario(id: string) {
    const form = useFormulariosStore
      .getState()
      .formularios.find((f) => f.id === id);
    if (!form) throw new Error("Formulario no encontrado.");
    return form;
  }
  ```
  Si un usuario entra a responder o editar un formulario mediante URL directa (`/f/[slug]` o panel lateral), y el store en memoria de Zustand no ha ejecutado previamente `listarFormularios()`, la función arroja error síncrono fatal.  
- **Solución Requerida:**  
  Añadir a `formulariosRemotos` la consulta por ID/slug remoto (`GET /formularios/constructor/{id}`) y consumirla en `obtenerFormulario` cuando el elemento no esté en el store local.

---

### 3.7. Fuentes de Información (`/plataforma/fuentes`)
- **Evidencia Técnica:**  
  - En `src/features/plataforma/views/fuentes-view.tsx`, el `PageHeader` no define `action`, impidiendo abrir el formulario de radicación de una nueva fuente.
  - En `src/features/fuentes/panels/fuente-editor-panel.tsx`, `props` exige `fuenteId: string`. Si no se suministra, el hook falla. No existe modo `"crear"`.
  - En `src/features/fuentes/services/fuentes-api.ts`: `crearFuenteRemota()` ya está codificada contra `POST /api/v1/fuentes`, lista para ser enlazada a la interfaz.

---

### 3.8. Menciones Residuales de "Decreto 037 de 2026"
- **Evidencia Técnica:**  
  1. `src/features/plataforma/views/configuracion-view.tsx` (L253): `<FormField label="Decreto">{(field) => <Input {...field} value="037 de 2026" readOnly />}</FormField>`
  2. `src/features/plataforma/views/actores-view.tsx` (L64): `eyebrow="Gobernanza participativa · Decreto 037/26"`
  3. `src/features/plataforma/views/fuentes-view.tsx` (L39): `eyebrow="Gestión interna · Decreto 037/26"`
  4. `src/features/mesas/views/mesas-view.tsx` (L146): `(Decreto Distrital 037/2026)`
  5. `src/features/seguimiento/components/cadena-valor-tab.tsx` (L247): `Decreto Distrital 037/2026`
  6. `src/features/formularios/components/timbrado-competencia-legal.tsx` (L53, 69, 88, 105, 122, etc.): `Decreto 037 de 2026 del Ministerio del Interior`
- **Fundamento Pericial:**  
  Tal como se determinó en la resolución de [QA-FIX-02], esta norma es anacrónica/inexistente. Toda referencia debe ser sustituida por el marco institucional verídico: *Ley Estatutaria 1757 de 2015, Sentencia C-150 de 2015 y Plan de Desarrollo Distrital Cartagena 2024–2027*.

---

## 4. Propuesta del Plan de Trabajo Estructurado en Fases

Para una ejecución segura, atómica y sujeta a estricta contra-auditoría pericial, se propone desglosar la subsanación en cinco (5) órdenes de trabajo consecutivas:

```
[AUD-GAP-01] Auditoría Forense y Matriz (ESTA TAREA)
       │
       ▼
[GAP-FIX-01] Desbloqueo RBAC en Base de Datos y Saneamiento Normativo Legal
       │
       ▼
[GAP-FIX-02] Conexión Real del Módulo de Usuarios y Roles a la API FastAPI
       │
       ▼
[GAP-FIX-03] Activación de Enlaces Inertes y Navegación Real en Sidebar Institucional
       │
       ▼
[GAP-FIX-04] Habilitación de CRUDs Faltantes: Fichas Indicadores DNP y Árbol MGA
       │
       ▼
[GAP-FIX-05] Resiliencia de Formularios en Frío, Radicación de Fuentes y Persistencia
```

---

### Detalle de las Fases de Implementación Propuestas:

#### 🟢 Fase 1: `[GAP-FIX-01]` Desbloqueo RBAC en Base de Datos y Saneamiento Normativo
- **Objetivo:** Eliminar la causa raíz de los errores 403 Forbidden y sanear el marco legal.
- **Acciones:**
  1. Crear y aplicar migración Alembic `0054_permisos_plenos_administrador.py`:
     - Otorgar al rol `administrador_identidades` los permisos: `indicadores:gestionar`, `instrumentos:gestionar`, `presupuesto:gestionar`, `mesas:abrir`, `mesas:acuerdos`, `mesas:fotos:subir`, `asistencia:verificar` e `ia:analizar`.
  2. Erradicar de forma sistemática y definitiva las menciones residuales a "Decreto 037 de 2026" en `configuracion-view.tsx`, `actores-view.tsx`, `fuentes-view.tsx`, `mesas-view.tsx`, `cadena-valor-tab.tsx` y `timbrado-competencia-legal.tsx`.
- **Quality Gates:** `pytest backend/tests`, `bun run check`, `psql` verificación de JSONB de roles.

#### 🟢 Fase 2: `[GAP-FIX-02]` Conexión Real de Gestión de Usuarios (`/plataforma/usuarios`)
- **Objetivo:** Erradicar los mocks locales de usuarios y conectar la plataforma con la base de datos real.
- **Acciones:**
  1. En `src/features/plataforma/views/usuarios-view.tsx`:
     - Reemplazar el consumo de `useUsuariosStore.usuarios` por `useQuery` apuntando a `identidadApi.usuarios()`.
     - Implementar paginación y búsqueda remota en tiempo real con debounce.
     - Erradicar el banner de "Vista de demostración" y los conteos locales simulados.
  2. En `src/features/usuarios/panels/usuario-editor-panel.tsx`:
     - Conectar `submit()` con `identidadApi.crearUsuario()` y `identidadApi.editarUsuario()`.
     - Invalidar consultas de React Query y notificar con `toast.success`.
  3. En `src/features/plataforma/views/dashboard-view.tsx`:
     - Conectar la tarjeta "Usuarios registrados" con el conteo real retornado por `identidadApi.usuarios()`.
- **Quality Gates:** `bun run check`, `bun test`, verificación de creación de usuario en PostgreSQL `autenticacion.usuarios`.

#### 🟢 Fase 3: `[GAP-FIX-03]` Activación de Enlaces Inertes en Menú Institucional
- **Objetivo:** Convertir todos los botones decorativos/placeholders en navegación operativa de plataforma.
- **Acciones:**
  1. En `src/app/_components/sidebar-institucional.tsx`:
     - Reemplazar `toast.info` de "Presupuesto FONSET" por navegación a `/plataforma/alternativas?tab=costeo` o apertura del panel de costeo.
     - Reemplazar `toast.info` de "Indicadores DNP" por navegación a `/plataforma/diagnostico`.
     - Reemplazar `toast.info` de "Actas Inmutables (C-150)" por navegación a `/plataforma/mesas?ver=acta` (aprovechando el deep-linking de [QA-FIX-02]).
     - Reemplazar `toast.info` de "Analítica y Métricas" por apertura del panel de analítica o navegación a `/plataforma/formularios`.
     - Desacoplar los IDs estáticos (`mesa-001`) en "Papelógrafo MGA", navegando al directorio de mesas con selector.
- **Quality Gates:** `bun run check`, `bun run build`.

#### 🟢 Fase 4: `[GAP-FIX-04]` Habilitación de CRUDs de Indicadores DNP y Árbol MGA
- **Objetivo:** Dotar a las vistas estratégicas de Diagnóstico de capacidades de creación, edición y mutación.
- **Acciones:**
  1. En `src/features/diagnostico/services/indicadores-api.ts`:
     - Implementar y exportar `crearFichaIndicador()` y `actualizarFichaIndicador()`.
  2. En `src/features/diagnostico/views/diagnostico-view.tsx` y `linea-base-tabla.tsx`:
     - Integrar botón "+ Nueva Ficha DNP" en el PageHeader.
     - Crear el panel lateral `ficha-indicador-editor-panel.tsx` para alta y edición de metadatos, metas y periodicidad.
     - Añadir botón "Editar Ficha" en cada fila de la tabla de línea base.
  3. En `src/features/diagnostico/services/mga-api.ts` y `arbol-problemas-view.tsx`:
     - Implementar llamadas de mutación de nodos MGA (`POST/PUT/DELETE /instrumentos/{id}/nodos`).
     - Habilitar botón y acción de "Convertir a Árbol de Objetivos" invocando `POST /convertir-a-objetivos`.
- **Quality Gates:** `bun run check`, `bun test`, validación de persistencia en `mga.fichas_indicador` y `mga.nodos_instrumento`.

#### 🟢 Fase 5: `[GAP-FIX-05]` Resiliencia de Formularios, Creación de Fuentes y Persistencia
- **Objetivo:** Asegurar disponibilidad en frío y completar acciones faltantes en fuentes y configuración.
- **Acciones:**
  1. En `src/features/formularios/services/formularios-remotos.ts` y `formularios-api.ts`:
     - Implementar `obtenerPorIdRemoto(id)` en `formulariosRemotos`.
     - Modificar `obtenerFormulario(id)` para consultar al backend cuando el formulario no resida en Zustand.
  2. En `src/features/plataforma/views/fuentes-view.tsx` y `fuente-editor-panel.tsx`:
     - Agregar botón "+ Radicar Fuente de Información" en PageHeader.
     - Adaptar `fuente-editor-panel.tsx` para operar en modo `crear` cuando `!fuenteId`, invocando `crearFuenteRemota()`.
  3. En `src/features/plataforma/views/configuracion-view.tsx`:
     - Persistir `resumenSemanal`, `latitud`, `longitud` y `zoom` en `localStorage` o tabla de preferencias institucionales.
- **Quality Gates:** `bun run check`, `bun run build`, reinicio de `polis-frontend`.

---

## 5. Conclusión y Solicitud de Contra-Auditoría

El presente informe técnico protocoliza de forma metódica, transparente y verificable todas las anomalías y brechas existentes en la integración frontend-backend de POLIS.

Quedo a la espera del dictamen de contra-auditoría por parte del Coordinador General `agy` para dar inicio inmediato a la ejecución de la **Fase 1: `[GAP-FIX-01]`**.
