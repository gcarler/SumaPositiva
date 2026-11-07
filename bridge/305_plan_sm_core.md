# Plan SM Core

## Objetivo
Convertir el sistema actual de mensajería (Herald) en un núcleo portable, transaccional y multicanal llamado **SM Core**, reutilizable por otros software sin acoplarse a POLIS.

## Estado actual
- El sistema actual ya dispone de:
  - outbox transaccional
  - plantillas institucionales
  - worker de envío
  - reintentos
  - salud operativa
  - auditoría
  - correo como canal principal
- El sistema actual está acoplado a POLIS por nombres, eventos y contratos de negocio.
- Se requiere desacoplar el motor para permitir:
  - WhatsApp
  - Telegram
  - SMS
  - correo
  - otros canales sociales
  - trazabilidad universal

## Alcance
### Dentro del alcance
- Crear un núcleo independiente llamado **SM Core**.
- Permitir múltiples canales por adaptador.
- Registrar eventos, mensajes, intentos, estados y trazabilidad.
- Mantener compatibilidad con Herald durante la migración.
- Reutilizar el núcleo en otros proyectos.

### Fuera del alcance en la fase inicial
- Sustituir Herald de golpe sin compatibilidad.
- Integrar todas las redes sociales en simultáneo.
- Escraping o conexiones no oficiales.
- Publicar datos personales sin consentimiento.

## Arquitectura propuesta
```text
sm/
  core/         núcleo independiente de POLIS
  channels/     adaptadores por canal
  templates/    plantillas y renderizado
  worker/       ejecución de cola
  webhooks/     eventos entrantes
  audit/        trazabilidad y auditoría
  consent/      consentimiento y opt-out
  health/       estado operativo
```

## Estructura lógica
```text
Evento -> Núcleo SM -> Adaptador de canal -> Envío
                      -> Registro de intento
                      -> Auditoría
                      -> Trazabilidad
```

## Entidades mínimas
```text
SMEvent
SMMessage
SMChannel
SMDelivery
SMAudit
SMConsent
SMHealth
```

## Estados del mensaje
```text
pendiente
encolado
enviado
entregado
fallido
agotado
cancelado
```

## Canales iniciales
1. Correo
2. WhatsApp
3. Telegram
4. SMS
5. Webhooks internos

## Fases de trabajo

### Fase 0 — Definición
- Formalizar alcance.
- Definir contratos de eventos.
- Definir canales iniciales.
- Decidir qué se migra de Herald y qué queda como compatibilidad.

### Fase 1 — Núcleo independiente
- Crear módulo `sm`.
- Definir modelos base.
- Separar concepto de evento, mensaje y entrega.
- Mantener Herald como capa interna/legacy.
- Establecer API interna.

### Fase 2 — Trazabilidad transaccional
- Garantizar trazabilidad por mensaje.
- Agregar hash institucional.
- Aplicar idempotencia.
- Definir auditoría por acción.
- Garantizar no pérdida de constancia.

### Fase 3 — Canales
- Implementar adaptadores de canal.
- Definir contratos comunes de envío.
- Definir plantillas reutilizables.
- Definir webhooks entrantes si el canal lo permite.

### Fase 4 — Consentimiento y seguridad
- Consentimiento por canal.
- Opt-out.
- Bloqueo de contacto no autorizado.
- No exponer PII.
- Registros auditables.

### Fase 5 — Salud y operación
- Endpoint `/sm/health`.
- Salud por canal.
- Colas con reintentos.
- Alertas ante fallas.
- Visibilidad operativa.

### Fase 6 — Integración con POLIS
- Eventos POLIS hacia SM.
- Migración progresiva desde Herald.
- Mantener compatibilidad temporal.
- Validación end-to-end.

### Fase 7 — Reutilización externa
- Extraer como servicio o librería.
- Documentar contratos.
- Documentar API y SDK.
- Facilitar montaje en otros software.

## Reglas del trabajo
- No romper producciones actuales.
- No eliminar Herald todavía.
- No crear sistema paralelo sin control.
- No usar APIs no oficiales.
- No publicar datos personales sin consentimiento.
- No implementar canales sin prueba de contrato.
- Validar con pruebas dirigidas antes de expansión.

## Criterios de aceptación
- Un evento puede convertirse en mensaje.
- Un mensaje puede entregarse por canal.
- El estado queda registrado.
- La entrega se puede auditar.
- El consentimiento puede controlarse.
- El sistema puede usarse desde otro software.
- La migración desde Herald no rompe POLIS.

## Entregables esperados
- Documento de arquitectura.
- Contrato de eventos.
- Contrato de mensajes.
- Contrato de canales.
- Implementación del núcleo.
- Pruebas dirigidas.
- Informe de integración.
- Plan de migración desde Herald.
