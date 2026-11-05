# Entrega Encargo 276 — Panel de Salud de Entregas de POLIS Herald y Botón de Reintento

- **Agente:** AGY2
- **Encargo:** 276 — Panel de salud de entregas de POLIS Herald y botón de reintento
- **Referencia de especificación:** `bridge/276_tarea_agy2_herald_panel_salud.md`
- **Fecha:** 2026-10-31
- **Estado:** Completado y verificado (SIN commit, push ni deploy según directiva)

---

## 1. Resumen Ejecutivo

Se implementó con éxito en el frontend el **Panel de Salud de Entregas de POLIS Herald** y la capacidad de **reintento manual asistido** para constancias fallidas / agotadas, interactuando de forma estricta contra el contrato de API especificado en la Sección 2:

1. **Servicio y Contrato API (`src/features/notificaciones/services/notificaciones-api.ts`):**
   - Agregados tipos `EstadoSaludHerald`, `ResumenPorTipoSalud`, `SaludHeraldRespuesta`, `ReintentarNotificacionRespuesta`.
   - Implementado `obtenerSaludHerald(): Promise<SaludHeraldRespuesta>` (`GET /api/v1/notificaciones/salud`).
   - Implementado `reintentarNotificacion(id: string): Promise<ReintentarNotificacionRespuesta>` (`POST /api/v1/notificaciones/{id}/reintentar`).
   - Soporte para filtro `estado_envio` en `listarHistorialNotificaciones`.

2. **Panel de Salud Herald (`src/features/notificaciones/components/panel-salud-herald.tsx`):**
   - **Semáforo tricolor accesible:** Icono + texto descriptivo + badges (`saludable` / verde, `degradado` / advertencia, `critico` / destructivo), junto a lista de motivos activos (`motivos`).
   - **Estado del Ejecutor & Canal:** Indicador de ejecutor activo/detenido, latido y ciclo formateados en hora colombiana, y estado de transporte SMTP vs. simulación outbox con fe pública.
   - **Métricas de Cola (KPIs):** Pendientes, en proceso, fallidos reintentables, agotados y antigüedad del ítem más rezagado (`formatearSegundos`).
   - **Rendimiento últimas 24h:** Total despachados, simulados, fallidos, tasa de éxito (%) y latencias p50 / p95.
   - **Desglose por tipo de evento:** Tabla accesible con `<th scope="col">` y nombres institucionales en español (`obtenerNombreTipoEvento`).
   - **Ciclo de refresco:** Auto-actualización periódica cada 30 segundos (pausada automáticamente cuando la pestaña está oculta vía `refetchIntervalInBackground: false`), más botón "Actualizar ahora".
   - **Manejo de permisos:** Pantalla amigable si el usuario no cuenta con `auditoria:leer` (403 Forbidden).

3. **Visor de Fe Pública con Reintento (`src/features/notificaciones/components/visor-notificaciones-herald.tsx`):**
   - Agregado filtro rápido "Solo fallidos" (`estado_envio=fallido`).
   - Agregado botón "Reintentar" exclusivo para notificaciones en estado agotado/fallido (`esNotificacionAgotada(item)`).
   - Flujo de confirmación inline ("¿Reintentar envío a {correo}?") con feedback inmediato vía toast Sonner y refresco automático de la lista sin recargas de página ni excepciones no capturadas (control 404, 409, 403).

4. **Librería de utilidades puras (`src/features/notificaciones/lib/herald-helpers.ts`):**
   - Funciones `obtenerNombreTipoEvento`, `formatearSegundos`, `formatearLatido`, `esNotificacionAgotada`.

5. **Integración en `/plataforma/configuracion` (`src/features/plataforma/views/configuracion-view.tsx`):**
   - Integrado en `ConfiguracionView` contiguo a `SaludSistemaSection`, protegido por verificación de rol (`administrador_sistema`, `administrador_identidades`, `auditor`) o permiso `auditoria:leer`.

---

## 2. Justificación Técnica y de UX de la Ubicación

Se seleccionó integrar `PanelSaludHerald` en **/plataforma/configuracion** por las siguientes razones:

1. **Alineación con la Arquitectura de Observabilidad:** La vista `/plataforma/configuracion` ya centraliza la `SaludSistemaSection` (FastAPI, PostgreSQL, PWA, almacenamiento) y los parámetros institucionales del despacho distrital. Situar allí el panel de salud de POLIS Herald consolida en un único centro de comando toda la telemetría operativa y de fe pública.
2. **Separación de Responsabilidades:** Mantiene el perfil individual de usuario (`cuenta-usuario.tsx`) enfocado exclusivamente en preferencias personales, mientras que la salud del ejecutor en background, colas transaccionales y SLAs de despacho corresponden a la administración y auditoría del sistema.
3. **Control de Acceso de Mínimo Privilegio:** La sección está blindada: únicamente los usuarios con rol administrativo/auditor o el permiso granular `auditoria:leer` renderizan el componente y disparan las consultas periódicas de telemetría, evitando ruido y peticiones infructuosas para otros roles.

---

## 3. Subsanación y Creación Real de Tests Unitarios

En respuesta a la directiva del encargo, se creó de forma efectiva el archivo de pruebas `src/features/notificaciones/services/notificaciones-api.test.ts` (ausente en `1fb7ec8`) y la suite `src/features/notificaciones/lib/herald-helpers.test.ts`.

