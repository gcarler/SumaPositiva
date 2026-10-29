## INFORME DE HALLAZGOS DE AUDITORÍA QA

**Plataforma:** Seguridad Humana Integral **Tipo de auditoría:** Pruebas funcionales y de interfaz de usuario

## HALLAZGO TCA-01. Superposición de elementos en la página principal

**Sección:** Inicio o página principal **Tipo de hallazgo:** Interfaz de usuario y adaptabilidad **Descripción del problema:** Se evidencia que los botones del menú de navegación se superponen al logotipo de Seguridad Humana cuando se modifica el tamaño de la pantalla. Esta situación afecta la distribución visual de los elementos y dificulta la correcta visualización de la identidad gráfica de la plataforma. **Evidencia fotográfica:**

## Recomendación:

Ajustar la distribución y el comportamiento adaptable del menú de navegación para evitar la superposición de elementos en diferentes dimensiones de pantalla.

## HALLAZGO TCA-02. Falta de diferenciación visual del botón Geovisor

**Sección:** Inicio o página principal **Tipo de hallazgo:** Diseño e interfaz de usuario **Descripción del problema:** El botón «Geovisor» no presenta suficientes elementos visuales de diferenciación, como bordes, color de fondo o resaltado. Esta condición dificulta su identificación como elemento interactivo dentro de la página principal. **Evidencia fotográfica:**

## Recomendación:

Mejorar la presentación visual del botón mediante recursos gráficos que permitan identificarlo claramente y diferenciarlo de los demás elementos de la interfaz.

## HALLAZGO TCA-03. Falta de respuesta en los botones de selección territorial

**Sección:** Inicio o página principal **Tipo de hallazgo:** Funcionalidad e interacción **Descripción del problema:** En la sección «¿Quién responde por tu seguridad en Cartagena?», los botones correspondientes a la selección territorial no generan una respuesta visible al hacer clic. Los elementos evaluados son:

- Todos los territorios.
- Localidad 1 — Histórica y Caribe Norte.
- Localidad 2 — De la Virgen y Turística.
- Localidad 3 — Industrial y de la Bahía.
- Zona Rural e Insular (Barú, Tierrabomba e islas).
Durante la prueba no se evidenció la visualización de información relacionada ni la redirección hacia otra sección de la plataforma. **Evidencia fotográfica:**

## Recomendación:

Verificar la funcionalidad de los botones y asegurar que cada selección territorial genere la acción correspondiente, como mostrar la información asociada o actualizar el contenido de la sección.

## HALLAZGO TCA-04. Inconsistencia en la secuencia de las fases

**Sección:** Línea estratégica **Tipo de hallazgo:** Consistencia de la información **Descripción del problema:** La plataforma indica que el proceso está compuesto por ocho fases; sin embargo, la secuencia visible llega únicamente hasta la fase siete. Esta inconsistencia genera una discrepancia entre la cantidad de fases anunciadas y las presentadas al usuario. **Evidencia fotográfica:**

## Recomendación:

Revisar la estructura de las fases, verificar si existe una fase faltante y reorganizar la numeración para garantizar la coherencia y continuidad de la información presentada.

## HALLAZGO TCA-05. Redundancia en la denominación y falta de respuesta del botón Fase 01

**Sección:** Línea estratégica **Tipo de hallazgo:** Funcionalidad y consistencia del contenido **Descripción del problema:** El botón identificado como «Fase 01» presenta una denominación redundante al repetir la referencia a la fase. Adicionalmente, al hacer clic, no se evidencia una redirección ni la visualización de información correspondiente a la fase seleccionada. **Evidencia fotográfica:**

## Recomendación:

Corregir la denominación del elemento para evitar duplicidades y verificar que el botón permita acceder al contenido correspondiente a la fase seleccionada.

## HALLAZGO TCA-06. Ruptura en la navegación hacia los detalles de las mesas de trabajo

**Sección:** Mesas de trabajo **Tipo de hallazgo:** Navegación y acceso a la información **Descripción del problema:** Al seleccionar los detalles de una mesa de trabajo, la plataforma redirige a una página que no presenta la información esperada. Adicionalmente, al recargar la página, el sistema redirige al usuario a la página de inicio, interrumpiendo la navegación y dificultando la consulta del contenido específico. **Evidencia fotográfica:**

## Recomendación:

Revisar las rutas de navegación y la carga de información asociada a cada mesa de trabajo. Verificar también el comportamiento de la página al recargarse, con el fin de conservar el acceso al contenido seleccionado.

