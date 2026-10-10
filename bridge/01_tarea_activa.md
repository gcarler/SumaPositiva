# TAREA ACTIVA: [AUD-SYNC-01] AUDITORÍA Y SINCRONIZACIÓN DE HILACIÓN BIDIRECCIONAL (FRONTEND ⇄ BACKEND)

**Fecha:** 2026-10-10  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Requerimiento Expreso de la Supervisión ("haz un plan y le dices a agy2 que lo ejecute. Necesito que revisemos que todo lo que esté en el Frontend esté en el backend. es decir Que todo esté hilado. pero también necesito que revises que todo lo que esté en el backend esté en el frontend.")  
**Severidad:** ALTA / ESTRATÉGICA (Integridad Operativa, Consistencia de Datos, Cero Mocks y Exposición Completa de Capacidades)

---

## 🎯 1. Fundamento y Objetivo General

El propósito de esta orden es garantizar la **hilación bidireccional perfecta y verificada** entre el Frontend (Next.js 15 / React 19 / Turbopack) y el Backend (FastAPI / SQLAlchemy / PostgreSQL `bd_csh`):

1. **Frontend $\rightarrow$ Backend (Todo lo que está en Frontend está respaldado en Backend):**
   - Toda pantalla, formulario, botón, acción y cálculo en el Frontend debe conectarse a endpoints reales de FastAPI y persistir en la base de datos PostgreSQL.
   - Cero mocks en producción, cero cálculos locales desconectados cuando el backend provee la métrica agregada, cero mutaciones optimistas que no sincronicen con el servidor.

2. **Backend $\rightarrow$ Frontend (Todo lo que está en Backend está expuesto en Frontend):**
   - Todo router, endpoint, modelo y capacidad del Backend debe ser accesible, visible y operable en la interfaz de usuario para los roles pertinentes.
   - Cero endpoints huérfanos o capacidades construidas en FastAPI que queden ocultas sin un botón, panel o vista en la plataforma.

---

## 🛡️ 2. Salvaguardas y Restricciones Inviolables

1. **Preservación Inviolable de `BPIN`:** Bajo ninguna circunstancia modificar, alterar o eliminar el acrónimo `BPIN` (Banco de Programas y Proyectos de Inversión Nacional). Es una orden taxativa del usuario.
2. **Cero Acrónimos Ajenos:** Mantener erradicadas al 100% las siglas `DNP`, `MGA` y `SINERGIA`. Limpiar cualquier docstring o identificador residual en código. Usar la terminología canónica institucional (*Árbol Causal, Metodología de Planificación, Matriz de Diagnóstico, Documento de Política Pública Distrital*).
3. **Protocolo Zero-Push:** Trabajar exclusivamente con commits locales atómicos en la rama `main`. Queda terminantemente prohibido hacer `git push`.
4. **UI-Policy Estricta:** No usar elementos HTML nativos `<button>` o `<input>` en JSX; utilizar siempre los componentes base de `@/shared/ui/` (`Button`, `Input`, `Select`, etc.).
5. **Preservación de Datos Canónicos:** Mantener intactas las 33 agendas/mesas territoriales de Cartagena de Indias y la integridad referencial en `bd_csh`.

---

## 📋 3. Plan de Ejecución por Fases

### Fase 1: Matriz Pericial de Cobertura Bidireccional (Inventario Exhaustivo)
`agy2` debe documentar en `bridge/02_resultado_agy2.md` la matriz completa cruzada de los 22 módulos de FastAPI (174 endpoints) frente a los servicios y vistas del Frontend:
- **Módulos Backend:** `actores`, `alternativas`, `aportes`, `auditoria`, `compromisos`, `comunicaciones`, `evidencia`, `formularios`, `fuentes`, `geodatos`, `health`, `ia`, `identidad`, `indicadores`, `instrumentos`, `mesas`, `noticias`, `participacion`, `politicas`, `presupuesto`, `sesion`, `testimonios`.
- **Módulos Frontend:** `src/features/**/services/*-api.ts`, `panels/`, `views/`, y páginas de `src/app/`.

---

### Fase 2: Hilación Frontend $\rightarrow$ Backend (Consumo Real y Erradicación de Gaps)

1. **Actores Estratégicos — KPIs Reales del Servidor:**
   - **Situación:** El frontend (`ActoresKpis`) calcula métricas en memoria (`useActoresMetricas`) ignorando el endpoint `GET /api/v1/actores/kpis`.
   - **Acción:** 
     - Crear `obtenerKpisActoresApi()` en `src/features/actores/services/actores-api.ts` consumiendo `GET /api/v1/actores/kpis`.
     - Integrar la consulta en `ActoresKpis` para que refleje el conteo real consolidado por tipo, territorio y postura del backend.

2. **Formularios Dinámicos — Analítica Agregada de Servidor:**
   - **Situación:** `useFormularioAnalitica` calcula métricas descargando todas las respuestas en cliente y ejecutando `calcularAnalitica`.
   - **Acción:**
     - Conectar `obtenerAnaliticaFormulario` con el endpoint server-side `GET /api/v1/formularios/{id}/analitica`.
     - Mantener fallback determinista solo si el formulario aún no tiene respuestas procesadas.

