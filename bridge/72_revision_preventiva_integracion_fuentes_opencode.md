# OP-FUENTES-01 · Revisión preventiva de integración del catálogo 65 con el planificador

Fecha: 24 de octubre de 2026. Agente: OpenCode (sesión `=opencode:0.0`). Coordinación: Codex.
Alcance: contrato y revisión de solo lectura. **No** implementa el adaptador, no modifica 65/70, no ejecuta planificador, adaptadores ni motores. No es dictamen EAF ni cierre de orquestación universal.

Entregables:

- `bridge/72_revision_preventiva_integracion_fuentes_opencode.md` (este informe)
- `bridge/72_matriz_correspondencia_catalogo_planificador.json`
- `bridge/72_evidencia_revision_fuentes_opencode.json`

---

## 0. Resumen ejecutivo

1. **El catálogo 65 no es convertible de forma fiel a un catálogo apto del planificador** con la evidencia actual. De 41 campos de ficha, 3 son copiables sin pérdida (`id_ficha`, `producto_id`, `procedencia`), 11 son copiables con pérdida de significado, y 27 no tienen destino en `ProductoFuente`. El bloqueo no es de nombres: es que 65 **no declara** `conceptos`, `poblaciones`, `coberturas`, unidad de observación, universo ni definición de indicador — 0 de 63 fichas.
2. **El módulo del planificador no está en el árbol de fuentes.** `backend/app/modules/compromisos/planificador_fuentes_politica.py` no existe, no está en `HEAD` y no tiene historial; `backend/scripts/planificar_fuentes_politica.py:14` lo importa. Solo quedan su `.pyc` y una copia en `.archify/.../evidencia/`. El contrato se analizó sobre esa copia, identificada como tal.
3. **La acción `programar_adquisicion_y_validacion` es inalcanzable** con los dos importadores existentes (`catalogo_desde_lista_chequeo`, `incorporar_inventario_local`): ninguno asigna `acceso`, `adaptador`, `conceptos`, `territorios`, `poblaciones` ni `coberturas_acreditadas`, y ningún otro código del repositorio los produce.
4. **El `adaptador` de `ProductoFuente` no es el enlace al adaptador real.** El despacho real es `registro_descargas()[producto_id]`, con 28 claves. 28 fichas de 65 tienen esa clave; 35 no. El `adaptador` solo se evalúa como valor booleano.
5. **Los hashes de las 4 salidas finales de 65 coinciden byte a byte con `70.json#/sha_entrega_final`.** Se separan cuatro niveles de hash y se concluye que **no existe ningún byte analítico verificado**.
6. La conversión fiel exige un **sidecar de contexto institucional/documental**: 65 conserva naturaleza, ámbito, custodio, atribución, temporalidad, revisiones, conciliación y procedencia, y ese contenido no cabe hoy en el planificador.

---

## 1. Qué se leyó y qué se comprobó

Entradas y hashes en `72_evidencia_revision_fuentes_opencode.json`. Resultados:

| Entrada | SHA-256 leído | vs 70 |
|---|---|---|
| `65_schema_...json` | `0dfcd27e…f231e` | coincide `sha_entrega_final` |
| `65_catalogo_...json` | `15983f1b…215ca` | coincide `sha_entrega_final` |
| `65_contrato_...md` | `0419f711…aa99f` | coincide `sha_entrega_final` |
| `65_entrega_...md` | `9ac01251…91666` | coincide `sha_entrega_final` |
| `48_inventario_...json` | `549c5199…0e1e8f` | coincide `sha_entradas` |
| `fuentes_nacionales_aportadas_20.json` | `feb3728a…3a7a31` | coincide `sha_entradas` |

Código comprobado (solo lectura): `registro_descargas_polis.py`, `adquisicion_fuentes_polis.py`, los dos CLI, `corte_datos_polis.py`, `contexto_corte_polis.py`, `orquestador_grafo.py`, `metadatos_socrata_polis.py`. Rangos citados en la evidencia JSON.

