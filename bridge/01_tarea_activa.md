# TAREA ACTIVA — EDD (agy2)

**Última actualización**: 2026-10-04  
**Responsable activo**: agy2 (EDD)  
**Auditor independiente**: EAF  
**Tarea en curso / entregada**: `EDIT-03b` (Subsanación Pericial: Erradicación de Datos Fabricados en Fuentes)

---

## Estado Global de Auditorías (AUD-01 .. AUD-18)

| ID | Tarea / Alcance | Dictamen EAF / Estado | Commit de Entrega / Notas |
|:---|:---|:---:|:---|
| **AUD-01** | Compromisos PAS con persistencia real en backend | **CONFORME** | Absorbido y cerrado en AUD-13 y AUD-14. |
| **AUD-02** | Mediciones de indicadores DNP con persistencia backend | **CONFORME** | Dictamen EAF en `03_dictamen_revision.md`. |
| **AUD-03** | Rendición de cuentas C-150 conectada a aportes reales | **CONFORME** | Dictamen EAF en `03_dictamen_revision.md`. |
| **AUD-04** | Control de fases DNP sin simulación y con reversión | **CONFORME** | Dictamen EAF en `03_dictamen_revision.md`. |
| **AUD-05** | Gating estricto de transición y coherencia entre fases | **CONFORME** | Dictamen EAF en `03_dictamen_revision.md`. |
| **AUD-06** | Transaccionalidad de escritura y consistencia MGA | **CONFORME** | Dictamen EAF en `03_dictamen_revision.md`. |
| **AUD-07** | Cobertura y aislamiento de pruebas backend (369 passed) | **CONFORME CON OBS-13** | OBS-13 absorbida en AUD-11. |
| **AUD-08** | Accesibilidad WCAG AA y axe-core real (0 violaciones) | **CONFORME** | Verificado en 3 pestañas y paneles. |
| **AUD-09** | Suite E2E de flujos críticos en entorno aislado (8100/3100) | **CONFORME CON OBS-14** | 9 flujos reales aprobados. OBS-14 absorbida en AUD-11. |
| **AUD-10** | Tipado estricto TypeScript: `no-explicit-any` en error | **CONFORME CON OBS-16** | 0 `any` en src/scripts. OBS-16 absorbida en AUD-16. |
| **AUD-11 / 11b** | Higiene de repositorio, retiro de secretos y guardas demo | **CONFORME** | `32577a0`: Pytest 391/391 pass. OBS-17 pendiente antes de remoto. |
| **AUD-12** | Centralización y blindaje de utilidades CSV seguras | **CONFORME** | `e1c9345`: Módulo único `src/shared/lib/csv.ts`, 227 bun tests. |
| **AUD-13** | Integridad de compromisos PAS y saneamiento de BD | **CONFORME** | Eliminación de BPIN/metas sin validar. OBS-11/12 cerradas. |
| **AUD-14** | Erradicación integral de PII y estadísticas sin fuente | **CONFORME** | `3e46067`: Retiro de PII en actores, fuentes limpias. |
| **AUD-15** | Erradicación de mocks en stores de producción | **CONFORME** | `2c6af60`: Retiro de `MESAS_MOCK` y `AGENDA_INICIAL`. |
| **AUD-16** | Endurecimiento ESLint (`no-unused-vars` error, `ban-ts-comment` error) y barrido de docs/ | **CONFORME CON OBS-19** | `9faa78e`: 0 errores, 0 warnings. OBS-19: exclusión de noticias/testimonios a retirar al cerrar Codex. |
| **AUD-17** | Runbook de despliegue en producción, plan de consolidación git y corrección de contadores | **CONFORME CON OBS-20** | `b5f3ca6`: Subsanada OBS-20 haciendo condicional el paso de migraciones. |
| **AUD-18** | Matriz pericial de evidencia de editabilidad/configurabilidad y backlog de huecos | **CONFORME** | `f41fd90`: Matriz con evidencia archivo:línea y tests para 10 capacidades, `bridge/04_backlog_editabilidad.md` y subsanación OBS-20 en runbook. |

---

## Backlog de Editabilidad y Configurabilidad (EDIT-01 .. EDIT-05)

| ID | Prioridad | Tarea / Alcance | Estado | Pruebas / Validación |
|:---|:---:|:---|:---:|:---|
| **EDIT-01** | **ALTA** | Persistencia Backend para Edición de Metadatos de Mesas (`PATCH /api/v1/mesas/{id}`) | **CONFORME CON OBS-21** | `3dc7d1f`. OBS-21 programada para EDIT-01b tras EDIT-04. |
| **EDIT-02** | **MEDIA** | Modelo Relacional y CRUD Dinámico de Agenda de Mesas | **CONFORME CON OBS-22** | `9b82221`. Subsanada OBS-22 (0041 en runbook, corrección a 36 mesas). |
| **EDIT-03b** | **CRÍTICA** | Subsanación de Sembrado y Erradicación de Datos Fabricados en Catálogo de Fuentes | **ENTREGADA / LISTA PARA AUDITAR** | Migración 0042 sin solicitudes falsas (`por_solicitar`, radicados/fechas NULL), script demo con guarda anti `bd_csh`, fixtures a `__fixtures__`, 5 tests backend en `test_fuentes_informacion.py` (5 passed), `bun test` (248 passed), `bun run check` (0 errores). |
| **EDIT-04** | **BAJA** | Endpoint de Actualización Controlada para Fichas Técnicas DNP | **EN CURSO / LISTA PARA COMMIT** | Implementación completa lista para commit y entrega tras dictamen EDIT-03b. |
| **EDIT-05** | **BAJA** | Integración y Cierre de Módulos de Noticias y Testimonios (Codex) | **BLOQUEADA (CODEX)** | No tocar archivos de Codex. |

---

## Archivo de Entrega y Dictámenes
- **Entrega de agy2**: `bridge/02_entrega_agy2.md`
- **Dictámenes de EAF**: `bridge/03_dictamen_revision.md`
- **Backlog de Editabilidad**: `bridge/04_backlog_editabilidad.md`
- **Especificaciones de Tareas EDIT**: `bridge/01_tarea_agy2_edit_01.md` .. `05.md`
