# INFORME PERICIAL DE EJECUCIÓN — TAREA [GAP-FIX-01]
## DESBLOQUEO RBAC EN BASE DE DATOS Y SANEAMIENTO NORMATIVO LEGAL

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (Fase 1 del Plan Maestro GAP-FIX)  
**Estado de la Entrega:** 100% Ejecutada, Contra-Verificada y Conforme con Quality Gates  

---

## 1. Resumen Ejecutivo de la Intervención [GAP-FIX-01]

En estricta observancia de los requerimientos fijados por la coordinación y auditoría forense en `bridge/01_tarea_activa.md`, `agy2` ha completado con rigor pericial los dos componentes críticos de la Fase 1:

### 1.1. Desbloqueo RBAC en Base de Datos PostgreSQL (`bd_csh` y `polis_test`)
1. **Migración Alembic Formalizada (`backend/alembic/versions/0054_permisos_plenos_admin.py`)**:
   - `revision = "0054_permisos_plenos_admin"` (acortado a 26 caracteres para garantizar cumplimiento estricto del tipo `VARCHAR(32)` de `alembic_version.version_num` en PostgreSQL).
   - `down_revision = "0053_permiso_testimonios_admin"`.
   - Asignación idempotente de los 8 permisos institucionales faltantes al rol `administrador_identidades`:
     ```python
     PERMISOS_NUEVOS = [
         "indicadores:gestionar",
         "instrumentos:gestionar",
         "presupuesto:gestionar",
         "mesas:abrir",
         "mesas:acuerdos",
         "mesas:fotos:subir",
         "asistencia:verificar",
         "ia:analizar",
     ]
     ```
2. **Aplicación y Verificación en Base de Datos**:
   - `alembic upgrade head` aplicado exitosamente en `bd_csh` (producción/desarrollo) y `polis_test` (suite de pruebas de integración).
   - Verificación directa en `autenticacion.roles`: el rol `administrador_identidades` pasó de 18 a 26 permisos consolidados, sin duplicidades y con tipado JSONB inmutable.
3. **Paridad de la Matriz de Acceso (`docs/permisos-api.md`)**:
   - Se actualizó el contrato formal de autorización en `docs/permisos-api.md` para reflejar que `administrador_identidades` se incorpora canónicamente a las capacidades operativas de gestión distrital (`presupuesto:gestionar`, `indicadores:gestionar`, `instrumentos:gestionar`, `ia:analizar`, `mesas:abrir`, `mesas:fotos:subir`, `mesas:acuerdos`, `asistencia:verificar`, `testimonios:moderar`).
   - Sincronización validada contra el validador pericial `backend/tests/test_access_policy.py`.
4. **Reinicio y Salud del Backend**:
   - `systemctl restart polis-backend` ejecutado.
   - Endpoint canónico `/api/v1/politicas` respondiendo `HTTP 200 OK`.

---

### 1.2. Erradicación Sistemática y Definitiva de "Decreto 037 de 2026"
Se eliminaron todas las menciones afirmativas anacrónicas que atribuían falsamente sustento al "Decreto 037 de 2026", sustituyéndolas por el marco jurídico verídico e institucional (*Ley Estatutaria 1757 de 2015, Sentencia C-150 de 2015 y Plan de Desarrollo Distrital Cartagena 2024–2027*).

