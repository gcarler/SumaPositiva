# ENTREGA: [T4.4] Plantillas Sectoriales Críticas de Cartagena y Conexión Frontend

## Resumen de Cambios
1. **API y hooks de TanStack Query**:
   - `src/features/mesas/services/mesas-api.ts`: Se agregaron los métodos `listarInstrumentos`, `actualizarArbol`, `actualizarNodos` y `convertirAObjetivos`, conectados con `apiFetch` hacia `/instrumentos`.
   - Se preservó el simulador fallback hacia `MESAS_MOCK` en caso de pérdida de red (en `use-mesas-queries.ts` mediante `try...catch`).
   - Se crearon las funciones `actualizarAcuerdosPlenaria`, `crearSubMesa` y `actualizarSubMesa` contra los endpoints de `/mesas`.
   - `src/features/mesas/services/use-mesas-queries.ts`: Se exportaron mutaciones `useActualizarAcuerdos`, `useCrearSubMesa` y `useActualizarSubMesa` con invalidación automática de queries usando `MESAS_KEYS`.

2. **Paneles Laterales (Zero-Modals)**:
   - `src/features/mesas/panels/mesa-panel.tsx`: Se migró la obtención de datos a `useMesaQuery`. Se reemplazó el acceso directo al store en los métodos `guardarSubMesa` y `confirmarAcuerdos` por las mutaciones provistas.
   - `src/features/mesas/panels/papelografo-panel.tsx`: Ya contenía la función `sincronizar()` con la mutación de `useActualizarSubMesa`. Se validó la integración garantizando que el árbol reactivo del componente preserve su comportamiento interactivo local y mande los cambios en segundo plano al backend.

3. **Validación**:
   - Ejecutados los chequeos `bun run check` y `bun run build` al 100% de éxito, garantizando cero errores de tipos o linting.

**Estado:** ENTREGA LISTA.
