# Evidencia de implementación de plataforma

Fecha: 2026-10-01. No constituye dictamen independiente EAF.

`navegador.json`: 42 casos sobre el servicio frontend reiniciado, API interceptada.
Axe WCAG 2.1 AA automatizado y reflujo 320/1440 en ambos temas; no certificación completa WCAG.
`identidad-real.json`: API FastAPI real del snapshot documentado y PostgreSQL temporal; sin correo real.
`google-frontend.json`: callback del SDK interceptado, ID token y redirección; no login Google en vivo.
`backend-identidad-actual.txt`: 38 pruebas sobre el árbol compartido actual, base exclusiva polis_test_plataforma.
`backend-snapshot.txt`: comprobación previa en snapshot; ver commit base en backend-snapshot-base.txt.
`servicios.json`: despliegue y limitación de readiness por migraciones pendientes.

Reproducción y alcance: [plataforma](../../plataforma.md). No se guardan credenciales reales ni tokens de producción.
