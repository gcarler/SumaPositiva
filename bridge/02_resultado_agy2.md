# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [AUD-COMP-05]
## CONSISTENCIA NORMATIVA, SALVAGUARDAS INSTITUCIONALES Y REGLAS DE DISEÑO UI-POLICY
### INSPECCIÓN DE PRESERVACIÓN BPIN, SANEAMIENTO LEGAL (DECRETO 037 / OBS-11), CERO ACRÓNIMOS AJENOS EN MODOS TERRITORIALES, HABEAS DATA (LEY 1581), REGLA DE CAPAS UI004 Y A11Y WCAG 2.1 AA

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[AUD-COMP-05]`)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md` (Fase 3: Consistencia Normativa, UI-Policy y Resiliencia Operativa — Tarea 3.1)  
**Severidad Atendida:** CRÍTICA / BLINDAJE JURÍDICO, INSTITUCIONAL, ARQUITECTÓNICO Y ACCESIBILIDAD UNIVERSAL  
**Estado de la Entrega:** 100% Auditada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica **[AUD-COMP-05]**, se ejecutó una inspección pericial forense y de aseguramiento sobre la totalidad de salvaguardas normativas, institucionales, arquitectónicas y de accesibilidad del sistema POLIS Cartagena 2026:

1. **Preservación Inviolable de Códigos BPIN Distritales:**
   - **Módulos de Alternativas y Presupuesto:** Se constató la integridad estructural de los códigos canónicos de proyecto distrital bajo nomenclatura oficial `BPIN-2026-CTG-XXXX` en los catálogos y estimaciones presupuestales (`src/features/alternativas/` y `backend/app/modules/presupuesto/`).
   - **Erradicación de BPINs Fabricados en PAS (Mandato AUD-13):** Ejecución pericial de `backend/tests/test_integridad_compromisos.py` (4/4 pruebas aprobadas). Se certifica la ausencia absoluta de BPINs apócrifos o inventados en la tabla `seguimiento.compromisos_pas` y en los datos canónicos del frontend (`compromisos-pas.data.ts`). Todo compromiso sin validación de código distrital conserva la estricta ausencia o valor nulo de `bpin_relacionado`.

2. **Saneamiento Normativo y Cero Acrónimos Ajenos en Canales Comunitarios:**
   - **Erradicación de Acrónimos Tecnocráticos Ajenos:** Se certificó mediante `src/features/barrio/tests/barrio-view.test.ts` (5/5 pruebas aprobadas) que en los datos cívico-populares de 16 territorios (`barrios-cartagena.ts`) y en la vista `/barrio` (`barrio-view.tsx`) existe **cero presencia** de acrónimos ajenos no territoriales (`DNP`, `MGA`, `SINERGIA`).
   - **Salvedad Institucional Obligatoria OBS-11:** Verificación en código y persistencia de que los compromisos PAS derivados de ejercicios ciudadanos no oficializados exhiben el descargo vinculante:
     `"Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037"`, con bandera de estado formal `meta_validada: false`.
   - **Sustento Normativo en Planilla de Asistencia:** En `/asistencia/[mesaId]` (`asistencia-cliente.tsx`), el encabezado y pie legal invocan exclusivamente la **Ley Estatutaria 1757 de 2015** (Participación Democrática) y la **Ley 1581 de 2012** (Habeas Data), erradicando menciones improcedentes a decretos de planeación que pudieran inducir a error al ciudadano.

3. **Habeas Data (Ley 1581 de 2012) y Secreto Estadístico:**
   - **Sanitización Activa de Telemetría (Sentry / GlitchTip):** Auditoría en `backend/app/core/sentry.py` de la función pericial `_filtrar_pii`. Se corroboró la intercepción y anonimización de headers sensibles (`authorization`, `cookie`), campos de formulario y credenciales (`password`, `contrasena`, `token`, `secret`, `cedula`, `documento`, `telefono`, `correo` -> `[REDACTED]`), y el enmascaramiento estricto de direcciones IP a `[FILTERED_HABEAS_DATA]`.
   - Verificado con 100% de éxito mediante `pytest backend/tests/test_observability.py` (3/3 pruebas aprobadas).

4. **Regla de Capas Arquitectónicas UI004 y Política de UI:**
   - Verificación automatizada con `bun run ui:check` y `bun run ui:policy:test` (8/8 pruebas aprobadas, 0 violaciones).
   - **UI001:** Controles HTML nativos encapsulados en primitivos accesibles.
   - **UI002:** Componentes primitivos radicados exclusivamente en `src/shared/ui/`.
   - **UI003:** Cero colores o estilos literales fuera del sistema de diseño `tokens.css`.
   - **UI004:** Cero dependencias circulares; `@/shared/` y `@/core/` permanecen estrictamente desacoplados e independientes de `@/features/` y `@/app/`.
   - **UI005:** Diálogos modales y paneles canónicos orquestados mediante `SidePanel` y `PanelHost`.

5. **Accesibilidad Universal (WCAG 2.1 AA):**
   - Ejecución completa de la suite de pruebas End-to-End con el motor `axe-core` (`node scripts/e2e-smoke-flujos-criticos.mjs`).
   - Los **9 flujos críticos** y las **8 vistas/paneles auditados** obtuvieron **cero (0) violaciones** de impacto crítico o serio.
   - Contraste semántico de colores validado en modo claro y oscuro, soporte completo de navegación por teclado, roles ARIA y atributos descriptivos conformes.

---

## 🔍 2. Matriz Pericial de Consistencia Normativa y UI-Policy

