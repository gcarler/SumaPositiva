# TAREA agy2 — Módulo de Plataforma: "Fuentes de Información" (POLIS)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor de Entrega**: Antigravity (EAF)

---

## Objetivo
Desarrollar el nuevo módulo interno de plataforma **`fuentes`** (`/plataforma/fuentes`) para realizar el seguimiento exhaustivo, trazabilidad, radicación y control de cumplimiento a las fuentes de información primarias y secundarias (locales, nacionales e internacionales) requeridas para la formulación técnica y participativa de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto 037 de 2026 del Ministerio del Interior).

Este módulo es de **acceso interno y privado** dentro de `/plataforma`, accesible para autoridades distritales y auditores.

---

## 1. Integración en el Sistema de Acceso y Navegación
1. **`src/features/plataforma/models/acceso.ts`**:
   - Agregar a `MODULOS`:
     ```ts
     {
       id: "fuentes",
       ruta: "/plataforma/fuentes",
       titulo: "Fuentes",
       descripcion: "Monitoreo, radicación y cumplimiento de fuentes primarias y secundarias.",
     }
     ```
   - En `ACCESO`, habilitar `"fuentes"` para:
     - `autoridad_distrital`
     - `auditor_forense`
     - `administrador_identidades`
   - En `PERMISOS_POR_MODULO`:
     - `fuentes: ["fuentes:leer", "fuentes:gestionar"]`
   - En `PERMISOS_EDICION`:
     - `fuentes: ["fuentes:gestionar"]`
   - Actualizar y verificar pruebas en `src/features/plataforma/models/acceso.test.ts`.

2. **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
   - Importar `Database` desde `lucide-react`.
   - Asignar a `ICONOS`: `fuentes: Database`.

3. **`src/app/plataforma/fuentes/page.tsx`**:
   - Crear la ruta de página que renderice `<FuentesView />`.

---

## 2. Modelo de Datos y Store (`src/features/fuentes/`)

1. **`src/features/fuentes/models/fuente.ts`**:
   ```ts
   export type TipoFuente = "primaria" | "secundaria";
   export type AmbitoFuente = "local" | "nacional" | "internacional";
   export type EstadoEntrega =
     | "entregada"
     | "en_termino"
     | "incompleta"
     | "vencida_sin_entrega"
     | "requerimiento_insistencia";

   export interface ResponsableContacto {
     nombre: string;
     cargo: string;
     email: string;
     telefono?: string;
   }

   export interface FuenteInformacion {
     id: string;
     codigo: string;
     entidad: string;
     nombreFuente: string; // ej. "ECSC - Encuesta de Convivencia", "SIEDCO - Estadísticas Delictivas"
     tipo: TipoFuente;
     ambito: AmbitoFuente;
     dimensionSeguridad: string; // "personal", "comunitaria", "ambiental", "economica", "alimentaria", "salud", "politica", "crisis"
     periodicidad: "mensual" | "trimestral" | "semestral" | "anual" | "por_demanda";
     radicadoSolicitud?: string;
     fechaSolicitud?: string;
     fechaLimiteRespuesta?: string;
     estadoEntrega: EstadoEntrega;
     variablesSolicitadas: string[];
     datosEntregadosResumen?: string;
     archivoAdjuntoUrl?: string;
     responsableContacto?: ResponsableContacto;
     observacionesCalidad?: string;
     actualizadoEn: string;
   }
   ```

