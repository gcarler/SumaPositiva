# ENTREGA: [T6.3] Registro de Asistencia y Participación Multicanal Desagregada

## Resumen de Cambios

1. **Dominio de Datos y API (`src/features/participacion/`)**:
   - Modelado exhaustivo de los tipos de participación: `TableroConsolidado`, `DesgloseWeb`, `DesgloseMesas`, y `EscenarioEspecial`.
   - Soporte para desgloses cruzados (Género vs Enfoque Diferencial) y categorizaciones territoriales/sectoriales.
   - Creación de mocks en `use-participacion-queries.ts` para proveer datos a las vistas sin depender aún de la conexión final con PostGIS.

2. **UI: Zero-Modals (`panels/participacion-multicanal-panel.tsx`)**:
   - Se construyó el gran tablero de comando usando componentes `<Tabs>` para dividir la información sin saturación cognitiva.
   - Las 4 vistas (Consolidado, Canal Web, Mesas Deliberativas, y Escenarios Especiales) renderizan visualizaciones de datos usando primitivas HTML/CSS y tokens (ej: `bg-[var(--info)]`, barras de progreso porcentual), eliminando el overhead de librerías de gráficos de terceros.
   - Todo cumple al 100% las normativas de accesibilidad y contrastes del kit (UI Policy).

3. **UI: Editor de Escenarios (`panels/escenario-editor-panel.tsx`)**:
   - Se implementó el panel de captura de escenarios especiales (foros, consultas previas).
   - Formulario que utiliza `Input`, `Label` y `Select` del Design System para capturar los desgloses de asistencia y cruzar datos poblacionales.

4. **Integración al PBAC (SidebarInstitucional)**:
   - Los 4 botones del submódulo de Asistencia en el Sidebar se conectaron exitosamente a `openPanel("participacion-multicanal", { canalInicial: <id> })`, logrando que al hacer clic en "Canal Web" se abra el drawer directamente en la pestaña correspondiente.

5. **Validaciones CI/CD**:
   - El código fue auditado por `ui-policy.mjs` sin arrojar ninguna falta (usos correctos de los primitivos del UI Kit local y de tokens en vez de paletas puras).
   - `bun run check && bun run build` pasa exitosamente.

**Estado:** ENTREGA LISTA. Todo funcional, integrado y validado.
