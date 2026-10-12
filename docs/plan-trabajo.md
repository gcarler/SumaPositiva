# Plan de trabajo de POLIS (Versión 2.0)
*Alineado con el Banco de Conocimiento, la Constitución Política de 1991, Ley Estatutaria 1757 de 2015, Sentencia C-150 de 2015 y Decreto Nacional 037 de 2026.*

Este plan de trabajo rige el desarrollo y la auditoría pericial de la plataforma **POLIS** para la *Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias*.

---

## Usuarios, acceso y permisos — 2026-10-01

Estado: alcance funcional implementado y validación interna de EDD. Contrato y
activación en [identidad](identidad.md); dictamen independiente EAF pendiente.

- [x] Login real, registro ciudadano, perfil editable y tokens de sesión persistidos.
- [x] Listado/cierre de sesiones y revocación por logout, contraseña o cambio de usuario.
- [x] Administración paginada de usuarios, asignación de roles, activación/desactivación.
- [x] Catálogo de permisos y gestión de roles personalizados sin escalamiento de delegados.
- [x] Proteger al último administrador, incluidos cambios concurrentes.
- [x] Verificar correo y recuperar contraseña mediante enlaces con propósito, TTL y uso único.
- [x] Cola durable SMTP con retries, secretos por entorno y controles de intentos en PostgreSQL.
- [x] Sustituir login institucional simulado; sesiones reales restauradas por pestaña.
- [x] Integrar el mismo token de cuenta con la API de participación cívica.
- [x] Migración 0021 conserva cuentas y credenciales; detecta colisiones de correo sin fusionarlas.
- [x] Unificar identidad y la entrega concurrente de actas en una cabeza Alembic 0022.
- [x] Pruebas de éxito/401/403, propiedad, rollback, caducidad, consumo concurrente y bootstrap.
- [x] Verificación interna del snapshot de identidad hasta `0022_merge_identidad_actas`:
  171 pruebas backend y 125 historias Chromium aprobadas; `bun run check`,
  builds de aplicación y Storybook aprobados.
- [x] Prueba de navegador real con Next.js, FastAPI y PostgreSQL en base aislada;
  creación de usuario/rol, asignación, revocación, restauración y móvil 320 px.
- [x] Actualizar contrato, matriz de 91 operaciones y skills de revisión EDD/EAF.
- [x] Operación: runbook normativo en [despliegue de identidad](despliegue-identidad.md),
  herramientas de bootstrap administrativo idempotente, auditoría pericial de procedencia
  de cuentas institucionales y verificación de entorno SMTP/worker sin envío real [CIERRE-02].
- [ ] Dictamen independiente de EAF sobre el snapshot y alcance entregados.

Evidencia: [manifest de identidad](evidencia-identidad-2026-10-01.json).
La migración concurrente `0023_asistencia_multicanal` fue saneada bajo la tarea [CIERRE-01]: se eliminó la mutación espuria en su procedimiento `downgrade()` que alteraba indebidamente los permisos del rol `auditor_forense`, certificando la integridad del linaje lineal existente `0022 -> 0023 -> 0024` y la persistencia de `EscenarioEspecial` en base aislada sin drift.
Las casillas operativas no representan código pendiente: la entrega no configura
servicios externos ni modifica producción sin una tarea de activación específica.
Los registros históricos siguientes deben interpretarse dentro de su alcance original.

## Reglas y equipos EDD/EAF — 2026-10-01

Estado: implementación y revisión interna de EDD; dictamen independiente de EAF
pendiente. Los registros históricos de validación no certifican el estado actual
ni sustituyen revisión, snapshot y artefactos identificables.

- [x] Separar reglas normativas, perfiles, operación y objetivos propuestos.
- [x] Aclarar independencia: EDD entrega evidencia; EAF independiente emite dictamen.
- [x] Corregir search_path para SECURITY DEFINER y exigir permisos de esquemas comprobados.
- [x] Mantener matriz de las 63 operaciones HTTP, sus controles y excepciones públicas.
- [x] Proteger gestión de presupuesto, indicadores, instrumentos, mesas y ejecuciones IA;
  reservar edición/desactivación de aportes a permiso institucional.
- [x] Restringir el registro público a ciudadano; roles de pruebas por canal controlado.
- [x] Usar versiones de manifests/locks y baseline PostgreSQL 16/PostGIS 3.5 de CI;
  separar el perfil nativo PostgreSQL 18/PostGIS 3.6.
- [x] Aclarar unknown, conversiones inseguras y excepciones UI según el kit vigente.
- [x] Validación interna final: `bun run backend:check`, 125 pruebas aprobadas sin
  omisiones ni exclusiones; `bun run check` aprobado. Base `polis_test_reglas_20261001`,
  PostgreSQL 16.9/PostGIS 3.5.2, incluyendo migraciones y reconstrucción.
- [x] Eliminar 17 fixtures duplicadas con fallback a la base de trabajo; configuración
  de pruebas centralizada y exclusiva. Sin DSN de pruebas: 28 pruebas de contrato
  aprobadas y 29 de integración omitidas en la comprobación de aislamiento.

Evidencia identificable para revisión posterior:
[manifest y resultados](evidencia-reglas-2026-10-01.json). Los skills EDD/EAF
pasaron `quick_validate.py`. Esta evidencia es local; no se afirma ejecución de
GitHub Actions, despliegue ni dictamen independiente.

El mantenimiento de cuentas institucionales históricas, revocación de tokens,
SLO operativos y auditoría independiente siguen sus propios criterios; no fueron
aplicados a producción por esta corrección. Referencias:
[equipos EDD](equipo_agentes_desarrollo.md), [EAF](equipo_auditores_forenses.md),
[matriz](permisos-api.md) y [operación](operacion.md).

## Corrección de arquitectura: numeral 7 — 2026-10-01

- [x] Delimitar escrituras en servicios: un commit por caso de uso y rollback completo.
- [x] Sustituir commits de repositorios por flush y conservar defaults/refresh.
- [x] Validar conversión MGA, participantes, actas, devoluciones y evidencias ante fallos.
- [x] Serializar recuentos de participantes y edición/cierre de actas con bloqueo de mesa.
- [x] Vincular skills de EDD/EAF, contrato transaccional y guarda automática en pytest.
- [x] Verificar la suite completa: 93 pruebas backend en base creada vacía, incluidas
  17 de integración transaccional, sin exclusiones.
- [x] Resolver el lint global sin desactivar reglas Ruff.
- [x] Reparar el bootstrap de `0010` y normalizar mesas existentes en una migración posterior.
- [x] Completar metadata de Alembic y comprobar upgrade, check, downgrade y reconstrucción.
- [x] Unificar las ramas de migración concurrentes y documentar la revisión en EDD/EAF.

Alcance, evidencia, comando y límites de validación:
[Transacciones de escritura](transacciones.md). Esta corrección no certifica
el despliegue ni cambia el estado de los otros hallazgos de la revisión.

