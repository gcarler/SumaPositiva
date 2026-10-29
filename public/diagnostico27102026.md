# Seguridad humana en Cartagena: apuestas políticas, ejecución y resultados observados

**Documento de análisis integrado — edición actualizada, 21 de octubre de 2026**  
**Ámbito:** ocho planes de desarrollo distrital y local (2012–2027), planes de acción disponibles (2018–2026), resultados oficiales y archivos geográficos de casos recuperados.  
**Estado de la evidencia:** la carpeta [Data Política Publica](https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4), compartida por el usuario, aporta seis archivos de casos (homicidios, extorsión, presunto delito sexual, violencia intrafamiliar, suicidios y muertes por transporte) además de tres modalidades de hurto. Se presentan **tal como se reportan en sus CSV**, con su unidad, periodo y zona. Cuatro series coinciden año por año con el banco público de Medicina Legal en 2015–2024; los ZIP no incluyen una ficha de origen y corte para 2025–2026 y estas cifras se etiquetan como aportadas y pendientes de cotejo. Las geometrías son polígonos de zona, no puntos del hecho. Ninguna disminución de casos se atribuye causalmente a una administración solo por ocurrir durante su periodo. [Perfil y SHA-256 de los archivos](NOTA_FUENTES_DRIVE_MULTIFUENTE_2026.md).

## Resumen ejecutivo

La pregunta de gobierno es concreta: **¿las prioridades que formularon los planes de desarrollo se convirtieron en acciones verificables y estuvieron acompañadas de una reducción sostenida de los daños que componen la seguridad humana?** Para contestarla hay que separar tres objetos que suelen confundirse: la *apuesta* (meta y línea estratégica), la *respuesta institucional* (actividad, producto y pago) y el *resultado* (casos, tasas o privaciones observadas). Una cifra favorable en el tercero no certifica que el primero la haya causado; una apropiación presupuestal en el segundo tampoco certifica que el servicio llegó a la población expuesta.

La base `bd_csh` contiene 4.637 metas de ocho PDD/PDL y un estudio reproducible de 27.592 actividades únicas de planes de acción de 2018–2026. La serie comparable de actividad termina en 2025: 2026 tiene cortes parciales y 2012–2015 solo permite estudiar formulación. El clasificador sectorial del estudio asigna 41,1 % de actividades por su texto; el resto se aproxima por entidad ejecutora. Por ello se ofrece siempre una lectura de sensibilidad basada solo en texto y se evitan juicios fuertes donde ambas lecturas divergen. [Estudio base y método](/root/polis/backend/app/modules/compromisos/pdt_analisis_planes_tendencias.py).

Las señales observadas son heterogéneas. En seguridad personal, la tasa de homicidios de Medicina Legal bajó entre 2023 y 2024, pero permaneció muy por encima de 2019. En los GeoJSON recuperados bajaron los hurtos a residencias y subieron los de motocicletas entre 2023 y 2024. En seguridad económica, la pobreza monetaria oficial pasó de 42,8 % en 2023 a 41,1 % en 2024 y 34,6 % en 2025. En seguridad comunitaria, la serie de violencia intrafamiliar del archivo compartido pasa de 394 (2023) a 323 (2024), y la de exámenes por presunto delito sexual de 500 a 430; ambas coinciden con la extracción pública médico legal para esos años. Son universos diferentes de los 673 casos de violencia de pareja del Anuario distrital. Ahora hay más series de ciudad, pero aún no hay localización puntual ni exposición a intervenciones por barrio para relacionarlas con un cambio territorial. [Forensis 2024](https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf), [DANE, pobreza monetaria 2025](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf), [Anuario de Seguridad de Cartagena](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/seguridad-785).

El hallazgo más sólido sobre *agenda gubernamental* es el aumento relativo de la seguridad económica: el estudio estima +1,85 puntos porcentuales anuales entre 2018 y 2025, y la versión restringida a texto mantiene +1,65 puntos. Es una señal de composición documental, no una estimación del impacto del Plan de Desarrollo sobre la pobreza. Los otros seis ejes no muestran una tendencia robusta bajo ambas clasificaciones. La lectura política debe distinguir ese resultado de la evolución de los casos.

![Composición de la actividad en los siete ejes](g02_composicion.png)

*Figura 1. Composición anual de actividades clasificadas en los siete ejes. Fuente: estudio reproducible sobre `bd_csh`. Las diferencias de volumen documental impiden interpretar directamente el número de actividades como intensidad de servicio.*

## 1. Qué integra el estudio y qué significa cada cifra

### 1.1. Ocho planes, tres periodos de ejecución observable

Se incorporan PDD 2012–2015 «Campo para Todos», PDD 2013–2015 «Ahora Sí Cartagena», PDD 2016–2019 «Primero la Gente», PDD 2020–2023 «Salvemos Juntos a Cartagena», PDD 2024–2027 «Cartagena Ciudad de Derechos» y los tres PDL 2024–2027. Los PDD de 2012–2015 se estudian como formulación, porque la serie de planes de acción normalizados que sirve para tendencias empieza de forma utilizable en 2018. El PDD y los tres PDL 2024–2027 no deben sumarse como si fueran un único instrumento: sus ámbitos y competencias son diferentes.

