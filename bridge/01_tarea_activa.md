# TAREA ACTIVA: [FIX-EDIT-MESA-01] REMEDIACIÓN INTEGRAL DE EDICIÓN DE MESAS (LUGAR, FECHA, HORARIO, RESPONSABLES) Y PERSISTENCIA REAL

**Fecha:** 2026-10-10  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Requerimiento Expreso del Usuario ("una vez intenté editar la información de una de las mesas en la plataforma, por ejemplo el lugar de realización y no pude. puedes revisar ese tema con tu equipo de trabajo")  
**Severidad:** ALTA / OPERATIVA (Usabilidad, Gobernanza Territorial y Persistencia de Datos)

---

## 🎯 1. Diagnóstico Pericial Forense y 7 Causas Raíz

Se autoriza formalmente la ejecución de la orden técnica **[FIX-EDIT-MESA-01]**. El diagnóstico forense realizado identificó las siguientes 7 causas raíz que impiden la edición de mesas en la plataforma:

1. **Causa 1 (Crítica — HTTP 400 por Salvaguarda de Asistentes):**
   - En `src/features/mesas/panels/mesa-editor-panel.tsx` (líneas 189 y 288), el formulario empaqueta `totalAsistentes: data.totalAsistentes`.
   - En `src/features/mesas/services/mesas-api.ts` (línea 225), `actualizarMesaRemota` añade `body.total_asistentes = Number(datos.totalAsistentes)`.
   - En el backend `backend/app/modules/mesas/service.py` (líneas 234-241), la salvaguarda pericial (OBS-21) estipula:
     ```python
     if datos.total_asistentes is not None:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Salvaguarda pericial: El total de asistentes se deriva exclusivamente del registro oficial de actas...",
         )
     ```
   - **Efecto:** Cualquier intento de editar el lugar, fecha o nombre falla inmediatamente con `HTTP 400 Bad Request`.
   - **Remediación:** En `actualizarMesaRemota`, **nunca** incluir `total_asistentes` en el body del PATCH al actualizar datos administrativos. La cifra de asistentes solo se altera mediante el registro de actas y listas de asistencia.

2. **Causa 2 (Resolución de UUID vs Código Canónico):**
   - Si `props.mesaId` es un código canónico (ej. `"mt-001"`, `"MS-001"`) en lugar de un UUID, la llamada `PATCH /api/v1/mesas/{mesa_id}` falla con `HTTP 422 Unprocessable Entity` porque FastAPI valida `mesa_id: uuid.UUID`.
   - **Remediación:** En `actualizarMesaRemota`, si `mesaId` no tiene formato UUID v4/v7, resolver su UUID a partir del mapa canónico (`MAPA_UUID_A_AGENDA` o `MAPA_CODIGO_OFICIAL_A_AGENDA`), o asegurar que se utilice el ID UUID persistido de la mesa.

3. **Causa 3 (Ausencia de React Query en MesaEditorPanel):**
   - `MesaEditorPanel` utiliza únicamente `useMesa(props.mesaId)` (lectura directa del store Zustand en memoria). Si el usuario entra por URL directa o recarga la página, el store no contiene la mesa o está desactualizado.
   - **Remediación:** Integrar `useMesaQuery(props.mesaId)` en `MesaEditorPanel` para que la mesa se consulte siempre desde el backend FastAPI.

4. **Causa 4 (React Hook Form sin Sincronización Asíncrona):**
   - Los `defaultValues` de `useForm` solo se evalúan en el primer montaje. Si la mesa carga de forma asíncrona, los campos del formulario (`lugar`, `fecha`, `horario`, `entidades`, `responsables`) quedan en blanco o desincronizados.
   - **Remediación:** Implementar un `useEffect` que invoque `reset({ ... })` con los valores de la mesa una vez que `mesaEditada` esté disponible.

5. **Causa 5 (Persistencia y Revalidación de Caché):**
   - Tras el `PATCH` exitoso, deben invalidarse las consultas de React Query (`MESAS_KEYS.all`, `MESAS_KEYS.detail(mesaId)`) y sincronizar el store local de `mesas` y de `agendas`, garantizando que `MesaPanel`, el Geovisor y el listado de mesas reflejen el nuevo lugar de inmediato.

6. **Causa 6 (Control de Permisos RBAC):**
   - Asegurar que la interfaz verifique `puedeEditar(sesion, "mesas")` para habilitar el guardado y que se inyecte el Bearer token del usuario autenticado en la petición `PATCH`.

7. **Causa 7 (Feedback al Usuario):**
   - En caso de error, mostrar el detalle específico devuelto por el servidor mediante `toast.error`, facilitando la comprensión operativa al funcionario.

---

## 🛡️ 2. Salvaguardas y Restricciones Obligatorias

1. **Preservación Inviolable de `BPIN`:** No tocar ni modificar ninguna referencia a `BPIN`.
2. **Cero Acrónimos Ajenos:** Cero reintroducción de `DNP`, `MGA` o `SINERGIA`.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/` (`Button`, `Input`, `Select`, etc.). Cero `<button>` o `<input>` nativos en JSX.
4. **Preservación de Datos:** No alterar los datos existentes de las 33 mesas territoriales canónicas de Cartagena ni la estructura relacional de `bd_csh`.
5. **Protocolo Zero-Push:** Trabajo exclusivo con commits locales en `main`.

---

## 📋 3. Plan de Acción y Tareas de Ejecución

1. **En `src/features/mesas/services/mesas-api.ts`**:
   - Ajustar `actualizarMesaRemota`:
     - Omitir estrictamente `body.total_asistentes` en el payload del PATCH para no transgredir la salvaguarda pericial (OBS-21).
     - Resolver el UUID de la mesa a partir del store o mapa canónico si `mesaId` es un código de agenda (ej. `mt-001`).
     - Asegurar la inyección del Bearer token de la sesión activa.

2. **En `src/features/mesas/panels/mesa-editor-panel.tsx`**:
   - Conectar `useMesaQuery(props.mesaId)` para carga asíncrona confiable.
   - Implementar `useEffect` con `reset()` para precargar automáticamente `nombre`, `fecha`, `horario`, `lugar`, `aforo`, `entidades` y `responsables`.
   - Validar permisos con `puedeEditar(sesion, "mesas")`.
   - Invalidad queries tras guardar con éxito (`MESAS_KEYS.all`, `MESAS_KEYS.detail`).

3. **Pruebas y Quality Gates**:
   - Añadir/actualizar pruebas unitarias en `src/features/mesas/services/mesas-api.test.ts`.
   - Ejecutar Quality Gates:
     - `bun run check` (0 errores TS, 0 infracciones UI-Policy, 0 linter errors).
     - `bun test` (suite frontend pasando al 100%).
     - `pytest backend/tests/test_actas_y_participantes.py backend/tests/test_mesas_agenda.py -q` (suite backend pasando).
     - `bun run build` (build Turbopack standalone limpio).
     - Hot-verification en vivo (curl a `/api/v1/mesas`).

4. **Entregables**:
   - Informe técnico de la remediación en `bridge/02_resultado_agy2.md`.
   - Commit atómico local en `main` siguiendo convención: `fix(mesas): remediacion integral edicion de informacion de mesas FIX-EDIT-MESA-01`.
   - Notificación a `agy` para contra-auditoría pericial.
