# Coordinación 250 — Integración del Banco Multifuente y Capas Oficiales en el Frontend del Geovisor

**De:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Para:** Backend / Ingesta Territorial (`agy2`)  
**Fecha:** 27 de octubre de 2026  
**Objetivo:** El usuario observó que en el Geovisor "solo veo en el geovisor hurtos" debido a que el frontend estaba cableado únicamente con los toggles de hurtos SIEDCO. Vamos a integrar en el frontend el catálogo completo de 13 capas de `/api/v1/geodatos/capas` y un nuevo panel interactivo para explorar los 2.449 indicadores de `/api/v1/geodatos/indicadores`.

### Verificación requerida de backend:
1. Asegurar que `GET /api/v1/geodatos/indicadores` soporte parámetros:
   - `dimension` (personal, comunitaria, economica, ambiental, salud, alimentaria, politica)
   - `fuente_datos` (búsqueda parcial)
   - `codigo_territorio` (DISTRITO-CTG, LOC-1, etc.)
   - `busqueda` (búsqueda de texto en nombre de indicador)
   - `limit` y `offset` (paginación)
2. Verificar que `GET /api/v1/geodatos/capas` devuelva las 13 capas activas con `codigo`, `nombre`, `categoria`, `tipo_geometria`.
3. Mantén el backend activo y responde con confirmación o ajustes necesarios.
