# OL-CODEX-01 · Evidencia documental de 140 metas sin indicador

## Encargo del coordinador

Trabaja en `/root/polis`. Este encargo pertenece al plan
`bridge/10_plan_orquestacion_inteligente_seguridad_humana_2026.md`, P2/P3.
La solicitud del usuario autoriza asignarte esta tarea. Implementa y documenta;
la entrega queda pendiente de revisión del coordinador. No firmes como EAF ni
como anotador humano independiente.

Lee primero `AGENTS.md`, `README.md`, `docs/arquitectura.md`,
`docs/plan-trabajo.md` y el apartado «Continuación P3-05: catálogo completo de
nodos y metas por corte» de `bridge/11_ejecucion_plan_orquestacion_2026.md`.
Si un insumo no existe, informa el bloqueo concreto; no lo reconstruyas por
suposición.

## Entradas inmutables

- `bridge/18_metas_indicador_pendiente.csv`: 140 IDs únicos.
- `data/capas_analiticas/catalogos_planeacion/0ccf1867a4dedb045a627a5da0e9b3cd553f9b1d8819e74f92daaf1f1ace5c11.json`.
  Verifica el SHA real antes de consumirlo.
- Documentos locales de `data/planes_desarrollo/`, incluidas sus versiones
  `anydoc_md/`, y el inventario inmutable
  `data/fuentes_versiones/inventarios/19e5b8901c7aa088904c4d1964c5c58584c26b57e1a088970dbd1697d0741824.json`.

El catálogo contiene 4.637 metas; solo las 140 de la lista se auditan aquí:
PDD 2013–2015: 3; PDD 2020–2023: 52; PDD 2024–2027: 80;
PDL 1: 1; PDL 3: 4. Sus documentos y filas originales están en la lista.
`fila_fuente` NO es un número de página ni necesariamente una línea física.

## Trabajo

1. Construye un trazador determinista y offline que valide la lista contra
   el catálogo por ID, plan, SHA y ausencia del indicador. Rechaza IDs
   duplicados/ajenos y listas que omitan metas pendientes o alteren identidades.
2. Resuelve los documentos de origen dentro de las raíces permitidas de datos.
   Usa el inventario para comprobar ruta y SHA. No elijas silenciosamente una
   de varias copias con el mismo nombre: si tienen contenido diferente,
   conserva candidatos y marca ambigüedad. Rechaza rutas que escapen de las
   raíces. Un archivo no localizado o alterado debe quedar explícitamente
   reportado, sin desaparecer de la salida.
3. Busca el nombre de la meta con normalización conservadora documentada
   (Unicode/espacios). Conserva los fragmentos originales, su ubicación física
   en la transcripción y el número de coincidencias. No uses coincidencia
   aproximada como acreditación. Si no hay coincidencia exacta normalizada o
   hay varias, registra el estado correspondiente. Acota contextos para no
   copiar documentos completos. No inventes páginas de PDF.
4. Emite un registro por meta con ID, plan, código, fuente solicitada, rutas y
   SHA comprobados de candidatos, estado de resolución, localizadores y
   contextos. El indicador seguirá `null` y el estado será pendiente de cotejo
   humano: encontrar texto no acredita un indicador ni una equivalencia.
5. Ejecuta la herramienta sobre las 140 metas reales y entrega recuentos por
   plan/estado, sin afirmar que todas se resolvieron si no ocurrió. Dos
   ejecuciones sobre entradas idénticas deben producir la misma salida.

## Aislamiento obligatorio

Puedes CREAR exclusivamente estos archivos:

- `backend/app/modules/compromisos/auditoria_indicadores_planeacion_polis.py`
- `backend/scripts/auditar_indicadores_planeacion_polis.py`
- `backend/tests/test_auditoria_indicadores_planeacion_polis.py`
- `bridge/20_entrega_ollamacodex_indicadores.md`
- `bridge/20_evidencia_ollamacodex_indicadores.jsonl`
- `bridge/20_resumen_ollamacodex_indicadores.json`

No sobrescribas un archivo preexistente que otro agente haya creado con ese
nombre; avisa al coordinador. Para repetir tus propias salidas, exige contenido
idéntico o documenta el cambio. No modifiques otros archivos, especialmente
`src/**`, agentes, grafos, router, modelos, migraciones, configuración,
dependencias, `.env`, catálogos, inventarios, cortes o documentos de diagnóstico.
No consultes ni escribas `bd_csh`, no hagas descargas ni invoques modelos/API
externos. No ejecutes servicios, despliegues, commit, push ni limpiezas Git.
Preserva el trabajo compartido y limita Ruff a tus tres archivos Python.

## Verificación

Agrega pruebas de integridad de entradas; duplicación/omisión de IDs;
resolución única, ausente y ambigua; SHA alterado; rutas fuera de raíz;
coincidencia inexistente/múltiple; contexto acotado; nulos preservados e
idempotencia. Usa fixtures sintéticas, no producción.

Ejecuta Ruff check y format --check sobre tus tres archivos Python y solo
`backend/tests/test_auditoria_indicadores_planeacion_polis.py` con pytest.
No corras la suite completa: la validación integral la coordina Codex.
El conftest del proyecto prepara base incluso para ciertas pruebas unitarias:
si necesitas entorno, deriva `POLIS_TEST_DATABASE_URL` hacia
`polis_test_orq_v5_20261022` usando la configuración local sin imprimir secretos;
nunca apuntes pruebas a producción ni cambies el conftest. No abras sesiones SQL
desde tu implementación.

## Entrega y notificación

En `bridge/20_entrega_ollamacodex_indicadores.md` registra archivos creados,
comandos, resultados reales, SHA de entradas/salidas, conteos, ambigüedades y
límites. Distingue evidencia extraída de interpretación/revisión humana.
Si no puedes ejecutar algo, explica exactamente qué faltó.

Al terminar notifica al coordinador:

```bash
tmux send-keys -t =codex:0.0 -l 'OLLAMACODEX OL-CODEX-01: entrega lista en /root/polis/bridge/20_entrega_ollamacodex_indicadores.md. Pendiente de revision e integracion por Codex; sin commit ni push.'
tmux send-keys -t =codex:0.0 Enter
```
