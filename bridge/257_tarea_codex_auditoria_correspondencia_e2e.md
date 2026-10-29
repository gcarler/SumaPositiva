# Encargo 257: Auditoría Exhaustiva End-to-End de Correspondencia y Tuberías: Frontend ↔ Backend ↔ Base de Datos

**Fecha:** 28 de octubre de 2026  
**Responsable asignado:** Codex (`=codex:0.0`)  
**Coordinador:** Antigravity (`agy:0.0`)  
**Entorno de ejecución:** Solo lectura / Auditoría estricta (no alterar datos de producción ni romper contratos existentes sin previa concertación).  
**Entregable:** `bridge/257_informe_codex_auditoria_correspondencia_e2e.md` y `bridge/257_matriz_correspondencia_e2e.json`

---

## 1. Mandato y Alcance General

El usuario ha solicitado una auditoría rigurosa y exhaustiva para garantizar que **todo lo existente en el frontend tenga su correspondencia funcional y legal en el backend y su persistencia real en la base de datos PostgreSQL**:

> *"Creo que hay que hacer una revisión exhaustiva y rigurosa de que todo lo que está en el frontend, que tenga su correspondencia en el backend y su persistencia en la base de datos... pasando por endpoints, sp, crud, crud, estamos garantizar que todas las tuberías y pipelines sean 100% funcionales y que legalidad de backend y frontend está garantizada"*.

Esta auditoría debe abarcar **todos los módulos de la plataforma POLIS** a lo largo de las 3 capas:
1. **Frontend**: Vistas, paneles laterales (SidePanels), componentes, hooks TanStack Query, llamadas `apiFetch`.
2. **Backend**: Routers FastAPI (`/api/v1/*`), dependencias de autenticación y permisos PBAC, capas de servicio (`Service`) y repositorio (`Repository`), transacciones y esquemas Pydantic.
3. **Base de Datos (`bd_csh`)**: Esquemas de PostgreSQL (`autenticacion`, `geodatos`, `motor_politicas`, `participacion_ciudadana`, `compromisos_pdd`, `analitica`, `auditoria`), tablas, vistas, funciones almacenadas / SPs, restricciones de integridad (`CHECK`, `FK`, `UNIQUE`), secuencias y migraciones Alembic.

---

## 2. Ejes de Inspección y Preguntas Clave por Capa

### Eje 1: Tuberías Frontend ↔ Backend (Endpoints y CRUD)
- **Inventario completo de llamadas HTTP:** Analizar todas las funciones en `src/features/*/services/*` y llamadas a `apiFetch`.
- **Detección de Mocks y Fallbacks:** Identificar qué vistas o paneles siguen dependiendo de datos mock (`*.mock.ts`), fallbacks locales silenciosos o datos quemados cuando la API falla o no existe.
- **Correspondencia de Endpoints:** Verificar que cada endpoint consumido por el frontend exista exactamente en el backend (verbo HTTP, ruta exacta, parámetros de query, path params).
- **Consistencia de Tipos y Payloads:** Cotejar si las interfaces TypeScript en `src/features/*/models/*` coinciden con los modelos Pydantic de entrada (`*Crear`, `*Edicion`) y salida (`*Lectura`) del backend. Detectar campos ignorados, mal nombrados (`snake_case` vs `camelCase`) o tipos incompatibles.

### Eje 2: Tuberías Backend ↔ Base de Datos (Persistencia, SPs y Transacciones)
- **Persistencia real en Base de Datos:** Para cada operación de escritura (`POST`, `PUT`, `PATCH`, `DELETE`), verificar si realmente ejecuta `INSERT`, `UPDATE`, `DELETE` en las tablas de `bd_csh` bajo `transaction(session)` o si hay endpoints "stub" que solo devuelven respuestas estáticas sin persistir.
- **Procedimientos Almacenados y Funciones SQL (SPs):**
  - Inventariar todas las funciones almacenadas en PostgreSQL (`\df` en todos los esquemas, funciones espaciales PostGIS, generadores UUID, triggers de actualización).
  - Verificar si el código backend o scripts invocan funciones que existen y están vigentes en la base de datos de producción (`bd_csh`).
- **Restricciones de Integridad y Check Constraints:**
  - Auditar que los valores permitidos en los esquemas Pydantic / TypeScript no violen constraints en la base de datos (como el hallazgo reciente donde `chk_estado_testimonio` bloqueaba `BORRADOR`).

