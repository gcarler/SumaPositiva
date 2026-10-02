# Evidencia EDD — URLs públicas de formularios, 2026-10-02

Evidencia de implementación y revisión preventiva; dictamen independiente del EAF
pendiente. No se crean cuentas o respuestas de prueba en producción.

## Resultados del alcance

| Comprobación | Resultado | Archivo |
| --- | --- | --- |
| `bun run check` | UI, TypeScript y ESLint aprobados | `check.log` |
| `bun run build` | Aprobado; `/f/[slug]` SSG y cuatro páginas publicadas | `build.log` |
| `bun run storybook:build` | Aprobado | `storybook-build.log` |
| Vitest, proyectos formularios y plataforma | 71 pruebas aprobadas, cinco archivos | `dominio.log` |
| Historias de formularios públicos, formularios y plataforma interna | 41 aprobadas | `historias-alcance.log` |
| Backend: formularios, permisos y transacciones | 107 aprobadas | `backend-final.log` |
| Migraciones, formularios y transacciones en base vacía | 86 aprobadas; upgrade/check/downgrade base/reconstrucción | `backend-alcance.log` |
| Ruff y formato de módulo/migración/tests propios | Aprobados | `ruff-final.log`, `ruff-format-final.log` |
| Navegador: crear, compartir, responder sin cuenta, recargar y exportar GeoJSON | Aprobado, sin errores JavaScript; 320 px sin desbordamiento | `browser-resultados.json`, `publico-320.png` |
| Navegador: borrador, vista previa autorizada, publicar, renombrar y cerrar | Aprobado; invalidación Next 401/403/200 | `estados-resultados.json` |
| Migración del servidor | `0030_url_formularios`; dos registros conservados; sin slug nulo; unicidad presente | `migracion-produccion-resultados.json` |

Backend: base exclusiva `polis_test_urls_migracion_20261002` en PostgreSQL/PostGIS
local, puerto 55439. E2E: API 8084 sobre `polis_test_urls_formularios_20261002` y
Next 3104, copia aislada de standalone; las peticiones del navegador se encaminan
a esa API. Las credenciales de QA permanecen fuera del repositorio. Los logs de
fallos globales tienen los Bearer/JWT redactados. El job CI usa PostGIS 16 y la
base exclusiva `polis_test_frontend`; se validó el YAML, no se ejecutó GitHub Actions.

Se reiniciaron `polis-backend.service` y `polis-frontend.service`. Verificación en
`http://127.0.0.1:3000`:

| Ruta | HTTP |
| --- | --- |
| `/f/diagnostico-barrio-2026` | 200 |
| `/f/priorizacion-dimensiones-2026` | 200 |
| `/f/no-existe` | 404 |
| `/og-image.png` | 200 |

Los dos primeros son ejemplos expresamente identificados como demostración. La
persistencia de un formulario nuevo, su respuesta y punto geográfico se comprobó
con sesiones y navegadores independientes sobre la base de pruebas.

La excepción Nginx para la invalidación Next pasó `nginx -t` y se recargó. El
dominio por HTTP devuelve 401 para ese endpoint sin JWT. El fragmento aplicado
está en `nginx-formularios-cache.conf`; la comprobación en `proxy-produccion.log`.

**Pendiente operativo de HTTPS:** el dominio presenta un certificado autofirmado.
La verificación pública de TLS falla con `curl` error 60. HTTP devuelve 200, pero
no se acredita la difusión funcional de la URL HTTPS canónica ni la descarga de
OpenGraph por WhatsApp hasta instalar un certificado público válido. Se solicitó
la ubicación o gestión del certificado existente; no se desactivó la verificación.

## Observaciones fuera del módulo

- `bun run backend:check` se detiene en 45 errores Ruff de otros archivos; el
  módulo modificado y sus pruebas pasan Ruff. No se rebajó la guarda.
- La ejecución global de pytest produjo 232 aprobadas y dos fallos fuera de
  Formularios: rollback de fotografía de Mesas (ValueError propagado) y downgrade
  de Identidad bloqueado por administradores creados durante otras pruebas.
  No constituye una aprobación de toda la suite backend.
- La última suite completa de UI produjo 189 aprobadas y un fallo en
  `TerritoriosConTeclado`; la repetición de las 24 historias del portal confirma
  ese fallo. No encuentra los botones territoriales esperados del geovisor.
  No se deshabilitó la historia ni axe. Las 41 historias del alcance pasan.
- `alembic check` sobre el servidor señala diferencias de esquema en Mesas y
  Fotografías; no señala diferencias en Formularios. No se eliminaron columnas
  del servidor para ocultar este resultado. En la base reconstruida, el check
  completo sí pasa (`backend-alcance.log`).

Los resultados anteriores registran comandos realmente ejecutados. El alcance
no acredita WCAG integral, firma legal de consentimiento, antivirus, identidad
individual por respuesta, sincronización de puntos con el geovisor ni almacenamiento
de archivos en MinIO/S3. Véase `docs/formularios-publicos.md`.
