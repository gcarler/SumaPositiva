# EAF-ID-GOLIVE-01 · Dictamen independiente de identidad de usuarios

Solicitud de coordinación recibida26-oct-2026. Evaluador nuevo, sin participación en implementación. Revisión de `docs/identidad.md`, módulos autenticación/identidad/sesión y dependencias de autorización, permisos, migraciones y pruebas pertinentes. Conservar cambios ajenos; no remediar código ni cambiar docs de estado.

Aplicar AGENTS, arquitectura, transacciones, docs/equipo_auditores_forenses.md y `.agents/skills/polis-eaf-transactions/SKILL.md`. Snapshot inicial HEAD07096bcd73531415d8b8329a8aba0ad64fa5d23c en rama remediacion/aud-2026-10-21; el árbol compartido contiene cambios no confirmados. Registrar hashes de los archivos revisados antes/después, no atribuir todo el árbol al HEAD.

Únicas escrituras de repositorio: `bridge/169_dictamen_eaf_identidad.md` y nuevo directorio `bridge/169_evidencia_eaf_identidad/` para logs/XML/manifiestos/guiones de reproducción. Sin app/tests/src, commit/push/deploy ni mensajes externos. No reabrir134/143 (resolver territorial, dominio diferente).

Seguir endpoint→servicio→repositorio; permisos actuales/revocación/propiedad/delegación, último administrador concurrente, registro público sin promoción, tokens de propósito/caducidad/uso único, hash/sesiones/tokens/eventos en rollback, cola y retry SMTP. No enviar correo real ni activar servicios externos. Contrastar rutas y excepciones públicas con permisos-api.

Pruebas dirigidas pertinentes y comprobación backend:check autorizadas **solo en base aislada nueva `polis_test_eaf_identidad_20261026_<sufijo>`**. No usar bases de otros agentes. Antes de importar configuración/pytest, fijar explícitamente POLIS_TEST_DATABASE_URL y POLIS_DATABASE_URL a esa base; validar nombre con make_url. No fallback, lectura ni escritura de bd_csh o bases productivas. Se permite provisionar una base de pruebas nueva mediante acceso local si está disponible, con credenciales efímeras no expuestas y sin modificar roles/servicios de aplicación. No borrar bases preexistentes. Si falta acceso, avanzar revisión estática y declarar exactamente lo no ejecutado.

Probar éxito desde otra conexión y rollback tras flush/validación/commit/cancelación; en migraciones afectadas, instalación vacía, metadata/Alembic y reconstrucción con datos de prueba conservados. Un mock o suite omitida no acredita atomicidad real. No editar tests de aplicación: los escenarios adicionales de auditoría van en tu directorio de evidencia y solo usan la base aislada.

Dictamen con evaluador/independencia, snapshot y hashes, alcance, criterios, comandos/versiones/base sin credenciales, resultados, hallazgos con ruta/línea/entrada/salida/consecuencia/severidad y límites. Estados según formato EAF: APROBADO/OBSERVADO/BLOQUEADO/NO EVALUADO, acotados al alcance. No certificar disponibilidad/legitimidad jurídica universal/GO-LIVE completo ni autorizar despliegue. Reportar progreso al coordinador y entregar rutas al terminar.
