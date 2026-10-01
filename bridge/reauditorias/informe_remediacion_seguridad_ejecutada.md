# Informe de remediación de seguridad ejecutada — H-01, H-02 y H-03

**Fecha:** 2026-10-01  
**Responsable:** Freebuff (GPT-6 Luna), ejecución EDD; no constituye certificación independiente EAF  
**Alcance:** cierre técnico de los hallazgos H-01 (registro y roles), H-02 (consultas `ltree`) y H-03 (integridad SHA-256 de actas), más verificación del hardening de artefactos de despliegue solicitado en la tarea de remediación.

## 1. Dictamen de ejecución

**CON_OBSERVACIONES — remediación de código verificada en pruebas; operación de despliegue no acreditada.** Las correcciones H-01, H-02 y H-03 están implementadas y la suite backend completa pasó en la base aislada solicitada. El dictamen conserva observaciones porque los archivos systemd/Nginx solo se revisaron estáticamente, no se validaron en el host ni se desplegaron; además, el digest SHA-256 es un mecanismo de detección de alteraciones, no una firma digital ni una prueba independiente de autoría. Este informe documenta ejecución propia y no reemplaza la revisión independiente del EAF.

## 2. Correcciones y evidencia

### H-01 — Registro público sin escalamiento de rol

- `UsuarioCreacion` no admite `codigo_rol` y configura `extra="forbid"`; el endpoint público rechaza el campo con HTTP 422.
- `IdentidadService.registrar_usuario()` asigna siempre el rol de servidor `ciudadano`. La asignación administrativa de roles permanece en el flujo separado y autorizado.
- El fixture `provisionar_usuario` conserva el argumento `codigo_rol` requerido por `test_control_acceso_rbac_y_denegacion_403`: registra primero por el endpoint público, comprueba respuesta y rol persistido `ciudadano`, y después promueve la cuenta directamente solo en la base aislada `polis_test*`. Así se prueba acceso de una autoridad sin habilitar autorregistro privilegiado.
- `test_registro_publico_no_concede_roles_institucionales` comprueba intentos de `facilitador_mesa`, `autoridad_distrital` y `auditor_forense`: 422, login 401 y cero filas persistidas para esos correos.

### H-02 — Consultas `ltree` parametrizadas

- `MesaRepository.listar()` y `buscar_descendientes()` emplean expresiones SQL fijas y parámetros enlazados (`:ancestro_ruta`, `:ruta_padre`) con conversión explícita a `ltree`; ningún valor de ruta se interpola en el SQL.
- `MesaService` valida rutas y etiquetas antes de consultar. Formatos maliciosos, etiquetas vacías, caracteres fuera de la gramática y rutas que exceden el máximo se rechazan con 422.
- Las pruebas cubren jerarquías válidas y entradas adversariales. Para la cadena de 65.536 caracteres se prueba el validador directamente: httpx limita la URL antes de que la petición alcance la aplicación.

### H-03 — Digest canónico y metadatos de cierre de acta

- El digest SHA-256 v2 se calcula sobre JSON canónico compacto, ordenado por claves, UTF-8 y normalizado a Unicode NFC (rechaza valores no finitos); incluye versión, IDs de acta y mesa, número, deliberación, acuerdos, disensos, compromisos, snapshot de participantes, quórum, identificador/nombre de firmante, estado y fecha UTC de cierre y metadatos de cierre.
- El snapshot de participantes se ordena de forma estable mediante el repositorio e incluye ID del participante, rol, asistencia y hora de ingreso; no duplica nombre, organización ni ID de usuario en los metadatos sellados.
- El caso de uso de cierre conserva una sola transacción del servicio: sella metadatos, estado, fecha y hash del acta, y refleja hash/estado/contador en la mesa. La prueba de integración de fallo confirma reversión completa.
- La verificación solo declara integridad válida para la versión v2 cuyo digest coincide. La migración `0021_integridad_pericial_acta` marca actas cerradas preexistentes como `polis-acta-v1-legacy` al añadir la columna; no reescribe el contenido histórico ni presenta sus hashes antiguos como v2 verificables.
- Las pruebas comprueban determinismo y mutaciones individuales de IDs, número, resumen, acuerdos, disensos, compromisos, participantes/asistencia/rol, quórum, firmante, fecha y metadatos.
- **Límite pericial:** SHA-256 no autentica por sí mismo quién produjo el acta, no es firma electrónica y no protege frente a un actor capaz de cambiar simultáneamente contenido y digest fuera de los controles de persistencia.

## 3. Hardening de artefactos de despliegue

Se verificaron estáticamente los cambios solicitados en `deploy/systemd/polis-backend.service`, `deploy/systemd/polis-frontend.service` y `deploy/nginx/polis.conf`: ejecución con usuario/grupo `polis`, directivas de aislamiento y límite de archivos del backend; cabeceras HTTP indicadas y reenvío explícito de cabeceras proxy en Nginx.

No se ejecutaron `systemd-analyze verify`, `nginx -t`, validaciones en el host, reinicios ni despliegues. No se confirmó que rutas de trabajo/archivos de entorno sean accesibles al usuario de servicio en el host. Por tanto, la evidencia no acredita operación efectiva.

## 4. Verificación ejecutada

Suite solicitada, dirigida únicamente a la base aislada cuyo nombre empieza por `polis_test`:

```text
POLIS_TEST_DATABASE_URL=<credencial omitida> /root/polis/backend/.venv/bin/pytest backend/tests/ -q
193 passed in 68.18s
```

También pasaron Ruff (`check` y `format --check`) sobre los archivos backend modificados o directamente involucrados. La suite incluye pruebas de integración de migraciones, actas, autorización, parametrización de rutas y límites transaccionales. El endpoint `command.check` de Alembic pasó dentro de las pruebas de integración.

La orden agregada `bun run backend:check` no terminó: se detuvo en `ruff check backend` por 35 hallazgos de lint distribuidos por el repositorio (imports, líneas extensas y otros), antes de ejecutar sus pasos posteriores. Los archivos alcanzados por esta remediación pasan las verificaciones Ruff dirigidas; la suite completa se ejecutó por separado y pasó. `git diff --check` también detectó espacios finales en archivos de frontend ajenos a este alcance presentes en el árbol de trabajo; no se modificaron para evitar interferir con otros agentes.

No se accedió ni escribió en `bd_csh`, no se interactuó con servicios productivos y no se imprimieron credenciales en este informe.

## 5. Resultado y pendientes

- **H-01:** remediado y cubierto por pruebas de rechazo público y RBAC con promoción de fixture aislada.
- **H-02:** remediado y cubierto por parámetros SQL y pruebas de rutas válidas/adversariales.
- **H-03:** remediado para actas v2, con metadatos de cierre y compatibilidad explícita para registros legacy.
- **Pruebas backend:** 193 aprobadas, 0 fallidas.
- **Despliegue:** hardening estático presente; validación en host y operación pendientes.
- **Certificación:** este es un resultado de ejecución EDD; no se declara dictamen independiente EAF ni certificación jurídica.
