import type { PoliticaPublica } from "@/types/domain";

/**
 * Dataset mock canónico. Cuando el backend FastAPI esté listo,
 * este módulo se sustituye por respuestas de apiFetch sin tocar la UI.
 */

export const POLITICAS_MOCK: PoliticaPublica[] = [
  {
    id: "pol-001",
    slug: "movilidad-segura",
    titulo: "Plan de Movilidad Segura 2026–2039",
    resumen:
      "Reorganización integral de la movilidad urbana priorizando peatones, ciclistas y transporte público de calidad.",
    descripcion:
      "El Plan de Movilidad Segura replantea la jerarquía vial de la ciudad para reducir la siniestralidad en un 60% a 2039 y garantizar que el 80% de los desplazamientos se realicen en modos sostenibles. El plan se estructura sobre evidencia de accidentalidad, encuestas origen-destino y auditorías de espacio público, y se construye con la ciudadanía en cada fase: desde el diagnóstico territorial hasta la validación del documento final.",
    problema:
      "La ciudad registra 342 víctimas fatales en siniestros viales al año, el 47% peatones. La red vial prioriza el automóvil pese a que solo el 22% de los desplazamientos se hace en este modo, y el 61% de los ciudadanos reporta sentirse inseguro al cruzar las vías arteriales de su barrio.",
    sector: "movilidad",
    estado: "consulta_publica",
    cobertura: "Todo el territorio urbano y 6 corregimientos",
    fechaInicio: "2026-08-11",
    fechaCierre: "2026-10-30",
    participantes: 4821,
    fases: [
      {
        id: "fase-001-1",
        politicaId: "pol-001",
        orden: 1,
        nombre: "Diagnóstico participativo",
        tipo: "diagnostico",
        descripcion:
          "Cartografía social de la siniestralidad, auditorías de rutas escolares y mesas territoriales para identificar los puntos críticos de la red vial.",
        estado: "completada",
        progreso: 100,
        lineas: [
          {
            id: "lin-001-1-1",
            faseId: "fase-001-1",
            codigo: "LE-01",
            titulo: "Puntos críticos de accidentalidad",
            descripcion:
              "Identificación participativa de los corredores e intersecciones donde se concentra la siniestralidad peatonal y ciclista.",
            aportes: [
              {
                id: "apo-001-1-1-1",
                lineaId: "lin-001-1-1",
                tipo: "anotacion",
                titulo: "Cruce de la Av. Regional con la Calle 44",
                contenido:
                  "Este cruce concentra al menos tres siniestros graves por semestre según reportes comunitarios. El semáforo peatonal dura 12 segundos para cruzar ocho carriles: es físicamente imposible para una persona mayor. Solicito que el diagnóstico incluya medición de tiempos de cruce reales, no solo conteos de flujo vehicular.",
                autor: "Camila Restrepo",
                fecha: "2026-08-19",
                votos: 187,
                apoyado: false,
              },
              {
                id: "apo-001-1-1-2",
                lineaId: "lin-001-1-1",
                tipo: "propuesta",
                titulo: "Auditoría de ruta escolar con jóvenes auditores",
                contenido:
                  "Propongo que estudiantes de grados 9.º y 10.º de colegios públicos sean formados como auditores juveniles de rutas escolares. Ellos recorren a diario estos trayectos y su mirada captura riesgos que los estudios técnicos omiten: basuras, iluminación, vendorismo informal. La metodología ya se probó en Bogotá con excelentes resultados y tiene bajo costo.",
                autor: "Andrés Gómez",
                fecha: "2026-08-23",
                votos: 243,
                apoyado: true,
              },
              {
                id: "apo-001-1-1-3",
                lineaId: "lin-001-1-1",
                tipo: "pregunta",
                titulo: "¿Los datos de aseguradoras harán parte del diagnóstico?",
                contenido:
                  "Las aseguradoras tienen registros de siniestros que nunca llegan a las cifras oficiales porque no se denuncian penalmente. ¿El diagnóstico oficial cruzará bases de datos públicas y privadas para dimensionar el problema real?",
                autor: "Jorge Ibáñez",
                fecha: "2026-08-27",
                votos: 96,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-1-2",
            faseId: "fase-001-1",
            codigo: "LE-02",
            titulo: "Movilidad de cuidado",
            descripcion:
              "Análisis de los trayectos de cuidado (acompañamientos, compras, salud) que hoy la planeación ignora por centrarse en desplazamientos trabajo-hogar.",
            aportes: [
              {
                id: "apo-001-1-2-1",
                lineaId: "lin-001-1-2",
                tipo: "propuesta",
                titulo: "Medir los viajes de cuidado con diarios de movilidad",
                contenido:
                  "Propongo aplicar diarios de movilidad a 500 hogares monoparentales encabezados por mujeres en las comunas 2, 5 y 7. Los viajes de cuidado son encadenados, cortos y fuera de hora pico: por eso la oferta de transporte los castiga. Sin medirlos, el plan seguirá diseñado para el viajero promedio que no existe.",
                autor: "Valentina Ortiz",
                fecha: "2026-08-21",
                votos: 312,
                apoyado: false,
              },
              {
                id: "apo-001-1-2-2",
                lineaId: "lin-001-1-2",
                tipo: "anotacion",
                titulo: "Bordillos y andenes intransitables para sillas y coches",
                contenido:
                  "En la Comuna 10 el 70% de los andenes tiene bordillos de más de 15 cm sin rampas. Una madre con cochecito o una persona en silla de ruedas no puede completar un trayecto de 400 metros sin bajar a la calzada. La movilidad de cuidado empieza por la geometría del andén.",
                autor: "Diana Carvajal",
                fecha: "2026-08-25",
                votos: 201,
                apoyado: true,
              },
            ],
          },
        ],
      },
      {
        id: "fase-001-2",
        politicaId: "pol-001",
        orden: 2,
        nombre: "Formulación de líneas estratégicas",
        tipo: "formulacion",
        descripcion:
          "Construcción colaborativa de las líneas estratégicas del plan: cada línea define objetivos, metas e intervenciones prioritarias que la ciudadanía puede enriquecer con propuestas y anotaciones.",
        estado: "activa",
        progreso: 45,
        lineas: [
          {
            id: "lin-001-2-1",
            faseId: "fase-001-2",
            codigo: "LE-01",
            titulo: "Jerarquía vial para la vida",
            descripcion:
              "Rediseño funcional de la red: vías school-street, corredores calmados de 30 km/h y reconfiguración de arteriales con protección física peatonal.",
            aportes: [
              {
                id: "apo-001-2-1-1",
                lineaId: "lin-001-2-1",
                tipo: "propuesta",
                titulo: "Calles escolares permanentes en 40 instituciones",
                contenido:
                  "Elevar a régimen permanente los cierres viales frente a 40 colegios públicos en horas entrada/salida. La prueba piloto de 2025 redujo 38% la velocidad de aproximación y duplicó el uso de bicicleta entre estudiantes. Propongo financiarlo con personal comunitario contratado del mismo barrio, no con agentes de tránsito.",
                autor: "Santiago Betancur",
                fecha: "2026-09-08",
                votos: 421,
                apoyado: false,
              },
              {
                id: "apo-001-2-1-2",
                lineaId: "lin-001-2-1",
                tipo: "anotacion",
                titulo: "La calma vial no es solo límite de velocidad",
                contenido:
                  "Reducir el límite a 30 km/h sin rediseño geométrico es letra muerta: en la Calle 30 el límite es 50 pero la velocidad media operacional es 72. Las líneas estratégicas deben incluir angostamiento de carriles, elevaciones de calzada y vegetación que estreche la percepción de la vía.",
                autor: "Ricardo Mejía",
                fecha: "2026-09-10",
                votos: 289,
                apoyado: true,
              },
              {
                id: "apo-001-2-1-3",
                lineaId: "lin-001-2-1",
                tipo: "propuesta",
                titulo: "Corredor verde-peatonal sobre el ferrocarril en desuso",
                contenido:
                  "El corredor ferroviario entre las estaciones Norte y Sur lleva 18 años sin servicio de carga significativo. Propongo intervenir 9 km como corredor peatonal-ciclista lineal que conecte 14 barrios, con iluminación autónoma y activación comercial en las estaciones. Es la intervención de mayor relación costo-beneficio posible: la servidumbre ya existe.",
                autor: "Alejandro Vélez",
                fecha: "2026-09-12",
                votos: 567,
                apoyado: false,
              },
              {
                id: "apo-001-2-1-4",
                lineaId: "lin-001-2-1",
                tipo: "pregunta",
                titulo: "¿Cómo se financia el rediseño de las arteriales?",
                contenido:
                  "El rediseño de las 8 arteriales mencionadas requiere una inversión mayor que todo el presupuesto de infraestructura vial de la administración. ¿La formulación contempla una fase de priorización honesta o se van a aprobar metas sin fuente de financiación identificada?",
                autor: "Óscar Muñoz",
                fecha: "2026-09-14",
                votos: 178,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-2-2",
            faseId: "fase-001-2",
            codigo: "LE-02",
            titulo: "Transporte público integrado y digno",
            descripcion:
              "Integración tarifaria y física de sistemas, refuerzo de rutas alimentadoras en horas escolares y estándares de accesibilidad universal en flota y paradas.",
            aportes: [
              {
                id: "apo-001-2-2-1",
                lineaId: "lin-001-2-2",
                tipo: "propuesta",
                titulo: "Tarifa plana diaria para viajes encadenados",
                contenido:
                  "Quien hace tres viajes al día (dejar hijos, trabajar, comprar) paga tres veces. Propongo tarifa tope diaria: a partir del segundo transbordo el viaje cuesta 40% menos. Los estudios de elasticidad en ciudades comparables muestran que la pérdida tarifaria se compensa con aumento de demanda en horas valle.",
                autor: "Luisa Fernanda Marín",
                fecha: "2026-09-09",
                votos: 394,
                apoyado: true,
              },
              {
                id: "apo-001-2-2-2",
                lineaId: "lin-001-2-2",
                tipo: "anotacion",
                titulo: "Las alimentadoras son el eslabón roto",
                contenido:
                  "El 68% de los usuarios de la periferia tarda más en llegar a la estación troncal que en el viaje troncal completo. Las rutas alimentadoras tienen frecuencias de 25 minutos en horas valle. Ninguna estrategia de integración funciona si la alimentadora sigue siendo el cuello de botella.",
                autor: "Paola Andrade",
                fecha: "2026-09-11",
                votos: 256,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-001-2-3",
            faseId: "fase-001-2",
            codigo: "LE-03",
            titulo: "Seguridad vial Visión Cero",
            descripcion:
              "Adopción del enfoque Visión Cero: responsabilidad sistémica del diseño vial, gestión de velocidad y fiscalización basada en datos de siniestralidad.",
            aportes: [
              {
                id: "apo-001-2-3-1",
                lineaId: "lin-001-2-3",
                tipo: "propuesta",
                titulo: "Panel ciudadano de auditoría de siniestros",
                contenido:
                  "Crear un panel de 60 ciudadanos rotativos que audite cada siniestro fatal junto al equipo técnico: qué falló en el diseño, no solo en la conducta. Visión Cero exige que cada muerte se trate como falla sistémica evitable. Los informes deben ser públicos en 90 días.",
                autor: "Marcela Arango",
                fecha: "2026-09-13",
                votos: 331,
                apoyado: false,
              },
              {
                id: "apo-001-2-3-2",
                lineaId: "lin-001-2-3",
                tipo: "anotacion",
                titulo: "Fiscalización electrónica con transparencia de datos",
                contenido:
                  "Los fotodetecciones reducen velocidad, pero su legitimidad depende de criterios públicos de ubicación. Propongo que la ubicación de cada cámara se publique junto con el historial de siniestros del sitio y que la recaudación se destine íntegramente a infraestructura peatonal.",
                autor: "Felipe Cárdenas",
                fecha: "2026-09-15",
                votos: 219,
                apoyado: true,
              },
            ],
          },
          {
            id: "lin-001-2-4",
            faseId: "fase-001-2",
            codigo: "LE-04",
            titulo: "Infraestructura ciclista protegida y continua",
            descripcion:
              "Red primaria de ciclorrutas físicamente protegidas, bicicletas públicas eléctricas y bicicleteros seguros en nodos de transporte y equipamientos.",
            aportes: [
              {
                id: "apo-001-2-4-1",
                lineaId: "lin-001-2-4",
                tipo: "propuesta",
                titulo: "Ciclorruta nocturna con iluminación autónoma",
                contenido:
                  "El 41% de quienes ciclorutean deja de hacerlo de noche por inseguridad en 5 corredores clave. Propongo iluminación solar autónoma con sensores de presencia en esos corredores. El costo por kilómetro es un tercio del alumbrado convencional y no depende de la red eléctrica.",
                autor: "Juliana Saldarriaga",
                fecha: "2026-09-09",
                votos: 302,
                apoyado: false,
              },
              {
                id: "apo-001-2-4-2",
                lineaId: "lin-001-2-4",
                tipo: "anotacion",
                titulo: "Los carriles de bus no son infraestructura ciclista",
                contenido:
                  "Varias ciclorrutas existentes comparten espacio con paradas de bus: cada parada es un punto de conflicto. El estándar de la línea debe exigir separación física de la calzada y del carril bus, no solo pintura.",
                autor: "Camilo Torres",
                fecha: "2026-09-16",
                votos: 167,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-001-3",
        politicaId: "pol-001",
        orden: 3,
        nombre: "Deliberación territorial",
        tipo: "deliberacion",
        descripcion:
          "Asambleas por comunas y deliberación digital para priorizar intervenciones, resolver conflictos de uso del espacio vial y ajustar metas por territorio.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
      {
        id: "fase-001-4",
        politicaId: "pol-001",
        orden: 4,
        nombre: "Validación del documento final",
        tipo: "validacion",
        descripcion:
          "Consulta final sobre el documento consolidado del plan, con informe público de cómo se incorporó cada aporte ciudadano.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
    ],
  },
  {
    id: "pol-002",
    slug: "sistema-de-cuidado",
    titulo: "Sistema Distrital de Cuidado",
    resumen:
      "Reconocimiento, redistribución y profesionalización del trabajo de cuidado como infraestructura social de primera línea.",
    descripcion:
      "El Sistema Distrital de Cuidado articula servicios, regulación y financiación para redistribuir el trabajo de cuidado que hoy recae en el 71% sobre las mujeres. La política crea la red de manzanas de cuidado, profesionaliza el oficio del cuidado remunerado y corresponsabiliza al Estado, al mercado y a los hogares. Es la primera política pública de la ciudad formulada con presupuesto marcado por resultados de cuidado.",
    problema:
      "El 58% de los hogares no tiene acceso a ningún servicio de cuidado público. 412.000 mujeres dedican más de 40 horas semanales a trabajo de cuidado no remunerado, lo que limita su inserción laboral, pensionalización y autonomía económica.",
    sector: "salud",
    estado: "en_deliberacion",
    cobertura: "12 comunas prioritarias, escala distrital al 2031",
    fechaInicio: "2026-07-01",
    fechaCierre: "2026-11-15",
    participantes: 3247,
    fases: [
      {
        id: "fase-002-1",
        politicaId: "pol-002",
        orden: 1,
        nombre: "Diagnóstico de necesidades de cuidado",
        tipo: "diagnostico",
        descripcion:
          "Encuesta distrital de uso del tiempo, cartografía de oferta de servicios y mesas de cuidado con organizaciones feministas y comunitarias.",
        estado: "completada",
        progreso: 100,
        lineas: [
          {
            id: "lin-002-1-1",
            faseId: "fase-002-1",
            codigo: "LE-01",
            titulo: "Mapa de ofertas y vacíos de cuidado",
            descripcion:
              "Georreferenciación de jardines, centros día, hospitales y programas comunitarios frente a la demanda potencial por manzana.",
            aportes: [
              {
                id: "apo-002-1-1-1",
                lineaId: "lin-002-1-1",
                tipo: "anotacion",
                titulo: "Los vacíos se concentran donde el suelo es informal",
                contenido:
                  "El mapa muestra que los barrios de origen informal tienen 0,2 jardines infantiles por cada 100 menores de 5 años, frente a 1,4 en comunas de estratos altos. Cualquier meta distrital debe desagregarse por manzana, si no reproducirá la inequidad que pretende corregir.",
                autor: "Natalia Quintero",
                fecha: "2026-07-12",
                votos: 288,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-002-2",
        politicaId: "pol-002",
        orden: 2,
        nombre: "Formulación del sistema",
        tipo: "formulacion",
        descripcion:
          "Definición de componentes del sistema, modelo de financiación y ruta de implementación por etapas, abierta a aportes ciudadanos.",
        estado: "activa",
        progreso: 62,
        lineas: [
          {
            id: "lin-002-2-1",
            faseId: "fase-002-2",
            codigo: "LE-01",
            titulo: "Manzanas de cuidado",
            descripcion:
              "Red de servicios de proximidad por manzana: jardín, centro día para mayores, lavandería comunitaria y apoyo a cuidadoras.",
            aportes: [
              {
                id: "apo-002-2-1-1",
                lineaId: "lin-002-2-1",
                tipo: "propuesta",
                titulo: "Usar infraestructura escolar ociosa en horas valle",
                contenido:
                  "Las aulas de 40 colegios públicos están vacías de 15:00 a 18:00. Propongo habilitarlas como salas de estimulación temprana y talleres para cuidadoras, operadas por organizaciones comunitarias con contrato de prestación. Es la forma más rápida de escalar la red sin comprar suelo.",
                autor: "Angela Ruiz",
                fecha: "2026-09-05",
                votos: 356,
                apoyado: true,
              },
              {
                id: "apo-002-2-1-2",
                lineaId: "lin-002-2-1",
                tipo: "pregunta",
                titulo: "¿Quién certifica la calidad de las manzanas?",
                contenido:
                  "El sistema propone 120 manzanas al 2031, pero la línea no define el ente acreditador ni los estándares de calidad. Una red masiva sin regulación de calidad puede convertirse en cuidado de segunda para las familias más pobres.",
                autor: "Hernán Zapata",
                fecha: "2026-09-07",
                votos: 194,
                apoyado: false,
              },
            ],
          },
          {
            id: "lin-002-2-2",
            faseId: "fase-002-2",
            codigo: "LE-02",
            titulo: "Profesionalización y formalización del cuidado",
            descripcion:
              "Itinerario formativo certificado, afiliación a seguridad social y mesa salarial para el trabajo de cuidado remunerado.",
            aportes: [
              {
                id: "apo-002-2-2-1",
                lineaId: "lin-002-2-2",
                tipo: "propuesta",
                titulo: "Reconocer saberes comunitarios con certificación por competencias",
                contenido:
                  "Miles de mujeres ya ejercen el cuidado con saberes validados por la práctica: primero que todo, no exijamos itinerarios académicos rígidos. Propongo certificación por evaluación de competencias con rutas de nivelación posteriores. La formalización no puede empezar excluyendo a las mismas que sostienen el sistema informal.",
                autor: "Esperanza Gil",
                fecha: "2026-09-06",
                votos: 402,
                apoyado: true,
              },
            ],
          },
          {
            id: "lin-002-2-3",
            faseId: "fase-002-2",
            codigo: "LE-03",
            titulo: "Corresponsabilidad empresarial y comunitaria",
            descripcion:
              "Incentivos tributarios a empresas con políticas de corresponsabilidad y convenios con juntas de acción comunal para cuidado emergente.",
            aportes: [
              {
                id: "apo-002-2-3-1",
                lineaId: "lin-002-2-3",
                tipo: "anotacion",
                titulo: "Los incentivos sin medición serán un regalo fiscal",
                contenido:
                  "La línea propone descuentos tributarios a empresas con 'políticas de corresponsabilidad', pero no define verificación. Sin auditoría de las prácticas reales (permisos parentales usados, horarios flexibles reales), el incentivo se convierte en una deducción de papel.",
                autor: "Ricardo Mejía",
                fecha: "2026-09-09",
                votos: 173,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-002-3",
        politicaId: "pol-002",
        orden: 3,
        nombre: "Deliberación y ajuste",
        tipo: "deliberacion",
        descripcion:
          "Caballos de batalla por comuna, priorización de inversiones y ajuste del modelo de financiación con participación ciudadana.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
    ],
  },
  {
    id: "pol-003",
    slug: "transicion-energetica-barrial",
    titulo: "Transición Energética Barrial",
    resumen:
      "Eficiencia energética, generación distribuida y comfort térmico en vivienda popular, construidos barrio a barrio.",
    descripcion:
      "La política acelera la transición energética justa en los barrios populares: mejoramiento térmico de viviendas, paneles solares comunitarios, cocinas limpias y movilidad eléctrica de proximidad. Combina subsidios cruzados, mano de obra local certificada y comunidades energéticas que generan, administran y reinvierten su propia energía.",
    problema:
      "El 34% del consumo eléctrico residencial de estratos 1-3 se destina a compensar comfort térmico deficiente. Las facturas de energía absorbieron un aumento real del 28% en dos años, y solo el 3% de las viviendas populares tiene cubiertas térmicamente adecuadas.",
    sector: "ambiente",
    estado: "consulta_publica",
    cobertura: "18 barrios de estratos 1-3 en ladera y periferia",
    fechaInicio: "2026-09-15",
    fechaCierre: "2026-11-30",
    participantes: 1189,
    fases: [
      {
        id: "fase-003-1",
        politicaId: "pol-003",
        orden: 1,
        nombre: "Diagnóstico energético barrial",
        tipo: "diagnostico",
        descripcion:
          "Termografías comunitarias, encuestas de carga energética por hogar y mapeo de potencial solar de cubiertas con participación de jóvenes del barrio.",
        estado: "activa",
        progreso: 30,
        lineas: [
          {
            id: "lin-003-1-1",
            faseId: "fase-003-1",
            codigo: "LE-01",
            titulo: "Comfort térmico y calidad de la envolvente",
            descripcion:
              "Levantamiento de condiciones térmicas intra-domiciliarias y priorización de viviendas para mejoramiento de cubierta y ventilación.",
            aportes: [
              {
                id: "apo-003-1-1-1",
                lineaId: "lin-003-1-1",
                tipo: "propuesta",
                titulo: "Capacitar a mano de obra local en mejoramiento térmico",
                contenido:
                  "Cada barrio tiene maestros de obra que conocen las cubiertas de sus vecinos. Propongo que el diagnóstico incluya un censo de esta mano de obra y un itinerario de certificación en protocolos de confort térmico. Así la política deja empleo y capacidad instalada, no solo obras terminadas por contratistas externos.",
                autor: "Óscar Muñoz",
                fecha: "2026-09-22",
                votos: 214,
                apoyado: false,
              },
              {
                id: "apo-003-1-1-2",
                lineaId: "lin-003-1-1",
                tipo: "anotacion",
                titulo: "Zinc sin aislamiento: el horno de las cubiertas",
                contenido:
                  "Las termografías preliminares ya lo muestran: interiores hasta 41°C en tardes soleadas bajo cubierta de zinc sin aislamiento. No hay estrategia de cocinas limpias ni ventilación que compense una envolvente así. El mejoramiento de cubierta debe ser la primera intervención, no la última.",
                autor: "Diana Carvajal",
                fecha: "2026-09-24",
                votos: 189,
                apoyado: true,
              },
            ],
          },
          {
            id: "lin-003-1-2",
            faseId: "fase-003-1",
            codigo: "LE-02",
            titulo: "Potencial solar comunitario",
            descripcion:
              "Inventario de cubiertas aptas para generación distribuida y modelación de comunidades energéticas por barrio.",
            aportes: [
              {
                id: "apo-003-1-2-1",
                lineaId: "lin-003-1-2",
                tipo: "pregunta",
                titulo: "¿Las comunidades energéticas podrán vender excedentes?",
                contenido:
                  "La regulación actual permite compensación neta pero no venta de excedentes entre vecinos. Si la política no incluye cabildeo regulatorio departamental y nacional, las comunidades energéticas serán jardines decorativos. ¿Está previsto ese componente?",
                autor: "Alejandro Vélez",
                fecha: "2026-09-25",
                votos: 142,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-003-2",
        politicaId: "pol-003",
        orden: 2,
        nombre: "Formulación de soluciones",
        tipo: "formulacion",
        descripcion:
          "Diseño de paquetes de intervención, esquemas de subsidio y gobernanza de las comunidades energéticas.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
      {
        id: "fase-003-3",
        politicaId: "pol-003",
        orden: 3,
        nombre: "Validación comunitaria",
        tipo: "validacion",
        descripcion:
          "Asambleas barriales para validar paquetes de intervención y cronograma de ejecución.",
        estado: "proxima",
        progreso: 0,
        lineas: [],
      },
    ],
  },
  {
    id: "pol-004",
    slug: "territorios-lectores",
    titulo: "Territorios Lectores: Plan de Lectura y Oralidad",
    resumen:
      "Ecosistema distrital de lectura, escritura y oralidad con bibliotecas de barrio como centros de vida comunitaria.",
    descripcion:
      "El plan convierte la red de bibliotecas y paraderos lectores en infraestructura de ciudadanía cultural: clubes de lectura intergeneracionales, mediaciones barriales,(editor) radios escolares y archivo de memoria oral de los barrios. Con foco en primera infancia y personas mayores, articula sistema educativo, cultura y organizaciones comunitarias.",
    problema:
      "El 62% de los hogares no tiene más de 10 libros en casa y solo el 21% de las personas jóvenes leyó un libro completo en el último año. La oferta de mediación de lectura se concentra en 4 comunas.",
    sector: "educacion",
    estado: "en_revision",
    cobertura: "Distrital, con foco en 9 comunas",
    fechaInicio: "2026-05-04",
    fechaCierre: "2026-08-20",
    participantes: 2744,
    fases: [
      {
        id: "fase-004-1",
        politicaId: "pol-004",
        orden: 1,
        nombre: "Diagnóstico lector territorial",
        tipo: "diagnostico",
        descripcion:
          "Medición de prácticas lectoras por barrio, inventario de infraestructura y mapeo de mediadores comunitarios.",
        estado: "completada",
        progreso: 100,
        lineas: [
          {
            id: "lin-004-1-1",
            faseId: "fase-004-1",
            codigo: "LE-01",
            titulo: "Prácticas lectoras y brechas territoriales",
            descripcion:
              "Estudio de hábitos de lectura por ciclo vital y análisis de la distribución territorial de equipamientos.",
            aportes: [
              {
                id: "apo-004-1-1-1",
                lineaId: "lin-004-1-1",
                tipo: "anotacion",
                titulo: "Los paraderos lectores están abandonados",
                contenido:
                  "El inventario cuenta 46 paraderos lectores, pero una inspección rápida muestra que 31 tienen vidrios rotos, material vencido o están cerrados. Diagnosticar infraestructura sin estado de operación es maquillar el mapa. Propongo que el plan incluya un presupuesto explícito de reposición anual.",
                autor: "Camilo Torres",
                fecha: "2026-05-18",
                votos: 231,
                apoyado: false,
              },
            ],
          },
        ],
      },
      {
        id: "fase-004-2",
        politicaId: "pol-004",
        orden: 2,
        nombre: "Formulación del plan",
        tipo: "formulacion",
        descripcion:
          "Definición de programas, alianzas institucionales y presupuesto participativo del plan lector.",
        estado: "completada",
        progreso: 100,
        lineas: [
          {
            id: "lin-004-2-1",
            faseId: "fase-004-2",
            codigo: "LE-01",
            titulo: "Bibliotecas como centros de vida barrial",
            descripcion:
              "Ampliación de horarios, programación nocturna y alianzas con comercios del entorno para activar los entornos lectores.",
            aportes: [
              {
                id: "apo-004-2-1-1",
                lineaId: "lin-004-2-1",
                tipo: "propuesta",
                titulo: "Biblioteca abierta hasta las 21 h con mediadores jóvenes",
                contenido:
                  "Propongo ampliar el horario de las 6 bibliotecas de comuna hasta las 21:00 horas, operadas con mediadores jóvenes contratados del mismo barrio bajo figura de aprendizaje. La noche es el único tiempo libre real de muchas personas jóvenes que trabajan, y hoy las bibliotecas cierran a las 17:00.",
                autor: "Juliana Saldarriaga",
                fecha: "2026-06-14",
                votos: 389,
                apoyado: true,
              },
            ],
          },
        ],
      },
      {
        id: "fase-004-3",
        politicaId: "pol-004",
        orden: 3,
        nombre: "Revisión técnica y jurídica",
        tipo: "validacion",
        descripcion:
          "Revisión del documento por dependencias, concepto de viabilidad y consolidación de observaciones.",
        estado: "activa",
        progreso: 55,
        lineas: [],
      },
    ],
  },
  {
    id: "pol-005",
    slug: "vivienda-persistente",
    titulo: "Rehabilitación de Vivienda Persistente",
    resumen:
      "Mejoramiento progresivo de vivienda autoconstruida y legalización de barrios, con asistencia técnica de barrio.",
    descripcion:
      "La política sustituye la lógica de reubicación masiva por rehabilitación in situ: mejoramiento progresivo de vivienda persistente, estructuración de taludes, legalización predial y asistencia técnica permanente a través de las Oficinas de Barrio. Prioriza hogares en riesgo alto con soluciones habitacionales dentro de su tejido social.",
    problema:
      "41.200 viviendas presentan riesgo estructural o de origen informal sin perspectiva de titulación. La respuesta histórica ha sido la reubicación, que rompe redes comunitarias y económicas y ha mostrado retornos informales del 30%.",
    sector: "vivienda",
    estado: "implementacion",
    cobertura: "22 barrios en ladera y 5 sectores de ribera",
    fechaInicio: "2026-01-20",
    fechaCierre: "2029-12-31",
    participantes: 5932,
    fases: [
      {
        id: "fase-005-1",
        politicaId: "pol-005",
        orden: 1,
        nombre: "Caracterización sociohabitacional",
        tipo: "diagnostico",
        descripcion:
          "Censo predial barrial, evaluación de riesgo estructural y mapeo de redes comunitarias de los 27 sectores priorizados.",
        estado: "completada",
        progreso: 100,
        lineas: [],
      },
      {
        id: "fase-005-2",
        politicaId: "pol-005",
        orden: 2,
        nombre: "Ejecución de mejoramientos",
        tipo: "implementacion",
        descripcion:
          "Ejecución de obras de mejoramiento progresivo, estabilización de taludes y adecuación de redes con cuadrillas de barrio.",
        estado: "activa",
        progreso: 38,
        lineas: [
          {
            id: "lin-005-2-1",
            faseId: "fase-005-2",
            codigo: "LE-01",
            titulo: "Oficinas de Barrio: asistencia técnica permanente",
            descripcion:
              "Puntos de atención territorial con arquitectos e ingenieros de planta para acompañar el mejoramiento autogestionado.",
            aportes: [
              {
                id: "apo-005-2-1-1",
                lineaId: "lin-005-2-1",
                tipo: "anotacion",
                titulo: "Las Oficinas de Barrio funcionan, pero sin potestad",
                contenido:
                  "La Oficina del barrio 14 lleva 8 meses atendiendo, pero cada concepto técnico de los vecinos requiere luego trámite central: eso demora el mejoramiento 4 meses en promedio. Sugiero documentar este cuello de botella en el siguiente informe de implementación y proponer delegación territorial.",
                autor: "Esperanza Gil",
                fecha: "2026-08-30",
                votos: 156,
                apoyado: false,
              },
            ],
          },
        ],
      },
    ],
  },
];
