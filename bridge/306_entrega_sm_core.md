# Entrega SM Core (fase núcleo portable)

## Estado
Implementado el núcleo portable de SM como módulo independiente del dominio POLIS:

- `backend/app/modules/sm/contracts.py`
- `backend/app/modules/sm/core.py`
- `backend/app/modules/sm/channels.py`
- `backend/app/modules/sm/service.py`
- `backend/tests/test_sm_core.py`

## Alcance técnico completo
- Modelo agnóstico de:
  - evento
  - contacto
  - mensaje
  - entrega
  - auditoría
  - consentimiento
  - salud
- Núcleo puro sin dependencia de base de datos ni proveedores externos.
- Adaptadores de canal:
  - correo
  - WhatsApp
  - Telegram
  - SMS
  - webhook interno
- Reglas:
  - consentimiento obligatorio por canal y contacto
  - contacto persistido solo como hash
  - trazabilidad con hash forense
  - estados controlados del outbox
  - idempotencia por tenant + llave
  - eventos y mensajes sin contacto CRUDO en auditoría
- Servicio portable reutilizable por otros software.

## Pruebas
- `uv run --project backend pytest backend/tests/test_sm_core.py -q`
- Resultado: **8 passed**
- Ruff/format: **OK**

## Integración
- No se modificó Herald.
- No se rompió ninguna colas existente.
- SM nace como núcleo independiente, no como sustitución abrupta.

## Criterios del plan SM Core
- Evento -> mensaje: implementado.
- Mensaje -> canal: implementado por adaptadores.
- Estado registrado: implementado.
- Entrega auditable: implementado.
- Consentimiento controlado: implementado.
- Reutilizable en otros software: implementado.
- Compatibilidad con Herald: preservada.