2. **`src/features/fuentes/data/fuentes-iniciales.data.ts`**:
   Sembrar el catálogo oficial con las fuentes reales articuladas a Cartagena:
   - **Locales**:
     - MECAR - SIEDCO (Local) [Personal]
     - Medicina Legal (Seccional Bolívar) [Personal]
     - DADIS - SIVIGILA [Salud / Violencia]
     - Distriseguridad (Línea 123 / CCTV / Centros de Monitoreo) [Personal / Crisis]
     - EPA Cartagena (Calidad ambiental, vertimientos y ruido) [Ambiental]
     - OAGRD (Puntos críticos, zonas de bajamar y riesgo) [Ambiental / Crisis]
     - Cartagena Cómo Vamos (Encuesta de Percepción Ciudadana) [Comunitaria]
     - Mesas de Trabajo POLIS 2026 (Actas territoriales y árboles de problemas) [Primaria / Todas]
   - **Nacionales**:
     - DANE - ECSC (Cifra negra y victimización) [Personal]
     - DANE - GEIH (Mercado laboral, informalidad y juventud) [Económica]
     - DANE - IPM (Pobreza multidimensional y NBI) [Económica]
     - DNP - Terridata (Fichas e inversión distrital) [Política]
     - Fiscalía General - SPOA (Noticias criminales e impunidad) [Personal / Política]
     - Medicina Legal - Forensis Nacional [Personal]
     - Defensoría del Pueblo - SAT (Sistema de Alertas Tempranas) [Crisis / Personal]
     - Unidad para las Víctimas - RUV [Comunitaria / Económica]
   - **Internacionales**:
     - PNUD (Indicadores de Seguridad Humana) [Multidimensional]
     - UNODC (Monitoreo de puertos y dinámicas de tráfico ilícito) [Personal]
   - Asegurar variedad realista de estados (`entregada`, `en_termino`, `incompleta`, `vencida_sin_entrega`, `requerimiento_insistencia`).

3. **`src/features/fuentes/state/fuentes-store.ts`**:
   - Store Zustand con soporte para actualizar estado, registrar radicado, agregar notas de calidad y filtrar.
   - Selectores computados: porcentaje de cumplimiento global, conteos por estado de semáforo, conteo de vencidas.

---

## 3. Componentes y Vistas

1. **`src/features/plataforma/views/fuentes-view.tsx`**:
   - Vista principal con layout de plataforma.
   - Header institucional con títulos y acciones.
   - KPIs integrados en cabecera.
   - Barra de filtros multifunción y búsqueda rápida en vivo.
   - DataGrid de fuentes con opciones de exportación (CSV y JSON).

2. **`src/features/fuentes/components/fuentes-kpis.tsx`**:
   - Tarjetas de resumen métrico:
     - 🟢 Entregadas
     - 🟡 En Término
     - 🟠 Incompletas
     - 🔴 Vencidas / Requerimiento Insistido
     - Tasa global de cumplimiento (%)

3. **`src/features/fuentes/components/fuentes-datagrid.tsx`**:
   - Columnas claras: Entidad & Fuente, Ámbito / Tipo, Dimensión ONU, Radicado & Fechas, Estado (Badges semánticos), Acciones.
   - Botón *"Gestionar"* que abre el panel lateral `fuente-editor`.
   - Exportación limpia a CSV (con escape anti-fórmulas) y JSON.

4. **Panel Lateral Zero-Modals (`src/features/fuentes/panels/fuente-editor-panel.tsx`)**:
   - Registrar en `src/core/panels/panel-registry.tsx` y `panel-store.ts` con ID `"fuente-editor"`.
   - Permite editar: radicado, fecha límite, estado de entrega, URL de archivo/datos y observaciones periciales de calidad.
   - Respetar permisos con `puedeEditar(sesion, 'fuentes')`. Si el rol no puede editar (ej. auditor), mostrar modo solo lectura o deshabilitar inputs.

---

## 4. Estándares Técnicos y de Auditoría EAF
- **Zero-Modals**: Prohibido usar `dialog`, popups nativos o modales centrados flotantes. Toda edición o detalle abre el Drawer lateral apilable de POLIS.
- **Tokens Semánticos CSS**: No hardcodear colores hex (`#...`). Usar variables de diseño de POLIS (`var(--surface-1)`, `var(--border)`, `var(--text-primary)`, `var(--ember)`, etc.).
- **TypeScript Estricto**: 0 errores de tipado, sin tipos `any`.
- **Verificación Técnica Obligatoria**:
  1. `bun run check` (pasa `ui:check`, `tsc --noEmit` y `eslint`).
  2. `node scripts/ui-policy.mjs` (0 infracciones).
  3. `bun test src/features/plataforma/models/acceso.test.ts` (pruebas pasando).
  4. `bun run build` (build Turbopack sin errores).
  5. `systemctl restart polis-frontend.service` y verificar HTTP 200 en `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000`.

---

## 5. Entrega
Al finalizar la implementación y pasar todos los checks locales:
1. Realiza el commit en `main`:
   `git commit -m "feat(fuentes): módulo de seguimiento, radicación y control de fuentes de información"`
2. Documenta el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notifica al Auditor Forense (Antigravity) para proceder con la auditoría EAF y dictamen pericial.
