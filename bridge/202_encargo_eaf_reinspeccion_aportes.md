# EAF-AP-GOLIVE-02 · Reinspección independiente de aportes y persistencia

26-oct-2026. Encargo del coordinador al evaluador independiente de171. El usuario autorizó atender los pendientes GO-LIVE y delegar la evaluación; el implementador de182/183 no emite este dictamen.

## Preparación y congelación

Leer AGENTS, arquitectura, transacciones, identidad, permisos, equipo EAF y `polis-eaf-transactions`, además de171,182,183 y190. Los defectos originales están en171 y sus evidencias se conservan intactas. El check global18 terminó con1419 aprobadas,11 fallos y16 omisiones: clasificar sus límites leyendo trazas, sin asumir que toda restricción de guarda es defecto de producto.

Puede preparar casos y entorno propios ahora. **No comenzar las comprobaciones funcionales finales hasta recibir de raíz `INICIAR_REINSPECCION_APORTES` y el hash final de0084.** EDD está cerrando una validación de contacto legado para impedir truncamiento o conversión silenciosa. La global18 corresponde al snapshot anterior a esa última corrección y no acredita por sí sola el archivo final.

Únicas escrituras autorizadas del evaluador: `bridge/203_reinspeccion_eaf_aportes.md` y `bridge/203_evidencia_eaf_aportes/`. No modificar aplicación, tests de producto, frontend, docs, banco ni evidencias anteriores. No reutilizar las bases de171,183,190,199 u otros agentes. Dos bases locales nuevas propias `polis_test*`, desde template0; la segunda para downgrade/reconstrucción, distinta de la principal. No base productiva, proveedores reales, deploy, commit o push. Credenciales solo en memoria; nunca publicar DSN.

Copiar/adaptar guarda190v2, comprobar nombres exactos/host/puerto/drivers y escritura antes de cargar aplicación. Declarar su límite: no es sandbox universal de subprocess nativos. Si un test necesita archivos temporales, redirigir únicamente a evidencia propia; no habilitar escritura en banco o cachés activos. Conservar iteraciones fallidas. Fijar hashes de fuentes, migraciones, fixtures y documentos al inicio/final y contrastar snapshot final183.

## Hallazgos y regresiones a comprobar

1. AP-01: alta/edición confirman aporte e intención juntos; cero transporte antes del commit. Probar éxito y fallos posteriores a flush, validación, cancelación y commit PostgreSQL real desde otra conexión. Worker sobre intención confirmada, reclamación concurrente, lease/reintento, token de finalización y caída tras aceptación simulada. Garantía al menos una vez y posible duplicado; no prometer exactamente una vez ni confundir simulación con entrega.
2. AP-02: altas ciudadanas solo borrador/publicado, por HTTP y servicio; estados institucionales requieren gestión autorizada y devolución motivada. Preservar controles positivos de gestión y permisos.
3. AP-03: correo privado y proyección pública cerrada en alta, edición, lista, detalle y devolución; JSON legado heterogéneo no filtra contacto/huella/sesión ni metadatos abiertos. Verificar columna y snapshot SQL sin publicar datos sensibles.
4. AP-04: dos sesiones de una cuenta comparten un apoyo estable; alternancia/retiro secuenciales y concurrentes, cuenta inactiva/revocada/correspondencia inválida, anónimo conserva su identidad propia. Sin equivalencias inferidas de personas.
5. AP-05: dos devoluciones concurrentes con conexiones distintas producen una única decisión durable; rollback revierte estado y auditoría. Fijar precondiciones y comprobar refresh bajo lock.
6. AP-06: recepción de lote WhatsApp atómica y durable antes de HTTP200, trabajador por mensaje, válido/corto/válido procesa ambos válidos. Reentrega secuencial/concurrente, colisión de contenido, cuenta receptora, recuperación tras fallo y commit, configuración y HMAC sobre cuerpo crudo. No proveedor real; no confundir recepción con radicación.
7. AP-07: CHECK tipo_sujeto en ORM y catálogo real; escritura inválida rechazada y rollback íntegro. Alembic check con modelos completos.
8. AP-08/común: fixture explícita y segunda base para ensayos destructivos, sin fallback a `.env` en tests. Puede ejecutar dirigidas pertinentes con ambas bases propias; no bajar/reconstruir la principal.

## Migración0084 y consumidores

Instalación desde vacío, repetición/check, casos legados conservados, apoyos con equivalencia única demostrable y rechazo íntegro de huérfanos/ambiguos. Verificar journal y contadores, sin resucitar apoyos retirados. Downgrade compatible conserva trazabilidad privada; incompatibles deben abortar antes de mutación con snapshot/versionado idénticos. Contacto legado no-string o mayor de255 debe rechazar upgrade atómicamente, sin truncar/convertir ni alterar original. Casos nulo/ausente/válido deben conservarse conforme al contrato final.

Comprobar CLI de inbox/outbox con transportes capturados/simulados, sin SMTP/Meta reales. Revisar documentación final de operación/permisos, consistencia del contrato y límites de entrega. La revisión UI/frontend general sigue separada; coordinación integrará los textos de aportes en docs y avisará sus hashes antes del cierre documental.

## Dictamen

Ejecutar evidencia propia independiente de las regresiones EDD; no convertir lectura o cifras previas en pruebas nuevas. Informar pronto defectos reproducibles, sin modificar el objeto evaluado. Describir comandos, resultados, exclusiones, hashes y límites. La severidad y aprobación son juicio del evaluador. Un cierre de criterios backend no aprueba GO-LIVE global, proveedores, despliegue ni universalidad del banco de fuentes.