El cambio de una administración se representa con una banda de gobierno en cada serie temporal. A esa banda se superponen *fechas reales de puesta en marcha* de programas y productos, cuando estén acreditadas. La entrada en vigor de un plan por sí sola no equivale a exposición de un barrio a la intervención. Las comparaciones pertinentes son 2018–2019, 2020–2023 y 2024–2025 para tendencias anuales; 2026 se muestra aparte como corte parcial.

### 1.2. De la meta al resultado: seis eslabones que deben verse en los gráficos

**Meta PDD/PDL → actividad de PA → proyecto y pago → producto entregado → población/territorio expuesto → resultado medido.** El análisis actual cubre los primeros tres eslabones con profundidad desigual. Para muchos programas falta evidencia fechada de productos entregados y de beneficiarios georreferenciados. Los nuevos CSV alimentan el último eslabón a escala de ciudad y zona urbana/rural; no identifican qué personas o barrios recibieron cada intervención ni sustituyen los eslabones intermedios.

En finanzas se deduplican registros por vigencia y BPIN dentro del motor de inversión. La suma disponible es un piso de proyectos identificables, no la totalidad del gasto distrital. Se muestran apropiación, compromisos y pagos por separado. Un BPIN atípico puede dominar la participación de un eje; por ello se repite cada gráfico sin el mayor proyecto anual. El proyecto 2024130010246 figura en 2025 con 1,405 billones COP y una descripción anómala («Dotar noventa 30 sedes comunales»). Requiere cotejo con el expediente BPIN antes de usarlo para afirmar un gran giro financiero comunitario. Los textos de OCR y algunos códigos BPIN también requieren validación de origen.

### 1.3. Los casos no forman una sola bolsa

Homicidios de Medicina Legal, noticias criminales de Fiscalía, denuncias SIEDCO, exámenes por presunto delito sexual, reportes SIVIGILA y llamadas 123 tienen universos distintos. Se conservan la definición del evento, la fuente, el corte y la unidad de observación. No se suman entre sí. Para cada indicador se presenta, cuando es posible, **casos y tasa por población pertinente**; sin denominador compatible, solo se publica conteo y cobertura. Las cifras definitivas de [Medicina Legal](https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2) advierten que no cubren necesariamente todos los eventos conocidos por otros sistemas.

Los tres GeoJSON disponibles fueron importados a `geodatos.estadisticas_hurtos`: 12.280 filas de 2018–2026 para comercio, residencias y motocicletas. Cada registro tiene año, mes, tipología, zona y cantidad. La geometría está repetida por polígono urbano/rural; **no identifica el sitio puntual del hecho ni permite construir un mapa de calor por barrio o UCG**. Para territorialización fina se requiere un campo espacial auténtico del evento o una unidad administrativa de ocurrencia validada. [Script de ingesta](/root/polis/backend/scripts/ingestar_hurtos.py).

Los seis ZIP adicionales reportan filas de casos para Cartagena entre 2015 y 2026, salvo extorsión, cuya serie comienza en 2018. Los CSV médico legales consignan año del hecho, grupo quinquenal de edad, sexo, escenario y zona; en ellos una fila representa un caso. El CSV de extorsión consigna además mes, modalidad, sitio y una columna `Cantidad`, que se **suma** para obtener el total anual; contar solo filas daría otra cifra. Los GeoJSON repiten un `MultiPolygon` EPSG:9377 ligado a `ID_Poligono` 1 o 2. **Así es como están reportados los datos:** la geometría clasifica cabecera y resto, pero no localiza el lugar individual del evento. Las visualizaciones conservan esa granularidad, no infieren barrios. [Series anuales extraídas](series_drive_multifuente_2026.csv) y [manifiesto de procedencia](series_drive_multifuente_2026.manifest.json).

![Cobertura de actividades por vigencia](g01_cobertura.png)

*Figura 2. Cobertura documental de planes de acción. Un mayor número de filas en 2024–2025 puede reflejar archivos más completos o formatos más desagregados.*

## 2. Seguridad personal: violencia letal, hurtos y protección de la vida

### La apuesta y su ejecución

El eje agrupa metas de protección de la vida, convivencia, prevención de delitos, atención a víctimas y seguridad vial. En las metas clasificadas, el peso relativo de seguridad personal fue 20,0 % en el PDD 2013–2015, 19,9 % en 2016–2019 y 13,5 % en el PDD 2024–2027; el PDL de la Localidad 2 alcanzó 19,0 %. Se trata de una clasificación de contenido que debe revisarse en las metas decisivas: «seguridad humana» en el PDD vigente abarca además otras dimensiones y no equivale exclusivamente a policía o control del delito.

