# Tareas Activas — Coordinación Antigravity

## Encargo 272 (COMPLETADO Y CERRADO): `freebuff` — Servicio de Correo Transaccional (Registro, Clave, Propuesta, Me Gusta y Actividades)
- **Asignado a:** `freebuff` (`=freebuff:0.0`)
- **Especificación completa:** [`/root/polis/bridge/272_tarea_freebuff_servicio_correo_transaccional.md`](file:///root/polis/bridge/272_tarea_freebuff_servicio_correo_transaccional.md)
- **Informe de entrega:** [`/root/polis/bridge/272_entrega_freebuff_servicio_correo_transaccional.md`](file:///root/polis/bridge/272_entrega_freebuff_servicio_correo_transaccional.md)
- **Alcance cumplido:** Servicio de correo transaccional para los 4 flujos (registro+verificación, recuperación de contraseña, creación de propuesta, respaldo ciudadano/actividades sobre patrón Outbox existente), plantillas HTML institucionales nuevas (bienvenida, recuperación, actividad_apoyo), migración Alembic 0092 que amplía `chk_notificaciones_tipo_evento`, y suite nueva `backend/tests/test_servicio_correo_transaccional.py` (12/12 OK). Calidad 100% verificada, migración aplicada en `bd_csh`, backend reiniciado y en producción.

---

## Encargo 271 (COMPLETADO Y CERRADO): `freebuff` — Vista de Trazabilidad y Diagrama UML del Ciclo de Vida de una Política Pública
- **Asignado a:** `freebuff` (`=freebuff:0.0`)
- **Especificación completa:** [`/root/polis/bridge/271_tarea_freebuff_trazabilidad_uml_politica_publica.md`](file:///root/polis/bridge/271_tarea_freebuff_trazabilidad_uml_politica_publica.md)
- **Informe de entrega:** [`/root/polis/bridge/271_entrega_freebuff_trazabilidad_uml_politica_publica.md`](file:///root/polis/bridge/271_entrega_freebuff_trazabilidad_uml_politica_publica.md)
- **Commit en main:** `c5c99c9`
- **Alcance cumplido:** Enlace `/trazabilidad` activo en `src/shared/layout/footer.tsx`, nueva página institucional `src/app/trazabilidad/page.tsx` con diagrama UML interactivo de actividades y carriles (5 swimlanes de actores × 5 fases metodológicas DNP / Decreto Distrital 037/2026), matriz detallada con marco legal y data lineage de radicado único. Control de calidad 100% aprobado (ui-policy, typecheck, eslint y prerender estático). Desplegado en producción.

---

## Encargo 270 (COMPLETADO Y CERRADO): `agy2` — Vista Adaptativa Responsive para Marco Legal
- **Asignado a:** `agy2` (`=agy2:0.0`)
- **Especificación completa:** [`/root/polis/bridge/270_tarea_agy2_marco_legal_responsive.md`](file:///root/polis/bridge/270_tarea_agy2_marco_legal_responsive.md)
- **Informe de entrega:** [`/root/polis/bridge/270_entrega_agy2_marco_legal_responsive.md`](file:///root/polis/bridge/270_entrega_agy2_marco_legal_responsive.md)
- **Commit en main:** `e0be3e8`
- **Alcance cumplido:** Layout centrado `max-w-7xl mx-auto`, cuadrícula 12 columnas con sidebar sticky de índice normativo y contexto institucional en desktop (`lg:`), navegación horizontal fluida por pestañas en móvil/tablet, tarjetas normativas con chips/badges de nivel y diseño tipográfico adaptativo. Calidad verificada al 100% (`ui-policy`, `typecheck`, `eslint` y build limpio). Desplegado en producción.

---

## Encargos Previos Cerrados y Publicados en Producción (`origin/main`)
- **Encargo 265 (`codex`):** Streaming y purga de actividades en proyectos. Commit `1539c7d` y `6a21cbc`.
- **Encargo 266 (`agy2`):** Capas multifuente en mapa y corrección insular. Commit `0c56362`.
- **Encargos 267 y 268 (`ollamacodex` y `freebuff`):** Enlace datos abiertos, páginas `/marco-legal` y `/contacto`. Commit `25654f4`.
- **Encargo 269 (`ollamacodex` y coordinación):** 21 líneas estratégicas por eje (`LE-08` a `LE-28`), migración 0091 y filtros dinámicos. Commits `157b2be` y `c561489`.
