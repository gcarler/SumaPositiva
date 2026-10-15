# ORDEN MAESTRA CONJUNTA `[MESAS-15-CORREGIMIENTOS-12]`
## Rediseño de las Mesas `RURAL_INSULAR` a los 15 Corregimientos Oficiales de Cartagena (Total: 37 Mesas Oficiales)

- **Coordinador General y Auditor Forense (EAF):** `agy`
- **Agentes ejecutores:**
  - `codex` (Desarrollador Principal Backend / PostGIS / Econometría) → `bridge/01_tarea_codex.md`
  - `agy2` (Desarrollador Principal Frontend Next.js 16 / React 19 / TypeScript) → `bridge/01_tarea_activa.md`
- **Fecha:** 2026-10-15
- **Estado:** DESPACHADA EN PARALELO

---

## 1. Decisión del Usuario y Alcance Institucional

El usuario ordenó rediseñar las mesas rurales e insulares para contar con **una mesa por cada uno de los 15 corregimientos oficiales de Cartagena**, manteniendo además las 3 de Localidad, 8 Poblacionales y 11 Sectoriales:

| Categoría (`tipo_mesa` / `tipo`) | Antes | Ahora (`[MESAS-15-CORREGIMIENTOS-12]`) | Detalle |
|---|---:|---:|---|
| **`TERRITORIAL` (`territorial`)** | 3 | **3** | `MT-L01-01` (`mt-001`), `MT-L02-01` (`mt-002`), `MT-L03-01` (`mt-003`) + Plenaria `pc-001` (`mesa_id = NULL` en `agendas`) |
| **`RURAL_INSULAR` (`rural_insular`)** | 11 | **15** | **1 Mesa y 1 Agenda (`mr-001` a `mr-015`) por cada uno de los 15 Corregimientos Oficiales de Cartagena** (eliminando el duplicado `mr-007b` que ahora queda integrado en `mr-012` Barú con su protocolo de Consulta Previa SU-123/18) |
| **`POBLACIONAL` (`poblacional`)** | 8 | **8** | `MP-POB-01` a `MP-POB-07`, `MP-ETN-08` (`mp-001` a `mp-008`) |
| **`SECTORIAL` (`sectorial`)** | 11 | **11** | `MS-SEC-01` a `MS-SEC-11` (`ms-001` a `ms-011`) |
| **Total Mesas Canónicas (`mesas_trabajo.mesas`)** | 33 | **37** | Relación estrictamente 1:1 con las 37 agendas de mesas (`mt-001..003`, `mr-001..015`, `mp-001..008`, `ms-001..011`) |
| **Total Agendas (`mesas_trabajo.agendas`)** | 36 | **38** | **37 agendas con `mesa_id` 1:1** + **1 Plenaria de Cierre (`pc-001`, `mesa_id = NULL`)** |

---

## 2. Catálogo Canónico de las 15 Mesas de Corregimientos (`MR-01` a `MR-15`)

### 2.1 Las 11 Mesas existentes en `mesas_trabajo.mesas` (`mr-001` a `mr-011`)
1. **`mr-001` ↔ `MR-RUR-01` (`MR101`)** — UUID: `01a0f5fe-86e2-7b56-b70b-aa6b3c6feb08` — **Corregimiento La Boquilla** (Localidad 2)
2. **`mr-002` ↔ `MR-RUR-02` (`MR102`)** — UUID: `01a0f5fe-86e2-7eb8-85f0-7f8edbd8d441` — **Corregimiento Arroyo de Piedra** (Localidad 2)
3. **`mr-003` ↔ `MR-RUR-03` (`MR103`)** — UUID: `01a0f5fe-86e2-7b3a-99ca-973a388ae602` — **Corregimiento Punta Canoa** (Localidad 2)
4. **`mr-004` ↔ `MR-RUR-04` (`MR104`)** — UUID: `01a0f5fe-86e2-76ca-8fb4-8c2403144877` — **Corregimiento Bayunca** (Localidad 2)
5. **`mr-005` ↔ `MR-RUR-05` (`MR105`)** — UUID: `01a0f5fe-86e2-71eb-98b5-16f61f5a3b80` — **Corregimiento Pasacaballos** (Localidad 3)
6. **`mr-006` ↔ `MR-RUR-06` (`MR106`)** — UUID: `01a0f5fe-86e2-7e7d-b043-8b61c7c913e0` — **Corregimiento Arroyo Grande** (Localidad 2)
7. **`mr-007` ↔ `MR-ISL-07` (`MR107`)** — UUID: `01a0f5fe-86e2-7ebb-90f1-7268653ea79d` — **Corregimiento Santa Ana** (Isla de Barú, Localidad 1)
8. **`mr-008` ↔ `MR-ISL-08` (`MR108`)** — UUID: `01a0f5fe-86e2-77ec-aa3f-d52f9fbb8125` — **Corregimiento Tierra Bomba** (Isla de Tierra Bomba, Localidad 1)
9. **`mr-009` ↔ `MR-ISL-09` (`MR109`)** — UUID: `01a0f5fe-86e2-70f0-84de-854dae52dc89` — **Corregimiento Bocachica** (Isla de Tierra Bomba, Localidad 1)
10. **`mr-010` ↔ `MR-ISL-10` (`MR110`)** — UUID: `01a0f5fe-86e2-7c68-a9f7-4ecbfa5236b5` — **Corregimiento Islas del Rosario** (Archipiélago Nuestra Señora del Rosario y San Bernardo, Localidad 1)
11. **`mr-011` ↔ `MR-ISL-11` (`MR111`)** — UUID: `01a0f5fe-86e3-7288-8425-1317a98eebd4` — **Corregimiento Isla Fuerte** (Zona Insular, Localidad 1)

