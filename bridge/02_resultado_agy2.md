# INFORME DE ENTREGA: TAREA [TRIADA-FRONTEND-CIERRE-GOOGLE-WORKSPACE-13]
## SINCRONIZACIÓN NATIVA CON GOOGLE WORKSPACE (GOOGLE SHEETS & DOCS) Y CIERRE DOCUMENTAL INTEGRAL DE PLANES DE DESARROLLO Y PLANES DE ACCIÓN

- **Para:** Coordinador General y Auditor Forense EAF (`agy`)
- **De:** Desarrollador Principal Frontend (`agy2`)
- **Fecha:** 15 de octubre de 2026
- **Tarea Reportada:** `[TRIADA-FRONTEND-CIERRE-GOOGLE-WORKSPACE-13]`
- **Referencias:** `bridge/00_plan_cierre_integral_google_workspace_13.md` y `bridge/01_tarea_activa.md`
- **Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`, prohibido `git push`).
- **Aislamiento y Concurrencia:** Estricto respeto al ámbito de `codex`. Cero modificaciones en `backend/**`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`.

---

## 🎯 1. Resumen Ejecutivo de la Misión

Se ejecutó la actualización integral del frontend en `/plataforma/seguimiento` para reflejar el **cierre documental del 100% del catálogo Drive (1.383 / 1.383 documentos)**, la **deduplicación canónica de metas PDD (2.078 brutas → 1.805 únicas deduplicadas)** y la implementación del **Panel de Sincronización Nativa con Google Workspace (`Google Sheets` y `Google Docs`)** enlazado a la carpeta oficial `PSHC` y la subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH`.

Adicionalmente, se potenciaron los filtros y capacidades del **Motor Plan de Acción DNP** en la Hoja 1 para gobernar fluidamente las actividades de las **29 entidades distritales**, con filtros rápidos por **Entidad Responsable**, **Vigencia (2024 / 2025 / 2026)** y **Compromiso PAS (PAS-SEC-01 a PAS-ETN-10)**.

---

## 📊 2. Métricas Canónicas de Cierre Documental Implementadas

| Indicador Documental / Estadístico | Universo Anterior | Universo Consolidado Cierre 13 | Impacto y Evidencia |
|---|---:|---:|---|
| **Metas Totales Brutas PDD 2012–2027** | 2.068 | **2.078** | Extracción OCR formal de Acuerdos Distritales (5 PDD + 3 PDL) |
| **Metas Únicas Deduplicadas** | — | **1.805** | Deduplicación canónica inter-fuente (273 metas consolidadas en PDD 2024–2027) |
| **Metas Duplicadas Consolidadas** | — | **273** | Registros repetidos en tablas programáticas unificados |
| **Libros Excel Ingeridos (Planes de Acción)** | 1.305 | **1.305** | Matrices DNP, formatos monohoja 2016, híbridos 2020 y multihoja 2026 |
| **Informes PDF de Planes de Acción Ingeridos** | 0 | **78** | Informes técnicos y matrices 2018 y 2025 del sector seguridad e inversión |
| **Total Archivos Catálogo Drive PSHC** | 1.305 | **1.383 / 1.383** | **100% de cobertura documental del catálogo oficial** |
| **Entidades Distritales Cubiertas** | 12 | **29** | Todas las secretarías, institutos descentralizados y 3 alcaldías locales |
| **Censo Oficial de Mesas de Trabajo** | 33 | **37** | 15 mesas de corregimientos (`mr-001` a `mr-015`) + 3 terr. + 8 pob. + 11 sec. |
| **Agendas Ciudadanas POLIS** | 36 | **38** | 37 agendas con mesa canónica vinculada + 1 Plenaria de Cierre Distrital |

---

## 🛠️ 3. Modificaciones Técnicas en `src/**`

### 3.1 Cliente y Tipos para Google Workspace (`src/features/seguimiento/services/google-workspace-api.ts`)
- Se creó el módulo de cliente para interactuar con los endpoints del backend:
  - `obtenerEstadoGoogleWorkspace()`: `GET /api/v1/compromisos/triada/google-workspace/estado`
  - `sincronizarGoogleWorkspace()`: `POST /api/v1/compromisos/triada/google-workspace/sincronizar`
- Tipado estricto: `ArchivoNativoWorkspace`, `EstadoGoogleWorkspaceRespuesta`, `SincronizarGoogleWorkspaceRespuesta`, `UltimoResultadoSincronizacion`.
- Estado inicial y fallback local resiliente ante reinicios o desconexión de red, precargado con la cuenta de servicio oficial:
  - Service Account: `polis-pshc@polis-511719.iam.gserviceaccount.com`
  - Carpeta Raíz `PSHC`: `1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6`
  - Subcarpeta Expediente: `1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe` (`00_EXPEDIENTE_OFICIAL_POLIS_CSH`)
  - Archivos nativos detectados: Google Sheets multi-pestaña y Google Docs del informe forense con sus `webViewLink`.

### 3.2 Re-exportación en `src/features/seguimiento/services/compromisos-api.ts`
- Se re-exportaron todas las interfaces y funciones de `google-workspace-api.ts` para interoperabilidad transparente en el módulo de compromisos.

### 3.3 Datos y Tipos en `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`
- Se definió la interfaz `MetricasCierreDocumentalWorkspace` y la constante canónica `METRICAS_CIERRE_DOCUMENTAL_WORKSPACE`.
- Se incorporó el campo `cierre_documental?: MetricasCierreDocumentalWorkspace` en `LaboratorioPrescriptivoPddRespuesta`.
- Se integró `METRICAS_CIERRE_DOCUMENTAL_WORKSPACE` en el retorno de `obtenerLaboratorioPrescriptivoPddLocal()`.

### 3.4 Componente `<GoogleWorkspaceSyncCard />` (`src/features/seguimiento/components/google-workspace-sync-card.tsx`)
- Componente interactivo y accesible (`data-testid="google-workspace-sync-card"`) que presenta:
  - Estado de conexión en vivo con `polis-pshc@polis-511719.iam.gserviceaccount.com`.
  - Botón de sincronización manual `data-testid="btn-sync-google-workspace"` con feedback visual mediante toast (`sonner`) y animación de progreso.
  - Enlaces directos hacia Google Drive: Carpeta Raíz `PSHC` y Subcarpeta `00_EXPEDIENTE_OFICIAL_POLIS_CSH`.
  - 4 tarjetas analíticas de cierre documental: Metas Únicas Deduplicadas (1.805), Libros Excel Ingeridos (1.305), Informes PDF Ingeridos (78), y Censo Territorial de Mesas (37 mesas, 15 corregimientos).
  - Lista de archivos nativos de Google (`Google Sheets` y `Google Docs`) con apertura directa en pestaña nueva y desglose de pestañas/secciones sincronizadas.
  - Soporte de propiedad `puedeEditar` para deshabilitar la acción en modo sólo lectura.

### 3.5 Integración en `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`
- Se añadió en la cabecera superior el botón de acceso rápido `Google Workspace PSHC` (`data-testid="btn-nav-google-workspace"`), que conmuta instantáneamente hacia la sub-pestaña 7.
- Se incorporó `subvistaInicial?: SubvistaPddTipo` en `PddDeaEvaluacionPanelProps` permitiendo deep linking y pruebas unitarias determinísticas de cualquier sub-pestaña.
- Se embebió `<GoogleWorkspaceSyncCard metricas={datosLaboratorio.cierre_documental} puedeEditar={puedeEditar} />` como sección destacada en la Sub-pestaña 7 (**`Laboratorio Prescriptivo & Control Fiscal`**, `data-testid="pdd-tab-laboratorio-prescriptivo"`), inmediatamente arriba del Simulador Inverse DEA.

### 3.6 Filtros Multicriterio del Motor Plan de Acción DNP (`src/features/seguimiento/components/motor-plan-accion-tab.tsx` y `services/plan-accion-dnp-api.ts`)
- Se habilitó en `FiltrosMatrizPlanAccion` y `obtenerMatrizPlanAccionApi` el parámetro `compromiso_pas_codigo` en la query HTTP y en el fallback local.
- En `motor-plan-accion-tab.tsx`:
  - Se extendió el estado `filtros` para incluir `vigencia` y `compromiso_pas_codigo`.
  - Se calculó `entidadesDisponiblesHoja1` con las **29 entidades distritales canónicas** ordenadas alfabéticamente.
  - Se rediseñó la barra de filtros de Hoja 1 con una cuadrícula responsive (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`):
    1. Selector de **Entidad Responsable** (29 Entidades Distritales).
    2. Selector de **Vigencia** (Todas las Vigencias, 2024, 2025, 2026).
    3. Selector de **Compromiso PAS** (Todos los PAS, PAS-SEC-01 a PAS-ETN-10).
    4. Selector de **Línea Estratégica** (LE-01 a LE-06).
    5. Selector de **Tipo Actividad** (Normativa, Administrativa, Gestión, Logística).
    6. Selector de **Fuente de Financiación** (SGP, Regalías, Recursos Propios, Cofinanciación, etc.).
  - Se agregaron botones de acción rápida: **Limpiar** y **Actualizar** con animación de recarga.

### 3.7 Suite de Pruebas Unitarias (`src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`)
- Se expandió la suite de pruebas unitarias de 44 a **48 tests completos** (1.000 `expect()` calls en total, 100% de aprobación):
  - **Test 45:** Verificación de las métricas de cierre documental (1.805 metas únicas deduplicadas, 78 PDFs de planes de acción, 1.305 libros Excel, 1.383 catálogo 100%, 29 entidades, 37 mesas, 15 corregimientos).
  - **Test 46:** Verificación del cliente API de Google Workspace (`obtenerEstadoGoogleWorkspace` y `sincronizarGoogleWorkspace`) con fallback offline robusto, service account `polis-pshc@polis-511719.iam.gserviceaccount.com` y carpetas Drive oficiales.
  - **Test 47:** Verificación de renderizado de `GoogleWorkspaceSyncCard` con `data-testid="google-workspace-sync-card"`, botón `data-testid="btn-sync-google-workspace"`, enlaces a Drive y cifras clave.
  - **Test 48:** Verificación de integración en `PddDeaEvaluacionPanel`, botón de navegación `data-testid="btn-nav-google-workspace"` y renderizado del card en sub-pestaña 7.

---

## 🛡️ 4. Quality Gates y Verificación Técnica

1. **Política de Interfaz de Usuario:**
   ```bash
   node scripts/ui-policy.mjs
   # Output: POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos. (0 violaciones)
   ```

2. **Verificación de Tipos TypeScript:**
   ```bash
   ./node_modules/.bin/tsc --noEmit
   # Output: 0 errores (Clean exit code 0)
   ```

3. **Linter ESLint:**
   ```bash
   ./node_modules/.bin/eslint <archivos tocados>
   # Output: 0 errores y 0 warnings
   ```

4. **Suite de Pruebas Bun Test:**
   ```bash
   bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx
   # Output: 48 pass, 0 fail, 1000 expect() calls [418ms]

   bun test src/features/seguimiento/
   # Output: 177 pass, 0 fail, 2443 expect() calls [819ms]
   ```

5. **Compilación en Producción Next.js 16 (Turbopack):**
   ```bash
   ./node_modules/.bin/next build
   # Output: ✓ Compiled successfully in 4.2s
   #         ✓ Generating static pages using 7 workers (210/210) in 2.1s
   ```

6. **Reinicio de Servicio:**
   ```bash
   systemctl restart polis-frontend.service
   systemctl status polis-frontend.service
   # Output: Active: active (running)
   ```

---

## 📦 5. Registro de Git (Política Zero-Push)

Se confirmaron las modificaciones únicamente en los archivos de `src/**` y la documentación del bridge:
- **Rama:** `main`
- **Mensaje de Commit:** `feat(seguimiento-workspace): panel sincronizacion nativa Google Sheets/Docs PSHC y cierre documental 1383 archivos [TRIADA-FRONTEND-CIERRE-GOOGLE-WORKSPACE-13]`
- **Push:** **OMITIDO (0 pushes)**.
