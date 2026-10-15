# Matriz de acceso de la API POLIS

Contrato de autorización subordinado a [arquitectura](arquitectura.md). EDD
mantiene método, ruta, control y motivo; el director aprueba cambios de permisos
y excepciones públicas como parte del alcance solicitado. EAF revisa evidencia e
independencia. La clasificación inicial y protección de gestión fueron autorizadas
en la revisión de reglas del 2026-10-01. Cambiar la exposición requiere actualizar
esta matriz, sus dependencias y pruebas; una nueva ruta sin fila falla en CI.

## Convenciones

- `publico`: sin token; el motivo de la excepción debe estar documentado.
- `sesion`: token válido de sesión anónima; no significa ausencia de autenticación.
- `sujeto`: token válido de usuario o sesión anónima y condiciones del caso de uso.
- `permiso:<código>@<nivel>`: token, permiso exacto y nivel mínimo indicados.
- `roles:<lista>`: token y uno de los roles separados por coma.

Un token no prueba por sí solo propiedad del recurso ni verificación institucional.
El nivel `declarada` identifica una cuenta registrada; no acredita correo verificado
ni nombramiento. El JWT identifica una sesión persistida; en cada petición se comprueban vigencia,
usuario activo, rol y permisos actuales en PostgreSQL. La revocación inmediata
se aplica a la siguiente petición; la administración de roles personalizados se realiza por API.
Contrato y activación: [usuarios y acceso](identidad.md).

## Roles institucionales y acceso de gestión

| Permiso | Roles canónicos autorizados | Nivel mínimo |
| --- | --- | --- |
| usuarios:leer | administrador_identidades, auditor_forense | declarada |
| usuarios:gestionar | administrador_identidades | declarada |
| roles:gestionar | administrador_identidades | declarada |
| identidad:auditar | administrador_identidades, auditor_forense | declarada |
| presupuesto:gestionar | autoridad_distrital, administrador_identidades | declarada |
| indicadores:gestionar | autoridad_distrital, administrador_identidades | declarada |
| instrumentos:gestionar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| ia:analizar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| mesas:abrir | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| mesas:fotos:subir | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| mesas:acuerdos | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| asistencia:verificar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| aportes:priorizar | autoridad_distrital | declarada |
| aportes:responder | autoridad_distrital | declarada |
| formularios:leer | autoridad_distrital, facilitador_mesa, administrador_identidades, auditor_forense | declarada |
| formularios:gestionar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| testimonios:moderar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| politicas:gestionar | autoridad_distrital, administrador_identidades | declarada |
| auditoria:leer | autoridad_distrital, administrador_identidades, auditor_forense | declarada |
| seguimiento:gestionar | autoridad_distrital, administrador_identidades | declarada |
| contenido:leer | autoridad_distrital, administrador_identidades, auditor_forense | declarada |
| fuentes:gestionar | autoridad_distrital, administrador_identidades | declarada |
| fuentes:leer | autoridad_distrital, administrador_identidades, auditor_forense, facilitador_mesa, ciudadano | declarada |
| alternativas:gestionar | autoridad_distrital, administrador_identidades | declarada |
| alternativas:leer | autoridad_distrital, administrador_identidades, auditor_forense, facilitador_mesa, ciudadano | declarada |
| comunicaciones:gestionar | autoridad_distrital, administrador_identidades | declarada |
| comunicaciones:leer | autoridad_distrital, administrador_identidades, auditor_forense, facilitador_mesa | declarada |

Los roles ciudadano, ciudadano anónimo y auditor forense no reciben permisos de
gestión institucional. El registro público solo admite ciudadano. Asignaciones
### Alcance territorial y modelo PBAC (CIERRE-07)

A partir de la especificación CIERRE-07, las mutaciones operativas sobre entidades micro-territoriales (mesas de trabajo, actas comunitarias, participantes, fotos de mesas, agendas) están sujetas a control de alcance territorial (PBAC) gestionado a través de `autenticacion.ambitos_territoriales_usuario`:

1. **Recursos sujetos a PBAC:**
   - `mesas_trabajo.mesas` (creación, edición, submesas).
   - `mesas_trabajo.actas_comunitarias` (borrador, acuerdos, cierre).
   - `mesas_trabajo.participantes_mesa` (registro de asistencia).
   - `mesas_trabajo.fotos_mesa` (evidencias fotográficas de deliberación).
   - `mesas_trabajo.agendas` (programación y fechas de mesas y localidades).
   La jurisdicción se resuelve de forma jerárquica ascendiendo por `territorio_padre_id` (nivel directo localidad `LOC-1`, `LOC-2`, `LOC-3`, barrio, corregimiento o zona insular). En submesas huérfanas de `territorio_id`, la jurisdicción se hereda de la mesa raíz.

