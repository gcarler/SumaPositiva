# TAREA ACTIVA: [AUD-COMP-01] AUDITORÍA DE PARIDAD DE ESQUEMA POSTGRESQL (BD_CSH), MIGRACIONES ALEMBIC Y MODELOS SQLALCHEMY
## INSPECCIÓN FORENSE DE ESTRUCTURAS, RESTRICCIONES FK, ÍNDICES POSTGIS Y ALINEACIÓN DE DTOS PYDANTIC

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 1: Consistencia Estructural, Esquema y Contratos de Datos (Tarea 1.1)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / INTEGRIDAD ESTRUCTURAL DE DATOS  

---

## 🎯 1. Justificación y Alcance de la Tarea

La base de datos de producción `bd_csh` alberga las tablas maestras de la política pública de seguridad humana de Cartagena (33 mesas de diálogo, 36 agendas comunitarias, 11 fichas de indicadores, 17 actores institucionales, propuestas cívicas de Modo Barrio y notificaciones transaccionales).

Para garantizar la **consistencia estructural y ausencia absoluta de drift**, esta primera tarea exige una inspección forense exhaustiva de la relación tripartita:
$$\text{Base de Datos PostgreSQL (bd\_csh)} \iff \text{Migraciones Alembic} \iff \text{Modelos SQLAlchemy y DTOs Pydantic}$$

---

## 📋 2. Requerimientos Técnicos y Pasos de Inspección

### A. Diagnóstico de Drift con Alembic
1. Ejecutar en el backend de FastAPI:
   ```bash
   cd /root/polis/backend && /root/polis/backend/.venv/bin/alembic check
   ```
2. Si `alembic check` detecta operaciones pendientes o discrepancias de tipos/columnas entre los modelos SQLAlchemy (`backend/app/modules/*/models.py`) y `bd_csh`:
   - Analizar el diff detallado.
   - Si se trata de ajustes en modelos para alinear tipos (ej. longitudes de `String`, nombres de restricciones o índices), aplicar la corrección en los modelos o generar una migración Alembic idempotente y segura que preserve el 100% de los datos existentes.

### B. Inspección de Tablas y Esquemas en `bd_csh`
1. Auditar la totalidad de los esquemas distritales activos:
   - `mesas_trabajo` (`mesas`, `agendas`, `submesas`, `participantes_mesa`, `compromisos_mesa`, `evidencias_mesa`, etc.)
   - `indicadores` (`fichas_tecnicas_indicadores`, `mediciones_indicador`)
   - `participacion_ciudadana` (`propuestas_ciudadanas`, `apoyos_propuestas`, `actores_estrategicos`, `notificaciones_transaccionales`, `sesiones_anonimas`, `testimonios_comunitarios`, `formularios_consulta`, `respuestas_formulario`)
   - `presupuesto` (`fuentes_financiacion`, `asignaciones_presupuestales`)
   - `comunicacion` (`noticias`, `tareas_comunicacion`)
   - `autenticacion` (`usuarios`, `roles`, `sesiones_usuario`)
   - `auditoria` (`registros_auditoria`)
   - `seguimiento` (`avances_compromiso`, `rendicion_cuentas`)
2. Verificar:
   - Claves foráneas (`FOREIGN KEY`) y cascadas seguras.
   - Índices espaciales PostGIS (`GIST`) en columnas de geometría o coordenadas WGS84.
   - Restricciones de unicidad (`UNIQUE`) en códigos oficiales (ej. `codigo_radicado`, `slug`, `cedula_participante`).
   - Cero registros huérfanos o relaciones rotas.

### C. Alineación de DTOs Pydantic (`schemas.py`)
1. Comprobar que los esquemas de entrada y salida en `backend/app/modules/*/schemas.py`:
   - Reflejen con precisión la nulabilidad de las columnas físicas en PostgreSQL (`nullable=False` $\rightarrow$ campo obligatorio; `nullable=True` $\rightarrow$ campo opcional).
   - Definan validadores para prevenir cadenas vacías o tipos incongruentes.

---

## 🧪 3. Pruebas y Criterios de Aceptación

1. `alembic check` reporta `No new upgrade operations detected.` (cero drift).
2. Verificación de integridad en `bd_csh`:
   - 33 mesas de diálogo territorial 100% intactas.
   - 36 agendas comunitarias 100% intactas.
   - 11 fichas técnicas de indicadores 100% intactas.
   - 17 actores institucionales 100% intactos.
3. Quality Gates de Frontend y Backend aprobados:
   - `bun run ui:check` (0 infracciones).
   - `bun run check` (0 errores de TypeScript y ESLint).
   - `bun test` (100% pruebas frontend aprobadas).
   - `pytest backend/tests/` (100% pruebas backend aprobadas).
   - `bun run build` (Compilación exitosa con Turbopack).

---

## 🔒 4. Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Prohibido alterar códigos o tablas BPIN distritales.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA.
3. **Inviolabilidad de Producción (`bd_csh`):** Los datos existentes no se truncan, borran ni sobrescriben.
4. **Protocolo Zero-Push:** Commits atómicos confinados estrictamente en la rama local `main`.

---

## 🚀 5. Instrucciones de Entrega para agy2

1. Ejecutar el diagnóstico de paridad de esquema y documentar hallazgos.
2. Si se requieren correcciones menores o migraciones de alineación, aplicarlas con salvaguarda de datos.
3. Ejecutar todos los Quality Gates.
4. Registrar el informe pericial detallado en `bridge/02_resultado_agy2.md`.
5. Generar el commit atómico correspondiente: `audit(db): paridad de esquema postgresql alembic y modelos AUD-COMP-01`.
6. Notificar a `agy` en la sesión tmux `%0` para contra-auditoría pericial.
