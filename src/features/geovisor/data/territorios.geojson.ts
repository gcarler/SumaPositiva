export const GEOJSON_TERRITORIOS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "loc-1", nombre: "Localidad 1 — Histórica y del Caribe Norte" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-75.573, 10.389],
            [-75.545, 10.389],
            [-75.513, 10.407],
            [-75.49, 10.44],
            [-75.5, 10.46],
            [-75.53, 10.455],
            [-75.56, 10.44],
            [-75.58, 10.415],
            [-75.573, 10.389],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "loc-2", nombre: "Localidad 2 — De la Virgen y Turística" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-75.49, 10.44],
            [-75.46, 10.44],
            [-75.43, 10.455],
            [-75.42, 10.485],
            [-75.435, 10.51],
            [-75.47, 10.51],
            [-75.5, 10.49],
            [-75.51, 10.465],
            [-75.49, 10.44],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "loc-3", nombre: "Localidad 3 — Industrial y de la Bahía" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-75.573, 10.389],
            [-75.56, 10.34],
            [-75.54, 10.3],
            [-75.51, 10.28],
            [-75.48, 10.295],
            [-75.465, 10.33],
            [-75.475, 10.37],
            [-75.5, 10.39],
            [-75.53, 10.395],
            [-75.573, 10.389],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "rural-insular", nombre: "Zona Corregimental e Insular" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-75.575, 10.473],
              [-75.558, 10.468],
              [-75.548, 10.483],
              [-75.558, 10.495],
              [-75.575, 10.49],
              [-75.575, 10.473],
            ],
          ],
          [
            [
              [-75.6, 10.33],
              [-75.585, 10.32],
              [-75.572, 10.335],
              [-75.58, 10.35],
              [-75.6, 10.345],
              [-75.6, 10.33],
            ],
          ],
        ],
      },
    },
  ],
} as const;
