# Encargo 303 — Cierre integral verificable de POLIS

Inicio: 2026-11-06. Autorización: el usuario indicó «adelante» tras identificar
cuatro cierres pendientes. Referencia inicial: `main` en `afccb46`.

## Objetivos y aceptación

| Frente | Trabajo | Aceptación |
| --- | --- | --- |
| C1. Calidad e integración | Preparar laboratorio PostgreSQL y HTTP aislado; ejecutar checks, suites y recorridos completos; corregir fallos reproducibles. | Resultados por módulo, rol y tipo de persistencia; omisiones justificadas; ninguna escritura de pruebas en producción. |
| C2. Marco legal 302 | Probar teclado, cambio de pestañas, anclas, móvil, temas, movimiento reducido y axe en navegador real. | Evidencia ejecutable y regresiones; corregir defectos observados; separar verificación técnica y soporte documental de afirmaciones jurídicas. |
| C3. Indicadores y fuentes | Revisar las 29 fichas, unidades, denominadores, licencias, fuentes y referencias territoriales. | Matriz por indicador con evidencia y estado real; resolver las brechas documentales posibles; registrar los insumos externos pendientes sin inventar acreditaciones. |
| C4. Producción | Comparar revisión local y release activa, preparar artefacto de la versión verificada y comprobar su publicación. | Commit, Build ID, manifiesto y respuestas operativas coherentes; recuperación disponible; controles posteriores al despliegue. |

## Secuencia

1. Fijar snapshot y estado inicial; preparar copia aislada y base `polis_test_303*`.
2. Ejecutar controles independientes que no comparten recursos de escritura.
3. Reproducir y corregir fallos; añadir las regresiones correspondientes.
4. Contrastar fuentes y registrar el resultado por indicador y por afirmación.
5. Repetir los controles sobre el candidato final, compilar y documentar alcance.
6. Publicar los cambios verificados conforme a la autorización Git del usuario;
   actualizar producción y comprobar la versión publicada con recuperación.
7. Entregar `bridge/303_entrega_codex_cierre_integral.md` y matriz JSON de cierre.

## Reglas de ejecución

- Los cambios previos de otros agentes y artefactos de `r4` se conservan.
- Las bases y puertos se validan antes de pruebas destructivas. Los fixtures,
  credenciales y archivos operativos de laboratorio se mantienen aislados.
- Se aplican `AGENTS.md`, guías POLIS UI, contrato de transacciones e identidad.
- Las modificaciones propias se presentan como evidencia del implementador.
  La aceptación EAF independiente conserva su autor y su alcance.
- Una prueba verde no acredita todos los estados de la plataforma. La matriz
  distingue completado, fallido, omitido y pendiente de insumo o decisión externa.
- Los indicadores conservan sus estados hasta que se cumplan los criterios reales
  de publicación. La fecha de revisión no se usa como vigencia normativa o censal.
