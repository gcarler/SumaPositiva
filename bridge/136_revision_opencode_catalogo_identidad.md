# OP-ID-QA-01 · Auditoría acotada del catálogo de identidad 128

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Tarea acotada; 72 permanece congelado. No se interfiere con Freebuff (resolver133) ni Ollamacodex (ficha131).

## Alcance y límites
- Solo lectura de archivos indexados en `128_entrega_freebuff_identidad_territorial.md` / `manifiesto_entrega_128.json` / `130_cotejo_catalogo_identidad.json`. 
- No se ejecutó aplicación, CLI, SQL, red, pruebas. Cotejos estáticos de JSON/hashes/conteos locales.
- No se acreditó vigencia 2026 completa. No se dictaminó EAF.
- Centros Poblados (capa 305) **no consultada** (declarado en manifiesto).

## 1) Integridad de archivos indexados
**20 archivos indexados** en `manifiesto_entrega_128.json`. **Todos verificados con SHA-256 coincidentes**.

| Archivo | SHA-256 (manifiesto) | Estado |
|---|---|---|
| `atributos_crudos_verificacion.json` | `abc0c207...bccf3a0` | OK |
| `catalogo_identidad_territorial.json` | `82a58e467...7fd07f6dc` | OK |
| `guion_captura_128.py` | `648d864a4...475cfb0be` | OK |
| `originales/atributos_crudos.json` | `abc0c207...bccf3a0` | OK |
| `originales/capa317_pagina_00.json` | `b6d081992...9163cfe7b` | OK |
| `originales/capa317_pagina_00_meta.json` | `0b8911947...d628edb44b` | OK |
| `originales/capa317_peticion_unica.json` | `8981dad787...035e9db8c` | OK |
| `originales/capa317_peticion_unica_meta.json` | `91dd75f36...43fe2c3d2a` | OK |
| `originales/capa319_peticion_unica.json` | `0400f54a9...276210961b3` | OK |
| `originales/capa319_peticion_unica_meta.json` | `5c45be6b6...9fc53fbe` | OK |
| `originales/capa_317_conteo.json` | `ce25d6916...926d9cc3` | OK |
| `originales/capa_317_metadata.json` | `eb8309974...b858cdbd792d5b` | OK |
| `originales/capa_319_conteo.json` | `52aa0abe4...b4da1c0d` | OK |
| `originales/capa_319_metadata.json` | `9093693c2...966996546419` | OK |
| `originales/captura_resumen.json` | `b78aebd2e...2c7486412` | OK |
| `originales/headers_capa_317.txt` | `88ab9c2f2...2e346fc0eb` | OK |
| `originales/headers_capa_319.txt` | `37119d7f7...10481c89d5` | OK |
| `originales/headers_servicio.txt` | `1533750a7...7c03da204` | OK |
| `originales/peticiones_http.json` | `1ab8c7f49...e1e08b9e` | OK |
| `originales/servicio_metadata.json` | `481380c50...3197d588` | OK |

- SHA del catálogo en `130_cotejo_catalogo_identidad.json` coincide con manifiesto.
- Paginación documentada como no soportada (HTTP 400 `Unable to complete operation` en capa 317, `supportsPagination: False`), evidencia guardada en `originales/capa317_pagina_00*.json`.

## 2) Conteos, unicidad, jerarquía
| Comprobación | Resultado |
|---|---|
| Departamentos (capa 319) | **33** (únicos por `DPTO_CCDGO`, OBJECTID únicos) |
| Municipios (capa 317) | **1122** (únicos por `MPIO_CDPMP`, OBJECTID únicos) |
| Concatenado único (5 dígitos) | **Sí** (1122/1122) |
| `concat = DPTO_CCDGO + MPIO_CCDGO` | **1122/1122 OK** |
| Padre departamento existe en catálogo | **1122/1122 OK** |
| `maxRecordCount` 2000, ambas < 2000, `exceededTransferLimit: false` | **Confirmado** |

## 3) Fidelidad campo a campo (derivados vs crudos)
**Cotejo completo:** 1122 municipios + 33 departamentos. **Discrepancias: 0**.
Campos cotejados: `concat/MPIO_CDPMP`, `dpto/DPTO_CCDGO`, `mpio/MPIO_CCDGO`, `nombre/MPIO_CNMBRE`/`DPTO_CNMBRE`, `tipo/MPIO_TIPO`, `anio_version/MPIO_NANO`/`DPTO_NANO`, `dpto_nombre/DPTO_CNMBRE`. Sin pérdida por normalización aparente; se preserva grafía original de la fuente.