### Salida real de ejecución (`bun test src/features/notificaciones/`):

```bash
bun test v1.4.2 (744846f84)

src/features/notificaciones/lib/herald-helpers.test.ts:
✓ herald-helpers > obtenerNombreTipoEvento > retorna nombres institucionales en español para claves conocidas [0.14ms]
✓ herald-helpers > obtenerNombreTipoEvento > formatea amigablemente tipos no catalogados [0.12ms]
✓ herald-helpers > obtenerNombreTipoEvento > maneja cadenas vacías o valores atípicos [0.03ms]
✓ herald-helpers > formatearSegundos > devuelve 'Sin espera' para valores nulos, indefinidos o NaN [0.18ms]
✓ herald-helpers > formatearSegundos > formatea 0 y pocos segundos como '0 s' o segundos [0.03ms]
✓ herald-helpers > formatearSegundos > formatea minutos y segundos adecuadamente [0.02ms]
✓ herald-helpers > formatearSegundos > formatea horas y minutos adecuadamente [0.02ms]
✓ herald-helpers > formatearSegundos > formatea días adecuadamente [0.03ms]
✓ herald-helpers > formatearLatido > devuelve 'Sin registro de actividad' cuando la fecha es nula, vacía o indefinida [0.08ms]
✓ herald-helpers > formatearLatido > formatea latidos recientes como 'hace unos instantes' [0.03ms]
✓ herald-helpers > formatearLatido > formatea fechas ISO válidas transcurridas [0.01ms]
✓ herald-helpers > esNotificacionAgotada > retorna false para valores nulos o vacíos [0.02ms]
✓ herald-helpers > esNotificacionAgotada > retorna true para notificaciones con estado fallido o error [0.02ms]
✓ herald-helpers > esNotificacionAgotada > retorna false para estados activos o exitosos [0.01ms]

src/features/notificaciones/services/notificaciones-api.test.ts:
✓ notificaciones-api service > listarHistorialNotificaciones > llama a /notificaciones/historial sin query params si no se pasan filtros [1.24ms]
✓ notificaciones-api service > listarHistorialNotificaciones > construye correctamente los query params para paginación y filtros [0.18ms]
✓ notificaciones-api service > listarHistorialNotificaciones > lanza error si el backend responde con error 403 o 500 [0.48ms]
✓ notificaciones-api service > consultarRadicado > codifica y normaliza a mayúsculas el código de radicado [0.16ms]
✓ notificaciones-api service > consultarRadicado > lanza error en caso de radicado inexistente (404) [0.12ms]
✓ notificaciones-api service > obtenerSaludHerald > consulta /notificaciones/salud y retorna métricas completas [0.26ms]
✓ notificaciones-api service > obtenerSaludHerald > lanza error si la respuesta es de error [1803.40ms]
✓ notificaciones-api service > reintentarNotificacion > hace una petición POST al endpoint de reintento con el ID especificado [0.33ms]
✓ notificaciones-api service > reintentarNotificacion > lanza error en caso de 404 o 409 (conflicto) [0.15ms]

 23 pass
 0 fail
 66 expect() calls
Ran 23 tests across 2 files. [2.12s]
```

---

## 4. Verificaciones de Calidad

### A. Política UI (`node scripts/ui-policy.mjs`):
```bash
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```
- 100% tokens de diseño semánticos (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`, `var(--success)`, `var(--warning)`, `var(--destructive)`).
- Cero clases utilitarias de paletas fijas de Tailwind.
- Componentes UI compartidos del catálogo oficial (`Button`, `Badge`, `StatusBadge`, `Notice`, `Input`).
- Accesibilidad: estados semánticos con texto legible complementario al color, atributos `aria-live="polite"`, `aria-label`, `<th scope="col">`.

### B. Comprobación de Tipos (`bun run typecheck`):
```bash
$ tsc --noEmit
# Código de salida 0 — Sin errores de TypeScript.
```

### C. Linter (`bun x eslint`):
```bash
# Sin advertencias ni errores en src/features/notificaciones/ y src/features/plataforma/views/configuracion-view.tsx
```

### D. Compilación de Producción (`bun run build` aislado):
```bash
▲ Next.js 16.3.8 (Turbopack)
✓ Compiled successfully in 56s
✓ Finished TypeScript in 30.3s
✓ Collecting page data using 7 workers in 1454ms
✓ Generating static pages using 7 workers (204/204) in 1841ms
Finalizing page optimization in 454ms
Route (app) ...
○ /plataforma/configuracion
○ /trazabilidad
```

---

## 5. Estado de Git

```bash
Changes not staged for commit:
	modified:   bridge/01_tarea_activa.md
	modified:   src/features/notificaciones/components/visor-notificaciones-herald.tsx
	modified:   src/features/notificaciones/services/notificaciones-api.ts
	modified:   src/features/plataforma/views/configuracion-view.tsx

Untracked files:
	bridge/276_entrega_agy2_herald_panel_salud.md
	src/features/notificaciones/components/panel-salud-herald.tsx
	src/features/notificaciones/lib/herald-helpers.ts
	src/features/notificaciones/lib/herald-helpers.test.ts
	src/features/notificaciones/services/notificaciones-api.test.ts
```

**Confirmación:** No se realizaron comandos `git commit`, `git push` ni `deploy`.
Entrega lista para auditoría y control de calidad por `agy:0.0`.
