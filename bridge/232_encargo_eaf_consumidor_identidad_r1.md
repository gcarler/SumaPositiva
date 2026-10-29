# EAF-ID-CONSUMIDOR-02 · Reinspección independiente después de 221

26 de octubre de 2026. El usuario autorizó ejecutar pendientes de GO-LIVE y revisiones independientes. Continuación de 210/211; preservar íntegros 199, 211 y sus evidencias. El implementador Freebuff trabaja en 220/221. Esta evaluación no implementa las correcciones.

## Preparación y señal de inicio

Leer AGENTS, skills EAF transacciones y UI review, docs de identidad, permisos y kit UI, 210/211 y 220. Preparar casos y entorno sin ejecutar contra código mutable. **Esperar la señal `REINSPECCION_CONSUMIDOR_221` con entrega y hashes congelados antes de las ejecuciones de aplicación.** Si aparece un cambio posterior en las fuentes objeto, informarlo; no atribuir checks previos a esos bytes.

Únicas escrituras: `bridge/233_reinspeccion_eaf_consumidor_identidad_r1.md` y `bridge/233_evidencia_eaf_consumidor_identidad_r1/`, más temporales propios declarados. Sin modificar aplicación, tests de producto, datos activos, docs, entregas 221/211, ni configuración compartida. No commit, push, despliegue, reinicio ni proveedores SMTP/Meta/Google.

## Entorno

Nueva base propia `polis_test*` desde template0, DSN explícito validado y guardas antes de importar app; no reutilizar las bases de otros equipos ni conectarse a bd_csh. Solo loopback y puertos propios, sin fallback a servidor en producción. Aprovisionar extensiones únicamente en la base propia. Si se necesitan migraciones destructivas, otra base propia exclusiva. Construir Next en copia temporal aislada; nunca escribir `.next` servido ni reiniciar servicios. Credenciales sintéticas y tokens no se vuelcan en logs. Registrar PID/puertos y cerrarlos al acabar.

## Comprobaciones de aceptación

1. Reproducir y comprobar las cuatro regresiones reales de 211 con Chromium y backend real propio: activación MFA desde plataforma actualiza permisos/menú sin recargar; solo `/mfa/estado` devuelve 503 con perfil/permisos reales limitados y la interfaz permanece bloqueada con reintento/salida; confirmación Magic Link 200 con token limitado pasa a configuración sin reutilizar el enlace ni presentar acceso pleno; TOTP a 320 px mantiene todos los controles visibles y operables.
2. Estados de espera/error/revocación: no permisos optimistas por rol nominal, no pérdida indebida de sesión, no bucle de consumir enlace, 401 real limpia sesión. No desactivar accesibilidad ni cambiar contratos de identidad para hacer pasar la UI.
3. Claro/oscuro, teclado, foco, zoom/reflow y kit UI en las superficies afectadas. Mantener tests originales que preservan el significado de los casos, incorporar variantes independientes en evidencia propia. Validar tanto transición permitida como denegaciones; distinguir stub de error controlado y las respuestas reales API.
4. Revisar corrección del ensamblado de build: destino alternativo y compilación usan la misma ruta y se generan `server.js`, estáticos y public en el resultado correcto; destino por defecto conservado por lectura/pruebas en copia. No basta un `next build` sin ensamblado.
5. Ejecutar checks/historias dirigidas y build afectados sobre bytes finales, registrar retorno real, fallos e interrupciones. No duplicar global backend. Citar 199/226 solo dentro de su alcance histórico, sin declararlos reejecutados aquí.

Sellar informe, casos y evidencia con SHA, snapshot inicial/final y cotejo de originales 211. Dictamen independiente y acotado para ID-06/regresiones corregidas, sin autorización de GO-LIVE global. No subsanar un fallo cambiando los datos o aserciones para ocultarlo; informar reproducción precisa a coordinación.
