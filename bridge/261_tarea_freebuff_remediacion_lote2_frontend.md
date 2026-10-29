# Encargo 261: Remediación Lote 2 Frontend — Políticas de Acceso, Contingencias y Robustez en Pruebas

**Fecha:** 28 de octubre de 2026  
**Responsable:** Freebuff (`=freebuff:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos:** `src/features/plataforma/`, `src/features/seguimiento/`, `src/app/_stories/`  
**Entregable:** `bridge/261_entrega_freebuff_remediacion_lote2_frontend.md`

---

## 1. Objetivos Técnicos

1. **257-H10 (Media · Alineación de Permisos en Plataforma):**
   - En `src/features/plataforma/models/acceso.ts`:
     - Retirar `facilitador_mesa` de `rolesPorModulo["actores"]` (el backend exige `politicas:gestionar`, evitando 403).
     - Permitir acceso a `auditoria-consola` para `auditor_forense` cuando tenga el permiso `auditoria:leer` (retirar la exclusión `sesion.rol !== "auditor_forense"`).
     - Actualizar `PERMISOS_POR_MODULO["actores"]` para requerir `politicas:gestionar`.

2. **257-H04 (Alta · Contingencias Honestas en Frontend):**
   - En `src/features/seguimiento/services/google-workspace-api.ts`:
     - El fallback offline `ESTADO_WORKSPACE_INICIAL` debe reportar `conectado: false`, `archivos_nativos_detectados: []`, `hojas_calculo_count: 0`, `documentos_count: 0`, `esContingencia: true`.
   - En `src/features/seguimiento/services/plan-accion-dnp-api.ts`:
     - `ejecutarSistemaMultiagentePdd`: ante 403 o error de red, retornar estado con `estado: "FALLO"`, `puertas_calidad` en `NO_EJECUTADO`, nunca `COMPLETADO`.
     - `obtenerComparativoSeguridadHumanaPdd`: cuando el backend retorne 200 con `planes_pdd: []`, respetar el arreglo vacío y no sustituirlo por el canónico de 37B COP sin indicación.

3. **257-H15 (Baja · Pruebas Unitarias Aisladas de Red):**
   - En `src/features/alternativas/services/presupuesto-api.test.ts`: incorporar mock de `fetch` en las 2 pruebas que llamaban directamente a la red.
   - En `src/features/seguimiento/state/devolucion-store.test.ts`: verificar presencia de error ante fallo de transporte sin atarse a cadena literal exacta bloqueada por guardas de red.

4. **257-H16 (Media · Historias Storybook y Accesibilidad Axe):**
   - En `src/app/_stories/plataforma-interna.stories.tsx`: usar `findAllByRole` con timeout en historias asíncronas de formularios (`FormulariosFacilitador`, `FormulariosAuditor`).
   - En `src/features/seguimiento/components/motor-plan-accion-tab.tsx`: ajustar clases de contraste en la tabla para cumplir la relación de contraste WCAG AA 4.5:1.
