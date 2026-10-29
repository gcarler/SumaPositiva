# OL-MP-01 · Inventario de motores para múltiples políticas

Lee45_plan_capacidades_y_fuentes_multipolitica.md y ejecuta MP-02 ahora.
Entrega exclusivamente bridge/47_inventario_motores_multipolitica.md y
bridge/47_inventario_motores_multipolitica.json. No Python/repositorio,
data/**, src/**, SQL, red, tests, commit/push, reinicios ni despliegues.
Puedes usar scripts temporales en /tmp para lectura/AST, sin tocar aplicación.

Inventaría las doce familias del contrato45. Prioriza código ejecutable y
consumidores reales; una clase declarada no implica integración o uso.
Incluye módulo/función y línea, entradas/salidas/unidades, fuentes, reglas,
precondiciones y acoplamientos sectoriales. Usa estados distintos:
reutilizable candidato, requiere parametrización, especializado,
sin evidencia suficiente, faltante para pregunta definida. No declares
probado en otra política por encontrar politica_id, sector o metadatos.

Inspecciona scripts/pipeline_datos_polis.py, compromisos/orquestador_grafo.py,
agentes_inteligentes_pdd.py, contratos_observacion_polis.py, taxonomia_7d_polis.py,
ipc_deflactor_polis.py, triada_motores.py, pdt_* espacial/predictivo y SisPT;
ia/grafo/orquestador.py y agentes; politicas/models.py/service.py/schemas.py.
Sigue imports/calls de los demás módulos relevantes. Máximo20 fichas de
capacidad con agrupación explícita; no miles de funciones inventariadas.

Comprueba: siete dimensiones obligatorias, clasificacion7D en observación,
fuentes hardcoded, defaults Cartagena/FONSET, canastas fiscales fijas,
periodos/códigos PDD/PDL, contratos y outputs sin policy_id o perfil cuando
aplique. Política de seguridad y banco de observaciones no son el mismo
objeto. Anota componentes generales existentes para reutilizarlos, no
proponer su duplicación. Señala separación entre validar una propuesta y
analizar fuentes reales; entre leer archivo y entender su contenido.

Tests: identifica nombres/archivos reales y evidencia histórica42 (1077/16),
pero NO ejecutes ni certifiques cobertura funcional que no inspeccionaste.
Sin dictamen EAF. No inventes porcentajes de avance o cronómetros.

El segundo caso aún se consulta al usuario; no lo elijas ni supongas que
todas las fuentes de ICBF, POT o minas/energía están listas. Distingue
infraestructura compartida de reglas y datos específicos.

Concluye con brechas priorizadas y qué no sabemos aún. Al notificar a
=codex:0.0 usa tmux send-keys -l y Enter; confirma envío real en el destino.
No reinicies Python ni avances al desacoplamiento. El objetivo es evidencia
para decidir correctamente el siguiente trabajo.
