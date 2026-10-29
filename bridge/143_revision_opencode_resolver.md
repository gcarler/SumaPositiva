# OP-ID-QA-02 · Revisión independiente del resolver de identidad 134

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Auditoría 136 preservada. Freebuff entrega 134; Ollamacodex (ficha 131) no fue interferida. Solo lectura estática + ejecución acotada según 142.

## Alcance y límites
- Revisados: `backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py`, `backend/tests/test_identidad_territorial_catalogo_polis.py`
- Leídos para contexto acotado: `bridge/133_tarea_freebuff_resolver_identidad.md`, `bridge/134_entrega_freebuff_resolver_identidad.md`, `bridge/134_validacion_resolver_identidad/*`, `bridge/128_entrega_freebuff_identidad_territorial.md`, `bridge/128_catalogo_identidad_territorial/manifiesto_entrega_128.json`, `bridge/130_cotejo_catalogo_identidad.json`, `bridge/136_revision_opencode_catalogo_identidad.md`
- No se relee todo el repo. Sin red, sin SQL, sin modificaciones a implementación/tests/ficha/catálogo.
- Capa 305 (centros poblados) no consultada; mixto 2024/2025; adquisición 2026 vs vintage MGN 2025 declarado.

## 1) Pureza, firma y carga estricta
| Punto | Estado | Observación |
|---|---|---|
| Funciones puras (sin IO/red/DB/estado global mutable) | OK | Solo JSON, hashlib, Pydantic. Sin efectos laterales. |
| SHA real de los **mismos bytes** | OK | `cargar_catalogo_identidad` calcula `hashlib.sha256(bytes_catalogo).hexdigest()` y lo exige igual al esperado (hex 64). Rechaza malformado/distinto. |
| Sin relleno de ceros ni coerción numérica de códigos | OK | `_codigo_acotado` exige `isdigit()` literal; en JSON `parse_int=int` pero campos `concat/dpto/mpio` se validan como strings con `StringConstraints` y `json.loads` con `parse_int` no forzará tipos si el modelo los rechaza. Prueba `test_codigo_numerico_coercionado_rechazado` exige fallo al pasar `concat=13001` como int. |
| JSON estricto | OK | Clave duplicada → `object_pairs_hook`; `NaN/Infinity` → rechazados; UTF-8 obligatorio. HTML/respuesta error ArcGIS con 200 tratada como no-JSON o validada por modelo. |
| Metadatos de captura viajan | OK | `CatalogoIdentidadTerritorial` guarda `sha256_bytes_catalogo`, `bytes_catalogo`, `vintage_declarado_por_fuente`, `fecha_adquisicion_utc`, `origen`, `limites_declarados`, `procedencia`. `ResolucionIdentidadTerritorial.metadatos_catalogo` los expone. |
| `estado` nunca recibido como parámetro | OK | No existe en `resolver_identidad_territorial`; modelo `ResolucionIdentidadTerritorial` no acepta estado externo (validado por `test_campo_estado_externo_no_existe_en_la_api`). |

## 2) Estructura, códigos, niveles, jerarquía
| Punto | Estado | Observación |
|---|---|---|
| `concat = dpto + mpio` | OK | Validador exige igualdad; duplicados rechazados; longitudes acotadas (dpto 2 dígitos, concat 5 dígitos). |
| Niveles separados | OK | `departamental` usa código de 2 dígitos; `municipal` 5. Longitud errónea → `no_evaluable`. Departamento 13 no resuelve como Cartagena; municipio no infiere padre. |
| Padre declarado distinto → `discordante` sin combinar | OK | Municipal: si `codigo_departamento != registro.dpto` → `estado=discordante`, conserva registro completo del municipio, registra padre distinto en detalle, `concordancia_departamento=False`. Departamental: si `codigo_departamento` distinto al propio → `discordante` con registro departamental. |
| Sin relleno/coerción de ceros | OK | Conserva `mpio="001"`, `concat="13001"`. Validación exige dígitos literales. |
| Padre solo verificado/coincidido, nunca inferido | OK | Sin lógica que asuma capital. Bogotá/Cartagena tratados como lo declara la fuente (MUNICIPIO en capa 317). |

