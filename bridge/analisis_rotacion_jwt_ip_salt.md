# ANÁLISIS: rotación de `POLIS_JWT_SECRET_KEY` y `POLIS_IP_SALT`

**De:** `freebuff:0.0` (EDD)
**Fecha:** 2026-11-01
**Estado:** **DECIDIDO Y CONFIRMADO (2026-11-03): Opción A — corte absoluto, ventana jueves 2026-11-05 03:00 UTC (22:00 Bogotá del miércoles 4)**, con condiciones de giro (ver §7). No se ha ejecutado nada.
**Origen:** límite (b) del cierre de rotación de credencial de BD en `bridge/275_auditoria_eaf_herald_salud_resumen.md` y paso 2 de `docs/plan-consolidacion-git.md` ("Pendiente de ejecución al crear remoto").
**Normativa aplicable:** `docs/identidad.md`, `docs/despliegue-produccion.md`, `docs/rotacion-secretos.md`, Ley 1581/2012 (Habeas Data), `bridge/reauditorias/reauditoria_E1.md` (hallazgo ALTA sobre secretos).

---

## 1. Hallazgo clave que cambia el plan

Los dos secretos **no se pueden rotar de forma independiente en la práctica**.
Cualquier rotación exige reiniciar `polis-backend.service` (el proceso lee
`EnvironmentFile` en el arranque), y si ese mismo reinicio carga también un
`POLIS_JWT_SECRET_KEY` nuevo, **todos los tokens en circulación quedan
invalidados en ese instante**. Rotar solo `IP_SALT` (con reinicio para cargarlo)
también cuesta una ventana, un reinicio y una verificación completa. La
estrategia eficiente es rotar ambos en una única ventana con un solo reinicio.

---

## 2. Inventario de uso real (verificado en el código, HEAD `64e818f`)

### 2.1 `POLIS_JWT_SECRET_KEY` — firma de tokens de acceso

| Consumidor | Referencia | Qué protege |
| --- | --- | --- |
| Token de sesión anónima cívica | `backend/app/modules/sesion/security.py` (`crear_token_sesion` / `decodificar_token_sesion`) | JWT con claims `sesion_id` y `huella_hash` del IP |
| Token de acceso institucional | `backend/app/modules/identidad/security.py` (`decodificar_token_acceso`) | JWT de usuarios autenticados |
| Enlaces fuera de banda (verificación de correo, recuperación de contraseña, magic-link) | `backend/app/modules/identidad/service.py` flujos de token | Enlaces ya enviados por correo y vigentes |

### 2.2 `POLIS_IP_SALT` — pepper/HMAC sobre datos persistidos

| Consumidor | Referencia | Efecto de la rotación |
| --- | --- | --- |
| Huella irreversible del IP (Ley 1581) de sesiones cívicas | `backend/app/modules/sesion/security.py:37` (`calcular_huella_ip`) + `sesion/service.py:29`; filas en BD | Filas históricas dejan de ser comparables con huellas nuevas del mismo IP |
| Códigos de recuperación MFA | `backend/app/modules/identidad/mfa.py` (`hashear_codigo_recuperacion(c, salt)`; usos en `identidad/service.py:764, 818, 873`) | **Se rompen funcionalmente**: los hashes guardados no vuelven a verificar; los códigos quedan inservibles hasta regeneración |
| Acreditación MFA por sesión | `backend/app/modules/identidad/mfa.py:31-37` (`acreditacion_sesion_mfa` con el salt en el contenido), comparada en operaciones sensibles | Las acreditaciones vigentes dejan de validar; los usuarios con MFA fotografiado deben volver a acreditar con OTP |
| Límites de acceso (rate-limit por IP y por cuenta) | tabla `autenticacion.limites_acceso`, clave `HMAC(salt, 'accion:tipo:valor')` | Contadores previos quedan huérfanos = **reinicialización indirecta del antifuerza bruta** (ventana de riesgo puntual tras el corte) |
| Pepper de tokens de un solo uso (registro, verificación, delegación) | `identidad/service.py:277, 923` | Vida corta: sin impacto material si el corte evita solicitudes en vuelo |

### 2.3 Guardas existentes que apoyan la rotación