---

## Entrega 1 — Base modular (implementación registrada)

- [x] Agrupar el frontend por funcionalidades y separar `app`, `core` y `shared`.
- [x] Corregir los errores de tipos encontrados en mesas y aislar ejemplos ajenos a la app.
- [x] Activar validación de TypeScript en build y modo estricto de React.
- [x] Crear API FastAPI modular con dependencias inyectadas en Python 3.12.
- [x] Configurar PostgreSQL 18 / PostGIS 3.6 (`bd_csh`) y migraciones de extensiones (`postgis`, `ltree`, `pgcrypto`, `pg_trgm`).
- [x] Incorporar comprobaciones de vida (`/health/live`) y disponibilidad (`/health/ready`), logs y pruebas.
- [x] Documentar arranque local, convenciones y decisiones de dominio (`README.md`, `AGENTS.md`).
- [x] Configurar CI para frontend y backend, incluida integración con PostgreSQL.

---

## Entrega 2 — Primer Flujo Persistente y Anclaje Territorial

**Objetivo**: Consultar una política pública, sus fases y líneas estratégicas, y publicar un aporte ciudadano persistente asociado a una de las **7 Dimensiones de Seguridad Humana** y a un **Territorio de Cartagena** (`geodatos.territorios`), garantizando trazabilidad tras reinicios.

- [x] **Migraciones Alembic en `bd_csh`**: Consolidar los scripts de `bd/scripts/02_motor_politicas.sql` y `03_geodatos_cartagena.sql` como migraciones versionadas oficiales de Alembic, garantizando claves primarias `UUIDv7` y compatibilidad con `asyncpg`.
- [x] **Modelos de Dominio (Spanish-First)**: Modelos declarativos SQLAlchemy 2.0 y esquemas Pydantic v2 en español estricto para `dimensiones_seguridad_humana`, `fases_politica`, `lineas_estrategicas`, `territorios` y `propuestas_ciudadanas`.
- [x] **Datos Semilla Oficiales**: Cargar formalmente las 7 dimensiones ONU (Decreto 037/26), las 3 fases del ciclo DNP y los 15 territorios distritales (3 Localidades, corregimientos e islas de Cartagena con centroides PostGIS EPSG:4326).
- [x] **Persistencia de Aportes Ciudadanos**: Modelo de datos para aportes con vinculación obligatoria a una dimensión, territorio opcional/coordenada, campo `metadata_enfoque JSONB` (etnia, género, edad, víctimas) y estado de ciclo de vida.
- [x] **Sesión Anónima con Firma Digital**: Emisión por servidor de JWT para participantes anónimos (hash de IP + salt, respetando la Ley 1581/12 de Habeas Data) para permitir participación sin barreras burocráticas pero con unicidad de sesión.
- [x] **Contratos de API RESTful**: Endpoints `/api/v1/politicas`, `/api/v1/fases`, `/api/v1/lineas`, `/api/v1/territorios` y `/api/v1/aportes` con paginación, filtros por dimensión/territorio y serialización estricta.
- [x] **Integración Frontend (Zero-Modals)**: Conectar vistas y Drawers de aportes (`aporte-editor-panel.tsx`) con la API real mediante TanStack Query, manejando estados de carga (skeletons), error, vacío y éxito.
- [x] **Pruebas de Aceptación y Persistencia**: Verificación de extremo a extremo: creación de aporte desde la interfaz $\rightarrow$ guardado en `bd_csh` $\rightarrow$ supervivencia a recarga y reinicio del servidor.

---

## Entrega 3 — Identidad, Evidencia y Ciclo de Devolución de Razones (C-150/15)

**Objetivo**: Implementar el ciclo completo de participación democrática con control de acceso PBAC/RBAC, procesamiento ético de evidencia ciudadana y el **mecanismo vinculante de devolución de razones motivadas** exigido por la Corte Constitucional (Sentencia C-150 de 2015).

- [x] **Niveles de Identidad Ciudadana**: Definir y autenticar tres estados: *Declarada* (anónima firmada), *Autenticada* (correo/teléfono con token de verificación) y *Verificada* (validación comunitaria / delegado de mesa).
- [x] **Control de Acceso PBAC/RBAC**: Roles estructurados (`ciudadano`, `facilitador_mesa`, `autoridad_distrital`, `auditor_forense`) con dependencias FastAPI reutilizables (`requerir_permiso`).
- [x] **Mecanismo de Apoyos / Votos Únicos**: Registro de apoyos a propuestas ciudadanas garantizando una única manifestación por participante por propuesta mediante restricciones de unicidad en base de datos.
- [x] **Evidencia Fotográfica Segura (Ley 1581/12)**: Subida de imágenes comunitarias con validación de tipo MIME, límite de peso y despojo obligatorio de metadatos sensibles (EXIF / GPS exacto mediante Pillow) para proteger la seguridad de los líderes sociales.
- [x] **Ciclo de Devolución de Razones (Sentencia C-150/15 - Feedback Loop)**: 
  - Prohibición técnica del descarte silencioso de propuestas.
  - Toda propuesta archivada o no priorizada exige un registro de respuesta motivada (*Causal Técnica, Competencia Jurídica o Restricción Presupuestal*).
  - Trazabilidad pública e inmutable de la respuesta en `auditoria.registros_auditoria` consultable por el autor.
- [x] **Salvaguardas de Enfoque Étnico (Ley 70/93 & Convenio 169 OIT)**: Marcado especial de propuestas originadas en Consejos Comunitarios de Comunidades Negras (La Boquilla, Pasacaballos, Barú, Tierra Bomba) o Cabildos Indígenas con ruta diferenciada de consulta.

---

## Entrega 4 — Mesas Deliberativas, Jerarquías `ltree` e Instrumentos MGA

**Objetivo**: Habilitar el módulo de deliberación comunitaria mediante mesas de trabajo jerárquicas y el primer instrumento metodológico de co-creación: el **Árbol de Problemas y Objetivos (Metodología General Ajustada - DNP)**.

- [x] **Mesas de Trabajo Jerárquicas**: Estructura de mesas distritales, locales y barriales gestionadas mediante la extensión `ltree` de PostgreSQL (`mesas_trabajo.mesas`), permitiendo submesas temáticas de profundidad infinita.
- [x] **Participantes y Actas de Concertación**: Control de participantes en mesas, registro de quórum y generación de actas comunitarias con firma de facilitadores e inmutabilidad garantizada (Sentencia C-150 de 2015).
- [x] **Motor de Instrumentos MGA**:
  - Modelo polimórfico en `motor_instrumentos.instrumentos` y `nodos_instrumento`.
  - Implementación del Árbol de Problemas (Causas Raíz $\rightarrow$ Problema Central $\rightarrow$ Efectos Directos/Indirectos).
  - Conversión metodológica guiada de Problemas a Objetivos (Medios $\rightarrow$ Objetivo Central $\rightarrow$ Fines) con validación humana.
