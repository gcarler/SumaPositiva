# EAF-ID-GOLIVE-03 · Consumidor de identidad

**BLOQUEADO para EAF-ID-06 en el consumidor 187 v2.** Los contratos Zod corregidos
aceptan las respuestas reales sanitizadas, pero cuatro defectos reproducidos
incumplen los flujos y controles de UI exigidos por 210. Son defectos de severidad
**media**; esta revisión no demuestra una elevación de privilegios en la API.

El [dictamen 199](199_reinspeccion_eaf_identidad.md) permanece intacto y conserva su
conclusión limitada al backend evaluado entonces. Este documento no aprueba
identidad completa, otros módulos ni GO-LIVE y no autoriza despliegue.

## Independencia y objeto

Evaluador: `Codex /root/eaf_identidad_go_live`, independiente de Freebuff,
implementador de 187. Se ejecutó [210](210_encargo_eaf_consumidor_identidad.md),
aplicando AGENTS, arquitectura, transacciones, identidad, permisos, equipo EAF y
las skills `polis-ui-review` y `polis-eaf-transactions`. Se leyeron 186, 187, 181 y 199
como entradas; sus cifras no se atribuyen a esta ejecución.

HEAD: `07096bcd73531415d8b8329a8aba0ad64fa5d23c`, rama
`remediacion/aud-2026-10-21`, árbol compartido sucio. La conclusión corresponde al
contenido hasheado, no a ese commit aislado.

- Los **13 archivos distintos de consumidor/configuración** incluidos en los dos
  manifiestos 187 coinciden con sus hashes declarados y permanecen idénticos entre
  los snapshots inicial y final. Incluyen los primeros cambios de sesión, cuenta,
  ámbitos y aportes, además de los siete archivos de v2. Digest canónico de ese
  conjunto: `7ef69453f2a3914859496c188a2ab71c940b70bec89e5b3cb80694ea9f74e33e`.
- El manifiesto v1 conserva el hash anterior del **propio informe 187**:
  `26c67f8f20288e7769b8d5a62f2078aa46da4089a0651d6d8d800dfe94683507`.
  El informe ampliado tiene
  `ba665c2436133b7a867533df4caf40de5c7d78c9ced8445ae3f078c7827cbc52`.
  Es una discrepancia documental; no se encontró divergencia de esas fuentes.
- Las seis fuentes de identidad 181 constan sin cambios en ambos snapshots; el
  cotejo final de sus ocho archivos, incluidos los dos tests congelados, coincide
  con 181. Esas pruebas backend no se reejecutaron aquí.
- La revisión 0084 observada coincide con la congelación final indicada en 210:
  `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`.
  Identidad documental conserva SHA
  `a38cb758b63aab6353834ae41621d8621ade7ee054a8a03c7497ced91f707f3f`;
  permisos conserva `8782c05d8f692d87e67091f9ef4d62a4f8c6d4821d2151d37e84dc110d698f2a`.
- El snapshot amplio contiene **869 archivos leídos**. Sus dos diferencias finales
  son cambios ajenos AP214 en `backend/app/modules/aportes/schemas.py` y
  `service.py`. Sus hashes inicial/final y mtimes están registrados. Ambos mtimes
  finales son las 06:10:01 UTC, después del cierre de la segunda API propia a las 06:07:40 UTC.
  No se declara estable todo el backend ni se evalúa AP214. Las APIs se arrancaron
  sin reload y las rutas de identidad permanecieron en su objeto181.

[Snapshot inicial](211_evidencia_eaf_consumidor_identidad/snapshot-inicial.json),
[snapshot final](211_evidencia_eaf_consumidor_identidad/snapshot-final.json) y
[cotejo final de la copia](211_evidencia_eaf_consumidor_identidad/cotejo-fuente-copiada-final.json).

## Entorno y ejecución

Se creó desde `template0` la base exclusiva
`polis_test_eaf_consumidor_20261026_380be7f7`, con extensiones instaladas solo allí.
DSN explícitos se construyen en memoria sustituyendo el nombre de base **antes**
de importar la aplicación. No se reutilizaron bases 169/181/199/205 ni productivas,
ni se cambiaron roles o servicios. La base propia queda conservada como evidencia.

