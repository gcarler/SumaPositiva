# OL-CODEX-02 · Captura financiera PPI por corte

## Objetivo y coordinación

Continúa inmediatamente con el plan
`bridge/10_plan_orquestacion_inteligente_seguridad_humana_2026.md`, P3-05:
construye una captura financiera tipada, reproducible y de solo lectura para
que el coordinador pueda migrar posteriormente `_query_ppi` al corte congelado.
Este encargo autoriza implementar y probar el componente independiente.
No modifiques aún los agentes consumidores ni el supervisor.

Lee `AGENTS.md`, `README.md`, `docs/arquitectura.md`, `docs/plan-trabajo.md`,
`bridge/11_ejecucion_plan_orquestacion_2026.md` y el informe 23 de integración.
Reutiliza los patrones existentes de:

- `catalogo_planeacion_corte_polis.py` y `congelar_catalogo_planeacion_polis.py`.
- `matriz_correspondencias_corte_polis.py` y `contexto_corte_polis.py`.

El corte vigente es `1c162aa0-68a9-42db-baad-cd3a551bdd02`; inventario inmutable
`f494ccdf035b6021914bd9f04d6d08cce836df72a8b69c77779798d9b6982b2c`.
No reescribas ese inventario ni ese corte para añadir tu componente.

## Archivos propios permitidos

Puedes crear exclusivamente:

1. `backend/app/modules/compromisos/ppi_planeacion_corte_polis.py`
2. `backend/scripts/congelar_ppi_planeacion_polis.py`
3. `backend/tests/test_ppi_planeacion_corte_polis.py`
4. `bridge/25_entrega_ollamacodex_ppi.md`
5. `bridge/25_evidencia_ollamacodex_ppi.json`

Si alguno existe y no es tuyo, informa al coordinador antes de reemplazarlo.
No cambies otros archivos. En particular, no edites `src/**`, agentes,
catálogos existentes, grafos, router, schemas, modelos ORM, migraciones,
dependencias, configuración, `.env`, fuentes, inventarios o cortes.
No hagas commit, push, despliegue ni reinicio de servicios.

## Contrato funcional

### A. Captura tipada sin cálculo financiero

Crea modelos Pydantic que conserven explícitamente:

- Plan: `codigo_plan`, `periodo`, `nombre_oficial`,
  `ppi_total_corriente_cop`, `ppi_total_constante_2025_cop`, `ppi_anual_cop`,
  `fuentes` y `metadatos`.
- Nodo financiero: `id`, `codigo_plan`, `parent_id`, `nivel`,
  `ppi_anual_cop`, `fuente` y `metadatos`.
- Conteos SQL por plan de nodos y metas, base de origen, esquema/versionado,
  aislamiento de lectura y estado fijo `no_publicable`.

Usa las columnas existentes en `seguimiento.planes_desarrollo_distrital`,
`seguimiento.pdd_lineas_y_programas` y `seguimiento.pdd_metas_oficiales`.
Selecciona campos explícitos; no uses `SELECT *`.

Los importes SQL Numeric deben usar Decimal y serializarse como cadenas
decimales sin pasar por float. Conserva nulos y JSON originales. Rechaza
importes no finitos. No calcules sumas, repartos, porcentajes, IPC, conversión
monetaria, pesos 7D, eficiencia ni rankings. No sumes niveles jerárquicos.
No uses `valor or 0` para rellenar ausencias. Capturar un valor almacenado
no acredita que sea correcto, comparable, ejecutado o pagado.

Valida planes e IDs de nodo únicos, pertenencia de nodos a planes capturados,
referencias de padres presentes y del mismo plan, ausencia de ciclos y
coincidencia de conteos observados con los conteos SQL. No inventes metas
para rellenar conteos. Incluye un alcance que identifique claramente
`PPI_FORMULADO_CRUDO_SIN_ACREDITAR_EJECUCION_NI_COMPARABILIDAD`.

### B. Exportador de solo lectura

