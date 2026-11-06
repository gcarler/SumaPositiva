# Encargo 303 — Cierre integral verificable de POLIS

Fecha de trabajo: 2026-11-06 (UTC). Base: `afccb469de3dc66fe9e4c10d19a81911253b997e`.
Estado de esta revisión: **cierre técnico publicado y verificado en producción**.
Activación comprobada: **2026-11-06 12:48:16 UTC**. Los pendientes de datos y EAF
descritos abajo conservan su estado.

## Alcance y resultado

Se ejecutaron los cuatro frentes del [plan 303](303_plan_codex_cierre_integral.md):
calidad e integración, marco legal, indicadores/fuentes y correspondencia con producción.
Este informe es evidencia del implementador. **No es un dictamen EAF independiente ni
acredita que todos los datos y escenarios de la plataforma estén al 100 %.**

Las pruebas se hicieron en `polis_test_303*`: PostgreSQL 16 en `127.0.0.1:5433`,
PostgreSQL 18 propio en `127.0.0.1:15433` y puertos HTTP 18303–18305/18404–18405.
No se utilizó `bd_csh` para pruebas, no se enviaron correos reales y no se modificó
Postfix. Los datos y credenciales del laboratorio se conservaron fuera de Git.
Al terminar se detuvieron el backend HTTP 18303 y el PostgreSQL propio 15433;
se conservaron sus datos y evidencias para reproducción. El Docker compartido
de pruebas y los servicios productivos no se detuvieron con esa limpieza.

## Correcciones

| Hallazgo | Cambio y evidencia |
| --- | --- |
| H303-01. Afirmaciones normativas sin soporte | Decreto 0037/2026 ubicado como nacional; 1070/2021 conservado como antecedente y referencia al 0730/2023. Se retiraron garantías automáticas de fe pública, consulta previa o aprobación fiscal. Se añadieron enlaces oficiales. |
| H303-02. Interacción de marco legal | IDs únicos, controles ARIA con panel existente, ancla `#plataforma` ubicada en su contenido, recarga/historial y respeto al movimiento reducido. Pruebas Chromium y axe. |
| H303-03. Replay de 0095 | La validación cuenta solo las 35 mesas y 36 agendas del corte. Conserva UUID de mesas preexistentes. El downgrade comprueba dependencias antes de operar y bloquea borrados en cascada. Pruebas desde otra conexión, instalación vacía, replay y rollback. |
| H303-04. Runner E2E peligroso | Eliminados respaldo de credenciales desde `.env` y `fuser -k`. Bases/plantilla y puertos explícitos, nombres `polis_test*`, rechazo de 5432 y puertos operativos. Un puerto ocupado se conserva. 28 pruebas de guardas. |
| H303-05. Pruebas desactualizadas | Once páginas de presentación —diez láminas y anexo— y acceso «Gráficas y Comparación». Se mantuvieron las comprobaciones de cifras y contenido. |
| H303-06. Edición PAS durante carga | Lista inicial vacía y estado de carga; botones de edición de contingencia protegidos. Un ID obsoleto informa indisponibilidad y no abre una creación. Verificación real con respuesta API retardada y persistencia tras recarga. |
| H303-07. Google Identity y CSP | Permitida únicamente su hoja oficial `gsi/style` en `style-src`; se conservan las directivas sin `unsafe-eval`, `frame-ancestors` y las restricciones de origen. El proxy productivo conserva Report-Only y X-Frame-Options DENY. |
| H303-08. Filtro abría ficha inexistente | Filtrar desde Datos/Gráficas/Banco ya no abre automáticamente un panel de territorio. Se conserva la apertura explícita desde el mapa. Regresión con código territorial fuera del catálogo de fichas. |
| H303-09. Controles en paneles ocultos | Los paneles colapsados son `inert`; los contenedores etiquetados tienen rol de región. No se desactivó axe. |
| H303-10. Botones dentro de tablist | Cierre de vista activa fuera de la lista de pestañas; cierre con Suprimir y devolución del foco a otra pestaña o al control del panel. Se conserva arrastre y menú para mover vistas. |
| H303-11. Restablecer disposición | Recupera también el mapa central después de «Solo analítica». |
| H303-12. Catálogo de indicadores | Diez fichas documentan licencia declarada CC BY-SA 4.0; PAE pasa de `PERS_006` a `SALUD_005`, con alias documentado. Las 29 fichas conservan `no_publicable`. |
| H303-13. Barra de accesibilidad móvil | Arranque compacto en pantallas pequeñas, expansión de los mismos controles y devolución del foco. La captura real detectó una superposición de texto que no señalaban overflow/axe. |
| H303-14. Referencias residuales en Trazabilidad | Retiradas la atribución distrital de 0037/2026 y las asociaciones erróneas de leyes 1417/1414/2175. Se identifican Ley 2166/2021, Ley 80/1993 y Ley 2294/2023. Las cinco fases y los códigos se presentan como propuesta y ejemplos, sin certificar adopción ni vínculos inexistentes. El vector de seguimiento identifica el perfil como POLIS. Dos regresiones adicionales aprobadas. |
| H303-15. CSP del proxy | Nginx sustituye las cabeceras de Next. Se alinea la excepción `gsi/style`, se conserva el modo Report-Only y se comprueba el modo efectivo; Enforce queda sujeto a EAF. La primera activación expuso una carrera de arranque HTTP; la segunda detectó esta divergencia. Ambos intentos restauraron r4 y se conservaron. |