La guarda Python copiada de 199, SHA
`123f93347866b2368e6933573274cc4c9f8fa7d6e9cb2e6043b9cbcebed85621`,
se comprobó antes de importar la app: **15 rechazos anteriores a I/O y una conexión
positiva** al nombre exacto propio. Intercepta drivers PostgreSQL, red externa,
SMTP y escrituras del repositorio fuera de 211. La guarda adicional Node tuvo tres
rechazos comprobados; los contextos Chromium bloquearon peticiones ajenas al
origen propio, salvo el script GIS servido íntegramente desde el ensayo. Estas
guardas no son una jaula universal de llamadas nativas, symlinks o subprocess.

Se copiaron fuentes y dependencias frontend dentro de 211. El cotejo final de 513 archivos identifica ajustes automáticos de Next
únicamente en `tsconfig.json` y `next-env.d.ts` de **la copia**, para referenciar
los tipos del distDir propio. El código de
consumidor y `next.config.ts` permanecieron idénticos. No se usó la `.next` servida.

Stack real propio: Next en `127.0.0.1:34113` y Uvicorn en `127.0.0.1:34114`, con
PostgreSQL real. Chromium instalado 1243 ejecutó los flujos. En Google se simularon
explícitamente GIS y la verificación del proveedor; el resto del login, desafío,
autorización y persistencia usó 181. El transporte de correo se sustituyó por un
objeto que admite la solicitud y prohíbe entregas. Magic Link empleó el token real
de la cola propia, reconstruido en memoria; no hubo SMTP ni proveedor Google/Meta
real. Contraseña y TOTP de enrolamiento sí recorrieron la aplicación real.

| Ejecución propia | Resultado y alcance |
| --- | --- |
| Upgrade de la base vacía | Salida 0 hasta la cabeza actual; extensiones locales preinstaladas |
| `bun run check`, dentro de la copia | Salida 0: `ui:check`, TypeScript y ESLint |
| Historias afectadas de identidad y plataforma restringida | **29 aprobadas**, dos archivos; interacciones y axe conservados |
| Parseo con esquemas reales del consumidor | **11 respuestas sanitizadas181/169 aceptadas**, sin añadir campos |
| Primer `next build` aislado | Salida 1 al consultar catálogo público de formularios: la API propia aún no estaba iniciada; compilación y tipos habían pasado |
| `next build` con API propia disponible, r1/r2 | Salida 0 en ambas; distDir `.next-eaf211` dentro de la copia |
| Navegador r1 | 28 comprobaciones registradas: 24 aprobadas, 3 fallidas y 1 timeout; conserva un supuesto incorrecto del evaluador sobre400/401 |
| Navegador r2 | **31 comprobaciones: 26 aprobadas, 5 fallidas**, sin errores de ejecución ni errores JS; las cinco fallidas corresponden a cuatro defectos, pues dos miden el mismo recorte móvil |

El código de salida 0 del lanzador de navegador significa que terminó y registró
sus observaciones; **no significa que sus criterios pasaran**. La r2 preserva los
fallos funcionales. No se repitieron las 227 historias ni las 108 pruebas de consumidor
citadas por 187; tampoco se ejecutaron aquí el catálogo completo, build de
Storybook o `backend:check` global. Los resultados de 199/205 son evidencia previa
o compartida, no corridas 211. No hay cambios de persistencia propios que requieran
una nueva certificación transaccional del backend.

El script de paquete `build` aún copia desde/hacia `.next` fijo aunque el
`next.config.ts` acepte `POLIS_NEXT_DIST_DIR`. Se ejecutó directamente el CLI Next
en la copia aislada. Se acredita esa compilación y el servidor propio; no el
empaquetado del script con distDir alterno ni el despliegue standalone productivo.

Comandos, retornos y logs están en los JSON homónimos de evidencia; los dos stacks
registran sus PIDs, fechas, comandos y limpieza. El primer fallo de build queda
conservado como precondición de entorno, no como defecto de identidad.

## Hallazgos reproducidos

### EAF-ID-06-A · Plataforma conserva enrolamiento después de activarlo · Media

**Fuente:** [cuenta-usuario.tsx](/root/polis/src/features/sesion/components/cuenta-usuario.tsx:87),
[plataforma-shell.tsx](/root/polis/src/features/plataforma/components/plataforma-shell.tsx:25).

**Escenario:** login limitado, restauración en `/plataforma`, apertura de Mi cuenta,
inicio y activación mediante TOTP correcto, cierre del panel. El perfil real ya
devuelve permisos efectivos, estado responde `sesion_verificada=true`, directorio
responde 200 y Mi cuenta ofrece administración. Sin embargo, plataforma sigue
mostrando «Acceso restringido hasta activar la verificación en dos pasos».

