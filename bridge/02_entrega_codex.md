# Entrega EDD — `[ARCH-CONSOLIDACION-01]`

- **Fecha:** 2026-10-14
- **Responsable:** Codex
- **Rama:** `main`
- **Base de la asignación:** `0ed3e66f2a67fdd9aac25d86b4f0b3f1265492ed`
- **Commit de implementación:** `6b956ab67808cf2b051fe3133755ad29252fab61` (`refactor(architecture): consolidate POLIS scaffold`)
- **Dictamen EAF de esta entrega:** pendiente; este informe es evidencia EDD, no certificación independiente.

## Resultado

Se actualizaron las cinco correcciones obligatorias y se ejecutaron las fases estructurales/documentales del plan. La arquitectura de paneles quedó desacoplada, se retiró el scaffold Prisma —incluido el uso que seguía oculto en `.zscripts`—, se habilitó el lint de Noticias/Testimonios, se añadió `bun test` a CI y se incorporó la matriz real de módulos.

La ruta de cierre no se declara completa: `ruff check` reporta 840 hallazgos y `ruff format --check` detecta 110 archivos backend por formatear. El código backend de esos hallazgos no se cambió en esta tarea. Los recorridos de módulos sin pruebas end-to-end identificadas se clasifican como parciales o pendientes en la matriz.

## Cambios por ajuste EAF

1. **Lint frontend:** se retiraron las exclusiones globales de `noticias` y `testimonios`; se eliminaron imports sin uso. ESLint global y `bun run check` pasan.
2. **Retiro Prisma:** se eliminaron `prisma/schema.prisma`, `src/core/database/legacy-prisma.ts`, paquetes y comandos `db:*` del manifiesto. También se retiró el generador SQLite de `.zscripts/dev.sh`, `.zscripts/build.sh`, `.zscripts/start.sh`, `.zscripts/database-runtime-build.sh` y su prueba obsoleta, que habían quedado fuera del censo EAF inicial.
3. **Store de paneles:** `src/core/panels/panel-store.ts` conserva infraestructura genérica y una interfaz abierta. Los contratos viven en `src/app/_composition/panel-contracts.d.ts`. `PANEL_REGISTRY` usa un tipo mapeado exhaustivo con `satisfies`; el único cast dinámico se encapsula en `resolvePanelComponent`, después de comprobar la tabla completa. Se añadió [ADR 0001](../docs/adr/0001-desacople-panel-store.md), se ajustaron contratos discrepantes —incluido `vistaInicial`— y se añadieron pruebas de pila.
4. **CI y EDD:** `.github/workflows/check.yml` ejecuta `bun test`; `docs/plan-consolidacion-arquitectura.md` lo incluye en sus validaciones.
5. **Inventario y persistencia:** arquitectura y plan de trabajo reflejan Alembic `0062_motor_plan_accion_dnp`, los routers actuales y el modo CSP de código (`Report-Only` por defecto, enforcement configurable). La matriz distingue censo estructural de persistencia verificada y define reglas diferentes para fallos de lecturas y mutaciones.

## Censo verificado

- `src/features/`: **21** directorios directos, frente a los 23 esperados por la asignación.
- `backend/app/api/router.py`: **22** llamadas `include_router`.
- `backend/app/modules/`: **25** módulos con `router.py`; `actores`, `alternativas` y `fuentes` no están montados por el router raíz.
- Alembic devuelve una cabeza: **`0062_motor_plan_accion_dnp`**.
- La matriz [docs/matriz-trazabilidad-modulos.md](../docs/matriz-trazabilidad-modulos.md) registra las entradas y la discrepancia 23/23 sin inventar módulos. La presencia de UI, router o migración no se toma como prueba de preparación productiva.

## Validaciones ejecutadas

| Comando/validación | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` | Aprobado; 1037 instalaciones comprobadas, sin cambios de lockfile. |
| `bun run check` | Aprobado: UI policy, TypeScript y ESLint global. |
| `bun run ui:policy:test` | Aprobado: 10 pruebas. |
| `bun test` | Aprobado: 607 pruebas en 71 archivos, 0 fallos. |
| `bun run build` | Aprobado; Next.js prerenderizó 192 rutas. Reportó una advertencia CSS de un selector Tailwind con `stroke='#fff'`. |
| `bun run storybook:build` | Aprobado; 4756 módulos transformados. Storybook/Vite emitieron advertencias de CSS y directivas `use client`, sin impedir la compilación. |
| `bun run ui:test` | Aprobado en la corrida final: 213 pruebas en 17 archivos, 0 fallos. La corrida inicial ocurrió junto a otro Chromium de agy2 y fue inestable; la historia de paneles que falló entonces pasó aislada y toda la suite pasó al repetirla sin runners concurrentes. |
| `uv run --project backend alembic -c backend/alembic.ini heads` | Aprobado: una cabeza, `0062_motor_plan_accion_dnp`. |
| `alembic check` con `POLIS_DATABASE_URL` en `polis_test` | Aprobado: `No new upgrade operations detected.` |
| `pytest backend/tests` con `POLIS_TEST_DATABASE_URL` en `polis_test` | Aprobado: 538 pruebas, 0 fallos, una advertencia deprecada de Starlette. La base tenía PostGIS y pgRouting. |
| `uv run --project backend ruff check backend` | **Falló:** 840 hallazgos. Por esto `bun run backend:check` se detiene en Ruff antes de ejecutar sus siguientes pasos. |
| `uv run --project backend ruff format --check backend` | **Falló:** 110 archivos requerirían formato. No se aplicó una reformateada masiva ajena al alcance. |
| `bash -n .zscripts/dev.sh .zscripts/build.sh .zscripts/start.sh` | Aprobado. `rg` confirmó que esos scripts, manifiesto, CI, `scripts/` y `tests/` ya no contienen comandos de sincronización SQLite/Prisma. |
| `git diff --cached --check` | Aprobado para el commit de implementación. |

### Nota sobre la base de pruebas

Una primera base aislada (`polis_test_reparacion_tres_fallos_20261004b`) no tenía la extensión pgRouting y produjo seis fallos geoespaciales. Se verificaron los siete casos geoespaciales en `polis_test` con pgRouting (7/7) y luego se ejecutó allí la suite completa (538/538). Ambas son bases `polis_test*`; `bd_csh` no se usó ni modificó.

## Coexistencia y límites

- Se preservaron los archivos asignados a agy2. Los cambios de geovisor y los documentos `bridge/01_tarea_activa.md`, `bridge/02_resultado_agy2.md` y `bridge/03_dictamen_revision.md` no se incluyeron en el commit de Codex. El commit concurrente de geovisor quedó como ancestro independiente.
- No se hizo `push`, reset ni checkout.
- No se validaron infraestructura productiva, datos de servicios externos ni enforcement real de CSP en proxy/navegador. La matriz no declara 100% de módulos listos para producción.
- El gate Ruff continúa pendiente; por tanto, el plan queda abierto hasta resolverlo y recibir dictamen EAF independiente.

## Referencias

- [Plan ejecutado](../docs/plan-consolidacion-arquitectura.md)
- [Matriz de trazabilidad](../docs/matriz-trazabilidad-modulos.md)
- [ADR del store](../docs/adr/0001-desacople-panel-store.md)
- [Arquitectura](../docs/arquitectura.md)
