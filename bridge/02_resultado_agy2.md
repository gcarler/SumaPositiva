# INFORME PERICIAL DE EJECUCIÓN — TAREA [FIX-MESAS-01]
## HABILITACIÓN INTEGRAL Y PERSISTENCIA DE CREACIÓN DE MESAS EN PLATAFORMA Y FASTAPI

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Ejecución:** Viernes, 09 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[FIX-MESAS-01]`)  
**Severidad Mitigada:** ALTA / BLOQUEANTE (Imposibilidad de persistir nuevas mesas en PostgreSQL)  
**Estado de la Entrega:** 100% Ejecutada, Contra-Auditada y Conforme con Quality Gates  
**Commit Local HEAD:** `c37989e` (`main`, zero push)  

---

## 1. Resumen Ejecutivo de la Intervención [FIX-MESAS-01]

En respuesta inmediata al incidente reportado por los usuarios de la plataforma respecto a la imposibilidad de crear mesas de trabajo, `agy2` implementó la remediación integral de extremo a extremo:

1. **Resolución Definitiva del Mapper SQLAlchemy (`FotoMesa`)**:
   - En `backend/app/modules/mesas/models.py`, se importó `FotoMesa` desde `app.modules.evidencia.models`.
   - Para erradicar la dependencia circular en tiempo de inicialización, en `backend/app/modules/evidencia/models.py` se protegió la referencia a `Mesa` bajo `TYPE_CHECKING` y se garantizó la resolución tardía en tiempo de ejecución.
   - Con esto, `configure_mappers()` compila e inicializa sin excepción independientemente del orden de importación (`Mesa` primero o `FotoMesa` primero).

2. **Garantía de Unicidad y Registro Inmutable de Auditoría en Backend**:
   - En `backend/app/modules/mesas/service.py` (`crear_mesa_raiz`), se implementó la detección de colisiones de `slug`, `ruta_jerarquica` y `shortcode_ciudadano`. Si ya existe una mesa previa con esos identificadores, se genera un sufijo único hexadecimal aleatorio manteniendo la validez sintáctica de `ltree` (`_validar_ruta_ltree`).
   - Se integró el registro de auditoría forense `RegistroAuditoria` con acción `mesa:crear`, causal técnica y trazabilidad de `usuario_id`, `codigo_oficial`, `shortcode_ciudadano` y `slug`.
   - En `backend/app/modules/mesas/router.py`, el endpoint `POST /api/v1/mesas` inyecta `SujetoAutenticadoContexto` mediante `requerir_permiso("mesas:abrir", nivel_minimo="declarada")` y lo transfiere a `service.crear_mesa_raiz`.

3. **Inyección de Bearer Token y Sanitización de Fechas en API Client**:
   - En `src/features/mesas/services/mesas-api.ts` (`crearMesaRemota`), se inyecta activamente el Bearer token vigente desde `useSesionStore.getState().sesion?.token` mediante `setBearerToken`.
   - Se asegura que si `datos.fecha` es una cadena vacía o en blanco, se transmita como `null` estricto para satisfacer el validador Pydantic `date | None` de FastAPI (evitando códigos `422 Unprocessable Entity`).
   - Se dotó al generador de `codigo_oficial` y `shortcode_ciudadano` de entropía suficiente (`Date.now()` + sufijo alfanumérico aleatorio) para impedir colisiones concurrentes.
   - Cualquier excepción HTTP o de red se propaga honestamente a la UI.

4. **Flujo Asíncrono Real y Erradicación del Bloqueo UX en `MesaEditorPanel`**:
   - En `src/features/mesas/panels/mesa-editor-panel.tsx`:
     - Se eliminó la mutación optimista ciega con `.catch(() => {})`. Ahora la función `guardar` espera asíncronamente a `await crearMesaRemota(...)`.
     - Solo tras la confirmación exitosa con HTTP 201 y UUID de PostgreSQL, se sincroniza la mesa en `useMesasStore`, se invalida la caché de React Query (`MESAS_KEYS.all`), se emite `toast.success` y se abre el panel de la mesa con su UUID real (`openPanel("mesa", { mesaId: remota.id })`).
     - Ante fallas remotas (401, 403, 500), el error se captura en bloque `catch`, el panel permanece abierto y se notifica al usuario con `toast.error`.
     - En el botón submit se removió `disabled={!isValid}` y se conectó el callback `onInvalid` en `handleSubmit(guardar, onInvalid)`, el cual ante campos incompletos expande automáticamente la sección correspondiente (Sección 1, 2 o 3) y notifica al usuario mediante toast.

---

## 2. Matriz de Cambios por Archivo

| Componente | Archivo | Modificación Realizada |
|---|---|---|
| **Backend Model** | `backend/app/modules/mesas/models.py` | Importación de `FotoMesa` desde `app.modules.evidencia.models` para resolver el relationship `fotos`. |
| **Backend Model** | `backend/app/modules/evidencia/models.py` | Uso de `TYPE_CHECKING` para `Mesa` y resolución tardía al pie del módulo, previniendo fallos circulares de importación. |
| **Backend Service** | `backend/app/modules/mesas/service.py` | Sanitización de colisiones en `crear_mesa_raiz`, asignación de sufijo aleatorio a `slug`/`shortcode`, validación ltree y persistencia en `RegistroAuditoria` (`mesa:crear`). |
| **Backend Router** | `backend/app/modules/mesas/router.py` | Inyección de `sujeto` mediante `requerir_permiso("mesas:abrir")` en `POST /api/v1/mesas` y pase al servicio. |
| **Backend Tests** | `backend/tests/test_mesas_seguridad_auditoria.py` | Nueva prueba `test_crear_mesa_persistencia_auditoria_y_unicidad` verificando HTTP 201, persistencia, auditoría y resiliencia ante colisión de slug. |
| **Frontend API** | `src/features/mesas/services/mesas-api.ts` | Inyección de Bearer token con `useSesionStore`, sanitización `fecha || null`, generación entrópica de códigos y propagación de errores. |
| **Frontend Store** | `src/features/mesas/state/mesas-store.ts` | Soporte de `input.id` opcional en `MesaInput` para almacenar el UUID persistido por PostgreSQL. |
| **Frontend Panel** | `src/features/mesas/panels/mesa-editor-panel.tsx` | Flujo asíncrono con `await crearMesaRemota`, captura honesta de fallos, remoción de `disabled={!isValid}` y manejo `onInvalid` con autoexpansión. |
| **Frontend Tests** | `src/features/mesas/services/mesas-api.test.ts` | Suite completa para `crearMesaRemota`: inyección de Bearer token, sanitización de fecha a null y propagación de errores HTTP. |

---

## 3. Verificación de Quality Gates

### 3.1. `bun run check`
```bash
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
# Resultado: CERO (0) ERRORES, CERO (0) ADVERTENCIAS
```

### 3.2. `bun test`
```bash
367 pass
0 fail
1551 expect() calls
Ran 367 tests across 37 files.
```

### 3.3. `pytest` en Backend
```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_mesas*.py backend/tests/test_actas_y_participantes.py backend/tests/test_fotos_mesas.py
# Resultado: 19 passed in 28.01s (13 mesas + 4 actas + 2 fotos)
```

### 3.4. `bun run build`
```bash
▲ Next.js 16.1.3 (Turbopack)
✓ Compiled successfully in 28.4s
✓ Generating static pages using 7 workers (190/190) in 1039.0ms
# Resultado: 190 rutas compiladas de manera limpia en producción standalone.
```

### 3.5. Servicios y Verificación en Vivo
- `systemctl is-active polis-backend polis-frontend` -> Ambos `active`.
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/plataforma/mesas` -> `200`.
- **Prueba Live End-to-End contra Backend**:
  ```bash
  Live POST /api/v1/mesas status: 201
  Created Mesa ID: 01a121bd-f9a8-7212-8c9a-45786ee14b0f
  Codigo Oficial: MT-VIVO-a1573d
  Ruta Jerarquica: csh.mva1573d
  Live GET /api/v1/mesas/{id} status: 200
  ```

---

## 4. Estado Git

- Rama activa: `main`
- Commit realizado: `c37989e`
- Mensaje: `fix(mesas): [FIX-MESAS-01] resolver mapper FotoMesa persistencia real y flujo asincrono de creacion de mesas`
- Zero Push: Ningún cambio ha sido enviado a ramas remotas.