2. **Instrumentos distritales globales por diseño (Alternativas MGA y Compromisos PAS):**
   - **Banco Distrital de Alternativas MGA** (`/api/v1/alternativas`): Las iniciativas de solución formuladas en Fase 2 constituyen instrumentos estratégicos de alcance distrital y macro-territorial. Como lo acredita el censo de 8 alternativas de Cartagena, las iniciativas cubren simultáneamente múltiples Unidades Comuneras de Gobierno (UCG), varias localidades (ej. Localidades 1 y 2, Localidades 2 y 3) o el distrito en su totalidad (ej. videovigilancia y corredores viales transversales). En el modelo de datos (`motor_politicas.banco_alternativas`) no existe vinculación relacional atómica a una mesa o territorio individual. Por diseño, su gobernanza responde a RBAC estricto (`alternativas:gestionar` reservado a `autoridad_distrital` y `administrador_identidades`) y compuertas de fase (`FASE_2_FORMULACION`), operando con **alcance global distrital**.
   - **Plan de Acción y Seguimiento PAS** (`/api/v1/compromisos`): Los compromisos vinculantes de la Fase 3 son asumidos por dependencias y organismos del nivel central distrital (`entidad_responsable`: Secretaría de Hacienda, Distriseguridad, Secretaría del Interior, EPA, MECAR, etc.) para monitorear metas cuatrienales de impacto de ciudad. En el esquema (`seguimiento.compromisos_pas`), los compromisos se articulan por entidad responsable y código MGA, careciendo de clave foránea a mesas o territorios particulares. Su gestión se rige por RBAC (`seguimiento:gestionar`) y control de fase (`FASE_3_PLAN_ACCION`), siendo **globales distritales por diseño**.

## Inventario comprobado