3. **Diagnóstico y Árbol Causal — Nomenclatura Limpia y Persistencia:**
   - **Situación:** Existen referencias residuales a `mga` en nombres de archivos y types en `src/features/diagnostico/` (`validacion-mga-panel.tsx`, `mga.ts`, etc.), y docstrings en `backend/app/modules/ia/router.py`.
   - **Acción:**
     - Limpiar los docstrings en `backend/app/modules/ia/router.py` (líneas 73 y 80) retirando `DNP / MGA`.
     - Refactorizar en frontend a nomenclatura canónica (`arbol_causal`, `validacion-causal-panel.tsx`), manteniendo la conexión estricta con `/api/v1/instrumentos/*`.

---

### Fase 3: Hilación Backend $\rightarrow$ Frontend (Exposición de Capacidades Huérfanas en UI)

1. **Cierre Oficial y Firma de Acta de Mesa (SHA-256):**
   - **Endpoint Backend:** `POST /api/v1/mesas/{mesa_id}/acta/cerrar`.
   - **Situación:** El backend cuenta con la lógica completa para cerrar el acta, sellar deliberaciones, calcular hash SHA-256 e inmutabilizarla, pero en `mesa-acta-panel.tsx` solo existía guardado de borrador.
   - **Acción:**
     - Añadir en `src/features/mesas/services/mesas-api.ts` la función `cerrarActaOficial(mesaId: string, datos?: { resumen?: string })`.
     - Añadir en `src/features/mesas/panels/mesa-acta-panel.tsx` el botón institucional *"Cerrar y Certificar Acta Oficial"*, con diálogo de confirmación, validación de permisos de facilitador/coordinador y visualización del hash SHA-256 generado.

2. **Curaduría y Moderación de Evidencias Fotográficas de Mesas:**
   - **Endpoints Backend:**
     - `GET /api/v1/mesas/fotos/pendientes`
     - `POST /api/v1/mesas/fotos/{foto_id}/revision`
     - `GET /api/v1/mesas/fotos/{foto_id}/revision/archivo`
   - **Situación:** Los participantes y facilitadores pueden subir fotos en las mesas (`POST /api/v1/mesas/{id}/fotos`), pero la curaduría institucional solo moderaba testimonios de texto, dejando las fotos pendientes sin interfaz de revisión.
   - **Acción:**
     - Crear funciones en `src/features/evidencias/services/evidencias-api.ts` para listar fotos pendientes y emitir dictamen de moderación (aprobada/rechazada con motivo ético).
     - Incorporar en el panel de moderación (`TestimoniosModeracionPanel` o tab de curaduría de evidencias) una pestaña para *"Fotos de Mesas Territoriales"*, permitiendo previsualizar la foto y aprobarla o rechazarla.

3. **Orquestador Multi-Agente del Ciclo de Vida de Política:**
   - **Endpoint Backend:** `POST /api/v1/ia/ciclo-politica`.
   - **Situación:** El motor de IA cuenta con `PolicyLifecycleGraph` (LangGraph / PydanticAI) para evaluar los 6 nodos del ciclo de política, pero no estaba expuesto en la interfaz de gestión de fases.
   - **Acción:**
     - Exponer `ejecutarCicloPoliticaIA()` en `src/features/politicas/services/politicas-api.ts`.
     - Añadir un control en `fases-control-panel.tsx` (*"Diagnóstico Integral Multi-Agente"*), que envíe el problema central y líneas de acción, mostrando el veredicto del grafo multi-agente en pantalla.

4. **Georreferenciación Territorial Inversa (Búsqueda por Coordenada):**
   - **Endpoint Backend:** `GET /api/v1/geodatos/territorios/buscar-por-coordenada`.
   - **Situación:** El endpoint permite ubicar el barrio o corregimiento a partir de latitud/longitud, pero no estaba conectado a los eventos de clic del mapa en Geovisor.
   - **Acción:**
     - Exponer `buscarTerritorioPorCoordenada(lat, lon)` en `src/features/geovisor/services/geovisor-api.ts`.
     - Integrar en el hook de mapa para que al hacer clic en un punto sin polígono previo cargue automáticamente la ficha del territorio correspondiente.

---

### Fase 4: Quality Gates y Verificación E2E de Punta a Punta

1. **Verificación de Tipos:**
   - `bun run check` (0 errores TypeScript en todo el proyecto).
2. **Suite de Pruebas Frontend:**
   - `bun test` (mínimo 367 tests pasando, 0 fallos).
3. **Suite de Pruebas Backend:**
   - `/root/polis/venv/bin/pytest backend/tests -q` (aprobación completa).
4. **Compilación de Producción:**
   - `bun run build` (build Turbopack standalone limpio, 190+ rutas generadas).
5. **Pruebas en Vivo (Hot-Verification):**
   - Reiniciar servicios systemd (`systemctl restart polis-backend polis-frontend`).
   - Validar con `curl -s http://localhost:8000/api/v1/health/live` (200 OK).
   - Validar con `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/plataforma` (200 OK).

---

## 📦 4. Entregables y Protocolo de Cierre

1. **Informe Pericial en `bridge/02_resultado_agy2.md`:**
   - Matriz de trazabilidad 174 endpoints Backend $\leftrightarrow$ Frontend.
   - Detalle de los gaps resueltos en Frontend $\rightarrow$ Backend y Backend $\rightarrow$ Frontend.
   - Registro de ejecución de Quality Gates (check, bun test, pytest, build).
2. **Commit Atómico Local:**
   - Un commit claro en `main` siguiendo convención: `feat(sync): hilacion bidireccional integral frontend backend AUD-SYNC-01`.
   - Cero `git push`.
3. **Notificación a `agy`:**
   - Dejar la terminal lista y notificar para la contra-auditoría pericial.
