# INFORME DE RESULTADO: TAREAS [CIERRE-07] Y [CIERRE-07b] CIERRE DE RESERVAS

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tareas Reportadas:**  
1. `[CIERRE-07] Alcance territorial PBAC de permisos institucionales` (Commit: `2abb9d3`)  
2. `[CIERRE-07b] Cierre de reservas del dictamen de CIERRE-07 (análisis alternativas/compromisos, documentación, respaldo nuevo y UI administrativa de ámbitos)`  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md`, `bridge/01_tarea_activa.md` y `bridge/03_dictamen_revision.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricta atención al Dictamen EAF (`bridge/03_dictamen_revision.md`) y la tarea activa `[CIERRE-07b]` (`bridge/01_tarea_activa.md`), se cerraron satisfactoriamente todas las observaciones y reservas:

1. **Respaldo Pericial Nuevo Inmediato:**
   - Ejecutado: `bash scripts/respaldo_bd.sh`.
   - Archivo generado: `/root/polis/backups/bd_csh_20261013_051352.dump` (con hash `.sha256`, permisos `0600`).
   - Registrado para trazabilidad forense antes de cualquier despliegue subsiguiente.

2. **Resolución Pericial sobre Alternativas MGA y Compromisos PAS (Reserva Media):**
   - **Evaluación del esquema de base de datos (`bd_csh`):**
     - En `motor_politicas.banco_alternativas` **no existe** clave foránea ni relación atómica a `mesas_trabajo.mesas` ni a `geodatos.territorios`. El campo `territorios_focalizados` es descriptivo y `territorio_cobertura` refleja coberturas macro (las 8 alternativas oficiales del censo abarcan múltiples UCGs, varias localidades o el distrito completo, ej. ALT-SEG-06 sobre corredores principales en Localidades 1, 2 y 3).
     - En `seguimiento.compromisos_pas` **no existe** columna `mesa_id`, `territorio_id` ni `localidad`. Los compromisos se articulan exclusivamente por `entidad_responsable` del orden central distrital (Secretaría de Hacienda, Distriseguridad, Secretaría del Interior, EPA, MECAR) y código MGA, midiendo metas cuatrienales de impacto de ciudad.
     - **Roles y Permisos:** Los roles territoriales operativos (`facilitador_mesa`, `ciudadano`) **no poseen** permisos de gestión (`alternativas:gestionar`, `seguimiento:gestionar`); dichos permisos están reservados a `autoridad_distrital` y `administrador_identidades` (exento).
   - **Determinación Arquitectural:**
     - Las alternativas y compromisos son **instrumentos macropolíticos globales por diseño**. Someterlos a filtros por localidad atómica fragmentaría la planeación cuatrienal centralizada y la competencia de las Secretarías Distritales.
     - Su salvaguarda opera mediante **RBAC institucional** estricto (`alternativas:gestionar`, `seguimiento:gestionar`) y **compuertas de fase de política pública** (`FASE_2_FORMULACION`, `FASE_3_PLAN_ACCION` validadas por `verificar_escritura_fase`).
   - **Documentación:** Se actualizó formalmente `docs/contrato-alcance-territorial-cierre07.md` (§5.2 y §5.3) y `docs/permisos-api.md` (sección sobre Alcance territorial y modelo PBAC), declarando explícitamente esta exclusión motivada.

