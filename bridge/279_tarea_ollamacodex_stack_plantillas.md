# ENCARGO 279: POLIS Herald — Stack Completa de Plantillas HTML Institucionales con Logo Oficial y Código QR

**Destinatario:** `ollamacodex`
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO
**Base de trabajo:** `docs/herald_catalogo_eventos.md` (levantado en Encargo 278) y logo oficial en `public/logo-polis.svg`.

---

## 1. Contexto y Objetivos

El usuario y la dirección de POLIS han solicitado estandarizar **toda la stack de plantillas de correo electrónico transaccionales**, cubriendo el ciclo de vida completo de usuarios ciudadanos, funcionarios internos y gobernanza comunitaria.

Además se incorporan dos elementos clave:
1. **Logo Oficial POLIS** (Ágora concéntrica de Cartagena de Indias + tipografía Ples). El SVG ya está disponible en `/root/polis/public/logo-polis.svg`.
2. **Código QR Institucional** en las constancias de radicación y trámites ciudadanos (eventos de fe pública), que permite a cualquier ciudadano o veedor escanear con su celular el documento impreso o digital para validar la autenticidad y estado de su aporte en tiempo real en la plataforma.

---

## 2. Regla Crítica de Concurrencia

`freebuff` está cerrando el Encargo 275 y ha estado tocando `backend/app/modules/notificaciones/plantillas_eventos.py`.
**POR TANTO, PARA EVITAR CONFLICTOS:**
- Desarrollar la nueva suite unificada en **`backend/app/modules/notificaciones/plantillas_stack.py`**.
- La capa base y las funciones exportadas deben coexistir o importar las utilidades necesarias sin sobreescribir destructivamente lo que `freebuff` esté editando.
- La coordinación (`agy:0.0`) se encargará del puente y reexportación tras la auditoría.

---

## 3. Especificación Técnica de las Plantillas

### 3.1 Cabecera y Capa Base Universal
- Tabla con ancho máximo 600px, centrada, con bordes redondeados (`border-radius: 8px`), borde sutil (`#e2e8f0`).
- Cabecera en azul noche (`#0f172a`), con acento caribe (`#0284c7`), badge superior: `"ALCALDÍA MAYOR DE CARTAGENA DE INDIAS"`.
- Inclusión del Logo POLIS:
  - Imagen enlazada a `https://seguridadhumanaintegral.org/logo-polis.svg` con dimensiones controladas (`width="140"` o similar).
  - Fallback textual elegante y semántico para clientes de correo con bloqueo de imágenes externas.
- Subtítulo dinámico según el trámite o evento.

### 3.2 Código QR de Verificación
- Función auxiliar `generar_qr_base64(url: str) -> str | None`.
- Si `qrcode` y `PIL` o `io.BytesIO` están disponibles en el entorno, generar el código QR en PNG y retornarlo como `data:image/png;base64,...`.
- Si la librería no está instalada o lanza error, retornar `None` o fallback elegante con el enlace directo y el radicado en caja destacada.

### 3.3 Catálogo Completo de Plantillas a Implementar

#### A. Cuentas e Identidad
1. `generar_html_registro_bienvenida(...)`: Bienvenida cívica, instrucciones de acceso seguro y credencial de participación.
2. `generar_html_verificacion_correo(...)`: Enlace y botón con token para validar correo electrónico (validez 24 horas).
3. `generar_html_recuperacion_contrasena(...)`: Enlace seguro de un solo uso para restablecer clave con advertencia de seguridad.
4. `generar_html_contrasena_cambiada(...)`: Notificación de cambio de contraseña exitoso con botón de reporte de seguridad en caso de no haber sido el usuario.
5. `generar_html_perfil_actualizado(...)`: Trazabilidad de actualización de datos de perfil, correo o roles.

#### B. Participación Ciudadana y Radicación (Fe Pública)
6. `generar_html_constancia_radicacion(...)`: Constancia oficial de radicación de propuesta ciudadana, con radicado institucional, fecha/hora legal (`America/Bogota`), resumen de la iniciativa y el **código QR de verificación**.
7. `generar_html_propuesta_actualizada(...)`: Notificación de actualización o complementación de propuesta.
8. `generar_html_cambio_estado(...)`: Notificación de avance de trámite (en deliberación, admitida, concepto técnico emitido, rechazada con motivación).
9. `generar_html_priorizacion(...)`: Incorporación formal del aporte al Plan de Desarrollo / Agenda Distrital.
10. `generar_html_apoyo_propuesta(...)`: Notificación al autor cuando su propuesta recibe respaldo ciudadano ("me gusta").
11. `generar_html_actividad_ciudadana(...)`: Resumen de actividad o comentarios en iniciativas comunitarias.

#### C. Gobernanza Territorial y Mesas
12. `generar_html_invitacion_mesa(...)`: Convocatoria oficial a mesa de trabajo, ubicación, orden del día y enlace a la agenda.
13. `generar_html_acta_sesion(...)`: Notificación de acta de mesa disponible para revisión, observaciones o firma comunitaria.
14. `generar_html_compromiso_asignado(...)`: Asignación formal de compromiso a funcionario o veedor con fecha límite de cumplimiento.

#### D. Operación Institucional
15. `generar_html_gestion_institucional(...)`: Comprobante para funcionarios/gestores tras ejecutar una acción administrativa (con ID de auditoría).
16. `generar_html_alerta_pendientes(...)`: Alerta para facilitadores de mesa con propuestas pendientes de concepto o actas sin cerrar.
17. `generar_html_resumen_diario(...)`: Resumen diario consolidado de acciones y pendientes (consumible por el cron matutino de las 7:00 AM).

---

## 4. Requisitos de Seguridad y Calidad Obligatorios

1. **Escape HTML riguroso:** Aplicar `html.escape` a TODO parámetro recibido de usuario (nombres, títulos, descripciones, observaciones, etc.) para impedir inyección XSS.
2. **Compatibilidad:** Tablas con estilos inline, fuentes safe-web (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`), contrastes de color accesibles (WCAG AA).
3. **Pie Legal:** Incluir mención a la Alcaldía Mayor de Cartagena de Indias, Secretaría del Interior y Convivencia Ciudadana, Ley 1581 de 2012 (Habeas Data) y Código de Procedimiento Administrativo (CPACA).
4. **Pruebas Automatizadas:** Crear `backend/tests/test_plantillas_stack.py` verificando:
   - Que cada una de las 17 plantillas renderiza sin excepciones.
   - Que la carga útil con caracteres especiales `<script>alert('xss')</script>`, comillas y ampersands queda debidamente escapada.
   - Que la función de QR genera el formato adecuado o usa el fallback sin romper el HTML.
   - Que el logo institucional y el pie legal están presentes en el marcado generado.

---

## 5. Reglas de Ejecución

- **NO comitear ni pushear** (estricto).
- Ejecutar `ruff check` y `pytest backend/tests/test_plantillas_stack.py`.
- Entregar informe en `bridge/279_entrega_ollamacodex_stack_plantillas.md` detallando las plantillas implementadas, ejemplos de asunto, parámetros y salida de las pruebas.
- Notificar a `agy:0.0` vía tmux al concluir.
