# Evidencia EDD: formularios geográficos

Resultados y alcance en `resumen.json`; entrega en `bridge/02_entrega_codex.md`.
Los logs finales incluyen checks, compilaciones, 182 historias, 69 pruebas de
dominio, 89 de integración de identidad/formularios/acceso, 27 de transacciones
y la reconstrucción de migraciones. La imagen corresponde a datos sintéticos.

`browser-verificacion.mjs` requiere Playwright, una instancia de pruebas FastAPI
local en 8083, una cuenta de administrador creada únicamente en una base
`polis_test*` y su archivo temporal `/tmp/polis-forms-admin-qa/cuenta.json`.
**No se incluye ese archivo ni se usan credenciales de producción.** El script
intercepta todas las peticiones API hacia el backend de prueba; el destino del
frontend se selecciona con `POLIS_E2E_FRONTEND_URL`. La comprobación pública usó
`http://seguridadhumanaintegral.org`. El texto «portal abre login» verifica el
parámetro `login=1`, que se consume al abrir el panel; las guardas de acceso se
verifican en las historias y pruebas de dominio.

`backend:check` global tiene 45 incumplimientos Ruff en otros archivos; las pruebas
backend indicadas se ejecutaron directamente. No se registra aprobación global
del backend ni certificación WCAG. El constructor continúa en RAM y el punto no
se integra automáticamente con el geovisor ni con la base de operación.
