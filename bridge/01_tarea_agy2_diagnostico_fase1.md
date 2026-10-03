# TAREA agy2 — Diagnóstico de Política Pública (Hitos D-0 y D-1)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Objetivo General
Iniciar la implementación de la **Fase de Diagnóstico Situacional y Territorial** de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto 037 de 2026 y Metodología MGA/DNP), ejecutando dos hitos complementarios:
1. **Hito D-0 (Calidad y Veracidad)**: Purga pericial y contextualización territorial de `src/features/politicas/data/politicas.mock.ts` eliminando residuos de otras ciudades y sembrando problemáticas y aportes 100% reales de Cartagena.
2. **Hito D-1 (Línea Base Cuantitativa)**: Desarrollo e integración del nuevo módulo interno de plataforma **`diagnostico`** (`/plataforma/diagnostico`), que expone la matriz de indicadores de línea base consumiendo la API existente del backend (`/api/v1/indicadores/fichas`).

---

## 1. Especificación Hito D-0: Purga Pericial de `politicas.mock.ts`
**Archivo**: `src/features/politicas/data/politicas.mock.ts`

1. **Depuración Total**:
   - Eliminar cualquier referencia a topónimos o ejemplos viales ajenos a Cartagena ("Av. Regional", "Calle 44", "Comunas 2, 5, 7, 10", "corredor ferroviario", "calles escolares", etc.).
2. **Reemplazo con Realidad Territorial de Cartagena**:
   - En **Fase 1 (Diagnóstico)** y **Fase 2 (Formulación)**, estructurar líneas y aportes vinculados a las problemáticas reales del Distrito:
     - **LE-01**: Prevención de ESCNNA y Protección Integral de Niñez en Entornos Turísticos y Escolares (Centro Histórico, Bocagrande, Playa Blanca, La Boquilla).
     - **LE-02**: Convivencia Comunitaria, Desarme y Transformación de Fronteras Invisibles (Olaya Herrera, El Pozón, Nelson Mandela, Boston).
     - **LE-03**: Seguridad Ambiental y Resiliencia en la Ciénaga de la Virgen y Zonas de Bajamar (asentamientos de bajamar, vertimientos, riesgo de inundación pluvial y mareal).
     - **LE-04**: Seguridad Económica, Inclusión Productiva e Informalidad (Mercado de Bazurto, economía popular, alternativas para jóvenes en riesgo).
3. **Estructura de Aportes**:
   - Al menos 3 aportes por línea estratégica (combinando `propuesta`, `anotacion` y `pregunta`), con nombres de líderes verosímiles, fechas 2026, conteo de apoyos y contenidos fundamentados en el contexto de Cartagena.

---

## 2. Especificación Hito D-1: Módulo de Línea Base (`/plataforma/diagnostico`)

### 2.1 Control de Acceso y Navegación
1. **`src/features/plataforma/models/acceso.ts`**:
   - Agregar a `MODULOS`:
     ```ts
     {
       id: "diagnostico",
       ruta: "/plataforma/diagnostico",
       titulo: "Diagnóstico",
       descripcion: "Línea base cuantitativa, brechas por dimensión e indicadores oficiales DNP.",
     }
     ```
   - Habilitar en `ACCESO` para:
     - `autoridad_distrital`
     - `auditor_forense`
     - `administrador_identidades`
   - Configurar `PERMISOS_POR_MODULO.diagnostico`: `["diagnostico:leer", "diagnostico:gestionar"]`.
   - Configurar `PERMISOS_EDICION.diagnostico`: `["diagnostico:gestionar"]` (autoridad y admin pueden gestionar; auditor en modo solo lectura).
   - Actualizar y verificar `src/features/plataforma/models/acceso.test.ts`.

2. **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
   - Importar `BarChart3` o `ClipboardList` de `lucide-react`.
   - Asignar a `ICONOS`: `diagnostico: BarChart3`.

3. **`src/app/plataforma/diagnostico/page.tsx`**:
   - Ruta en App Router que renderice `<DiagnosticoView />`.

