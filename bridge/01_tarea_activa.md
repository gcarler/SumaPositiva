# TAREA ACTIVA: [CIERRE-06c] y corrección del contrato [CIERRE-07]
**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción del plan vigentes. Ver `bridge/03_dictamen_revision.md`.

## 1) [CIERRE-06c] Alta del administrador adicional (PRIORITARIA — NO se ejecutó)
Crear una cuenta de administrador adicional, correo `gscarlosernesto@gmail.com`, rol `administrador_identidades`, SIN tocar la cuenta admin existente.
- Añade a `scripts/bootstrap_identidad_admin.py` el modo `--adicional` (hoy el script se detiene con "1 administradores activos"): crea un administrador nuevo por correo (idempotente por correo: no duplica ni cambia la contraseña de uno existente), con evento de auditoría y motivo obligatorio. Pruebas incluidas.
- Contraseña temporal aleatoria fuerte (≥20 caracteres) generada en el servidor; pásala por `POLIS_BOOTSTRAP_ADMIN_PASSWORD`; guárdala SOLO en `/root/credenciales_admin_gscarlosernesto.txt` con permisos `600`, fuera de `/root/polis`. Nunca en pantalla, logs, reportes ni commits. Informa solo la ruta.
- Respaldo previo (`scripts/respaldo_bd.sh`). Verifica el login de esa cuenta y que el perfil permita cambiar la contraseña y activar MFA (no completes el MFA: lo hace el propietario).

## 2) Corregir el contrato de CIERRE-07 (commit aparte)
Aplica las 4 correcciones del dictamen (eventos_identidad, roles reales, mapeo real mesa→territorio sin `upz`, tabla de endpoints derivada de `permisos-api.md`). Avísame; NO codifiques CIERRE-07 sin mi visto bueno final.
