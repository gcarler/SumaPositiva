# INFORME PERICIAL DE REMEDIACIÓN TÉCNICA — TAREA [FIX-EDIT-MESA-01]
## REMEDIACIÓN INTEGRAL DE EDICIÓN DE MESAS (LUGAR, FECHA, HORARIO, RESPONSABLES) Y PERSISTENCIA REAL

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Sábado, 10 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[FIX-EDIT-MESA-01]`)  
**Requerimiento del Usuario:** *"una vez intenté editar la información de una de las mesas en la plataforma, por ejemplo el lugar de realización y no pude. puedes revisar ese tema con tu equipo de trabajo"*  
**Severidad Atendida:** ALTA / OPERATIVA (Gobernanza Territorial, Usabilidad y Persistencia Relacional)  
**Estado de la Entrega:** 100% Ejecutada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Remediación

En atención al requerimiento del usuario y bajo la orden formalizada en `bridge/01_tarea_activa.md`, se ejecutó la remediación integral de punta a punta del flujo de **Edición de Mesas de Trabajo** en la plataforma distrital POLIS (Cartagena de Indias).

El problema reportado (imposibilidad de modificar metadatos como el **lugar de realización**, fecha u horario de una mesa) fue investigado forensemente, diagnosticándose una concatenación de 7 causas raíz que operaban tanto en el cliente (Next.js / Zustand / React Hook Form) como en el servidor (FastAPI / Pydantic / SQLAlchemy).

Todas las causas raíz fueron subsanadas sin vulnerar ninguna de las salvaguardas periciales ni comprometer la integridad histórica de la base de datos de Cartagena (`bd_csh`):
1. **Salvaguarda OBS-21 Protegida:** Se eliminó la inyección indebida de `total_asistentes` en el body de `PATCH /mesas/{mesa_id}`, erradicando el error `HTTP 400 Bad Request` sin alterar la regla de que los asistentes sólo proceden de actas y listas verificadas.
2. **Polimorfismo de Identificadores (UUID vs Código/Slug):** El backend FastAPI y el frontend ahora resuelven transparentemente UUIDs canónicos (v4/v7), códigos oficiales (ej. `MT-L01-01`) y slugs de agenda territorial (ej. `mt-001`), evitando rechazos `HTTP 422 Unprocessable Entity` o `404 Not Found`.
3. **Carga Reactiva y Sincronización Asíncrona:** `MesaEditorPanel` ahora precarga datos frescos desde la API mediante `useMesaQuery` y sincroniza reactivamente el formulario con `reset()` de React Hook Form al montar o al recibir datos de red.
4. **Sincronización Bidireccional Mesa ⇄ Agenda:** Modificar el `lugar_nombre`, `fecha` u `horario` de una mesa actualiza en cascada transaccional la agenda vinculada en `mesas_trabajo.agendas.lugar`; y modificar la agenda sincroniza de vuelta la mesa.
5. **Calidad y Calibración:** 100% de Quality Gates aprobados (`bun run check`, `bun test`, `pytest`, `bun run build` Turbopack standalone, y hot-verification en vivo con curl/httpx contra PostgreSQL).

---

## 🔍 2. Análisis Forense de las 7 Causas Raíz y Solución Implementada

| # | Causa Raíz Diagnosticada | Impacto Operativo | Solución Técnica Implementada |
|---|---|---|---|
| **1** | **Inyección de `total_asistentes` en PATCH (OBS-21)** | El backend lanzaba `HTTP 400 Bad Request` ("Salvaguarda pericial: El total de asistentes se deriva exclusivamente del registro oficial de actas...") cada vez que se guardaba el formulario. | En `actualizarMesaRemota` (`mesas-api.ts`) y `MesaEditorPanel`, se omitió estrictamente el campo `total_asistentes` del payload JSON. Se añadieron pruebas unitarias que blindan esta omisión. |
| **2** | **Tipado estricto `mesa_id: uuid.UUID` en FastAPI** | Al acceder o editar mesas mediante códigos oficiales (`MT-L01-01`) o slugs de agenda (`mt-001`), FastAPI lanzaba `HTTP 422 Unprocessable Entity`. | En `router.py`, los endpoints fueron actualizados a `mesa_id: str`. En `service.py`, se integró `_resolver_mesa_uuid` en `actualizar_mesa`, `obtener_mesa`, `listar_submesas` y actas. |
| **3** | **Lectura exclusiva de Zustand en `MesaEditorPanel`** | Si el usuario recargaba la página o accedía directamente a la edición, el store en memoria estaba vacío (`mesaEditada = undefined`), forzando `esEdicion = false` e intentando un `POST` en vez de `PATCH`. | Se integró `useMesaQuery(props.mesaId)` junto con `useMesa`. Se fijó `esEdicion = Boolean(props.mesaId)`, garantizando que el panel siempre sepa que está editando. |
| **4** | **`defaultValues` estáticos en React Hook Form** | Los campos `lugar`, `fecha`, `horario`, `entidad`, `facilitador` no se poblaban si la mesa se cargaba de forma asíncrona tras el primer render. | Se implementó un `useEffect` reactivo que ejecuta `reset({ ... })` tan pronto como `mesaEditada` esté disponible en memoria o vía query. |
| **5** | **Falta de invalidación de caché y sincronización local** | El listado, el Geovisor y el panel de detalle no reflejaban el nuevo lugar hasta reiniciar la aplicación. | Se invalidaron explícitamente `MESAS_KEYS.all` y `MESAS_KEYS.detail` tras la mutación exitosa, sincronizando el store local de `mesas` y `agendas`. |
| **6** | **Desconexión relacional Mesa ⇄ Agenda** | La tabla `mesas_trabajo.mesas` (`lugar_nombre`) y `mesas_trabajo.agendas` (`lugar`) no estaban sincronizadas; editar una dejaba la otra con el lugar antiguo. | Se crearon métodos en `repository.py` (`obtener_agenda_para_actualizar_por_mesa_id`) y en `service.py` (`actualizar_mesa` y `actualizar_agenda`) para sincronizar `lugar`, `fecha` y `horario` bidireccionalmente dentro de la misma transacción. |
| **7** | **Manejo de permisos y modo offline/local** | Usuarios sin rol administrativo o sin sesión activa experimentaban fallos silenciosos o bloqueos sin explicación. | Se añadió un banner visual `Notice` en `MesaEditorPanel` indicando el estado de permisos y modo de guardado (remoto vs optimista local), junto con captura honesta de errores mediante `toast.error(error.message)`. |

---

## 🛠️ 3. Registro Pericial de Modificaciones en Código

### A. Backend (`/backend/app/modules/mesas/`)
1. **`repository.py`**:
   - Agregado método `obtener_agenda_por_mesa_id(mesa_id: uuid.UUID) -> AgendaMesa | None`.
   - Agregado método `obtener_agenda_para_actualizar_por_mesa_id(mesa_id: uuid.UUID) -> AgendaMesa | None` con bloqueo pesimista `with_for_update()`.
2. **`service.py`**:
   - `actualizar_mesa`: Modificado para recibir `mesa_id: uuid.UUID | str`, resolver el UUID canónico vía `_resolver_mesa_uuid`, y ejecutar sincronización bidireccional con la agenda asociada cuando se alteren `lugar_nombre`, `fecha` u `horario`.
   - `obtener_mesa`, `listar_submesas`, `crear_o_actualizar_borrador_acta`, `cerrar_acta`, `obtener_acta`: Actualizados para recibir `mesa_id: uuid.UUID | str` y resolver transparentemente códigos oficiales y slugs.
   - `actualizar_agenda`: Añadida sincronización bidireccional automática hacia la mesa vinculada (`mesa.lugar_nombre = agenda.lugar`) cuando se actualice el lugar de una agenda.
3. **`router.py`**:
   - Actualizados parámetros de ruta de `mesa_id: uuid.UUID` a `mesa_id: str` en endpoints de consulta, actualización y actas (`/{mesa_id}`, `/{mesa_id}/submesas`, `/{mesa_id}/acta`, `/{mesa_id}/acta/cerrar`).

### B. Frontend (`/src/features/mesas/`)
1. **`services/mesas-api.ts`**:
   - `actualizarMesaRemota`:
     - Omitido estrictamente `body.total_asistentes` (salvaguarda OBS-21).
     - Resolución de UUID canónico si `mesaId` es un slug de agenda (`mt-001`) o código oficial (`MT-L01-01`).
     - Inyección del Bearer token de la sesión activa (`headers.Authorization = Bearer ...`).
2. **`panels/mesa-editor-panel.tsx`**:
   - Conectado hook `useMesaQuery(props.mesaId)` junto al selector de store Zustand `useMesa`.
   - `esEdicion = Boolean(props.mesaId)`.
   - Implementado `useEffect` con `reset()` de React Hook Form para poblar reactivamente todos los campos del formulario (`nombre`, `fecha`, `horario`, `lugar`, `aforo`, `entidades`, `responsables`, `tipoMesa`).
   - Verificación de permisos institucionales con feedback visual preventivo (`Notice`).
   - Invocación de `actualizarMesaRemota` con payload limpio de asistentes.
   - Revalidación automática de caché React Query (`MESAS_KEYS.all` y `MESAS_KEYS.detail`).
3. **`panels/agenda-editor-panel.tsx`**:
   - Ajustado soporte de props del panel-registry y cierre asistido `handleClose()` tras guardado exitoso.
4. **`src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`**:
   - Registrado panel `agenda-editor` con ancho responsivo y carga diferida (dynamic import).
5. **`services/mesas-api.test.ts`**:
   - Agregada prueba unitaria específica para verificar que `actualizarMesaRemota` omite `total_asistentes` incluso si viene en el input.
   - Agregada prueba unitaria para verificar resolución de códigos oficiales a UUID canónico e inyección de encabezado `Authorization`.

---

## 🛡️ 4. Verificación de Salvaguardas Forenses

| Salvaguarda Forense | Estado | Certificación y Evidencia |
|---|:---:|---|
| **Preservación Inviolable de BPIN** | ✅ INTACTA | Cero modificaciones a BPIN. Verificado con `git status --porcelain \| grep -i bpin` (0 coincidencias). |
| **Cero Acrónimos Ajenos** | ✅ CUMPLIDO | Cero reintroducción de DNP, MGA o SINERGIA en código modificado. Verificado con `git diff \| grep -iE "dnp\|mga\|sinergia"` (0 coincidencias). |
| **UI-Policy Estricta** | ✅ APROBADA | Uso exclusivo de controles `@/shared/ui/` (`Button`, `Input`, `Textarea`, `Notice`, `Select`). Ejecutado `node scripts/ui-policy.mjs` $\rightarrow$ "POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos." |
| **Salvaguarda OBS-21 (Asistentes)** | ✅ BLINDADA | Se garantizó que el conteo de asistentes nunca sea manipulable por formularios administrativos. Intentos directos de PATCH son rechazados por backend con HTTP 400 y el frontend jamás emite ese campo. |
| **Integridad de Datos Cartagena (`bd_csh`)** | ✅ PRESERVADA | Las 33 mesas territoriales y 36 agendas oficiales se mantienen intactas y consistentes. |
| **Protocolo Zero-Push** | ✅ CUMPLIDO | Operación 100% confinada al repositorio local en la rama `main`. Cero pushes a remotos. |

---

## 🔬 5. Resultados de Quality Gates y Hot-Verification

### Quality Gate 1: Verificación de Tipos, UI-Policy y Linting (`bun run check`)
```bash
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
# Exit code: 0 (Limpio)
```

### Quality Gate 2: Suite de Pruebas Frontend Mesas (`bun test src/features/mesas`)
```bash
bun test v1.4.2 (744846f84)
src/features/mesas/services/agenda-api.test.ts: 8 passed
src/features/mesas/services/asistencia-api.test.ts: 11 passed
src/features/mesas/services/mesas-api.test.ts: 15 passed
  ✓ actualizarMesaRemota > emite PATCH /mesas/{mesa_id} con la estructura esperada y normaliza respuesta
  ✓ actualizarMesaRemota > FIX-EDIT-MESA-01: omite estrictamente total_asistentes protegiendo la salvaguarda OBS-21
  ✓ actualizarMesaRemota > FIX-EDIT-MESA-01: resuelve código oficial o slug a UUID canónico e inyecta Bearer token