3. **Interfaz Web de Gestión de Ámbitos en `/plataforma` (Ítem Opcional Implementado):**
   - Se implementó la gestión visual de ámbitos en el panel de detalle de usuario (`UsuarioDetallePanel` en `src/features/usuarios/panels/usuario-detalle-panel.tsx`), accesible exclusivamente para `administrador_identidades` (`puedeGestionar`).
   - **Funcionalidades:**
     - Visualización del listado de ámbitos PBAC asignados (con badges de tipo: `distrital`, `localidad`, `mesa`, identificador y fecha).
     - Estado informativo cuando el usuario no tiene ámbitos: *"Sin ámbito específico asignado — Jurisdicción distrital global plena (comportamiento retrocompatible por defecto)"*.
     - Revocación controlada con botón de eliminación y solicitud de motivo obligatorio pericial.
     - Formulario integrado de asignación controlada con selección de tipo (`distrital`, `localidad` con dropdown de LOC-1/2/3, o `mesa` con input de código), motivo pericial obligatorio y confirmación instantánea vía react-query.
   - **Integración API Cliente:** Se incorporaron los métodos tipados `ambitosUsuario`, `asignarAmbitoUsuario` y `revocarAmbitoUsuario` en `identidadApi` (`src/features/sesion/services/identidad-api.ts`).
   - **Pruebas Frontend:** Se agregaron pruebas unitarias en `src/features/usuarios/services/usuarios-integracion.test.ts` (9/9 pasadas).
   - **Validación UI:** `bun run ui:check` (100% conforme con controles de `shared/ui` y tokens), `tsc --noEmit` y `eslint .` 100% limpios sin advertencias.

4. **Inviolabilidad de Producción y Censo:**
   - Censo `bd_csh` intacto: 33 mesas, 36 agendas, 11 fichas, 17 actores estratégicos.
   - 0 drift en Alembic (`uv run --project backend alembic -c backend/alembic.ini check`).
   - Servicios activos: `polis-backend`, `polis-frontend`, `nginx`, `postgresql@18-main`.
   - Endpoints en vivo: `/`, `/geovisor`, `/plataforma/usuarios`, `/api/v1/health/live`, `/api/v1/health/ready` todos en HTTP 200 OK.

---

## 🏗️ 2. Arquitectura de PBAC y Componentes Verificados

### 2.1. Resolución Jerárquica de Localidad (`ambito_territorial.py`)
- CTE recursiva de PostgreSQL que asciende por `geodatos.territorios.territorio_padre_id` (hasta 10 niveles) hasta resolver a la localidad raíz (`LOC-1`, `LOC-2`, `LOC-3`).
- Resuelve correctamente nivel directo, barrios, corregimientos y zonas insulares.
- En submesas huérfanas de territorio, hereda la localidad de la mesa raíz padre.
- Asentamiento forense inmutable de `acceso_territorial_denegado` en `autenticacion.eventos_identidad`.

### 2.2. Exclusión Motivada de Alternativas y Compromisos
- Documentado en `docs/contrato-alcance-territorial-cierre07.md`:
  - §5.2: Endpoints de micro-mesas y evidencias bajo PBAC territorial (`PATCH /mesas/{id}`, `POST .../acta`, `POST .../cerrar`, `POST .../participantes`, `POST .../fotos`, `POST/PUT .../submesas`, `POST .../mesas`, `POST/PATCH .../agendas`).
  - §5.3: Justificación de exclusión de `/api/v1/alternativas` y `/api/v1/compromisos` por ausencia de vínculo relacional atómico, naturaleza multijurisdiccional de ciudad y protección mediante RBAC y fase gating.
- Documentado en `docs/permisos-api.md`: sección *"Alcance territorial y modelo PBAC (CIERRE-07)"*.

### 2.3. Pantalla de Gestión Visual de Ámbitos en `/plataforma`
- Ubicación: Panel lateral `usuario-detalle-panel.tsx` desplegado desde `/plataforma/usuarios`.
- Cliente API: `identidadApi.ambitosUsuario`, `identidadApi.asignarAmbitoUsuario`, `identidadApi.revocarAmbitoUsuario`.
- Accesibilidad: Cumplimiento estricto de las directrices UI001 con controles de `shared/ui` (`Label`, `Input`, `Select`, `Button`, `Badge`).

---

## 🧪 3. Resultados de Pruebas y Certificación

