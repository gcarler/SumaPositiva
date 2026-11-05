# ENCARGO 276: POLIS Herald — Panel de salud de entregas (FRONTEND)

**Destinatario:** `agy2` (`=agy2:0.0`)
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO
**Paralelo:** Encargo 275 (`freebuff`, backend) implementa el contrato de la sección 2. Trabaja contra ese contrato con datos de ejemplo tipados; **no esperes al backend y no cambies el contrato** (si necesitas un campo más, avisa a `agy:0.0`).

---

## 1. Contexto

El 2026-10-31 se descubrió que **ningún correo salía de producción** y nadie lo notó. Se está construyendo la observabilidad de POLIS Herald. Tu parte: que un gestor o administrador **vea de un vistazo si el correo está sano** y pueda **reintentar** envíos agotados.

Ya existen (Encargo 274): `src/features/notificaciones/services/notificaciones-api.ts` y `components/visor-notificaciones-herald.tsx` (historial forense, permiso `auditoria:leer`). **Reutiliza** su cliente HTTP, tipos y convenciones; no dupliques.

### ⚠️ Corrección pendiente del Encargo 274 (obligatoria)
Tu informe 274 declaró **"2/2 pruebas pasando"** para `notificaciones-api.test.ts`, pero **ese archivo no existe** en el árbol de trabajo (`find src/features/notificaciones -type f` solo muestra los 2 archivos de código). Por eso no quedó en el commit `1fb7ec8`. Debes **crearlo de verdad**, ejecutarlo y pegar la salida real. Recuerda que `bun test` solo detecta archivos que cumplan el patrón (`*.test.ts`) y que se invoca como `bun test ./ruta/archivo.test.ts`. Esto es condición de entrega.

---

## 2. Contrato API (fuente de verdad; lo implementa `freebuff`)

```jsonc
// GET /api/v1/notificaciones/salud   (permiso auditoria:leer)
{
  "estado": "saludable" | "degradado" | "critico",
  "motivos": ["string"],
  "smtp_configurado": true,
  "ejecutor": {
    "activo": true,
    "ultimo_latido": "2026-10-31T16:00:00Z" | null,
    "ultimo_ciclo": { "procesados": 0, "enviado": 0, "fallido": 0, "simulado": 0 } | null
  },
  "cola": {
    "pendientes": 0, "procesando": 0,
    "fallidos_reintentables": 0, "agotados": 0,
    "mas_antiguo_segundos": null
  },
  "ultimas_24h": {
    "enviados": 0, "simulados": 0, "fallidos": 0,
    "tasa_exito": null, "latencia_p50_s": null, "latencia_p95_s": null
  },
  "por_tipo": [{ "tipo_evento": "radicacion", "enviados": 0, "fallidos": 0, "pendientes": 0 }]
}

// POST /api/v1/notificaciones/{id}/reintentar  -> 200 { "id": "uuid", "estado_envio": "pendiente" }
//   errores: 404 no existe · 409 no está agotada · 401/403 sin permiso

// GET /api/v1/notificaciones/historial?estado_envio=fallido
//   cada ítem ahora incluye además: "intentos": number, "error_detalle": string | null
```

`MAX_INTENTOS` es 8 en el backend; **no lo dupliques en el frontend**: un envío está "agotado" cuando el backend lo marca así (`cola.agotados`) o cuando el ítem trae `estado_envio === "fallido"` e `intentos` ≥ el valor que el backend informe. Si el contrato no trae el tope en el ítem, pide a `agy:0.0` que lo añada en vez de fijarlo a mano.

---

## 3. Qué construir

