# PROTOCOLO DE AUDITORÍA FORENSE DE FRONTEND, KIT UI Y DESIGN SYSTEM PARA CODEX

**Fecha**: 2026-10-01  
**Rol Asignado**: Auditor Forense de Frontend, Kit UI y Accesibilidad (EAF)  
**Entorno de Trabajo**: Sesión tmux `codex` (GPT-6.1-Sol)  
**Ámbito de Inspección**: `/root/polis/src/` y `/root/polis/docs/`  
**Informe de Salida Obligatorio**: `/root/polis/docs/auditoria-frontend-kit-ui.md`

---

## 1. Misión de la Auditoría
Realizar una **Auditoría Forense Integral y No Destructiva** de todo el código de frontend de POLIS (`/root/polis/src/`), evaluando su apego estricto a los estándares institucionales, al Design System y al Kit UI antes del despliegue oficial.

---

## 2. Ejes de Evaluación Obligatorios

### Eje A: Las 9 Reglas de POLIS UI (`docs/kit-ui-rules.md`)
1. **Reutilizar antes de crear**: Uso estricto de primitivos de `src/shared/ui/` (`Button`, `Input`, `Textarea`, `Label`, `Select`, `FormField`). Prohibición de duplicar bibliotecas paralelas en features.
2. **Una fuente de tokens**: Consumo exclusivo de `src/shared/design-system/tokens.css` y clases semánticas. Prohibidos colores Tailwind literales (ej. `bg-blue-500`, `#1a202c`, etc.).
3. **Biblioteca independiente**: `shared` no importa `features`, `core` ni `app`. `core` no importa `features` ni `app`.
4. **Política Inquebrantable Zero-Modals**: Todos los paneles y flujos de usuario deben utilizar **SidePanel** mediante `PanelShell` y `PanelHost` (Drawers laterales). Prohibido montar `<Dialog>`, `<AlertDialog>`, `Drawer` o `Sheet` centrados o paralelos en flujos de producto.
5. **Accesibilidad conservada (a11y WCAG 2.1 AA)**: Etiquetas asociadas a controles con `id`/`htmlFor`, nombres accesibles en botones e iconos, foco visible con teclado, soporte para movimiento reducido.
6. **Ambos temas y responsive**: Verificación en modo claro y modo oscuro, diseño fluido desde 320px móvil hasta desktop sin scroll horizontal involuntario.
7. **Contrato e historias**: Componentes registrados en `design-system/catalog.ts` con estado `ready` y presencia de historias en Storybook.
8. **Una implementación, dos consumidores**: App y Storybook comparten componentes reales.
9. **Cambios verificables**: Ejecución y satisfacción de `bun run ui:check`, `bun run typecheck`, `bun run lint` y `bun run build`.

### Eje B: Regla UI001 y Semántica de Controles
- Verificar que los elementos interactivos tipo botón utilicen el componente semántico `<Button variant="unstyled" ...>` de `@/shared/ui/button` o botones del kit en lugar de `<button>` nativo de HTML para garantizar accesibilidad y cumplimiento de `scripts/ui-policy.mjs`.

### Eje C: Inspección de Nuevos Módulos de Entrega 6
- `src/app/_components/sidebar-institucional.tsx` (Sidebar con 4 modos interactivos: resize mouse, acordeón, solo iconos, oculto total).
- `src/features/formularios/panels/` (`FormulariosPanel`, `FormularioEditorPanel`, `FormularioAnaliticaPanel`).
- `src/features/participacion/panels/` (`ParticipacionMulticanalPanel`, `EscenarioEditorPanel`).
- `src/features/sesion/panels/usuarios-panel.tsx`.

---

## 3. Entregable Requerido
Redacta el informe pericial forense exhaustivo en:
`/root/polis/docs/auditoria-frontend-kit-ui.md`

El informe debe incluir:
1. **Resumen Ejecutivo**: Diagnóstico global del frontend.
2. **Matriz de Cumplimiento de las 9 Reglas de POLIS UI**: Tabla con regla, estado (`CONFORME`, `OBSERVACIÓN`, `NO CONFORME`) y archivo(s) evaluado(s).
3. **Inventario de Componentes y Paneles Auditados**: Lista completa con estado de accesibilidad y Zero-Modals.
4. **Hallazgos Clasificados**:
   - `[Crítico]`: Infracciones que violan Zero-Modals, accesibilidad o rompen políticas.
   - `[Advertencia]`: Oportunidades de mejora en tokens semánticos o tipado.
   - `[Mejora Recomendada]`: Optimizaciones de UX o rendimiento.
5. **Correcciones Seguras Aplicadas (opcional)**: Si encuentras infracciones menores de tokens, imports o atributos ARIA, corrígelas asegurando que `bun run check && bun run build` finalicen con 0 errores.