### 3.1. Backend Pytest
- `backend/tests/test_cierre07_ambito_territorial.py`: **7 / 7 pasadas** (resolución recursiva, retrocompatibilidad global, denegación 403, mesa específica, roles exentos, endpoints administrativos, herencia de submesas).
- `backend/tests/test_access_policy.py`: **100 / 100 pasadas** (matriz de permisos y autorización).
- `backend/tests/test_identidad_completa.py`: **24 / 24 pasadas**.
- `backend/tests/test_cierre02_herramientas_identidad.py`: **6 / 6 pasadas**.
- **Aislamiento y Teardown:** Base de datos `polis_test` limpia sin interferencias entre módulos.

### 3.2. Frontend Bun Test y Verificaciones
- **Tests Totales:** **503 / 503 passing** en 57 archivos (2357 expect calls).
- **Integración Usuarios:** `src/features/usuarios/services/usuarios-integracion.test.ts` con **9 / 9 passing** (incluyendo consulta, asignación y revocación de ámbitos).
- **TypeScript:** `tsc --noEmit` completado con **0 errores**.
- **ESLint:** `eslint .` completado limpio con **0 advertencias**.
- **UI Policy:** `node scripts/ui-policy.mjs` completado con **0 incumplimientos**.

---

## 📊 4. Quality Gates y Estado del Sistema

| Gate / Criterio | Meta / Exigencia | Resultado Obtenido | Estado |
|---|---|---|---|
| **Pruebas Backend CIERRE-07 + RBAC** | 100% pasando | **107 / 107 passing** | ✅ **VERDE** |
| **Pruebas Backend Identidad + Bootstrap** | 100% pasando | **30 / 30 passing** | ✅ **VERDE** |
| **Pruebas Frontend** | 100% de la suite pasando | **503 / 503 passing** | ✅ **VERDE** |
| **TypeScript (tsc)** | Cero errores de tipado | `tsc --noEmit` completado sin errores | ✅ **VERDE** |
| **ESLint** | Cero violaciones de estilo | `eslint .` completado limpio | ✅ **VERDE** |
| **UI Policy (`ui:check`)** | Token, capas y accesibilidad | Controles, tokens, capas e historias correctos | ✅ **VERDE** |
| **Alembic Drift** | Cero divergencia con BD | `alembic check` -> No new upgrade operations | ✅ **0 DRIFT** |
| **Alembic Head** | Cabeza única verificada | `0060_ambito_territorial (head)` | ✅ **ÚNICA** |
| **Censo `bd_csh` Intacto** | 33 mesas, 36 agendas, 11 fichas, 17 actores | 33 / 36 / 11 / 17 exactos verificados por SQL | ✅ **INTACTO** |
| **Servicios Systemd** | Servicios activos | `polis-backend`, `polis-frontend`, `nginx`, `postgresql@18-main` activos | ✅ **ACTIVOS** |
| **Endpoints en Vivo** | Respuesta HTTP | `/`, `/geovisor`, `/plataforma/usuarios`, `/api/v1/health/live`, `/api/v1/health/ready` -> HTTP 200 OK | ✅ **OPERATIVO** |

---

## 📌 5. Estado de Commits en `main`

Commits acumulados:
```text
2abb9d3 feat(identidad): alcance territorial pbac de permisos institucionales CIERRE-07
b0b6754 docs(audit): dictamen 06c aprobado y contrato 07 aprobado; autoriza codificar
bbc5950 docs(bridge): informe de entrega de CIERRE-06c y correccion del contrato CIERRE-07
f16e34e docs(identidad): correccion del contrato de alcance territorial CIERRE-07 segun dictamen EAF
69ea019 feat(identidad): modo --adicional en bootstrap de administradores CIERRE-06c
```

---

## 🛑 6. Conclusión y Espera de Dictamen
La tarea **[CIERRE-07b]** se ha completado en su totalidad:
1. Respaldo nuevo registrado en `/root/polis/backups/bd_csh_20261013_051352.dump`.
2. Justificación técnica de alternativas y compromisos documentada en el contrato y en la matriz de permisos.
3. Pantalla de administración de ámbitos PBAC implementada en `/plataforma/usuarios` y probada con 100% de cumplimiento en pruebas y UI policy.
4. Informe consolidado y listo para commit.

Quedo a la espera del dictamen final del Auditor EAF `agy`.
