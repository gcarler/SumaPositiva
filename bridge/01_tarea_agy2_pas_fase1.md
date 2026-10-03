# TAREA agy2 — Plan de Acción y Seguimiento (Hito PAS-1: Matriz de Compromisos Institucionales)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA / CRÍTICA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_pas.md`

---

## Objetivo
Implementar el **Hito PAS-1** de la Fase de Plan de Acción y Seguimiento creando en la plataforma el nuevo módulo interno **`seguimiento`** (`/plataforma/seguimiento`), que servirá como la **Matriz de Compromisos Institucionales y Seguimiento Cuatrienal (PAS)** para la Política Pública de Seguridad Humana Integral de Cartagena de Indias, con catálogo canónico de compromisos por secretaría distrital, DataGrid interactivo con barras de avance cromáticas, KPIs y panel lateral Zero-Modals `compromiso-editor`.

---

## 1. Control de Acceso y Navegación
1. **`src/features/plataforma/models/acceso.ts`**:
   - Agregar a `MODULOS`:
     ```ts
     {
       id: "seguimiento",
       ruta: "/plataforma/seguimiento",
       titulo: "Seguimiento PAS",
       descripcion: "Plan de Acción y Seguimiento de compromisos institucionales y metas cuatrienales.",
     }
     ```
   - Habilitar en `ACCESO` para:
     - `autoridad_distrital`
     - `auditor_forense`
     - `administrador_identidades`
   - Configurar `PERMISOS_POR_MODULO.seguimiento`: `["seguimiento:leer", "seguimiento:gestionar"]`.
   - Configurar `PERMISOS_EDICION.seguimiento`: `["seguimiento:gestionar"]` (autoridad y admin editan; auditor solo lectura).
   - En `panelPermitido`: autorizar `"compromiso-editor"` para sesiones con permiso de gestión.
   - Actualizar y verificar `src/features/plataforma/models/acceso.test.ts`.

2. **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
   - Importar `CheckSquare` de `lucide-react`.
   - Asignar a `ICONOS`: `seguimiento: CheckSquare`.

3. **`src/app/plataforma/seguimiento/page.tsx`**:
   - Ruta en App Router que renderice `<SeguimientoView />`.

---

## 2. Modelo de Datos y Catálogo Canónico (`src/features/seguimiento/`)

1. **`src/features/seguimiento/models/compromiso.ts`**:
   - Tipos:
     - `EstadoCompromiso`: `"programado" | "en_ejecucion" | "cumplido" | "en_riesgo" | "retrasado"`
     - Interfaz `CompromisoInstitucional`:
       - `id`: string (UUID)
       - `codigo`: string (ej. `PAS-SEC-01`, `PAS-JUV-02`, etc.)
       - `nombre`: string
       - `descripcion`: string
       - `entidad_responsable`: string (Secretaría del Interior, Distriseguridad, DADIS, EPA Cartagena, OAGRD, Secretaría de Participación, Educación, IDER)
       - `linea_estrategica_codigo`: string (`LE-01`, `LE-02`, `LE-03`, `LE-04`)
       - `alternativa_mga_codigo`: string (ej. `ALT-ESCNNA-01`, `ALT-CONV-02`, etc.)
       - `indicador_asociado_codigo`: string (ej. `IND-RES-01`, `IND-PROD-01`, etc.)
       - `meta_cuatrienal_descripcion`: string
       - `meta_cuatrienal_valor`: number
       - `unidad_medida`: string
       - `avance_cuatrienal_valor`: number
       - `porcentaje_cumplimiento`: number (0 a 100)
       - `presupuesto_anual_cop`: number
       - `vigencias_programadas`: number[] (ej. `[2026, 2027, 2028, 2029]`)
       - `estado`: EstadoCompromiso
       - `fecha_corte_ultimo_reporte`: string
       - `metadatos`: Record<string, unknown>