#### Archivos Sanitizados en el Frontend (`src/`):
1. `src/features/plataforma/views/configuracion-view.tsx` (L253: input de base legal actualizado a `Ley 1757 de 2015`).
2. `src/features/plataforma/views/actores-view.tsx` (L64: eyebrow actualizado a `Ley 1757 de 2015`).
3. `src/features/plataforma/views/fuentes-view.tsx` (L39: eyebrow actualizado a `Ley 1757 de 2015`).
4. `src/features/mesas/views/mesas-view.tsx` (L146: cabecera institucional actualizada a `Ley Estatutaria 1757 de 2015`).
5. `src/features/seguimiento/components/cadena-valor-tab.tsx` (L247: referencia normativa ajustada a `Ley 1757 de 2015`).
6. `src/features/formularios/components/timbrado-competencia-legal.tsx` (L53, L69, L88, L105, L122 y dimensiones 1–7 alineadas a Ley 1757 / Sentencia C-150 / PDD 2024–2027).
7. `src/features/politicas/views/inicio-view.tsx` (L175: marco constitucional y legal corregido).
8. `src/features/politicas/views/dimensiones-view.tsx` (L148: cita legal corregida).
9. `src/features/politicas/components/enrutador-ciudadano-inteligente.tsx` (L89: sustituido por Ley 1757 de 2015).
10. `src/features/politicas/components/flujo-inversion-gobernanza.tsx` (L225, L299: sustituidos por Ley 1757 y Sentencia C-150).
11. `src/features/politicas/data/dimensiones-detalle.data.ts` (L83, L152, L221, L285, L339, L378, L422, L471: todas las dimensiones ONU actualizadas).
12. `src/features/politicas/data/entidades-cartagena.data.ts` (L5: marco legal actualizado).
13. `src/features/politicas/__fixtures__/politicas.fixture.ts` (L15, L440: fixtures saneados).
14. `src/features/mesas/models/asistencia.ts` y `services/asistencia-api.ts` (comentarios legales actualizados).
15. `src/features/seguimiento/models/devolucion.ts` (L4: referencia a Decreto 037 sustituida por PDD Cartagena 2024–2027).
16. `src/features/diagnostico/models/territorio-diagnostico.ts` (L3: sustituido por Sentencia C-150 de 2015).
17. `src/features/fuentes/__fixtures__/fuentes-iniciales.fixture.ts` (L352: observaciones normativas actualizadas).
18. `src/features/testimonios/data/testimonios.mock.ts` (L92, L94: texto y relato ajustados a PDD Cartagena 2024–2027).
19. `src/features/noticias/data/noticias.mock.ts` (L74, L75, L89: slug, titular, tags y cuerpo de noticia saneados).
20. `src/features/seguimiento/data/compromisos-pas.data.ts` (L7: comentario canónico alineado al PDD Cartagena 2024–2027).

#### Verificación Forense de Texto Residual:
- `grep -rn "Decreto 037 de 2026" src/` -> **0 resultados**.
- La única presencia de la secuencia `"037"` en `src/features/seguimiento/` corresponde taxativamente a la cláusula de descargo y salvaguarda `"no proviene del Decreto 037"` en los metadatos de los compromisos PAS, requerida y auditada en **OBS-11** y validada por `compromisos-store.test.ts` y `backend/tests/test_integridad_compromisos.py`.

---

## 2. Matriz de Cumplimiento de Quality Gates

| Quality Gate | Comando Oficial | Resultado Obtenido | Dictamen |
| :--- | :--- | :--- | :---: |
| **QG1: Verificación UI, Tipos y Linter** | `bun run check` | `node scripts/ui-policy.mjs`<br>`tsc --noEmit`<br>`eslint .` | **0 errores, 0 advertencias** ✅ |
| **QG2: Pruebas Unitarias Frontend** | `bun test` | **321 pass, 0 fail** (1383 expect calls en 34 archivos) | **100% Verde** ✅ |
| **QG3: Compilación Producción Next.js** | `bun run build` | Turbopack build exitoso (18.1s)<br>**190 rutas generadas** (165 rutas estáticas de mesas, SSG y dynamic) | **Limpio** ✅ |
| **QG4: Migración Alembic Head** | `.venv/bin/alembic current` | `0054_permisos_plenos_admin (head)` | **Conforme** ✅ |
| **QG5: Paridad de Esquema Alembic** | `.venv/bin/alembic check` | `No new upgrade operations detected.` | **Conforme** ✅ |
| **QG6: Pruebas de Autorización Backend** | `.venv/bin/pytest tests/test_access_policy.py tests/test_integridad_compromisos.py` | **100 passed in 15.72s** | **100% Verde** ✅ |
| **QG7: Disponibilidad de Servicios** | `systemctl status polis-frontend polis-backend` | Ambos servicios `active (running)`. `curl` a `:3000` y `:8000` retornan `HTTP 200`. | **Operativo** ✅ |
| **QG8: Control de Versiones Git** | `git status` / `git log -1` | Commit atómico `8db9ef9` en `main`. Cero `git push` a remoto. | **Conforme** ✅ |

---

## 3. Detalle del Commit Atómico Realizado

- **Hash de Commit:** `8db9ef9`
- **Mensaje:** `fix(rbac-normativo): [GAP-FIX-01] formalizar permisos plenos en alembic y erradicar decreto 037`
- **Archivos Modificados:** 24 archivos (127 inserciones, 117 eliminaciones).
- **Nueva Migración:** `backend/alembic/versions/0054_permisos_plenos_admin.py`.

---

## 4. Conclusión y Solicitud de Contra-Auditoría

La Fase 1 **`[GAP-FIX-01]`** queda formalmente entregada, verificada y documentada.
Se notifica al Coordinador General `agy` para su contra-auditoría pericial en `tmux` y posterior apertura de la **Fase 2: `[GAP-FIX-02]`** (Conexión de la Gestión de Usuarios a la API de FastAPI).