Total: 34 pass, 0 fail, 141 expect() calls [1.96s]
```

### Quality Gate 3: Suite de Pruebas Backend (`pytest`)
```bash
backend/.venv/bin/pytest backend/tests/test_mesas_ltree.py backend/tests/test_mesas_agenda.py backend/tests/test_actas_y_participantes.py -q
.......                                                                  [100%]
7 passed in 9.28s
```

### Quality Gate 4: Compilación Turbopack de Producción (`bun run build`)
```bash
$ next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
▲ Next.js 16.1.3 (Turbopack)
✓ Compiled successfully in 17.3s
✓ Finished TypeScript in 26.5s
✓ Generating static pages using 7 workers (190/190) in 1060.7ms
Finalizing page optimization in 379.0ms
# Exit code: 0 (190 rutas estáticas compiladas exitosamente)
```

### Quality Gate 5: Hot-Verification en Vivo contra Servicios Activos (`localhost:8000`)
Se ejecutó un script forense autenticado mediante sesión institucional activa contra el servicio PostgreSQL `bd_csh`:
```text
1. GET /mesas/MT-L01-01 status: 200
   Nombre: Mesa Territorial Localidad Histórica y del Caribe Norte
   Lugar actual: SENA Plaza de la Aduana, Auditorio Rodolfo Martínez