La activación actualiza el perfil y el query de MFA, pero deja el `estadoMfa` del
store utilizado por el shell con el valor previo. «Revisar acceso» resuelve la
inconsistencia: no se afirma una pérdida permanente de acceso ni fallo de
acreditación en servidor.

**Corrección requerida:** actualizar o resincronizar el estado MFA que consume el
shell al completar la activación, ligado a la sesión vigente. El cierre del panel
debe representar inmediatamente los permisos y acreditación efectivos, conservando
la restricción de las otras sesiones.

**Evidencia:** casos 02b/02c/02d de ambas corridas,
[captura tras activar](211_evidencia_eaf_consumidor_identidad/r2-plataforma-tras-activar.png)
y [cuenta acreditada](211_evidencia_eaf_consumidor_identidad/r2-activada-cuenta.png).

### EAF-ID-06-B · Error de lectura MFA muestra navegación institucional · Media

**Fuente:** [sincronizar-sesion.ts](/root/polis/src/features/sesion/services/sincronizar-sesion.ts:38),
[plataforma-shell.tsx](/root/polis/src/features/plataforma/components/plataforma-shell.tsx:28)
y [acceso.ts](/root/polis/src/features/plataforma/models/acceso.ts:226).

**Escenario:** usuario real sin factor, rol exigente y perfil real con permisos
vacíos. Se inyecta únicamente una respuesta 503 de `/mfa/estado` en el transporte
del navegador y se restaura `/plataforma`. La lectura fallida termina en
`estadoMfa=null` y sin error de sesión; el shell habilita cabecera, menú y accesos
rápidos institucionales por el rol nominal. Presenta «accesos disponibles para tu
rol» sin resolver la condición MFA. La tarjeta del total de usuarios sí informa
la falta del permiso; eso no resuelve el resto de la representación.

Es un fallo de UI ante una indisponibilidad controlada. El 503 no es un fallo
generado por el backend 181 y no se observó elevación de permisos en la API.

**Corrección requerida:** representar estado MFA desconocido/fallido y permitir
reintentar o cerrar sesión, sin habilitar por rol nominal navegación que el perfil
no acredita. Mantener la sesión válida durante el fallo de lectura.

**Evidencia:** caso 06a reproducido en r1/r2; caso 06b comprueba conservación de sesión;
[captura](211_evidencia_eaf_consumidor_identidad/r2-error-estado.png).

### EAF-ID-06-C · Magic Link limitado no lleva a configurar MFA · Media

**Fuente:** [sesion-panel.tsx](/root/polis/src/features/sesion/panels/sesion-panel.tsx:92)
y [rama del enlace](/root/polis/src/features/sesion/panels/sesion-panel.tsx:104).

**Escenario:** cuenta sintética con rol exigente y sin factor; consumo real de un
Magic Link desde el fragmento del navegador. La API responde 200 con sesión
limitada, permisos vacíos y `mfa_enrolamiento_requerido=true`. El store conserva
esa sesión, pero el panel sigue titulado «Acceso directo (Magic Link)» y pide
correo para enviar otro enlace. No presenta Mi cuenta, aviso de enrolamiento ni
configuración MFA.

`tieneAccion` permanece verdadero por `props.accion/props.token`; la continuación
de enrolamiento siembra la sesión pero no consume esa acción. La condición que
renderiza `CuentaUsuario` continúa siendo falsa. El usuario puede cerrar y abrir
el panel como otra acción; la transición requerida por el enlace no está resuelta.

**Corrección requerida:** finalizar la acción del enlace consumido al recibir una
sesión limitada y abrir la configuración propia con el aviso correspondiente.
Conservar el desafío cuando el factor ya está activo y evitar repetir el consumo
de un enlace de uso único.

**Evidencia:** r1 conserva el timeout esperando Mi cuenta; r2 registra explícitamente
el caso 04a y su contenido. [Captura](211_evidencia_eaf_consumidor_identidad/r2-magic-limitada.png).
Los casos 04b/04c sí completan el desafío de Magic Link con factor activo.

### EAF-ID-06-D · «Cancelar» queda recortado a 320 px · Media

