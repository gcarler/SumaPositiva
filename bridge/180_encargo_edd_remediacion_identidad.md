# EDD-ID-GOLIVE-01 · Remediar los hallazgos EAF de identidad

26-oct-2026. El usuario pidió ejecutar pendientes GO-LIVE y evaluaciones independientes. EAF168/169 confirmó problemas de identidad y prepara dictamen BLOQUEADO. Este agente implementa; el evaluador169 conserva independencia y volverá a revisar. No deploy, commit, push ni comunicaciones externas.

## Secuencia y propiedad

**Primero leer, preparar mapa de cambios/pruebas y no modificar aún aplicación/tests.** Esperar mensaje de coordinación `INICIAR_IMPLEMENTACION_IDENTIDAD` que confirme congelación de169/171. Los auditores siguen terminando snapshots del código actual; no alterar su objeto de revisión.

Después, alcance exclusivo de código: `backend/app/modules/identidad/**` y pruebas de identidad existentes pertinentes/nuevo `backend/tests/test_identidad_remediacion_eaf.py`. No tocar src, módulos de aportes, motores/fuentes ni ficheros de otros agentes. Si necesitas modificar un archivo compartido de core o una migración, proponer ruta/cambio al coordinador antes; no crear migraciones en paralelo sin numeración acordada. Permisos/docs de identidad: proponer texto en entrega para integración coordinada, no editar documentación compartida mientras Freebuff la actualiza.

Escrituras de preparación/evidencia: `bridge/181_preparacion_edd_identidad.md`, `bridge/181_entrega_edd_identidad.md` y nuevo directorio `bridge/181_evidencia_edd_identidad/`. Conservar169 íntegro. El árbol está sucio en rama remediacion/aud-2026-10-21; no checkout/reset/restore de cambios ajenos.

## Normas y fallos a remediar

Leer AGENTS, arquitectura, transacciones, identidad, permisos-api y `.agents/skills/polis-edd-transactions/SKILL.md`, además del dictamen/evidencias169. Confirmar escenarios antes de cambiar; no depender solo del resumen de coordinación:

1. **Intentos MFA:**7 respuestas401 con máximo3, contador0, bloqueoNULL y eventos de fallo0 porque una excepción dentro de transaction revierte las escrituras de denegación. Persistir intencionalmente los contadores/bloqueos/eventos del caso de denegación sin confirmar parcialmente el caso de éxito; sin commits/rollbacks de repositorio ni transacciones anidadas. Probar desde otra conexión.
2. **Reinicio de factor activo:** llamar mfa/iniciar desde sesión de una cuenta con factor activo devuelve200, lo desactiva y permite login posterior sin MFA. Rechazar reinicio no reautenticado conservando factor/secretos/sesiones; solo soportar cambio explícitamente reautenticado si el contrato existente lo contempla. No inventar un bypass de enrolamiento ni desactivar protección por conveniencia.
3. **MFA exigido por rol:** un administrador con MFA requerido accede al directorio sin enrolar. Restringir operaciones protegidas según política actual del rol y estado real de sesión/factor, preservando una vía de enrolamiento/consulta propia/logout para la sesión inicial limitada. No bloquear al primer administrador sin vía de configuración; tampoco aceptar un flag del cliente o claims antiguos como acreditación suficiente. No conceder roles institucionales mediante registro público para pruebas.
4. **Magic link:** la mera solicitud crea una cuenta con correo_verificado=True sin envío/consumo. Solo acreditar correo al consumir exitosamente el token apropiado. Mantener respuesta uniforme, límites de intento, caducidad/uso único y cola durable, sin correo real.
5. **Validación antes del commit:** fallo Pydantic inyectado en solicitar_magic_link devuelve500 pero persiste usuario+token+evento. Construir/validar la respuesta dentro del límite y probar reversión completa desde otra conexión ante validación, flush posterior, commit/cancelación. Conservar las6 pruebas EAF de recuperación que ya pasan.

Zod del cliente rechaza3 respuestas backend actuales; Freebuff coordinará el ajuste del cliente por su alcance frontend. No cambiar nombres API arbitrariamente para ocultarlo; informar schemas/ejemplos sanitizados finales y cualquier cambio necesario de contrato.

Otro hallazgo de aportes: una misma cuenta con dos sesiones produce dos apoyos. Lo remedia el equipo de aportes, pero coordinar cualquier necesidad de identificador estable de cuenta con tu interfaz de identidad. No cambiar silenciosamente la semántica del registro cívico por sesión ni reescribir apoyos históricos desde identidad.

## Verificación e integridad

Pruebas autorizadas solo en base nueva propia `polis_test_edd_identidad_20261026_<sufijo>`, DSN explícitos comprobados antes de importar Settings/pytest. Nunca bd_csh ni bases de otros agentes. Se permite provisionar base de prueba nueva local y sus extensiones sin modificar roles/servicios productivos ni exponer credenciales. Mismo requisito de guardas de drivers/red/archivos que EAF; los fixtures/directorios temporales deben ser aislados y las limitaciones documentadas. No escribir banco, media ni caches activos. El test geodatos actual intenta leer URL productiva desde .env; no permitir conexión.

Añadir regresiones por los escenarios reales, no solo mocks. Capturas de SMTP locales, sin proveedor real. Ruff/format, suites dirigidas de identidad/transacciones y backend:check según perfil; distinguir fallos reales de restricciones de entorno/datos externos. No rebajar tests, forzar verdes ni ajustar producción. Si hay cambios de esquema aprobados, migración nueva, Alembic check y reconstrucción/update con datos de prueba conservados.

Entrega concreta: cambios por archivo, escenarios antes/después, comandos/resultados/omitidos, tablas/transacciones afectadas, hashes y límites. No autoemitir dictamen independiente ni declarar GO-LIVE aprobado. Congelar y avisar al coordinador para reinspección EAF.