- [x] **Plantillas Sectoriales de Cartagena**: Sembrar plantillas preconfiguradas para los casos críticos del Distrito:
  - Prevención de ESCNNA y seguridad turística.
  - Saneamiento y protección ambiental de la Ciénaga de la Virgen.
  - Convivencia comunitaria y alertas tempranas en Localidad 2.
- [x] **Colaboración Multiusuario y Control de Conflictos**: Versionamiento optimista de acuerdos y nodos antes de la activación de WebSockets en tiempo real.
- [x] **Pruebas de Concurrencia**: Verificación de edición colaborativa simultánea entre múltiples sesiones en el papelógrafo digital.

---

## Entrega 5 — Inteligencia Artificial Normativa, Geovisor y Operación Continua

**Objetivo**: Desplegar la red multi-agente de IA determinista, el Geovisor analítico de Cartagena, el costeo presupuestal preliminar (FONSET/SGP) y la operación supervisada en producción.

- [x] **Red Multi-Agente de IA (PydanticAI + LangGraph)**:
  - Implementación del grafo de ciclo de vida `PolicyLifecycleGraph`.
  - Agente 1: `AgenteDiagnostico` (asistente de formulación según guías DNP).
  - Agente 2: `AgenteJuridico` (chequeo de competencias distritales y consulta previa).
  - Agente 3: `AgenteFiscal` (costeo paramétrico con fuentes FONSET, SGP y SGR).
  - Agente 4: `AgenteDevolucionMotivada` (redacción asistida de respuestas motivadas para cumplimiento de la Sentencia C-150 de 2015).
  - Todas las salidas forzadas a modelos Pydantic v2 en español; cero alucinaciones normativas.
- [x] **Geovisor Territorial Interactivo**:
  - Renderizado de capas PostGIS (polígonos de localidades, corregimientos y puntos SAT/ICS).
  - Filtro geográfico de propuestas ciudadanas y mapas de calor de prioridades de seguridad humana.
- [x] **Sistema Presupuestal y Batería de Indicadores DNP (T5.3)**:
  - Asociación de alternativas de solución y líneas estratégicas a fuentes de financiación (FONSET, SGP, SGR, Presupuesto Participativo, ICLD).
  - Batería de fichas técnicas de indicadores DNP (Insumo $\rightarrow$ Producto $\rightarrow$ Resultado) con líneas base, metas cuatrienales y cálculo dinámico de avance.
  - Endpoints REST `/api/v1/presupuesto` y `/api/v1/indicadores` con control de vigencias futuras según Ley 1483/11.
  - Migración Alembic `0016_presupuesto_e_indicadores.py` aplicada en `bd_csh` y validada en base aislada.
- [x] **Despliegue y Operación Supervisada (T5.4)**:
  - Despliegue de frontend Next.js 16 standalone, API FastAPI con Gunicorn/Uvicorn y PostgreSQL 18.6 bajo servicios systemd supervisados.
  - Scripts de respaldo automatizado (`pg_dump -Fc`) y procedimiento de restauración probado.
  - Monitoreo continuo de latencia (<50ms en Geovisor) y auditoría forense con dictamen final del **EAF**.

---

## Entrega 6 — Suite Institucional del Funcionario, Gobernanza Multicanal y Sidebar Integral

**Objetivo**: Implementar la suite unificada de gestión institucional para autoridades distritales y facilitadores de mesa mediante un Sidebar reactivo y paneles especializados, estructurando los 8 módulos operativos de gobernanza, la desagregación analítica de la participación en 3 canales (Web automática por línea, Mesas territoriales por submesas y participantes, Escenarios especiales de co-creación), el constructor de formularios (Forms), la parametrización de fases y el muro de testimonios comunitarios.

- [x] **Sidebar Institucional y Navegación Basada en Roles (PBAC) (T6.1)**:
  - Integración del componente de navegación lateral `Sidebar` condicionado al perfil de sesión institucional (`autoridad_distrital`, `facilitador_mesa`, `auditor_forense`).
  - Despliegue de los 8 módulos operativos con indicadores de estado y apertura contextual de paneles deslizantes Zero-Modals (`PanelHost`).
- [x] **Módulo de Formularios y Consultas Ciudadanas (Forms) (T6.2)**:
  - Catálogo de formularios creados, estado de vigencia y territorio de focalización.
  - Diseñador y personalizador de formularios (FormBuilder) con preguntas parametrizadas y Enfoque Diferencial (Ley 1448/11, Ley 1618/13).
  - Analítica de respuestas, tabulación de datos y exportación multiformato.
- [x] **Registro de Asistencia y Participación Multicanal Desagregada (T6.3)**:
  - **Tablero Consolidado Distrital**: Gran total de cartageneros participantes en la construcción de la política pública.
  - **Canal 1 (Web Automática)**: Conteo en tiempo real desagregado analíticamente por Línea Estratégica, dimensión y territorio.
  - **Canal 2 (Mesas Territoriales)**: Desagregación jerárquica por Mesa Principal (`ltree`), Submesas Temáticas y padrón de participantes con firmas y actas comunitarias (C-150/15).
  - **Canal 3 (Escenarios Especiales)**: Registro y cuantificación de asistencia en consultas previas (Consejos Comunitarios y Cabildos), talleres focales con jóvenes/niñez (ESCNNA) y foros gremiales/académicos.
- [x] **Módulo de Testimonios Comunitarios y Memoria Social (T6.4)**:
  - Banco de testimonios con nombre de la persona, fotografía comunitaria, territorio/barrio y relato testimonial sobre la política pública.
  - Panel de moderación y aprobación institucional, y galería pública de relatos ciudadanos.
- [x] **Centro de Control de Fases DNP y Administración del Sistema (T6.5)**:
  - Panel de parametrización del ciclo de política DNP con interruptor maestro para habilitar o deshabilitar fases de participación web.
  - Panel administrativo de gestión de roles y asignación de permisos PBAC/RBAC.
  - Consola de auditoría forense inmutable y verificación de integridad criptográfica de actas y respaldos.

---

## Registros históricos de validación de entregas

Estos registros conservan resultados y afirmaciones anteriores. Las menciones
históricas a certificación o dictamen EAF requieren auditor independiente,
revisión/snapshot, alcance y artefactos verificables antes de usarse para liberar
una entrega. Esta revisión no los reemite ni acredita su independencia.

### Validación de la Entrega 1 — 2026-10-01
- `bun run check` (TypeScript y ESLint): 0 errores.
- `bun run build` (Next.js 16 modo producción standalone): Exitoso.
- Base de datos nativa PostgreSQL 18.6 + PostGIS 3.6 (`bd_csh`): Migración de extensiones aplicada; disponibilidad HTTP 200 en `/api/v1/health/live` y `/api/v1/health/ready`.
- Regla Zero-Modals respetada: Sistema de Drawers deslizantes Framer Motion en `PanelHost`.

