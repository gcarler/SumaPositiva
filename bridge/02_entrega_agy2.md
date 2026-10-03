# Entrega agy2 — Módulo de Plataforma: "Fuentes de Información" (/plataforma/fuentes)
Fecha: 2026-10-03T01:52:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `b1254e8` feat(fuentes): módulo de seguimiento, radicación y control de fuentes de información
- `cee3b96` test(fuentes): incluir pruebas de store y metricas en proyecto vitest plataforma

## 1. Resumen Ejecutivo
Se desarrolló e integró exitosamente el nuevo módulo de gestión interna **`fuentes`** (`/plataforma/fuentes`) en la plataforma **POLIS**, orientado al monitoreo, radicación, trazabilidad pericial y control de cumplimiento de las fuentes de información primarias y secundarias (locales, nacionales e internacionales) requeridas para la formulación técnica de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto 037 de 2026 del Ministerio del Interior).

El módulo se encuentra plenamente operativo en el entorno de producción (`http://127.0.0.1:3000/plataforma/fuentes`), respaldado por pruebas de acceso, modelo de datos tipado, catálogo sembrado exhaustivo, store reactivo con cálculo de KPIs, datagrid con exportación segura (CSV y JSON anti-fórmula injection), y panel de edición Zero-Modals apilable.

---

## 2. Componentes y Entregables Implementados

### 2.1 Control de Acceso y Navegación
* **`src/features/plataforma/models/acceso.ts`**:
  * Incorporado `fuentes` a `MODULOS` con ruta `/plataforma/fuentes`, título *"Fuentes"* y descripción institucional.
  * Habilitado en la matriz `ACCESO` para roles: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
  * Catálogo de permisos: `PERMISOS_POR_MODULO.fuentes` (`fuentes:leer`, `fuentes:gestionar`), `PERMISOS_EDICION.fuentes` (`fuentes:gestionar`).
  * Protección de edición: `puedeEditar(sesion, "fuentes")` autoriza a `autoridad_distrital` y `administrador_identidades`, y bloquea escritura a `auditor_forense` y `facilitador_mesa`.
  * Autorización de panel: `panelPermitido` autoriza `"fuente-editor"` validando permisos de sesión.
* **`src/features/plataforma/models/acceso.test.ts`**:
  * Actualizada la suite de pruebas unitarias cubriendo la matriz completa de módulos por rol y denegación de edición para auditores. **17 pruebas pasando (99 assertions)**.
* **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
  * Importado ícono `Database` de `lucide-react` y asignado a `ICONOS.fuentes`.
* **`src/app/plataforma/fuentes/page.tsx`**:
  * Ruta de página del App Router que renderiza `<FuentesView />`.

### 2.2 Modelo de Datos y Catálogo Oficial (`src/features/fuentes/`)
* **`src/features/fuentes/models/fuente.ts`**:
  * Tipos rigurosos: `TipoFuente` (`primaria` | `secundaria`), `AmbitoFuente` (`local` | `nacional` | `internacional`), `EstadoEntrega` (`entregada` | `en_termino` | `incompleta` | `vencida_sin_entrega` | `requerimiento_insistencia`), `ResponsableContacto` e interfaz `FuenteInformacion`.
* **`src/features/fuentes/data/fuentes-iniciales.data.ts`**:
  * Catálogo sembrado con 18 fuentes oficiales articuladas al contexto real de Cartagena:
    * **Locales**: MECAR - SIEDCO (Local), Medicina Legal (Seccional Bolívar), DADIS - SIVIGILA, Distriseguridad (Línea 123 / CCTV), EPA Cartagena, OAGRD (Puntos críticos y riesgo costero), Cartagena Cómo Vamos (EPC 2025), Mesas de Diálogo POLIS 2026 (Actas y árboles MGA).
    * **Nacionales**: DANE - ECSC, DANE - GEIH, DANE - IPM, DNP - Terridata, Fiscalía General - SPOA, Medicina Legal - Forensis Nacional, Defensoría del Pueblo - SAT (Alertas Tempranas), Unidad para las Víctimas - RUV.
    * **Internacionales**: PNUD (Marco de Seguridad Humana), UNODC (Monitoreo Portuario y Tráfico Ilícito).
  * Distribución realista de estados de entrega para probar alertas y semaforización.
