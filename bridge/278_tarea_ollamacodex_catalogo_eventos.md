# ENCARGO 278: POLIS Herald — Catálogo de eventos y matriz de obligatoriedad (documentación)

**Destinatario:** `ollamacodex` (`=ollamacodex:0.0`)
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO

---

## 1. Por qué

POLIS Herald ya envía 12 tipos de evento (constraint `chk_notificaciones_tipo_evento`, migraciones 0092/0093; pronto 13 con `resumen_diario`). Para poder ofrecer luego **preferencias y baja** al ciudadano (cumpliendo Habeas Data, Ley 1581 de 2012) hay que saber, evento por evento, **cuál es obligatorio (fe pública / seguridad) y cuál es meramente informativo**. Hoy esa información no está escrita en ningún sitio.

## 2. Qué producir

Un único documento: **`docs/herald_catalogo_eventos.md`**.

Para **cada** `tipo_evento` existente, una ficha con:

| Campo | Contenido |
|---|---|
| `tipo_evento` | valor exacto del constraint |
| Audiencia | ciudadano / interno (qué roles) |
| Disparo | **archivo y función exactos** que lo encolan (léelos en `backend/app/modules/**/service.py` y `notificaciones/service.py`; no los supongas) |
| Plantilla | función en `backend/app/modules/notificaciones/plantillas_eventos.py` o `correo.py` |
| Asunto | tal cual lo genera el código |
| Datos personales que contiene | lista concreta (correo, nombres, radicado, IP, etc.) |
| Obligatoriedad **propuesta** | `OBLIGATORIO` (fe pública / seguridad / proscripción del silencio administrativo) o `INFORMATIVO` (candidato a baja voluntaria) |
| Justificación | una frase |

Más una **matriz resumen** al inicio (tipo → audiencia → obligatoriedad) y una sección final **"Preguntas abiertas para revisión jurídica"**.

## 3. Reglas (no negociables)

- **Solo lectura sobre el código; no modificar nada bajo `backend/` ni `src/`.** Otros agentes están editando esos módulos. Tu única salida es el documento.
- **Todo dato debe salir de leer el código real.** Si no puedes confirmar algo (por ejemplo qué datos personales lleva un correo), escribe `NO VERIFICADO` en vez de inventarlo. Prohibido rellenar por plausibilidad.
- La clasificación de obligatoriedad es **una propuesta técnica para revisión jurídica, no un dictamen legal**. Dilo en el encabezado del documento. No cites artículos ni sentencias que no hayas podido verificar en el repositorio; las ya citadas en el código (Sentencia C-150 de 2015) puedes referirlas como "citada en el código".
- Español institucional, claro, sin relleno.
- **NO commit, NO push.**

## 4. Entrega

Documento terminado en `docs/herald_catalogo_eventos.md` + informe corto en `bridge/278_entrega_ollamacodex_catalogo_eventos.md` (qué leíste, qué marcaste `NO VERIFICADO` y por qué). Notificar a `agy:0.0` por tmux al terminar.
