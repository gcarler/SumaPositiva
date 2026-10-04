# Tarea EDIT-04
: Configuración de Metadatos de Fichas de Indicadores Distritales
- **Prioridad**: **BAJA**
- **Clasificación**: Mejora Funcional de Seguimiento
- **Diagnóstico del Hueco**:
  - Las mediciones históricas y periódicas son 100% editables (`POST /api/v1/indicadores/fichas/{id}/mediciones`).
  - No obstante, los metadatos institucionales de la ficha (nombre de contacto técnico, dependencia distrital de enlace y fecha de actualización programada) no son editables desde la UI.
- **Alcance Propuesto**:
  1. *Backend*:
     - Exponer `PATCH /api/v1/indicadores/fichas/{id}` restringido a `autoridad_distrital`.
     - Salvaguarda: Prohibir expresamente la modificación de la fórmula matemática y la línea base histórica del DNP.
  2. *Frontend*:
     - Añadir sección colapsable "Metadatos institucionales" en `indicador-detalle-panel.tsx`.
- **Criterios de Aceptación**:
  - Se permite actualizar el enlace técnico institucional sin riesgo de alteración de fórmulas oficiales.


## Reglas permanentes
No inventar datos; Zero-Modals; tokens semanticos; tests (pytest en polis_test, bun test); no tocar archivos de codex; commit con rutas explicitas; al terminar: tmux send-keys -t agy "He terminado EDIT-04. Documentado en 02_entrega_agy2.md y listo para auditar." Enter
