# OL-FUENTES-02 · Clasificación y contrato del ciclo de fuentes

Fecha: 24 de octubre de 2026. Coordinador: Codex. Agente: Ollamacodex.

## Objetivo autorizado

Preparar la clasificación verificable y el contrato documental que permitan integrar el mismo ciclo de fuentes nacionales y territoriales sin confundir ámbito, naturaleza del custodio, productos, cobertura ni estado de preparación. Es una tarea nueva y acotada; se mantiene congelado tu módulo anterior de anexos.

El usuario establece: añadir/seleccionar fuentes → depurar su pertinencia por política → orquestar adquisición y armonización → comparar/depurar/limpiar datos → validar → corte de versiones → motor compatible → resultado trazable → agente intérprete → retroalimentación del catálogo. Las contradicciones pueden conservarse como hallazgos. Se prevén ramas documentales y normativas; no todo insumo pasa por un motor estadístico.

## Lecturas

- `AGENTS.md`, `docs/arquitectura.md`.
- `bridge/fuentes_nacionales_aportadas_20.json` y `bridge/entrega_20_fuentes_aportadas_diagrama.md`.
- `bridge/48_inventario_fuentes_multipolitica.json` y `.md`.
- `bridge/58_resultados_descargas.csv` y `bridge/59_entrega_adaptadores_descarga_fuentes.md`.
- `bridge/modelo_roles_fuentes_territoriales.json` y `bridge/modelo_fuentes_nacionales_y_alias_territoriales.md`.
- Solo lectura: `backend/app/modules/compromisos/planificador_fuentes_politica.py`, `registro_descargas_polis.py`, `adquisicion_fuentes_polis.py`, `orquestador_grafo.py`.

`bridge/01_tarea_codex.md` conserva una fase histórica 34A y no sustituye esta asignación. No ejecutarla.

## Trabajo

1. Diseñar un JSON Schema documental para la clasificación. Separar, como mínimo:
   - Identificador de ficha y producto de origen; clase de registro (institución, sistema, portal, encuesta, indicador, documento o por determinar).
   - Custodio declarado, naturaleza (público, cooperación, academia, privado, organización social, mixto, por verificar), país/jurisdicción de la institución y evidencia/estado de esa atribución.
   - Ámbito institucional y cobertura del dato en campos distintos: una institución nacional puede publicar datos municipales; cooperación internacional puede cubrir Colombia.
   - Territorio, población, unidad y años conocidos, sin convertir listas separadas en cobertura conjunta acreditada.
   - Rol territorial, entidad identificada, alias, competencia, vigencia y verificación como conceptos separados. Permitir cero/una/varias entidades; no trasladar nombres de Cartagena a otro municipio.
   - URL originales, procedencia por archivo/ID y SHA de entrada; no escribir credenciales.
   - Estados independientes de acceso, captura, validación, condiciones de uso, integración y publicación. Tener URL o captura no implica dato apto.
   - Relación con otras fichas, declarada o candidata, sin fusionar automáticamente por nombre. No inventar un ID jurídico institucional.
2. Materializar 63 fichas: PR-01..PR-20 de la lista del usuario y las 43 series locales. Conservar sus IDs originales (usar `local:<clave>` para las series). Son fichas heterogéneas y posiblemente solapadas, no 63 fuentes independientes. No omitir registros para cuadrar el conteo. Usa relaciones candidatas explícitas cuando proceda.
3. Preservar los 21 enlaces de la lista de 20; SisPT tiene dos. No suponer que su disponibilidad, autenticación, licencia, API o vigencia se verificaron. Usa la evidencia existente y deja los desconocidos como tales. Los errores de herramienta web no prueban caída del portal. Las observaciones de la consulta anterior pueden ser de caché.
4. Cotejar las 28 capturas de la entrega 58 por ID exacto. Registrar su estado pendiente de validación analítica; los otros 15 productos locales no reciben estado de captura nueva. No extrapolar una captura policial al portal completo SIEDCO, calidad del aire IDEAM al SMByC ni módulo SisPT a descarga del portal.
5. Documentar el contrato del ciclo compartido: entradas/salidas, responsable técnico real, condición para avanzar, devolución/revisión, evidencia conservada y distinción entre implementado y propuesto. Leer el código; no asignar capacidades por nombre de agente.
6. Documentar compatibilidad propuesta por tipo de producto/pregunta: series, espacial, documental, normativa, planeación/presupuesto y eficiencia. Un producto puede ir a varios motores; cada motor debe exigir precondiciones. No convertir el nombre de una fuente en autorización para ejecutarlo. No acreditar causalidad ni equivalencia estadística por compartir territorio o año.
7. Proponer ejemplos de vínculos territoriales para Cartagena solo con los alias ya aportados; Santa Catalina (Bolívar), Sahagún (Córdoba) y Bogotá D.C. quedan como configuraciones pendientes. No buscar ni inventar organigramas.

## Aislamiento: únicos archivos de salida permitidos

- `bridge/65_schema_clasificacion_fuentes_ollamacodex.json`
- `bridge/65_catalogo_clasificado_fuentes_ollamacodex.json`
- `bridge/65_contrato_ciclo_fuentes_ollamacodex.md`
- `bridge/65_entrega_ollamacodex_clasificacion_fuentes.md`

No modificar los archivos de entrada, código Python, `src/**`, datos, inventarios activos, servicios, configuración o diagramas publicados. Sin SQL, red, migraciones, cron, instalación, commit, push o despliegue. No añadir ni ejecutar pruebas de aplicación. Se permite comprobar sintaxis JSON, esquema si ya existe validador instalado y conteos/invariantes locales mediante lecturas; documentar exactamente lo comprobado, sin presentarlo como aceptación de la orquestación.

## Aceptación de la entrega

- 63 IDs únicos: 20 PR y 43 local; los 21 enlaces originales PR se conservan.
- 28 productos locales cotejados con capturas pendientes de validación; no se inventan capturas para el resto.
- Cada atribución incluye evidencia o estado pendiente; nacional no implica gobierno colombiano.
- No se afirma que el resolutor de alias ni el ciclo universal estén implementados.
- Informe enumera dudas, incompatibilidades, posibles solapamientos y archivos realmente escritos; incluye SHA de entradas y salidas pertinentes.
- Al finalizar, congelar solo estos cuatro entregables y avisar a Codex por `tmux send-keys -t =codex:0.0 -l 'OL-FUENTES-02 entregado: bridge/65_entrega_ollamacodex_clasificacion_fuentes.md. Pendiente de revisión del coordinador; sin cambios de aplicación ni datos.'`, seguido de Enter en una llamada separada. No interrumpir la otra sesión.

La integración al planificador y los adaptadores corresponde después al coordinador, tras revisar esta entrega; no se acredita por este trabajo documental.