2. **`src/features/seguimiento/data/compromisos-pas.data.ts`**:
   - Sembrar los 10 compromisos institucionales estructurados de Cartagena:
     1. `PAS-SEC-01`: *Ruta de Detección Temprana y Protección contra ESCNNA* — Distriseguridad / Sec. Interior (Meta: 100% de alertas atendidas; $1.200M COP/año).
     2. `PAS-JUV-02`: *Capacitación e Inserción Laboral para Jóvenes en Riesgo de Pandillismo* — Sec. de Participación (Meta: 1.500 jóvenes certificados; $1.800M COP/año).
     3. `PAS-SEG-03`: *Mantenimiento y Conectividad de 250 Cámaras LPR y Centros de Monitoreo* — Secotic / Distriseguridad (Meta: 95% disponibilidad; $2.000M COP/año).
     4. `PAS-ALUM-04`: *Instalación de 4.800 Luminarias LED en Puntos Críticos y Zonas de Miedo* — Secretaría General (Meta: 4.800 luminarias; $1.500M COP/año).
     5. `PAS-AMB-05`: *Limpieza de Canales, Drenajes y Reforestación Comunitaria en Ciénaga de la Virgen* — EPA Cartagena / OAGRD (Meta: 18 km saneados; $3.000M COP/año).
     6. `PAS-POL-06`: *Fortalecimiento Operativo y Dotación a 60 Frentes Locales de Seguridad* — Policía MEBAR / Sec. Interior (Meta: 60 frentes activos; $400M COP/año).
     7. `PAS-CUID-07`: *Puesta en Marcha de 2 Manzanas del Cuidado y Centros de Vida* — Sec. de Participación / DADIS (Meta: 3.200 mujeres atendidas; $950M COP/año).
     8. `PAS-DES-08`: *Mediación Comunitaria y Desarme Social en 12 Barrios Priorizados* — Sec. Interior (Meta: 12 acuerdos barriales; $1.100M COP/año).
     9. `PAS-BAZ-09`: *Microcrédito Popular y Formalización de 800 Comerciantes en Mercado de Bazurto* — Sec. de Hacienda (Meta: 800 microcréditos; $850M COP/año).
     10. `PAS-ETN-10`: *Proyectos Productivos y Salvaguarda Étnica con Consejos Comunitarios* — Asuntos Étnicos / Participación (Meta: 5 consejos articulados; $600M COP/año).

3. **Store y Pruebas (`compromisos-store.ts` y `compromisos-store.test.ts`)**:
   - Store Zustand con mutaciones (`agregarCompromiso`, `actualizarAvance`, `cambiarEstado`), filtros por entidad, línea, estado y búsqueda.
   - 100% pruebas pasando.

---

## 3. Vistas y Componentes UI (`src/features/seguimiento/`)

1. **`src/features/seguimiento/views/seguimiento-view.tsx`**:
   - Cabecera `PageHeader`: "Plan de Acción y Seguimiento (PAS) — Seguridad Humana Cartagena 2026–2036".
   - Botón *"Nuevo Compromiso"* (restringido por permiso de gestión).
   - Menú de exportación pericial a CSV (OWASP sanitizado) y JSON.
   - Barra de filtros por entidad responsable, estado de cumplimiento y buscador reactivo.

2. **`src/features/seguimiento/components/seguimiento-kpis.tsx`**:
   - 4 tarjetas semánticas KPI:
     - Total Compromisos PAS (10 compromisos).
     - Compromisos en Ejecución / Cumplidos.
     - Compromisos en Riesgo o Retrasados (con semáforo de alerta).
     - Promedio Global de Cumplimiento Cuatrienal (barra de avance).

3. **`src/features/seguimiento/components/compromisos-tabla.tsx`**:
   - DataGrid interactivo:
     - Código y Título del Compromiso.
     - Entidad Distrital Responsable (Badge).
     - Línea y Alternativa MGA vinculada.
     - Meta Cuatrienal y Avance Actual (con barra de progreso cromática).
     - Estado de Cumplimiento (Badges: Verde *Cumplido/En Ejecución*, Ámbar *En Riesgo*, Rojo *Retrasado*).
     - Presupuesto Anual.
     - Acciones: Botón *"Gestionar Avance"* que abre el panel lateral Zero-Modals.

4. **Panel Lateral Zero-Modals (`src/features/seguimiento/panels/compromiso-editor-panel.tsx`)**:
   - ID: `"compromiso-editor"`.
   - Registrado en `panel-store.ts` y `panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(720px, 50vw, 1020px), 100vw)`.
   - Formulario para actualizar el avance: valor medido actual, fecha de corte, estado de ejecución, reporte cualitativo y URL de evidencia documental.
   - Modo solo lectura estricto con campos deshabilitados para el rol `auditor_forense`.

---

## 4. Estándares Técnicos Obligatorios y Auditoría EAF
1. **Zero-Modals**: Toda interacción ocurre en la vista o en paneles laterales `PanelShell`. Cero modales flotantes o popups centrados.
2. **Tokens Semánticos CSS**: 100% de estilos construidos sobre variables de diseño de POLIS. Cero `#hex` hardcodeados.
3. **TypeScript Estricto**: 0 errores de tipado, 0 tipos `any`.
4. **Pruebas Automatizadas**:
   - `acceso.test.ts` actualizado con el módulo `seguimiento`.
   - `compromisos-store.test.ts` con cobertura completa.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/seguimiento`.

---

## 5. PROTOCOLO OBLIGATORIO DE ENTREGA Y NOTIFICACIÓN
1. Commit formal en `main`:
   `git commit -m "feat(seguimiento): modulo PAS de matriz de compromisos y metas cuatrienales"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. **NOTIFICACIÓN ACTIVA AL ORQUESTADOR**:
   Ejecuta en tu terminal bash:
   ```bash
   tmux send-keys -t agy "He terminado la entrega del Hito PAS-1 (Matriz de Compromisos del PAS). Documentado en 02_entrega_agy2.md y listo para auditar." Enter
   ```
