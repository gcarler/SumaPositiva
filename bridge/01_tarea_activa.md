# TAREA ACTIVA: [FIX-MESAS-01] HABILITACIÓN INTEGRAL Y PERSISTENCIA DE CREACIÓN DE MESAS EN PLATAFORMA Y FASTAPI

**Fecha:** 2026-10-09  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Requerimiento del Usuario ("no puedo crear mesas")  
**Severidad:** ALTA / BLOQUEANTE (Imposibilidad de registrar nuevas mesas en base de datos)  

---

## 🎯 1. Diagnóstico de Causa Raíz

Tras la auditoría forense inmediata realizada por `agy`, se identificaron los tres factores que impiden crear mesas de trabajo en POLIS:

1. **Error Crítico de Mapper en Backend (`backend/app/modules/mesas/models.py`)**:
   - `Mesa` declara la relación `fotos: Mapped[list["FotoMesa"]] = relationship("FotoMesa", back_populates="mesa")`.
   - Sin embargo, la clase `FotoMesa` (definida en `app.modules.evidencia.models`) **no está importada** en `backend/app/modules/mesas/models.py`.
   - En consecuencia, cada intento de instanciar `Mesa(**datos_dict)` en `MesaService.crear_mesa_raiz` arroja:
     `sqlalchemy.exc.InvalidRequestError: When initializing mapper Mapper[Mesa(mesas)], expression 'FotoMesa' failed to locate a name ('FotoMesa')`.
   - El endpoint `POST /api/v1/mesas` falla con `HTTP 500 Internal Server Error`.

2. **Mutación Optimista Ciega y Fallback Silencioso en Frontend (`src/features/mesas/panels/mesa-editor-panel.tsx`)**:
   - En `MesaEditorPanel`, la función `guardar` crea una mesa en memoria local (`mesa-nueva-X`) y luego lanza `crearMesaRemota` con `.catch(() => {})` no bloqueante.
   - El formulario muestra `toast.success("Mesa creada")` y cierra el panel, pero la mesa NUNCA se persistió en PostgreSQL debido al error del backend o falta de token.
   - Al navegar a `/plataforma/mesas` o recargar la página, React Query carga la lista real de PostgreSQL y la mesa desaparece, haciendo creer al usuario que no se puede crear o que se perdió.

3. **Inyección de Bearer Token y Validación de Fechas (`src/features/mesas/services/mesas-api.ts`)**:
   - `crearMesaRemota` no asegura `setBearerToken(sesion.token)` de la sesión activa, lo que provoca `401 Unauthorized` si el token en memoria de `apiFetch` no está inicializado.
   - Si `datos.fecha` es una cadena vacía o no formateada, FastAPI falla con `422 Unprocessable Entity` en Pydantic (`fecha: date | None`). Debe enviarse `datos.fecha || null`.
   - El `shortcode_ciudadano` debe ser único y con entropía suficiente para no colisionar con mesas existentes.

4. **Bloqueo UX en Botón Submit (`src/features/mesas/panels/mesa-editor-panel.tsx`)**:
   - El botón tiene `disabled={!isValid}`. Si hay un campo inválido o faltante en una sección colapsada (ej. sección 2 o 3), el usuario queda bloqueado sin saber qué falta.
   - Debe removerse `disabled={!isValid}` (o manejarse el clic para expandir la sección con error y notificar mediante toast).

---

## 🛠️ 2. Especificación Técnica de Remediación

### 2.1. Backend (`backend/app/modules/mesas/`)
1. **`backend/app/modules/mesas/models.py`**:
   - Importar `FotoMesa` desde `app.modules.evidencia.models`:
     ```python
     from app.modules.evidencia.models import FotoMesa
     ```
2. **`backend/app/modules/mesas/service.py`**:
   - En `crear_mesa_raiz`:
     - Asegurar la unicidad del `slug`: si ya existe una mesa con ese slug o shortcode, sanitizarlo agregando un sufijo único (e.g. `f"csh.{slug}_{uuid.uuid4().hex[:6]}"`).
     - Registrar el evento de auditoría correspondiente (`auditoria: "mesa:crear"`).
3. **Prueba Backend**:
   - Crear o actualizar test en `backend/tests/` para verificar que `POST /api/v1/mesas` crea y persiste exitosamente una mesa raíz con rol autorizado (`autoridad_distrital` o `administrador_identidades`) retornando `HTTP 201 Created` con su UUID y `codigo_oficial`.

### 2.2. Frontend (`src/features/mesas/`)
1. **`src/features/mesas/services/mesas-api.ts`**:
   - En `crearMesaRemota`:
     - Inyectar el Bearer token activo:
       ```typescript
       const sesion = useSesionStore.getState().sesion;
       if (sesion?.token) setBearerToken(sesion.token);
       ```
     - Formatear `fecha`: si no hay fecha o es cadena vacía, enviar `null`.
     - Generar `codigo_oficial` y `shortcode_ciudadano` únicos y legibles.
     - Propagar cualquier error HTTP o `ApiError` para que la UI lo capture honestamente.
2. **`src/features/mesas/panels/mesa-editor-panel.tsx`**:
   - En el envío del formulario (`guardar`):
     - Esperar asíncronamente con `await crearMesaRemota(...)`.
     - Al recibir la confirmación de PostgreSQL (`remota.id`), agregar/sincronizar la mesa en `useMesasStore` con el ID real.
     - Invalidar consultas de React Query (`queryClient.invalidateQueries({ queryKey: MESAS_KEYS.all })`).
     - Mostrar `toast.success("Mesa creada exitosamente", { description: `Código: ${remota.codigoOficial}` })`.
     - Cerrar el panel y abrir el panel de detalle de la mesa con el UUID real: `openPanel("mesa", { mesaId: remota.id })`.
     - En el bloque `catch (err)`: NO cerrar el panel, mostrar `toast.error("No se pudo crear la mesa", { description: err instanceof Error ? err.message : "Error del servidor" })`.
   - En el botón de submit:
     - Remover `disabled={!isValid}` para no bloquear al usuario si una subsección colapsada tiene valores pendientes; permitir que al dar clic se validen los campos y se enfoque la sección con error.

---

## 🛡️ 3. Quality Gates Obligatorios

Antes de reportar la finalización, valida:
1. `bun run check`: Cero errores en UI-Policy, TypeScript estricto (`tsc --noEmit`) y ESLint (`eslint .`).
2. `bun test`: 100% de tests pasando (mínimo 364 tests pass).
3. `bun run build`: Compilación limpia en Next.js (190 rutas generadas).
4. `systemctl restart polis-backend polis-frontend`: Ambos servicios activos.
5. Verificación HTTP en vivo:
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/mesas` -> 200.
   - Creación de mesa de prueba verificada en vivo contra backend.
6. Commit atómico local en la rama `main` sin `git push`:
   - `fix(mesas): [FIX-MESAS-01] resolver mapper FotoMesa persistencia real y flujo asincrono de creacion de mesas`
7. Registrar informe de ejecución en `bridge/02_resultado_agy2.md` y notificar a `agy`.
