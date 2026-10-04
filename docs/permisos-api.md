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
| presupuesto:gestionar | autoridad_distrital | declarada |
| indicadores:gestionar | autoridad_distrital | declarada |
| instrumentos:gestionar | autoridad_distrital, facilitador_mesa | declarada |
| ia:analizar | autoridad_distrital, facilitador_mesa | declarada |
| mesas:abrir | autoridad_distrital, facilitador_mesa | declarada |
| mesas:fotos:subir | autoridad_distrital, facilitador_mesa | declarada |
| mesas:acuerdos | autoridad_distrital, facilitador_mesa | declarada |
| asistencia:verificar | autoridad_distrital, facilitador_mesa | declarada |
| aportes:priorizar | autoridad_distrital | declarada |
| aportes:responder | autoridad_distrital | declarada |
| formularios:leer | autoridad_distrital, facilitador_mesa, administrador_identidades, auditor_forense | declarada |
| formularios:gestionar | autoridad_distrital, facilitador_mesa, administrador_identidades | declarada |
| testimonios:moderar | autoridad_distrital, facilitador_mesa | declarada |
| politicas:gestionar | autoridad_distrital, administrador_identidades | declarada |
| auditoria:leer | autoridad_distrital, administrador_identidades, auditor_forense | declarada |
| seguimiento:gestionar | autoridad_distrital, administrador_identidades | declarada |

Los roles ciudadano, ciudadano anónimo y auditor forense no reciben permisos de
gestión institucional. El registro público solo admite ciudadano. Asignaciones
privilegiadas requieren el canal administrativo descrito en [operación](operacion.md).
Los permisos institucionales actuales tienen alcance global del rol; no se afirma
que exista asignación por mesa o territorio. Un alcance más fino requiere contrato
y comprobaciones de recurso antes de habilitarlo.

## Inventario comprobado

La última columna explica la excepción pública o la condición adicional.

| Método | Ruta | Control | Motivo o condición |
| --- | --- | --- | --- |
| GET | /api/v1/aportes | publico | Consulta pública de participación y devoluciones motivadas. |
| POST | /api/v1/aportes | sesion | Sesión cívica anónima o registrada; token obligatorio y vigencia de la cuenta. |
| DELETE | /api/v1/aportes/{aporte_id} | permiso:aportes:priorizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/aportes/{aporte_id} | publico | Consulta pública de participación y devoluciones motivadas. |
| PATCH | /api/v1/aportes/{aporte_id} | permiso:aportes:priorizar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/aportes/{aporte_id}/apoyar | sujeto | Un apoyo por sujeto; contador y registro en la misma transacción. |
| GET | /api/v1/aportes/{aporte_id}/devolucion-razon | publico | Consulta pública de participación y devoluciones motivadas. |
| POST | /api/v1/aportes/{aporte_id}/devolucion-razon | permiso:aportes:responder@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/auditoria/registros | permiso:auditoria:leer@declarada | Consulta forense inmutable de razones motivadas y trazabilidad. |
| GET | /api/v1/auditoria/respaldos | permiso:auditoria:leer@declarada | Supervisión de copias de seguridad lógicas y verificación de hash SHA-256. |
| POST | /api/v1/auditoria/respaldos/ejecutar | permiso:auditoria:leer@declarada | Ejecución supervisada de respaldo en caliente de la base de datos. |
| GET | /api/v1/compromisos | publico | Máxima publicidad y transparencia activa de compromisos PAS Cartagena. |
| POST | /api/v1/compromisos | permiso:seguimiento:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/compromisos/kpis | publico | Consulta pública de KPIs consolidados de seguimiento del PAS. |
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
| GET | /api/v1/health/live | publico | Comprobación de vida/disponibilidad; no publicar credenciales ni errores internos. |
| GET | /api/v1/health/ready | publico | Comprobación de vida/disponibilidad; no publicar credenciales ni errores internos. |
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
| GET | /api/v1/identidad/verificar-nivel | permiso:aportes:crear@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/indicadores/cadena-valor | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/indicadores/fichas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/indicadores/fichas | permiso:indicadores:gestionar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/indicadores/fichas/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
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
| GET | /api/v1/mesas/geovisor | publico | Estado agregado y centroides territoriales de referencia; solo fotos aprobadas. |
| POST | /api/v1/mesas/{mesa_id}/fotos | permiso:mesas:fotos:subir@declarada | Imagen saneada, autorización declarada y vínculo atómico; queda pendiente de moderación. |
| GET | /api/v1/mesas/fotos/pendientes | permiso:testimonios:moderar@declarada | Cola de revisión institucional; no expone imágenes en lectura pública. |
| POST | /api/v1/mesas/fotos/{foto_id}/revision | permiso:testimonios:moderar@declarada | Revisión institucional única; solo aprobación autorizada se expone al público. |
| GET | /api/v1/mesas/fotos/{foto_id}/revision/archivo | permiso:testimonios:moderar@declarada | Archivo pendiente accesible solo para moderación institucional. |
| POST | /api/v1/mesas | permiso:mesas:abrir@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/mesas/{mesa_id} | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| GET | /api/v1/mesas/{mesa_id}/acta | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| POST | /api/v1/mesas/{mesa_id}/acta | permiso:mesas:acuerdos@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| POST | /api/v1/mesas/{mesa_id}/acta/cerrar | permiso:mesas:acuerdos@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/mesas/{mesa_id}/participantes | permiso:asistencia:verificar@declarada | Registro nominal de asistencia reservado a gestión de mesa. |
| POST | /api/v1/mesas/{mesa_id}/participantes | permiso:asistencia:verificar@declarada | Registro nominal de asistencia reservado a gestión de mesa. |
| GET | /api/v1/mesas/{mesa_id}/submesas | publico | Convocatorias y actas de deliberación pública; participantes nominales están protegidos. |
| POST | /api/v1/mesas/{mesa_id}/submesas | permiso:mesas:abrir@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/participacion/canal-escenarios | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/canal-mesas | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/canal-web | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/consolidado | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| GET | /api/v1/participacion/escenarios-especiales | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| POST | /api/v1/participacion/escenarios-especiales | permiso:asistencia:verificar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
| GET | /api/v1/participacion/escenarios-especiales/{id} | publico | Consulta pública de catálogos y resultados de política para transparencia. |
| PUT | /api/v1/participacion/escenarios-especiales/{id} | permiso:asistencia:verificar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
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
| POST | /api/v1/sesion/anonima | publico | Emisión pública para participación sin cuenta registrada. |
| GET | /api/v1/sesion/verificar | sesion | Sesión cívica anónima o registrada; token obligatorio y vigencia de la cuenta. |
| GET | /api/v1/testimonios | publico | Consulta pública de relatos de memoria social y testimonios comunitarios. |
| POST | /api/v1/testimonios | sujeto | Creación de testimonio comunitario vinculada a sesión cívica o cuenta de usuario. |
| GET | /api/v1/testimonios/gestion | permiso:testimonios:moderar@declarada | Gestión autorizada según permiso o rol; validar también entrada y estado del recurso. |
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
