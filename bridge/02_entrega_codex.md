# Entrega Codex — Reporte geoespacial y formularios persistentes

Fecha: 2026-10-02T04:22:10.855258+00:00
Commit de implementación: `b61ce3eacd2c31753e8424e875afa4f7a5290164`
Estado: IMPLEMENTADO Y VERIFICADO EN ALCANCE. Revisión independiente de EAF/agy pendiente.

## Resultado

- Los formularios de producto usan exclusivamente FastAPI/PostgreSQL: catálogo, páginas públicas, creación, edición, eliminación, envío y analítica. Zustand inicia vacío como caché; no hay confirmación local ni sustitución de fallos por mocks. Los ejemplos quedan exclusivamente en pruebas e historias. No se importaron respuestas ficticias a la base ni se borraron registros reales.
- Migración 0031 publica el instrumento institucional solicitado, id de negocio `reporte-ciudadano-geoespacial`, slug `reporte-inseguridad`, UUID persistido `4ecd649a-6764-4d62-8ddb-1bcecd342031`. Siete dimensiones, 53 subcategorías, frecuencia, descripción opcional, ubicación y localidad; seis preguntas visibles por dimensión.
- OpenLayers/OSM: selección y arrastre de punto, marcador por dimensión con token y símbolo, coordenadas editables, identificación de barrio/localidad por cartografía con alternativa manual.
- Hasta cinco fotos JPEG/PNG/WebP de 5 MB por foto; previews, eliminar y reemplazar, bloqueo de seis. Servidor valida contenido y tamaño. Ubicación y fotos se guardan realmente como objeto JSONB, no solo en RAM.
- Formulario anónimo incluso si el ciudadano tiene una cuenta interna abierta: el envío técnico anónimo conserva la sesión institucional. Un 401 de ese envío no cierra otra cuenta.
- Nginx acepta 40 MB solo en formularios, para cubrir base64; su configuración pasó `nginx -t` y se recargó. Next tiene el mismo límite de proxy.

## Recepción, revisores y publicación

Hay geovisor ciudadano en el portal y administrativo en `/plataforma/geovisor`. Las respuestas **no se publican automáticamente** en ninguno. Actualmente pueden leerlas los roles con `formularios:leer`: autoridad, facilitador, administrador y auditor. **No existe aún bandeja de moderación ni autorización individual de publicación**.

Se revisó y documentó el diseño: recibido interno → revisión por equipo designado → validado interno → publicación exclusiva del administrador → retiro si corresponde. Requiere permisos específicos, expediente/historial transaccional y proyección pública separada de coordenadas, fotos y narración originales. La capa de reportes en mapas sigue futura según el alcance de la tarea. Ver `docs/reportes-revision-publicacion.md`.

## Validación

- `bun run check`: aprobado, 0 errores TS y 0 violaciones UI. Warning previo de TanStack/React Compiler en geovisor.
- `bun run build`: aprobado; output SSG contiene `/f/reporte-inseguridad` y solo formularios realmente publicados en la base.
- `bun run storybook:build`: aprobado.
- Lógica, persistencia frontend y sesión: 83 pruebas aprobadas.
- Historias del alcance formularios: 35/35 aprobadas.
- Backend formularios/URLs/reporte: 33 pruebas aprobadas. Prueba de respuesta confirmada desde otra conexión y rollback completo tras fallo posterior al flush.
- Migraciones/URLs: 26 pruebas aprobadas, incluyendo upgrade, check, downgrade base y reconstrucción en base aislada `polis_test_reporte_20261002`.
- Navegador contra build y API aislados: 7 categorías condicionales, clic/arrastre, fotos 3+2, máximo 5, eliminar/reemplazar, envío 201, confirmación y 320 px claro/oscuro. Una conexión nueva confirmó coordenadas y cinco fotos. Respuesta QA eliminada de polis_test; no se enviaron respuestas de prueba a producción.
- Backend y frontend reiniciados y servicios activos.

HTTPS verificado sin omitir validación TLS:

| Ruta | Resultado |
|---|---|
| https://seguridadhumanaintegral.org/f/reporte-inseguridad | 200 |
| `/f/diagnostico-barrio-2026`, antiguo ejemplo sin registro | 404 |
| `/f/no-existe` | 404 |
| GET respuestas del reporte sin token | 401 |
| POST JSON 2 MB sin token | 401, sin escritura y sin antiguo bloqueo 413 del proxy |

## Observaciones de las suites generales

- `bun run ui:test`: 193/194 aprobadas; falló `Plataforma/Administración interna > Usuarios`, modificada por otra entrega concurrente. Las historias de formularios pasaron. No se deshabilitaron guardas ni axe.
- `bun run backend:check`: 45 errores Ruff preexistentes fuera del alcance; impiden llegar a pytest por ese comando. Ruff de formularios/migración/nuevas pruebas pasa y se ejecutó la regresión focalizada separadamente.
- El build mantiene un warning CSS previo del selector de gráficos `stroke='#fff'`; compiló correctamente.

Documentos: `docs/formularios-persistencia.md`, `docs/reportes-revision-publicacion.md`, `docs/permisos-api.md`.
Evidencia reproducible y capturas: `docs/evidencias/reporte-geoespacial-2026-10-02/`.