### 2.2 Integración y Consumo de la API de Indicadores
- El backend FastAPI ya expone en producción:
  - `GET /api/v1/indicadores/fichas` (retorna las fichas técnicas DNP sembradas en `bd_csh`: Homicidios, Hurtos, Percepción Inseguridad CCV, Inversión FONSET, Cámaras, etc.).
  - `POST /api/v1/indicadores/fichas/{id}/mediciones` (registro de mediciones).
- Crear servicio cliente o hook React Query (`src/features/diagnostico/services/indicadores-api.ts` o similar) para consultar los datos reales de la API con fallback seguro en caso de desconexión.
- **Prohibido**: Embeber datos estáticos en un store Zustand desconectado de la API. Toda persistencia debe conectarse con el backend.

### 2.3 Componentes y Vistas (`src/features/diagnostico/`)
1. **`src/features/diagnostico/views/diagnostico-view.tsx`**:
   - Cabecera `PageHeader`: "Diagnóstico Situacional y Línea Base — Seguridad Humana Cartagena 2026".
   - Barra de filtros rápidos por tipo de indicador (`insumo`, `producto`, `resultado`), periodicidad y búsqueda en vivo.
   - Botón de exportación a CSV/JSON y botón de actualización de datos.
2. **`src/features/diagnostico/components/diagnostico-kpis.tsx`**:
   - 4 tarjetas semánticas métricas:
     - Total Indicadores en Línea Base (8 fichas DNP).
     - Indicadores de Resultado e Impacto (con semáforo de tendencia).
     - Metas con Avance Positivo.
     - Fuentes Oficiales Vinculadas (Medicina Legal, SIEDCO, DANE, CCV, FONSET).
3. **`src/features/diagnostico/components/linea-base-tabla.tsx`**:
   - DataGrid interactivo con columnas:
     - Código DNP (`IND-RES-01`, etc.) y Nombre del Indicador.
     - Tipo de Indicador (Badges: *Insumo*, *Producto*, *Resultado*).
     - Línea Base (Valor numérico formateado + Año base 2023).
     - Valor Actual / Medición Reciente.
     - Meta Cuatrienio (2024–2027) y Porcentaje de Avance.
     - Fuente Oficial (Medicina Legal, SIEDCO, CHIP DNP, Cartagena Cómo Vamos).
     - Acciones: Botón *"Registrar Medición"* que abre el panel lateral Zero-Modals.
4. **Panel Lateral Zero-Modals (`src/features/diagnostico/panels/medicion-editor-panel.tsx`)**:
   - ID: `"medicion-editor"`.
   - Registrado en `panel-registry.tsx` y `panel-store.ts` con ancho adaptativo.
   - Formulario para registrar una nueva medición: Periodo, Fecha de corte, Valor medido, Observaciones técnicas, URL de soporte documental.
   - Protección RBAC: si el usuario es `auditor_forense` o carece de `diagnostico:gestionar`, los campos se bloquean con aviso pericial de solo lectura.

---

## 3. Estándares Técnicos Obligatorios y Auditoría EAF
1. **Zero-Modals**: Prohibido usar `dialog` flotantes. Toda edición o detalle ocurre en paneles laterales apilables sobre `PanelShell`.
2. **Tokens Semánticos CSS**: Prohibido hardcodear colores hex (`#...`). 100% tokens de POLIS (`var(--surface-1)`, `var(--border)`, `var(--text-primary)`, `var(--ember)`, etc.).
3. **TypeScript Estricto**: 0 errores, sin tipos `any`.
4. **Pruebas Automatizadas**:
   - `bun test src/features/plataforma/models/acceso.test.ts` pasando al 100%.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/diagnostico`.

---

## 4. Entrega
Al culminar y verificar los quality gates:
1. Commit formal en `main`:
   `git commit -m "feat(diagnostico): purga pericial de mock y modulo de linea base cuantitativa DNP"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notificar al Auditor Forense (Antigravity) para proceder con el dictamen EAF.
