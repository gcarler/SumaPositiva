# AUD-14 (CRÍTICA) — Datos personales y cifras no verificadas en catálogos del frontend; matriz de barrido de AUD-13 no confiable

## Hallazgo (EAF, verificado leyendo los archivos)
La matriz de barrido entregada en AUD-13 clasifica casi todo `src/**/data/*.data.ts` como "Trazable" con justificaciones genéricas ("Registro distrital de JAC", "SISBEN IV", "Proyecciones DANE") **sin evidencia**. Muestreo EAF:
1. `src/features/actores/data/actores-iniciales.data.ts` (504 líneas, 20 actores): nombres de personas ("Donaldo Cárdenas Ramos"…), teléfonos (+57 312 678 9012), correos (@cartagenacomunitaria.org), direcciones, nº de propuestas radicadas, mesas asistidas, posturas. Es el **estado inicial real del store** (`actores-store.ts` l.59 y l.107). Datos personales aparentemente ficticios presentados como reales; si fueran reales, serían PII publicada sin base legal (Ley 1581/2012).
2. `src/features/diagnostico/data/indicadores-fallback.data.ts`: `valor_actual: "28.7500"`, `porcentaje_avance: "50.00"`… `indicadores-api.ts` l.44/47/60 devuelve este fallback ante fallo de la API → mediciones inventadas visibles (misma falta que OBS-02, reintroducida por la puerta del fallback).
3. `geovisor/data/estadisticas.data.ts`: homicidios 410, hurtos 6.493, por localidad, "fuente: Policía Nacional / Cartagena Cómo Vamos" sin enlace ni documento; `mesas-geovisor`, `territorios-diagnostico` (910 líneas, cifras de vulnerabilidad), etc.

## Acción
1. Para CADA archivo `src/**/data/*.data.ts` (y fixtures de store): abrirlo, listar los datos factuales (personas, contactos, cifras, fechas, URLs, coordenadas) y clasificar con EVIDENCIA (cita de documento del repo o URL oficial verificada) en: oficial verificable / catálogo metodológico (sin cifras factuales: OK) / demo / eliminar. "Trazable" sin cita concreta = no aceptado.
2. **Actores:** eliminar del código toda PII (nombres de personas, teléfonos, correos, direcciones). El módulo debe leer de backend (si no existe persistencia de actores, crearla: tabla + API + auditoría, migración 0040+, y datos reales solo los que la Alcaldía/equipo cargue). Estado inicial = vacío con CTA "Registrar actor". Cualquier demo → script dev con `es_demostracion=true`, nombres genéricos ("Actor demo 01"), sin teléfonos/correos, badge DEMO.
3. **Indicadores fallback:** ante fallo de API NO devolver mediciones: devolver fichas sin `valor_actual`/% (estructura canónica, "Sin medición") o error explícito.
4. **Cifras estadísticas:** conservar solo las que tengan fuente documental verificable en `docs/` o URL oficial con fecha de consulta; el resto → "Sin dato verificado". Mostrar fuente + fecha junto a cada cifra en UI.
5. Test que escanee `src/**/*.data.ts` buscando patrones de PII (`telefono`, `email`, `+57`, `@`) y falle.
6. Entregar matriz con evidencia real (columna "Evidencia: archivo/línea o URL").

## Criterio de aceptación
- grep de PII en `src/` sin resultados; actores sin datos inventados; fallback de indicadores sin cifras.
- Quality gates completos + pytest con BD de prueba (si hay backend nuevo).
- Al terminar: `tmux send-keys -t agy "He terminado AUD-14. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
