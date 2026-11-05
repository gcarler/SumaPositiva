# Ensayo completo de rotación de secretos en laboratorio (AUD-11)

**Objetivo**: ejercitar íntegro el guion `scripts/rotar_secretos_produccion.py` sobre una base
(`polis_test_ensayo_rotacion_20261104`) y un servidor de laboratorio (`uvicorn` 127.0.0.1:8001,
`POLIS_ENVIRONMENT=development`) **antes de la ventana del 2026-11-05**, sin tocar producción.

**Resultado: ENSAYADO Y VÁLIDO. Ventana firmada como ensayada el 2026-11-04.**

## Alcance del ensayo

| Fase | Evidencia clave | Resultado |
| --- | --- | --- |
| Pre-rotación | live/ready 200; login gestión 200; sesión anónima 201 (huella `c4069e82…`) | ✓ |
| Enlace fuera de banda | solicitud 200; worker de identidad drena la cola; SMTP fideo captura el .eml; token completo extraído resolviendo el plegado de 78 columnas de `EmailMessage` | ✓ |
| Rotación | huella secretos `86216707e5cf7ab0…` → `9a3d74bdb9729fb5…`; respaldo 0600 del guion; `POLIS_DATABASE_URL` y URL pública intactas; reinicio del lab con secretos nuevos | ✓ |
| Post-rotación | token anterior → 401; login con contraseña reestablecida → 200 (`autoridad_distrital`) y `/sesion/verificar` 200; sesión anónima 201 con huella nueva `3ac5b31b…` (efecto de rotar `POLIS_IP_SALT`) | ✓ |
| Rollback | restauración del respaldo del guion; login 200; token emitido con secret nuevo → 401 tras restaurar (prueba simétrica de firma); huella anónima idéntica a la pre | ✓ |

## Hallazgos y notas del ensayo

1. **El enlace fuera de banda no se invalida con la rotación.** El consumo del enlace
   previo a la rotación respondió 200: el token se valida por `hash_token`
   (SHA-256 persistido en `autenticacion.tokens_accion`) y no se re-deriva con
   `POLIS_JWT_SECRET_KEY` al consumir. Es consistente con `docs/rotacion-secretos.md`
   (la rotación solo invalida tokens de sesión JWT); el enlace caduca por tiempo y uso único.
   Se deja como observación documentada, no como defecto del ensayo.
2. **El 401 del token anterior tras el rollback es una revocación, no un fallo de firma.**
   El restablecimiento de contraseña ejecutado en el ensayo revocó las sesiones
   (`revocar_sesiones`), política correcta. La validez de la firma restaurada se demostró
   con la prueba simétrica: el token emitido con el secret nuevo vuelve a 401 con el secret antiguo.
3. **El monitor de producción no se ejecutó completo.** `scripts/monitor_sistema_polis.sh`
   en modo `--cron` reinicia servicios systemd de producción; en el lab se ejercitó el mismo
   subset de señales que consume el watchdog (`live`, `ready`, `health/herald`, `health/system`).
4. **La guardia SMTP de identidad respondió como se diseñó** al inicio del ensayo
   (`503 "El servicio de correo aún no está configurado"`) y permitió montar el SMTP fideo
   con `POLIS_ENVIRONMENT=development` conservando la URL pública `https` fiel a producción.

## Separación de responsabilidades

Este ensayo del equipo de desarrollo es evidencia técnica del guion y su rollback. No es
dictamen EAF independiente ni autorización de despliegue: la ventana real del 2026-11-05
requiere su propia ejecución controlada sobre `backend/.env` y el
`systemctl restart polis-backend` documentado en el guion.

## Referencias de la carpeta

- `resumen.json` — estados completos pre/post/rollback con huellas.
- `/tmp/polis_ensayo_20261104/` (fuera del repo, 0600/0700) — respaldo preflight, `env_lab.sh`
  y su respaldo del guion, `.eml` capturado, logs del lab y del fideo.
