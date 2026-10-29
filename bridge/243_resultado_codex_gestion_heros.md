# Resultado 243 — Gestión de imágenes hero

**Fecha:** 27 de octubre de 2026.  
**Implementación:** Codex; revisión complementaria: Freebuff, encargo 247.  
**Estado:** implementación frontend terminada y validada; entrega local lista para revisión de coordinación.

## Funcionalidad implementada

- Biblioteca dinámica `imagenesCatalogo`, inicializada con las seis opciones oficiales, con disponibilidad individual `habilitada`.
- Alta de fotografías con título, descripción, enfoque, URL/ruta y miniatura opcional. Identificadores UUID, rechazo de duplicados y validación compartida entre formulario, acciones y rehidratación.
- Switch y badge de disponibilidad por tarjeta. Una fotografía deshabilitada permanece visible y atenuada en la biblioteca, con su asignación desactivada; se excluye de las imágenes renderizadas y navegables de la portada.
- Retiro con confirmación, tanto de fotografías oficiales como agregadas. Se corrigen referencias por identificador y por archivo en portada y páginas; se usa la imagen oficial habilitada, otra fotografía disponible o la retícula institucional si no quedan fotos.
- Restauración con confirmación de las seis opciones oficiales; respeta la calibración de opacidad y sanea referencias retiradas.
- Biblioteca vacía recuperable, contador `00 / 00` y navegación segura sin división por cero, fotos ocultas residuales ni reaparición automática del catálogo fijo.
- Modo de solo lectura con acciones de modificación desactivadas y guardas en sus manejadores.

## Catálogo, portada y persistencia

`hero-store.ts` es la fuente de disponibilidad y orden. `slides` conserva la narrativa de la portada, reconciliada con el catálogo; `obtenerDiapositivasHero` alimenta tanto el panel como la portada. Los banners temáticos también resuelven su imagen mediante el catálogo vigente, incluso cuando utilizan su configuración temática por defecto.

La persistencia local conserva `polis_hero_config`, versión 1, con migración desde configuraciones anteriores sin catálogo. Se validan datos persistidos y respuestas remotas como entradas `unknown`. Se preservan los overrides URL anteriores que sean válidos y las listas vacías explícitas.

Se integraron las funciones de servidor añadidas en paralelo por agy2:

- GET `/api/v1/politicas/heros`: carga configuración compartida sin pisar borradores locales ni ediciones realizadas durante una respuesta tardía.
- PUT de la misma ruta: envía catálogo completo, `habilitada`, `heroImageId`, narrativa, parámetros y asignaciones. Los guardados se serializan; una edición posterior sigue marcada como pendiente hasta guardarse.
- POST `/api/v1/politicas/heros/subir-imagen`: la carga desde el equipo utiliza `FormData` y conserva la ruta retornada. El panel admite JPG/PNG/WebP hasta 8 MiB; no convierte las nuevas subidas en una imagen base64 dentro de localStorage.

El panel informa cuándo existen cambios locales. **«Guardar Cambios en la Plataforma» comparte la configuración con los visitantes.** Un fallo del servidor conserva el borrador y muestra error; restaurar no declara un guardado remoto inexistente. Las notificaciones de alta/retiro local no anuncian publicación.

Para usarlo tras publicar el build validado: abrir `/plataforma/configuracion`, gestionar la biblioteca con el rol autorizado y guardar los cambios en la plataforma.

## Validaciones de Codex

Evidencia en [`243_evidencia_codex_gestion_heros/`](243_evidencia_codex_gestion_heros/).

| Verificación | Resultado | Evidencia |
|---|---|---|
| Cuatro suites dirigidas: store, portada, banner y gestor | **80 pasan / 0 fallan**, 459 aserciones | `26_unitarias_final.log` |
| Historias del gestor en Chromium: gestión completa, oscuro, validación/teclado, biblioteca vacía y solo lectura | **5 pasan / 0 fallan**, axe activo | `12_historias.log` y corridas completas posteriores |
| Suite UI completa con `--maxWorkers=1` | **240 pasan / 0 fallan**, 20 archivos | `28_ui_completa_serial.log` |
| Guardas UI, TypeScript y ESLint del proyecto | **exit 0** | `24_check_final.log` |
| Build Next real con ensamblaje standalone | **exit 0** | `22_build_next.log` |
| Build Storybook | **exit 0** | `23_build_storybook.log` |
| Navegador real,320/1440 px, claro/oscuro y movimiento reducido | **4 escenarios pasan**, sin desbordes ni errores de página | `27_verificacion_visual.json`, capturas `27_panel_*.png` |

