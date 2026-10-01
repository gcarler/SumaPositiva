import type { PoliticaPublica } from "@/features/politicas/models/politicas";

/**
 * Dataset mock canónico. Cuando el backend FastAPI esté listo,
 * este módulo se sustituye por respuestas de apiFetch sin tocar la UI.
 */

export const POLITICAS_MOCK: PoliticaPublica[] = [
  {
    id: "pol-001",
    slug: "seguridad-humana-cartagena",
    titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036",
    resumen:
      "Construcción participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias (Decreto Nacional 037 de 2026), articulando las 7 Dimensiones ONU y la metodología DNP con anclaje territorial.",
    descripcion:
      "La Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026–2036) adopta el paradigma multidimensional de la ONU, protegiendo las libertades fundamentales frente al miedo, la necesidad y la indignidad. Integra las 3 localidades urbanas y la zona corregimental e insular (La Boquilla, Pasacaballos, Tierrabomba, Barú, Bayunca) para transformar las causas estructurales de la violencia, la exclusión y la degradación ambiental.",
    problema:
      "Cartagena enfrenta brechas históricas de inequidad socioeconómica, altos índices de violencia interpersonal, amenazas de explotación sexual comercial de niñas, niños y adolescentes (ESCNNA) en zonas turísticas, conflictividad comunitaria y vulnerabilidad climática en la Ciénaga de la Virgen y la bahía.",
    sector: "seguridad",
    estado: "consulta_publica",
    cobertura: "Distrito de Cartagena: 3 Localidades urbanas, 11 corregimientos y zonas insulares",
    fechaInicio: "2026-02-01",
    fechaCierre: "2026-12-31",
    participantes: 8420,
    fases: [
      {
        id: "fase-001-1",
        politicaId: "pol-001",
        orden: 1,
        nombre: "Fase 1: Diagnóstico Participativo y Territorial",
        tipo: "diagnostico",
        descripcion:
          "Levantamiento de línea base, geovisor de conflictividad, alertas tempranas SAT y mesas territoriales en las 3 localidades y zona insular de Cartagena.",
        estado: "completada",
        progreso: 100,
        lineas: [
          {
            id: "lin-001-1-1",
            faseId: "fase-001-1",
            codigo: "LE-01",
            titulo: "Prevención Integral de ESCNNA y Protección de Niñez",
            descripcion:
              "Estrategias de blindaje y protección de entornos escolares, turísticos y comerciales frente a la explotación sexual y comercial en Centro Histórico y playas.",
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
];
