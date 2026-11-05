# Integración operativa de la fuente oficial de Policía

**Fecha:** 5 de noviembre de 2026, UTC. **Resultado:** carga aplicada en `bd_csh`, backend recargado y Geovisor verificado en el dominio público. Es una entrega técnica de EDD; no constituye un dictamen EAF ni aprueba las licencias o contratos pendientes del banco.

## 1. Qué quedó disponible

La fuente **`portal_policia_cuadros_cartagena`**, procedente del [portal oficial de estadística delictiva](https://www.policia.gov.co/estadistica-delictiva), está disponible en [el Geovisor](https://seguridadhumanaintegral.org/geovisor). En el Banco Multifuente se selecciona **Policía Nacional de Colombia**.

La consulta devuelve **133 observaciones anuales** de Cartagena, DIVIPOLA **13001**: 19 series entre 2020 y 2026. Incluyen 18 delitos/modalidades y el subtotal de hurtos, identificado para que no se sume con sus ocho modalidades. **2026 comprende enero–septiembre**, no un año completo.

Se conservan los **77 identificadores anteriores**, sus códigos, años, valores y fechas de creación. Se actualizó su procedencia acreditada y se añadieron **56 observaciones**. No se borraron registros. El banco del Geovisor pasó de **2.449 a 2.505 observaciones**; este recuento representa filas estadísticas, no personas o casos únicos.

La serie mensual de **1.539 observaciones** y el desglose por arma/medio de **7.290** permanecen como productos separados en el banco del servidor. La tabla actual del Geovisor es anual: esos productos no se cargaron como falsos totales anuales ni como puntos de ocurrencia.

El [cotejo previo](20261105_cotejo_fuente_oficial_policia.md) conserva el detalle de los nueve originales descargados, sus hashes, los controles aritméticos y las discrepancias. Esa entrega anterior corresponde al banco local; esta entrega añade su integración operativa.

## 2. Catálogo PostgreSQL y conservación de datos

El catálogo PostgreSQL estaba vacío. Se registró el inventario vigente sin promover automáticamente las fuentes:

| Objeto | Antes | Después |
| --- | ---: | ---: |
| Fuentes | 0 | 43 |
| Versiones | 0 | 43 |
| Contratos, en borrador e inactivos | 0 | 43 |
| Lotes capturados | 0 | 43 |
| Artefactos con SHA-256 | 0 | 1.928 |
| Paquetes | 0 | 8 |
| Indicadores del Geovisor | 2.449 | 2.505 |
| Observaciones de la nueva edición policial | 0 | 133 |

Se verificó desde otra conexión la conservación completa de **1.961 filas de otras fuentes** y de los valores de **411 filas de ediciones policiales anteriores**. De estas últimas, 209 observaciones desde 2020 reciben una anotación de cotejo y advertencia de no sumar con el portal; las anteriores a 2020 permanecen intactas. No se fabrica una continuidad entre publicaciones con definiciones distintas.

El registro del catálogo y la proyección del Geovisor son casos de uso separados. El primero conserva el estado capturado; la proyección confirma juntos los 133 indicadores, las anotaciones retrospectivas y la capa. La proyección usa el límite transaccional de POLIS, bloqueo por fuente, previsualización y SHA del estado esperado. Las reejecuciones se comprobaron sin duplicados ni cambios de marcas temporales.

El importador heurístico histórico rechaza este corte **antes de configurar o abrir una conexión**, evitando que una ejecución posterior duplique las 77 series o vuelva a clasificarlas por palabras clave. La ruta operativa es `backend/scripts/integrar_portal_policia.py`; otro corte requiere un nuevo cotejo.

## 3. Clasificación, riesgos y presentación

- El catálogo analítico **7D v6** conserva **119 observaciones PERS, 7 COM y 7 SAT**. Ninguna de las 133 queda sin clasificar en ese catálogo.
- El catálogo tradicional del Geovisor tiene una estructura distinta. Las siete observaciones SAT conservan su clasificación en metadatos y quedan sin equivalencia dimensional forzada en ese catálogo; siguen disponibles al consultar la fuente completa.
- La migración **`0096_riesgo_sin_evaluar`**, encadenada sobre `0095`, permite cargar conteos descriptivos sin inventar un riesgo bajo, medio, alto o crítico. Las 133 observaciones usan **«Sin evaluar»**.
- Se corrigió la interfaz que convertía cualquier valor desconocido en «Bajo». Se retiraron los recuentos estáticos de dimensiones y datasets; el total del banco y los grupos de fuentes se obtienen de la API.
- La verificación en navegador detectó una capa de OpenLayers repetida en el arreglo de inicialización. Se eliminó esa entrada duplicada, que impedía abrir el mapa.

Se conservaron las ocho discrepancias de lesiones personales de 2021: los registros agregados superan los cuadros publicados en **24**. La causa sigue **no determinada**. Los cuadros validados del publicador permanecen como referencia, sin alterar ninguno de los originales.

## 4. Verificaciones realizadas

| Verificación | Resultado |
| --- | --- |
| Laboratorio exclusivo `polis_test_policia_20261105`, puerto 5433 | Carga real, reejecución idempotente y reversión de fallos posteriores a escrituras, observadas desde conexiones nuevas. |
| Migraciones | Reconstrucción desde base vacía hasta `0096`; reversión y actualización de `0096` con 489 filas existentes intactas; `alembic check` **0** en laboratorio. |
| Downgrade con registros «sin evaluar» | Rechazo controlado sin pérdida de datos. Exige restaurar la carga antes de estrechar la restricción. |
| Cinco consumidores analíticos | Normalizador, contraste, series 7D, paneles temporales y tablero de operación reprodujeron exactamente los cinco hashes del corte. |
| Ruff y formato | **0**, en los siete archivos backend afectados por el catálogo, migración, modelos, importadores y referencia de versión. |
| `bun run check` final | **0**: guardas UI, TypeScript y ESLint. |
| Compilación de la release final | **0**, Build ID **`4jHdMKefPyBO4zRFx1Qy0`**. |
| PostgreSQL operativo | 133 observaciones verificadas contra el corte; 77 identidades conservadas; 1.961 filas ajenas intactas; cero eliminaciones. |
| API pública | HTTP **200**, 133 observaciones al filtrar la nueva fuente. |
| Chromium sobre el dominio público | 1440 claro, 1440 oscuro y 320 claro: 133 resultados, total del banco 2.505, 30 tarjetas de la primera página con «Sin evaluar», cero etiquetas «Bajo» inferidas, cero errores JavaScript y cero desbordamiento horizontal del documento. |

Se hicieron verificaciones funcionales del producto y de sus datos reales. **No se ejecutaron pytest ni la suite global de historias**; no se acredita cobertura de toda la aplicación ni conformidad WCAG por estas tres comprobaciones visuales. Se corrigieron nombres sin uso e importaciones que bloqueaban el lint en cambios previos y concurrentes; no se añadieron pruebas de aplicación.

Los intentos iniciales y sus errores quedan conservados. El laboratorio detectó la restricción de riesgo y un identificador de revisión demasiado largo, ambos corregidos antes de producción. Los primeros despliegues web encontraron incompatibilidad con la ruta de estáticos y una compilación concurrente que retiraba archivos de `.next`. Las compilaciones también emitieron advertencias del optimizador CSS. Los resultados finales arriba corresponden a la release aislada y comprobada, no a esos intentos anteriores.

## 5. Operación y recuperación

El frontend activo usa **`/root/polis-releases/policia_20261105_r2/standalone`**, fuera del checkout. El drop-in **`/etc/systemd/system/polis-frontend.service.d/20261105-policia.conf`** selecciona ese directorio y vacía `ExecStartPre`: la release ya incorpora sus estáticos. Reconstruir `.next` no actualiza ni elimina el artefacto activo. El procedimiento queda registrado en [operación](../docs/operacion.md#release-web-y-fuente-policial--2026-11-05).

Se conserva la release anterior funcional en `/root/polis-releases/policia_20261105`. Para recuperar esa versión, restaurar el drop-in guardado en `unidad_frontend_pre_datos.conf`, ejecutar `daemon-reload`, reiniciar y verificar las sondas y el navegador. Esa versión contiene la corrección del mapa y «Sin evaluar», aunque conserva los contadores anteriores.

El respaldo previo de las tablas estadísticas y del catálogo está en `20261105_integracion_policia_produccion/.runtime/respaldo_produccion.json`, con permisos privados. Una reversión de datos debe restaurar las 77 filas y las anotaciones anteriores, retirar únicamente las 56 filas añadidas y la capa de esta carga, y comprobar referencias antes de revertir la migración. **No se ejecutó esa reversión en producción.**

La base y el rol temporales del laboratorio fueron eliminados tras la validación. Los respaldos y la evidencia permanecen. No se modificaron diagnósticos de Google Docs ni se hicieron commit o push en esta operación.

## 6. Límites conservados y evidencia

El banco analítico global mantiene **144 observaciones preexistentes de otras fuentes sin dimensión**, estado estructural ámbar y sus revisiones de licencia, contrato y comparabilidad pendientes. Ninguna de las 43 fuentes fue promovida a aprobada por esta carga. La disponibilidad operativa de los agregados del Geovisor no cambia el estado `no_publicable` del corte analítico global. No se ejecutaron agentes LLM ni se atribuyó una reducción del delito a un plan de desarrollo.

Evidencia en [20261105_integracion_policia_produccion](20261105_integracion_policia_produccion/):

- [Verificación SQL final](20261105_integracion_policia_produccion/verificacion_produccion_cierre.json).
- [Verificación del laboratorio](20261105_integracion_policia_produccion/verificacion_laboratorio.json) y [migración](20261105_integracion_policia_produccion/verificacion_migracion.json).
- [Consumo de los cinco motores](20261105_integracion_policia_produccion/verificacion_motores.json).
- [Navegador público final](20261105_integracion_policia_produccion/verificacion_navegador_final.json).
- [Release activa](20261105_integracion_policia_produccion/despliegue_frontend_datos.json).
- [Cierre operativo](20261105_integracion_policia_produccion/cierre.json) y [manifiesto SHA-256](20261105_integracion_policia_produccion/manifest_sha256.json).
