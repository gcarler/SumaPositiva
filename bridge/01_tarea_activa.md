# TAREA ACTIVA: [AUD-COMP-05] CONSISTENCIA NORMATIVA, SALVAGUARDAS INSTITUCIONALES Y REGLAS DE DISEÑO UI-POLICY
## INSPECCIÓN DE PRESERVACIÓN BPIN, SANEAMIENTO LEGAL (DECRETO 037 / OBS-11), CERO ACRÓNIMOS AJENOS EN MODOS TERRITORIALES, HABEAS DATA (LEY 1581), REGLA DE CAPAS UI004 Y A11Y WCAG 2.1 AA

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Consistencia Normativa, UI-Policy y Resiliencia Operativa (Tarea 3.1)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** CRÍTICA / BLINDAJE JURÍDICO, INSTITUCIONAL, ARQUITECTÓNICO Y ACCESIBILIDAD UNIVERSAL  

---

## 🎯 1. Justificación y Alcance de la Tarea

La plataforma POLIS 2026 debe satisfacer no solo los más altos estándares de rendimiento y completitud funcional, sino también una disciplina normativa, jurídica y arquitectónica impecable. Un desfase legal o una infracción en la jerarquía de componentes comprometería la fe pública y la sostenibilidad a largo plazo del sistema distrital.

Esta tarea exige auditar y blindar cinco (5) frentes periciales no negociables:
1. **Preservación Inviolable de Códigos BPIN:** Asegurar la integridad de los códigos distritales de proyecto `BPIN-2026-CTG-XXXX` en los módulos de alternativas y asignación presupuestal, y comprobar la erradicación estricta de BPINs fabricados en compromisos PAS (mandato AUD-13).
2. **Saneamiento Normativo y Cero Acrónimos Ajenos en Canales Territoriales:**
   - Erradicación taxativa de acrónimos tecnocráticos ajenos (`DNP`, `MGA`, `SINERGIA`) en datos e interfaces cívico-comunitarias (`/barrio`, catálogos territoriales, planillas ciudadanas).
   - Verificación de la salvedad institucional obligatoria de descargo (OBS-11) en compromisos PAS: `"Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037"`.
   - Soporte exclusivo de la Ley Estatutaria 1757 de 2015 y Ley 1581 de 2012 en planillas de asistencia a mesas.
3. **Habeas Data (Ley 1581 de 2012) y Secreto Estadístico:**
   - Validación de consentimientos expresos en captura de datos cívicos.
   - Verificación del filtro defensivo de Sentry/GlitchTip (`backend/app/core/sentry.py`): censura estricta (`[REDACTED]`) de contraseñas, tokens, cédulas, teléfonos y enmascaramiento de IPs (`[FILTERED_HABEAS_DATA]`).
   - Cero exposición de datos sensibles no autorizados en respuestas JSON de la API.
4. **Regla de Capas Arquitectónicas UI004:**
   - Ejecución y validación estricta de `scripts/ui-policy.mjs` (`bun run ui:check`).
   - Certificación de independencia unidireccional: `@/shared/` no importa `@/features/`, `@/app/` ni `@/core/`; y `@/core/` no importa `@/features/` ni `@/app/`.
5. **Accesibilidad Universal (WCAG 2.1 AA):**
   - Verificación de contraste semántico de tokens, etiquetas ARIA accesibles, soporte de navegación por teclado y cero violaciones serias o críticas en auditorías `axe-core`.

---

## 📋 2. Puntos de Inspección Forense y Requerimientos de Verificación

### A. Preservación y Trazabilidad de Códigos BPIN
1. Auditar `src/features/alternativas/` y `backend/app/modules/presupuesto/`:
   - Verificar que los códigos BPIN distritales (`BPIN-2026-CTG-XXXX`) en el catálogo institucional de alternativas y costeo presupuestal se preserven y validen con rigor.
2. Auditar `backend/tests/test_integridad_compromisos.py`:
   - Ejecutar la prueba forense que certifica que en `seguimiento.compromisos_pas` NO existan BPINs fabricados ni atribuciones arbitrarias (`bpin_relacionado` debe ser inexistente o estrictamente certificado).

