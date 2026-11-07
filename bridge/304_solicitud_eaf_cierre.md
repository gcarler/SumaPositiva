# Solicitud de EAF independiente — Encargo 304

2026-11-07. Implementador: Codex. No constituye dictamen ni aceptación.

## Snapshot y aislamiento

La base de aplicación es `9b6ce79460244e85e8f62c7371e822c8e12e0d01`.
Los archivos propios y la operación final se fijan en
`304_evidencia_cierre/snapshot_revision_eaf_r3.json`; R1 y R2 son cortes anteriores.
La edición concurrente
SM Core queda fuera de la aceptación funcional de 304. Su código comprometido
en `da4c54f2` se incluyó en la suite final; la migración 0097 sin commit se excluyó
de la release. No debe incorporarse a la aceptación de 304 sin su revisión.

Pruebas sobre `polis_test_304_corpus_r3` y `polis_test_304_migraciones`, PostgreSQL
18 en 127.0.0.1:15433. Los recorridos de navegador usan otra base,
`polis_test_304_e2e`. No se escribe en `bd_csh`, SMTP, Drive ni el proxy real.
El clúster 15433 es compartido: no detenerlo ni reconstruir bases ajenas.
Las credenciales se mantienen en archivos privados y no forman parte del informe.

## Controles que requieren contraste independiente

1. **Office y cadena de custodia.** Clasificar los 14 pendientes por contenido:
   siete XLSX con estilos inválidos, cuatro XLSX EPA con formato vacío masivo,
   un XLSB y dos Word mal nombrados. La receta v3 debe conservar SHA originales,
   posiciones, fórmulas/cachés donde corresponda y valores numéricos. Revisar
   límites ZIP/XML, archivos hostiles, deriva de precisión y reproducibilidad.
   Dos libros embebidos en Word se identifican separadamente; Word no equivale
   a observaciones tabulares.
2. **Persistencia.** Contrastar el piloto real v3, los contadores SQL de ambas
   rondas y el rollback inyectado después de dos flush reales. La deduplicación
   no debe aumentar observaciones al repetir una carga.
3. **Ceros presupuestales.** Hay 67 sustituciones confirmadas en el corpus previo.
   Verificar el plan fijado por SHA, datos originales, valor anterior, bloqueo
   de filas, abortos ante plan obsoleto, rollback e idempotencia. La corrección
   se ensayó en laboratorio y se aplicó mediante un plan distinto, fijado contra
   producción y respaldado. Verificar las evidencias de ambas operaciones y
   el recálculo de cachés. El plan de prueba no se puede aplicar a otra base.
4. **Workspace.** Un guion inexistente/vacío o un fallo local del informe deben
   abortar antes de solicitar token o modificar archivos remotos. La prueba
   sintética cubre el sello, pero no reemplaza el guion auténtico pendiente.
5. **CSP.** Contrastar política activa/de referencia, sonda bloqueada, recorridos
   con Enforce y ausencia de violaciones inesperadas. El ensayo local conserva
   literalmente las directivas; no aprueba por sí solo la activación productiva.
   Emitir decisión explícita sobre el gate descrito en `docs/nginx-csp-polis.conf`.
6. **Fuentes y aceptación.** No equiparar descarga, licencia, validación
   metodológica y permiso para publicar. Los candidatos PAE y directorio de
   Casas de Justicia conservan su escala y sus límites, sin imputación por barrio.
7. **Gold set.** Verificar CSV completo, 240 alias distintos, rechazo de referencias
   históricas ambiguas y compatibilidad unívoca. El JSON primario no se reescribió;
   no existen anotaciones humanas registradas.
8. **Release backend.** Contrastar commit `43321fc4`, archivos del namespace del
   servicio, grafo 0096, evidencia de readiness y configuración del drop-in. La
   migración 0097 queda intacta en el host y no forma parte del código desplegado.
   No se cambió la guarda de readiness para forzar un resultado positivo.

## Evidencia disponible y cierre

`304_evidencia_cierre/` contiene los perfiles, auditoría de ceros antes/después,
persistencia v3 y cotejo CSP. Los originales y derivados están en directorios
privados de `backups/`; se facilitan al evaluador local sin incorporarlos a Git.
Suite completa final: 1.915 aprobadas, una omisión por guion auténtico ausente,
cero fallos; 960 Bun y 13 recorridos Enforce aprobados. Se adjuntan las operaciones
productivas y sus límites. El expediente 307 de Buffy excluye el commit `43321fc4`
y no sustituye la revisión actual. Se solicita dictamen independiente del snapshot
actual y decisión explícita sobre CSP Enforce. No se acredita todavía el 100 %.