`backend/app/modules/identidad/security.py:18-19` rechaza en arranque los valores
predeterminados (`polis_salt_habeas_data_2026`, prefijo `cambiar_`), y la
reauditoría E1 pedía precisamente esta rotación gestionada fuera del repositorio.
Los nuevos valores via `secrets.token_hex(32)` cumplen todas las guardas.

---

## 3. Impacto funcional (lo que verían los usuarios)

1. **Sesiones institucionales**: los JWT en circulación pasan a `401` ("firma digital o token inválido"). El usuario rehace login; la fila `sesiones` queda huérfana (`activa=true` sin token vivo). Sin pérdida de datos; conviene acreditar que el frontend maneja el 401 global con redirección limpia a login.
2. **Sesiones anónimas cívicas en curso** (visita, radicado en borrador): el token muere y se emite una nueva sesión con un clic; el borrador ligado a la fila de sesión anterior queda sin sesión viva (hoy el flujo obliga a una fila nueva — verificar en pruebas E2E si algún estado de borrador queda bloqueado al cambiar de sesión).
3. **Enlaces en vuelo**: cualquier correo de verificación / recuperación / magic-link enviado antes del corte deja de funcionar; el destinatario debe volver a pedir el enlace. Comunicación previa, especialmente a facilitadores de mesa con pendientes dentro de término legal.
4. **MFA** (punto más delicado): (a) las acreditaciones vigentes se invalidan — recost de re-acreditación con OTP en la siguiente operación sensible; (b) los **códigos de recuperación guardados mueren de inmediato** — un usuario que pierda acceso ese día no podrá recuperarse vía códigos salvo regeneración administrativa auditada. Antes del corte: inventariar usuarios con MFA activo, habilitar/verificar el flujo de regeneración de códigos con auditoría y avisar a ese grupo.
5. **Rate-limit**: con huellas nuevas dominan contadores frescos; los bloqueos activos por fuerza bruta se desactivan suavemente. Considerar la ventana de bajo tráfico y el estado del endpoint público anónimo (el más expuesto por IP).

Ninguno de estos impactos implicó pérdida de datos ni cambio de comportamiento legal: el comprobante inmediato, las plantillas y las reglas de radicado no dependen de ninguno de los dos secretos.

---

## 4. Impacto forense (el problema de fondo)

La huella del IP es `HMAC-SHA256(salt, ip)` almacenada. Al rotar:

- `huella_nueva(ip) ≠ huella_vieja(ip)` **por construcción**. Es exactamente lo
  que la seudonimización busca: no se puede re-identificar ni enlazar IPs
  históricas con los registros posteriores al corte.
- **Consecuencia positiva (privacidad)**: si el salt actual o el respaldo hubiese
  sido filtrado (canal análogo al de la credencial de BD expuesta), la rotación
  destruye de inmediato la utilidad del salt filtrado para hash futuro — el
  secreto nuevo parte limpio. El valor histórico no se re-identifica.