### Soporte documental

El Decreto 0037/2026 figura en el [índice de Presidencia](https://dapre.presidencia.gov.co/normativa/decretos-2026/decretos-enero-2026).
La sustitución de 1070/2021 por 0730/2023 se atribuye al [catálogo de Planeación](https://planeacion.cartagena.gov.co/pp-normativa).
La [Ley 527](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4276)
exige valorar confiabilidad, integridad e identificación; la presencia de un hash
no certifica todos los requisitos de cada documento. La directiva de estilos se
contrastó con la [guía oficial de Google Identity](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
El inventario de correcciones y enlaces está en [referencias_correcciones.json](303_evidencia_cierre/referencias_correcciones.json).
La acción comunal se contrasta con la [Ley 2166/2021](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=184758),
la contratación con la [Ley 80/1993](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=304)
y el año del PND con la [Ley 2294/2023](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=209510).

### Excepción acotada de migración histórica

Se corrigió 0095 porque el fallo aparece al instalar o reproducir la cadena antes
de alcanzar otra migración; una revisión posterior no puede reparar ese bloqueo.
No cambia la cabeza `0096_riesgo_sin_evaluar` ni se aplicó una migración productiva.
Los cambios conservan identidades y dependencias; los campos del catálogo se
actualizan intencionadamente. El downgrade no es una restauración de metadatos
anteriores y exige respaldo y revisión del estado. No se retiraron dependientes
para forzar una prueba verde. La revisión EAF de esta corrección debe ser independiente.

## Pruebas y cobertura

- `bun run backend:check`, perfil 16/3.5: **1.823 passed, 16 skipped, 0 failed**.
  Ruff check y format limpios.
- Corpus adicional en PostgreSQL 18: **43 passed, 0 failed, 0 skipped**. De estos,
  15 estaban omitidos en la suite vacía. Unión por identificador de prueba:
  **1.838 aprobadas / 1 omitida / 0 fallidas**, sin sumar duplicados.
- Perfil 18, suite inicial: 1.819 aprobadas, 16 omitidas y un fallo de la guarda
  estática por dos decoradores de pruebas nuevas. Se corrigió la marca explícita
  `migration`; revalidación dirigida de 13 pruebas aprobada. No se acredita una
  segunda suite completa verde en 18 a partir de esa corrida inicial.
- Frontend: **910 pruebas Bun aprobadas y 258 historias Storybook aprobadas**.
  Check del kit UI, TypeScript y ESLint: exit 0; builds Next y Storybook: exit 0.
- Navegador E2E: nueve flujos críticos y cuatro ampliados; autoridad, auditor,
  administrador de identidades y participante público. Persistencia comprobada
  tras recarga para fase, mesa, línea, compromiso, medición, devolución,
  alternativa y usuario; restricciones de escritura del auditor verificadas.
- Marco legal: seis combinaciones, 320/768/1440 px y claro/oscuro; 18 escaneos axe,
  teclado, anclas, historial y recarga. **6/6 aprobadas**, sin desborde horizontal
  ni violaciones graves. No equivale a una certificación WCAG integral.
- Catálogo: **29 códigos únicos**, 27 A/2 C. Referencias publicadas: 61 comprobaciones
  sobre cuatro PDF; las cifras se conservaron, se actualizó su hash de linaje.

La omisión restante es `test_report_has_a_verifiable_sha256_seal`: exige el guion
oficial del usuario (`POLIS_USER_OUTLINE_PATH` o `/tmp/user_google_doc_content.txt`).
No se creó un documento sustituto para eliminarla.

Los fallos de la primera copia aislada por archivos ignorados ausentes se
reprodujeron y resolvieron copiando los insumos originales al laboratorio y
verificando sus SHA. Las pruebas de reconstrucción usan otra base. Las historias
ahora limpian estado compartido, esperan el montaje diferido del mapa y mantienen
las aserciones de teclado/axe; no se desactivaron reglas para hacerlas pasar.

## Datos reales e insumos pendientes

Se reconstruyeron **8 planes, 1.938 líneas/programas y 4.637 metas**. Se cotejaron
1.305 entradas locales y 621 archivos únicos de PA antes de la ingesta. Quedaron
607 archivos y 215.300 registros normalizados durables; el contador del ingestor
informó 215.777 registros procesados. Son contadores diferentes; no se atribuye
la diferencia a una causa por fila que no se haya auditado.
Se normalizaron metas y vínculos en esa tercera base; **129 ceros observados** se
preservaron. Los originales permanecieron intactos.

**14 archivos no fueron ingeridos por errores del lector de estilos XLSX**.
Sus nombres y causas están en [corpus_real_provisionado.json](303_evidencia_cierre/corpus_real_provisionado.json).
No se sustituyeron por datos inventados ni se declararon como procesados.

La revisión documental obtuvo HTTP 200 de 18 consultas oficiales: metadatos de
17 productos Socrata y condiciones de uso DANE. El banco SQLite original conserva
su SHA `e0c8ba376e45dd08a64034560b8c19a6d3e2ffe99fabaf950395c5ef0f87074d`.

Siguen pendientes la metodología/insumos de PAE y densidad institucional,
condiciones específicas de reutilización aún no acreditadas, aprobaciones por
producto y vigencias territoriales. También queda pendiente la decisión EAF sobre
CSP Enforce; el proxy usa Report-Only y las cabeceras complementarias. Ver [fichas pendientes](303_evidencia_cierre/fichas_pendientes_publicacion.md)
y [matriz por indicador](303_evidencia_cierre/matriz_indicadores_fuentes.json).
Una licencia declarada no acredita por sí sola calidad, vigencia ni aprobación
institucional. Los 28 productos del SQLite tampoco equivalen a todo el inventario
de fuentes de POLIS.

## Producción y recuperación

Release activa: `/root/polis-releases/cierre_integral_20261106_303_r3/standalone`,
BUILD_ID **`21UffGGJqZgPoKtAmRQTy`**. El artefacto incluye `public` y estáticos;
no contiene enlaces a dependencias externas a su directorio.

- Código de ejecución: **`fcdd16306fe982926257c19f1d3df90bcf7b191c`**.
- Preparación operativa y pruebas del proxy: **`c279152d8827f8002d2d0e161081511bd8196ece`**.
  Ambos commits están publicados en `origin/main`.
- Huella de 892 archivos de código y recursos:
  `1beb09ab3b94e9659aa2c97573a818b9359e517ab54c3fc4f85783b937dd3d63`.
  Los cambios posteriores de pruebas y documentación no alteraron esa huella.
- **20/20 comprobaciones HTTP públicas**, sin errores: páginas, API, versión,
  tres estáticos, cuatro PDF con SHA coincidente y rechazo de acceso a `.env`.
  Evidencia: [verificacion_produccion.json](303_evidencia_cierre/verificacion_produccion.json).
- Frontend PID **534352**. Backend PID **13477**, conservado. No se aplicaron
  migraciones ni se reinició el backend durante esta publicación.
- El proxy conserva **CSP Report-Only**, X-Frame-Options DENY y las cabeceras
  complementarias. Se sincronizó únicamente la excepción de estilos `gsi/style`;
  `nginx -t` y la recarga resultaron correctos. La decisión de Enforce sigue
  pendiente de EAF; no se acredita bloqueo CSP de recursos en el dominio público.

Se conservaron `policia_20261105_r4`, `recuperacion_dropin_r4.conf` y
`recuperacion_nginx_csp.conf` dentro del directorio de la nueva release.
La recuperación consiste en restaurar el directorio de trabajo anterior,
recargar systemd, reiniciar solo el frontend y repetir las comprobaciones públicas.
El cambio acotado de Nginx también tiene respaldo y hash en su evidencia.

Hubo dos intentos previos restaurados a r4: una carrera entre el estado activo
del proceso y su disponibilidad HTTP, y la política propia de Nginx que sustituía
la de Next. Se añadió espera por commit/Build ID y se comprobó el modo efectivo
Report-Only. Los intentos fallidos y el diagnóstico se conservaron; la activación
final completó las mismas comprobaciones de contenido, versión, archivos y
directivas, con el modo del proxy identificado explícitamente.

Los transportes externos de Google/SMTP y todas las combinaciones de estado de
cada módulo no quedan certificados por estos recorridos. Las credenciales reales
no se usaron para completar autenticaciones o enviar comunicaciones.
