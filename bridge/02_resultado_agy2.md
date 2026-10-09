# INFORME PERICIAL DE EJECUCIÓN — TAREA [GAP-FIX-05]
## RESILIENCIA EN FRÍO DE FORMULARIOS, RADICACIÓN DE FUENTES Y PERSISTENCIA DE CONFIGURACIÓN
### CIERRE FINAL DEL PLAN MAESTRO GAP-FIX (FASES 1 A 5 CONCLUIDAS)

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (Fase 5 - Final)  
**Severidad Mitigada:** MEDIA / OPERACIONAL (GAP-06, GAP-07 y GAP-12 erradicados de raíz)  
**Estado de la Entrega:** 100% Ejecutada, Contra-Verificada y Conforme con Quality Gates  

---

## 1. Resumen Ejecutivo de la Intervención [GAP-FIX-05]

En estricto cumplimiento de los términos técnicos de `bridge/01_tarea_activa.md`, `agy2` ha culminado satisfactoriamente la **Fase 5 y última fase del Plan Maestro GAP-FIX**:

1. **Resiliencia de Arranque en Frío de Formularios (`GAP-06`)**: Se blindó la función `obtenerFormulario(id)` en `src/features/formularios/services/formularios-api.ts`. Ya no arroja una excepción inmediata si el almacén Zustand en memoria se encuentra vacío tras una recarga o acceso directo por URL; ahora consulta asíncronamente `formulariosRemotos.listar()`, hidrata el store local de forma reactiva y, en caso de consultas directas ciudadanas, recurre a `formulariosRemotos.publico(slug)` antes de reportar ausencia.
2. **Radicación Directa de Fuentes de Información en UI (`GAP-07`)**: Se cerró la brecha operativa en el módulo de Fuentes de Información (`/plataforma/fuentes`). Se actualizó `PanelPropsMap["fuente-editor"]` en `src/core/panels/panel-store.ts` para admitir `fuenteId?: string`. Se refactorizó `FuenteEditorPanel` (`src/features/fuentes/panels/fuente-editor-panel.tsx`) para soportar creación con captura completa de metadatos institucionales según la Ley 1757 de 2015, e integró el botón `+ Radicar Fuente` en el `PageHeader` de `FuentesView` condicionado a permisos institucionales.
3. **Persistencia de Parámetros de Configuración de Plataforma (`GAP-12`)**: Se creó el store Zustand persistente en `localStorage` (`src/features/plataforma/state/configuracion-store.ts`, clave `"polis-configuracion-parametros"`). Se vincularon el switch de resumen semanal y los parámetros de referencia territorial del geovisor distrital (`latitud`, `longitud`, `zoom`) en `ConfiguracionView` (`src/features/plataforma/views/configuracion-view.tsx`), con botón de guardado institucional y notificación reactiva.

---

## 2. Detalle de Implementación Técnica por Requerimiento

### 2.1. Resiliencia de Arranque en Frío de Formularios (`GAP-06`)
- **Archivo modificado**: `src/features/formularios/services/formularios-api.ts`.
- **Comportamiento implementado**:
  ```ts
  export async function obtenerFormulario(id: string): Promise<Formulario> {
    const store = useFormulariosStore.getState();
    const coincidenciaLocal = store.formularios.find(
      (f) => f.id === id || f.idPersistido === id || f.configuracion.slug === id
    );
    if (coincidenciaLocal) return coincidenciaLocal;

    // Resiliencia en frío: consultar backend e hidratar store
    try {
      const remotos = await formulariosRemotos.listar();
      if (Array.isArray(remotos) && remotos.length > 0) {
        useFormulariosStore.setState({ formularios: remotos });
        const coincidenciaRemota = remotos.find(
          (f) => f.id === id || f.idPersistido === id || f.configuracion.slug === id
        );
        if (coincidenciaRemota) return coincidenciaRemota;
      }
    } catch {
      // Fallback a formulario público
    }

    // Fallback público por slug
    try {
      const publico = await formulariosRemotos.publico(id);
      if (publico) {
        useFormulariosStore.setState((s) => ({
          formularios: s.formularios.some((f) => f.id === publico.id)
            ? s.formularios
            : [...s.formularios, publico],
        }));
        return publico;
      }
    } catch {
      // Excepción definitiva
    }

    throw new Error("Formulario no encontrado.");
  }
  ```