No se ejecutó nada: ni planificador, ni CLI, ni adaptadores, ni pruebas. Los conteos son sobre JSON congelado.

---

## 2. Pregunta 1 — Qué se convierte de forma fiel y qué no tiene destino

La matriz completa (41 campos, origen → destino → transformación → evidencia → desconocido/bloqueo → conservación → fidelidad) está en `72_matriz_correspondencia_catalogo_planificador.json`. Síntesis:

**Copiables sin pérdida (3):** `id_ficha`, `producto_id`, `procedencia`.

**Copiables con pérdida de significado (11):**

- `nombre` → `nombre`: en las 43 locales el "nombre" es el slug de 48 (`dnp_terridata_13001`); en las 20 PR es una institución o sistema (`USAID Colombia`, `Sistema de Monitoreo de Bosques y Carbono`). El campo destino queda heterogéneo.
- `clase_registro` → `tipo`: mapeo *propuesto*, no automático. `sistema`, `portal`, `institucion` no son productos estadísticos.
- `unidades` / `unidades_originales` → `unidades`: es una **bolsa plana** de unidades de medida del producto, no el par indicador–unidad. Que una necesidad pida una cadena que esté en la tupla no prueba que esa unidad corresponda a ese indicador.
- `indicadores_originales` → `indicadores`: son nombres de columna de 48, no definiciones de indicador.
- `anios` / `anios_originales` → `anios`: años observados por el producto, no años acreditados por combinación.
- `territorios` → `territorios`: solo 9 fichas tienen valor y es la cadena `"Cartagena"`, sin DIVIPOLA. 54 fichas vacías, incluidas TerriData (municipal) e IDEAM (estación).
- `urls` → `url_referencia`: se toma `urls[0]`; el resto se pierde.
- `sha_contenido_declarado` → `version_local_sha256`: **estructuralmente** compatible (64 hex, idéntico a 48) pero **semánticamente prohibido** sin verificar bytes (ver §5).
- `poblaciones` → `poblaciones`: copia vacía; 0/63.
- `coberturas` → `coberturas_acreditadas`: 0/63 y no se puede sintetizar.

**Sin destino (27):** `custodio_declarado`, `naturaleza`, `pais_jurisdiccion_institucion`, `evidencia_atribucion`, `ambito_institucional`, `cobertura_dato`, `alias`, `verificacion`, `estado`, `relaciones_candidatas`, `origen_id`, `origen_url`, `origen_sha256`, `poblacion`, `vinculos_rol`, `conciliacion`, `retrospectiva`, `ambitos_originales`, `atribucion`, `mision_institucional`, `producto_estadistico`, `temporalidad`, `revisiones`, `referencia_captura`, `sha_entrada`, `vigencia` (sí tiene destino `vigente_hasta`, pero es imposible sin pérdida porque es `null` en las 63), y el resto de `producto_estadistico`.

**Dónde se preserva.** Estos 27 campos no se descartan: van a un **sidecar de contexto institucional/documental** indexado por `producto_id`, referenciado desde `procedencia` o un campo nuevo. El planificador no debe absorberlos; el sidecar evita que la conversión destruya atribución, temporalidad, revisiones y conciliación.

**Consecuencia dura:** `vigencia` es `null` en las 63 fichas ⇒ `_evaluar` agrega `requiere_revision_vigencia` siempre ⇒ **ninguna ficha puede alcanzar `apto_segun_ficha`**, ni siquiera con conversión perfecta. Y como `coberturas` está vacío, también agrega `anios_no_acreditados` siempre.

---

## 3. Pregunta 2 — Instituciones, sistemas y portales no son datasets

Composición real de 65:

