# INFORME DE RE-AUDITORÍA DE CALIDAD: E1 — Base Modular y Clean Architecture

**Fecha**: 2026-10-01  
**Auditor**: freebuff (GPT-6 Luna)  
**Entrega Vinculada**: E1  
**Dictamen**: CON_OBSERVACIONES  
**Puntuación de Calidad**: 68/100  
**Modalidad**: Inspección estática de documentación, configuración y código; no se ejecutaron builds ni pruebas.

---

### 1. Resumen Pericial

Se verificó la separación de capas frontend (`app`, `core`, `shared`, `features`), la API FastAPI, el uso de sesiones SQLAlchemy asíncronas por petición, el proxy de Next.js y la configuración `output: "standalone"`. La estructura es reconocible y está respaldada por convenciones y CI. No se puede certificar en esta reauditoría que los builds, el despliegue standalone ni los health checks funcionen en el entorno objetivo, porque no se ejecutaron.

Hay una observación de seguridad de severidad alta: la configuración incluye claves JWT y salt de IP predeterminados y conocidos por el repositorio, sin una validación visible que impida arrancar en producción con esos valores. También hay una diferencia material entre la versión de base de datos declarada para la entrega y la imagen usada por CI.

### 2. Cumplimiento de Contratos y Estándares

- **Arquitectura**: `docs/arquitectura.md` y `AGENTS.md` definen límites de imports, ensamblaje global en `app` y módulos backend por funcionalidad; el layout real `src/` y `backend/app/modules/` coincide en lo esencial.
- **Frontend/build**: `next.config.ts` establece `output: "standalone"` y reenvía `/api/v1/*` a FastAPI mediante `POLIS_BACKEND_URL`.
- **Backend**: `backend/app/core/database.py` crea `AsyncSession` por petición y `backend/app/main.py` registra lifespan, CORS y health/router. `backend/app/core/migrations.py` obtiene la revisión esperada del grafo Alembic.
- **CI**: `.github/workflows/check.yml` contiene validaciones frontend y backend; evidencia documental, no ejecución independiente en esta reauditoría.

### 3. Hallazgos y Observaciones No Bloqueantes

1. **ALTA — Secretos criptográficos inseguros como valores predeterminados** (`backend/app/core/config.py`). `jwt_secret_key` e `ip_salt` tienen cadenas fijas en código. No se observa un validador que exija secretos configurados/rotados cuando `environment="production"`. Si el despliegue omite variables, JWT y huellas quedan protegidos con valores públicos, comprometiendo autenticidad y seudonimización. **Recomendación**: fallar al iniciar en producción si los secretos faltan, son predeterminados o débiles; gestionar rotación y configuración fuera del repositorio.
2. **MEDIA — Entorno de CI no coincide con el objetivo descrito** (`.github/workflows/check.yml`, `compose.yaml`, `docs/plan-trabajo.md`). CI usa `postgis/postgis:16-3.5`, mientras E1/plan proclaman PostgreSQL 18.6 + PostGIS 3.6. Los resultados actuales de CI no demuestran compatibilidad con la versión productiva declarada. **Recomendación**: decidir y documentar la versión soportada; incluir una matriz o job de integración equivalente al objetivo antes de certificar despliegue.
3. **MEDIA — La misión de E1 afirma despliegue/operación, pero la evidencia revisada es de scaffold y configuración**. `README.md` limita expresamente esta entrega a desarrollo local y dice que el despliegue conjunto se planifica aparte. No hay evidencia de servicios supervisados, configuración real de producción ni restauración. **Recomendación**: limitar el dictamen E1 a base modular y build; evaluar operación en la tarea de despliegue.

### 4. Conclusión y Dictamen Oficial

**CON_OBSERVACIONES (68/100).** La base modular está estructurada de acuerdo con la arquitectura escrita y cuenta con CI configurada, pero no se certifican sus ejecuciones ni el despliegue. La clave JWT y el salt predeterminados deben considerarse riesgo bloqueante para cualquier entorno productivo hasta demostrar configuración segura. No se modificó código fuente; el informe es una reauditoría estática y no constituye certificación de seguridad operacional.

**Pruebas no ejecutadas**: `bun run check`, `bun run build`, `bun run backend:check`, smoke test de health y validación con PostgreSQL 18.6/PostGIS 3.6. No se alteró ninguna base de datos.