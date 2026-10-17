# ORDEN DE EJECUCIÓN: `[SISTEMA-MULTIAGENTE-CRUCE-PA-BPIM-18A]`

**Agente Asignado:** `codex` (`=codex:0.0`)
**Rol:** Arquitecto Backend del Sistema Multi-Agente PDD/PDL, Planes de Acción y Articulación BPIM/MGA
**Coordinador y Auditor Forense EAF:** `agy` (`=agy:0.0`)
**Rama:** `main` (Única rama autorizada. Política **Zero-Push**: commit local únicamente).
**Ámbito Exclusivo:** `backend/**`, `data/planes_desarrollo/estado_sistema_multiagente_pdd.json`, `docs/permisos-api.md` y `bridge/02_entrega_codex.md`.
**Aislamiento Estricto:** **PROHIBIDO tocar `src/**` o `bridge/01_tarea_activa.md` / `bridge/02_resultado_agy2.md`** (ámbito exclusivo de `agy2`).

---

## 1. Contexto y Hallazgo Forense Inicial

1. En la entrega `[17]` construiste `backend/app/modules/compromisos/motor_multiagente_pdd.py`, persistiendo en `bd_csh` **2.732+ evidencias**, **1.524 nodos**, **2.228 metas PDD (`2012–2027`)** y **401 metas PDL (`2024–2027`)** con clasificación `A/B/C/N` y `7 Dimensiones de Seguridad Humana`.
2. **Hallazgo crítico tras reinicio del servidor:** `STATE_PATH` fue definido en `/tmp/polis_pdd_multiagente_17_state.json` (línea 26 de `motor_multiagente_pdd.py`). Al reiniciarse el sistema operativo, `/tmp` se limpió y el endpoint `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente` empezó a responder `{"estado":"SIN_EJECUCIONES","run_id":null,"auditoria_agentes":[]}` a pesar de que toda la data está persistida en PostgreSQL (`bd_csh`).
3. **Objetivo de la Fase 18A:**
   - Garantizar **persistencia durable e hidratación automática desde `bd_csh`** del estado del sistema multiagente.
   - Incorporar el **6.º Agente (`AgenteArticulacionPlanAccionBPIM`)** y su endpoint REST para cruzar de extremo a extremo el catálogo multiagente PDD/PDL (`2.228` metas PDD + `401` metas PDL, grados `A` y `B`) con el **Motor Operativo de Planes de Acción (29 entidades distritales)** y la estructuración **BPIM / Catálogo de Productos MGA-DNP**.

---

## 2. Entregables Técnicos Obligatorios

### Entregable 1 — Estado Durable e Hidratación Automática desde PostgreSQL (`motor_multiagente_pdd.py`)
1. Cambiar `STATE_PATH` de `/tmp/polis_pdd_multiagente_17_state.json` a una ruta durable en el repositorio:
   `DATA_DIR / "estado_sistema_multiagente_pdd.json"` (`/root/polis/data/planes_desarrollo/estado_sistema_multiagente_pdd.json`).
2. Hacer que `obtener_estado_sistema_multiagente_pdd()` soporte reconstrucción/hidratación automática desde `bd_csh` cuando el archivo de estado no exista o tenga `"estado": "SIN_EJECUCIONES"` (sin disparar llamadas externas lentas a Google Workspace ni re-OCRizar PDFs, sino leyendo la evidencia ya persistida en `seguimiento.pdd_evidencia_paginas`, `seguimiento.pdd_nodos`, `seguimiento.pdd_metas`, `seguimiento.actividades_plan_accion` via `_auditar_bd()`), poblando:
   - `estado: "COMPLETADO"`
   - `catalogo`: conteos reales de páginas persistidas, nodos (`1.524`), metas PDD (`2.228`), metas PDL (`401`) y cobertura por archivo PDF.
   - `puertas`: `A_ABSORCION_DOCUMENTAL`, `B_RECONSTRUCCION_MGA`, `C_CLASIFICACION_SH`, `D_CONCILIACION_PPI`, `E_ESTRATEGIA_PUBLICACION` y la nueva `F_CRUCE_PA_BPIM`, todas con su dictamen y métricas reales verificadas en BD.
   - `auditoria_agentes`: bitácora completa de los 6 agentes especializados.
3. Generar y dejar persistido `/root/polis/data/planes_desarrollo/estado_sistema_multiagente_pdd.json` y verificar que `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente` devuelva HTTP 200 con `estado == "COMPLETADO"` y todas las puertas aprobadas.

