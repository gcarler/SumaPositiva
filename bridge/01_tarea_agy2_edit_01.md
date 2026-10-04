# Tarea EDIT-01
: Persistencia Backend para Edición de Metadatos de Mesas de Trabajo
- **Prioridad**: **ALTA**
- **Clasificación**: Backend API & Frontend Data Binding
- **Diagnóstico del Hueco**:
  - En [`src/features/mesas/panels/mesa-editor-panel.tsx:291-302`](file:///root/polis/src/features/mesas/panels/mesa-editor-panel.tsx#L291-L302), cuando el usuario edita una mesa existente (`esEdicion === true`), el formulario invoca `actualizarMesa(...)` en el store Zustand del cliente.
  - La mutación actualiza la vista durante la sesión activa, pero no se transmite a la base de datos PostgreSQL porque **no existe un endpoint REST `PATCH` o `PUT` en `backend/app/modules/mesas/router.py`**.
  - Al recargar la página (`F5`), la mesa vuelve a sus valores originales de la base de datos.
- **Alcance Propuesto**:
  1. *Backend*:
     - Exponer endpoint `PATCH /api/v1/mesas/{mesa_id}` en `backend/app/modules/mesas/router.py` protegido con dependencia `requerir_permiso("mesas:abrir")`.
     - Definir schema Pydantic `MesaActualizar` con campos opcionales (`nombre`, `lugar`, `fecha`, `horario`, `aforo_esperado`, `entidad_responsable`, `facilitador_principal`).
     - Conectar con `MesaRepository.actualizar_mesa(mesa)` que ya existe implementado en [`backend/app/modules/mesas/repository.py:21`](file:///root/polis/backend/app/modules/mesas/repository.py#L21).
  2. *Frontend*:
     - Añadir función `actualizarMesaRemota(id, datos)` en `src/features/mesas/services/mesas-api.ts`.
     - Integrar la mutación asíncrona en `guardar()` dentro de `mesa-editor-panel.tsx`.
- **Criterios de Aceptación**:
  - Una edición de lugar, fecha o facilitador de una mesa persiste en la tabla `mesas_trabajo.mesas`.
  - La prueba E2E verifica que tras recargar el navegador los datos editados se conservan intactos.


## Reglas permanentes
No inventar datos; Zero-Modals; tokens semanticos; tests (pytest en polis_test, bun test); no tocar archivos de codex; commit con rutas explicitas; al terminar: tmux send-keys -t agy "He terminado EDIT-01. Documentado en 02_entrega_agy2.md y listo para auditar." Enter
