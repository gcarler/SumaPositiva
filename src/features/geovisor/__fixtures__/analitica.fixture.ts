import type { AnaliticaMultifuente } from "../models/analitica-multifuente";

/** Exclusivamente Storybook; el producto nunca importa este archivo. */
export const ANALITICA_DEMO: AnaliticaMultifuente = {
  "version_metodo": "polis.multifuente.descriptiva.v1",
  "consulta_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "total_observaciones": 7,
  "observaciones_excluidas": 0,
  "fuentes": [
    {
      "id": "Demostración aislada de Storybook",
      "nombre": "Demostración aislada de Storybook",
      "total": 7
    }
  ],
  "territorios": [
    {
      "id": "DEMO",
      "nombre": "Territorio ficticio",
      "total": 7
    }
  ],
  "dimensiones": [
    {
      "id": "PERS",
      "nombre": "Seguridad personal",
      "total": 7
    }
  ],
  "anios": [
    2018,
    2019,
    2020,
    2021,
    2022,
    2023,
    2024
  ],
  "cobertura_fuentes": [
    {
      "id": "Demostración aislada de Storybook",
      "nombre": "Demostración aislada de Storybook",
      "total": 7
    }
  ],
  "series": [
    {
      "id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "codigo_indicador": "DEMO_STORYBOOK",
      "nombre": "Indicador ficticio de demostración",
      "fuente": "Demostración aislada de Storybook",
      "unidad": "unidades",
      "territorio_id": "demo",
      "codigo_territorio": "DEMO",
      "territorio": "Territorio ficticio",
      "escala": "municipal",
      "dimension": "PERS",
      "subtipo": "demostracion",
      "total": 7,
      "anios": [
        2018,
        2019,
        2020,
        2021,
        2022,
        2023,
        2024
      ],
      "advertencias": [
        "Datos ficticios de historia; no representan Cartagena."
      ]
    }
  ],
  "serie": {
    "resumen": {
      "id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "codigo_indicador": "DEMO_STORYBOOK",
      "nombre": "Indicador ficticio de demostración",
      "fuente": "Demostración aislada de Storybook",
      "unidad": "unidades",
      "territorio_id": "demo",
      "codigo_territorio": "DEMO",
      "territorio": "Territorio ficticio",
      "escala": "municipal",
      "dimension": "PERS",
      "subtipo": "demostracion",
      "total": 7,
      "anios": [
        2018,
        2019,
        2020,
        2021,
        2022,
        2023,
        2024
      ],
      "advertencias": [
        "Datos ficticios de historia; no representan Cartagena."
      ]
    },
    "puntos": [
      {
        "observacion_id": "demo-2018",
        "anio": 2018,
        "valor": 12,
        "valor_original": "12",
        "periodo_desde": "2018-01-01",
        "periodo_hasta": "2018-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2019",
        "anio": 2019,
        "valor": 15,
        "valor_original": "15",
        "periodo_desde": "2019-01-01",
        "periodo_hasta": "2019-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2020",
        "anio": 2020,
        "valor": 11,
        "valor_original": "11",
        "periodo_desde": "2020-01-01",
        "periodo_hasta": "2020-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2021",
        "anio": 2021,
        "valor": 17,
        "valor_original": "17",
        "periodo_desde": "2021-01-01",
        "periodo_hasta": "2021-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2022",
        "anio": 2022,
        "valor": 13,
        "valor_original": "13",
        "periodo_desde": "2022-01-01",
        "periodo_hasta": "2022-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2023",
        "anio": 2023,
        "valor": 10,
        "valor_original": "10",
        "periodo_desde": "2023-01-01",
        "periodo_hasta": "2023-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      },
      {
        "observacion_id": "demo-2024",
        "anio": 2024,
        "valor": 8,
        "valor_original": "8",
        "periodo_desde": "2024-01-01",
        "periodo_hasta": "2024-12-31",
        "tipo_periodo": "anual",
        "completo": true,
        "provisional": false,
        "url_fuente": null,
        "sha256": null,
        "fecha_extraccion": null,
        "referencia": null,
        "nota": "Datos ficticios, exclusivamente para Storybook.",
        "estado_validacion": "demostracion",
        "estado_publicacion": "no_publicable",
        "universo": null,
        "metodo": null,
        "advertencias": [
          "Datos ficticios de historia; no representan Cartagena."
        ]
      }
    ],
    "minimo": 8,
    "maximo": 17,
    "mediana": 12,
    "variacion_interanual_pct": null,
    "motivo_variacion": "Datos ficticios sin universo acreditado."
  },
  "serie_comparada": null,
  "comparacion": null,
  "advertencias": [
    "Demostración aislada: datos ficticios, sin consultas a servicios reales."
  ]
};