### Entregable 2 — `AgenteArticulacionPlanAccionBPIM` y Endpoint `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim`
1. Implementar en `backend/app/modules/compromisos/motor_multiagente_pdd.py` (y exponer en `router.py`) el **6.º Agente: `AgenteArticulacionPlanAccionBPIM`** junto con la puerta `F_CRUCE_PA_BPIM`.
2. Este agente y el nuevo endpoint `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim` deben realizar el cruce determinístico entre:
   - Los nodos y metas de los **5 PDD (`2012–2027`) y 3 PDL (`2024–2027`)** —con énfasis en el PDD vigente `2024–2027` y grados de frontalidad `A` (Núcleo Frontal) y `B` (Determinante Multidimensional)—.
   - Las actividades operativas del **Motor de Planes de Acción (`seguimiento.actividades_plan_accion`)** y los registros normalizados de las **29 entidades distritales** (`seguimiento.registros_triada_normalizados`).
   - La cadena de valor **MGA-DNP / código BPIM** (vinculación con programas/subprogramas, productos MGA, dependencia responsable y ponderación en las 7 dimensiones de Seguridad Humana).
3. El payload de `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim` debe incluir:
   - `resumen_ejecutivo`:
     - `total_nodos_pdd_pdl`: conteo total (`1.524`), desglosado por `A`, `B`, `C`, `N`.
     - `total_metas_pdd`: `2.228`, `total_metas_pdl`: `401`.
     - `total_actividades_pa`: conteo en `seguimiento.actividades_plan_accion` y entidades activas (`29`).
     - `cobertura_articulacion_vigente_2024_2027`: metas y programas `A` y `B` del PDD 2024–2027 articulados con Planes de Acción vs. brechas operativas pendientes de articulación.
   - `articulacion_por_dimension_sh`: arreglo con las **7 Dimensiones de Seguridad Humana** (`Personal`, `Comunitaria`, `Económica`, `Alimentaria`, `Salud`, `Ambiental`, `Política`), mostrando para cada una: nodos `A+B`, presupuesto PPI constante asignado, número de actividades de Plan de Acción vinculadas, avance físico promedio y entidades líderes.
   - `articulacion_por_entidad`: resumen de las entidades distritales con su carga de actividades PA, metas PDD asociadas, productos MGA/BPIM y grado de frontalidad predominante (`A` o `B`).
   - `matriz_trazabilidad_pa_bpim`: lista estructurada de registros trazables (`codigo_plan`, `codigo_nodo`, `nombre_programa`, `grado_frontalidad`, `dimension_sh_principal`, `meta_pdd`, `actividad_pa_id`, `descripcion_actividad_pa`, `dependencia_responsable`, `codigo_bpim_sugerido`, `producto_mga_dnp`, `avance_fisico_pct`, `estado_articulacion`).
   - `puerta_f`: estado de validación `APROBADA` con invariantes verificados.
4. Registrar la nueva ruta `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim` en `docs/permisos-api.md` para mantener la paridad estricta en `test_access_policy.py`.

### Entregable 3 — Pruebas Automatizadas, Reinicio Limpio y Protocolo de Notificación
1. Añadir pruebas en `backend/tests/test_motor_multiagente_pdd.py` que validen:
   - Que `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente` retorna `estado == "COMPLETADO"` con las 6 puertas (`A` a `F`) y nunca `SIN_EJECUCIONES` cuando la BD está poblada.
   - Que `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim` retorna HTTP 200 con las 7 dimensiones de Seguridad Humana, las entidades distritales y la matriz de trazabilidad PA/BPIM.
2. Ejecutar y aprobar:
   - `/root/polis/backend/.venv/bin/ruff check` sobre los archivos modificados.
   - `/root/polis/backend/.venv/bin/pytest backend/tests/test_motor_multiagente_pdd.py backend/tests/test_pdd_seguridad_humana_16.py backend/tests/test_access_policy.py`
3. Reiniciar o verificar `polis-backend.service` para que los endpoints queden respondiendo en vivo en `http://127.0.0.1:8000`.
4. Documentar el reporte de entrega en `/root/polis/bridge/02_entrega_codex.md` (sección `## Entrega [SISTEMA-MULTIAGENTE-CRUCE-PA-BPIM-18A] — 17/10/2026`).
5. **Notificación obligatoria a `agy`:** Al terminar tu entrega y tu commit local en `main` (sin `git push`), envía un mensaje directo a la sesión `agy` en `tmux` ejecutando:
   ```bash
   tmux send-keys -t =agy:0.0 "CODEX LISTO [18A]: Estado durable multiagente + Agente 6 Cruce PDD/PDL-PA-BPIM completado y probado. Solicito auditoria EAF." Enter
   ```
