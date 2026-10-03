# Entrega agy2 — Fase de Diagnóstico: Hitos D-0 y D-1
Fecha: 2026-10-03T04:16:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commit:
- `3cb3c32` feat(diagnostico): purga pericial de mock y modulo de linea base cuantitativa DNP

---

## 1. Resumen Ejecutivo
Se implementó con rigor pericial la primera etapa de la **Fase de Diagnóstico Situacional y Territorial** de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto Nacional 037 de 2026 y Metodología MGA/DNP), cumpliendo a cabalidad los dos hitos asignados:

1. **Hito D-0 (Calidad, Veracidad y Purga Pericial)**:
   - Depuración total en `src/features/politicas/data/politicas.mock.ts` de cualquier referencia a topónimos, corredores o ejemplos de movilidad ajenos a Cartagena ("Av. Regional", "Calle 44", "Comunas 2, 5, 7, 10", "corredor ferroviario", "calles escolares", etc.).
   - Estructuración de las 4 líneas estratégicas y aportes ciudadanos 100% articulados a las problemáticas reales del Distrito de Cartagena de Indias:
     - **LE-01**: Prevención de ESCNNA y Protección Integral de Niñez en Entornos Turísticos y Escolares (Centro Histórico, Bocagrande, La Bodeguita, Playa Blanca, La Boquilla).
     - **LE-02**: Convivencia Comunitaria, Desarme y Transformación de Fronteras Invisibles (Olaya Herrera, El Pozón, Nelson Mandela, Boston).
     - **LE-03**: Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen y Zonas de Bajamar (asentamientos de bajamar, vertimientos, riesgo de inundación pluvial y mareal).
     - **LE-04**: Seguridad Económica, Inclusión Productiva e Informalidad (Mercado de Bazurto, economía popular, microcrédito contra el "gota a gota", jóvenes en riesgo).
   - Más de 24 aportes distribuidos en propuestas, anotaciones y preguntas ciudadanas fundamentadas en líderes territoriales representativos de Cartagena.

2. **Hito D-1 (Módulo de Línea Base Cuantitativa DNP - `/plataforma/diagnostico`)**:
   - Integración con la API real del backend FastAPI (`/api/v1/indicadores/fichas` y `/api/v1/indicadores/fichas/{id}/mediciones`).
   - Normalización de las 8 fichas técnicas DNP oficiales sembradas en `bd_csh` (Homicidios, Hurtos, Percepción Inseguridad CCV, FONSET, Cámaras LPR, Frentes Locales, Luminarias LED, Capacitación Juvenil).
   - Catálogo de contingencia de alta fidelidad para resiliencia offline.
   - Vista principal con filtros multifunción en vivo (tipo de indicador, periodicidad, búsqueda textual), botón de actualización y exportación pericial a CSV (sanitizado contra inyección de fórmulas OWASP) y JSON.
   - Tarjetas KPI semánticas de seguimiento y DataGrid interactivo con barras de avance, indicadores de sentido esperado y fuentes oficiales.
   - Panel lateral apilable Zero-Modals `medicion-editor` para registro de mediciones cuantitativas con control RBAC (bloqueo en modo solo lectura para auditores).
   - Control de acceso RBAC actualizado en `acceso.ts`, sidebar con icono `BarChart3`, y ruta App Router `/plataforma/diagnostico`.

---

## 2. Componentes y Entregables Implementados

### 2.1 Hito D-0: Purga y Contextualización de Políticas (`src/features/politicas/data/politicas.mock.ts`)
* Eliminados todos los residuos de otras ciudades.
* Fase 1 (Diagnóstico) y Fase 2 (Formulación) alineadas a los problemas estructurales de Cartagena:
  * LE-01: ESCNNA en entornos turísticos (Centro Histórico, Torre del Reloj, La Bodeguita, Playa Blanca).
  * LE-02: Fronteras invisibles y convivencia (Olaya Herrera, Boston, El Pozón, Nelson Mandela).
  * LE-03: Resiliencia ecoterritorial en Ciénaga de la Virgen, Caño Juan Angola y comunidades de bajamar.
  * LE-04: Economía popular, Bazurto, informalidad laboral y lucha contra el gota a gota extorsivo.
* Aportes verosímiles de líderes comunales, gremiales (ASOTELCA, Cámara de Comercio), academia (Universidad de Cartagena, UTB, CCV) y cooperación (PNUD, ACNUR).

### 2.2 Hito D-1: Control de Acceso y Navegación
* **`src/features/plataforma/models/acceso.ts`**:
  * Incorporado `diagnostico` a `MODULOS` con ruta `/plataforma/diagnostico`.
  * Habilitado en la matriz `ACCESO` para: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
  * Permisos: `PERMISOS_POR_MODULO.diagnostico` (`diagnostico:leer`, `diagnostico:gestionar`), `PERMISOS_EDICION.diagnostico` (`diagnostico:gestionar`).
  * `puedeEditar`: autoriza a autoridad y admin; deniega edición y restringe a solo lectura al `auditor_forense`.
  * `panelPermitido`: autoriza el panel `medicion-editor` validando sesión institucional activa.
* **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
  * Importado icono `BarChart3` de `lucide-react` y asignado a `ICONOS.diagnostico`.
