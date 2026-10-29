# Dossier cuantitativo — bloqueo de fuente compartida en `pdd_vinculos_meta_pa_triada` (24-10-2026)

**Origen:** gap B de `bridge/62` (cierre de gaps del corpus masivo). Preparado por
EDD para la **decisión de producto + dictamen independiente** de EAF sobre la
guardia `_bloquear_cifras_de_referencias_compartidas` del conciliador. Remite
datos medidos, no decisiones: la alteración de la guardia (si se hace) se
implementa solo con dictamen congelado en tests.
**Base:** `polis_test_verd_20261024` (DSN `/tmp/base_fresca.dsn`). Las mediciones
son del 24-10-2026 sobre la conciliación corregida (`bridge/60` §5).
**Nota de independencia:** EDD mide y formula opciones; la decisión de alterar
la guardia es de producto con dictamen EAF (los checks verdes no son dictamen).

## 1. Qué hace la guardia hoy

Después de insertar vínculos, la guardia anula **todas** las métricas (cifras y
ceros preservados) de los vínculos que compartan cualquiera de estas claves:

- `registro_triada_id` repetido (misma fila triada observada por varias metas),
- `actividad_pa_id` repetida,
- `codigo_bpim` + `vigencia` repetidos (misma inversión anual).

A cada vínculo anulado le agrega la bandera
`evidencia_cruce.cifras_bloqueadas_por_fuente_compartida = true`.

## 2. Estado medido tras la conciliación corregida (4.637 metas, 8 planes)

| Plan | Filas | Con cifras | Ceros preservados | Bloqueados | Huérfanos |
| --- | ---: | ---: | ---: | ---: | ---: |
| PDD_2012_2015 | 469 | 0 | 0 | 0 | 469 |
| PDD_2013_2015 | 676 | 0 | 0 | 0 | 676 |
| PDD_2016_2019 | 898 | 70 | 17 | 381 | 447 |
| PDD_2020_2023 | 947 | 205 | 69 | 483 | 259 |
| PDD_2024_2027 | 1246 | 198 | 24 | 701 | 347 |
| PDL_1_2024_2027 | 110 | 5 | 0 | 11 | 94 |
| PDL_2_2024_2027 | 89 | 1 | 0 | 6 | 82 |
| PDL_3_2024_2027 | 202 | 3 | 0 | 40 | 159 |
| **Total** | **4.637** | **482** | **110** | **1.622** | **2.533** |

## 3. Anatomía de los 1.622 bloqueados

- 1.607 tienen registro pareado (`registro_triada_id` no nulo); el resto
  descansa en actividad PA o BPIM.
- **Grupos por registro triada/PA: 457** (tamaños: mayormente 2–4 vínculos;
  296 grupos de 2, 73 de 3, 31 de 4 …; y 4 grupos anómalos de gran tamaño:
  39, 126 y 183 vínculos apuntando al mismo registro — caso a revisar por
  provenancia, ver §5).
- **Grupos por `codigo_bpim`+`vigencia`: 180** (96 de 2 vínculos; 37 de 3;
  …; 1 grupo de 39).
- 12 grupos REG/PA y 7 grupos BPIM cruzan varios planes (la misma observación
  vista desde metas de distintos planes).

## 4. Monto observationally comprometido

Sumando la apropiación del registro pareado detrás de cada vínculo bloqueado:
**64,6 billones COP brutos** — pero detrás hay solo **208 registros únicos** de
observación: el bloqueo no destruye 208 observaciones, destruye el
**acceso de más de mil metas** a observar la inversión que las financia.
(Ese es el punto de decisión: perder cobertura de mil metas para evitar
repetir 208 cantidades en reportes agregados.)

## 5. Casos que exigen revisión de provenancia antes del dictamen

- El grupo de 183 vínculos y el de 126 con el mismo registro triada no pueden
  ser emparejamiento determinista aceptable: sugiere que el motor repetía la
  misma fila triada para toda una serie de metas. Pedir a EAF/u Auditoría
  revisión de esos dos ids con su `evidencia_cruce` completa antes de decidir
  reparto: si la provenancia es legítima (inversión multicobertura), el reparto
  por grupo es viable; si no, esos grupos revelan defecto de emparejamiento.
- 12 grupos REG/PA y 7 BPIM multi-plan: la misma observación compartida entre
  planes — decide EAF si el ganador se elige entre todos los planes o por plan.

## 6. Opciones para el dictamen

1. **Mantener la guardia vigente** (anulación integral, estado actual):
   a favor — conservador contra imputación y doble conteo; en contra —
   los 1.622 vínculos quedan sin cifras ni ceros, y el reporte territorial
   pierde cobertura.
2. **Reparto acreditado:** conservar cifras en **un** vínculo por grupo
   (prioridad EXACTO > score desc > id determinista) y registrar las demás
   filas del grupo con ceros preservados + bandera heredada
   (`fuente_compartida_reparto`). Simulación sobre los datos actuales:
   457 grupos REG/PA y 180 grupos BPIM|vigencia tendrían ganador con cifras
   u observación PA posible; las demás filas del grupo pasarían a ceros.
   No reparte montos, no inventa datos: mantiene un solo vínculo por
   observación y deja trazabilidad en la evidencia.
3. **Híbrido:** reparto acreditado solo para grupos de tamaño <= 4 (los
   casos "inversión anual vista por metas hermanas") y anulación integral
   para los grupos grandes (>= 39) hasta revisar provenancia.

## 7. Preguntas concretas al dictamen EAF

1. ¿Se adopta el reparto acreditado (opción 2) o se mantiene la anulación
   integral (opción 1) o el híbrido (opción 3)?
2. De adoptarse el reparto: ¿la regla de ganador (EXACTO > score desc > id)
   es suficiente o exige EAF otra regla (p. ej., prioridad de plan canónico
   en grupos multi-plan)?
3. ¿Cómo se documenta la columna cero: `ceros_observados_preservados = true`
   en el resto del grupo o una bandera separada en `evidencia_cruce`?
4. ¿Deben ir los 2 grupos anómalos (183 y 126 vínculos) fuera del cambio
   hasta dictamen de provenancia?

**Remitente:** EDD (motor del conciliador). **Sin implementación del cambio**
en esta clasificación: solo dossier y simulación.
**Base de pruebas:** `polis_test_verd_20261024`
**Sin commit, push ni despliegue asociados a este dossier.**