### B. Saneamiento Normativo y Cero Acrónimos Ajenos en Canales Comunitarios
1. En datos comunitarios (`src/features/barrio/data/barrios-cartagena.ts`) y vistas cívicas (`src/features/barrio/views/barrio-view.tsx`):
   - Corroborar mediante script/test que ningún dato desplegado al ciudadano contenga los acrónimos `DNP`, `MGA` o `SINERGIA`.
2. En compromisos PAS (`src/features/seguimiento/data/compromisos-pas.data.ts` y tabla `seguimiento.compromisos_pas`):
   - Confirmar que todo compromiso no oficializado incorpore el descargo institucional:
     `"Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037"`, con `meta_validada: false`.
3. En planilla de asistencia (`src/app/asistencia/[mesaId]/asistencia-cliente.tsx`):
   - Confirmar sustento formal en Ley Estatutaria 1757 de 2015 y Ley 1581 de 2012, sin invocación indebida de decretos de planeación que confundan al ciudadano.

### C. Habeas Data y Blindaje de Telemetría (Ley 1581 de 2012)
1. Auditar `backend/app/core/sentry.py`:
   - Verificar que la función `_filtrar_pii` intercepte encabezados (`authorization`, `cookie`), campos sensibles (`password`, `contrasena`, `token`, `secret`, `cedula`, `documento`, `telefono`, `correo`) y enmascare `ip_address` a `[FILTERED_HABEAS_DATA]`.
2. Ejecutar prueba unitaria o de integración que certifique la sanitización activa de eventos de error antes de su eventual despacho.

### D. Regla Arquitectónica de Capas UI004 y Política de UI
1. Ejecutar `bun run ui:check` y `bun run ui:policy:test`.
2. Constatar que 0 archivos infrinjan las reglas:
   - `UI001`: Controles nativos encapsulados.
   - `UI002`: Primitivos externos radicados en `src/shared/ui/`.
   - `UI003`: Cero colores literales fuera de `tokens.css`.
   - `UI004`: `shared` y `core` libres de dependencias circulares hacia `features` o `app`.
   - `UI005`: Uso de `SidePanel` / `PanelHost` para flujos canónicos.

### E. Accesibilidad Universal WCAG 2.1 AA
1. Ejecutar la suite de auditoría E2E con motor axe-core (`node scripts/e2e-smoke-flujos-criticos.mjs`).
2. Certificar cero (0) violaciones de impacto "critical" o "serious".

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Integridad BPIN & OBS-11** | `/root/polis/venv/bin/pytest backend/tests/test_integridad_compromisos.py` | 100% verde (sin BPIN ficticio, OBS-11 cumplido) |
| **Acrónimos en Modo Barrio** | `bun test src/features/barrio/tests/barrio-view.test.ts` | 5/5 verde (cero DNP, MGA, SINERGIA en datos cívicos) |
| **Política UI y Capas UI004** | `bun run ui:check` y `bun run ui:policy:test` | Aprobado, 0 violaciones |
| **Axe-core A11y E2E** | `node scripts/e2e-smoke-flujos-criticos.mjs` | 9/9 flujos aprobados, 0 violaciones serias/críticas |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 advertencias ESLint |
| **Frontend Test Suite** | `bun test` | 412/412 pruebas pasadas |
| **Backend Test Suite** | `/root/polis/venv/bin/pytest backend/tests/` | 100% verde |
| **Turbopack Build** | `bun run build` | Compilación limpia, 191/191 páginas estáticas |

---

## 📦 4. Entregables y Salvaguardas

1. **Matriz Pericial de Consistencia Normativa y UI-Policy:**
   - Tabla de verificación punto por punto en `bridge/02_resultado_agy2.md`.
2. **Salvaguardas Inviolables:**
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas técnicas).
   - Códigos BPIN distritales inalterados.
   - Cero push a repositorios remotos (exclusivo local en `main`).
3. **Commit Atómico Local:**
   - Registrar el commit con formato: `audit(normativa): verificacion bpin obs-11 acronimos ui004 y a11y AUD-COMP-05`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para contra-auditoría pericial.
