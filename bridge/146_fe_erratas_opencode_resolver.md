# OP-ID-QA-02-R1 · Fe de erratas del informe 143

Fecha: 26 de octubre de 2026. Agente: OpenCode (sesión =opencode:0.0). Alcance exclusivamente documental. 143 y `bridge/143_validacion_opencode_resolver/` se conservan íntegros. Sin modificación de código, sin repetir pytest.

## 1) Ejemplo SAHAGÚN / homónimos
- **Hecho:** En las pruebas sintéticas (`tests/test_identidad_territorial_catalogo_polis.py`, líneas ~81-91, 538-549) se introduce deliberadamente `SAHAGÚN` en Bolívar con `concat="13601"`, distinto a `23660` (Córdoba), para demostrar resolución por código con homónimos.
- **Catálogo real 128:** solo existe `SAHAGÚN` en **Córdoba (23660)**. `13601` **no está presente** en `bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json` (SHA256 `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`). 
- **Corrección:** El ejemplo `13601` (Bolívar) es **fixture sintético deliberado**, no geografía oficial DANE 128. No debe presentarse como caso real. Para un ejemplo **real** de homónimos resueltos por código, usar **ARGELIA** presente en el catálogo real: `05055` (Antioquia), `19050` (Cauca), `76054` (Valle del Cauca) — cotejados en `bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json`.

## 2) Trim / normalización
- **Carga (catálogo):** `ContratoCatalogo.model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)` aplica `strip` a strings del modelo. `cargar_catalogo_identidad` además hace `esperado = sha256_esperado.strip().lower()`.
- **Códigos:** `_codigo_acotado` exige `valor.isdigit()` (cadena de dígitos literal), sin relleno, sin conversión numérica. La validación JSON usa `parse_int=int` pero los campos `concat/dpto/mpio` son `str` con `StringConstraints` y se rechaza int numérico (`test_codigo_numerico_coercionado_rechazado`). **No hay relleno por intuición**.
- **Búsqueda/resolución:** estricta por código exacto (`concat == codigo`, `dpto == codigo`), **sin fuzzy, sin normalización libre de nombres**. La diferencia nombre declarado vs catálogo se informa y **no invalida** la resolución.
- **Corrección:** La afirmación "no hay trim" era demasiado amplia. Es más preciso decir: **se conserva** la grafía/acentos del catálogo real; **no se normaliza** para búsqueda; `str_strip_whitespace=True` existe en el contrato del catálogo/modelos, pero **los códigos se tratan como cadenas literales sin relleno ni coerción numérica**. Distinguir **carga del catálogo** vs **resolución de argumentos**.

## 3) Campo `estado` y garantías del test
- **API pública:** `resolver_identidad_territorial` no recibe `estado` como parámetro (verificado por `test_campo_estado_externo_no_existe_en_la_api`: `estado` no está en anotaciones de la función).
- **Modelo de resultado:** `ResolucionIdentidadTerritorial` **sí** tiene campo `estado` (Literal computado: `encontrado`/`desconocido`/`discordante`/`no_evaluable`). Es un **estado derivado/computado**, no un estado externo aceptado como acreditación.
- **Prueba:** `test_campo_estado_externo_no_existe_en_la_api` comprueba anotaciones de la función y que `CatalogoIdentidadTerritorial` no tenga `verificada`; **no demuestra** una "garantía" general sobre el modelo de resultado.
- **Corrección:** Matizar: "la función pública no recibe estado externo como parámetro de acreditación; el resultado **sí** expone `estado` computado por las reglas, y los validadores impiden incoherencias entre `estado` y presencia de `registro_catalogo`."

## 4) "Punteros presentes"
- **Lo que sí existe:** `procedencia` (obligatoria), `origen` (dict con servicio/capas/sha256 respuestas/fechas), `sha256_bytes_catalogo`, `bytes_catalogo`, `vintage_declarado_por_fuente`, `fecha_adquisicion_utc`, `limites_declarados`, `codigo_entidad`, `codigo_departamento`, `nivel`, `registro_catalogo` (dump completo del registro), `departamento_catalogo`, `nombre_catalogo`/`nombre_declarado`, `metadatos_catalogo`.
- **Lo que no hay evidencia de:** **ningún campo JSON Pointer** (`$ref`, JSON Pointer, puntero específico por registro) en las firmas/modelos. 
- **Corrección:** Es más preciso decir **"metadatos/punteros de procedencia y registro disponibles"** (procedencia/origen/códigos/registro completo/metadatos de captura), **no** afirmar la existencia de un JSON Pointer específico por registro si no está presente en el modelo/API.

## Conclusión
Estas precisiones son exclusivamente documentales. No implican modificar el resolver ni invalidan las **31 pruebas** (verificadas). Se distingue entre **fixture sintético** (13601) y **catálogo real 128** (ARGELIA homónima real). Se precisa alcance de `str_strip_whitespace`, distinción función vs modelo para `estado`, y alcance real de "punteros".
