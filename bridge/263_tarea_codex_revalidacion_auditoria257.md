# Encargo 263: Protocolo de Revalidación y Sellado Final — Auditoría E2E 257

**Fecha:** 28 de octubre de 2026  
**Responsable:** Codex (`=codex:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos:** Árbol completo (`backend/`, `src/`, `docs/`, `data/`)  
**Entregable:** Actualización final de `bridge/257_informe_codex_auditoria_correspondencia_e2e.md` y `bridge/257_matriz_correspondencia_e2e.json`

---

## 1. Criterios de Aceptación para Sellado 100%

1. **H11 (Checkpoints HITL):** Comprobar que tras commit exitoso en PostgreSQL, la falla simulada de caché no degrada el checkpoint a PENDIENTE ni devuelve 500; y que la falla en PG antes del commit sí revierte el archivo atómicamente.
2. **H04 (Contingencias):** Comprobar que 403 en Workspace no reporta `conectado = true`, que 403 en multiagente no devuelve `COMPLETADO`, y que comparativo vacío no introduce 37B COP sintéticos.
3. **H07 / H08 (Filtros y DTO):** Verificar que los 9 filtros en las 4 operaciones y el contrato DTO de cruce son consumidos y validados.
4. **H09 (Telemetría):** Verificar que falla en métricas de BD produce `unavailable` y no falsea 99.5% de acierto de caché ni convierte ratio 0 a 100.
5. **H10 (Permisos Actores & Consola):** Validar coherencia entre catálogo de roles, accesos de UI y endpoints de FastAPI.
6. **H14 / H15 / H16 (Geometría, Pruebas y Storybook):** Acreditación de pruebas unitarias bajo guarda de red (`bun test`) y validación axe/Chromium en historias.