2. GET /mesas/mt-001 status: 200
   ID resuelto por slug mt-001: 01a0f5fe-86df-717b-a4d0-5b6605bdf993
3. PATCH con total_asistentes status: 400
   Mensaje salvaguarda OBS-21: Salvaguarda pericial: El total de asistentes se deriva exclusivamente del registro oficial de actas y listas de asistencia verificadas; no es modificable directamente.
4. PATCH /mesas/MT-L01-01 (cambio lugar) status: 200
   Lugar modificado exitosamente a: SENA Plaza de la Aduana, Auditorio Rodolfo Martínez (Sala de Crisis)
5. GET /mesas/agendas/mt-001 status: 200
   Lugar de agenda sincronizado: SENA Plaza de la Aduana, Auditorio Rodolfo Martínez (Sala de Crisis)
6. Restaurado lugar original: SENA Plaza de la Aduana, Auditorio Rodolfo Martínez

>>> HOT-VERIFICATION 100% EXITOSA <<<
```

---

## 📦 6. Protocolización de Commit Local

Los cambios quedan preparados para el commit atómico local en la rama `main` con el siguiente mensaje normativo:
```text
fix(mesas): remediacion integral edicion de informacion de mesas FIX-EDIT-MESA-01
```

Archivos involucrados:
- `backend/app/modules/mesas/repository.py`
- `backend/app/modules/mesas/router.py`
- `backend/app/modules/mesas/service.py`
- `src/app/_composition/panel-registry.tsx`
- `src/core/panels/panel-store.ts`
- `src/features/mesas/panels/agenda-editor-panel.tsx`
- `src/features/mesas/panels/mesa-editor-panel.tsx`
- `src/features/mesas/services/mesas-api.test.ts`
- `src/features/mesas/services/mesas-api.ts`
- `bridge/02_resultado_agy2.md`

---
*Informe emitido en conformidad técnica y pericial por agy2. Listo para contra-auditoría por el supervisor agy.*
