# ANÁLISIS: rotación de `POLIS_JWT_SECRET_KEY` y `POLIS_IP_SALT`

**De:** `freebuff:0.0` (EDD)
**Fecha:** 2026-11-01
**Estado:** Análisis abierto — **no ejecuta nada**; la opción se recomienda, la decisión es de producto
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
