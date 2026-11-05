# Cruce inicial de planes de desarrollo y resultados oficiales de Cartagena

**Corte:** 21-10-2026. **Propósito:** situar los resultados oficiales frente a los periodos de los PDD estructurados en `data/planes_desarrollo/`. Esta tabla muestra simultaneidad temporal, **no demuestra aporte causal**. Los PDL 2024–2027 requieren indicadores y exposiciones de sus localidades: las series municipales siguientes no permiten compararlos.

| Periodo PDD | Desocupación Cartagena, cierre oct–dic (%) | Homicidios Medicina Legal (casos) | Pobreza monetaria (%) | Lectura |
| --- | ---: | ---: | ---: | --- |
| 2012–2015; incluye dos PDD sucesivos | 8,77 (2012) → 7,73 (2015) | 290 (2015; no hay 2012 en esta fuente) | Sin serie cargada | No separar aportes de los dos PDD con una serie agregada. |
| 2016–2019 | 8,46 (2016) → 5,80 (2019) | 258 (2016) → 197 (2019) | Sin serie cargada | Cambios observados; no hay contrafactual ni traza de producto entregado. |
| 2020–2023 | 10,33 (2020) → 11,17 (2023) | 233 (2020) → 427 (2023) | 42,8 (2023) | El inicio coincide con la pandemia; comparar solo extremos induce sesgo. |
| 2024–2027, en curso | 10,94 (2024) → 14,14 (2025) | 411 (2024); 2025 sin dato cargado de esta fuente | 41,1 (2024) → 34,6 (2025) | Periodo incompleto; 2026 solo tiene corte móvil junio–agosto. |

**Procedencia:** [anexo GEIH agosto 2026](https://www.dane.gov.co/files/operaciones/GEIH/anex-GEIH-ago2026.xlsx), [Medicina Legal, presuntos homicidios definitivos](https://www.datos.gov.co/Justicia-y-Derecho/Presuntos-Homicidios-Colombia-2015-a-2024-Cifras-d/vtub-3de2) y [DANE, pobreza monetaria 2025](https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf). Los valores se consultaron en `cartagena_seguridad_humana.sqlite`; el catálogo conserva extracción y SHA-256. El cierre oct–dic es un trimestre móvil, no un promedio anual. Medicina Legal, Policía y Fiscalía no deben sumarse como si registraran el mismo universo.

## Datos que faltan para responder qué PDD aportó más

1. Una tabla verificable por meta y proyecto: plan, línea, dimensión, producto, responsable, territorio real, presupuesto apropiado/obligado/pagado, fecha de entrega y población expuesta. El texto del PDD y la programación de un PA no acreditan una entrega.
2. Una definición estable de resultado por dimensión y periodo, con fuente y denominador. El banco ya cubre parcialmente seguridad personal, economía, ambiente, salud y convivencia; aún no ofrece siete series de resultado comparables por plan. En seguridad política y alertas tempranas el vacío es mayor.
3. Una estrategia de atribución: desfases entre entrega y resultado, controles externos, comparadores territoriales, cambios de denuncia y rupturas metodológicas. Sin ella solo cabe hablar de asociación temporal.
4. Para la comparación financiera, gasto ejecutado y trazado a la misma meta/dimensión, en pesos comparables, con regla de asignación que evite contar dos veces proyectos transversales. Un ranking que sume presupuestos brutos de las siete dimensiones sesgaría el resultado.

**Estado:** cruce descriptivo listo para gráficos de tendencia municipales. Ranking de contribución de PDD y PDL, ranking financiero y mapas de casos por UCG: **pendientes de evidencia de ejecución, geografía oficial y acceso al GeoJSON multifuente**.