| `clase_registro` | n | Rama correcta |
|---|---|---|
| `institucion` | 2 | consulta documental |
| `sistema` | 13 | consulta documental o producto por definir |
| `portal` | 2 | consulta documental |
| `indicador` | 2 | producto por definir |
| `encuesta` | 1 | producto estadístico con diseño muestral |
| `serie` | 43 | insumo local (única clase con indicadores/unidades/años) |

- Las 20 PR **no** son 20 datasets ni 20 adaptadores. `relaciones_candidatas` está vacío en las 20; los **21 enlaces** son solo URLs de `fuentes_nacionales_aportadas_20.json` (PR-20 tiene 2), no conectores.
- Las 63 fichas **no** son 63 fuentes independientes (70.md, línea 8). Caso testigo: `PR-18` y `local:dane_ecsc_2024` comparten la misma URL de DANE; una es "encuesta" sin años y la otra "serie" 2023–2024 con 7 indicadores. Es un universo, dos registros documentales.
- `tipo` debe decidirse por producto con evidencia. Copiar `clase_registro` a `tipo` produciría un catálogo que el planificador aceptaría solo porque el nombre del tipo lo permite.

---

## 4. Pregunta 3 — La ruta real a `programar_adquisicion_y_validacion`

Escalera de `_evaluar` (copia de evidencia, L128–181):

1. sin motivos → `reutilizar_version_validada`
2. `tipo ∉ {datos, insumo_local}` → `consultar_referencia`
3. `acceso == solicitud` → `gestionar_solicitud`
4. `acceso ∈ {api, descarga}` **y** `adaptador` no vacío → `programar_adquisicion_y_validacion`
5. resto → `completar_ficha_y_adaptador`

**Hallazgo D2 (P0):** el paso 4 es inalcanzable con los importadores existentes. `catalogo_desde_lista_chequeo` (L252–268) solo asigna `producto_id`, `nombre`, `tipo`, `url_referencia`, `claves_locales_relacionadas`, `procedencia`. `incorporar_inventario_local` (L271–289) solo añade `indicadores`, `unidades`, `anios`, `url_referencia`, `claves_locales_relacionadas`, `version_local_sha256`, `procedencia`. Ni uno ni otro asignan `conceptos`, `territorios`, `poblaciones`, `coberturas_acreditadas`, `acceso`, `adaptador`, `condiciones_uso` ni `evidencia_validacion`. Un `grep` sobre `backend/` y `scripts/` no encuentra otro productor.

**Enlace de IDs.** El despacho real no usa el campo `adaptador`. `adquirir_fuentes` hace `registro = registro_descargas()` y `set(productos) - registro.keys()`; `productos_desde_plan` selecciona por `producto_id`. Por tanto la clave de unión es **`ProductoFuente.producto_id` == clave de `registro_descargas()`** (`local:<clave>`, 28 entradas).

**Conducta ante ID sin adaptador.** `adquirir_fuentes` (L403–406) lanza `ValueError(f"Productos sin adaptador autorizado: {sorted(desconocidos)}")` **antes de cualquier red**, y aborta el lote completo (validación todo-o-nada). Un solo ID inválido impide adquirir los demás.

**Advertencia sobre URL.** Ninguna URL de 65 acredita API, acceso ni permiso. `HOSTS` de adquisición es un conjunto cerrado (`datos.gov.co`, `dane.gov.co`, `terridata.dnp.gov.co`, `vgv/cifras2.unidadvictimas.gov.co`); `drive.google.com` no está. `_url_permitida` exige `https`, host exacto y sin credenciales.

**Hallazgo D3 (P1):** `_evaluar` nunca cruza `adaptador` con `registro_descargas`. Un plan puede "programar" con un `adaptador` inventado y fallar recién en la adquisición.

**Hallazgo D4 (P1):** la adquisición fija `territorio = "DIVIPOLA:13001"` y toma `anios` de `--anios` del CLI; **no** lee `necesidades[].territorio` ni `necesidades[].anios`. El plan no transporta su propio contexto territorial/temporal.

---

