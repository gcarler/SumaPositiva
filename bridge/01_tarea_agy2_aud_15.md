# AUD-15 (CRÍTICA) — Datasets `*.mock.ts` activos en el estado inicial/fallback de producción

## Hallazgo (EAF, verificado en código)
`src/features/mesas/state/mesas-store.ts` l.4 y l.239: `mesas: [...MESAS_AGENDA_INICIAL, ...MESAS_MOCK]`. `mesas.mock.ts` (377 líneas) contiene mesas inventadas: facilitadora "Arq. Laura Restrepo", "47 asistentes", "34 siniestros reportados, 19 involucran…", entidades, colegios, plenarias, árboles de problemas. `mesas-view.tsx` sincroniza la API **sobre** ese estado, por lo que el usuario ve mezclados datos reales y ficticios (y los ids no-UUID "mt-001"/"mesa-001" provocan 422 al guardar actas, hallado por el E2E de AUD-09).
Otros módulos con mocks referenciados en código de producción (`git grep` de `.mock`/`MOCK`): `formularios/data/formularios.mock.ts` y `formularios-demo-store.ts`, `geovisor/services/use-geovisor-queries.ts`, `noticias/data/noticias.mock.ts`, `participacion/services/use-participacion-queries.ts`, `politicas/data/politicas.mock.ts` y `politicas-store.ts`, `testimonios/data/testimonios.mock.ts`, `mesas/services/mesas-api.ts`.
Es el mismo patrón de OBS-02/AUD-13/AUD-14 (datos fabricados presentados como reales) por la vía del "estado inicial/fallback". Nota: `codex` trabaja en noticias/testimonios; coordinar (no tocar sus archivos sin acuerdo: avisar por bridge y limitarse a lo propio de mesas/formularios/geovisor/participacion/politicas).

## Acción
1. Inventario con evidencia: para CADA referencia a un mock/demo desde código no-test/no-story, indicar quién lo consume y si llega a producción.
2. Mesas: estado inicial = lista vacía + `cargando`; fuente única = API (`/api/v1/mesas`); ante fallo → estado de error explícito, nunca mock. La agenda canónica (AGENDA_MESAS) solo si coincide con lo sembrado en BD por migración trazable; si no, retirarla del store (la BD es la fuente).
3. Resto de módulos (formularios, geovisor, participacion, politicas): mismo criterio. Mocks → mover a `src/**/__fixtures__/` o `*.fixture.ts`, importables SOLO desde tests/stories (regla ESLint `no-restricted-imports` o test que lo verifique).
4. Test automático que falle si algún archivo de producción importa `*.mock*`/`__fixtures__`/`*-demo-store`.
5. Ajustar los E2E (AUD-09) para que ya no dependan de ids mock.

## Criterio de aceptación
- `git grep` de imports de mocks desde `src/` no-test = 0 (para los módulos propios); vistas muestran vacío/"Sin datos" cuando la API no tiene datos; guardar actas funciona con ids reales.
- Quality gates + E2E aislado + axe.
- Al terminar: `tmux send-keys -t agy "He terminado AUD-15. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
