import type { MesaDeTrabajo } from "@/types/mesas";

/**
 * Dataset mock del Área de Trabajo — mesas públicas con papelografos.
 * Sustituido por respuestas de apiFetch cuando exista el backend FastAPI.
 */

export const MESAS_MOCK: MesaDeTrabajo[] = [
  {
    id: "mesa-001",
    nombre: "Mesa territorial de Movilidad Segura — Comuna 4",
    fecha: "2026-09-18",
    lugar: "Colegio José Acevedo y Gómez — auditorio",
    entidad: "Secretaría de Movilidad · Dirección de Convivencia Vial",
    facilitador: "Arq. Laura Restrepo",
    totalAsistentes: 47,
    estado: "en_curso",
    plenaria: {
      acuerdos:
        "La plenaria acuerda priorizar los entornos escolares como punto de partida: de los 34 siniestros reportados en el año, 19 involucran peatones menores de edad. Se decide conformar tres submesas (entornos escolares, transporte público y habitabilidad vial). Cada submesa desarrolla su papelografo y presenta conclusiones en la plenaria de cierre del 10 de octubre. Se recuerda a los facilitadores registrar las causas secundarias preguntando siempre «¿y por qué eso ocurre?».",
    },
    submesas: [
      {
        id: "sm-001-1",
        nombre: "Entornos escolares seguros",
        tema: "Rutas escolares, velocidad y señalización",
        participantes: 16,
        arbolProblemas: {
          problemaCentral:
            "Alto riesgo de atropellamiento de niños, niñas y adolescentes en las zonas escolares de la Comuna 4",
          causas: [
            {
              id: "n-001-1-c1",
              texto: "Exceso de velocidad vehicular en los accesos a los colegios",
              hijos: [
                {
                  id: "n-001-1-c1-1",
                  texto: "No hay reductores de velocidad ni radar pedagógico en la Carrera 45",
                  hijos: [],
                },
                {
                  id: "n-001-1-c1-2",
                  texto: "El diseño vial prioriza el flujo de automóviles sobre la velocidad de cruce peatonal",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-1-c2",
              texto: "Estacionamiento de vehículos sobre los andenes en las horas de salida",
              hijos: [
                {
                  id: "n-001-1-c2-1",
                  texto: "Faltan bahías de descargo escolar y vigilancia del espacio público",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-1-c3",
              texto: "Señalización vertical y semafórica insuficiente o dañada",
              hijos: [
                {
                  id: "n-001-1-c3-1",
                  texto: "Los reportes ciudadanos a la línea 767 tardan meses en resolverse",
                  hijos: [],
                },
              ],
            },
          ],
          efectos: [
            {
              id: "n-001-1-e1",
              texto: "Lesiones y muertes de menores en tránsito escolar",
              hijos: [
                {
                  id: "n-001-1-e1-1",
                  texto: "Demandas e indemnizaciones que afectan las finanzas del municipio",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-1-e2",
              texto: "Los padres abandonan los desplazamientos a pie y usan vehículo particular",
              hijos: [
                {
                  id: "n-001-1-e2-1",
                  texto: "Aumenta el congestionamiento y la contaminación en las horas pico escolares",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-1-e3",
              texto: "Percepción de inseguridad que limita la autonomía infantil y el recorrido a pie",
              hijos: [],
            },
          ],
        },
        arbolSoluciones: {
          objetivoCentral:
            "Tránsito escolar seguro y a baja velocidad en las zonas escolares de la Comuna 4",
          medios: [
            {
              id: "n-001-1-s1",
              texto: "Instalar reductores de velocidad y radar pedagógico en la Carrera 45",
              hijos: [],
            },
            {
              id: "n-001-1-s2",
              texto: "Habilitar bahías de descargo escolar con control de policía en horas de salida",
              hijos: [
                {
                  id: "n-001-1-s2-1",
                  texto: "Pacto de convivencia con comerciantes y padres sobre uso del andén",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-1-s3",
              texto: "Plan de renovación de señalización con respuesta ciudadana en máximo 15 días",
              hijos: [],
            },
          ],
          fines: [],
        },
      },
      {
        id: "sm-001-2",
        nombre: "Transporte público de calidad",
        tema: "Paradas, frecuencias y conexiones",
        participantes: 14,
        arbolProblemas: {
          problemaCentral:
            "Las rutas del sistema conectan mal los barrios periféricos con los polos de empleo y estudio",
          causas: [
            {
              id: "n-001-2-c1",
              texto: "Frecuencias mayores a 25 minutos en horas valle en el corredor norte",
              hijos: [
                {
                  id: "n-001-2-c1-1",
                  texto: "La flota asignada no se ajusta a la demanda real de fines de semana",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-001-2-c2",
              texto: "Paradas sin abrigo, iluminación ni información de tiempos de espera",
              hijos: [],
            },
          ],
          efectos: [
            {
              id: "n-001-2-e1",
              texto: "Tiempo de viaje total que duplica el del vehículo particular",
              hijos: [],
            },
          ],
        },
        arbolSoluciones: {
          objetivoCentral: "",
          medios: [],
          fines: [],
        },
      },
      {
        id: "sm-001-3",
        nombre: "Habitabilidad vial",
        tema: "Andenes, peatones y comercio en espacio público",
        participantes: 17,
        arbolProblemas: {
          problemaCentral: "",
          causas: [],
          efectos: [],
        },
        arbolSoluciones: {
          objetivoCentral: "",
          medios: [],
          fines: [],
        },
      },
    ],
  },
  {
    id: "mesa-002",
    nombre: "Mesa comunitaria del Sistema Distrital de Cuidados",
    fecha: "2026-09-25",
    lugar: "Casa de la Cultura — Localidad Los Álamos",
    entidad: "Secretaría de las Mujeres · Equipo Distrital de Cuidados",
    facilitador: "Soc. Ana María Ortiz",
    totalAsistentes: 63,
    estado: "en_curso",
    plenaria: {
      acuerdos:
        "Participan 63 personas: 41 mujeres cuidadoras, 12 líderes comunitarios y 10 funcionarios de mesa. La plenaria identifica que la sobrecarga de cuidado es el eje común y organiza dos submesas: corresponsabilidad en los hogares y economía del cuidado. Se acuerda levantar el papelografo con el método de pregunta encadenada y validar los árboles en la plenaria de cierre.",
    },
    submesas: [
      {
        id: "sm-002-1",
        nombre: "Corresponsabilidad del cuidado en los hogares",
        tema: "División sexual del trabajo y tiempo propio",
        participantes: 22,
        arbolProblemas: {
          problemaCentral:
            "El trabajo de cuidado recae de forma desproporcionada en las mujeres de la localidad",
          causas: [
            {
              id: "n-002-1-c1",
              texto: "División sexual del trabajo arraigada culturalmente",
              hijos: [
                {
                  id: "n-002-1-c1-1",
                  texto: "Socialización de género que asigna el hogar a las niñas desde la infancia",
                  hijos: [],
                },
                {
                  id: "n-002-1-c1-2",
                  texto: "Publicidad y relatos familiares que refuerzan el rol de cuidadora única",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-002-1-c2",
              texto: "Oferta pública de servicios de cuidado insuficiente",
              hijos: [
                {
                  id: "n-002-1-c2-1",
                  texto: "Solo un jardín público por cada tres barrios de la localidad",
                  hijos: [],
                },
                {
                  id: "n-002-1-c2-2",
                  texto: "Horarios de servicios incompatible con las jornadas laborales",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-002-1-c3",
              texto: "Jornadas laborales extensas y sin flexibilidad para quienes cuidan",
              hijos: [
                {
                  id: "n-002-1-c3-1",
                  texto: "Alta informalidad laboral sin licencias ni protecciones",
                  hijos: [],
                },
              ],
            },
          ],
          efectos: [
            {
              id: "n-002-1-e1",
              texto: "Menor participación laboral, educativa y política de las mujeres",
              hijos: [
                {
                  id: "n-002-1-e1-1",
                  texto: "Brecha salarial y pensional que se hereda entre generaciones",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-002-1-e2",
              texto: "Sobrecarga y afectaciones a la salud física y mental de las cuidadoras",
              hijos: [
                {
                  id: "n-002-1-e2-1",
                  texto: "Estresores crónicos no reconocidos ni tratados por el sistema de salud",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-002-1-e3",
              texto: "Las niñas asumen tareas de cuidado de hermanos menores",
              hijos: [
                {
                  id: "n-002-1-e3-1",
                  texto: "Deserción escolar femenina en la secundaria",
                  hijos: [],
                },
              ],
            },
          ],
        },
        arbolSoluciones: {
          objetivoCentral:
            "Distribución equitativa del trabajo de cuidado entre hogares, Estado, mercado y comunidad",
          medios: [
            {
              id: "n-002-1-s1",
              texto: "Escuelas familiares de corresponsabilidad con participación de los hombres del barrio",
              hijos: [],
            },
            {
              id: "n-002-1-s2",
              texto: "Ampliar la oferta pública: un bloque de cuidados por comuna con horario extendido",
              hijos: [
                {
                  id: "n-002-1-s2-1",
                  texto: "Convenios con empresas locales para patrocinar cupos sin sobrecosto a las familias",
                  hijos: [],
                },
              ],
            },
            {
              id: "n-002-1-s3",
              texto: "Campaña territorial contra la socialización diferenciada de las labores de hogar",
              hijos: [],
            },
          ],
          fines: [
            {
              id: "n-002-1-f1",
              texto: "Más tiempo propio y oportunidades educativas y laborales para las mujeres",
              hijos: [],
            },
          ],
        },
      },
      {
        id: "sm-002-2",
        nombre: "Economía del cuidado y servicios públicos",
        tema: "Empleo, financiamiento y infraestructura de cuidados",
        participantes: 19,
        arbolProblemas: {
          problemaCentral:
            "La infraestructura y el financiamiento público de los cuidados no cubren la demanda de la localidad",
          causas: [
            {
              id: "n-002-2-c1",
              texto: "El presupuesto distrital no prioriza la inversión en bloques de cuidados",
              hijos: [],
            },
            {
              id: "n-002-2-c2",
              texto: "El trabajo doméstico remunerado carece de formalización y protección social",
              hijos: [
                {
                  id: "n-002-2-c2-1",
                  texto: "Ninguna trabajadora de casa del barrio cotiza pensión ni salud de forma completa",
                  hijos: [],
                },
              ],
            },
          ],
          efectos: [],
        },
        arbolSoluciones: {
          objetivoCentral: "",
          medios: [],
          fines: [],
        },
      },
    ],
  },
  {
    id: "mesa-003",
    nombre: "Mesa de diagnóstico — Espacios públicos seguros para las mujeres",
    fecha: "2026-10-08",
    lugar: "Casa de la Juventud — sala plural",
    entidad: "Secretaría de Seguridad, Convivencia y Justicia",
    facilitador: "T.S. Daniela Villegas",
    totalAsistentes: 38,
    estado: "programada",
    plenaria: {
      acuerdos:
        "Mesa programada con participación confirmada de juntas de acción comunal, la policía de barrio y el equipo de mujeres rurales. La plenaria de apertura definirá las submesas según los puntos críticos que se identifiquen en el mapeo inicial. El facilitador debe llevar papelógrafos impresos, tarjetas adhesivas y marcadores para cada grupo.",
    },
    submesas: [],
  },
];