## 5. Pregunta 4 y 5 — Metadatos declarados ≠ cobertura acreditada; cuatro niveles de hash

**Cobertura.** `coberturas` vacío en las 63 (deliberado, 70.md). Poblarlo desde las listas de indicadores/unidades/años de 48 sería exactamente el producto cartesiano que el comentario de `_evaluar` prohíbe: *"No formar un producto cartesiano de años/unidades/indicadores de una entidad"*. Caso TerriData: 10 indicadores × 8 unidades × 14 años ≠ 1.120 coberturas acreditadas; solo existe el archivo, no la pareja indicador–unidad–territorio–población–año.

**Niveles de hash, separados:**

| Nivel | Valor | Qué identifica | ¿Sirve como `version_local_sha256`? |
|---|---|---|---|
| Documento de clasificación | `15983f1b…215ca` | el JSON 65 completo | No |
| Inventario de origen | `549c5199…0e1e8f` | `48_inventario_fuentes_multipolitica.json` | No |
| Contenido declarado | por ficha (`sha_contenido_declarado`), = `48.sha256_contenido_declarado` | lo que 48 **declara** del conjunto | **No sin verificar bytes** |
| Bytes analíticos verificados | **ninguno** | nada | — |

`70.md` línea 11: *"No se revalidaron los bytes de los conjuntos analíticos"*. `65` declara `capturas_58_verificadas: false` y `capturas_58_nivel_verificacion: "metadatos_sin_lectura_de_bytes_analiticos"`.

**Hallazgo D5 (P1):** `incorporar_inventario_local` copia `sha256_contenido_declarado` a `version_local_sha256`, y `_evaluar` usa la mera presencia de ese campo como señal de versión local. Eso **sobreacredita**: convierte un hash declarado en apariencia de versión validada. Es un defecto del importador, no del catálogo 65; debe corregirse antes de conectar 65 al planificador.

**Condiciones de uso y vigencia.** `estado.condiciones_uso = "por_verificar"` en las 63 y `vigencia = null` en las 63. Aceptación documental de 70 **no** es licencia ni promoción; `metadatos_socrata_polis.ficha_metadata` mantiene explícitamente `estado_acreditacion: "PENDIENTE_COTEJO_CUSTODIO_LICENCIA_Y_VERSION"`. Tampoco el estado `publicacion = "no_publicada"` (63/63) permite publicar.

**Hallazgo D6 (P1):** 65 no tiene destino para la semántica que el planificador exige; no existe conversión fiel que produzca un producto apto sin inventar concepto/población/cobertura.

---

## 6. Pregunta 6 — Ámbito del custodio ≠ cobertura del dato; alias territoriales

**Son niveles distintos (contrato 65, líneas 9–11):** naturaleza del custodio (3 cooperación, 52 público, 1 academia, 7 por verificar); ámbito institucional (3 internacional, 53 nacional, 7 por verificar); propósito del producto; unidad; universo; cobertura del dato (20 desconocido, 35 municipal, 6 municipal con desglose urbano/rural, 1 cabecera, 1 estación); temporalidad; versión; estado.

**Prohibiciones de conversión:**

- `pais_jurisdiccion_institucion` y `ambito_institucional` **no** son `territorios`. Mapearlos haría que "Colombia" o "nacional" acreditaran cobertura geográfica.
- `cobertura_dato` **no** es una cobertura acreditada: `"municipal"` no dice qué municipio, qué periodo, qué población ni qué indicador.
- `"cabecera"` (ECSC) no es Cartagena ni municipio.
- `"estacion"` (IDEAM) no es DIVIPOLA:13001. Una estación tiene identificador propio; Celsius/mmHg/ugm3 son variables distintas.

**Alias territoriales — propuesta.** No inventar organigramas ni DIVIPOLA. Se propone una tabla explícita y versionada:

```text
alias_territorial {
  alias_id, entidad_id, tipo_entidad ("municipio"|"estacion"|"departamento"),
  codigo_canonico (p.ej. "DIVIPOLA:13001"), fuente_del_codigo, vigencia_desde/hasta,
  estado ("verificado"|"declarado_no_verificado"), evidencia_id, sha256_evidencia
}
```

Solo `estado = "verificado"` puede alimentar `territorios`. `"Cartagena"` queda como declaración no verificada, con su puntero a 65. El núcleo no se acopla a Cartagena ni a las siete dimensiones SH: el alias es dato de configuración, y `DIVIPOLA:13001` deja de ser un literal del código (hoy lo es en `adquisicion_fuentes_polis.py`).

---

## 7. Pregunta 7 — Responsabilidades y conexiones reales

| Etapa | Implementado | Conexión con 65 |
|---|---|---|
| Selección | `planificar_fuentes` (copia de evidencia) / CLI | **Ninguna**: 65 no es entrada del planificador |
| Adquisición | `adquirir_fuentes` + `registro_descargas` / CLI | **Ninguna**: 65 no produce planes |
| Armonización/limpieza | no localizada como módulo de este ciclo | — |
| Validación | estados `por_verificar` en 65; `estado_acreditacion` socrata | **Pendiente** |
| Corte | `corte_datos_polis.ManifiestoCorteDatos`, `contexto_corte_polis.ContextoCorte`, usado por `orquestador_grafo` (L613–628) | **No usa 65 ni el planificador**; opera la etapa `fuentes` con manifiesto congelado |
| Conciliación retrospectiva | contrato 67; sin motor | **Pendiente** |
| Motor | `GRAFO_ETAPAS = ("fuentes","conciliacion","dea")` | — |
| Intérprete | no en alcance | — |

**Hallazgo (P1):** el planificador es **consumidor solo-CLI**. Único importador: `backend/scripts/planificar_fuentes_politica.py:14`. No hay router, service, grafo ni orquestador que lo llame. `adquirir_fuentes` igual: solo `backend/scripts/adquirir_fuentes_politica.py:11`. Cualquier adaptador nuevo sin consumidor de servicio sería un módulo huérfano; por eso la interfaz propuesta (§9) se cuelga del CLI existente, no de un servicio inexistente.

**Sobre el corte:** `ReferenciaVersionFuente` (`corte_datos_polis.py:14`) pide `fuente_clave`, `version_id`, `sha256_contenido`. 65 no produce ninguno de los tres con el significado requerido: `version_id` de 48 es un truncado de 16 hex y `sha_contenido_declarado` no son bytes verificados. **No** se puede alimentar un manifiesto de corte desde 65 hoy.

---

## 8. Pregunta 8 — Homicidios INML / Policía / Fiscalía: cuándo comparar y cuándo abstenerse

**Estado en 65/48:** hay fichas separadas por producto (`local:medicina_homicidios`, `local:policia_homicidios`, `local:fiscalia_spoa_procesos_por_anio_hecho`). No hay conciliación: `conciliacion.estado = "pendiente"` y `relaciones_candidatas = []` en las 63. Los indicadores no son equivalentes: Medicina Legal reporta dictámenes por causa, Policía hechos/denuncias, Fiscalía **procesos** por año de hecho. `67` línea 14 lo prohíbe explícitamente: *«Procesos», «víctimas», «eventos» y «dictámenes» no se equiparan sin evidencia*.

**Condiciones mínimas para comparar** (todas verificables, no supuestas):

1. Misma definición de indicador y misma unidad de observación (dictamen ≠ proceso ≠ víctima ≠ hecho).
2. Universo y población de referencia declarados; reglas de inclusión/exclusión.
3. Localización comparable (ocurrencia vs. registro) y granularidad compatible.
4. Periodo y fecha de corte compatibles; ocurrencia, registro, publicación y extracción separadas.
5. Provisionalidad y revisiones conocidas; versión identificada por bytes verificados.
6. Estado de comparabilidad asignado: `comparable`, `comparable_con_ajustes`, `parcialmente_comparable`, `no_comparable`, `pendiente`.