* **`src/features/fuentes/state/fuentes-store.ts`**:
  * Store Zustand con acciones: `setFiltros`, `limpiarFiltros`, `getById`, `actualizarFuente`, `agregarFuente`, `resetearFuentes`.
  * Selectores computados: `useFuentesFiltradas()` (filtrado multifactorial por texto, ámbito, estado, dimensión) y `useFuentesMetricas()` (conteos por estado, alertas críticas y tasa de cumplimiento %).
* **`src/features/fuentes/state/fuentes-store.test.ts`**:
  * Suite de pruebas unitarias verificando carga, actualización de radicados, filtrado y creación de fuentes. **4 pruebas pasando (14 assertions)**.

### 2.3 Interfaz de Usuario y Vistas
* **`src/features/fuentes/components/fuentes-kpis.tsx`**:
  * 5 tarjetas semánticas métricas con iconos vectoriales: *Entregadas* (verde), *En Término* (azul info), *Incompletas* (amarillo advertencia), *Vencidas / Requerimiento Insistido* (rojo alerta) y *Tasa de Cumplimiento Global* (ember acento).
* **`src/features/fuentes/components/fuentes-datagrid.tsx`**:
  * Tabla con tipografía tabular, insignias semánticas de estado (`Badge`), enlaces directos a recursos, radicado con fechas límite y botón de acción *"Gestionar"*.
  * Exportador a **CSV** con sanitización contra inyección de fórmulas (`OWASP CSV Injection`) y exportador a **JSON**.
* **`src/features/plataforma/views/fuentes-view.tsx`**:
  * Vista principal con cabecera `PageHeader`, barra multifunción de búsqueda en vivo y selects para Ámbito, Estado y Dimensión de Seguridad, con botón de limpieza reactivo.
* **Panel Lateral Zero-Modals (`src/features/fuentes/panels/fuente-editor-panel.tsx`)**:
  * Montado sobre `PanelShell`. Integra ficha técnica descriptiva, control de radicado y fechas, resumen de datos entregados, URL de repositorios, datos de contacto institucional y campo para observaciones periciales de calidad.
  * Respeta permisos: si el usuario es `auditor_forense` o no posee `fuentes:gestionar`, el formulario se presenta con banner informativo de solo lectura y controles inhabilitados.
* **Registro de Paneles**:
  * `src/core/panels/panel-store.ts`: Agregado `"fuente-editor"` al tipo `PanelType`, a `PanelPropsMap` y configurado ancho adaptativo `min(clamp(640px, 48vw, 920px), 100vw)` en `PANEL_WIDTHS`.
  * `src/app/_composition/panel-registry.tsx`: Importación dinámica con `{ ssr: false }` y registro en `PANEL_REGISTRY`.

---

## 3. Verificación Técnica y Cumplimiento de Políticas EAF

1. **Política UI (`node scripts/ui-policy.mjs`)**:
   * **0 infracciones**. Cumplimiento estricto del Kit UI: botones, inputs, badges y selects encapsulados; ningún elemento nativo prohibido; cero colores Tailwind hardcodeados; 100% variables y tokens semánticos CSS (`--surface-1`, `--border`, `--ember`, `--text-primary`, etc.).
2. **Chequeo de Tipos y Linters (`bun run check`)**:
   * `ui:check`: Aprobado.
   * `tsc --noEmit`: Aprobado sin errores.
   * `eslint .`: Aprobado (0 errores).
3. **Pruebas Automatizadas**:
   * `bun test src/features/plataforma/models/acceso.test.ts`: **17 pass, 0 fail**.
   * `bun test src/features/fuentes/state/fuentes-store.test.ts`: **4 pass, 0 fail**.
4. **Compilación de Producción Turbopack (`bun run build`)**:
   * Compilado exitoso en 10.7s. 51 rutas generadas, incluyendo `/plataforma/fuentes` como ruta estática pre-renderizada.
   * Copia íntegra de `.next/static` y `public` al directorio `.next/standalone/`.
5. **Servicio y Disponibilidad en Vivo**:
   * `systemctl restart polis-frontend.service` ejecutado.
   * Comprobación HTTP 200 en `http://127.0.0.1:3000` y `http://127.0.0.1:3000/plataforma/fuentes`.
