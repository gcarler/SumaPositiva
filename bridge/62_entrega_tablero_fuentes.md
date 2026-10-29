# Tablero del flujo con fuentes visibles

24 de octubre de 2026.

Se sustituyó la portada extensa por un tablero que ocupa el espacio disponible de pantalla. Fuentes y detalles se consultan en un panel derecho plegable; las cuatro vistas se eligen en una franja superior. No hay bloques explicativos debajo del lienzo. El panel de fuentes se cierra inicialmente en móvil.

Nueva vista **Fuentes → análisis**: Medicina Legal, Policía, DANE, DNP, ICBF, IDEAM, INS, Procuraduría, Unidad para las Víctimas y Fiscalía → capturas → validación → integración pendiente con motores. El panel distingue esas capturas de los inventarios históricos de planeación, cartografía y entregas compartidas, y de las fuentes aún por acreditar.

Base documental: inventario 48 y entrega 59, revisados durante este cambio. Las capturas siguen pendientes de validación semántica; esta revisión no actualiza el banco ni completa la orquestación.

Validación del nuevo diagrama aprobada con Archify 3.2.0. Comprobación en Chromium de las cuatro vistas, filtro de fuentes, apertura/cierre de paneles, móvil y ausencia de desbordamiento de página. Capturas de panorama y fuentes inspeccionadas. La interfaz se verifica separadamente de los recibos de los HTML nativos; el modo de presentación se aplica al visor sin reemplazar sus especificaciones.

Enlace: https://seguridadhumanaintegral.org/polis/bridge/60_flujo_sistema_politicas_publicas.html

Evidencia: `62_validacion_tablero_fuentes.json` y el directorio `.archify/architecture-tablero-fuentes-20261024-141720/`. Los recibos de la entrega 61 conservan los hashes originales de la primera versión, respaldada como `portada-v1-respaldo.html`; no se reescribió esa evidencia histórica.

Publicación limitada al HTML ya autorizado. Sin cambios de aplicación, SQL, commit o push.
