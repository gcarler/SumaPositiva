# Remediación de coordinación · Aislamiento, configuración y contrato de identidad

26-oct-2026. Cambios de coordinación posteriores a los dictámenes169/171. Evidencia técnica EDD; no constituye evaluación independiente ni autorización GO-LIVE. Rama `remediacion/aud-2026-10-21`, HEAD `07096bcd73531415d8b8329a8aba0ad64fa5d23c` y árbol compartido con cambios anteriores. No se atribuye el diff completo a esta entrega.

## Cambios realizados

- Retirada la lectura directa de `.env` y la conexión de trabajo de `test_geodatos_analitica_hurtos.py`. El ensayo compara contenido/conteos del contexto institucional antes/después de consultas GET usando exclusivamente la fixture aislada. No fija censos productivos ni afirma comprobar producción.
- Regresión AST para esa conexión y para impedir que conftest vuelva a crear un DSN por defecto. Conftest exige `POLIS_TEST_DATABASE_URL` explícita; sin ella omite integración con causa y no extrae credenciales de la base de trabajo.
- Los ocho ensayos que ejecutan downgrade/reconstrucción, distribuidos en siete archivos, llevan marcador `migration` y consumen una segunda base mediante `POLIS_TEST_MIGRATIONS_DATABASE_URL`. Ambos destinos deben ser PostgreSQL `polis_test*` y tener nombres distintos. Contexto de integración y provisión de usuarios siguen la base seleccionada, incluidos fixtures de formularios. Una regresión AST comprueba que futuros ensayos destructivos no vuelvan a usar el destino principal.
- CI declara/provisiona la segunda base vacía. Su YAML se parseó y se comprobó la configuración; el workflow remoto no se ejecutó en esta entrega.
- Añadidos a Settings `whatsapp_habilitado=false`, `whatsapp_app_secret=None` y `whatsapp_verify_token=None`, ejemplo sin secretos y dos pruebas. La implementación182/183 consume esos campos; esta entrega no activa un proveedor.
- Registrado `canales_models` en metadata Alembic para el inbox de0084.
- Actualizados `docs/identidad.md` y la sección correspondiente de `docs/permisos-api.md`: privilegios de0054, alcance MFA/ámbitos vigente, enrolamiento limitado, verificación de correo al consumo y nombres reales de las respuestas. La revisión independiente debe confirmar el cierre documental; el consumidor187 sigue siendo otro alcance.

## Verificación ejecutada

Dos bases nuevas propias, creadas desde `template0`, con extensiones solo en ellas:

- Principal: `polis_test_edd_coord_20261026_d4afb7fa`.
- Reconstrucción: `polis_test_edd_coord_migrations_20261026_62af2ac9`.

DSN resueltos en memoria, sustituidos y validados antes de importar configuración; no se publican. No se reutilizan bases de otros agentes ni se cambian roles/servicios. SMTP real y red externa bloqueados durante estas comprobaciones.

| Comprobación | Resultado |
| --- | --- |
| Primera dirigida configuración/geodatos/aislamiento |9 aprobadas.|
| Primera separación de reconstrucción y políticas |16 aprobadas.|
| Ocho archivos de migraciones/fixtures y sus flujos normales |76 aprobadas, sin omisiones.|
| Solo los ocho ensayos marcados `migration` |8 aprobados;1437 casos deseleccionados por alcance, no omitidos por fallo.|
| Políticas de selección/marcado de bases |7 aprobadas.|
| Final configuración/geodatos/aislamiento/reconstrucción |18 aprobadas, sin omisiones.|
| Contenido de la base principal antes/después de los ocho ensayos |71 tablas: conteos y SHA-256 de contenido idénticos; cero diferencias.|
| Guardas v1 y v2 |11 y15 rechazos anteriores a I/O respectivamente; v2 añade host/puerto/hostaddr y conexión positiva al destino propio.|
| Ruff/formato de archivos modificados |Conformes en corridas dirigidas; el check global posterior183 registra su propio resultado.|

Las cifras de las distintas corridas se solapan; no se suman como pruebas únicas. JUnit, comandos y resultados completos: [directorio190](190_evidencia_coordinacion_aislamiento/). El [cotejo de la base principal](190_evidencia_coordinacion_aislamiento/cotejo_principal_migraciones.json) solo se refiere a las tablas de aplicación de la base propia de pruebas.

El lanzador y guardas son instrumentos locales. V2 permite únicamente los dos nombres exactos, hosts loopback y puerto5432; rechaza SMTP/red externa y escritura Python del repositorio fuera de evidencia. TMPDIR/TMP/TEMP apuntan al directorio propio. No es una sandbox universal de procesos nativos. La versiónv1 original se conserva archivada; los logs identifican el hash de guarda usado en cada ejecución.

## Iteraciones y límites

Se conservan un E501 inicial y un orden de imports I001, corregidos antes de las corridas finales. El primer registro del snapshot principal tuvo colisión entre el nombre del archivo de datos y el JSON de metadata del lanzador: los datos y el log ya estaban escritos, la metadata exclusiva rechazó sobrescritura y el lanzador terminó1. Se preservó ese intento y el snapshot previo; el posterior usó nombres separados. No hubo cambio de base por ese error de instrumentación.

El global de183 se interrumpió antes de completar al descubrir más fixtures destructivas compartidas; después de la separación se relanzó con snapshot nuevo. Este documento no convierte una corrida interrumpida ni una restricción de guarda en aprobación. Datos/corpus externos, consumidor/UI, disponibilidad y operación real tienen evidencias separadas.

Los hashes finales de los veinte archivos de este alcance están en [snapshot final](190_evidencia_coordinacion_aislamiento/snapshot_final_coordinacion.json). No se guardan diffs que pudieran reproducir credenciales retiradas. Sin commit, push, reinicio de servicios, despliegue ni modificación del diagnóstico o del banco activo.
