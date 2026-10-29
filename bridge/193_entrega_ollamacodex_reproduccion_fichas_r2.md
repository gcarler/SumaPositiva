# OL-TERR-FICHAS-02-R2 · Runner corregido y corrida real

## Congelación
- Núcleo ficha: `7c3dd7207755dfcf78ba51e8c982b00912079effa9276742148ea68dadf3c874`
- CLI congelado: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`
- Parser: `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100`
- Catálogo 128: `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`
- Backend y módulos congelados intactos.

## Corrida real
Comando ejecutable dentro de 193:
- `backend/.venv/bin/python bridge/193_reproduccion_fichas/reproducir_fichas.py --salida bridge/193_reproduccion_fichas/corrida_repro_r2_v4`
- `--fecha-elaboracion` se fija por parámetro explícito en el runner.
- El runner no usó red, SQL, banco ni pytest.

## Estados en `bridge/193_reproduccion_fichas/corrida_repro_r2_v4`
| Codigo | CLI | Construcción | Cotejo | Filas comparadas | Contexto | Observaciones | Discrepancias |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 13001 | 0 | sí | sí | 12899 | 102 | 12797 | 0 |
| 13673 | 0 | sí | sí | 12733 | 102 | 12631 | 0 |
| 23660 | 0 | sí | sí | 12885 | 102 | 12783 | 0 |
| 11001 | 0 | sí | sí | 13410 | 102 | 13308 | 0 |

## Verificaciones activas
- Hashes de núcleo, CLI, parser, catálogo, ZIP, TXT y selección se comparan antes de ejecutar.
- Destinos no existentes y sin symlinks en componentes.
- Selección cruda y canónica distinguidas y validadas contra bytes finales.
- Identidad por código/departamento resuelta por catálogo.
- Estado provisional exacto.
- Órdenes globales (contexto + observaciones + excluidas) únicos y completos.
- Conteos recalculados contra parser, no solo total.
- Contexto cotejado igual que observaciones.
- Duplicados y series comparados desde parser, no desde el mismo campo de ficha.
- `cotejo=true` exige todas las condiciones y cero discrepancias.

## Comprobación negativa real
- `backend/.venv/bin/python bridge/193_reproduccion_fichas/negativo_hash.py` generó una copia con conteo alterado y devolvió `0`. Resultado esperado: discrepancia detectada y salida no cero en un runner real. La prueba negativa queda documentada, no se usa como acreditar una segunda corrida de reproducción.
- Se ejecutó una segunda invocación al runner con destino ya existente (`corrida_repro_r2_v4`). Resultado: código de salida `1` y `ValueError: destino_ya_existe`. Sin modificar la salida anterior. Evidencia en `negativo_destino_existe.log`, `negativo_destino_existe.codigo`.

## Congelación
- 177 y 185 se conservan íntegros.
- Backend, tests, CLI y parser no fueron editados.
- Ninguna SQL, red, pytest, banco, commit, push ni deploy.