La última columna explica la excepción pública o la condición adicional.

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/aportes | publico | Consulta pública de participación y devoluciones motivadas. |
| POST | /api/v1/aportes | sesion | Sesión cívica anónima o registrada; token obligatorio y vigencia de la cuenta. |
| GET | /api/v1/aportes/mis-apoyos | sesion | Consulta de las propuestas respaldadas por la sesión cívica actual. |
| DELETE | /api/v1/aportes/{aporte_id} | permiso:aportes:priorizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/aportes/{aporte_id} | publico | Consulta pública de participación y devoluciones motivadas. |
| PATCH | /api/v1/aportes/{aporte_id} | permiso:aportes:priorizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/aportes/{aporte_id}/apoyar | sesion | Alternancia de respaldo ciudadano (apoyar o retirar) vinculado a sesión cívica. |
| DELETE | /api/v1/aportes/{aporte_id}/apoyar | sesion | Retiro de respaldo ciudadano vinculado a sesión cívica. |
| GET | /api/v1/aportes/{aporte_id}/devolucion-razon | publico | Consulta pública de participación y devoluciones motivadas. |
| POST | /api/v1/aportes/{aporte_id}/devolucion-razon | permiso:aportes:responder@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/auditoria/registros | permiso:auditoria:leer@declarada | Consulta forense inmutable de razones motivadas y trazabilidad. |
| GET | /api/v1/auditoria/respaldos | permiso:auditoria:leer@declarada | Supervisión de copias de seguridad lógicas y verificación de hash SHA-256. |
| POST | /api/v1/auditoria/respaldos/ejecutar | permiso:auditoria:leer@declarada | Ejecución supervisada de respaldo en caliente de la base de datos. |
| GET | /api/v1/compromisos | publico | Máxima publicidad y transparencia activa de compromisos PAS Cartagena. |
| POST | /api/v1/compromisos | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/compromisos/kpis | publico | Consulta pública de KPIs consolidados de seguimiento del PAS. |
| POST | /api/v1/compromisos/plan-accion/actividades | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| PATCH | /api/v1/compromisos/plan-accion/actividades/{id_o_codigo}/seguimiento | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/compromisos/plan-accion/banco-conocimiento | publico | Consulta pública del Banco de Conocimiento oficial DNP y SisPT para formulación de Planes de Acción. |
| GET | /api/v1/compromisos/plan-accion/matriz | publico | Consulta pública de Matriz DNP Hoja 1 Plan_Accion y Hoja 2 Plan_Indicativo. |
| POST | /api/v1/compromisos/plan-accion/procesar-lote | publico | Procesamiento por lotes y auditoría metodológica oficial DNP con cruce Hoja 2 a Hoja 1 y autocorrección de verbos débiles. |
| POST | /api/v1/compromisos/plan-accion/validar-redaccion | publico | Validador lingüístico DNP de verbos fuertes en infinitivo y detección de verbos débiles prohibidos. |
| GET | /api/v1/compromisos/triada/resumen | publico | Consulta pública de la Triada de Motores (Plan de Desarrollo, Plan de Acción Multiformato e Inversión) y catálogo de Transparencia Activa (Ley 1474/11 Art. 74 y Ley 1712/14). |
| GET | /api/v1/compromisos/triada/inteligencia/patologias-dnp | publico | Analítica agregada de patologías DNP; filtros validados por dimensión y periodo. |
| GET | /api/v1/compromisos/triada/inteligencia/continuidad-gobiernos | publico | Indicadores agregados de continuidad entre periodos de gobierno. |
| GET | /api/v1/compromisos/triada/inteligencia/radar-transparencia | publico | Completitud y cobertura pública de cortes ingeridos. |
| GET | /api/v1/compromisos/triada/inteligencia/alineacion-territorial | publico | Analítica territorial agregada de inversión, delitos y demanda ciudadana. |
| GET | /api/v1/compromisos/triada/inteligencia/buscador | publico | Búsqueda de registros normalizados; filtros validados y sin mutación. |
| GET | /api/v1/compromisos/triada/inteligencia/simulador-cierre | publico | Proyección exploratoria de cierre de gobierno; no constituye cifra oficial. |
| GET | /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo | publico | Resumen agregado de los seis motores de inteligencia de la Triada. |
| GET | /api/v1/compromisos/triada/dea/auditoria-saneamiento | publico | Auditoría agregada de calidad y unidades del corpus DEA, sin mutación. |
| GET | /api/v1/compromisos/triada/dea/frontera-eficiencia | publico | Frontera exploratoria DEA; intervalos bootstrap pueden indicar PENDIENTE mientras se calculan. |
| GET | /api/v1/compromisos/triada/dea/malmquist | publico | Índice agregado de productividad interanual, sujeto a validación metodológica. |
| GET | /api/v1/compromisos/triada/dea/econometria-segunda-etapa | publico | Asociaciones exploratorias de panel, no causales, basadas en el corpus ingerido. |
| GET | /api/v1/compromisos/triada/dea/resumen-integral | publico | Resumen analítico agregado DEA, sujeto a advertencias metodológicas de cada motor. |
| GET | /api/v1/compromisos/triada/pdd-dea/catalogo-y-conciliacion-ppi | publico | Catálogo de PDD/PDL, fuentes y conciliación del PPI frente a registros reconstruidos. |
| GET | /api/v1/compromisos/triada/pdd-dea/cumplimiento-metas | publico | Avance de metas PDD deduplicado y agregado por línea, entidad y localidad; conserva advertencias de escala. |
| GET | /api/v1/compromisos/triada/pdd-dea/frontera-dea-pdd | publico | Frontera DEA exploratoria de entidades por PDD e insumo presupuestal; no representa causalidad ni certificación. |
| GET | /api/v1/compromisos/triada/pdd-dea/econometria-comparada-pdd | publico | Comparación estadística descriptiva interplan, correlaciones ajustadas por FDR y productividad exploratoria. |
| GET | /api/v1/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana | publico | Catálogo jerárquico de programas y metas PDD/PDL, con monitor de la línea Seguridad Humana. |
| GET | /api/v1/compromisos/triada/pdd-dea/resumen-ejecutivo | publico | Resumen cacheado del catálogo, cumplimiento, frontera DEA y comparación econométrica. |
| GET | /api/v1/compromisos/triada/pdd-dea/laboratorio-prescriptivo | publico | Network DEA exploratorio en dos etapas, escenarios presupuestales no causales, auditoría de cobertura MGA y métricas territoriales con fuentes y compuertas explícitas. |
| GET | /api/v1/compromisos/triada/google-workspace/estado | publico | Estado de conexión y archivos nativos de las carpetas oficiales de Google Workspace. |
| POST | /api/v1/compromisos/triada/google-workspace/sincronizar | permiso:seguimiento:gestionar@declarada | Actualiza las hojas y el documento nativos existentes con los datos auditables de Triada. |
| POST | /api/v1/compromisos/triada/detectar-formato | publico | Detección polimórfica y normalización pública de formatos Excel de Planes de Acción (2016 monohoja a 2026 multihoja) sin mutación de estado. |
| POST | /api/v1/compromisos/triada/cruzar-lecturas | publico | Evaluación pública sin estado del cruce tripartito (Estratégico PDD, Operativo PA y Financiero POAI/BPIM/RP/Pagos) para control social. |
| POST | /api/v1/compromisos/triada/ingerir-archivos | permiso:seguimiento:gestionar@declarada | Ingesta binaria Excel/CSV/ZIP con persistencia auditable en tres motores; requiere fase Plan de Acción habilitada. |
| POST | /api/v1/compromisos/triada/ingerir-directorio | permiso:seguimiento:gestionar@declarada | Procesamiento masivo limitado al directorio data/planes_accion; requiere fase Plan de Acción habilitada. |
| GET | /api/v1/compromisos/triada/lotes | publico | Consulta de lotes, archivos, perfiles y cobertura interanual persistida. |
| GET | /api/v1/compromisos/triada/comparativa-interanual | publico | Consulta de registros normalizados y cruce estratégico, operativo y presupuestal por vigencia. |
| DELETE | /api/v1/compromisos/{id_o_codigo} | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/compromisos/{id_o_codigo} | publico | Consulta pública de compromiso por UUID o código para control social. |
| PATCH | /api/v1/compromisos/{id_o_codigo}/avance | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| PUT | /api/v1/compromisos/{id_o_codigo} | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/evidencias/subir | sujeto | Autor tomado del token; imagen validada y EXIF eliminado. |
| GET | /api/v1/evidencias/{id} | publico | Evidencia de participación publicada y sanitizada; EXIF eliminado no garantiza anonimato visual. |
| GET | /api/v1/evidencias/{id}/archivo | publico | Evidencia de participación publicada y sanitizada; fotos de mesa solo tras aprobación; EXIF eliminado no garantiza anonimato visual. |
| GET | /api/v1/formularios | publico | Consulta pública de formularios activos de participación. |
| POST | /api/v1/formularios | permiso:formularios:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| DELETE | /api/v1/formularios/{id} | permiso:formularios:gestionar@declarada | Solo formularios sin respuestas; 409 si existen. Conservar el registro mediante cierre. |
| GET | /api/v1/formularios/{id} | publico | Consulta pública de formularios activos de participación. |
| PUT | /api/v1/formularios/{id} | permiso:formularios:gestionar@declarada | Validar estado y esquema; 409 si intenta cambiar preguntas de un formulario con respuestas. |
| GET | /api/v1/formularios/{id}/analitica | permiso:formularios:leer@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/formularios/{id}/respuestas | permiso:formularios:leer@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/formularios/{id}/respuestas | sujeto | Un envío por sujeto; datos estructurados y enfoque diferencial. |
| GET | /api/v1/geodatos/capas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/geodatos/territorios | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/geodatos/territorios/buscar-por-coordenada | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/geodatos/territorios/geojson | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/geodatos/territorios/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/geodatos/isocronas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/geodatos/estandarizar-direccion | publico | Normalización y georreferenciación inteligente de nomenclaturas cartageneras. |
| GET | /api/v1/geodatos/analitica/hurtos/resumen | publico | Consulta pública y transparente de analítica agregada de hurtos para visualización ciudadana en el Geovisor. |
| GET | /api/v1/geodatos/analitica/hurtos/geojson | publico | Consulta pública de polígonos y métricas de densidad delictiva para capas del Geovisor. |
| GET | /api/v1/geodatos/analitica/hurtos/registros | publico | Exploración tabular, filtrado multicriterio y pivot analítico de registros GeoJSON de hurtos. |
| GET | /api/v1/health/live | publico | Comprobación de vida/disponibilidad; no publicar credenciales ni errores internos. |
| GET | /api/v1/health/ready | publico | Comprobación de vida/disponibilidad; no publicar credenciales ni errores internos. |
| GET | /api/v1/health/system | publico | Comprobación de vida/disponibilidad; no publicar credenciales ni errores internos. |
| GET | /api/v1/health/database/queries | publico | Monitoreo y telemetría forense de rendimiento SQL con pg_stat_statements. |

