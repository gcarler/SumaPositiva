# Verificación del panel SM con sesión real — 2026-11-08

**Alcance:** ejercitar el cliente real del panel SM (`src/features/sm/api/sm-api.ts`)
contra un backend FastAPI real, con una cuenta autenticada que tiene
`auditoria:leer` y `comunicaciones:gestionar`. No sustituye la revisión EAF ni
una prueba visual de navegador; el entorno no dispone de Chrome.

## Entorno

- Base: `polis_test_sm_panel_20261108` en `polis-database-1` (127.0.0.1:5433),
  creada desde cero y migrada a `0100_sm_auditoria_operador`.
- Backend: `uvicorn app.main:app` en `127.0.0.1:18310`,
  `POLIS_ENVIRONMENT=test`, bóveda de prueba y worker habilitado.
- Cuenta: `panel.sm@example.org`, rol `autoridad_distrital`; el JWT incluye
  `auditoria:leer` y `comunicaciones:gestionar` (entre otros permisos del rol).
- Sin SMTP ni credenciales de proveedores: los transportes permanecen simulados
  y no se envió correo real.

## Ejecución

Se importaron las funciones reales del panel y se ejecutaron con `apiFetch` y el
token de la sesión:

1. `obtenerSaludSM()` → 200.
2. `registrarConsentimientoSM()` para `correo` → 200.
3. `ingestarEventoSM()` → 201, mensaje `pendiente` con `contacto_hash`.
4. `listarMensajesSM()` → 1 mensaje.
5. `ejecutarWorkerSM(5)` → 1 simulado, 0 enviados, 0 fallidos.
6. `listarMensajesSM()` → estado final `simulado`.
7. `obtenerSaludSM()` → latido del worker actualizado y `simulados=1`.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Salud con sesión autorizada | 200, `estado=degradado` por ausencia real de canales configurados |
| Consentimiento con sesión autorizada | 200 |
| Evento al outbox | 201, `pendiente`, sin contacto crudo en la respuesta |
| Worker | `procesados=1`, `simulados=1`; el estado no se declara `enviado` |
| Salud final | latido `2026-11-08T18:39:54Z`, `pendientes=0`, `simulados=1` |
| PII en respuestas | ausente (`sin_pii=true`) |
| `/sm/health` sin token | 401 |
| `/sm/health` con ciudadano autenticado | 403 |
| `/sm/messages` con ciudadano autenticado | 403 |
| Texto `panel.sm@example.org` en `sm_contactos_boveda`, `sm_mensajes`, `sm_eventos`, `sm_auditorias`, `sm_entregas`, `sm_consentimientos` | 0 filas |

La salud `degradado` es el estado honesto: no hay canales con credenciales
configuradas. El panel no mostró datos fabricados; el evento terminó `simulado`
y nunca `enviado`.

## Limpieza

El backend se detuvo y la base `polis_test_sm_panel_20261108` se eliminó. No se
tocó `bd_csh`, no se reinició ningún servicio y no hubo commit ni despliegue.