Implementa una función asíncrona y una CLI que consulten planes, nodos y
conteos dentro de **una única transacción REPEATABLE READ READ ONLY**.
La herramienta debe exigir `POLIS_TEST_DATABASE_URL` en una base `polis_test*`
o una bandera explícita `--produccion` para una futura lectura autorizada.
Si existe una URL de prueba hacia otra base, recházala incluso con la bandera.
No muestres URLs, contraseñas ni variables de entorno en las salidas.

Ordena filas de manera estable y escribe la captura con nombre SHA-256 del
contenido JSON. Un segundo contenido idéntico conserva el mismo archivo y
SHA. Si ese archivo ya existe alterado, falla sin sobrescribirlo. El destino
lo proporciona el llamador: en tus ejecuciones reales solo usa un directorio
temporal de pruebas, nunca `data/**` ni archivos operativos del proyecto.

### C. Lector por corte

Expón una referencia pequeña con rutas de inventario y captura. El lector
recibe `ContextoCorte`, verifica identidad/SHA del corte, SHA del inventario,
SHA/nombre de la captura y pertenencia exacta de ruta/SHA al inventario.
Después valida el modelo y devuelve datos sin SQL ni fallback a datos vivos.
Resuelve rutas relativas desde la raíz del proyecto. Rechaza una captura
íntegra que no esté registrada en el inventario del corte.

No presentes esta lectura como conciliación con el catálogo de metas ya
congelado. El coordinador contrastará ambos universos antes de integrarlos:
compartir inventario o cantidad de filas no demuestra igualdad semántica.

## Pruebas y ejecución

Prueba, al menos:

- Precisión decimal grande, cero real frente a nulo y decimales no finitos.
- Duplicados, conteos falsos, padre ausente/cruzado y ciclos.
- Estabilidad ante orden de consulta distinto e idempotencia de escritura.
- Archivo alterado, inventario ajeno, pertenencia ausente y corte alterado.
- Lectura offline sin sesión SQL; rutas relativas con otro directorio actual.
- Guardia de DSN y lectura productiva no explícita.
- En PostgreSQL de prueba, comprueba aislamiento `repeatable read` y
  `transaction_read_only=on`; intenta `DELETE ... WHERE FALSE` y exige que
  PostgreSQL lo rechace. No cambies el modo de solo lectura para la prueba.

Usa fixtures sintéticas para los escenarios de contenido. Si pruebas el
exportador contra PostgreSQL, usa exclusivamente `polis_test_orq_v5_20261022`;
deriva la URL de la configuración local sin imprimir secretos y sin alterar
`.env`. No abras `bd_csh` ni uses `--produccion` en este encargo. La extracción
productiva de solo lectura queda para el coordinador después de revisar.

Ejecuta Ruff check y format --check solo sobre tus tres archivos Python,
y pytest solo sobre `backend/tests/test_ppi_planeacion_corte_polis.py`.
No ejecutes la suite integral: la coordina Codex tras revisar tu entrega.
No cambies conftest ni desactives guardas para conseguir resultados verdes.

## Entrega y continuidad

Documenta comandos, resultados reales, archivos, SHA, límites y cualquier
prueba no ejecutada en el informe 25 y en su evidencia JSON. No declares
ocho planes reales capturados si solo probaste fixtures; distingue las bases
de prueba del corpus productivo. No firmes como EAF ni revisión humana.

Notifica al terminar:

```bash
tmux send-keys -t =codex:0.0 -l 'OLLAMACODEX OL-CODEX-02 LISTO: captura PPI por corte, informe en /root/polis/bridge/25_entrega_ollamacodex_ppi.md. Pendiente de revision; sin SQL productiva, commit ni push.'
tmux send-keys -t =codex:0.0 Enter
```

Incluye en el informe una propuesta breve del siguiente paso de tu componente
para que el coordinador pueda encadenar trabajo sin esperar nuevas tareas del
usuario. No amplíes por tu cuenta el conjunto de archivos permitido.
