---
name: polis-eaf-transactions
description: Revisar atomicidad y límites transaccionales de persistencia POLIS para el equipo EAF, también denominado AUF por el usuario. Aplicar en auditorías de servicios, repositorios y operaciones de escritura; no en revisión exclusiva de UI.
---

# EAF: auditoría de transacciones

Lee `AGENTS.md`, `docs/arquitectura.md` y
[el contrato de transacciones](../../../docs/transacciones.md). Forense-backend
y forense-bd verifican siempre este contrato en cambios de persistencia;
forense-cicd verifica que la evidencia se ejecute en CI con una base `polis_test*`.
Forense-ia y forense-legal revisan las escrituras y trazabilidad que les competen.
Si el cambio no escribe datos, registra «no aplica» y la razón.

Sigue el flujo completo desde el endpoint hasta los repositorios. Comprueba una
sola confirmación por caso de uso, ausencia de commit/rollback en repositorios,
sesión exclusiva, respuesta validada antes del commit y bloqueos/versiones
conservados hasta finalizar. Revisa también llamadores directos y compensaciones
de archivos; un savepoint no acredita rollback del caso de uso completo.

Exige evidencia de éxito desde una sesión nueva y rollback ante fallo posterior
al primer flush, fallo de commit, validación y cancelación. Verifica todos los
estados dependientes, especialmente conversión MGA, participantes, cierre de
actas, devolución motivada y apoyos. Nunca pruebes contra `bd_csh` por ausencia
de la variable de pruebas ni interpretes mocks como prueba de atomicidad real.

Ejecuta las suites de transacciones y `bun run backend:check` en una base
`polis_test*`. Reporta archivo/línea, consecuencia, corrección y evidencia.
En cambios de migraciones, exige instalación en base vacía, `alembic check`,
downgrade/reconstrucción y actualización con datos anteriores conservados.
Comprueba que la metadata incluye modelos, esquemas e índices de la entrega;
un filtro que oculta diferencias no acredita conformidad. Revisa la cabeza
única y cualquier reparación excepcional del bootstrap histórico.

Commit intermedio o rollback parcial impide declarar conformidad del cambio.
Si una prueba no pudo ejecutarse, declara el límite de la revisión. Una auditoría
no autoriza publicar, desplegar ni modificar servicios externos.

Contrastar las rutas afectadas con `docs/permisos-api.md`, incluidas excepciones
públicas, nivel de identidad y condiciones de recurso. Verificar denegación y
éxito autorizado; los datos de pruebas privilegiados se provisionan en la base
aislada, nunca mediante autorregistro institucional.

Aplicar la independencia y formato de dictamen de
`docs/equipo_auditores_forenses.md`: quien implementó no firma como evaluador
independiente. Informar snapshot, alcance, severidades, evidencia y límites.
Una suite aprobada no demuestra disponibilidad, ausencia total de defectos ni
cumplimiento jurídico universal. Consultar el contrato de seguridad SQL en
`docs/arquitectura.md` al revisar funciones privilegiadas: esquemas confiables
y `pg_temp` al final, con permisos efectivos comprobados.


En cambios de identidad, contrastar `docs/identidad.md`: comprobar sesiones reales,
revocación y permisos actuales, propiedad, delegación, último administrador con
concurrencia y rollback del hash/sesiones/tokens/eventos. Probar propósito, caducidad,
consumo único concurrente y retry de correo. Distinguir cola probada de proveedor
SMTP activado; comprobar migración de cuentas existentes sin promoverlas.