| POST | /api/v1/ia/ciclo-politica | permiso:ia:analizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/ia/devolucion | permiso:ia:analizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/ia/diagnostico | permiso:ia:analizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/ia/fiscal | permiso:ia:analizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/ia/juridico | permiso:ia:analizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/identidad/acceso-restringido | roles:autoridad_distrital,auditor_forense | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/identidad/contrasena | sujeto | Exige contraseña actual y revoca todas las sesiones. |
| POST | /api/v1/identidad/correo/confirmar | publico | Token de propósito verificar, caducidad, uso único y límite de intentos. |
| POST | /api/v1/identidad/correo/solicitar | sujeto | Envía enlace solo al correo de la cuenta autenticada, con límites de intentos. |
| GET | /api/v1/identidad/eventos | permiso:identidad:auditar@declarada | Eventos paginados de identidad sin contraseñas o tokens. |
| POST | /api/v1/identidad/login | publico | Intercambio de credenciales por token; no concede roles adicionales. |
| POST | /api/v1/identidad/magic-link/confirmar | publico | Consumo de token Magic Link de uso único para autenticación directa e inicio de sesión. |
| POST | /api/v1/identidad/magic-link/solicitar | publico | Solicitud de acceso instantáneo sin contraseñas; emite token de uso único con caducidad de 15 minutos. |
| POST | /api/v1/identidad/mfa/activar | sujeto | Valida código TOTP y activa MFA entregando códigos de recuperación de un solo uso. |
| POST | /api/v1/identidad/mfa/desactivar | sujeto | Desactiva MFA requiriendo reautenticación por contraseña. |
| GET | /api/v1/identidad/mfa/estado | sujeto | Consulta estado de activación de MFA TOTP y códigos restantes de la cuenta. |
| POST | /api/v1/identidad/mfa/iniciar | sujeto | Genera secreto TOTP y código QR para inicio de enrolamiento MFA. |
| POST | /api/v1/identidad/mfa/recuperacion/regenerar | sujeto | Regenera lote de códigos de recuperación de un solo uso validando TOTP. |
| POST | /api/v1/identidad/mfa/verificar | publico | Valida código TOTP o código de recuperación contra token de desafío emitido en login. |
| POST | /api/v1/identidad/oauth/google | publico | Login mediante ID token verificado para audiencia configurada; conserva el rol existente y crea cuentas nuevas solo como ciudadano. |
| POST | /api/v1/identidad/logout | sujeto | Revoca la sesión actual de la cuenta registrada. |
| GET | /api/v1/identidad/perfil | sujeto | Solo perfil propio de usuario registrado; sesión anónima denegada. |
| PATCH | /api/v1/identidad/perfil | sujeto | El usuario edita exclusivamente su nombre; no acepta cambios de rol o permisos. |
| GET | /api/v1/identidad/permisos | permiso:usuarios:leer@declarada | Catálogo reconocido por la aplicación. |
| POST | /api/v1/identidad/recuperacion/confirmar | publico | Token de propósito recuperar, caducidad, uso único y límite de intentos. |
| POST | /api/v1/identidad/recuperacion/solicitar | publico | Recuperación autorizada por el alcance del módulo; respuesta genérica y límite por IP/cuenta. |
| POST | /api/v1/identidad/registro | publico | Alta pública de ciudadano; seleccionar un rol institucional devuelve 403. |
| GET | /api/v1/identidad/roles | permiso:usuarios:leer@declarada | Catálogo de roles para administración y auditoría. |
| POST | /api/v1/identidad/roles | permiso:roles:gestionar@declarada | Rol personalizado con catálogo validado, motivo y límite de delegación. |
| DELETE | /api/v1/identidad/roles/{codigo} | permiso:roles:gestionar@declarada | Solo roles personalizados sin usuarios; motivo obligatorio. |
| PATCH | /api/v1/identidad/roles/{codigo} | permiso:roles:gestionar@declarada | Roles personalizados; los roles del sistema requieren migración. |
| DELETE | /api/v1/identidad/sesiones | sujeto | Revoca todas las sesiones de la propia cuenta. |
| GET | /api/v1/identidad/sesiones | sujeto | Solo sesiones activas de la propia cuenta. |
| DELETE | /api/v1/identidad/sesiones/{sesion_id} | sujeto | Verifica que la sesión pertenezca a la cuenta. |
| GET | /api/v1/identidad/usuarios | permiso:usuarios:leer@declarada | Directorio paginado reservado a administración y auditoría. |
| POST | /api/v1/identidad/usuarios | permiso:usuarios:gestionar@declarada | Alta administrativa; no concede permisos que el actor no pueda asignar. |
| PATCH | /api/v1/identidad/usuarios/{usuario_id} | permiso:usuarios:gestionar@declarada | Cambios con motivo, revocación y protección del último administrador. |
| POST | /api/v1/identidad/usuarios/{usuario_id}/revocar | permiso:usuarios:gestionar@declarada | Revocación administrativa de sesiones con evento de auditoría. |
| GET | /api/v1/identidad/usuarios/{usuario_id}/ambitos | permiso:usuarios:gestionar@declarada | Consulta administrativa de ámbitos territoriales asignados al usuario institucional. |
| POST | /api/v1/identidad/usuarios/{usuario_id}/ambitos | permiso:usuarios:gestionar@declarada | Asignación controlada de ámbito territorial con justificación pericial y auditoría. |
| DELETE | /api/v1/identidad/usuarios/{usuario_id}/ambitos/{ambito_id} | permiso:usuarios:gestionar@declarada | Revocación controlada de ámbito territorial con justificación pericial y auditoría. |
| GET | /api/v1/identidad/verificar-nivel | permiso:aportes:crear@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/indicadores/cadena-valor | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/indicadores/fichas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/indicadores/fichas | permiso:indicadores:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/indicadores/fichas/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| PATCH | /api/v1/indicadores/fichas/{id} | permiso:indicadores:gestionar@declarada | Actualización controlada de metadatos institucionales y enlaces técnicos (DNP inmutable). |
| POST | /api/v1/indicadores/fichas/{id}/mediciones | permiso:indicadores:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/instrumentos | publico | Consulta pública de instrumentos y árboles de formulación. |
| POST | /api/v1/instrumentos | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| DELETE | /api/v1/instrumentos/{instrumento_id} | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/instrumentos/{instrumento_id} | publico | Consulta pública de instrumentos y árboles de formulación. |
| PUT | /api/v1/instrumentos/{instrumento_id} | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/instrumentos/{instrumento_id}/arbol | publico | Consulta pública de instrumentos y árboles de formulación. |
| POST | /api/v1/instrumentos/{instrumento_id}/convertir-a-objetivos | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/instrumentos/{instrumento_id}/nodos | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| DELETE | /api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id} | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| PUT | /api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id} | permiso:instrumentos:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/mesas | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| GET | /api/v1/mesas/agendas | publico | Consulta pública de cronograma de agendas de mesas de trabajo (EDIT-02). |
| GET | /api/v1/mesas/agendas/{agenda_id} | publico | Consulta pública de detalle de mesa en agenda. |
| POST | /api/v1/mesas/agendas | permiso:mesas:abrir@declarada | Programación de nueva mesa en agenda con auditoría forense inmutable. |
| PATCH | /api/v1/mesas/agendas/{agenda_id} | permiso:mesas:abrir@declarada | Reprogramación y actualización de estado de agenda con auditoría forense inmutable. |
| GET | /api/v1/mesas/geovisor | publico | Estado agregado y centroides territoriales de referencia; solo fotos aprobadas. |
| POST | /api/v1/mesas/{mesa_id}/fotos | permiso:mesas:fotos:subir@declarada | Imagen saneada, autorización declarada y vínculo atómico; queda pendiente de moderación. |
| GET | /api/v1/mesas/fotos/pendientes | permiso:testimonios:moderar@declarada | Cola de revisión institucional; no expone imágenes en lectura pública. |
| POST | /api/v1/mesas/fotos/{foto_id}/revision | permiso:testimonios:moderar@declarada | Revisión institucional única; solo aprobación autorizada se expone al público. |
| GET | /api/v1/mesas/fotos/{foto_id}/revision/archivo | permiso:testimonios:moderar@declarada | Archivo pendiente accesible solo para moderación institucional. |
| POST | /api/v1/mesas | permiso:mesas:abrir@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/mesas/{mesa_id} | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| PATCH | /api/v1/mesas/{mesa_id} | permiso:mesas:abrir@declarada | Edición de metadatos de mesa con control de propiedad (403), restricción de campos sensibles (asistentes deriva de actas) y auditoría. |
| GET | /api/v1/mesas/{mesa_id}/acta | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| GET | /api/v1/mesas/{mesa_id}/acta/pdf | publico | Descarga pública oficial de actas comunitarias foliadas en formato PDF vectorial con QR dinámico y sello SHA-256. |
| GET | /api/v1/noticias | publico | Consulta pública; contiene solo artículos publicados. |
| GET | /api/v1/noticias/{slug} | publico | Consulta por slug; borradores y archivadas responden 404. |
| GET | /api/v1/noticias/id/{id} | publico | Consulta pública por identificador; solo artículos publicados. |
| GET | /api/v1/noticias/gestion | permiso:contenido:leer@declarada | Listado editorial, incluye borradores y archivadas; solo personal con acceso de lectura. |
| GET | /api/v1/noticias/gestion/{id} | permiso:contenido:leer@declarada | Vista de edición; incluye estados no publicados. |
| POST | /api/v1/noticias/gestion | permiso:politicas:gestionar@declarada | Alta editorial desde la plataforma institucional. |
| PUT | /api/v1/noticias/gestion/{id} | permiso:politicas:gestionar@declarada | Edición y cambio de estado desde la plataforma institucional. |
| DELETE | /api/v1/noticias/gestion/{id} | permiso:politicas:gestionar@declarada | Eliminación editorial autorizada desde la plataforma. |
| POST | /api/v1/mesas/{mesa_id}/acta | permiso:mesas:acuerdos@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/mesas/{mesa_id}/acta/cerrar | permiso:mesas:acuerdos@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/mesas/{mesa_id}/participantes | permiso:asistencia:verificar@declarada | Registro nominal de asistencia reservado a gestión de mesa. |
| POST | /api/v1/mesas/{mesa_id}/participantes | permiso:asistencia:verificar@declarada | Registro nominal de asistencia reservado a gestión de mesa. |
| GET | /api/v1/mesas/{mesa_id}/submesas | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| POST | /api/v1/mesas/{mesa_id}/submesas | permiso:mesas:abrir@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| PUT | /api/v1/mesas/{mesa_id}/submesas/{submesa_id} | permiso:mesas:abrir@declarada | Gestión autorizada según permiso o rol; valida que la submesa pertenezca a la mesa y aplica salvaguardas de propiedad (OBS-21). |
| GET | /api/v1/participacion/canal-escenarios | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/canal-mesas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/canal-web | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/consolidado | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/escenarios-especiales | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/participacion/escenarios-especiales | permiso:asistencia:verificar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/participacion/escenarios-especiales/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| PUT | /api/v1/participacion/escenarios-especiales/{id} | permiso:asistencia:verificar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/politicas | publico | Catálogo canónico distrital (Decreto 037/2026), hidratado dinámicamente con fases DNP, líneas y participantes únicos consolidados. |
| GET | /api/v1/politicas/dimensiones | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/politicas/fases | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/politicas/fases/control | permiso:politicas:gestionar@declarada | Supervisión institucional del ciclo metodológico DNP y reglas web. |
| PATCH | /api/v1/politicas/fases/{fase_id}/conmutar | permiso:politicas:gestionar@declarada | Interruptor maestro de apertura y cierre de fases de participación web. |
| GET | /api/v1/politicas/lineas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/presupuesto/asignaciones | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/presupuesto/asignaciones | permiso:presupuesto:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/presupuesto/fuentes | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/presupuesto/fuentes/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/presupuesto/resumen-costeo | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/fuentes | publico | Consulta pública de fuentes institucionales y solicitudes para transparencia ciudadana (Ley 1712/14). |
| GET | /api/v1/fuentes/kpis | publico | Métricas agregadas de cumplimiento en solicitudes oficiales para veeduría y rendición de cuentas. |
| GET | /api/v1/fuentes/{id} | publico | Ficha técnica de fuente y estado oficial de solicitud para control social. |
| POST | /api/v1/fuentes | permiso:fuentes:gestionar@declarada | Radicación oficial de solicitud formal de información a entidades. |
| PATCH | /api/v1/fuentes/{id} | permiso:fuentes:gestionar@declarada | Actualización de radicado, plazos y estado de entrega de solicitud oficial. |
| DELETE | /api/v1/fuentes/{id} | permiso:fuentes:gestionar@declarada | Eliminación técnica de requerimiento oficial con auditoría forense inmutable. |
| POST | /api/v1/sesion/anonima | publico | Emisión pública para participación sin cuenta registrada. |
| GET | /api/v1/sesion/verificar | sesion | Sesión cívica anónima o registrada; token obligatorio y vigencia de la cuenta. |
| POST | /api/v1/seguridad/csp-report | publico | Recolección anónima de violaciones de CSP para supervisión perimetral sin datos personales. |
| GET | /api/v1/testimonios | publico | Consulta pública de relatos de memoria social y testimonios comunitarios. |
| POST | /api/v1/testimonios | sujeto | Creación de testimonio comunitario vinculada a sesión cívica o cuenta de usuario. |
| GET | /api/v1/testimonios/gestion | permiso:testimonios:moderar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/testimonios/gestion/{id} | permiso:testimonios:moderar@declarada | Consulta editorial, incluye relatos pendientes y rechazados. |
| PUT | /api/v1/testimonios/{id} | permiso:testimonios:moderar@declarada | Edición editorial de campos del relato; conserva estado y datos de moderación. |
| GET | /api/v1/testimonios/resumen | publico | Consulta pública de métricas de testimonios por estado y territorio. |
| GET | /api/v1/testimonios/{id} | publico | Consulta pública de relatos de memoria social y testimonios comunitarios. |
| PUT | /api/v1/testimonios/{id}/moderar | permiso:testimonios:moderar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |

## Infraestructura y límites

`/api/v1/docs`, `/api/v1/openapi.json` y el redirect OAuth de documentación solo
se habilitan en entornos no productivos según `create_app`; son documentación de
desarrollo, no excepciones a permisos de negocio. Las preflight OPTIONS de CORS
son infraestructura y no crean operaciones de negocio.

Las guardas comprueban inventario y dependencias; las pruebas HTTP comprueban
401/403 y las suites de dominio verifican éxito autorizado. Eso no sustituye una
revisión de privacidad de campos, imágenes, logs, rate limiting, revocación,
cuentas históricas o atribuciones institucionales. EXIF eliminado no prueba
consentimiento ni elimina información identificable visible. EAF debe declarar
estos límites en el dictamen correspondiente.



## Navegación interna

Las rutas Next.js `/plataforma/*` se clasifican por sesión y rol en
[plataforma](plataforma.md). No añaden permisos a roles ni cambian los controles
de los endpoints. El acceso a Usuarios y Roles en esta navegación se limita a
`administrador_identidades`; el auditor conserva sus permisos de lectura por API,
pero esta ruta administrativa no aparece en su menú.

## URLs de formularios — decisión de producto 2026-10-02

La URL compartible solicitada autoriza consultar formularios publicados sin login.
Los borradores se excluyen del listado público y se consultan por el canal privado.
Responder usa una sesión cívica emitida sin registro; no requiere login ciudadano.

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/formularios/publicos | publico | Catálogo publicado para SSG; excluye borradores y datos de respuestas. |
| GET | /api/v1/formularios/publicos/{slug} | publico | Formulario compartido por slug; borrador 403, inexistente 404; cerrado no admite envíos. |
| GET | /api/v1/formularios/constructor | permiso:formularios:leer@declarada | Gestión interna; incluye borradores para roles autorizados. |
| GET | /api/v1/formularios/constructor/slug/{slug} | permiso:formularios:leer@declarada | Vista previa privada de borradores; sin publicación implícita. |
| POST | /api/v1/formularios/constructor | permiso:formularios:gestionar@declarada | Persistir el documento completo y asignar slug único. |
| PUT | /api/v1/formularios/constructor/{id} | permiso:formularios:gestionar@declarada | Actualizar documento conservando slug y URL pública; 409 al cambiar preguntas o secciones si existen respuestas. |