**Abstenerse** cuando falte cualquiera de 1–5, cuando el único vínculo sea el nombre "homicidio", o cuando solo haya agregados (no acreditan coincidencia de casos individuales). Se permite concluir **"no identificable con la evidencia disponible"**.

**Dos diagnósticos, separados:** del fenómeno (evolución, cobertura, incertidumbre) y de las fuentes (comportamiento de registro, revisiones, conflictos). Una diferencia menor **no** prueba subregistro; una variación **no** prueba reducción real ni causalidad (68, §Límite fundamental). Las hipótesis se conservan con estado `documentada` / `verificada_en_evidencia` / `hipótesis_pendiente` / `sin_explicación`, nunca como conclusión automática.

---

## 9. Propuesta concreta y mínima de interfaz

**Ubicación propuesta:** `backend/app/modules/compromisos/adaptador_catalogo_fuentes_politica.py`

**Firma propuesta:**

```python
def catalogo_desde_clasificacion_65(
    clasificacion: dict, *, version: str
) -> tuple[CatalogoProductos, dict]:
    """Devuelve (catálogo, sidecar). No ejecuta red ni valida bytes."""
```

**Contrato del adaptador (mínimo, verificable):**

1. `producto_id` = `id_ficha` literal. No se renombra.
2. `tipo = "referencia"` para `institucion`, `sistema`, `portal` e `indicador` sin producto definido. Nunca `datos` para PR.
3. `tipo = "insumo_local"` solo para `clase_registro = "serie"`.
4. `indicadores`, `unidades`, `anios` se copian literales para locales; `()` para PR.
5. `territorios = ()` siempre, salvo que exista alias `verificado` en la tabla de alias.
6. `poblaciones = ()`, `conceptos = ()`, `coberturas_acreditadas = ()`, `acceso = "desconocido"`, `adaptador = None`, `condiciones_uso = "por_verificar"`, `vigencia_hasta = None`, `evidencia_validacion = None`. **Sin excepciones.**
7. `version_local_sha256` se deja en `None` aunque exista `sha_contenido_declarado`; el hash declarado viaja en el sidecar.
8. `procedencia` = `procedencia` de 65 + `#<id_ficha>`.
9. El sidecar devuelve, por `producto_id`, los 27 campos sin destino más `sha_contenido_declarado`, `sha_entrada`, `origen_url`, `origen_sha256` y `referencia_captura`.

**Consumidor real:** `backend/scripts/planificar_fuentes_politica.py` (subcomando `catalogar`). Es el único consumidor existente. No se propone servicio ni router porque no hay llamada de servicio que los consuma.

**Por qué no un "conversor universal":** el contrato 65 ya advierte que no se acredita un resolutor universal. Un conversor que rellenara `conceptos` desde `mision_institucional` o desde `indicadores_originales` violaría 67 y 68 y fabricaría aceptación.

---

## 10. Secuencia de integración propuesta

| # | Paso | Entregable | Bloqueo |
|---|---|---|---|
| 0 | Restaurar `planificador_fuentes_politica.py` desde fuente autorizada | fuente + `.pyc` coherentes | **D1** |
| 1 | Corregir `incorporar_inventario_local` para no copiar `sha_contenido_declarado` a `version_local_sha256` | parche + prueba | **D5** |
| 2 | Validar `adaptador` contra `registro_descargas()` en `_evaluar` o en `productos_desde_plan` | parche + prueba | **D3** |
| 3 | Propagar `territorio`/`anios` de la necesidad al manifiesto de adquisición | parche + prueba | **D4** |
| 4 | Crear `adaptador_catalogo_fuentes_politica.py` según §9 | módulo + sidecar | requiere 0–3 |
| 5 | Definir tabla de alias territorial versionada | JSON de configuración | decisión de producto |
| 6 | Producir `CoberturaFuente` por indicador con bytes verificados | evidencia | bloqueo de datos real |
| 7 | Solo entonces evaluar `apto_segun_ficha` y `programar_adquisicion_y_validacion` | plan | requiere 4–6 |

