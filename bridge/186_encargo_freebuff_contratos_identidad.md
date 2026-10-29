# FB-ID-CONTRATOS-01 · Consumidor de identidad tras EAF169

26-oct-2026. Añadir al cierre frontend GO-LIVE autorizado, sin firmar como evaluador independiente. Conservar la evidencia169. Coordinar con el implementador backend `/root/edd_identidad_go_live`, que trabaja según180/181; Freebuff no edita backend.

Leer `169_dictamen_eaf_identidad.md`, sus respuestas API sanitizadas y `181_preparacion_edd_identidad.md`. Aplicar skill de construcción POLIS UI, AGENTS y kit. Corregir los contratos de consumidor en el alcance sesión/identidad, manteniendo cambios ajenos:

- Estado MFA: la API no devuelve `ultimo_uso_en`; no inventar una fecha de uso. Alinear el esquema con campos reales o pedir ampliación backend explícita si la pantalla necesita un dato real.
- Inicio MFA: contrato API `otpauth_uri`, no `uri_totp`. Adaptar las referencias del consumidor.
- Ámbitos: contrato API `creado_en`/`actualizado_en`, no `asignado_en`.
- Contrato aditivo acordado con EDD: `TokenRespuesta.mfa_enrolamiento_requerido` booleano, default false; true identifica sesión limitada al enrolamiento. `mfa_requerido` conserva el significado de desafío TOTP del login existente. Estado MFA añade `sesion_verificada`, calculado por servidor. El backend conserva una sesión inicial para configurar el factor, con permisos vacíos y denegación de operaciones protegidas; habilita consulta propia, estado, iniciar/activar MFA y logout. Tras activar se acredita solo esa sesión. Factor activo no puede reiniciarse con `/mfa/iniciar`; la API lo rechaza409. Un rol exigido no puede desactivar MFA. Consultar a coordinación si la implementación181 cambia estos detalles.

El consumidor debe representar claramente el enrolamiento pendiente y llevar a la configuración real, sin anunciar acceso pleno al recibir ese token. Manejar sesiones anteriores/rol recién exigido y errores401/403/409 sin bucles ni permisos ficticios. Si el estado real exige volver a iniciar sesión para completar MFA, mostrar esa acción. Mantener cierre de sesión y recuperación de estado. No mostrar secretos en logs ni evidencia.

Añadir pruebas de consumidor contra las respuestas sanitizadas reales de169 y contratos finales de181, y de los flujos limitados/challenge/activación. Las pruebas de contrato no sustituyen navegador. Ejecutar checks e historias/build pertinentes según kit, y una verificación en navegador aislado de los flujos afectados si el stack de prueba está disponible. No usar producción ni enviar correos reales. Informar por separado verificaciones ejecutadas y no evaluadas.

Entregar `bridge/187_entrega_freebuff_contratos_identidad.md` y evidencia propia187 con archivos/hashes, escenarios, resultados y límites. No editar169,181, diagnósticos ni fuentes/banco, sin commit/push/deploy. Actualizar docs de estado solo en su alcance ya asignado y referenciar ambos dictámenes169/171 como BLOQUEADOS hasta reinspección EAF. No declarar cerrado GO-LIVE por pasar check.
