# Candidatos PAE y densidad institucional — revisión 304

## Resultado

Se localizaron insumos oficiales adicionales, pero **ninguno permite completar
la cobertura PAE por barrio ni el inventario integral de seguridad y justicia**.
Los dos indicadores conservan Tier C y `no_publicable`. No se imputaron tasas,
barrios, coordenadas, población ni beneficiarios.

## Directorio de Casas de Justicia

El [directorio del Ministerio de Justicia](https://www.minjusticia.gov.co/transparencia/Paginas/SEJ-Acceso-a-la-Justicia-CJ-DCJCCC.aspx)
enlaza un XLSX con actualización literal **02/12/2025**. Se extrajeron tres
entradas municipales de Cartagena/Bolívar: Canapote, Chiquinquirá y Country.
El archivo aporta nombre, modelo y dirección institucional; se excluyeron
contactos y nombres de funcionarios del derivado. La hoja advierte que la
información procede de las administraciones municipales.

El piloto identifica archivo, SHA, hoja y fila en
`piloto_directorio_casas_justicia.json`. Este subconjunto no acredita sedes
policiales, fiscalías, comisarías, juzgados u otras instituciones, su operación
actual ni el total de servicios. No permite calcular por sí solo POL_003.
La ficha técnica enlazada respondió HTTP 401; no se intentó eludir el acceso.

**Insumo concreto pendiente:** inventario oficial por sede, tipo de servicio,
estado operativo y fecha, con ubicación verificable y tratamiento de sedes
compartidas. El responsable debe elegir entre sedes/100.000 habitantes y
sedes/km²; cada una requiere denominador compatible del mismo corte.

## Alimentación escolar

Se descargó el [INOP 007 de julio de 2025 de la UApA](https://www.alimentosparaaprender.gov.co/sites/default/files/2025-08/INOP_JULIO%20VF.pdf).
El documento separa matrícula activa y beneficiarios SIMAT, reportes operativos,
compras y financiación. El texto contiene cortes distintos y la gráfica de la
página 7 presenta una fecha inexistente; no se normaliza esa fecha por conjetura.

Una extracción literal encuentra **Cartagena = 0 en la página 22**. El encabezado
de esa tabla corresponde al avance del registro MIPAE, dentro del capítulo de
cargue de información. **Ese cero no es cobertura alimentaria ni ausencia de
beneficiarios.** En la página 31, «Sin Reporte» pertenece a compras públicas y
se conserva como ausencia de reporte, sin convertirlo en cero. Estas lecturas
se fijan en `piloto_pae_documental.json` con punteros al documento original.

La [página de indicadores educativos de Planeación](https://planeacion.cartagena.gov.co/educacion-0)
anuncia un producto de cobertura PAE 2024, pero la captura devolvió HTTP 403.
El inventario SED 2023 de cocinas y comedores no pudo descargarse con TLS
verificado; se conserva el error. Las notas de prensa sobre atención o metas
no reemplazan los registros necesarios para cobertura por residencia.

**Insumo concreto pendiente:** agregado oficial de beneficiarios únicos activos
y matrícula elegible por residencia, mismo territorio/corte, modalidades
deduplicadas y definición de elegibilidad. Si solo se obtiene información por
plantel, corresponde proponer otro producto; no atribuirla a barrios de residencia.

## Trazabilidad

- `fuentes_candidatas_capturadas.json`: captura y respuesta de cada solicitud inicial.
- `fuentes_candidatas_adicionales.json`: PDF UApA y error TLS del recurso SED.
- Originales en `backups/fuentes_304/`; sin alteración del banco de fuentes.
- No hubo publicaciones remotas, ingesta de datos de menores ni aprobación
  metodológica emitida por el implementador.
