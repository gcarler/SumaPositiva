# TAREA ACTIVA: [GAP-FIX-05] RESILIENCIA EN FRÍO DE FORMULARIOS, RADICACIÓN DE FUENTES Y PERSISTENCIA DE CONFIGURACIÓN

**Fecha:** 2026-10-09  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Plan de Trabajo Maestro homologado en `bridge/03_dictamen_revision.md` (Fase 5 - Final)  
**Severidad Mitigada:** MEDIA / OPERACIONAL (GAP-06, GAP-07 y GAP-12 erradicados de raíz)  

---

## 🎯 1. Objetivos Técnicos de la Tarea [GAP-FIX-05]

Esta es la **Fase 5 y de Cierre** del Plan Maestro GAP-FIX. Abarca tres componentes esenciales para la robustez operativa de la plataforma:

### 1.1. Resiliencia de Arranque en Frío de Formularios (`GAP-06`)
1. **Archivo Objetivo**: `src/features/formularios/services/formularios-api.ts`.
2. **Diagnóstico**: La función `obtenerFormulario(id: string)` actualmente solo busca en `useFormulariosStore.getState().formularios`. Si un usuario recarga la página, accede directamente a una URL de formulario o abre el panel de analítica sin haber pasado antes por el listado, el store en memoria está vacío y la función arroja inmediatamente `Error("Formulario no encontrado.")`, bloqueando la visualización.
3. **Requerimiento**:
   - Modificar `obtenerFormulario(id: string)` para que:
     a) Busque primero en el store en memoria (`f.id === id || f.idPersistido === id || f.configuracion.slug === id`).
     b) Si no se encuentra, consulte asíncronamente `formulariosRemotos.listar()` e hidrate el store (`useFormulariosStore.setState({ formularios: remotos })`), volviendo a buscar en la lista devuelta.
     c) Si aún no se encuentra, intente resolverlo mediante `formulariosRemotos.publico(id)` como fallback para formularios públicos ciudadanos.
     d) Solo si falla la consulta remota o no se localiza en backend, lance la excepción.
4. **Pruebas**:
   - Actualizar o ampliar `src/features/formularios/services/persistencia-formularios.test.ts` para verificar la hidratación resiliente en frío cuando el store inicial está vacío.

### 1.2. Radicación Directa de Fuentes de Información en UI (`GAP-07`)
1. **Diagnóstico**: El backend en FastAPI ya dispone de `POST /api/v1/fuentes` protegido por `fuentes:gestionar` (implementado en `EDIT-03b`) y `useFuentesStore` ya cuenta con el método `agregarFuente(datos)`. Sin embargo, la interfaz de usuario en `src/features/plataforma/views/fuentes-view.tsx` no ofrece ningún botón para radicar una nueva fuente institucional y el panel `fuente-editor-panel.tsx` asume obligatoriamente un `fuenteId` preexistente.
2. **Requerimientos**:
   - **`src/core/panels/panel-store.ts`**:
     - Actualizar el tipado de `PanelPropsMap["fuente-editor"]` para admitir `{ fuenteId?: string; soloLectura?: boolean }` (hacer `fuenteId` opcional).
   - **`src/features/fuentes/panels/fuente-editor-panel.tsx`**:
     - Adaptar el panel para soportar modo creación (`esCreacion = !fuenteId || !fuente`).
     - En modo creación:
       - Título: "Radicar Fuente de Información".
       - Kicker: "Gestión Institucional de Fuentes".
       - Formulario completo para capturar: entidad solicitada, nombre de la fuente, tipo (`primaria` | `secundaria`), ámbito (`local` | `nacional` | `internacional`), dimensión de seguridad humana ONU (`personal`, `comunitaria`, `ambiental`, `economica`, `alimentaria`, `salud`, `politica`, `crisis`), variables solicitadas (separadas por comas o líneas), número de radicado distrital, fecha de solicitud, fecha límite, y datos del enlace de contacto (nombre, cargo, email, teléfono).
       - Botón de envío "Radicar Fuente Institucional" que invoque `agregarFuente(...)` del store, cierre el panel con `closeTop()` y notifique vía `toast.success`.
   - **`src/features/plataforma/views/fuentes-view.tsx`**:
     - En el `PageHeader`, agregar la acción institucional `action`:
       - Botón `+ Radicar Fuente` (ícono `Plus` o `FilePlus`, variant `default`, con chequeo de permisos `puedeEditar(sesion, "fuentes")`).
       - Al hacer clic, despacha `openPanel("fuente-editor", {})`.
   - **Pruebas**:
     - Actualizar o verificar suites en `src/features/fuentes/services/fuentes-api.test.ts` y `src/features/fuentes/state/fuentes-store.test.ts`.

### 1.3. Persistencia de Parámetros de Configuración de Plataforma (`GAP-12`)
1. **Diagnóstico**: En `src/features/plataforma/views/configuracion-view.tsx`, los parámetros de resumen semanal y coordenadas de referencia del geovisor (`latitud`, `longitud`, `zoom`) se mantienen en simples `useState` volátiles que se reinician en cada recarga del navegador.
2. **Requerimientos**:
   - Crear el store Zustand persistente `src/features/plataforma/state/configuracion-store.ts` utilizando el middleware `persist` de Zustand apuntando a `localStorage` (`"polis-configuracion-parametros"`).
   - El store debe contener:
     - `resumenSemanal: boolean`
     - `geovisorCentro: { latitud: string; longitud: string; zoom: string }`
     - Acciones: `setResumenSemanal(activo: boolean)`, `setGeovisorCentro(coords: Partial<{ latitud: string; longitud: string; zoom: string }>)`.
   - En `src/features/plataforma/views/configuracion-view.tsx`:
     - Conectar el switch de "Resumen semanal" y los campos de latitud, longitud y zoom al store persistente.
     - En la sección del Geovisor, agregar un botón de guardado institucional: "Guardar parámetros de geovisor", con feedback inmediato mediante `toast.success("Parámetros del geovisor actualizados y guardados")`.
   - Crear prueba unitaria en `src/features/plataforma/state/configuracion-store.test.ts` para verificar la reactividad y persistencia del nuevo store.

---

## 🛡️ 2. Quality Gates Obligatorios

Antes de reportar la finalización de la tarea, ejecuta y valida rigurosamente:
1. `bun run check`: Cero errores en UI-Policy, TypeScript estricto (`tsc --noEmit`) y ESLint (`eslint .`).
2. `bun test`: 100% de tests pasando (mínimo los 356 actuales + los nuevos tests de formularios, fuentes y configuración).
3. `bun run build`: Compilación de producción limpia en Next.js (190 rutas generadas).
4. `systemctl restart polis-frontend`: Servicio reiniciado sin caídas.
5. Verificación HTTP en vivo:
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/configuracion` -> 200.
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/fuentes` -> 200.
6. Commit atómico local en la rama `main` sin `git push`:
   - `feat(plataforma): [GAP-FIX-05] resiliencia en frio formularios radicacion de fuentes y persistencia configuracion`
7. Registrar el informe técnico de ejecución en `bridge/02_resultado_agy2.md` y notificar a `agy`.
