# Convenciones del proyecto POLIS

Consulta `README.md`, `docs/arquitectura.md` y `docs/plan-trabajo.md` antes de cambiar
la estructura o incorporar funcionalidades.

- Frontend: `app` ensambla, `core` provee infraestructura, `shared` es independiente
  del dominio y `features/<dominio>` agrupa implementación de cada funcionalidad.
- Backend: módulos bajo `backend/app/modules`, con router, schemas, service,
  repository y models según se necesiten. Utiliza dependencias FastAPI y sesiones
  SQLAlchemy por petición. No crees carpetas o abstracciones sin uso concreto.
- Conserva tokens semánticos y navegación por paneles laterales.
- No ocultes errores TypeScript ni crees persistencia paralela en Prisma para los
  nuevos módulos; la API y sus migraciones usan PostgreSQL/PostGIS.
- Los datos de demostración deben permanecer separados de datos persistidos.
- No sobrescribas `.env`, documentos de referencia ni cambios ajenos al trabajo.
- Comprueba frontend con `bun run check` y cambios de compilación con `bun run build`.
- Comprueba backend con `bun run backend:check`; los cambios de persistencia requieren
  la prueba de integración con `POLIS_TEST_DATABASE_URL` en una base `polis_test*`.
- Transacciones: aplica `docs/transacciones.md` en todo cambio de persistencia.
  El servicio delimita el caso de uso; repositorios usan `flush` y `refresh`, nunca
  `commit` ni `rollback`. Comprueba éxito y rollback completo desde otra sesión.
- EDD: aplica `.agents/skills/polis-edd-transactions/SKILL.md` al construir persistencia.
  EAF (equipo de auditoría, también referido como AUF): aplica
  `.agents/skills/polis-eaf-transactions/SKILL.md` en cada revisión de persistencia.
- Identidad: aplicar `docs/identidad.md` al modificar usuarios, roles, login o correo.
  Probar revocación, propiedad, delegación, uso único y rollback sin enviar correo real.
- Autorización: mantener `docs/permisos-api.md`; toda ruta debe tener clasificación,
  y toda excepción pública requiere motivo y decisión de producto documentados.
  Cambiar permisos requiere pruebas de éxito, 401/403 y condiciones del recurso.
- Fuentes normativas: este archivo, `docs/arquitectura.md`, `docs/transacciones.md`
  y `docs/kit-ui-rules.md`. Los perfiles EDD/EAF aplican esas reglas; la configuración
  particular del servidor pertenece a `docs/operacion.md`.
- Independencia: el auditor de EDD hace revisión preventiva; el implementador no
  firma como evaluador independiente de su propio cambio. Checks aprobados son
  evidencia técnica, no un dictamen EAF ni autorización de despliegue.
- Equipos de trabajo (perfiles; su existencia no exige activar agentes):
  - **EDD** (Equipo de Desarrollo): `dba`, `arquitecto`, `backend`, `frontend`, `ia`, `auditor`. Ver `docs/equipo_agentes_desarrollo.md`.
  - **EAF** (Equipo de Auditoría Forense): `forense-bd`, `forense-backend`, `forense-frontend`, `forense-cicd`, `forense-ia`, `forense-legal`. Ver `docs/equipo_auditores_forenses.md`.


## POLIS UI: reglas obligatorias

Para cambios de frontend, componentes, tokens, estilos o Storybook, lee y aplica
`docs/kit-ui-rules.md`; es la fuente de las reglas del kit. La guía de composición
está en `docs/design-system.md`.

- Implementación UI: utiliza `.agents/skills/polis-ui-build/SKILL.md`.
- Revisión UI: utiliza `.agents/skills/polis-ui-review/SKILL.md`.
- Reutiliza la biblioteca en `src/shared/ui`; no crees controles o temas paralelos.
- Los cambios de UI deben pasar `bun run check` (incluye `ui:check`), las pruebas
  de historias y los builds afectados. Si cambias las guardas, ejecuta `ui:policy:test`.
- No desactives accesibilidad, inventario o comprobaciones para simular cumplimiento.
  Los cambios explícitos de reglas siguen el procedimiento de evolución del documento.