### Reporte ciudadano geoespacial y publicación de respuestas

`POST /api/v1/formularios/{id}/respuestas` mantiene la sesión técnica exigida por el módulo. Cuando `configuracion.respuestaAnonima=true`, se rechaza además una identidad institucional (403); el cliente solicita un token anónimo sin cerrar la cuenta interna. El instrumento `reporte-inseguridad` aplica esa condición. Su publicación pública fue solicitada expresamente como formulario ciudadano; publicar sus preguntas no autoriza publicar respuestas.

`GET /api/v1/formularios/{id}/respuestas` y `/{id}/analitica` siguen exigiendo `formularios:leer@declarada`. No existe API de publicación ciudadana de respuestas. Los permisos dedicados de revisión y aprobación son una propuesta pendiente en [reportes-revision-publicacion.md](reportes-revision-publicacion.md), no permisos ya concedidos.

## Constructor de líneas y sublíneas — decisión 2026-10-02

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| POST | /api/v1/politicas/lineas | permiso:politicas:gestionar@declarada | Dimensión canónica activa y fase existente; código único por fase; sublíneas hijas válidas. |
| PUT | /api/v1/politicas/lineas/{id} | permiso:politicas:gestionar@declarada | Validación jerárquica y conservación de metadatos ajenos al editor. |
| DELETE | /api/v1/politicas/lineas/{id} | permiso:politicas:gestionar@declarada | 409 si hay aportes, mesas, indicadores, asignaciones o instrumentos vinculados. |
| GET | /api/v1/politicas/lineas/gestion | roles:autoridad_distrital,administrador_identidades,auditor_forense | Catálogo administrativo completo, incluidas líneas inactivas; auditor solo lectura. |

