# Estado de coordinación · Fuentes territoriales y revisiones GO-LIVE

26-oct-2026. Este documento informa el estado del trabajo; no aprueba despliegue.

## Bloque territorial validado localmente

La ficha, CLI, parser, resolver, adaptador de catálogo y conciliador superaron234 pruebas dirigidas dos veces y Ruff/formato en14 archivos. Evidencia y límites en157. La ficha continúa provisional hasta validación semántica, condiciones de uso e integración con los consumidores de aplicación.

Cuatro capturas públicas TerriData (161) fueron cotejadas por coordinación: SHA ZIP/TXT, miembro, CRC y correspondencia entre original y TXT guardado.167 desglosa nombres y códigos, y174 reproduce el contraste local:

| Entidad | Código | Filas | Códigos concordantes | Nombres fuente / catálogo |
| --- | --- | ---: | ---: | --- |
| Cartagena | 13001 | 12.899 | 12.899 | conservados como literales distintos |
| Santa Catalina | 13673 | 12.733 | 12.733 | conservados como literales distintos |
| Sahagún | 23660 | 12.885 | 12.885 | conservados como literales distintos |
| Bogotá | 11001 | 13.410 | 13.410 | conservados como literales distintos |
| **Total** | | **51.927** | **51.927** | |

La primera lectura161 comparó además nombres del catálogo DANE con los de TerriData y marcó todas las filas discordantes. Eso se explica por sus literales diferentes; no se convirtió esa observación en conflicto de códigos ni se borraron nombres. La segunda lectura comprueba solo códigos. No acredita equivalencia jurídica de nombres, unidad de observación, base censal o aptitud analítica.

Ollamacodex tiene176 para construir/cotejar cuatro fichas provisionales con el CLI congelado, sin modificar aplicación ni banco; entrega177 pendiente.

## Evidencia demográfica primaria

165 conserva dos HTML DANE y sus manifiestos. El perfil141 contiene **19 etiquetas de atribución literales**; la tabla165 las presenta en18 filas porque agrupa dos variantes del Observatorio Nacional de Migraciones. No es un conteo de instituciones.

Precisión de coordinación: la ausencia de `datePublished/dateModified` no implica ausencia de fechas en el cuerpo de una página. El HTML capturado de [proyecciones DANE](https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion), SHAe8e96e490b0cbd99acd6d889127669ae1163dc58dc897d4b63fad38ac1e2f534, contiene12 menciones visibles entre18-julio-2025 y8-agosto-2025 junto a productos. Son fechas de los productos descritos; no asignan una edición a toda la página ni a todas las series TerriData. OpenCode tiene172/173 para completar esa precisión con punteros y vínculos.

Una coincidencia numérica con un anexo solo corrobora una candidatura de linaje. Para acreditarla deben cotejarse territorio, definición, unidad/universo, periodo, base/edición, transformaciones del productor y evidencia de vínculo. No se reasignaron bases a las354 series ni se calculó población2026. Se mantiene la preferencia del usuario respecto a las bases censales, distinguiendo año del dato y edición disponible.

## Evaluación independiente de GO-LIVE

Encargos ejecutándose por evaluadores nuevos que no implementaron el alcance:

- `/root/eaf_identidad_go_live`:168 → dictamen169 y evidencia169; usuarios/login/MFA/permisos/tokens y transacciones de identidad.
- `/root/eaf_aportes_go_live`:170 → dictamen171 y evidencia171; aportes y dependencias transaccionales directas.

Cada evaluador provisionó su base nueva `polis_test_eaf_*`, registra snapshot/hashes, precondiciones de extensiones, pruebas y límites, y conserva guardas para impedir conexiones a bases ajenas y efectos externos. Las corridas interrumpidas se registran y no cuentan como comprobaciones completas. No se han emitido dictámenes finales ni se ha autorizado GO-LIVE.

Freebuff cerró165 y retomó el frontend/GO-LIVE que el usuario le encargó en su sesión. No firma sus propios cambios como auditor independiente.134/143 corresponden al resolver territorial; sus precisiones146 y la integración de ficha no aportaron un nuevo defecto reproducido que justifique reabrir ese alcance. Los dictámenes de identidad de usuarios y aportes son evaluaciones nuevas.

Coordinación no hizo commit, push ni despliegue, ni modificó fuentes originales, banco o src en el bloque territorial. Las bases aisladas nuevas corresponden exclusivamente a las auditorías EAF solicitadas después; no son ingesta productiva.
