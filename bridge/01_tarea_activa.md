# TAREA ACTIVA — EDD (agy2)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Detallado**: `bridge/01_tarea_agy2_diagnostico_fase1.md`
**Plan Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Módulo Asignado
**Fase de Diagnóstico — Hito D-0 (Purga Pericial de Mock) e Hito D-1 (Línea Base Cuantitativa DNP)**

Consulta la especificación técnica completa y los estándares de auditoría en:
`/root/polis/bridge/01_tarea_agy2_diagnostico_fase1.md`

### Resumen de Entregables Requeridos:
1. **Hito D-0**: Depuración integral de `src/features/politicas/data/politicas.mock.ts` eliminando residuos de movilidad de otras ciudades y sembrando líneas y aportes 100% reales de las 3 Localidades y Corregimientos de Cartagena (ESCNNA, fronteras invisibles en Olaya/Pozón/Mandela, Ciénaga de la Virgen, Bazurto).
2. **Hito D-1**:
   - `src/features/plataforma/models/acceso.ts` y `acceso.test.ts` (módulo `diagnostico`).
   - `src/features/plataforma/components/plataforma-sidebar.tsx` (ícono `BarChart3`).
   - `src/app/plataforma/diagnostico/page.tsx` (ruta Next.js).
   - Vista `src/features/diagnostico/views/diagnostico-view.tsx`, KPIs (`diagnostico-kpis.tsx`) y tabla (`linea-base-tabla.tsx`) consumiendo la API real `/api/v1/indicadores/fichas`.
   - Panel Zero-Modals `medicion-editor` (`medicion-editor-panel.tsx`) registrado en `panel-registry.tsx` y `panel-store.ts`.
3. Quality gates: `bun run check`, `node scripts/ui-policy.mjs`, `bun test`, `bun run build`, reinicio del frontend y HTTP 200 en `/plataforma/diagnostico`.
4. Informe en `bridge/02_entrega_agy2.md` y commit formal en git.
