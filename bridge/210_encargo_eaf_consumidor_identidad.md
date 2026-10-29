# EAF-ID-GOLIVE-03 · Consumidor y navegador de identidad

26-oct-2026. Continuación independiente del evaluador169/199.199 aprobó únicamente backend ID01..05 y correcciones documentales ID07 en su snapshot; ID06 quedó expresamente no evaluado. Freebuff entregó187 v2 congelada. No modificar169,199 ni sus evidencias. Este encargo no autoriza despliegue.

Leer AGENTS, `docs/kit-ui-rules.md`, design-system/identidad/permisos, los skills `polis-ui-review` y EAF, y186,187,181 y199. El implementador Freebuff no es el evaluador. Únicas escrituras de este evaluador: `bridge/211_reinspeccion_eaf_consumidor_identidad.md` y `bridge/211_evidencia_eaf_consumidor_identidad/`. No app/tests/src/docs/banco ni artefactos anteriores. El skill de revisión no autoriza aquí correcciones de producto: reportarlas a coordinación.

## Fijación del objeto

Comprobar ambos manifiestos187, no solo los siete archivos v2; los primeros cambios de sesión, cuenta, ámbitos y aportes siguen formando parte del consumidor. Registrar hashes reales iniciales/finales y discrepancias documentales de esos manifiestos separadamente de defectos de aplicación. Su informe aclara que Storybook usa mocks;227 historias y108 pruebas de consumidor son evidencia de entrada y no se atribuyen como corrida propia.

Backend identidad sigue congelado181.0084 ahora tiene SHA `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`, validación de contacto legado posterior a199; no cambia los ocho archivos de identidad. Docs identidad permanecen según199. Permisos tuvo además aclaraciones de aportes con SHA `8782c05d8f692d87e67091f9ef4d62a4f8c6d4821d2151d37e84dc110d698f2a`. La global backend205 corre contra fuentes congeladas y las dos bases propias de coordinación; no usar esos destinos.

## Comprobaciones

- Consumir respuestas reales sanitizadas181/169 mediante los esquemas reales: `otpauth_uri`, ámbitos `creado_en`/`actualizado_en`, ausencia de `ultimo_uso_en`, flags distintos de desafío/enrolamiento y `sesion_verificada`. No inventar campos para forzar un parseo.
- Contraseña, magic y Google controlado conservan el significado del desafío; una sesión limitada no anuncia acceso pleno ni permisos inexistentes.
- Restauración, cambio de rol exigente y sesión previa con factor activo llevan a acciones realizables: configurar MFA o volver a iniciar sesión. Comprobar errores401/403/409 y de lectura de estado, sin borrado innecesario, bucles o pantalla sin salida.
- Enrolamiento y activación refrescan los permisos de la sesión acreditada; otra sesión antigua sigue limitada. El factor activo no se sustituye ni se muestra éxito tras409.
- Comprobar al menos un flujo navegador → Next → API de pruebas real: login limitado, representación/acciones, inicio y activación MFA y lectura posterior de permisos. Otro flujo con sesión previa limitada. No sustituir esto por mocks de Storybook o consultas HTTP separadas. Registrar exactamente qué integró y lo que no pudo ejecutar.
- Aplicar controles de kit pertinentes: foco/teclado/Escape/retorno, espera/error, claro/oscuro,320px/escritorio y movimiento reducido. Ejecutar ui:check/check, historias afectadas y build según skill; si reutiliza una evidencia previa declararlo y no presentarla como ejecución propia. No desactivar axe ni rebajar aserciones.

## Entorno aislado

Para API real, nueva base propia `polis_test*` desde template0 con migraciones, extensiones solo allí y guardas verificadas antes de importar la app. No reutilizar destinos de otros agentes. SMTP/Google/Meta reales deshabilitados; usuario/factor/datos únicamente sintéticos propios. DSN y tokens no se publican. Se puede usar la política de guardas199/205 declarando sus límites sobre procesos nativos.

Identificar puertos libres y PIDs de sus procesos; iniciar/terminar únicamente el stack propio y registrar limpieza. No reiniciar servicios productivos ni tocar `.next` servido: Next PID1228166 mantiene un cwd `.next/standalone` eliminado. El build187 se creó con `POLIS_NEXT_DIST_DIR=.next-validacion187` y se movió a `/tmp/build_aislado_187`; validar su procedencia/posibilidad de reutilizarlo sin modificarlo, o construir una copia aislada propia con distDir explícito. No regenerar artefactos sobre producción. Chromium existe en `/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`, además del headless shell1243; elegir el motor instalado que acepte las dependencias del lock.

Si un check genera archivos, dirigirlos al directorio propio y preservar los resultados fallidos. Screenshots y trazas no deben contener credenciales de operación; secretos sintéticos pueden ocultarse sin recortar la evidencia funcional. No contactar proveedores externos reales.

## Entrega y dictamen

El evaluador decide estado/severidad por evidencia propia. Separar ID06 y sus subcriterios de backend199; no volver a aprobar backend por leer sus resultados. Informar pronto cualquier defecto reproducible para un reencargo acotado, preservando el objeto. Documentar comandos/retornos, objeto exacto, escenarios, límites, fuentes y diferencias de hashes. Un cierre de consumidor no aprueba automáticamente identidad total, otros pendientes frontend, fuentes ni GO-LIVE global. Notificar a coordinación al terminar y congelar211.