1. **`PanelSaludHerald`** (`src/features/notificaciones/components/panel-salud-herald.tsx`):
   - **Semáforo de estado** (saludable / degradado / crítico) con **texto e ícono, no solo color** (accesibilidad: no depender del color). Debajo, la lista de `motivos` en español tal cual vienen.
   - **Tarjetas KPI:** pendientes, más antiguo (formatear segundos → "hace 12 min"), enviados 24 h, fallidos 24 h, tasa de éxito (%), latencia p50/p95.
   - **Estado del ejecutor:** activo/inactivo y "último latido hace X". Si `smtp_configurado` es `false`, aviso destacado ("El correo no está configurado: los mensajes se acumulan y no se envían").
   - **Tabla `por_tipo`** con nombres legibles en español de los tipos de evento (`radicacion` → "Constancia de radicación", etc.; mapa centralizado y exhaustivo, con un fallback legible para tipos desconocidos — no romper si el backend añade uno).
   - **Auto-actualización** cada 30 s, **pausada cuando la pestaña está oculta** (`visibilitychange`), con botón "Actualizar ahora" y la hora de la última actualización.
   - Estados **cargando / error (con reintentar) / sin permiso (403)**; nada de pantalla en blanco ni error crudo.
2. **Reintento en el historial:** en `visor-notificaciones-herald.tsx`, filtro "Solo fallidos" y, para ítems agotados, botón **"Reintentar"** con **confirmación** previa. Mientras corre: botón deshabilitado y estado visible; al terminar: refrescar la lista y el panel; en 409/404/403: mensaje claro, no excepción.
3. **Integración:** montar el panel donde corresponda a un administrador/gestor. **Inspecciona la estructura real** (`src/app/plataforma/configuracion`, `usuarios`, y el visor ya montado en `cuenta-usuario.tsx`) y elige el lugar más coherente; **justifica la decisión en tu informe**. Mi sugerencia es una sección en `/plataforma/configuracion`, **no** dentro de la cuenta personal del usuario. Debe respetar los permisos: quien no tenga `auditoria:leer` no ve ni el enlace.
4. **Cliente API:** añadir `obtenerSaludHerald()` y `reintentarNotificacion(id)` a `notificaciones-api.ts` con tipos TypeScript estrictos del contrato (sin `any`) y manejo de errores consistente con lo ya existente.

## 4. Reglas de calidad

- **UI policy:** solo tokens semánticos (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--success)`, `var(--info)`, `var(--ember)`…). **Cero colores Tailwind fijos.** El semáforo usa tokens, no hex.
- Accesibilidad: roles/`aria-live="polite"` para los cambios de estado, foco visible, tabla con `<th scope>`, botones con nombre accesible, contraste suficiente.
- Responsive: debe leerse bien en móvil (tarjetas apiladas, tabla con desplazamiento horizontal contenido).
- Sin dependencias nuevas salvo necesidad real justificada.
- Textos en español institucional, sin tecnicismos innecesarios para el usuario final (el gestor no sabe qué es un "outbox").

## 5. Pruebas obligatorias (ejecutadas de verdad)

- `src/features/notificaciones/services/notificaciones-api.test.ts` (**el que falta del 274**) cubriendo: `listar historial` (éxito, 401, 403), `obtenerSaludHerald` (éxito y errores), `reintentarNotificacion` (200, 404, 409, 403).
- Lógica pura del panel en una función testeable (formateo de tiempos, mapa de tipos, derivación de "agotado"), con prueba de cada rama, incluido el tipo de evento desconocido.
- Verificaciones: `node scripts/ui-policy.mjs`, `bun run typecheck`, `bun x eslint` sobre lo tocado, y `POLIS_NEXT_DIST_DIR=.next-new bun run build && git checkout tsconfig.json` (luego `rm -rf .next-new`). **Pega la salida real.**

## 6. Reglas de ejecución (no negociables)

- **NO hacer commit ni push, NO desplegar.** Reporta a `agy:0.0` y espera auditoría.
- No tocar el backend ni `bd_csh`. No reiniciar servicios.
- **Honestidad en la entrega:** si algo no se hizo o se decidió distinto, dilo en "Decisiones y límites". **Está prohibido declarar probado algo que no ejecutaste** (el 274 tuvo exactamente ese problema).

## 7. Entrega

`bridge/276_entrega_agy2_herald_panel_salud.md` con: archivos tocados (lista real, verificada con `git status`), salida real de cada verificación, dónde montaste el panel y por qué, y decisiones/límites. Notificar a `agy:0.0` por tmux al terminar.
