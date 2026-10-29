# OP-DANE-PREFLIGHT-02 · Tamaño y acceso del anexo pendiente

26 de octubre de2026. Después de189/195/201 sigue pendiente el anexo municipal por edad y sexo que excedió64MiB. El usuario autorizó buscar y consolidar las fuentes. Realizar una inspección pública acotada para decidir el próximo perfil de adquisición; no descargar el archivo completo ni cambiar los límites del validador.

Únicas escrituras: `bridge/230_preflight_opencode_dane_edad_sexo.md` y `bridge/230_preflight_opencode_dane_edad_sexo/`. Sin app/tests/src/docs, banco, SQL, pytest, sincronizadores, commit/push/deploy.201/189/195 intactos. No credenciales ni cookies de usuario; TLS verificado.

## Objetivo y límites

Leer el HTML original165 y el objetivo exacto extraído en201 para `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx`. Consultar exclusivamente fuentes primarias DANE bajo hosts literales www.dane.gov.co/dane.gov.co. Máximo tres redirecciones HTTPS dentro de esos hosts,20s por operación,120s de trabajo de red y512KiB recibidos en total. Rechazar puerto distinto443/credenciales/downgrade. No relajar a host sufijo ni TLS inseguro.

- Obtener HEAD y cabeceras públicas permitidas: status, Content-Length, Content-Type, ETag, Last-Modified, Accept-Ranges, Location/Content-Range y fecha HTTP. Guardar fecha real de la consulta, URL pedida/final e historial, SHA de la evidencia de metadatos; no confundir longitud anunciada con bytes efectivamente descargados.
- Si Range está disponible, una única prueba Range bytes=0-0, con lectura y cierre acotados a64KiB si el servidor ignora el rango. No consumir todo el cuerpo200. Reportar206/200 y bytes recibidos realmente; una respuesta parcial no es original descargado ni valida el XLSX.
- Identificar enlaces alternativos explícitos del mismo portal para productos municipales por edad/sexo/grupos de edad y sus límites temporales declarados. Usar HTML ya conservado cuando alcance. No tratar productos distintos como equivalentes ni asignar censo/base/edición por su nombre.

Entregar estado medido: tamaño declarado si el servidor lo ofrece, rango probado o no, posible estrategia acotada para una captura completa posterior y límites aún desconocidos (compresión/expansión/hojas no inspeccionadas). Registrar errores reales, no inventar200 ni tamaño total. No proponer aumentar automáticamente límites del backend ni ejecutar el adaptador de red201, que permanece apagado.

Notificar a `=codex:0.0` y congelar230 al terminar. Esta tarea es adquisición de evidencia técnica pública; no aceptación semántica ni dictamen EAF.