- **Consecuencia negativa (auditoría)**: análisis longitudinales por IP
  (identificación de actores reincidentes, radialicación duplicada, uso de
  sesiones anónimas para misma persona) quedan divididos en dos poblaciones
  incomparables en el instante del corte. Esto ya está prescrito en
  `docs/plan-consolidacion-git.md` (paso 2, "renueva la semilla de
  anonimización") — el costo no es nuevo, es el previsto.

### Opciones de continuidad forense (decisión de producto)

| Opción | Diseño | Continuidad forense | Costo / riesgo |
| --- | --- | --- | --- |
| **A — corte absoluto** (coherente con `docs/rotacion-secretos.md`) | Solo salt nuevo, sin compatibilidad | Atravesar el corte es imposible, por diseño | Cero código nuevo; se documenta el corte como límite del dictamen operativo |
| **B — salt de continuidad solo-verificación** | `POLIS_IP_SALT` nuevo para todo hash nuevo; variable adicional (p. ej. `POLIS_IP_SALT_ANTERIOR`) usada **solo** para re-derivar y reconocer filas históricas en consultas forenses | Puente de lectura continua hacia atrás | Cambio de código en 2–3 puntos + pruebas; mantiene el "material para enlazar" en el servidor, por lo que la amenaza de re-identificación subsiste con acceso al archivo del servidor |
| **C — versión de sal en esquema** | Columna `salt_version` en las tablas de huella; cada hash nuevo declara su versión; la versión vigente rota y las anteriores quedan solo-lectura | Continuidad estructurada por versión | Migración de esquema + lógica multiversión; la solución honesta a largo plazo, pero merece encargo propio con pruebas y dictamen EAF |

**Recomendación técnica: A ahora, C a futuro.** A es la ruta ya prescrita sin nueva
superficie de riesgo. B reduce el beneficio de la rotación (el salt viejo sigue
operativo para enlazar) y C es la correcta pero no debe añadirse ad-hoc en la misma
ventana.

---

## 5. Plan operativo tentativo (no ejecutado)

1. **Preparación (d-1)**: aprobación de producto de la opción (§6.1); inventario de usuarios con MFA activo y verificación del flujo de regeneración de códigos de recuperación con registro de auditoría; avisos a usuarios institucionales (re-login) y a quienes tengan enlaces en vuelo; fijar ventana de bajo tráfico lejos de las 07:00 Bogotá (disparo del resumen diario).
2. **Pre-rotación**: respaldo del `.env` (0600, patrón ya probado en la rotación de BD); guion de simulación en base exclusiva `polis_test*` que acredite: login rehecho, sesión anónima regenerada, acreditación MFA con OTP, regeneración de códigos de recuperación, límites recalculados con la clave nueva.
3. **Ejecución (única ventana)**: generar ambos secretos con `secrets.token_hex(32)` **en memoria** (mismo enfoque silencioso de la rotación de BD: nada impreso en terminal ni logs); escribir `.env` atómicamente con 0600; `systemctl restart polis-backend.service`; verificar `/health/live`, `/health/herald` y corrida del monitor `--check`.
4. **Verificación real en producción**: login de prueba de una cuenta administrativa; emisión de sesión anónima nueva (propósito: confirmar huella con salt nuevo); un enlace de verificación/recuperación **nuevo**, enviado y consumido; consulta solo-lectura de una fila huérfana histórica para dejar evidencia del corte (sin efecto funcional); `verificar_configuracion_smtp.py` para confirmar guardas de configuración.
5. **Post**: registro del corte y resultado del despliegue en el dictamen operativo; notificación al EAF independiente del Encargo 275 si el alcance lo comprende.

**Rollback**: restaurar el `.env.bak` anterior y reiniciar (los tokens firmados con la clave nueva vuelven a morir; es una operación de ventana completa, no incremental). `polis-herald.resumen` y `polis-herald` no firman JWT ni huellan IP con salt en su ciclo — sin efecto. `bd_csh` no requiere ninguna migración en la opción A.

---

## 6. Decisiones que la EDD no toma (producto)

1. **Opción de continuidad forense**: A (recomendado), B o C (§4).
2. **Ventana**: fecha y hora de bajo tráfico; congelar o no nuevos radicados durante el reinicio (~1–2 min de rollback y parada de API).
3. **Comunicación**: aviso previo vs. aviso en caliente del forzado global de re-login; alcance de la comunicación MFA.
4. **Códigos de recuperación MFA**: regeneración preventiva obligatoria antes de la ventana (encargo EDD → EAF dictamen) o aceptación del riesgo puntual durante la ventana.

---

*Análisis con lectura de código del HEAD `64e818f`. Ningún secreto fue generado, impreso ni rotado a la fecha. `scripts/rotar_secretos_produccion.py` sigue siendo la herramienta oficiosa prevista; en caso de aprobarse se reutilizará el mismo enfoque silencioso ya probado en la rotación de la credencial de BD.*

---

## 7. Decisión adoptada (2026-11-03)

**Opción A — corte absoluto.** Se descartan B y C para esta rotación:
- **B** mantiene el salt viejo válido para enlazar, lo que neutraliza justo el beneficio de la rotación y deja vivo el riesgo de re-identificación si el material se filtra.
- **C** es la solución correcta a largo plazo, pero requiere migración de esquema y su propio encargo con pruebas y dictamen EAF; no debe colarse en una ventana de emergencia.
- La opción A es la ya prescrita por `docs/rotacion-secretos.md` y `docs/plan-consolidacion-git.md` (paso 2), no añade superficie de código y deja el corte documentado como límite explícito. El dictamen EAF independiente del 275 (H275-05) tampoco exige una rotación nueva sin evidencia de exposición actual: pide retirar los literales históricos (en curso) y decidir el tratamiento del historial con coordinación.

**Ventana: jueves 2026-11-05, 03:00 UTC (22:00 Bogotá del miércoles 4), condicionada.**

La ventana queda **bloqueada hasta cumplir tres condiciones** (no se ejecuta en automático):
1. **Reinspección EAF del 275 cerrada** ✅ **CUMPLIDA (2026-11-03):** el dictamen final de Codex EAF es **APROBADO** (`bridge/275_cierre_eaf_codex_20261103/cierre_final.md`, §9): H275-01 cerrado con sus tres residuales (R1.1–R1.3) y conservados los cierres de H275-02 a H275-05. El dictamen aclaró que no se trata de autorización de despliegue ni de plataforma verde; eso corresponde a la decisión de producto de esta ventana.
2. **Inventario MFA + flujo de regeneración de códigos de recuperación** verificado y auditado (§3.4): sin esto el corte de `POLIS_IP_SALT` inutiliza códigos de recuperación vigentes. ✅ **CUMPLIDA (2026-11-04, ver §7.2).**
3. **Ningún despliegue del 275 en la misma ventana** (evitar mezclar evidencia de un reinicio con un cambio funcional pendiente de dictamen). ⏳ Abierta: coordinar con agy2/codex/ollamacodex que ninguna entrega despliegue el 2026-11-05 en esa franja.

Sin las tres condiciones, la ejecución se pospone manteniendo la opción A ya decidida. El rollback (§5) es restaurar el `.env.bak` y reiniciar.

**Consecuencia documentada:** el corte de huellas IP queda registrado como límite del dictamen operativo (dos poblaciones no comparables antes/después), y los usuarios institucionales y anónimos deberán renovar sesión una sola vez.

### 7.1. Confirmación operativa (2026-11-03)

Confirmado por el responsable de producto en la decisión del día:
- **Ventana confirmada:** jueves **2026-11-05, 03:00 UTC** (22:00 Bogotá del miércoles 4), sujeta a las condiciones 2 y 3 de arriba.
- **Regeneración preventiva de códigos de recuperación MFA: OBLIGATORIA antes del corte** (§3.4 / §6.4): se ejecutará el inventario de usuarios con MFA activo y la verificación del flujo auditado de regeneración como prerrequisito de la ventana, no como aceptación de riesgo.

### 7.2. Cumplimiento de la condición 2 (2026-11-04)

**Flujo verificado.** El endpoint ya existe y es auditado desde la entrega CIERRE-06: `POST /api/v1/identidad/mfa/recuperacion/regenerar` (`backend/app/modules/identidad/router.py:428`), exige usuario autenticado y un código TOTP vigente con antirreplay RFC 6238 §5.2; el servicio (`backend/app/modules/identidad/service.py:803`) regenera 8 códigos, re-hashea con el salt vigente y escribe el evento de auditoría `mfa_codigos_regenerados` en `autenticacion.eventos_identidad` dentro de la misma transacción. El consumo de un código ya escribe `mfa_codigo_recuperacion_usado`.

**Prueba con base exclusiva.** Se creó y migró `polis_test_mfa_20261105` (cabeza 0094) y se ejecutó `backend/tests/test_cierre06_mfa_totp.py` con `POLIS_TEST_DATABASE_URL`: **5 aprobadas / 0 fallidas**, incluido el flujo completo con BD (activar → usar código de recuperación → regenerar → desactivar). La base de prueba retiene la evidencia: en `autenticacion.eventos_identidad` quedaron escritos `mfa_activado` (1), `mfa_codigo_recuperacion_usado` (1), `mfa_codigos_regenerados` (1) y `mfa_desactivado` (1) — la auditoría de la regeneración es durable y sobrevive al commit.

**Inventario de producción (solo lectura, bd_csh).**

| Métrica | Valor |
| --- | --- |
| Factores `usuarios_mfa` con `activo=true` | **0** |
| Factores iniciados que nunca se activaron | 1 (sin códigos vigentes que cuidar) |
| Usuarios activos en total | 44 |
| Regeneraciones auditadas históricas | 0 |

**Conclusión:** no hay códigos de recuperación vigentes en producción que el corte del salt pueda inutilizar; el flujo para los usuarios que activen MFA antes de la ventana queda disponible, probado y con su evento de auditoría verificado de extremo a extremo. Aun así, para la ventana se declara el protocolo operativo: si entre hoy y la ejecución alguien activa MFA, avisar a ese usuario para que regenere códigos justo antes del corte, con verificación post-corte del evento en `eventos_identidad`. Esto se re-chequea en el preflight del guion (§8).

Resta para poder girar la ventana: el punto 3 (coordenadas de ventanas con los demás equipos de trabajo), más la vista de producto del reinicio único (~1–2 min de API).

---

## 8. Guion de ejecución y rollback (2026-11-05, 03:00 UTC)

**Preflight (h-2, ~02:00 UTC, sin tocar nada).** En el host:
1. Re-chequeo del inventario: la consulta del §7.2 sobre `bd_csh`; si aparece algún `activo=true`, activar protocolo de regeneración antes del corte.
2. Confirmar ventana despejada: sin despliegues propios ni ajenos en curso (coordenadas pactadas con agy2/codex/ollamacodex) y sin trabajos programados del respaldo en esa franja (revisar `scripts/respaldo_*.sh` en cron).
3. Estado de servicios: confirmar que `polis-backend.service` está `active` y el `Result` del último oneshot de herald es OK.
4. Respaldo atómico del `.env` actual: `cp --preserve=000 backend/.env backend/.env.bak_pre_rotacion_jwt_$(date -u +%Y%m%d_%H%M%S)` con `chmod 0600` verificado en ambos.
5. Generar en memoria, sin imprimir en terminal ni logs: `VALOR_JWT=$(python3 -c 'import secrets; print(secrets.token_hex(32))')` y `VALOR_SALT=$(python3 -c 'import secrets; print(secrets.token_hex(32))')`.

**Ejecución (03:00 UTC, ~2 min de ventana).**
6. Barrido previo de sesiones largas: registrar hora de corte para el aviso de re-login forzado.
7. Reemplazo de los dos valores en `backend/.env`: sustituir las líneas `POLIS_JWT_SECRET_KEY` y `POLIS_IP_SALT` con los nuevos valores — nunca ejecutar `echo` de los secretos (los imprime en journald/shell history); escribir con `sed -i` sobre el archivo ya respaldado o, preferible, regenerar el archivo en un `tmp` con `umask 077` y `mv` atómico en su lugar. Verificar permisos 0600 del resultado.
8. `systemctl restart polis-backend.service` — reinicio único que carga ambos secretos. Verificar: `systemctl show -p ActiveState -p Result polis-backend.service`.
9. Espera y observación: `/health/live` HTTP 200 y `GET /health/herald` → `saludable` en < 60 s.
10. Corrida del monitor `scripts/monitor_sistema_polis.sh --check` — debe salir exit 0 ("Todos OK") por la ruta nueva.

**Post-verificación (03:05–03:30 UTC).**
11. **Login institucional:** con una cuenta administrativa — tiene que rehacer login (el token viejo responde 401) y el nuevo token tiene que pasar todas las rutas habitualmente usadas.
12. **Sesión anónima cívica:** emitir un token nuevo (mutación de sesión anónima por API), confirmar que la fila nueva en `sesiones` tiene huella con el salt nuevo (distinta de cualquier huella histórica).
13. **Enlace fuera de banda nuevo:** solicitar y consumir, con cuenta de prueba, un enlace de verificación de correo / recuperación; otro emitido antes del corte debe responder 401/inválido.
14. **MFA:** si hay algún usuario con MFA activo (preflight lo diría), ejecutar regeneración verificada y confirmar el evento en `eventos_identidad`.
15. **Rate-limits:** un par de hits del endpoint público anónimo para confirmar que los contadores con la clave nueva no pierden; revisar 403 esperados y cero error 500.
16. **Registro del corte:** archivo de ejecución en `bridge/293_ejecucion_rotacion_jwt_ip_salt/` con los resultados de 1–15, con líneas de tiempo (timestamps) y hashes del snapshot de código; examen general de salud de las otras unidades (herald, respaldo) sin conexión a `bd_csh`.

**Rollback (si algo falla en 8–15).**
- Restaurar: `cp backend/.env.bak_pre_rotacion_jwt_<timestamp> backend/.env` (mantener permisos 0600) y `systemctl restart polis-backend.service`.
- Verificar de nuevo 8–10 (health, monitor).
- Los tokens emitidos en la ventana con la clave nueva mueren al restaurar; comunicar el nuevo re-login o esperar que cada quien se re-loginee la próxima sesión.
- Registrar la hora y motivo del rollback en el archivo de ejecución (§8.16).


