# OP-DANE-ADQ-01 · Entrega de anexos DANE acotados

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Adquisición pública acotada, sin modificar 165/173/app/tests/SQL/banco/diagnósticos. Fechas corregidas en 178 (12 ocurrencias). No se acreditó linaje.

## Objetivos y resultados
| Objetivo | URL publicada/solicitada | Estado | HTTP/MIME | Bytes | SHA256 | Notas |
|---|---|---|---|---|---|---|
| `PPED-AreaMun-2018-2042_VP.xlsx` | `https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx` | **descargado** | 200 / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 3,948,350 | `1ea83594ad308becff39934a3977c102919c25740f60439be95d797396d11283` | Last-Modified `Fri, 08 Aug 2025 22:00:37 GMT`. Validado con `validar_anexo_oficial` (formato xlsx, estructura_valida). |
| `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx` | `https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx` | **error** | — | — | — | Excede límite por archivo (64 MiB). Registrado, sin relajar límites. |
| `NotaTecnica-PPED-jul2025.pdf` | `https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Nacional/NotaTecnica-PPED-jul2025.pdf` | **descargado** | 200 / `application/pdf` | 855,854 | `ab71bcb2a5ee0f0fce85cd0c8740cd2dac332984c2dc2ac419a8bdc7b3c65b72` | Last-Modified `Fri, 18 Jul 2025 22:32:48 GMT`. Firma preliminar (PDF). |
| `Municipal_area_1985-2020.xls` | `https://www.dane.gov.co/files/investigaciones/poblacion/proyepobla06_20/Municipal_area_1985-2020.xls` | **descargado** | 200 / (según cabeceras) | 3,268,096 | `5d6ae35f5bbde7c0163cee10ebda344a21993ece0f9b9f66f2ff186010335e84` | Firma OLE2 `d0cf11e0...` (XLS). Lectura/validación de contenido pendiente. |

## Evidencia
- Directorio: `bridge/189_anexos_dane/` (archivos originales byte a byte + `manifiesto_lote.json`)
- Guion reproducible: `bridge/189_anexos_dane_descarga.py` (SHA256: `b684a422f1f08c0a39534dc014bf87b1f82085e55a66b9b3b4f17ee4608ca76c`)
- Manifiesto con objetivos/intentos/descargas/validaciones/error separados, cabeceras relevantes, sin cookies/credenciales.

## Validación
- TLS verificado, timeout 30s, streaming limitado (64MiB/archivo, 128MiB lote), un intento por objetivo, sin bucles.
- Host permitido `www.dane.gov.co`/`dane.gov.co`. Sin redirección insegura. Sin degradación a HTTP.
- Detección HTML/error: si respuesta es HTML se rechaza.
- Escritura exclusiva (O_EXCL). Sin sobrescritura.
- XLSX validado con función pura congelada `validar_anexo_oficial` (sin editarla). XLS/PDF: firma preliminar, sin certificar integridad completa.
- Sin ejecución de macros/herramientas, sin cotejo numérico para afirmar linaje, sin cálculo 2026/completar bases censales.

## Límites
- `PPED-AreaSexoEdadMun-2018-2042_VP.xlsx` excede 64 MiB → registrado como error, límites no relajados.
- Validación semántica pendiente. Un 200/descarga no acredita linaje.
- No se acreditó pertenencia de series TerriData a estos anexos.