El listado público existente sigue mostrando líneas activas. No se conceden nuevos permisos ni se modifican roles. El editor administrativo no publica respuestas ciudadanas.

## Mapeo de actores estratégicos — decisión AUD-14

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/actores | publico | Catálogo de actores estratégicos para control social y formulación participativa. |
| GET | /api/v1/actores/kpis | publico | Agregaciones estadísticas y distribución en cuadrantes de poder e interés. |
| GET | /api/v1/actores/{id} | publico | Ficha técnica pública de caracterización y postura del actor. |
| POST | /api/v1/actores | permiso:politicas:gestionar@declarada | Registro de actor con validación de procedencia y trazabilidad de auditoría. |
| PUT | /api/v1/actores/{id} | permiso:politicas:gestionar@declarada | Actualización de caracterización y acciones con registro inmutable. |
| DELETE | /api/v1/actores/{id} | permiso:politicas:gestionar@declarada | Desactivación o retiro con justificación técnica obligatoria en auditoría. |

## Banco de Alternativas de Solución MGA — decisión EDIT-09

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/alternativas | publico | Catálogo público del banco distrital de alternativas MGA para deliberación ciudadana. |
| GET | /api/v1/alternativas/{id_o_codigo} | publico | Ficha técnica pública de iniciativa de solución MGA por identificador o código. |
| POST | /api/v1/alternativas | permiso:alternativas:gestionar@declarada | Formular iniciativa en el Banco Distrital de Alternativas MGA con gating de Fase 2. |
| PATCH | /api/v1/alternativas/{id} | permiso:alternativas:gestionar@declarada | Actualización controlada de iniciativa con trazabilidad de auditoría inmutable. |
| DELETE | /api/v1/alternativas/{id} | permiso:alternativas:gestionar@declarada | Retiro de alternativa con validación de dependencias en compromisos PAS. |

