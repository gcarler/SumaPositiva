# Formularios geográficos

Desde `/plataforma/formularios`, un usuario con permiso de gestión puede crear
un formulario y elegir **Ubicación geográfica** en el tipo de pregunta. Es el
14.º tipo del constructor: puede combinarse con descripciones, selección,
secciones y lógica condicional. El facilitador conserva el acceso de lectura
establecido para esta pantalla; el auditor tampoco edita.

La persona que responde puede marcar el mapa, moverlo con las flechas y marcar
su centro, ingresar latitud y longitud o solicitar la ubicación del dispositivo.
El mapa inicia en Cartagena. No se comprueba pertenencia al polígono oficial del
distrito: las coordenadas se validan por sus rangos geográficos globales.

Cada punto queda vinculado a la pregunta y al registro de respuesta. Se representa
como un `Point` con coordenadas WGS84 en orden `[longitud, latitud]`; incluye
origen, referencia opcional y precisión estimada cuando procede de GPS.
Los valores incompletos, no numéricos o fuera de rango impiden el envío. Una
pregunta opcional puede quedar vacía; las preguntas ocultas por lógica se excluyen.

El dispositivo necesita HTTPS o un contexto local seguro y autorización explícita
del navegador para geolocalización. Si se deniega o falla, se mantienen el mapa y
las coordenadas. Si el mapa base no carga, las coordenadas siguen disponibles.
La solicitud GPS bloquea el envío mientras está pendiente y no sobrescribe un
punto cambiado durante la espera.

La vista previa utiliza el mismo componente y no registra respuestas. La analítica
muestra coordenadas legibles, las incluye en CSV y permite **Exportar puntos
GeoJSON**. Esta exportación contiene únicamente puntos válidos del formulario y
sus identificadores de respuesta/pregunta, fecha, referencia, origen y precisión;
no incorpora las respuestas de otras preguntas. Puede abrirse en un geovisor GIS.
No se afirma que los puntos ya aparezcan automáticamente en el geovisor de POLIS.

**Límite vigente:** el constructor y las respuestas permanecen en memoria en modo
demostración; se pierden al recargar. No deben usarse aún para recolección oficial.
La API persistente existente utiliza un contrato anterior: hace falta adaptar los
DTO de los 14 tipos, secciones, lógica y puntos antes de conectar este flujo a
`bd_csh`. También faltan publicación pública y sincronización con el geovisor.

La migración `0028_formularios_admin` corrige la ausencia de permisos del
administrador. La unión `0029_merge_formularios_fotos` conserva una sola cabeza
con la rama concurrente de fotografías; no agrega permisos adicionales.
