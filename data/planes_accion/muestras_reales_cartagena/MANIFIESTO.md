# Corpus oficial multiformato de Cartagena

Los libros Excel de esta carpeta son adjuntos descargados del portal oficial de la Alcaldía.
El CSV y el ZIP se derivan byte a byte de los mismos libros oficiales; no se cargaron filas inventadas.
El ZIP usa fechas internas fijas para poder reproducir su SHA-256.

| Archivo | SHA-256 | Fuente oficial |
| --- | --- | --- |
| `PA_2018_SECRETARIA_GENERAL.xlsx` | `ba4e8c47aa6d787e17c2a14477baccba7c5ae37960f002ad09d8736ea199f723` | https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2018 |
| `PA_2019_DADIS.xls` | `81481bdc2fbaeedfac7ae948b77d1ccd909b6d8379f7834c2bcaf305aec820b0` | https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2019 |
| `PA_2020_DADIS.xls` | `a5dfdea18eb8fe7d8f6ab997d23553b878ef814ef192fb737235cf3f5eb48104` | https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2020 |
| `PA_2024_DADIS.xlsx` | `407ddf0901d3c5e8edbedad11dd4ce711006aaf76364a3a78f31595edeff1a59` | https://www.cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-2024-formulado |
| `PA_2026_T2_DADIS.xlsx` | `ac69c0b105c9f88d813728efdc8479d556aceec12051d552e49e336ac7cf3dd4` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PA_2026_T2_DISTRISEGURIDAD.xlsx` | `e26f0dd0d054edc546363546a5662d46be53ca70e6cfe055c53851b7ebdb0a9d` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PA_2026_T2_HACIENDA.xlsx` | `6cb6be25970b8a852dcd99e985639398fe3a61190f557efffae66bb64342cd1b` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PA_2026_T2_INFRAESTRUCTURA.xlsx` | `06ffb3251f3f5c2e103cd6a20a6bf33db03ad06c2954834a0abe5802b19c4184` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PA_2026_T2_PLANEACION.xlsx` | `210e13947b8f5c2f1c5706a013fa3e9164186ecc1a24b435d2b1076fda90036c` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PDD_2026_T2_MATRIZ.xlsx` | `6e4f0d3b420ff779a3c377283a0834cce4bf72826de359e12159881b35f4c84b` | https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026 |
| `PA_2024_DADIS_ENERO_derivado.csv` | `9b91896256b1bd350a27528632dc212dc12768af6806c9dd275e83378fdc69bf` | Derivado de `PA_2024_DADIS.xlsx`, hoja `ENERO 2024` |
| `lote_cartagena_oficial_2018_2026.zip` | `43c0468058f38e745f74e59cd99a73e757a254ba4b787fb2b450cecd9d39158f` | ZIP determinístico de los 10 libros y el CSV |

La descarga debe conservar el SHA-256 fijado en este manifiesto. El portal puede actualizar sus adjuntos; las actualizaciones requieren revisar la fuente y fijar el nuevo hash de forma explícita.
