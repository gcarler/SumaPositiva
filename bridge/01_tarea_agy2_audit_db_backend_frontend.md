# Tarea AUD-19: Auditoría de Coherencia Base de Datos ↔ Backend ↔ Frontend

**Prioridad**: **ALTA**  
**Clasificación**: Auditoría pericial de integración fullstack (solo lectura)  
**Responsable**: agy2 (EDD)  
**Supervisor**: EAF  

---

## 1. Contexto

Se requiere una auditoría independiente de la cadena completa de datos de POLIS:

`PostgreSQL (bd_csh / polis_test)` ↔ `FastAPI (backend/app/modules/*)` ↔ `Frontend (src/features/*)`

Precedente: INV-MESAS demostró que `bd_csh` estuvo contaminada por pruebas, que `GET /mesas` exponía submesas y que una vista pública consumía una fuente distinta del cronograma oficial. Se busca detectar problemas equivalentes en todos los módulos.

## 2. Reglas inviolables

- **SOLO LECTURA**: no modificar código, no ejecutar migraciones, no escribir en `bd_csh` ni en `polis_test`. Solo SELECT / `\d` / GET.
- No tocar archivos de Codex (`noticias`, `testimonios`), no `git push`, no configurar remoto.
- Solo se permite commitear los documentos del puente (`bridge/`).

## 3. Alcance obligatorio

### 3.1 Base de datos ↔ Backend
1. Inventario de tablas por esquema en `bd_csh` (conteo de filas) vs modelos SQLAlchemy (`backend/app/modules/*/models.py`). Tablas sin modelo y modelos sin tabla.
2. Versión de Alembic en `bd_csh` vs `head` del repositorio. Listar migraciones pendientes (esperado: 0041–0043) y su efecto en endpoints que dependen de ellas.
3. Columnas del modelo vs columnas reales (nulabilidad, tipos, defaults). Duplicidades legadas (p. ej. `aforo_presencial`/`aforo_maximo`, `metadata`/`metadatos`, `dimension_principal_id`/`dimension_id` en `mesas_trabajo.mesas`).
4. Datos huérfanos, de prueba o sintéticos en `bd_csh` (patrones tipo `test`, `pytest`, `demo`, códigos hex aleatorios) en TODAS las tablas, no solo mesas.

### 3.2 Backend ↔ Frontend
5. Inventario de endpoints FastAPI (método + ruta + permiso) vs clientes HTTP del frontend (`src/features/*/services/*-api.ts`). Endpoints sin consumidor y llamadas del frontend a rutas inexistentes (404 potencial).
6. Para cada endpoint consumido: contrato DTO backend (`schemas.py`) vs tipos/normalizadores frontend. Campos que el frontend espera y el backend no envía (y viceversa).
7. Lugares donde el frontend aplica **fallback silencioso** a datos locales/constantes (`*.data.ts`, mocks, `fallback*`) ocultando fallos del backend. Clasificar: legítimo (contingencia explícita) vs. riesgo de mostrar datos falsos.
8. Fuentes duplicadas: vistas que muestran la misma entidad desde fuentes distintas (p. ej. `mesas` vs `agendas`, constantes TS vs tablas).

### 3.3 Verificación en vivo
9. Para cada módulo principal (mesas, agendas, aportes, formularios, políticas/líneas, actores, fuentes, alternativas, seguimiento/PAS, diagnóstico, geovisor, usuarios/sesión, participación multicanal): comparar `COUNT(*)` en BD vs longitud de la respuesta del endpoint público vs lo que renderiza el frontend. Reportar discrepancias.
10. Verificar permisos: endpoints de escritura sin RBAC o con política no declarada.

## 4. Entregable

- Informe en `bridge/02_entrega_agy2.md` bajo `### Entrega de Tarea AUD-19: Auditoría BD ↔ Backend ↔ Frontend`.
- Matriz por módulo con columnas: Módulo | Tabla(s) BD | Filas | Endpoint | Cliente FE | Estado (OK / Brecha / Riesgo) | Evidencia (archivo:línea o consulta).
- Lista priorizada de hallazgos (CRÍTICO / ALTO / MEDIO / BAJO) con evidencia verificable y recomendación concreta. **No corregir**: solo reportar.
- Commit local solo de documentos del puente y aviso al auditor al terminar.
