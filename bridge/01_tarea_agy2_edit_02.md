# Tarea EDIT-02
: Dinamización y Gestión de Cronograma de Agendas de Mesas
- **Prioridad**: **MEDIA**
- **Clasificación**: Modelo de Datos & UI Management
- **Diagnóstico del Hueco**:
  - El cronograma de 43 mesas territoriales, poblacionales y sectoriales reside en una constante estática de TypeScript ([`src/features/mesas/data/agenda.data.ts:50`](file:///root/polis/src/features/mesas/data/agenda.data.ts#L50)).
  - La interfaz no ofrece mecanismos para que los facilitadores puedan reprogramar fechas, actualizar sedes comunitarias o registrar nuevas mesas sectoriales sobrevenidas.
- **Alcance Propuesto**:
  1. *Base de Datos & Backend*:
     - Crear migración Alembic para la tabla `mesas_trabajo.agendas` (o añadir campos de agenda a `mesas_trabajo.mesas`: `tipo_mesa`, `estado_programacion`, `dimensiones_asociadas`, `fecha_programada`, `horario`).
     - Exponer endpoints `GET /api/v1/mesas/agendas`, `POST /api/v1/mesas/agendas`, `PATCH /api/v1/mesas/agendas/{id}`.
  2. *Frontend*:
     - Crear panel de gestión de cronograma `agenda-editor-panel.tsx` en `src/features/mesas/panels/`.
     - Conectar vistas del geovisor y asistencia comunitaria al endpoint dinámico con fallback transparente.
- **Criterios de Aceptación**:
  - Un facilitador o autoridad distrital puede cambiar el estado de una mesa de `programada` a `reprogramada` o `en_curso` desde la UI.


## Reglas permanentes
No inventar datos; Zero-Modals; tokens semanticos; tests (pytest en polis_test, bun test); no tocar archivos de codex; commit con rutas explicitas; al terminar: tmux send-keys -t agy "He terminado EDIT-02. Documentado en 02_entrega_agy2.md y listo para auditar." Enter