## HALLAZGO TCA-07. Falta de acceso a las actas y paleógrafos de las mesas de trabajo

**Sección:** Geovisor **Tipo de hallazgo:** Funcionalidad y disponibilidad de información **Descripción del problema:**

En el apartado «Ver acta viva y paleógrafo», relacionado con las 37 mesas de trabajo, se presentan fallas de navegación que impiden acceder a la información asociada. Durante las pruebas realizadas no fue posible visualizar el contenido correspondiente a ninguna de las 37 mesas evaluadas. **Evidencia fotográfica:**

## Recomendación:

Verificar los enlaces y mecanismos de acceso a los documentos de las 37 mesas de trabajo. Comprobar que cada registro permita consultar la información y que los documentos estén disponibles y correctamente asociados.

## HALLAZGO TCA-08. Error de navegación desde la tabla de filtros del geovisor

**Sección:** Geovisor **Tipo de hallazgo:** Funcionalidad y navegación **Descripción del problema:** En la tabla de filtros del geovisor, el botón destinado a consultar la información de una mesa de trabajo presenta una falla de navegación. Al seleccionarlo, no se logra acceder correctamente al contenido relacionado con el registro seleccionado. **Evidencia fotográfica:**

## Recomendación:

Revisar la acción asociada al botón de consulta y validar que el enlace o mecanismo de navegación dirija al usuario a la información correcta de la mesa de trabajo seleccionada.

## HALLAZGO TCA-09. Ausencia de contenido disponible en la sección de noticias

**Sección:** Noticias **Tipo de hallazgo:** Disponibilidad de información **Descripción del problema:**

La sección de noticias no presenta información disponible para su lectura durante la revisión realizada. Esta situación limita el acceso de los usuarios a las publicaciones, novedades y contenidos informativos que debería proporcionar la plataforma. **Evidencia fotográfica:**

## Recomendación:

Verificar la disponibilidad de las publicaciones, la carga de los contenidos y la conexión con la fuente de información correspondiente. Confirmar si la ausencia de noticias obedece a falta de publicaciones o a un problema de visualización.

## HALLAZGO TCA-10. Falta de respuesta en los filtros por categoría de noticias

**Sección:** Noticias **Tipo de hallazgo:** Funcionalidad e interacción **Descripción del problema:** Los botones destinados a filtrar las noticias por categoría no generan una respuesta visible al hacer clic. Los elementos evaluados son:

- Todas las categorías.
- Avances de Política.
- Mesas Realizadas.
- Acuerdos Distritales.
- Convocatorias.

|• •|Informes Técnicos. Logros Comunitarios. Durante la prueba no se evidenció el filtrado de publicaciones ni un cambio en el contenido mostrado. Evidencia fotográfica:|
|---|---|
|condición.|Recomendación: Validar la funcionalidad de cada filtro y comprobar que, al seleccionar una categoría, se muestren las publicaciones correspondientes. En caso de no existir publicaciones para una categoría, el sistema debería informar claramente esta|

## CONCLUSIÓN GENERAL

A partir de la auditoría realizada, se identifica la necesidad de mejorar la experiencia de usuario de la plataforma Seguridad Humana Integral, no solo desde el funcionamiento técnico, sino también desde la claridad y facilidad de uso de sus contenidos. Se recomienda implementar un lenguaje más sencillo, claro y comprensible para la ciudadanía, evitando el uso excesivo de términos técnicos que puedan dificultar la navegación o la comprensión de la información. Asimismo, es necesario simplificar y reorganizar las secciones de la plataforma, teniendo en cuenta que su principal objetivo para el usuario es **reportar** **información mediante un formulario de manera rápida, sencilla e intuitiva**. Por esta razón, la interfaz debe priorizar el acceso al formulario de reporte y reducir los pasos necesarios para completar esta tarea. La información técnica, los datos especializados y las opciones de administración deberían estar dirigidos principalmente a los administradores de la plataforma y a los usuarios con funciones específicas, sin sobrecargar la experiencia de la ciudadanía. Finalmente, se recomienda corregir los problemas funcionales y de navegación identificados, mejorar la organización de los contenidos y diseñar una experiencia centrada en las necesidades reales del usuario. Esto permitirá que la plataforma sea más accesible, comprensible y eficiente para cumplir su propósito de facilitar el reporte de información por parte de la ciudadanía.
