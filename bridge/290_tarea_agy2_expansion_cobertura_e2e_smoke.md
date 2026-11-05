# ENCARGO 290: Expansión de Suite E2E y Smoke Testing para Cobertura Exhaustiva de Endpoints, CRUDs y Vistas en POLIS

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-04
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Solicitud del usuario:** *"a nivel de plataforma todo esta 100% testeado? cada una de las opciones? todo esta 100% testeado con ee y smoke? por eso todos los endpoints, sp y cruds quedaron problados. asignale esa tarea a ag2"*
- **Archivo de Entrega Esperado:** `bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md`

---

## 1. Contexto y Diagnóstico

Actualmente, POLIS cuenta con:
1. **Frontend:** 1.609 pruebas unitarias y de integración pasando al 100% en Bun (`bun test`).
2. **Backend:** 166 archivos de pruebas en `backend/tests/` cubriendo los 270 endpoints y 71 tablas en PostgreSQL.
3. **E2E Existente:** [`scripts/e2e-smoke-flujos-criticos.mjs`](file:///root/polis/scripts/e2e-smoke-flujos-criticos.mjs) valida con **Playwright (Chromium headless)** los 9 flujos troncales críticos (Login por 4 roles, conmutar fase, editar mesa, editar línea, editar compromiso, registrar medición, devolución motivada, modo solo lectura de auditor y accesibilidad axe-core).

El objetivo del **Encargo 290** es expandir la cobertura de pruebas de extremo a extremo (E2E / Smoke) para verificar interactivamente en navegador real los módulos, CRUDs y vistas de la plataforma que aún no cuentan con cobertura E2E automatizada, garantizando que cada botón, formulario y endpoint principal quede verificado de punta a punta.

---

## 2. Alcance Específico para `agy2`

Expandir o crear suites complementarias de E2E con Playwright (apoyándose en [`scripts/e2e-smoke-flujos-criticos.mjs`](file:///root/polis/scripts/e2e-smoke-flujos-criticos.mjs) o scripts modulares en `scripts/`) para cubrir los siguientes frentes funcionales:

### 2.1. Módulo de Proyectos y Alternativas MGA
- Navegación a `/plataforma/proyectos` (o sección de alternativas).
- Formulario de creación de una nueva alternativa / proyecto de política pública.
- Simulación de cálculo de viabilidad jurídica (LOOT / Consulta Previa OIT 169) y fiscal (FONSET / Vigencias Futuras).
- Verificación de la persistencia de la alternativa en base de datos tras recargar la vista.

### 2.2. Módulo de Participación Ciudadana y Aportes Públicos
- Flujo de radicación pública de una propuesta ciudadana en `/aportes` o `/formularios`.
- Validación de generación de código radicado y visualización del comprobante con enlace de verificación.
- Consulta del estado de la propuesta radicada desde el portal ciudadano.

### 2.3. Módulo de Geovisor Territorial y Filtros Espaciales
- Carga de la vista `/plataforma/geovisor`.
- Interacción con el selector de Localidades (LOC-1, LOC-2, LOC-3) y Unidades Comuneras de Gobierno (UCG).
- Comprobación de que la capa GeoJSON responda adecuadamente y no genere excepciones en consola del navegador.

### 2.4. Módulo de Gestión de Usuarios y Roles Institucionales
- Navegación a `/plataforma/usuarios`.
- Prueba del editor de usuarios ([`src/features/usuarios/panels/usuario-editor-panel.tsx`](file:///root/polis/src/features/usuarios/panels/usuario-editor-panel.tsx)).
- Prueba del control de visibilidad de contraseña (mostrar/ocultar) implementado en el Encargo 280.
- Verificación del cambio de rol o ámbito territorial (PBAC) y comprobación de persistencia.

---

## 3. Reglas Técnicas y Salvaguardas Obligatorias

1. **Aislamiento de Puertos y Base de Datos:**
   - Todo ensayo E2E debe correr sobre los puertos aislados configurados en `scripts/e2e-smoke-flujos-criticos.mjs`:
     - Backend: puerto `8100` (`E2E_BACKEND_PORT`)
     - Frontend Standalone: puerto `3105` (`E2E_FRONTEND_STANDALONE_PORT`)
     - Proxy E2E: puerto `3100` (`E2E_PROXY_PORT`)
   - Base de datos temporal exclusiva: `polis_test_e2e`. **NUNCA ejecutar mutaciones E2E sobre la base de datos productiva ni sobre los puertos 8000/3000.**
2. **Quality Gates Institucionales:**
   - `node scripts/ui-policy.mjs` (0 violaciones de diseño y a11y).
   - `bun run typecheck` (0 errores de TypeScript).
   - `bun test` (1609+ pruebas pasando sin regresiones).
3. **Control de Versiones:**
   - **NO realizar git commit ni git push.**
   - Registrar la entrega formal en `bridge/290_entrega_agy2_expansion_cobertura_e2e_smoke.md`.
4. **Notificación:**
   - Reportar avance y finalización a `agy:0.0`.
