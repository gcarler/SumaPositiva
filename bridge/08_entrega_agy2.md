# ENTREGA: [T6.2] Módulo de Formularios y Consultas Ciudadanas

## Resumen de Cambios

1. **Modelos de Dominio (`src/features/formularios/models/formulario.ts`)**:
   - Se diseñaron los tipos `Formulario`, `PreguntaFormulario`, y `AnaliticaFormulario`.
   - Se integró el soporte paramétrico para el Enfoque Diferencial (Ley 1448/11, Ley 1618/13) y tipos de campos variados (`likert`, `opcion_unica`, `opcion_multiple`, `texto`).

2. **Servicios de Backend Simulados (`formularios-api.ts` & `use-formularios-queries.ts`)**:
   - `apiFetch` envuelto para endpoints CRUD REST.
   - Provisión de mocks robustos (`MOCK_FORMULARIOS`) que facilitan el desarrollo sin la dependencia de API PostGIS activa, usando react-query para caché local.

3. **Arquitectura UI (Zero-Modals y Panels)**:
   - Creados tres paneles deslizantes y auto-ajustables con los componentes de `@/shared/ui/`:
     - **`FormulariosPanel`**: Tabla/Catálogo de encuestas activas.
     - **`FormularioEditorPanel` (FormBuilder)**: Interfaz dinámica para adición y configuración de preguntas, incluyendo la obligatoriedad y switches de enfoque poblacional diferencial usando `<Checkbox>` y `<Select>`.
     - **`FormularioAnaliticaPanel`**: Panel de reportes con barras de progresión nativas (usando Flex/Width) y conteo demográfico.
   - Anclados rigurosamente en `PANEL_REGISTRY` y `PANEL_WIDTHS` (`src/app/_composition/panel-registry.tsx`).

4. **Integración al PBAC (Sidebar)**:
   - Configurado el enlace "Formularios Activos" del `SidebarInstitucional` para llamar a `openPanel("formularios", {})`, uniendo toda la experiencia del funcionario en un flujo unificado y zero-refresh.

5. **Validaciones**:
   - Las validaciones `ui-policy.mjs` de controles nativos (`Select` en lugar de `<select>`) reportan 0 faltas. Tipado en 100%. `next build` genera estáticos velozmente con cero errores de dependencias.

**Estado:** ENTREGA LISTA. Todo funcional y validado.