* **`src/app/plataforma/diagnostico/page.tsx`**:
  * Ruta del App Router que renderiza `<DiagnosticoView />`.
* **`src/features/plataforma/models/acceso.test.ts`**:
  * Pruebas actualizadas cubriendo `diagnostico` en la matriz de acceso por rol y restricción de `medicion-editor` para auditores. **17 pruebas pasando (123 assertions)**.

### 2.3 Modelo de Datos y Servicios de API (`src/features/diagnostico/`)
* **`src/features/diagnostico/models/indicador.ts`**:
  * Tipos `TipoIndicador` (`"insumo" | "producto" | "resultado" | "impacto"`), `SentidoEsperado` (`"ascendente" | "descendente"`), interfaz `FichaIndicador`, `MedicionIndicadorCrear` y `MedicionIndicadorRespuesta`.
* **`src/features/diagnostico/data/indicadores-fallback.data.ts`**:
  * Catálogo de contingencia con los 8 indicadores oficiales DNP de Cartagena.
* **`src/features/diagnostico/services/indicadores-api.ts`**:
  * Cliente que consume `/api/v1/indicadores/fichas` vía `apiFetch` centralizado con normalización tipada de números y fechas, y fallback de contingencia.
  * Mutación `registrarMedicionIndicador` hacia `POST /api/v1/indicadores/fichas/{id}/mediciones` con inyección de Bearer token institucional.
* **`src/features/diagnostico/services/indicadores-api.test.ts`**:
  * Suite de pruebas unitarias verificando normalización, catálogo fallback DNP, y validación pericial de la purga en `politicas.mock.ts`. **4 pruebas pasando (23 assertions)**.

### 2.4 Interfaz de Usuario y Vistas
* **`src/features/diagnostico/components/diagnostico-kpis.tsx`**:
  * 4 tarjetas semánticas KPI:
    1. *Línea Base DNP*: total de fichas oficiales.
    2. *Resultado e Impacto*: indicadores de reducción de violencia y delito.
    3. *Metas con Avance*: tasa y porcentaje de indicadores con reporte.
    4. *Fuentes Oficiales*: recuento de fuentes primarias y secundarias articuladas.
* **`src/features/diagnostico/components/linea-base-tabla.tsx`**:
  * DataGrid con formato numérico y monetario distrital, badges de tipología, sentido esperado (flechas ascendente/descendente), indicador de avance porcentual y botón *"Medición"* para abrir el panel lateral.
* **`src/features/diagnostico/views/diagnostico-view.tsx`**:
  * Cabecera institucional `PageHeader`, botón de sincronización en vivo (`RotateCw`), menú de exportación (CSV seguro OWASP y JSON), barra de filtros por tipo y periodicidad con búsqueda en tiempo real.
* **Panel Lateral Zero-Modals (`src/features/diagnostico/panels/medicion-editor-panel.tsx`)**:
  * Montado sobre `PanelShell`. Formulario estructurado para registro de medición con validaciones numéricas, soporte documental URL, observaciones técnicas, autor extraído de la sesión y banner de solo lectura con campos deshabilitados para auditor forense.
* **Registro de Paneles**:
  * `src/core/panels/panel-store.ts`: Agregado `"medicion-editor"` a `PanelType` y `PanelPropsMap`.
  * `src/app/_composition/panel-registry.tsx`: Importación dinámica con `{ ssr: false }`, registro en `PANEL_REGISTRY` y ancho adaptativo `min(clamp(640px, 48vw, 920px), 100vw)` en `PANEL_WIDTHS`.

---

## 3. Verificación Técnica y Calidad Forense

| Verificación | Herramienta / Comando | Resultado |
|---|---|---|
| **Política de UI** | `node scripts/ui-policy.mjs` | **0 infracciones** (100% controles del Design Kit `@/shared/ui/*`, sin etiquetas HTML prohibidas, 100% variables y tokens semánticos CSS). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto sin `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 warning preexistente en TanStack table geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado**. |
| **Pruebas de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **17 pass, 0 fail (123 assertions)**. |
| **Pruebas de Actores** | `bun test src/features/actores/state/actores-store.test.ts` | **6 pass, 0 fail (14 assertions)**. |
| **Pruebas de Diagnóstico y Purga** | `bun test src/features/diagnostico/services/indicadores-api.test.ts` | **4 pass, 0 fail (23 assertions)**. |
| **Vitest Proyecto Plataforma** | `npx vitest run --project plataforma` | **5 test files passed, 38 pass, 0 fail**. |
| **Build de Producción** | `bun run build` (Turbopack) | **Compilado exitoso** en 9.4s. 53 páginas estáticas generadas, `/plataforma/diagnostico` pre-renderizado. Standalone sincronizado. |
| **Disponibilidad de Servicio** | `systemctl status polis-frontend.service` | **active (running)** PID 7683 en `127.0.0.1:3000`. |
| **Comprobación HTTP** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/diagnostico` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega
Los Hitos D-0 y D-1 han sido concluidos con total apego a la arquitectura Zero-Modals, estándares de diseño, veracidad territorial y rigor técnico.

Queda a disposición del Equipo Auditor Forense (EAF) y Orquestador para su correspondiente auditoría pericial y dictamen de conformidad.
