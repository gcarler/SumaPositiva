---
name: polis-edd-transactions
description: Implementar o modificar persistencia del backend POLIS para EDD con transacciones atómicas por caso de uso. Aplicar al cambiar servicios, repositorios o escrituras; no a tareas exclusivas de frontend.
---

# EDD: persistencia transaccional

Lee `AGENTS.md`, `docs/arquitectura.md` y
[el contrato de transacciones](../../../docs/transacciones.md) desde la raíz de
POLIS antes de cambiar persistencia. Este contrato es obligatorio para los roles
backend, arquitecto y dba; ia y auditor lo aplican cuando su trabajo escribe datos.

Identifica las escrituras que deben tener éxito juntas. Delimita el caso de uso
en el servicio mediante `app.core.transactions.transaction`; los repositorios
usan `flush` y `refresh`, nunca `commit` o `rollback`. Compón repositorios, no
casos de uso transaccionales anidados. Incluye la validación de la respuesta en
el límite y documenta cualquier compensación de archivos o efectos externos.

Añade pruebas de persistencia observada desde otra sesión y de fallo posterior a
una escritura efectiva. Ejecuta las guardas y pruebas de transacciones, y
`bun run backend:check` con una base exclusiva `polis_test*`. Nunca uses la base
de trabajo como fallback. No rebajes checks. Conserva migraciones aplicadas;
los cambios de esquema se entregan en una revisión posterior. Si el usuario pide
reparar un bootstrap histórico que falla antes de llegar a esa revisión, limita
la reparación a ese bloqueo, documenta la razón y prueba ambas rutas.

Al cambiar migraciones, verifica `upgrade head`, `alembic check`, `downgrade base`
y reconstrucción con un segundo `upgrade head` en una base vacía `polis_test*`.
Prueba también una actualización con registros existentes. Registra todos los
modelos y esquemas mantenidos por la entrega en Alembic, incluidos índices,
restricciones y comentarios. Si hay entregas concurrentes, conserva una cabeza
única mediante una revisión de unión; no renumeres revisiones ya aplicadas.

Entrega para EAF el caso de uso, límite, tablas afectadas, pruebas de rollback,
comandos y resultados. Declara las limitaciones reales de validación; no emitas
una certificación por haber usado el helper. Conserva cambios ajenos.

Antes de entregar cambios de persistencia expuestos por API, aplicar
`docs/permisos-api.md`: mantener método/ruta, dependencia, permiso y condición
de recurso. Probar éxito autorizado y denegación sin token o sin permiso.
No conceder roles institucionales desde el registro público para preparar datos.
Registrar evidencia como revisión de EDD; EAF independiente emite su propio
dictamen limitado al alcance. Consultar `docs/operacion.md` para perfiles de
entorno; el servidor local no define rutas ni ajustes universales.


Para identidad, aplicar `docs/identidad.md`: sesión persistida y permisos vigentes,
registro solo ciudadano, delegación limitada, protección del último administrador,
revocación y enlaces con propósito/caducidad/uso único. Persistir la solicitud de
correo antes de entrega; probar el worker con transporte controlado, sin correo
real. Incluir hash de contraseña, sesiones, tokens y eventos en pruebas de rollback.
