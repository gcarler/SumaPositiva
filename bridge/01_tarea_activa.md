# TAREA ACTIVA: [AUD-COMP-02] AUDITORÍA DE CONTRATOS DE API, COBERTURA RBAC Y MANEJO TIPADO DE EXCEPCIONES
## INSPECCIÓN DE RUTAS FASTAPI, SINCRONIZACIÓN MATRIZ DE PERMISOS (DOCS/PERMISOS-API.MD) Y ERRADICACIÓN DE EXCEPCIONES 500 NO CAPTURADAS

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 1: Consistencia Estructural, Esquema y Contratos de Datos (Tarea 1.2)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / SEGURIDAD, CONTRATOS Y CONTROL DE ACCESO  

---

## 🎯 1. Justificación y Alcance de la Tarea

La plataforma POLIS cuenta con más de 20 módulos de backend y más de 170 rutas de API en FastAPI.
Para garantizar **consistencia absoluta de contratos y seguridad perimetral**, se requiere auditar:
1. **Cobertura RBAC Contractual:** Que cada endpoint expuesto esté rigurosamente documentado en la Matriz Canónica de Control de Acceso ([`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md)) y respaldado por tests automáticos en [`backend/tests/test_access_policy.py`](file:///root/polis/backend/tests/test_access_policy.py).
2. **Manejo Tipado de Excepciones:** Que ningún endpoint retorne errores HTTP 500 no controlados con fuga de trazas o información interna de la base de datos ante entradas inválidas o colisiones de unicidad.
3. **Protección de Salida:** Que los endpoints empleen `response_model` tipados para evitar la exposición accidental de hashes o atributos privados de los modelos de base de datos.

---

## 📋 2. Requerimientos Técnicos y Pasos de Inspección

### A. Barrido y Reconciliación de Rutas con la Matriz de Permisos
1. Extraer el inventario de todas las rutas HTTP registradas en la aplicación FastAPI (`app.routes` en `backend/app/main.py`).
2. Comparar exhaustivamente cada ruta con [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md):
   - Módulo
   - Método HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
   - Path de la ruta (incluyendo parámetros de ruta)
   - Rol(es) autorizados
   - Permiso requerido o política pública anónima/declarada
3. Ejecutar y certificar la suite pericial:
   ```bash
   /root/polis/venv/bin/pytest backend/tests/test_access_policy.py
   ```
   Si existen rutas huérfanas o discrepancias, incorporarlas formalmente en `docs/permisos-api.md` con su justificación técnica.

### B. Auditoría de Excepciones y Respuestas de Error
1. Inspeccionar los manejadores globales de excepciones en FastAPI:
   - Validación Pydantic (`RequestValidationError`) $\rightarrow$ Retorno HTTP 422 con formato claro y sanitizado.
   - Autenticación (`HTTPException` 401) $\rightarrow$ Tokens expirados o inválidos manejados sin caída.
   - Autorización (`HTTPException` 403) $\rightarrow$ Detalle del permiso distrital faltante.
   - No encontrado (`HTTPException` 404) $\rightarrow$ Mensaje institucional claro.
   - Conflicto (`HTTPException` 409 o `IntegrityError` de SQLAlchemy) $\rightarrow$ Captura limpia de colisiones `UNIQUE` (ej. radicado duplicado, cédula repetida o apoyo duplicado) sin arrojar 500 ni exponer sentencias SQL crudas.
   - Excepciones no controladas $\rightarrow$ Manejador de último recurso que registre en log interno y responda JSON genérico seguro con código 500.

### C. Higiene de DTOs de Respuesta (`response_model`)
1. Constatar que las rutas que retornan entidades con usuarios o datos protegidos no expongan campos como `password_hash`, `salt` o metadatos de auditoría confidenciales.

---

## 🧪 3. Pruebas y Criterios de Aceptación

1. **Test de Matriz de Permisos Verde:**
   - `backend/tests/test_access_policy.py` pasa al 100% (todas las pruebas aprobadas).
2. **Cero Excepciones 500 no capturadas:**
   - Comprobación de respuestas HTTP estructuradas ante datos erróneos.
3. **Quality Gates Inviolables:**
   - `bun run ui:check` (0 infracciones).
   - `bun run check` (0 errores TypeScript, 0 warnings ESLint).
   - `bun test` (100% de tests frontend aprobados).
   - `pytest backend/tests/` (100% de tests backend aprobados).
   - `bun run build` (Compilación exitosa con Turbopack).
4. **Integridad de Base de Datos:**
   - 33 mesas territoriales, 36 agendas comunitarias y 11 fichas técnicas de indicadores 100% intactas.

---

## 🔒 4. Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Prohibido alterar códigos o tablas BPIN distritales.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA.
3. **Inviolabilidad de Producción (`bd_csh`):** Los datos existentes no se truncan, borran ni sobrescriben.
4. **Protocolo Zero-Push:** Commits atómicos confinados estrictamente en la rama local `main`.

---

## 🚀 5. Instrucciones de Entrega para agy2

1. Ejecutar el barrido de rutas y auditoría de matriz de permisos y excepciones.
2. Si detecta rutas sin registrar o discrepancias en excepciones, subsanarlas con pulcritud.
3. Validar todos los Quality Gates.
4. Registrar el informe pericial detallado en `bridge/02_resultado_agy2.md`.
5. Generar el commit atómico correspondiente: `audit(api): contratos rbac excepciones tipadas y matriz permisos AUD-COMP-02`.
6. Notificar a `agy` en la sesión tmux `%0` para la contra-auditoría pericial.