Los builds se ejecutaron en `/tmp/polis-hero-243-ygu0hkw2`, con copia independiente de las fuentes y dependencias. Los nueve archivos de esta entrega coinciden por SHA256 con el build final: `29_cierre_fuentes.json` y `21_build_aislado_final.json`.

### Corridas completas de UI

- Corrida 14: **238 pasan / 2 fallan**: `Usuarios` y `Territorios Con Teclado`.
- Repetición dirigida 18 de esos dos archivos: **48 pasan / 0 fallan**.
- Corrida 20: **238 pasan / 2 fallan**: `Escenario Accesible` y `Territorios Con Teclado`.
- Corrida 28, con `--maxWorkers=1`: **240 pasan / 0 fallan**, 20 archivos, exit 0. Se mantienen las mismas historias y comprobaciones; sólo se serializa su ejecución.

Las dos primeras corridas completas se solaparon con compilaciones; se conservan sus fallos y no se atribuye una causa demostrada. No se modificaron esas historias, sus aserciones ni sus tiempos de espera. Las historias del gestor pasaron en ambas corridas completas.

### Correcciones verificadas durante la ejecución

1. Se resolvió una concurrencia de edición con agy2: su API se preservó y se eliminó la divergencia entre `activeSlides` fijo y la biblioteca editable. Coordinación concedió el cerrojo de los tres archivos frontend a Codex.
2. Se corrigieron nombres de campos y pérdida de `habilitada`/selección activa en el contrato del backend, mediante remisión al responsable. Contrato final: `243_contrato_api_heros_backend.json`.
3. El primer navegador a 320 px detectó **565 px** de ancho real. La corrección de columnas y mínimos flex/grid quedó verificada: **320 px de documento y cuerpo** en ambos temas. Se conservan las mediciones negativas 19 y las positivas 27.
4. Las historias interceptan sus solicitudes; las pruebas de sincronización usan almacenamiento privado y respuestas simuladas, sin escritura en la API activa.

## Incidencia del backend remitida al responsable

Codex detectó que la fixture inicial de `backend/tests/test_politicas_heros.py` apuntaba mediante `parents[2]` al archivo activo `/root/polis/data/heros_config.json` y ejecutaba `unlink`. Se solicitó detener esa prueba y aislarla; la observación 25 registra que el archivo activo estaba ausente a las 11:57:19 UTC. **Codex no ejecutó ese pytest ni escribió configuración mediante la API activa.**

agy2 sustituyó la fixture por `tmp_path` y `monkeypatch` de las rutas de configuración/subida, añadió pruebas 401/403 y registró los endpoints en `docs/permisos-api.md`. También informó haber restablecido la configuración oficial y creado `.bak`. Ese respaldo posterior **no acredita identidad con el archivo anterior al incidente**. Su validación backend y reinicios corresponden a ese colaborador; no se presentan como pruebas ni despliegues de Codex.

## Revisión y límites

- La revisión complementaria 247 conserva los diagnósticos provisionales, las rectificaciones y la revalidación del módulo. Véase `247_validacion_freebuff_heros.md`.
- Los builds emiten advertencias de CSS de gráficos y directivas `use client`; están preservadas en los logs aunque los procesos finalizan con exit 0.
- La validación de URL es sintáctica. La disponibilidad de una imagen externa depende del alojamiento y de la política de contenido del sitio.
- Esta entrega no es un dictamen EAF de toda la plataforma. El frontend permanece como cambio local; Codex no realizó commit, push, reinicio ni despliegue.

## Archivos y trazabilidad

Cambios propios: `hero-store.ts` y su prueba; `hero-home-showcase.tsx` y su prueba; `hero-page-banner.tsx` y su prueba; `gestor-heros-plataforma.tsx` y su prueba; nueva historia `src/app/_stories/gestor-heros.stories.tsx`.

- `snapshot_antes.json` y `antes/**/*.snapshot`: originales de los ocho archivos existentes, conservados sin extensiones ejecutables.
- `concurrencia/`: corte intermedio de la edición compartida, conservado antes de reconciliar.
- `29_cambios_integrados.patch`: comparación del resultado integrado con el corte inicial.
- `29_cierre_fuentes.json`: hashes de los nueve archivos y dependencias integradas del otro colaborador.
- Logs 01–06 y 10 conservan intentos anteriores. El 01 usó inicialmente rutas sin `./` y descubrió copias históricas fuera del alcance; no se acredita como suite dirigida. Las corridas dirigidas válidas usan rutas explícitas `./src/...`.
