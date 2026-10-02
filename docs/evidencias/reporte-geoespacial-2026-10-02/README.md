# Evidencia de EDD — reporte geoespacial y persistencia

2026-10-02. Validación técnica de implementación; EAF/agy independiente pendiente.

- `bun run check`: aprobado en repositorio compartido, sin errores TypeScript ni ui-policy.
- `bun run build`: aprobado; SSG incluye `/f/reporte-inseguridad` y dos formularios reales previos; no genera páginas de ejemplos.
- `bun run storybook:build`: aprobado.
- Vitest dominio/sesión: 83 pruebas aprobadas, incluye fallos de persistencia sin respaldo en memoria y 401 anónimo que conserva la cuenta institucional.
- Backend: 33 pruebas aprobadas de formularios, URLs y reporte. Migraciones y URLs: 26 aprobadas, con upgrade, check, downgrade base y reconstrucción en `polis_test_reporte_20261002`. API y navegador de QA apuntan exclusivamente a esa base aislada.
- Rollback: fallo controlado después de `guardar_respuesta`/flush devuelve 503; otra conexión observa exactamente los registros anteriores.
- Navegador real contra build aislado y API de pruebas: siete dimensiones con una sola subcategoría visible, mapa, arrastre que actualiza coordenadas sin perder fotos, carga 3+2, ocultación a cinco, eliminar y reemplazar, confirmación 201, reflujo 320 px y capturas claro/oscuro. Otra conexión confirma coordenadas y cinco fotos; la respuesta de QA se elimina solo de polis_test.
- Fotos: rechazo en API de seis fotos, base64 corrupto, blob URL y SVG, sin escritura. Historia `FotosLimite` ejercita carga, límite, eliminación y reemplazo.
- Suite UI completa del repositorio compartido: 193/194 aprobadas. Falló `Plataforma/Administración interna > Usuarios`, componente e historia modificados por otra entrega concurrente. Las historias de formularios y reporte pasaron. No se rebajaron guardas ni accesibilidad.
- `bun run backend:check`: bloqueado por 45 errores Ruff preexistentes fuera del alcance (mismo resultado de la entrega de URLs). Ruff del módulo formularios, migración 0031 y nuevas pruebas: aprobado. La suite de backend focalizada se ejecutó separadamente.
- Warning CSS preexistente del selector de gráficos `stroke='#fff'` durante build; compilación exitosa.

Producción: migración 0031 aplicada; backend/frontend reiniciados. Nginx configurado y validado para aceptar hasta 40 MB únicamente en formularios. `curl` HTTPS, sin desactivar TLS:

| Verificación | Resultado |
|---|---|
| `/f/reporte-inseguridad` | 200 |
| `/f/diagnostico-barrio-2026` (antiguo ejemplo, sin registro) | 404 |
| `/f/no-existe` | 404 |
| GET respuestas del reporte, sin token | 401 |
| POST respuestas, JSON 2 MB sin token | 401; supera el antiguo límite de proxy sin escribir |

No se enviaron respuestas de prueba a producción. No se implementó una capa de reportes en los geovisores ni un flujo de aprobación: propuesta y criterios en `docs/reportes-revision-publicacion.md`.
