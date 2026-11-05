# Tarea 296 — Auditoría del catálogo de indicadores y página /indicadores

**Solicitante:** ollamacodex  
**Auditor:** agy  
**Estado:** PENDIENTE DE AUDITORÍA  
**Corte:** 2026-11-05  
**Alcance:** QA funcional y metodológico del catálogo municipal de indicadores y de su visor público  
**Restricción:** no hay commit ni push todavía

## 1. Objetivo

Auditar antes de comitear/desplegar:

1. la exposición del catálogo validado de indicadores en el backend;
2. la página `/indicadores`;
3. la integración de menú en topbar, sidebar y footer;
4. la correspondencia con los 24 indicadores del catálogo y sus metadatos;
5. el cumplimiento del contrato metodológico (sin cálculo de valores, sin estados publicables);

## 2. Archivos y rutas afectadas

### Backend

- `backend/app/modules/indicadores/schemas.py`
- `backend/app/modules/indicadores/router.py`
- `backend/app/modules/indicadores/catalogo_polis.py`
- `data/capas_analiticas/catalogo_indicadores/catalogo.csv`
- `data/capas_analiticas/catalogo_indicadores/00_linea_base.md`
- `data/capas_analiticas/catalogo_indicadores/00_cobertura_fuentes.csv`
- `scripts/validar_catalogo_indicadores.py`
- `bridge/295_entrega_ollamacodex_indicadores_etapa1.md`

### Frontend

- `src/app/indicadores/page.tsx`
- `src/features/indicadores/services/indicadores-catalogo-api.ts`
- `src/features/indicadores/services/use-indicadores-catalogo.ts`
- `src/features/indicadores/views/indicadores-catalogo-view.tsx`
- `src/app/_components/topbar.tsx`
- `src/app/_components/sidebar-institucional.tsx`
- `src/shared/layout/footer.tsx`
- `src/core/navigation/navigation-store.ts`

## 3. Puntos de auditoría solicitados

1. **Contrato metodológico**
   - 24 indicadores, 22 Tier A y 2 Tier C.
   - Campos obligatorios presentes: código, nombre, dimensión, definición, fórmula, numerador, denominador, unidad, tipo territorial, periodicidad, tipo de periodo, fuente, URL, custodio, licencia, año base, interpretación, riesgo metodológico, tier y estado.
   - `estado=no_publicable`.
   - No hay cálculo de valores en el backend.

2. **API**
   - `GET /api/v1/indicadores/catalogo` responde 200.
   - `total=24`.
   - `archivo_sha256=65dfaa44e12e3557db934543b28eab331396aac1049bdf319471fcb88d4f10b1`.
   - La salida respeta el catálogo sin transformarlo.

3. **Página /indicadores**
   - La ruta responde y renderiza el catálogo.
   - El filtrado por dimensión, tier y búsqueda funciona sin romper los datos.
   - No se muestran cifras inventadas ni estados publicables.

4. **Navegación**
   - El topbar tiene enlaces a `/indicadores`.
   - El sidebar institucional incluye el submenú “Catálogo de indicadores”.
   - El footer también apunta al catálogo.

5. **Calidad**
   - `bun run check` pasa.
   - No hay errores de TypeScript ni ESLint.
   - No hay regresiones de accesibilidad.

## 4. Criterios de aceptación

- Auditoría funcional y metodológica aprobada.
- Ningún defecto bloqueante pendiente.
- Ningún dato inventado.
- No se publica nada a producción antes del dictamen de agy.

## 5. Entrega esperada

`bridge/296_entrega_agy_auditoria_catalogo_indicadores.md`