Entre 2018 y 2025 las actividades clasificadas pasaron de 351 a 606, mientras su peso dentro de los siete ejes pasó de 22,0 % a 14,4 %. La pendiente de −0,60 puntos anuales no es concluyente (p = 0,548); la clasificación solo por texto tampoco muestra tendencia concluyente. Secretaría del Interior, Distriseguridad y DATT son los ejecutores con más actividades observadas. Parte del gasto BPIN identificado corresponde a tecnología de investigación criminal; su efecto exige conocer fecha de entrega, cobertura operativa y uso efectivo, además del monto comprometido.

![Seguridad personal: actividad e inversión](g_eje_0.png)

### Lo que muestran los casos

Forensis registra 427 homicidios en 2023 y 411 en 2024, con tasas de 40,59 y 38,79 por 100.000 habitantes, respectivamente. Esa reducción anual es real dentro de la serie de Medicina Legal; el nivel de 2024 sigue por encima del de 2019. No debe mezclarse en una misma línea con el conteo policial sin distinguir fuente y definición. [Forensis 2024](https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf), [serie de Cartagena Cómo Vamos](https://cartagenacomovamos.org/wp-content/uploads/2025/07/ICV2024-PRESENTACIONEJECUTIVA-CCV.pdf).

En los tres GeoJSON recuperados, el hurto a residencias pasó de 618 casos ponderados en 2023 a 481 en 2024, mientras el de motocicletas subió de 503 a 665 y el de comercio pasó de 923 a 916. Son **tres tipologías**, no el total de hurtos. La fuente periodística de Cartagena Cómo Vamos reporta 663 motocicletas en 2024; la diferencia de dos casos frente al archivo ingerido obliga a documentar fecha de corte y depuración antes de unir series. [Informe de Calidad de Vida 2024](https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf).

### Juicio posible y cruce que falta

Se observa una reducción moderada del homicidio entre 2023 y 2024, una mejora en hurto a residencias y un deterioro en hurto a motocicletas. Es incorrecto resumirlos como una «disminución de la inseguridad». Para evaluar contribución del PDD 2024–2027 se necesita localizar los programas de prevención, vigilancia, iluminación, convivencia y atención; registrar la fecha en que empezaron a operar; y comparar territorios expuestos con territorios semejantes no expuestos, controlando tendencias previas. Los archivos recibidos permiten analizar por separado homicidio, extorsión y tres modalidades de hurto a escala de ciudad y zona urbana/rural. No contienen una serie equivalente de lesiones interpersonales ni localización puntual de los hechos.

**Gráficos definitivos del eje:** serie mensual de homicidios por fuente y tasa; pequeños múltiples de tipos de hurto; mapa de cambios por unidad territorial real; línea de tiempo de intervención y producto; diferencia de tendencias entre territorios comparables; composición por sexo/edad donde la privacidad lo permita. El gráfico de tiempo nunca presentará una caída como «efecto» sin diseño de evaluación.

## 3. Seguridad comunitaria: tejido social y violencias dentro del hogar

### La apuesta y su ejecución

El PDD 2024–2027 dedica 53,9 % de sus metas clasificadas entre los siete ejes a seguridad comunitaria; el PDL de la Localidad 3 alcanza 50,0 %. El eje incluye inclusión, cultura, deporte, cuidado, juventud y organización comunitaria. No todas esas metas tienen un mecanismo directo de reducción de homicidios. La teoría de cambio debe identificar para cuáles se espera convivencia, para cuáles participación y para cuáles protección de grupos vulnerables.

Las actividades pasan de 624 en 2018 a 1.832 en 2025. Su cuota pasa de 39,1 % a 43,4 %, pero la pendiente +1,82 puntos anuales no es concluyente y, bajo clasificación solo por texto, prácticamente desaparece (+0,01). La Secretaría de Participación y Desarrollo Social, IDER e IPCC concentran buena parte de la actividad. La inversión atribuida al eje es extremadamente sensible a un BPIN grande de 2025, por lo que ninguna conclusión de «gran aumento del gasto comunitario» debe basarse en la cifra agregada sin auditar ese expediente.

![Seguridad comunitaria: actividad e inversión](g_eje_1.png)

### Lo que muestran los casos

El Anuario de Seguridad distrital, con datos de Medicina Legal, informa 673 casos de violencia de pareja en 2024, 14 % menos que en 2023; 90 % de las víctimas registradas fueron mujeres. También presenta 416 exámenes por presunto delito sexual, 64 casos de violencia contra niñas, niños y adolescentes y 60 contra personas mayores. Las categorías responden a definiciones diferentes, pueden solaparse en circunstancias y no deben sumarse para formar un «total comunitario». [Anuario de Seguridad](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/seguridad-785).

### Juicio posible y cruce que falta

La reducción de violencia de pareja entre dos años merece seguimiento, pero no identifica por sí sola la contribución de centros, rutas de protección o programas comunitarios. La tasa de denuncia, la ampliación de atención y los cambios de registro pueden mover la cifra. El análisis final debe emparejar cohortes de intervención por territorio con rutas de atención, permanencia y reincidencia; también debe separar violencia de pareja, violencia intrafamiliar, violencia sexual y lesiones interpersonales. Un mapa por localidad solo será válido si la ubicación corresponde al hecho o residencia según una regla explícita.

**Gráficos definitivos del eje:** violencias por tipo y sexo en paneles separados; cobertura de atención y tiempos de respuesta; adopción de rutas; barrios expuestos a intervención; cambio antes/después con comparadores; brecha entre oferta social y carga de casos.

## 4. Seguridad económica: pobreza, empleo y medios de vida

### La apuesta y su ejecución

En el PDD 2024–2027, 15,7 % de las metas clasificadas entre los siete ejes corresponde al ámbito económico; en los PDL de Localidades 1 y 3 las participaciones alcanzan 30,4 % y 26,2 %. Las apuestas identificables incluyen inclusión productiva, emprendimiento, empleabilidad y apoyo a hogares vulnerables. El Plan de Emergencia Social Pedro Romero y la Secretaría de Turismo aparecen entre los ejecutores con más actividades. Algunas metas de otras áreas pueden tener impactos económicos indirectos, pero se mantienen fuera del conteo principal para conservar una clasificación interpretable.

Las actividades suben de 143 a 836 entre 2018 y 2025 y su cuota de 9,0 % a 19,8 %. Es el único eje cuyo aumento relativo se sostiene tanto en la clasificación completa (+1,85 puntos anuales, p = 0,014) como en la restringida a texto (+1,65, p = 0,014). Esto sostiene la afirmación de que la agenda documentada dio más espacio a iniciativas económicas. No demuestra cuántas personas obtuvieron empleo formal ni cuánto ingreso adicional generaron.

![Seguridad económica: actividad e inversión](g_eje_2.png)

### Resultado observado

El DANE reporta pobreza monetaria de 42,8 % en 2023, 41,1 % en 2024 y 34,6 % en 2025. El cambio es importante, pero la pobreza depende también del mercado laboral, precios, salarios, transferencias nacionales y composición de hogares. Para estimar la contribución local debe localizarse quién recibió cada apoyo y medirse su trayectoria de ingreso, empleo y permanencia. Se usa la serie actualizada de DANE para evitar mezclar versiones con bases distintas. [Presentación DANE 2025](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf), [boletín DANE 2024](https://www.dane.gov.co/files/operaciones/PM/bol-PM-2024.pdf).

### Juicio posible y cruce que falta

Hay dos hechos simultáneos: aumentó la prioridad económica observada en el PA y bajó la pobreza monetaria. Se necesita verificar mecanismos y desfases antes de afirmar que el primero causó el segundo. La unidad de análisis ideal es hogar beneficiario por programa y fecha; si esa trazabilidad no existe, se puede evaluar por zona y año con comparación externa, dejando claro el mayor riesgo de sesgo. El análisis debe mostrar pobreza monetaria, pobreza extrema, desempleo, informalidad e ingresos laborales en paneles separados, con intervalos de confianza cuando proceda.

**Gráficos definitivos del eje:** tendencia de pobreza y líneas nacionales comparables; cobertura de programas; ingreso o empleo antes/después de beneficiarios; distribución territorial de apoyos; pagos por beneficiario; evaluación de sensibilidad a choques macroeconómicos.

## 5. Seguridad alimentaria: acceso a alimentos y nutrición

### La apuesta y su ejecución

La seguridad alimentaria ocupa una proporción pequeña de las metas clasificadas: 2,5 % en el PDD 2024–2027 y alrededor de 5 % en cada PDL vigente. No debe confundirse baja presencia en el texto de planes de acción con ausencia de política alimentaria: educación, salud y protección social pueden financiar componentes alimentarios dentro de otros programas. La clasificación debe examinar específicamente PAE, complementación nutricional, compras, asistencia agropecuaria y ayuda humanitaria.

Las actividades clasificadas aumentan de 30 en 2018 a 160 en 2025, y su cuota de 1,9 % a 3,8 %. Ni la pendiente de la clasificación completa (+0,54 puntos por año) ni la de texto (+0,09) son concluyentes. La Unidad Municipal de Asistencia Técnica Agropecuaria concentra la actividad observada. Un BPIN de alimentación escolar aparece con montos importantes en distintas vigencias; hay que verificar cobertura y raciones efectivas antes de hablar de mejora nutricional.

![Seguridad alimentaria: actividad e inversión](g_eje_3.png)

### Resultado disponible y límite

El DANE publica la escala FIES de inseguridad alimentaria y un visor territorial con estimaciones para 2022 y 2024. La cifra nacional o departamental no debe trasladarse automáticamente a Cartagena. DADIS publica vigilancia de desnutrición aguda en menores de cinco años y mapas de 2024, con unidad de observación distinta de FIES. La extracción municipal verificable y las definiciones de caso son necesarias antes de construir una serie única. [DANE FIES](https://www.dane.gov.co/index.php/estadisticas-por-tema/salud/escala-de-experiencia-de-inseguridad-alimentaria-fies), [visor DANE 2022/2024](https://sitios.dane.gov.co/EstimacionesModeloSAE/), [Anuario distrital de Salud](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/salud-788).

### Juicio posible y cruce que falta

No existe en el conjunto integrado actual una serie suficientemente homologada que permita decir si las apuestas alimentarias redujeron los casos de desnutrición o la inseguridad alimentaria en Cartagena. El análisis debe separar *acceso de hogares*, *estado nutricional infantil* y *cobertura de alimentación escolar*. Para atribuir cambios al PAE se necesitan matrícula, días efectivos de ración, modalidad, puntos de entrega, auditoría de calidad, edad y residencia de estudiantes; para agricultura y abastecimiento, producción, precios y acceso de hogares.

**Gráficos definitivos del eje:** FIES municipal con incertidumbre; desnutrición aguda por edad y territorio; cobertura y continuidad de PAE; precios de canasta; pagos y raciones verificadas; comparación de barrios con y sin intervención específica.

## 6. Seguridad en salud: prevención, acceso y continuidad

### La apuesta y su ejecución

En el PDD 2016–2019, salud alcanzó 25,3 % de las metas clasificadas entre los siete ejes; en 2020–2023 fue 14,2 %. Las acciones cubren aseguramiento, salud pública, salud mental, atención de urgencias y prevención. DADIS domina el registro de actividades. La cuota de actividad baja de 18,4 % en 2018 a 4,5 % en 2025, pero la tendencia aparente de la clasificación completa (−1,69 puntos anuales, p = 0,014) no se reproduce con el método solo texto (−0,79, p = 0,548). Por tanto no se afirma una retirada de la política de salud.

El BPIN de continuidad de afiliación de 679.555 personas concentra una parte grande de la inversión de 2024–2025. Esa apropiación describe sostenimiento financiero; una evaluación de seguridad en salud requiere continuidad real de afiliación, disponibilidad de prestadores, oportunidad de cita y desenlaces sanitarios. Los pagos del proyecto no miden por sí mismos calidad de atención.

![Seguridad en salud: actividad e inversión](g_eje_4.png)

### Resultado observado

Cartagena Cómo Vamos, con datos de DADIS, reporta razón de mortalidad materna de 65,4 por 100.000 nacidos vivos en 2023 y cero muertes maternas en 2024. Es un avance de un indicador de baja frecuencia que requiere seguimiento multianual. El Anuario distrital reúne además dengue, enfermedad diarreica aguda, desnutrición y otros eventos; cada uno debe estudiarse con su definición y población en riesgo. [Informe ejecutivo CCV 2024](https://cartagenacomovamos.org/wp-content/uploads/2025/07/ICV2024-PRESENTACIONEJECUTIVA-CCV.pdf), [Anuario distrital de Salud](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/salud-788).

### Juicio posible y cruce que falta

El resultado materno favorable puede ser consistente con mejores rutas de atención, pero se necesitan denominadores, cohortes, controles prenatales, remisiones y análisis de causas para valorar contribución. La seguridad en salud exige más de un indicador: acceso, continuidad y daño evitable. El archivo compartido sí aporta series de suicidios y muertes por transporte; no aporta una serie de intentos de suicidio ni de acceso efectivo a atención. Estos indicadores deben conservar su definición de origen y cruzarse con cobertura de atención mediante unidades agregadas, sin exponer datos personales.

**Gráficos definitivos del eje:** mortalidad y morbilidad con bandas de incertidumbre; mapa de tiempos de acceso; continuidad de afiliación; atención prenatal; mortalidad evitable; brecha entre pagos, servicios y resultados.

## 7. Seguridad ambiental: exposición, riesgo y habitabilidad

### La apuesta y su ejecución

El PDD 2020–2023 dedica 13,3 % de sus metas clasificadas entre los siete ejes a seguridad ambiental; en el PDD 2024–2027 es 7,5 %. EPA Cartagena y la Oficina de Gestión del Riesgo dominan la actividad documentada. El eje incluye contaminación, saneamiento, cuerpos de agua, inundación y gestión de emergencias. La cuota de PA pasa de 6,3 % en 2018 a 5,3 % en 2025; una pendiente negativa del clasificador completo no es robusta frente a la versión solo texto. El gasto de 2023 se ve afectado por un gran BPIN de subsidios de servicios públicos; debe analizarse como servicio básico y no asumir que es mitigación directa de riesgo ambiental.

![Seguridad ambiental: actividad e inversión](g_eje_5.png)

### Resultado disponible y límite

Cartagena Cómo Vamos, con datos de EPA, informa que la estación Policía registró PM₂.₅ mayoritariamente en rango «bueno» en 2024. Ese resultado no representa por sí solo la exposición de todo el distrito, en especial zonas industriales, bordes de la Ciénaga, islas y corregimientos. Los mapas de inundación y de calidad ambiental requieren series de sensores, puntos de medición y fechas comparables con las obras. [Informe de Calidad de Vida 2024](https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf), [EPA Cartagena](https://epacartagena.gov.co/web/wp-content/uploads/2024/11/EPA-RES-00671-2024.pdf).

### Juicio posible y cruce que falta

No hay base para afirmar una reducción distrital del riesgo ambiental a partir de un sensor o de mayor número de actividades. El análisis debe distinguir exposición, daño y respuesta: calidad del aire por estación, personas y viviendas expuestas a inundación, recurrencia de eventos, calidad de agua, cobertura de saneamiento y avance físico de obras. El cálculo territorial utilizará geometrías de amenaza y población, evitando asignar automáticamente al barrio entero un riesgo medido en un punto.

**Gráficos definitivos del eje:** series de PM₂.₅ por estación; distribución espacial de inundaciones; habitantes expuestos y protegidos; avance de obras con fecha de entrada en servicio; cambio de riesgo en áreas tratadas y comparables; medidas de robustez para lluvias extremas.

## 8. Seguridad política: derechos, participación y confianza

### La apuesta y su ejecución

El eje reúne participación efectiva, derechos humanos, transparencia, rendición de cuentas e incidencia de grupos históricamente excluidos. Las metas clasificadas son pocas: 4,4 % entre los siete ejes en el PDD 2013–2015 y 3,3 % en el PDD 2016–2019. La Escuela de Gobierno y Liderazgo concentra gran parte de las actividades observadas. De 2018 a 2025 pasan de 52 a 373, y su cuota de 3,3 % a 8,8 %, pero la tendencia estadística no es concluyente (p = 0,275). Las actividades de campañas o formación miden oferta; no miden poder real de decisión ni respuesta del gobierno a propuestas.

![Seguridad política: actividad e inversión](g_eje_6.png)

### Resultado disponible y límite

La Encuesta de Percepción Ciudadana 2025 de Cartagena Cómo Vamos aporta variables sobre confianza y participación. Según su análisis, 35 % de encuestados consideró que la ciudad iba por buen camino en 2025, frente a 49 % en 2024. Ese indicador capta percepción general, no puede asignarse exclusivamente a un programa de participación y requiere revisar diseño muestral antes de desagregar por localidad. [Encuesta de Percepción Ciudadana 2025](https://cartagenacomovamos.org/wp-content/uploads/2026/02/Encuesta-Percepcion-Ciudadana-Cartagena-2025vf.pdf), [síntesis de resultados](https://cartagenacomovamos.org/cartagena-como-vamos-traza-una-hoja-de-ruta-de-ciudad-a-partir-de-la-percepcion-de-los-ciudadanos/).

### Juicio posible y cruce que falta

Para valorar seguridad política se necesita medir si las propuestas ciudadanas fueron incorporadas a decisiones, si las mujeres y grupos étnicos participaron con influencia verificable, si mejoró la atención a quejas y si bajaron amenazas o vulneraciones de derechos. El número de talleres no resuelve esas preguntas. La plataforma dispone de propuestas y mesas que pueden usarse para trazabilidad, con un identificador de propuesta → respuesta → acto o proyecto → resultado. Los archivos compartidos no contienen una serie específica de amenazas a liderazgos o vulneraciones de derechos; ese resultado requiere otra fuente, con protección de identidad y sin publicar ubicaciones de víctimas.

**Gráficos definitivos del eje:** embudo de propuestas hasta decisiones; tiempo de respuesta; participación por grupo y territorio con tamaño de muestra; confianza institucional; evolución de quejas y amenazas por fuente; seguimiento de compromisos adquiridos en mesas.

## 9. Lectura conjunta de ciudad

La composición de la agenda cambió entre periodos. El estudio calcula una distancia de Jensen–Shannon de 0,2271 entre 2018–2019 y 2024–2026*; es una medida de diferencia de perfiles documentales, no de distancia en bienestar. Los siete ejes juntos representaron 73,4 % de la actividad clasificada en 2018 y 61,6 % en 2025. La caída del peso agregado puede corresponder a más registro de gestión institucional u otras actividades, además de cambios políticos. No se puede interpretar sin revisar la cobertura documental y la clasificación.

![Perfil de la actividad por periodo de gobierno](g21_periodos.png)

La lectura integrada revela tres brechas. **Primera**, la formulación y la actividad tienen mucho más detalle que los resultados territoriales homologados. **Segunda**, los recursos BPIN son vulnerables a proyectos atípicos y a errores de OCR, lo que exige auditoría de montos antes de comparar ejes. **Tercera**, la mayoría de las actividades no registra en este estudio un vínculo verificable con población beneficiaria y territorio. Esas brechas no invalidan los planes; delimitan lo que puede demostrarse sobre sus efectos.

Para el gobierno distrital, la pregunta útil no es «¿cuántas actividades hicimos?», sino «¿en qué barrios se entregó qué producto, cuándo, a quién y qué cambió después frente a lugares comparables?». El sistema de información debe producir esa respuesta por programa y dimensión, manteniendo fuente, definición, fecha y nivel territorial.

## 10. Alcance de los archivos multifuente recibidos

La carpeta compartida contiene seis series de casos y tres modalidades de hurto. El [inventario de archivos y su huella digital](NOTA_FUENTES_DRIVE_MULTIFUENTE_2026.md) documenta el procesamiento, y las [series anuales derivadas](series_drive_multifuente_2026.csv) conservan cada tipo de evento por separado. Cuatro series de los CSV coinciden con la extracción pública de Medicina Legal en todos los años cotejados de 2015 a 2024. Los archivos recibidos no incluyen una ficha institucional de procedencia ni una fecha de corte verificable para las cifras de 2025 y 2026; por ello se presentan como **cifras reportadas en el archivo compartido**, con 2026 parcial, sin calificarlas de definitivas.

La estructura reportada permite distinguir evento, año y, según archivo, mes, sexo, edad, escenario, modalidad, cantidad y zona. En los CSV médico legales, cada fila representa un caso; en extorsión, el total se obtiene sumando `Cantidad`. No se suman eventos de sistemas diferentes como si fueran personas o hechos únicos. Una deduplicación entre sistemas requeriría identificadores y criterios verificables que estos archivos no aportan.

La geometría `MultiPolygon` en EPSG:9377 representa las zonas urbana y rural del reporte; **no es una coordenada del incidente**. Se visualiza, por tanto, como serie de ciudad y, cuando procede, comparación urbano/rural, sin mapas de calor puntuales, barrios o UCG inferidos. Esta es la resolución con la que se entregó la información, no un error que pueda corregirse mediante una transformación geométrica. Para evaluar políticas localizadas se requieren la unidad real de ocurrencia y la fecha de entrada en servicio de cada intervención. Los registros sensibles se agregan y el documento público no expone domicilios ni localizaciones de víctimas.

## 11. Diseño de evaluación de las apuestas políticas

### Primero: cronología comprobada de la intervención

Cada línea estratégica que se quiera evaluar tendrá una ficha con PDD/PDL, meta, indicador, actividad PA, BPIN, dependencia, monto apropiado/comprometido/pagado, producto efectivamente entregado, fecha de puesta en servicio, población objetivo y zona expuesta. Si alguno de estos campos falta, se marcará el eslabón de trazabilidad perdido. La ficha distinguirá metas de producto de metas de resultado; no se usará el avance físico de una obra como sustituto de una tasa de daño.

### Segundo: serie de resultado comparable

Para cada problema se elegirá un indicador primario y otros secundarios. Se publicarán definiciones constantes, versión de fuente, corte anual/mensual y denominador. Se mostrarán simultáneamente conteo y tasa cuando proceda. Las fuentes con cambios de captación se marcarán con interrupciones de serie. Medicina Legal y Policía pueden mostrar direcciones diferentes para un mismo año: el gráfico tendrá líneas separadas, no una media ficticia.

### Tercero: comparación que permita valorar contribución

Cuando exista localización y fecha de implementación, se usarán series mensuales por territorio y un grupo de comparación seleccionado por nivel previo de daño, características sociales y tendencia anterior. Se evaluará un estudio de eventos o diferencias en diferencias solo si las tendencias previas son compatibles y no hubo derrame evidente de la intervención. Si todos los territorios recibieron la misma política o la geografía es insuficiente, se hará una serie temporal interrumpida de ciudad con análisis de estacionalidad y choques, etiquetada como evidencia de contribución más débil. El diseño registrará violencia desplazada a zonas vecinas, subregistro y cambios de denuncia.

### Cuarto: transparencia del resultado

Cada conclusión indicará: dirección del cambio, tamaño, intervalo de incertidumbre cuando corresponda, fuente, exposición medida, periodo, territorios incluidos, sensibilidad a otras definiciones y nivel de confianza del juicio. Se publicarán también los resultados nulos y adversos. Una reducción de casos con baja ejecución no se atribuirá automáticamente al plan; un aumento de denuncias después de abrir una ruta de atención puede representar mejor acceso al sistema y requiere interpretación específica.

## 12. Arquitectura editorial de las quince páginas por eje

El documento final solicitado tendrá alrededor de quince páginas **por cada eje**, con predominio de visualizaciones y texto analítico breve. La misma secuencia permite comparar sectores sin imponerles el mismo indicador de resultado:

1. **Pregunta de resultado y definición del daño:** qué problema se evalúa y qué eventos lo representan.
2. **Apuestas de los ocho planes:** metas y líneas estratégicas pertinentes, mostrando PDD y PDL por separado.
3. **Teoría de cambio:** mecanismo esperado entre intervención y resultado, con sus supuestos.
4. **Evolución de prioridades:** cuota de metas y actividad, con bandas de administraciones.
5. **Cobertura documental:** qué años, entidades y territorios faltan; separación entre 2026 parcial y años completos.
6. **Acción efectiva:** actividades con producto entregado, no solo actividad enunciada.
7. **Recursos:** apropiado, comprometido y pagado, con sensibilidad a BPIN dominante.
8. **Territorialización de la oferta:** dónde y desde cuándo llegó cada intervención.
9. **Serie de casos o privaciones:** gráficos por fuente, tipología y denominador comparable.
10. **Diferencias por población:** sexo, edad y grupos diferenciales con protección de privacidad.
11. **Patrón espacial:** localidades, UCG y ruralidad únicamente al nivel que soporte el dato.
12. **Cruce oferta–resultado:** intensidad de intervención frente a cambio posterior, sin confundir correlación con efecto.
13. **Comparación y sensibilidad:** grupos comparables, tendencias previas, cambios de denuncia y definiciones.
14. **Dictamen de evidencia:** qué mejora, qué empeora y qué permanece indeterminado.
15. **Decisiones de gobierno:** corrección de focalización, producción de datos y metas verificables del siguiente ciclo.

Cada gráfico llevará título interrogativo, unidad, periodo, universo, fuente y fecha de corte. No se usarán tablas extensas como forma principal de comunicación. Los anexos de datos podrán contener registros auditables; el cuerpo será gráfico y narrativo. El [estudio visual multifuente de 109 páginas](ESTUDIO_VISUAL_MULTIFUENTE_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf) ya integra las series recibidas a la escala que permiten los archivos. La validación de BPIN atípicos y de las cifras 2025–2026 aún debe incorporarse en una edición posterior.

## 13. Decisiones que ya puede tomar el Distrito y decisiones que requieren más evidencia

**Puede actuar ahora** para auditar los BPIN dominantes, corregir clasificación OCR de líneas y metas, exigir que todo nuevo plan de acción registre territorio y fecha del producto, y publicar series de indicadores de resultado con fuente y denominador. Puede priorizar la investigación de homicidios persistentes y hurto de motocicletas, mantener el seguimiento de violencia de pareja y aprovechar la mejora de pobreza para identificar qué hogares aún no se beneficiaron. Estas decisiones no dependen de atribuir causalidad a un programa.

**Puede comparar tendencias municipales por tipo de caso** con los archivos recibidos. Para afirmar qué localidades mejoraron y si lo hicieron después de una intervención específica faltan datos de ocurrencia a esa escala, productos entregados y fechas de exposición. También debe evitar un ranking único de «seguridad humana» que sume homicidios, pobreza, salud y ambiente sin justificación de escala y ponderación. Los siete ejes comparten una pregunta de protección, pero necesitan indicadores y mecanismos distintos.

El próximo corte debe obtener la ficha institucional y fecha de corte de los archivos, cotejar externamente las cifras 2025–2026, validar los BPIN atípicos y completar los indicadores aún ausentes por eje. Todo cambio respecto de esta edición se documentará con fecha y fuente.

## Fuentes principales

- **Planes y acciones del proyecto:** [ocho planes digitalizados](/root/polis/data/planes_desarrollo), [motor reproducible de tendencias](/root/polis/backend/app/modules/compromisos/pdt_analisis_planes_tendencias.py) y [método de ingesta de hurtos](/root/polis/backend/scripts/ingestar_hurtos.py).
- **Archivos compartidos:** [carpeta Data Política Publica](https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4), [perfil de cobertura y procedencia](NOTA_FUENTES_DRIVE_MULTIFUENTE_2026.md) y [series anuales por evento](series_drive_multifuente_2026.csv).
- **Daño y violencia:** [Forensis 2024, Instituto Nacional de Medicina Legal](https://www.medicinalegal.gov.co/documents/20143/1269218/Forensis_2024.pdf), [microdatos de homicidio de Medicina Legal](https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2), [Anuario de Seguridad de Cartagena](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/seguridad-785), [Informe de Calidad de Vida 2024 de Cartagena Cómo Vamos](https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf).
- **Pobreza y alimentación:** [DANE, presentación de pobreza monetaria 2025](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf), [DANE, boletín 2024](https://www.dane.gov.co/files/operaciones/PM/bol-PM-2024.pdf), [DANE FIES](https://www.dane.gov.co/index.php/estadisticas-por-tema/salud/escala-de-experiencia-de-inseguridad-alimentaria-fies) y [visor territorial DANE](https://sitios.dane.gov.co/EstimacionesModeloSAE/).
- **Salud, ambiente y política:** [Anuario distrital de Salud](https://planeacion.cartagena.gov.co/centro-estudios-territoriales/anuario-estadistico/salud-788), [Encuesta de Percepción Ciudadana 2025](https://cartagenacomovamos.org/wp-content/uploads/2026/02/Encuesta-Percepcion-Ciudadana-Cartagena-2025vf.pdf), [Informe de Calidad de Vida 2024](https://cartagenacomovamos.org/wp-content/uploads/2025/07/Informe-Calidad-de-Vida-2024-CartagenaComoVamos.pdf).
