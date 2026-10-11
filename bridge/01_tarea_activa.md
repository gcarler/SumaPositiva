# TAREA ACTIVA: [AUD-COMP-03] AUDITORÍA INTEGRAL DE INTEGRACIÓN EXTREMO A EXTREMO EN LOS 12 MÓDULOS DE /PLATAFORMA/
## INSPECCIÓN DE BOTONES INERTES, ERRADICACIÓN DE MOCKS RESIDUALES, PERSISTENCIA REAL EN POSTGRESQL Y PRUEBAS E2E

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2: Completitud Funcional E2E y Erradicación de Mocks (Tarea 2.1)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / COMPLETITUD FUNCIONAL Y EXPERIENCIA ADMINISTRATIVA  

---

## 🎯 1. Justificación y Alcance de la Tarea

La suite institucional `/plataforma/` es el centro de operaciones donde los funcionarios distritales de la Alcaldía Mayor de Cartagena, facilitadores territoriales y auditores gestionan la política pública de seguridad humana.

Esta tarea exige auditar con lupa forense los **12 módulos administrativos**:
1. **Mesas de Diálogo (`/plataforma/mesas`):** Gestión integral de 33 mesas, acuerdos, submesas, fotos y generación de actas.
2. **Actores Estratégicos (`/plataforma/actores`):** Conexión real con las 17 dependencias distritales y matriz de influencia.
3. **Fuentes de Financiación (`/plataforma/fuentes`):** 8 fuentes distritales oficiales y asignaciones presupuestales.
4. **Alternativas de Solución (`/plataforma/alternativas`):** Banco distrital, evaluación jurídica/fiscal e IA.
5. **Diagnóstico y Árbol MGA (`/plataforma/diagnostico`):** Fichas causales, problemas y efectos con mutaciones reales.
6. **Fichas de Indicadores (`/plataforma/diagnostico` / indicadores):** 11 fichas con mediciones reales y metas distritales.
7. **Seguimiento PAS (`/plataforma/seguimiento`):** Compromisos distritales, avances y semáforos de cumplimiento.
8. **Noticias Institucionales (`/plataforma/noticias`):** CRUD completo conectado a `comunicacion.noticias`.
9. **Testimonios Comunitarios (`/plataforma/testimonios`):** Moderación y registro conectado a `participacion_ciudadana`.
10. **Formularios de Consulta (`/plataforma/formularios`):** Creación, listado y analítica de participación.
11. **Geovisor Distrital (`/plataforma/geovisor`):** Carga de geometrías PostGIS, capas territoriales y mesas.
12. **Configuración y Usuarios (`/plataforma/configuracion` y `/plataforma/usuarios`):** Panel de salud en tiempo real, parámetros distritales y gestión RBAC de usuarios.

---

## 📋 2. Requerimientos Técnicos y Puntos de Inspección

### A. Detección y Erradicación de Botones Inertes y Mocks
1. Barrer el código fuente de los 12 módulos para identificar:
   - Botones con `onClick={() => {}}` o sin handler de acción.
   - Acciones que se limitan a desplegar un `toast.info("Próximamente")` o similar sin ejecutar mutación en el backend.
   - Listas estáticas `mock*`, `demo*` o datos cableados (*hardcoded*) que suplanten a PostgreSQL.
2. Si se identifica algún botón inerte o acción incompleta:
   - Conectarla al endpoint correspondiente de FastAPI o panel lateral canónico mediante TanStack React Query (`useQuery` / `useMutation`).
   - Asegurar invalidación atómica de caché tras cada mutación.

### B. Consistencia de Persistencia y Reactividad
1. Verificar que al crear, editar o eliminar registros en cualquier módulo:
   - Se refleje inmediatamente en la interfaz sin requerir recarga forzada de navegador (*F5*).
   - Se persista en la base de datos `bd_csh`.
   - Ante errores de red o validación, se informe al usuario mediante `toast.error` estructurado sin bloquear la vista.

### C. Ejecución de Pruebas Críticas E2E
1. Ejecutar la suite de flujos críticos de la plataforma:
   ```bash
   node scripts/e2e-smoke-flujos-criticos.mjs
   ```
2. Verificar que los flujos de navegación, recarga de datos y accesibilidad pasen al 100%.

---

## 🧪 3. Pruebas y Criterios de Aceptación

1. **Cero Mocks y Cero Botones Inertes:** Todos los módulos operan con datos reales de FastAPI / PostgreSQL.
2. **E2E Smoke Suite:** `node scripts/e2e-smoke-flujos-criticos.mjs` pasando al 100%.
3. **Quality Gates Inviolables:**
   - `bun run ui:check` (0 infracciones).
   - `bun run check` (0 errores TypeScript, 0 warnings ESLint).
   - `bun test` (100% pruebas frontend aprobadas).
   - `pytest backend/tests/` (100% pruebas backend aprobadas).
   - `bun run build` (Compilación Turbopack exitosa).
4. **Integridad de Base de Datos:** 33 mesas, 36 agendas, 11 fichas y 17 actores intactos.

---

## 🔒 4. Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Códigos presupuestales distritales 100% intactos.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en código o interfaces.
3. **UI-Policy Estricta (UI004):** Componentes canónicos `@/shared/ui/` y arquitectura de capas.
4. **Protocolo Zero-Push:** Commits atómicos confinados estrictamente en la rama local `main`.

---

## 🚀 5. Instrucciones de Entrega para agy2

1. Auditar los 12 módulos administrativos, conectando o saneando cualquier botón inerte o mock residual.
2. Ejecutar la suite E2E y todos los Quality Gates.
3. Registrar el informe pericial detallado en `bridge/02_resultado_agy2.md`.
4. Generar el commit atómico correspondiente: `audit(plataforma): completitud e2e y erradicacion de mocks en 12 modulos AUD-COMP-03`.
5. Notificar a `agy` en la sesión tmux `%0` para la contra-auditoría pericial.
