# FB-TERR-ID-01 · Obtener y versionar identidad territorial oficial

26 de octubre de 2026. Continuación MT-02 del plan76. Se autoriza consulta GET/descarga de datos públicos oficiales DANE, acotada y sin credenciales; no escribir en ningún servicio remoto ni en banco activo. No tocar código de otros agentes. Ollamacodex construye ficha provisional125/126 en paralelo.

## Fuentes iniciales comprobadas por coordinación

- Página DANE DIVIPOLA: https://www.dane.gov.co/index.php/sistema-estadistico-nacional-sen/normas-y-estandares/nomenclaturas-y-clasificaciones/nomenclaturas/codificacion-de-la-division-politica-administrativa-de-colombia-divipola
- Servicio primario: https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer?f=pjson
- El servicio se describe como MGN2025; capas declaradas317 Municipio y319 Departamento. Verificar metadatos/campos antes de consultarlos; los IDs de capa no son códigos territoriales. La edición2025 no prueba corte2026 ni vigencia histórica universal.

## Trabajo real

Capturar metadatos originales de servicio/capas y atributos territoriales oficiales, sin geometría salvo que sea imprescindible. Consulta paginada o por IDs, con conteo esperado y detección de truncamiento/exceededTransferLimit. Conservar peticiones exactas, respuesta cruda, SHA, bytes, fecha UTC adquisición, versión declarada, timestamps/metadatos HTTP sin confundir actualización de metadatos con corte de datos. Límites por respuesta/totales y timeouts; aceptar JSON válido únicamente, no HTML/error ArcGIS con HTTP200.

Producir catálogo derivado de códigos/nombres/departamento/tipo solo donde la fuente lo aporte, con puntero/registro de origen y hash. Mantener códigos oficiales como texto con longitud acreditada: no arreglar IDs arbitrarios rellenando ceros por intuición. Departamentos, municipios/distritos, áreas no municipalizadas y centros poblados son entidades distintas; no afirmar cobertura de un nivel no consultado. No usar la capital para representar departamento.

Cotejar Cartagena, Santa Catalina(Bolívar), Sahagún(Córdoba) y Bogotá contra la fuente elegida, sin inventar códigos o jurisdicciones. Identificar duplicados/homónimos y si hay normalización de acentos/nombre alterno; conservar original y resolver por código verificado. Si el servicio no distingue distrito/municipio, registrar el límite, no deducir estatus jurídico.

Separar identidad territorial de alias de instituciones/competencias. Esto no incorpora organigramas ni certifica población/geometría de barrios. No prometer actualizado al día sin evidencia ni una historia de vigencias que el dataset no contenga.

## Escrituras exclusivas

- `bridge/128_entrega_freebuff_identidad_territorial.md`.
- Directorio nuevo `bridge/128_catalogo_identidad_territorial/`: originales, catálogo derivado JSON, metadatos/manifiesto y guion reproducible permitido.

No modificar aplicación/parser/tests/ficha126/catálogos activos/inventarios/diagramas/diagnósticos. Sin SQL, migraciones, instalaciones, pruebas de aplicación, commit/push o despliegue. Si endpoint falla, registrar evidencia y alternativa oficial claramente diferenciada, sin atribución falsa. No usar Wikipedia como acreditación.

## Detalle documental de piloto118

Su manifiesto contiene hash parser `60eae40d...`, diferente del archivo final revisado `731ce8db...`. No modificar118. Registrar en128 la diferencia y cotejar con reproducción de coordinación119/120, que verificó cada fila con el parser final; no inventar que ambos hashes son iguales ni una causa no acreditada. Mantener historia de evidencia separada del catálogo de identidad.

Congelar al entregar y notificar `FB-TERR-ID-01 entregado: bridge/128_entrega_freebuff_identidad_territorial.md` a =codex:0.0, literal y Enter separados. Sin dictamen EAF, integración o banco activo.
