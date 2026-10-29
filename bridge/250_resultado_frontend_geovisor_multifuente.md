# Coordinación 250 — Resultado de Integración del Banco Multifuente en el Geovisor Territorial

**Fecha:** 27 de octubre de 2026  
**Responsables:** Coordinación de Política Pública y Sistemas EAF (`agy`) & Ingesta Territorial / Backend (`agy2`)  
**Estado:** COMPLETADO, VERIFICADO Y EN PRODUCCIÓN  

---

### 1. Resumen Ejecutivo
Se dio cumplimiento integral al requerimiento del usuario sobre la visualización de fuentes en el Geovisor Territorial (`/geovisor`). Anteriormente la interfaz web mostraba únicamente las estadísticas de hurtos SIEDCO. Mediante la Coordinación 250 se integraron y activaron las 13 capas geográficas y el catálogo completo de 2.449 observaciones de las 28 fuentes oficiales en las 7 dimensiones de Seguridad Humana.

---

### 2. Entregables y Componentes Implementados

#### A. Backend (`agy2`)
- **Parámetro de búsqueda de texto:** Implementado parámetro `busqueda` en `GET /api/v1/geodatos/indicadores` (búsqueda insensible a mayúsculas sobre `nombre_indicador` y `codigo_indicador`).
- **Filtros completos:** `dimension`, `fuente_datos`, `codigo_territorio`, `territorio_id`, `anio_corte`, `limit`, `offset`.
- **Catálogo de Capas:** `GET /api/v1/geodatos/capas` (13 capas activas: 7 base + 6 oficiales temáticas).
- **Pruebas:** 8 de 8 tests pasando en `backend/tests/test_geodatos_fuentes.py`. Formato y lint con `ruff` 100% verde.
- **Despliegue:** `polis-backend.service` reiniciado y verificado en `127.0.0.1:8000`.

#### B. Frontend (`agy`)
- **Modelos:** Tipado de `IndicadorMultifuente`, `IndicadorFiltros`, `RespuestaIndicadores` y ampliación de `CapaEspacial` en `src/features/geovisor/models/geovisor.ts`.
- **Servicios API:** Funciones `listarIndicadores` y `listarIndicadoresTerritorio` en `src/features/geovisor/services/geovisor-api.ts`.
- **React Query Hooks:** `useIndicadoresGeovisor` y `useIndicadoresTerritorio` en `src/features/geovisor/services/use-geovisor-queries.ts`.
- **Nuevo Componente:** `GeovisorMultifuentePanel` en `src/features/geovisor/components/geovisor-multifuente-panel.tsx` con:
  - Chips para las 7 dimensiones de Seguridad Humana con contadores reales.
  - Buscador reactivo por palabras clave.
  - Selector de entidades oficiales (DANE, Medicina Legal, Policía Nacional, Fiscalía SPOA, DNP TerriData, RUV Víctimas, ICBF, INS, Defensoría).
  - Selector territorial (Distrito de Cartagena, Localidades 1, 2 y 3).
  - Tarjetas de indicadores con valor, unidad de medida, badge de nivel de riesgo semántico, año de corte y enlaces a fuentes oficiales web (`url_fuente`).
  - Paginación dinámica y contador de resultados.
- **Panel de Capas Dinámico:** `GeovisorControles` adaptado para consumir las 13 capas de la API agrupadas por categoría temática y acceso directo al Banco Multifuente.
- **Barra de Trabajo SIG:** `GeovisorWorkbenchBar` enriquecida con botón destacado «Banco Multifuente» y atribución completa a las 28 fuentes oficiales.
- **Registro y Layout Store:** Vista `fuentes` registrada en `geovisor-layout-store.ts` y `geovisor-view-registry.ts`.
- **Pruebas Frontend:** 154 de 154 tests pasando al 100% (`bun test src/features/geovisor/`).
- **Compilación de Producción:** `bun run build` exitoso (210 rutas estáticas generadas).
- **Despliegue:** `polis-frontend.service` reiniciado y respondiendo con HTTP 200 en `https://seguridadhumanaintegral.org/geovisor`.