- **Pruebas añadidas**:
  En `src/features/formularios/services/persistencia-formularios.test.ts`:
  - Resolución local inmediata si el store tiene el formulario.
  - Arranque en frío: invocación a `formulariosRemotos.listar()`, hidratación del store y resolución del formulario.
  - Fallback público: resolución mediante `formulariosRemotos.publico(slug)` con inserción en el catálogo local.
  - Manejo de error cuando no existe ni en memoria ni en backend.

### 2.2. Radicación Directa de Fuentes de Información en UI (`GAP-07`)
1. **Tipado de Paneles (`src/core/panels/panel-store.ts`)**:
   - `PanelPropsMap["fuente-editor"]` actualizado de `{ fuenteId: string }` a `{ fuenteId?: string; soloLectura?: boolean }`.
2. **Panel de Edición y Creación (`src/features/fuentes/panels/fuente-editor-panel.tsx`)**:
   - Soporta bi-modalidad: si `!fuenteId`, conmuta a modo `"Radicar Fuente de Información"`.
   - Captura integral de campos para creación:
     - `entidad` (Entidad solicitada) y `nombreFuente` (Dataset o registro oficial).
     - `codigo` (Código oficial editable o auto-generado con prefijo `FTE-`).
     - `tipo` (`primaria` | `secundaria`), `ambito` (`local` | `nacional` | `internacional`), `dimensionSeguridad` (8 dimensiones ONU) y `periodicidad`.
     - `variablesSolicitadas` (convertidas desde textarea multilínea/comas a arreglo estructurado).
     - Términos de radicación: `radicadoSolicitud`, `fechaSolicitud`, `fechaLimiteRespuesta`, `estadoEntrega` (por defecto `por_solicitar`).
     - Contacto institucional: `contactoNombre`, `contactoCargo`, `contactoEmail`, `contactoTelefono`.
     - Observaciones periciales de calidad.
   - En el envío invoca `await agregarFuente(...)` de `useFuentesStore`, despacha `toast.success` y cierra el panel.
3. **Punto de Entrada en Vista Administrativa (`src/features/plataforma/views/fuentes-view.tsx`)**:
   - Integrado botón `+ Radicar Fuente` en el `PageHeader` (con ícono `Plus`, variant `default`, color `bg-ember`), condicionado a `puedeEditar(sesion, "fuentes")`, que abre `openPanel("fuente-editor", {})`.

### 2.3. Persistencia de Parámetros de Configuración de Plataforma (`GAP-12`)
1. **Nuevo Store Zustand Persistente (`src/features/plataforma/state/configuracion-store.ts`)**:
   - Implementado con middleware `persist` y almacenamiento en `localStorage` con la clave `"polis-configuracion-parametros"`.
   - Manejo resiliente de almacenamiento para entornos SSR y pruebas headless (`Storage` fallback).
   - Estado:
     - `resumenSemanal: boolean`
     - `geovisorCentro: { latitud: string; longitud: string; zoom: string }`
   - Acciones:
     - `setResumenSemanal(activo: boolean)`
     - `setGeovisorCentro(coords: Partial<GeovisorCentroConfig>)`
     - `resetearConfiguracion()`
2. **Integración en `ConfiguracionView` (`src/features/plataforma/views/configuracion-view.tsx`)**:
   - Conectado el switch de "Resumen semanal por correo" al store con notificación `toast.success`.
   - Conectados los inputs de `latitud`, `longitud` y `zoom` del Geovisor.
   - Añadido botón institucional: `"Guardar parámetros de geovisor"` con feedback `toast.success("Parámetros del geovisor actualizados y guardados")`.
3. **Prueba Unitaria Dedicada**:
   - Creada suite `src/features/plataforma/state/configuracion-store.test.ts` (4 pruebas unitarias pasando al 100%).

---