### Eje 3: Legalidad, Seguridad y Permisos PBAC
- **Alineación de Permisos:** Cotejar la matriz `docs/permisos-api.md`, el frontend (`src/features/plataforma/models/acceso.ts`, `sidebar-institucional.tsx`) y los decoradores `Depends(requerir_permiso(...))` en FastAPI.
- **Nivel de Identidad:** Verificar si los endpoints exigen `anonima`, `declarada` o `verificada`, y si el frontend provee adecuadamente los tokens o credenciales para cada nivel.
- **Endpoints Expuestos vs Protegidos:** Confirmar que ningún endpoint administrativo o con datos sensibles esté desprotegido en el backend.

### Eje 4: Módulos a Auditar al Detalle
1. **Identidad & Sesión** (`/autenticacion`, MFA, sesiones, usuarios, roles, ámbitos).
2. **Mesas Territoriales & Actas** (`/mesas`, deliberación, fotos, evidencias, asistencia, acuerdos).
3. **Participación & Aportes** (`/aportes`, votos, apoyo comunitario, priorización).
4. **Testimonios Comunitarios & Memoria** (`/testimonios`, borrador, moderación, publicación, territorios).
5. **Noticias & Contenidos** (`/noticias`, `/contenido`, categorías, estados).
6. **Formularios Dinámicos & Instrumentos** (`/formularios`, esquemas jsonform, respuestas ciudadanas).
7. **Geodatos & Geovisor** (`/geodatos`, capas, 2.449 indicadores, SIG, SIEDCO, búsqueda espacial).
8. **Diagnóstico & Motores EAF** (`/diagnostico`, Motor 1, Motor 2, Motor 3, PPI, MGA, Triada, cruces).
9. **Compromisos PDD** (`/compromisos`, 225k compromisos, metas, ingesta masiva).
10. **Comunicaciones** (`/comunicaciones`, tareas, cronograma, kanban, entregables).
11. **Fuentes & Actores** (`/fuentes`, `/actores`, catálogo oficial de fuentes, actores institucionales).
12. **Seguimiento & Políticas Públicas** (`/seguimiento`, `/politicas`, dimensiones ONU, heros rotativos).
13. **Configuración & Auditoría** (`/configuracion`, bitácora de auditoría, logs).

---

## 3. Formato del Entregable Requerido

Codex debe estructurar el informe en `bridge/257_informe_codex_auditoria_correspondencia_e2e.md`:

1. **Resumen Ejecutivo y Semáforo Global:**
   - Total de módulos auditados.
   - Total de flujos Frontend ↔ Backend ↔ BD verificados.
   - Cantidad de flujos 100% operativos vs con advertencias vs rotos o incompletos.
2. **Matriz Detallada de Correspondencia:**
   - Tabla con columnas:
     - `Módulo`
     - `Flujo / Vista / Panel Frontend`
     - `Llamada API (Método y Ruta)`
     - `Handler Backend (Router / Service / Repo)`
     - `Persistencia BD (Esquema.Tabla / SP / Constraint)`
     - `Permiso PBAC Exigido vs Declarado`
     - `Estado (🟢 100% Conectado / 🟡 Parcial o Mock / 🔴 Inconsistente o Roto)`
     - `Observaciones / Evidencia técnica`
3. **Inventario Exhaustivo de Brechas (Gaps):**
   - Endpoints huérfanos (declarados en backend pero nunca usados en frontend).
   - Vistas o componentes frontend que llaman a endpoints inexistentes o caen a mocks.
   - SPs o funciones de BD llamadas en código que no existen o tienen firmas distintas.
   - Discrepancias de nombres de atributos (`camelCase` vs `snake_case` que se pierden).
   - Inconsistencias entre constraints de BD y validaciones de Pydantic/Zod.
4. **Plan Priorizado de Remediación:**
   - Lote 1: Críticos / Bloqueantes (roturas de tubería activas).
   - Lote 2: Moderados (mocks residuales, atributos desalineados).
   - Lote 3: Limpieza y deuda técnica (endpoints huérfanos, optimizaciones).
5. **Archivo JSON complementario (`bridge/257_matriz_correspondencia_e2e.json`):**
   - Estructura legible por máquina con el estado de cada tubería para integración continua.

---

## 4. Instrucciones Operativas para Codex
- Ejecutar la auditoría en modo de análisis e inspección de código y consultas de verificación en bases de datos.
- Prohibido modificar datos transaccionales de producción en `bd_csh` (usar transacciones de solo lectura o `ROLLBACK` si se requiere probar escrituras de prueba).
- Al concluir, registrar la entrega en `bridge/257_informe_codex_auditoria_correspondencia_e2e.md` y notificar a Antigravity.