## 3) Homónimos y nombres
| Punto | Estado | Observación |
|---|---|---|
| Resueltos exclusivamente por código | OK | `SAHAGÚN` existe en Córdoba (23660) y en Bolívar (13601) con distinto `concat/dpto_nombre`; resueltos por código, ambos encontrados, registros distintos. |
| Diferencia de nombre declarado vs catálogo | OK | Informada en `detalle_estado`, **no** invalida resolución. Conserva `nombre_declarado` y `nombre_catalogo`. |
| Sin normalización libre | OK | No hay upper/trim/acentos/fuzzy. Coincidencia estricta por código. |
| Conteo homónimos (coherente con 136) | OK | Catálogo 128 tiene 66 nombres homónimos / 151 registros con nombre exacto; métrica normalizada (67/153) separada. Resolver no usa métrica agregada para decisión. |

## 4) Procedencia, vintage, punteros, estados calculados
| Punto | Estado | Observación |
|---|---|---|
| Procedencia obligatoria | OK | `cargar_catalogo_identidad` exige `procedencia`; se almacena en catálogo y viaja en metadatos. |
| Vintage/punteros presentes | OK | `vintage_declarado_por_fuente`, `fecha_adquisicion_utc`, `origen`, `limites_declarados`, `sha256_bytes_catalogo`, `bytes_catalogo` expuestos. |
| `anio_version` vs fecha adquisición | OK | Diferenciados explícitamente en detalle ("metadato de registro MGN2025, distinto de la fecha de adquisición del catálogo"). Mixto 2024/2025 correcto. |
| Estados computados | OK | `encontrado`/`desconocido`/`discordante`/`no_evaluable` derivados por reglas; nunca `estado` externo. |
| Registro positivo solo cuando corresponde | OK | Validador de `ResolucionIdentidadTerritorial` exige `registro_catalogo` para encontrado/discordante y lo prohíbe para desconocido/no_evaluable. |

## 5) Distinción: firma criptográfica vs cotejo local
| Punto | Estado | Observación |
|---|---|---|
| No certifica origen criptográfico del DANE | OK | Módulo declara explícitamente: catálogo es evidencia local ya capturada y cotejada, **no** una firma criptográfica del origen DANE. |
| No certifica vigencia 2026 completa | OK | Declarado en docstring; vintage declarado MGN 2025 + mixto 2024/2025 + fecha adquisición 2026 documentados. |
| No certifica estatus jurídico/censo | OK | Cartagena/Bogotá aparecen como `MUNICIPIO` en fuente; se informa "sin certificar estatus jurídico". `tipo` se reporta tal cual, sin deducirlo. |
| Capa 305 fuera de alcance | OK | Declarado; no se acredita cobertura de centros poblados. |

## 6) Ejecución de pruebas (solo lo requerido)
**Comando ejecutado desde `backend/`:**
```bash
PYTHONPATH=. .venv/bin/python -m pytest --noconftest tests/test_identidad_territorial_catalogo_polis.py -q --junitxml=/root/polis/bridge/143_validacion_opencode_resolver/pytest_resolver.xml
```
**Resultado:** `31 passed in 0.07s`  
**Ruff:** `app/modules/compromisos/identidad_territorial_catalogo_polis.py` y `tests/test_identidad_territorial_catalogo_polis.py` — `All checks passed!` (check) y `2 files already formatted` (format --check)

## 7) Hallazgos y propuesta mínima
**Sin defectos reales detectados.** El resolver cumple las restricciones del encargo:
- Carga estricta por SHA de **mismos bytes** con validaciones JSON estrictas.
- Resolución por código/nivel sin normalización ni relleno/coerción.
- Niveles separados; padre discordante → `discordante` sin combinar registros.
- Homónimos resueltos por código; diferencia de nombre informada, no invalidante.
- Estados computados; metadatos/vintage/procedencia/punteros presentes.
- Límites semánticos correctamente enmarcados (no certifica origen criptográfico/vigencia 2026/estatus jurídico/censo/capa 305).

**Observaciones menores (no defectos):**
1. **Límite de bytes** configurado en módulo (`MAXIMO_BYTES_CATALOGO=8MB`); prueba lo verifica con monkeypatch. Adecuado para 128 (~277KB catálogo JSON).
2. **Búsqueda lineal** por iteración sobre tuplas (1122+33 registros) — trivial y determinista, sin ocultar índices. Aceptable para este encargo puro.
3. **`anio_creacion` heterogéneo** (int en depto, string en municipio en el modelo) — coincide con estructura 128; validado por tipos.

## Conclusión
El resolver 134 es **puro, estricto y fiel al encargo**. Las 31 pruebas pasan con `--noconftest`. Ruff limpio. No se requieren cambios. Se distingue correctamente entre **cotejo local confiable** (128 validado por 130/136) y **certificación criptográfica/origen/vigencia 2026/estatus jurídico** (no afirmada). Homónimos resueltos por código; jerarquía y niveles separados preservados.