## 3. Pruebas Unitarias Automatizadas

- `src/features/formularios/services/persistencia-formularios.test.ts`: **6/6 pass** (+4 tests de arranque en frío y resiliencia).
- `src/features/fuentes/state/fuentes-store.test.ts` y `fuentes-api.test.ts`: **16/16 pass**.
- `src/features/plataforma/state/configuracion-store.test.ts`: **4/4 pass** (nueva suite).
- Cobertura global del proyecto: **364 pass / 0 fail** en 37 suites (+8 pruebas respecto a la Fase 4).

---

## 4. Matriz de Quality Gates Validados

| Quality Gate | Herramienta / Comando | Criterio de Aceptación | Resultado Verificado | Estado |
|---|---|---|---|---|
| **UI Policy & Accesibilidad** | `bun run ui:check` | 0 violaciones de componentes, tokens, capas y a11y | `POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.` | ✅ APROBADO (0 errores) |
| **Tipado Estricto** | `bun run typecheck` (`tsc --noEmit`) | 0 errores en TypeScript estricto | Cero errores en todo el árbol de tipos | ✅ APROBADO (0 errores) |
| **Linting** | `bun run lint` (`eslint .`) | 0 advertencias, 0 errores | Cero violaciones ESLint | ✅ APROBADO (0 errores) |
| **Pruebas Unitarias** | `bun test` | 100% de tests pasando (>= 356) | **364 tests pass, 0 fail** (Ran 364 tests across 37 files) | ✅ APROBADO (100% verde) |
| **Compilación de Producción** | `bun run build` | Generación exitosa de todas las rutas Next.js | **190 rutas generadas** (190/190 estáticas/dinámicas en 11.3s) | ✅ APROBADO (Limpio) |
| **Servicio Frontend Activo** | `systemctl restart polis-frontend` | HTTP 200 en rutas administrativas | `curl .../plataforma/configuracion` -> **200**<br>`curl .../plataforma/fuentes` -> **200** | ✅ APROBADO (HTTP 200) |
| **Commit Atómico Local** | `git commit` | Commit en `main` sin `git push` | `d5ded43 feat(plataforma): [GAP-FIX-05] resiliencia en frio formularios radicacion de fuentes y persistencia configuracion` | ✅ APROBADO (Local) |

---

## 5. Balance Integral del Plan Maestro GAP-FIX (Fases 1 a 5)

Con la culminación de la Fase 5, se han erradicado el 100% de los hallazgos levantados en la auditoría inicial `AUD-GAP-01`:

- **Fase 1 [GAP-FIX-01]**: Erradicada la suplantación de autenticación (`GAP-01`), conectado el registro en PostgreSQL (`GAP-02`) y formalizada la migración Alembic 0052 para permisos de testimonios.
- **Fase 2 [GAP-FIX-02]**: Habilitada la edición y eliminación de compromisos PAS (`GAP-08`) y la edición de líneas estratégicas de política (`GAP-09`) con auditoría forense inmutable SHA-256.
- **Fase 3 [GAP-FIX-03]**: Erradicados todos los botones inertes con `toast.info` en el menú institucional (`GAP-03`), resuelta dinámicamente la vinculación de mesas en papelógrafo MGA (`GAP-10`) y robustecida la navegación a módulos de plataforma.
- **Fase 4 [GAP-FIX-04]**: Habilitado el CRUD completo de Fichas de Indicadores DNP SINERGIA (`GAP-04`) con salvaguarda metodológica de inmutabilidad, y conectadas las mutaciones y conversión a objetivos del Árbol MGA en PostgreSQL (`GAP-05`).
- **Fase 5 [GAP-FIX-05]**: Blindada la resiliencia en frío de formularios (`GAP-06`), habilitada la radicación directa de fuentes institucionales en UI (`GAP-07`) y asegurada la persistencia local de parámetros de configuración (`GAP-12`).

El sistema POLIS queda en un estado pericialmente robusto, 100% libre de fallbacks ficticios o bloqueos operacionales en frontend. Queda a disposición del Auditor Forense `agy` para el dictamen final de cierre del plan maestro.