## 4) Homónimos: conteo exacto con regla explícita
**Regla aplicada (métrica 1, obligatoria):** contar por **nombre original exacto** tal como viene en `MPIO_CNMBRE` (sin mayúsculas/acentos/normalización). Un "nombre homónimo" = nombre con **>=2 códigos distintos** (`MPIO_CDPMP`). Contar **códigos distintos**, no duplicar mismo código. No usar normalización para resolver identidades.

| Métrica | Valor | Notas |
|---|---|---|
| **Nombres homónimos (nombre original exacto)** | **66** | Coincide con lo citado en informe128 ("67 nombres homónimos" aparece en texto; el conteo por regla estricta es **66**) |
| **Registros implicados** | **151** | Municipalidades con nombre compartido por >=2 códigos |
| **Códigos distintos involucrados** | **151** | Contados una vez por código |

**Ejemplos (top):** BUENAVISTA (4), LA UNIÓN (4), VILLANUEVA (4), ALBANIA/ARGELIA/BOLÍVAR/CÓRDOBA/EL PEÑÓN/GRANADA/GUADALUPE (3 cada uno), etc.

**Segunda métrica (separada, NO usada para resolver identidades):** normalizando a mayúsculas sin acentos, aparecen **67** nombres normalizados homónimos con **153** códigos distintos involucrados. La diferencia (+1 nombre, +2 códigos) se debe a colisiones introducidas por la normalización; por ello se mantiene separada y no se emplea para conteo de identidad.

## 5) Tipos, vintage y cotejos solicitados
| Ítem | Resultado | Fuente |
|---|---|---|
| Tipos municipales | **1103 MUNICIPIO / 1 ISLA (88001 SAN ANDRÉS) / 18 ÁREA NO MUNICIPALIZADA** | Catálogo + crudos |
| Vintage municipios | **168 con MPIO_NANO 2025, 954 con MPIO_NANO 2024** (mixto) | Catálogo + crudos |
| Vintage departamentos | **21 con DPTO_NANO 2025, 12 con DPTO_NANO 2024** (mixto) | Catálogo + crudos |
| Vintage declarado por servicio | **MGN 2025** | manifiesto/entrega128 |
| Cotejos por código (13001, 13673, 23660, 11001) | **Coinciden** con registro y padre | `130_cotejo_catalogo_identidad.json` |
| Santa Catalina (Bolívar) | **13673** (no 13058) | Verificado contra crudos |
| Sahagún | **23660** (solo grafía `SAHAGÚN` con acento existe) | Verificado contra crudos |
| Bogotá D.C. | **11001** aparece como MUNICIPIO en capa 317, también como departamento 11 en capa 319 (entidades separadas). Capa 317 **no distingue "distrito"** en `MPIO_TIPO` (ambas Cartagena/Bogotá aparecen como MUNICIPIO). | Verificado contra crudos |

## 6) Notas de auditoría
- **118 vs final:** manifiesto 128 señala diferencia de hash del parser respecto a lo declarado en 118 (preservado como antecedente). 128 es entrega separada.
- **Errores HTTP:** solo el intento de paginación (400) documentado; peticiones únicas resultaron 200 con ETag/data congeladas.
- **Centros Poblados (305):** no consultados, sin cobertura acreditada.
- **Fecha adquisición vs vintage:** adquisición 2026-10-26 vs vintage MGN 2025 declarado; dataset mixto 2024/2025 no implica corte 2026 completo.
- **Sin promoción al banco:** confirmado. Sin SQL/red/pruebas/aplicación modificados.

## Conclusión
- **Integridad:** todos los 20 archivos indexados coinciden con sus SHA. Catálogo fiel campo-a-campo a atributos crudos (0 discrepancias), jerarquía y unicidad correctas.
- **Homónimos (regla exacta): 66 nombres, 151 registros implicados** (con la métrica normalizada separada 67/153). Se recomienda usar la métrica exacta para resolución de identidades.
- **Hallazgos documentados, sin inventar explicación** de la diferencia entre "67" citado y conteo exacto "66".