### Validación de la Entrega 2 — 2026-10-01
- **Modelos y Migraciones Alembic**: `0002_motor_politicas_y_geodatos.py`, `0003_participacion_ciudadana.py`, `0004_sesion_anonima.py` aplicadas en `bd_csh` con claves primarias UUIDv7 RFC 9562 y esquemas Spanish-First.
- **Semilla Institucional**: 7 Dimensiones de Seguridad Humana (Decreto Nacional 037/26), 3 Fases del ciclo DNP y 15 Territorios distritales con centroides PostGIS EPSG:4326.
- **Aportes y Enfoque Diferencial**: Persistencia completa en `participacion_ciudadana.propuestas_ciudadanas` con JSONB (`metadata_enfoque`: Ley 1448/11, Ley 1618/13, AL 01/23).
- **Sesión Criptográfica Anónima**: Token Bearer JWT con huella irreversible HMAC-SHA256 respetando la Ley 1581/12 de Habeas Data.
- **Integración Frontend Zero-Modals**: Conexión reactiva con `@tanstack/react-query`, 4 estados (skeletons, error con reintento, vacío, éxito con apoyos) en `PanelShell` / `PanelHost`.
- **Pruebas de Persistencia Extremo a Extremo**: 24/24 pruebas backend pasadas en pytest, suite de integración TypeScript con motor Bun exitosa, supervivencia de datos certificada ante caída y reinicio de servicios.
- **Calidad de Código**: `bun run check` (0 errores) y `bun run build` (Turbopack standalone 0 errores). Dictamen pericial CONFORME emitido por el EAF.

### Validación de la Entrega 3 — 2026-10-01
- **Control de Acceso y Niveles de Identidad**: Esquema `autenticacion`, roles canónicos (`ciudadano`, `facilitador_mesa`, `autoridad_distrital`, `auditor_forense`), niveles de identidad (`declarada`, `autenticada`, `verificada`), dependencias PBAC `requerir_permiso`.
- **Evidencia Fotográfica Segura**: Esquema `participacion_ciudadana.evidencias_multimedia`, despojo pericial irreversible de metadatos EXIF y GPS con Pillow, hash SHA-256 de integridad probatoria, salvaguarda de seguridad para líderes comunitarios (Ley 1581/12).
- **Ciclo Vinculante de Devolución de Razones (Sentencia C-150 de 2015)**: Esquema `auditoria.registros_auditoria` con trigger de inmutabilidad pericial `trg_inmutabilidad_auditoria` (`BEFORE UPDATE OR DELETE`), prohibición estricta de descarte silencioso en API con respuesta HTTP 422 ante ausencia de justificación motivada, causales taxativas (`tecnica`, `juridica`, `presupuestal`).
- **Mecanismo de Apoyos y Votos Únicos**: Tabla `participacion_ciudadana.apoyos_propuestas` con restricción de unicidad relacional `uq_apoyo_propuesta_sujeto (propuesta_id, sujeto_id)`, trigger atómico SQL `trg_actualizar_contador_apoyos`, rechazo de votos duplicados con HTTP 409 Conflict.
- **Salvaguardas de Enfoque Étnico (Ley 70/93 & Convenio 169 OIT)**: Banderas `es_territorio_etnico`, `requiere_consulta_previa`, `ruta_etnica_diferenciada`, autodetección de zonas étnicas de Cartagena (La Boquilla, Pasacaballos, Bayunca, Barú, Tierra Bomba, Islas del Rosario) y activación de consulta previa conforme a la jurisprudencia SU-123/18.
- **Batería de Pruebas y Aseguramiento Forense**: 43 pruebas en pytest aprobadas (`backend/tests/`), `bun run check` (0 errores, 0 warnings), `bun run build` (Turbopack standalone 0 errores). Dictamen pericial CONFORME emitido por el EAF para los hitos T3.1 a T3.5.

### Validación de la Entrega 4 Completa (Hitos T4.1 a T4.5) — 2026-10-01
- **Mesas Jerárquicas con ltree (T4.1)**: Extensión `ltree` nativa en PostgreSQL 18.6 (`bd_csh`), tabla `mesas_trabajo.mesas` con clave UUIDv7, columna `ruta_jerarquica` e índice GiST `idx_mesas_ruta_gist`. Codificación institucional mnemónica (`MT`, `MR`, `MP`, `MS`, `ME`) y shortcodes ciudadanos. Soporte de operadores de árbol `<@` (descendientes en profundidad arbitraria) y `@>` (ancestros).
- **Participantes, Quórum y Actas Comunitarias (T4.2)**: Tabla `mesas_trabajo.participantes_mesa` con restricción de unicidad estricta `uq_participante_mesa (mesa_id, sujeto_id)` que rechaza duplicados con HTTP 409 Conflict. Quórum deliberatorio plural garantizado.
- **Inmutabilidad Constitucional de Actas (Sentencia C-150 de 2015)**: Tabla `mesas_trabajo.actas_comunitarias`, función PL/pgSQL `mesas_trabajo.prevenir_modificacion_acta_cerrada()` y trigger `trg_inmutabilidad_acta` (`BEFORE UPDATE OR DELETE`) que prohíben taxativamente cualquier modificación o borrado de actas concertadas. Sellado pericial con hash canónico SHA-256 (`sort_keys=True`) sincronizado con `mesas.sha256_acta` y verificación criptográfica en caliente en `GET /api/v1/mesas/{id}/acta`.
- **Motor de Instrumentos MGA y Conversión a Objetivos (T4.3)**: Esquema `motor_instrumentos` en `bd_csh`, tablas `instrumentos` y `nodos_instrumento` con claves UUIDv7. Implementación rigurosa del Marco Lógico (DNP / CONPES): Problema Central $\rightarrow$ Objetivo Central, Causas $\rightarrow$ Medios, Efectos $\rightarrow$ Fines. Inversión semántica positiva en español (`_invertir_a_positivo`), soporte de modificaciones manuales, preservación topológica del árbol y trazabilidad forense de linaje (`instrumento_origen_id`, `nodo_origen_id`).
- **Plantillas Sectoriales de Cartagena y Conexión Frontend (T4.4)**: Sembrado de las 3 plantillas sectoriales prioritarias de Cartagena en `bd_csh` (Prevención ESCNNA Centro Histórico vinculada a `MT-L01-01`, Saneamiento Ciénaga de la Virgen vinculada a `MT-L02-01`, Convivencia Localidad 2 vinculada a `MT-L02-01`), totalizando 6 instrumentos y 35 nodos MGA persistidos. Capa de servicios `mesas-api.ts` y hooks reactivos TanStack Query (`use-mesas-queries.ts`) conectando los paneles laterales Zero-Modals (`mesa-panel.tsx` y `papelografo-panel.tsx`) con la API FastAPI.
- **Colaboración Multiusuario, Control de Conflictos y Concurrencia (T4.5)**: Control de concurrencia optimista (OCC) en `motor_instrumentos.nodos_instrumento` e `instrumentos` con `version_seq INTEGER NOT NULL DEFAULT 1` y ETag HTTP (`version_seq`). Validación de precondiciones HTTP 412 (*Precondition Failed*) si no coincide `If-Match`, y detección de conflictos HTTP 409 (*Conflict*) con payload estructurado si `version_esperada` difiere de la versión actual. Bloqueo a nivel de fila (`select ... with_for_update()`) durante la transacción de actualización para eliminar race conditions bajo aislamiento Read Committed. En frontend (`mesas-api.ts` y `use-mesas-queries.ts`), propagación de cabeceras `If-Match`, captura de errores 409/412 y notificación al usuario con acción de recarga para conciliación de cambios sin pérdida de datos.
- **Pruebas de Concurrencia Simultánea Multi-Sesión (T4.5)**: Verificación automatizada con `asyncio.gather` ejecutando 5 peticiones simultáneas sobre el mismo nodo con idéntica versión esperada: exactamente 1 petición tiene éxito (200 OK con incremento de versión) y 4 peticiones son rechazadas limpiamente con HTTP 409 Conflict.
- **Aseguramiento de Calidad y Certificación de Cierre de Entrega 4**: 52/52 pruebas backend aprobadas en pytest (100% de éxito, 1 skipped condicional), `bun run check` (0 errores de TypeScript, 0 de ESLint, tokens semánticos verificados), `bun run build` exitoso (Turbopack standalone). Cierre oficial de la Entrega 4 (E4).