## Módulo de Comunicaciones y Cronograma de Trabajo

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/comunicaciones/tareas | permiso:comunicaciones:leer@declarada | Consulta del plan de trabajo, tareas y cronograma de comunicaciones de la política pública. |
| GET | /api/v1/comunicaciones/tareas/{id} | permiso:comunicaciones:leer@declarada | Consulta detallada de una tarea específica del cronograma de comunicaciones por su UUID. |
| POST | /api/v1/comunicaciones/tareas | permiso:comunicaciones:gestionar@declarada | Creación de nuevas tareas y actividades en el cronograma institucional de comunicaciones. |
| PUT | /api/v1/comunicaciones/tareas/{id} | permiso:comunicaciones:gestionar@declarada | Actualización completa de tarea, fechas, entregables y responsables en el cronograma. |
| PATCH | /api/v1/comunicaciones/tareas/{id} | permiso:comunicaciones:gestionar@declarada | Modificación parcial de fechas, estado o territorio de una tarea de comunicaciones. |
| DELETE | /api/v1/comunicaciones/tareas/{id} | permiso:comunicaciones:gestionar@declarada | Retiro o cancelación de una tarea en el cronograma de trabajo de comunicaciones. |

## Motor Transaccional de Notificaciones y Radicación Ciudadana — decisión NOTIF-FEEDBACK-01

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/notificaciones/radicado/{codigo_radicado} | publico | Consulta pública del estado de tramitación ciudadana por radicado POL-2026-XXXX. |
| GET | /api/v1/notificaciones/historial | permiso:auditoria:leer@declarada | Supervisión forense e institucional del historial de notificaciones transaccionales despachadas. |

## Canal Conversacional WhatsApp e Ingesta Comunitaria — decisión CANAL-WHATSAPP-01

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/canales/whatsapp/webhook | publico | Handshake de suscripción y verificación exigido por Meta WhatsApp Cloud API. |
| POST | /api/v1/canales/whatsapp/webhook | publico | Recepción asíncrona de eventos y mensajes comunitarios entrantes desde Meta. |
| POST | /api/v1/canales/whatsapp/simular | publico | Ingesta de reportes y propuestas comunitarias directas para pruebas y auditoría forense. |



