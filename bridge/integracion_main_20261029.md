# Integración local en main — 29 de octubre de 2026

Solicitud del usuario: «todo al main por favor».

## Alcance

Se consolidan el código, las migraciones, las pruebas existentes, la configuración
de ejemplo, las herramientas y la documentación pendientes de los agentes,
incluidas las vistas Lista/Tarjetas y los accesos a adjuntos de Proyectos.
La rama de trabajo partía de dos commits posteriores a `main`; ambos se conservan
en la integración.

Los bancos de datos masivos, cachés nuevas, copias de entornos de prueba y capturas
locales se conservan en el servidor. Las credenciales OAuth y los archivos que los
usuarios subieron a actividades permanecen en almacenamiento local y están
protegidos por `.gitignore`. El inventario local completo de exclusiones y el
respaldo del índice están en `backups/integracion-main-*/`.

## Ajustes de integración

- Formato Ruff en la migración 0088 y el servicio de Proyectos, sin cambios de lógica.
- La guía de restauración solicita la contraseña mediante `pg_restore --password`.
- Exclusión explícita de `google_credentials.json` y de los adjuntos de actividades.
- Revisión de patrones de credenciales: las coincidencias restantes corresponden
  a datos de prueba existentes.

## Validación

- `bun run check`: correcto (kit UI, TypeScript y ESLint).
- `ruff check backend`: correcto.
- `ruff format --check backend`: 559 archivos conformes.
- `alembic heads`: una cabeza, `0090_anexos_actividades`.
- Las compilaciones de Next y Storybook de las dos entregas de interfaz previas
  finalizaron correctamente y están documentadas en sus entregables.

Esta operación integra trabajo existente; no ejecuta nuevas suites de pruebas
ni acredita un dictamen independiente sobre todos los cambios acumulados.

## Operación Git

Se crea un respaldo de la referencia anterior. La consolidación se confirma en la
rama de trabajo y `main` avanza hasta ese mismo commit, conservando su ascendencia.
El cambio de rama se hace entre referencias al mismo árbol para mantener los
archivos de la aplicación durante la integración.

La integración solicitada es local. El push y el despliegue permanecen como
operaciones posteriores. El hash definitivo se comunica al usuario al terminar.
