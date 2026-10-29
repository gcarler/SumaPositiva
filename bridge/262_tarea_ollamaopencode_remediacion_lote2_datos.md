# Encargo 262: Remediación Lote 2 Datos y Geodatos — Contratos de Cruce e Isócronas

**Fecha:** 28 de octubre de 2026  
**Responsable:** OllamaOpencode (`=ollamaopencode:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Módulos:** `backend/app/modules/compromisos/`, `backend/app/modules/geodatos/`, `src/features/seguimiento/`  
**Entregable:** `bridge/262_entrega_ollamaopencode_remediacion_lote2_datos.md`

---

## 1. Objetivos Técnicos

1. **257-H08 (Media · Conciliación de Contratos DTO en Cruce de Lecturas):**
   - En `backend/app/modules/compromisos/schemas.py`:
     - Extender `CruzarTresLecturasSolicitud` para soportar opcionalmente filtros (`cuatrienio`, `vigencia`, `dependencia`, `fuente_financiacion`, `estado_semaforo`).
     - Extender `CruceTresLecturasRespuesta` para incluir `totales_evaluados: int = 0` y `resumen_semaforo: dict[str, int] = Field(default_factory=dict)`.
   - En `src/features/seguimiento/services/plan-accion-dnp-api.ts`:
     - Corregir endpoint en `cruzarTresLecturasApi` a `/api/v1/compromisos/triada/cruzar-lecturas`.
     - Si el backend devuelve respuesta vacía o con fallos, asegurar mapeo coherente con el tipo `CruzarTresLecturasRespuesta`.

2. **257-H14 (Media · Semántica de Isócronas y Filtros GeoJSON):**
   - En `backend/app/modules/geodatos/schemas.py`:
     - Agregar `metodo_calculo: str = Field(default="buffer_euclidiano_geodesico", description="Metodología de cálculo: buffer euclidiano/geodésico o ruteo en red vial")` a `IsocronaProperties`.
   - En `backend/app/modules/geodatos/router.py` y `repository.py`:
     - Soportar parámetros de filtrado en `/geodatos/territorios/geojson`: `tipo_territorio`, `busqueda`, `es_zona_sat`, `es_zona_etnica`.
