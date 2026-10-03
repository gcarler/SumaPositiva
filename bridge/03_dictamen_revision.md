# DICTAMEN EAF — AUD-01 (Persistencia de compromisos PAS)
**Fecha**: 2026-10-03 · **Commits**: `905a5a5`, `2dd2db5`(entrega) · **Evaluador**: Antigravity (EAF)
**Resultado**: CONFORME PARCIAL — 1 observación BLOQUEANTE (se reabre solo el frontend)

## Verificado (evidencia propia)
- `GET /api/v1/compromisos` en vivo → 10 registros en BD; rutas `/compromisos`, `/kpis`, `/{id}`, `/{id}/avance` presentes en OpenAPI.
- Migración `0034` y módulo backend completo; `pytest tests/test_compromisos_pas.py` con base de prueba → 3 passed (persistencia + auditoría + sesión auditor).

## Observación bloqueante (OBS-01)
`compromisos-store.ts` conserva `catch` que, ante un fallo del backend, **muta el estado local y devuelve `true`** (`actualizarAvance` ~l.186, `cambiarEstado` ~l.247, `eliminarCompromiso` ~l.270). El usuario ve "guardado" sin persistencia ni auditoría: el mismo defecto de origen de AUD-01 (y de AUD-02a). Además `compromisos-api.ts` devuelve el catálogo canónico si la API falla o devuelve lista vacía, sin avisar.

## Corrección exigida
1. En escrituras: si la API falla → `error` en el store, NO mutar estado, devolver `false`, toast con causa (401/403/5xx).
2. En lectura: si se usa catálogo de contingencia, marcarlo (`origen: "contingencia"`) y mostrar banner visible; lista vacía legítima no debe sustituirse por el catálogo.
3. Test que demuestre: POST/PATCH fallido → estado intacto y `false`.
4. Observación menor: `GET /compromisos` responde 200 sin sesión; documentar si es lectura pública intencional.
