# DICTAMEN DE AUDITORÍA FORENSE EAF — TAREA [PA-BANCO-MOTOR-01]
## BANCO DE CONOCIMIENTO DNP / SISPT Y MOTOR DE PROCESAMIENTO DE PLANES DE ACCIÓN (INSTRUCTIVO KIT FINANCIERO DNP / MHCP · LEY 152/1994 · LEY 1474/2011)

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Estado del Dictamen:** ✅ **APROBADO SIN RESERVAS**

---

## 1. Verificación Forense de Entregables

1. **Migración Aditiva y Persistencia en `bd_csh` (`0062_motor_plan_accion_dnp.py`, `models.py`, `repository.py`):**
   - Respaldo previo verificado (`backups/bd_csh_20261014_051404.dump`).
   - Tabla `seguimiento.actividades_plan_accion` creada e indexada con las **12 actividades canónicas del Plan de Acción 2026 de Cartagena**, cubriendo las 8 Líneas Estratégicas (`LE-01` a `LE-08`), articuladas a los 10 compromisos de `seguimiento.compromisos_pas` (Hoja 2 `Plan_Indicativo`), códigos `BPIM`, los 4 tipos de actividad (`NORMATIVA`, `ADMINISTRATIVA`, `DE_GESTION`, `LOGISTICA`), verbos fuertes en infinitivo y fuentes de financiación (`SGP`, `REGALIAS`, `RECURSOS_PROPIOS`, `COFINANCIACION`, `GASTOS_GENERALES`, `GESTION_NO_PRESUPUESTAL`).

2. **Motor Backend y Endpoints REST (`router.py`, `service.py`, `schemas.py`, `docs/permisos-api.md`):**
   - `GET /api/v1/compromisos/plan-accion/banco-conocimiento` (`HTTP 200 OK`): Entrega el marco normativo (`Ley 152/1994 Art. 29 y 41`, `Ley 1474/2011 Art. 74`, `Decreto 2482/2012`), encadenamiento de los 4 instrumentos (`PDT/PI`, `POAI`, `MFMP`, `Presupuesto/PAC`), los 7 pasos de elaboración DNP, los 6 pasos de diligenciamiento y el diccionario de metas/actividades/fuentes.
   - `POST /api/v1/compromisos/plan-accion/validar-redaccion` (`HTTP 200 OK`): Motor lingüístico DNP que valida verbos fuertes en infinitivo (`-ar`, `-er`, `-ir`, preservando la `ñ`) y rechaza taxativamente los **16 verbos débiles prohibidos por el DNP** (pág. 12 del Instructivo).
   - `GET /api/v1/compromisos/plan-accion/matriz` (`HTTP 200 OK`): Entrega el `resumen_ejecutivo`, `hoja_1_plan_accion` (12 actividades) y `hoja_2_plan_indicativo` (10 compromisos PAS vinculados).
   - `POST /api/v1/compromisos/plan-accion/actividades` y `PATCH /api/v1/compromisos/plan-accion/actividades/{id_o_codigo}/seguimiento` protegidos con RBAC `seguimiento:gestionar`.

3. **Interfaz Frontend en `/plataforma/seguimiento` (`banco-conocimiento-dnp-tab.tsx`, `motor-plan-accion-tab.tsx`, `seguimiento-view.tsx`):**
   - Pestaña **«Banco de Conocimiento DNP»** con tarjetas interactivas de instrumentos, línea de tiempo de 7 pasos, simulador lingüístico en tiempo real y lista negra de los 16 verbos débiles.
   - Pestaña **«Motor Plan de Acción (DNP / SisPT)»** con KPIs ejecutivos, Hoja 1 (`Plan_Accion`), Hoja 2 (`Plan_Indicativo`), asistente de programación en 6 pasos, reporte trimestral `T1–T4` y exportación CSV/JSON (Art. 74 Ley 1474/2011).

---

## 2. Certificación Independiente de Calidad y Censo

- **Pruebas Backend (`pytest`):** `111 / 111 pasadas` (`test_motor_plan_accion_dnp.py`, `test_access_policy.py`, `test_compromisos_pas.py`).
- **Pruebas Frontend (`bun test`):** `591 / 591 pasadas` (`57 / 57` en `src/features/seguimiento/`).
- **Quality Gates (`bun run check`):** `0 errores`.
- **Storybook (`bun run ui:test`):** `212 / 212 historias pasadas` con `axe-core`.
- **Censo Institucional en `bd_csh`:** Intacto (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12.280` hurtos y `12` actividades en `seguimiento.actividades_plan_accion`).
