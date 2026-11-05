# Casos preparados para 232 → 233

Estado: **sin ejecución de aplicación**, pendiente de la señal
`REINSPECCION_CONSUMIDOR_221`, entrega y hashes congelados.

La referencia es el comportamiento y las respuestas HTTP reales de 211. Se
conservan copias literales de sus dos scripts de navegador y helpers en `casos211/`.
Las aserciones de cierre no se rebajarán para aceptar síntomas nuevos. Los
selectores se ajustarán únicamente a la UI congelada identificando el cambio.

## Objeto y ambiente que deben fijarse al recibir la señal

1. Guardar la señal de coordinación, hora, SHA de entrega 221 y manifiesto.
2. Cotejar todos los archivos declarados por221 y los 13 del consumidor 187
   arrastrados desde 211; registrar diferencias legítimas y ajenas separadas.
3. Cotejar backend de identidad 181, docs vigentes, migraciones y locks de entorno.
   Los resultados 199/226 son históricos y no se presentarán como nueva ejecución.
4. Registrar `autorizacion-inicio.json` solo después de recibir la señal. El
   lanzador exige la señal exacta y verifica los hashes antes de cada corrida.
5. Copiar los bytes finales frontend. Si los ancestros con otro lock alteran el
   trazado standalone, usar un temporal nuevo `/tmp/polis_eaf233_*` declarado,
   aislado del checkout y de producción. Conservar procedencia y artefactos en 233;
   limpiar solo ese temporal propio al acabar. Nunca modificar configuración de
   producto para ocultar un fallo de ensamblado.
6. Migrar únicamente la base nueva 233 después de la señal. No ejecutar downgrade
   sobre la base principal. No hay necesidad identificada de migración destructiva.

## Matriz de aceptación

| Caso | Referencia211 | Recorrido real / estímulo | Evidencia de aceptación |
| --- | --- | --- | --- |
| A1 Activación desde plataforma | 02b/02c/02d | Login limitado → restaurar /plataforma → Mi cuenta → iniciar/activar TOTP → cerrar panel | API/perfil y estado reales acreditan la sesión; menú y contenido se actualizan sin reload, «Revisar acceso» ni expiración de temporizador; no aviso antiguo de enrolamiento |
| A2 Conservación de otra sesión | 03b/03c | Abrir antes otra sesión del mismo usuario; activar solo A | La otra conserva 403 en recurso protegido y estado no acreditado, con acción de logout/relogin realizable |
| A3 Estado pendiente | Variante independiente | Retardar respuestas propias de activación/perfil/estado, sin sustituirlas por respuestas de éxito | Controles de espera y estados conservadores; permisos/acreditación no aparecen antes de las respuestas autoritativas; no secreto en evidencia |
| B1 Error único de estado | 06a/06b | Solo /mfa/estado devuelve 503 controlado en navegador; /perfil sigue siendo real con permisos vacíos | No cabecera, menú ni accesos institucionales por rol nominal; error comprensible, reintento y salida; token/perfil válidos conservados |
| B2 Reintento y salida | Variante independiente | Retirar el 503, usar la acción visible; repetir aislamiento en otra sesión y salir | Reintento obtiene estado real y lleva al enrolamiento/relogin pertinente; logout real revoca y limpia; sin bucles ni permisos ficticios |
| C1 Magic Link limitado | 04a | Solicitar enlace sin SMTP, reconstruir token propio solo en memoria, abrir fragmento y consumir por Next/API | Un 200 real de confirmar con enrolamiento requerido lleva a Mi cuenta/configuración y aviso limitado; sin anuncio de acceso pleno ni formulario de pedir otro enlace |
| C2 Consumo único / desafío | 04b/04c y variante | Contar POST confirmar durante transición, re-render y consulta de estado; después usar cuenta propia con factor activo | Un consumo inicial exitoso; transición estable sin reutilizar enlace; el factor activo sigue pidiendo desafío y solo habilita después de verificar |
| D1 Reflow 320 | enrolamiento-320-claro y 02a-movil-cancelar-cabe-en-viewport | Formulario TOTP real visible a 320 px en claro/oscuro | Geometría de todos los controles dentro de viewport/panel, hit-test y botón Cancelar operable; no ocultar el control ni confiar solo en scrollWidth |
| D2 Teclado y escalado | 01f/01g y variante | Foco inicial, Tab/Shift+Tab, Escape/retorno, escritorio/320 px y escala de texto/zoom verificable | Foco visible y atrapado en panel activo, retorno al disparador, controles íntegros con reflow; distinguir escala CSS de zoom nativo si el motor no permite comprobarlo |
| E1 Errores y revocación | 01a/01d/03a/07b/07c | Credencial 401, operación limitada 403, inicio con factor activo 409, activación inválida 400, perfil revocado 401 | Campos/estado conservados cuando corresponde; 409 no cambia factor/códigos, no muestra QR/éxito; 401 de sesión realmente revocada sí limpia |
| F1 Ensamblado alternativo | Límite de build211 | `bun run build` corregido con distDir alterno, en copia nueva y API propia disponible para prerender | CLI y ensamblado usan el mismo destino; server.js, estáticos y public quedan completos donde se sirven; comprobar recursos desde servidor propio armado |
| F2 Destino predeterminado | Variante independiente de build | Lectura del script final y prueba en copia/fixture propio sin POLIS_NEXT_DIST_DIR | El default continúa siendo .next de la copia; no se crea ni altera .next del checkout servido; documentar si se ejecuta ensamblado o build completo |

## Checks que esperan la congelación

- `bun run check` en copia propia, incluyendo política UI, tipos y lint.
- Historias afectadas y pruebas de consumidor/build que el manifiesto 221 delimite.
  Suite completa si cambia un patrón compartido conforme a la skill UI.
- Build **con ensamblado**, no solo CLI Next. El servidor efímero del navegador
  debe permitir verificar los recursos de ese resultado.
- Navegador Chromium instalado, rutas solo hacia el origen Next propio, API propia
  y base 233. Proveedores reales deshabilitados; los seams Google/correo se declaran.
- No duplicar `backend:check` ni pruebas globales de otros equipos.

## Evidencia y cierre previstos

Cada corrida conservará argumentos/retorno, snapshot antes/después, script exacto,
respuestas HTTP sanitizadas, capturas con QR/códigos/contraseñas ocultos y errores
completos. Se distinguirán respuestas reales, demoras y el 503 inyectado. Los
resultados se agruparán por criterio, no por suma de aserciones. Se cotejarán los
originales211 al cierre y se terminarán únicamente PIDs/puertos propios.

No hay dictamen de remediación hasta ejecutar estas comprobaciones sobre 221
congelado. Una aprobación acotada tampoco autorizaría GO-LIVE global.