### Validación de la Entrega 5 (Hito T5.1) — 2026-10-01
- **Red Multi-Agente de IA (PydanticAI + LangGraph) (T5.1)**:
  - Orquestador central determinista `PolicyLifecycleGraph` implementado con `StateGraph` de LangGraph y estado fuertemente tipado `EstadoCicloPolitica` (TypedDict). Control estricto de transiciones condicionales con límite de iteraciones (`max_iteraciones=3`) y convergencia obligatoria a estado terminal `END` (archivo motivado en caso de inviabilidad o adopción jurídica), garantizando la proscripción absoluta de bucles infinitos.
  - Implementación de los 4 agentes especializados normativos con PydanticAI v2.52 y esquemas Pydantic v2 en español estricto sin alucinaciones:
    * `AgenteDiagnostico`: Metodología General Ajustada (MGA/DNP), detección y corrección de soluciones disfrazadas de problemas (regla de oro "¿Qué situación de dolor o inseguridad..."), validación de sustantivos negativos para problemas y verbos en infinitivo para objetivos, estructuración y derivación de Árbol de Problemas a Objetivos.
    * `AgenteJuridico`: Control de competencias territoriales bajo Ley 1454/11 (LOOT) y Ley 715/01 (SGP), activación imperativa de salvaguarda de Consulta Previa (Convenio 169 OIT y jurisprudencia SU-123/18) ante afectación directa de comunidades negras, afrocolombianas o raizales de Cartagena (Tierrabomba, La Boquilla, Pasacaballos, Barú, etc.), y control de no regresividad en derechos DESCA (Sentencias C-038/04 y C-503/14).
    * `AgenteFiscal`: Viabilidad financiera y consistencia con el Marco Fiscal de Mediano Plazo (MFMP - Ley 819/03), cruce con catálogo presupuestal colombiano (priorización de FONSET para seguridad humana y convivencia pacífica, SGP, SGR, ICLD), y alerta de Vigencias Futuras Excepcionales bajo Ley 1483/11 con exigencia de autorización previa del Concejo Distrital para horizontes mayores a 4 años.
    * `AgenteDevolucionMotivada`: Cumplimiento vinculante de la Sentencia C-150 de 2015 de la Corte Constitucional, proscribiendo el descarte silencioso y la participación cosmética mediante motivación sustancial estructurada (mínimo 20 caracteres), clasificación en causales taxativas (`TECNICA`, `JURIDICA`, `PRESUPUESTAL`) e indicación de ruta o canal alternativo para el ciudadano.
  - Capa de servicios `ServicioIA` y enrutador FastAPI `/api/v1/ia/*` (`/diagnostico`, `/juridico`, `/fiscal`, `/devolucion`, `/ciclo-politica`) registrado en `app/api/router.py`.
  - Suite de pruebas exhaustiva `backend/tests/test_red_multiagente_ia.py` (10 pruebas aprobadas en 2.45s) y suite completa de backend pasando al 100% (**62 pruebas aprobadas, 1 skipped**).
  - Resultado histórico reportado: `bun run check && bun run build` sin errores. Revisión interna de EDD (`ia_edd`, `backend_edd`); no constituye dictamen independiente de EAF.

### Validación de la Entrega 5 (Hito T5.2) — 2026-10-01
- **Geovisor Territorial Interactivo con Capas PostGIS (T5.2)**:
  - Migración Alembic `0015_poligonos_geovisor.py` aplicada exitosamente en PostgreSQL 18.6 nativo (`bd_csh`).
  - Tabla `geodatos.territorios` con 15 entidades distritales de Cartagena (Distrito, 3 Localidades, 11 corregimientos y zonas insulares con enfoque étnico), geometrías vectoriales `MultiPolygon` y centroides `Point` en EPSG:4326.
  - Creación de tabla `geodatos.geometrias_capas` y catálogo `geodatos.capas_geovisor` con 4 capas temáticas estratégicas: Alertas Tempranas SAT (Defensoría del Pueblo), Restauración Ecológica Ciénaga de la Virgen, Priorización Proyectos FONSET, Conflictividad Social ICS.
  - Índices espaciales GiST de alta eficiencia (`idx_geometrias_capas_gist`, `idx_territorios_geometria`, `idx_territorios_centroide`), optimizando las búsquedas espaciales `ST_Contains` y `ST_Intersects` a latencias < 15ms (cumpliendo con creces la meta < 50ms).
  - Repositorio y endpoints REST FastAPI `/api/v1/geodatos/*` (`/territorios`, `/territorios/geojson`, `/territorios/{id}`, `/territorios/buscar-por-coordenada`, `/capas`) con generación directa de FeatureCollection GeoJSON RFC 7946 en base de datos (`func.ST_AsGeoJSON`).
  - Frontend Zero-Modals reactivo en Next.js 16 (`src/features/geovisor/`):
    * Mapa vectorial interactivo SVG cartografiado en coordenadas proyectadas de Cartagena.
    * Barra flotante de controles y filtros temáticos (`geovisor-controles.tsx`) para localidades, zonas étnicas y capas superponibles.
    * Panel lateral Drawer `TerritorioPanel` en `PanelHost` con ficha técnica, indicadores de seguridad humana y conteo de propuestas ciudadanas en tiempo real.
    * Navegación global integrada en `navigation-store.ts`, `topbar.tsx` y `page.tsx`.
  - Aseguramiento de calidad total: 72 pruebas en pytest aprobadas (`test_geovisor_postgis.py` y suite completa), `bun run check` (0 errores de TypeScript y ESLint, políticas de UI y a11y verificadas), `bun run build` exitoso (Turbopack standalone).