**Fuente:** [cuenta-usuario.tsx](/root/polis/src/features/sesion/components/cuenta-usuario.tsx:340).
**Regla:** kit UI, controles de móvil y ausencia de desbordamiento involuntario.

Con el formulario de activación visible a 320 px, la fila `flex gap-2` no permite
salto de sus dos botones. «Cancelar» ocupa x248.14..347.67, con ancho 99.53 px,
fuera del viewport de 320 px y del panel de 319 px. La captura muestra el texto y botón
recortados. El documento no ensancha porque el contenedor oculta el desbordamiento;
medir solo `document.scrollWidth` no detecta el defecto.

**Corrección requerida:** permitir que esa fila se adapte o apile en móvil,
conservando los botones del kit completos y utilizables.

**Evidencia:** r2, `enrolamiento-320-claro` y
`02a-movil-cancelar-cabe-en-viewport`;
[captura](211_evidencia_eaf_consumidor_identidad/r2-enrolamiento-320-claro.png).

## Criterios satisfechos y límites

- Contratos reales: `otpauth_uri`, ámbitos `creado_en/actualizado_en`, ausencia de
  `ultimo_uso_en`, flags distintos y `sesion_verificada` pasan el parseo propio.
- Contraseña y Google controlado representan inicialmente la sesión limitada.
  Los desafíos con factor activo se completaron para los tres métodos mediante
  códigos de recuperación reales propios; el enrolamiento se activó con TOTP real.
- La segunda sesión anterior conservó denegación 403 después de activar la primera.
  Mostró una acción de logout/relogin realizable y completó su desafío posterior.
- El inicio desde UI con estado obsoleto recibió 409 real y conservó factor/códigos:
  digests idénticos observados desde conexiones nuevas, sin QR ni éxito falso.
- La restauración y el cambio controlado de rol a uno exigente mostraron acciones
  válidas cuando la lectura MFA respondió. El cambio de rol se provisionó por SQL
  solo sobre la cuenta sintética propia; no certifica todo el flujo administrativo.
- Credencial incorrecta 401 y operación limitada 403 conservaron los campos; código
  de activación incorrecto 400 conservó sesión/formulario; perfil revocado 401 sí
  limpió la sesión. La aserción r1 que esperaba 401 en activación fue errónea del
  evaluador, no un defecto del producto. Se corrigió solo la aserción en r2.
- Se comprobaron Tab dentro del panel, Escape y devolución del foco al disparador,
  estado de espera disabled/aria-busy, claro/oscuro, escritorio/320px y preferencia
  de movimiento reducido. Las capturas fueron inspeccionadas. Se detectó el
  recorte indicado; no se afirma conformidad WCAG ni prueba con lector de pantalla.

Los fixtures sanitizados, las historias y las simulaciones de proveedores tienen
sus límites explícitos. No se evaluaron SMTP/Google reales, expiración de proveedor,
carga, disponibilidad operativa, despliegue, ni una regresión integral de POLIS.
Se conservan detalles del supuesto400/401 y del ajuste de medición móvil en
[nota de cierre](211_evidencia_eaf_consumidor_identidad/nota-cierre.json).

## Limpieza, integridad y condición de cierre

Los PIDs propios r1 fueron 2929592/API y 2930036/Next; r2 fueron 2932013/API y 2932399/Next.
Se terminaron solo sus grupos propios y ya no existen en `/proc`; los puertos 34113
y 34114 no tienen listeners al cotejo final. El PID productivo 1228166 sigue presente
con cwd `.next/standalone (deleted)`; solo se inspeccionó. No se reconstruyeron sus
artefactos ni se reinició su servicio.

Solo se escribieron 211 y su directorio de evidencia. El reporte 199 mantiene SHA
`51faa11b68b050ace4ef7d2707e3ea431cdd9b857cb4ab2b8b2ffde7a4611601`.
Los scripts, capturas, logs, dos corridas y fallos se conservan. El
[manifiesto](211_evidencia_eaf_consumidor_identidad/manifiesto-evidencia.json)
identifica la evidencia directa; la copia de fuentes, dependencias y artefactos
grandes se identifica separadamente y no se presenta como evidencia de operación.

**ID06 requiere remediar y reinspeccionar los cuatro criterios fallidos en un
nuevo snapshot.** Los contratos corregidos y los casos satisfactorios aquí
enumerados no permiten cerrar el consumidor 187 v2. Entrega 211 congelada para
coordinación y reencargo Freebuff, sin cambios de producto del evaluador.
