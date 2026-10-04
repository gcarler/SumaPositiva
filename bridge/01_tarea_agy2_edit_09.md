# Tarea EDIT-09: Modelo Relacional y Persistencia del Banco de Alternativas MGA

**Prioridad**: **MEDIA** (Cierre de Ciclo de Vida Metodológico MGA)  
**Clasificación**: Backend Architecture & Fullstack Data Persistence  
**Responsable**: agy2 (EDD)  
**Supervisor**: EAF  

---

## 1. Diagnóstico Pericial del Hallazgo

En la auditoría forense se constató que el Banco Distrital de Alternativas MGA opera actualmente en memoria:

1. **Estado en el Frontend (`src/features/alternativas/state/alternativas-store.ts`)**:
   - Inicializa cargando las 8 iniciativas canónicas desde [`src/features/alternativas/data/alternativas-canonicas.data.ts`](file:///root/polis/src/features/alternativas/data/alternativas-canonicas.data.ts).
   - Las mutaciones (`agregarAlternativa`, `actualizarAlternativa`, `eliminarAlternativa`, `cambiarEstado`) solo modifican el array local de Zustand. Al recargar la página, cualquier alternativa nueva creada por el usuario desaparece.

2. **Articulación Parcial en Base de Datos**:
   - La tabla `presupuesto.asignaciones_presupuestales` y `presupuesto.fuentes_financiacion` persisten en PostgreSQL.
   - La tabla `seguimiento.compromisos_pas` tiene una columna `alternativa_mga_codigo VARCHAR(50)` que apunta a códigos de alternativas (ej. `ALT-SEG-06`, `ALT-ESCNNA-01`).
   - Sin embargo, **no existe la tabla `banco_alternativas` ni un router FastAPI dedicado a alternativas**.

---

## 2. Alcance y Especificación Técnica

1. **Modelo de Datos y Migración Alembic (`0043_modulo_banco_alternativas.py`)**:
   - Crear tabla en esquema `motor_politicas` o `presupuesto` (o nuevo esquema si procede):
     - `id`: UUID Primary Key
     - `codigo`: VARCHAR(50) UNIQUE NOT NULL (ej. `ALT-ESCNNA-01`)
     - `nombre`: VARCHAR(250) NOT NULL
     - `sector`: VARCHAR(50) NOT NULL (educacion, seguridad, convivencia, etc.)
     - `linea_estrategica_id`: UUID nullable FK a `motor_politicas.lineas_estrategicas`
     - `dimension_id`: UUID nullable FK a `motor_politicas.dimensiones_seguridad_humana`
     - `costo_estimado_cop`: NUMERIC(18, 2) NOT NULL DEFAULT 0
     - `horizonte_anios`: INTEGER NOT NULL DEFAULT 4
     - `estado`: VARCHAR(30) NOT NULL DEFAULT 'en_formulacion'
     - `requiere_consulta_previa`: BOOLEAN NOT NULL DEFAULT false
     - `territorios_focalizados`: JSONB NOT NULL DEFAULT '[]'
     - `objetivo_central`: TEXT
     - `creado_en`, `actualizado_en`: TIMESTAMPTZ NOT NULL
   - Sembrar en la migración las 8 alternativas canónicas preexistentes de Cartagena de forma trazable y verificable.

2. **Módulo Backend (`backend/app/modules/alternativas/`)**:
   - `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`.
   - Endpoints:
     - `GET /api/v1/alternativas`: Consulta pública con filtros por sector, línea, dimensión y estado.
     - `GET /api/v1/alternativas/{id_o_codigo}`: Detalle de iniciativa.
     - `POST /api/v1/alternativas`: Creación con permiso `alternativas:gestionar`.
     - `PATCH /api/v1/alternativas/{id}`: Actualización controlada y auditoría inmutable.
     - `DELETE /api/v1/alternativas/{id}`: Eliminación lógica o física con verificación de dependencias en `compromisos_pas`.

3. **Cableado del Frontend (`src/features/alternativas/`)**:
   - Crear `src/features/alternativas/services/alternativas-api.ts`.
   - Modificar `alternativas-store.ts` para cargar desde la API con fallback seguro en contingencia.
   - Guardar y editar comunicándose con la API sin mutación silenciosa en error.

4. **Pruebas y Quality Gates**:
   - Pruebas backend `backend/tests/test_alternativas_mga.py` (CRUD, RBAC, auditoría).
   - Pruebas frontend (`bun test`).
   - `bun run check` limpio.
   - Paridad Alembic: `command.check()` limpio (0 diffs).

---

## 3. Criterios de Aceptación Forense

1. Alternativas creadas o modificadas desde la UI persisten efectivamente en PostgreSQL tras recarga.
2. Alembic head único y sin diffs.
3. 100% pruebas de backend y frontend pasando.
4. Cero afectación a archivos de Codex; cero push a remoto; cero migraciones sobre `bd_csh`.