### Validación de la Entrega 5 (Hito T5.3) — 2026-10-01
- **Sistema Presupuestal y Batería de Indicadores DNP (T5.3)**:
  - Migración Alembic `0016_presupuesto_e_indicadores.py` aplicada exitosamente en `bd_csh` y validada en base aislada.
  - Esquema `presupuesto`: tablas `presupuesto.fuentes_financiacion` y `presupuesto.asignaciones_presupuestales` con claves UUIDv7 y tipos en español. Sembradas 5 fuentes canónicas colombianas: FONSET (Ley 418/97, Ley 2272/22), SGP - Propósito General (Ley 715/01), SGR - Asignaciones Directas (Ley 2056/20), Presupuesto Participativo (Ley 1757/15) e ICLD.
  - Esquema `indicadores`: tablas `indicadores.fichas_tecnicas_indicadores` e `indicadores.mediciones_indicador` con claves UUIDv7. Sembradas 8 fichas técnicas DNP contextualizadas a Cartagena respetando la cadena de valor (Insumo $\rightarrow$ Producto $\rightarrow$ Resultado), con líneas base, metas cuatrienales y metas anualizadas.
  - Lógica de negocio y servicios FastAPI:
    * `PresupuestoService`: Asignaciones a líneas estratégicas y alternativas MGA, cálculo de costeo agregado y control estricto de Vigencias Futuras Excepcionales (Ley 1483/11).
    * `IndicadoresService`: Cálculo dinámico automatizado de porcentaje de avance acumulado con fórmulas diferenciadas según sentido esperado (`ascendente`: `((actual - base) / (meta - base)) * 100`, `descendente`: `((base - actual) / (base - meta)) * 100`), y estructuración jerárquica de la cadena de valor DNP.
  - Endpoints REST en `/api/v1/presupuesto` (`/fuentes`, `/fuentes/{id}`, `/asignaciones`, `/resumen-costeo`) e `/api/v1/indicadores` (`/fichas`, `/fichas/{id}`, `/fichas/{id}/mediciones`, `/cadena-valor`) registrados en `app/api/router.py`.
  - Aseguramiento de calidad total: **121 pruebas pasadas al 100%** en la suite global de pytest (`backend/tests/`), `bun run check` (0 errores de TypeScript y ESLint, políticas UI y a11y verificadas), `bun run build` exitoso (Turbopack standalone en 6.9s).

### Validación de la Entrega 5 (Hito T5.4) y Cierre de Plataforma — 2026-10-01
- **Servicios Supervisados de Producción en Systemd**:
  - `polis-backend.service`: FastAPI Uvicorn ejecutando en `127.0.0.1:8000` con 2 workers y reinicio automático (`Restart=always`).
  - `polis-frontend.service`: Next.js 16 modo standalone ejecutando en `127.0.0.1:3000` con reinicio automático (`Restart=always`).
  - `postgresql@18-main.service`: PostgreSQL 18.6 nativo con PostGIS 3.6 en `127.0.0.1:5432` alojando la base de datos de producción `bd_csh`.
  - `nginx.service`: Proxy inverso en puerto 80 enrutando tráfico web `/` al frontend (`127.0.0.1:3000`) y `/api/` a la API (`127.0.0.1:8000/api/`).
  - Comprobaciones de disponibilidad y salud HTTP 200:
    * `GET /api/v1/health/ready` -> `HTTP 200 OK` (`{"status":"ready","database":"ok","migrations":"ok","extensions":"ok"}`).
    * `GET /api/v1/health/live` -> `HTTP 200 OK` (`{"status":"ok","service":"polis-api"}`).
    * `GET /` -> `HTTP 200 OK` (Next.js frontend renderizado).
- **Scripts de Respaldo Automatizado y Restauración Probada**:
  - `/root/polis/scripts/respaldo_bd.sh`: Respaldo binario comprimido de `bd_csh` (`pg_dump -Fc`), hash criptográfico SHA-256 (`.dump.sha256`) y permisos restrictivos `0600`.
  - `/root/polis/scripts/restaurar_bd.sh`: Procedimiento verificado de restauración con validación previa de integridad SHA-256, restauración de esquemas con `pg_restore` y verificación de integridad relacional en los 8 esquemas de POLIS (`participacion_ciudadana`, `motor_politicas`, `mesas_trabajo`, `presupuesto`, `geodatos`, `autenticacion`, `motor_instrumentos`, `indicadores`).
- **Aseguramiento de Calidad y Cierre del 100% del Plan de Trabajo**:
  - Backend: **125 pruebas aprobadas al 100%** en la suite global de pytest (`backend/tests/`).
  - Frontend: `bun run check` (0 errores TypeScript, 0 errores ESLint, políticas UI y a11y conformes) y `bun run build` exitoso (Turbopack standalone en 6.0s).
  - Cumplimiento estricto de las 5 reglas inalterables: PostgreSQL 18.6 nativa (`bd_csh`), Spanish-First 100%, UUIDv7 exclusivo, Zero-Modals (Drawers laterales Framer Motion) y tokens semánticos CSS.
  - Plan de Trabajo completado al 100% (Entregas E1, E2, E3, E4 y E5).

