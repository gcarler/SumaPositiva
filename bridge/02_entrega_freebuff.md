# Entrega — Geovisor: mesas persistidas y gráficas bidireccionales

Fecha: 2026-10-01

## Alcance trabajado

- Cuatro gráficas SVG en `GeovisorCharts`: radar derivado de siete dimensiones, ranking territorial, tendencia referencial de alertas y donut de población por localidad.
- Gráficas y mapa reciben `territorioId`/`variableMapa` compartidos desde la vista. Las barras y segmentos cambian territorio; los vértices radar cambian variable. El donut permite la navegación de teclado y respeta movimiento reducido.
- Las cifras del radar, población y alertas se identifican como derivadas/referenciales: no son mediciones oficiales ni datos persistidos.
- Integración de lectura persistida de mesas desde `/api/v1/mesas/geovisor`, con validación de forma del payload, fecha/hora, asistentes, estado y fotos aprobadas.
- Marcadores sobre centroides oficiales de territorio (si existe `territorio_id` relacionado en BD), con etiqueta inequívoca de punto de referencia, no ubicación exacta del evento. No se fabrican polígonos barriales ni relaciones UUID/localidad.
- Realización basada en cierre de acta (`ACTA_CONCERTADA`/`FINALIZADA`); leyenda textual verde “Realizada” / ámbar “No realizada”. Se muestran fecha, horario registrado, asistencia y fotos solo aprobadas.
- Fotos sanitizadas (EXIF/GPS), vinculadas a la mesa y pendientes hasta moderación institucional. Carga requiere permiso institucional y declaración de autorización. Los archivos de mesa pendientes no se sirven por las rutas públicas existentes.

## Persistencia y permisos

- Migración `0026_fotos_mes_vigilancia`: relación con Mesa y Evidencia, autorización, estados y restricciones de revisión.
- Migración `0027_permisos_fotos_mesa`: permiso `mesas:fotos:subir` para autoridad distrital y facilitador de mesa.
- Revisión de fotos con permiso existente `testimonios:moderar`; cola y archivo de revisión institucional.
- Caso de uso de carga guarda bytes sanitizados, fila de evidencia y asociación de mesa dentro de una sola transacción SQL; limpia el archivo si el límite falla.
- El endpoint público de evidencias oculta metadatos y archivos pendientes de fotos de mesa. Sólo las fotos aprobadas aparecen en el geovisor.
- La matriz `docs/permisos-api.md` está extendida y la prueba de inventario exige autorización/documentación exactas.

## Verificaciones

- `bun run check`: aprobado después de los cambios de UI existentes en este workspace.
- `bun run storybook:build`: aprobado.
- Pruebas focalizadas de gráficas: `bun run ui:test -- src/app/_stories/geovisor-charts.stories.tsx` — 3 aprobadas.
- Una ejecución inicial de toda la suite de historias mostró 169 aprobadas y fallas externas/incompatibles del mismo workspace: 3 en historia de gráficas (el nested-interactive del SVG fue corregido y la historia focal aprobó después), y `Select En Panel Apilado` falló al buscar rol button cuando el control ahora es enlace. No se modificó la historia de identidad ajena.
- `bun run check` arrojó inicialmente errores existentes en panel-host, mapa-territorios-api y configuración del login OAuth. Cambios paralelos posteriores de otros autores hicieron que la última ejecución de check pasara. El workspace contiene numerosas modificaciones simultáneas no atribuibles a esta entrega.
- Aún no ejecutadas: `bun run build`, backend Ruff/pytest, `alembic check`, upgrade/downgrade/reconstrucción, prueba aislada transaccional/integración. No se declara validación completa de persistencia.

## Límites y pendientes

- El área de moderación de fotos tiene API protegida; el panel de cola institucional con vista previa y acciones aprobar/rechazar no se incorporó todavía al frontend.
- El endpoint geovisor de mesas está en todas las mesas con vínculo territorial, y sólo fotos aprobadas; aquellos registros sin territorio se listan pero no reciben marcador.
- Las estadísticas históricas del geovisor siguen siendo datos estáticos existentes, separadas de las mesas persistidas.
- El build de aplicación y pruebas backend deben correrse sobre el estado final, con `POLIS_TEST_DATABASE_URL` que empiece por `polis_test`; no se usó base de desarrollo.
- No reinicié servicios, no hice deploy, no escribí fuera del workspace y no ejecuté commit; hay modificaciones concurrentes ajenas.