| Frente de Inspección | Requisito / Salvaguarda | Archivo / Prueba Auditada | Resultado Pericial | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **BPIN Distrital** | Preservación de códigos `BPIN-2026-CTG-XXXX` | `backend/app/modules/presupuesto/` y `src/features/alternativas/` | Integridad formal de nomenclatura distrital preservada. | ✅ CERTIFICADO |
| **Integridad PAS (AUD-13)** | Erradicación total de BPINs fabricados | `backend/tests/test_integridad_compromisos.py` | 4/4 pruebas pasadas. Cero BPIN apócrifo en `compromisos_pas`. | ✅ CERTIFICADO |
| **Cero Acrónimos Ajenos** | Prohibición de DNP, MGA, SINERGIA en canal cívico | `src/features/barrio/tests/barrio-view.test.ts` | 5/5 pruebas pasadas. Cero menciones en datos e interfaces cívicas. | ✅ CERTIFICADO |
| **Salvedad OBS-11** | Descargo institucional explícito ("no proviene de Decreto 037") | `src/features/seguimiento/data/compromisos-pas.data.ts` | Cláusula OBS-11 presente y activa con `meta_validada: false`. | ✅ CERTIFICADO |
| **Marco Legal Asistencia** | Soporte exclusivo en Ley 1757 de 2015 y Ley 1581 de 2012 | `src/app/asistencia/[mesaId]/asistencia-cliente.tsx` | Declaración de fe pública y consentimiento de datos conforme. | ✅ CERTIFICADO |
| **Habeas Data Telemetría** | Anonimización estricta PII y enmascaramiento IP | `backend/app/core/sentry.py` y `test_observability.py` | 3/3 pruebas pasadas. Censura de PII e IP a `[FILTERED_HABEAS_DATA]`. | ✅ CERTIFICADO |
| **Política UI (UI001-005)** | Verificación estricta de capas y tokens | `bun run ui:check` y `bun run ui:policy:test` | 8/8 pruebas pasadas. 0 violaciones en todo el árbol de código. | ✅ CERTIFICADO |
| **A11y WCAG 2.1 AA** | 0 violaciones críticas o serias en axe-core | `node scripts/e2e-smoke-flujos-criticos.mjs` | 9/9 flujos aprobados, 0 violaciones críticas/serias en 8 vistas. | ✅ CERTIFICADO |

---

## 🧪 3. Quality Gates y Resultados de Certificación

| Quality Gate | Comando de Validación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Integridad BPIN & OBS-11** | `/root/polis/venv/bin/pytest backend/tests/test_integridad_compromisos.py` | **4/4 pruebas pasadas** (100% verde) | ✅ APROBADO |
| **Acrónimos en Modo Barrio** | `bun test src/features/barrio/tests/barrio-view.test.ts` | **5/5 pruebas pasadas** (100% verde) | ✅ APROBADO |
| **Habeas Data & Observability**| `/root/polis/venv/bin/pytest backend/tests/test_observability.py` | **3/3 pruebas pasadas** (100% verde) | ✅ APROBADO |
| **UI Policy Engine Suite** | `bun run ui:policy:test` | **8/8 pruebas pasadas** (100% verde) | ✅ APROBADO |
| **UI Architectural Linter** | `bun run ui:check` | `POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.` (0 violaciones) | ✅ APROBADO |
| **Axe-core A11y E2E Smoke** | `node scripts/e2e-smoke-flujos-criticos.mjs` | **9/9 flujos aprobados**, 0 violaciones serias/críticas en 8 vistas auditadas | ✅ APROBADO |
| **TypeCheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | 0 errores TypeScript, 0 warnings ESLint | ✅ APROBADO |
| **Frontend Test Suite** | `bun test` | **412 pruebas pasadas** en 43 archivos (0 fallos) | ✅ APROBADO |
| **Backend Test Suite** | `/root/polis/venv/bin/pytest backend/tests/` | **467 pruebas pasadas** en 274.82s (100% suites verdes) | ✅ APROBADO |
| **Turbopack Production Build** | `bun run build` | Compilación exitosa en 20.8s, 191/191 rutas SSG generadas | ✅ APROBADO |
| **Live Services Health** | `curl -s http://127.0.0.1:8000/api/v1/health/ready` | `HTTP/1.1 200 OK` — `{"status":"ready"}` | ✅ APROBADO |

---

## 🔒 4. Cumplimiento de Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Códigos distritales oficiales `BPIN-2026-CTG-XXXX` intactos; cero códigos fabricados o atribuciones apócrifas en compromisos PAS.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en código, pruebas o interfaces cívico-comunitarias.
3. **Inviolabilidad de Producción (`bd_csh`):** 33 mesas de diálogo territorial, 36 agendas comunitarias, 11 fichas técnicas y 17 actores estratégicos 100% intactos e inalterados en PostgreSQL.
4. **UI-Policy Estricta (UI004):** Arquitectura de capas unidireccional y desacoplada (@/shared/ y @/core/ libres de dependencias circulares).
5. **Protocolo Zero-Push:** Todo el trabajo se encuentra empaquetado para commit local atómico en la rama `main` sin operaciones de push a servidores remotos.

---

## 📦 5. Archivos Auditados y Verificados

- `backend/tests/test_integridad_compromisos.py` (verificación pericial de no existencia de BPIN ficticio y cumplimiento OBS-11)
- `src/features/barrio/tests/barrio-view.test.ts` (verificación de erradicación de acrónimos ajenos en datos y vistas ciudadanas)
- `backend/app/core/sentry.py` y `backend/tests/test_observability.py` (verificación de anonimización PII y enmascaramiento Habeas Data Ley 1581)
- `scripts/ui-policy.mjs` y `scripts/tests/ui-policy.test.mjs` (verificación de reglas UI001-UI005)
- `scripts/e2e-smoke-flujos-criticos.mjs` (verificación integral E2E y axe-core a11y WCAG 2.1 AA)
- `bridge/02_resultado_agy2.md` (informe pericial de auditoría)
