# ENCARGO 285: Conexión de Eventos Transaccionales Reales de POLIS al Motor Herald y Plantillas Oficiales

- **Destinatario:** `ollamacodex` (`=ollamacodex:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-01
- **Estado:** ASIGNADO EN EJECUCIÓN
- **Contexto:**
  En el Encargo 279 construiste el stack completo de 17 plantillas HTML oficiales en `backend/app/modules/notificaciones/plantillas_stack.py`. En el Encargo 283 se actualizó la cabecera institucional (`polis | plataforma para la construccion de politicas publicas`) y el orden estricto de campos de la constancia (Entidad, Política, Dimensión, Propuesta, Autor, Fecha y hora legal). En el Encargo 282 se desplegó la ruta pública de validación de constancias con QR en `/aportes/[codigo]`.
  
  **Objetivo del Encargo 285:** Conectar los flujos reales de la aplicación (`backend/app/modules/notificaciones/service.py`, `backend/app/modules/aportes/service.py`, y servicios asociados) para que utilicen el stack de plantillas oficiales de `plantillas_stack.py`, enlacen a la URL oficial de validación de fe pública (`/aportes/{radicado}`), y encolen los correos en la tabla `notificaciones_transaccionales` con total fidelidad.

---

## 1. Alcance y Requerimientos Específicos

### Requerimiento 1: Constancia de Radicación Ciudadana
1. **Archivo afectado:** [`backend/app/modules/notificaciones/service.py`](file:///root/polis/backend/app/modules/notificaciones/service.py) en `enviar_constancia_radicacion`.
2. **Enlace de verificación:**
   - La URL de consulta debe apuntar a la ruta pública oficial de fe pública:
     `url_aporte = f"{url_base}/aportes/{radicado}"` (reemplazando el legado `/seguimiento?radicado={radicado}`).
3. **Plantilla oficial y campos:**
   - Usar `generar_html_constancia_radicacion` de `app.modules.notificaciones.plantillas_stack`.
   - Firma enriquecida con parámetros opcionales (`dimension`, `entidad`, `politica`).
   - Asunto oficial: `Constancia oficial de radicación {radicado} - POLIS`.
4. **Llamada desde `aportes/service.py`:**
   - En [`backend/app/modules/aportes/service.py`](file:///root/polis/backend/app/modules/aportes/service.py) (método `crear`), pasar el nombre de la dimensión/territorio si está disponible (`propuesta.territorio_nombre` o dimensión asociada).

### Requerimiento 2: Notificación de Cambio de Estado de Propuesta
1. **Archivo afectado:** `backend/app/modules/notificaciones/service.py` en `enviar_notificacion_cambio_estado`.
2. **Plantilla oficial:**
   - Usar `generar_html_cambio_estado` de `plantillas_stack.py`.
   - Enlace oficial: `{url_base}/aportes/{radicado}`.
   - Asunto: `POLIS: Actualización en el estado de su radicado {radicado}`.

### Requerimiento 3: Conexión de Registro y Activación Ciudadana
1. **Archivo afectado:** `backend/app/modules/notificaciones/service.py` en `enviar_bienvenida_registro`.
2. **Plantilla oficial:**
   - Usar `generar_html_registro_bienvenida` o `generar_html_verificacion_correo` de `plantillas_stack.py`.
   - Garantizar que el mensaje mantenga la pedagogía clara sobre activación y la instrucción de revisar Spam y marcar "No es spam".

### Requerimiento 4: Limpieza e Importación Consistente
1. En `backend/app/modules/notificaciones/service.py`, unificar los imports de plantillas para que apunten prioritariamente a `plantillas_stack.py` (manteniendo retrocompatibilidad si alguna función de prueba requiere `plantillas_eventos.py`).
2. Mantener la semántica transaccional (todo se encola en `notificaciones_transaccionales` con `estado_envio="pendiente"` dentro de la transacción de base de datos activa).

---

## 2. Criterios de Aceptación y Calidad

1. **Pruebas de Backend:**
   - Ejecutar: `PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_plantillas_stack.py backend/tests/test_notificaciones*.py backend/tests/test_aportes*.py` (o tests pertinentes).
   - Todos los tests deben pasar en verde.
2. **Calidad de Código:**
   - Ejecutar: `backend/.venv/bin/ruff check backend/app/modules/notificaciones backend/app/modules/aportes` (0 errores).
   - `backend/.venv/bin/ruff format --check backend/app/modules/notificaciones backend/app/modules/aportes`.
3. **Reglas de Entrega:**
   - **NO hacer git commit ni git push.**
   - Generar informe de entrega detallado en: [`bridge/285_entrega_ollamacodex_conexion_eventos_herald.md`](file:///root/polis/bridge/285_entrega_ollamacodex_conexion_eventos_herald.md).
   - Notificar a `agy:0.0` vía tmux con el resumen de cambios.
