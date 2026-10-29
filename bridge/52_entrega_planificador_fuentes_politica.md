# Entrega: planificación de fuentes por política

Fecha: 2026-10-23. Continuación autorizada por el usuario. Evidencia técnica del
implementador; no es dictamen EAF ni aceptación de capacidad multipolítica.

## Cambios

- Contratos Pydantic de perfil, necesidad, producto y cobertura conjunta, con
  rechazo de campos desconocidos e identificadores duplicados.
- Grafo LangGraph para seleccionar candidatos y consolidar brechas/rutas.
- Selección por concepto e indicador; revisión de unidad, población, territorio,
  años acreditados, versión local, evidencia, condiciones de uso y vigencia.
- Importación de las 168 menciones de49 y las 43 series locales de48, con
  procedencia y SHA de los documentos de entrada. Son **211 entradas candidatas**,
  no 211 instituciones o datasets independientes.
- CLI de catalogación y planificación; exige salida nueva, conserva entradas.
- Plan50 con responsabilidades, diez tareas y criterios de aceptación.

## Ejecución realizada

Perfil SH **borrador**, dos necesidades 2018–2024: registro forense de homicidios
y registro policial. Cuatro candidatos evaluados: dos series locales y dos
menciones de la guía. Resultado: dos brechas; cero productos aptos según ficha;
cero adquisiciones o motores ejecutados.

La presencia/versiones de series locales se conserva. Las brechas reflejan
falta de acreditación de la ficha concreta, no ausencia demostrada de archivos
ni inutilidad del banco. No se mezclaron poblaciones, conceptos o fuentes.

Artefactos: `51_catalogo_productos_candidatos.json`,
`51_perfil_fuentes_sh_borrador.json`, `51_plan_fuentes_sh_borrador.json`.
Hashes y resumen: `52_evidencia_planificador_fuentes_politica.json`.

## Comprobaciones y límites

- Ruff check: exit0 en los dos archivos Python nuevos.
- Ruff format --check: exit0, dos archivos conformes.
- Análisis sintáctico de ambos archivos: correcto.
- CLI real `catalogar` y `planificar`: exit0.
- No se agregaron ni ejecutaron pruebas pytest en este ciclo; queda pendiente
  validar comportamiento y compatibilidad mediante la suite. No se ejecutó
  `backend:check`, que incluye pytest. Las suites históricas no certifican este código.

El planificador usa metadatos; no comprueba bytes de las series ni ejecuta
conectores. `apto_segun_ficha` no equivale a una promoción al corte. Las rutas
contienen motores solicitados, todavía sin registro ejecutable validado.

No se activó el flujo en el alta/revisión de políticas, API, scheduler ni
supervisor productivo. No se ejecutó PydanticAI: la selección estructural es
determinista; una futura propuesta por IA deberá atravesar el mismo contrato.

Siguiente tramo: FP-04/05 (fichas concretas y conectores comprobados), FP-06/07
(adquisición y corte), FP-08/09 (despacho y activación), FP-10 (pruebas y
aceptación). Segunda política pendiente de elección. Sin cambios en `src/**`,
base de datos, cortes vigentes o credenciales; sin deploy, commit ni push.