Paso 4 puede hacerse antes de 5–6, pero el resultado seguirá siendo `completar_ficha_y_adaptador` para las 63 fichas. Eso es **correcto**, no un fallo: expresa que el catálogo documental no acredita productos adquiribles.

---

## 11. Hallazgos clasificados

### Defectos reproducibles

| ID | Prioridad | Hallazgo | Evidencia |
|---|---|---|---|
| D1 | **P0** | Falta `planificador_fuentes_politica.py` en el árbol y en `HEAD`; el CLI lo importa | `git ls-tree` sin resultado; `sha256` del `.pyc` |
| D2 | **P0** | `programar_adquisicion_y_validacion` inalcanzable: ningún importador asigna `acceso`/`adaptador`/`coberturas_acreditadas` | L252–289 de la copia de evidencia; grep sin productores |
| D3 | P1 | `adaptador` no se cruza con `registro_descargas`; el ID sin adaptador aborta todo el lote | adquisición L403–406 |
| D4 | P1 | Territorio y años del plan no llegan a la adquisición (literal `DIVIPOLA:13001` + `--anios`) | adquisición L412–421 |
| D5 | P1 | `sha_contenido_declarado` se copia a `version_local_sha256` sin verificar bytes | importador L288; 70.md L11 |
| D6 | P1 | 65 no declara `conceptos`, `poblaciones`, `coberturas`, unidad de observación, universo ni definición de indicador | 0/63 en cada campo |

### Defectos documentales (informar, no modificar 65)

| ID | Prioridad | Hallazgo |
|---|---|---|
| D7 | P2 | `nombre` es slug en locales e institución en PR |
| D8 | P2 | `territorios` vacío en 54/63, incluidas TerriData municipal e IDEAM estación |
| D9 | P2 | Duplicidad de universo ECSC (`PR-18` vs `local:dane_ecsc_2024`) |

### Decisiones de contrato (no son defectos)

- `coberturas` vacío es correcto y deliberado: expresa que no hay cobertura conjunta acreditada.
- `condiciones_uso` y `vigencia` en `por_verificar`/`null` son correctos: no hay licencia ni vigencia verificadas.
- Las 63 fichas no son 63 fuentes independientes; la deduplicación es una decisión pendiente, no un bug.

---

## 12. Límites de esta revisión

- **No** se ejecutó el planificador, los CLI, los adaptadores ni motores.
- **No** se leyeron bytes de conjuntos analíticos; solo JSON, hashes, conteos y referencias locales.
- **No** se modificó 65/70, Python, datos, configuración ni `hallazgos21102026.md`.
- El contrato del planificador se leyó de una **copia de evidencia** por ausencia de fuente vigente (D1); puede diferir de la versión que se restaure.
- **No** es dictamen EAF, ni acredita licencia, calidad, cobertura, causalidad ni subregistro.
- **No** cierra la orquestación universal ni autoriza despliegue.
- Los tres archivos `bridge/72_*` quedan congelados a partir de esta entrega.

---

## 13. Cierre

La conclusión preventiva es inequívoca: **el catálogo 65 es un contrato documental sólido y un catálogo de productos estadísticos insuficiente**. Conectarlo al planificador sin resolver D2, D5 y D6 produciría una apariencia de integración: el motor aceptaría tipos y nombres, pero no existiría evidencia de concepto, población, cobertura ni versión. La conversión fiel es posible solo con un sidecar que preserve lo que el destino no admite, y con la aceptación explícita de que las 63 fichas seguirán requiriendo completar ficha y adaptador.

Pendiente de revisión de Codex.
