# Tarea EDIT-07: Alineación de Rutas y Esquemas en Participación Multicanal

**Prioridad**: **ALTA** (Corrección de Integración API / Erradicación de HTTP 404)  
**Clasificación**: Frontend Data Integration & API Alignment  
**Responsable**: agy2 (EDD)  
**Supervisor**: EAF  

---

## 1. Diagnóstico Pericial del Hallazgo

En la auditoría forense de conectividad Frontend ↔ Backend se detectó un desfase crítico en el servicio de participación multicanal:

1. **Rutas Desalineadas en `src/features/participacion/services/participacion-api.ts`**:
   - `obtenerDesgloseWeb()` invoca `apiFetch("/participacion/web")` -> **HTTP 404 Not Found**. El endpoint canónico en FastAPI es `/api/v1/participacion/canal-web`.
   - `obtenerDesgloseMesas()` invoca `apiFetch("/participacion/mesas")` -> **HTTP 404 Not Found**. El endpoint canónico en FastAPI es `/api/v1/participacion/canal-mesas`.
   - `listarEscenarios()` y `guardarEscenario()` invocan `apiFetch("/participacion/escenarios")` -> **HTTP 404 Not Found**. El endpoint canónico en FastAPI es `/api/v1/participacion/escenarios-especiales`.

2. **Disparidad de Tipos y DTOs en `src/features/participacion/models/participacion.ts`**:
   - El modelo del frontend define propiedades como `totalCartageneros`, `participacionWeb`, `participacionMesas`, mientras que el contrato Pydantic del backend (`backend/app/modules/participacion/schemas.py`) retorna:
     - `gran_total_participantes_distrital`
     - `participantes_unicos_identificados`
     - `total_canal_web`
     - `total_canal_mesas`
     - `total_canal_escenarios`
     - `porcentaje_canal_web`, `porcentaje_canal_mesas`, `porcentaje_canal_escenarios`
     - `desglose_territorial_agregado`
     - `fecha_corte`

3. **Panel Afectado (`src/features/participacion/panels/participacion-multicanal-panel.tsx`)**:
   - Al abrir este panel, las pestañas de canal web, mesas y escenarios fallan silenciosamente o arrojan error 404, impidiendo visualizar el desglose real persistido en PostgreSQL.

---

## 2. Alcance y Especificación Técnica

1. **Alineación de Endpoints en `src/features/participacion/services/participacion-api.ts`**:
   - Corregir rutas relativas para apuntar a:
     - `GET /participacion/consolidado`
     - `GET /participacion/canal-web`
     - `GET /participacion/canal-mesas`
     - `GET /participacion/canal-escenarios` (y/o `/participacion/escenarios-especiales`)
     - `POST /participacion/escenarios-especiales`

2. **Normalización de Modelos y Tipado en `src/features/participacion/models/participacion.ts`**:
   - Actualizar las interfaces TypeScript para que reflejen fielmente el contrato de `backend/app/modules/participacion/schemas.py`, o bien implementar un mapeador robusto en `participacion-api.ts` que adapte la respuesta del backend a la UI preservando compatibilidad.

3. **Actualización del Panel Reactivo (`participacion-multicanal-panel.tsx`)**:
   - Sincronizar el renderizado de métricas con los nombres canónicos (`gran_total_participantes_distrital`, etc.).
   - Asegurar manejo correcto de estados `loading`, `error` y banners honestos si el backend no responde.

4. **Pruebas Automatizadas**:
   - Crear suite de pruebas unitarias `src/features/participacion/services/participacion-api.test.ts` con cobertura de llamadas exitosas y control de contingencia ante fallos.

---

## 3. Criterios de Aceptación Forense

1. `bun run check` (UI policy, TypeScript estricto, ESLint) pasa con **0 errores y 0 advertencias**.
2. `bun test` aprueba todas las pruebas de frontend incluyendo las nuevas de participación.
3. El panel `ParticipacionMulticanalPanel` renderiza los 179 aportes reales en el canal web y los datos distritales sin arrojar ningún error 404 en consola.
4. **Regla de Aislamiento de Codex**: Cero modificaciones a los archivos de `noticias` y `testimonios`.
5. **Regla de Base de Datos**: Cero ejecuciones sobre `bd_csh`; pruebas solo sobre `polis_test` o mocks.
6. Commit atómico con rutas explícitas:
   `git commit -m "feat(participacion): alinear endpoints de participacion multicanal con backend y normalizar DTOs (EDIT-07)"`
7. Notificar por tmux al concluir:
   `tmux send-keys -t agy "He terminado EDIT-07. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
