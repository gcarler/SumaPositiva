# DICTAMEN EAF — [GEO-HURTOS-01] Ingesta y visualización de hurtos 2018-2026

**Auditor:** `agy` — **Commit evaluado:** `e1ee580` — **Fecha:** 13-oct-2026
**Dictamen:** ⚠️ **APROBADO CON RESERVAS** (2 correcciones obligatorias, sin retirar de producción)

## Verificado de forma independiente
- Censo `bd_csh` intacto: 33 / 36 / 11 / 17.
- Datos: `estadisticas_hurtos` = 12.280 filas (motocicleta 2.520, residencias 3.853, comercio 5.907), 18.242 casos; **coinciden con el conteo propio del auditor sobre los .zip originales** (motos: 4.683 casos).
- Alembic: cabeza única `0061_analitica_hurtos`; `alembic check` sin drift. 3 capas nuevas en `capas_geovisor`.
- Producción: servicios activos; `/`, `/geovisor`, health y los 2 endpoints nuevos en 200 (5–40 ms; geojson 133 KB < 150 KB).
- Seguridad: consultas parametrizadas (intento de inyección en `delito` devuelve 0 casos sin daño); `anio` inválido → 422.
- Pruebas: 107 pytest pasan (analítica, geovisor, geodatos); 66 pruebas bun del geovisor pasan.

## Reservas (obligatorias)
1. **R1 — Falla la guarda de política de acceso.** `tests/test_access_policy.py::test_matriz_cubre_todas_las_rutas_y_sus_controles` **falla**: los endpoints `GET /api/v1/geodatos/analitica/hurtos/resumen` y `/geojson` no están en la matriz de rutas. El informe de agy2 no menciona esta prueba. Corregir: registrarlos en la matriz con su control y motivo (decisión pendiente: público como el resto de `/geodatos/*` o con permiso `geovisor:leer`; documentar el motivo). La prueba debe quedar en verde.
2. **R2 — Texto corrupto en origen.** 312 registros de `clase_sitio` contienen el carácter de reemplazo `�` (`CALLEJ�N` 290, `CABA�A` 9, `CA�OS` 5, `CENTRO TUR�STICO`, `ZONA SELV�TICA`, `TRANSPORTE P�BLICO`, `SEM�FORO`). Se ve en las gráficas. Normalizar con diccionario explícito (CALLEJÓN, CABAÑA, CAÑOS, TURÍSTICO, SELVÁTICA, PÚBLICO, SEMÁFORO) en la ingesta y corregir las filas ya cargadas **solo de esta tabla nueva** (UPDATE aditivo, con respaldo previo). Revisar `armas_medios` y `dia_semana` por el mismo defecto.

## Observación
El conjunto de pruebas completo del backend no fue ejecutado por agy2 (solo subconjuntos); ejecutar la suite completa tras R1.
