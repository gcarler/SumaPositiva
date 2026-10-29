# OP-FUENTES-01 · Revisión preventiva de integración del catálogo

Fecha: 24 de octubre de 2026. Coordinación: Codex. Agente: sesión tmux `=opencode:0.0` indicada por el usuario como OllamaOpenCode.

## Objetivo

Definir y revisar el enlace entre el catálogo documental clasificado 65, ya cerrado por coordinación 70, y el planificador real. La entrega será una especificación verificable del adaptador y sus límites, con hallazgos sustentados en código. No implementar ni desplegar aún el adaptador.

Esta tarea es independiente del trabajo anterior sobre `hallazgos21102026.md`. No modificar aquel informe ni reabrir trabajos de otros agentes. Ollamacodex conserva congelados los entregables 65; no hay archivos compartidos de escritura.

## Lecturas necesarias

- `AGENTS.md`, `docs/arquitectura.md`.
- `bridge/65_schema_clasificacion_fuentes_ollamacodex.json`.
- `bridge/65_catalogo_clasificado_fuentes_ollamacodex.json`.
- `bridge/65_contrato_ciclo_fuentes_ollamacodex.md`.
- `bridge/67_ampliacion_conciliacion_retrospectiva_fuentes.md` y `68_misionalidad_temporalidad_e_inferencia_fuentes.md`.
- `bridge/70_revision_final_clasificacion_fuentes.md` y `.json`: los hashes actuales de coordinación prevalecen sobre entregas anteriores.
- Código solo lectura: `backend/app/modules/compromisos/planificador_fuentes_politica.py`, `registro_descargas_polis.py`, `adquisicion_fuentes_polis.py`; CLI `backend/scripts/planificar_fuentes_politica.py` y `adquirir_fuentes_politica.py`.
- Si una afirmación de integración lo requiere, seguir la llamada pertinente de `contexto_corte_polis.py`, `corte_datos_polis.py` y `orquestador_grafo.py`. Citar archivo/rango/función reales.

`bridge/01_tarea_codex.md` es una instrucción histórica 34A; no ejecutarla.

## Preguntas que debe resolver la entrega

1. ¿Qué campos de la clasificación 65 pueden convertirse de manera fiel a `ProductoFuente`/`CatalogoProductos`, cuáles no tienen destino y dónde deben preservarse? Elaborar matriz explícita origen → destino → transformación → evidencia → desconocido/bloqueo. No descartar naturaleza, ámbito institucional, cobertura declarada, temporalidad, alias, versiones, contradicciones o procedencia porque el destino actual no los incluya.
2. Separar instituciones/sistemas/portales/referencias de productos estadísticos. Las 20 PR no son automáticamente 20 datasets ni 20 adaptadores. Las 63 fichas no son fuentes independientes. Identificar clases que deben ir a la rama de consulta documental y casos que requieren definir producto concreto.
3. Identificar la ruta real que permite `programar_adquisicion_y_validacion` y el enlace de IDs al registro cerrado de descargas. Documentar qué hace el sistema ante ID sin adaptador. No inferir API, acceso o permiso a partir de una URL conocida.
4. Preservar la separación entre metadatos declarados y cobertura acreditada. Las listas de indicadores/unidades/años de 48 no prueban combinaciones; en la versión final 65 `coberturas` está vacío deliberadamente. Ninguna conversión debe inventar conceptos, población, unidad de observación, años o cobertura conjunta para lograr que el motor acepte una ficha.
5. Separar SHA del documento de clasificación, SHA del inventario de origen, SHA del contenido declarado y bytes analíticos realmente verificados. El hash de la ficha no puede ocupar `version_local_sha256` del dato sin demostrar qué bytes representa. Examinar también condiciones de uso y vigencia: aceptación documental no es licencia ni promoción.
6. Distinguir ámbito/naturaleza del custodio de cobertura de los datos. La configuración territorial debe vincular roles a entidades con alias, jurisdicción, competencia y vigencia. Proponer cómo transportar ese contexto sin sobrescribir identidades nacionales ni acoplar el núcleo a Cartagena o las siete dimensiones SH. No inventar organigramas ni DIVIPOLA.
7. Delimitar responsabilidades: selección; adquisición; armonización/limpieza; validación; corte; conciliación retrospectiva; motor; intérprete. Identificar conexiones reales, opcionales y pendientes, sin dar por integrado un módulo por su nombre o importación.
8. En el caso conceptual de homicidios INML/Policía/Fiscalía, definir las condiciones para comparar y para abstenerse. Mantener fechas del fenómeno/registro/extracción y versiones; procesos/víctimas/hechos no son equivalentes. Señalar los dos diagnósticos, cómo conservar hipótesis y qué requiere evidencia. Ninguna cifra consolidada automática ni inferencia de subregistro o causalidad por diferencias simples.

## Entregables: únicos archivos permitidos

- `bridge/72_revision_preventiva_integracion_fuentes_opencode.md`
- `bridge/72_matriz_correspondencia_catalogo_planificador.json`
- `bridge/72_evidencia_revision_fuentes_opencode.json`

El informe debe incluir una propuesta concreta y mínima de interfaz/ubicación del futuro adaptador, su consumidor real y una secuencia de integración. Evitar un módulo sin consumidor. Separar decisiones de contrato, defectos reproducibles y propuestas, con prioridad y límites.

La matriz debe cubrir campos semánticos y casos relevantes, no solo cambiar nombres. Registrar al menos instituciones PR, encuesta ECSC, datos de estación IDEAM, serie multimedida TerriData, dato financiero, entrega Drive de procedencia pendiente y ficha sin adaptador. Se permiten ejemplos de salida documentales; no fixtures de pruebas ni datos inventados presentados como reales.

La evidencia debe registrar hashes de entradas efectivamente leídas y confirmar si coinciden con 70, referencias de código comprobadas, conteos y límites. No acreditar pruebas ni lecturas de bytes que no se hayan realizado. Si encuentras un defecto en 65, informarlo sin modificarlo.

## Aislamiento y cierre

Solo lectura de aplicación y datos. Sin cambios en `src/**`, backend, 65/70, inventarios, diagramas publicados, configuración o documentos ajenos. Sin SQL, red, instalaciones, pruebas de aplicación, commit/push o despliegue. Se permiten cotejos de JSON, hashes, conteos y referencias locales; no ejecutar servicios, planificador, adaptadores ni motores.

Esta revisión es preventiva de integración; no firmar dictamen EAF ni anunciar cierre de la orquestación universal. Al terminar, congelar los tres archivos y avisar al coordinador por tmux a `=codex:0.0` con el texto `OP-FUENTES-01 entregado: bridge/72_revision_preventiva_integracion_fuentes_opencode.md. Especificación y revisión preventiva, pendiente de revisión de Codex; sin cambios de aplicación o datos.` Enviar texto literal y Enter en llamadas separadas. No interrumpir la sesión receptora.
