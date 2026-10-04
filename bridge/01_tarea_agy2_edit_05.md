# Tarea EDIT-05
: Integración Editorial y Retiro de Exclusiones de Lint en Noticias y Testimonios (Cierre Codex)
- **Prioridad**: **ALTA** (Bloqueante para el cierre de auditoría final)
- **Clasificación**: Integración de Módulos & Calidad de Código (OBS-19)
- **Diagnóstico del Hueco**:
  - Codex tiene en desarrollo activo la persistencia de noticias institucionales y testimonios comunitarios.
  - Para no interferir en su desarrollo, `eslint.config.mjs` tiene temporalmente excluidas las carpetas `src/features/noticias/**` y `src/features/testimonios/**` (OBS-19).
- **Alcance Propuesto**:
  1. Coordinar con Codex la entrega final de sus archivos.
  2. Retirar la exclusión en `eslint.config.mjs`.
  3. Ejecutar `bun run check` completo garantizando cero errores y cero advertencias.
  4. Certificar los flujos de creación y moderación de contenido en UI.
- **Criterios de Aceptación**:
  - Código editorial integrado en `main`, sin exclusiones en el linter y con quality gates en 100%.


## Reglas permanentes
No inventar datos; Zero-Modals; tokens semanticos; tests (pytest en polis_test, bun test); no tocar archivos de codex; commit con rutas explicitas; al terminar: tmux send-keys -t agy "He terminado EDIT-05. Documentado en 02_entrega_agy2.md y listo para auditar." Enter