### 2.2 Las 4 Nuevas Mesas Canónicas (`mr-012` a `mr-015`) con UUIDs Determinísticos

| Agenda ID | Código Oficial | Shortcode | UUID Determinístico (`mesas_trabajo.mesas.id`) | Ruta Jerárquica (`ltree`) | Slug | Nombre Mesa (`mesas.nombre`) | Nombre Agenda (`agendas.nombre`) | Territorio (`agendas.territorio`) | `territorio_id` (`geodatos.territorios`) | Lugar (`lugar_nombre` / `lugar`) | Fecha (`agendas.fecha`) | Hora (`hora_inicio` - `hora_fin`) | Coordenadas (`lat`, `lng`) | `dimension_id` principal |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **`mr-012`** | **`MR-ISL-12`** | **`MR112`** | `01a0f5fe-86e3-7312-9001-000000000012` | `csh.mr.baru` | `mesa-corregimiento-baru` | `Mesa Insular Barú (Pueblo)` | `Mesa Insular — Barú` | `Corregimiento de Barú` | `01a0f5dd-5393-77af-b2f5-96ea12961d85` (`INS-BARU`) | `Institución Educativa Luis Felipe Cabrera de Barú` | `2026-10-24` | `08:30` – `11:30` | `10.1456`, `-75.6761` | `01a0f5dd-532e-711b-9323-99a7ec277282` (`ambiental`) |
| **`mr-013`** | **`MR-ISL-13`** | **`MR113`** | `01a0f5fe-86e3-7313-9001-000000000013` | `csh.mr.ararca` | `mesa-corregimiento-ararca` | `Mesa Insular Ararca (Barú)` | `Mesa Insular — Ararca` | `Corregimiento de Ararca` | `01a0f5dd-5393-77af-b2f5-96ea12961d85` (`INS-BARU`) | `Institución Educativa de Ararca` | `2026-10-24` | `13:30` – `16:30` | `10.2730`, `-75.5240` | `01a0f5dd-532e-7a59-8f56-f5dbba0cae99` (`comunitaria`) |
| **`mr-014`** | **`MR-ISL-14`** | **`MR114`** | `01a0f5fe-86e3-7314-9001-000000000014` | `csh.mr.canodeloro` | `mesa-cano-del-oro` | `Mesa Insular Caño del Oro` | `Mesa Insular — Caño del Oro` | `Corregimiento Caño del Oro` | `01a0f5dd-5393-7f9a-ad8d-7c466f379695` (`INS-TIERRABOMBA`) | `Institución Educativa Caño del Oro` | `2026-10-25` | `08:30` – `11:30` | `10.3420`, `-75.5410` | `01a0f5dd-532e-7910-8a72-9b61f5ad2a24` (`salud`) |
| **`mr-015`** | **`MR-RUR-15`** | **`MR115`** | `01a0f5fe-86e3-7315-9001-000000000015` | `csh.mr.pontezuela` | `mesa-pontezuela` | `Mesa Rural Pontezuela` | `Mesa Rural — Pontezuela` | `Corregimiento de Pontezuela` | `01a0f5dd-5391-760c-96f0-d919dd88e7c6` (`LOC-2`) | `Institución Educativa de Pontezuela` | `2026-10-25` | `13:30` – `16:30` | `10.5250`, `-75.4020` | `01a0f5dd-532e-7906-90af-31d884eba586` (`alimentaria`) |

> **Consolidación de `mr-007b` en `mr-012`:**
> Antes existían `mr-007b` ("Mesa Insular — Barú y Comunidades del Archipiélago") y `mr-012` ("Mesa Rural e Insular — Barú"), ambas apuntando al UUID de `MR-ISL-07` (Santa Ana).
> Ahora **`mr-007b` se elimina** y toda su riqueza jurídica y comunitaria (Consejo Comunitario de Barú, Consulta Previa Convenio 169 OIT y Sentencia SU-123/18) queda integrada en **`mr-012` (`MR-ISL-12` — Corregimiento de Barú)**, de modo que cada uno de los **15 corregimientos** tenga exactamente **1 mesa y 1 agenda (`mr-001` a `mr-015`)**.