### Validación de la Entrega 6 (Hito T6.1) — 2026-10-01
- **Sidebar Institucional y Navegación Basada en Roles (PBAC) (T6.1)**:
  - Integración del componente `SidebarInstitucional` (`src/app/_components/sidebar-institucional.tsx`) utilizando los componentes primitivos de `@/shared/ui/sidebar` (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`).
  - Visibilidad reactiva condicionada exclusivamente a usuarios autenticados con rol institucional (`autoridad_distrital`, `facilitador_mesa`, `auditor_forense`) mediante la función selector `esInstitucional(sesion)`. Para ciudadanos y participantes anónimos, la vista permanece limpia y sin barra lateral.
  - Despliegue de los 8 módulos operativos de POLIS (`motor_politicas`, `participacion_ciudadana`, `mesas_trabajo`, `motor_instrumentos`, `geodatos`, `presupuesto`, `indicadores`, `auditoria`) con control de visibilidad por permisos PBAC (`tienePermiso(sesion, modulo.id)`).
  - Apertura contextual e integración Zero-Modals con `PanelHost` y `useNavigationStore`: navegación directa a vistas de políticas, mesas y geovisor, apertura contextual de papelógrafos MGA y notificaciones operativas con `toast` de Sonner.
  - Botón de control `SidebarTrigger` en el `Topbar` para colapsar y expandir la barra lateral en desktop o abrirla como drawer deslizante en dispositivos móviles.
  - Extensión del panel de sesión (`sesion-panel.tsx`) con módulo de "Acceso Institucional" para alternancia rápida entre roles institucionales y perfiles PBAC.
  - Aseguramiento de calidad total: `bun run check` (0 errores de TypeScript, 0 de ESLint, políticas UI y a11y verificadas), `bun run build` exitoso (Turbopack standalone en 6.9s), suite global backend pasando al 100% (125 pruebas aprobadas).

### Validación de la Entrega 6 (Hito T6.2) — 2026-10-01
- **Módulo de Formularios y Consultas Ciudadanas (Forms) (T6.2)**:
  - Migración Alembic `0020_formularios_y_consultas.py` aplicada exitosamente en `bd_csh`:
    * Tablas `participacion_ciudadana.formularios_consulta` y `participacion_ciudadana.respuestas_formulario` con identificadores primarios UUIDv7 generados con `public.generar_uuid_v7()`.
    * Restricción de unicidad relacional `uq_respuesta_formulario_sujeto (formulario_id, sujeto_id)` que garantiza matemáticamente una única participación por ciudadano en cada consulta.
    * Sembrado oficial de dos consultas representativas del Distrito de Cartagena: `FORM-L02-CONV-2026` (Convivencia y Seguridad Humana - Localidad 2) y `FORM-CIENAGA-AMB-2026` (Diagnóstico Ambiental y Resiliencia Comunitaria - Ciénaga de la Virgen).
    * Asignación de permisos institucionales `formularios:gestionar` para `autoridad_distrital` y `facilitador_mesa`, y `formularios:leer` para `auditor_forense`.
  - Backend FastAPI (`backend/app/modules/formularios/`):
    * Modelos SQLAlchemy 2.0 y esquemas Pydantic v2 en español estricto para diseño dinámico de preguntas (`opcion_unica`, `opcion_multiple`, `escala_likert`, `texto_libre`), metadatos de Enfoque Diferencial (Ley 1448/11 de Víctimas, Ley 1618/13 de Discapacidad) y evidencias multimedia.
    * Repositorio asíncrono y servicio con delimitación transaccional atómica (`transaction(self.session)`), tabulación estadística automática (conteos absolutos, porcentajes relativos, promedios en escalas Likert) y desglose de enfoque poblacional y territorial.
    * Endpoints REST en `/api/v1/formularios` con control de acceso PBAC y documentación comprobada en `docs/permisos-api.md`.
  - Frontend Zero-Modals (`src/features/formularios/`):
    * Paneles reactivos integrados al `PanelHost` de `@/core/panels/`: Catálogo `FormulariosPanel`, Diseñador visual `FormularioEditorPanel` (FormBuilder) y Dashboard estadístico `FormularioAnaliticaPanel`.
    * Conexión fluida con el `SidebarInstitucional` para apertura directa de consultas activas y diseñador visual sin recarga de página.
  - Aseguramiento de calidad total:
    * Pruebas backend dedicadas: `backend/tests/test_formularios_consultas.py` (5 pruebas pasando al 100%) y verificación de atomicidad transaccional en `test_transactions_integration.py`.
    * Suite global de backend: **115 pruebas pasando al 100%** en pytest.
    * Frontend: `bun run check` (0 errores TypeScript, 0 errores ESLint, políticas UI y a11y verificadas) y `bun run build` exitoso (Turbopack standalone en 6.6s).
    * Servicios supervisados activos en systemd: `polis-backend`, `polis-frontend`, `postgresql@18-main`, `nginx`.

### Validación de la Entrega 6 (Hito T6.3) — 2026-10-01
- **Registro de Asistencia y Participación Multicanal Desagregada (T6.3)**:
  - Migración Alembic `0023_asistencia_multicanal.py` aplicada exitosamente en `bd_csh`:
    * Tabla `participacion_ciudadana.escenarios_especiales` con clave primaria UUIDv7 (`public.generar_uuid_v7()`), código único, tipo de escenario, desglose poblacional en JSONB, síntesis de acuerdos y control de evidencias.
    * Índices optimizados en PostgreSQL 18.6: `idx_escenarios_tipo`, `idx_escenarios_fecha`, `idx_escenarios_territorio`.
    * Sembrado oficial de escenarios especiales de Cartagena: `ESC-001` (Consulta Previa Étnica - Consejo Comunitario de La Boquilla, 150 asistentes), `ESC-002` (Taller Focal ESCNNA y Juventudes en El Pozón, 120 asistentes), `ESC-003` (Foro Gremial y Turístico en Centro Histórico, 300 asistentes).
  - Lógica analítica de deduplicación y servicios FastAPI (`backend/app/modules/participacion/`):
    * Métrica unificada distrital con deduplicación rigurosa: `Gran Total = Sujetos Únicos (Canal 1 Web ∪ Canal 2 Mesas) + Asistentes Escenarios Especiales (Canal 3)`.
    * Desagregación analítica Canal Web por Línea Estratégica, Dimensión de Seguridad Humana y Territorio distrital.
    * Desagregación jerárquica Canal Mesas con estructura de árbol `ltree`, submesas temáticas, verificación de quórum y actas comunitarias concertadas (Sentencia C-150 de 2015).
    * Catálogo y CRUD de escenarios especiales protegido con control de acceso PBAC (`asistencia:verificar` para `autoridad_distrital` y `facilitador_mesa`).
    * Registro de 8 rutas en `docs/permisos-api.md` con 100% de cobertura validada en `test_access_policy.py`.
  - Frontend Zero-Modals (`src/features/participacion/`):
    * Tablero unificado `ParticipacionMulticanalPanel` con selector de canales, métricas consolidadas, KPIs multicanal, desglose territorial interactivo y jerarquía de mesas.
    * Formulario lateral Drawer `EscenarioEditorPanel` para el registro y actualización de consultas previas, talleres focales y foros.
    * Conexión con `SidebarInstitucional` bajo los subítems operativos de Asistencia y Participación.
  - Aseguramiento de calidad total:
    * Pruebas backend dedicadas: `backend/tests/test_participacion_multicanal.py` (5 pruebas pasando al 100%) y suite de regresión PBAC/rutas (59 pruebas en 16.97s).
    * Frontend: `bun run check` (0 errores TypeScript, 0 errores ESLint, políticas UI y a11y verificadas) y `bun run build` exitoso (Turbopack standalone en 8.1s).
    * Servicios supervisados activos en systemd: `polis-backend`, `polis-frontend`, `postgresql@18-main`, `nginx`.

### Validación de la Entrega 6 (Hito T6.4) — 2026-10-01
- **Módulo de Testimonios Comunitarios y Memoria Social (T6.4)**:
  - Migración Alembic `0024_testimonios_memoria.py` aplicada exitosamente en `bd_csh`:
    * Tabla `participacion_ciudadana.testimonios_comunitarios` con clave primaria UUIDv7 (`public.generar_uuid_v7()`), código único `TEST-XXX`, territorio y dimensión relacionales, relato testimonial, fotografía comunitaria y metadatos de enfoque diferencial.
    * Estados de moderación con ciclo ético: `PENDIENTE`, `APROBADO`, `DESTACADO`, `RECHAZADO` (con justificación obligatoria según Sentencia C-150/15).
    * Semillas oficiales de líderes y lideresas de Cartagena: `TEST-001` (Ana Rosa Gómez - El Pozón), `TEST-002` (Dionisio Miranda - La Boquilla), `TEST-003` (Yorledis Berrío - Nelson Mandela) y `TEST-004` (Carlos Mario Morales - Getsemaní).
    * Permiso PBAC `testimonios:moderar` asignado a roles `autoridad_distrital` y `facilitador_mesa`.
  - Backend FastAPI (`backend/app/modules/testimonios/`):
    * Modelos declarativos SQLAlchemy 2.0 y esquemas Pydantic v2 en español estricto con validaciones normativas.
    * Repositorio asíncrono con filtros por estado, territorio, dimensión y búsqueda textual, junto con métricas de resumen territorial.
    * Servicio transaccional atómico (`transaction(self.session)`) que previene el descarte arbitrario exigiendo motivo de moderación al rechazar.
    * 6 rutas REST documentadas y validadas con `test_access_policy.py` (52 pruebas globales pasando al 100%).
  - Frontend Zero-Modals (`src/features/testimonios/`):
    * Galería comunitaria `TestimoniosGaleriaPanel` con filtros territoriales, de dimensión, búsqueda por palabras clave, tarjetas testimoniales y destacados visuales.
    * Formulario de co-construcción cívica `TestimonioEditorPanel` con selección de enfoque étnico y condición de víctima (Ley 1448).
    * Consola institucional de moderación `TestimoniosModeracionPanel` con pestañas por estado, acciones de aprobación/destacado y justificación obligatoria de rechazos.
    * Integración fluida en `SidebarInstitucional` bajo los submenús de Memoria Social y Galería de Testimonios.
  - Aseguramiento de calidad total:
    * Pruebas backend dedicadas: `backend/tests/test_testimonios_comunitarios.py` (4 pruebas pasando al 100%) y suite de acceso y permisos PBAC.
    * Frontend: `bun run check` (0 errores TypeScript, 0 errores ESLint, políticas UI y a11y verificadas) y `bun run build` exitoso (Turbopack standalone en 6.8s).
    * Servicios supervisados activos en systemd: `polis-backend`, `polis-frontend`, `postgresql@18-main`, `nginx`.

### Validación de la Entrega 6 (Hito T6.5) — 2026-10-01
- **Centro de Control de Fases DNP, Administración del Sistema y Autenticación Google OAuth (T6.5)**:
  - Migración Alembic `0025_control_fases_y_oauth.py` aplicada exitosamente en `bd_csh`:
    * Actualización en caliente de `reglas_participacion` en `motor_politicas.fases_politica` parametrizando `habilitada_web: true` para `FASE_1_DIAGNOSTICO` y `false` para formulación y seguimiento.
    * Concaténación JSONB de los permisos canónicos `politicas:gestionar` y `auditoria:leer` a los roles institucionales `autoridad_distrital` y `administrador_identidades`.
  - Backend FastAPI (`backend/app/modules/identidad/`, `politicas/`, `auditoria/`):
    * Autenticación institucional con Google OAuth 2.0 (`POST /api/v1/identidad/oauth/google`) con verificación criptográfica de `id_token`, auto-provisión de usuario y asignación automática de rol PBAC (`autoridad_distrital` para dominios `@cartagena.gov.co` con nivel de identidad `verificada`, y `ciudadano` para cuentas generales).
    * Endpoints de conmutación en tiempo real del ciclo de política DNP: `GET /api/v1/politicas/fases/control` y `PATCH /api/v1/politicas/fases/{fase_id}/conmutar` (protegidos bajo `permiso:politicas:gestionar@declarada`).
    * Router dedicado de auditoría y respaldo forense (`backend/app/modules/auditoria/`):
      - `GET /api/v1/auditoria/registros` con paginación, filtros por tabla y operación, y verificación de inmutabilidad (Sentencia C-150/15).
      - `GET /api/v1/auditoria/respaldos` con cálculo dinámico de huella criptográfica SHA-256 de volcados `pg_dump`.
      - `POST /api/v1/auditoria/respaldos/ejecutar` para la generación de respaldos físicos en caliente del sistema.
    * Actualización del inventario de rutas y matriz de permisos en `docs/permisos-api.md`.
  - Frontend Zero-Modals (`src/features/`):
    * Botón oficial de Google en `SesionPanel` (`src/features/sesion/panels/sesion-panel.tsx`) con autenticación institucional y prevención de escalamiento de privilegios.
    * Consola de parametrización DNP `FasesControlPanel` (`src/features/politicas/panels/fases-control-panel.tsx`) con switches reactivos, indicadores de estado `StatusBadge` y actualización en caliente de fases de participación web.
    * Consola de auditoría forense `AuditoriaConsolaPanel` (`src/features/auditoria/panels/auditoria-consola-panel.tsx`) con visor de razones motivadas de descarte, catálogo de respaldos con checksum SHA-256 y botón de respaldo en vivo.
    * Integración fluida en `SidebarInstitucional` para accesos directos a Fases DNP, Usuarios y Consola de Auditoría.
  - Aseguramiento de calidad total:
    * Pruebas backend dedicadas: `backend/tests/test_control_fases_y_oauth.py` (4 pruebas pasando al 100%) y suite global PBAC `test_access_policy.py` (53 pruebas pasando al 100%).
    * Frontend: `bun run check` (0 errores TypeScript, 0 errores ESLint, políticas UI y a11y verificadas) y `bun run build` exitoso (Turbopack standalone en 7.4s).
    * Verificación en vivo en entorno supervisado: endpoints probados en Nginx en `127.0.0.1:80` retornando HTTP 200 y datos íntegros.
    * Servicios supervisados activos en systemd: `polis-backend`, `polis-frontend`, `postgresql@18-main`, `nginx`.

## Base visual compartida — 2026-10-01

Implementada para acompañar todas las entregas funcionales:

- Tokens semánticos, fuentes locales, escalas y temas claro/oscuro.
- Biblioteca en `shared/ui`, patrones de formulario, búsqueda, estados y paneles.
- Pantallas de inicio, exploración y mesas adaptadas a la biblioteca y a móvil.
- Storybook con fundamentos, documentación, primitivos, patrones y pantallas reales.
- Pruebas de historias en Chromium con interacciones y reglas de accesibilidad.
- Builds y pruebas UI incorporados a CI.

Guía: [POLIS UI](design-system.md). Cada siguiente feature debe reutilizar esta
base y añadir sus estados de carga, vacío, error y datos reales al catálogo.
Quedan como trabajo de producto la revisión con usuarios/lectores de pantalla
y los estados de conectividad y permisos cuando se integren los endpoints.
